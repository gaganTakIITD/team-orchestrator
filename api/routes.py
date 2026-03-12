"""
routes.py — FastAPI API endpoints.
Serves contribution data, triggers pipeline, handles NL queries, exports reports.
Supports multi-project architecture via project store.
"""

import os
import json
import threading
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import FileResponse

from api.schemas import (
    AnalyzeRequest, QueryRequest, RubricUpdate,
    StatusResponse, ContributionVector, QueryResponse, CommitSummary,
    ProjectRegister, ProjectInfo, IngestRequest,
    CommentCreateRequest, CommentResponse,
)
from src.utils import load_json, save_json, get_logger, load_rubric
from src.security import audit_log
from src.report_generator import generate_person_report, generate_team_report
from src import project_store
from api.auth import JWT_SECRET, JWT_ALGORITHM
import jwt

logger = get_logger("api.routes")

router = APIRouter(prefix="/api")

# Legacy paths (backward compat)
VECTORS_DIR = "output/contribution_vectors"
SCORED_DIR = "data/scored_commits"
REPORTS_DIR = "output/reports"

# Pipeline state (managed by run_pipeline thread)
_pipeline_status = {"status": "idle", "step": None, "progress": None, "message": None}
_pipeline_lock = threading.Lock()


def _set_pipeline_status(status: str, step: str = None, progress: str = None, message: str = None):
    global _pipeline_status
    with _pipeline_lock:
        _pipeline_status = {"status": status, "step": step, "progress": progress, "message": message}


# ═══════════════════════════════════════════════════════════════════════════════
# PROJECT MANAGEMENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/projects/register", response_model=ProjectInfo)
async def register_project_endpoint(request: ProjectRegister):
    """Register a new project. Called by 'team-orchestrator init'."""
    result = project_store.register_project(
        project_id=request.project_id,
        repo_name=request.repo_name,
        repo_path=request.repo_path,
        user_name=request.user_name,
        user_email=request.user_email,
    )
    audit_log("project_registered", {
        "project_id": request.project_id,
        "repo_name": request.repo_name,
        "success": True,
    })
    return ProjectInfo(**result)


@router.get("/projects", response_model=List[ProjectInfo])
async def list_projects(email: Optional[str] = Query(None), sync: bool = Query(False)):
    """List all projects. Filter by email for user mode. If sync=true, load from files first."""
    if sync:
        project_store.sync_all_projects_from_files()
    projects = project_store.list_projects(email_filter=email)
    return [ProjectInfo(**p) for p in projects]


@router.post("/projects/sync")
async def sync_projects_from_files():
    """Sync analysis data from project dirs into SQLite. Use when CLI ran but dashboard shows nothing."""
    results = project_store.sync_all_projects_from_files()
    return {"message": f"Synced {len(results)} projects", "results": results}


@router.get("/projects/{project_id}", response_model=ProjectInfo)
async def get_project(project_id: str):
    """Get project metadata."""
    proj = project_store.get_project(project_id)
    if not proj:
        raise HTTPException(404, f"Project not found: {project_id}")
    return ProjectInfo(**proj)


@router.get("/projects/{project_id}/results", response_model=List[dict])
async def get_project_results(project_id: str):
    """Get contribution vectors for a specific project."""
    proj = project_store.get_project(project_id)
    if not proj:
        raise HTTPException(404, f"Project not found: {project_id}")
    return project_store.load_project_vectors(project_id)


@router.get("/projects/{project_id}/commits", response_model=List[dict])
async def get_project_commits(
    project_id: str,
    author: Optional[str] = Query(None),
    commit_type: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None),
):
    """Get scored commits for a specific project with optional filters."""
    proj = project_store.get_project(project_id)
    if not proj:
        raise HTTPException(404, f"Project not found: {project_id}")

    all_commits = project_store.load_project_scored_commits(project_id)
    commits = []
    for data in all_commits:
        scores = data.get("llm_scores", {})

        # Apply filters
        if author and data.get("author", {}).get("email", "") != author:
            continue
        if commit_type and scores.get("type", "") != commit_type:
            continue
        if min_score:
            avg = (scores.get("complexity", 0) + scores.get("integrity", 0) + scores.get("impact", 0)) / 3
            if avg < min_score:
                continue

        commits.append({
            "short_hash": data.get("short_hash", ""),
            "author_name": data.get("author", {}).get("name", ""),
            "author_email": data.get("author", {}).get("email", ""),
            "subject": data.get("message", {}).get("subject", ""),
            "date": data.get("timestamps", {}).get("authored_date", ""),
            "commit_type": scores.get("type", "unknown"),
            "complexity": scores.get("complexity", 0),
            "integrity": scores.get("integrity", 0),
            "impact": scores.get("impact", 0),
            "is_spam": data.get("spam_check", {}).get("is_spam", False),
            "flag_count": data.get("flag_count", 0),
        })

    return commits


@router.post("/projects/{project_id}/ingest")
async def ingest_project_results(project_id: str, request: IngestRequest):
    """Receive analysis results from CLI. Auto-registers project if needed, stores vectors and commits."""
    proj = project_store.get_project(project_id)
    if not proj and request.project_meta:
        # Auto-register so commit hook can push without running init on server
        meta = request.project_meta
        repo_name = meta.repo_name or (project_id.split("_")[0] if "_" in project_id else project_id)
        project_store.register_project(
            project_id=project_id,
            repo_name=repo_name,
            repo_path=meta.repo_path or "",
            user_name=meta.user_name or "Unknown",
            user_email=meta.user_email or "unknown@unknown",
        )
        proj = project_store.get_project(project_id)
    if not proj:
        raise HTTPException(404, f"Project not found: {project_id}. Run 'team-orchestrator init' first or ensure project_meta is sent.")

    if request.vectors:
        project_store.ingest_vectors(project_id, request.vectors)
    if request.scored_commits:
        project_store.ingest_scored_commits(project_id, request.scored_commits)

    # Update stats (derive authors from vectors or scored_commits)
    author_emails = list(set(v.get("email", "") for v in request.vectors))
    if not author_emails and request.scored_commits:
        author_emails = list(set(
            c.get("author", {}).get("email", "") for c in request.scored_commits
            if c.get("author", {}).get("email")
        ))
    project_store.update_project_stats(
        project_id,
        commit_count=len(request.scored_commits) if request.scored_commits else 0,
        author_count=len(author_emails) if author_emails else 0,
        authors=author_emails,
    )

    return {"message": f"Ingested {len(request.vectors)} vectors, {len(request.scored_commits)} commits"}


@router.post("/projects/{project_id}/analyze", response_model=StatusResponse)
async def trigger_project_analysis(project_id: str):
    """Trigger full analysis for a registered project."""
    with _pipeline_lock:
        if _pipeline_status["status"] == "running":
            raise HTTPException(400, "Pipeline already running")

    proj = project_store.get_project(project_id)
    if not proj:
        raise HTTPException(404, f"Project not found: {project_id}")

    thread = threading.Thread(
        target=_run_pipeline_thread,
        args=(proj["repo_path"],),
        kwargs={"project_id": project_id},
    )
    thread.daemon = True
    thread.start()

    return StatusResponse(status="running", step="starting", message="Pipeline started")


@router.get("/projects/{project_id}/insights")
async def get_project_insights(project_id: str):
    """Get team insights for a project."""
    proj = project_store.get_project(project_id)
    if not proj:
        raise HTTPException(404, f"Project not found: {project_id}")
    return project_store.load_project_team_insights(project_id)


@router.get("/projects/{project_id}/peer-matrix")
async def get_project_peer_matrix(project_id: str):
    """Get peer review matrix for a project."""
    proj = project_store.get_project(project_id)
    if not proj:
        raise HTTPException(404, f"Project not found: {project_id}")
    return project_store.load_project_peer_matrix(project_id)


@router.get("/projects/{project_id}/comments", response_model=List[CommentResponse])
async def get_project_comments(project_id: str):
    """Get all feedback comments for a project."""
    proj = project_store.get_project(project_id)
    if not proj:
        raise HTTPException(404, f"Project not found: {project_id}")
    comments = project_store.load_project_comments(project_id)
    return [CommentResponse(**c) for c in comments]


@router.post("/projects/{project_id}/comments", response_model=CommentResponse)
async def create_project_comment(project_id: str, request: Request, comment: CommentCreateRequest):
    """Post a new feedback comment for a user in a project."""
    import jwt
    from api.auth import JWT_SECRET, JWT_ALGORITHM
    
    token = request.cookies.get("auth_token")
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        user_data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(401, "Invalid token")
        
    proj = project_store.get_project(project_id)
    if not proj:
        raise HTTPException(404, f"Project not found: {project_id}")
        
    author_email = user_data.get("email")
    author_name = user_data.get("name")
    
    saved = project_store.save_project_comment(
        project_id,
        author_email=author_email,
        author_name=author_name,
        target_email=comment.target_email,
        content=comment.content
    )
    return CommentResponse(**saved)


# ═══════════════════════════════════════════════════════════════════════════════
# LEGACY ENDPOINTS (backward compatibility)
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Pipeline Control ─────────────────────────────────────────────────────────

def _run_pipeline_thread(repo_path: str, project_id: str = None):
    """Run the full pipeline in a background thread."""
    try:
        _set_pipeline_status("running", "extraction", "0/?", "Starting...")

        from src.extractor import extract_all_commits
        from src.preprocessor import preprocess_all_commits
        from src.analyzer import analyze_all_commits
        from src.indexer import build_index
        from src.aggregator import build_contribution_vectors, save_vectors
        from src.feedback_coach import run_coaching_pipeline

        # Get directories
        if project_id:
            dirs = project_store.get_project_dirs(project_id)
        else:
            dirs = {
                "raw": "data/raw_commits",
                "preprocessed": "data/preprocessed_commits",
                "scored": "data/scored_commits",
                "index": "data/commit_index",
                "vectors": "output/contribution_vectors",
                "reports": "output/reports",
            }

        for d in dirs.values():
            os.makedirs(d, exist_ok=True)

        # Step 1
        _set_pipeline_status("running", "extraction", None, "Extracting commits...")
        count = extract_all_commits(repo_path, dirs["raw"])

        # Step 2
        _set_pipeline_status("running", "preprocessing", f"0/{count}", "Preprocessing...")
        preprocess_all_commits(dirs["raw"], dirs["preprocessed"])

        # Step 3
        _set_pipeline_status("running", "analysis", f"0/{count}", "AI analysis (may take minutes)...")
        analyze_all_commits(project_id, dirs["preprocessed"], dirs["scored"])

        # Step 4
        _set_pipeline_status("running", "indexing", None, "Building search index...")
        build_index(dirs["scored"], dirs.get("index", "data/commit_index"))

        # Step 5
        _set_pipeline_status("running", "aggregation", None, "Building contribution vectors...")
        vectors = build_contribution_vectors(project_id, dirs["scored"])
        save_vectors(project_id, vectors, dirs["vectors"])

        # Step 6
        _set_pipeline_status("running", "coaching", None, "Generating coaching feedback...")
        run_coaching_pipeline(project_id, vectors, dirs["vectors"])

        # Update project stats
        if project_id:
            author_emails = list(set(v["email"] for v in vectors))
            project_store.update_project_stats(project_id, count, len(vectors), author_emails)

        _set_pipeline_status("complete", None, None,
                             f"Done! Analyzed {count} commits for {len(vectors)} authors.")

    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        _set_pipeline_status("error", None, None, str(e))


@router.post("/analyze", response_model=StatusResponse)
async def analyze_repo(request: AnalyzeRequest):
    """Trigger the full analysis pipeline on a Git repository (legacy endpoint)."""
    with _pipeline_lock:
        if _pipeline_status["status"] == "running":
            raise HTTPException(400, "Pipeline already running")

    if not os.path.isdir(request.repo_path):
        raise HTTPException(400, f"Repository path not found: {request.repo_path}")

    thread = threading.Thread(target=_run_pipeline_thread, args=(request.repo_path,))
    thread.daemon = True
    thread.start()

    return StatusResponse(status="running", step="starting", message="Pipeline started")


@router.get("/status", response_model=StatusResponse)
async def get_status():
    """Get current pipeline status."""
    with _pipeline_lock:
        return StatusResponse(**_pipeline_status)


# ─── Results (Legacy) ────────────────────────────────────────────────────────

@router.get("/results", response_model=List[dict])
async def get_all_results():
    """Get all contribution vectors (legacy — reads from default dirs)."""
    if not os.path.isdir(VECTORS_DIR):
        return []

    vectors = []
    for fname in sorted(os.listdir(VECTORS_DIR)):
        if fname.endswith(".json") and not fname.startswith(("team_", "peer_")):
            try:
                data = load_json(os.path.join(VECTORS_DIR, fname))
                data.pop("_integrity", None)
                vectors.append(data)
            except Exception:
                continue

    vectors.sort(key=lambda v: v.get("composite_score", 0), reverse=True)
    return vectors


@router.get("/results/{email}")
async def get_person_results(email: str):
    """Get contribution vector for a specific person (legacy)."""
    safe_name = email.replace("@", "_").replace(".", "_")
    path = os.path.join(VECTORS_DIR, f"{safe_name}.json")
    if not os.path.exists(path):
        raise HTTPException(404, f"No results found for {email}")
    data = load_json(path)
    data.pop("_integrity", None)
    return data


# ─── Commits (Legacy) ────────────────────────────────────────────────────────

@router.get("/commits", response_model=List[dict])
async def get_commits(
    author: Optional[str] = Query(None),
    commit_type: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None),
):
    """Get scored commits with optional filters (legacy)."""
    if not os.path.isdir(SCORED_DIR):
        return []

    commits = []
    for fname in sorted(os.listdir(SCORED_DIR)):
        if not fname.endswith(".json"):
            continue
        try:
            data = load_json(os.path.join(SCORED_DIR, fname))
            scores = data.get("llm_scores", {})

            if author and data.get("author", {}).get("email", "") != author:
                continue
            if commit_type and scores.get("type", "") != commit_type:
                continue
            if min_score:
                avg = (scores.get("complexity", 0) + scores.get("integrity", 0) + scores.get("impact", 0)) / 3
                if avg < min_score:
                    continue

            commits.append({
                "short_hash": data.get("short_hash", ""),
                "author_name": data.get("author", {}).get("name", ""),
                "author_email": data.get("author", {}).get("email", ""),
                "subject": data.get("message", {}).get("subject", ""),
                "date": data.get("timestamps", {}).get("authored_date", ""),
                "commit_type": scores.get("type", "unknown"),
                "complexity": scores.get("complexity", 0),
                "integrity": scores.get("integrity", 0),
                "impact": scores.get("impact", 0),
                "is_spam": data.get("spam_check", {}).get("is_spam", False),
                "flag_count": data.get("flag_count", 0),
            })
        except Exception:
            continue

    return commits


# ─── NL Query ─────────────────────────────────────────────────────────────────

@router.post("/query", response_model=QueryResponse)
async def nl_query(request: QueryRequest):
    """Query the commit index with natural language."""
    try:
        from src.indexer import load_existing_index, query_index
        index = load_existing_index()
        if not index:
            raise HTTPException(503, "Index not built yet. Run the pipeline first.")
        answer = query_index(index, request.question)
        return QueryResponse(question=request.question, answer=answer)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Query failed: {e}")


# ─── Export ───────────────────────────────────────────────────────────────────

@router.get("/export/pdf/{email}")
async def export_person_pdf(email: str):
    """Generate and download an HTML report for one person."""
    safe_name = email.replace("@", "_").replace(".", "_")
    path = os.path.join(VECTORS_DIR, f"{safe_name}.json")
    if not os.path.exists(path):
        raise HTTPException(404, f"No results for {email}")

    vector = load_json(path)
    vector.pop("_integrity", None)
    report_path = generate_person_report(vector, REPORTS_DIR)
    return FileResponse(report_path, filename=f"{safe_name}_report.html", media_type="text/html")


@router.get("/export/pdf/team")
async def export_team_pdf():
    """Generate and download the full team report."""
    results = await get_all_results()
    if not results:
        raise HTTPException(404, "No results available")

    insights_path = os.path.join(VECTORS_DIR, "team_insights.json")
    matrix_path = os.path.join(VECTORS_DIR, "peer_review_matrix.json")

    insights = load_json(insights_path) if os.path.exists(insights_path) else {}
    matrix_data = load_json(matrix_path) if os.path.exists(matrix_path) else {}
    matrix = matrix_data.get("assignments", [])

    report_path = generate_team_report(results, insights, matrix, REPORTS_DIR)
    return FileResponse(report_path, filename="team_report.html", media_type="text/html")


# ─── Rubric ───────────────────────────────────────────────────────────────────

@router.get("/rubric")
async def get_rubric():
    """Get current rubric configuration."""
    return load_rubric()


@router.put("/rubric")
async def update_rubric(request: RubricUpdate):
    """Update rubric configuration."""
    rubric_path = os.path.join("prompts", "rubrics", "code_quality.json")
    save_json(request.rubric, rubric_path)
    audit_log("rubric_updated", {"success": True})
    return {"message": "Rubric updated", "rubric": request.rubric}


# ─── Audit ────────────────────────────────────────────────────────────────────

@router.get("/audit")
async def get_audit_log(limit: int = Query(50, le=200)):
    """Get recent audit log entries."""
    audit_path = "data/.audit_log.jsonl"
    if not os.path.exists(audit_path):
        return []
    try:
        with open(audit_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        entries = []
        for line in lines[-limit:]:
            try:
                entries.append(json.loads(line.strip()))
            except json.JSONDecodeError:
                continue
        return entries
    except Exception:
        return []

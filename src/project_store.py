"""
project_store.py — Server-side centralized project registry and data store.
Upgraded to use a single native SQLite database under <analyzer-root>/store/team_orchestrator.db
"""

import os
import json
import sqlite3
import uuid
from datetime import datetime
from typing import Optional, List

from src.utils import get_logger

logger = get_logger("project_store")

# ─── Store Root ──────────────────────────────────────────────────────────────

_DEFAULT_STORE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "store")
STORE_ROOT = os.environ.get("TEAM_ORCHESTRATOR_STORE", _DEFAULT_STORE)
DB_PATH = os.path.join(STORE_ROOT, "team_orchestrator.db")

def _init_db():
    os.makedirs(STORE_ROOT, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS projects (
                project_id TEXT PRIMARY KEY,
                name TEXT,
                repo_path TEXT,
                repo_full_name TEXT,
                user_name TEXT,
                user_email TEXT,
                created_at TEXT,
                last_analyzed TEXT,
                commit_count INTEGER,
                author_count INTEGER,
                authors_json TEXT
            )
        ''')
        # Migration: add repo_full_name if missing (existing DBs)
        try:
            conn.execute("ALTER TABLE projects ADD COLUMN repo_full_name TEXT")
        except sqlite3.OperationalError:
            pass  # column already exists
        conn.execute('''
            CREATE TABLE IF NOT EXISTS vectors (
                project_id TEXT,
                email TEXT,
                data_json TEXT,
                PRIMARY KEY (project_id, email)
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS commits (
                project_id TEXT,
                short_hash TEXT,
                data_json TEXT,
                PRIMARY KEY (project_id, short_hash)
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS comments (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                author_email TEXT,
                author_name TEXT,
                target_email TEXT,
                content TEXT,
                timestamp TEXT
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS project_meta (
                project_id TEXT,
                meta_key TEXT,
                data_json TEXT,
                PRIMARY KEY (project_id, meta_key)
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS user_selected_repos (
                user_email TEXT,
                repo_name TEXT,
                repo_full_name TEXT,
                html_url TEXT,
                owner_login TEXT,
                is_private INTEGER DEFAULT 0,
                added_at TEXT,
                PRIMARY KEY (user_email, repo_name)
            )
        ''')

_init_db()

# ─── Project Directory Layout (Legacy compat for reports/index) ──────────────

def get_project_dirs(project_id: str) -> dict:
    """
    Returns dict of absolute paths for a project's data directories.
    Even with SQLite, we need a place to put raw git diffs, search indices, and HTML reports.
    """
    base = os.path.join(STORE_ROOT, "projects", project_id)
    dirs = {
        "root": base,
        "raw": os.path.join(base, "raw_commits"),
        "preprocessed": os.path.join(base, "preprocessed_commits"),
        "scored": os.path.join(base, "scored_commits"),      # Legacy fallback
        "vectors": os.path.join(base, "vectors"),            # Legacy fallback
        "reports": os.path.join(base, "reports"),
        "cache": os.path.join(base, ".cache"),
        "index": os.path.join(base, "commit_index"),
    }
    for d in dirs.values():
        os.makedirs(d, exist_ok=True)
    return dirs


# ─── Registration ────────────────────────────────────────────────────────────

def register_project(
    project_id: str,
    repo_name: str,
    repo_path: str,
    user_name: str,
    user_email: str,
    repo_full_name: str = "",
) -> dict:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM projects WHERE project_id = ?", (project_id,))
        row = cur.fetchone()
        
        created_at = datetime.now().isoformat()
        
        if row:
            logger.info(f"  Project '{repo_name}' already registered (id: {project_id})")
            cur.execute(
                "UPDATE projects SET repo_path = ?, repo_full_name = COALESCE(?, repo_full_name) WHERE project_id = ?",
                (repo_path, repo_full_name or None, project_id),
            )
            proj = dict(row)
            proj["repo_path"] = repo_path
            proj["repo_full_name"] = repo_full_name or proj.get("repo_full_name") or ""
            proj["registered_by"] = {"name": proj["user_name"], "email": proj["user_email"]}
            proj["authors"] = json.loads(proj["authors_json"] or "[]")
            return proj
            
        cur.execute('''
            INSERT INTO projects (project_id, name, repo_path, repo_full_name, user_name, user_email, created_at, commit_count, author_count, authors_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, '[]')
        ''', (project_id, repo_name, repo_path, repo_full_name or None, user_name, user_email, created_at))
        
        logger.info(f"  ✓ Registered project '{repo_name}' in SQLite (id: {project_id})")
        get_project_dirs(project_id) # ensure directories exist for reports
        
        return {
            "project_id": project_id,
            "name": repo_name,
            "repo_path": repo_path,
            "repo_full_name": repo_full_name or "",
            "registered_by": {"name": user_name, "email": user_email},
            "created_at": created_at,
            "last_analyzed": None,
            "commit_count": 0,
            "author_count": 0,
            "authors": [],
        }


# ─── Listing & Retrieval ─────────────────────────────────────────────────────

def list_projects(email_filter: Optional[str] = None) -> List[dict]:
    projects = []
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM projects")
        for row in cur.fetchall():
            p = dict(row)
            p["registered_by"] = {"name": p["user_name"], "email": p["user_email"]}
            p["authors"] = json.loads(p.get("authors_json") or "[]")
            p["repo_full_name"] = p.get("repo_full_name") or ""
            
            if email_filter:
                if (p["user_email"] == email_filter or email_filter in p["authors"] or
                        p["user_email"] in ("unknown@unknown", "")):
                    projects.append(p)
            else:
                projects.append(p)
    return projects


def get_project(project_id: str) -> Optional[dict]:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM projects WHERE project_id = ?", (project_id,))
        row = cur.fetchone()
        if not row: return None
        
        p = dict(row)
        p["registered_by"] = {"name": p["user_name"], "email": p["user_email"]}
        p["authors"] = json.loads(p.get("authors_json") or "[]")
        p["repo_full_name"] = p.get("repo_full_name") or ""
        return p


def get_project_by_repo_full_name(repo_full_name: str) -> Optional[dict]:
    """Find project by GitHub owner/repo. Used for dashboard matching."""
    if not repo_full_name:
        return None
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM projects WHERE repo_full_name = ?", (repo_full_name,))
        row = cur.fetchone()
        if not row:
            return None
        p = dict(row)
        p["registered_by"] = {"name": p["user_name"], "email": p["user_email"]}
        p["authors"] = json.loads(p.get("authors_json") or "[]")
        p["repo_full_name"] = p.get("repo_full_name") or ""
        return p


# ─── Repo Full Name Update ───────────────────────────────────────────────────

def update_project_repo_full_name(project_id: str, repo_full_name: str) -> None:
    """Update repo_full_name for dashboard matching by owner/repo."""
    if not repo_full_name:
        return
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "UPDATE projects SET repo_full_name = ? WHERE project_id = ?",
            (repo_full_name, project_id),
        )


# ─── Stats Update ────────────────────────────────────────────────────────────

def update_project_stats(
    project_id: str,
    commit_count: int = 0,
    author_count: int = 0,
    authors: List[str] = None,
) -> None:
    authors_json = json.dumps(authors or [])
    last_analyzed = datetime.now().isoformat()
    
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            UPDATE projects 
            SET last_analyzed = ?, commit_count = ?, author_count = ?, authors_json = ?
            WHERE project_id = ?
        ''', (last_analyzed, commit_count, author_count, authors_json, project_id))
        logger.info(f"  ✓ Updated SQLite stats for {project_id}: {commit_count} commits, {author_count} authors")


# ─── Data Ingestion ──────────────────────────────────────────────────────────

def ingest_vectors(project_id: str, vectors: list) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        for v in vectors:
            email = v.get("email", "unknown")
            data_str = json.dumps(v, ensure_ascii=False)
            conn.execute('''
                INSERT OR REPLACE INTO vectors (project_id, email, data_json)
                VALUES (?, ?, ?)
            ''', (project_id, email, data_str))

def ingest_scored_commits(project_id: str, commits: list) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        for c in commits:
            short_hash = c.get("short_hash", "unknown")
            data_str = json.dumps(c, ensure_ascii=False)
            conn.execute('''
                INSERT OR REPLACE INTO commits (project_id, short_hash, data_json)
                VALUES (?, ?, ?)
            ''', (project_id, short_hash, data_str))

def load_project_vectors(project_id: str) -> list:
    vectors = []
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("SELECT data_json FROM vectors WHERE project_id = ?", (project_id,))
        for row in cur.fetchall():
            try:
                data = json.loads(row[0])
                data.pop("_integrity", None)
                vectors.append(data)
            except Exception:
                pass
                
    vectors.sort(key=lambda v: v.get("composite_score", 0), reverse=True)
    return vectors

def load_project_scored_commits(project_id: str) -> list:
    commits = []
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("SELECT data_json FROM commits WHERE project_id = ?", (project_id,))
        for row in cur.fetchall():
            try:
                commits.append(json.loads(row[0]))
            except Exception:
                pass
    return commits

# For team insights and peer matrix, we save them generically in project_meta
def save_project_meta(project_id: str, key: str, data: dict):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            INSERT OR REPLACE INTO project_meta (project_id, meta_key, data_json)
            VALUES (?, ?, ?)
        ''', (project_id, key, json.dumps(data)))

def load_project_team_insights(project_id: str) -> dict:
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("SELECT data_json FROM project_meta WHERE project_id = ? AND meta_key = 'team_insights'", (project_id,))
        row = cur.fetchone()
        if row: return json.loads(row[0])
    return {}

def load_project_peer_matrix(project_id: str) -> list:
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("SELECT data_json FROM project_meta WHERE project_id = ? AND meta_key = 'peer_matrix'", (project_id,))
        row = cur.fetchone()
        if row: return json.loads(row[0]).get("assignments", [])
    return []

# ─── Feedback & Comments ─────────────────────────────────────────────────────

def load_project_comments(project_id: str) -> list:
    comments = []
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM comments WHERE project_id = ? ORDER BY timestamp ASC", (project_id,))
        for row in cur.fetchall():
            comments.append(dict(row))
    return comments

def save_project_comment(project_id: str, author_email: str, author_name: str, target_email: str, content: str) -> dict:
    comment_id = str(uuid.uuid4())
    timestamp = datetime.now().isoformat()
    
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''
            INSERT INTO comments (id, project_id, author_email, author_name, target_email, content, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (comment_id, project_id, author_email, author_name, target_email, content, timestamp))
        
    return {
        "id": comment_id,
        "project_id": project_id,
        "author_email": author_email,
        "author_name": author_name,
        "target_email": target_email,
        "content": content,
        "timestamp": timestamp
    }


# ─── Sync from Files (ensure SQLite has latest from CLI) ─────────────────────

def sync_project_from_files(project_id: str) -> dict:
    """Load vectors and commits from project dirs into SQLite. Returns counts."""
    from src.utils import load_json
    dirs = get_project_dirs(project_id)
    vectors = []
    commits = []
    vec_dir = dirs["vectors"]
    scored_dir = dirs["scored"]
    if os.path.isdir(vec_dir):
        for f in os.listdir(vec_dir):
            if f.endswith(".json"):
                try:
                    v = load_json(os.path.join(vec_dir, f))
                    v.pop("_integrity", None)
                    vectors.append(v)
                except Exception:
                    pass
    if os.path.isdir(scored_dir):
        for f in os.listdir(scored_dir):
            if f.endswith(".json"):
                try:
                    c = load_json(os.path.join(scored_dir, f))
                    commits.append(c)
                except Exception:
                    pass
    if vectors:
        ingest_vectors(project_id, vectors)
    if commits:
        ingest_scored_commits(project_id, commits)
    if vectors or commits:
        author_emails = list(set(v.get("email", "") for v in vectors))
        update_project_stats(project_id, len(commits), len(vectors), author_emails)
    return {"vectors": len(vectors), "commits": len(commits)}


def sync_all_projects_from_files() -> List[dict]:
    """Scan store/projects/ and sync each project's files into SQLite."""
    projects_dir = os.path.join(STORE_ROOT, "projects")
    if not os.path.isdir(projects_dir):
        return []
    results = []
    for name in os.listdir(projects_dir):
        path = os.path.join(projects_dir, name)
        if os.path.isdir(path) and not name.startswith("."):
            try:
                if not get_project(name):
                    register_project(
                        project_id=name,
                        repo_name=name.split("_")[0] if "_" in name else name,
                        repo_path=path,
                        user_name="Unknown",
                        user_email="unknown@unknown",
                    )
                counts = sync_project_from_files(name)
                if counts["vectors"] or counts["commits"]:
                    results.append({"project_id": name, **counts})
            except Exception as e:
                logger.warning(f"Sync failed for {name}: {e}")
    return results


# ─── User Repo Selection ─────────────────────────────────────────────────────

def get_selected_repos(user_email: str) -> List[dict]:
    repos = []
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM user_selected_repos WHERE user_email = ? ORDER BY added_at DESC", (user_email,))
        for row in cur.fetchall():
            repos.append(dict(row))
    return repos


def add_selected_repos(user_email: str, repos: List[dict]) -> List[dict]:
    added = []
    now = datetime.now().isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        for r in repos:
            conn.execute('''
                INSERT OR REPLACE INTO user_selected_repos
                (user_email, repo_name, repo_full_name, html_url, owner_login, is_private, added_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_email,
                r.get("name", ""),
                r.get("full_name", ""),
                r.get("html_url", ""),
                r.get("owner_login", ""),
                1 if r.get("private") else 0,
                now,
            ))
            added.append({
                "user_email": user_email,
                "repo_name": r.get("name", ""),
                "repo_full_name": r.get("full_name", ""),
                "html_url": r.get("html_url", ""),
                "owner_login": r.get("owner_login", ""),
                "is_private": r.get("private", False),
                "added_at": now,
            })
    return added


def remove_selected_repo(user_email: str, repo_name: str) -> bool:
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM user_selected_repos WHERE user_email = ? AND repo_name = ?",
                     (user_email, repo_name))
        return cur.rowcount > 0

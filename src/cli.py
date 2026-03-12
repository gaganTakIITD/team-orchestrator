"""
cli.py — Team Orchestrator CLI entry point.
Registered as 'team-orchestrator' console script via pyproject.toml.
Subcommands: init, analyze, list, serve.
"""

import os
import sys
import stat
import hashlib
import argparse

# Force UTF-8 encoding for Windows terminals to prevent charmap errors on emojis
if sys.stdout.encoding != 'utf-8':
    sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

# Ensure project root is on path for imports
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


SERVER_URL = os.environ.get("TEAM_ORCHESTRATOR_SERVER_URL", "http://localhost:8000")


def _derive_project_id(repo_path: str) -> str:
    """Generate a unique project ID from repo name + path hash."""
    repo_name = os.path.basename(os.path.normpath(repo_path))
    path_hash = hashlib.sha256(os.path.abspath(repo_path).encode()).hexdigest()[:8]
    return f"{repo_name}_{path_hash}"


def _get_git_identity(repo_path: str) -> tuple:
    """Read user.name and user.email from .git/config."""
    import git
    repo = git.Repo(repo_path)
    reader = repo.config_reader()
    try:
        name = reader.get_value("user", "name")
    except Exception:
        name = "Unknown"
    try:
        email = reader.get_value("user", "email")
    except Exception:
        email = "unknown@unknown"
    return name, email


# ─── init ────────────────────────────────────────────────────────────────────

def cmd_init(args):
    """Register a git repo and install post-commit hook."""
    import git
    from src.project_store import register_project

    user_cwd = getattr(args, '_user_cwd', os.getcwd())
    repo_path = os.path.abspath(args.path or user_cwd)

    # Validate git repo
    try:
        repo = git.Repo(repo_path)
    except (git.InvalidGitRepositoryError, git.NoSuchPathError):
        print(f"  ✗ Not a git repository: {repo_path}")
        print(f"    Run this command from inside a git repo, or use --path")
        sys.exit(1)

    # Read identity
    user_name, user_email = _get_git_identity(repo_path)
    repo_name = os.path.basename(os.path.normpath(repo_path))
    project_id = _derive_project_id(repo_path)

    print()
    print("=" * 50)
    print("  🧬 Team Orchestrator — Init")
    print("=" * 50)
    print(f"\n  Repository:  {repo_name}")
    print(f"  Path:        {repo_path}")
    print(f"  Identity:    {user_name} <{user_email}>")
    print(f"  Project ID:  {project_id}")

    # Register with project store (local)
    project = register_project(
        project_id=project_id,
        repo_name=repo_name,
        repo_path=repo_path,
        user_name=user_name,
        user_email=user_email,
    )

    # Try to register with server too
    try:
        import requests
        resp = requests.post(f"{SERVER_URL}/api/projects/register", json={
            "project_id": project_id,
            "repo_name": repo_name,
            "repo_path": repo_path,
            "user_name": user_name,
            "user_email": user_email,
        }, timeout=3)
        if resp.ok:
            print(f"\n  ✓ Registered with server")
        else:
            print(f"\n  ⚠ Server responded with error (project registered locally)")
    except Exception:
        print(f"\n  ⚠ Server not running (project registered locally)")
        print(f"    Start the server with: team-orchestrator serve")

    # Install post-commit hook
    hooks_dir = os.path.join(repo_path, ".git", "hooks")
    os.makedirs(hooks_dir, exist_ok=True)
    hook_path = os.path.join(hooks_dir, "post-commit")

    # Find the team-orchestrator command
    # Use the Python executable that's running this script to ensure correct env
    python_exe = sys.executable

    if os.name == "nt":
        # Windows: use a shell script that Git for Windows can execute
        hook_content = f"""#!/bin/sh
# Team Orchestrator — auto-analyze on commit
"{python_exe}" -m src.cli analyze --latest --project-id {project_id} --repo-path "{repo_path}" &
"""
    else:
        hook_content = f"""#!/bin/sh
# Team Orchestrator — auto-analyze on commit
"{python_exe}" -m src.cli analyze --latest --project-id {project_id} --repo-path "{repo_path}" &
"""

    # Check if hook already exists
    if os.path.exists(hook_path):
        with open(hook_path, "r", encoding="utf-8") as f:
            existing = f.read()
        if "Team Orchestrator" in existing:
            print(f"  ✓ Post-commit hook already installed")
        else:
            # Append to existing hook
            with open(hook_path, "a", encoding="utf-8") as f:
                f.write(f"\n{hook_content}")
            print(f"  ✓ Appended to existing post-commit hook")
    else:
        with open(hook_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(hook_content)
        # Make executable (Unix)
        if os.name != "nt":
            current = os.stat(hook_path).st_mode
            os.chmod(hook_path, current | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
        print(f"  ✓ Installed post-commit hook")

    print(f"\n  ✅ Done! Every commit will now auto-analyze.")
    print(f"  To run a full analysis: team-orchestrator analyze")
    print(f"  To start the dashboard: team-orchestrator serve")
    print()


# ─── analyze ─────────────────────────────────────────────────────────────────

def cmd_analyze(args):
    """Run analysis pipeline on a git repo."""
    user_cwd = getattr(args, '_user_cwd', os.getcwd())
    repo_path = os.path.abspath(args.repo_path or user_cwd)
    project_id = args.project_id or _derive_project_id(repo_path)

    # Ensure project is registered
    from src.project_store import get_project, register_project
    project = get_project(project_id)
    if not project:
        user_name, user_email = _get_git_identity(repo_path)
        repo_name = os.path.basename(os.path.normpath(repo_path))
        register_project(project_id, repo_name, repo_path, user_name, user_email)

    if args.latest:
        _analyze_latest(repo_path, project_id)
    else:
        _analyze_full(repo_path, project_id)


def _analyze_full(repo_path: str, project_id: str):
    """Run the full pipeline on all commits."""
    from src.project_store import get_project_dirs, update_project_stats, get_project
    from src.security import validate_repo_path, audit_log

    import time

    valid, error = validate_repo_path(repo_path)
    if not valid:
        print(f"  ✗ {error}")
        sys.exit(1)

    dirs = get_project_dirs(project_id)
    audit_log("pipeline_start", {"repo_path": repo_path, "project_id": project_id})

    print()
    print("=" * 60)
    print("  🚀 Team Orchestrator — Analysis Pipeline")
    print("=" * 60)
    print(f"  Project: {project_id}")
    print(f"  Repo:    {repo_path}")
    print()

    pipeline_start = time.time()

    # Step 1: Extract
    print("🔍 Step 1: Extracting commits from git...")
    from src.extractor import extract_all_commits
    count = extract_all_commits(repo_path, dirs["raw"])
    print(f"   ✓ Extracted {count} commits")

    if count == 0:
        print("\n  ⚠ No commits found. Check your repository.")
        sys.exit(1)

    # Step 2: Preprocess
    print("\n🧹 Step 2: Preprocessing commits (5-stage analysis)...")
    from src.preprocessor import preprocess_all_commits
    preprocess_all_commits(dirs["raw"], dirs["preprocessed"])
    print(f"   ✓ Preprocessed {count} commits")

    # Step 3: AI Analysis
    print("\n🤖 Step 3: Analyzing with AI (this may take several minutes)...")
    from src.analyzer import analyze_all_commits
    analyze_all_commits(project_id, dirs["preprocessed"], dirs["scored"])
    print(f"   ✓ Scored {count} commits")

    # Step 4: Index
    print("\n📚 Step 4: Building searchable index...")
    from src.indexer import build_index
    index = build_index(dirs["scored"], dirs["index"])
    if index:
        print(f"   ✓ Indexed {count} commits")
    else:
        print("   ⚠ Indexing skipped (Ollama models may not be available)")

    # Step 5: Aggregate
    print("\n📊 Step 5: Building contribution vectors...")
    from src.aggregator import build_contribution_vectors, save_vectors
    vectors = build_contribution_vectors(project_id, dirs["scored"])
    save_vectors(project_id, vectors, dirs["vectors"])
    print(f"   ✓ Generated vectors for {len(vectors)} team members")

    # Step 6: Coaching
    print("\n🎓 Step 6: Generating coaching feedback...")
    from src.feedback_coach import run_coaching_pipeline
    coaching_result = run_coaching_pipeline(project_id, vectors, dirs["vectors"])
    assignments = coaching_result.get("peer_review_matrix", [])
    print(f"   ✓ Generated {len(assignments)} peer review assignments")

    # Step 7: Reports
    print("\n📄 Step 7: Generating reports...")
    from src.report_generator import generate_person_report, generate_team_report
    for v in vectors:
        generate_person_report(v, dirs["reports"])
    insights = coaching_result.get("team_insights", {})
    generate_team_report(vectors, insights, assignments, dirs["reports"])
    print(f"   ✓ Generated {len(vectors) + 1} reports")

    # Update project stats
    author_emails = list(set(v["email"] for v in vectors))
    update_project_stats(project_id, count, len(vectors), author_emails)

    elapsed = time.time() - pipeline_start
    print(f"\n✅ Pipeline complete in {elapsed:.1f}s!")

    # Print summary
    _print_summary(vectors)

    audit_log("pipeline_complete", {
        "project_id": project_id,
        "total_commits": count,
        "total_authors": len(vectors),
        "elapsed_seconds": round(elapsed, 1),
        "success": True,
    })

    # Push to server so dashboard shows data
    proj = get_project(project_id)
    _try_ingest_to_server(project_id, vectors, dirs=dirs, project=proj, repo_path=repo_path)

    print(f"\n🌐 To start the server:   team-orchestrator serve")
    print(f"📊 To view the dashboard: streamlit run src/dashboard.py")
    print()


def _analyze_latest(repo_path: str, project_id: str):
    """Analyze only the latest commit (called by post-commit hook)."""
    import git
    from src.project_store import get_project_dirs, update_project_stats, get_project
    from src.extractor import _extract_single_commit
    from src.security import sign_output, audit_log

    try:
        repo = git.Repo(repo_path)
        head_commit = repo.head.commit
    except Exception as e:
        # Silently fail in hook mode — don't spam terminal
        return

    dirs = get_project_dirs(project_id)
    short_hash = head_commit.hexsha[:7]
    out_path = os.path.join(dirs["raw"], f"{short_hash}.json")

    # Skip if already processed
    if os.path.exists(out_path):
        return

    try:
        # Extract
        from src.security import sanitize_author_info
        data = _extract_single_commit(head_commit, repo)
        data = sign_output(data, "extraction")
        from src.utils import save_json
        save_json(data, out_path)

        # Preprocess
        from src.preprocessor import preprocess_all_commits
        preprocess_all_commits(dirs["raw"], dirs["preprocessed"])

        # AI analysis (just the new commit)
        pre_path = os.path.join(dirs["preprocessed"], f"{short_hash}.json")
        scored_path = os.path.join(dirs["scored"], f"{short_hash}.json")
        if os.path.exists(pre_path) and not os.path.exists(scored_path):
            from src.analyzer import analyze_all_commits
            analyze_all_commits(project_id, dirs["preprocessed"], dirs["scored"])

        # Re-aggregate all commits
        from src.aggregator import build_contribution_vectors, save_vectors
        vectors = build_contribution_vectors(project_id, dirs["scored"])
        save_vectors(project_id, vectors, dirs["vectors"])

        # Update coaching
        from src.feedback_coach import run_coaching_pipeline
        run_coaching_pipeline(project_id, vectors, dirs["vectors"])

        # Update stats
        author_emails = list(set(v["email"] for v in vectors))
        commit_count = len([f for f in os.listdir(dirs["scored"]) if f.endswith(".json")])
        update_project_stats(project_id, commit_count, len(vectors), author_emails)

        # Push to server so dashboard shows data
        proj = get_project(project_id)
        _try_ingest_to_server(project_id, vectors, dirs=dirs, project=proj, repo_path=repo_path)

        audit_log("incremental_analysis", {
            "project_id": project_id,
            "commit": short_hash,
            "success": True,
        })
    except Exception as e:
        audit_log("incremental_analysis", {
            "project_id": project_id,
            "commit": short_hash,
            "success": False,
            "error": str(e),
        })


def _try_ingest_to_server(project_id: str, vectors: list, dirs: dict = None, project: dict = None, repo_path: str = ""):
    """Try to POST analysis results to the server. Silently fail if offline."""
    try:
        import requests
        from src.utils import load_json

        # Load scored commits from disk so server has full data for dashboard
        scored_commits = []
        if dirs and os.path.isdir(dirs.get("scored", "")):
            for f in os.listdir(dirs["scored"]):
                if f.endswith(".json"):
                    try:
                        scored_commits.append(load_json(os.path.join(dirs["scored"], f)))
                    except Exception:
                        pass

        payload = {
            "vectors": vectors,
            "scored_commits": scored_commits,
        }
        # Include project metadata so server can auto-register if needed
        if project:
            meta = {
                "repo_name": project.get("name", project_id.split("_")[0] if "_" in project_id else project_id),
                "repo_path": project.get("repo_path", repo_path),
                "user_name": project.get("user_name", "Unknown"),
                "user_email": project.get("user_email", "unknown@unknown"),
            }
        else:
            # Fallback when project not in local DB (e.g. hook ran before init)
            first = vectors[0] if vectors else {}
            meta = {
                "repo_name": project_id.split("_")[0] if "_" in project_id else project_id,
                "repo_path": repo_path,
                "user_name": first.get("name", "Unknown"),
                "user_email": first.get("email", "unknown@unknown"),
            }
        payload["project_meta"] = meta

        resp = requests.post(
            f"{SERVER_URL}/api/projects/{project_id}/ingest",
            json=payload,
            timeout=10,
        )
        if resp.ok:
            print(f"\n  ✓ Pushed analysis to server ({SERVER_URL})")
        else:
            print(f"\n  ⚠ Server ingest failed: {resp.status_code}")
    except Exception as e:
        pass  # Server may not be running — that's fine


def _print_summary(vectors: list):
    """Print results table."""
    print()
    print("─" * 60)
    print(f"{'Name':<25} {'Score':>6} {'Grade':>6} {'Commits':>8} {'Spam%':>6}")
    print("─" * 60)
    for v in vectors:
        spam_pct = f"{v['quality_flags']['spam_rate']:.0%}"
        print(f"{v['name']:<25} {v['composite_score']:>6.2f} {v['suggested_grade']:>6} "
              f"{v['total_commits']:>8} {spam_pct:>6}")
    print("─" * 60)
    print()


# ─── list ────────────────────────────────────────────────────────────────────

def cmd_list(args):
    """List all registered projects."""
    from src.project_store import list_projects

    projects = list_projects(email_filter=args.email)

    print()
    print("=" * 60)
    print("  🧬 Team Orchestrator — Projects")
    print("=" * 60)

    if not projects:
        print("\n  No projects registered yet.")
        print("  Run 'team-orchestrator init' from a git repo to get started.")
        print()
        return

    print()
    print(f"  {'Project':<20} {'Commits':>8} {'Authors':>8} {'Last Analyzed':<20}")
    print("  " + "─" * 56)
    for p in projects:
        last = p.get("last_analyzed", "Never")
        if last and last != "Never":
            last = last[:19]  # trim to datetime without microseconds
        print(f"  {p['name']:<20} {p['commit_count']:>8} {p['author_count']:>8} {last:<20}")
    print()


# ─── serve ───────────────────────────────────────────────────────────────────

def cmd_serve(args):
    """Start the FastAPI server."""
    import uvicorn

    port = args.port or 8000

    print()
    print("=" * 60)
    print("  🧬 Team Orchestrator — Server")
    print("=" * 60)
    print(f"\n  🌐 API:       http://localhost:{port}")
    print(f"  📖 Docs:      http://localhost:{port}/docs")
    print(f"  📊 Dashboard: run 'streamlit run src/dashboard.py' in another terminal")
    print()

    # Change to project root so imports work
    os.chdir(PROJECT_ROOT)

    uvicorn.run("api.server:app", host="0.0.0.0", port=port, reload=True)


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        prog="team-orchestrator",
        description="🧬 Team Orchestrator — AI-Powered Peer Feedback Coach for STEM Outputs",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # init
    init_parser = subparsers.add_parser("init", help="Register a git repo and install post-commit hook")
    init_parser.add_argument("--path", type=str, default=None,
                             help="Path to git repo (default: current directory)")

    # analyze
    analyze_parser = subparsers.add_parser("analyze", help="Run analysis pipeline")
    analyze_parser.add_argument("--latest", action="store_true",
                                help="Analyze only the latest commit (used by hook)")
    analyze_parser.add_argument("--project-id", type=str, default=None,
                                help="Project ID (auto-derived if not specified)")
    analyze_parser.add_argument("--repo-path", type=str, default=None,
                                help="Path to git repo (default: current directory)")

    # list
    list_parser = subparsers.add_parser("list", help="List all registered projects")
    list_parser.add_argument("--email", type=str, default=None,
                             help="Filter by email (user mode)")

    # serve
    serve_parser = subparsers.add_parser("serve", help="Start the FastAPI server")
    serve_parser.add_argument("--port", type=int, default=None,
                              help="Port number (default: 8000)")

    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        sys.exit(0)

    # Save the user's actual CWD before changing to project root
    original_cwd = os.getcwd()
    args._user_cwd = original_cwd

    # Change to project root so src.* imports work
    os.chdir(PROJECT_ROOT)

    commands = {
        "init": cmd_init,
        "analyze": cmd_analyze,
        "list": cmd_list,
        "serve": cmd_serve,
    }

    try:
        commands[args.command](args)
    finally:
        os.chdir(original_cwd)


if __name__ == "__main__":
    main()

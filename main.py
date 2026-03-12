"""
main.py — Pipeline Entry Point.
Runs the full analysis pipeline. Can be invoked directly or via CLI.
Supports dynamic project paths via the project store.
"""

import os
import sys
import time

# ─── Setup paths ──────────────────────────────────────────────────────────────
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)
os.chdir(PROJECT_ROOT)

from src.utils import get_logger, load_json
from src.security import validate_repo_path, audit_log

logger = get_logger("main")


def create_directories(dirs: dict):
    """Create all required data directories from a dirs dict."""
    for d in dirs.values():
        os.makedirs(d, exist_ok=True)


def print_banner():
    print()
    print("═" * 60)
    print("  🧬 AI Git Contribution Analyzer")
    print("  Grand Challenge 4 — Peer Feedback Coach")
    print("═" * 60)
    print()


def print_summary_table(vectors: list):
    """Print a final results table."""
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


def print_detailed_profiles(vectors: list):
    """Print detailed profiles for each team member."""
    for v in vectors:
        scores = v["average_scores"]
        growth = v.get("skill_growth", {})
        coaching = v.get("coaching_summary", {})

        print(f"\n  {v['name']}")
        print(f"    Composite Score:  {v['composite_score']:.1f} / 5.0  →  Grade: {v['suggested_grade']}")
        print(f"    Complexity:       {scores['complexity']:.1f} avg")
        print(f"    Integrity:        {scores['integrity']:.1f} avg")
        print(f"    Impact:           {scores['impact']:.1f} avg")

        breakdown = v.get("commit_breakdown", {})
        types_str = ", ".join(f"{count} {t}" for t, count in breakdown.items() if count > 0)
        print(f"    Commit types:     {types_str}")
        print(f"    Effort spread:    {v['effort_spread']:.2f}")
        print(f"    Spam rate:        {v['quality_flags']['spam_rate']:.1%}")

        if growth.get("trend") and growth["trend"] != "insufficient_data":
            trend_arrow = "↑" if growth["trend"] == "improving" else "↓" if growth["trend"] == "declining" else "→"
            print(f"    Skill growth:     {trend_arrow} {growth['trend']} "
                  f"({growth['first_half_avg']:.1f} → {growth['second_half_avg']:.1f})")

        if coaching.get("top_strengths"):
            print(f"    Top strengths:    {'; '.join(coaching['top_strengths'][:2])}")
        if coaching.get("top_improvements"):
            print(f"    Improvements:     {'; '.join(coaching['top_improvements'][:2])}")


def run_pipeline(repo_path: str, project_id: str = None):
    """
    Run the full analysis pipeline on a git repository.

    Args:
        repo_path: Absolute path to the git repository.
        project_id: Optional project ID for the project store.
                    If None, uses legacy local data dirs.
    """
    print_banner()

    # Validate repo path
    valid, error = validate_repo_path(repo_path)
    if not valid:
        print(f"  ✗ {error}")
        sys.exit(1)

    # Determine data directories
    if project_id:
        from src.project_store import get_project_dirs, update_project_stats
        dirs = get_project_dirs(project_id)
    else:
        # Legacy mode: use local dirs
        dirs = {
            "raw": "data/raw_commits",
            "preprocessed": "data/preprocessed_commits",
            "scored": "data/scored_commits",
            "index": "data/commit_index",
            "vectors": "output/contribution_vectors",
            "reports": "output/reports",
            "cache": "data/.cache",
        }

    create_directories(dirs)
    audit_log("pipeline_start", {"repo_path": repo_path, "project_id": project_id})

    pipeline_start = time.time()

    # ── Step 1: Extract ──────────────────────────────────────────────────
    print("🔍 Step 1: Extracting commits from git...")
    from src.extractor import extract_all_commits
    count = extract_all_commits(repo_path, dirs["raw"])
    print(f"   ✓ Extracted {count} commits")

    if count == 0:
        print("\n  ⚠ No commits found. Check your repository path and branch name.")
        sys.exit(1)

    # ── Step 2: Preprocess ───────────────────────────────────────────────
    print("\n🧹 Step 2: Preprocessing commits (5-stage analysis)...")
    from src.preprocessor import preprocess_all_commits
    preprocess_all_commits(dirs["raw"], dirs["preprocessed"])
    print(f"   ✓ Preprocessed {count} commits")

    # Count flagged commits
    flagged = 0
    for fname in os.listdir(dirs["preprocessed"]):
        if fname.endswith(".json"):
            data = load_json(os.path.join(dirs["preprocessed"], fname))
            if data.get("flag_count", 0) > 0:
                flagged += 1
    print(f"   🚩 Flagged {flagged} commits for review")

    # ── Step 3: AI Analysis ──────────────────────────────────────────────
    print("\n🤖 Step 3: Analyzing with AI (this may take several minutes)...")
    from src.analyzer import analyze_all_commits
    analyze_all_commits(dirs["preprocessed"], dirs["scored"])
    print(f"   ✓ Scored {count} commits")

    # ── Step 4: Index ────────────────────────────────────────────────────
    print("\n📚 Step 4: Building searchable index...")
    from src.indexer import build_index
    index = build_index(dirs["scored"], dirs["index"])
    if index:
        print(f"   ✓ Indexed {count} commits")
    else:
        print("   ⚠ Indexing skipped (Ollama models may not be available)")

    # ── Step 5: Aggregate ────────────────────────────────────────────────
    print("\n📊 Step 5: Building contribution vectors...")
    from src.aggregator import build_contribution_vectors, save_vectors
    vectors = build_contribution_vectors(dirs["scored"])
    save_vectors(vectors, dirs["vectors"])
    print(f"   ✓ Generated vectors for {len(vectors)} team members")

    # ── Step 6: Coaching ─────────────────────────────────────────────────
    print("\n🎓 Step 6: Generating coaching feedback...")
    from src.feedback_coach import run_coaching_pipeline
    coaching_result = run_coaching_pipeline(vectors, dirs["vectors"])
    assignments = coaching_result.get("peer_review_matrix", [])
    print(f"   ✓ Generated {len(assignments)} peer review assignments")

    # ── Step 7: Reports ──────────────────────────────────────────────────
    print("\n📄 Step 7: Generating reports...")
    from src.report_generator import generate_person_report, generate_team_report
    for v in vectors:
        generate_person_report(v, dirs["reports"])
    insights = coaching_result.get("team_insights", {})
    generate_team_report(vectors, insights, assignments, dirs["reports"])
    print(f"   ✓ Generated {len(vectors) + 1} reports")

    # ── Summary ──────────────────────────────────────────────────────────
    elapsed = time.time() - pipeline_start
    print(f"\n✅ Pipeline complete in {elapsed:.1f}s!")

    print_summary_table(vectors)
    print_detailed_profiles(vectors)

    # Update project store stats
    if project_id:
        author_emails = list(set(v["email"] for v in vectors))
        update_project_stats(project_id, count, len(vectors), author_emails)

    audit_log("pipeline_complete", {
        "project_id": project_id,
        "total_commits": count,
        "total_authors": len(vectors),
        "elapsed_seconds": round(elapsed, 1),
        "success": True,
    })

    print(f"\n🌐 To start the server:   team-orchestrator serve")
    print(f"📊 To view the dashboard: streamlit run src/dashboard.py")
    print()

    return vectors


def main():
    """CLI-compatible main. Accepts optional repo path as argument."""
    if len(sys.argv) > 1:
        repo_path = sys.argv[1]
    else:
        # Prompt user
        print("Enter the path to a git repository to analyze:")
        repo_path = input("  > ").strip()
        if not repo_path:
            print("  ✗ No path provided. Usage: python main.py <repo-path>")
            print("  Or use: team-orchestrator analyze")
            sys.exit(1)

    run_pipeline(repo_path)


if __name__ == "__main__":
    main()

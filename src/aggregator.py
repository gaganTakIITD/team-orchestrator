"""
aggregator.py — Per-Person Contribution Vectors.
Groups all scored commits by author, computes composite scores, detects skill growth,
identifies multi-email authors, and generates peer review suggestions.
"""

import os
import json
from collections import Counter, defaultdict
from typing import List, Dict
from statistics import mean

from src.utils import get_logger, load_json, save_json, load_rubric
from src.security import sign_output, audit_log

logger = get_logger("aggregator")


# ─── Grade Mapping ───────────────────────────────────────────────────────────

def _compute_grade(composite: float, thresholds: dict = None) -> str:
    """Map composite score to letter grade."""
    if thresholds is None:
        thresholds = {"A+": 4.5, "A": 4.0, "B+": 3.5, "B": 3.0, "C": 2.5, "D": 0}
    for grade in ["A+", "A", "B+", "B", "C", "D"]:
        if composite >= thresholds.get(grade, 0):
            return grade
    return "D"


def _safe_email_filename(email: str) -> str:
    """Convert email to filesystem-safe filename."""
    return email.replace("@", "_").replace(".", "_")


# ─── Multi-Email Author Detection ────────────────────────────────────────────

def _merge_multi_email_authors(commits_by_email: dict) -> dict:
    """
    Detect authors using multiple emails. Merge under most-used email.
    Heuristic: if two emails share the same name (case-insensitive), merge them.
    """
    name_to_emails = defaultdict(list)
    email_to_name = {}

    for email, commits in commits_by_email.items():
        if commits:
            name = commits[0].get("author", {}).get("name", "").strip().lower()
            name_to_emails[name].append(email)
            email_to_name[email] = commits[0].get("author", {}).get("name", "Unknown")

    merged = {}
    merged_notes = {}

    for name, emails in name_to_emails.items():
        if len(emails) > 1:
            # Use the email with most commits as primary
            primary = max(emails, key=lambda e: len(commits_by_email.get(e, [])))
            all_commits = []
            aliases = []
            for e in emails:
                all_commits.extend(commits_by_email.get(e, []))
                if e != primary:
                    aliases.append(e)
            merged[primary] = all_commits
            merged_notes[primary] = f"Merged aliases: {', '.join(aliases)}"
        else:
            merged[emails[0]] = commits_by_email[emails[0]]

    return merged, merged_notes


# ─── Skill Growth Detection ──────────────────────────────────────────────────

def _compute_skill_growth(commits: list) -> dict:
    """Compare first-half vs second-half score averages."""
    if len(commits) < 4:
        return {"first_half_avg": 0, "second_half_avg": 0, "trend": "insufficient_data", "growth_rate": 0}

    sorted_commits = sorted(commits, key=lambda c: c.get("timestamps", {}).get("authored_date", ""))
    mid = len(sorted_commits) // 2

    def avg_score(commit_list):
        scores_list = []
        for c in commit_list:
            s = c.get("llm_scores", {})
            avg = (s.get("complexity", 2) + s.get("integrity", 2) + s.get("impact", 2)) / 3
            scores_list.append(avg)
        return mean(scores_list) if scores_list else 0

    first = avg_score(sorted_commits[:mid])
    second = avg_score(sorted_commits[mid:])
    growth = (second - first) / max(first, 0.01)

    if growth > 0.1:
        trend = "improving"
    elif growth < -0.1:
        trend = "declining"
    else:
        trend = "stable"

    return {
        "first_half_avg": round(first, 2),
        "second_half_avg": round(second, 2),
        "trend": trend,
        "growth_rate": round(growth, 3),
    }


# ─── Peer Review Suggestions ─────────────────────────────────────────────────

def _generate_peer_review_suggestions(commits: list, max_suggestions: int = 5) -> list:
    """Find commits that would benefit most from peer review."""
    candidates = []
    for c in commits:
        scores = c.get("llm_scores", {})
        if scores.get("type") == "spam":
            continue
        avg = (scores.get("integrity", 5) + scores.get("impact", 5)) / 2
        if avg < 3.5:
            candidates.append({
                "hash": c.get("short_hash", ""),
                "subject": c.get("message", {}).get("subject", "")[:60],
                "reason": f"Low integrity ({scores.get('integrity')})/impact ({scores.get('impact')}) scores",
                "avg_score": avg,
            })

    candidates.sort(key=lambda x: x["avg_score"])
    return candidates[:max_suggestions]


# ─── Main Pipeline ───────────────────────────────────────────────────────────

def build_contribution_vectors(project_id: str, scored_folder: str) -> List[dict]:
    """
    Build contribution vectors for all authors from scored commits.
    Reads from SQLite if project_id exists, else reads fallback scored_folder.
    """
    rubric = load_rubric()
    thresholds = rubric.get("grade_thresholds", {})

    commits_by_email = defaultdict(list)
    
    if project_id:
        from src.project_store import load_project_scored_commits
        all_commits = load_project_scored_commits(project_id)
        if not all_commits:
            logger.warning(f"  ⚠ No scored commits found in DB for {project_id}")
            return []
        for data in all_commits:
            email = data.get("author", {}).get("email", "unknown")
            commits_by_email[email].append(data)
    else:
        # Load all scored commits from legacy folder
        files = sorted(f for f in os.listdir(scored_folder) if f.endswith(".json"))
        if not files:
            logger.warning("  ⚠ No scored commits found")
            return []

        for fname in files:
            try:
                data = load_json(os.path.join(scored_folder, fname))
                email = data.get("author", {}).get("email", "unknown")
                commits_by_email[email].append(data)
            except Exception as e:
                logger.warning(f"  ⚠ Skipping {fname}: {e}")

    # Merge multi-email authors
    commits_by_email, merge_notes = _merge_multi_email_authors(dict(commits_by_email))

    vectors = []
    for email, commits in commits_by_email.items():
        if not commits:
            continue

        name = commits[0].get("author", {}).get("name", "Unknown")

        # Score averages
        complexity_scores = []
        integrity_scores = []
        impact_scores = []
        commit_types = Counter()
        spam_count = 0
        proxy_count = 0
        late_night_count = 0
        all_hours = set()
        languages_used = set()

        for c in commits:
            scores = c.get("llm_scores", {})
            complexity_scores.append(scores.get("complexity", 2))
            integrity_scores.append(scores.get("integrity", 2))
            impact_scores.append(scores.get("impact", 2))

            ctype = scores.get("type", "trivial")
            commit_types[ctype] += 1

            if c.get("spam_check", {}).get("is_spam", False):
                spam_count += 1

            flags = c.get("pre_filter_flags", {})
            if flags.get("proxy_commit", False):
                proxy_count += 1
            if flags.get("late_night_commit", False):
                late_night_count += 1

            hour = c.get("timestamps", {}).get("hour_of_day", 12)
            all_hours.add(hour)

            for lang in c.get("detected_languages", []):
                languages_used.add(lang)

        total_commits = len(commits)
        avg_complexity = round(mean(complexity_scores), 2) if complexity_scores else 0
        avg_integrity = round(mean(integrity_scores), 2) if integrity_scores else 0
        avg_impact = round(mean(impact_scores), 2) if impact_scores else 0

        # Effort spread
        effort_spread = round(min(len(all_hours) / 12, 1.0), 3)

        # Composite score
        composite = round(
            avg_complexity * 0.35 +
            avg_integrity * 0.25 +
            avg_impact * 0.30 +
            effort_spread * 5 * 0.10,
            2
        )

        grade = _compute_grade(composite, thresholds)

        # Skill growth
        skill_growth = _compute_skill_growth(commits)

        # Peer review suggestions
        peer_reviews = _generate_peer_review_suggestions(commits)

        # Coaching summary: aggregate coaching feedback
        all_strengths = []
        all_improvements = []
        for c in commits:
            cf = c.get("coaching_feedback")
            if cf:
                all_strengths.extend(cf.get("strengths", []))
                all_improvements.extend(cf.get("improvements", []))

        # Deduplicate and take top items
        top_strengths = list(dict.fromkeys(all_strengths))[:5]
        top_improvements = list(dict.fromkeys(all_improvements))[:5]

        vector = {
            "name": name,
            "email": email,
            "total_commits": total_commits,
            "average_scores": {
                "complexity": avg_complexity,
                "integrity": avg_integrity,
                "impact": avg_impact,
            },
            "commit_breakdown": {t: commit_types.get(t, 0) for t in
                                 ["feature", "bugfix", "refactor", "test", "docs", "spam", "trivial"]},
            "quality_flags": {
                "spam_rate": round(spam_count / max(total_commits, 1), 3),
                "spam_commits": spam_count,
                "proxy_commits": proxy_count,
                "late_night_commits": late_night_count,
            },
            "effort_spread": effort_spread,
            "composite_score": composite,
            "suggested_grade": grade,
            "skill_growth": skill_growth,
            "peer_review_suggestions": peer_reviews,
            "coaching_summary": {
                "top_strengths": top_strengths,
                "top_improvements": top_improvements,
            },
            "languages_used": sorted(languages_used),
            "most_active_hours": sorted(all_hours),
            "merge_note": merge_notes.get(email, ""),
        }

        vectors.append(vector)

    # Sort by composite score descending
    vectors.sort(key=lambda v: v["composite_score"], reverse=True)

    return vectors


def save_vectors(project_id: str, vectors: List[dict], output_folder: str) -> None:
    """Save contribution vectors to the DB and output folder."""
    from src.project_store import ingest_vectors
    os.makedirs(output_folder, exist_ok=True)
    
    # Save natively to DB
    if project_id:
        ingest_vectors(project_id, vectors)

    for v in vectors:
        signed = sign_output(v.copy(), "aggregation")
        filename = f"{_safe_email_filename(v['email'])}.json"
        save_json(signed, os.path.join(output_folder, filename))

    audit_log("save_vectors", {"count": len(vectors), "success": True})
    logger.info(f"  ✓ Saved {len(vectors)} contribution vectors")

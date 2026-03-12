"""
feedback_coach.py — Coaching Synthesis and Peer Review Matrix.
Consumes aggregated contribution vectors and scored commits to produce:
1. Per-person coaching recommendations
2. Peer review assignment matrix (who should review whom)
3. Team-level insights
"""

import os
from collections import defaultdict
from typing import List, Dict
from statistics import mean

from src.utils import get_logger, save_json

logger = get_logger("feedback_coach")


def _compute_dimension_strengths(vector: dict) -> Dict[str, float]:
    """Identify which scoring dimensions each person is strongest/weakest in."""
    scores = vector.get("average_scores", {})
    return {
        "complexity": scores.get("complexity", 0),
        "integrity": scores.get("integrity", 0),
        "impact": scores.get("impact", 0),
    }


def build_peer_review_matrix(vectors: List[dict]) -> List[dict]:
    """
    Match students with complementary weaknesses for peer review.
    If Riya is strong in integrity but weak in complexity,
    and Aman is strong in complexity but weak in integrity,
    → Riya reviews Aman's complex commits, Aman reviews Riya's messaging.
    """
    if len(vectors) < 2:
        return []

    assignments = []

    # For each person, find their weakest dimension
    person_profiles = []
    for v in vectors:
        dims = _compute_dimension_strengths(v)
        weakest = min(dims, key=dims.get)
        strongest = max(dims, key=dims.get)
        person_profiles.append({
            "name": v["name"],
            "email": v["email"],
            "weakest": weakest,
            "strongest": strongest,
            "scores": dims,
        })

    # Match: find someone whose strength matches another's weakness
    matched = set()
    for person in person_profiles:
        if person["email"] in matched:
            continue

        best_reviewer = None
        best_score = -1

        for candidate in person_profiles:
            if candidate["email"] == person["email"] or candidate["email"] in matched:
                continue
            # Score: how well does candidate's strength match person's weakness
            if candidate["strongest"] == person["weakest"]:
                score = candidate["scores"][candidate["strongest"]]
                if score > best_score:
                    best_score = score
                    best_reviewer = candidate

        if best_reviewer:
            assignments.append({
                "reviewer": best_reviewer["name"],
                "reviewer_email": best_reviewer["email"],
                "reviewee": person["name"],
                "reviewee_email": person["email"],
                "focus_area": person["weakest"],
                "reason": (
                    f"{best_reviewer['name']} is strong in {person['weakest']} "
                    f"(avg {best_reviewer['scores'][person['weakest']]:.1f}/5) and can help "
                    f"{person['name']} who averages {person['scores'][person['weakest']]:.1f}/5"
                ),
            })

    return assignments


def synthesize_team_insights(vectors: List[dict]) -> dict:
    """Generate team-level coaching insights."""
    if not vectors:
        return {}

    all_complexity = [v["average_scores"]["complexity"] for v in vectors]
    all_integrity = [v["average_scores"]["integrity"] for v in vectors]
    all_impact = [v["average_scores"]["impact"] for v in vectors]

    total_spam = sum(v["quality_flags"]["spam_commits"] for v in vectors)
    total_commits = sum(v["total_commits"] for v in vectors)

    improving_count = sum(1 for v in vectors if v.get("skill_growth", {}).get("trend") == "improving")
    declining_count = sum(1 for v in vectors if v.get("skill_growth", {}).get("trend") == "declining")

    # Identify team weakest dimension
    team_avgs = {
        "complexity": mean(all_complexity),
        "integrity": mean(all_integrity),
        "impact": mean(all_impact),
    }
    team_weakest = min(team_avgs, key=team_avgs.get)
    team_strongest = max(team_avgs, key=team_avgs.get)

    return {
        "team_averages": {k: round(v, 2) for k, v in team_avgs.items()},
        "team_weakest_dimension": team_weakest,
        "team_strongest_dimension": team_strongest,
        "total_commits": total_commits,
        "total_spam": total_spam,
        "team_spam_rate": round(total_spam / max(total_commits, 1), 3),
        "members_improving": improving_count,
        "members_declining": declining_count,
        "recommendation": _generate_team_recommendation(team_avgs, total_spam, total_commits),
    }


def _generate_team_recommendation(avgs: dict, spam: int, total: int) -> str:
    """Generate a plain-text team-level recommendation."""
    parts = []

    weakest = min(avgs, key=avgs.get)
    if avgs[weakest] < 3.0:
        tips = {
            "complexity": "Focus on implementing more meaningful logic changes rather than formatting.",
            "integrity": "Write clearer commit messages that accurately describe your code changes.",
            "impact": "Prioritize features and fixes that directly improve the project's core functionality.",
        }
        parts.append(f"Team needs improvement in {weakest}: {tips.get(weakest, '')}")

    spam_rate = spam / max(total, 1)
    if spam_rate > 0.15:
        parts.append(f"Spam rate ({spam_rate:.0%}) is high. Make every commit count.")

    if not parts:
        parts.append("Good overall team performance. Keep focusing on quality over quantity.")

    return " ".join(parts)


def run_coaching_pipeline(project_id: str, vectors: List[dict], output_folder: str) -> dict:
    """
    Run the full coaching pipeline: insights + peer review matrix.
    Saves results to SQLite and returns a summary dict.
    """
    os.makedirs(output_folder, exist_ok=True)

    # Team insights
    insights = synthesize_team_insights(vectors)
    save_json(insights, os.path.join(output_folder, "team_insights.json"))
    
    # Peer review matrix
    matrix = build_peer_review_matrix(vectors)
    save_json({"assignments": matrix}, os.path.join(output_folder, "peer_review_matrix.json"))

    if project_id:
        from src.project_store import save_project_meta
        save_project_meta(project_id, "team_insights", insights)
        save_project_meta(project_id, "peer_matrix", {"assignments": matrix})

    logger.info(f"  ✓ Generated team insights and {len(matrix)} peer review assignments")

    return {
        "team_insights": insights,
        "peer_review_matrix": matrix,
    }

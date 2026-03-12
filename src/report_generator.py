"""
report_generator.py — PDF Report Card Generation.
Generates visual PDF reports per person and for the full team using Plotly exports.
"""

import os
import json
from typing import List

from src.utils import get_logger

logger = get_logger("report_generator")


def _generate_person_report_html(vector: dict) -> str:
    """Generate an HTML report for a single person."""
    scores = vector.get("average_scores", {})
    breakdown = vector.get("commit_breakdown", {})
    growth = vector.get("skill_growth", {})
    coaching = vector.get("coaching_summary", {})
    flags = vector.get("quality_flags", {})

    grade_colors = {
        "A+": "#10b981", "A": "#22c55e", "B+": "#3b82f6",
        "B": "#6366f1", "C": "#eab308", "D": "#ef4444",
    }
    grade = vector.get("suggested_grade", "D")
    color = grade_colors.get(grade, "#6b7280")

    html = f"""<!DOCTYPE html>
<html>
<head>
<style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1a1a2e; background: #f8f9fa; }}
    .header {{ text-align: center; margin-bottom: 30px; padding: 30px; background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; border-radius: 16px; }}
    .grade {{ font-size: 64px; font-weight: bold; color: {color}; }}
    .composite {{ font-size: 24px; color: #94a3b8; }}
    .section {{ background: white; padding: 24px; border-radius: 12px; margin: 16px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }}
    .section h2 {{ color: #1a1a2e; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }}
    .score-grid {{ display: flex; gap: 20px; justify-content: center; }}
    .score-card {{ text-align: center; padding: 16px 24px; background: #f1f5f9; border-radius: 12px; min-width: 120px; }}
    .score-value {{ font-size: 32px; font-weight: bold; color: #1a1a2e; }}
    .score-label {{ color: #64748b; font-size: 14px; }}
    table {{ width: 100%; border-collapse: collapse; }}
    td, th {{ padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }}
    .tag {{ display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin: 2px; }}
    .strength {{ background: #dcfce7; color: #166534; }}
    .improvement {{ background: #fef3c7; color: #92400e; }}
    .trend-improving {{ color: #10b981; }} .trend-declining {{ color: #ef4444; }} .trend-stable {{ color: #6b7280; }}
</style>
</head>
<body>
<div class="header">
    <h1>{vector.get('name', 'Unknown')}</h1>
    <p>{vector.get('email', '')}</p>
    <div class="grade">{grade}</div>
    <div class="composite">{vector.get('composite_score', 0)} / 5.0</div>
</div>

<div class="section">
    <h2>📊 Scores</h2>
    <div class="score-grid">
        <div class="score-card">
            <div class="score-value">{scores.get('complexity', 0)}</div>
            <div class="score-label">Complexity</div>
        </div>
        <div class="score-card">
            <div class="score-value">{scores.get('integrity', 0)}</div>
            <div class="score-label">Integrity</div>
        </div>
        <div class="score-card">
            <div class="score-value">{scores.get('impact', 0)}</div>
            <div class="score-label">Impact</div>
        </div>
    </div>
</div>

<div class="section">
    <h2>📝 Commit Breakdown</h2>
    <table>
        <tr><th>Type</th><th>Count</th></tr>
"""
    for ctype, count in breakdown.items():
        if count > 0:
            html += f"        <tr><td>{ctype}</td><td>{count}</td></tr>\n"

    trend_class = f"trend-{growth.get('trend', 'stable')}"
    trend_arrow = "📈" if growth.get("trend") == "improving" else "📉" if growth.get("trend") == "declining" else "➡️"

    html += f"""    </table>
</div>

<div class="section">
    <h2>📈 Skill Growth</h2>
    <p>First half average: <strong>{growth.get('first_half_avg', 'N/A')}</strong></p>
    <p>Second half average: <strong>{growth.get('second_half_avg', 'N/A')}</strong></p>
    <p>Trend: <span class="{trend_class}">{trend_arrow} {growth.get('trend', 'N/A').capitalize()}</span>
       (growth rate: {growth.get('growth_rate', 0):.1%})</p>
</div>

<div class="section">
    <h2>🏆 Coaching Feedback</h2>
    <h3>Strengths</h3>
"""
    for s in coaching.get("top_strengths", []):
        html += f'    <span class="tag strength">✓ {s}</span>\n'

    html += "    <h3>Areas for Improvement</h3>\n"
    for imp in coaching.get("top_improvements", []):
        html += f'    <span class="tag improvement">→ {imp}</span>\n'

    html += f"""</div>

<div class="section">
    <h2>🚩 Quality Flags</h2>
    <table>
        <tr><td>Spam rate</td><td>{flags.get('spam_rate', 0):.1%}</td></tr>
        <tr><td>Spam commits</td><td>{flags.get('spam_commits', 0)}</td></tr>
        <tr><td>Proxy commits</td><td>{flags.get('proxy_commits', 0)}</td></tr>
        <tr><td>Late night commits</td><td>{flags.get('late_night_commits', 0)}</td></tr>
    </table>
</div>

<div class="section">
    <h2>Summary</h2>
    <p><strong>Total commits:</strong> {vector.get('total_commits', 0)}</p>
    <p><strong>Effort spread:</strong> {vector.get('effort_spread', 0):.2f}</p>
    <p><strong>Languages:</strong> {', '.join(vector.get('languages_used', []))}</p>
</div>

<footer style="text-align: center; color: #94a3b8; margin-top: 30px; font-size: 12px;">
    Generated by AI Git Contribution Analyzer — Grand Challenge 4
</footer>
</body>
</html>"""
    return html


def generate_person_report(vector: dict, output_dir: str) -> str:
    """Generate an HTML report for a single person. Returns the file path."""
    os.makedirs(output_dir, exist_ok=True)
    email_safe = vector.get("email", "unknown").replace("@", "_").replace(".", "_")
    filename = f"{email_safe}_report.html"
    filepath = os.path.join(output_dir, filename)

    html = _generate_person_report_html(vector)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)

    return filepath


def generate_team_report(vectors: List[dict], team_insights: dict,
                         peer_matrix: List[dict], output_dir: str) -> str:
    """Generate a combined team HTML report."""
    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, "team_report.html")

    html = """<!DOCTYPE html>
<html>
<head>
<style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1a1a2e; background: #f8f9fa; }
    .header { text-align: center; padding: 30px; background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; border-radius: 16px; margin-bottom: 30px; }
    .section { background: white; padding: 24px; border-radius: 12px; margin: 16px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .section h2 { color: #1a1a2e; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 10px 14px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: 600; }
    .grade-A\\+, .grade-A { color: #10b981; font-weight: bold; }
    .grade-B\\+, .grade-B { color: #3b82f6; font-weight: bold; }
    .grade-C { color: #eab308; font-weight: bold; }
    .grade-D { color: #ef4444; font-weight: bold; }
</style>
</head>
<body>
<div class="header">
    <h1>🏆 Team Contribution Report</h1>
    <p>AI Git Contribution Analyzer — Grand Challenge 4</p>
</div>

<div class="section">
    <h2>🏅 Leaderboard</h2>
    <table>
        <tr><th>#</th><th>Name</th><th>Grade</th><th>Score</th><th>Commits</th><th>Complexity</th><th>Integrity</th><th>Impact</th><th>Spam%</th></tr>
"""
    for i, v in enumerate(vectors, 1):
        grade = v.get("suggested_grade", "D")
        spam_pct = f"{v.get('quality_flags', {}).get('spam_rate', 0):.0%}"
        html += f"""        <tr>
            <td>{i}</td><td>{v['name']}</td><td class="grade-{grade}">{grade}</td>
            <td>{v['composite_score']}</td><td>{v['total_commits']}</td>
            <td>{v['average_scores']['complexity']}</td><td>{v['average_scores']['integrity']}</td>
            <td>{v['average_scores']['impact']}</td><td>{spam_pct}</td>
        </tr>\n"""

    html += """    </table>
</div>

<div class="section">
    <h2>📊 Team Insights</h2>
"""
    if team_insights:
        ti = team_insights
        html += f"""    <p><strong>Team strongest dimension:</strong> {ti.get('team_strongest_dimension', 'N/A')}</p>
    <p><strong>Team weakest dimension:</strong> {ti.get('team_weakest_dimension', 'N/A')}</p>
    <p><strong>Team spam rate:</strong> {ti.get('team_spam_rate', 0):.1%}</p>
    <p><strong>Members improving:</strong> {ti.get('members_improving', 0)} | <strong>Declining:</strong> {ti.get('members_declining', 0)}</p>
    <p><em>{ti.get('recommendation', '')}</em></p>"""

    html += """
</div>

<div class="section">
    <h2>🔄 Peer Review Assignments</h2>
    <table>
        <tr><th>Reviewer</th><th>Reviews</th><th>Focus Area</th><th>Reason</th></tr>
"""
    for a in (peer_matrix or []):
        html += f"""        <tr>
            <td>{a['reviewer']}</td><td>{a['reviewee']}</td>
            <td>{a['focus_area']}</td><td>{a['reason']}</td>
        </tr>\n"""

    html += """    </table>
</div>

<footer style="text-align: center; color: #94a3b8; margin-top: 30px; font-size: 12px;">
    Generated by AI Git Contribution Analyzer — Grand Challenge 4
</footer>
</body>
</html>"""

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)

    logger.info(f"  ✓ Generated team report: {filepath}")
    return filepath

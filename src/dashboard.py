"""
dashboard.py — Multi-Project Streamlit Dashboard.
Fetches data from the FastAPI backend. Supports Admin/User view modes
with project selection. No path input required.
Run with: streamlit run src/dashboard.py
"""

import os
import json
import requests
import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd

# ─── Page Config ──────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="Team Orchestrator",
    page_icon="🧬",
    layout="wide",
    initial_sidebar_state="expanded",
)

API_BASE = "http://localhost:8000/api"

# ─── Styling ──────────────────────────────────────────────────────────────────

st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    .stApp { font-family: 'Inter', sans-serif; }
    .main-header {
        background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
        padding: 30px; border-radius: 16px; margin-bottom: 24px;
        text-align: center; color: white;
    }
    .main-header h1 { font-size: 2.2em; margin-bottom: 4px; }
    .main-header p { color: #94a3b8; font-size: 1.1em; }
    .metric-card {
        background: linear-gradient(135deg, #1e1e2e, #2d2d44);
        padding: 20px; border-radius: 12px; text-align: center;
        border: 1px solid #3d3d5c;
    }
    .metric-value { font-size: 2em; font-weight: 700; color: #60a5fa; }
    .metric-label { color: #94a3b8; font-size: 0.85em; margin-top: 4px; }
    .grade-badge {
        display: inline-block; padding: 6px 16px; border-radius: 20px;
        font-weight: 700; font-size: 1.1em;
    }
    .grade-A-plus, .grade-A { background: #065f46; color: #6ee7b7; }
    .grade-B-plus, .grade-B { background: #1e3a5f; color: #93c5fd; }
    .grade-C { background: #78350f; color: #fde68a; }
    .grade-D { background: #7f1d1d; color: #fca5a5; }
    .project-card {
        background: linear-gradient(135deg, #1e1e2e, #2d2d44);
        padding: 16px; border-radius: 12px; margin-bottom: 12px;
        border: 1px solid #3d3d5c;
    }
</style>
""", unsafe_allow_html=True)


# ─── Helpers ──────────────────────────────────────────────────────────────────

GRADE_COLORS = {"A+": "#10b981", "A": "#22c55e", "B+": "#3b82f6", "B": "#6366f1", "C": "#eab308", "D": "#ef4444"}
PLOTLY_DARK_TEMPLATE = "plotly_dark"


def grade_color(grade: str) -> str:
    return GRADE_COLORS.get(grade, "#6b7280")


def api_get(endpoint: str, params: dict = None):
    """Safe API GET with error handling."""
    try:
        resp = requests.get(f"{API_BASE}/{endpoint}", params=params, timeout=5)
        if resp.ok:
            return resp.json()
    except Exception:
        pass
    return None


def api_post(endpoint: str, data: dict = None):
    """Safe API POST with error handling."""
    try:
        resp = requests.post(f"{API_BASE}/{endpoint}", json=data, timeout=30)
        if resp.ok:
            return resp.json()
    except Exception:
        pass
    return None


# ─── Sidebar ──────────────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown("##  Team Orchestrator")

    # Mode toggle
    mode = st.radio("View Mode", [" User", " Admin"], horizontal=True)

    # User email for filtering
    if mode == " User":
        user_email = st.text_input(
            "Your Git Email",
            value=st.session_state.get("user_email", ""),
            placeholder="you@gmail.com",
        )
        st.session_state["user_email"] = user_email
        projects = api_get("projects", {"email": user_email}) if user_email else []
    else:
        projects = api_get("projects")

    # Handle API offline
    if projects is None:
        st.warning("📡 API server not running")
        st.caption("Start it with: `team-orchestrator serve`")
        projects = []

    st.markdown("---")

    # Project selector
    selected_project = None
    if projects:
        project_names = [f"{p['name']} ({p.get('commit_count', 0)} commits)" for p in projects]
        selected_idx = st.selectbox(" Select Project", range(len(project_names)),
                                     format_func=lambda i: project_names[i])
        selected_project = projects[selected_idx]

        # Refresh button
        if st.button(" Refresh Data", width='stretch'):
            st.rerun()
    else:
        if mode == " User" and user_email:
            st.info("No projects found for this email.")
        elif mode == " User":
            st.info("Enter your git email to see your projects.")
        else:
            st.info("No projects registered yet.")
        st.caption("Register a repo with:\n`team-orchestrator init`")

    # Pipeline status
    st.markdown("---")
    status = api_get("status")
    if status:
        if status["status"] == "running":
            st.info(f" **{status.get('step', '')}** {status.get('progress', '')}")
        elif status["status"] == "complete":
            st.success(f" {status.get('message', 'Complete')}")
        elif status["status"] == "error":
            st.error(f" {status.get('message', 'Error')}")

    # Model health
    st.markdown("---")
    st.markdown("###  Model Health")
    try:
        ollama_resp = requests.get("http://localhost:11434/api/tags", timeout=2)
        if ollama_resp.ok:
            models = [m["name"] for m in ollama_resp.json().get("models", [])]
            for m in ["phi3", "llama3.1", "nomic-embed-text"]:
                found = any(m in name for name in models)
                st.markdown(f"{'🟢' if found else '🔴'} {m}")
        else:
            st.warning("Could not reach Ollama")
    except Exception:
        st.warning("Ollama not running")


# ─── Header ──────────────────────────────────────────────────────────────────

st.markdown("""
<div class="main-header">
    <h1> Team Orchestrator</h1>
    <p>AI-Powered Peer Feedback Coach for STEM Outputs</p>
</div>
""", unsafe_allow_html=True)


# ─── Admin Overview ──────────────────────────────────────────────────────────

if mode == " Admin" and projects:
    st.markdown("##  All Projects Overview")

    admin_data = []
    for p in projects:
        admin_data.append({
            "Project": p["name"],
            "Authors": p.get("author_count", 0),
            "Commits": p.get("commit_count", 0),
            "Last Analyzed": (p.get("last_analyzed") or "Never")[:19],
            "Registered By": p.get("registered_by", {}).get("name", "—"),
        })

    df_admin = pd.DataFrame(admin_data)
    st.dataframe(df_admin, width='stretch', hide_index=True)

    st.markdown("---")


# ─── Load Project Data ────────────────────────────────────────────────────────

if not selected_project:
    if not projects:
        st.info(" No projects to display. Register a repo with `team-orchestrator init` and run `team-orchestrator analyze`.")
    st.stop()

project_id = selected_project["project_id"]

# Fetch data from API
vectors = api_get(f"projects/{project_id}/results") or []
scored_commits = api_get(f"projects/{project_id}/commits") or []

if not vectors:
    st.info(f"No results for **{selected_project['name']}** yet. Run `team-orchestrator analyze` in the repo.")
    st.stop()


# ─── Quick Stats ─────────────────────────────────────────────────────────────

st.markdown(f"###  {selected_project['name']}")

c1, c2, c3, c4 = st.columns(4)
total_commits = sum(v.get("total_commits", 0) for v in vectors)
avg_composite = sum(v.get("composite_score", 0) for v in vectors) / len(vectors)
total_spam = sum(v.get("quality_flags", {}).get("spam_commits", 0) for v in vectors)

c1.metric(" Team Members", len(vectors))
c2.metric(" Total Commits", total_commits)
c3.metric(" Avg Score", f"{avg_composite:.2f}/5.0")
c4.metric(" Spam Commits", total_spam)


# ─── Section 1: Leaderboard ──────────────────────────────────────────────────

st.markdown("## 🏅 Section 1: Leaderboard")

leaderboard_data = []
for i, v in enumerate(vectors, 1):
    leaderboard_data.append({
        "Rank": i,
        "Name": v["name"],
        "Grade": v["suggested_grade"],
        "Composite": v["composite_score"],
        "Commits": v["total_commits"],
        "Complexity": v["average_scores"]["complexity"],
        "Integrity": v["average_scores"]["integrity"],
        "Impact": v["average_scores"]["impact"],
        "Spam %": f"{v['quality_flags']['spam_rate']:.0%}",
    })

df_leader = pd.DataFrame(leaderboard_data)
st.dataframe(df_leader, width='stretch', hide_index=True)

# Composite score bar chart
fig_composite = go.Figure()
for v in vectors:
    color = grade_color(v["suggested_grade"])
    fig_composite.add_trace(go.Bar(
        x=[v["name"]], y=[v["composite_score"]],
        marker_color=color, name=v["name"],
        text=v["suggested_grade"], textposition="outside",
    ))
fig_composite.update_layout(
    title="Composite Scores by Team Member",
    yaxis_title="Score", yaxis_range=[0, 5.5],
    template=PLOTLY_DARK_TEMPLATE, showlegend=False, height=400,
)
st.plotly_chart(fig_composite, width='stretch')


# ─── Section 2: Individual Deep Dive ─────────────────────────────────────────

st.markdown("##  Section 2: Individual Deep Dive")

names = [v["name"] for v in vectors]
selected_name = st.selectbox("Select team member", names)
selected_v = next((v for v in vectors if v["name"] == selected_name), None)

if selected_v:
    col_a, col_b = st.columns(2)

    with col_a:
        # Radar chart
        scores = selected_v["average_scores"]
        fig_radar = go.Figure(data=go.Scatterpolar(
            r=[scores["complexity"], scores["integrity"], scores["impact"],
               scores["complexity"]],
            theta=["Complexity", "Integrity", "Impact", "Complexity"],
            fill="toself",
            line_color="#60a5fa",
            fillcolor="rgba(96,165,250,0.3)",
        ))
        fig_radar.update_layout(
            polar=dict(radialaxis=dict(visible=True, range=[0, 5])),
            title=f"{selected_name} — Score Profile",
            template=PLOTLY_DARK_TEMPLATE, height=400,
        )
        st.plotly_chart(fig_radar, width='stretch')

    with col_b:
        # Commit type breakdown
        breakdown = selected_v.get("commit_breakdown", {})
        types_with_data = {k: v for k, v in breakdown.items() if v > 0}
        if types_with_data:
            fig_types = px.bar(
                x=list(types_with_data.keys()),
                y=list(types_with_data.values()),
                color=list(types_with_data.keys()),
                title=f"{selected_name} — Commit Types",
                template=PLOTLY_DARK_TEMPLATE,
            )
            fig_types.update_layout(
                xaxis_title="Type", yaxis_title="Count",
                showlegend=False, height=400,
            )
            st.plotly_chart(fig_types, width='stretch')

    # Effort timeline
    person_commits = [c for c in scored_commits
                      if c.get("author_email") == selected_v.get("email") or
                         c.get("author", {}).get("name") == selected_name]
    if person_commits:
        hours = [c.get("timestamps", {}).get("hour_of_day", 0) if "timestamps" in c
                 else 0 for c in person_commits]
        days = [c.get("timestamps", {}).get("day_of_week", "Unknown") if "timestamps" in c
                else "Unknown" for c in person_commits]
        if any(h != 0 for h in hours) or any(d != "Unknown" for d in days):
            fig_effort = px.scatter(
                x=days, y=hours, title=f"{selected_name} — Commit Activity (Day × Hour)",
                labels={"x": "Day of Week", "y": "Hour of Day"},
                template=PLOTLY_DARK_TEMPLATE,
            )
            fig_effort.update_traces(marker=dict(size=12, color="#60a5fa"))
            fig_effort.update_layout(height=350)
            st.plotly_chart(fig_effort, width='stretch')

    # Flag summary
    flags_info = selected_v.get("quality_flags", {})
    st.markdown("####  Quality Flags")
    fc1, fc2, fc3, fc4 = st.columns(4)
    fc1.metric("Spam Rate", f"{flags_info.get('spam_rate', 0):.1%}")
    fc2.metric("Spam Commits", flags_info.get("spam_commits", 0))
    fc3.metric("Proxy Commits", flags_info.get("proxy_commits", 0))
    fc4.metric("Late Night", flags_info.get("late_night_commits", 0))


# ─── Section 3: Team Overview ────────────────────────────────────────────────

st.markdown("##  Section 3: Team Overview")

col_team1, col_team2 = st.columns(2)

with col_team1:
    # Stacked bar: commit types per person
    team_types_data = []
    for v in vectors:
        for ctype, count in v.get("commit_breakdown", {}).items():
            if count > 0:
                team_types_data.append({"Name": v["name"], "Type": ctype, "Count": count})
    if team_types_data:
        df_types = pd.DataFrame(team_types_data)
        fig_stacked = px.bar(
            df_types, x="Name", y="Count", color="Type",
            title="Commit Types by Team Member",
            template=PLOTLY_DARK_TEMPLATE, barmode="stack",
        )
        fig_stacked.update_layout(height=400)
        st.plotly_chart(fig_stacked, width='stretch')

with col_team2:
    # Activity timeline from scored commits
    timeline_data = []
    for c in scored_commits:
        date = c.get("date", c.get("timestamps", {}).get("authored_date", ""))[:10]
        name = c.get("author_name", c.get("author", {}).get("name", "Unknown"))
        if date:
            timeline_data.append({"Date": date, "Author": name})

    if timeline_data:
        df_timeline = pd.DataFrame(timeline_data)
        df_grouped = df_timeline.groupby(["Date", "Author"]).size().reset_index(name="Commits")
        fig_timeline = px.line(
            df_grouped, x="Date", y="Commits", color="Author",
            title="Commit Activity Over Time",
            template=PLOTLY_DARK_TEMPLATE,
        )
        fig_timeline.update_layout(height=400)
        st.plotly_chart(fig_timeline, width='stretch')


# ─── Section 4: Feedback Coach ───────────────────────────────────────────────

st.markdown("## 🎓 Section 4: Feedback Coach")

if selected_v:
    coaching = selected_v.get("coaching_summary", {})

    col_c1, col_c2 = st.columns(2)
    with col_c1:
        st.markdown("#### 💪 Strengths")
        for s in coaching.get("top_strengths", []):
            st.markdown(f" {s}")
        if not coaching.get("top_strengths"):
            st.caption("No coaching data available yet")

    with col_c2:
        st.markdown("####  Areas for Improvement")
        for imp in coaching.get("top_improvements", []):
            st.markdown(f" {imp}")
        if not coaching.get("top_improvements"):
            st.caption("No coaching data available yet")

    # Skill growth
    growth = selected_v.get("skill_growth", {})
    if growth.get("trend") and growth["trend"] != "insufficient_data":
        st.markdown("####  Skill Growth Trajectory")
        trend_emoji = {"improving": "", "declining": "", "stable": "➡️"}
        st.markdown(
            f"{trend_emoji.get(growth['trend'], '')} **{growth['trend'].capitalize()}** — "
            f"First half: {growth['first_half_avg']:.2f} → Second half: {growth['second_half_avg']:.2f} "
            f"(growth: {growth['growth_rate']:.1%})"
        )

        fig_growth = go.Figure()
        fig_growth.add_trace(go.Bar(x=["First Half", "Second Half"],
                                    y=[growth["first_half_avg"], growth["second_half_avg"]],
                                    marker_color=["#6366f1", "#10b981"]))
        fig_growth.update_layout(title="Score Growth", yaxis_range=[0, 5],
                                 template=PLOTLY_DARK_TEMPLATE, height=300)
        st.plotly_chart(fig_growth, width='stretch')

    # Peer review assignments
    peer_matrix = api_get(f"projects/{project_id}/peer-matrix")
    if peer_matrix:
        st.markdown("#### 🔄 Peer Review Assignments")
        df_peer = pd.DataFrame(peer_matrix)
        if not df_peer.empty and "reviewer" in df_peer.columns:
            st.dataframe(df_peer[["reviewer", "reviewee", "focus_area", "reason"]],
                          width='stretch', hide_index=True)


# ─── Section 5: Natural Language Query ────────────────────────────────────────

st.markdown("## 💬 Section 5: Ask a Question")

query = st.text_input("Ask about contributions...",
                       placeholder="Who contributed the most bug fixes?")
if query:
    with st.spinner("Querying AI..."):
        result = api_post("query", {"question": query})
        if result and "answer" in result:
            st.success(result["answer"])
        else:
            st.warning("Could not reach API. Make sure the backend and index are running.")


# ─── Section 6: Analytics ────────────────────────────────────────────────────

st.markdown("## 📈 Section 6: Analytics")

insights = api_get(f"projects/{project_id}/insights") or {}

col_an1, col_an2 = st.columns(2)

with col_an1:
    # Sentiment distribution from scored commits
    sentiments = [c.get("sentiment", {}).get("tone", "neutral") for c in scored_commits if c.get("sentiment")]
    if sentiments:
        sent_counts = pd.Series(sentiments).value_counts()
        fig_sent = px.pie(values=sent_counts.values, names=sent_counts.index,
                          title="Commit Sentiment Distribution",
                          template=PLOTLY_DARK_TEMPLATE,
                          color_discrete_sequence=["#6366f1", "#10b981", "#ef4444"])
        fig_sent.update_layout(height=350)
        st.plotly_chart(fig_sent, width='stretch')

with col_an2:
    # AI confidence distribution
    confidences = [c.get("llm_scores", {}).get("confidence", 0) for c in scored_commits
                   if c.get("llm_scores", {}).get("confidence")]
    if confidences:
        fig_conf = px.histogram(confidences, nbins=20,
                                title="AI Scoring Confidence Distribution",
                                template=PLOTLY_DARK_TEMPLATE,
                                labels={"value": "Confidence", "count": "Count"})
        fig_conf.update_layout(height=350, showlegend=False)
        fig_conf.update_traces(marker_color="#60a5fa")
        st.plotly_chart(fig_conf, width='stretch')

# Team insights summary
if insights:
    st.markdown("#### 📊 Team Insights")
    ti1, ti2, ti3 = st.columns(3)
    ti1.metric("Strongest Dimension", insights.get("team_strongest_dimension", "N/A"))
    ti2.metric("Weakest Dimension", insights.get("team_weakest_dimension", "N/A"))
    ti3.metric("Team Spam Rate", f"{insights.get('team_spam_rate', 0):.1%}")

    if insights.get("recommendation"):
        st.info(f"💡 **Recommendation:** {insights['recommendation']}")


# ─── Section 7: Export ────────────────────────────────────────────────────────

st.markdown("## 📥 Section 7: Export Reports")

col_ex1, col_ex2 = st.columns(2)

with col_ex1:
    if selected_v:
        email_safe = selected_v["email"].replace("@", "_").replace(".", "_")
        st.download_button(
            f"📄 Download {selected_v['name']}'s Report",
            data=json.dumps(selected_v, indent=2, default=str),
            file_name=f"{email_safe}_profile.json",
            mime="application/json",
            use_container_width=True,
        )

with col_ex2:
    st.download_button(
        "📄 Download All Vectors (JSON)",
        data=json.dumps(vectors, indent=2, default=str),
        file_name=f"{selected_project['name']}_all_vectors.json",
        mime="application/json",
        use_container_width=True,
    )


# ─── Footer ──────────────────────────────────────────────────────────────────

st.markdown("---")
st.markdown(
    "<div style='text-align: center; color: #64748b; padding: 10px;'>"
    "🧬 Team Orchestrator — AI-Powered Peer Feedback Coach for STEM Outputs"
    "</div>",
    unsafe_allow_html=True,
)

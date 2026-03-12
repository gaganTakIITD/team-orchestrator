# 🧬 Team Orchestrator

> **Grand Challenge 4** — AI-Powered Peer Feedback Coach for STEM Outputs  
> Fully offline, privacy-preserving contribution analysis for collaborative STEM projects.

---

## What This Does

Analyzes a team's Git repository to evaluate individual contributions using local AI models. Instead of counting lines of code, it:

1. **Extracts** every commit with full diff data
2. **Preprocesses** with 5-stage intelligence (structural analysis, statistical anomalies, cross-commit patterns, feature engineering)
3. **Evaluates** with a 3-pass AI pipeline (spam detection → quality scoring → coaching feedback)
4. **Scores** each person on complexity, integrity, and impact (1-5 scale)
5. **Generates** contribution profiles, peer review assignments, and skill growth tracking
6. **Synchronizes** with a central server so Supervisors can view and grade students
7. **Visualizes** results in a rich React-based dashboard with Role-Based Access Control (RBAC)

**Everything runs 100% offline. No data leaves your machine.**

---

## Architecture

```
team-orchestrator init → installs post-commit hook
                         ↓ (on every commit)
Git Repo → CLI analyzes locally → Llama AI scores → Results stored in project store
                                                      ↓ (API Sync)
                        React Dashboard ← HTTP → FastAPI Server
                        (Automated Roles via GitHub OAuth)
```

### Tech Stack

| Component | Tool | Purpose |
|---|---|---|
| Git reading | GitPython | Extract commits from repo |
| Fast AI model | Phi-3 Mini (Ollama) | Spam detection (~2s/commit) |
| Deep AI model | LLaMA 3.1 8B (Ollama) | Quality scoring + coaching (~5-8s/commit) |
| Orchestration | LangChain + langchain-ollama | Prompt management |
| API backend | FastAPI + Uvicorn | Serve data to dashboard |
| Frontend | React + Vite + Three.js | Interactive Visualization & WebGL Dashboard |
| Security | JWT + GitHub OAuth | Strict Role-Based Access Control |

---

## Quick Start

### 1. Install Ollama + Models

```bash
# Windows: download from https://ollama.com/download
# Linux/Mac: curl -fsSL https://ollama.ai/install.sh | sh

ollama pull phi3
ollama pull llama3.1
ollama pull nomic-embed-text
```

### 2. Install Team Orchestrator

**Option A — Install directly from GitHub (recommended):**

```bash
# If team-orchestrator is in a subdirectory of the repo:
pip install "git+https://github.com/tejashvikumawat/14_Git_Hooks.git#subdirectory=team-orchestrator"

# Or with pipx (isolated CLI environment, recommended for tools):
pipx install "git+https://github.com/tejashvikumawat/14_Git_Hooks.git#subdirectory=team-orchestrator"
```

**Option B — If team-orchestrator has its own repo:**

```bash
pip install git+https://github.com/YOUR_USERNAME/team-orchestrator.git
# or with pipx (recommended for CLI tools — isolated env):
pipx install git+https://github.com/YOUR_USERNAME/team-orchestrator.git
```

> **Tip:** Use `pipx` instead of `pip` for CLI tools — it installs in an isolated environment and avoids dependency conflicts. Install pipx: `brew install pipx` (Mac) or `pip install pipx` (Linux).

**Option C — Local development (editable install):**

```bash
cd team-orchestrator
pip install -e .
```

This installs the `team-orchestrator` command globally.

### 3. Register Your Repo (Local CLI)

```bash
cd /path/to/your/team/project
team-orchestrator init
```

This registers the project in the central store and installs a post-commit hook so future commits auto-trigger local analysis.

### 4. Run Full Analysis

```bash
team-orchestrator analyze
```

### 5. Start the Server & Dashboard

```bash
# Terminal 1: Start Backend API (from team-orchestrator directory)
cd team-orchestrator
team-orchestrator serve

# Terminal 2: Start React Frontend
cd dashboard
npm install
npm run dev
```

Open http://localhost:5173 — Sign in with your GitHub account!

**If analysis doesn't show on the dashboard:** Start the server first (`team-orchestrator serve`), then run `team-orchestrator analyze`. The CLI pushes analysis data to the server via HTTP after each run. If the server runs elsewhere, set `TEAM_ORCHESTRATOR_SERVER_URL` (e.g. `https://your-server.com`) in your environment.

**Port 8000 in use (Windows `WinError 10013`):** Use a different port: `team-orchestrator serve --port 8001`, then set `TEAM_ORCHESTRATOR_SERVER_URL=http://localhost:8001` before running `analyze`.

**Merge conflict in `data/.audit_log.jsonl`:** This file is now in `.gitignore`. Resolve by: `git checkout --theirs data/.audit_log.jsonl` (or `--ours`), then `git add data/.audit_log.jsonl` and commit. Or remove it from tracking: `git rm --cached data/.audit_log.jsonl`.

---

## Role-Based Access Control (RBAC) & Two-Portal System

The dashboard features **Strict Automatic Roles** based on GitHub login:

### 👑 Supervisor Portal (Admin)
- If your GitHub account **owns** the requested Repository, you automatically become a Supervisor.
- You see the **Team Overview**, **Leaderboards**, and **Export Analytics**.
- You can leave direct textual **Feedback** and interact with the AI to grade student commit metrics.

### 👤 Contributor Portal (Student/Member)
- If you do not own the repository but have committed code to it, you become a Contributor.
- You can view your **Deep Dive Analysis**, **Peer Matrix**, and **Feedback Coach**.
- You can reply to feedback left by Supervisors in a real-time chat loop.

---

## Project Structure

```
git-contribution-analyzer/
├── api/                       # FastAPI backend (Endpoints + OAuth logic)
├── src/                       # Core LLM CLI engine
├── dashboard/                 # Vite React Frontend
│   ├── src/components/        # Reusable UI Blocks & GlassCards
│   ├── src/views/             # Tabbed View Portals (Supervisor vs Contributor)
│   └── src/context/           # Global State Management
├── store/                     # Centralized Local Data
├── prompts/                   # LLM prompt templates
├── main.py                    # Legacy testing pipeline
├── pyproject.toml             # Package configuration
└── README.md
```

---

## Scoring Rubric

| Dimension | Weight | Scale |
|---|---|---|
| Complexity | 35% | 1=whitespace only → 5=complex algorithm |
| Integrity | 25% | 1=misleading message → 5=perfect match |
| Impact | 30% | 1=no value → 5=critical contribution |
| Effort Spread | 10% | Consistency over time |

**Composite score** = complexity×0.35 + integrity×0.25 + impact×0.30 + effort_spread×5×0.10

**Grades**: A+ (≥4.5) | A (≥4.0) | B+ (≥3.5) | B (≥3.0) | C (≥2.5) | D (<2.5)

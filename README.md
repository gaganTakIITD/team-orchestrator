# 🧬 Team Orchestrator

> **Grand Challenge 4** — AI-Powered Peer Feedback Coach for STEM Outputs  
> Fully offline, privacy-preserving contribution analysis for collaborative STEM projects.

---

## What This Does

Analyzes a team's Git repository to evaluate individual contributions using local AI models. Instead of counting lines of code, it:

1. **Extracts** every commit with full diff data
2. **Preprocesses** with 5-stage intelligence (structural analysis, statistical anomalies, cross-commit patterns, feature engineering)
3. **Evaluates** with a 3-pass AI pipeline (spam detection → quality scoring → coaching feedback)
4. **Scores** each person on complexity, integrity, impact, and effort spread (1–5 scale)
5. **Generates** contribution profiles, peer review assignments, and skill growth tracking
6. **Synchronizes** with a central server so Supervisors can view and grade students
7. **Visualizes** results in a rich React-based dashboard with Role-Based Access Control (RBAC)

**Everything runs 100% offline. No data leaves your machine.**

---

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Python** | 3.9+ | CLI, backend API |
| **Node.js** | 18+ | React dashboard |
| **Ollama** | Latest | Local LLM inference |
| **Git** | Any | Repository access |

---

## Quick Start

### Step 1: Install Ollama and Models

```bash
# macOS / Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows: Download from https://ollama.com/download
```

Then pull the required models (first run may take several minutes):

```bash
ollama pull phi3
ollama pull llama3.1
ollama pull nomic-embed-text
```

### Step 2: Install Team Orchestrator

**From GitHub (recommended):**

```bash
pip install "git+https://github.com/gaganTakIITD/team-orchestrator.git"

```

**Or with pipx (isolated environment):**

```bash
pipx install "git+https://github.com/gaganTakIITD/team-orchestrator.git"
```

**Local development:**

```bash
cd team-orchestrator
pip install -e .
```

Verify installation:

```bash
team-orchestrator --help
```

### Step 3: Configure Backend (for Dashboard)

Create `team-orchestrator/api/.env`:

```bash
cd team-orchestrator/api
cp .env.example .env   # if exists, or create manually
```

Edit `.env` with your values:

```env
# GitHub OAuth (required for dashboard login)
GITHUB_CLIENT_ID=your_github_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_client_secret

# JWT (change in production!)
JWT_SECRET=your-random-secret-key-at-least-32-chars

# Frontend URL (where the React app runs)
FRONTEND_URL=http://localhost:5173
```

**GitHub OAuth setup:** Go to [GitHub Developer Settings](https://github.com/settings/developers) → OAuth Apps → New. Set:
- **Homepage URL:** `http://localhost:5173` (or your frontend URL)
- **Authorization callback URL:** `http://localhost:8000/api/auth/github/callback` (or your API URL + `/api/auth/github/callback`)

### Step 4: Start the Stack

**Terminal 1 — Backend API (port 8000):**

```bash
cd team-orchestrator
team-orchestrator serve
```

You should see:
```
API:       http://localhost:8000
Docs:      http://localhost:8000/docs
```

**Terminal 2 — Frontend Dashboard (port 5173):**

```bash
cd team-orchestrator/dashboard
npm install
npm run dev
```

You should see:
```
  ➜  Local:   http://localhost:5173/
```

**Open:** http://localhost:5173 — Sign in with GitHub to access the dashboard.

### Step 5: Register a Repo and Run Analysis

```bash
cd /path/to/your/git/repository
team-orchestrator init
team-orchestrator analyze
```

The CLI pushes analysis data to the server. Refresh the dashboard to see results.

---

## Ports Reference

| Service | Default Port | Change With |
|---------|--------------|-------------|
| **Backend API** | 8000 | `team-orchestrator serve --port 8001` |
| **Frontend** | 5173 | `npm run dev -- --port 5173` (Vite) |

**Important:** The frontend expects the API at `http://localhost:8000`. If you use a different API port, update `dashboard/src/api/client.js` (set `API_BASE`) or use environment variables at build time.

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `team-orchestrator init` | Register repo and install post-commit hook |
| `team-orchestrator init --path /path/to/repo` | Register a specific repo |
| `team-orchestrator analyze` | Full analysis of all commits |
| `team-orchestrator analyze --latest` | Analyze only the latest commit (used by hook) |
| `team-orchestrator analyze --repo-path /path` | Analyze a specific repo |
| `team-orchestrator list` | List registered projects |
| `team-orchestrator list --email you@example.com` | Filter by email |
| `team-orchestrator serve` | Start the backend API |
| `team-orchestrator serve --port 8001` | Start API on a different port |

---

## Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `GITHUB_CLIENT_ID` | `api/.env` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | `api/.env` | GitHub OAuth app client secret |
| `JWT_SECRET` | `api/.env` | Secret for JWT tokens |
| `FRONTEND_URL` | `api/.env` | URL of the React app (for OAuth redirect) |
| `TEAM_ORCHESTRATOR_STORE` | CLI / API | Override store path (default: `./store`) |
| `TEAM_ORCHESTRATOR_SERVER_URL` | CLI | API URL when pushing (default: `http://localhost:8000`) |

---

## Architecture

```
team-orchestrator init → installs post-commit hook
                         ↓ (on every commit)
Git Repo → CLI analyzes locally → Llama AI scores → Results stored in project store
                                                      ↓ (HTTP POST)
                        React Dashboard ← HTTP → FastAPI Server (SQLite)
                        (GitHub OAuth, RBAC)
```

### Tech Stack

| Component | Tool |
|-----------|------|
| Git | GitPython |
| AI (fast) | Phi-3 Mini (Ollama) |
| AI (deep) | LLaMA 3.1 8B (Ollama) |
| Embeddings | nomic-embed-text (Ollama) |
| Backend | FastAPI + Uvicorn |
| Frontend | React + Vite + Recharts |
| Auth | JWT + GitHub OAuth |

---

## Role-Based Access Control

| Role | Condition | Access |
|------|-----------|--------|
| **Supervisor** | Owns the GitHub repo | Team overview, leaderboard, activity feed, export, feedback |
| **Contributor** | Committed to repo | My Performance, My Coaching, Messages (professor + peers) |

---

## Production Deployment

1. **Backend:** Run `team-orchestrator serve` behind a reverse proxy (nginx, Caddy) with HTTPS.
2. **Frontend:** Run `npm run build` and serve `dashboard/dist` as static files.
3. **Environment:** Set `FRONTEND_URL` and CORS origins in the API to your production domain.
4. **Secrets:** Use strong `JWT_SECRET` and keep `GITHUB_CLIENT_SECRET` secure.
5. **Store:** Set `TEAM_ORCHESTRATOR_STORE` to a persistent path (e.g. `/var/lib/team-orchestrator/store`).
6. **API URL:** If CLI runs on different machines, set `TEAM_ORCHESTRATOR_SERVER_URL` to the public API URL.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Port 8000 in use** (e.g. Windows `WinError 10013`) | `team-orchestrator serve --port 8001` and set `TEAM_ORCHESTRATOR_SERVER_URL=http://localhost:8001` |
| **Analysis not on dashboard** | Start the server first, then run `analyze`. Data is pushed via HTTP. |
| **OAuth redirect fails** | Ensure `FRONTEND_URL` in `api/.env` matches where the frontend runs, and callback URL in GitHub OAuth app is correct. |
| **"Index not built" for AI query** | Run full `team-orchestrator analyze` so the commit index is built. |
| **Merge conflict in `data/.audit_log.jsonl`** | `git rm --cached data/.audit_log.jsonl` (file is in `.gitignore`). |

---

## Project Structure

```
team-orchestrator/
├── api/                 # FastAPI backend
│   ├── server.py        # App entry
│   ├── routes.py        # API endpoints
│   ├── auth.py         # GitHub OAuth
│   └── .env            # Config (create from .env.example)
├── dashboard/          # React frontend
│   ├── src/
│   └── package.json
├── src/                # CLI engine
│   ├── cli.py          # Entry point
│   ├── analyzer.py     # AI pipeline
│   ├── project_store.py
│   └── ...
├── store/              # Data (SQLite, vectors, reports)
├── prompts/            # LLM templates
└── pyproject.toml
```

---

## Scoring Rubric

| Dimension | Weight | Scale |
|-----------|--------|-------|
| Complexity | 35% | 1=whitespace only → 5=complex algorithm |
| Integrity | 25% | 1=misleading message → 5=perfect match |
| Impact | 30% | 1=no value → 5=critical contribution |
| Effort Spread | 10% | Consistency over time |

**Composite** = complexity×0.35 + integrity×0.25 + impact×0.30 + effort_spread×5×0.10

**Grades:** A+ (≥4.5) | A (≥4.0) | B+ (≥3.5) | B (≥3.0) | C (≥2.5) | D (<2.5)

---

## License

MIT

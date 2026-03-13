import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import BackgroundScene from '../components/BackgroundScene';
import { WorkflowDiagram } from '../components/docs/WorkflowDiagram';
import { PipelineDiagram } from '../components/docs/PipelineDiagram';
import { ProjectStructureDiagram } from '../components/docs/ProjectStructureDiagram';

const IconArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
);

const SECTIONS = [
  { id: 'overview', title: 'Overview' },
  { id: 'workflow', title: 'End-to-End Workflow' },
  { id: 'prerequisites', title: 'Prerequisites' },
  { id: 'installation', title: 'Installation' },
  { id: 'quick-start', title: 'Quick Start' },
  { id: 'cli-commands', title: 'CLI Commands' },
  { id: 'pipeline-stages', title: 'Analysis Pipeline Stages' },
  { id: 'project-structure', title: 'Project Structure' },
  { id: 'environment', title: 'Environment Variables' },
  { id: 'security', title: 'Security' },
  { id: 'architecture', title: 'Architecture' },
  { id: 'scoring', title: 'Scoring Rubric' },
  { id: 'rbac', title: 'Roles & Access' },
  { id: 'production', title: 'Production Deployment' },
  { id: 'troubleshooting', title: 'Troubleshooting' },
];

export function DocumentationPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveSection(e.target.id);
        });
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="doc-page">
      <BackgroundScene />
      <div className="doc-container">
        <aside className="doc-sidebar">
          <button className="doc-back" onClick={() => navigate('/')}>
            <IconArrowLeft /> Back to Home
          </button>
          <nav className="doc-nav">
            {SECTIONS.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`doc-nav-item ${activeSection === s.id ? 'active' : ''}`}
                onClick={() => setActiveSection(s.id)}
              >
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        <main className="doc-content" ref={containerRef}>
          <motion.header
            className="doc-header"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1>Team Orchestrator Documentation</h1>
            <p className="doc-subtitle">Complete guide to installation, usage, security, and deployment</p>
          </motion.header>

          <div className="doc-sections">
            <DocSection id="overview" title="Overview" setActive={setActiveSection}>
              <p>
                Team Orchestrator is an AI-powered peer feedback coach designed for STEM (Science, Technology, Engineering, and Mathematics) collaborative projects. Unlike traditional tools that merely count lines of code or commits, it performs deep semantic analysis of every contribution using local large language models (LLMs). The entire system runs <strong>100% offline</strong> — your source code, commit history, and analysis results never leave your machine. This makes it ideal for academic settings, hackathons, and organizations with strict data privacy requirements.
              </p>
              <p>
                The system was built as part of <strong>Grand Challenge 4</strong> — a research initiative focused on improving peer feedback quality in collaborative technical work. By combining rule-based preprocessing with multi-pass AI evaluation, Team Orchestrator produces nuanced, explainable scores that reflect the true quality and impact of each team member&apos;s work.
              </p>
              <h4>What it does</h4>
              <p>
                The pipeline begins by extracting every commit from your Git repository, including full diff data, author metadata, and timestamps. Each commit then flows through a sophisticated multi-stage pipeline that enriches the raw data before any AI evaluation. This preprocessing stage is critical: it detects anomalies, identifies patterns across commits, and computes feature vectors that help the AI models make better decisions.
              </p>
              <ul>
                <li><strong>Extracts</strong> every commit with full diff data, author info, and file-level changes</li>
                <li><strong>Preprocesses</strong> with 5-stage intelligence (structural analysis, statistical anomalies, cross-commit patterns, feature engineering)</li>
                <li><strong>Evaluates</strong> with a 3-pass AI pipeline (spam detection → quality scoring → coaching feedback)</li>
                <li><strong>Scores</strong> each person on complexity, integrity, impact, and effort spread (1–5 scale)</li>
                <li><strong>Generates</strong> contribution profiles, peer review assignments, and skill growth tracking</li>
                <li><strong>Synchronizes</strong> with a central server so Supervisors can view and grade students</li>
                <li><strong>Visualizes</strong> results in a React dashboard with Role-Based Access Control (RBAC)</li>
              </ul>
              <p>
                The dashboard provides role-based views: <strong>Supervisors</strong> (professors, TAs, repo owners) see team-wide analytics, leaderboards, activity feeds, and export capabilities. <strong>Contributors</strong> (students, developers) see their own performance, AI-generated coaching feedback, and messaging with professors and peers.
              </p>
            </DocSection>

            <DocSection id="workflow" title="End-to-End Workflow" setActive={setActiveSection}>
              <p>
                Understanding the full workflow helps you know when to run which commands and how data flows between components. The system operates in two primary modes: <strong>CLI-driven</strong> (you run commands manually or via Git hooks) and <strong>dashboard-driven</strong> (you view results in the web UI).
              </p>
              <h4>High-level workflow diagram</h4>
              <WorkflowDiagram />
              <p>
                The key insight is that <strong>analysis always runs locally</strong>. The CLI uses Ollama on your machine to score commits. Only the resulting scores, vectors, and metadata are pushed to the server. The server never sees your raw source code or diffs — it only stores the derived analytics.
              </p>
              <h4>Typical usage flow</h4>
              <p>
                For a new project: run <code>team-orchestrator init</code> once in the repo root. This registers the project and installs a post-commit hook. Thereafter, every <code>git commit</code> can optionally trigger <code>team-orchestrator analyze --latest</code> to score just the new commit. For a full re-analysis (e.g., after pulling changes), run <code>team-orchestrator analyze</code> without <code>--latest</code>. Ensure the server is running before analyzing so data can be pushed.
              </p>
            </DocSection>

            <DocSection id="prerequisites" title="Prerequisites" setActive={setActiveSection}>
              <p>
                Before installing Team Orchestrator, ensure your system meets the following requirements. All components are free and open-source. The most resource-intensive part is running Ollama with the LLaMA model — we recommend at least 8GB RAM and a reasonably modern CPU (or GPU for faster inference).
              </p>
              <table className="doc-table">
                <thead><tr><th>Requirement</th><th>Version</th><th>Purpose</th></tr></thead>
                <tbody>
                  <tr><td>Python</td><td>3.9+</td><td>CLI, backend API, all analysis logic</td></tr>
                  <tr><td>Node.js</td><td>18+</td><td>React dashboard (Vite build)</td></tr>
                  <tr><td>Ollama</td><td>Latest</td><td>Local LLM inference (phi3, llama3.1, nomic-embed-text)</td></tr>
                  <tr><td>Git</td><td>Any</td><td>Repository access via GitPython</td></tr>
                </tbody>
              </table>
              <p>
                <strong>Ollama</strong> is the local inference server for LLMs. It runs as a background service (typically on port 11434) and must be started before running analysis. On first use, pulling the models may take several minutes depending on your connection. <strong>Git</strong> is used to read commit history; the CLI does not modify your repository except for installing the post-commit hook in <code>.git/hooks/</code>.
              </p>
            </DocSection>

            <DocSection id="installation" title="Installation" setActive={setActiveSection}>
              <p>
                Installation is a three-step process: set up Ollama and its models, install the Team Orchestrator package, and configure the backend for dashboard access. The first two steps are required for CLI analysis; the third is only needed if you want to use the web dashboard.
              </p>
              <h4>1. Install Ollama and models</h4>
              <p>
                Ollama provides local LLM inference. Install it using the official script (macOS/Linux) or download the installer from the website (Windows). After installation, pull the three required models. Phi-3 is used for fast spam detection; LLaMA 3.1 handles deep quality scoring; nomic-embed-text generates embeddings for the search index.
              </p>
              <pre className="doc-code">{`# macOS / Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows: Download from https://ollama.com/download

# Pull models (first run may take several minutes)
ollama pull phi3
ollama pull llama3.1
ollama pull nomic-embed-text`}</pre>

              <h4>2. Install Team Orchestrator</h4>
              <p>
                Install from the official GitHub repository. Using <code>pipx</code> is recommended for an isolated environment that won&apos;t conflict with other Python projects. For local development, use <code>pip install -e .</code> from the cloned repo.
              </p>
              <pre className="doc-code">{`# From GitHub (recommended)
pip install "git+https://github.com/gaganTakIITD/team-orchestrator.git"

# Or with pipx (isolated environment)
pipx install "git+https://github.com/gaganTakIITD/team-orchestrator.git"

# Local development
cd team-orchestrator && pip install -e .`}</pre>

              <h4>3. Configure backend</h4>
              <p>
                To use the dashboard, create <code>api/.env</code> with your GitHub OAuth credentials. Copy from <code>api/.env.example</code> if it exists. You must register an OAuth App in GitHub Developer Settings and set the callback URL to <code>http://localhost:8000/api/auth/github/callback</code> (or your API URL + that path).
              </p>
            </DocSection>

            <DocSection id="quick-start" title="Quick Start" setActive={setActiveSection}>
              <p>
                To get up and running quickly, you need two terminals: one for the backend API and one for the frontend dashboard. Start the backend first so that when you run analysis, the CLI can push data to the server. Then start the frontend and sign in with GitHub to view results.
              </p>
              <h4>Start the stack</h4>
              <p><strong>Terminal 1 — Backend (port 8000):</strong></p>
              <pre className="doc-code">{`cd team-orchestrator
team-orchestrator serve`}</pre>
              <p><strong>Terminal 2 — Frontend (port 5173):</strong></p>
              <pre className="doc-code">{`cd team-orchestrator/dashboard
npm install
npm run dev`}</pre>
              <p>
                Open <strong>http://localhost:5173</strong> in your browser and sign in with GitHub. Your role (Supervisor or Contributor) is determined automatically based on whether you own the repository or have committed to it.
              </p>

              <h4>Register and analyze a repo</h4>
              <p>
                Navigate to your Git repository and run <code>init</code> to register it and install the post-commit hook. Then run <code>analyze</code> to process all commits. The first full analysis may take several minutes depending on repo size and your hardware.
              </p>
              <pre className="doc-code">{`cd /path/to/your/git/repository
team-orchestrator init
team-orchestrator analyze`}</pre>

              <h4>Ports</h4>
              <table className="doc-table">
                <thead><tr><th>Service</th><th>Port</th><th>Override</th></tr></thead>
                <tbody>
                  <tr><td>Backend API</td><td>8000</td><td><code>team-orchestrator serve --port 8001</code></td></tr>
                  <tr><td>Frontend</td><td>5173</td><td><code>npm run dev -- --port 5173</code></td></tr>
                </tbody>
              </table>
            </DocSection>

            <DocSection id="cli-commands" title="CLI Commands" setActive={setActiveSection}>
              <p>
                The Team Orchestrator CLI provides a small set of commands for repository registration, analysis, and server management. All commands are invoked as <code>team-orchestrator &lt;command&gt;</code>. Use <code>team-orchestrator --help</code> for a quick reference.
              </p>
              <table className="doc-table">
                <thead><tr><th>Command</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><code>team-orchestrator init</code></td><td>Register repo and install post-commit hook</td></tr>
                  <tr><td><code>team-orchestrator init --path /path</code></td><td>Register a specific repo</td></tr>
                  <tr><td><code>team-orchestrator analyze</code></td><td>Full analysis of all commits</td></tr>
                  <tr><td><code>team-orchestrator analyze --latest</code></td><td>Analyze only latest commit (hook)</td></tr>
                  <tr><td><code>team-orchestrator list</code></td><td>List registered projects</td></tr>
                  <tr><td><code>team-orchestrator serve</code></td><td>Start backend API</td></tr>
                  <tr><td><code>team-orchestrator serve --port 8001</code></td><td>Start on different port</td></tr>
                </tbody>
              </table>
            </DocSection>

            <DocSection id="pipeline-stages" title="Analysis Pipeline Stages" setActive={setActiveSection}>
              <p>
                The analysis pipeline consists of six sequential stages. Stages 1–2 are pure Python (no AI); stages 3–6 use Ollama models. Understanding each stage helps you interpret results and troubleshoot issues.
              </p>
              <h4>Pipeline overview</h4>
              <PipelineDiagram />
              <p>
                The 5-stage preprocessing (Step 2) runs entirely in Python — no LLM calls. It produces flags and feature vectors that the AI models use as context. For example, if a commit is flagged as <code>possible_clone</code> (high similarity to a prior commit), the quality scorer can factor that into the integrity score. The spam check (Pass 1) is a fast filter; the deep model (Pass 2) has final say and can override spam when the diff shows real work.
              </p>
              <h4 id="pipeline-extract">Step 1: Extract</h4>
              <p>GitPython reads repo history. Output: raw JSON per commit (hash, author, message, diff, stats).</p>
              <h4 id="pipeline-preprocess">Step 2: Preprocess</h4>
              <p>5-stage intelligence: Structural Analysis (cyclomatic complexity, language detection, file categorization) → Statistical Anomaly (size anomaly, burst commits, entropy) → Cross-Commit Patterns (clone similarity, build-on-others, revert detection) → Pre-filter Flags → Feature Engineering (structural_complexity, commit_hygiene, diff_quality).</p>
              <h4 id="pipeline-analyze">Step 3: AI Analysis</h4>
              <p>3-pass: Spam Check (phi3) → Quality Scoring (llama3.1: complexity, integrity, impact) → Coaching Feedback (llama3.1, conditional).</p>
              <h4 id="pipeline-index">Step 4: Index</h4>
              <p>nomic-embed-text embeds commit messages + diffs. Output: searchable vector index for NL queries.</p>
              <h4 id="pipeline-aggregate">Step 5: Aggregate</h4>
              <p>Build contribution vectors per author. Average scores, effort spread, commit counts.</p>
              <h4 id="pipeline-coach">Step 6: Coaching</h4>
              <p>Peer review matrix (who reviews whom), per-person coaching synthesis, ingest to server via HTTP POST.</p>
            </DocSection>

            <DocSection id="project-structure" title="Project Structure" setActive={setActiveSection}>
              <p>
                The Team Orchestrator codebase is organized into clear modules. The <code>src/</code> directory contains the core analysis engine; <code>api/</code> holds the FastAPI server; <code>dashboard/</code> is the React frontend. Data (SQLite, vectors, reports) is stored under <code>store/</code> or a path specified by <code>TEAM_ORCHESTRATOR_STORE</code>.
              </p>
              <h4>Directory tree</h4>
              <ProjectStructureDiagram />
            </DocSection>

            <DocSection id="environment" title="Environment Variables" setActive={setActiveSection}>
              <p>
                Configuration is driven by environment variables. Server-side variables live in <code>api/.env</code>; CLI variables can be set in your shell or in a <code>.env</code> file in the project root. Never commit <code>api/.env</code> — it contains secrets.
              </p>
              <table className="doc-table">
                <thead><tr><th>Variable</th><th>Where</th><th>Description</th></tr></thead>
                <tbody>
                  <tr><td><code>GITHUB_CLIENT_ID</code></td><td>api/.env</td><td>GitHub OAuth app client ID</td></tr>
                  <tr><td><code>GITHUB_CLIENT_SECRET</code></td><td>api/.env</td><td>GitHub OAuth app secret</td></tr>
                  <tr><td><code>JWT_SECRET</code></td><td>api/.env</td><td>Secret for JWT tokens (use strong random value in production)</td></tr>
                  <tr><td><code>FRONTEND_URL</code></td><td>api/.env</td><td>React app URL (OAuth redirect, e.g. http://localhost:5173)</td></tr>
                  <tr><td><code>TEAM_ORCHESTRATOR_STORE</code></td><td>CLI/API</td><td>Override store path (default: ./store)</td></tr>
                  <tr><td><code>TEAM_ORCHESTRATOR_SERVER_URL</code></td><td>CLI</td><td>API URL when pushing (default: http://localhost:8000)</td></tr>
                </tbody>
              </table>
              <p>
                <code>TEAM_ORCHESTRATOR_SERVER_URL</code> is used by the CLI when it pushes analysis results to the server. If you run the server on a different port or host (e.g., a remote server), set this variable so the CLI knows where to send data.
              </p>
            </DocSection>

            <DocSection id="security" title="Security" setActive={setActiveSection}>
              <p>
                Security is designed around three principles: <strong>privacy</strong> (data stays local), <strong>defense in depth</strong> (validation at every layer), and <strong>least privilege</strong> (RBAC for dashboard access). This section describes how each concern is addressed.
              </p>
              <h4>Privacy & data</h4>
              <p>
                All AI inference runs locally via Ollama. Your commit diffs, source code, and author metadata are never sent to external APIs. The only data that leaves your machine (when you run analysis) is the derived output: scores, vectors, and metadata pushed to your own server via <code>TEAM_ORCHESTRATOR_SERVER_URL</code>. If you run the server locally, even that stays on your machine.
              </p>
              <ul>
                <li><strong>100% offline AI:</strong> Phi-3, LLaMA 3.1, and nomic-embed-text run through Ollama on localhost.</li>
                <li><strong>Local store:</strong> Analysis results are stored in SQLite under the store directory. You control where this lives via <code>TEAM_ORCHESTRATOR_STORE</code>.</li>
              </ul>

              <h4>Input sanitization</h4>
              <p>
                User-derived content (commit messages, diffs, author names) is sanitized before being passed to LLM prompts. This prevents prompt injection, binary blobs, and control characters from affecting model behavior or causing parsing errors.
              </p>
              <ul>
                <li>Binary data stripped, control chars removed, prompt delimiters escaped</li>
                <li>Author names and emails validated and truncated to safe lengths</li>
                <li>LLM JSON responses parsed with size limits and schema validation</li>
              </ul>

              <h4>Path & repo validation</h4>
              <p>
                Repository paths are validated to prevent path traversal and accidental access to system directories. Only real Git repositories (with a <code>.git</code> directory) are accepted.
              </p>
              <ul>
                <li>Path traversal blocked (e.g. <code>../</code> escaping)</li>
                <li>System directories (e.g. /usr, C:\Windows) blocked</li>
                <li>Only valid Git repos accepted</li>
              </ul>

              <h4>Authentication</h4>
              <p>
                Dashboard access uses GitHub OAuth 2.0 — no passwords are stored. After OAuth, a JWT is issued for session management. Roles are assigned automatically: if your GitHub account owns the repo, you are a Supervisor; otherwise, if you have commits, you are a Contributor.
              </p>
              <ul>
                <li><strong>GitHub OAuth:</strong> Standard OAuth 2.0 flow; callback URL must match <code>FRONTEND_URL</code></li>
                <li><strong>JWT:</strong> HS256-signed tokens; use a strong <code>JWT_SECRET</code> (32+ chars) in production</li>
                <li><strong>RBAC:</strong> Supervisor vs Contributor enforced per project</li>
              </ul>

              <h4>API security</h4>
              <ul>
                <li>CORS restricted to configured frontend origins</li>
                <li>Rate limiting on API endpoints</li>
                <li>Audit logging for significant actions</li>
              </ul>
            </DocSection>

            <DocSection id="architecture" title="Architecture" setActive={setActiveSection}>
              <p>
                Team Orchestrator follows a client-server architecture with a clear separation between the analysis engine (CLI, runs on developer machines) and the aggregation layer (server + dashboard, can run centrally). The CLI is stateless with respect to the server — it can run without a server for local-only analysis, but then dashboard features won&apos;t be available.
              </p>
              <h4>Data flow diagram</h4>
              <pre className="doc-code">{`team-orchestrator init → post-commit hook
         ↓ (on every commit)
Git Repo → CLI analyzes locally → Llama AI scores → store/
                                              ↓ (HTTP POST)
         React Dashboard ← HTTP → FastAPI Server (SQLite)
         (GitHub OAuth, RBAC)`}</pre>
              <h4>Tech stack</h4>
              <p>
                The system is built with widely-used, production-ready tools. Git access uses GitPython; AI inference uses Ollama with LangChain. The backend is FastAPI with Uvicorn; the frontend is React with Vite and Recharts for visualizations.
              </p>
              <ul>
                <li><strong>Git:</strong> GitPython for commit extraction</li>
                <li><strong>AI:</strong> Phi-3 (spam), LLaMA 3.1 (scoring), nomic-embed-text (embeddings)</li>
                <li><strong>Backend:</strong> FastAPI + Uvicorn</li>
                <li><strong>Frontend:</strong> React + Vite + Recharts</li>
                <li><strong>Auth:</strong> JWT + GitHub OAuth</li>
              </ul>
            </DocSection>

            <DocSection id="scoring" title="Scoring Rubric" setActive={setActiveSection}>
              <p>
                Each commit is scored on four dimensions by the LLaMA model. The rubric is designed to capture both <strong>technical quality</strong> (complexity, impact) and <strong>professional behavior</strong> (integrity, effort spread). Weights were chosen to emphasize code quality while still rewarding consistent participation.
              </p>
              <table className="doc-table">
                <thead><tr><th>Dimension</th><th>Weight</th><th>Scale</th></tr></thead>
                <tbody>
                  <tr><td>Complexity</td><td>35%</td><td>1=whitespace only → 5=complex algorithm</td></tr>
                  <tr><td>Integrity</td><td>25%</td><td>1=misleading message → 5=perfect match</td></tr>
                  <tr><td>Impact</td><td>30%</td><td>1=no value → 5=critical contribution</td></tr>
                  <tr><td>Effort Spread</td><td>10%</td><td>Consistency over time</td></tr>
                </tbody>
              </table>
              <p>
                <strong>Complexity</strong> measures the technical sophistication of the change — from trivial formatting to algorithms and architecture. <strong>Integrity</strong> measures how well the commit message matches the actual diff (no misleading or vague descriptions). <strong>Impact</strong> measures the value of the change to the project. <strong>Effort Spread</strong> rewards consistent contribution over time rather than last-minute bursts.
              </p>
              <p><strong>Composite</strong> = complexity×0.35 + integrity×0.25 + impact×0.30 + effort_spread×5×0.10</p>
              <p><strong>Grades:</strong> A+ (≥4.5) | A (≥4.0) | B+ (≥3.5) | B (≥3.0) | C (≥2.5) | D (&lt;2.5)</p>
            </DocSection>

            <DocSection id="rbac" title="Roles & Access" setActive={setActiveSection}>
              <p>
                Access control is role-based. Your role is determined automatically when you sign in with GitHub: if your account owns the repository (or is in the owner list), you are a <strong>Supervisor</strong>; otherwise, if you have commits in the repo, you are a <strong>Contributor</strong>. There is no manual role assignment — it is derived from Git and GitHub metadata.
              </p>
              <table className="doc-table">
                <thead><tr><th>Role</th><th>Condition</th><th>Access</th></tr></thead>
                <tbody>
                  <tr>
                    <td><strong>Supervisor</strong></td>
                    <td>Owns the GitHub repo</td>
                    <td>Team overview, leaderboard, activity feed, export, feedback, heatmaps</td>
                  </tr>
                  <tr>
                    <td><strong>Contributor</strong></td>
                    <td>Committed to repo</td>
                    <td>My Performance, My Coaching, Messages (professor + peers)</td>
                  </tr>
                </tbody>
              </table>
              <p>
                Supervisors see aggregate analytics across all contributors: who is leading, who needs attention, activity over time, and commit heatmaps. They can export reports and leave feedback. Contributors see only their own scores, coaching tips, and messaging threads with professors and peers.
              </p>
            </DocSection>

            <DocSection id="production" title="Production Deployment" setActive={setActiveSection}>
              <p>
                For production use (e.g., a lab or course server), deploy the backend and frontend behind HTTPS. The CLI can run on student machines and push to your central server. Ensure GitHub OAuth is configured with your production callback URL.
              </p>
              <ul>
                <li><strong>Backend:</strong> Run <code>team-orchestrator serve</code> behind nginx or Caddy with HTTPS. Use a process manager (systemd, supervisord) for reliability.</li>
                <li><strong>Frontend:</strong> Run <code>npm run build</code> and serve <code>dashboard/dist</code> as static files. Point <code>API_BASE</code> (or build-time env) to your API URL.</li>
                <li><strong>Environment:</strong> Set <code>FRONTEND_URL</code> to your dashboard URL (e.g. https://team.example.edu). Update CORS in <code>api/server.py</code> to include production origins.</li>
                <li><strong>Secrets:</strong> Use a cryptographically strong <code>JWT_SECRET</code> (32+ random chars). Keep <code>GITHUB_CLIENT_SECRET</code> in environment only, never in code.</li>
                <li><strong>Store:</strong> Set <code>TEAM_ORCHESTRATOR_STORE</code> to a persistent path (e.g. /var/lib/team-orchestrator/store) with appropriate permissions.</li>
                <li><strong>CLI:</strong> On student machines, set <code>TEAM_ORCHESTRATOR_SERVER_URL</code> to your public API URL (e.g. https://api.team.example.edu) so analysis results are pushed correctly.</li>
              </ul>
            </DocSection>

            <DocSection id="troubleshooting" title="Troubleshooting" setActive={setActiveSection}>
              <p>
                Common issues and their solutions. If you encounter something not listed here, check the server logs (<code>team-orchestrator serve</code> output) and ensure Ollama is running (<code>ollama list</code>).
              </p>
              <table className="doc-table">
                <thead><tr><th>Issue</th><th>Solution</th></tr></thead>
                <tbody>
                  <tr><td>Port 8000 in use (WinError 10013)</td><td><code>team-orchestrator serve --port 8001</code> and set <code>TEAM_ORCHESTRATOR_SERVER_URL=http://localhost:8001</code></td></tr>
                  <tr><td>Analysis not on dashboard</td><td>Start server first, then run <code>analyze</code>. Data is pushed via HTTP; if the server is down, nothing is stored.</td></tr>
                  <tr><td>OAuth redirect fails</td><td>Check <code>FRONTEND_URL</code> in api/.env matches where the frontend runs. GitHub OAuth callback must be your API URL + <code>/api/auth/github/callback</code>.</td></tr>
                  <tr><td>&quot;Index not built&quot; for AI query</td><td>Run full <code>team-orchestrator analyze</code> so the vector index is built. The NL query feature requires the index.</td></tr>
                  <tr><td>Merge conflict in data/.audit_log.jsonl</td><td><code>git rm --cached data/.audit_log.jsonl</code> — this file is generated and should not be committed.</td></tr>
                  <tr><td>Ollama connection refused</td><td>Start Ollama: <code>ollama serve</code> (or launch the Ollama app). Default port is 11434.</td></tr>
                  <tr><td>Model not found (phi3, llama3.1)</td><td>Run <code>ollama pull phi3</code> and <code>ollama pull llama3.1</code>.</td></tr>
                </tbody>
              </table>
            </DocSection>
          </div>
        </main>
      </div>
    </div>
  );
}

function DocSection({ id, title, children, setActive }) {
  return (
    <section
      id={id}
      className="doc-section"
      onMouseEnter={() => setActive(id)}
    >
      <h2>{title}</h2>
      {children}
    </section>
  );
}

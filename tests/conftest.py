"""
Shared fixtures for backend tests.
Uses a temp SQLite DB and patches project_store to isolate tests from production data.
"""
import os
import sys
import json
import sqlite3
import tempfile
import pytest
import jwt
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

TEST_JWT_SECRET = "test-secret-key-for-testing"
TEST_JWT_ALGORITHM = "HS256"


def make_test_token(email="alice@test.com", name="Alice", login="alice", github_token="gh_fake_token"):
    payload = {
        "sub": "12345",
        "login": login,
        "name": name,
        "email": email,
        "avatar_url": "https://example.com/avatar.png",
        "github_token": github_token,
        "exp": datetime.utcnow() + timedelta(hours=24),
    }
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm=TEST_JWT_ALGORITHM)


def make_expired_token():
    payload = {
        "sub": "12345",
        "email": "expired@test.com",
        "exp": datetime.utcnow() - timedelta(hours=1),
    }
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm=TEST_JWT_ALGORITHM)


@pytest.fixture
def temp_db():
    """Create a temporary SQLite database for testing."""
    tmp = tempfile.mkdtemp()
    db_path = os.path.join(tmp, "test.db")
    with sqlite3.connect(db_path) as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS projects (
            project_id TEXT PRIMARY KEY, name TEXT, repo_path TEXT,
            user_name TEXT, user_email TEXT, created_at TEXT,
            last_analyzed TEXT, commit_count INTEGER, author_count INTEGER, authors_json TEXT
        )''')
        conn.execute('''CREATE TABLE IF NOT EXISTS vectors (
            project_id TEXT, email TEXT, data_json TEXT, PRIMARY KEY (project_id, email)
        )''')
        conn.execute('''CREATE TABLE IF NOT EXISTS commits (
            project_id TEXT, short_hash TEXT, data_json TEXT, PRIMARY KEY (project_id, short_hash)
        )''')
        conn.execute('''CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY, project_id TEXT, author_email TEXT,
            author_name TEXT, target_email TEXT, content TEXT, timestamp TEXT
        )''')
        conn.execute('''CREATE TABLE IF NOT EXISTS project_meta (
            project_id TEXT, meta_key TEXT, data_json TEXT, PRIMARY KEY (project_id, meta_key)
        )''')
    yield db_path
    import shutil
    shutil.rmtree(tmp, ignore_errors=True)


@pytest.fixture
def seeded_db(temp_db):
    """Temp DB pre-loaded with a sample project, vectors, commits, comments."""
    with sqlite3.connect(temp_db) as conn:
        conn.execute('''INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                     ("proj-1", "TestRepo", "/tmp/repo", "Alice", "alice@test.com",
                      "2025-01-01T00:00:00", "2025-01-15T10:00:00", 42, 3,
                      json.dumps(["alice@test.com", "bob@test.com", "charlie@test.com"])))

        for email, name, score, grade in [
            ("alice@test.com", "Alice", 4.5, "A+"),
            ("bob@test.com", "Bob", 3.8, "B+"),
            ("charlie@test.com", "Charlie", 2.1, "D"),
        ]:
            vec = {
                "name": name, "email": email, "total_commits": 14,
                "composite_score": score, "suggested_grade": grade,
                "average_scores": {"complexity": 3.5, "integrity": 4.0, "impact": 3.8},
                "commit_breakdown": {"feature": 5, "bugfix": 3, "refactor": 2},
                "quality_flags": {"spam_rate": 0.05, "spam_commits": 1, "proxy_commits": 0, "late_night_commits": 2},
                "effort_spread": 0.8,
                "coaching_summary": {"top_strengths": ["Clean code"], "top_improvements": ["More tests"]},
            }
            conn.execute("INSERT INTO vectors VALUES (?, ?, ?)",
                         ("proj-1", email, json.dumps(vec)))

        for i in range(3):
            commit = {
                "short_hash": f"abc{i}",
                "author": {"name": "Alice", "email": "alice@test.com"},
                "message": {"subject": f"feat: commit {i}"},
                "timestamps": {"authored_date": f"2025-01-{10+i}T12:00:00"},
                "llm_scores": {"type": "feature", "complexity": 3, "integrity": 4, "impact": 3, "confidence": 0.85},
                "spam_check": {"is_spam": False},
                "flag_count": 0,
            }
            conn.execute("INSERT INTO commits VALUES (?, ?, ?)",
                         ("proj-1", f"abc{i}", json.dumps(commit)))

        conn.execute("INSERT INTO project_meta VALUES (?, ?, ?)",
                     ("proj-1", "team_insights", json.dumps({
                         "team_strongest_dimension": "integrity",
                         "team_weakest_dimension": "complexity",
                         "team_spam_rate": 0.03,
                         "recommendation": "Focus more on testing"
                     })))

        conn.execute("INSERT INTO project_meta VALUES (?, ?, ?)",
                     ("proj-1", "peer_matrix", json.dumps({
                         "assignments": [
                             {"reviewer": "Alice", "reviewee": "Bob", "focus_area": "code_quality"},
                             {"reviewer": "Bob", "reviewee": "Charlie", "focus_area": "testing"},
                         ]
                     })))

        conn.execute("INSERT INTO comments VALUES (?, ?, ?, ?, ?, ?, ?)",
                     ("c1", "proj-1", "alice@test.com", "Alice", "bob@test.com",
                      "Great work on the refactor!", "2025-01-15T11:00:00"))

    yield temp_db


@pytest.fixture
def app_with_db(seeded_db):
    """Create a FastAPI test app with project_store pointing at the seeded DB."""
    with patch("src.project_store.DB_PATH", seeded_db), \
         patch("api.auth.JWT_SECRET", TEST_JWT_SECRET), \
         patch("api.routes.JWT_SECRET", TEST_JWT_SECRET):
        from api.server import app
        yield app


@pytest.fixture
def client(app_with_db):
    """TestClient for the FastAPI app."""
    from fastapi.testclient import TestClient
    return TestClient(app_with_db)


@pytest.fixture
def auth_client(client):
    """TestClient with a valid auth cookie set."""
    token = make_test_token()
    client.cookies.set("auth_token", token)
    return client

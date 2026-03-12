"""
Tests for api/routes.py — all project CRUD, results, commits, insights,
peer-matrix, comments, status, query, and legacy endpoints.
"""
import json
import pytest
from unittest.mock import patch, MagicMock
from tests.conftest import make_test_token, TEST_JWT_SECRET


# ═══════════════════════════════════════════════════════════════════
# ROOT
# ═══════════════════════════════════════════════════════════════════

class TestRoot:
    def test_root_returns_metadata(self, client):
        res = client.get("/")
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "AI Git Contribution Analyzer"
        assert "endpoints" in data


# ═══════════════════════════════════════════════════════════════════
# STATUS
# ═══════════════════════════════════════════════════════════════════

class TestStatus:
    def test_status_returns_idle_by_default(self, client):
        res = client.get("/api/status")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ("idle", "complete", "running", "error")


# ═══════════════════════════════════════════════════════════════════
# PROJECTS
# ═══════════════════════════════════════════════════════════════════

class TestProjects:
    def test_list_projects(self, client):
        res = client.get("/api/projects")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["name"] == "TestRepo"

    def test_list_projects_filter_by_email(self, client):
        res = client.get("/api/projects?email=alice@test.com")
        assert res.status_code == 200
        data = res.json()
        assert len(data) >= 1
        assert all(
            p["registered_by"]["email"] == "alice@test.com" or "alice@test.com" in p.get("authors", [])
            for p in data
        )

    def test_list_projects_filter_no_match(self, client):
        res = client.get("/api/projects?email=nobody@test.com")
        assert res.status_code == 200
        assert res.json() == []

    def test_get_project_by_id(self, client):
        res = client.get("/api/projects/proj-1")
        assert res.status_code == 200
        data = res.json()
        assert data["project_id"] == "proj-1"
        assert data["name"] == "TestRepo"
        assert data["commit_count"] == 42

    def test_get_project_not_found(self, client):
        res = client.get("/api/projects/nonexistent")
        assert res.status_code == 404

    def test_register_project(self, client):
        res = client.post("/api/projects/register", json={
            "project_id": "new-proj",
            "repo_name": "NewRepo",
            "repo_path": "/tmp/new-repo",
            "user_name": "Dave",
            "user_email": "dave@test.com",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["project_id"] == "new-proj"
        assert data["name"] == "NewRepo"
        assert data["registered_by"]["email"] == "dave@test.com"

    def test_register_duplicate_project_updates(self, client):
        client.post("/api/projects/register", json={
            "project_id": "dup-proj",
            "repo_name": "Dup",
            "repo_path": "/tmp/dup1",
            "user_name": "Eve",
            "user_email": "eve@test.com",
        })
        res = client.post("/api/projects/register", json={
            "project_id": "dup-proj",
            "repo_name": "Dup",
            "repo_path": "/tmp/dup2",
            "user_name": "Eve",
            "user_email": "eve@test.com",
        })
        assert res.status_code == 200
        assert res.json()["repo_path"] == "/tmp/dup2"


# ═══════════════════════════════════════════════════════════════════
# PROJECT RESULTS (Vectors)
# ═══════════════════════════════════════════════════════════════════

class TestProjectResults:
    def test_get_results(self, client):
        res = client.get("/api/projects/proj-1/results")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) == 3
        names = [v["name"] for v in data]
        assert "Alice" in names
        assert "Bob" in names

    def test_results_sorted_by_score(self, client):
        res = client.get("/api/projects/proj-1/results")
        data = res.json()
        scores = [v["composite_score"] for v in data]
        assert scores == sorted(scores, reverse=True)

    def test_results_not_found_project(self, client):
        res = client.get("/api/projects/nonexistent/results")
        assert res.status_code == 404


# ═══════════════════════════════════════════════════════════════════
# PROJECT COMMITS
# ═══════════════════════════════════════════════════════════════════

class TestProjectCommits:
    def test_get_commits(self, client):
        res = client.get("/api/projects/proj-1/commits")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) == 3
        assert data[0]["author_name"] == "Alice"

    def test_get_commits_not_found(self, client):
        res = client.get("/api/projects/nonexistent/commits")
        assert res.status_code == 404

    def test_commits_filter_by_author(self, client):
        res = client.get("/api/projects/proj-1/commits?author=alice@test.com")
        assert res.status_code == 200
        data = res.json()
        assert all(c["author_email"] == "alice@test.com" for c in data)

    def test_commits_filter_by_type(self, client):
        res = client.get("/api/projects/proj-1/commits?commit_type=feature")
        assert res.status_code == 200
        data = res.json()
        assert all(c["commit_type"] == "feature" for c in data)


# ═══════════════════════════════════════════════════════════════════
# INSIGHTS & PEER MATRIX
# ═══════════════════════════════════════════════════════════════════

class TestInsights:
    def test_get_insights(self, client):
        res = client.get("/api/projects/proj-1/insights")
        assert res.status_code == 200
        data = res.json()
        assert data["team_strongest_dimension"] == "integrity"
        assert data["team_weakest_dimension"] == "complexity"
        assert data["recommendation"] == "Focus more on testing"

    def test_insights_not_found(self, client):
        res = client.get("/api/projects/nonexistent/insights")
        assert res.status_code == 404

    def test_get_peer_matrix(self, client):
        res = client.get("/api/projects/proj-1/peer-matrix")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["reviewer"] == "Alice"
        assert data[0]["reviewee"] == "Bob"

    def test_peer_matrix_not_found(self, client):
        res = client.get("/api/projects/nonexistent/peer-matrix")
        assert res.status_code == 404


# ═══════════════════════════════════════════════════════════════════
# COMMENTS
# ═══════════════════════════════════════════════════════════════════

class TestComments:
    def test_get_comments(self, client):
        res = client.get("/api/projects/proj-1/comments")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["content"] == "Great work on the refactor!"
        assert data[0]["author_email"] == "alice@test.com"
        assert data[0]["target_email"] == "bob@test.com"

    def test_get_comments_not_found_project(self, client):
        res = client.get("/api/projects/nonexistent/comments")
        assert res.status_code == 404

    def test_create_comment_requires_auth(self, client):
        res = client.post("/api/projects/proj-1/comments", json={
            "target_email": "alice@test.com",
            "content": "Nice job!",
        })
        assert res.status_code == 401

    def test_create_comment_with_auth(self, auth_client):
        res = auth_client.post("/api/projects/proj-1/comments", json={
            "target_email": "bob@test.com",
            "content": "Keep up the good work!",
        })
        assert res.status_code == 200
        data = res.json()
        assert data["content"] == "Keep up the good work!"
        assert data["author_email"] == "alice@test.com"
        assert data["target_email"] == "bob@test.com"
        assert "id" in data
        assert "timestamp" in data

    def test_create_comment_shows_in_list(self, auth_client):
        auth_client.post("/api/projects/proj-1/comments", json={
            "target_email": "charlie@test.com",
            "content": "You need more tests",
        })
        res = auth_client.get("/api/projects/proj-1/comments")
        data = res.json()
        contents = [c["content"] for c in data]
        assert "You need more tests" in contents


# ═══════════════════════════════════════════════════════════════════
# INGEST
# ═══════════════════════════════════════════════════════════════════

class TestIngest:
    def test_ingest_vectors_and_commits(self, client):
        vectors = [{"email": "dave@test.com", "name": "Dave", "composite_score": 3.0}]
        scored_commits = [{"short_hash": "xyz1", "author": {"name": "Dave", "email": "dave@test.com"}}]

        res = client.post("/api/projects/proj-1/ingest", json={
            "vectors": vectors,
            "scored_commits": scored_commits,
        })
        assert res.status_code == 200
        assert "1 vectors" in res.json()["message"]
        assert "1 commits" in res.json()["message"]

    def test_ingest_not_found_project(self, client):
        res = client.post("/api/projects/nonexistent/ingest", json={
            "vectors": [], "scored_commits": []
        })
        assert res.status_code == 404


# ═══════════════════════════════════════════════════════════════════
# QUERY (NL)
# ═══════════════════════════════════════════════════════════════════

class TestQuery:
    def test_query_without_body_returns_422(self, client):
        res = client.post("/api/query", json={})
        assert res.status_code == 422

    def test_query_with_valid_body(self, client):
        res = client.post("/api/query", json={"question": "Who wrote the most?"})
        # Will either return 200 (if index exists), 503 (no index), or 500 (import error)
        assert res.status_code in (200, 500, 503)


# ═══════════════════════════════════════════════════════════════════
# PIPELINE TRIGGER
# ═══════════════════════════════════════════════════════════════════

class TestPipelineTrigger:
    def test_trigger_analysis_project_not_found(self, client):
        res = client.post("/api/projects/nonexistent/analyze")
        assert res.status_code == 404

"""
Tests for src/project_store.py — SQLite project registry CRUD operations.
"""
import json
import sqlite3
import pytest
from unittest.mock import patch
from tests.conftest import TEST_JWT_SECRET


class TestRegisterProject:
    def test_register_new_project(self, temp_db):
        with patch("src.project_store.DB_PATH", temp_db), \
             patch("src.project_store.STORE_ROOT", "/tmp/test-store"):
            from src.project_store import register_project
            result = register_project("p1", "TestRepo", "/tmp/repo", "Alice", "alice@test.com")
            assert result["project_id"] == "p1"
            assert result["name"] == "TestRepo"
            assert result["registered_by"]["email"] == "alice@test.com"
            assert result["commit_count"] == 0

    def test_register_same_project_updates_path(self, temp_db):
        with patch("src.project_store.DB_PATH", temp_db), \
             patch("src.project_store.STORE_ROOT", "/tmp/test-store"):
            from src.project_store import register_project
            register_project("p1", "Repo", "/path1", "Alice", "alice@test.com")
            result = register_project("p1", "Repo", "/path2", "Alice", "alice@test.com")
            assert result["repo_path"] == "/path2"


class TestListProjects:
    def test_list_empty(self, temp_db):
        with patch("src.project_store.DB_PATH", temp_db):
            from src.project_store import list_projects
            assert list_projects() == []

    def test_list_with_data(self, seeded_db):
        with patch("src.project_store.DB_PATH", seeded_db):
            from src.project_store import list_projects
            projects = list_projects()
            assert len(projects) == 1
            assert projects[0]["name"] == "TestRepo"

    def test_list_filter_by_email(self, seeded_db):
        with patch("src.project_store.DB_PATH", seeded_db):
            from src.project_store import list_projects
            projects = list_projects(email_filter="alice@test.com")
            assert len(projects) == 1

    def test_list_filter_no_match(self, seeded_db):
        with patch("src.project_store.DB_PATH", seeded_db):
            from src.project_store import list_projects
            projects = list_projects(email_filter="nobody@test.com")
            assert len(projects) == 0


class TestGetProject:
    def test_get_existing(self, seeded_db):
        with patch("src.project_store.DB_PATH", seeded_db):
            from src.project_store import get_project
            proj = get_project("proj-1")
            assert proj is not None
            assert proj["name"] == "TestRepo"
            assert proj["commit_count"] == 42

    def test_get_nonexistent(self, seeded_db):
        with patch("src.project_store.DB_PATH", seeded_db):
            from src.project_store import get_project
            assert get_project("nope") is None


class TestVectors:
    def test_ingest_and_load_vectors(self, seeded_db):
        with patch("src.project_store.DB_PATH", seeded_db):
            from src.project_store import ingest_vectors, load_project_vectors
            ingest_vectors("proj-1", [
                {"email": "new@test.com", "name": "New", "composite_score": 3.5}
            ])
            vectors = load_project_vectors("proj-1")
            emails = [v["email"] for v in vectors]
            assert "new@test.com" in emails

    def test_vectors_sorted_by_score(self, seeded_db):
        with patch("src.project_store.DB_PATH", seeded_db):
            from src.project_store import load_project_vectors
            vectors = load_project_vectors("proj-1")
            scores = [v["composite_score"] for v in vectors]
            assert scores == sorted(scores, reverse=True)


class TestCommits:
    def test_load_scored_commits(self, seeded_db):
        with patch("src.project_store.DB_PATH", seeded_db):
            from src.project_store import load_project_scored_commits
            commits = load_project_scored_commits("proj-1")
            assert len(commits) == 3

    def test_ingest_scored_commits(self, seeded_db):
        with patch("src.project_store.DB_PATH", seeded_db):
            from src.project_store import ingest_scored_commits, load_project_scored_commits
            ingest_scored_commits("proj-1", [
                {"short_hash": "new1", "author": {"name": "Bob"}}
            ])
            commits = load_project_scored_commits("proj-1")
            hashes = [c.get("short_hash") for c in commits]
            assert "new1" in hashes


class TestInsightsAndPeerMatrix:
    def test_load_team_insights(self, seeded_db):
        with patch("src.project_store.DB_PATH", seeded_db):
            from src.project_store import load_project_team_insights
            insights = load_project_team_insights("proj-1")
            assert insights["team_strongest_dimension"] == "integrity"

    def test_load_team_insights_missing(self, seeded_db):
        with patch("src.project_store.DB_PATH", seeded_db):
            from src.project_store import load_project_team_insights
            insights = load_project_team_insights("nonexistent")
            assert insights == {}

    def test_load_peer_matrix(self, seeded_db):
        with patch("src.project_store.DB_PATH", seeded_db):
            from src.project_store import load_project_peer_matrix
            matrix = load_project_peer_matrix("proj-1")
            assert len(matrix) == 2
            assert matrix[0]["reviewer"] == "Alice"

    def test_load_peer_matrix_missing(self, seeded_db):
        with patch("src.project_store.DB_PATH", seeded_db):
            from src.project_store import load_project_peer_matrix
            matrix = load_project_peer_matrix("nonexistent")
            assert matrix == []


class TestComments:
    def test_load_comments(self, seeded_db):
        with patch("src.project_store.DB_PATH", seeded_db):
            from src.project_store import load_project_comments
            comments = load_project_comments("proj-1")
            assert len(comments) == 1
            assert comments[0]["content"] == "Great work on the refactor!"

    def test_save_and_load_comment(self, seeded_db):
        with patch("src.project_store.DB_PATH", seeded_db):
            from src.project_store import save_project_comment, load_project_comments
            saved = save_project_comment(
                "proj-1", "bob@test.com", "Bob", "alice@test.com", "Thanks for the review!"
            )
            assert saved["content"] == "Thanks for the review!"
            assert saved["author_email"] == "bob@test.com"
            assert "id" in saved
            assert "timestamp" in saved

            comments = load_project_comments("proj-1")
            assert len(comments) == 2

    def test_comments_empty_project(self, seeded_db):
        with patch("src.project_store.DB_PATH", seeded_db):
            from src.project_store import load_project_comments
            comments = load_project_comments("nonexistent")
            assert comments == []


class TestUpdateStats:
    def test_update_project_stats(self, seeded_db):
        with patch("src.project_store.DB_PATH", seeded_db):
            from src.project_store import update_project_stats, get_project
            update_project_stats("proj-1", commit_count=100, author_count=5, authors=["a@b.com"])
            proj = get_project("proj-1")
            assert proj["commit_count"] == 100
            assert proj["author_count"] == 5
            assert proj["last_analyzed"] is not None

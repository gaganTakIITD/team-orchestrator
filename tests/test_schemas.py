"""
Tests for api/schemas.py — Pydantic model validation for all request/response types.
"""
import pytest
from pydantic import ValidationError
from api.schemas import (
    AnalyzeRequest, QueryRequest, RubricUpdate,
    StatusResponse, ContributionVector, QueryResponse, CommitSummary,
    ProjectRegister, ProjectInfo, IngestRequest,
    CommentCreateRequest, CommentResponse,
    AverageScores, CommitBreakdown, QualityFlags,
)


class TestRequestModels:
    def test_analyze_request_valid(self):
        req = AnalyzeRequest(repo_path="/tmp/repo")
        assert req.repo_path == "/tmp/repo"
        assert req.force is False

    def test_analyze_request_with_force(self):
        req = AnalyzeRequest(repo_path="/tmp/repo", force=True)
        assert req.force is True

    def test_analyze_request_missing_path(self):
        with pytest.raises(ValidationError):
            AnalyzeRequest()

    def test_query_request_valid(self):
        req = QueryRequest(question="Who wrote the most code?")
        assert req.question == "Who wrote the most code?"

    def test_query_request_missing_question(self):
        with pytest.raises(ValidationError):
            QueryRequest()

    def test_rubric_update_valid(self):
        req = RubricUpdate(rubric={"complexity": {"weight": 0.35}})
        assert req.rubric["complexity"]["weight"] == 0.35

    def test_project_register_valid(self):
        req = ProjectRegister(
            project_id="p1",
            repo_name="MyRepo",
            repo_path="/home/user/repo",
            user_name="Alice",
            user_email="alice@test.com",
        )
        assert req.project_id == "p1"
        assert req.user_email == "alice@test.com"

    def test_project_register_missing_fields(self):
        with pytest.raises(ValidationError):
            ProjectRegister(project_id="p1")

    def test_ingest_request_defaults(self):
        req = IngestRequest()
        assert req.vectors == []
        assert req.scored_commits == []

    def test_ingest_request_with_data(self):
        req = IngestRequest(
            vectors=[{"email": "a@b.com"}],
            scored_commits=[{"short_hash": "abc"}],
        )
        assert len(req.vectors) == 1
        assert len(req.scored_commits) == 1

    def test_comment_create_request(self):
        req = CommentCreateRequest(target_email="bob@test.com", content="Great job!")
        assert req.target_email == "bob@test.com"

    def test_comment_create_missing_content(self):
        with pytest.raises(ValidationError):
            CommentCreateRequest(target_email="bob@test.com")


class TestResponseModels:
    def test_status_response(self):
        res = StatusResponse(status="idle")
        assert res.status == "idle"
        assert res.step is None

    def test_status_response_running(self):
        res = StatusResponse(status="running", step="extraction", progress="5/42", message="Extracting")
        assert res.step == "extraction"
        assert res.progress == "5/42"

    def test_project_info(self):
        info = ProjectInfo(
            project_id="p1", name="Repo", repo_path="/tmp/repo",
            registered_by={"name": "Alice", "email": "a@b.com"},
            commit_count=10, author_count=2, authors=["a@b.com", "c@d.com"],
        )
        assert info.project_id == "p1"
        assert info.commit_count == 10
        assert len(info.authors) == 2

    def test_project_info_defaults(self):
        info = ProjectInfo(project_id="p1", name="Repo", repo_path="/tmp")
        assert info.commit_count == 0
        assert info.author_count == 0
        assert info.authors == []
        assert info.last_analyzed is None

    def test_query_response(self):
        res = QueryResponse(question="Who?", answer="Alice")
        assert res.question == "Who?"
        assert res.answer == "Alice"

    def test_comment_response(self):
        res = CommentResponse(
            id="c1", author_email="a@b.com", author_name="Alice",
            target_email="b@c.com", content="Nice!", timestamp="2025-01-15",
        )
        assert res.id == "c1"
        assert res.author_email == "a@b.com"

    def test_commit_summary(self):
        cs = CommitSummary(
            short_hash="abc123", author_name="Alice", author_email="a@b.com",
            subject="feat: thing", date="2025-01-15", commit_type="feature",
            complexity=4, integrity=3, impact=5, is_spam=False, flag_count=0,
        )
        assert cs.short_hash == "abc123"
        assert cs.is_spam is False


class TestSubModels:
    def test_average_scores(self):
        s = AverageScores(complexity=3.5, integrity=4.0, impact=3.2)
        assert s.complexity == 3.5

    def test_commit_breakdown_defaults(self):
        b = CommitBreakdown()
        assert b.feature == 0
        assert b.spam == 0

    def test_quality_flags(self):
        f = QualityFlags(spam_rate=0.05, spam_commits=2, proxy_commits=1, late_night_commits=3)
        assert f.spam_rate == 0.05
        assert f.late_night_commits == 3

    def test_contribution_vector_full(self):
        v = ContributionVector(
            name="Alice", email="a@b.com", total_commits=20,
            average_scores=AverageScores(complexity=3, integrity=4, impact=3),
            commit_breakdown=CommitBreakdown(feature=10, bugfix=5),
            quality_flags=QualityFlags(spam_rate=0.05, spam_commits=1, proxy_commits=0, late_night_commits=2),
            effort_spread=0.8, composite_score=4.1, suggested_grade="A",
        )
        assert v.name == "Alice"
        assert v.composite_score == 4.1
        assert v.suggested_grade == "A"
        assert v.skill_growth is None
        assert v.coaching_summary is None

"""
schemas.py — Pydantic request/response models for the FastAPI backend.
Type-safe API contract for all endpoints.
"""

from typing import List, Dict, Optional
from pydantic import BaseModel, Field


# ─── Request Models ──────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    repo_path: str = Field(..., description="Path to git repository to analyze")
    force: bool = Field(False, description="Force re-analysis even if cached")


class QueryRequest(BaseModel):
    question: str = Field(..., description="Natural language question about contributions")


class RubricUpdate(BaseModel):
    rubric: dict = Field(..., description="Updated rubric configuration JSON")


class ProjectRegister(BaseModel):
    project_id: str = Field(..., description="Unique project identifier")
    repo_name: str = Field(..., description="Repository name")
    repo_path: str = Field(..., description="Absolute path to git repository")
    user_name: str = Field(..., description="Git user.name")
    user_email: str = Field(..., description="Git user.email")


class IngestProjectMeta(BaseModel):
    repo_name: str = Field(default="", description="Repository name")
    repo_path: str = Field(default="", description="Path to repo")
    user_name: str = Field(default="Unknown", description="Git user.name")
    user_email: str = Field(default="unknown@unknown", description="Git user.email")


class IngestRequest(BaseModel):
    vectors: List[dict] = Field(default=[], description="Contribution vectors to store")
    scored_commits: List[dict] = Field(default=[], description="Scored commits to store")
    project_meta: Optional[IngestProjectMeta] = Field(default=None, description="Project metadata for auto-register")


# ─── Response Models ─────────────────────────────────────────────────────────

class StatusResponse(BaseModel):
    status: str = Field(..., description="Pipeline status: idle, running, complete, error")
    step: Optional[str] = Field(None, description="Current pipeline step")
    progress: Optional[str] = Field(None, description="Progress indicator e.g. '12/47'")
    message: Optional[str] = None


class ProjectInfo(BaseModel):
    project_id: str
    name: str
    repo_path: str
    registered_by: dict = Field(default={}, description="{'name': ..., 'email': ...}")
    created_at: str = ""
    last_analyzed: Optional[str] = None
    commit_count: int = 0
    author_count: int = 0
    authors: List[str] = []


class AverageScores(BaseModel):
    complexity: float
    integrity: float
    impact: float


class CommitBreakdown(BaseModel):
    feature: int = 0
    bugfix: int = 0
    refactor: int = 0
    test: int = 0
    docs: int = 0
    spam: int = 0
    trivial: int = 0


class QualityFlags(BaseModel):
    spam_rate: float
    spam_commits: int
    proxy_commits: int
    late_night_commits: int


class SkillGrowth(BaseModel):
    first_half_avg: float
    second_half_avg: float
    trend: str
    growth_rate: float


class CoachingSummary(BaseModel):
    top_strengths: List[str] = []
    top_improvements: List[str] = []


class ContributionVector(BaseModel):
    name: str
    email: str
    total_commits: int
    average_scores: AverageScores
    commit_breakdown: CommitBreakdown
    quality_flags: QualityFlags
    effort_spread: float
    composite_score: float
    suggested_grade: str
    skill_growth: Optional[SkillGrowth] = None
    coaching_summary: Optional[CoachingSummary] = None
    languages_used: List[str] = []
    most_active_hours: List[int] = []


class QueryResponse(BaseModel):
    question: str
    answer: str


class CommitSummary(BaseModel):
    short_hash: str
    author_name: str
    author_email: str
    subject: str
    date: str
    commit_type: str
    complexity: int
    integrity: int
    impact: int
    is_spam: bool
    flag_count: int

class CommentCreateRequest(BaseModel):
    target_email: str
    content: str

class CommentResponse(BaseModel):
    id: str
    author_email: str
    author_name: str
    target_email: str
    content: str
    timestamp: str

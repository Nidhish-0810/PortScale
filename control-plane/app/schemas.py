from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime


# ─────────────────────────────────────────────────────
# Project schemas
# ─────────────────────────────────────────────────────

class ProjectBase(BaseModel):
    name: str
    github_repo_url: str
    github_repo_name: str
    github_branch: str = "main"


class ProjectCreate(ProjectBase):
    """Client sends this to create a project. Slug is auto-generated server-side."""
    pass


class ProjectUpdate(BaseModel):
    """Partial update — all fields optional."""
    name: Optional[str] = None
    github_branch: Optional[str] = None


class ProjectResponse(ProjectBase):
    id: str
    slug: str
    user_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ProjectDetailResponse(ProjectResponse):
    """Extended response including recent deployment history."""
    deployments: List["DeploymentResponse"] = []


# ─────────────────────────────────────────────────────
# Deployment schemas
# ─────────────────────────────────────────────────────

class DeploymentBase(BaseModel):
    commit_sha: Optional[str] = None
    commit_message: Optional[str] = None
    branch: Optional[str] = None


class DeploymentCreate(DeploymentBase):
    project_id: str


class DeploymentResponse(DeploymentBase):
    id: str
    project_id: str
    status: str
    container_id: Optional[str] = None
    container_port: Optional[int] = None
    url: Optional[str] = None
    build_log: Optional[str] = ""
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    build_duration_seconds: Optional[int] = None
    project_name: Optional[str] = None   # enriched field for list views

    model_config = ConfigDict(from_attributes=True)

    @field_validator("build_log", mode="before")
    @classmethod
    def coerce_build_log(cls, v):
        return v or ""

    def model_post_init(self, __context):
        # Compute build_duration_seconds from timing fields if not set
        if self.build_duration_seconds is None and self.started_at and self.finished_at:
            object.__setattr__(
                self,
                "build_duration_seconds",
                int((self.finished_at - self.started_at).total_seconds())
            )


# ─────────────────────────────────────────────────────
# Environment Variable schemas
# ─────────────────────────────────────────────────────

class EnvVarCreate(BaseModel):
    key: str
    value: str


class EnvVarResponse(BaseModel):
    id: str
    project_id: str
    key: str
    value: str   # returned in full on GET (masking is the UI's concern)
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────
# Webhook payload
# ─────────────────────────────────────────────────────

class GithubWebhookPayload(BaseModel):
    ref: str
    after: str
    repository: dict
    head_commit: Optional[dict] = None
    deleted: bool = False


# ─────────────────────────────────────────────────────
# Stats schemas
# ─────────────────────────────────────────────────────

class GlobalStatsResponse(BaseModel):
    total_projects: int
    total_deployments: int
    live_deployments: int
    failed_deployments: int
    avg_build_time_seconds: int
    success_rate_percent: float


class ProjectStatsResponse(BaseModel):
    total: int
    live: int
    failed: int
    success_rate: float
    avg_build_time_seconds: int = 0


# Forward reference resolution
ProjectDetailResponse.model_rebuild()

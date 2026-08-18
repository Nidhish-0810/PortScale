from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import uuid
import re
import json
import asyncio
import httpx

from app.db.database import get_db
from app.models.project import Project
from app.models.deployment import Deployment
from app.models.env_var import EnvVar
from app.schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    ProjectDetailResponse, EnvVarCreate, EnvVarResponse
)
from app.auth import get_current_user
from app.services.docker_service import stop_container
from app.config import settings
import redis as redis_lib

router = APIRouter(prefix="/projects", tags=["projects"])


def get_redis():
    return redis_lib.from_url(settings.REDIS_URL, decode_responses=True)


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return (
        db.query(Project)
        .filter(Project.user_id == current_user.sub)
        .order_by(Project.created_at.desc())
        .all()
    )


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Generate a URL-safe slug
    base_slug = re.sub(r"[^a-z0-9]+", "-", project_in.name.lower()).strip("-")
    short_id = str(uuid.uuid4())[:4]
    slug = f"{base_slug}-{short_id}"

    project = Project(
        name=project_in.name,
        slug=slug,
        github_repo_url=project_in.github_repo_url,
        github_repo_name=project_in.github_repo_name,
        github_branch=project_in.github_branch,
        user_id=current_user.sub,
        webhook_secret=str(uuid.uuid4())
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Install webhook on GitHub asynchronously (best-effort)
    _install_webhook_background(project, current_user.sub)

    return project


def _install_webhook_background(project: Project, user_id: str):
    """Fire-and-forget webhook installation — does NOT block the response."""
    async def _install():
        try:
            r = get_redis()
            raw = r.get(f"user:{user_id}")
            r.close()
            if not raw:
                return
            access_token = json.loads(raw).get("access_token")
            if not access_token:
                return

            # Use explicit API URL from config; fall back to localhost:8000
            api_base = settings.CONTROL_PLANE_URL or "http://localhost:8000"
            webhook_url = f"{api_base}/webhooks/github"

            from app.services.github_service import install_webhook
            await install_webhook(
                access_token=access_token,
                repo_name=project.github_repo_name,
                webhook_url=webhook_url,
                secret=project.webhook_secret
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Webhook install failed (non-fatal): {e}")

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_install())
    except Exception:
        pass


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    update: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Partially update project name or production branch."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.sub
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if update.name is not None:
        project.name = update.name
    if update.github_branch is not None:
        project.github_branch = update.github_branch

    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.sub
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    deployments = (
        db.query(Deployment)
        .filter(Deployment.project_id == project_id)
        .order_by(Deployment.created_at.desc())
        .limit(20)
        .all()
    )

    project_dict = {
        "id": project.id,
        "name": project.name,
        "slug": project.slug,
        "github_repo_url": project.github_repo_url,
        "github_repo_name": project.github_repo_name,
        "github_branch": project.github_branch,
        "user_id": project.user_id,
        "created_at": project.created_at,
        "deployments": deployments,
    }
    return project_dict


@router.delete("/{project_id}", status_code=200)
async def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.sub
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Stop all running containers for this project
    active_deps = db.query(Deployment).filter(
        Deployment.project_id == project_id,
        Deployment.status.in_(["live", "building", "deploying"])
    ).all()

    for dep in active_deps:
        if dep.container_id:
            try:
                stop_container(dep.container_id)
            except Exception:
                pass

    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}


@router.get("/{project_id}/stats")
async def get_project_stats(
    project_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.sub
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    total = db.query(func.count(Deployment.id)).filter(
        Deployment.project_id == project_id
    ).scalar() or 0

    live = db.query(func.count(Deployment.id)).filter(
        Deployment.project_id == project_id,
        Deployment.status == "live"
    ).scalar() or 0

    failed = db.query(func.count(Deployment.id)).filter(
        Deployment.project_id == project_id,
        Deployment.status == "failed"
    ).scalar() or 0

    success_rate = round(((total - failed) / total * 100) if total > 0 else 100.0, 1)

    completed = db.query(Deployment).filter(
        Deployment.project_id == project_id,
        Deployment.status == "live",
        Deployment.started_at.isnot(None),
        Deployment.finished_at.isnot(None),
    ).all()

    avg_build = 0
    if completed:
        durations = [
            (d.finished_at - d.started_at).total_seconds()
            for d in completed
            if d.started_at and d.finished_at
        ]
        if durations:
            avg_build = int(sum(durations) / len(durations))

    return {
        "total": total,
        "live": live,
        "failed": failed,
        "success_rate": success_rate,
        "avg_build_time_seconds": avg_build,
    }


# ─── Environment Variables ────────────────────────────────────────────────────

@router.get("/{project_id}/env", response_model=List[EnvVarResponse])
async def list_env_vars(
    project_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """List all environment variables for a project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.sub
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db.query(EnvVar).filter(EnvVar.project_id == project_id).all()


@router.post("/{project_id}/env", response_model=EnvVarResponse, status_code=201)
async def set_env_var(
    project_id: str,
    env_in: EnvVarCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Create or update an environment variable (upsert by key)."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.sub
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not env_in.key or not env_in.key.strip():
        raise HTTPException(status_code=422, detail="Key cannot be empty")

    # Upsert
    existing = db.query(EnvVar).filter(
        EnvVar.project_id == project_id,
        EnvVar.key == env_in.key
    ).first()

    if existing:
        existing.value = env_in.value
        db.commit()
        db.refresh(existing)
        return existing

    env_var = EnvVar(project_id=project_id, key=env_in.key.strip(), value=env_in.value)
    db.add(env_var)
    db.commit()
    db.refresh(env_var)
    return env_var


@router.delete("/{project_id}/env/{key}", status_code=200)
async def delete_env_var(
    project_id: str,
    key: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Delete an environment variable by key."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.sub
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    env_var = db.query(EnvVar).filter(
        EnvVar.project_id == project_id,
        EnvVar.key == key
    ).first()
    if not env_var:
        raise HTTPException(status_code=404, detail="Environment variable not found")

    db.delete(env_var)
    db.commit()
    return {"message": f"Deleted {key}"}

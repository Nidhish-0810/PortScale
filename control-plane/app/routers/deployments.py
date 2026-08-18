from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import redis.asyncio as aioredis
import docker
import asyncio
import json
from datetime import datetime

from app.db.database import get_db, SessionLocal
from app.models.project import Project
from app.models.deployment import Deployment
from app.schemas import DeploymentCreate, DeploymentResponse
from app.auth import get_current_user, verify_token
from app.config import settings
from app.worker.tasks import build_and_deploy
from app.services.docker_service import stop_container

router = APIRouter(tags=["deployments"])

docker_client = docker.from_env()


# ─── REST endpoints ──────────────────────────────────────────────────────────

@router.post("/deployments", response_model=DeploymentResponse, status_code=201)
async def create_deployment(
    dep_in: DeploymentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == dep_in.project_id,
        Project.user_id == current_user.sub
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Guard: don't create a new deployment if one is already running for this project
    running = db.query(Deployment).filter(
        Deployment.project_id == project.id,
        Deployment.status.in_(["queued", "building", "deploying"])
    ).first()
    if running:
        raise HTTPException(
            status_code=409,
            detail=f"A deployment is already in progress (id: {running.id}). Wait for it to finish."
        )

    deployment = Deployment(
        project_id=project.id,
        commit_sha=dep_in.commit_sha,
        commit_message=dep_in.commit_message or "Manual deployment",
        branch=dep_in.branch or project.github_branch,
        status="queued",
        build_log="",
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)

    build_and_deploy.delay(deployment.id)
    return deployment


@router.get("/deployments/{deployment_id}", response_model=DeploymentResponse)
async def get_deployment(
    deployment_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    dep = (
        db.query(Deployment)
        .join(Project)
        .filter(Deployment.id == deployment_id, Project.user_id == current_user.sub)
        .first()
    )
    if not dep:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return dep


@router.delete("/deployments/{deployment_id}")
async def stop_deployment(
    deployment_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    dep = (
        db.query(Deployment)
        .join(Project)
        .filter(Deployment.id == deployment_id, Project.user_id == current_user.sub)
        .first()
    )
    if not dep:
        raise HTTPException(status_code=404, detail="Deployment not found")
    if dep.container_id:
        try:
            stop_container(dep.container_id)
        except Exception:
            pass
    dep.status = "stopped"
    dep.finished_at = datetime.utcnow()
    db.commit()
    return {"message": "Deployment stopped"}


@router.post("/deployments/{deployment_id}/rollback", response_model=DeploymentResponse)
async def rollback_deployment(
    deployment_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Queue a new build using the same commit SHA as the specified deployment."""
    target = (
        db.query(Deployment)
        .join(Project)
        .filter(Deployment.id == deployment_id, Project.user_id == current_user.sub)
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="Deployment not found")

    # Stop any currently live deployment for this project
    current_live = db.query(Deployment).filter(
        Deployment.project_id == target.project_id,
        Deployment.status == "live"
    ).first()
    if current_live and current_live.container_id:
        try:
            stop_container(current_live.container_id)
        except Exception:
            pass
        current_live.status = "stopped"
        current_live.finished_at = datetime.utcnow()

    new_dep = Deployment(
        project_id=target.project_id,
        commit_sha=target.commit_sha,
        commit_message=f"Rollback to {(target.commit_sha or 'previous')[:7]}",
        branch=target.branch or "main",
        status="queued",
        build_log="",
    )
    db.add(new_dep)
    db.commit()
    db.refresh(new_dep)
    build_and_deploy.delay(new_dep.id)
    return new_dep


@router.get("/projects/{project_id}/deployments", response_model=List[DeploymentResponse])
async def list_project_deployments(
    project_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.sub
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    offset = (page - 1) * per_page
    q = db.query(Deployment).filter(Deployment.project_id == project_id)
    if status:
        q = q.filter(Deployment.status == status)
    return q.order_by(Deployment.created_at.desc()).offset(offset).limit(per_page).all()


@router.get("/deployments", response_model=List[DeploymentResponse])
async def list_all_deployments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, le=100),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """List all deployments for the authenticated user across all projects."""
    project_ids = [
        row[0] for row in
        db.query(Project.id).filter(Project.user_id == current_user.sub).all()
    ]
    if not project_ids:
        return []

    offset = (page - 1) * per_page
    q = (
        db.query(Deployment, Project.name)
        .join(Project, Deployment.project_id == Project.id)
        .filter(Deployment.project_id.in_(project_ids))
    )
    if status:
        q = q.filter(Deployment.status == status)
    rows = q.order_by(Deployment.created_at.desc()).offset(offset).limit(per_page).all()

    results = []
    for dep, proj_name in rows:
        dep.project_name = proj_name  # type: ignore[attr-defined]
        results.append(dep)
    return results


@router.get("/deployments/{deployment_id}/container-logs")
async def get_container_logs(
    deployment_id: str,
    tail: int = Query(200, le=1000),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Fetch live container stdout/stderr logs via Docker API."""
    dep = (
        db.query(Deployment)
        .join(Project)
        .filter(Deployment.id == deployment_id, Project.user_id == current_user.sub)
        .first()
    )
    if not dep:
        raise HTTPException(status_code=404, detail="Deployment not found")
    if not dep.container_id:
        raise HTTPException(status_code=404, detail="No container associated with this deployment")

    try:
        container = docker_client.containers.get(dep.container_id)
        logs = container.logs(tail=tail, timestamps=True).decode("utf-8", errors="replace")
        container_info = container.attrs
        status = container_info.get("State", {}).get("Status", "unknown")
        return {
            "container_id": dep.container_id[:12],
            "container_status": status,
            "logs": logs,
            "url": dep.url,
        }
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container no longer exists")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch logs: {e}")


# ─── WebSocket build log streaming ───────────────────────────────────────────

@router.websocket("/deployments/{deployment_id}/logs")
async def websocket_logs(
    websocket: WebSocket,
    deployment_id: str,
    token: Optional[str] = Query(None)
):
    """
    Stream build logs over WebSocket.
    Auth: token passed as ?token=<jwt> query param (browsers can't set custom WS headers).
    """
    await websocket.accept()

    # Validate token
    if not token:
        await websocket.send_text(json.dumps({"type": "error", "message": "Authentication required"}))
        await websocket.close(code=4001)
        return

    try:
        payload = verify_token(token)
        user_sub = payload.sub
    except Exception:
        await websocket.send_text(json.dumps({"type": "error", "message": "Invalid token"}))
        await websocket.close(code=4001)
        return

    # Verify deployment belongs to this user
    db_local = SessionLocal()
    try:
        dep = (
            db_local.query(Deployment)
            .join(Project)
            .filter(Deployment.id == deployment_id, Project.user_id == user_sub)
            .first()
        )
        if not dep:
            await websocket.send_text(json.dumps({"type": "error", "message": "Deployment not found"}))
            await websocket.close(code=4004)
            return

        # Send existing log history first (replaying past lines individually)
        if dep.build_log:
            for line in dep.build_log.strip().split("\n"):
                if line:
                    await websocket.send_text(json.dumps({"type": "log", "message": line}))

        # If already in terminal state, send final event and close
        if dep.status in ("live", "failed", "stopped"):
            await websocket.send_text(json.dumps({
                "type": "done" if dep.status == "live" else "error",
                "status": dep.status,
                "url": dep.url,
            }))
            await websocket.close()
            return
    finally:
        db_local.close()

    # Subscribe to Redis pubsub for live streaming
    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    pubsub = redis_client.pubsub()
    channel = f"logs:{deployment_id}"
    await pubsub.subscribe(channel)

    PING_INTERVAL = 25
    last_ping = asyncio.get_event_loop().time()

    try:
        while True:
            now = asyncio.get_event_loop().time()

            if now - last_ping > PING_INTERVAL:
                try:
                    await websocket.send_text(json.dumps({"type": "ping"}))
                    last_ping = now
                except Exception:
                    break

            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message:
                data = message.get("data", "")
                if isinstance(data, bytes):
                    data = data.decode("utf-8", errors="replace")
                if data:
                    await websocket.send_text(data)
                    try:
                        parsed = json.loads(data)
                        if parsed.get("type") in ("done", "error"):
                            break
                    except json.JSONDecodeError:
                        pass

            await asyncio.sleep(0.05)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except Exception:
            pass
    finally:
        try:
            await pubsub.unsubscribe(channel)
            await redis_client.aclose()
        except Exception:
            pass

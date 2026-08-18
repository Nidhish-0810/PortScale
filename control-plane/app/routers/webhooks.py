from fastapi import APIRouter, Header, Request, HTTPException, Depends
from sqlalchemy.orm import Session
import hmac
import hashlib
from app.db.database import get_db
from app.models.project import Project
from app.models.deployment import Deployment
from app.worker.tasks import build_and_deploy
from app.auth import get_current_user

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

@router.post("/github")
async def github_webhook(
    request: Request,
    x_hub_signature_256: str = Header(None),
    x_github_event: str = Header(None),
    db: Session = Depends(get_db)
):
    payload_body = await request.body()
    payload = await request.json()
    
    repo_name = payload.get("repository", {}).get("full_name")
    if not repo_name:
        return {"msg": "No repo info"}

    project = db.query(Project).filter(Project.github_repo_name == repo_name).first()
    if not project:
        return {"msg": "Project not found for this repo"}

    if project.webhook_secret:
        if not x_hub_signature_256:
            raise HTTPException(status_code=400, detail="Missing signature")
            
        mac = hmac.new(project.webhook_secret.encode('utf-8'), msg=payload_body, digestmod=hashlib.sha256)
        expected_signature = "sha256=" + mac.hexdigest()
        if not hmac.compare_digest(expected_signature, x_hub_signature_256):
            raise HTTPException(status_code=403, detail="Invalid signature")

    if x_github_event == "push":
        branch = payload.get("ref", "").replace("refs/heads/", "")
        if branch == project.github_branch:
            commit_sha = payload.get("after")
            head_commit = payload.get("head_commit", {})
            commit_message = head_commit.get("message", "Auto deployed from GitHub webhook")
            
            deployment = Deployment(
                project_id=project.id,
                commit_sha=commit_sha,
                commit_message=commit_message,
                branch=branch,
                status="queued",
                build_log="",
            )
            db.add(deployment)
            db.commit()
            db.refresh(deployment)
            
            build_and_deploy.delay(deployment.id)
            return {"msg": "Deployment queued", "deployment_id": deployment.id}
            
    return {"msg": "Ignored event"}

@router.get("/{project_id}/secret")
async def get_webhook_secret(
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
        
    return {"webhook_secret": project.webhook_secret}

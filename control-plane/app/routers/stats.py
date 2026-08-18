from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models.project import Project
from app.models.deployment import Deployment
from app.auth import get_current_user

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/")
async def global_stats(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user.sub
    project_ids = [p.id for p in db.query(Project.id).filter(Project.user_id == user_id).all()]
    
    total_projects = len(project_ids)
    if not project_ids:
        return {"total_projects": 0, "total_deployments": 0, "live_deployments": 0,
                "failed_deployments": 0, "avg_build_time_seconds": 0, "success_rate_percent": 0}

    total_deps = db.query(func.count(Deployment.id)).filter(Deployment.project_id.in_(project_ids)).scalar()
    live_deps = db.query(func.count(Deployment.id)).filter(
        Deployment.project_id.in_(project_ids), Deployment.status == "live"
    ).scalar()
    failed_deps = db.query(func.count(Deployment.id)).filter(
        Deployment.project_id.in_(project_ids), Deployment.status == "failed"
    ).scalar()

    # Compute avg build time for completed deployments
    completed = db.query(Deployment).filter(
        Deployment.project_id.in_(project_ids),
        Deployment.status == "live",
        Deployment.started_at.isnot(None),
        Deployment.finished_at.isnot(None)
    ).all()
    if completed:
        durations = [(d.finished_at - d.started_at).total_seconds() for d in completed]
        avg_build = round(sum(durations) / len(durations))
    else:
        avg_build = 0

    success_rate = round(((total_deps - failed_deps) / total_deps * 100) if total_deps > 0 else 100, 1)

    return {
        "total_projects": total_projects,
        "total_deployments": total_deps,
        "live_deployments": live_deps,
        "failed_deployments": failed_deps,
        "avg_build_time_seconds": avg_build,
        "success_rate_percent": success_rate
    }

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from app.db.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    github_repo_url = Column(String, nullable=False)
    github_repo_name = Column(String, nullable=False)
    github_branch = Column(String, default="main")
    webhook_secret = Column(String, nullable=True)
    user_id = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    deployments = relationship("Deployment", back_populates="project", cascade="all, delete-orphan")
    env_vars = relationship("EnvVar", back_populates="project", cascade="all, delete-orphan")

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from app.db.database import Base


class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)

    # Status lifecycle: queued → building → deploying → live | failed | stopped
    status = Column(String, default="queued", nullable=False, index=True)

    # Git info
    commit_sha = Column(String, nullable=True)
    commit_message = Column(Text, nullable=True)
    branch = Column(String, nullable=True)

    # Runtime info
    container_id = Column(String, nullable=True)
    container_port = Column(Integer, nullable=True)
    url = Column(String, nullable=True)

    # Build output
    build_log = Column(Text, default="", nullable=False)

    # Timing
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)   # When Celery task begins building
    finished_at = Column(DateTime, nullable=True)  # When deployment reaches live/failed

    project = relationship("Project", back_populates="deployments")

    @property
    def build_duration_seconds(self) -> int | None:
        if self.started_at and self.finished_at:
            return int((self.finished_at - self.started_at).total_seconds())
        return None

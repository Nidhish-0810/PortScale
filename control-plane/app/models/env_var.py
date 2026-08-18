from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.database import Base


class EnvVar(Base):
    __tablename__ = "env_vars"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    key = Column(String, nullable=False)
    value = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="env_vars")

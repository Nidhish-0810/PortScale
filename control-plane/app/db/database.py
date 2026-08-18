from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    pool_pre_ping=True,  # Reconnect on stale connections
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. MUST import models before calling create_all."""
    # These imports register the models with Base.metadata
    from app.models import project, deployment, env_var  # noqa: F401
    Base.metadata.create_all(bind=engine)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from app.db.database import init_db
from app.routers import auth, projects, deployments, webhooks, github, stats
from app.config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    logger.info("Initializing database...")
    init_db()
    logger.info("Database ready.")
    yield
    logger.info("Shutting down PortScale control plane.")


app = FastAPI(
    title="PortScale PaaS — Control Plane",
    description="API for the PortScale self-hosted PaaS platform.",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow the Next.js dashboard and any localhost origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": type(exc).__name__},
    )

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(deployments.router)
app.include_router(webhooks.router)
app.include_router(github.router)
app.include_router(stats.router)

# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
def health_check():
    return {"status": "ok", "version": "2.0.0"}

@app.get("/", tags=["system"])
def root():
    return {"message": "PortScale Control Plane", "docs": "/docs"}

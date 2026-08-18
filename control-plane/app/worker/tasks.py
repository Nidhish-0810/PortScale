import os
import json
import redis
from datetime import datetime
from app.services.build_queue import celery_app
from app.db.database import SessionLocal
from app.models.deployment import Deployment
from app.models.project import Project
from app.models.env_var import EnvVar
from app.services.docker_service import clone_repo, build_image, run_container, cleanup_repo, cleanup_old_images
from app.config import settings

r = redis.from_url(settings.REDIS_URL)

# ─── Better buildpack Dockerfiles ─────────────────────────────────────────────

NODEJS_DOCKERFILE = """\
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --production
COPY . .
EXPOSE $PORT
CMD ["sh", "-c", "node $(cat package.json | grep -o '\"main\":\\s*\"[^\"]*\"' | cut -d'\"' -f4 || echo index.js)"]
"""

NODEJS_WITH_BUILD_DOCKERFILE = """\
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build 2>/dev/null || true

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app .
EXPOSE $PORT
CMD ["sh", "-c", "node $(node -e \"try{const p=require('./package.json');console.log(p.main||'index.js')}catch(e){console.log('index.js')}\" 2>/dev/null) || npm start"]
"""

PYTHON_DOCKERFILE = """\
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE $PORT
CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} 2>/dev/null || python -m flask run --host=0.0.0.0 --port=${PORT:-8000} 2>/dev/null || python app.py || python main.py || gunicorn -w 2 -b 0.0.0.0:${PORT:-8000} main:app"]
"""

GO_DOCKERFILE = """\
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download 2>/dev/null || true
COPY . .
RUN CGO_ENABLED=0 go build -o portscale-app .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/portscale-app .
EXPOSE $PORT
CMD ["./portscale-app"]
"""

RUST_DOCKERFILE = """\
FROM rust:1.77-slim AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/* ./
EXPOSE $PORT
CMD ["/app/app"]
"""


def detect_and_generate_dockerfile(repo_dir: str, log_fn) -> str:
    """Detect stack and generate optimised Dockerfile. Returns path to Dockerfile."""
    dockerfile_path = os.path.join(repo_dir, "Dockerfile")
    if os.path.exists(dockerfile_path):
        log_fn("✓ Dockerfile found — skipping auto-detection")
        return dockerfile_path

    # Node.js
    if os.path.exists(os.path.join(repo_dir, "package.json")):
        has_build = False
        try:
            with open(os.path.join(repo_dir, "package.json")) as f:
                pkg = json.load(f)
                has_build = "build" in pkg.get("scripts", {})
        except Exception:
            pass
        log_fn("✓ Detected Node.js project")
        tmpl = NODEJS_WITH_BUILD_DOCKERFILE if has_build else NODEJS_DOCKERFILE
        with open(dockerfile_path, "w") as f:
            f.write(tmpl)
        return dockerfile_path

    # Python
    if os.path.exists(os.path.join(repo_dir, "requirements.txt")):
        log_fn("✓ Detected Python project")
        with open(dockerfile_path, "w") as f:
            f.write(PYTHON_DOCKERFILE)
        return dockerfile_path

    # Go
    if os.path.exists(os.path.join(repo_dir, "go.mod")):
        log_fn("✓ Detected Go project")
        with open(dockerfile_path, "w") as f:
            f.write(GO_DOCKERFILE)
        return dockerfile_path

    # Rust
    if os.path.exists(os.path.join(repo_dir, "Cargo.toml")):
        log_fn("✓ Detected Rust project")
        with open(dockerfile_path, "w") as f:
            f.write(RUST_DOCKERFILE)
        return dockerfile_path

    # Static HTML
    if os.path.exists(os.path.join(repo_dir, "index.html")):
        log_fn("✓ Detected static HTML project — using nginx")
        with open(dockerfile_path, "w") as f:
            f.write("FROM nginx:alpine\nCOPY . /usr/share/nginx/html\nEXPOSE 80\n")
        return dockerfile_path

    raise Exception(
        "Could not detect project type. "
        "Supported: Node.js (package.json), Python (requirements.txt), "
        "Go (go.mod), Rust (Cargo.toml), Static HTML (index.html), or provide your own Dockerfile."
    )


def detect_app_port(repo_dir: str) -> int:
    """Return the default internal port for the detected stack."""
    if os.path.exists(os.path.join(repo_dir, "package.json")):
        return 3000   # Node.js convention
    if os.path.exists(os.path.join(repo_dir, "index.html")):
        return 80     # nginx default
    # Python, Go, Rust — use 8000 as the conventional default
    return 8000


@celery_app.task(name="app.worker.tasks.build_and_deploy", bind=True, max_retries=0)
def build_and_deploy(self, deployment_id: str):
    db = SessionLocal()
    deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
    if not deployment:
        db.close()
        return

    project = db.query(Project).filter(Project.id == deployment.project_id).first()
    channel = f"logs:{deployment_id}"
    repo_dir = None

    def log(msg: str):
        timestamp = datetime.utcnow().strftime("%H:%M:%S")
        line = f"[{timestamp}] {msg}"
        deployment.build_log = (deployment.build_log or "") + line + "\n"
        db.commit()
        r.publish(channel, json.dumps({"type": "log", "message": line}))

    try:
        deployment.status = "building"
        deployment.started_at = datetime.utcnow()
        db.commit()
        r.publish(channel, json.dumps({"type": "status", "status": "building"}))

        log("=" * 60)
        log(f"Build started for project: {project.name}")
        log(f"Repository: {project.github_repo_url}")
        log(f"Branch: {deployment.branch or project.github_branch}")
        log("=" * 60)

        repo_dir = f"/tmp/repos/{deployment_id}"

        # Clone with token if available (for private repos)
        log(f">> Cloning repository...")
        try:
            clone_repo(project.github_repo_url, repo_dir, branch=deployment.branch or project.github_branch)
            log("✓ Repository cloned successfully")
        except Exception as e:
            raise Exception(f"Failed to clone repo: {e}")

        # Detect stack & generate Dockerfile if needed
        log(">> Detecting project type...")
        detect_and_generate_dockerfile(repo_dir, log)

        # Clean up stale images
        cleanup_old_images(project.slug)

        image_tag = f"portscale/{project.slug}:{deployment_id[:8]}"
        log(f">> Building Docker image...")
        log(f"   Tag: {image_tag}")
        build_image(repo_dir, image_tag, logger=log)
        log("✓ Image built successfully")

        # Clean up stale images AFTER new one is built (avoid availability gap)
        cleanup_old_images(project.slug, keep_tag=image_tag)

        # Transition to deploying
        deployment.status = "deploying"
        db.commit()
        r.publish(channel, json.dumps({"type": "status", "status": "deploying"}))

        log(f">> Detecting application port...")
        app_port = detect_app_port(repo_dir)
        log(f"   Port: {app_port}")

        container_name = f"portscale-{project.slug}"  # stable name = only one live at a time
        domain = f"{project.slug}.localhost"

        # Fetch env vars
        env_vars = {ev.key: ev.value for ev in db.query(EnvVar).filter(EnvVar.project_id == project.id).all()}
        if env_vars:
            log(f">> Injecting {len(env_vars)} environment variable(s)...")

        log(f">> Starting container...")
        log(f"   Name: {container_name}")
        log(f"   Domain: {domain}")
        container_id = run_container(image_tag, container_name, domain, app_port=app_port, env_vars=env_vars)
        log(f"✓ Container started (ID: {container_id[:12]})")

        deployment.container_id = container_id
        deployment.url = f"http://{domain}"
        deployment.status = "live"
        deployment.finished_at = datetime.utcnow()
        db.commit()

        duration = int((deployment.finished_at - deployment.started_at).total_seconds())
        log("=" * 60)
        log(f"✓ Deployment successful in {duration}s")
        log(f"  Live at: {deployment.url}")
        log("=" * 60)

        r.publish(channel, json.dumps({"type": "done", "url": deployment.url, "status": "live"}))

    except Exception as e:
        deployment.status = "failed"
        deployment.finished_at = datetime.utcnow()
        db.commit()
        log(f"✗ Build failed: {str(e)}")
        r.publish(channel, json.dumps({"type": "error", "message": str(e), "status": "failed"}))
    finally:
        if repo_dir:
            cleanup_repo(repo_dir)
        db.close()

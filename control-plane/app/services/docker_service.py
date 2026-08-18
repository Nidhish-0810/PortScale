import os
import shutil
import docker
import socket
from git import Repo
import logging

client = docker.from_env()

def clone_repo(repo_url: str, dest_dir: str, branch: str = "main"):
    if os.path.exists(dest_dir):
        shutil.rmtree(dest_dir)
    Repo.clone_from(repo_url, dest_dir, branch=branch)

def build_image(path: str, tag: str, logger=None):
    for line in client.api.build(path=path, tag=tag, rm=True, decode=True):
        if 'error' in line:
            raise Exception(f"Docker build error: {line['error']}")
        if 'stream' in line:
            log_str = line['stream'].strip()
            if log_str and logger:
                logger(log_str)

def run_container(image_tag: str, container_name: str, domain: str, network="portscale-net", app_port: int = 3000, env_vars: dict = None):
    # Stop and remove if exists
    try:
        old_container = client.containers.get(container_name)
        old_container.stop()
        old_container.remove()
    except docker.errors.NotFound:
        pass

    labels = {
        "traefik.enable": "true",
        f"traefik.http.routers.{container_name}.rule": f"Host(`{domain}`)",
        f"traefik.http.routers.{container_name}.entrypoints": "web",
        f"traefik.http.services.{container_name}.loadbalancer.server.port": str(app_port)
    }

    # Merge PORT with any user-supplied env vars
    container_env = {"PORT": str(app_port)}
    if env_vars:
        container_env.update(env_vars)

    container = client.containers.run(
        image_tag,
        name=container_name,
        detach=True,
        network=network,
        labels=labels,
        environment=container_env
    )
    return container.id

def stop_container(container_id: str):
    try:
        container = client.containers.get(container_id)
        container.stop()
        container.remove()
    except docker.errors.NotFound:
        pass

def cleanup_old_images(project_slug: str, keep_tag: str = ""):
    """Remove all images for this project except the one with keep_tag."""
    try:
        images = client.images.list(name=f"portscale/{project_slug}")
        for img in images:
            # Skip the image we just built
            if keep_tag and keep_tag in (img.tags or []):
                continue
            try:
                client.images.remove(img.id, force=True)
            except Exception:
                pass
    except Exception:
        pass

def cleanup_repo(path: str):
    if os.path.exists(path):
        shutil.rmtree(path)

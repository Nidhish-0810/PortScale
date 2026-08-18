import os
import yaml
from app.config import settings

def create_route(container_name: str, domain: str, port: int = 80):
    config = {
        "http": {
            "routers": {
                container_name: {
                    "rule": f"Host(`{domain}`)",
                    "service": container_name,
                    "entryPoints": ["web"]
                }
            },
            "services": {
                container_name: {
                    "loadBalancer": {
                        "servers": [{"url": f"http://{container_name}:{port}"}]
                    }
                }
            }
        }
    }
    
    filepath = os.path.join(settings.DYNAMIC_CONFIG_DIR, f"{container_name}.yml")
    with open(filepath, "w") as f:
        yaml.dump(config, f)

def remove_route(container_name: str):
    filepath = os.path.join(settings.DYNAMIC_CONFIG_DIR, f"{container_name}.yml")
    if os.path.exists(filepath):
        os.remove(filepath)

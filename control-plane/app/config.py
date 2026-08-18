from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./portscale.db"
    REDIS_URL: str = "redis://localhost:6379"
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_WEBHOOK_SECRET: str = "secret"
    JWT_SECRET: str = "changeme"
    FRONTEND_URL: str = "http://localhost:3000"
    CONTROL_PLANE_URL: str = "http://localhost:8000"  # Public URL of this API (for webhook callbacks)
    DOCKER_BASE_URL: str = "unix://var/run/docker.sock"
    DYNAMIC_CONFIG_DIR: str = "/dynamic"
    
    model_config = {"env_file": ".env", "extra": "ignore"}

settings = Settings()

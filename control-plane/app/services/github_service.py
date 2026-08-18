import httpx
import logging

logger = logging.getLogger(__name__)


async def get_user_repos(access_token: str, page: int = 1, per_page: int = 30):
    """Fetch repositories for the authenticated user."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.github.com/user/repos",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            },
            params={"page": page, "per_page": per_page, "sort": "updated", "affiliation": "owner,collaborator"}
        )
        response.raise_for_status()
        return response.json()


async def get_repo_contents(repo_name: str, access_token: str, path: str = ""):
    """Fetch file listing for a repository path."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.github.com/repos/{repo_name}/contents/{path}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            }
        )
        response.raise_for_status()
        return response.json()


async def check_dockerfile_exists(repo_name: str, access_token: str) -> bool:
    """Check whether the repository has a Dockerfile at the root."""
    try:
        contents = await get_repo_contents(repo_name, access_token)
        return any(f.get("name") == "Dockerfile" for f in contents if isinstance(f, dict))
    except Exception:
        return False


async def install_webhook(
    access_token: str,
    repo_name: str,
    webhook_url: str,
    secret: str
) -> dict:
    """Install a push webhook on a GitHub repository.
    
    Args:
        access_token: GitHub OAuth access token
        repo_name: Full repo name e.g. 'owner/repo'
        webhook_url: Public URL for the webhook endpoint
        secret: HMAC secret for signature verification
    """
    payload = {
        "name": "web",
        "active": True,
        "events": ["push"],
        "config": {
            "url": webhook_url,
            "content_type": "json",
            "insecure_ssl": "0",
            "secret": secret
        }
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://api.github.com/repos/{repo_name}/hooks",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            },
            json=payload
        )
        if response.status_code == 422:
            logger.warning(f"Webhook may already exist for {repo_name}: {response.text}")
            return {"already_exists": True}
        response.raise_for_status()
        return response.json()


async def get_repo_branches(repo_name: str, access_token: str) -> list:
    """Fetch list of branches for a repository."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.github.com/repos/{repo_name}/branches",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json"
            },
            params={"per_page": 50}
        )
        response.raise_for_status()
        return [b["name"] for b in response.json()]

from fastapi import APIRouter, Depends, HTTPException, Query
import httpx
import redis
import json
from app.auth import get_current_user
from app.config import settings

router = APIRouter(prefix="/github", tags=["github"])

def get_redis():
    return redis.from_url(settings.REDIS_URL, decode_responses=True)

def _get_access_token(user_sub: str) -> str:
    r = get_redis()
    raw = r.get(f"user:{user_sub}")
    r.close()
    if not raw:
        raise HTTPException(status_code=401, detail="User session expired. Please log in again.")
    token = json.loads(raw).get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="No GitHub token found")
    return token

def _format_repo(r: dict) -> dict:
    return {
        "id": r["id"],
        "name": r["name"],
        "full_name": r["full_name"],
        "private": r["private"],
        "html_url": r["html_url"],
        "default_branch": r.get("default_branch", "main"),
        "description": r.get("description") or "",
        "language": r.get("language") or "Unknown",
        "updated_at": r.get("updated_at", ""),
    }

@router.get("/repos")
async def get_github_repos(
    page: int = Query(1, ge=1),
    per_page: int = Query(30, le=100),
    current_user=Depends(get_current_user)
):
    access_token = _get_access_token(current_user.sub)
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            "https://api.github.com/user/repos",
            headers={"Authorization": f"token {access_token}", "Accept": "application/vnd.github.v3+json"},
            params={"page": page, "per_page": per_page, "sort": "updated", "affiliation": "owner,collaborator"}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"GitHub API error: {resp.text[:200]}")
    return [_format_repo(r) for r in resp.json()]


@router.get("/repos/search")
async def search_github_repos(
    q: str = Query("", min_length=0),
    current_user=Depends(get_current_user)
):
    """Search user's repos by name using GitHub Search API."""
    access_token = _get_access_token(current_user.sub)

    # Build search query scoped to the authenticated user
    query = f"{q} user:{current_user.username}" if q else f"user:{current_user.username}"

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            "https://api.github.com/search/repositories",
            headers={"Authorization": f"token {access_token}", "Accept": "application/vnd.github.v3+json"},
            params={"q": query, "sort": "updated", "per_page": 20}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="GitHub search error")
        data = resp.json()

    return [_format_repo(r) for r in data.get("items", [])]


@router.get("/repos/{owner}/{repo}/branches")
async def get_repo_branches(
    owner: str,
    repo: str,
    current_user=Depends(get_current_user)
):
    """List branches for a specific repository."""
    access_token = _get_access_token(current_user.sub)
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/branches",
            headers={"Authorization": f"token {access_token}"},
            params={"per_page": 50}
        )
        if resp.status_code != 200:
            return []
    return [{"name": b["name"], "protected": b.get("protected", False)} for b in resp.json()]

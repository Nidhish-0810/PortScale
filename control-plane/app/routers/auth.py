from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
import httpx
import redis
import json
from app.config import settings
from app.auth import create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

def get_redis():
    return redis.from_url(settings.REDIS_URL, decode_responses=True)

@router.get("/github")
async def github_login():
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&scope=repo,user,read:user"
    )
    return RedirectResponse(github_auth_url)

@router.get("/github/callback")
async def github_callback(code: str):
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code
            },
            headers={"Accept": "application/json"}
        )
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="GitHub OAuth failed")

        user_response = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github.v3+json"}
        )
        user_data = user_response.json()

    user_id = str(user_data["id"])
    user_cache = {
        "user_id": user_id,
        "login": user_data["login"],
        "avatar_url": user_data.get("avatar_url", ""),
        "name": user_data.get("name") or user_data["login"],
        "email": user_data.get("email") or "",
        "access_token": access_token
    }
    r = get_redis()
    r.setex(f"user:{user_id}", 86400 * 7, json.dumps(user_cache))
    r.close()

    jwt_token = create_access_token(data={"sub": user_id, "username": user_data["login"]})
    return RedirectResponse(f"{settings.FRONTEND_URL}/login?token={jwt_token}")

@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    r = get_redis()
    raw = r.get(f"user:{current_user.sub}")
    r.close()
    if raw:
        data = json.loads(raw)
        return {
            "user_id": data["user_id"],
            "login": data["login"],
            "name": data["name"],
            "email": data["email"],
            "avatar_url": data["avatar_url"]
        }
    return {"user_id": current_user.sub, "login": current_user.username}

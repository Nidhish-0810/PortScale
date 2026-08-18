from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings
from pydantic import BaseModel

ALGORITHM = "HS256"
security = HTTPBearer(auto_error=True)


class TokenData(BaseModel):
    username: str
    sub: str


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)


def verify_token(token: str) -> TokenData:
    """
    Decode and validate a JWT. Raises ValueError on failure (not HTTPException)
    so it can be used in both HTTP and WebSocket contexts.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        username: str = payload.get("username", "")
        sub: str = payload.get("sub", "")
        if not username or not sub:
            raise ValueError("Token missing required claims")
        return TokenData(username=username, sub=sub)
    except JWTError as e:
        raise ValueError(f"Invalid token: {e}")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    try:
        return verify_token(credentials.credentials)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

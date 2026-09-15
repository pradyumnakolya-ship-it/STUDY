"""
Authentication Router
Endpoints:
- POST /auth/signup
- POST /auth/login
- GET  /auth/me
- GET  /auth/check-username?username=...
"""

from fastapi import APIRouter, HTTPException, Depends, Header, status
from typing import Optional

from models.user import (
    UserRegisterRequest,
    UserLoginRequest,
    UserProfile,
    AuthTokenResponse,
    UsernameAvailability
)
from services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

async def get_current_user(authorization: Optional[str] = Header(None)) -> UserProfile:
    """Dependency that authenticates the user via Bearer JWT token."""
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")
    
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header format")
    
    token = parts[1]
    payload = auth_service.decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    
    username = payload["sub"]
    user_data = await auth_service.get_user_by_username(username)
    if not user_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    return UserProfile(
        id=user_data["id"],
        email=user_data["email"],
        username=user_data["username"],
        avatar=user_data.get("avatar"),
        created_at=user_data["created_at"],
        total_xp=user_data.get("total_xp", 0)
    )

@router.get("/check-username", response_model=UsernameAvailability)
async def check_username(username: str):
    """Check if a username is available in real time."""
    clean = username.strip().lower()
    if len(clean) < 3:
        return UsernameAvailability(username=username, available=False, message="Username must be at least 3 characters.")
    
    existing = await auth_service.get_user_by_username(clean)
    if existing:
        return UsernameAvailability(username=username, available=False, message="This username is already taken.")
    
    return UsernameAvailability(username=username, available=True, message="Username is available!")

@router.post("/signup", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(req: UserRegisterRequest):
    """Register a new user with unique username and email."""
    # Check existing email
    existing_email = await auth_service.get_user_by_email(req.email)
    if existing_email:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    
    # Check existing username
    existing_user = await auth_service.get_user_by_username(req.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="This username is already taken.")
    
    hashed_pw = auth_service.hash_password(req.password)
    user_record = await auth_service.create_user(req.email, req.username, hashed_pw)

    # Issue token
    token = auth_service.create_access_token({"sub": user_record["username"], "email": user_record["email"]})
    
    user_profile = UserProfile(
        id=user_record["id"],
        email=user_record["email"],
        username=user_record["username"],
        avatar=user_record.get("avatar"),
        created_at=user_record["created_at"],
        total_xp=user_record.get("total_xp", 0)
    )
    return AuthTokenResponse(access_token=token, token_type="bearer", user=user_profile)

@router.post("/login", response_model=AuthTokenResponse)
async def login(req: UserLoginRequest):
    """Log in with email or username + password."""
    target = req.email_or_username.strip()
    user_record = None
    if "@" in target:
        user_record = await auth_service.get_user_by_email(target)
    else:
        user_record = await auth_service.get_user_by_username(target)
    
    if not user_record or not auth_service.verify_password(req.password, user_record["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect email/username or password.")
    
    token = auth_service.create_access_token({"sub": user_record["username"], "email": user_record["email"]})
    user_profile = UserProfile(
        id=user_record["id"],
        email=user_record["email"],
        username=user_record["username"],
        avatar=user_record.get("avatar"),
        created_at=user_record["created_at"],
        total_xp=user_record.get("total_xp", 0)
    )
    return AuthTokenResponse(access_token=token, token_type="bearer", user=user_profile)

@router.get("/me", response_model=UserProfile)
async def get_me(current_user: UserProfile = Depends(get_current_user)):
    """Return the authenticated user profile."""
    return current_user

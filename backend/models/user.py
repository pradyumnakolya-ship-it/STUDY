"""
User Models for Authentication and Profile
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class UserRegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=30, pattern="^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=6)

class UserLoginRequest(BaseModel):
    email_or_username: Optional[str] = None
    email: Optional[str] = None
    password: str

class UserProfile(BaseModel):
    id: str
    email: str
    username: str
    avatar: Optional[str] = None
    created_at: datetime
    total_xp: int = 0

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

class UsernameAvailability(BaseModel):
    username: str
    available: bool
    message: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

class MessageResponse(BaseModel):
    message: str
    reset_link: str = None

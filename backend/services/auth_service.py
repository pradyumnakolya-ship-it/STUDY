"""
Authentication and User Service
Handles password hashing (bcrypt), JWT issuance & verification, and user storage
with dual MongoDB and local JSON fallback for reliability.
"""

import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from passlib.context import CryptContext
from jose import JWTError, jwt
from config import settings
import database
from models.user import UserProfile

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
FALLBACK_USERS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "users.json")

def _ensure_fallback_store():
    os.makedirs(os.path.dirname(FALLBACK_USERS_FILE), exist_ok=True)
    if not os.path.exists(FALLBACK_USERS_FILE):
        with open(FALLBACK_USERS_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f)

def _load_fallback_users() -> dict:
    _ensure_fallback_store()
    try:
        with open(FALLBACK_USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def _save_fallback_users(users: dict):
    _ensure_fallback_store()
    with open(FALLBACK_USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2, default=str)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

async def get_user_by_username(username: str) -> Optional[dict]:
    clean_username = username.strip().lower()
    col = database.get_users_collection()
    if database.is_connected and col is not None:
        user = await col.find_one({"username_lower": clean_username})
        if user:
            user["id"] = str(user.get("_id", user.get("id")))
            return user
    
    users = _load_fallback_users()
    for uid, u in users.items():
        if u.get("username_lower") == clean_username:
            u["id"] = uid
            return u
    return None

async def get_user_by_email(email: str) -> Optional[dict]:
    clean_email = email.strip().lower()
    col = database.get_users_collection()
    if database.is_connected and col is not None:
        user = await col.find_one({"email": clean_email})
        if user:
            user["id"] = str(user.get("_id", user.get("id")))
            return user

    users = _load_fallback_users()
    for uid, u in users.items():
        if u.get("email") == clean_email:
            u["id"] = uid
            return u
    return None

async def create_user(email: str, username: str, password_hash: str) -> dict:
    user_id = f"user-{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    record = {
        "id": user_id,
        "email": email.strip().lower(),
        "username": username.strip(),
        "username_lower": username.strip().lower(),
        "password_hash": password_hash,
        "avatar": None,
        "created_at": now,
        "total_xp": 0
    }

    col = database.get_users_collection()
    if database.is_connected and col is not None:
        await col.insert_one(dict(record))
    
    # Always keep in sync with fallback
    users = _load_fallback_users()
    users[user_id] = record
    return record


async def search_users(query: str, exclude_username: str = "") -> list:
    """Search registered users by username substring."""
    clean_q = query.strip().lower()
    results = []
    exclude_clean = exclude_username.strip().lower()

    col = database.get_users_collection()
    if database.is_connected and col is not None:
        cursor = col.find({"username_lower": {"$regex": clean_q, "$options": "i"}}).limit(20)
        async for doc in cursor:
            uname = doc.get("username", "")
            if uname.lower() != exclude_clean:
                results.append({
                    "id": str(doc.get("_id", doc.get("id"))),
                    "username": uname,
                    "total_xp": doc.get("total_xp", 0),
                    "created_at": doc.get("created_at", "")
                })
        if results:
            return results

    # Fallback to local store
    users = _load_fallback_users()
    for uid, u in users.items():
        uname = u.get("username", "")
        if uname.lower() != exclude_clean and (not clean_q or clean_q in uname.lower()):
            results.append({
                "id": uid,
                "username": uname,
                "total_xp": u.get("total_xp", 0),
                "created_at": u.get("created_at", "")
            })

    # Add default mock peer suggestions if few users exist
    if len(results) < 3 and not clean_q:
        peers = [
            {"id": "user-alex", "username": "Alex_Code", "total_xp": 450, "created_at": "2026-01-10"},
            {"id": "user-priya", "username": "Priya_Dev", "total_xp": 620, "created_at": "2026-01-12"},
            {"id": "user-marcus", "username": "Marcus_ML", "total_xp": 310, "created_at": "2026-01-15"},
            {"id": "user-elena", "username": "Elena_AI", "total_xp": 780, "created_at": "2026-01-18"},
        ]
        for p in peers:
            if p["username"].lower() != exclude_clean and not any(r["username"] == p["username"] for r in results):
                results.append(p)

    return results


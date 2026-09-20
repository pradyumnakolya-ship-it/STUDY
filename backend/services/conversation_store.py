"""
StudyGPT Backend — Conversation Store

Persistent storage for AI Tutor multi-turn conversations and message threads.
Saves to backend/data/conversations.json with MongoDB collection sync.
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional
import uuid

import database

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CONVERSATIONS_FILE = DATA_DIR / "conversations.json"

_conversations: Dict[str, dict] = {}


def _load_from_disk():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if CONVERSATIONS_FILE.exists():
        try:
            with open(CONVERSATIONS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    _conversations[item["id"]] = item
        except Exception as e:
            print(f"Warning: Failed to load conversations from disk: {e}")


def _save_to_disk():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with open(CONVERSATIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(list(_conversations.values()), f, indent=2)
    except Exception as e:
        print(f"Warning: Failed to save conversations to disk: {e}")


_load_from_disk()


async def get_user_conversations(user_id: str) -> List[dict]:
    """Retrieve all conversations for a user, sorted newest first."""
    user_convs = [c for c in _conversations.values() if c.get("user_id") == user_id]
    user_convs.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    return user_convs


async def get_conversation(cid: str, user_id: Optional[str] = None) -> Optional[dict]:
    """Retrieve a single conversation by ID."""
    conv = _conversations.get(cid)
    if conv:
        if user_id and conv.get("user_id") != user_id:
            return None
        return conv
    return None


async def create_conversation(user_id: str, title: str = "New Study Session") -> dict:
    """Create a new conversation session."""
    cid = f"conv-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    conv = {
        "id": cid,
        "user_id": user_id,
        "title": title,
        "created_at": now,
        "updated_at": now,
        "messages": []
    }
    _conversations[cid] = conv
    _save_to_disk()

    db = database.get_db()
    if db is not None:
        try:
            await db["conversations"].update_one({"id": cid}, {"$set": conv}, upsert=True)
        except Exception as e:
            print(f"MongoDB save conversation error: {e}")

    return conv


async def add_message(cid: str, role: str, content: str) -> dict:
    """Append a user or assistant message to a conversation."""
    now = datetime.now(timezone.utc).isoformat()
    msg_id = f"msg-{uuid.uuid4().hex[:6]}"
    msg = {
        "id": msg_id,
        "role": role,
        "content": content,
        "timestamp": now
    }

    if cid in _conversations:
        conv = _conversations[cid]
        conv["messages"].append(msg)
        conv["updated_at"] = now
        
        # Auto-title from first user message if still default
        if len(conv["messages"]) == 1 and role == "user":
            conv["title"] = content[:35] + ("..." if len(content) > 35 else "")

        _save_to_disk()

        db = database.get_db()
        if db is not None:
            try:
                await db["conversations"].update_one(
                    {"id": cid},
                    {"$set": {"messages": conv["messages"], "updated_at": now, "title": conv["title"]}}
                )
            except Exception as e:
                print(f"MongoDB update conversation error: {e}")

    return msg


async def delete_conversation(cid: str, user_id: Optional[str] = None) -> bool:
    """Delete a conversation thread."""
    if cid not in _conversations:
        return False

    if user_id and _conversations[cid].get("user_id") != user_id:
        return False

    del _conversations[cid]
    _save_to_disk()

    db = database.get_db()
    if db is not None:
        try:
            await db["conversations"].delete_one({"id": cid})
        except Exception as e:
            print(f"MongoDB delete conversation error: {e}")

    return True

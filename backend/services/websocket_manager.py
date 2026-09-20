"""
StudyGPT Backend — WebSocket Connection Manager

Manages real-time WebSockets for 1:1 direct messaging, typing indicators,
online status presence, and message persistence.
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Set
import uuid

from fastapi import WebSocket
import database

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MESSAGES_FILE = DATA_DIR / "messages.json"

# In-memory message store: {connection_id: [message_dict, ...]}
_persisted_messages: Dict[str, List[dict]] = {}


def _load_messages_disk():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if MESSAGES_FILE.exists():
        try:
            with open(MESSAGES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                for cid, msgs in data.items():
                    _persisted_messages[cid] = msgs
        except Exception as e:
            print(f"Warning: Failed to load messages from disk: {e}")


def _save_messages_disk():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with open(MESSAGES_FILE, "w", encoding="utf-8") as f:
            json.dump(_persisted_messages, f, indent=2)
    except Exception as e:
        print(f"Warning: Failed to save messages to disk: {e}")


_load_messages_disk()


class ConnectionManager:
    """Manages active WebSockets and dispatches events."""

    def __init__(self):
        # connection_id -> set of active WebSockets
        self.rooms: Dict[str, Set[WebSocket]] = {}
        # username -> set of active WebSockets
        self.user_sockets: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, connection_id: str, username: str):
        await websocket.accept()

        if connection_id not in self.rooms:
            self.rooms[connection_id] = set()
        self.rooms[connection_id].add(websocket)

        if username not in self.user_sockets:
            self.user_sockets[username] = set()
        self.user_sockets[username].add(websocket)

        # Broadcast online presence notification
        await self.broadcast_to_room(connection_id, {
            "type": "presence",
            "username": username,
            "status": "online",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, exclude_socket=websocket)

    def disconnect(self, websocket: WebSocket, connection_id: str, username: str):
        if connection_id in self.rooms:
            self.rooms[connection_id].discard(websocket)
            if not self.rooms[connection_id]:
                del self.rooms[connection_id]

        if username in self.user_sockets:
            self.user_sockets[username].discard(websocket)
            if not self.user_sockets[username]:
                del self.user_sockets[username]

    def is_user_online(self, username: str) -> bool:
        return bool(self.user_sockets.get(username))

    async def broadcast_to_room(self, connection_id: str, message: dict, exclude_socket: Optional[WebSocket] = None):
        """Send message to all sockets in a connection room."""
        if connection_id not in self.rooms:
            return

        dead_sockets = []
        for sock in self.rooms[connection_id]:
            if sock != exclude_socket:
                try:
                    await sock.send_json(message)
                except Exception:
                    dead_sockets.append(sock)

        for ds in dead_sockets:
            self.rooms[connection_id].discard(ds)


ws_manager = ConnectionManager()


async def save_direct_message(
    connection_id: str,
    sender_username: str,
    receiver_username: str,
    text: str
) -> dict:
    """Persist a message and sync to MongoDB."""
    now = datetime.now(timezone.utc).isoformat()
    msg_id = f"dm-{uuid.uuid4().hex[:8]}"
    msg = {
        "id": msg_id,
        "connection_id": connection_id,
        "sender_username": sender_username,
        "receiver_username": receiver_username,
        "message": text,
        "timestamp": now,
    }

    if connection_id not in _persisted_messages:
        _persisted_messages[connection_id] = []
    _persisted_messages[connection_id].append(msg)
    _save_messages_disk()

    # Sync with MongoDB if available
    db = database.get_db()
    if db is not None:
        try:
            await db["direct_messages"].insert_one(dict(msg))
        except Exception as e:
            print(f"MongoDB save message error: {e}")

    return msg


def get_conversation_messages(connection_id: str) -> List[dict]:
    """Get all messages for a connection."""
    return _persisted_messages.get(connection_id, [])

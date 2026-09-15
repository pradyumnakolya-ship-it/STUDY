"""
StudyGPT Backend — Database Connection

Async MongoDB client via Motor with fallback in-memory/mock support if local MongoDB is offline.
Collections: users, conversations, connections, direct_messages.
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

client: AsyncIOMotorClient | None = None
is_connected: bool = False

async def connect_db() -> None:
    """Create the Motor client on startup."""
    global client, is_connected
    try:
        client = AsyncIOMotorClient(settings.MONGO_URL, serverSelectionTimeoutMS=2000)
        await client.admin.command("ping")
        is_connected = True
        print(f"Connected to MongoDB at {settings.MONGO_URL} (db={settings.MONGO_DB})")
        # Ensure unique index on username and email
        db = get_db()
        await db["users"].create_index("username", unique=True)
        await db["users"].create_index("email", unique=True)
    except Exception as e:
        print(f"Warning: MongoDB connection failed ({e}). Database features will operate with fallback store.")
        is_connected = False

async def close_db() -> None:
    """Close the Motor client on shutdown."""
    global client
    if client:
        client.close()
        print("MongoDB connection closed.")

def get_db():
    """Return the database handle."""
    if client is not None:
        return client[settings.MONGO_DB]
    return None

def get_users_collection():
    db = get_db()
    return db["users"] if db is not None else None

def get_conversations_collection():
    db = get_db()
    return db["conversations"] if db is not None else None

def get_connections_collection():
    db = get_db()
    return db["connections"] if db is not None else None

def get_direct_messages_collection():
    db = get_db()
    return db["direct_messages"] if db is not None else None

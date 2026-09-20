"""
StudyGPT Backend — Material Store

Provides persistence for uploaded study materials, chunks, and metadata.
Uses local JSON persistence in backend/data/materials.json with MongoDB collection sync.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import database
from models.material import MaterialItem, MaterialChunk

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MATERIALS_FILE = DATA_DIR / "materials.json"

# In-memory caches
_materials: Dict[str, dict] = {}
_chunks: Dict[str, List[dict]] = {}


def _load_from_disk() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if MATERIALS_FILE.exists():
        try:
            with open(MATERIALS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data.get("materials", []):
                    _materials[item["id"]] = item
                for mid, chk_list in data.get("chunks", {}).items():
                    _chunks[mid] = chk_list
        except Exception as e:
            print(f"Warning: Failed to load materials from disk: {e}")


def _save_to_disk() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with open(MATERIALS_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "materials": list(_materials.values()),
                "chunks": _chunks
            }, f, indent=2)
    except Exception as e:
        print(f"Warning: Failed to save materials to disk: {e}")


# Initialize on import
_load_from_disk()


async def save_material(material: MaterialItem, chunks: List[MaterialChunk]) -> None:
    """Store material metadata and its semantic chunks."""
    mat_dict = material.model_dump()
    chk_dicts = [c.model_dump() for c in chunks]

    _materials[material.id] = mat_dict
    _chunks[material.id] = chk_dicts
    _save_to_disk()

    # Sync with MongoDB if available
    db = database.get_db()
    if db is not None:
        try:
            await db["materials"].update_one(
                {"id": material.id},
                {"$set": {"metadata": mat_dict, "chunks": chk_dicts}},
                upsert=True
            )
        except Exception as e:
            print(f"MongoDB sync error for material {material.id}: {e}")


def get_material(material_id: str) -> Optional[MaterialItem]:
    """Retrieve material metadata by ID."""
    data = _materials.get(material_id)
    if data:
        return MaterialItem(**data)
    return None


def get_material_chunks(material_id: str) -> List[MaterialChunk]:
    """Retrieve all semantic chunks for a material."""
    raw = _chunks.get(material_id, [])
    return [MaterialChunk(**c) for c in raw]


def list_materials(user_id: Optional[str] = None) -> List[MaterialItem]:
    """List materials for a user, or all materials if user_id is None."""
    results = []
    for item in _materials.values():
        if user_id is None or item["user_id"] == user_id:
            results.append(MaterialItem(**item))
    # Sort newest first
    results.sort(key=lambda x: x.created_at, reverse=True)
    return results


async def delete_material(material_id: str, user_id: Optional[str] = None) -> bool:
    """Delete a material and its indexed chunks."""
    if material_id not in _materials:
        return False

    if user_id and _materials[material_id]["user_id"] != user_id:
        return False

    del _materials[material_id]
    if material_id in _chunks:
        del _chunks[material_id]

    _save_to_disk()

    # Sync with MongoDB if available
    db = database.get_db()
    if db is not None:
        try:
            await db["materials"].delete_one({"id": material_id})
        except Exception as e:
            print(f"MongoDB delete error for material {material_id}: {e}")

    return True

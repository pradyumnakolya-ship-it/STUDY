"""
StudyGPT Backend — Material Models

Pydantic schemas for the My Materials & RAG Document Q&A system.
"""

from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field


class MaterialChunk(BaseModel):
    """A semantic chunk of a study document."""
    id: str
    material_id: str
    chunk_index: int
    page_number: Optional[int] = None
    text: str
    char_count: int
    embedding: Optional[List[float]] = None


class MaterialItem(BaseModel):
    """Metadata for an uploaded study material."""
    id: str
    user_id: str
    title: str
    filename: str
    file_type: str  # 'pdf', 'txt', 'notes'
    file_size: int  # in bytes
    total_pages: int
    chunk_count: int
    summary: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class MaterialUploadResponse(BaseModel):
    """Response returned upon successful document upload and indexing."""
    material: MaterialItem
    message: str
    preview_chunks: List[str] = []


class MaterialListResponse(BaseModel):
    """Response containing list of materials."""
    materials: List[MaterialItem]


class Citation(BaseModel):
    """Specific excerpt citation backing an AI answer."""
    chunk_id: str
    material_id: str
    material_title: str
    page_number: Optional[int] = None
    excerpt: str
    relevance_score: float


class MaterialQueryRequest(BaseModel):
    """Question asked by a student against their uploaded material."""
    question: str
    top_k: int = 4


class MaterialQueryResponse(BaseModel):
    """AI answer grounded in the uploaded study material with citations."""
    question: str
    answer: str
    material_id: Optional[str] = None
    citations: List[Citation] = []
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

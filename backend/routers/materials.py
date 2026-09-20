"""
StudyGPT Backend — Materials Router

Endpoints for uploading personal study documents and asking grounded RAG questions.
(Section 4 / Steps 11 & 12 of the documentation)
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile

from models.material import (
    MaterialItem,
    MaterialUploadResponse,
    MaterialListResponse,
    MaterialQueryRequest,
    MaterialQueryResponse,
    MaterialChunk,
)
from services import material_store, rag_service

router = APIRouter(prefix="/materials", tags=["materials"])


def _extract_username(x_user_name: str) -> str:
    cleaned = x_user_name.strip()
    return cleaned if cleaned else "Harsha A"


@router.post("/upload", response_model=MaterialUploadResponse)
async def upload_material(
    title: str = Form(...),
    notes_text: str = Form(""),
    file: Optional[UploadFile] = File(default=None),
    x_user_name: str = Header(default="Harsha A", alias="X-User-Name"),
):
    """
    Upload a PDF or raw notes text, extract content, chunk semantically, and index for RAG.
    """
    user_id = _extract_username(x_user_name)
    material_id = f"mat-{uuid.uuid4().hex[:8]}"

    filename = "Pasted Notes"
    file_type = "notes"
    file_size = len(notes_text.encode("utf-8"))
    pages_data = []

    if file:
        filename = file.filename or "Uploaded Document"
        file_bytes = await file.read()
        file_size = len(file_bytes)
        lower_name = filename.lower()

        if lower_name.endswith(".pdf"):
            file_type = "pdf"
            try:
                _, pages_data = rag_service.extract_text_from_pdf(file_bytes)
            except Exception as exc:
                raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {exc}") from exc
        else:
            file_type = "txt"
            text_str = file_bytes.decode("utf-8", errors="replace")
            pages_data = [(1, text_str)]
    elif notes_text.strip():
        pages_data = [(1, notes_text.strip())]
    else:
        raise HTTPException(status_code=400, detail="Please provide an uploaded file or paste notes text.")

    if not pages_data or not any(p[1].strip() for p in pages_data):
        raise HTTPException(status_code=400, detail="No readable text found in the provided material.")

    # Semantic chunking with page tracking
    chunks = rag_service.chunk_text_by_pages(material_id, pages_data)
    if not chunks:
        raise HTTPException(status_code=400, detail="Could not create semantic chunks from document.")

    # Create summary preview
    total_pages = len(pages_data)
    first_chunk_preview = chunks[0].text[:180] + ("..." if len(chunks[0].text) > 180 else "")

    material_item = MaterialItem(
        id=material_id,
        user_id=user_id,
        title=title.strip(),
        filename=filename,
        file_type=file_type,
        file_size=file_size,
        total_pages=total_pages,
        chunk_count=len(chunks),
        summary=first_chunk_preview,
    )

    await material_store.save_material(material_item, chunks)

    return MaterialUploadResponse(
        material=material_item,
        message=f"Successfully indexed '{title}' ({len(chunks)} chunks across {total_pages} page(s)).",
        preview_chunks=[c.text[:100] + "..." for c in chunks[:3]],
    )


@router.get("", response_model=MaterialListResponse)
async def list_user_materials(
    x_user_name: str = Header(default="Harsha A", alias="X-User-Name")
):
    """List all study materials uploaded by the current user."""
    user_id = _extract_username(x_user_name)
    return {"materials": material_store.list_materials(user_id)}


@router.get("/{material_id}")
async def get_material_detail(
    material_id: str,
    x_user_name: str = Header(default="Harsha A", alias="X-User-Name")
):
    """Get metadata and chunk excerpts for a specific material."""
    mat = material_store.get_material(material_id)
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")

    chunks = material_store.get_material_chunks(material_id)
    return {
        "material": mat,
        "chunks": chunks[:20],  # return first 20 chunks for preview
    }


@router.delete("/{material_id}")
async def delete_material_endpoint(
    material_id: str,
    x_user_name: str = Header(default="Harsha A", alias="X-User-Name")
):
    """Delete an uploaded study document and remove from index."""
    user_id = _extract_username(x_user_name)
    success = await material_store.delete_material(material_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Material not found or access denied")
    return {"status": "success", "message": "Material deleted successfully"}


@router.post("/{material_id}/query", response_model=MaterialQueryResponse)
async def query_single_material(
    material_id: str,
    req: MaterialQueryRequest,
    x_user_name: str = Header(default="Harsha A", alias="X-User-Name")
):
    """
    RAG Query: Ask a question answered strictly and cited from this specific document.
    """
    mat = material_store.get_material(material_id)
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")

    chunks = material_store.get_material_chunks(material_id)
    if not chunks:
        raise HTTPException(status_code=400, detail="No chunks available for this material")

    relevant = await rag_service.retrieve_relevant_chunks(req.question, chunks, top_k=req.top_k)
    answer, citations = await rag_service.generate_rag_answer(req.question, mat.title, relevant)

    return MaterialQueryResponse(
        question=req.question,
        answer=answer,
        material_id=material_id,
        citations=citations,
    )


@router.post("/query", response_model=MaterialQueryResponse)
async def query_all_materials(
    req: MaterialQueryRequest,
    x_user_name: str = Header(default="Harsha A", alias="X-User-Name")
):
    """
    Multi-document RAG: Search and answer across all of the student's study materials.
    """
    user_id = _extract_username(x_user_name)
    user_materials = material_store.list_materials(user_id)
    if not user_materials:
        raise HTTPException(status_code=400, detail="You have not uploaded any study materials yet.")

    all_chunks = []
    title_lookup = {}
    for m in user_materials:
        title_lookup[m.id] = m.title
        all_chunks.extend(material_store.get_material_chunks(m.id))

    relevant = await rag_service.retrieve_relevant_chunks(req.question, all_chunks, top_k=req.top_k)
    answer, citations = await rag_service.generate_rag_answer(
        req.question,
        "Your Study Library",
        relevant
    )

    # Patch material title onto citations
    for c in citations:
        c.material_title = title_lookup.get(c.material_id, "Study Material")

    return MaterialQueryResponse(
        question=req.question,
        answer=answer,
        material_id=None,
        citations=citations,
    )

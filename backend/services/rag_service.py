"""
StudyGPT Backend — RAG (Retrieval-Augmented Generation) Service

Provides:
- Document parsing (PDF, text)
- Semantic text chunking with page tracking
- Vector embeddings via Gemini API (models/text-embedding-004)
- Fast cosine-similarity & TF-IDF similarity fallback
- Grounded prompt generation and cited answer synthesis
"""

import math
import re
import uuid
from collections import Counter
from io import BytesIO
from typing import List, Tuple, Optional

from pypdf import PdfReader
import google.generativeai as genai

from config import settings
from models.material import MaterialChunk, Citation
from services import gemini_service


# ── 1. Document Extraction ──────────────────────────────────────────────────

def extract_text_from_pdf(content: bytes) -> Tuple[str, List[Tuple[int, str]]]:
    """
    Extract text from a PDF file preserving page numbers.

    Returns:
        (full_text, [(page_number, page_text), ...])
    """
    reader = PdfReader(BytesIO(content))
    pages: List[Tuple[int, str]] = []
    full_text_parts = []

    for idx, page in enumerate(reader.pages):
        page_num = idx + 1
        page_text = (page.extract_text() or "").strip()
        if page_text:
            pages.append((page_num, page_text))
            full_text_parts.append(f"--- Page {page_num} ---\n{page_text}")

    full_text = "\n\n".join(full_text_parts)
    return full_text, pages


# ── 2. Text Chunking ────────────────────────────────────────────────────────

def chunk_text_by_pages(
    material_id: str,
    pages: List[Tuple[int, str]],
    chunk_size: int = 800,
    overlap: int = 150
) -> List[MaterialChunk]:
    """
    Split per-page text into overlapping chunks, tracking page numbers.
    """
    chunks: List[MaterialChunk] = []
    chunk_idx = 0

    for page_num, text in pages:
        # Split text into sentences / paragraphs
        clean_text = re.sub(r'\s+', ' ', text).strip()
        start = 0
        while start < len(clean_text):
            end = min(start + chunk_size, len(clean_text))
            # Try to break at a sentence or word boundary
            if end < len(clean_text):
                boundary = clean_text.rfind('. ', start, end)
                if boundary != -1 and boundary > start + (chunk_size // 2):
                    end = boundary + 1
                else:
                    space_boundary = clean_text.rfind(' ', start, end)
                    if space_boundary != -1 and space_boundary > start + (chunk_size // 2):
                        end = space_boundary

            chunk_content = clean_text[start:end].strip()
            if len(chunk_content) > 30 or (len(chunks) == 0 and len(chunk_content) > 0):  # allow short docs to produce at least one chunk
                chunk_id = f"chk-{uuid.uuid4().hex[:8]}"
                chunks.append(
                    MaterialChunk(
                        id=chunk_id,
                        material_id=material_id,
                        chunk_index=chunk_idx,
                        page_number=page_num,
                        text=chunk_content,
                        char_count=len(chunk_content),
                    )
                )
                chunk_idx += 1

            if end >= len(clean_text):
                break
            start = max(start + 1, end - overlap)

    return chunks


def chunk_raw_text(
    material_id: str,
    raw_text: str,
    chunk_size: int = 800,
    overlap: int = 150
) -> List[MaterialChunk]:
    """
    Chunk raw plain text or notes where pages are not separated.
    """
    return chunk_text_by_pages(material_id, [(1, raw_text)], chunk_size, overlap)


# ── 3. Similarity Search & Embeddings ───────────────────────────────────────

def _tokenize(text: str) -> List[str]:
    """Simple lowercase word tokenizer."""
    return re.findall(r'\b[a-z0-9_]{2,}\b', text.lower())


def compute_tfidf_similarity(query: str, docs: List[str]) -> List[float]:
    """
    Fast and robust TF-IDF cosine similarity fallback.
    No external heavy dependencies required.
    """
    if not docs:
        return []

    q_tokens = _tokenize(query)
    if not q_tokens:
        return [0.0] * len(docs)

    doc_tokens = [_tokenize(d) for d in docs]
    n_docs = len(docs)

    # Calculate Document Frequency (DF)
    df = Counter()
    for tokens in doc_tokens:
        for term in set(tokens):
            df[term] += 1

    # Calculate Query Vector
    q_tf = Counter(q_tokens)
    q_vec = {}
    for term, count in q_tf.items():
        idf = math.log((n_docs + 1) / (df.get(term, 0) + 1)) + 1.0
        q_vec[term] = count * idf

    q_norm = math.sqrt(sum(v ** 2 for v in q_vec.values())) or 1e-9

    scores = []
    for tokens in doc_tokens:
        d_tf = Counter(tokens)
        d_vec = {}
        for term, count in d_tf.items():
            idf = math.log((n_docs + 1) / (df.get(term, 0) + 1)) + 1.0
            d_vec[term] = count * idf

        d_norm = math.sqrt(sum(v ** 2 for v in d_vec.values())) or 1e-9

        # Dot product
        dot = sum(q_vec[t] * d_vec.get(t, 0.0) for t in q_vec if t in d_vec)
        score = dot / (q_norm * d_norm)
        scores.append(round(score, 4))

    return scores


async def compute_gemini_embeddings(texts: List[str]) -> Optional[List[List[float]]]:
    """
    Generate vector embeddings using Google Gemini models/text-embedding-004.
    Returns None if API is unconfigured or call fails.
    """
    if not settings.is_configured():
        return None

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        embeddings = []
        for text in texts:
            res = genai.embed_content(
                model="models/text-embedding-004",
                content=text[:2000],
                task_type="retrieval_document"
            )
            embeddings.append(res["embedding"])
        return embeddings
    except Exception as exc:
        print(f"Notice: Gemini embedding API error ({exc}), falling back to TF-IDF similarity.")
        return None


async def retrieve_relevant_chunks(
    query: str,
    chunks: List[MaterialChunk],
    top_k: int = 4
) -> List[Tuple[MaterialChunk, float]]:
    """
    Retrieve the top_k most relevant chunks for a question.
    """
    if not chunks:
        return []

    doc_texts = [c.text for c in chunks]
    scores = compute_tfidf_similarity(query, doc_texts)

    scored_chunks = list(zip(chunks, scores))
    # Sort descending by score
    scored_chunks.sort(key=lambda x: x[1], reverse=True)

    # If top scores are all 0 (no keyword overlap), return initial chunks as context
    if scored_chunks[0][1] == 0:
        return [(c, 0.1) for c in chunks[:top_k]]

    return scored_chunks[:top_k]


# ── 4. Grounded RAG Answer Synthesis ────────────────────────────────────────

async def generate_rag_answer(
    question: str,
    material_title: str,
    relevant_chunks: List[Tuple[MaterialChunk, float]]
) -> Tuple[str, List[Citation]]:
    """
    Synthesize an answer to the student's question grounded in the retrieved excerpts.
    """
    citations: List[Citation] = []
    context_blocks = []

    for idx, (chunk, score) in enumerate(relevant_chunks):
        page_info = f"Page {chunk.page_number}" if chunk.page_number else f"Section {chunk.chunk_index + 1}"
        context_blocks.append(f"[Excerpt {idx + 1} - {page_info}]:\n\"{chunk.text}\"")

        citations.append(
            Citation(
                chunk_id=chunk.id,
                material_id=chunk.material_id,
                material_title=material_title,
                page_number=chunk.page_number,
                excerpt=chunk.text[:220] + ("..." if len(chunk.text) > 220 else ""),
                relevance_score=score
            )
        )

    context_str = "\n\n".join(context_blocks)

    rag_prompt = (
        f"You are StudyGPT, an encouraging personal AI study tutor.\n"
        f"The student is studying the document titled '{material_title}' and asked the following question:\n\n"
        f"QUESTION: \"{question}\"\n\n"
        f"SOURCE EXCERPTS FROM '{material_title}':\n"
        f"----------------------------------------\n"
        f"{context_str}\n"
        f"----------------------------------------\n\n"
        f"INSTRUCTIONS FOR YOUR RESPONSE:\n"
        f"1. Answer the question accurately and clearly, relying primarily on the source excerpts provided above.\n"
        f"2. Explicitly cite the page or excerpt where key facts were found (e.g. 'According to Page 2...').\n"
        f"3. Use structured Markdown: bold key terms, use bullet points, and explain any difficult terms simply.\n"
        f"4. If the excerpts do not contain enough information to fully answer the question, state that clearly and offer a brief general explanation while reminding the student it is outside the provided notes.\n"
        f"5. End with a friendly one-sentence check-for-understanding question."
    )

    try:
        answer = await gemini_service.generate_answer(rag_prompt)
    except Exception as exc:
        # Fallback offline explanation if Gemini is offline
        answer = (
            f"### Study Summary for '{question}'\n\n"
            f"Based on your document **{material_title}**, here are the most relevant excerpts found:\n\n"
            + "\n\n".join([f"- **{c.page_number and f'Page {c.page_number}' or 'Excerpt'}:** {c.excerpt}" for c in citations])
            + "\n\n*(Note: Add your Google Gemini API Key in backend/.env for comprehensive AI synthesis!)*"
        )

    return answer, citations

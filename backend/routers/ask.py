"""
StudyGPT Backend — Ask Router

Provides the POST /ask endpoint and GET /ask/stream SSE endpoint for the AI tutor.
"""

import json
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from models.ask import AskRequest, AskResponse, AIModelCatalogResponse
from services import ai_service

router = APIRouter(tags=["AI Tutor"])


@router.get("/ask/models", response_model=AIModelCatalogResponse)
async def get_available_models():
    """
    Return the list of all available AI models across Gemini, ChatGPT, Claude, and Grok,
    along with their configuration status (whether API key is set).
    """
    models = ai_service.get_models_catalog()
    return AIModelCatalogResponse(
        models=models,
        default_provider="gemini",
        default_model="gemini-1.5-flash",
    )


@router.post("/ask", response_model=AskResponse)
async def ask_question(request: AskRequest):
    """
    Receive a student's question and return an AI-generated study explanation
    using the chosen AI provider (Gemini, ChatGPT, Claude, or Grok).

    The AI acts as a friendly study tutor: it explains concepts simply,
    gives concrete analogies, breaks down code, and offers practice questions.
    """
    try:
        result = await ai_service.generate_study_answer(
            question=request.question,
            provider=request.provider,
            model=request.model,
        )
        return AskResponse(
            answer=result["answer"],
            provider=result["provider"],
            model=result["model"],
            provider_display=result["provider_display"],
        )
    except ValueError as e:
        # Configuration or user input issues (e.g. missing API key)
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )
    except Exception as e:
        # Upstream AI API or network failures
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate answer: {str(e)}",
        )


@router.get("/ask/stream")
async def stream_question(
    question: str = Query(..., description="The student's question"),
    provider: Optional[str] = Query("gemini", description="AI provider: gemini, openai, anthropic, grok"),
    model: Optional[str] = Query(None, description="Specific model ID (optional)"),
):
    """
    Stream an AI tutor answer token-by-token using Server-Sent Events (SSE).

    Gemini uses native SDK streaming; other providers send the full response as
    one SSE event. The final event is always: data: {"done": true}

    Client should use fetch() + ReadableStream to consume events.
    """
    async def sse_generator():
        try:
            async for chunk in ai_service.generate_study_answer_stream(
                question=question,
                provider=provider,
                model=model,
            ):
                yield f"data: {json.dumps({'token': chunk})}\n\n"
        except ValueError as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': f'AI stream error: {str(e)}'})}\n\n"
        finally:
            yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

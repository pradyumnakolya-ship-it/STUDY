"""
StudyGPT Backend — Ask Router

Provides the POST /ask endpoint for the AI tutor.
"""

from fastapi import APIRouter, HTTPException
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

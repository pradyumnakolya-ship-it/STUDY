"""
StudyGPT Backend — Ask Router

Provides the POST /ask endpoint for the AI tutor.
"""

from fastapi import APIRouter, HTTPException
from models.ask import AskRequest, AskResponse
from services.gemini_service import generate_answer

router = APIRouter()


@router.post("/ask", response_model=AskResponse)
async def ask_question(request: AskRequest):
    """
    Receive a student's question and return an AI-generated study explanation.

    The AI acts as a friendly study tutor: it explains concepts simply,
    gives examples, and offers practice questions.
    """
    try:
        answer = await generate_answer(request.question)
        return AskResponse(answer=answer)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate answer: {str(e)}",
        )

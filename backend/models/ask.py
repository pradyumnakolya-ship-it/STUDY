"""
StudyGPT Backend — Ask Models

Pydantic models for the /ask endpoint (request and response).
"""

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    """Request body for the /ask endpoint."""

    question: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="The student's study question.",
        examples=["Explain linked lists in simple terms"],
    )


class AskResponse(BaseModel):
    """Response body for the /ask endpoint."""

    answer: str = Field(
        ...,
        description="The AI tutor's answer to the student's question.",
    )

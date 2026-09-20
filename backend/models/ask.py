"""
StudyGPT Backend — Ask Models

Pydantic models for the /ask endpoint (request and response).
"""

from typing import Optional, List
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
    provider: Optional[str] = Field(
        default="gemini",
        description="The AI provider to use: 'gemini', 'openai' (chatgpt), 'anthropic' (claude), or 'grok' (xai).",
        examples=["gemini", "openai", "anthropic", "grok"],
    )
    model: Optional[str] = Field(
        default=None,
        description="Specific model identifier, e.g., 'gpt-4o', 'claude-3-5-sonnet-20241022', 'grok-2-latest', 'gemini-1.5-flash'.",
        examples=["gpt-4o", "gemini-1.5-flash"],
    )


class AskResponse(BaseModel):
    """Response body for the /ask endpoint."""

    answer: str = Field(
        ...,
        description="The AI tutor's answer to the student's question.",
    )
    provider: str = Field(
        default="gemini",
        description="The AI provider that generated the response.",
    )
    model: str = Field(
        default="gemini-1.5-flash",
        description="The model ID that was utilized.",
    )
    provider_display: str = Field(
        default="Google Gemini",
        description="Display title of the AI provider.",
    )


class AIModelItem(BaseModel):
    """Model information for frontend selector."""

    id: str
    provider: str
    name: str
    provider_display: str
    badge: str
    description: str
    icon: str
    env_var: str
    is_configured: bool
    is_default: bool


class AIModelCatalogResponse(BaseModel):
    """List of all available models and their configuration status."""

    models: List[AIModelItem]
    default_provider: str = "gemini"
    default_model: str = "gemini-1.5-flash"

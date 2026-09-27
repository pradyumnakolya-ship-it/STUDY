"""
test_models_ai.py — Tests for multi-provider AI model catalog and ask routing.
"""

import pytest
from unittest.mock import patch, AsyncMock
from services import ai_service


@pytest.mark.asyncio
async def test_models_catalog_endpoint(client):
    """Verify /ask/models returns free-tier models and provider catalog."""
    res = await client.get("/ask/models")
    assert res.status_code == 200
    data = res.json()
    assert "models" in data
    assert len(data["models"]) >= 4

    # Verify providers are present
    providers = {m["provider"] for m in data["models"]}
    assert "gemini" in providers
    assert "openai" in providers
    assert "anthropic" in providers
    assert "grok" in providers

    # Verify Gemini free models
    gemini_models = [m for m in data["models"] if m["provider"] == "gemini"]
    assert any(m["id"] == "gemini-1.5-flash" for m in gemini_models)
    assert any(m["id"] == "gemini-2.0-flash" for m in gemini_models)


@pytest.mark.asyncio
async def test_ask_with_openai_mock(client):
    """Verify routing to OpenAI provider."""
    with patch("services.ai_service._call_openai", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = "This is a mock explanation from OpenAI GPT-4o-mini."
        res = await client.post(
            "/ask",
            json={
                "question": "Explain recursion simply.",
                "provider": "openai",
                "model": "gpt-4o-mini",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["provider"] == "openai"
        assert data["model"] == "gpt-4o-mini"
        assert "recursion" in data["answer"].lower() or "mock" in data["answer"].lower()


@pytest.mark.asyncio
async def test_ask_with_anthropic_mock(client):
    """Verify routing to Anthropic provider."""
    with patch("services.ai_service._call_anthropic", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = "This is a mock explanation from Claude 3.5 Haiku."
        res = await client.post(
            "/ask",
            json={
                "question": "What is binary search?",
                "provider": "anthropic",
                "model": "claude-3-5-haiku-20241022",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["provider"] == "anthropic"
        assert data["model"] == "claude-3-5-haiku-20241022"


@pytest.mark.asyncio
async def test_ask_with_grok_mock(client):
    """Verify routing to Grok / xAI provider."""
    with patch("services.ai_service._call_grok", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = "This is a mock explanation from Grok Beta."
        res = await client.post(
            "/ask",
            json={
                "question": "How do hash maps work?",
                "provider": "grok",
                "model": "grok-beta",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["provider"] == "grok"
        assert data["model"] == "grok-beta"

"""
test_models_ai.py — Tests for multi-provider AI model catalog and ask routing.
"""

import pytest
from unittest.mock import patch, AsyncMock
from services import ai_service


@pytest.mark.asyncio
async def test_models_catalog_endpoint(client):
    """Verify /ask/models returns only free-credit models."""
    res = await client.get("/ask/models")
    assert res.status_code == 200
    data = res.json()
    assert "models" in data
    assert len(data["models"]) == 3

    # Only free Gemini models are available.
    providers = {m["provider"] for m in data["models"]}
    assert "gemini" in providers
    assert providers == {"gemini"}
    assert all(m["is_free"] for m in data["models"])

    # Verify Gemini free models
    gemini_models = [m for m in data["models"] if m["provider"] == "gemini"]
    assert any(m["id"] == "gemini-3.8-flash" for m in gemini_models)
    assert any(m["id"] == "gemini-3.5-flash" for m in gemini_models)


@pytest.mark.asyncio
async def test_paid_provider_is_rejected(client):
    """Verify paid providers cannot be selected through the API."""
    res = await client.post(
        "/ask",
        json={
            "question": "Explain recursion simply.",
            "provider": "openai",
            "model": "gpt-4o-mini",
        },
    )
    assert res.status_code == 400
    assert "free-credit" in res.json()["detail"]



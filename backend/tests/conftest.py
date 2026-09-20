"""
conftest.py — Pytest fixtures for StudyGPT backend tests.
"""
import sys
import os
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

# Ensure backend root is on sys.path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app   # FastAPI app


@pytest_asyncio.fixture
async def client():
    """Async HTTP client connected to the FastAPI app in-process."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver"
    ) as c:
        yield c


@pytest.fixture
def test_user_payload():
    """A reusable new-user registration payload."""
    import uuid
    uid = uuid.uuid4().hex[:6]
    return {
        "username": f"testuser_{uid}",
        "email": f"testuser_{uid}@example.com",
        "password": "TestPass123!"
    }

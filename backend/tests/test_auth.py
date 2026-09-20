"""
test_auth.py — Tests for /auth endpoints (register, login, profile).
"""
import pytest


@pytest.mark.asyncio
async def test_register_new_user(client, test_user_payload):
    """Register a brand-new user and expect 200 with a JWT token."""
    resp = await client.post("/auth/register", json=test_user_payload)
    assert resp.status_code == 200, f"Register failed: {resp.text}"
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user" in data
    assert data["user"]["username"] == test_user_payload["username"]


@pytest.mark.asyncio
async def test_register_duplicate_username(client, test_user_payload):
    """Registering twice with the same username/email should fail with 400."""
    await client.post("/auth/register", json=test_user_payload)
    resp = await client.post("/auth/register", json=test_user_payload)
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_login_success(client, test_user_payload):
    """Login with correct credentials returns a JWT."""
    await client.post("/auth/register", json=test_user_payload)
    resp = await client.post("/auth/login", json={
        "email": test_user_payload["email"],
        "password": test_user_payload["password"]
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client, test_user_payload):
    """Login with wrong password should return 401."""
    await client.post("/auth/register", json=test_user_payload)
    resp = await client.post("/auth/login", json={
        "email": test_user_payload["email"],
        "password": "WrongPassword!"
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_profile_authenticated(client, test_user_payload):
    """Authenticated GET /auth/me returns user profile."""
    reg = await client.post("/auth/register", json=test_user_payload)
    token = reg.json()["access_token"]
    resp = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == test_user_payload["username"]
    assert data["email"] == test_user_payload["email"]


@pytest.mark.asyncio
async def test_get_profile_unauthenticated(client):
    """GET /auth/me without token should return 401 or 403."""
    resp = await client.get("/auth/me")
    assert resp.status_code in (401, 403)

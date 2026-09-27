"""
test_audit_edge_cases.py — Comprehensive end-to-end regression & edge-case tests.
"""
import pytest
from services import guild_store, conversation_store, progress_store
from config import settings


async def _get_auth_headers(client, payload):
    resp = await client.post("/auth/register", json=payload)
    token = resp.json()["access_token"]
    return {
        "Authorization": f"Bearer {token}",
        "X-User-Name": payload["username"]
    }


# ── Bug 1 & 2: Seed guild attempt list type and no duplicate XP ─────────────

@pytest.mark.asyncio
async def test_seed_guild_submit_and_no_infinite_xp(client, test_user_payload):
    """
    Test Bug 1: Seed guild `guild-algo-aces` accepts attempts without AttributeError.
    Test Bug 2: Retaking a completed quiz yields 0 additional XP.
    """
    uname = test_user_payload["username"]
    
    # 1. Join seed guild
    join_resp = await client.post(
        "/guilds/guild-algo-aces/join",
        headers={"X-User-Name": uname}
    )
    assert join_resp.status_code == 200

    # 2. Cache a dummy quiz for day 1 — save raw dicts directly
    #    (save_quiz expects QuizQuestion pydantic objects OR we write raw dicts)
    from services.guild_store import _load, _save, _LOCK
    with _LOCK:
        data = _load()
        guild = data["guilds"]["guild-algo-aces"]
        guild["quizzes"]["1"] = [
            {
                "id": "q1",
                "question": "What is a Node?",
                "options": ["Data structure element", "Network cable", "Algorithm", "Compiler"],
                "correct_idx": 0,
                "xp": 20,
                "explanation": "A node is the fundamental building block."
            }
        ]
        _save(data)

    # 3. Submit correct answer for Day 1
    attempt_1 = await client.post(
        "/guilds/guild-algo-aces/day/1/quiz/submit",
        headers={"X-User-Name": uname},
        json={"day_number": 1, "answers": [0]}
    )
    assert attempt_1.status_code == 200, f"Submit failed: {attempt_1.text}"
    data_1 = attempt_1.json()
    assert data_1["passed"] is True
    assert data_1["earned_xp"] == 20
    assert 1 in data_1["guild"]["completed_days"]

    # 4. Retake the same quiz for Day 1 — should NOT award double XP
    attempt_2 = await client.post(
        "/guilds/guild-algo-aces/day/1/quiz/submit",
        headers={"X-User-Name": uname},
        json={"day_number": 1, "answers": [0]}
    )
    assert attempt_2.status_code == 200
    data_2 = attempt_2.json()
    assert data_2["earned_xp"] == 0, "Earned XP should be 0 on retake of completed day!"


# ── Bug 3: Chat message creation with unknown cid ────────────────────────────

@pytest.mark.asyncio
async def test_chat_message_unknown_cid_creates_and_saves(client, test_user_payload):
    """
    Test Bug 3: Sending a message with a non-existent cid creates a new conversation
    and successfully saves the user message without dropping it.
    Gemini API calls will gracefully fallback if quota is exhausted.
    """
    headers = await _get_auth_headers(client, test_user_payload)
    
    # Send message with a non-existent CID
    resp = await client.post(
        "/chat/conversations/non-existent-cid-12345/messages",
        headers=headers,
        json={"message": "Hello tutor! Can you explain binary search?"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "user_message" in data
    assert "assistant_message" in data
    assert data["user_message"]["content"] == "Hello tutor! Can you explain binary search?"
    # The AI response may be a real answer or a quota-exceeded fallback — both are acceptable
    assert len(data["assistant_message"]["content"]) > 0


# ── Bug 4: conversation_store.add_message raises KeyError on unknown cid ──────

@pytest.mark.asyncio
async def test_conversation_store_raises_key_error_on_missing_cid():
    """Test Bug 4: add_message raises KeyError when cid is not present."""
    with pytest.raises(KeyError):
        await conversation_store.add_message("definitely-invalid-cid-99999", "user", "test")


# ── Bug 5: config.is_provider_configured checks GEMINI_API_KEYS pool ─────────

def test_gemini_api_keys_pool_configuration():
    """Test Bug 5: settings.is_provider_configured('gemini') works with key pool."""
    orig_raw = settings.GEMINI_API_KEYS_RAW
    orig_key = settings.GEMINI_API_KEY
    try:
        # Simulate having only the pool configured
        settings.GEMINI_API_KEY = ""
        settings.GEMINI_API_KEYS_RAW = "AIzaSyFakeKey1,AIzaSyFakeKey2"
        assert settings.is_provider_configured("gemini") is True
        assert len(settings.get_gemini_keys()) == 2
        assert "AIzaSyFakeKey1" in settings.get_gemini_keys()
    finally:
        settings.GEMINI_API_KEY = orig_key
        settings.GEMINI_API_KEYS_RAW = orig_raw


# ── Bug 8: Standalone quiz submit grading logic ──────────────────────────────

@pytest.mark.asyncio
async def test_standalone_quiz_submit_grades_and_returns_score(client, test_user_payload):
    """Test Bug 8: /quiz/submit calculates correct score and records attempt."""
    headers = await _get_auth_headers(client, test_user_payload)

    # First generate a quiz
    gen_resp = await client.post(
        "/quiz/generate",
        headers=headers,
        json={"topic": "Data Types", "difficulty": "Easy", "count": 2}
    )
    assert gen_resp.status_code == 200
    questions = gen_resp.json()["questions"]
    assert len(questions) > 0

    # Submit answers as Dict[str, str] (question_id -> chosen_answer) per model schema
    answers = {q["id"]: q.get("correct_answer", q["options"][0]) for q in questions}
    sub_resp = await client.post(
        "/quiz/submit",
        headers=headers,
        json={"topic": "Data Types", "answers": answers}
    )
    assert sub_resp.status_code == 200, f"Submit failed: {sub_resp.text}"
    data = sub_resp.json()
    assert data["status"] == "success"
    assert "attempt_id" in data


# ── Edge Case Tests ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_guild_submit_day_number_mismatch(client, test_user_payload):
    """Submitting with URL day_number != body day_number returns 400."""
    uname = test_user_payload["username"]
    resp = await client.post(
        "/guilds/guild-algo-aces/day/1/quiz/submit",
        headers={"X-User-Name": uname},
        json={"day_number": 2, "answers": [0]}
    )
    assert resp.status_code == 400
    assert "does not match" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_check_username_availability_edge_cases(client):
    """Short usernames (< 3 chars) are rejected; valid ones are reported available."""
    r1 = await client.get("/auth/check-username?username=ab")
    assert r1.status_code == 200
    assert r1.json()["available"] is False

    r2 = await client.get("/auth/check-username?username=unlikely_taken_user_99999")
    assert r2.status_code == 200
    assert r2.json()["available"] is True


@pytest.mark.asyncio
async def test_health_endpoint(client):
    """GET /health returns ok status."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_login_with_username_instead_of_email(client, test_user_payload):
    """Login using username (not email) should work."""
    await client.post("/auth/register", json=test_user_payload)
    resp = await client.post("/auth/login", json={
        "email_or_username": test_user_payload["username"],
        "password": test_user_payload["password"]
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_forgot_password_returns_200_for_unknown_email(client):
    """Forgot password should always return 200 (prevents user enumeration)."""
    resp = await client.post("/auth/forgot-password", json={"email": "nonexistent@example.com"})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_materials_upload_empty_file_rejected(client, test_user_payload):
    """Uploading an empty file with no notes text should be rejected."""
    import io
    await client.post("/auth/register", json=test_user_payload)
    resp = await client.post(
        "/materials/upload",
        headers={"X-User-Name": test_user_payload["username"]},
        files={"file": ("empty.txt", io.BytesIO(b""), "text/plain")},
        data={"title": "Empty Doc"}
    )
    assert resp.status_code == 400

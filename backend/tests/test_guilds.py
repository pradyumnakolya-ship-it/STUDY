"""
test_guilds.py — Tests for Guild and Progress feature endpoints.
"""
import pytest


async def _register_and_token(client, payload):
    resp = await client.post("/auth/register", json=payload)
    return resp.json()["access_token"]


# ── Progress / Analytics ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_progress_stats_authenticated(client, test_user_payload):
    """GET /progress/stats returns analytics for an authenticated user."""
    token = await _register_and_token(client, test_user_payload)
    resp = await client.get(
        "/progress/stats",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "total_xp" in data
    assert "study_streak_days" in data
    assert "weekly_activity" in data
    assert isinstance(data["weekly_activity"], list)


@pytest.mark.asyncio
async def test_progress_stats_unauthenticated(client):
    """GET /progress/stats without token should be 401/403."""
    resp = await client.get("/progress/stats")
    assert resp.status_code in (401, 403)


# ── Roadmap ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_roadmap_generate(client, test_user_payload):
    """POST /roadmap/generate returns a schedule (or fallback)."""
    token = await _register_and_token(client, test_user_payload)
    resp = await client.post(
        "/roadmap/generate",
        headers={"Authorization": f"Bearer {token}"},
        json={"topic": "Machine Learning", "days": 3, "experience_level": "Beginner"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "id" in data
    assert "schedule" in data
    assert len(data["schedule"]) > 0


# ── Quiz ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_quiz_generate(client, test_user_payload):
    """POST /quiz/generate returns quiz questions."""
    token = await _register_and_token(client, test_user_payload)
    resp = await client.post(
        "/quiz/generate",
        headers={"Authorization": f"Bearer {token}"},
        json={"topic": "Python basics", "difficulty": "Easy", "count": 3}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "questions" in data
    assert len(data["questions"]) > 0


# ── Practice Drills ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_practice_generate(client, test_user_payload):
    """POST /practice/generate returns practice questions."""
    token = await _register_and_token(client, test_user_payload)
    resp = await client.post(
        "/practice/generate",
        headers={"Authorization": f"Bearer {token}"},
        json={"topic": "Photosynthesis", "difficulty": "Beginner", "count": 3}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "questions" in data
    assert len(data["questions"]) >= 1  # at least 1 (fallback or real)
    q = data["questions"][0]
    assert "id" in q
    assert "options" in q
    assert "hint" in q
    assert "xp_value" in q


@pytest.mark.asyncio
async def test_practice_check_correct(client, test_user_payload):
    """POST /practice/check with correct answer returns correct=True and earned_xp > 0."""
    token = await _register_and_token(client, test_user_payload)
    # Generate a question
    gen = await client.post(
        "/practice/generate",
        headers={"Authorization": f"Bearer {token}"},
        json={"topic": "Math", "difficulty": "Beginner", "count": 1}
    )
    q = gen.json()["questions"][0]
    resp = await client.post(
        "/practice/check",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "question_id": q["id"],
            "chosen_answer": q["correct_answer"],
            "correct_answer": q["correct_answer"],
            "xp_value": q["xp_value"],
            "topic": "Math"
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["correct"] is True
    assert data["earned_xp"] > 0


@pytest.mark.asyncio
async def test_practice_check_wrong(client, test_user_payload):
    """POST /practice/check with wrong answer returns correct=False, earned_xp=0."""
    token = await _register_and_token(client, test_user_payload)
    gen = await client.post(
        "/practice/generate",
        headers={"Authorization": f"Bearer {token}"},
        json={"topic": "Geography", "difficulty": "Beginner", "count": 1}
    )
    q = gen.json()["questions"][0]
    wrong = next(
        (o for o in q["options"] if o != q["correct_answer"]),
        "definitely wrong answer"
    )
    resp = await client.post(
        "/practice/check",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "question_id": q["id"],
            "chosen_answer": wrong,
            "correct_answer": q["correct_answer"],
            "xp_value": q["xp_value"],
            "topic": "Geography"
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["correct"] is False
    assert data["earned_xp"] == 0


# ── Chat Conversations ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_and_list_conversation(client, test_user_payload):
    """POST /chat/conversations creates a session, GET /chat/conversations lists it."""
    token = await _register_and_token(client, test_user_payload)
    headers = {"Authorization": f"Bearer {token}"}

    # Create
    create = await client.post("/chat/conversations", headers=headers)
    assert create.status_code == 200
    cid = create.json()["id"]

    # List
    lst = await client.get("/chat/conversations", headers=headers)
    assert lst.status_code == 200
    ids = [c["id"] for c in lst.json()]
    assert cid in ids


@pytest.mark.asyncio
async def test_delete_conversation(client, test_user_payload):
    """DELETE /chat/conversations/{cid} removes the conversation."""
    token = await _register_and_token(client, test_user_payload)
    headers = {"Authorization": f"Bearer {token}"}
    create = await client.post("/chat/conversations", headers=headers)
    cid = create.json()["id"]
    del_resp = await client.delete(f"/chat/conversations/{cid}", headers=headers)
    assert del_resp.status_code == 200
    lst = await client.get("/chat/conversations", headers=headers)
    ids = [c["id"] for c in lst.json()]
    assert cid not in ids

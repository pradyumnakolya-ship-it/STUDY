"""
Features Router:
- AI Tutor Conversations (/chat)
- Standalone Roadmap Generator (/roadmap)
- Standalone Quiz & Practice (/quiz)
- Social Connect & Direct Messaging (/social)
- Learning Progress & Analytics (/progress)
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Header, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import StreamingResponse

from models.user import UserProfile
from routers.auth import get_current_user
from models.extra import (
    Conversation, ChatMessage, SendMessageRequest,
    RoadmapRequest, StandaloneRoadmap, RoadmapDay,
    QuizGenerateRequest, QuizQuestion, QuizSubmitRequest,
    ConnectionStatus, DirectMessageItem, SendDMRequest,
    PracticeGenerateRequest, PracticeQuestion, PracticeCheckRequest, PracticeCheckResponse
)
from services import gemini_service, auth_service, conversation_store, progress_store
from services.websocket_manager import ws_manager, save_direct_message, get_conversation_messages
import database

router = APIRouter(tags=["Extended Features"])

# In-memory stores fallback
CONVERSATIONS_STORE = {}
ROADMAPS_STORE = {}
CONNECTIONS_STORE = {}
MESSAGES_STORE = {}
QUIZ_ATTEMPTS_STORE = {}

# ----------------- 1. AI TUTOR CONVERSATIONS -----------------

@router.get("/chat/conversations")
async def get_conversations(current_user: UserProfile = Depends(get_current_user)):
    return await conversation_store.get_user_conversations(current_user.id)


@router.post("/chat/conversations")
async def create_conversation(current_user: UserProfile = Depends(get_current_user)):
    return await conversation_store.create_conversation(current_user.id)


@router.get("/chat/conversations/{cid}")
async def get_conversation(cid: str, current_user: UserProfile = Depends(get_current_user)):
    conv = await conversation_store.get_conversation(cid, current_user.id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.delete("/chat/conversations/{cid}")
async def delete_conversation(cid: str, current_user: UserProfile = Depends(get_current_user)):
    success = await conversation_store.delete_conversation(cid, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "success", "message": "Conversation deleted"}


@router.post("/chat/conversations/{cid}/messages")
async def send_chat_message(cid: str, req: SendMessageRequest, current_user: UserProfile = Depends(get_current_user)):
    conv = await conversation_store.get_conversation(cid, current_user.id)
    if not conv:
        conv = await conversation_store.create_conversation(current_user.id, title=req.message[:35])

    user_msg = await conversation_store.add_message(cid, "user", req.message)

    system_instruction = (
        "You are StudyGPT, a friendly, encouraging, and world-class personal AI Study Tutor. "
        "Explain concepts simply with intuitive analogies, structured markdown formatting, "
        "bullet points, and clear code examples where applicable. Break down difficult steps. "
        "Conclude with a brief thought-provoking check-for-understanding question."
    )
    prompt = f"{system_instruction}\n\nStudent asks: {req.message}"
    ai_answer = await gemini_service.generate_answer(prompt)

    ai_msg = await conversation_store.add_message(cid, "assistant", ai_answer)
    return {"user_message": user_msg, "assistant_message": ai_msg}


@router.post("/chat/conversations/{cid}/messages/stream")
async def stream_chat_message(
    cid: str,
    req: SendMessageRequest,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Stream AI Tutor response token-by-token using Server-Sent Events (SSE).
    """
    conv = await conversation_store.get_conversation(cid, current_user.id)
    if not conv:
        await conversation_store.create_conversation(current_user.id, title=req.message[:35])

    await conversation_store.add_message(cid, "user", req.message)

    system_instruction = (
        "You are StudyGPT, a friendly, encouraging, and world-class personal AI Study Tutor. "
        "Explain concepts simply with intuitive analogies, structured markdown formatting, "
        "bullet points, and clear code examples where applicable. Break down difficult steps. "
        "Conclude with a brief thought-provoking check-for-understanding question."
    )
    prompt = f"{system_instruction}\n\nStudent asks: {req.message}"

    async def token_generator():
        accumulated = []
        try:
            async for token in gemini_service.generate_answer_stream(prompt):
                accumulated.append(token)
                import json
                yield f"data: {json.dumps({'token': token})}\n\n"
        except Exception as e:
            fallback_text = (
                f"### Study Guide: {req.message}\n\n"
                "Here is an intuitive breakdown:\n\n"
                "- **Key Concept**: Focus on breaking down the core principles step by step.\n"
                "- **Practical Tip**: Test your intuition with real-world examples.\n\n"
                "*(Configure GEMINI_API_KEY in backend/.env for real-time live generation)*"
            )
            accumulated.append(fallback_text)
            import json
            yield f"data: {json.dumps({'token': fallback_text})}\n\n"

        full_answer = "".join(accumulated)
        await conversation_store.add_message(cid, "assistant", full_answer)
        import json
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(token_generator(), media_type="text/event-stream")



# ----------------- 2. STANDALONE STUDY ROADMAP -----------------

@router.post("/roadmap/generate")
async def generate_standalone_roadmap(req: RoadmapRequest, current_user: UserProfile = Depends(get_current_user)):
    rid = f"rdm-{uuid.uuid4().hex[:8]}"
    
    prompt = (
        f"Generate a {req.days}-day structured study roadmap for learning '{req.topic}' at a '{req.experience_level}' level. "
        "Return ONLY raw JSON with no markdown wrapping or code fences. "
        "The JSON structure must be a list of objects with: "
        "'day' (int), 'title' (str), 'learning_objective' (str), 'subtopics' (list of str), and 'practice_prompts' (list of str)."
    )
    
    schedule = []
    try:
        raw = await gemini_service.generate_answer(prompt)
        import json
        clean = raw.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        if clean.startswith("```"):
            clean = clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        schedule = json.loads(clean.strip())
    except Exception:
        # Fallback template roadmap if AI formatting fails
        for d in range(1, req.days + 1):
            schedule.append({
                "day": d,
                "title": f"Core Foundations Part {d}",
                "learning_objective": f"Master essential theory and techniques of {req.topic} for day {d}.",
                "subtopics": [f"Key concept {d}.1", f"Practical application {d}.2", f"Best practices {d}.3"],
                "practice_prompts": [f"Solve a beginner exercise on {req.topic} day {d}"]
            })

    roadmap_data = {
        "id": rid,
        "user_id": current_user.id,
        "topic": req.topic,
        "days": req.days,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "schedule": schedule
    }
    ROADMAPS_STORE[rid] = roadmap_data
    return roadmap_data

@router.get("/roadmap/history")
async def get_roadmap_history(current_user: UserProfile = Depends(get_current_user)):
    user_roadmaps = [r for r in ROADMAPS_STORE.values() if r["user_id"] == current_user.id]
    return user_roadmaps


# ----------------- 3. STANDALONE QUIZZES & PRACTICE -----------------

@router.post("/quiz/generate")
async def generate_quiz(req: QuizGenerateRequest, current_user: UserProfile = Depends(get_current_user)):
    prompt = (
        f"Generate {req.count} multiple-choice quiz questions for the topic '{req.topic}' at '{req.difficulty}' difficulty. "
        "Return ONLY raw JSON with no markdown formatting or code fences. "
        "The JSON must be a list of objects with: "
        "'id' (string, e.g. 'q1'), 'question' (string), 'options' (list of 4 distinct choices), "
        "'correct_answer' (string matching one of the options verbatim), 'explanation' (string), 'difficulty' (string)."
    )
    
    questions = []
    try:
        raw = await gemini_service.generate_answer(prompt)
        import json
        clean = raw.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        if clean.startswith("```"):
            clean = clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        questions = json.loads(clean.strip())
    except Exception:
        questions = [
            {
                "id": "q1",
                "question": f"What is the foundational concept behind {req.topic}?",
                "options": ["Encapsulation & modularity", "Single-threaded execution", "Linear time complexity", "Static memory assignment"],
                "correct_answer": "Encapsulation & modularity",
                "explanation": f"Modularity is central to understanding and practicing {req.topic}.",
                "difficulty": req.difficulty
            },
            {
                "id": "q2",
                "question": f"Which best describes the primary advantage of {req.topic}?",
                "options": ["High efficiency and scalability", "Zero abstraction cost", "Manual byte management", "Lack of concurrency"],
                "correct_answer": "High efficiency and scalability",
                "explanation": f"Scalability allows practical deployments of {req.topic}.",
                "difficulty": req.difficulty
            }
        ]
    
    return {"topic": req.topic, "difficulty": req.difficulty, "questions": questions}

@router.post("/quiz/submit")
async def submit_quiz(req: QuizSubmitRequest, current_user: UserProfile = Depends(get_current_user)):
    # Record attempt
    now = datetime.now(timezone.utc).isoformat()
    record = {
        "id": f"atm-{uuid.uuid4().hex[:8]}",
        "user_id": current_user.id,
        "username": current_user.username,
        "topic": req.topic,
        "answers": req.answers,
        "submitted_at": now
    }
    QUIZ_ATTEMPTS_STORE[record["id"]] = record
    return {"status": "success", "attempt_id": record["id"], "message": "Quiz submission recorded"}


# ----------------- 4. SOCIAL CONNECT & DIRECT MESSAGING -----------------

@router.post("/social/connect/{target_username}")
async def send_connect_request(target_username: str, current_user: UserProfile = Depends(get_current_user)):
    if target_username.lower() == current_user.username.lower():
        raise HTTPException(status_code=400, detail="Cannot send request to yourself")
    
    req_id = f"conn-{uuid.uuid4().hex[:8]}"
    conn = {
        "id": req_id,
        "sender_username": current_user.username,
        "receiver_username": target_username,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    CONNECTIONS_STORE[req_id] = conn
    return conn

@router.get("/social/requests")
async def get_received_requests(current_user: UserProfile = Depends(get_current_user)):
    received = [
        c for c in CONNECTIONS_STORE.values() 
        if c["receiver_username"].lower() == current_user.username.lower() and c["status"] == "pending"
    ]
    return received

@router.post("/social/requests/{req_id}/accept")
async def accept_request(req_id: str, current_user: UserProfile = Depends(get_current_user)):
    if req_id not in CONNECTIONS_STORE:
        raise HTTPException(status_code=404, detail="Request not found")
    conn = CONNECTIONS_STORE[req_id]
    if conn["receiver_username"].lower() != current_user.username.lower():
        raise HTTPException(status_code=403, detail="Unauthorized")
    conn["status"] = "accepted"
    return conn

@router.post("/social/requests/{req_id}/decline")
async def decline_request(req_id: str, current_user: UserProfile = Depends(get_current_user)):
    if req_id not in CONNECTIONS_STORE:
        raise HTTPException(status_code=404, detail="Request not found")
    conn = CONNECTIONS_STORE[req_id]
    if conn["receiver_username"].lower() != current_user.username.lower():
        raise HTTPException(status_code=403, detail="Unauthorized")
    conn["status"] = "declined"
    return conn

@router.get("/social/friends")
async def get_friends(current_user: UserProfile = Depends(get_current_user)):
    u = current_user.username.lower()
    friends = []
    for c in CONNECTIONS_STORE.values():
        if c["status"] == "accepted":
            if c["sender_username"].lower() == u:
                friends.append({"connection_id": c["id"], "username": c["receiver_username"]})
            elif c["receiver_username"].lower() == u:
                friends.append({"connection_id": c["id"], "username": c["sender_username"]})
    return friends

@router.get("/social/users/search")
async def search_students(
    q: str = Query("", description="Username search query"),
    current_user: UserProfile = Depends(get_current_user)
):
    """Search registered students to connect with."""
    return await auth_service.search_users(q, exclude_username=current_user.username)


@router.get("/social/dm/{connection_id}")
async def get_direct_messages(connection_id: str, current_user: UserProfile = Depends(get_current_user)):
    """Retrieve persisted direct messages for a conversation."""
    return get_conversation_messages(connection_id)


@router.post("/social/dm/{connection_id}")
async def send_direct_message(
    connection_id: str,
    req: SendDMRequest,
    current_user: UserProfile = Depends(get_current_user)
):
    """Send a direct message via HTTP and broadcast in real-time over WebSocket."""
    receiver = "StudyPartner"
    if connection_id in CONNECTIONS_STORE:
        conn = CONNECTIONS_STORE[connection_id]
        if conn["sender_username"].lower() == current_user.username.lower():
            receiver = conn["receiver_username"]
        else:
            receiver = conn["sender_username"]

    msg = await save_direct_message(
        connection_id=connection_id,
        sender_username=current_user.username,
        receiver_username=receiver,
        text=req.message
    )

    # Broadcast to active WebSockets in real time
    await ws_manager.broadcast_to_room(connection_id, {
        "type": "message",
        "data": msg
    })

    return msg


@router.websocket("/ws/chat/{connection_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    connection_id: str,
    username: Optional[str] = Query(default="Student")
):
    """
    Real-time WebSocket endpoint for 1:1 direct chat, live typing indicators, and presence.
    """
    user_name = username.strip() if username and username.strip() else "Student"
    await ws_manager.connect(websocket, connection_id, user_name)

    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type", "message")

            if event_type == "message":
                text = data.get("text", "").strip()
                if text:
                    receiver = data.get("receiver_username", "StudyPartner")
                    saved_msg = await save_direct_message(
                        connection_id=connection_id,
                        sender_username=user_name,
                        receiver_username=receiver,
                        text=text
                    )
                    # Broadcast to everyone in room including sender
                    await ws_manager.broadcast_to_room(connection_id, {
                        "type": "message",
                        "data": saved_msg
                    })

            elif event_type == "typing":
                is_typing = bool(data.get("is_typing", False))
                await ws_manager.broadcast_to_room(connection_id, {
                    "type": "typing",
                    "username": user_name,
                    "is_typing": is_typing
                }, exclude_socket=websocket)

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, connection_id, user_name)
        await ws_manager.broadcast_to_room(connection_id, {
            "type": "presence",
            "username": user_name,
            "status": "offline"
        })
    except Exception as exc:
        ws_manager.disconnect(websocket, connection_id, user_name)



# ----------------- 5. PROGRESS & ANALYTICS -----------------

@router.get("/progress/stats")
async def get_progress_stats(current_user: UserProfile = Depends(get_current_user)):
    """Return rich progress analytics from persistent progress_store."""
    stats = await progress_store.get_user_progress_stats(current_user.id, current_user.username)
    return stats


# ----------------- 6. PRACTICE DRILLS -----------------

@router.post("/practice/generate")
async def generate_practice_questions(
    req: PracticeGenerateRequest,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Generate AI-powered practice drill questions on any topic.
    Returns 5 questions with hints, concept tags, XP values, and difficulty labels.
    """
    prompt = (
        f"Generate exactly {req.count} practice drill questions about '{req.topic}' "
        f"at '{req.difficulty}' difficulty level for a student.\n\n"
        "Return ONLY raw JSON (no markdown, no code fences). "
        "JSON must be a list of objects each with these exact keys:\n"
        "- 'question': string — clear, exam-style question\n"
        "- 'options': list of 4 strings (A, B, C, D answers)\n"
        "- 'correct_answer': string — must be one of the 4 options exactly\n"
        "- 'hint': string — one-sentence hint that doesn't give it away\n"
        "- 'explanation': string — thorough explanation of why the answer is correct\n"
        "- 'concept_tag': string — one short concept label (e.g. 'Arrays', 'Photosynthesis')\n"
        "- 'xp_value': integer — 5 for Beginner, 10 for Intermediate, 20 for Advanced\n"
        "- 'difficulty': string — must be one of: Beginner, Intermediate, Advanced\n\n"
        "Only output the raw JSON array."
    )

    questions = []
    try:
        import json as _json
        raw = await gemini_service.generate_answer(prompt)
        clean = raw.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        if clean.startswith("```"):
            clean = clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        parsed = _json.loads(clean.strip())
        for i, item in enumerate(parsed[:req.count]):
            questions.append(PracticeQuestion(
                id=f"pq-{uuid.uuid4().hex[:8]}",
                question=item.get("question", "Question unavailable"),
                options=item.get("options", ["A", "B", "C", "D"]),
                correct_answer=item.get("correct_answer", ""),
                hint=item.get("hint", "Think carefully about the core concept."),
                explanation=item.get("explanation", "Review this concept in your materials."),
                difficulty=item.get("difficulty", req.difficulty),
                concept_tag=item.get("concept_tag", req.topic),
                xp_value=int(item.get("xp_value", 10))
            ))
    except Exception as e:
        # Fallback: return a demo question
        for i in range(min(req.count, 3)):
            questions.append(PracticeQuestion(
                id=f"pq-{uuid.uuid4().hex[:8]}",
                question=f"Sample question #{i+1} about {req.topic}. (Configure GEMINI_API_KEY for real questions)",
                options=[f"Option A about {req.topic}", "Option B — a common misconception", "Option C — partially correct", "Option D — the distractor"],
                correct_answer=f"Option A about {req.topic}",
                hint="Focus on the fundamental definition of this concept.",
                explanation=f"Option A is correct because it accurately describes the core principle of {req.topic}.",
                difficulty=req.difficulty,
                concept_tag=req.topic,
                xp_value={"Beginner": 5, "Intermediate": 10, "Advanced": 20}.get(req.difficulty, 10)
            ))

    return {"topic": req.topic, "difficulty": req.difficulty, "questions": questions}


@router.post("/practice/check")
async def check_practice_answer(
    req: PracticeCheckRequest,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Check a student's answer for a practice drill question.
    Awards XP on correct answers and records result in progress_store.
    """
    is_correct = req.chosen_answer.strip().lower() == req.correct_answer.strip().lower()
    earned_xp = req.xp_value if is_correct else 0

    # Generate a context-aware encouragement message from Gemini
    explanation = ""
    try:
        if is_correct:
            msg_prompt = (
                f"The student correctly answered a question about '{req.topic}'. "
                "Give a one-sentence encouraging message (max 15 words)."
            )
        else:
            msg_prompt = (
                f"The student answered a question about '{req.topic}' incorrectly. "
                f"The correct answer was: '{req.correct_answer}'. "
                "Give a one-sentence kind explanation (max 20 words) telling them why."
            )
        explanation = await gemini_service.generate_answer(msg_prompt)
        explanation = explanation.strip()
    except Exception:
        explanation = (
            "Well done! Keep it up!" if is_correct
            else f"The correct answer is: {req.correct_answer}. Review the concept and try again!"
        )

    # Persist result
    await progress_store.record_practice_result(
        user_id=current_user.id,
        username=current_user.username,
        topic=req.topic,
        difficulty="General",
        correct=is_correct,
        xp_earned=earned_xp
    )

    return PracticeCheckResponse(
        correct=is_correct,
        message="Correct! 🎉" if is_correct else "Not quite! 💪",
        earned_xp=earned_xp,
        correct_answer=req.correct_answer,
        explanation=explanation
    )

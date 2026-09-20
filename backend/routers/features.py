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

from models.user import UserProfile
from routers.auth import get_current_user
from models.extra import (
    Conversation, ChatMessage, SendMessageRequest,
    RoadmapRequest, StandaloneRoadmap, RoadmapDay,
    QuizGenerateRequest, QuizQuestion, QuizSubmitRequest,
    ConnectionStatus, DirectMessageItem, SendDMRequest
)
from services import gemini_service, auth_service
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
    user_id = current_user.id
    user_convs = [c for c in CONVERSATIONS_STORE.values() if c["user_id"] == user_id]
    user_convs.sort(key=lambda x: x["updated_at"], reverse=True)
    return user_convs

@router.post("/chat/conversations")
async def create_conversation(current_user: UserProfile = Depends(get_current_user)):
    cid = f"conv-{uuid.uuid4().hex[:8]}"
    conv = {
        "id": cid,
        "user_id": current_user.id,
        "title": "New Study Session",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "messages": []
    }
    CONVERSATIONS_STORE[cid] = conv
    return conv

@router.get("/chat/conversations/{cid}")
async def get_conversation(cid: str, current_user: UserProfile = Depends(get_current_user)):
    if cid not in CONVERSATIONS_STORE or CONVERSATIONS_STORE[cid]["user_id"] != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return CONVERSATIONS_STORE[cid]

@router.post("/chat/conversations/{cid}/messages")
async def send_chat_message(cid: str, req: SendMessageRequest, current_user: UserProfile = Depends(get_current_user)):
    if cid not in CONVERSATIONS_STORE or CONVERSATIONS_STORE[cid]["user_id"] != current_user.id:
        # Create auto if not exists
        CONVERSATIONS_STORE[cid] = {
            "id": cid,
            "user_id": current_user.id,
            "title": req.message[:30] + ("..." if len(req.message) > 30 else ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "messages": []
        }
    
    conv = CONVERSATIONS_STORE[cid]
    user_msg_id = f"msg-{uuid.uuid4().hex[:6]}"
    user_msg = {
        "id": user_msg_id,
        "role": "user",
        "content": req.message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    conv["messages"].append(user_msg)

    # Set title from first message
    if len(conv["messages"]) == 1:
        conv["title"] = req.message[:35] + ("..." if len(req.message) > 35 else "")

    # Call Gemini for response
    system_instruction = (
        "You are StudyGPT, a friendly, encouraging, and world-class personal AI Study Tutor. "
        "Explain concepts simply with intuitive analogies, structured markdown formatting, "
        "bullet points, and clear code examples where applicable. Break down difficult steps. "
        "Conclude with a brief thought-provoking check-for-understanding question."
    )
    prompt = f"{system_instruction}\n\nStudent asks: {req.message}"
    ai_answer = await gemini_service.generate_answer(prompt)

    ai_msg_id = f"msg-{uuid.uuid4().hex[:6]}"
    ai_msg = {
        "id": ai_msg_id,
        "role": "assistant",
        "content": ai_answer,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    conv["messages"].append(ai_msg)
    conv["updated_at"] = datetime.now(timezone.utc).isoformat()

    return {"user_message": user_msg, "assistant_message": ai_msg}


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
    user_convs = [c for c in CONVERSATIONS_STORE.values() if c["user_id"] == current_user.id]
    user_roadmaps = [r for r in ROADMAPS_STORE.values() if r["user_id"] == current_user.id]
    user_attempts = [a for a in QUIZ_ATTEMPTS_STORE.values() if a["user_id"] == current_user.id]
    
    total_messages = sum(len(c.get("messages", [])) for c in user_convs)

    return {
        "username": current_user.username,
        "total_xp": current_user.total_xp + len(user_attempts) * 25,
        "study_streak_days": 3,
        "quizzes_completed": len(user_attempts),
        "roadmaps_created": len(user_roadmaps),
        "conversations_count": len(user_convs),
        "total_questions_asked": total_messages // 2,
        "recent_activity": [
            {"date": "Day 1", "xp": 40, "quizzes": 1},
            {"date": "Day 2", "xp": 60, "quizzes": 2},
            {"date": "Day 3", "xp": 30, "quizzes": 1},
            {"date": "Day 4", "xp": 90, "quizzes": 3},
            {"date": "Day 5", "xp": 75, "quizzes": 2},
        ]
    }

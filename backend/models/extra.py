"""
Conversations, Roadmaps, Quizzes, and Social Models
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# --- Chat / AI Tutor Models ---
class ChatMessage(BaseModel):
    id: str
    role: str # "user" | "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Conversation(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    messages: List[ChatMessage] = []

class SendMessageRequest(BaseModel):
    message: str

# --- Standalone Roadmap Models ---
class RoadmapRequest(BaseModel):
    topic: str
    days: int = 5
    experience_level: str = "Beginner" # Beginner, Intermediate, Advanced

class RoadmapDay(BaseModel):
    day: int
    title: str
    learning_objective: str
    subtopics: List[str]
    practice_prompts: List[str]

class StandaloneRoadmap(BaseModel):
    id: str
    user_id: str
    topic: str
    days: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    schedule: List[RoadmapDay]

# --- Social Models ---
class ConnectionStatus(BaseModel):
    id: str
    sender_username: str
    receiver_username: str
    status: str # "pending" | "accepted" | "declined"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SendDMRequest(BaseModel):
    message: str

class DirectMessageItem(BaseModel):
    id: str
    connection_id: str
    sender_username: str
    receiver_username: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# --- Standalone Quiz & Practice Models ---
class QuizGenerateRequest(BaseModel):
    topic: str
    difficulty: str = "Medium" # Easy, Medium, Hard
    count: int = 5

class QuizQuestion(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_answer: str
    explanation: str
    difficulty: str

class QuizSubmitRequest(BaseModel):
    topic: str
    answers: Dict[str, str] # question_id -> chosen_answer

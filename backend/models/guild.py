"""
StudyGPT Backend — Guild Models

Pydantic schemas for the Guild Learning system:
- Creating Guilds & AI Roadmaps (Section 8.1)
- Generating Difficult AI Quizzes (Section 8.4)
- Analyzing Mistakes on >= 75% passes (Section 8.6)
- Leaderboard & XP Tracking (Section 8.7 - 8.9)
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class CreateGuildRoadmapRequest(BaseModel):
    """Request to create a guild and generate an AI-powered roadmap."""
    guild_name: str = Field(..., min_length=2, max_length=100, description="Name of the guild")
    topic: str = Field(..., min_length=2, max_length=200, description="What topic the guild is learning")
    notes_text: Optional[str] = Field(default="", description="Uploaded notes or extracted PDF text")
    duration_days: Optional[int] = Field(default=5, ge=3, le=14, description="Roadmap duration in days")


class GuildSummary(BaseModel):
    id: str
    name: str
    topic: str
    creator: str
    member_count: int
    days: List["RoadmapDay"]
    current_day: int
    unlocked_day: int
    user_xp: int
    completed_days: List[int]
    is_member: bool


class CreateGuildResponse(GuildSummary):
    pass


class JoinGuildResponse(GuildSummary):
    pass


class RoadmapDay(BaseModel):
    """A specific day's roadmap unit."""
    day_number: int = Field(..., description="Day number (1, 2, 3...)")
    title: str = Field(..., description="Title of the day's study topic")
    learning_objectives: List[str] = Field(default_factory=list, description="Key learning goals")
    key_concepts: List[str] = Field(default_factory=list, description="Key concepts to master")
    study_content: str = Field(..., description="Structured lesson content for this day")


class CreateGuildRoadmapResponse(BaseModel):
    """Response containing the generated guild roadmap."""
    guild_name: str
    topic: str
    days: List[RoadmapDay]


class GenerateGuildQuizRequest(BaseModel):
    """Request to generate a difficult AI quiz for a specific day."""
    topic: str = Field(..., description="The day's specific topic")
    day_number: int = Field(..., description="Current day number")
    material_text: Optional[str] = Field(default="", description="Source text/notes for the day")


class QuizQuestion(BaseModel):
    """A quiz question with difficulty and XP award."""
    id: int
    question: str
    options: List[str]
    correct_idx: int
    difficulty: str = Field(..., description="'easy' (10 XP) or 'hard' (20 XP)")
    xp: int = Field(..., description="10 for easy, 20 for hard")
    concept_tag: str = Field(..., description="Sub-topic or concept tested")
    explanation: str = Field(..., description="Explanation of why the correct answer is right")


class GenerateGuildQuizResponse(BaseModel):
    """Response containing the generated quiz."""
    topic: str
    day_number: int
    questions: List[QuizQuestion]


class SubmitQuizRequest(BaseModel):
    day_number: int = Field(..., ge=1)
    answers: List[Optional[int]]


class SubmitQuizResponse(BaseModel):
    guild: GuildSummary
    score_percent: int
    earned_xp: int
    passed: bool
    missed_questions: List["MissedQuestionDetail"]


class LeaderboardEntry(BaseModel):
    rank: int
    name: str
    daily_xp: int = 0
    total_xp: int
    passed: bool = False
    score_percent: int = 0
    is_current_user: bool
    xp: Optional[int] = None


class MissedQuestionDetail(BaseModel):
    """Details of a question the student answered incorrectly."""
    question: str
    chosen_answer: str
    correct_answer: str
    concept_tag: str


class AnalyzeMistakesRequest(BaseModel):
    """Request to analyze mistakes when a user passes with >= 75%."""
    topic: str
    day_number: int
    missed_questions: List[MissedQuestionDetail]


class ConceptAnalysis(BaseModel):
    """AI analysis of a specific missed concept."""
    concept: str
    reason_for_mistake: str
    suggested_review: str


class AnalyzeMistakesResponse(BaseModel):
    """Response with identified concepts and improvement suggestions."""
    topic: str
    day_number: int
    analyses: List[ConceptAnalysis]
    overall_suggestions: List[str]

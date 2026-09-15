"""
StudyGPT Backend — Guild AI Service

Integrates with Google Gemini (gemini-3.6-flash) to:
1. Generate multi-day learning roadmaps from topics and uploaded materials (Section 8.1)
2. Generate difficult quizzes for each day's topic with 10/20 XP (Section 8.4 & 8.7)
3. Analyze incorrect questions on >= 75% passing scores and suggest improvements (Section 8.6)
"""

import json
import re
import google.generativeai as genai
from config import settings
from models.guild import (
    RoadmapDay,
    CreateGuildRoadmapResponse,
    QuizQuestion,
    GenerateGuildQuizResponse,
    MissedQuestionDetail,
    ConceptAnalysis,
    AnalyzeMistakesResponse,
)

_model = None


def get_guild_model():
    """Retrieve or initialize the Gemini model for Guild AI tasks."""
    global _model
    if not settings.is_configured():
        raise ValueError(
            "GEMINI_API_KEY is not configured in backend/.env. Please add your key."
        )
    if _model is None:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _model = genai.GenerativeModel(model_name=settings.GEMINI_MODEL)
    return _model


def _clean_json_output(raw_text: str) -> str:
    """Strip markdown code fencing if Gemini wraps JSON in ```json ... ```."""
    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return text.strip()


async def generate_guild_roadmap(
    guild_name: str, 
    topic: str, 
    notes_text: str = "", 
    duration_days: int = 5
) -> CreateGuildRoadmapResponse:
    """
    Generate an AI learning roadmap distributed across specific days (Section 8.1).
    """
    model = get_guild_model()

    material_context = f"\nUploaded Material/Notes:\n{notes_text[:3000]}" if notes_text else ""

    prompt = f"""You are an elite curriculum designer for StudyGPT.
Create a structured {duration_days}-day learning roadmap for a study guild called "{guild_name}".
The guild wants to master: "{topic}".
{material_context}

Distribute the roadmap progressively across {duration_days} days (Day 1 to Day {duration_days}).
Each day must focus on ONE primary topic.

Return ONLY a valid JSON object matching this schema:
{{
  "days": [
    {{
      "day_number": 1,
      "title": "Clear concise topic title",
      "learning_objectives": ["Goal 1", "Goal 2"],
      "key_concepts": ["Concept 1", "Concept 2", "Concept 3"],
      "study_content": "A detailed, structured lesson summary for this day (at least 200 words, including real-world analogies, core theory, and code or examples where relevant)."
    }}
  ]
}}
Do NOT include extra commentary outside the JSON.
"""

    response = model.generate_content(prompt)
    cleaned = _clean_json_output(response.text)
    
    try:
        data = json.loads(cleaned)
        days = [RoadmapDay(**item) for item in data.get("days", [])]
        return CreateGuildRoadmapResponse(guild_name=guild_name, topic=topic, days=days)
    except Exception as e:
        # Fallback to structured fallback if JSON parsing has an issue
        fallback_days = [
            RoadmapDay(
                day_number=i + 1,
                title=f"{topic} — Part {i + 1}",
                learning_objectives=[f"Master foundational concept {i + 1}"],
                key_concepts=[f"{topic} core principle {i + 1}"],
                study_content=f"Day {i + 1} deep dive into {topic}. Focus on mastering the key principles and foundational practices.",
            )
            for i in range(duration_days)
        ]
        return CreateGuildRoadmapResponse(guild_name=guild_name, topic=topic, days=fallback_days)


async def generate_difficult_quiz(
    topic: str, 
    day_number: int, 
    material_text: str = ""
) -> GenerateGuildQuizResponse:
    """
    Generate a difficult quiz using AI for a specific day's roadmap topic (Section 8.4).
    Rules: Easy question = 10 XP, Hard question = 20 XP (Section 8.7).
    """
    model = get_guild_model()

    context = f"\nContext Material:\n{material_text[:2000]}" if material_text else ""

    prompt = f"""You are a master examiner for StudyGPT.
Generate a **difficult** 4-question multiple-choice quiz for Day {day_number} on the topic: "{topic}".
{context}

Requirements:
1. Provide exactly 4 questions.
2. Mix difficulty:
   - Question 1: "easy" (10 XP) - foundational check
   - Question 2: "hard" (20 XP) - deep edge-case, complexity, or scenario
   - Question 3: "hard" (20 XP) - difficult conceptual question
   - Question 4: "easy" (10 XP) - practical application check
3. Each question must have exactly 4 options.
4. "correct_idx" must be an integer from 0 to 3.
5. Provide a concept_tag for mistake analysis (e.g. "Pointer Traversal", "Time Complexity").
6. Provide an explanation for why the correct option is right.

Return ONLY a valid JSON object matching this schema:
{{
  "questions": [
    {{
      "id": 1,
      "question": "The question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_idx": 0,
      "difficulty": "easy",
      "xp": 10,
      "concept_tag": "Concept Name",
      "explanation": "Why this answer is correct..."
    }}
  ]
}}
Do NOT include extra commentary outside the JSON.
"""

    response = model.generate_content(prompt)
    cleaned = _clean_json_output(response.text)

    try:
        data = json.loads(cleaned)
        questions = [QuizQuestion(**q) for q in data.get("questions", [])]
        return GenerateGuildQuizResponse(topic=topic, day_number=day_number, questions=questions)
    except Exception as e:
        # Fallback question set
        fallback_questions = [
            QuizQuestion(
                id=1,
                question=f"What is the primary characteristic of {topic}?",
                options=["Static structure", "Dynamic allocation", "Linear scanning only", "Manual compilation"],
                correct_idx=1,
                difficulty="easy",
                xp=10,
                concept_tag=f"{topic} Fundamentals",
                explanation=f"{topic} relies on dynamic allocation and structured components.",
            ),
            QuizQuestion(
                id=2,
                question=f"Which edge-case is most critical when processing {topic}?",
                options=["Null/empty state check", "Excessive CPU voltage", "Fixed register size", "Integer overflow only"],
                correct_idx=0,
                difficulty="hard",
                xp=20,
                concept_tag="Edge Cases",
                explanation="Always verify boundary conditions like null or empty inputs.",
            ),
            QuizQuestion(
                id=3,
                question=f"What is the asymptotic time complexity for lookup in {topic} in worst-case?",
                options=["O(1)", "O(n)", "O(n²)", "O(log n)"],
                correct_idx=1,
                difficulty="hard",
                xp=20,
                concept_tag="Time Complexity",
                explanation="Standard sequential access requires traversing elements one-by-one, leading to O(n).",
            ),
            QuizQuestion(
                id=4,
                question=f"When should you prefer {topic} over alternative designs?",
                options=["When frequent middle insertions are needed", "When array indexes are known", "When cache locality is #1 priority", "When no memory is available"],
                correct_idx=0,
                difficulty="easy",
                xp=10,
                concept_tag="Design Trade-offs",
                explanation="Dynamic node structures excel when sizes vary frequently and middle insertions occur.",
            )
        ]
        return GenerateGuildQuizResponse(topic=topic, day_number=day_number, questions=fallback_questions)


async def analyze_quiz_mistakes(
    topic: str,
    day_number: int,
    missed_questions: list[MissedQuestionDetail]
) -> AnalyzeMistakesResponse:
    """
    Analyze questions answered incorrectly when a user scores >= 75% (Section 8.6).
    Identifies concepts related to mistakes and suggests specific topics to improve.
    """
    if not missed_questions:
        return AnalyzeMistakesResponse(
            topic=topic,
            day_number=day_number,
            analyses=[],
            overall_suggestions=["Flawless performance! You answered every question correctly."]
        )

    model = get_guild_model()

    missed_summary = "\n".join([
        f"- Question: {m.question}\n  Student Answer: {m.chosen_answer}\n  Correct Answer: {m.correct_answer}\n  Concept: {m.concept_tag}"
        for m in missed_questions
    ])

    prompt = f"""You are the StudyGPT tutor analyzing a student's quiz mistakes.
The student scored 75% or higher on Day {day_number} ({topic}), passing the quiz, but got the following questions wrong:

{missed_summary}

Analyze their mistakes:
1. For each missed question, identify the exact conceptual misconception.
2. Provide a 1-sentence targeted review tip for that concept.
3. Provide 1-2 overall suggestions on what specific topics they need to improve before proceeding to the next day.

Return ONLY a valid JSON object matching this schema:
{{
  "analyses": [
    {{
      "concept": "Name of concept",
      "reason_for_mistake": "Why the student likely got confused",
      "suggested_review": "Specific 1-sentence revision advice"
    }}
  ],
  "overall_suggestions": [
    "Review X concept specifically to solidify your understanding",
    "Pay special attention to Y edge cases in future days"
  ]
}}
Do NOT include extra commentary outside the JSON.
"""

    response = model.generate_content(prompt)
    cleaned = _clean_json_output(response.text)

    try:
        data = json.loads(cleaned)
        analyses = [ConceptAnalysis(**a) for a in data.get("analyses", [])]
        overall = data.get("overall_suggestions", [])
        return AnalyzeMistakesResponse(
            topic=topic,
            day_number=day_number,
            analyses=analyses,
            overall_suggestions=overall,
        )
    except Exception as e:
        fallback_analyses = [
            ConceptAnalysis(
                concept=m.concept_tag,
                reason_for_mistake=f"Confusion between chosen answer '{m.chosen_answer}' and correct rule.",
                suggested_review=f"Review the core definitions of {m.concept_tag} in {topic}.",
            )
            for m in missed_questions
        ]
        return AnalyzeMistakesResponse(
            topic=topic,
            day_number=day_number,
            analyses=fallback_analyses,
            overall_suggestions=[f"Spend 5 minutes reviewing {m.concept_tag} before moving to the next day." for m in missed_questions]
        )

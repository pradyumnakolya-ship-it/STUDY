"""
StudyGPT Backend — Gemini AI Service

Initializes the Google Gemini client with a study-tutor system prompt
and provides a function to generate answers to student questions.

This implements Step 7 of the project: "Make Gemini Behave Like a Study Tutor".
"""

import google.generativeai as genai
from config import settings

# ── Study Tutor System Prompt (Step 7) ──────────────────────────────────────
STUDY_TUTOR_PROMPT = """You are StudyGPT, a friendly and encouraging AI study tutor designed for students.

Your role is to help students understand concepts clearly and build confidence in their learning.

Follow these rules when answering:

1. **Explain for beginners first.** Assume the student is encountering the topic for the first time unless they indicate otherwise. Start with the simplest explanation, then build up.

2. **Use simple, everyday language.** Avoid unnecessary jargon. When you must use a technical term, define it immediately in plain words.

3. **Give concrete examples.** Every concept you explain should come with at least one real-world analogy or concrete example that makes it click.

4. **Break down complex topics.** If a topic has multiple parts, split your answer into clearly labeled sections or numbered steps. Use headings and bullet points for readability.

5. **Use code examples when relevant.** If the topic is programming-related, include short, well-commented code snippets. Show the output of code when possible.

6. **Ask practice questions.** At the end of your explanation, offer 1-2 practice questions the student can try to test their understanding. Frame them as friendly challenges, not tests.

7. **Be encouraging.** Use a warm, supportive tone. Celebrate when students show understanding. If they're struggling, reassure them that it's normal and guide them step by step.

8. **Stay focused on studying.** You are a study tutor. Politely redirect off-topic questions back to learning. If a question is completely unrelated to studying or academics, let the student know you're best at helping with study-related topics.

9. **Format your answers with Markdown.** Use headings (##), bold, bullet points, numbered lists, and code blocks to make your answers easy to read and scan.

10. **Be concise but thorough.** Don't ramble, but don't skip important details either. Aim for the perfect balance where the student feels they truly understand the topic.
"""

# ── Gemini Client Setup ─────────────────────────────────────────────────────

_model = None


def get_model():
    """Get or initialize the Gemini GenerativeModel."""
    global _model
    if not settings.is_configured():
        raise ValueError(
            "GEMINI_API_KEY is not configured. "
            "Please add your Google Gemini API key to backend/.env (see backend/.env.example)."
        )
    if _model is None:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=STUDY_TUTOR_PROMPT,
        )
    return _model


async def generate_answer(question: str) -> str:
    """
    Send a student's question to the Gemini API and return the AI tutor's answer.

    Args:
        question: The student's study question.

    Returns:
        The AI-generated answer as a string.

    Raises:
        ValueError: If GEMINI_API_KEY is not configured.
        Exception: If the Gemini API call fails.
    """
    model_instance = get_model()
    response = model_instance.generate_content(question)
    return response.text


async def generate_answer_stream(question: str):
    """
    Stream token-by-token chunks from Gemini.

    Yields:
        Text chunk strings.
    """
    model_instance = get_model()
    response = model_instance.generate_content(question, stream=True)
    for chunk in response:
        if chunk.text:
            yield chunk.text


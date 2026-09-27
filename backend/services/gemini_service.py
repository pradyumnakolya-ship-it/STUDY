"""
StudyGPT Backend — Gemini AI Service (Production Multi-Key & Quota Management)

Includes key pool rotation, BYOK (Bring Your Own Key), fallback models,
and response caching to survive Play Store multi-user scale under free-tier limits.
"""

import time
import logging
import hashlib
from typing import Optional, List, Dict
import google.generativeai as genai
from config import settings

logger = logging.getLogger(__name__)

# ── Study Tutor System Prompt ──────────────────────────────────────────────
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

# ── Response Cache (TTL = 1 hour) ──────────────────────────────────────────
_RESPONSE_CACHE: Dict[str, Dict] = {}  # hash -> {"text": str, "timestamp": float}
_CACHE_TTL_SECONDS = 3600

# Key rotation index
_KEY_INDEX = 0

# Models fallback sequence (most capable → most available)
FALLBACK_MODELS = [
    "gemini-3.5-flash",
    "gemini-2.5-flash-preview-05-20",
    "gemini-2.0-flash",
]


def _get_cache_key(question: str, model_name: str) -> str:
    raw = f"{model_name}:{question.strip().lower()}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def _get_cached_response(question: str, model_name: str) -> Optional[str]:
    key = _get_cache_key(question, model_name)
    if key in _RESPONSE_CACHE:
        entry = _RESPONSE_CACHE[key]
        if time.time() - entry["timestamp"] < _CACHE_TTL_SECONDS:
            logger.info("Serving Gemini response from cache.")
            return entry["text"]
    return None


def _set_cached_response(question: str, model_name: str, response_text: str):
    key = _get_cache_key(question, model_name)
    _RESPONSE_CACHE[key] = {
        "text": response_text,
        "timestamp": time.time(),
    }


def get_next_api_key(byok_key: Optional[str] = None) -> str:
    """Return explicit BYOK key if provided, else cycle through server API keys."""
    global _KEY_INDEX
    if byok_key and len(byok_key.strip()) > 10:
        return byok_key.strip()

    keys = settings.get_gemini_keys()
    if not keys:
        if settings.GEMINI_API_KEY:
            return settings.GEMINI_API_KEY
        raise ValueError(
            "GEMINI_API_KEY is not configured. "
            "Please add your Google Gemini API key to backend/.env"
        )

    selected_key = keys[_KEY_INDEX % len(keys)]
    _KEY_INDEX = (_KEY_INDEX + 1) % len(keys)
    return selected_key


def get_model(api_key: Optional[str] = None, model_name: Optional[str] = None):
    """Initialize a Gemini GenerativeModel with specific key and model name."""
    key = api_key or get_next_api_key()
    genai.configure(api_key=key)
    target_model = model_name or settings.GEMINI_MODEL
    return genai.GenerativeModel(
        model_name=target_model,
        system_instruction=STUDY_TUTOR_PROMPT,
    )


async def generate_answer(question: str, byok_key: Optional[str] = None) -> str:
    """
    Generate study tutor answer with API key pool rotation, response caching,
    and automatic fallback across models on 429 quota exhaustion.
    """
    # 1. Check Cache
    target_model = settings.GEMINI_MODEL
    cached = _get_cached_response(question, target_model)
    if cached:
        return cached

    # 2. Key pool & fallback loop
    keys_to_try = [byok_key] if (byok_key and len(byok_key.strip()) > 10) else settings.get_gemini_keys()
    if not keys_to_try:
        keys_to_try = [settings.GEMINI_API_KEY] if settings.GEMINI_API_KEY else []

    models_to_try = [target_model] + [m for m in FALLBACK_MODELS if m != target_model]

    last_error = None
    for model_name in models_to_try:
        for key in keys_to_try:
            try:
                genai.configure(api_key=key)
                model_inst = genai.GenerativeModel(
                    model_name=model_name,
                    system_instruction=STUDY_TUTOR_PROMPT,
                )
                res = model_inst.generate_content(question)
                if res and res.text:
                    _set_cached_response(question, target_model, res.text)
                    return res.text
            except Exception as e:
                last_error = e
                err_msg = str(e).lower()
                logger.warning(f"Gemini call failed with model={model_name}: {e}")
                if any(kw in err_msg for kw in ("429", "quota", "resource_exhausted", "not found", "no longer available", "not supported")):
                    continue

    # Friendly fallback if all quotas exhausted or models unavailable
    if last_error:
        err_str = str(last_error).lower()
        if any(kw in err_str for kw in ("429", "quota", "resource_exhausted", "not found", "no longer available", "not supported")):
            return (
                "⚠️ **Public AI Quota Exceeded**\n\n"
                "Our public AI service is currently receiving a high volume of requests. "
                "Please try your question again in 1 minute!\n\n"
                "💡 *Tip for Unlimited Access:* You can enter your own free Gemini API key in **Settings** to bypass public limits completely."
            )

    raise last_error or Exception("Failed to generate answer from Gemini API.")


async def generate_answer_stream(question: str, byok_key: Optional[str] = None):
    """Stream token-by-token chunks from Gemini with key fallback."""
    key = get_next_api_key(byok_key)
    genai.configure(api_key=key)
    model_instance = genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        system_instruction=STUDY_TUTOR_PROMPT,
    )
    try:
        response = model_instance.generate_content(question, stream=True)
        for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        if "429" in str(e).lower() or "quota" in str(e).lower():
            yield "\n\n⚠️ *Public AI quota limit reached. Please try again in 1 minute or add a custom Gemini API key in Settings.*"
        else:
            raise e

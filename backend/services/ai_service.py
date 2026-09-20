"""
StudyGPT Backend — Unified Multi-AI Service

Coordinates and routes AI tutoring requests across multiple frontier LLM providers:
- Google Gemini (gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash)
- OpenAI ChatGPT (gpt-4o, gpt-4o-mini, gpt-3.5-turbo)
- Anthropic Claude (claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022)
- xAI Grok (grok-2-latest, grok-beta)

All models share StudyGPT's signature pedagogical system prompt to ensure high-quality,
encouraging, step-by-step student explanations with analogies and practice questions.
"""

import logging
from typing import Dict, Any, List, Optional
import httpx
from config import settings
from services.gemini_service import STUDY_TUTOR_PROMPT, generate_answer as gemini_generate_answer

logger = logging.getLogger(__name__)

# ── Model Registry & Metadata ───────────────────────────────────────────────

AVAILABLE_MODELS = [
    # Google Gemini
    {
        "id": "gemini-1.5-flash",
        "provider": "gemini",
        "name": "Gemini 1.5 Flash",
        "provider_display": "Google Gemini",
        "badge": "Fast & Smart",
        "description": "Lightning fast, great for quick study explanations and instant concept checks.",
        "icon": "Sparkles",
        "env_var": "GEMINI_API_KEY",
    },
    {
        "id": "gemini-1.5-pro",
        "provider": "gemini",
        "name": "Gemini 1.5 Pro",
        "provider_display": "Google Gemini",
        "badge": "Deep Academic",
        "description": "Excellent for long-form study, complex scientific papers, and deep code analysis.",
        "icon": "Sparkles",
        "env_var": "GEMINI_API_KEY",
    },

    # OpenAI ChatGPT
    {
        "id": "gpt-4o-mini",
        "provider": "openai",
        "name": "ChatGPT (GPT-4o Mini)",
        "provider_display": "OpenAI ChatGPT",
        "badge": "Fast & Balanced",
        "description": "Affordable and intelligent tutor for everyday study questions and homework help.",
        "icon": "Bot",
        "env_var": "OPENAI_API_KEY",
    },
    {
        "id": "gpt-4o",
        "provider": "openai",
        "name": "ChatGPT (GPT-4o)",
        "provider_display": "OpenAI ChatGPT",
        "badge": "Flagship Reasoning",
        "description": "State-of-the-art multimodal tutor with exceptional reasoning across STEM & humanities.",
        "icon": "Bot",
        "env_var": "OPENAI_API_KEY",
    },

    # Anthropic Claude
    {
        "id": "claude-3-5-haiku-20241022",
        "provider": "anthropic",
        "name": "Claude 3.5 Haiku",
        "provider_display": "Anthropic Claude",
        "badge": "Rapid & Clear",
        "description": "Fast and articulate explanations with exceptional writing clarity.",
        "icon": "Brain",
        "env_var": "ANTHROPIC_API_KEY",
    },
    {
        "id": "claude-3-5-sonnet-20241022",
        "provider": "anthropic",
        "name": "Claude 3.5 Sonnet",
        "provider_display": "Anthropic Claude",
        "badge": "Master Pedagogy",
        "description": "Exceptional nuance, coding instruction, and structured breakdown of hard theories.",
        "icon": "Brain",
        "env_var": "ANTHROPIC_API_KEY",
    },

    # xAI Grok
    {
        "id": "grok-2-latest",
        "provider": "grok",
        "name": "Grok 2",
        "provider_display": "xAI Grok",
        "badge": "Direct & Witty",
        "description": "Straightforward, intuitive, no-fluff answers with fresh problem-solving insights.",
        "icon": "Zap",
        "env_var": "XAI_API_KEY",
    },
    {
        "id": "grok-beta",
        "provider": "grok",
        "name": "Grok Beta",
        "provider_display": "xAI Grok",
        "badge": "Experimental",
        "description": "Cutting-edge Grok model tuned for rapid coding and technical reasoning.",
        "icon": "Zap",
        "env_var": "XAI_API_KEY",
    },
]


def get_models_catalog() -> List[Dict[str, Any]]:
    """
    Return all supported AI models decorated with real-time configuration status.
    """
    catalog = []
    for m in AVAILABLE_MODELS:
        provider = m["provider"]
        is_configured = settings.is_provider_configured(provider)
        catalog.append({
            **m,
            "is_configured": is_configured,
            "is_default": (provider == "gemini" and m["id"] == "gemini-1.5-flash"),
        })
    return catalog


# ── Provider Implementation Callers ─────────────────────────────────────────

async def _call_gemini(question: str, model_id: Optional[str] = None) -> str:
    """Call Google Gemini using google-generativeai SDK."""
    if not settings.is_provider_configured("gemini"):
        raise ValueError(
            "Google Gemini API key is not configured. "
            "Please add GEMINI_API_KEY to your backend/.env file."
        )
    
    # Use specified model or fallback to configured setting
    target_model = model_id or settings.GEMINI_MODEL
    
    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model_instance = genai.GenerativeModel(
        model_name=target_model,
        system_instruction=STUDY_TUTOR_PROMPT,
    )
    response = model_instance.generate_content(question)
    if not response or not response.text:
        raise RuntimeError("Empty response received from Gemini.")
    return response.text


async def _call_openai(question: str, model_id: Optional[str] = None) -> str:
    """Call OpenAI ChatGPT API via HTTP."""
    if not settings.is_provider_configured("openai"):
        raise ValueError(
            "OpenAI API key is not configured. "
            "Please add OPENAI_API_KEY to your backend/.env file."
        )

    target_model = model_id or settings.OPENAI_MODEL
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": target_model,
        "messages": [
            {"role": "system", "content": STUDY_TUTOR_PROMPT},
            {"role": "user", "content": question},
        ],
        "temperature": 0.7,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(url, headers=headers, json=payload)
        if res.status_code != 200:
            error_text = res.text
            try:
                err_json = res.json()
                error_text = err_json.get("error", {}).get("message", error_text)
            except Exception:
                pass
            raise RuntimeError(f"OpenAI API error ({res.status_code}): {error_text}")

        data = res.json()
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError("No answer choice returned by OpenAI.")
        return choices[0]["message"]["content"]


async def _call_anthropic(question: str, model_id: Optional[str] = None) -> str:
    """Call Anthropic Claude API via HTTP."""
    if not settings.is_provider_configured("anthropic"):
        raise ValueError(
            "Anthropic Claude API key is not configured. "
            "Please add ANTHROPIC_API_KEY to your backend/.env file."
        )

    target_model = model_id or settings.ANTHROPIC_MODEL
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": settings.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": target_model,
        "max_tokens": 4096,
        "system": STUDY_TUTOR_PROMPT,
        "messages": [
            {"role": "user", "content": question},
        ],
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(url, headers=headers, json=payload)
        if res.status_code != 200:
            error_text = res.text
            try:
                err_json = res.json()
                error_text = err_json.get("error", {}).get("message", error_text)
            except Exception:
                pass
            raise RuntimeError(f"Anthropic API error ({res.status_code}): {error_text}")

        data = res.json()
        content = data.get("content", [])
        if not content:
            raise RuntimeError("No content returned by Anthropic Claude.")
        return "".join([block.get("text", "") for block in content if block.get("type") == "text"])


async def _call_grok(question: str, model_id: Optional[str] = None) -> str:
    """Call xAI Grok API via HTTP (OpenAI-compatible format)."""
    if not settings.is_provider_configured("grok"):
        raise ValueError(
            "xAI Grok API key is not configured. "
            "Please add XAI_API_KEY (or GROK_API_KEY) to your backend/.env file."
        )

    target_model = model_id or settings.GROK_MODEL
    url = "https://api.x.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.XAI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": target_model,
        "messages": [
            {"role": "system", "content": STUDY_TUTOR_PROMPT},
            {"role": "user", "content": question},
        ],
        "temperature": 0.7,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(url, headers=headers, json=payload)
        if res.status_code != 200:
            error_text = res.text
            try:
                err_json = res.json()
                error_text = err_json.get("error", {}).get("message", error_text)
            except Exception:
                pass
            raise RuntimeError(f"xAI Grok API error ({res.status_code}): {error_text}")

        data = res.json()
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError("No answer choice returned by Grok.")
        return choices[0]["message"]["content"]


# ── Unified Public Interface ────────────────────────────────────────────────

async def generate_study_answer(
    question: str,
    provider: Optional[str] = "gemini",
    model: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Route question to the chosen AI provider and return the study tutor answer
    along with resolved provider and model metadata.

    Args:
        question: Student's study prompt.
        provider: 'gemini', 'openai' / 'chatgpt', 'anthropic' / 'claude', or 'grok' / 'xai'.
        model: Specific model ID (optional, defaults to provider best practice).

    Returns:
        Dict with keys: answer, provider, model, provider_display.
    """
    prov = (provider or "gemini").lower().strip()

    # Normalize aliases
    if prov in ("chatgpt", "gpt"):
        prov = "openai"
    elif prov in ("claude",):
        prov = "anthropic"
    elif prov in ("xai",):
        prov = "grok"
    elif prov in ("google",):
        prov = "gemini"

    # Resolve default model ID if not explicitly specified
    resolved_model = model
    if not resolved_model:
        if prov == "gemini":
            resolved_model = settings.GEMINI_MODEL
        elif prov == "openai":
            resolved_model = settings.OPENAI_MODEL
        elif prov == "anthropic":
            resolved_model = settings.ANTHROPIC_MODEL
        elif prov == "grok":
            resolved_model = settings.GROK_MODEL

    display_names = {
        "gemini": "Google Gemini",
        "openai": "OpenAI ChatGPT",
        "anthropic": "Anthropic Claude",
        "grok": "xAI Grok",
    }

    if prov == "gemini":
        answer = await _call_gemini(question, resolved_model)
    elif prov == "openai":
        answer = await _call_openai(question, resolved_model)
    elif prov == "anthropic":
        answer = await _call_anthropic(question, resolved_model)
    elif prov == "grok":
        answer = await _call_grok(question, resolved_model)
    else:
        raise ValueError(
            f"Unsupported AI provider '{provider}'. "
            "Supported options are: 'gemini', 'chatgpt' (OpenAI), 'claude' (Anthropic), and 'grok' (xAI)."
        )

    return {
        "answer": answer,
        "provider": prov,
        "model": resolved_model or "default",
        "provider_display": display_names.get(prov, prov.capitalize()),
    }


async def generate_study_answer_stream(
    question: str,
    provider: Optional[str] = "gemini",
    model: Optional[str] = None,
):
    """
    Async generator that streams study tutor answer chunks token by token.

    Gemini supports native streaming via the SDK; other providers yield the full
    answer as a single chunk (still consistent SSE protocol from the client's perspective).

    Yields:
        str: Text chunks / tokens.
    """
    prov = (provider or "gemini").lower().strip()

    # Normalize aliases
    if prov in ("chatgpt", "gpt"):
        prov = "openai"
    elif prov in ("claude",):
        prov = "anthropic"
    elif prov in ("xai",):
        prov = "grok"
    elif prov in ("google",):
        prov = "gemini"

    # Resolve model
    resolved_model = model
    if not resolved_model:
        if prov == "gemini":
            resolved_model = settings.GEMINI_MODEL
        elif prov == "openai":
            resolved_model = settings.OPENAI_MODEL
        elif prov == "anthropic":
            resolved_model = settings.ANTHROPIC_MODEL
        elif prov == "grok":
            resolved_model = settings.GROK_MODEL

    if prov == "gemini":
        # Native Gemini streaming via google-generativeai SDK
        if not settings.is_provider_configured("gemini"):
            raise ValueError("Google Gemini API key is not configured.")
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model_instance = genai.GenerativeModel(
            model_name=resolved_model or settings.GEMINI_MODEL,
            system_instruction=STUDY_TUTOR_PROMPT,
        )
        response = model_instance.generate_content(question, stream=True)
        for chunk in response:
            if chunk.text:
                yield chunk.text
    else:
        # Non-streaming providers: call normally and yield full answer as one chunk
        result = await generate_study_answer(question, provider=prov, model=resolved_model)
        yield result["answer"]

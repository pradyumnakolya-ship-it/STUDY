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
    # Google Gemini (Free Tier via Google AI Studio)
    {
        "id": "gemini-3.8-flash",
        "provider": "gemini",
        "name": "Gemini 3.8 Flash (Free Tier)",
        "provider_display": "Google Gemini",
        "badge": "Free & Fast",
        "description": "Lightning-fast free tier model on Google AI Studio, optimized for study explanations and instant concept checks.",
        "icon": "Sparkles",
        "env_var": "GEMINI_API_KEY",
        "is_free": True,
    },
    {
        "id": "gemini-3.5-flash",
        "provider": "gemini",
        "name": "Gemini 3.5 Flash (Free Tier)",
        "provider_display": "Google Gemini",
        "badge": "Next-Gen Free",
        "description": "Next-generation model with generous free-tier quotas on Google AI Studio.",
        "icon": "Sparkles",
        "env_var": "GEMINI_API_KEY",
        "is_free": True,
    },
    {
        "id": "gemini-flash-latest",
        "provider": "gemini",
        "name": "Gemini Flash Latest (Free Tier)",
        "provider_display": "Google Gemini",
        "badge": "Ultra Fast",
        "description": "Ultra lightweight, high-speed free tier model for rapid question answering.",
        "icon": "Sparkles",
        "env_var": "GEMINI_API_KEY",
        "is_free": True,
    },

    # OpenAI ChatGPT (Lightweight / Free-Credit Tier)
    {
        "id": "gpt-4o-mini",
        "provider": "openai",
        "name": "GPT-4o Mini",
        "provider_display": "OpenAI ChatGPT",
        "badge": "Fast & Efficient",
        "description": "OpenAI's most cost-efficient, high-speed tutor for study questions and homework guidance.",
        "icon": "Bot",
        "env_var": "OPENAI_API_KEY",
        "is_free": False,
    },
    {
        "id": "gpt-3.5-turbo",
        "provider": "openai",
        "name": "GPT-3.5 Turbo",
        "provider_display": "OpenAI ChatGPT",
        "badge": "Standard Light",
        "description": "Lightweight and reliable model suitable for straightforward study help.",
        "icon": "Bot",
        "env_var": "OPENAI_API_KEY",
        "is_free": False,
    },

    # Anthropic Claude (Lightweight / Haiku Tier)
    {
        "id": "claude-3-5-haiku-20241022",
        "provider": "anthropic",
        "name": "Claude 3.5 Haiku",
        "provider_display": "Anthropic Claude",
        "badge": "Rapid & Clear",
        "description": "Anthropic's fastest and most cost-effective model with exceptional writing and explanation clarity.",
        "icon": "Brain",
        "env_var": "ANTHROPIC_API_KEY",
        "is_free": False,
    },
    {
        "id": "claude-3-haiku-20240307",
        "provider": "anthropic",
        "name": "Claude 3 Haiku",
        "provider_display": "Anthropic Claude",
        "badge": "Lightweight",
        "description": "Compact and rapid response model for instant study tutoring.",
        "icon": "Brain",
        "env_var": "ANTHROPIC_API_KEY",
        "is_free": False,
    },

    # xAI Grok (Fast / Beta Tier)
    {
        "id": "grok-beta",
        "provider": "grok",
        "name": "Grok Beta",
        "provider_display": "xAI Grok",
        "badge": "Fast Beta",
        "description": "Fast-paced Grok model tuned for rapid study reasoning and problem-solving.",
        "icon": "Zap",
        "env_var": "XAI_API_KEY",
        "is_free": False,
    },
    {
        "id": "grok-2-latest",
        "provider": "grok",
        "name": "Grok 2",
        "provider_display": "xAI Grok",
        "badge": "Direct & Witty",
        "description": "Straightforward, intuitive answers with fresh problem-solving insights.",
        "icon": "Zap",
        "env_var": "XAI_API_KEY",
        "is_free": False,
    },
]


def get_models_catalog() -> List[Dict[str, Any]]:
    """
    Return only free-credit models decorated with real-time configuration status.
    """
    catalog = []
    for m in AVAILABLE_MODELS:
        if not m["is_free"]:
            continue
        provider = m["provider"]
        is_configured = settings.is_provider_configured(provider)
        catalog.append({
            **m,
            "is_configured": is_configured,
            "is_default": (provider == "gemini" and m["id"] == "gemini-3.8-flash"),
        })
    return catalog


def _get_free_model(model_id: Optional[str], provider: str) -> Dict[str, Any]:
    """Resolve a requested model while enforcing the free-credit policy."""
    candidates = [m for m in AVAILABLE_MODELS if m["is_free"] and m["provider"] == provider]
    if model_id:
        for model in candidates:
            if model["id"] == model_id:
                return model
        raise ValueError("Only configured free-credit models are available. Select a free Gemini model.")
    if candidates:
        return candidates[0]
    raise ValueError("Only configured free-credit models are available. Select a free Gemini model.")


# ── Provider Implementation Callers ─────────────────────────────────────────

async def _call_gemini(question: str, model_id: Optional[str] = None, byok_key: Optional[str] = None) -> str:
    """Call Google Gemini using gemini_service with multi-key rotation and caching."""
    if not settings.is_provider_configured("gemini") and not (byok_key and len(byok_key.strip()) > 10):
        raise ValueError(
            "Google Gemini API key is not configured. "
            "Please add GEMINI_API_KEY to your backend/.env file or configure a custom API key in settings."
        )
    return await gemini_generate_answer(question, byok_key=byok_key)



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
    byok_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Route question to the chosen AI provider and return the study tutor answer
    along with resolved provider and model metadata.
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

    free_model = _get_free_model(model, prov)

    # Resolve default model ID if not explicitly specified
    resolved_model = free_model["id"]

    display_names = {
        "gemini": "Google Gemini",
        "openai": "OpenAI ChatGPT",
        "anthropic": "Anthropic Claude",
        "grok": "xAI Grok",
    }

    if prov == "gemini":
        answer = await _call_gemini(question, resolved_model, byok_key=byok_key)
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
    byok_key: Optional[str] = None,
):
    """
    Async generator that streams study tutor answer chunks token by token.
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

    free_model = _get_free_model(model, prov)
    resolved_model = free_model["id"]

    if prov == "gemini":
        async for chunk in gemini_service.generate_answer_stream(question, byok_key=byok_key):
            yield chunk
    else:
        result = await generate_study_answer(question, provider=prov, model=resolved_model, byok_key=byok_key)
        yield result["answer"]


"""
StudyGPT Backend — Configuration

Loads environment variables from .env file.
"""

import os
from dotenv import load_dotenv

# Load .env file from the backend directory
load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    # AI Model Settings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = os.getenv("ANTHROPIC_MODEL", "claude-3-5-haiku-20241022")

    XAI_API_KEY: str = os.getenv("XAI_API_KEY") or os.getenv("GROK_API_KEY", "")
    GROK_MODEL: str = os.getenv("GROK_MODEL", "grok-2-latest")

    # CORS — allowed origins for the frontend
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Database & Authentication
    MONGO_URL: str = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    MONGO_DB: str = os.getenv("MONGO_DB", "studygpt")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-studygpt-jwt-key-2026-change-in-prod")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_MINUTES: int = int(os.getenv("JWT_EXPIRATION_MINUTES", "10080"))  # 7 days

    def is_configured(self) -> bool:
        """Check if at least one valid AI API key is configured (defaults to Gemini check)."""
        return self.is_provider_configured("gemini")

    def is_provider_configured(self, provider: str) -> bool:
        """Check if an API key is configured for a specific AI provider."""
        p = provider.lower()
        if p in ("gemini", "google"):
            return bool(self.GEMINI_API_KEY and self.GEMINI_API_KEY != "your_gemini_api_key_here")
        if p in ("openai", "chatgpt"):
            return bool(self.OPENAI_API_KEY and self.OPENAI_API_KEY != "your_openai_api_key_here")
        if p in ("anthropic", "claude"):
            return bool(self.ANTHROPIC_API_KEY and self.ANTHROPIC_API_KEY != "your_anthropic_api_key_here")
        if p in ("xai", "grok"):
            return bool(self.XAI_API_KEY and self.XAI_API_KEY != "your_xai_api_key_here")
        return False

    def get_provider_status(self) -> dict:
        """Return configuration status of all supported AI providers."""
        return {
            "gemini": self.is_provider_configured("gemini"),
            "openai": self.is_provider_configured("openai"),
            "anthropic": self.is_provider_configured("anthropic"),
            "grok": self.is_provider_configured("grok"),
        }

    def validate(self) -> None:
        """Raise an error if no AI provider is configured."""
        if not any(self.get_provider_status().values()):
            raise ValueError(
                "No AI API key is configured. "
                "Please configure at least GEMINI_API_KEY in backend/.env"
            )


settings = Settings()

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

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

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
        """Check if a valid Gemini API key is configured."""
        return bool(self.GEMINI_API_KEY and self.GEMINI_API_KEY != "your_gemini_api_key_here")

    def validate(self) -> None:
        """Raise an error if required settings are missing."""
        if not self.is_configured():
            raise ValueError(
                "GEMINI_API_KEY is not set. "
                "Copy backend/.env.example to backend/.env and add your key."
            )


settings = Settings()

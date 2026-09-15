"""
StudyGPT Backend — Main Application

FastAPI entry point with CORS middleware and route registration.

Run with:
    uvicorn main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers.ask import router as ask_router
from routers.guilds import router as guilds_router
from routers.auth import router as auth_router
from routers.features import router as features_router
import database

# ── App Initialization ──────────────────────────────────────────────────────

app = FastAPI(
    title="StudyGPT API",
    description="AI-powered study tutor backend for StudyGPT Web",
    version="0.2.0",
)

# ── CORS Middleware ─────────────────────────────────────────────────────────
# Allow the Next.js frontend (localhost:3000) to call the API

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ──────────────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(ask_router)
app.include_router(guilds_router)
app.include_router(features_router)


@app.get("/health")
async def health_check():
    """Health check endpoint to verify the server is running."""
    return {"status": "ok", "service": "StudyGPT API"}


# ── Startup Validation ─────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    """Check configuration on startup and connect to database."""
    await database.connect_db()
    if not settings.is_configured():
        print("\n" + "=" * 70)
        print("NOTICE: GEMINI_API_KEY is not configured yet in backend/.env.")
        print("The server is running! Add your key to backend/.env to enable AI answers.")
        print("=" * 70 + "\n")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up database connections on shutdown."""
    await database.close_db()

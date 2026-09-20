# 🚀 StudyGPT — Deployment Guide

## Overview

StudyGPT is a full-stack AI-powered study platform consisting of:

- **Backend**: FastAPI (Python) — serves REST API + WebSocket on port `8000`
- **Frontend**: Next.js (TypeScript) — serves UI on port `3000`
- **Database**: MongoDB — primary data store, auto-falls back to local JSON files

---

## Prerequisites

| Tool | Min Version |
|------|-------------|
| Docker | 24+ |
| Docker Compose | 2.20+ |
| Node.js | 20 LTS |
| Python | 3.11+ |
| Git | Any |

---

## Local Development (No Docker)

### 1. Clone & Setup

```bash
git clone <repo-url>
cd STUDY
```

### 2. Backend Setup

```bash
cd backend

# Create .env file
cp .env.example .env
# Add your GEMINI_API_KEY to .env:
# GEMINI_API_KEY=your_key_here
# JWT_SECRET=some_long_random_secret_string
# MONGODB_URL=mongodb://localhost:27017/studygpt  (optional)

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at: **http://localhost:8000**
API docs: **http://localhost:8000/docs**

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: **http://localhost:3000**

---

## Docker Deployment (Recommended)

### 1. Configure Environment

Create `backend/.env`:

```env
GEMINI_API_KEY=your_google_gemini_api_key
JWT_SECRET=your_very_long_random_jwt_secret_here
MONGODB_URL=mongodb://studygpt:studygpt_secret@mongo:27017/studygpt?authSource=admin
```

> **⚠️ IMPORTANT**: Never commit `.env` to version control. It is in `.gitignore`.

### 2. Build & Launch

```bash
# From the STUDY/ root directory
docker compose up --build -d
```

This starts:
- MongoDB on port `27017`
- FastAPI backend on port `8000`
- Next.js frontend on port `3000`

### 3. Check Status

```bash
docker compose ps
docker compose logs backend --tail 50
docker compose logs frontend --tail 50
```

### 4. Stop

```bash
docker compose down          # Stop (keep data volumes)
docker compose down -v       # Stop + delete all data
```

---

## Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

Expected output: All `test_auth`, `test_rag`, `test_guilds` tests passing.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini API key from [AI Studio](https://aistudio.google.com/) |
| `JWT_SECRET` | ✅ Yes | Secret key for signing JWT tokens (min 32 chars) |
| `MONGODB_URL` | ⚠️ Optional | MongoDB connection string. Falls back to JSON files if omitted |
| `DATABASE_NAME` | No | MongoDB DB name (default: `studygpt`) |

---

## API Endpoints Summary

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, get JWT |
| GET | `/auth/me` | Get current user profile |

### AI Tutor (Chat)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/chat/conversations` | List all conversations |
| POST | `/chat/conversations` | Create new conversation |
| DELETE | `/chat/conversations/{id}` | Delete conversation |
| POST | `/chat/conversations/{id}/messages` | Send message (sync) |
| POST | `/chat/conversations/{id}/messages/stream` | Send message (SSE stream) |

### Materials & RAG
| Method | Path | Description |
|--------|------|-------------|
| POST | `/materials/upload` | Upload PDF or text file |
| GET | `/materials` | List user's materials |
| POST | `/materials/{id}/query` | Ask question on specific doc |
| POST | `/materials/query` | Cross-doc search |
| DELETE | `/materials/{id}` | Delete a material |

### Roadmap
| Method | Path | Description |
|--------|------|-------------|
| POST | `/roadmap/generate` | Generate day-by-day study plan |

### Quiz
| Method | Path | Description |
|--------|------|-------------|
| POST | `/quiz/generate` | Generate quiz questions |
| POST | `/quiz/submit` | Submit answers, get score |

### Practice Drills
| Method | Path | Description |
|--------|------|-------------|
| POST | `/practice/generate` | Generate practice drill questions |
| POST | `/practice/check` | Check answer, award XP |

### Progress
| Method | Path | Description |
|--------|------|-------------|
| GET | `/progress/stats` | Get full analytics (XP, streak, charts) |

### Social
| Method | Path | Description |
|--------|------|-------------|
| GET | `/social/users/search?q=` | Search students |
| POST | `/social/connections/send` | Send connection request |
| POST | `/social/dm/{cid}/send` | Send direct message |
| WS | `/ws/chat/{cid}?username=` | WebSocket DM channel |

---

## Architecture

```
STUDY/
├── backend/              # FastAPI Python backend
│   ├── main.py           # App entry point
│   ├── routers/          # API route handlers
│   │   ├── auth.py       # /auth/*
│   │   ├── features.py   # /chat, /roadmap, /quiz, /practice, /progress, /social
│   │   └── materials.py  # /materials (RAG)
│   ├── services/         # Business logic
│   │   ├── gemini_service.py      # Gemini AI calls
│   │   ├── conversation_store.py  # Chat persistence
│   │   ├── progress_store.py      # XP/streak tracking
│   │   ├── material_store.py      # Material persistence
│   │   ├── rag_service.py         # PDF chunking + TF-IDF
│   │   ├── websocket_manager.py   # WebSocket rooms
│   │   └── auth_service.py        # User CRUD
│   ├── models/           # Pydantic models
│   ├── tests/            # Pytest test suite
│   ├── data/             # JSON fallback store (auto-created)
│   ├── Dockerfile
│   ├── pytest.ini
│   └── requirements.txt
├── frontend/             # Next.js TypeScript frontend
│   ├── src/app/          # App Router pages
│   │   ├── home/         # Dashboard
│   │   ├── chat/         # AI Tutor (streaming SSE)
│   │   ├── materials/    # RAG Document Q&A
│   │   ├── practice/     # Practice Drills
│   │   ├── progress/     # Analytics dashboard
│   │   ├── quiz/         # Quizzes
│   │   ├── roadmap/      # Roadmap generator
│   │   └── connect/      # Social + WebSocket DMs
│   ├── src/lib/api.ts    # All API helpers
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

---

## Data Persistence

All data is stored in **two layers**:

1. **MongoDB** (primary) — when `MONGODB_URL` is configured
2. **JSON files** (fallback) — `backend/data/*.json` when MongoDB is unavailable

Files persisted:
- `conversations.json` — chat sessions
- `progress.json` — XP, streaks, quiz/drill history
- `materials.json` — uploaded document metadata + chunks
- `messages.json` — WebSocket DM messages
- `users.json` — user accounts

---

## Security Notes

> [!CAUTION]
> Before deploying to production:

- Change `JWT_SECRET` to a cryptographically random 64+ character string
- Set `MONGODB_URL` with strong credentials
- Run behind a reverse proxy (Nginx/Caddy) with HTTPS
- Set `CORS` origins to your actual domain in `main.py`
- Never expose `.env` or `data/*.json` publicly

---

## Getting a Gemini API Key

1. Go to [https://aistudio.google.com/](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click **"Get API Key"** → **"Create API Key"**
4. Copy the key into `backend/.env` as `GEMINI_API_KEY=...`

The free tier supports up to **1,500 requests/day**.

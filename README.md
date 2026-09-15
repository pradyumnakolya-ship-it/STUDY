# StudyGPT Web

An AI-powered study platform built for students. Ask questions, get explanations, generate roadmaps, take quizzes, and learn together in guilds.

## Tech Stack

| Component | Technology |
|---|---|
| Frontend | Next.js + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Python + FastAPI |
| AI | Google Gemini API |

## Getting Started

### Prerequisites

- **Python 3.10+** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **Google Gemini API Key** — [Get one here](https://aistudio.google.com/apikey)

### 1. Backend Setup

```bash


# Create virtual environment
python -m venv venv

# Activate it (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
copy .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start the server
uvicorn main:app --reload
```

The API will be running at `http://localhost:8000`. Visit `http://localhost:8000/docs` for the Swagger UI.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The web app will be running at `http://localhost:3000`.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/ask` | Ask the AI tutor a question |

### Example: Ask a Question

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Explain linked lists in simple terms"}'
```

## Project Structure

```
studyGPT/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Environment settings
│   ├── models/
│   │   └── ask.py           # Request/response schemas
│   ├── routers/
│   │   └── ask.py           # /ask endpoint
│   └── services/
│       └── gemini_service.py # Gemini AI with tutor prompt
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx         # Home page
│   │   └── chat/page.tsx    # AI Tutor chat
│   └── ...
└── README.md
```

## Current Status

Steps 1–7 of the development plan are implemented:
- ✅ Project setup
- ✅ FastAPI server
- ✅ `/ask` API endpoint
- ✅ Gemini API integration
- ✅ Study tutor system prompt
- ✅ Web frontend with chat interface

See `StudyGPT_Web_Project_Documentation (1).md` for the full development plan.

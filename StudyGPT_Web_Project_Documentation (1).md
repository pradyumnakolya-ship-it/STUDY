# StudyGPT Web — Project Documentation

> **Pivot note:** StudyGPT was originally planned as a Flutter Android app. This version of the documentation re-scopes the project as a **website** and adds authentication, a ChatGPT/Claude-style chat interface, a social connect system, and a full Guild Learning feature. Flashcards have been removed from the feature set.

---

## 1. Project Overview

StudyGPT is an AI-powered study platform, now built as a **web application**, designed for students.

The application allows students to:
- Sign up and log in with a unique username (like ChatGPT / Claude).
- Ask study questions and receive AI explanations in a chat-style interface.
- Enter a topic and receive a structured study roadmap.
- Upload study materials such as PDFs/notes.
- Ask questions based on uploaded materials (RAG).
- Generate quizzes.
- Practice questions.
- Track learning progress.
- Connect with other users (follow/add, accept requests) and chat with them directly.
- Create or join **Guilds** — group learning spaces with AI-generated roadmaps, daily quizzes, XP, and leaderboards.

---

## 2. Technology Stack

| Component | Technology |
|---|---|
| Frontend | React (Next.js) + TypeScript + Tailwind CSS |
| UI Components | shadcn/ui |
| Backend | Python + FastAPI |
| AI | Google Gemini API |
| Database | MongoDB |
| Real-time Chat / Notifications | WebSockets (FastAPI WebSocket or Socket.IO) |
| Authentication | JWT (httpOnly cookies) + bcrypt password hashing, optional Google OAuth |
| PDF/Document Processing | Python libraries |
| RAG | Embeddings + Vector Database |
| File Storage | Cloud object storage (e.g. S3-compatible) for uploaded PDFs/notes |
| Deployment | Frontend on Vercel; backend on a cloud server; MongoDB Atlas |

---

## 3. Overall Architecture

```
Browser (Web App)
        |
        | HTTPS / WebSocket
        v
   FastAPI Backend
        |
        +----------------+----------------+----------------+
        |                |                |                |
        v                v                v                v
    MongoDB          Gemini API       File Storage      WebSocket
        |                |                |             Gateway
  Users, Follows     AI answers       PDFs/Notes            |
  Guilds, Chats       Roadmaps                        Live chat &
  Roadmaps, XP                                         notifications
  Quiz results
        |
        v
   RAG System
        |
        v
  Vector Database
```

The web frontend communicates with the FastAPI backend over HTTPS for normal requests and over WebSocket for live chat, follow requests, and quiz/leaderboard updates. The Gemini API key remains on the backend only.

---

## 4. Feature List (MVP)

1. Authentication & unique usernames
2. AI Tutor (ChatGPT/Claude-style chat interface)
3. Topic → Study Roadmap
4. Study Material Upload
5. RAG over uploaded materials
6. Practice Questions
7. Quiz Generation
8. Progress Tracking
9. Social Connect System (follow/add, accept requests, direct chat)
10. Guild Learning (shared roadmap, daily quizzes, XP, leaderboards)

**Removed from scope:** Flashcards.

---

## 5. Authentication & Account System

Login and signup are modeled after ChatGPT and Claude's account flows.

**Sign up:**
- Email
- Password
- Username (see uniqueness rule below)

**Login:**
- Email + password, or
- "Continue with Google" (optional OAuth)

**Session handling:**
- JWT issued on login, stored in an httpOnly cookie.
- Password reset via emailed link.

### Username Uniqueness Rule
- Every user's username must be different from every other user's username.
- The username field has a **unique index** in MongoDB, so the database rejects duplicates at the storage layer as a second line of defense.
- The signup form checks username availability in real time as the user types (e.g. "This username is taken").
- The username — not the email — is what's shown to other users across the app (profile, guilds, chat, leaderboards).

**Planned backend components:** `User` model (email, hashed password, unique username, avatar, created_at), `/auth/signup`, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/check-username`.

Status: Planned

---

## 6. AI Tutor — Chat-Style Interface

The AI Tutor screen is built to feel like ChatGPT or Claude's chat interface rather than a form-based Q&A page.

- **Left sidebar:** list of past conversations, grouped (Today, Previous 7 days, Older), with a "New chat" button.
- **Main panel:** chat bubbles — student questions right-aligned, AI answers left-aligned.
- AI responses are rendered with a Markdown renderer so headings, code blocks, and lists display correctly.
- Responses stream in token-by-token rather than appearing all at once.
- Each conversation is saved per user in MongoDB and can be reopened later.

**Planned backend components:** `Conversation` model, `Message` model, `POST /chat/{conversation_id}/message`, `GET /chat/conversations`, `GET /chat/{conversation_id}`.

Status: Planned (backend `/ask` endpoint already completed — see Step 6 below; this step upgrades it into a full conversational interface)

---

## 7. Social Connect System

A follow/connect system similar to Instagram, layered with a private chat interface.

### Connecting
- Users can search for other users by username.
- A user can send a **connect/follow request** to another user.
- The receiving user sees the request and can **Accept** or **Decline** it.
- Once accepted, the two users are connected (mutual follow) and a direct chat becomes available between them.
- Users can view their **Followers**, **Following**, and **Pending requests** lists.

### Chat Interface
- Once a request is accepted, either user can open a 1:1 chat.
- Chat interface uses a message-bubble layout, similar to a standard chat box.
- Messages are delivered in real time over WebSocket.
- Chat history is stored per conversation in MongoDB.

**Planned backend components:** `Follow`/`ConnectionRequest` model (requester, recipient, status: pending/accepted/declined), `DirectMessage` model, endpoints:

```
POST   /users/{username}/connect      # send request
POST   /connections/{id}/accept
POST   /connections/{id}/decline
GET    /connections/requests          # pending requests received
GET    /connections/followers
GET    /connections/following
GET    /dm/{connection_id}
POST   /dm/{connection_id}/message
```

Status: Planned

---

## 8. Guild Learning Feature

Guild Learning is a group study feature. Its functionality is implemented exactly as specified below, with no additional features added and no changes to these rules.

### 8.1 Create a Guild
- Users can create a guild.
- While creating the guild, the app asks the user:
  - Guild name
  - What topic are you going to learn?
  - Upload PDFs or notes related to the topic.
- The AI uses the selected topic and the uploaded PDFs/notes to understand the learning material.
- Based on the selected topic and uploaded PDFs/notes, the AI automatically generates a learning roadmap.
- The AI distributes the roadmap's topics across specific days (Day 1, Day 2, Day 3, ...).

### 8.2 Join a Guild
- Other users can join an existing guild.
- All users in a guild follow the **same** AI-generated roadmap.

### 8.3 Daily Learning
- Each day of the roadmap has one particular topic assigned to it.
- Users must learn the topic assigned for that day before moving on.

### 8.4 AI-Generated Quiz
- After a day's learning topic, the AI generates a **difficult** quiz.
- The quiz is based on that specific day's roadmap topic and the guild's uploaded learning material.
- Other users in the same guild can also attend that day's quiz.

### 8.5 Quiz Result and Progression
- Score **≥ 75%** → the user may continue to the next day's roadmap topic.
- Score **< 75%** → the user may **not** continue to the next day's topic.
  - The user is told to learn that topic again.
  - After failing, the user must **retry the quiz** before being allowed to move on to the next day's topic.

### 8.6 Passing With 75% or Above
- When a user passes with 75% or above, the AI analyzes the questions they got wrong.
- It identifies the topics/concepts tied to those mistakes.
- The app shows the user their mistakes and suggests the specific topic(s) to improve.
- After the mistakes/suggestions are shown, the user is allowed to continue to the next day's roadmap topic.

### 8.7 XP System
- Easy question answered correctly = **10 XP**
- Hard question answered correctly = **20 XP**
- XP is awarded strictly based on questions answered correctly.

### 8.8 Daily Leaderboard
- At the end of each day's quiz, a leaderboard is generated for that guild.
- The leaderboard shows each user's XP and rank for that day/quiz.

### 8.9 Final Guild Leaderboard
- When the entire roadmap is completed, a final leaderboard is generated.
- All guild members are ranked by their total accumulated XP.
- The user with the highest total XP is declared the winner.
- A final message is displayed:

  > **"The winner of this guild is [User Name]."**

**Implemented backend components:** JSON-backed guild records containing the name, topic, creator, members, uploaded material, roadmap, quiz cache, attempts, and XP; PDF/text extraction; and endpoints:

```
POST   /guilds                          # create guild (name, topic, materials)
POST   /guilds/{id}/join
GET    /guilds/{id}/roadmap
GET    /guilds/{id}/day/{day_number}
POST   /guilds/{id}/day/{day_number}/quiz/generate
POST   /guilds/{id}/day/{day_number}/quiz/submit
GET    /guilds/{id}/day/{day_number}/leaderboard
GET    /guilds/{id}/leaderboard/final
```

Status: Implemented

---

## 9. Development Steps

### Step 1 — Plan the Application
MVP re-scoped for web: Authentication, AI Tutor (chat interface), Topic → Roadmap, Material Upload, Practice, Quizzes, Progress Tracking, Social Connect, Guild Learning.
Status: **Completed**

### Step 2 — Create the Python Project
Backend project and virtual environment set up.
Status: **Completed**

### Step 3 — Install FastAPI
FastAPI installed and a basic server confirmed running locally.
Status: **Completed**

### Step 4 — Create the /ask API
`POST /ask` endpoint created to receive a student's question via Pydantic model.
Status: **Completed**

### Step 5 — Connect Google Gemini
Gemini client configured with an API key stored in `.env` (kept out of version control).
Status: **Completed**

### Step 6 — Connect the AI to /ask
`/ask` returns Gemini-generated answers. This will later be upgraded into the full chat-conversation system described in Section 6.
Status: **Completed**

### Step 7 — Make Gemini Behave Like a Study Tutor
Give Gemini instructions to explain concepts for beginners, use simple language, give examples, break down topics, and ask practice questions when useful.
Status: **Next**

### Step 8 — Topic → Study Roadmap
Student enters a topic; AI generates a structured roadmap (topics, subtopics, recommended order, practice/revision sections).
Status: **Planned**

### Step 9 — Add MongoDB
Store users, conversations, roadmaps, quiz results, progress, guilds, connections, and chat history.
Status: **Planned**

### Step 10 — User Authentication & Unique Usernames
Implement signup/login, JWT sessions, and the unique-username system described in Section 5.
Status: **Planned**

### Step 11 — Upload Study Materials
Students (and guild creators) upload PDFs/notes; backend extracts text.
Status: **Planned**

### Step 12 — RAG for Uploaded Materials
Split extracted text into sections, embed, store in a vector database, and retrieve relevant sections to answer questions or generate guild quizzes.
Status: **Planned**

### Step 13 — Quiz Generation
Generate quizzes from a topic, roadmap section, or uploaded material (multiple choice, true/false, short answer), reused by the Guild quiz system.
Status: **Planned**

### Step 14 — Practice System
Practice questions by topic and difficulty level (Beginner/Intermediate/Advanced).
Status: **Planned**

### Step 15 — Progress Tracking
Track completed topics, quiz scores, practice results, roadmap progress, and study history.
Status: **Planned**

### Step 16 — Social Connect System
Build the follow/request/accept system and 1:1 chat interface described in Section 7.
Status: **Planned**

### Step 17 — Guild Learning Feature
Implement Guild creation, joining, daily roadmap distribution, AI quiz generation, 75% progression rule, mistake analysis, XP, and leaderboards exactly as specified in Section 8.
Status: **Planned**

### Step 18 — Build the Web Interface
Replace the FastAPI Swagger docs with a full web UI. Core screens:

```
Home
 |
 +-- AI Tutor (chat)
 +-- Study Roadmap
 +-- My Materials
 +-- Quizzes
 +-- Progress
 +-- Guilds
 +-- Connect (followers/following/requests + DM chat)
```

Status: **Planned**

### Step 18A — UI Tools and Recommended Web Interface Design

**Design tool:** Figma — lay out each screen before writing frontend code.

**Recommended stack:** Next.js (React) + TypeScript + Tailwind CSS + shadcn/ui. This gives a fast, component-driven setup with built-in dark-mode support and accessible primitives, without locking into a heavier framework.

**Recommended packages:**

| Purpose | Package |
|---|---|
| Charts for Progress screen | recharts |
| Markdown rendering (AI answers) | react-markdown |
| Real-time chat & notifications | socket.io-client (or native WebSocket) |
| Smooth loading states | react-loading-skeleton |
| Icons | lucide-react |
| Fonts | Inter (via next/font) |
| Animations (streaks, XP, level-ups) | framer-motion |

**Finalized color direction (carried over from the earlier design pass and reused for the website):**

| Token | Value | Purpose |
|---|---|---|
| Background | #0D0F16 | App background |
| Surface | #161923 | Cards, chat bubbles, nav |
| Surface (raised) | #1E2230 | Secondary surfaces (streak/XP card) |
| Border | #2A2E3D | Card and divider outlines |
| Text primary | #EDEEF3 | Main text |
| Text secondary | #9598AC | Supporting text |
| Accent | #6E7BFF | Buttons, active nav, highlights |
| Success | #3DD68C | Completed roadmap steps, correct answers, pass ≥75% |
| Warning | #F0B054 | Streak/XP badges, retry-required notice |

**Suggested look for each screen:**
- **Home** — grid of large rounded cards (AI Tutor, Roadmap, Materials, Quizzes, Progress, Guilds, Connect).
- **AI Tutor** — ChatGPT/Claude-style layout: sidebar of past chats + streaming chat bubbles with Markdown rendering.
- **Study Roadmap** — vertical stepper/timeline with a checkmark or progress ring per topic.
- **Quizzes** — one question per screen with an animated progress bar and large tappable answer cards.
- **Progress** — line/bar charts for study streaks and quiz scores.
- **Guilds** — guild list → guild detail page showing the day-by-day roadmap, today's topic, quiz entry point, daily leaderboard, and final leaderboard once complete.
- **Connect** — searchable user list, tabs for Followers / Following / Requests, and a chat panel opened from an accepted connection.

Status: **Planned**

### Step 19 — Testing
Test: authentication, AI responses, PDF uploads, RAG answers, quiz generation, guild roadmap generation and progression rules, XP/leaderboard accuracy, follow/request flow, chat delivery, database operations, API security.
Status: **Planned**

### Step 20 — Deployment
Deploy the FastAPI backend to a cloud server and the Next.js frontend (e.g. Vercel). MongoDB moves to a cloud database (e.g. MongoDB Atlas). The web app communicates with the deployed backend instead of localhost.
Status: **Planned**

---

## 10. Current Project Status

At this point, StudyGPT has a working basic AI backend, being re-platformed from an Android app plan into a website.

Current flow:

```
Student
   |
   | "Explain linked lists"
   v
POST /ask
   |
   v
FastAPI
   |
   v
Gemini API
   |
   v
AI-generated explanation
   |
   v
FastAPI response
   |
   v
Student
```

This is the first working version of the StudyGPT AI Tutor backend. Everything above it (auth, chat UI, social system, guilds) is planned.

---

## 11. Important Development Rule

We will build StudyGPT incrementally.
We will not create the entire application in one huge code file.

Each feature will be:
1. Explained.
2. Implemented.
3. Tested.
4. Added to this documentation.
5. Then we move to the next feature.

This documentation is the complete record of how StudyGPT (web) was built from the beginning.

"""
StudyGPT Backend — Guilds Router

Endpoints for the Guild Learning system (Section 8 of documentation):
- POST /guilds/create-roadmap (Section 8.1)
- POST /guilds/generate-quiz (Section 8.4)
- POST /guilds/analyze-mistakes (Section 8.6)
"""

from io import BytesIO

from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile
from pypdf import PdfReader
from models.guild import (
    CreateGuildResponse,
    CreateGuildRoadmapRequest,
    CreateGuildRoadmapResponse,
    GenerateGuildQuizRequest,
    GenerateGuildQuizResponse,
    AnalyzeMistakesRequest,
    AnalyzeMistakesResponse,
    LeaderboardEntry,
    SubmitQuizRequest,
    SubmitQuizResponse,
)
from services.guild_ai_service import (
    generate_guild_roadmap,
    generate_difficult_quiz,
    analyze_quiz_mistakes,
)
from services.guild_store import (
    create_guild,
    daily_leaderboard,
    final_leaderboard,
    get_guild,
    get_material,
    get_quiz,
    join_guild,
    list_guilds,
    save_quiz,
    submit_attempt,
)

router = APIRouter(prefix="/guilds", tags=["guilds"])


def _user_name(username: str) -> str:
    cleaned = username.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="X-User-Name cannot be empty")
    return cleaned[:100]


async def _extract_material(files: list[UploadFile], notes_text: str) -> str:
    parts = [notes_text.strip()] if notes_text.strip() else []
    for upload in files:
        content = await upload.read()
        filename = (upload.filename or "").lower()
        if filename.endswith(".pdf"):
            try:
                reader = PdfReader(BytesIO(content))
                text = "\n".join(page.extract_text() or "" for page in reader.pages)
            except Exception as exc:
                raise HTTPException(status_code=400, detail=f"Could not read {upload.filename}: {exc}") from exc
        else:
            text = content.decode("utf-8", errors="replace")
        if text.strip():
            parts.append(f"[{upload.filename}]\n{text.strip()}")
    return "\n\n".join(parts)[:100_000]


@router.post("", response_model=CreateGuildResponse)
async def create_guild_endpoint(
    guild_name: str = Form(...),
    topic: str = Form(...),
    duration_days: int = Form(5),
    notes_text: str = Form(""),
    files: list[UploadFile] = File(default=[]),
    x_user_name: str = Header(default="Harsha A", alias="X-User-Name"),
):
    """Create and persist a guild, its AI roadmap, and its source material."""
    username = _user_name(x_user_name)
    material = await _extract_material(files, notes_text)
    try:
        roadmap = await generate_guild_roadmap(guild_name, topic, material, duration_days)
        return create_guild(guild_name, topic, username, roadmap.days, material)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create guild: {exc}") from exc


@router.get("", response_model=list[CreateGuildResponse])
async def list_guilds_endpoint(x_user_name: str = Header(default="Harsha A", alias="X-User-Name")):
    return list_guilds(_user_name(x_user_name))


@router.post("/{guild_id}/join", response_model=CreateGuildResponse)
async def join_guild_endpoint(guild_id: str, x_user_name: str = Header(default="Harsha A", alias="X-User-Name")):
    try:
        return join_guild(guild_id, _user_name(x_user_name))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{guild_id}", response_model=CreateGuildResponse)
async def get_guild_endpoint(guild_id: str, x_user_name: str = Header(default="Harsha A", alias="X-User-Name")):
    try:
        return get_guild(guild_id, _user_name(x_user_name))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{guild_id}/day/{day_number}/quiz/generate", response_model=GenerateGuildQuizResponse)
async def generate_persisted_quiz_endpoint(
    guild_id: str,
    day_number: int,
    x_user_name: str = Header(default="Harsha A", alias="X-User-Name"),
):
    username = _user_name(x_user_name)
    try:
        guild, material = get_material(guild_id, username)
        if day_number > guild["members"][username]["unlocked_day"]:
            raise HTTPException(status_code=403, detail="Pass the previous day before taking this quiz")
        cached = get_quiz(guild_id, username, day_number)
        if cached:
            return {"topic": guild["days"][day_number - 1]["title"], "day_number": day_number, "questions": cached}
        day = guild["days"][day_number - 1]
        quiz = await generate_difficult_quiz(day["title"], day_number, f"{material}\n\n{day['study_content']}")
        save_quiz(guild_id, username, day_number, quiz.questions)
        return quiz
    except HTTPException:
        raise
    except (KeyError, IndexError) as exc:
        raise HTTPException(status_code=404, detail="Guild or roadmap day not found") from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate guild quiz: {exc}") from exc


@router.post("/{guild_id}/day/{day_number}/quiz/submit", response_model=SubmitQuizResponse)
async def submit_persisted_quiz_endpoint(
    guild_id: str,
    day_number: int,
    request: SubmitQuizRequest,
    x_user_name: str = Header(default="Harsha A", alias="X-User-Name"),
):
    if request.day_number != day_number:
        raise HTTPException(status_code=400, detail="The submitted day does not match the URL")
    try:
        return submit_attempt(guild_id, _user_name(x_user_name), day_number, request.answers)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{guild_id}/day/{day_number}/leaderboard", response_model=list[LeaderboardEntry])
async def daily_leaderboard_endpoint(
    guild_id: str,
    day_number: int,
    x_user_name: str = Header(default="Harsha A", alias="X-User-Name"),
):
    try:
        return daily_leaderboard(guild_id, _user_name(x_user_name), day_number)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.get("/{guild_id}/leaderboard/final", response_model=list[LeaderboardEntry])
async def final_leaderboard_endpoint(
    guild_id: str,
    x_user_name: str = Header(default="Harsha A", alias="X-User-Name"),
):
    try:
        rows = final_leaderboard(guild_id, _user_name(x_user_name))
        return [{**row, "total_xp": row["xp"]} for row in rows]
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.post("/create-roadmap", response_model=CreateGuildRoadmapResponse)
async def create_roadmap_endpoint(request: CreateGuildRoadmapRequest):
    """
    Section 8.1: Create a guild and generate an AI-powered learning roadmap
    distributed across specific days using the topic and uploaded notes/PDFs.
    """
    try:
        roadmap = await generate_guild_roadmap(
            guild_name=request.guild_name,
            topic=request.topic,
            notes_text=request.notes_text or "",
            duration_days=request.duration_days or 5,
        )
        return roadmap
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate guild roadmap: {str(e)}")


@router.post("/generate-quiz", response_model=GenerateGuildQuizResponse)
async def generate_quiz_endpoint(request: GenerateGuildQuizRequest):
    """
    Section 8.4: Generate a difficult AI quiz for a specific day's roadmap topic.
    Easy = 10 XP, Hard = 20 XP.
    """
    try:
        quiz = await generate_difficult_quiz(
            topic=request.topic,
            day_number=request.day_number,
            material_text=request.material_text or "",
        )
        return quiz
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")


@router.post("/analyze-mistakes", response_model=AnalyzeMistakesResponse)
async def analyze_mistakes_endpoint(request: AnalyzeMistakesRequest):
    """
    Section 8.6: Analyze incorrect questions when a user scores >= 75%.
    Identifies concepts related to mistakes and suggests specific topics to improve.
    """
    try:
        analysis = await analyze_quiz_mistakes(
            topic=request.topic,
            day_number=request.day_number,
            missed_questions=request.missed_questions,
        )
        return analysis
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze mistakes: {str(e)}")

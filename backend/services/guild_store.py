"""Persistent JSON-backed storage for guilds, members, quizzes, and attempts."""

import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from models.guild import RoadmapDay, QuizQuestion


_STORE_PATH = Path(__file__).resolve().parents[1] / "data" / "guilds.json"
_LOCK = threading.Lock()


def _load() -> dict[str, Any]:
    if not _STORE_PATH.exists():
        return {"guilds": {}}
    try:
        return json.loads(_STORE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"guilds": {}}


def _save(data: dict[str, Any]) -> None:
    _STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    temp_path = _STORE_PATH.with_suffix(".tmp")
    temp_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    temp_path.replace(_STORE_PATH)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _member_view(guild: dict[str, Any], username: str) -> dict[str, Any]:
    member = guild["members"].get(username)
    if member is None:
        return {"username": username, "total_xp": 0, "unlocked_day": 0, "completed_days": []}
    return {
        "username": username,
        "total_xp": member["total_xp"],
        "unlocked_day": member["unlocked_day"],
        "completed_days": member["completed_days"],
    }


def _guild_view(guild: dict[str, Any], username: str) -> dict[str, Any]:
    user = _member_view(guild, username)
    return {
        "id": guild["id"],
        "name": guild["name"],
        "topic": guild["topic"],
        "creator": guild["creator"],
        "member_count": len(guild["members"]),
        "days": guild["days"],
        "current_day": min(user["unlocked_day"], len(guild["days"])),
        "unlocked_day": user["unlocked_day"],
        "user_xp": user["total_xp"],
        "completed_days": user["completed_days"],
        "is_member": username in guild["members"],
    }


def create_guild(
    guild_name: str,
    topic: str,
    creator: str,
    days: list[RoadmapDay],
    material_text: str,
) -> dict[str, Any]:
    with _LOCK:
        data = _load()
        guild_id = f"guild-{uuid.uuid4().hex}"
        data["guilds"][guild_id] = {
            "id": guild_id,
            "name": guild_name,
            "topic": topic,
            "creator": creator,
            "material_text": material_text,
            "days": [day.model_dump() for day in days],
            "members": {
                creator: {
                    "total_xp": 0,
                    "unlocked_day": 1,
                    "completed_days": [],
                }
            },
            "quizzes": {},
            "attempts": [],
            "created_at": _now(),
        }
        _save(data)
        return _guild_view(data["guilds"][guild_id], creator)


def list_guilds(username: str) -> list[dict[str, Any]]:
    with _LOCK:
        data = _load()
        return [_guild_view(guild, username) for guild in data["guilds"].values()]


def get_guild(guild_id: str, username: str) -> dict[str, Any]:
    with _LOCK:
        guild = _load()["guilds"].get(guild_id)
        if guild is None:
            raise KeyError("Guild not found")
        return _guild_view(guild, username)


def join_guild(guild_id: str, username: str) -> dict[str, Any]:
    with _LOCK:
        data = _load()
        guild = data["guilds"].get(guild_id)
        if guild is None:
            raise KeyError("Guild not found")
        guild["members"].setdefault(
            username,
            {"total_xp": 0, "unlocked_day": 1, "completed_days": []},
        )
        _save(data)
        return _guild_view(guild, username)


def get_material(guild_id: str, username: str) -> tuple[dict[str, Any], str]:
    with _LOCK:
        data = _load()
        guild = data["guilds"].get(guild_id)
        if guild is None:
            raise KeyError("Guild not found")
        if username not in guild["members"]:
            raise PermissionError("Join the guild before accessing its material")
        return guild, guild["material_text"]


def save_quiz(guild_id: str, username: str, day_number: int, questions: list[QuizQuestion]) -> None:
    with _LOCK:
        data = _load()
        guild = data["guilds"].get(guild_id)
        if guild is None or username not in guild["members"]:
            raise PermissionError("Join the guild before taking its quiz")
        guild["quizzes"][str(day_number)] = [question.model_dump() for question in questions]
        _save(data)


def get_quiz(guild_id: str, username: str, day_number: int) -> list[dict[str, Any]] | None:
    with _LOCK:
        data = _load()
        guild = data["guilds"].get(guild_id)
        if guild is None:
            raise KeyError("Guild not found")
        if username not in guild["members"]:
            raise PermissionError("Join the guild before taking its quiz")
        return guild["quizzes"].get(str(day_number))


def submit_attempt(
    guild_id: str,
    username: str,
    day_number: int,
    answers: list[int | None],
) -> dict[str, Any]:
    with _LOCK:
        data = _load()
        guild = data["guilds"].get(guild_id)
        if guild is None:
            raise KeyError("Guild not found")
        member = guild["members"].get(username)
        if member is None:
            raise PermissionError("Join the guild before taking its quiz")
        questions = guild["quizzes"].get(str(day_number))
        if not questions:
            raise ValueError("Generate the day's quiz before submitting answers")
        if day_number > member["unlocked_day"]:
            raise PermissionError("Pass the previous day before taking this quiz")
        if len(answers) != len(questions):
            raise ValueError("Submit one answer for every quiz question")

        correct_count = sum(
            answer is not None and answer == question["correct_idx"]
            for answer, question in zip(answers, questions)
        )
        score_percent = round((correct_count / len(questions)) * 100)
        earned_xp = sum(
            question["xp"]
            for answer, question in zip(answers, questions)
            if answer is not None and answer == question["correct_idx"]
        )
        passed = score_percent >= 75
        missed = [
            {
                "question": question["question"],
                "chosen_answer": question["options"][answer] if answer is not None else "Unanswered",
                "correct_answer": question["options"][question["correct_idx"]],
                "concept_tag": question["concept_tag"],
            }
            for answer, question in zip(answers, questions)
            if answer is None or answer != question["correct_idx"]
        ]

        member["total_xp"] += earned_xp
        if passed and day_number not in member["completed_days"]:
            member["completed_days"].append(day_number)
            member["completed_days"].sort()
            member["unlocked_day"] = max(member["unlocked_day"], day_number + 1)
        guild["attempts"].append(
            {
                "username": username,
                "day_number": day_number,
                "score_percent": score_percent,
                "earned_xp": earned_xp,
                "passed": passed,
                "timestamp": _now(),
            }
        )
        _save(data)
        return {
            "guild": _guild_view(guild, username),
            "score_percent": score_percent,
            "earned_xp": earned_xp,
            "passed": passed,
            "missed_questions": missed,
        }


def daily_leaderboard(guild_id: str, username: str, day_number: int) -> list[dict[str, Any]]:
    with _LOCK:
        data = _load()
        guild = data["guilds"].get(guild_id)
        if guild is None:
            raise KeyError("Guild not found")
        if username not in guild["members"]:
            raise PermissionError("Join the guild before viewing the leaderboard")
        latest: dict[str, dict[str, Any]] = {}
        for attempt in guild["attempts"]:
            if attempt["day_number"] == day_number:
                latest[attempt["username"]] = attempt
        rows = []
        for member_name, member in guild["members"].items():
            attempt = latest.get(member_name)
            rows.append(
                {
                    "name": member_name,
                    "daily_xp": attempt["earned_xp"] if attempt else 0,
                    "total_xp": member["total_xp"],
                    "passed": attempt["passed"] if attempt else False,
                    "score_percent": attempt["score_percent"] if attempt else 0,
                    "is_current_user": member_name == username,
                }
            )
        rows.sort(key=lambda row: (-row["daily_xp"], -row["total_xp"], row["name"]))
        for index, row in enumerate(rows, start=1):
            row["rank"] = index
        return rows


def final_leaderboard(guild_id: str, username: str) -> list[dict[str, Any]]:
    with _LOCK:
        data = _load()
        guild = data["guilds"].get(guild_id)
        if guild is None:
            raise KeyError("Guild not found")
        if username not in guild["members"]:
            raise PermissionError("Join the guild before viewing the leaderboard")
        if any(len(member["completed_days"]) < len(guild["days"]) for member in guild["members"].values()):
            raise PermissionError("The final leaderboard is available after the roadmap is completed")
        rows = [
            {
                "name": member_name,
                "xp": member["total_xp"],
                "is_current_user": member_name == username,
            }
            for member_name, member in guild["members"].items()
        ]
        rows.sort(key=lambda row: (-row["xp"], row["name"]))
        for index, row in enumerate(rows, start=1):
            row["rank"] = index
        return rows

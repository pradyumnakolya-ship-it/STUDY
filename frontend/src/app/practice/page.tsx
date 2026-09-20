"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  Zap,
  Lightbulb,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RefreshCw,
  BookOpen,
  Target,
  Trophy,
  Loader2,
} from "lucide-react";

const API_BASE = "http://localhost:8000";

interface PracticeQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  hint: string;
  explanation: string;
  difficulty: string;
  concept_tag: string;
  xp_value: number;
}

interface CheckResponse {
  correct: boolean;
  message: string;
  earned_xp: number;
  correct_answer: string;
  explanation: string;
}

type Difficulty = "Beginner" | "Intermediate" | "Advanced";

const DIFFICULTY_META: Record<Difficulty, { label: string; color: string; xp: number }> = {
  Beginner:     { label: "Beginner",     color: "bg-[#E1F5EE] text-[#085041] border-[#B7EBD8]", xp: 5  },
  Intermediate: { label: "Intermediate", color: "bg-[#EEEDFE] text-[#3C3489] border-[#DDD9FC]", xp: 10 },
  Advanced:     { label: "Advanced",     color: "bg-[#FAEAF0] text-[#72243E] border-[#F4C0D1]", xp: 20 },
};

export default function PracticePage() {
  const { token } = useAuth();

  // Setup state
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Beginner");

  // Drill session state
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);

  // Per-question state
  const [chosen, setChosen] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [xpPop, setXpPop] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"setup" | "drill" | "complete">("setup");

  const startSession = useCallback(async () => {
    if (!topic.trim()) { setError("Please enter a topic first."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/practice/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic: topic.trim(), difficulty, count: 5 }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setQuestions(data.questions || []);
      setCurrentIdx(0);
      setSessionXP(0);
      setSessionCorrect(0);
      setChosen(null);
      setResult(null);
      setShowHint(false);
      setShowExplanation(false);
      setPhase("drill");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate questions.");
    } finally {
      setLoading(false);
    }
  }, [topic, difficulty, token]);

  const submitAnswer = useCallback(async (option: string) => {
    if (chosen || checking) return;
    setChosen(option);
    setChecking(true);
    const q = questions[currentIdx];
    try {
      const res = await fetch(`${API_BASE}/practice/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question_id: q.id,
          chosen_answer: option,
          correct_answer: q.correct_answer,
          xp_value: q.xp_value,
          topic,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: CheckResponse = await res.json();
      setResult(data);
      if (data.correct) {
        setSessionXP((prev) => prev + data.earned_xp);
        setSessionCorrect((prev) => prev + 1);
        setXpPop(true);
        setTimeout(() => setXpPop(false), 1800);
      }
    } catch {
      // local fallback
      const correct = option.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
      const earned = correct ? q.xp_value : 0;
      setResult({
        correct,
        message: correct ? "Correct! 🎉" : "Not quite! 💪",
        earned_xp: earned,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
      });
      if (correct) {
        setSessionXP((prev) => prev + earned);
        setSessionCorrect((prev) => prev + 1);
        setXpPop(true);
        setTimeout(() => setXpPop(false), 1800);
      }
    } finally {
      setChecking(false);
    }
  }, [chosen, checking, currentIdx, questions, token, topic]);

  const nextQuestion = () => {
    if (currentIdx + 1 >= questions.length) {
      setPhase("complete");
      return;
    }
    setCurrentIdx((i) => i + 1);
    setChosen(null);
    setResult(null);
    setShowHint(false);
    setShowExplanation(false);
  };

  const resetSession = () => {
    setPhase("setup");
    setTopic("");
    setQuestions([]);
    setCurrentIdx(0);
    setSessionXP(0);
    setSessionCorrect(0);
    setChosen(null);
    setResult(null);
  };

  const q = questions[currentIdx] ?? null;
  const progressPct = questions.length > 0 ? ((currentIdx + (result ? 1 : 0)) / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-white sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/home"
            className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--cta-primary)] hover:bg-[#FAECE7] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-9 h-9 rounded-xl bg-[var(--cta-primary)] text-white flex items-center justify-center shadow-sm">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-[var(--text-primary)] leading-tight">Practice Drills</h1>
            <p className="text-xs text-[var(--text-secondary)]">AI-powered one-question-at-a-time drills</p>
          </div>
        </div>
        {phase === "drill" && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EEEDFE] border border-[#DDD9FC] text-[#3C3489] text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              <span>{sessionXP} XP earned</span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-medium">
              {currentIdx + 1} / {questions.length}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">

        {/* ── SETUP PHASE ─────────────────────────────── */}
        {phase === "setup" && (
          <div className="p-8 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#FAECE7] flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-[var(--cta-primary)]" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-[var(--text-primary)]">Start a Drill Session</h2>
                <p className="text-sm text-[var(--text-secondary)]">5 questions · Instant feedback · XP rewards</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Topic / Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g. Python lists, Photosynthesis, World War 2..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && startSession()}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--cta-primary)] focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["Beginner", "Intermediate", "Advanced"] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                        difficulty === d
                          ? DIFFICULTY_META[d].color + " ring-2 ring-offset-1 ring-[var(--cta-primary)]"
                          : "bg-white border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--cta-primary)]"
                      }`}
                    >
                      {d}
                      <span className="block text-[10px] font-normal mt-0.5 opacity-70">
                        +{DIFFICULTY_META[d].xp} XP/q
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-[#FAEAF0] border border-[#F4C0D1] text-[#72243E] text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={startSession}
                disabled={loading || !topic.trim()}
                className="w-full py-3 rounded-xl bg-[var(--cta-primary)] text-white font-semibold text-sm hover:bg-[var(--cta-primary-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating questions…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Start Drill Session
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── DRILL PHASE ─────────────────────────────── */}
        {phase === "drill" && q && (
          <div className="space-y-4 relative">
            {/* XP Pop-up */}
            {xpPop && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 animate-bounce">
                <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#3C3489] text-white text-sm font-bold shadow-lg">
                  <Zap className="w-4 h-4 text-yellow-300" />
                  +{result?.earned_xp} XP!
                </div>
              </div>
            )}

            {/* Progress bar */}
            <div className="h-2 rounded-full bg-[var(--surface-nested)] border border-[var(--border)] overflow-hidden">
              <div
                className="h-full bg-[var(--cta-primary)] rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Question card */}
            <div className="p-6 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
              {/* Meta */}
              <div className="flex items-center gap-2 mb-4">
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${DIFFICULTY_META[q.difficulty as Difficulty]?.color ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {q.difficulty}
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--surface-nested)] border border-[var(--border)] text-[var(--text-secondary)]">
                  📚 {q.concept_tag}
                </span>
                <span className="ml-auto text-[11px] font-semibold text-[var(--text-secondary)]">
                  +{q.xp_value} XP
                </span>
              </div>

              <p className="text-base font-semibold text-[var(--text-primary)] leading-relaxed mb-5">
                {q.question}
              </p>

              {/* Options */}
              <div className="space-y-2.5">
                {q.options.map((opt, i) => {
                  const isChosen = chosen === opt;
                  const isCorrect = result && opt === result.correct_answer;
                  const isWrong = result && isChosen && !result.correct;

                  let cls =
                    "w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer";

                  if (!result) {
                    cls += isChosen
                      ? " border-[var(--cta-primary)] bg-[#FAECE7] text-[var(--text-primary)]"
                      : " border-[var(--border)] bg-[var(--surface-nested)] text-[var(--text-primary)] hover:border-[var(--cta-primary)] hover:bg-[#FAECE7]";
                  } else if (isCorrect) {
                    cls += " border-[#085041] bg-[#E1F5EE] text-[#085041]";
                  } else if (isWrong) {
                    cls += " border-[#72243E] bg-[#FAEAF0] text-[#72243E]";
                  } else {
                    cls += " border-[var(--border)] bg-[var(--surface-nested)] text-[var(--text-secondary)] opacity-50";
                  }

                  return (
                    <button
                      key={i}
                      className={cls}
                      onClick={() => submitAnswer(opt)}
                      disabled={!!result || checking}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg border border-current flex items-center justify-center text-xs font-bold shrink-0">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span>{opt}</span>
                        {isCorrect && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" />}
                        {isWrong && <XCircle className="w-4 h-4 ml-auto shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {checking && (
                <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking…
                </div>
              )}
            </div>

            {/* Result + hint + explanation */}
            {result && (
              <div className={`p-5 rounded-2xl border ${result.correct ? "bg-[#E1F5EE] border-[#B7EBD8]" : "bg-[#FAEAF0] border-[#F4C0D1]"}`}>
                <div className="flex items-center gap-2 mb-1">
                  {result.correct
                    ? <CheckCircle2 className="w-5 h-5 text-[#085041]" />
                    : <XCircle className="w-5 h-5 text-[#72243E]" />}
                  <span className={`font-bold text-base ${result.correct ? "text-[#085041]" : "text-[#72243E]"}`}>
                    {result.message}
                  </span>
                  {result.correct && (
                    <span className="ml-auto flex items-center gap-1 text-sm font-semibold text-[#3C3489]">
                      <Zap className="w-4 h-4" />+{result.earned_xp} XP
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-primary)] leading-relaxed mt-2">{result.explanation}</p>
              </div>
            )}

            {/* Hint */}
            {!result && (
              <button
                onClick={() => setShowHint((h) => !h)}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--cta-primary)] transition-colors cursor-pointer"
              >
                <Lightbulb className="w-4 h-4" />
                {showHint ? "Hide Hint" : "💡 Show Hint"}
              </button>
            )}
            {showHint && !result && (
              <div className="px-4 py-3 rounded-xl bg-[#FAEDF0] border border-[#F4C0D1] text-sm text-[#72243E]">
                <span className="font-semibold">Hint: </span>{q.hint}
              </div>
            )}

            {/* Concept breakdown */}
            {result && (
              <button
                onClick={() => setShowExplanation((e) => !e)}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--cta-primary)] transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                {showExplanation ? "Hide Concept" : "📖 Concept Breakdown"}
              </button>
            )}
            {showExplanation && result && (
              <div className="px-4 py-3 rounded-xl bg-[#EEEDFE] border border-[#DDD9FC] text-sm text-[#3C3489]">
                <p className="font-semibold mb-1">📚 {q.concept_tag}</p>
                <p className="leading-relaxed">{q.explanation}</p>
              </div>
            )}

            {/* Next button */}
            {result && (
              <button
                onClick={nextQuestion}
                className="w-full py-3 rounded-xl bg-[var(--cta-primary)] text-white font-semibold text-sm hover:bg-[var(--cta-primary-hover)] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {currentIdx + 1 >= questions.length ? (
                  <>
                    <Trophy className="w-4 h-4" />
                    See Results
                  </>
                ) : (
                  <>
                    Next Question
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* ── COMPLETE PHASE ───────────────────────────── */}
        {phase === "complete" && (
          <div className="p-8 rounded-2xl bg-white border border-[var(--border)] shadow-xs text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#EEEDFE] flex items-center justify-center mx-auto mb-5">
              <Trophy className="w-8 h-8 text-[#3C3489]" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Session Complete!</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Topic: <span className="font-semibold text-[var(--text-primary)]">{topic}</span>
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-[#E1F5EE] border border-[#B7EBD8]">
                <p className="text-2xl font-bold text-[#085041]">{sessionCorrect}/{questions.length}</p>
                <p className="text-xs text-[#085041] mt-1">Correct Answers</p>
              </div>
              <div className="p-4 rounded-xl bg-[#EEEDFE] border border-[#DDD9FC]">
                <div className="flex items-center justify-center gap-1.5">
                  <Zap className="w-5 h-5 text-[#3C3489]" />
                  <p className="text-2xl font-bold text-[#3C3489]">{sessionXP}</p>
                </div>
                <p className="text-xs text-[#3C3489] mt-1">XP Earned</p>
              </div>
            </div>

            <div className="h-3 rounded-full bg-[var(--surface-nested)] border border-[var(--border)] overflow-hidden mb-6">
              <div
                className="h-full bg-[#085041] rounded-full"
                style={{ width: `${questions.length > 0 ? (sessionCorrect / questions.length) * 100 : 0}%` }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetSession}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--cta-primary)] hover:text-[var(--cta-primary)] transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                New Session
              </button>
              <Link
                href="/progress"
                className="flex-1 py-2.5 rounded-xl bg-[var(--cta-primary)] text-white font-semibold text-sm hover:bg-[var(--cta-primary-hover)] transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                View Progress
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

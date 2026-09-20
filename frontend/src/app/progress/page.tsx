"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  Award,
  Flame,
  CheckCircle2,
  BookOpen,
  Zap,
  Target,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = "http://localhost:8000";

interface DayActivity {
  day: string;
  date: string;
  xp: number;
  activities: number;
}

interface DrillEntry {
  id: string;
  topic: string;
  difficulty: string;
  correct: boolean;
  xp: number;
  timestamp: string;
}

interface QuizEntry {
  id: string;
  topic: string;
  score_percent: number;
  total_questions: number;
  correct_count: number;
  xp: number;
  timestamp: string;
}

interface ProgressStats {
  username: string;
  total_xp: number;
  study_streak_days: number;
  accuracy_rate: number;
  quizzes_completed: number;
  practice_drills_completed: number;
  weekly_activity: DayActivity[];
  recent_drills: DrillEntry[];
  recent_quizzes: QuizEntry[];
}

function XPBarChart({ data }: { data: DayActivity[] }) {
  const maxXP = Math.max(...data.map((d) => d.xp), 1);
  const chartH = 120;

  return (
    <svg width="100%" viewBox={`0 0 ${data.length * 48} ${chartH + 28}`} className="overflow-visible">
      {data.map((d, i) => {
        const barH = Math.max((d.xp / maxXP) * chartH, 4);
        const x = i * 48 + 8;
        const y = chartH - barH;
        const isToday = i === data.length - 1;
        return (
          <g key={d.date}>
            {/* Bar */}
            <rect
              x={x}
              y={y}
              width={32}
              height={barH}
              rx={6}
              fill={isToday ? "var(--cta-primary)" : d.xp > 0 ? "#EEEDFE" : "var(--surface-nested)"}
              stroke={isToday ? "var(--cta-primary)" : d.xp > 0 ? "#DDD9FC" : "var(--border)"}
              strokeWidth={1}
            />
            {/* XP label above bar */}
            {d.xp > 0 && (
              <text
                x={x + 16}
                y={y - 5}
                textAnchor="middle"
                fontSize={9}
                fontWeight={600}
                fill={isToday ? "var(--cta-primary)" : "#3C3489"}
              >
                {d.xp}
              </text>
            )}
            {/* Day label below bar */}
            <text
              x={x + 16}
              y={chartH + 16}
              textAnchor="middle"
              fontSize={10}
              fontWeight={isToday ? 700 : 400}
              fill={isToday ? "var(--cta-primary)" : "var(--text-secondary)"}
            >
              {d.day}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function AccuracyRing({ pct }: { pct: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={110} height={110} viewBox="0 0 110 110">
      {/* Track */}
      <circle cx={55} cy={55} r={r} fill="none" stroke="var(--surface-nested)" strokeWidth={12} />
      {/* Arc */}
      <circle
        cx={55}
        cy={55}
        r={r}
        fill="none"
        stroke="var(--cta-primary)"
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform="rotate(-90 55 55)"
      />
      <text x={55} y={52} textAnchor="middle" fontSize={18} fontWeight={700} fill="var(--text-primary)">
        {pct}%
      </text>
      <text x={55} y={67} textAnchor="middle" fontSize={9} fill="var(--text-secondary)">
        accuracy
      </text>
    </svg>
  );
}

export default function ProgressPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/progress/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch progress");
      const data = await res.json();
      setStats(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load progress.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return iso;
    }
  };

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
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-[var(--text-primary)] leading-tight">Progress & Analytics</h1>
            <p className="text-xs text-[var(--text-secondary)]">Your real-time learning metrics</p>
          </div>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--cta-primary)] hover:bg-[#FAECE7] transition-colors cursor-pointer disabled:opacity-50"
          title="Refresh stats"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        {loading && !stats && (
          <div className="flex items-center justify-center py-20 gap-3 text-[var(--text-secondary)]">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Loading your analytics…</span>
          </div>
        )}

        {error && (
          <div className="px-4 py-3 rounded-xl bg-[#FAEAF0] border border-[#F4C0D1] text-[#72243E] text-sm">
            {error}
          </div>
        )}

        {stats && (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Total XP",
                  value: stats.total_xp,
                  icon: Award,
                  color: "bg-[#EEEDFE] text-[#3C3489] border-[#DDD9FC]",
                },
                {
                  label: "Study Streak",
                  value: `${stats.study_streak_days}d`,
                  icon: Flame,
                  color: "bg-[#FAECE7] text-[var(--cta-primary)] border-[#F4C0D1]",
                },
                {
                  label: "Quizzes Done",
                  value: stats.quizzes_completed,
                  icon: BookOpen,
                  color: "bg-[#E1F5EE] text-[#085041] border-[#B7EBD8]",
                },
                {
                  label: "Drills Done",
                  value: stats.practice_drills_completed,
                  icon: Target,
                  color: "bg-[#FAEAF0] text-[#72243E] border-[#F4C0D1]",
                },
              ].map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  className="p-5 rounded-2xl bg-white border border-[var(--border)] shadow-xs flex flex-col gap-3"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${color}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* XP Chart + Accuracy Ring */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 7-Day XP Chart */}
              <div className="md:col-span-2 p-6 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">7-Day XP Activity</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Daily XP earned from quizzes & drills</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#3C3489]">
                    <Zap className="w-3.5 h-3.5" />
                    {stats.weekly_activity.reduce((s, d) => s + d.xp, 0)} XP this week
                  </div>
                </div>
                {stats.weekly_activity.length > 0 ? (
                  <XPBarChart data={stats.weekly_activity} />
                ) : (
                  <div className="h-32 flex items-center justify-center text-sm text-[var(--text-secondary)]">
                    No activity data yet. Complete quizzes or drills to see your progress!
                  </div>
                )}
              </div>

              {/* Accuracy Ring */}
              <div className="p-6 rounded-2xl bg-white border border-[var(--border)] shadow-xs flex flex-col items-center justify-center">
                <h3 className="font-bold text-sm text-[var(--text-primary)] mb-3 self-start">Answer Accuracy</h3>
                <AccuracyRing pct={Math.round(stats.accuracy_rate)} />
                <p className="text-xs text-[var(--text-secondary)] mt-3 text-center">
                  Based on all quizzes & drills
                </p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Recent Drills */}
              <div className="p-6 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-[var(--cta-primary)]" />
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Recent Practice Drills</h3>
                </div>
                {stats.recent_drills.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
                    No drills yet.{" "}
                    <Link href="/practice" className="text-[var(--cta-primary)] hover:underline font-medium">
                      Start practicing!
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {stats.recent_drills.slice().reverse().map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[var(--surface-nested)] border border-[var(--border)]"
                      >
                        <div className="flex items-center gap-2.5">
                          {d.correct ? (
                            <CheckCircle2 className="w-4 h-4 text-[#085041] shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-[#72243E] shrink-0" />
                          )}
                          <div>
                            <p className="text-xs font-semibold text-[var(--text-primary)]">{d.topic}</p>
                            <p className="text-[10px] text-[var(--text-secondary)]">{formatDate(d.timestamp)}</p>
                          </div>
                        </div>
                        {d.correct && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#3C3489]">
                            <Zap className="w-3 h-3" />+{d.xp}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Quizzes */}
              <div className="p-6 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-[var(--cta-primary)]" />
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Recent Quizzes</h3>
                </div>
                {stats.recent_quizzes.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
                    No quizzes yet.{" "}
                    <Link href="/quiz" className="text-[var(--cta-primary)] hover:underline font-medium">
                      Try a quiz!
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {stats.recent_quizzes.slice().reverse().map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[var(--surface-nested)] border border-[var(--border)]"
                      >
                        <div>
                          <p className="text-xs font-semibold text-[var(--text-primary)]">{q.topic}</p>
                          <p className="text-[10px] text-[var(--text-secondary)]">
                            {q.correct_count}/{q.total_questions} correct · {formatDate(q.timestamp)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[var(--text-primary)]">{Math.round(q.score_percent)}%</p>
                          <p className="text-[10px] text-[#3C3489] font-semibold">+{q.xp} XP</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CTA row */}
            <div className="flex gap-3">
              <Link
                href="/practice"
                className="flex-1 py-3 rounded-xl bg-[var(--cta-primary)] text-white font-semibold text-sm hover:bg-[var(--cta-primary-hover)] transition-all text-center shadow-sm"
              >
                🎯 Practice Drills
              </Link>
              <Link
                href="/quiz"
                className="flex-1 py-3 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--cta-primary)] hover:text-[var(--cta-primary)] transition-colors text-center"
              >
                📝 Take a Quiz
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

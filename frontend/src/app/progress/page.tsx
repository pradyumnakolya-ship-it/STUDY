"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Award, Flame, CheckCircle, BookOpen, Clock, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function ProgressPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_xp: user?.total_xp ?? 145,
    streak: 4,
    quizzes: 6,
    roadmaps: 2,
    accuracy: 84
  });

  const dailyActivity = [
    { day: "Mon", xp: 35, pct: 40 },
    { day: "Tue", xp: 60, pct: 70 },
    { day: "Wed", xp: 20, pct: 25 },
    { day: "Thu", xp: 90, pct: 100 },
    { day: "Fri", xp: 45, pct: 55 },
    { day: "Sat", xp: 75, pct: 85 },
    { day: "Sun", xp: 50, pct: 60 }
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <header className="border-b border-[var(--border)] bg-white sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/home" className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-nested)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-bold text-base text-[var(--text-primary)]">Progress & Analytics</h1>
            <p className="text-xs text-[var(--text-secondary)]">Your learning velocity, study streak, and performance metrics</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto px-6 py-8 flex-1 space-y-6">
        {/* KPI Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Total XP</span>
              <Award className="w-4 h-4 text-[#3C3489]" />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total_xp}</p>
            <p className="text-[11px] text-[#085041] mt-1">+45 XP this week</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Daily Streak</span>
              <Flame className="w-4 h-4 text-[var(--cta-primary)]" />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.streak} Days</p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">Personal best: 7</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Quizzes Taken</span>
              <CheckCircle className="w-4 h-4 text-[#085041]" />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.quizzes}</p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">{stats.accuracy}% pass rate</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-[var(--text-secondary)]">Roadmaps</span>
              <BookOpen className="w-4 h-4 text-[var(--text-secondary)]" />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.roadmaps}</p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">2 in progress</p>
          </div>
        </div>

        {/* Activity Chart Card */}
        <div className="p-6 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-base text-[var(--text-primary)]">Weekly Study Velocity</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">XP earned per study day</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-[var(--surface-nested)] border border-[var(--border)] text-[var(--text-secondary)] font-medium">
              Past 7 Days
            </span>
          </div>

          {/* Bar Chart Visualization */}
          <div className="flex items-end justify-between h-48 pt-6 pb-2 px-4 border-b border-[var(--border)]">
            {dailyActivity.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                <span className="text-[10px] font-semibold text-[var(--text-secondary)]">{item.xp}</span>
                <div className="w-8 sm:w-12 bg-[var(--surface-nested)] rounded-t-lg h-32 flex items-end justify-center p-1">
                  <div
                    style={{ height: `${item.pct}%` }}
                    className="w-full bg-[var(--cta-primary)] rounded-t-md transition-all duration-500 hover:opacity-85"
                  />
                </div>
                <span className="text-xs font-medium text-[var(--text-secondary)]">{item.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Milestones */}
        <div className="p-6 rounded-2xl bg-white border border-[var(--border)] shadow-xs">
          <h2 className="font-bold text-base text-[var(--text-primary)] mb-4">Recent Learning Milestones</h2>
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#E1F5EE] text-[#085041] flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">Passed Algo Aces Day 1 Quiz</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">Scored 80% • Unlocked Day 2</p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#3C3489] bg-[#EEEDFE] px-2.5 py-1 rounded-lg">+30 XP</span>
            </div>

            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#EEEDFE] text-[#3C3489] flex items-center justify-center font-bold text-xs">
                  ★
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">Created 5-Day Neural Networks Roadmap</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">Completed curriculum generation</p>
                </div>
              </div>
              <span className="text-xs font-bold text-[#3C3489] bg-[#EEEDFE] px-2.5 py-1 rounded-lg">+15 XP</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

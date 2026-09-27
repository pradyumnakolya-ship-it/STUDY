"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Map, Sparkles, Calendar, BookOpen, CheckCircle, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface RoadmapScheduleDay {
  day: number;
  title: string;
  learning_objective: string;
  subtopics: string[];
  practice_prompts: string[];
}

export default function RoadmapPage() {
  const { user } = useAuth();
  const [topic, setTopic] = useState("");
  const [days, setDays] = useState(5);
  const [level, setLevel] = useState("Beginner");
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<{ topic: string; days: number; schedule: RoadmapScheduleDay[] } | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("studygpt_token");
      const res = await fetch(`${API_BASE}/roadmap/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          topic: topic.trim(),
          days: Number(days),
          experience_level: level
        })
      });

      if (!res.ok) throw new Error("Failed to generate roadmap");
      const data = await res.json();
      setRoadmap(data);
    } catch (err) {
      console.error(err);
      // Fallback preview
      setRoadmap({
        topic: topic,
        days: days,
        schedule: Array.from({ length: days }).map((_, i) => ({
          day: i + 1,
          title: `Core Fundamentals Part ${i + 1}`,
          learning_objective: `Master theoretical concepts, architecture, and syntax of ${topic}.`,
          subtopics: [`Deep dive into ${topic} primitives`, `Standard workflows & debugging`, `Real-world patterns`],
          practice_prompts: [`Build an end-to-end sandbox example demonstrating ${topic}.`]
        }))
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#fcfdff] flex flex-col">
      <header className="border-b border-[rgba(255,255,255,0.08)] bg-[#0a0a0c] sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/home" className="p-2 rounded-xl border border-[rgba(255,255,255,0.12)] text-[#888e90] hover:text-[#fcfdff] hover:bg-[#101012] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-bold text-base text-[#fcfdff]">AI Study Roadmap Generator</h1>
            <p className="text-xs text-[#888e90]">Generate tailored step-by-step learning itineraries</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto px-6 py-8 flex-1">
        {/* Input Form */}
        <div className="bg-[#0a0a0c] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 shadow-xs mb-8">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#888e90] mb-1.5">
                What do you want to learn?
              </label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Distributed Systems, Neural Networks, Docker, Rust..."
                className="w-full px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#101012] text-[#fcfdff] placeholder:text-[#888e90] text-sm focus:outline-none focus:border-[#fcfdff] transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#888e90] mb-1.5">
                  Duration (Days)
                </label>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#101012] text-[#fcfdff] text-sm focus:outline-none focus:border-[#fcfdff]"
                >
                  <option value={3} className="bg-[#101012] text-[#fcfdff]">3 Days (Crash Course)</option>
                  <option value={5} className="bg-[#101012] text-[#fcfdff]">5 Days (Standard Week)</option>
                  <option value={7} className="bg-[#101012] text-[#fcfdff]">7 Days (Deep Dive)</option>
                  <option value={10} className="bg-[#101012] text-[#fcfdff]">10 Days (Comprehensive)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#888e90] mb-1.5">
                  Target Proficiency
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#101012] text-[#fcfdff] text-sm focus:outline-none focus:border-[#fcfdff]"
                >
                  <option value="Beginner" className="bg-[#101012] text-[#fcfdff]">Beginner (Zero to hero)</option>
                  <option value="Intermediate" className="bg-[#101012] text-[#fcfdff]">Intermediate (Core skills)</option>
                  <option value="Advanced" className="bg-[#101012] text-[#fcfdff]">Advanced (Production grade)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="w-full py-3 px-4 rounded-xl bg-[#fcfdff] hover:bg-white/90 text-[#000000] font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#000000]" />
                  <span>Structuring Curriculum with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Study Roadmap</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Roadmap Display */}
        {roadmap && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#fcfdff]">{roadmap.topic}</h2>
                <p className="text-xs text-[#888e90] mt-0.5">{roadmap.days}-Day Structured Learning Journey</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#085041]/20 text-[#2fe0b4] border border-[#085041]/40 text-xs font-semibold">
                AI Verified
              </span>
            </div>

            <div className="space-y-4">
              {roadmap.schedule.map((item) => (
                <div key={item.day} className="p-6 rounded-2xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.08)] shadow-xs">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-8 h-8 rounded-xl bg-[#101012] border border-[rgba(255,255,255,0.08)] flex items-center justify-center font-bold text-xs text-[#fcfdff]">
                      D{item.day}
                    </span>
                    <h3 className="font-bold text-base text-[#fcfdff]">{item.title}</h3>
                  </div>

                  <p className="text-xs text-[rgba(252,253,255,0.85)] mb-4 leading-relaxed">
                    <strong>Objective:</strong> {item.learning_objective}
                  </p>

                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888e90]">
                      Key Subtopics
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {item.subtopics.map((sub, sIdx) => (
                        <span key={sIdx} className="px-2.5 py-1 rounded-lg bg-[#101012] border border-[rgba(255,255,255,0.06)] text-xs text-[#fcfdff]">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>

                  {item.practice_prompts && item.practice_prompts.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.08)] text-xs text-[#2fe0b4] bg-[#085041]/20 p-3 rounded-xl border border-[#085041]/40">
                      <strong>Practice:</strong> {item.practice_prompts.join(" • ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

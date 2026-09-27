"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Bot, 
  Map, 
  FileText, 
  HelpCircle, 
  TrendingUp, 
  Users, 
  Sparkles, 
  ArrowRight, 
  Award, 
  LogOut,
  Target
} from "lucide-react";

export default function HomePage() {
  const { user, logout } = useAuth();

  const navigationCards = [
    {
      title: "Guild Learning Studio",
      description: "Join or create group learning guilds, solve daily roadmaps, and compete on leaderboards.",
      href: "/",
      icon: Award,
      badge: "Flagship",
      accentGlow: "group-hover:border-[rgba(255,128,31,0.4)]"
    },
    {
      title: "AI Study Tutor",
      description: "Conversational, ChatGPT-style personal AI mentor with saved chat history.",
      href: "/chat",
      icon: Bot,
      badge: "Interactive",
      accentGlow: "group-hover:border-[rgba(59,158,255,0.4)]"
    },
    {
      title: "My Materials & RAG Q&A",
      description: "Upload PDFs and notes to ask questions grounded directly in your study documents with page citations.",
      href: "/materials",
      icon: FileText,
      badge: "RAG Docs",
      accentGlow: "group-hover:border-[rgba(17,255,153,0.4)]"
    },
    {
      title: "Study Roadmap Generator",
      description: "Enter any subject to generate tailored step-by-step day-by-day learning schedules.",
      href: "/roadmap",
      icon: Map,
      badge: "AI Powered",
      accentGlow: "group-hover:border-[rgba(255,197,61,0.4)]"
    },
    {
      title: "Quizzes & Knowledge Checks",
      description: "Generate customized practice exams, test your understanding, and earn XP.",
      href: "/quiz",
      icon: HelpCircle,
      badge: "Adaptive",
      accentGlow: "group-hover:border-[rgba(255,32,71,0.4)]"
    },
    {
      title: "Practice Drills",
      description: "One-question-at-a-time AI drills with instant feedback, hints, concept breakdowns, and XP rewards.",
      href: "/practice",
      icon: Target,
      badge: "Drills",
      accentGlow: "group-hover:border-[rgba(255,128,31,0.4)]"
    },
    {
      title: "Social Connect & DMs",
      description: "Search classmates, send connection requests, and study together via direct messages.",
      href: "/connect",
      icon: Users,
      badge: "Community",
      accentGlow: "group-hover:border-[rgba(59,158,255,0.4)]"
    },
    {
      title: "Progress & Analytics",
      description: "Track your learning velocity, streak calendar, quiz accuracy, and earned XP.",
      href: "/progress",
      icon: TrendingUp,
      badge: "Analytics",
      accentGlow: "group-hover:border-[rgba(17,255,153,0.4)]"
    }
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-[#fcfdff] flex flex-col relative selection:bg-[#fcfdff] selection:text-[#000000]">
      {/* Resend Radial Atmospheric Glow Backdrop */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] glow-orange pointer-events-none z-0" />

      {/* Top Header */}
      <header className="border-b border-[rgba(255,255,255,0.06)] bg-[#000000]/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#fcfdff] text-[#000000] flex items-center justify-center font-bold text-sm shadow-sm">
            S
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-[#fcfdff] leading-none">StudyGPT</h1>
            <p className="text-[11px] text-[#888e90] mt-0.5">Resend Editorial Interface</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#101012] border border-[rgba(255,255,255,0.14)] text-[#11ff99] text-xs font-mono font-medium">
            <Award className="w-3.5 h-3.5 text-[#11ff99]" />
            <span>{user?.total_xp ?? 0} XP</span>
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-[#fcfdff]">{user?.username ?? "Student"}</p>
            <p className="text-[10px] text-[#888e90]">{user?.email ?? "Signed in"}</p>
          </div>

          <button
            onClick={logout}
            title="Sign out"
            className="p-2 rounded-lg bg-[#101012] border border-[rgba(255,255,255,0.14)] text-[#a1a4a5] hover:text-[#ff2047] hover:border-[rgba(255,32,71,0.4)] transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Welcome Banner */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 z-10">
        <div className="p-8 md:p-10 rounded-[12px] bg-[#0a0a0c] border border-[rgba(255,255,255,0.08)] mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#101012] border border-[rgba(255,255,255,0.14)] text-[#ffc53d] text-xs font-mono mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#ffc53d]" />
              <span>Resend Editorial UI v1.0</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-editorial tracking-tight text-[#fcfdff] leading-[1.05] mb-3">
              Learning for developers.
            </h2>
            <p className="text-base text-[rgba(252,253,255,0.86)] leading-relaxed">
              Welcome back, <span className="text-[#fcfdff] font-medium">{user?.username ?? "Scholar"}</span>. Explore collaborative learning guilds, start an interactive AI tutoring session, or query documents with verified page citations.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative z-10">
            <Link
              href="/"
              className="px-6 py-3 rounded-lg bg-[#fcfdff] text-[#000000] font-medium text-sm hover:bg-[#f1f7fe] transition-all flex items-center gap-2 shadow-sm"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Dashboard Grid Modules */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-mono uppercase tracking-widest text-[#888e90]">
            Learning Workspaces & Services
          </h3>
          <span className="text-xs text-[#888e90] font-mono">8 Modules</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {navigationCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Link
                key={idx}
                href={card.href}
                className={`p-6 rounded-[12px] bg-[#0a0a0c] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] ${card.accentGlow} transition-all duration-200 group flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-9 h-9 rounded-lg bg-[#101012] border border-[rgba(255,255,255,0.14)] flex items-center justify-center text-[#fcfdff] group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#101012] border border-[rgba(255,255,255,0.14)] text-[#888e90]">
                      {card.badge}
                    </span>
                  </div>

                  <h4 className="font-bold text-[#fcfdff] text-base group-hover:text-[#3b9eff] transition-colors">
                    {card.title}
                  </h4>
                  <p className="text-xs text-[rgba(252,253,255,0.7)] mt-2 leading-relaxed line-clamp-2">
                    {card.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.04)] flex items-center justify-between text-xs font-medium text-[#888e90] group-hover:text-[#fcfdff] transition-colors">
                  <span>Open module</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.04)] bg-[#000000] px-6 py-8 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#888e90]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#11ff99]" />
            <span>StudyGPT Resend UI Architecture — All Systems Operational</span>
          </div>
          <span>Built with Next.js, FastAPI & Google Gemini</span>
        </div>
      </footer>
    </div>
  );
}

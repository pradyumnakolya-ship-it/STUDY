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
  ShieldAlert, 
  Sparkles, 
  ArrowRight, 
  Award, 
  LogOut,
  Compass
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
      accent: "bg-[#FAECE7] text-[var(--cta-primary)] border-[#F4C0D1]"
    },
    {
      title: "AI Study Tutor",
      description: "Conversational, ChatGPT-style personal AI mentor with saved chat history.",
      href: "/chat",
      icon: Bot,
      badge: "Interactive",
      accent: "bg-[#EEEDFE] text-[#3C3489] border-[#DDD9FC]"
    },
    {
      title: "Study Roadmap Generator",
      description: "Enter any subject to generate tailored step-by-step day-by-day learning schedules.",
      href: "/roadmap",
      icon: Map,
      badge: "AI Powered",
      accent: "bg-[#E1F5EE] text-[#085041] border-[#B7EBD8]"
    },
    {
      title: "Quizzes & Knowledge Checks",
      description: "Generate customized practice exams, test your understanding, and earn XP.",
      href: "/quiz",
      icon: HelpCircle,
      badge: "Adaptive",
      accent: "bg-[#FAEAF0] text-[#72243E] border-[#F4C0D1]"
    },
    {
      title: "Social Connect & DMs",
      description: "Search classmates, send connection requests, and study together via direct messages.",
      href: "/connect",
      icon: Users,
      badge: "Community",
      accent: "bg-[#EEEDFE] text-[#3C3489] border-[#DDD9FC]"
    },
    {
      title: "Progress & Analytics",
      description: "Track your learning velocity, streak calendar, quiz accuracy, and earned XP.",
      href: "/progress",
      icon: TrendingUp,
      badge: "Analytics",
      accent: "bg-[#E1F5EE] text-[#085041] border-[#B7EBD8]"
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Top Header */}
      <header className="border-b border-[var(--border)] bg-white sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--cta-primary)] text-white flex items-center justify-center font-bold text-base shadow-sm">
            S
          </div>
          <div>
            <h1 className="font-bold text-base text-[var(--text-primary)] leading-tight">StudyGPT</h1>
            <p className="text-xs text-[var(--text-secondary)]">Web Learning & Guild Suite</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--badge-reward-bg)] border border-[#DDD9FC] text-[var(--badge-reward-text)] text-xs font-semibold">
            <Award className="w-3.5 h-3.5" />
            <span>{user?.total_xp ?? 0} XP</span>
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-[var(--text-primary)]">{user?.username ?? "Student"}</p>
            <p className="text-[10px] text-[var(--text-secondary)]">{user?.email ?? "Signed in"}</p>
          </div>

          <button
            onClick={logout}
            title="Sign out"
            className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-[#72243E] hover:bg-[#FAEAF0] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Welcome Banner */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        <div className="p-8 rounded-2xl bg-white border border-[var(--border)] shadow-xs mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E1F5EE] text-[#085041] text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Learning Platform v0.2.0</span>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              Welcome back, {user?.username ?? "Scholar"}!
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1.5 max-w-xl">
              Choose your study path today. Explore active learning guilds, start an interactive tutoring session, or review your knowledge with custom quizzes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-[var(--cta-primary)] text-white font-medium text-sm hover:bg-[var(--cta-primary-hover)] transition-all flex items-center gap-2 shadow-sm"
            >
              <span>Launch Studio</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Dashboard Grid Modules (Per Step 18 Spec) */}
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-4">
          Learning Modules & Features
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {navigationCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Link
                key={idx}
                href={card.href}
                className="p-6 rounded-2xl bg-white border border-[var(--border)] hover:border-[var(--cta-primary)] hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${card.accent}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--surface-nested)] border border-[var(--border)] text-[var(--text-secondary)]">
                      {card.badge}
                    </span>
                  </div>

                  <h4 className="font-bold text-[var(--text-primary)] text-base group-hover:text-[var(--cta-primary)] transition-colors">
                    {card.title}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] group-hover:text-[var(--cta-primary)]">
                  <span>Enter workspace</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}

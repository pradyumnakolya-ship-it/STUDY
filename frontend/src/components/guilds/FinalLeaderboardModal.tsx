"use client";

import React, { useEffect, useState } from "react";
import { X, Crown, Zap, Sparkles } from "lucide-react";
import { getFinalLeaderboard, LeaderboardEntryData } from "@/lib/api";

interface FinalLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  guildId: string;
  guildName: string;
  topic: string;
}

export default function FinalLeaderboardModal({
  isOpen,
  onClose,
  guildId,
  guildName,
  topic,
}: FinalLeaderboardModalProps) {
  const [members, setMembers] = useState<LeaderboardEntryData[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    getFinalLeaderboard(guildId).then(setMembers).catch(() => setMembers([]));
  }, [guildId, isOpen]);

  if (!isOpen || members.length === 0) return null;

  const winner = members[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.12)] rounded-[12px] shadow-2xl overflow-hidden p-6 md:p-8 space-y-6 text-[#fcfdff] text-center">
        {/* Crown & Celebration Header */}
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-[#a5b4fc]/20 border border-[#a5b4fc]/40 text-[#a5b4fc] flex items-center justify-center">
            <Crown size={32} />
          </div>
          <span className="text-[11px] uppercase tracking-widest text-[#a5b4fc] font-bold">
            Roadmap Completed • Guild Champion
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#fcfdff] tracking-tight">
            Final Guild Leaderboard
          </h2>
          <p className="text-xs text-[rgba(252,253,255,0.7)]">
            {guildName} — {topic}
          </p>
        </div>

        {/* Section 8.9 Mandatory Winner Declaration Banner */}
        <div className="p-6 rounded-[12px] bg-[#a5b4fc]/10 border border-[#a5b4fc]/30 space-y-2">
          <div className="flex items-center justify-center gap-2 text-[#a5b4fc] font-bold text-xs uppercase tracking-wider">
            <Sparkles size={16} /> Official Proclamation <Sparkles size={16} />
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#fcfdff] leading-snug">
            The winner of this guild is {winner.name}.
          </h1>
          <p className="text-xs text-[rgba(252,253,255,0.7)]">
            Accumulated an impressive total of <strong className="text-[#a5b4fc]">{winner.xp} XP</strong> across all roadmap quizzes!
          </p>
        </div>

        {/* Full Rankings Table */}
        <div className="space-y-2 text-left">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#888e90] px-2">
            Final Standings
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {members.map((m) => (
              <div
                key={m.name}
                className={`p-3 rounded-[8px] border flex items-center justify-between ${
                  m.rank === 1
                    ? "bg-[#101012] border-2 border-[#a5b4fc] text-[#fcfdff] font-bold"
                    : "bg-[#0a0a0c] border-[rgba(255,255,255,0.08)] text-[rgba(252,253,255,0.85)] card-elevation"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-[6px] flex items-center justify-center font-bold text-xs ${
                    m.rank === 1 ? "bg-[#a5b4fc] text-[#000000]" : "bg-[#101012] text-[#888e90] border border-[rgba(255,255,255,0.08)]"
                  }`}>
                    #{m.rank}
                  </div>
                  <span className="text-xs font-bold">{m.name}</span>
                </div>
                <span className="text-xs font-bold text-[#a5b4fc] flex items-center gap-1">
                  <Zap size={12} /> {m.xp} XP
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-[8px] bg-[#fcfdff] hover:bg-white/90 text-[#000000] font-bold text-sm transition-all"
          >
            Claim Victory & Return to Studio
          </button>
        </div>
      </div>
    </div>
  );
}

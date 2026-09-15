"use client";

import React, { useEffect, useState } from "react";
import { X, Crown, Trophy, Zap, Sparkles } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#FFFFFF] border border-[#E4DFD1] rounded-[12px] shadow-2xl overflow-hidden p-6 md:p-8 space-y-6 text-[#2C2A24] text-center">
        {/* Crown & Celebration Header */}
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-[#EEEDFE] text-[#3C3489] flex items-center justify-center">
            <Crown size={32} />
          </div>
          <span className="text-[11px] uppercase tracking-widest text-[#3C3489] font-bold">
            Roadmap Completed • Guild Champion
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#2C2A24] tracking-tight">
            Final Guild Leaderboard
          </h2>
          <p className="text-xs text-[#5F5E5A]">
            {guildName} — {topic}
          </p>
        </div>

        {/* Section 8.9 Mandatory Winner Declaration Banner */}
        <div className="p-6 rounded-[12px] bg-[#EEEDFE] border border-[#3C3489]/20 space-y-2">
          <div className="flex items-center justify-center gap-2 text-[#3C3489] font-bold text-xs uppercase tracking-wider">
            <Sparkles size={16} /> Official Proclamation <Sparkles size={16} />
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#3C3489] leading-snug">
            The winner of this guild is {winner.name}.
          </h1>
          <p className="text-xs text-[#5F5E5A]">
            Accumulated an impressive total of <strong className="text-[#3C3489]">{winner.xp} XP</strong> across all roadmap quizzes!
          </p>
        </div>

        {/* Full Rankings Table */}
        <div className="space-y-2 text-left">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#888780] px-2">
            Final Standings
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {members.map((m) => (
              <div
                key={m.name}
                className={`p-3 rounded-[8px] border flex items-center justify-between ${
                  m.rank === 1
                    ? "bg-[#EEEDFE] border-[#3C3489]/30 text-[#3C3489] font-bold"
                    : "bg-[#FFFFFF] border-[#E4DFD1] text-[#2C2A24] card-elevation"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-[6px] flex items-center justify-center font-bold text-xs ${
                    m.rank === 1 ? "bg-[#3C3489] text-white" : "bg-[#FBF9F3] text-[#5F5E5A] border border-[#E4DFD1]"
                  }`}>
                    #{m.rank}
                  </div>
                  <span className="text-xs font-bold">{m.name}</span>
                </div>
                <span className="text-xs font-bold text-[#3C3489] flex items-center gap-1">
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
            className="w-full py-3 rounded-[8px] bg-[#D85A30] hover:bg-[#D85A30]/90 text-white font-bold text-sm transition-all"
          >
            Claim Victory & Return to Studio
          </button>
        </div>
      </div>
    </div>
  );
}

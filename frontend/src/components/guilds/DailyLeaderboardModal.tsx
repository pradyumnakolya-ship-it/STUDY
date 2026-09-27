"use client";

import React, { useEffect, useState } from "react";
import { X, Trophy, Zap, ArrowRight } from "lucide-react";
import { getDailyLeaderboard } from "@/lib/api";

export interface LeaderboardEntry {
  rank: number;
  name: string;
  dailyXP: number;
  totalXP: number;
  passed: boolean;
  scorePercent: number;
  isCurrentUser: boolean;
}

interface DailyLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayNumber: number;
  guildId: string;
  guildName: string;
  onProceedNextDay?: () => void;
  canProceed: boolean;
}

export default function DailyLeaderboardModal({
  isOpen,
  onClose,
  dayNumber,
  guildId,
  guildName,
  onProceedNextDay,
  canProceed,
}: DailyLeaderboardModalProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    getDailyLeaderboard(guildId, dayNumber).then((rows) => {
      setEntries(rows.map((row) => ({
        rank: row.rank,
        name: row.name,
        dailyXP: row.daily_xp,
        totalXP: row.total_xp,
        passed: row.passed,
        scorePercent: row.score_percent,
        isCurrentUser: row.is_current_user,
      })));
    }).catch(() => setEntries([]));
  }, [dayNumber, guildId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0a0a0c] border border-[rgba(255,255,255,0.12)] rounded-[12px] shadow-2xl overflow-hidden p-6 md:p-8 space-y-6 text-[#fcfdff]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#101012] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#a5b4fc]">
              <Trophy size={22} />
            </div>
            <div>
              <div className="text-[10px] text-[#888e90] uppercase tracking-wider font-semibold">
                {guildName}
              </div>
              <h2 className="text-xl font-bold text-[#fcfdff] tracking-tight">
                Day {dayNumber} Quiz Leaderboard
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[rgba(252,253,255,0.7)] hover:text-[#fcfdff] p-1 rounded-[6px] hover:bg-[#101012] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Section 8.8 Leaderboard List */}
        <div className="space-y-2.5">
          {entries.map((item) => (
            <div
              key={item.name}
              className={`p-3.5 rounded-[8px] border flex items-center justify-between transition-all card-elevation ${
                item.isCurrentUser
                  ? "bg-[#101012] border-2 border-[#fcfdff]"
                  : "bg-[#0a0a0c] border-[rgba(255,255,255,0.08)]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-[6px] flex items-center justify-center font-bold text-xs ${
                  item.rank === 1
                    ? "bg-[#a5b4fc]/20 text-[#a5b4fc] font-black border border-[#a5b4fc]/40"
                    : "bg-[#101012] text-[#888e90] border border-[rgba(255,255,255,0.08)]"
                }`}>
                  #{item.rank}
                </div>
                <div>
                  <div className={`text-xs font-bold ${item.isCurrentUser ? "text-[#fcfdff]" : "text-[rgba(252,253,255,0.9)]"}`}>
                    {item.name} {item.isCurrentUser && "(You)"}
                  </div>
                  <div className="text-[10px] text-[#888e90]">
                    Total Guild XP: {item.totalXP}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-bold text-[#a5b4fc] flex items-center gap-1 justify-end">
                    <Zap size={12} className="text-[#a5b4fc]" />
                    +{item.dailyXP} XP
                  </div>
                  <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-[6px] ${
                    item.passed ? "bg-[#085041]/20 text-[#2fe0b4]" : "bg-[#72243E]/20 text-[#ff7b9c]"
                  }`}>
                    {item.passed ? "Passed" : "Retrying"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-between border-t border-[rgba(255,255,255,0.08)]">
          <span className="text-xs text-[rgba(252,253,255,0.7)]">
            {canProceed 
              ? "Day passed (≥ 75%)! You unlocked the next day." 
              : "Score < 75%. Retry quiz to proceed."}
          </span>
          {canProceed && onProceedNextDay ? (
            <button
              onClick={() => {
                onProceedNextDay();
                onClose();
              }}
              className="px-5 py-2.5 rounded-[8px] bg-[#fcfdff] hover:bg-white/90 text-[#000000] font-bold text-xs transition-all flex items-center gap-1.5"
            >
              Continue to Day {dayNumber + 1}
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-[8px] bg-transparent border border-[rgba(255,255,255,0.12)] text-[#fcfdff] text-xs font-bold hover:bg-[#101012]"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { X, Trophy, Medal, Zap, ArrowRight } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#FFFFFF] border border-[#E4DFD1] rounded-[12px] shadow-2xl overflow-hidden p-6 md:p-8 space-y-6 text-[#2C2A24]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#EDE8DB] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#FBF9F3] border border-[#E4DFD1] flex items-center justify-center text-[#3C3489]">
              <Trophy size={22} />
            </div>
            <div>
              <div className="text-[10px] text-[#888780] uppercase tracking-wider font-semibold">
                {guildName}
              </div>
              <h2 className="text-xl font-bold text-[#2C2A24] tracking-tight">
                Day {dayNumber} Quiz Leaderboard
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#5F5E5A] hover:text-[#2C2A24] p-1 rounded-[6px] hover:bg-[#FBF9F3] transition-colors"
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
                  ? "bg-[#FAECE7] border-2 border-[#D85A30]"
                  : "bg-[#FFFFFF] border-[#E4DFD1]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-[6px] flex items-center justify-center font-bold text-xs ${
                  item.rank === 1
                    ? "bg-[#EEEDFE] text-[#3C3489] font-black"
                    : "bg-[#FBF9F3] text-[#5F5E5A] border border-[#E4DFD1]"
                }`}>
                  #{item.rank}
                </div>
                <div>
                  <div className={`text-xs font-bold ${item.isCurrentUser ? "text-[#D85A30]" : "text-[#2C2A24]"}`}>
                    {item.name} {item.isCurrentUser && "(You)"}
                  </div>
                  <div className="text-[10px] text-[#888780]">
                    Total Guild XP: {item.totalXP}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-bold text-[#3C3489] flex items-center gap-1 justify-end">
                    <Zap size={12} className="text-[#3C3489]" />
                    +{item.dailyXP} XP
                  </div>
                  <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-[6px] ${
                    item.passed ? "bg-[#E1F5EE] text-[#085041]" : "bg-[#FAEAF0] text-[#72243E]"
                  }`}>
                    {item.passed ? "Passed" : "Retrying"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-between border-t border-[#EDE8DB]">
          <span className="text-xs text-[#5F5E5A]">
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
              className="px-5 py-2.5 rounded-[8px] bg-[#D85A30] hover:bg-[#D85A30]/90 text-white font-bold text-xs transition-all flex items-center gap-1.5"
            >
              Continue to Day {dayNumber + 1}
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-[8px] bg-transparent border border-[#B4B2A9] text-[#444441] text-xs font-bold hover:bg-[#FBF9F3]"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

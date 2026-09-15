"use client";

import React from "react";
import { X, Users, BookOpen, Trophy, ArrowRight, ShieldCheck } from "lucide-react";
import { GuildItem } from "./CreateGuildModal";

interface JoinGuildModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableGuilds: GuildItem[];
  activeGuildId: string;
  onJoinGuild: (guild: GuildItem) => void;
}

export default function JoinGuildModal({
  isOpen,
  onClose,
  availableGuilds,
  activeGuildId,
  onJoinGuild,
}: JoinGuildModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#FFFFFF] border border-[#E4DFD1] rounded-[12px] shadow-2xl overflow-hidden p-6 md:p-8 space-y-6 text-[#2C2A24]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#EDE8DB] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#FBF9F3] border border-[#E4DFD1] flex items-center justify-center text-[#3C3489]">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2C2A24] tracking-tight">
                Join an Existing Guild
              </h2>
              <p className="text-xs text-[#5F5E5A]">
                Join fellow students following the same AI roadmap, daily quizzes, and leaderboard.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#5F5E5A] hover:text-[#2C2A24] p-1 rounded-[6px] hover:bg-[#FBF9F3] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Guilds List */}
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {availableGuilds.map((g) => {
            const isJoined = g.id === activeGuildId;

            return (
              <div
                key={g.id}
                className={`p-5 rounded-[12px] border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 card-elevation ${
                  isJoined
                    ? "bg-[#FAECE7] border-2 border-[#D85A30]"
                    : "bg-[#FFFFFF] border-[#E4DFD1] hover:border-[#B4B2A9]"
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-[#2C2A24]">{g.name}</h3>
                    {isJoined && (
                      <span className="text-[10px] bg-[#D85A30] text-white font-bold px-2 py-0.5 rounded-[6px] uppercase tracking-wider">
                        Current Guild
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#5F5E5A]">
                    <BookOpen size={13} className="text-[#3C3489]" />
                    <span>Topic: <strong className="text-[#2C2A24]">{g.topic}</strong></span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-[#888780] pt-1">
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {g.memberCount} active learners
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy size={12} className="text-[#3C3489]" /> {g.days.length} Days Roadmap
                    </span>
                    <span>Created by: {g.creator}</span>
                  </div>
                </div>

                <div>
                  {isJoined ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#085041] px-4 py-2 rounded-[8px] bg-[#E1F5EE] border border-[#085041]/30">
                      <ShieldCheck size={16} />
                      Active Member
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        onJoinGuild(g);
                        onClose();
                      }}
                      className="px-5 py-2.5 rounded-[8px] bg-[#D85A30] hover:bg-[#D85A30]/90 text-white font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      Join Guild
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

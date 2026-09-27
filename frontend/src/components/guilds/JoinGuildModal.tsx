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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.12)] rounded-[12px] shadow-2xl overflow-hidden p-6 md:p-8 space-y-6 text-[#fcfdff]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#101012] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#a5b4fc]">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#fcfdff] tracking-tight">
                Join an Existing Guild
              </h2>
              <p className="text-xs text-[rgba(252,253,255,0.7)]">
                Join fellow students following the same AI roadmap, daily quizzes, and leaderboard.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[rgba(252,253,255,0.7)] hover:text-[#fcfdff] p-1 rounded-[6px] hover:bg-[#101012] transition-colors"
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
                    ? "bg-[#101012] border-2 border-[#fcfdff]"
                    : "bg-[#0a0a0c] border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)]"
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-[#fcfdff]">{g.name}</h3>
                    {isJoined && (
                      <span className="text-[10px] bg-[#fcfdff] text-[#000000] font-bold px-2 py-0.5 rounded-[6px] uppercase tracking-wider">
                        Current Guild
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[rgba(252,253,255,0.7)]">
                    <BookOpen size={13} className="text-[#a5b4fc]" />
                    <span>Topic: <strong className="text-[#fcfdff]">{g.topic}</strong></span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-[#888e90] pt-1">
                    <span className="flex items-center gap-1">
                      <Users size={12} /> {g.memberCount} active learners
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy size={12} className="text-[#a5b4fc]" /> {g.days.length} Days Roadmap
                    </span>
                    <span>Created by: {g.creator}</span>
                  </div>
                </div>

                <div>
                  {isJoined ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#2fe0b4] px-4 py-2 rounded-[8px] bg-[#085041]/20 border border-[#085041]/40">
                      <ShieldCheck size={16} />
                      Active Member
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        onJoinGuild(g);
                        onClose();
                      }}
                      className="px-5 py-2.5 rounded-[8px] bg-[#fcfdff] hover:bg-white/90 text-[#000000] font-bold text-xs transition-all flex items-center gap-1.5"
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

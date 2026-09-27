"use client";

import React, { useState } from "react";
import { 
  X, 
  Sparkles, 
  Upload, 
  FileText, 
  Trophy,
  AlertCircle
} from "lucide-react";
import { createGuild, RoadmapDayData } from "@/lib/api";

export interface GuildItem {
  id: string;
  name: string;
  topic: string;
  creator: string;
  memberCount: number;
  days: RoadmapDayData[];
  currentDay: number;
  unlockedDay: number;
  userXP: number;
  completedDays: number[];
}

interface CreateGuildModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuildCreated: (guild: GuildItem) => void;
}

export default function CreateGuildModal({
  isOpen,
  onClose,
  onGuildCreated,
}: CreateGuildModalProps) {
  const [guildName, setGuildName] = useState("");
  const [topic, setTopic] = useState("");
  const [notesText, setNotesText] = useState("");
  const [durationDays, setDurationDays] = useState(5);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setSelectedFile(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guildName.trim() || !topic.trim()) {
      setError("Please provide both a guild name and a learning topic.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createGuild(
        guildName.trim(),
        topic.trim(),
        notesText,
        durationDays,
        selectedFile
      );

      const newGuild: GuildItem = {
        id: result.id,
        name: result.name,
        topic: result.topic,
        creator: result.creator,
        memberCount: result.member_count,
        days: result.days,
        currentDay: result.current_day,
        unlockedDay: result.unlocked_day,
        userXP: result.user_xp,
        completedDays: result.completed_days,
      };

      onGuildCreated(newGuild);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create guild roadmap");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.12)] rounded-[12px] shadow-2xl overflow-hidden p-6 md:p-8 space-y-6 text-[#fcfdff]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[rgba(255,255,255,0.08)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#101012] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#a5b4fc]">
              <Trophy size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#fcfdff] tracking-tight flex items-center gap-2">
                Create a Learning Guild
              </h2>
              <p className="text-xs text-[rgba(252,253,255,0.7)]">
                AI will turn your topic and notes into a structured daily learning roadmap.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-[rgba(252,253,255,0.7)] hover:text-[#fcfdff] p-1 rounded-[6px] hover:bg-[#101012] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-[8px] bg-[#72243E]/20 border border-[#72243E]/40 text-[#ff7b9c] text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative w-16 h-16">
              <div className="w-16 h-16 rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-[#fcfdff] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-[#fcfdff]">
                <Sparkles size={24} />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#fcfdff]">AI Generating Roadmap...</h3>
              <p className="text-xs text-[rgba(252,253,255,0.7)] max-w-sm">
                Gemini is analyzing &quot;{topic}&quot; and distributing your study material across {durationDays} focused days.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Guild Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#888e90] block">
                1. Guild Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Algorithm Titans, Deep Learning Order, System Design Guild"
                value={guildName}
                onChange={(e) => setGuildName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-[8px] bg-[#101012] border border-[rgba(255,255,255,0.1)] text-[#fcfdff] placeholder:text-[#888e90] text-sm focus:outline-none focus:border-[#fcfdff] transition-colors"
              />
            </div>

            {/* Topic to Learn */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#888e90] block">
                2. What topic are you going to learn? *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Singly & Doubly Linked Lists, Distributed Systems, Microservices"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-4 py-2.5 rounded-[8px] bg-[#101012] border border-[rgba(255,255,255,0.1)] text-[#fcfdff] placeholder:text-[#888e90] text-sm focus:outline-none focus:border-[#fcfdff] transition-colors"
              />
            </div>

            {/* Roadmap Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#888e90] flex items-center justify-between">
                <span>3. Roadmap Duration</span>
                <span className="text-[#a5b4fc] font-bold bg-[#a5b4fc]/20 px-2 py-0.5 rounded-[6px]">{durationDays} Days</span>
              </label>
              <div className="flex gap-2">
                {[3, 5, 7, 10].map((days) => (
                  <button
                    type="button"
                    key={days}
                    onClick={() => setDurationDays(days)}
                    className={`flex-1 py-2 rounded-[8px] text-xs font-bold border transition-all ${
                      durationDays === days
                        ? "bg-[#fcfdff] text-[#000000] border-[#fcfdff]"
                        : "bg-[#101012] border-[rgba(255,255,255,0.08)] text-[rgba(252,253,255,0.7)] hover:bg-[#16161a] hover:text-[#fcfdff]"
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Upload PDFs or Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#888e90] block">
                4. Upload PDFs or Learning Notes (Optional)
              </label>
              <div className="border-2 border-dashed border-[rgba(255,255,255,0.12)] hover:border-[#fcfdff] rounded-[8px] p-4 bg-[#101012] text-center transition-colors relative cursor-pointer group">
                <input
                  type="file"
                  accept=".txt,.md,.json,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                  <div className="p-2 rounded-[6px] bg-[rgba(255,255,255,0.08)] text-[#888e90]">
                    <Upload size={18} />
                  </div>
                  <div className="text-xs text-[#fcfdff] font-medium">
                    {fileName ? (
                      <span className="text-[#2fe0b4] bg-[#085041]/20 px-2 py-0.5 rounded-[6px] font-semibold flex items-center gap-1 border border-[#085041]/40">
                        <FileText size={14} />
                        {fileName}
                      </span>
                    ) : (
                      "Click to upload notes or syllabus files"
                    )}
                  </div>
                  <p className="text-[10px] text-[#888e90]">Supports .txt, .md, .pdf, or paste notes below</p>
                </div>
              </div>

              <textarea
                rows={3}
                placeholder="Or paste textbook excerpts / syllabus notes here..."
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-[8px] bg-[#101012] border border-[rgba(255,255,255,0.1)] text-[#fcfdff] placeholder:text-[#888e90] text-xs focus:outline-none focus:border-[#fcfdff] transition-colors resize-none mt-2"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[rgba(255,255,255,0.08)]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-[8px] text-xs font-semibold text-[rgba(252,253,255,0.7)] hover:text-[#fcfdff] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-[8px] bg-[#fcfdff] hover:bg-white/90 text-[#000000] font-bold text-xs transition-all flex items-center gap-2"
              >
                <Sparkles size={14} />
                Generate Guild Roadmap
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

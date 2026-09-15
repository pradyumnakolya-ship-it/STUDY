"use client";

import React, { useState } from "react";
import { 
  X, 
  Sparkles, 
  Upload, 
  FileText, 
  Trophy, 
  Layers, 
  Calendar,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-xl bg-[#FFFFFF] border border-[#E4DFD1] rounded-[12px] shadow-2xl overflow-hidden p-6 md:p-8 space-y-6 text-[#2C2A24]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#EDE8DB] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#FBF9F3] border border-[#E4DFD1] flex items-center justify-center text-[#3C3489]">
              <Trophy size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2C2A24] tracking-tight flex items-center gap-2">
                Create a Learning Guild
              </h2>
              <p className="text-xs text-[#5F5E5A]">
                AI will turn your topic and notes into a structured daily learning roadmap.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-[#5F5E5A] hover:text-[#2C2A24] p-1 rounded-[6px] hover:bg-[#FBF9F3] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-[8px] bg-[#FAEAF0] border border-[#72243E]/30 text-[#72243E] text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative w-16 h-16">
              <div className="w-16 h-16 rounded-full border-2 border-[#E4DFD1] border-t-[#D85A30] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-[#D85A30]">
                <Sparkles size={24} />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#2C2A24]">AI Generating Roadmap...</h3>
              <p className="text-xs text-[#5F5E5A] max-w-sm">
                Gemini is analyzing "{topic}" and distributing your study material across {durationDays} focused days.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            {/* Guild Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5F5E5A] block">
                1. Guild Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Algorithm Titans, Deep Learning Order, System Design Guild"
                value={guildName}
                onChange={(e) => setGuildName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-[8px] bg-[#FBF9F3] border border-[#E4DFD1] text-[#2C2A24] placeholder:text-[#888780] text-sm focus:outline-none focus:border-[#D85A30] transition-colors"
              />
            </div>

            {/* Topic to Learn */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5F5E5A] block">
                2. What topic are you going to learn? *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Singly & Doubly Linked Lists, Distributed Systems, Microservices"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-4 py-2.5 rounded-[8px] bg-[#FBF9F3] border border-[#E4DFD1] text-[#2C2A24] placeholder:text-[#888780] text-sm focus:outline-none focus:border-[#D85A30] transition-colors"
              />
            </div>

            {/* Roadmap Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5F5E5A] flex items-center justify-between">
                <span>3. Roadmap Duration</span>
                <span className="text-[#3C3489] font-bold bg-[#EEEDFE] px-2 py-0.5 rounded-[6px]">{durationDays} Days</span>
              </label>
              <div className="flex gap-2">
                {[3, 5, 7, 10].map((days) => (
                  <button
                    type="button"
                    key={days}
                    onClick={() => setDurationDays(days)}
                    className={`flex-1 py-2 rounded-[8px] text-xs font-bold border transition-all ${
                      durationDays === days
                        ? "bg-[#FAECE7] border-2 border-[#D85A30] text-[#2C2A24]"
                        : "bg-[#FFFFFF] border-[#E4DFD1] text-[#5F5E5A] hover:bg-[#FBF9F3]"
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Upload PDFs or Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5F5E5A] block">
                4. Upload PDFs or Learning Notes (Optional)
              </label>
              <div className="border-2 border-dashed border-[#E4DFD1] hover:border-[#D85A30] rounded-[8px] p-4 bg-[#FBF9F3] text-center transition-colors relative cursor-pointer group">
                <input
                  type="file"
                  accept=".txt,.md,.json,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                  <div className="p-2 rounded-[6px] bg-[#EDE8DB] text-[#5F5E5A]">
                    <Upload size={18} />
                  </div>
                  <div className="text-xs text-[#2C2A24] font-medium">
                    {fileName ? (
                      <span className="text-[#085041] bg-[#E1F5EE] px-2 py-0.5 rounded-[6px] font-semibold flex items-center gap-1">
                        <FileText size={14} />
                        {fileName}
                      </span>
                    ) : (
                      "Click to upload notes or syllabus files"
                    )}
                  </div>
                  <p className="text-[10px] text-[#888780]">Supports .txt, .md, .pdf, or paste notes below</p>
                </div>
              </div>

              <textarea
                rows={3}
                placeholder="Or paste textbook excerpts / syllabus notes here..."
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-[8px] bg-[#FBF9F3] border border-[#E4DFD1] text-[#2C2A24] placeholder:text-[#888780] text-xs focus:outline-none focus:border-[#D85A30] transition-colors resize-none mt-2"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#EDE8DB]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-[8px] text-xs font-semibold text-[#5F5E5A] hover:text-[#2C2A24] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-[8px] bg-[#D85A30] hover:bg-[#D85A30]/90 text-white font-bold text-xs transition-all flex items-center gap-2"
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

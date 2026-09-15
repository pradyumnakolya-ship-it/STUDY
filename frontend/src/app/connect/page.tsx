"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Send, CheckCircle2, Clock, MessageSquare, Search, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function ConnectPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "find">("find");
  const [searchQuery, setSearchQuery] = useState("");
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: "Harsha A", text: "Hey! Are you studying the Graph Algorithms roadmap today?", time: "10:14 AM" },
    { sender: "You", text: "Yes! Currently working through Day 2 BFS and DFS problems.", time: "10:16 AM" }
  ]);
  const [typedMessage, setTypedMessage] = useState("");

  const suggestedUsers = [
    { username: "Alex_Code", xp: 450, guilds: 3 },
    { username: "Priya_Dev", xp: 620, guilds: 4 },
    { username: "Marcus_ML", xp: 310, guilds: 2 },
    { username: "Elena_AI", xp: 780, guilds: 5 }
  ];

  const handleSendRequest = (target: string) => {
    setSentRequests(prev => [...prev, target]);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    setChatMessages(prev => [
      ...prev,
      {
        sender: "You",
        text: typedMessage.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setTypedMessage("");
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <header className="border-b border-[var(--border)] bg-white sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/home" className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-nested)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-bold text-base text-[var(--text-primary)]">Social Connect & Direct Messaging</h1>
            <p className="text-xs text-[var(--text-secondary)]">Study together, send follow requests, and chat 1-on-1</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto px-6 py-8 flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Users / Requests */}
        <div className="md:col-span-1 bg-white border border-[var(--border)] rounded-2xl p-4 shadow-xs flex flex-col h-[650px]">
          {/* Tab Navigation */}
          <div className="flex border-b border-[var(--border)] pb-2 mb-4 gap-2">
            <button
              onClick={() => setActiveTab("find")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "find" ? "bg-[var(--surface-nested)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
              }`}
            >
              Discover
            </button>
            <button
              onClick={() => setActiveTab("friends")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "friends" ? "bg-[var(--surface-nested)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
              }`}
            >
              Friends (2)
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "requests" ? "bg-[var(--surface-nested)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
              }`}
            >
              Requests (1)
            </button>
          </div>

          {activeTab === "find" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] focus:outline-none focus:border-[var(--cta-primary)]"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {suggestedUsers
                  .filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((u) => {
                    const isSent = sentRequests.includes(u.username);
                    return (
                      <div key={u.username} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-[var(--text-primary)]">{u.username}</p>
                          <p className="text-[10px] text-[var(--text-secondary)]">{u.xp} XP • {u.guilds} Guilds</p>
                        </div>

                        <button
                          onClick={() => handleSendRequest(u.username)}
                          disabled={isSent}
                          className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                            isSent 
                              ? "bg-[#E1F5EE] text-[#085041] cursor-default" 
                              : "bg-[var(--cta-primary)] text-white hover:bg-[var(--cta-primary-hover)] cursor-pointer"
                          }`}
                        >
                          {isSent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {activeTab === "friends" && (
            <div className="flex-1 overflow-y-auto space-y-2">
              {["Alex_Code", "Priya_Dev"].map((name) => (
                <div
                  key={name}
                  onClick={() => setActiveChat(name)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    activeChat === name ? "border-[var(--cta-primary)] bg-[var(--surface-nested)]" : "border-[var(--border)] hover:bg-[var(--surface-nested)]"
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">{name}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">Connected • Online</p>
                  </div>
                  <MessageSquare className="w-4 h-4 text-[var(--text-tertiary)]" />
                </div>
              ))}
            </div>
          )}

          {activeTab === "requests" && (
            <div className="flex-1 overflow-y-auto space-y-2.5">
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] space-y-2">
                <div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">Rohan_K</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">Wants to study Algorithms</p>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 py-1 rounded-lg bg-[var(--cta-primary)] text-white text-[11px] font-medium">Accept</button>
                  <button className="flex-1 py-1 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] text-[11px]">Decline</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: 1:1 Direct Messaging Window */}
        <div className="md:col-span-2 bg-white border border-[var(--border)] rounded-2xl shadow-xs flex flex-col h-[650px] overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--surface-nested)] border border-[var(--border)] flex items-center justify-center font-bold text-xs text-[var(--text-primary)]">
                {activeChat ? activeChat.charAt(0) : "A"}
              </div>
              <div>
                <p className="font-bold text-xs text-[var(--text-primary)]">{activeChat || "Alex_Code"}</p>
                <p className="text-[10px] text-[#085041] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#085041]"></span>
                  Direct Message (Encrypted)
                </p>
              </div>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[var(--surface-nested)]">
            {chatMessages.map((m, idx) => {
              const isMe = m.sender === "You";
              return (
                <div key={idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed ${
                    isMe 
                      ? "bg-[var(--cta-primary)] text-white rounded-tr-xs shadow-xs" 
                      : "bg-white border border-[var(--border)] text-[var(--text-primary)] rounded-tl-xs shadow-xs"
                  }`}>
                    {m.text}
                  </div>
                  <span className="text-[9px] text-[var(--text-tertiary)] mt-1 px-1">{m.time}</span>
                </div>
              );
            })}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-[var(--border)] flex gap-2">
            <input
              type="text"
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              placeholder={`Message ${activeChat || "Alex_Code"}...`}
              className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] focus:outline-none focus:border-[var(--cta-primary)] focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={!typedMessage.trim()}
              className="p-2.5 rounded-xl bg-[var(--cta-primary)] text-white hover:bg-[var(--cta-primary-hover)] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

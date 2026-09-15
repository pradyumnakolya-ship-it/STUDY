"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Plus, MessageSquare, Menu, Bot } from "lucide-react";
import { askQuestion } from "@/lib/api";

type Message = {
  role: "user" | "ai";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const answer = await askQuestion(userMsg);
      setMessages((prev) => [...prev, { role: "ai", content: answer }]);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Sorry, I encountered an error. Please ensure the backend is running.";
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: msg },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F7F3EA] overflow-hidden text-[#2C2A24]">
      {/* Sidebar - Desktop & Mobile overlay */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#FBF9F3] border-r border-[#E4DFD1] transform transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-4 h-full flex flex-col">
          <button className="flex items-center gap-2 bg-[#D85A30] hover:bg-[#D85A30]/90 text-white w-full py-2.5 px-4 rounded-[8px] font-bold text-sm transition-colors mb-6">
            <Plus size={18} />
            New Chat
          </button>
          
          <div className="flex-1 overflow-y-auto space-y-6">
            <div>
              <h3 className="text-xs font-bold text-[#888780] uppercase tracking-wider mb-3 px-2">Today</h3>
              <div className="space-y-1">
                <button className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E4DFD1] text-[#2C2A24] font-medium card-elevation">
                  <MessageSquare size={16} className="text-[#3C3489]" />
                  <span className="truncate">Linked Lists</span>
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="text-xs font-bold text-[#888780] uppercase tracking-wider mb-3 px-2">Previous 7 Days</h3>
              <div className="space-y-1">
                <button className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-[8px] hover:bg-[#FFFFFF] text-[#5F5E5A] hover:text-[#2C2A24] transition-colors">
                  <MessageSquare size={16} />
                  <span className="truncate">Binary Trees</span>
                </button>
                <button className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-[8px] hover:bg-[#FFFFFF] text-[#5F5E5A] hover:text-[#2C2A24] transition-colors">
                  <MessageSquare size={16} />
                  <span className="truncate">Python Basics</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F7F3EA]">
        <header className="h-14 border-b border-[#E4DFD1] bg-[#FFFFFF] flex items-center justify-between px-4 gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden text-[#5F5E5A] hover:text-[#2C2A24]"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <h2 className="font-bold text-[#2C2A24] truncate">Linked Lists</h2>
          </div>
          <a
            href="/home"
            className="px-3 py-1.5 rounded-lg border border-[#E4DFD1] text-xs font-semibold text-[#5F5E5A] hover:text-[#2C2A24] hover:bg-[#FBF9F3] transition-colors"
          >
            ← Home
          </a>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-[#FFFFFF] border border-[#E4DFD1] rounded-[12px] flex items-center justify-center mb-6 card-elevation">
                <Bot size={32} className="text-[#3C3489]" />
              </div>
              <h2 className="text-3xl font-bold mb-8 text-[#2C2A24]">What would you like to learn today?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {["Explain recursion", "What is Big O notation?", "Teach me about databases", "How does a hash table work?"].map((suggestion, i) => (
                  <button 
                    key={i}
                    onClick={() => {
                      setInput(suggestion);
                    }}
                    className="p-4 bg-[#FFFFFF] hover:bg-[#FBF9F3] rounded-[12px] text-left text-sm transition-colors border border-[#E4DFD1] text-[#2C2A24] card-elevation"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "ai" && (
                    <div className="w-8 h-8 rounded-[8px] bg-[#FFFFFF] border border-[#E4DFD1] flex items-center justify-center flex-shrink-0 mt-1 card-elevation">
                      <Bot size={18} className="text-[#3C3489]" />
                    </div>
                  )}
                  <div 
                    className={`px-4 py-3 rounded-[12px] max-w-[85%] card-elevation ${
                      msg.role === "user" 
                        ? "bg-[#D85A30] text-white rounded-br-none font-medium" 
                        : "bg-[#FFFFFF] text-[#2C2A24] border border-[#EDE8DB] rounded-bl-none prose prose-xs max-w-none prose-p:leading-relaxed prose-pre:bg-[#FBF9F3] prose-pre:border prose-pre:border-[#EDE8DB]"
                    }`}
                  >
                    {msg.role === "ai" ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-[8px] bg-[#FFFFFF] border border-[#E4DFD1] flex items-center justify-center flex-shrink-0 mt-1 card-elevation">
                    <Bot size={18} className="text-[#3C3489]" />
                  </div>
                  <div className="px-5 py-4 rounded-[12px] bg-[#FFFFFF] border border-[#EDE8DB] rounded-bl-none flex items-center gap-1.5 card-elevation">
                    <div className="w-2 h-2 bg-[#D85A30] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-[#D85A30] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-[#D85A30] rounded-full animate-bounce"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="p-4 bg-[#F7F3EA] border-t border-[#E4DFD1]">
          <div className="max-w-3xl mx-auto relative flex items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask StudyGPT anything..."
              className="w-full bg-[#FFFFFF] border border-[#E4DFD1] rounded-[8px] pl-4 pr-12 py-3.5 text-[#2C2A24] placeholder:text-[#888780] focus:outline-none focus:ring-1 focus:ring-[#D85A30] resize-none max-h-48 overflow-y-auto text-sm"
              rows={1}
              style={{ minHeight: "52px" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="absolute right-2.5 bottom-2.5 p-2 bg-[#D85A30] hover:bg-[#D85A30]/90 disabled:opacity-30 text-white rounded-[6px] transition-colors flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-center text-xs text-[#888780] mt-2.5">
            StudyGPT can make mistakes. Consider verifying important information.
          </p>
        </div>
      </div>
    </div>
  );
}

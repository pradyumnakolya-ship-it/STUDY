"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  RefreshCw, 
  ChevronRight, 
  ChevronLeft,
  Lightbulb,
  Maximize2,
  Minimize2,
  BookOpen
} from "lucide-react";
import { askQuestion } from "@/lib/api";

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: string;
}

interface AITutorPanelProps {
  currentTopic: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  externalPrompt?: string;
  onClearExternalPrompt?: () => void;
}

export default function AITutorPanel({
  currentTopic,
  isCollapsed,
  onToggleCollapse,
  externalPrompt,
  onClearExternalPrompt,
}: AITutorPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "ai",
      content: `👋 **Greetings! I am your StudyGPT AI Tutor.**\n\nI am grounded in **${currentTopic}**. Ask me to explain difficult theorems, request analogies, or test your readiness for today's guild quiz.`,
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (externalPrompt) {
      sendMessage(externalPrompt);
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt]);

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const promptWithContext = `Context: Currently studying "${currentTopic}".\n\nStudent Question: ${textToSend.trim()}`;
      const answer = await askQuestion(promptWithContext);

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Failed to connect to AI Tutor. Check backend connection.";
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: `⚠️ **Notice:** ${errMsg}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const quickPrompts = [
    { label: "Give me an analogy", text: `Can you give me a real-world analogy to understand ${currentTopic}?` },
    { label: "Break this down", text: `Can you break down the main concepts of ${currentTopic} into simple bullet points?` },
    { label: "Quiz me on this", text: `Give me 2 difficult practice questions about ${currentTopic} to test my understanding.` },
  ];

  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="h-full w-12 bg-[#FBF9F3] border-l border-[#E4DFD1] hover:bg-[#FFFFFF] flex flex-col items-center justify-between py-6 transition-colors group cursor-pointer"
        title="Expand AI Tutor Panel"
      >
        <div className="p-2 rounded-[8px] bg-[#EEEDFE] text-[#3C3489] transition-transform">
          <Sparkles size={18} />
        </div>
        <span className="text-xs font-bold tracking-widest text-[#5F5E5A] uppercase [writing-mode:vertical-rl] rotate-180 flex items-center gap-2">
          AI Tutor Co-Pilot
        </span>
        <ChevronLeft size={18} className="text-[#888780] group-hover:text-[#2C2A24]" />
      </button>
    );
  }

  return (
    <aside 
      className={`h-full bg-[#FBF9F3] border-l border-[#E4DFD1] flex flex-col transition-all duration-300 ${
        isExpanded ? "w-full md:w-[540px]" : "w-full md:w-[390px]"
      }`}
    >
      {/* Panel Header */}
      <div className="p-3.5 border-b border-[#E4DFD1] flex items-center justify-between bg-[#FFFFFF]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-[8px] bg-[#FBF9F3] border border-[#E4DFD1] text-[#2C2A24]">
            <Bot size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-[#2C2A24]">StudyGPT Tutor</h3>
              <span className="text-[10px] bg-[#FBF9F3] text-[#5F5E5A] font-bold px-1.5 py-0.5 rounded-[6px] border border-[#E4DFD1]">
                gemini-3.6-flash
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#5F5E5A]">
              <BookOpen size={11} className="text-[#3C3489]" />
              <span className="truncate max-w-[170px]">{currentTopic}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-[#5F5E5A] hover:text-[#2C2A24] rounded-[6px] hover:bg-[#FBF9F3] transition-colors hidden md:block"
            title={isExpanded ? "Standard width" : "Expand width"}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            onClick={() => {
              setMessages([
                {
                  id: Date.now().toString(),
                  role: "ai",
                  content: `Cleared! Ready for your next questions about **${currentTopic}**.`,
                  timestamp: "Just now",
                },
              ]);
            }}
            className="p-1.5 text-[#5F5E5A] hover:text-[#2C2A24] rounded-[6px] hover:bg-[#FBF9F3] transition-colors"
            title="Clear Chat"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-[#5F5E5A] hover:text-[#2C2A24] rounded-[6px] hover:bg-[#FBF9F3] transition-colors"
            title="Collapse Panel"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F7F3EA]">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "ai" && (
              <div className="w-7 h-7 rounded-full bg-[#FFFFFF] border border-[#E4DFD1] text-[#3C3489] flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={14} />
              </div>
            )}
            <div 
              className={`max-w-[88%] rounded-[12px] px-4 py-3 text-xs md:text-sm leading-relaxed card-elevation ${
                msg.role === "user"
                  ? "bg-[#D85A30] text-white font-medium rounded-br-none"
                  : "bg-[#FFFFFF] text-[#2C2A24] border border-[#EDE8DB] rounded-bl-none prose prose-xs max-w-none prose-p:my-1.5 prose-headings:my-2 prose-pre:bg-[#FBF9F3] prose-pre:border prose-pre:border-[#EDE8DB] prose-pre:text-[#2C2A24] prose-pre:p-2.5 prose-pre:rounded-[8px]"
              }`}
            >
              {msg.role === "ai" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
              <span className={`block text-[10px] mt-1 text-right ${msg.role === "user" ? "text-white/80" : "text-[#888780]"}`}>
                {msg.timestamp}
              </span>
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-[#FFFFFF] border border-[#E4DFD1] text-[#D85A30] flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 items-start">
            <div className="w-7 h-7 rounded-full bg-[#FFFFFF] border border-[#E4DFD1] text-[#3C3489] flex items-center justify-center shrink-0">
              <Sparkles size={14} />
            </div>
            <div className="bg-[#FFFFFF] border border-[#EDE8DB] rounded-[12px] rounded-bl-none px-4 py-3 flex items-center gap-1.5 card-elevation">
              <div className="w-1.5 h-1.5 rounded-full bg-[#D85A30] animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#D85A30] animate-pulse [animation-delay:200ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#D85A30] animate-pulse [animation-delay:400ms]" />
              <span className="text-xs text-[#5F5E5A] ml-1">AI Tutor thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-3 py-2 border-t border-[#E4DFD1] bg-[#FBF9F3] flex gap-1.5 overflow-x-auto no-scrollbar">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(qp.text)}
            className="text-[11px] whitespace-nowrap bg-transparent hover:bg-[#FFFFFF] border border-[#B4B2A9] text-[#444441] px-3 py-1 rounded-[8px] transition-colors flex items-center gap-1 font-medium"
          >
            <Lightbulb size={11} className="text-[#3C3489] shrink-0" />
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-[#E4DFD1] bg-[#FFFFFF]">
        <div className="relative flex items-center bg-[#FBF9F3] rounded-[8px] border border-[#E4DFD1] focus-within:border-[#D85A30] transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Ask about ${currentTopic}...`}
            className="w-full bg-transparent text-[#2C2A24] placeholder:text-[#888780] text-xs md:text-sm pl-3.5 pr-11 py-3 focus:outline-none resize-none max-h-28 overflow-y-auto"
            style={{ minHeight: "44px" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2 rounded-[6px] bg-[#D85A30] text-white font-bold hover:bg-[#D85A30]/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Send message"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[10px] text-center text-[#888780] mt-1.5">
          StudyGPT AI Tutor • Powered by Google Gemini
        </p>
      </div>
    </aside>
  );
}

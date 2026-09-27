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
  BookOpen,
  ChevronDown,
  Check
} from "lucide-react";
import { askQuestionDetailed, getAvailableAIModels, AIModelInfo } from "@/lib/api";

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: string;
  provider?: string;
  model?: string;
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
  const [models, setModels] = useState<AIModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModelInfo | null>(null);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const cat = await getAvailableAIModels();
        setModels(cat.models);
        const initial = cat.models.find(m => m.id === cat.default_model) 
          || cat.models.find(m => m.is_configured) 
          || cat.models[0];
        setSelectedModel(initial || null);
      } catch (err) {
        console.warn("Studio tutor failed to load models catalog:", err);
      }
    }
    loadCatalog();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

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
      const result = await askQuestionDetailed(
        promptWithContext,
        selectedModel?.provider,
        selectedModel?.id
      );

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: result.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        provider: result.provider,
        model: result.model,
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

  useEffect(() => {
    if (externalPrompt) {
      const timer = setTimeout(() => {
        sendMessage(externalPrompt);
        if (onClearExternalPrompt) onClearExternalPrompt();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [externalPrompt, onClearExternalPrompt]);

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
        className="h-full w-12 bg-[#0a0a0c] border-l border-[rgba(255,255,255,0.08)] hover:bg-[#101012] flex flex-col items-center justify-between py-6 transition-colors group cursor-pointer"
        title="Expand AI Tutor Panel"
      >
        <div className="p-2 rounded-[8px] bg-[#101012] text-[#fcfdff] transition-transform">
          <Sparkles size={18} />
        </div>
        <span className="text-xs font-bold tracking-widest text-[#888e90] uppercase [writing-mode:vertical-rl] rotate-180 flex items-center gap-2">
          AI Tutor Co-Pilot
        </span>
        <ChevronLeft size={18} className="text-[#888e90] group-hover:text-[#fcfdff]" />
      </button>
    );
  }

  return (
    <aside 
      className={`h-full bg-[#0a0a0c] border-l border-[rgba(255,255,255,0.08)] flex flex-col transition-all duration-300 ${
        isExpanded ? "w-full md:w-[540px]" : "w-full md:w-[390px]"
      }`}
    >
      {/* Panel Header */}
      <div className="p-3.5 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between bg-[#0a0a0c] relative z-20">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-[8px] bg-[#101012] border border-[rgba(255,255,255,0.14)] text-[#fcfdff]">
            <Bot size={20} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 relative">
              <h3 className="font-bold text-sm text-[#fcfdff]">StudyGPT Tutor</h3>
              
              {/* Interactive model selector */}
              <div className="relative">
                <button
                  onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                  className="flex items-center gap-1 text-[10px] bg-[#101012] hover:bg-[rgba(255,255,255,0.06)] text-[#fcfdff] font-medium px-2 py-0.5 rounded-[6px] border border-[rgba(255,255,255,0.14)] transition-colors cursor-pointer"
                  title="Switch AI Model"
                >
                  <span className="truncate max-w-[90px]">{selectedModel?.name || "Model"}</span>
                  <ChevronDown size={11} className="text-[#888e90]" />
                </button>

                {modelDropdownOpen && (
                  <div className="absolute left-0 mt-1 w-64 bg-[#101012] border border-[rgba(255,255,255,0.14)] rounded-lg shadow-lg z-50 p-1.5 animate-in fade-in duration-100">
                    <p className="text-[10px] font-mono text-[#888e90] px-2 py-1 uppercase tracking-wider">Select AI Model</p>
                    <div className="max-h-56 overflow-y-auto space-y-0.5">
                      {models.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedModel(m);
                            setModelDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            selectedModel?.id === m.id ? "bg-[rgba(255,255,255,0.1)] font-semibold text-[#fcfdff]" : "hover:bg-[rgba(255,255,255,0.06)] text-[#888e90]"
                          }`}
                        >
                          <div className="truncate">
                            <span>{m.name}</span>
                            <span className="block text-[9px] text-[#888e90] truncate">{m.provider_display}</span>
                          </div>
                          {selectedModel?.id === m.id && <Check size={12} className="text-[#11ff99] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#888e90]">
              <BookOpen size={11} className="text-[#3b9eff]" />
              <span className="truncate max-w-[170px]">{currentTopic}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-[#888e90] hover:text-[#fcfdff] rounded-[6px] hover:bg-[#101012] transition-colors hidden md:block cursor-pointer"
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
            className="p-1.5 text-[#888e90] hover:text-[#fcfdff] rounded-[6px] hover:bg-[#101012] transition-colors cursor-pointer"
            title="Clear Chat"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-[#888e90] hover:text-[#fcfdff] rounded-[6px] hover:bg-[#101012] transition-colors cursor-pointer"
            title="Collapse Panel"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#06060a]">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "ai" && (
              <div className="w-7 h-7 rounded-full bg-[#101012] border border-[rgba(255,255,255,0.14)] text-[#ffc53d] flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={14} />
              </div>
            )}
            <div 
              className={`max-w-[88%] rounded-[12px] px-4 py-3 text-xs md:text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#fcfdff] text-[#000000] font-medium rounded-br-none"
                  : "bg-[#0a0a0c] text-[#fcfdff] border border-[rgba(255,255,255,0.08)] rounded-bl-none prose prose-invert prose-xs max-w-none prose-p:my-1.5 prose-headings:my-2 prose-pre:bg-[#101012] prose-pre:border prose-pre:border-[rgba(255,255,255,0.14)] prose-pre:text-[#fcfdff] prose-pre:p-2.5 prose-pre:rounded-[8px]"
              }`}
            >
              {msg.role === "ai" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
              <span className={`block text-[10px] mt-1 text-right ${msg.role === "user" ? "text-black/60 font-mono" : "text-[#888e90] font-mono"}`}>
                {msg.timestamp}
              </span>
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-[#fcfdff] text-[#000000] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                <User size={14} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 items-start">
            <div className="w-7 h-7 rounded-full bg-[#101012] border border-[rgba(255,255,255,0.14)] text-[#ffc53d] flex items-center justify-center shrink-0">
              <Sparkles size={14} />
            </div>
            <div className="bg-[#0a0a0c] border border-[rgba(255,255,255,0.08)] rounded-[12px] rounded-bl-none px-4 py-3 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff801f] animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff801f] animate-pulse [animation-delay:200ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff801f] animate-pulse [animation-delay:400ms]" />
              <span className="text-xs text-[#888e90] ml-1 font-mono">AI Tutor thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-3 py-2 border-t border-[rgba(255,255,255,0.08)] bg-[#0a0a0c] flex gap-1.5 overflow-x-auto no-scrollbar">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(qp.text)}
            className="text-[11px] whitespace-nowrap bg-[#101012] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.14)] text-[#fcfdff] px-3 py-1 rounded-[8px] transition-colors flex items-center gap-1 font-medium cursor-pointer"
          >
            <Lightbulb size={11} className="text-[#ffc53d] shrink-0" />
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-[rgba(255,255,255,0.08)] bg-[#0a0a0c]">
        <div className="relative flex items-center bg-[#101012] rounded-[8px] border border-[rgba(255,255,255,0.14)] focus-within:border-[rgba(255,255,255,0.3)] transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Ask about ${currentTopic}...`}
            className="w-full bg-transparent text-[#fcfdff] placeholder:text-[#888e90] text-xs md:text-sm pl-3.5 pr-11 py-3 focus:outline-none resize-none max-h-28 overflow-y-auto"
            style={{ minHeight: "44px" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2 rounded-[6px] bg-[#fcfdff] text-[#000000] font-bold hover:bg-[#f1f7fe] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Send message"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[10px] text-center text-[#888e90] mt-1.5 font-mono">
          StudyGPT AI Tutor • Powered by Google Gemini 3.8 Flash
        </p>
      </div>
    </aside>
  );
}

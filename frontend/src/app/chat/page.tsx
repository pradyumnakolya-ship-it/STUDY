"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Menu, 
  Bot, 
  Sparkles, 
  Brain, 
  Zap, 
  ChevronDown, 
  Check, 
  Key, 
  X, 
  ShieldAlert,
  Cpu
} from "lucide-react";
import { askQuestionDetailed, getAvailableAIModels, AIModelInfo } from "@/lib/api";

type Message = {
  role: "user" | "ai";
  content: string;
  provider?: string;
  model?: string;
  providerDisplay?: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [models, setModels] = useState<AIModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModelInfo | null>(null);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [configModalModel, setConfigModalModel] = useState<AIModelInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load available models from backend on mount
  useEffect(() => {
    async function loadModels() {
      try {
        const catalog = await getAvailableAIModels();
        setModels(catalog.models);
        // Default to configured model or default
        const defaultChoice = catalog.models.find(m => m.id === catalog.default_model) 
          || catalog.models.find(m => m.is_configured) 
          || catalog.models[0];
        setSelectedModel(defaultChoice || null);
      } catch (err) {
        console.error("Failed to load AI models:", err);
      }
    }
    loadModels();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSelectModel = (m: AIModelInfo) => {
    setSelectedModel(m);
    setModelDropdownOpen(false);
    if (!m.is_configured) {
      setConfigModalModel(m);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const result = await askQuestionDetailed(
        userMsg,
        selectedModel?.provider,
        selectedModel?.id
      );
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: result.answer,
          provider: result.provider,
          model: result.model,
          providerDisplay: result.provider_display,
        },
      ]);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Sorry, I encountered an error. Please ensure the backend is running.";
      setMessages((prev) => [
        ...prev,
        { 
          role: "ai", 
          content: msg,
          provider: selectedModel?.provider || "system",
          model: selectedModel?.id || "error",
          providerDisplay: selectedModel?.provider_display || "System Notice",
        },
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

  // Helper to render icon per provider
  const renderProviderIcon = (provider?: string, size = 16) => {
    switch (provider?.toLowerCase()) {
      case "gemini":
        return <Sparkles size={size} className="text-amber-500" />;
      case "openai":
        return <Bot size={size} className="text-emerald-600" />;
      case "anthropic":
        return <Brain size={size} className="text-purple-600" />;
      case "grok":
        return <Zap size={size} className="text-rose-500" />;
      default:
        return <Cpu size={size} className="text-[#3C3489]" />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F7F3EA] overflow-hidden text-[#2C2A24]">
      {/* Sidebar - Desktop & Mobile overlay */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#FBF9F3] border-r border-[#E4DFD1] transform transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-4 h-full flex flex-col">
          <button 
            onClick={() => setMessages([])}
            className="flex items-center gap-2 bg-[#D85A30] hover:bg-[#D85A30]/90 text-white w-full py-2.5 px-4 rounded-[8px] font-bold text-sm transition-colors mb-6 shadow-sm"
          >
            <Plus size={18} />
            New Chat
          </button>
          
          <div className="flex-1 overflow-y-auto space-y-6">
            <div>
              <h3 className="text-xs font-bold text-[#888780] uppercase tracking-wider mb-3 px-2">Recent Sessions</h3>
              <div className="space-y-1">
                <button className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-[8px] bg-[#FFFFFF] border border-[#E4DFD1] text-[#2C2A24] font-medium card-elevation">
                  <MessageSquare size={16} className="text-[#3C3489]" />
                  <span className="truncate">Active Study Tutor</span>
                </button>
              </div>
            </div>

            {/* Provider quick status in sidebar */}
            <div className="pt-4 border-t border-[#E4DFD1]">
              <h3 className="text-xs font-bold text-[#888780] uppercase tracking-wider mb-2.5 px-2">Supported AI</h3>
              <div className="space-y-1.5 px-2 text-xs">
                {[
                  { name: "Google Gemini", prov: "gemini" },
                  { name: "ChatGPT (OpenAI)", prov: "openai" },
                  { name: "Claude (Anthropic)", prov: "anthropic" },
                  { name: "Grok (xAI)", prov: "grok" }
                ].map((item) => {
                  const isReady = models.some(m => m.provider === item.prov && m.is_configured);
                  return (
                    <div key={item.prov} className="flex items-center justify-between py-1 text-[#5F5E5A]">
                      <span className="flex items-center gap-1.5">
                        {renderProviderIcon(item.prov, 14)}
                        {item.name}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        isReady 
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-300" 
                          : "bg-stone-200 text-stone-600 border border-stone-300"
                      }`}>
                        {isReady ? "Active" : "Key Needed"}
                      </span>
                    </div>
                  );
                })}
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
        {/* Header with Multi-AI Model Switcher */}
        <header className="h-16 border-b border-[#E4DFD1] bg-[#FFFFFF] flex items-center justify-between px-4 gap-4 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden text-[#5F5E5A] hover:text-[#2C2A24]"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#2C2A24] text-base hidden sm:inline">StudyGPT</span>
              <span className="text-[#888780] hidden sm:inline">•</span>
              <span className="text-sm font-semibold text-[#5F5E5A]">AI Tutor</span>
            </div>
          </div>

          {/* Model Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E4DFD1] bg-[#FBF9F3] hover:bg-[#FFFFFF] text-xs font-semibold text-[#2C2A24] transition-all shadow-xs"
            >
              {renderProviderIcon(selectedModel?.provider, 15)}
              <span className="font-bold">{selectedModel?.name || "Select AI Model"}</span>
              {selectedModel?.is_configured ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Ready to chat" />
              ) : (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded font-medium">Key Needed</span>
              )}
              <ChevronDown size={14} className="text-[#888780]" />
            </button>

            {/* Dropdown Menu */}
            {modelDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-[#FFFFFF] border border-[#E4DFD1] rounded-xl shadow-xl z-50 p-2 text-left animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-2 border-b border-[#E4DFD1] mb-1">
                  <p className="text-xs font-bold text-[#2C2A24]">Switch AI Study Engine</p>
                  <p className="text-[11px] text-[#888780]">Select which frontier model powers your study tutor</p>
                </div>
                
                <div className="max-h-80 overflow-y-auto space-y-1">
                  {models.map((m) => {
                    const isSelected = selectedModel?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleSelectModel(m)}
                        className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-start justify-between gap-2 ${
                          isSelected ? "bg-[#F7F3EA] border border-[#D85A30]/40" : "hover:bg-[#FBF9F3]"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="mt-0.5">{renderProviderIcon(m.provider, 16)}</div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs text-[#2C2A24] truncate">{m.name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-mono">
                                {m.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#888780] line-clamp-1 mt-0.5">{m.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {m.is_configured ? (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Ready
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Add Key
                            </span>
                          )}
                          {isSelected && <Check size={14} className="text-[#D85A30]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 pt-2 border-t border-[#E4DFD1] px-2 text-[11px] text-[#888780] flex items-center justify-between">
                  <span>Supports Gemini, ChatGPT, Claude & Grok</span>
                  <a 
                    href="#config" 
                    onClick={(e) => {
                      e.preventDefault();
                      setModelDropdownOpen(false);
                      setConfigModalModel(selectedModel);
                    }}
                    className="text-[#D85A30] font-semibold hover:underline flex items-center gap-1"
                  >
                    <Key size={11} /> API Keys
                  </a>
                </div>
              </div>
            )}
          </div>

          <a
            href="/home"
            className="px-3 py-1.5 rounded-lg border border-[#E4DFD1] text-xs font-semibold text-[#5F5E5A] hover:text-[#2C2A24] hover:bg-[#FBF9F3] transition-colors"
          >
            ← Home
          </a>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-[#FFFFFF] border border-[#E4DFD1] rounded-[16px] flex items-center justify-center mb-6 card-elevation shadow-sm">
                {renderProviderIcon(selectedModel?.provider, 32)}
              </div>
              <h2 className="text-3xl font-bold mb-3 text-[#2C2A24]">
                Learn with {selectedModel?.name || "StudyGPT"}
              </h2>
              <p className="text-sm text-[#888780] max-w-md mb-8">
                Your personal AI study tutor. Switch anytime between Gemini, ChatGPT, Claude, and Grok to see different explanations and insights.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {[
                  "Explain recursion with a real-life analogy",
                  "What is Big O notation in simple terms?",
                  "How do neural networks learn?",
                  "Teach me dynamic programming step by step",
                ].map((suggestion, i) => (
                  <button 
                    key={i}
                    onClick={() => {
                      setInput(suggestion);
                    }}
                    className="p-4 bg-[#FFFFFF] hover:bg-[#FBF9F3] rounded-[12px] text-left text-sm transition-all border border-[#E4DFD1] text-[#2C2A24] card-elevation hover:border-[#D85A30]/50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-[#D85A30]">Topic {i + 1}</span>
                      <ChevronDown size={13} className="-rotate-90 text-[#888780]" />
                    </div>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  {/* Model badge header for AI messages */}
                  {msg.role === "ai" && (
                    <div className="flex items-center gap-1.5 mb-1.5 px-1 text-[11px] font-semibold text-[#888780]">
                      {renderProviderIcon(msg.provider, 13)}
                      <span>{msg.providerDisplay || "AI Tutor"}</span>
                      {msg.model && (
                        <span className="font-mono text-[10px] bg-[#EDE8DB] text-[#5F5E5A] px-1.5 py-0.2 rounded">
                          {msg.model}
                        </span>
                      )}
                    </div>
                  )}

                  <div className={`flex gap-3 max-w-[90%] ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "ai" && (
                      <div className="w-8 h-8 rounded-[8px] bg-[#FFFFFF] border border-[#E4DFD1] flex items-center justify-center flex-shrink-0 mt-1 card-elevation">
                        {renderProviderIcon(msg.provider, 18)}
                      </div>
                    )}
                    <div 
                      className={`px-4 py-3 rounded-[12px] card-elevation ${
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
                </div>
              ))}
              
              {loading && (
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-1.5 mb-1.5 px-1 text-[11px] font-semibold text-[#888780]">
                    {renderProviderIcon(selectedModel?.provider, 13)}
                    <span>{selectedModel?.name || "AI Tutor"} is thinking...</span>
                  </div>
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-[8px] bg-[#FFFFFF] border border-[#E4DFD1] flex items-center justify-center flex-shrink-0 mt-1 card-elevation">
                      {renderProviderIcon(selectedModel?.provider, 18)}
                    </div>
                    <div className="px-5 py-4 rounded-[12px] bg-[#FFFFFF] border border-[#EDE8DB] rounded-bl-none flex items-center gap-1.5 card-elevation">
                      <div className="w-2 h-2 bg-[#D85A30] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-[#D85A30] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-[#D85A30] rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-[#F7F3EA] border-t border-[#E4DFD1]">
          <div className="max-w-3xl mx-auto relative flex items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${selectedModel?.name || "StudyGPT"} anything...`}
              className="w-full bg-[#FFFFFF] border border-[#E4DFD1] rounded-[8px] pl-4 pr-12 py-3.5 text-[#2C2A24] placeholder:text-[#888780] focus:outline-none focus:ring-1 focus:ring-[#D85A30] resize-none max-h-48 overflow-y-auto text-sm shadow-xs"
              rows={1}
              style={{ minHeight: "52px" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="absolute right-2.5 bottom-2.5 p-2 bg-[#D85A30] hover:bg-[#D85A30]/90 disabled:opacity-30 text-white rounded-[6px] transition-colors flex items-center justify-center shadow-xs"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="flex items-center justify-center gap-3 text-xs text-[#888780] mt-2.5">
            <span>Powered by {selectedModel?.provider_display || "Google Gemini"}</span>
            <span>•</span>
            <span>StudyGPT can make mistakes. Verify critical facts.</span>
          </div>
        </div>
      </div>

      {/* API Key Configuration Guidance Modal */}
      {configModalModel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E4DFD1] rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <Key size={18} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#2C2A24]">
                    Configure {configModalModel.name}
                  </h3>
                  <p className="text-[11px] text-[#888780]">{configModalModel.provider_display}</p>
                </div>
              </div>
              <button 
                onClick={() => setConfigModalModel(null)}
                className="text-[#888780] hover:text-[#2C2A24] p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#5F5E5A] mb-6">
              <p>
                To enable <strong>{configModalModel.name}</strong>, you need to add your API key to your backend configuration.
              </p>

              <div className="p-3 bg-[#FBF9F3] border border-[#E4DFD1] rounded-lg space-y-1 font-mono text-[11px]">
                <p className="text-[#888780] font-sans text-[10px] uppercase font-bold tracking-wider">Required Variable in backend/.env</p>
                <p className="text-[#D85A30] font-bold select-all">{configModalModel.env_var}=your_api_key_here</p>
              </div>

              <div className="space-y-1 pt-1">
                <p className="font-semibold text-[#2C2A24]">How to set it up:</p>
                <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                  <li>Open the file <code className="bg-[#EDE8DB] px-1 py-0.5 rounded text-[#2C2A24]">backend/.env</code> in your editor.</li>
                  <li>Add your <code className="text-[#D85A30]">{configModalModel.env_var}</code> key.</li>
                  <li>Save and restart the backend server.</li>
                </ol>
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2 text-[11px] text-blue-800">
                <ShieldAlert size={15} className="text-blue-600 shrink-0 mt-0.5" />
                <span>Google Gemini is already pre-configured and ready to use immediately without extra setup!</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfigModalModel(null)}
                className="px-4 py-2 rounded-lg bg-[#D85A30] text-white font-semibold text-xs hover:bg-[#D85A30]/90 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

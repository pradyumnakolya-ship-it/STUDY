"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Menu, 
  Bot, 
  Trash2, 
  ArrowLeft, 
  Sparkles, 
  Loader2,
  X 
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { askQuestion } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface ConversationItem {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export default function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Load user conversations on mount
  useEffect(() => {
    loadUserConversations();
  }, [user]);

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("studygpt_token") : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  const loadUserConversations = async () => {
    setLoadingConversations(true);
    try {
      const res = await fetch("http://localhost:8000/chat/conversations", {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0 && !activeConversationId) {
          selectConversation(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const selectConversation = (conv: ConversationItem) => {
    setActiveConversationId(conv.id);
    setMessages(conv.messages || []);
    setSidebarOpen(false);
  };

  const handleNewChat = async () => {
    try {
      const res = await fetch("http://localhost:8000/chat/conversations", {
        method: "POST",
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const newConv = await res.json();
        setConversations(prev => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
        setMessages([]);
      }
    } catch (err) {
      // Fallback offline session
      const mockId = `conv-${Date.now()}`;
      setActiveConversationId(mockId);
      setMessages([]);
    }
    setSidebarOpen(false);
  };

  const handleDeleteConversation = async (cid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:8000/chat/conversations/${cid}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      setConversations(prev => prev.filter(c => c.id !== cid));
      if (activeConversationId === cid) {
        const remaining = conversations.filter(c => c.id !== cid);
        if (remaining.length > 0) {
          selectConversation(remaining[0]);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Failed to delete conversation", err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMsgText = input.trim();
    setInput("");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const initialAiMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, userMsg, initialAiMsg]);
    setIsStreaming(true);

    let cid = activeConversationId;
    if (!cid) {
      cid = `conv-${Date.now()}`;
      setActiveConversationId(cid);
    }

    try {
      const response = await fetch(`http://localhost:8000/chat/conversations/${cid}/messages/stream`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ message: userMsgText })
      });

      if (!response.ok || !response.body) {
        throw new Error("Stream not available");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.token) {
                  accumulatedText += data.token;
                  setMessages(prev => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
                      updated[lastIdx] = {
                        ...updated[lastIdx],
                        content: accumulatedText
                      };
                    }
                    return updated;
                  });
                }
              } catch {
                // Ignore parse errors on partial chunks
              }
            }
          }
        }
      }

      // Update conversations list title if new
      setConversations(prev => {
        const found = prev.find(c => c.id === cid);
        if (found) {
          return prev.map(c => c.id === cid ? { ...c, updated_at: new Date().toISOString() } : c);
        } else {
          return [{
            id: cid!,
            user_id: user?.id || "default",
            title: userMsgText.slice(0, 32),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            messages: [...messages, userMsg, { ...initialAiMsg, content: accumulatedText }]
          }, ...prev];
        }
      });

    } catch (error) {
      // Fallback to standard askQuestion
      try {
        const answer = await askQuestion(userMsgText);
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0) {
            updated[lastIdx] = { ...updated[lastIdx], content: answer };
          }
          return updated;
        });
      } catch (err: any) {
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0) {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: `⚠️ Failed to get answer: ${err.message || "Please check backend server connection"}.`
            };
          }
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group conversations by time
  const now = new Date();
  const todayConvs = conversations.filter(c => {
    const d = new Date(c.updated_at || c.created_at);
    return now.toDateString() === d.toDateString();
  });
  const pastConvs = conversations.filter(c => {
    const d = new Date(c.updated_at || c.created_at);
    return now.toDateString() !== d.toDateString();
  });

  return (
    <div className="flex h-screen w-full bg-[var(--background)] overflow-hidden text-[var(--text-primary)]">
      
      {/* Sidebar (Desktop & Mobile Overlay) */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-[var(--border)] transform transition-transform duration-300 md:relative md:translate-x-0 flex flex-col shadow-sm ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Hub</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 text-[var(--text-secondary)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 flex flex-col overflow-hidden">
          <button 
            onClick={handleNewChat}
            className="flex items-center justify-center gap-2 bg-[var(--cta-primary)] hover:bg-[var(--cta-primary-hover)] text-white w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer mb-5"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat Session</span>
          </button>
          
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            {loadingConversations ? (
              <div className="py-6 text-center text-xs text-[var(--text-secondary)] flex flex-col items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--cta-primary)]" />
                <span>Loading sessions...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-6 text-center text-xs text-[var(--text-secondary)]">
                No past sessions yet. Ask a question to start!
              </div>
            ) : (
              <>
                {todayConvs.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 px-2">Today</h3>
                    <div className="space-y-1">
                      {todayConvs.map(conv => (
                        <div
                          key={conv.id}
                          onClick={() => selectConversation(conv)}
                          className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
                            activeConversationId === conv.id 
                              ? "bg-[var(--surface-nested)] border border-[var(--cta-primary)] text-[var(--text-primary)]" 
                              : "hover:bg-[var(--surface-nested)] text-[var(--text-secondary)]"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[var(--cta-primary)]" />
                            <span className="truncate">{conv.title || "Study Session"}</span>
                          </div>
                          <button
                            title="Delete Chat"
                            onClick={(e) => handleDeleteConversation(conv.id, e)}
                            className="p-1 text-[var(--text-secondary)] hover:text-[#72243E] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pastConvs.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 px-2">Previous 7 Days</h3>
                    <div className="space-y-1">
                      {pastConvs.map(conv => (
                        <div
                          key={conv.id}
                          onClick={() => selectConversation(conv)}
                          className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
                            activeConversationId === conv.id 
                              ? "bg-[var(--surface-nested)] border border-[var(--cta-primary)] text-[var(--text-primary)]" 
                              : "hover:bg-[var(--surface-nested)] text-[var(--text-secondary)]"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[var(--text-tertiary)]" />
                            <span className="truncate">{conv.title || "Study Session"}</span>
                          </div>
                          <button
                            title="Delete Chat"
                            onClick={(e) => handleDeleteConversation(conv.id, e)}
                            className="p-1 text-[var(--text-secondary)] hover:text-[#72243E] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col h-full bg-[var(--surface-nested)]">
        {/* Header */}
        <header className="h-16 border-b border-[var(--border)] bg-white px-6 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-[#FAECE7] text-[var(--cta-primary)] flex items-center justify-center font-bold text-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-xs text-[var(--text-primary)]">AI Study Tutor</h1>
              <p className="text-[10px] text-[var(--text-secondary)]">Token-by-Token Streaming • Beginner-Friendly Explanations</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#E1F5EE] text-[#085041] border border-[#B7EBD8] flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Active Tutor</span>
            </span>
          </div>
        </header>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl w-full mx-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#FAECE7] text-[var(--cta-primary)] flex items-center justify-center mb-4">
                <Bot className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">
                How can I help you study today?
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mb-6">
                Ask me to break down difficult concepts, explain code with real-world analogies, or test your knowledge.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
                {[
                  "Explain dynamic programming for beginners",
                  "How does virtual memory work in OS?",
                  "Give me 2 practice questions on graph BFS",
                  "Why do we need normalization in databases?"
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(prompt);
                    }}
                    className="p-3 rounded-xl border border-[var(--border)] bg-white hover:border-[var(--cta-primary)] hover:text-[var(--cta-primary)] text-xs transition-all text-left shadow-xs cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div 
                  key={m.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
                      isUser 
                        ? "bg-[var(--cta-primary)] text-white font-medium rounded-tr-xs" 
                        : "bg-white border border-[var(--border)] text-[var(--text-primary)] rounded-tl-xs"
                    }`}
                  >
                    {!isUser && !m.content ? (
                      <div className="flex items-center gap-1.5 py-1 text-[var(--text-secondary)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--cta-primary)] animate-ping"></span>
                        <span className="italic">Thinking & streaming response...</span>
                      </div>
                    ) : (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-sm font-bold mt-2 mb-1" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-xs font-bold mt-2 mb-1" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-xs font-semibold mt-1 mb-0.5" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                          code: ({node, ...props}) => (
                            <code className="bg-[var(--surface-nested)] text-[var(--cta-primary)] px-1.5 py-0.5 rounded text-[11px] font-mono" {...props} />
                          )
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    )}
                  </div>
                  {m.timestamp && (
                    <span className="text-[9px] text-[var(--text-tertiary)] mt-1 px-1">{m.timestamp}</span>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[var(--border)] bg-white">
          <div className="max-w-4xl mx-auto flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question or request an explanation..."
              className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] focus:outline-none focus:border-[var(--cta-primary)] focus:bg-white transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="px-4 py-2.5 rounded-xl bg-[var(--cta-primary)] text-white font-semibold text-xs hover:bg-[var(--cta-primary-hover)] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isStreaming ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

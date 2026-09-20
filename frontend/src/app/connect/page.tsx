"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Users, 
  Send, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Search, 
  UserPlus, 
  Wifi, 
  WifiOff, 
  Loader2 
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { searchStudents, getDirectMessages, UserSearchItem } from "@/lib/api";

interface MessageItem {
  id?: string;
  sender: string;
  text: string;
  time: string;
}

export default function ConnectPage() {
  const { user } = useAuth();
  const currentUsername = user?.username || "Harsha A";

  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "find">("find");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedUsers, setSearchedUsers] = useState<UserSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<string[]>([]);

  // Friends & Connection
  const [friendsList, setFriendsList] = useState<Array<{ username: string; connection_id: string }>>([
    { username: "Alex_Code", connection_id: "conn-alex-code" },
    { username: "Priya_Dev", connection_id: "conn-priya-dev" }
  ]);
  const [activeFriend, setActiveFriend] = useState<string>("Alex_Code");
  const [activeConnectionId, setActiveConnectionId] = useState<string>("conn-alex-code");

  // Requests
  const [requestsList, setRequestsList] = useState<Array<{ id: string; username: string; topic: string }>>([
    { id: "req-1", username: "Rohan_K", topic: "Wants to study Algorithms" }
  ]);

  // Real-time Chat & WebSocket State
  const [chatMessages, setChatMessages] = useState<MessageItem[]>([]);
  const [typedMessage, setTypedMessage] = useState("");
  const [wsConnected, setWsConnected] = useState(false);
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initial user search load
  useEffect(() => {
    handleSearchUsers("");
  }, []);

  // Fetch past messages and connect WebSocket when active connection changes
  useEffect(() => {
    loadChatHistory(activeConnectionId);
    connectWebSocket(activeConnectionId);

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [activeConnectionId, currentUsername]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, partnerIsTyping]);

  const handleSearchUsers = async (q: string) => {
    setIsSearching(true);
    try {
      const results = await searchStudents(q);
      setSearchedUsers(results);
    } catch (err) {
      console.error("Failed to search students", err);
    } finally {
      setIsSearching(false);
    }
  };

  const loadChatHistory = async (cid: string) => {
    try {
      const history = await getDirectMessages(cid);
      if (history && history.length > 0) {
        const formatted: MessageItem[] = history.map((m: any) => ({
          id: m.id,
          sender: m.sender_username === currentUsername ? "You" : m.sender_username,
          text: m.message,
          time: new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }));
        setChatMessages(formatted);
      } else {
        // Default warm greeting if brand new room
        setChatMessages([
          { 
            sender: activeFriend, 
            text: `Hey ${currentUsername}! Ready to study together today?`, 
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) 
          }
        ]);
      }
    } catch (err) {
      console.error("Failed to load message history", err);
    }
  };

  const connectWebSocket = (cid: string) => {
    if (socketRef.current) {
      socketRef.current.close();
    }

    const wsUrl = `ws://localhost:8000/ws/chat/${cid}?username=${encodeURIComponent(currentUsername)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "message") {
          const msg = payload.data;
          const isMe = msg.sender_username.toLowerCase() === currentUsername.toLowerCase();
          setChatMessages((prev) => [
            ...prev,
            {
              id: msg.id,
              sender: isMe ? "You" : msg.sender_username,
              text: msg.message,
              time: new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }
          ]);
          setPartnerIsTyping(false);
        } else if (payload.type === "typing") {
          if (payload.username.toLowerCase() !== currentUsername.toLowerCase()) {
            setPartnerIsTyping(Boolean(payload.is_typing));
          }
        }
      } catch (err) {
        console.error("WebSocket message parse error", err);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    ws.onerror = () => {
      setWsConnected(false);
    };

    socketRef.current = ws;
  };

  const handleSendRequest = async (targetUsername: string) => {
    try {
      const token = localStorage.getItem("studygpt_token");
      await fetch(`http://localhost:8000/social/connect/${encodeURIComponent(targetUsername)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      setSentRequests((prev) => [...prev, targetUsername]);
    } catch (err) {
      console.error(err);
      setSentRequests((prev) => [...prev, targetUsername]);
    }
  };

  const handleAcceptRequest = (reqId: string, username: string) => {
    setRequestsList((prev) => prev.filter((r) => r.id !== reqId));
    const newCid = `conn-${username.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    setFriendsList((prev) => [...prev, { username, connection_id: newCid }]);
    setActiveFriend(username);
    setActiveConnectionId(newCid);
  };

  const handleDeclineRequest = (reqId: string) => {
    setRequestsList((prev) => prev.filter((r) => r.id !== reqId));
  };

  const handleSelectFriend = (friend: { username: string; connection_id: string }) => {
    setActiveFriend(friend.username);
    setActiveConnectionId(friend.connection_id);
  };

  const handleTypingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTypedMessage(e.target.value);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "typing", is_typing: true }));

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: "typing", is_typing: false }));
        }
      }, 1500);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    const messageText = typedMessage.trim();
    setTypedMessage("");

    // Send over WebSocket if connected
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "message",
          text: messageText,
          receiver_username: activeFriend
        })
      );
    } else {
      // Fallback: local optimistic update
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "You",
          text: messageText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Top Header */}
      <header className="border-b border-[var(--border)] bg-white sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <Link
            href="/home"
            className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-nested)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-bold text-base text-[var(--text-primary)] leading-tight">
              Social Connect & Direct Messaging
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              Study together, send follow requests, and chat in real-time over WebSockets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
              wsConnected
                ? "bg-[#E1F5EE] border-[#B7EBD8] text-[#085041]"
                : "bg-[var(--surface-nested)] border-[var(--border)] text-[var(--text-secondary)]"
            }`}
          >
            {wsConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{wsConnected ? "WebSocket Live" : "Polling Mode"}</span>
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Sidebar (4 Cols): Tabs (Discover, Friends, Requests) */}
        <div className="md:col-span-4 bg-white border border-[var(--border)] rounded-2xl p-4 shadow-xs flex flex-col h-[680px]">
          
          {/* Tab Buttons */}
          <div className="flex border-b border-[var(--border)] pb-2 mb-4 gap-1.5">
            <button
              onClick={() => setActiveTab("find")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "find"
                  ? "bg-[var(--cta-primary)] text-white shadow-xs"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-nested)]"
              }`}
            >
              Discover
            </button>
            <button
              onClick={() => setActiveTab("friends")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "friends"
                  ? "bg-[var(--cta-primary)] text-white shadow-xs"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-nested)]"
              }`}
            >
              Friends ({friendsList.length})
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === "requests"
                  ? "bg-[var(--cta-primary)] text-white shadow-xs"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-nested)]"
              }`}
            >
              Requests ({requestsList.length})
            </button>
          </div>

          {/* Discover Tab */}
          {activeTab === "find" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearchUsers(e.target.value);
                  }}
                  placeholder="Search students by username..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] focus:outline-none focus:border-[var(--cta-primary)] focus:bg-white transition-all"
                />
              </div>

              {isSearching ? (
                <div className="py-8 text-center text-xs text-[var(--text-secondary)] flex flex-col items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--cta-primary)]" />
                  <span>Searching classmates...</span>
                </div>
              ) : searchedUsers.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                  No students found matching "{searchQuery}"
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {searchedUsers.map((u) => {
                    const isSent = sentRequests.includes(u.username);
                    const isFriend = friendsList.some(f => f.username.toLowerCase() === u.username.toLowerCase());
                    return (
                      <div
                        key={u.id}
                        className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-[var(--text-primary)]">{u.username}</p>
                          <p className="text-[10px] text-[var(--text-secondary)]">{u.total_xp} XP • Active Scholar</p>
                        </div>

                        {isFriend ? (
                          <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-[#E1F5EE] text-[#085041]">
                            Friend
                          </span>
                        ) : (
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
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Friends Tab */}
          {activeTab === "friends" && (
            <div className="flex-1 overflow-y-auto space-y-2">
              {friendsList.map((f) => {
                const isSelected = activeFriend === f.username;
                return (
                  <div
                    key={f.username}
                    onClick={() => handleSelectFriend(f)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "border-[var(--cta-primary)] bg-[var(--surface-nested)] shadow-xs"
                        : "border-[var(--border)] hover:bg-[var(--surface-nested)]"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">{f.username}</p>
                      <p className="text-[10px] text-[#085041] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#085041]"></span>
                        <span>Connected • Active</span>
                      </p>
                    </div>
                    <MessageSquare className="w-4 h-4 text-[var(--cta-primary)]" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === "requests" && (
            <div className="flex-1 overflow-y-auto space-y-2.5">
              {requestsList.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                  No pending connection requests
                </div>
              ) : (
                requestsList.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] space-y-2"
                  >
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">{req.username}</p>
                      <p className="text-[10px] text-[var(--text-secondary)]">{req.topic}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(req.id, req.username)}
                        className="flex-1 py-1 rounded-lg bg-[var(--cta-primary)] text-white text-[11px] font-medium hover:bg-[var(--cta-primary-hover)] cursor-pointer"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(req.id)}
                        className="flex-1 py-1 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] text-[11px] hover:bg-white cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Panel (8 Cols): 1:1 Direct Messaging Window */}
        <div className="md:col-span-8 bg-white border border-[var(--border)] rounded-2xl shadow-xs flex flex-col h-[680px] overflow-hidden">
          
          {/* Chat Header */}
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#FAECE7] text-[var(--cta-primary)] border border-[#F4C0D1] flex items-center justify-center font-bold text-xs shadow-xs">
                {activeFriend ? activeFriend.charAt(0) : "S"}
              </div>
              <div>
                <p className="font-bold text-xs text-[var(--text-primary)]">{activeFriend}</p>
                <p className="text-[10px] text-[#085041] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#085041] animate-pulse"></span>
                  <span>Direct Peer Channel • WebSocket {wsConnected ? "Online" : "Connecting"}</span>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-[var(--surface-nested)] border border-[var(--border)] text-[var(--text-secondary)] font-mono">
                {activeConnectionId}
              </span>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-[var(--surface-nested)]">
            {chatMessages.map((m, idx) => {
              const isMe = m.sender === "You";
              return (
                <div key={idx} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? "bg-[var(--cta-primary)] text-white rounded-tr-xs shadow-xs font-medium"
                        : "bg-white border border-[var(--border)] text-[var(--text-primary)] rounded-tl-xs shadow-xs"
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[9px] text-[var(--text-tertiary)] mt-1 px-1">{m.time}</span>
                </div>
              );
            })}

            {/* Partner Typing Indicator */}
            {partnerIsTyping && (
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-white px-3.5 py-2 rounded-2xl border border-[var(--border)] w-fit shadow-xs animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--cta-primary)]"></span>
                <span className="text-[11px] font-medium">{activeFriend} is typing...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-[var(--border)] flex gap-2">
            <input
              type="text"
              value={typedMessage}
              onChange={handleTypingChange}
              placeholder={`Message ${activeFriend}...`}
              className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface-nested)] focus:outline-none focus:border-[var(--cta-primary)] focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={!typedMessage.trim()}
              className="px-4 py-2.5 rounded-xl bg-[var(--cta-primary)] text-white font-semibold text-xs hover:bg-[var(--cta-primary-hover)] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

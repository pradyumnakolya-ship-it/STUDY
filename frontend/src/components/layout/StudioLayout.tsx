"use client";

import React, { useEffect, useState } from "react";
import { 
  BookOpen, 
  Map, 
  Users, 
  FileText, 
  Upload, 
  Plus, 
  ChevronDown, 
  Trophy, 
  Zap, 
  UserPlus, 
  Settings, 
  ShieldCheck,
  Sparkles,
  Menu,
  X,
  Crown
} from "lucide-react";
import StudyCanvas from "../studio/StudyCanvas";
import AITutorPanel from "../studio/AITutorPanel";
import CreateGuildModal, { GuildItem } from "../guilds/CreateGuildModal";
import JoinGuildModal from "../guilds/JoinGuildModal";
import DailyLeaderboardModal from "../guilds/DailyLeaderboardModal";
import FinalLeaderboardModal from "../guilds/FinalLeaderboardModal";
import { joinGuild, listGuilds } from "@/lib/api";

export default function StudioLayout() {
  // Pre-configured default guilds following Section 8 rules
  const initialGuilds: GuildItem[] = [
    {
      id: "guild-algo-aces",
      name: "⚔️ Algorithm Aces",
      topic: "Data Structures & Pointer Algorithms",
      creator: "Prof. Ada",
      memberCount: 24,
      currentDay: 1,
      unlockedDay: 1,
      userXP: 340,
      completedDays: [],
      days: [
        {
          day_number: 1,
          title: "Singly Linked Lists & Node Architecture",
          learning_objectives: ["Understand memory addresses", "Implement node insertion O(1)", "Traverse nodes with head pointer"],
          key_concepts: ["Node Structure", "Pointer References", "Memory Allocation"],
          study_content: `A **Singly Linked List** is a fundamental linear data structure where elements are not stored contiguously in memory. Instead, each element (called a **Node**) contains two fields:
1. **Data:** The actual stored value.
2. **Next Pointer:** A reference or address leading to the subsequent node in memory.

### 🌟 The Train Car Analogy
Imagine a freight train. Each car contains cargo (Data) and is mechanically hitched to the car behind it (Next Pointer). To find the 5th car, the conductor must walk through cars 1, 2, 3, and 4. You cannot jump directly to car 5!

### 💻 Python Node Implementation
\`\`\`python
class Node:
    def __init__(self, data):
        self.data = data
        self.next = None

class LinkedList:
    def __init__(self):
        self.head = None

    def insert_at_head(self, data):
        new_node = Node(data)
        new_node.next = self.head
        self.head = new_node
\`\`\`

### ⚡ Key Takeaways
- **Prepend / Insert at Head:** O(1) constant time.
- **Search & Traversal:** O(n) linear time.
- **Last Node Pointer:** Points to NULL / None.`,
        },
        {
          day_number: 2,
          title: "Doubly Linked Lists & Sentinel Nodes",
          learning_objectives: ["Implement bidirectional traversal", "Understand previous pointers", "Utilize dummy sentinel nodes"],
          key_concepts: ["Prev Pointers", "Two-Way Traversal", "Sentinel Nodes"],
          study_content: `A **Doubly Linked List** extends the singly linked list by equipping each node with **two** pointers: \`next\` and \`prev\`.

### 🔄 Bidirectional Flexibility
Because each node references both its successor and predecessor, deletion of an arbitrary node given a pointer is **O(1)** without requiring search from the head!

### 💻 Node Structure
\`\`\`python
class DoublyNode:
    def __init__(self, data):
        self.data = data
        self.next = None
        self.prev = None
\`\`\`

### ⚖️ Trade-offs
- **Pros:** Traversal in both directions, effortless tail deletions.
- **Cons:** Higher memory footprint (extra pointer per node) and more pointer manipulation operations during insert/delete.`,
        },
        {
          day_number: 3,
          title: "Stacks & Queues via Linked Nodes",
          learning_objectives: ["Implement LIFO stack via singly linked list", "Implement FIFO queue via head & tail pointers", "Analyze O(1) push/pop/enqueue/dequeue"],
          key_concepts: ["LIFO Principle", "FIFO Principle", "Head/Tail Pointers"],
          study_content: `Stacks and Queues are abstract data types that can be built elegantly over linked lists with guaranteed O(1) performance and no resizing overhead.

### 🥞 Stacks (LIFO - Last In, First Out)
- **Push:** Insert at Head (O(1))
- **Pop:** Remove from Head (O(1))

### 🎟️ Queues (FIFO - First In, First Out)
- **Enqueue:** Insert at Tail (O(1)) using a dedicated \`tail\` pointer.
- **Dequeue:** Remove from Head (O(1)).`,
        },
        {
          day_number: 4,
          title: "Fast & Slow Pointers (Floyd's Cycle Finding)",
          learning_objectives: ["Detect circular references in linked structures", "Find the midpoint in a single pass", "Prove O(n) time and O(1) space"],
          key_concepts: ["Tortoise & Hare", "Cycle Detection", "Midpoint Finding"],
          study_content: `The **Fast & Slow Pointer** (Floyd's Cycle-Finding Algorithm) is one of the most famous algorithmic paradigms in computer science.

### 🏃 The Track & Field Analogy
If two runners race on a circular track where Runner A travels at speed 1 and Runner B travels at speed 2, Runner B will inevitably lap Runner A and meet them at the exact same point!

### 💻 Cycle Detection Pattern
\`\`\`python
def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False
\`\`\``,
        },
      ],
    },
    {
      id: "guild-neural-vanguard",
      name: "🛡️ Neural Network Vanguard",
      topic: "Deep Learning & Backpropagation",
      creator: "Dr. Hinton",
      memberCount: 38,
      currentDay: 1,
      unlockedDay: 1,
      userXP: 0,
      completedDays: [],
      days: [
        {
          day_number: 1,
          title: "Perceptrons & Activation Functions",
          learning_objectives: ["Understand linear combinations", "Differentiate ReLU, Sigmoid, and GELU", "Implement forward pass"],
          key_concepts: ["Weights & Biases", "Non-Linearity", "Forward Pass"],
          study_content: `A **Perceptron** takes multiple inputs, computes a weighted sum plus a bias, and passes it through an activation function to introduce non-linearity.`,
        },
        {
          day_number: 2,
          title: "Loss Functions & Gradient Descent",
          learning_objectives: ["Master MSE and Cross-Entropy", "Compute gradients with chain rule", "Tune learning rates"],
          key_concepts: ["Loss Landscapes", "Stochastic Gradient Descent", "Chain Rule"],
          study_content: `Gradient Descent iteratively adjusts weights in the opposite direction of the gradient of the loss function.`,
        },
      ],
    },
  ];

  const [guilds, setGuilds] = useState<GuildItem[]>(initialGuilds);
  const [activeGuildId, setActiveGuildId] = useState<string>(initialGuilds[0].id);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isDailyLeaderboardOpen, setIsDailyLeaderboardOpen] = useState(false);
  const [isFinalLeaderboardOpen, setIsFinalLeaderboardOpen] = useState(false);
  const [leaderboardInfo, setLeaderboardInfo] = useState({ day: 1, earnedXP: 0, passed: false });

  // Mobile layout state
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isAITutorCollapsed, setIsAITutorCollapsed] = useState(false);
  const [externalPrompt, setExternalPrompt] = useState<string | undefined>();

  useEffect(() => {
    listGuilds()
      .then((storedGuilds) => {
        if (storedGuilds.length > 0) {
          setGuilds(storedGuilds.map((guild) => ({
            id: guild.id,
            name: guild.name,
            topic: guild.topic,
            creator: guild.creator,
            memberCount: guild.member_count,
            days: guild.days,
            currentDay: guild.current_day,
            unlockedDay: guild.unlocked_day,
            userXP: guild.user_xp,
            completedDays: guild.completed_days,
          })));
          setActiveGuildId(storedGuilds[0].id);
        }
      })
      .catch(() => {
        // Keep the local starter guilds available when the API is offline.
      });
  }, []);

  // Get active guild
  const activeGuild = guilds.find((g) => g.id === activeGuildId) || guilds[0];

  const handleGuildCreated = (newGuild: GuildItem) => {
    setGuilds((prev) => [newGuild, ...prev]);
    setActiveGuildId(newGuild.id);
  };

  const handleJoinGuild = async (guild: GuildItem) => {
    try {
      const joined = await joinGuild(guild.id);
      const updatedGuild: GuildItem = {
        id: joined.id,
        name: joined.name,
        topic: joined.topic,
        creator: joined.creator,
        memberCount: joined.member_count,
        days: joined.days,
        currentDay: joined.current_day,
        unlockedDay: joined.unlocked_day,
        userXP: joined.user_xp,
        completedDays: joined.completed_days,
      };
      setGuilds((prev) => [updatedGuild, ...prev.filter((item) => item.id !== updatedGuild.id)]);
      setActiveGuildId(updatedGuild.id);
    } catch {
      setActiveGuildId(guild.id);
    }
  };

  const handleGuildUpdated = (updatedGuild: GuildItem) => {
    setGuilds((prev) => prev.map((guild) => guild.id === updatedGuild.id ? updatedGuild : guild));
  };

  const handleOpenDailyLeaderboard = (dayNumber: number, earnedXP: number, passed: boolean) => {
    setLeaderboardInfo({ day: dayNumber, earnedXP, passed });
    setIsDailyLeaderboardOpen(true);
  };

  const handleProceedNextDay = () => {
    // Canvas will handle switching to next day
  };

  const handleAskAI = (prompt: string) => {
    if (isAITutorCollapsed) {
      setIsAITutorCollapsed(false);
    }
    setExternalPrompt(prompt);
  };

  return (
    <div className="flex h-screen w-full bg-[#F7F3EA] overflow-hidden text-[#2C2A24]">
      {/* ── 1. LEFT COLUMN: GUILDS, ROADMAP NAV & XP ── */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#FBF9F3] border-r border-[#E4DFD1] flex flex-col justify-between transition-transform duration-300 md:relative md:translate-x-0 ${
          isSidebarOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Studio Brand Header */}
          <div className="p-4 border-b border-[#E4DFD1] flex items-center justify-between bg-[#FFFFFF]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#2C2A24] text-[#F7F3EA] flex items-center justify-center font-black text-sm">
                SG
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight flex items-center gap-1.5 text-[#2C2A24]">
                  Study<span>GPT</span>
                  <span className="text-[10px] bg-[#EEEDFE] text-[#3C3489] font-bold px-2 py-0.5 rounded-[8px]">
                    GUILD
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-[#888780]">Section 8 Learning</p>
                  <a href="/home" className="text-[10px] font-bold text-[#D85A30] hover:underline">
                    • Dashboard
                  </a>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsSidebarOpenMobile(false)}
              className="md:hidden text-[#5F5E5A] hover:text-[#2C2A24] p-1"
            >
              <X size={18} />
            </button>
          </div>

          {/* Active Guild Switcher Card */}
          <div className="p-3 border-b border-[#E4DFD1] bg-[#FFFFFF]">
            <div className="text-[10px] uppercase tracking-wider font-bold text-[#888780] mb-1 px-1 flex items-center justify-between">
              <span>Active Study Guild</span>
              <span className="text-[#3C3489] font-mono font-bold">{guilds.length} Guilds</span>
            </div>
            <button 
              onClick={() => setIsJoinModalOpen(true)}
              className="w-full p-2.5 rounded-[12px] bg-[#FBF9F3] border border-[#E4DFD1] hover:border-[#B4B2A9] transition-colors flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-[8px] bg-[#FFFFFF] border border-[#E4DFD1] text-[#2C2A24] flex items-center justify-center shrink-0 text-xs font-bold">
                  ⚔️
                </div>
                <div className="truncate">
                  <div className="font-bold text-xs text-[#2C2A24] truncate transition-colors">
                    {activeGuild.name}
                  </div>
                  <div className="text-[10px] text-[#5F5E5A] truncate">
                    {activeGuild.days.length} Days • Click to switch
                  </div>
                </div>
              </div>
              <ChevronDown size={14} className="text-[#5F5E5A] shrink-0" />
            </button>
          </div>

          {/* Guild Actions: Create & Join */}
          <div className="p-3 grid grid-cols-2 gap-2 border-b border-[#E4DFD1] bg-[#FFFFFF]">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="py-2 px-2.5 rounded-[8px] bg-[#D85A30] hover:bg-[#D85A30]/90 text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1"
            >
              <Plus size={13} />
              Create Guild
            </button>
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="py-2 px-2.5 rounded-[8px] bg-transparent hover:bg-[#FBF9F3] border border-[#B4B2A9] text-[#444441] font-bold text-[11px] transition-all flex items-center justify-center gap-1"
            >
              <Users size={13} />
              Join Guild
            </button>
          </div>

          {/* Scrollable Guild Stats & Roadmap Days */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Daily Challenge & Leaderboard Widget */}
            <div className="p-4 rounded-[12px] bg-[#FFFFFF] border border-[#E4DFD1] space-y-3 card-elevation">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#2C2A24] flex items-center gap-1.5">
                  <Trophy size={13} className="text-[#3C3489]" />
                  Guild Standing
                </span>
                <span className="text-[10px] bg-[#FBF9F3] text-[#5F5E5A] font-bold px-2 py-0.5 rounded-[8px] border border-[#E4DFD1]">
                  Day {activeGuild.unlockedDay} / {activeGuild.days.length}
                </span>
              </div>

              <p className="text-[11px] text-[#5F5E5A] leading-snug">
                Pass daily quizzes with <strong>≥ 75%</strong> to unlock roadmap topics and earn up to <strong>+20 XP</strong> per question.
              </p>

              <div className="pt-2 border-t border-[#EDE8DB] flex items-center justify-between text-xs">
                <button
                  onClick={() => handleOpenDailyLeaderboard(activeGuild.unlockedDay, 0, false)}
                  className="text-[11px] text-[#3C3489] hover:underline font-bold flex items-center gap-1"
                >
                  <Trophy size={12} />
                  Daily Leaderboard
                </button>
                <span className="text-[11px] bg-[#EEEDFE] text-[#3C3489] font-bold px-2 py-0.5 rounded-[8px] flex items-center gap-1">
                  <Zap size={11} />
                  {activeGuild.userXP} XP
                </span>
              </div>
            </div>

            {/* Daily Roadmap Topic List */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[#888780] uppercase tracking-wider px-2 block mb-2">
                Roadmap Outline ({activeGuild.days.length} Days)
              </span>

              {activeGuild.days.map((d) => {
                const isCompleted = activeGuild.completedDays.includes(d.day_number);
                const isUnlocked = d.day_number <= activeGuild.unlockedDay;

                return (
                  <div
                    key={d.day_number}
                    className={`p-2.5 rounded-[8px] text-xs border flex items-center justify-between transition-colors ${
                      isCompleted
                        ? "bg-[#E1F5EE] border-[#E1F5EE] text-[#085041]"
                        : isUnlocked
                        ? "bg-[#FFFFFF] border-[#E4DFD1] text-[#2C2A24]"
                        : "bg-[#FBF9F3] border-[#EDE8DB] text-[#888780] opacity-70"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-5 h-5 rounded-[6px] flex items-center justify-center font-bold text-[10px] shrink-0 ${
                        isCompleted
                          ? "bg-[#085041] text-white"
                          : isUnlocked
                          ? "bg-[#D85A30] text-white"
                          : "bg-[#EDE8DB] text-[#888780]"
                      }`}>
                        D{d.day_number}
                      </span>
                      <span className="truncate font-medium">{d.title}</span>
                    </div>

                    <span className="text-[10px] font-bold shrink-0">
                      {isCompleted ? "✓ Passed" : isUnlocked ? "Unlocked" : "Locked"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Profile & Guild Victory Footer */}
          <div className="p-3.5 border-t border-[#E4DFD1] bg-[#FFFFFF] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#FBF9F3] border border-[#E4DFD1] flex items-center justify-center font-extrabold text-xs text-[#2C2A24]">
                HA
              </div>
              <div>
                <div className="font-bold text-xs text-[#2C2A24]">Harsha A</div>
                <div className="text-[10px] text-[#5F5E5A] flex items-center gap-1">
                  <span className="text-[#3C3489] font-bold flex items-center gap-0.5">
                    <Zap size={10} />
                    {activeGuild.userXP} XP
                  </span>
                  <span>• Level 4</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsFinalLeaderboardOpen(true)}
              className="p-1.5 text-[#5F5E5A] hover:text-[#2C2A24] rounded-[8px] hover:bg-[#FBF9F3] transition-colors"
              title="Final Winner Podium"
            >
              <Crown size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpenMobile && (
        <div 
          onClick={() => setIsSidebarOpenMobile(false)}
          className="fixed inset-0 bg-black/40 z-30 md:hidden backdrop-blur-xs"
        />
      )}

      {/* ── 2. CENTER COLUMN: STUDY CANVAS ── */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-[#F7F3EA]">
        {/* Mobile Navbar Header */}
        <div className="md:hidden px-4 py-2.5 bg-[#FFFFFF] border-b border-[#E4DFD1] flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpenMobile(true)}
            className="p-1.5 rounded-[8px] bg-[#FBF9F3] border border-[#E4DFD1] text-[#2C2A24]"
          >
            <Menu size={18} />
          </button>
          <span className="font-extrabold text-xs tracking-tight text-[#2C2A24]">
            StudyGPT Guild
          </span>
          <button
            onClick={() => setIsAITutorCollapsed(!isAITutorCollapsed)}
            className="p-1.5 rounded-[8px] border border-[#B4B2A9] text-[#444441] font-bold text-xs flex items-center gap-1"
          >
            <Sparkles size={14} />
            AI Tutor
          </button>
        </div>

        <StudyCanvas 
          activeGuild={activeGuild}
          onAskAI={handleAskAI}
          onGuildUpdated={handleGuildUpdated}
          onOpenDailyLeaderboard={handleOpenDailyLeaderboard}
          onOpenFinalLeaderboard={() => setIsFinalLeaderboardOpen(true)}
        />
      </main>

      {/* ── 3. RIGHT COLUMN: AI TUTOR CO-PILOT ── */}
      <AITutorPanel 
        currentTopic={activeGuild.topic}
        isCollapsed={isAITutorCollapsed}
        onToggleCollapse={() => setIsAITutorCollapsed(!isAITutorCollapsed)}
        externalPrompt={externalPrompt}
        onClearExternalPrompt={() => setExternalPrompt(undefined)}
      />

      {/* ── MODALS ── */}
      <CreateGuildModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onGuildCreated={handleGuildCreated}
      />

      <JoinGuildModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        availableGuilds={guilds}
        activeGuildId={activeGuildId}
        onJoinGuild={handleJoinGuild}
      />

      <DailyLeaderboardModal
        isOpen={isDailyLeaderboardOpen}
        onClose={() => setIsDailyLeaderboardOpen(false)}
        dayNumber={leaderboardInfo.day}
        guildId={activeGuild.id}
        guildName={activeGuild.name}
        canProceed={leaderboardInfo.passed}
        onProceedNextDay={handleProceedNextDay}
      />

      <FinalLeaderboardModal
        isOpen={isFinalLeaderboardOpen}
        onClose={() => setIsFinalLeaderboardOpen(false)}
        guildId={activeGuild.id}
        guildName={activeGuild.name}
        topic={activeGuild.topic}
      />
    </div>
  );
}

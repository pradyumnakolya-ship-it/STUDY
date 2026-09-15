"use client";

import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  Map, 
  HelpCircle, 
  Sparkles, 
  CheckCircle2, 
  Lock, 
  ArrowRight, 
  Trophy, 
  Code2, 
  RotateCcw,
  AlertTriangle,
  Zap,
  Bookmark,
  Check,
  AlertCircle,
  Medal,
  RefreshCw
} from "lucide-react";
import { GuildItem } from "../guilds/CreateGuildModal";
import { 
  generateGuildQuiz, 
  submitGuildQuiz,
  analyzeQuizMistakes, 
  QuizQuestionData, 
  MissedQuestionDetailData,
  ConceptAnalysisData 
} from "@/lib/api";

interface StudyCanvasProps {
  activeGuild: GuildItem;
  onAskAI: (prompt: string) => void;
  onGuildUpdated: (guild: GuildItem) => void;
  onOpenDailyLeaderboard: (dayNumber: number, earnedXP: number, passed: boolean) => void;
  onOpenFinalLeaderboard: () => void;
}

export default function StudyCanvas({ 
  activeGuild, 
  onAskAI,
  onGuildUpdated,
  onOpenDailyLeaderboard,
  onOpenFinalLeaderboard,
}: StudyCanvasProps) {
  const [activeTab, setActiveTab] = useState<"material" | "roadmap" | "quiz">("material");
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(activeGuild.currentDay || 1);

  // Quiz states
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionData[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [scorePercent, setScorePercent] = useState<number | null>(null);
  const [earnedXP, setEarnedXP] = useState(0);

  // Mistake analysis states (Section 8.6)
  const [mistakeAnalyses, setMistakeAnalyses] = useState<ConceptAnalysisData[]>([]);
  const [overallSuggestions, setOverallSuggestions] = useState<string[]>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Get selected day data
  const currentDayData = activeGuild.days.find((d) => d.day_number === selectedDayNumber) || activeGuild.days[0];

  // Fetch or reset quiz when selected day changes
  useEffect(() => {
    loadQuizForDay(selectedDayNumber);
  }, [selectedDayNumber, activeGuild.id]);

  const loadQuizForDay = async (dayNum: number) => {
    setLoadingQuiz(true);
    setQuizSubmitted(false);
    setSelectedAnswers({});
    setScorePercent(null);
    setEarnedXP(0);
    setMistakeAnalyses([]);
    setOverallSuggestions([]);

    const dayObj = activeGuild.days.find((d) => d.day_number === dayNum) || activeGuild.days[0];

    try {
      const res = await generateGuildQuiz(
        activeGuild.id,
        dayNum
      );
      setQuizQuestions(res.questions);
    } catch {
      // Fallback questions if offline
      setQuizQuestions([
        {
          id: 1,
          question: `What is the core principle of ${dayObj.title}?`,
          options: ["Dynamic node linking", "Fixed contiguous array storage", "Direct CPU registry access", "Constant hardcoded memory"],
          correct_idx: 0,
          difficulty: "easy",
          xp: 10,
          concept_tag: "Core Principles",
          explanation: "Dynamic node architectures adapt size by linking discrete pointers.",
        },
        {
          id: 2,
          question: `In ${dayObj.title}, what is the worst-case runtime complexity for a linear traversal?`,
          options: ["O(1)", "O(n)", "O(log n)", "O(n²)"],
          correct_idx: 1,
          difficulty: "hard",
          xp: 20,
          concept_tag: "Asymptotic Complexity",
          explanation: "Visiting each node sequentially from head to tail requires linear O(n) steps.",
        },
        {
          id: 3,
          question: `Which boundary condition causes immediate runtime errors in ${dayObj.title} if unchecked?`,
          options: ["Null pointer dereference / Empty state", "Excessive variable names", "Array capacity overflow", "Bitwise shifts"],
          correct_idx: 0,
          difficulty: "hard",
          xp: 20,
          concept_tag: "Edge Cases & Safety",
          explanation: "Attempting to access .next on a None/Null pointer causes fatal exceptions.",
        },
        {
          id: 4,
          question: `What is an advantage of ${dayObj.title} compared to fixed memory layouts?`,
          options: ["Dynamic resizing without pre-allocation", "Immediate O(1) index lookup", "Hardware cache optimization", "Zero memory overhead"],
          correct_idx: 0,
          difficulty: "easy",
          xp: 10,
          concept_tag: "System Trade-offs",
          explanation: "Nodes allocate memory individually on the heap as new items arrive.",
        },
      ]);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleSelectAnswer = (qIndex: number, optIndex: number) => {
    if (quizSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [qIndex]: optIndex }));
  };

  const handleQuizSubmit = async () => {
    try {
      const result = await submitGuildQuiz(
        activeGuild.id,
        selectedDayNumber,
        quizQuestions.map((_, index) => selectedAnswers[index] ?? null)
      );
      setScorePercent(result.score_percent);
      setEarnedXP(result.earned_xp);
      setQuizSubmitted(true);
      onGuildUpdated({
        id: result.guild.id,
        name: result.guild.name,
        topic: result.guild.topic,
        creator: result.guild.creator,
        memberCount: result.guild.member_count,
        days: result.guild.days,
        currentDay: result.guild.current_day,
        unlockedDay: result.guild.unlocked_day,
        userXP: result.guild.user_xp,
        completedDays: result.guild.completed_days,
      });

      if (result.passed && result.missed_questions.length > 0) {
        setLoadingAnalysis(true);
        try {
          const analysisRes = await analyzeQuizMistakes(
            currentDayData.title,
            selectedDayNumber,
            result.missed_questions
          );
          setMistakeAnalyses(analysisRes.analyses);
          setOverallSuggestions(analysisRes.overall_suggestions);
        } catch {
          setMistakeAnalyses(
            result.missed_questions.map((m: MissedQuestionDetailData) => ({
              concept: m.concept_tag,
              reason_for_mistake: `Selected '${m.chosen_answer}' instead of '${m.correct_answer}'.`,
              suggested_review: `Review the specific definitions of ${m.concept_tag}.`,
            }))
          );
        } finally {
          setLoadingAnalysis(false);
        }
      }
      onOpenDailyLeaderboard(selectedDayNumber, result.earned_xp, result.passed);
    } catch {
      setQuizSubmitted(false);
    }
  };

  const isLastDay = selectedDayNumber === activeGuild.days.length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F7F3EA] overflow-hidden text-[#2C2A24]">
      {/* Canvas Top Bar */}
      <header className="px-6 py-3.5 border-b border-[#E4DFD1] bg-[#FFFFFF] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#FBF9F3] border border-[#E4DFD1] text-[#3C3489] flex items-center justify-center font-bold">
            <Trophy size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base md:text-lg text-[#2C2A24] tracking-tight">
                {activeGuild.name}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[8px] bg-[#FBF9F3] text-[#5F5E5A] border border-[#E4DFD1]">
                Day {selectedDayNumber} of {activeGuild.days.length}
              </span>
            </div>
            <p className="text-xs text-[#5F5E5A]">
              Topic: <strong className="text-[#2C2A24]">{currentDayData.title}</strong> • Target: ≥ 75% on daily quiz to advance
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-[#FBF9F3] p-1 rounded-[8px] border border-[#E4DFD1]">
          <button
            onClick={() => setActiveTab("material")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] text-xs font-bold transition-all ${
              activeTab === "material"
                ? "bg-[#FFFFFF] text-[#2C2A24] shadow-xs border border-[#E4DFD1]"
                : "text-[#5F5E5A] hover:text-[#2C2A24]"
            }`}
          >
            <BookOpen size={14} />
            Daily Learning
          </button>
          <button
            onClick={() => setActiveTab("roadmap")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] text-xs font-bold transition-all ${
              activeTab === "roadmap"
                ? "bg-[#FFFFFF] text-[#2C2A24] shadow-xs border border-[#E4DFD1]"
                : "text-[#5F5E5A] hover:text-[#2C2A24]"
            }`}
          >
            <Map size={14} />
            Roadmap
          </button>
          <button
            onClick={() => setActiveTab("quiz")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] text-xs font-bold transition-all ${
              activeTab === "quiz"
                ? "bg-[#FFFFFF] text-[#2C2A24] shadow-xs border border-[#E4DFD1]"
                : "text-[#5F5E5A] hover:text-[#2C2A24]"
            }`}
          >
            <HelpCircle size={14} />
            AI Quiz (XP)
          </button>
        </div>
      </header>

      {/* Main Canvas Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
        {/* ── TAB 1: DAILY LEARNING MATERIAL (Section 8.3) ── */}
        {activeTab === "material" && (
          <div className="space-y-6">
            {/* Mission banner */}
            <div className="p-5 rounded-[12px] bg-[#FFFFFF] border border-[#E4DFD1] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 card-elevation">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-[#888780] flex items-center gap-1.5">
                  <Bookmark size={12} /> Section 8.3: Daily Learning Assignment
                </span>
                <h2 className="text-lg font-bold text-[#2C2A24]">
                  Day {selectedDayNumber}: {currentDayData.title}
                </h2>
                <p className="text-xs text-[#5F5E5A]">
                  Study the concepts below thoroughly. You must complete today's quiz with <strong>≥ 75%</strong> to proceed to Day {selectedDayNumber + 1}.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onAskAI(`Explain today's topic "${currentDayData.title}" in beginner terms with a memorable analogy.`)}
                  className="px-3.5 py-2 rounded-[8px] bg-transparent border border-[#B4B2A9] text-[#444441] text-xs font-semibold hover:bg-[#FBF9F3] transition-colors flex items-center gap-1.5"
                >
                  <Sparkles size={13} className="text-[#3C3489]" />
                  Explain with AI Tutor
                </button>
                <button
                  onClick={() => setActiveTab("quiz")}
                  className="px-4 py-2 rounded-[8px] bg-[#D85A30] hover:bg-[#D85A30]/90 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  Take Day {selectedDayNumber} Quiz
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Key Concepts Grid */}
            {currentDayData.key_concepts && currentDayData.key_concepts.length > 0 && (
              <div className="p-5 rounded-[12px] bg-[#FFFFFF] border border-[#E4DFD1] space-y-3 card-elevation">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#888780] flex items-center gap-1.5">
                  <Zap size={14} className="text-[#3C3489]" />
                  Key Concepts To Master Today
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {currentDayData.key_concepts.map((concept, idx) => (
                    <div 
                      key={idx}
                      className="p-3.5 rounded-[8px] bg-[#FBF9F3] border border-[#EDE8DB] flex items-start gap-2.5 text-xs text-[#2C2A24]"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#EDE8DB] text-[#5F5E5A] flex items-center justify-center font-bold text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-medium">{concept}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Core Study Content Body */}
            <div className="p-6 md:p-8 rounded-[12px] bg-[#FFFFFF] border border-[#E4DFD1] space-y-5 card-elevation">
              <div className="flex items-center justify-between border-b border-[#EDE8DB] pb-4">
                <h2 className="text-base font-bold text-[#2C2A24] flex items-center gap-2">
                  <BookOpen size={18} className="text-[#2C2A24]" />
                  Study Notes & Theory
                </h2>
                <button
                  onClick={() => onAskAI(`Give me 3 practice scenario questions on ${currentDayData.title}.`)}
                  className="text-xs text-[#D85A30] hover:underline flex items-center gap-1 font-semibold"
                >
                  <Sparkles size={12} />
                  Practice Scenarios
                </button>
              </div>

              <div className="text-xs md:text-sm text-[#2C2A24] leading-relaxed whitespace-pre-line space-y-4">
                {currentDayData.study_content}
              </div>

              <div className="pt-4 border-t border-[#EDE8DB] flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[#5F5E5A]">
                  Ready to test your comprehension?
                </span>
                <button
                  onClick={() => setActiveTab("quiz")}
                  className="px-5 py-2.5 rounded-[8px] bg-[#D85A30] hover:bg-[#D85A30]/90 text-white font-bold text-xs transition-all flex items-center gap-1.5"
                >
                  Proceed to Daily Quiz
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: GUILD ROADMAP PROGRESSION (Section 8.1 - 8.3) ── */}
        {activeTab === "roadmap" && (
          <div className="space-y-6">
            <div className="p-6 rounded-[12px] bg-[#FFFFFF] border border-[#E4DFD1] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 card-elevation">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#888780] tracking-wider">
                  Shared Guild Syllabus
                </span>
                <h2 className="text-lg font-bold text-[#2C2A24]">
                  {activeGuild.name} Roadmap
                </h2>
                <p className="text-xs text-[#5F5E5A] mt-0.5">
                  All guild members follow this exact AI-generated roadmap. Unlock each day by scoring ≥ 75% on the quiz.
                </p>
              </div>

              {activeGuild.completedDays.length === activeGuild.days.length && (
                <button
                  onClick={onOpenFinalLeaderboard}
                  className="px-5 py-2.5 rounded-[8px] bg-[#EEEDFE] text-[#3C3489] border border-[#3C3489]/30 font-bold text-xs flex items-center gap-1.5"
                >
                  <Trophy size={15} />
                  View Final Guild Winner
                </button>
              )}
            </div>

            {/* Roadmap Timeline */}
            <div className="space-y-4 relative before:absolute before:inset-0 before:left-6 before:w-0.5 before:bg-[#E4DFD1]">
              {activeGuild.days.map((day) => {
                const isCompleted = activeGuild.completedDays.includes(day.day_number);
                const isUnlocked = day.day_number <= activeGuild.unlockedDay;
                const isCurrent = day.day_number === selectedDayNumber;

                return (
                  <div key={day.day_number} className="relative flex items-start gap-4">
                    <div 
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 z-10 border transition-all ${
                        isCompleted
                          ? "bg-[#E1F5EE] text-[#085041] border-[#085041]/30"
                          : isUnlocked
                          ? "bg-[#FAECE7] text-[#D85A30] border-[#D85A30]"
                          : "bg-[#FBF9F3] text-[#888780] border-[#E4DFD1]"
                      }`}
                    >
                      {isCompleted ? <Check size={20} className="stroke-[3]" /> : `D${day.day_number}`}
                    </div>

                    <div 
                      className={`flex-1 p-5 rounded-[12px] border transition-all ${
                        isCurrent
                          ? "bg-[#FFFFFF] border-2 border-[#D85A30] card-elevation"
                          : isUnlocked
                          ? "bg-[#FFFFFF] border-[#E4DFD1] hover:border-[#B4B2A9] card-elevation"
                          : "bg-[#FBF9F3] border-[#EDE8DB] opacity-60"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <h3 className="font-bold text-sm text-[#2C2A24]">
                          Day {day.day_number}: {day.title}
                        </h3>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-[8px] ${
                          isCompleted
                            ? "bg-[#E1F5EE] text-[#085041]"
                            : isUnlocked
                            ? "bg-[#FAECE7] text-[#D85A30]"
                            : "bg-[#FBF9F3] text-[#888780] border border-[#E4DFD1]"
                        }`}>
                          {isCompleted ? "Passed (≥ 75%)" : isUnlocked ? "Unlocked" : "Locked (< 75% on Prev Day)"}
                        </span>
                      </div>

                      {day.learning_objectives && (
                        <p className="text-xs text-[#5F5E5A] mb-3">
                          {day.learning_objectives.join(" • ")}
                        </p>
                      )}

                      <div className="flex items-center gap-3 pt-2 border-t border-[#EDE8DB]">
                        {isUnlocked ? (
                          <button
                            onClick={() => {
                              setSelectedDayNumber(day.day_number);
                              setActiveTab("material");
                            }}
                            className="px-4 py-1.5 rounded-[8px] bg-[#D85A30] hover:bg-[#D85A30]/90 text-white font-bold text-xs transition-all flex items-center gap-1"
                          >
                            Study This Day
                            <ArrowRight size={12} />
                          </button>
                        ) : (
                          <span className="text-xs text-[#888780] flex items-center gap-1">
                            <Lock size={12} /> Complete Day {day.day_number - 1} with ≥ 75% to unlock
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 3: AI-GENERATED QUIZ & PROGRESSION (Section 8.4 - 8.7) ── */}
        {activeTab === "quiz" && (
          <div className="space-y-6">
            {/* Quiz Header Banner */}
            <div className="p-6 rounded-[12px] bg-[#FFFFFF] border border-[#E4DFD1] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 card-elevation">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#2C2A24] flex items-center gap-2">
                    <Trophy size={20} className="text-[#3C3489]" />
                    Day {selectedDayNumber} AI Quiz: {currentDayData.title}
                  </h2>
                  <span className="text-[10px] bg-[#FAEAF0] text-[#72243E] font-bold px-2.5 py-0.5 rounded-[8px] uppercase">
                    Difficult Quiz
                  </span>
                </div>
                <p className="text-xs text-[#5F5E5A] mt-1">
                  Section 8.5 Rules: Score <strong>≥ 75%</strong> to advance to Day {selectedDayNumber + 1}. 
                  Easy = <strong>10 XP</strong>, Hard = <strong>20 XP</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadQuizForDay(selectedDayNumber)}
                  disabled={loadingQuiz}
                  className="px-3.5 py-2 rounded-[8px] bg-transparent border border-[#B4B2A9] text-[#444441] hover:bg-[#FBF9F3] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Regenerate Quiz"
                >
                  <RefreshCw size={13} className={loadingQuiz ? "animate-spin" : ""} />
                  Regenerate
                </button>
              </div>
            </div>

            {loadingQuiz ? (
              <div className="p-12 text-center bg-[#FFFFFF] border border-[#E4DFD1] rounded-[12px] space-y-3 card-elevation">
                <div className="w-10 h-10 rounded-full border-2 border-[#E4DFD1] border-t-[#D85A30] animate-spin mx-auto" />
                <p className="text-xs text-[#2C2A24] font-bold">
                  Gemini AI is generating a challenging quiz for Day {selectedDayNumber}...
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {quizQuestions.map((q, idx) => {
                  const isAnswered = selectedAnswers[idx] !== undefined;
                  const isCorrect = isAnswered && selectedAnswers[idx] === q.correct_idx;
                  const isWrong = isAnswered && selectedAnswers[idx] !== q.correct_idx;

                  return (
                    <div
                      key={q.id}
                      className={`p-5 rounded-[12px] border transition-all card-elevation ${
                        quizSubmitted
                          ? isCorrect
                            ? "bg-[#E1F5EE]/40 border-[#085041]/30"
                            : "bg-[#FAEAF0]/40 border-[#72243E]/30"
                          : "bg-[#FFFFFF] border-[#E4DFD1]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="font-bold text-xs md:text-sm text-[#2C2A24] leading-relaxed">
                          <span className="text-[#888780] mr-2">Q{idx + 1}.</span>
                          {q.question}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[8px] bg-[#EEEDFE] text-[#3C3489] flex items-center gap-1">
                            <Zap size={10} />
                            +{q.xp} XP
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[8px] ${
                            q.difficulty === "hard"
                              ? "bg-[#FAEAF0] text-[#72243E]"
                              : "bg-[#E1F5EE] text-[#085041]"
                          }`}>
                            {q.difficulty.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = selectedAnswers[idx] === optIdx;
                          let optionStyle = "bg-[#FFFFFF] border-[#E4DFD1] text-[#5F5E5A] hover:bg-[#FBF9F3] hover:text-[#2C2A24]";

                          if (quizSubmitted) {
                            if (optIdx === q.correct_idx) {
                              optionStyle = "bg-[#E1F5EE] border-2 border-[#085041] text-[#085041] font-bold";
                            } else if (isSelected) {
                              optionStyle = "bg-[#FAEAF0] border-2 border-[#72243E] text-[#72243E] font-medium";
                            } else {
                              optionStyle = "bg-[#FBF9F3] border-[#EDE8DB] text-[#888780] opacity-50";
                            }
                          } else if (isSelected) {
                            optionStyle = "bg-[#FAECE7] border-2 border-[#D85A30] text-[#2C2A24] font-medium";
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={quizSubmitted}
                              onClick={() => handleSelectAnswer(idx, optIdx)}
                              className={`p-3.5 rounded-[8px] text-left text-xs border transition-all flex items-center justify-between ${optionStyle}`}
                            >
                              <span>{opt}</span>
                              {quizSubmitted && optIdx === q.correct_idx && (
                                <CheckCircle2 size={15} className="text-[#085041] shrink-0 ml-2" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && isWrong && (
                        <div className="mt-3 pt-3 border-t border-[#EDE8DB] flex items-center justify-between text-xs">
                          <span className="text-[#72243E] bg-[#FAEAF0] px-2 py-0.5 rounded-[6px] flex items-center gap-1 text-[11px] font-medium">
                            <AlertTriangle size={12} />
                            Concept: <strong>{q.concept_tag}</strong>
                          </span>
                          <button
                            onClick={() => onAskAI(`I failed this quiz question on ${currentDayData.title}: "${q.question}". Why is "${q.options[q.correct_idx]}" the correct answer?`)}
                            className="text-[#D85A30] hover:underline flex items-center gap-1 text-[11px] font-semibold"
                          >
                            <Sparkles size={11} />
                            Ask AI Tutor why
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quiz Submit Bar */}
            {!quizSubmitted && !loadingQuiz && (
              <div className="p-4 rounded-[12px] bg-[#FFFFFF] border border-[#E4DFD1] flex items-center justify-between card-elevation">
                <span className="text-xs text-[#5F5E5A]">
                  Answered {Object.keys(selectedAnswers).length} of {quizQuestions.length} questions
                </span>
                <button
                  onClick={handleQuizSubmit}
                  disabled={Object.keys(selectedAnswers).length < quizQuestions.length}
                  className="px-6 py-2.5 rounded-[8px] bg-[#D85A30] hover:bg-[#D85A30]/90 text-white font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Submit Daily Quiz
                </button>
              </div>
            )}

            {/* ── SECTION 8.5 & 8.6: QUIZ RESULTS & PROGRESSION DECISION ── */}
            {quizSubmitted && scorePercent !== null && (
              <div className="space-y-6">
                {/* Score Banner */}
                <div 
                  className={`p-6 rounded-[12px] border-2 card-elevation ${
                    scorePercent >= 75
                      ? "bg-[#E1F5EE] border-[#085041]/30 text-[#085041]"
                      : "bg-[#FAEAF0] border-[#72243E]/30 text-[#72243E]"
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Trophy size={20} className={scorePercent >= 75 ? "text-[#085041]" : "text-[#72243E]"} />
                        <h3 className="font-bold text-lg">
                          {scorePercent >= 75
                            ? `Passed with ${scorePercent}%! (+${earnedXP} XP Earned)`
                            : `Score: ${scorePercent}% (< 75%) — Advancement Blocked`}
                        </h3>
                      </div>
                      <p className="text-xs opacity-90">
                        {scorePercent >= 75
                          ? "Congratulations! You met the 75% mastery standard and unlocked the next day's topic."
                          : "As per Section 8.5 rules: You must learn this topic again and retry the quiz before continuing to the next day."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {scorePercent < 75 ? (
                        <>
                          <button
                            onClick={() => setActiveTab("material")}
                            className="px-4 py-2 rounded-[8px] bg-transparent border border-[#B4B2A9] text-[#444441] text-xs font-bold hover:bg-[#FFFFFF]"
                          >
                            Study Topic Again
                          </button>
                          <button
                            onClick={() => loadQuizForDay(selectedDayNumber)}
                            className="px-5 py-2 rounded-[8px] bg-[#D85A30] hover:bg-[#D85A30]/90 text-white text-xs font-bold"
                          >
                            Retry Quiz
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => onOpenDailyLeaderboard(selectedDayNumber, earnedXP, true)}
                            className="px-4 py-2 rounded-[8px] bg-[#EEEDFE] border border-[#3C3489]/30 text-[#3C3489] text-xs font-bold hover:bg-[#EEEDFE]/80 flex items-center gap-1.5"
                          >
                            <Medal size={14} />
                            Daily Leaderboard
                          </button>
                          {isLastDay ? (
                            <button
                              onClick={onOpenFinalLeaderboard}
                              className="px-5 py-2 rounded-[8px] bg-[#EEEDFE] text-[#3C3489] border border-[#3C3489]/30 text-xs font-bold flex items-center gap-1.5"
                            >
                              <Trophy size={14} />
                              Final Guild Winner!
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedDayNumber(selectedDayNumber + 1);
                                setActiveTab("material");
                              }}
                              className="px-5 py-2 rounded-[8px] bg-[#D85A30] hover:bg-[#D85A30]/90 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                            >
                              Continue to Day {selectedDayNumber + 1}
                              <ArrowRight size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 8.6: Mistake Analysis & Suggestions when >= 75% */}
                {scorePercent >= 75 && mistakeAnalyses.length > 0 && (
                  <div className="p-6 rounded-[12px] bg-[#FFFFFF] border border-[#E4DFD1] space-y-4 card-elevation">
                    <div className="flex items-center gap-2 text-[#2C2A24] border-b border-[#EDE8DB] pb-3">
                      <Sparkles size={18} className="text-[#3C3489]" />
                      <h4 className="font-bold text-sm uppercase tracking-wider">
                        Section 8.6: AI Mistake Analysis & Recommendations
                      </h4>
                    </div>

                    <p className="text-xs text-[#5F5E5A]">
                      You passed the quiz, but our AI tutor noticed a few areas where concepts could be reinforced:
                    </p>

                    <div className="space-y-3">
                      {mistakeAnalyses.map((item, mIdx) => (
                        <div key={mIdx} className="p-4 rounded-[8px] bg-[#FBF9F3] border border-[#EDE8DB] space-y-1 text-xs">
                          <div className="font-bold text-[#72243E] flex items-center gap-1.5">
                            <AlertCircle size={14} className="text-[#72243E]" />
                            Misconception: {item.concept}
                          </div>
                          <p className="text-[#5F5E5A]">{item.reason_for_mistake}</p>
                          <div className="p-2.5 rounded-[6px] bg-[#FFFFFF] border border-[#E4DFD1] text-[#2C2A24] mt-2">
                            <strong>Suggested Improvement:</strong> {item.suggested_review}
                          </div>
                        </div>
                      ))}
                    </div>

                    {overallSuggestions.length > 0 && (
                      <div className="p-3.5 rounded-[8px] bg-[#EEEDFE] border border-[#3C3489]/20 text-xs text-[#3C3489] font-medium">
                        <strong>Targeted Advice:</strong> {overallSuggestions.join(" • ")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

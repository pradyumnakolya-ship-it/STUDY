"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  Award, 
  RefreshCw, 
  ChevronRight, 
  Layers, 
  HelpCircle,
  Brain,
  Zap,
  Target,
  Trophy,
  BookOpen
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  generatePracticeQuestions, 
  checkPracticeAnswer, 
  PracticeQuestionData, 
  PracticeCheckResult 
} from "@/lib/api";

type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export default function PracticePage() {
  const { user } = useAuth();

  // Configuration State
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Beginner");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Drill Session State
  const [sessionActive, setSessionActive] = useState(false);
  const [questions, setQuestions] = useState<PracticeQuestionData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [checkResult, setCheckResult] = useState<PracticeCheckResult | null>(null);
  
  // Progress & Stats
  const [totalXPEarned, setTotalXPEarned] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

  const presetTopics = [
    "Data Structures & Linked Lists",
    "Algorithms & Big-O Analysis",
    "Python Object-Oriented Programming",
    "Database Normalization & SQL",
    "Operating Systems & Concurrency",
    "Computer Networks & Protocols"
  ];

  const handleStartDrill = async (targetTopic?: string) => {
    const chosenTopic = (targetTopic || topic).trim();
    if (!chosenTopic) {
      setErrorMsg("Please enter a topic to practice.");
      return;
    }
    setErrorMsg(null);
    setIsGenerating(true);

    try {
      const res = await generatePracticeQuestions(chosenTopic, difficulty, 5);
      if (!res.questions || res.questions.length === 0) {
        throw new Error("No practice questions were generated. Please try again.");
      }
      setQuestions(res.questions);
      setCurrentIndex(0);
      setSelectedOption(null);
      setShowHint(false);
      setCheckResult(null);
      setTotalXPEarned(0);
      setCorrectCount(0);
      setSessionComplete(false);
      setSessionActive(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load practice questions";
      setErrorMsg(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = async (option: string) => {
    if (selectedOption !== null || evaluating) return; // already answered

    setSelectedOption(option);
    setEvaluating(true);
    const currentQ = questions[currentIndex];

    try {
      const result = await checkPracticeAnswer(
        currentQ.id,
        option,
        currentQ.correct_answer,
        currentQ.xp_value,
        topic || "General"
      );
      setCheckResult(result);
      if (result.correct) {
        setCorrectCount(prev => prev + 1);
        setTotalXPEarned(prev => prev + result.earned_xp);
      }
    } catch (err) {
      console.error("Evaluation error:", err);
      // Fallback local check
      const isCorrect = option.trim().toLowerCase() === currentQ.correct_answer.trim().toLowerCase();
      const earned = isCorrect ? currentQ.xp_value : 0;
      setCheckResult({
        correct: isCorrect,
        message: isCorrect ? "Correct! 🎉" : "Incorrect.",
        earned_xp: earned,
        correct_answer: currentQ.correct_answer,
        explanation: currentQ.explanation,
      });
      if (isCorrect) {
        setCorrectCount(prev => prev + 1);
        setTotalXPEarned(prev => prev + earned);
      }
    } finally {
      setEvaluating(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowHint(false);
      setCheckResult(null);
    } else {
      setSessionComplete(true);
    }
  };

  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen bg-[#000000] text-[#fcfdff] flex flex-col">
      {/* Top Header */}
      <header className="h-16 border-b border-[rgba(255,255,255,0.08)] bg-[#0a0a0c] flex items-center justify-between px-6 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/home"
            className="p-2 rounded-lg border border-[rgba(255,255,255,0.12)] hover:bg-[#101012] text-[#888e90] hover:text-[#fcfdff] transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-bold text-base text-[#fcfdff] flex items-center gap-2">
              <span>Interactive Practice Studio</span>
              <span className="text-[10px] bg-[#a5b4fc]/20 text-[#a5b4fc] font-bold px-2 py-0.5 rounded-full border border-[#a5b4fc]/40">
                Step 14
              </span>
            </h1>
            <p className="text-xs text-[#888e90]">Targeted concept drills with instant AI feedback & XP rewards</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#a5b4fc]/15 border border-[#a5b4fc]/30 text-[#a5b4fc] text-xs font-bold shadow-xs">
            <Award size={15} />
            <span>{((user?.total_xp || 0) + totalXPEarned)} XP</span>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center">
        {!sessionActive ? (
          /* Setup / Topic Selection View */
          <div className="bg-[#0a0a0c] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 md:p-10 shadow-sm space-y-8 animate-in fade-in duration-200">
            <div className="text-center max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-[#101012] border border-[rgba(255,255,255,0.12)] text-[#fcfdff] flex items-center justify-center mx-auto mb-4 shadow-xs">
                <Target size={28} />
              </div>
              <h2 className="text-2xl font-bold text-[#fcfdff]">What do you want to practice today?</h2>
              <p className="text-sm text-[#888e90] mt-1.5">
                Generate tailored 5-question problem sets with step-by-step hints and concept breakdowns.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-[#72243E]/20 border border-[#72243E]/40 rounded-xl text-xs text-[#ff7b9c] font-medium">
                {errorMsg}
              </div>
            )}

            {/* Topic Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#888e90] uppercase tracking-wider">
                Study Topic or Concept
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Dynamic Programming, Binary Search, SQL Joins, TCP Handshake..."
                className="w-full bg-[#101012] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-sm text-[#fcfdff] placeholder:text-[#888e90] focus:outline-none focus:border-[#fcfdff]"
              />
            </div>

            {/* Quick Topic Chips */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-[#888e90]">Popular Study Topics:</span>
              <div className="flex flex-wrap gap-2">
                {presetTopics.map((pt) => (
                  <button
                    key={pt}
                    onClick={() => {
                      setTopic(pt);
                      handleStartDrill(pt);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#101012] hover:bg-[#16161a] border border-[rgba(255,255,255,0.08)] text-[#fcfdff] transition-colors"
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#888e90] uppercase tracking-wider">
                Target Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { level: "Beginner", xp: "+5 XP", desc: "Core concepts & straightforward checks" },
                  { level: "Intermediate", xp: "+10 XP", desc: "Scenario applications & problem solving" },
                  { level: "Advanced", xp: "+20 XP", desc: "Edge cases, optimizations & deep theory" },
                ].map((item) => {
                  const isSelected = difficulty === item.level;
                  return (
                    <button
                      key={item.level}
                      onClick={() => setDifficulty(item.level as Difficulty)}
                      className={`p-4 rounded-xl border text-left transition-all relative ${
                        isSelected 
                          ? "border-[#fcfdff] bg-[#101012] ring-1 ring-[#fcfdff]" 
                          : "border-[rgba(255,255,255,0.08)] bg-[#0a0a0c] hover:bg-[#101012]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-[#fcfdff]">{item.level}</span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.08)] text-[#a5b4fc]">
                          {item.xp}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#888e90]">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generate Action */}
            <button
              onClick={() => handleStartDrill()}
              disabled={isGenerating || !topic.trim()}
              className="w-full py-3.5 bg-[#fcfdff] hover:bg-white/90 disabled:opacity-50 text-[#000000] rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Generating Practice Questions with AI...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Start Practice Drill
                </>
              )}
            </button>
          </div>
        ) : sessionComplete ? (
          /* Summary / Completed View */
          <div className="bg-[#0a0a0c] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-[#085041]/20 border border-[#085041]/40 text-[#2fe0b4] flex items-center justify-center mx-auto shadow-sm">
              <Trophy size={32} />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#fcfdff]">Practice Set Complete!</h2>
              <p className="text-xs text-[#888e90] mt-1">Topic: <strong className="text-[#fcfdff]">{topic}</strong> ({difficulty})</p>
            </div>

            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="p-4 rounded-xl bg-[#101012] border border-[rgba(255,255,255,0.08)]">
                <p className="text-[11px] font-bold text-[#888e90] uppercase tracking-wider">Accuracy</p>
                <p className="text-2xl font-extrabold text-[#fcfdff] mt-1">
                  {correctCount} / {questions.length}
                </p>
                <span className="text-[10px] text-[#888e90]">({Math.round((correctCount / questions.length) * 100)}%)</span>
              </div>
              <div className="p-4 rounded-xl bg-[#a5b4fc]/15 border border-[#a5b4fc]/30">
                <p className="text-[11px] font-bold text-[#a5b4fc] uppercase tracking-wider">XP Earned</p>
                <p className="text-2xl font-extrabold text-[#a5b4fc] mt-1">
                  +{totalXPEarned}
                </p>
                <span className="text-[10px] text-[#a5b4fc]">Added to profile</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => handleStartDrill()}
                className="w-full py-3 bg-[#fcfdff] hover:bg-white/90 text-[#000000] font-bold text-xs rounded-xl transition-colors shadow-sm"
              >
                Practice Again (New Questions)
              </button>
              <button
                onClick={() => setSessionActive(false)}
                className="w-full py-2.5 bg-[#101012] hover:bg-[#16161a] border border-[rgba(255,255,255,0.08)] text-[#fcfdff] font-semibold text-xs rounded-xl transition-colors"
              >
                Choose Another Topic
              </button>
            </div>
          </div>
        ) : (
          /* Active Question View */
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Top Status & Progress Bar */}
            <div className="flex items-center justify-between text-xs font-semibold text-[#888e90] px-1">
              <span className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-[#a5b4fc]" />
                <span>{topic}</span>
                <span>•</span>
                <span className="text-[#fcfdff] font-bold">{difficulty}</span>
              </span>
              <span>Question {currentIndex + 1} of {questions.length}</span>
            </div>

            <div className="w-full bg-[#101012] h-1.5 rounded-full overflow-hidden border border-[rgba(255,255,255,0.08)]">
              <div 
                className="bg-[#fcfdff] h-full transition-all duration-300 rounded-full"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Main Question Card */}
            <div className="bg-[#0a0a0c] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#101012] text-[#a5b4fc] border border-[rgba(255,255,255,0.08)]">
                    {currentQ?.concept_tag || topic}
                  </span>
                  <h3 className="text-lg font-bold text-[#fcfdff] leading-relaxed pt-1">
                    {currentQ?.question}
                  </h3>
                </div>
                <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-[#a5b4fc] bg-[#a5b4fc]/20 px-2 py-1 rounded-lg border border-[#a5b4fc]/30">
                  <Award size={14} />
                  <span>+{currentQ?.xp_value} XP</span>
                </div>
              </div>

              {/* Options Grid */}
              <div className="space-y-2.5">
                {currentQ?.options.map((option, idx) => {
                  const isSelected = selectedOption === option;
                  const isAnswered = selectedOption !== null;
                  const isCorrectAnswer = option.trim().toLowerCase() === currentQ.correct_answer.trim().toLowerCase();

                  let optionStyle = "bg-[#101012] hover:bg-[#16161a] border-[rgba(255,255,255,0.08)] text-[rgba(252,253,255,0.85)]";
                  if (isAnswered) {
                    if (isCorrectAnswer) {
                      optionStyle = "bg-[#085041]/20 border-[#085041] text-[#2fe0b4] font-semibold ring-1 ring-[#085041]";
                    } else if (isSelected) {
                      optionStyle = "bg-[#72243E]/20 border-[#72243E] text-[#ff7b9c] font-semibold ring-1 ring-[#72243E]";
                    } else {
                      optionStyle = "bg-[#06060a] border-[rgba(255,255,255,0.05)] text-[#888e90] opacity-50";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(option)}
                      disabled={isAnswered || evaluating}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-sm ${optionStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-[#06060a] border border-[rgba(255,255,255,0.1)] text-xs font-mono font-bold flex items-center justify-center shrink-0 text-[#888e90]">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{option}</span>
                      </div>

                      {isAnswered && (
                        <div>
                          {isCorrectAnswer && <CheckCircle2 size={18} className="text-[#2fe0b4] shrink-0" />}
                          {isSelected && !isCorrectAnswer && <XCircle size={18} className="text-[#ff7b9c] shrink-0" />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Hint Box */}
              {!selectedOption && (
                <div className="pt-2">
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="flex items-center gap-1.5 text-xs text-[#a5b4fc] hover:underline font-medium transition-colors"
                  >
                    <Lightbulb size={14} className="text-[#a5b4fc]" />
                    <span>{showHint ? "Hide hint" : "Need a hint?"}</span>
                  </button>

                  {showHint && (
                    <div className="mt-2 p-3 bg-[#a5b4fc]/10 border border-[#a5b4fc]/30 rounded-xl text-xs text-[#a5b4fc] leading-relaxed animate-in fade-in duration-100">
                      💡 <strong>Hint:</strong> {currentQ?.hint}
                    </div>
                  )}
                </div>
              )}

              {/* Instant Evaluation Feedback & Explanation */}
              {checkResult && (
                <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2 animate-in fade-in duration-200 ${
                  checkResult.correct ? "bg-[#085041]/20 border-[#085041]/50 text-[#2fe0b4]" : "bg-[#72243E]/20 border-[#72243E]/50 text-[#ff7b9c]"
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5 text-sm">
                      {checkResult.correct ? <CheckCircle2 size={16} className="text-[#2fe0b4]" /> : <XCircle size={16} className="text-[#ff7b9c]" />}
                      {checkResult.message}
                    </span>
                    {checkResult.correct && (
                      <span className="text-[#2fe0b4] font-mono">+{checkResult.earned_xp} XP Added</span>
                    )}
                  </div>

                  <p className="text-[rgba(252,253,255,0.85)] pt-1">
                    <strong>Explanation:</strong> {checkResult.explanation}
                  </p>
                </div>
              )}

              {/* Next Action Button */}
              {selectedOption && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleNextQuestion}
                    className="px-6 py-2.5 bg-[#fcfdff] hover:bg-white/90 text-[#000000] font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <span>{currentIndex + 1 === questions.length ? "View Summary" : "Next Question"}</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

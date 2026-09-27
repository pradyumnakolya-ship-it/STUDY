"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, HelpCircle, CheckCircle2, AlertCircle, ArrowRight, Award, Loader2, Sparkles } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: string;
}

export default function QuizPage() {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setSubmitted(false);
    setUserAnswers({});
    try {
      const token = localStorage.getItem("studygpt_token");
      const res = await fetch(`${API_BASE}/quiz/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          topic: topic.trim(),
          difficulty,
          count: Number(count)
        })
      });

      if (!res.ok) throw new Error("Failed to generate quiz");
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (err) {
      console.error(err);
      // Mock questions fallback
      setQuestions([
        {
          id: "q1",
          question: `Which fundamental principle is most critical to understanding ${topic}?`,
          options: ["Modularity & Cohesion", "Linear Sequential Processing", "Static Memory Bounds", "Unchecked Execution"],
          correct_answer: "Modularity & Cohesion",
          explanation: "Modularity decomposes complex software domains into maintainable sub-modules.",
          difficulty: difficulty
        },
        {
          id: "q2",
          question: `When deploying architectures based on ${topic}, what is the recommended practice?`,
          options: ["Automated testing & monitoring", "Direct production deployments", "Disabling error propagation", "Monolithic hardcoded states"],
          correct_answer: "Automated testing & monitoring",
          explanation: "Automated verification minimizes regressions and guarantees reliability.",
          difficulty: difficulty
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qId: string, opt: string) => {
    if (submitted) return;
    setUserAnswers(prev => ({ ...prev, [qId]: opt }));
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(q => {
      if (userAnswers[q.id] === q.correct_answer) correct += 1;
    });
    return correct;
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#fcfdff] flex flex-col">
      <header className="border-b border-[rgba(255,255,255,0.08)] bg-[#0a0a0c] sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/home" className="p-2 rounded-xl border border-[rgba(255,255,255,0.12)] text-[#888e90] hover:text-[#fcfdff] hover:bg-[#101012] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-bold text-base text-[#fcfdff]">Quiz & Knowledge Check</h1>
            <p className="text-xs text-[#888e90]">Test your grasp on any topic and analyze results</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl w-full mx-auto px-6 py-8 flex-1">
        {/* Quiz Creator Form */}
        <div className="bg-[#0a0a0c] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 shadow-xs mb-8">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#888e90] mb-1.5">
                Target Subject / Topic
              </label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Graph Algorithms, Kubernetes, Operating Systems..."
                className="w-full px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#101012] text-[#fcfdff] placeholder:text-[#888e90] text-sm focus:outline-none focus:border-[#fcfdff] transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#888e90] mb-1.5">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#101012] text-[#fcfdff] text-sm focus:outline-none focus:border-[#fcfdff]"
                >
                  <option value="Easy" className="bg-[#101012] text-[#fcfdff]">Easy (Fundamentals)</option>
                  <option value="Medium" className="bg-[#101012] text-[#fcfdff]">Medium (Applied understanding)</option>
                  <option value="Hard" className="bg-[#101012] text-[#fcfdff]">Hard (Deep edge cases)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#888e90] mb-1.5">
                  Questions Count
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#101012] text-[#fcfdff] text-sm focus:outline-none focus:border-[#fcfdff]"
                >
                  <option value={3} className="bg-[#101012] text-[#fcfdff]">3 Questions</option>
                  <option value={5} className="bg-[#101012] text-[#fcfdff]">5 Questions</option>
                  <option value={10} className="bg-[#101012] text-[#fcfdff]">10 Questions</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="w-full py-3 px-4 rounded-xl bg-[#fcfdff] hover:bg-white/90 text-[#000000] font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#000000]" />
                  <span>Synthesizing Exam with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Quiz</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Questions Display */}
        {questions.length > 0 && (
          <div className="space-y-6">
            {submitted && (
              <div className="p-6 rounded-2xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.08)] shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#fcfdff]">Quiz Completed!</h2>
                  <p className="text-xs text-[#888e90] mt-1">
                    You scored {calculateScore()} out of {questions.length} (
                    {Math.round((calculateScore() / questions.length) * 100)}%)
                  </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#a5b4fc]/20 border border-[#a5b4fc]/40 text-[#a5b4fc] font-bold text-sm">
                  <Award className="w-4 h-4" />
                  <span>+{calculateScore() * 15} XP Earned</span>
                </div>
              </div>
            )}

            {questions.map((q, idx) => {
              const selected = userAnswers[q.id];
              const isCorrect = selected === q.correct_answer;

              return (
                <div key={q.id} className="p-6 rounded-2xl bg-[#0a0a0c] border border-[rgba(255,255,255,0.08)] shadow-xs space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#101012] border border-[rgba(255,255,255,0.08)] text-[#888e90]">
                      Question {idx + 1}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#101012] text-[#888e90]">
                      {q.difficulty}
                    </span>
                  </div>

                  <h3 className="font-semibold text-base text-[#fcfdff] leading-snug">
                    {q.question}
                  </h3>

                  <div className="grid grid-cols-1 gap-2.5 pt-2">
                    {q.options.map((opt, oIdx) => {
                      let itemClass = "border-[rgba(255,255,255,0.08)] bg-[#101012] text-[rgba(252,253,255,0.85)] hover:border-[rgba(255,255,255,0.18)]";
                      
                      if (!submitted && selected === opt) {
                        itemClass = "border-[#fcfdff] bg-[#101012] text-[#fcfdff] font-medium ring-1 ring-[#fcfdff]";
                      } else if (submitted) {
                        if (opt === q.correct_answer) {
                          itemClass = "border-[#085041] bg-[#085041]/20 text-[#2fe0b4] font-semibold";
                        } else if (selected === opt && !isCorrect) {
                          itemClass = "border-[#72243E] bg-[#72243E]/20 text-[#ff7b9c]";
                        }
                      }

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleSelectOption(q.id, opt)}
                          className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all cursor-pointer flex items-center justify-between ${itemClass}`}
                        >
                          <span>{opt}</span>
                          {submitted && opt === q.correct_answer && (
                            <CheckCircle2 className="w-4 h-4 text-[#2fe0b4]" />
                          )}
                          {submitted && selected === opt && !isCorrect && (
                            <AlertCircle className="w-4 h-4 text-[#ff7b9c]" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {submitted && (
                    <div className="p-3.5 rounded-xl bg-[#101012] border border-[rgba(255,255,255,0.06)] text-xs text-[#888e90] leading-relaxed">
                      <strong className="text-[#fcfdff]">Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}

            {!submitted && (
              <button
                onClick={() => setSubmitted(true)}
                disabled={Object.keys(userAnswers).length === 0}
                className="w-full py-3.5 px-4 rounded-xl bg-[#fcfdff] hover:bg-white/90 text-[#000000] font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <span>Submit Answers</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

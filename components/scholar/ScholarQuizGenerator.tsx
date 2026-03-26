"use client";

import { useState, useEffect } from "react";
import { Sparkles, BookOpen, Target, Gauge } from "lucide-react";

import ScholarThinking from "./ScholarThinking"; // Force TS refresh

import {
  type ExamCategory,
  type GeneratedQuestion,
  type ScholarMockSession,
  EXAM_LABELS,
  DIFFICULTY_LEVELS,
} from "@/lib/scholar/types";
import { useToast } from "@/components/ui/Toast";

/** Common subjects per exam */
const EXAM_SUBJECTS: Record<ExamCategory, string[]> = {
  upsc_cse: [
    "Indian Polity",
    "Indian Economy",
    "Modern History",
    "Ancient & Medieval History",
    "Geography",
    "Environment & Ecology",
    "Science & Technology",
    "Current Affairs",
    "Art & Culture",
  ],
  banking_ibps: [
    "Quantitative Aptitude",
    "Reasoning Ability",
    "English Language",
    "General Awareness",
    "Computer Knowledge",
  ],
  gate_cs: [
    "Data Structures & Algorithms",
    "Operating Systems",
    "DBMS",
    "Computer Networks",
    "Theory of Computation",
    "Compiler Design",
    "Digital Logic",
    "Computer Organization",
    "Discrete Mathematics",
    "Engineering Mathematics",
  ],
  gate_ee: [
    "Electric Circuits",
    "Electromagnetic Fields",
    "Signals & Systems",
    "Electrical Machines",
    "Power Systems",
    "Control Systems",
    "Power Electronics",
    "Analog & Digital Electronics",
  ],
  gate_me: [
    "Engineering Mechanics",
    "Strength of Materials",
    "Thermodynamics",
    "Fluid Mechanics",
    "Heat Transfer",
    "Manufacturing Engineering",
    "Machine Design",
    "Theory of Machines",
    "Industrial Engineering",
  ],
  ssc_cgl: [
    "General Intelligence & Reasoning",
    "General Awareness",
    "Quantitative Aptitude",
    "English Comprehension",
    "History",
    "Geography",
    "Indian Polity",
    "Economics",
  ],
  cat_mba: [
    "Quantitative Ability",
    "Verbal Ability & Reading Comprehension",
    "Data Interpretation",
    "Logical Reasoning",
  ],
};

type QuizGeneratorProps = {
  selectedExam: ExamCategory;
  onGenerated: (
    session: ScholarMockSession,
    questions: GeneratedQuestion[],
  ) => void;
};

export default function ScholarQuizGenerator({
  selectedExam,
  onGenerated,
}: QuizGeneratorProps) {
  const { addToast } = useToast();
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<
    (typeof DIFFICULTY_LEVELS)[number]
  >("medium");

  // Reset internal state when exam changes
  useEffect(() => {
    setSubject("");
    setTopic("");
    setError(null);
  }, [selectedExam]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjects = EXAM_SUBJECTS[selectedExam];

  async function handleGenerate() {
    if (!subject) {
      setError("Please select a subject.");
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/scholar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examType: selectedExam,
          subject,
          topic: topic || undefined,
          questionCount,
          difficulty,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Generation failed.");
      }

      const data = await response.json();
      addToast(`${EXAM_LABELS[selectedExam]} assessment generated successfully.`, "success");
      onGenerated(data.session, data.questions);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setIsGenerating(false);
    }
  }

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 backdrop-blur-xl">
          <ScholarThinking />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* ── Subject Selection ── */}
      <div className="lg:col-span-2">
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Select Subject</h2>
              <p className="text-xs text-slate-500">
                {EXAM_LABELS[selectedExam]} syllabus
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {subjects.map((subj) => (
              <button
                key={subj}
                type="button"
                onClick={() => {
                  setSubject(subj);
                  setError(null);
                }}
                className={`rounded-xl px-3.5 py-3 text-left text-xs font-semibold transition-all ${
                  subject === subj
                    ? "border border-amber-400/30 bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/10 shadow-lg"
                    : "border border-white/[0.06] bg-white/[0.02] text-slate-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-white"
                }`}
                id={`scholar-subject-${subj.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`}
              >
                {subj}
              </button>
            ))}
          </div>

          {/* Topic input */}
          <div className="mt-5">
            <label
              htmlFor="scholar-topic-input"
              className="mb-1.5 block text-xs font-bold text-slate-400"
            >
              Specific Topic{" "}
              <span className="text-slate-600">(optional)</span>
            </label>
            <input
              id="scholar-topic-input"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={
                subject
                  ? `e.g., a subtopic within ${subject}`
                  : "Select a subject first"
              }
              disabled={!subject}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 disabled:cursor-not-allowed disabled:opacity-40"
            />
          </div>
        </div>
      </div>

      {/* ── Configuration & Generate ── */}
      <div className="flex flex-col gap-4">
        {/* Question Count */}
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-400/10 text-blue-300">
              <Target className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-white">Questions</span>
          </div>

          <div className="flex items-center gap-2">
            {[5, 10, 15, 20].map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setQuestionCount(count)}
                className={`flex-1 rounded-lg py-2.5 text-center text-xs font-bold transition-all ${
                  questionCount === count
                    ? "border border-blue-400/30 bg-blue-500/10 text-blue-200"
                    : "border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:bg-white/[0.04] hover:text-white"
                }`}
                id={`scholar-count-${count}`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-400/10 text-fuchsia-300">
              <Gauge className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-white">Difficulty</span>
          </div>

          <div className="flex flex-col gap-1.5">
            {DIFFICULTY_LEVELS.map((level) => {
              const colors: Record<string, string> = {
                easy: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
                medium: "border-amber-400/30 bg-amber-500/10 text-amber-200",
                hard: "border-rose-400/30 bg-rose-500/10 text-rose-200",
                mixed:
                  "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200",
              };

              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className={`rounded-lg px-3 py-2.5 text-left text-xs font-bold capitalize transition-all ${
                    difficulty === level
                      ? colors[level]
                      : "border border-white/[0.06] bg-white/[0.02] text-slate-400 hover:bg-white/[0.04] hover:text-white"
                  }`}
                  id={`scholar-difficulty-${level}`}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate Button */}
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={!subject || isGenerating}
          className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 text-sm font-bold text-white shadow-[0_12px_30px_rgba(251,191,36,0.2)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(251,191,36,0.3)] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          id="scholar-generate-btn"
        >
          <Sparkles className="h-4.5 w-4.5 transition group-hover:rotate-12" />
          Generate Assessment
        </button>

        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-xs font-medium text-rose-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

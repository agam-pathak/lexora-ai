"use client";

import {
  Trophy,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  SkipForward,
  BarChart3,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from "lucide-react";
import { useState } from "react"; // Force TS refresh

import type {
  ScholarMockSession,
  ScholarQuestionLog,
  ExamCategory,
} from "@/lib/scholar/types";
import { EXAM_LABELS } from "@/lib/scholar/types";
import { useToast } from "@/components/ui/Toast";
import { useEffect } from "react";

type QuizResultsProps = {
  session: ScholarMockSession;
  questions: ScholarQuestionLog[];
  selectedExam: ExamCategory;
  onReturnToSetup: () => void;
};

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function getAccuracyColor(accuracy: number) {
  if (accuracy >= 80) return "text-emerald-400";
  if (accuracy >= 60) return "text-amber-400";
  if (accuracy >= 40) return "text-orange-400";
  return "text-rose-400";
}

function getAccuracyGrade(accuracy: number) {
  if (accuracy >= 90) return { grade: "A+", label: "Outstanding" };
  if (accuracy >= 80) return { grade: "A", label: "Excellent" };
  if (accuracy >= 70) return { grade: "B+", label: "Very Good" };
  if (accuracy >= 60) return { grade: "B", label: "Good" };
  if (accuracy >= 50) return { grade: "C", label: "Average" };
  if (accuracy >= 40) return { grade: "D", label: "Below Average" };
  return { grade: "F", label: "Needs Improvement" };
}

export default function ScholarQuizResults({
  session,
  questions,
  selectedExam,
  onReturnToSetup,
}: QuizResultsProps) {
  const { addToast } = useToast();
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [showAllQuestions, setShowAllQuestions] = useState(false);

  useEffect(() => {
    addToast(`Assessment complete! Score: ${session.accuracy}%`, "success", 5000);
  }, [addToast, session.accuracy]);

  const { grade, label } = getAccuracyGrade(session.accuracy);
  const skippedCount = questions.filter((q) => q.isSkipped).length;
  const correctCount = questions.filter((q) => q.isCorrect === true).length;
  const wrongCount = questions.filter((q) => q.isCorrect === false).length;

  // Subject-wise breakdown
  const subjectMap = new Map<
    string,
    { total: number; correct: number; wrong: number; skipped: number }
  >();
  for (const q of questions) {
    const entry = subjectMap.get(q.subjectTag) ?? {
      total: 0,
      correct: 0,
      wrong: 0,
      skipped: 0,
    };
    entry.total += 1;
    if (q.isCorrect === true) entry.correct += 1;
    else if (q.isCorrect === false) entry.wrong += 1;
    else entry.skipped += 1;
    subjectMap.set(q.subjectTag, entry);
  }

  const displayedQuestions = showAllQuestions
    ? questions
    : questions.slice(0, 5);

  return (
    <div className="reveal-rise">
      {/* ── Hero Score Card ── */}
      <div className="mb-8 overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-amber-500/[0.06] via-orange-600/[0.03] to-fuchsia-600/[0.03] p-8 backdrop-blur-xl">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Score Ring */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
            <div className="relative flex h-32 w-32 items-center justify-center">
              {/* Background ring */}
              <svg className="absolute inset-0" viewBox="0 0 128 128">
                <circle
                  cx="64"
                  cy="64"
                  r="54"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="8"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="54"
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(session.accuracy / 100) * 339.29} 339.29`}
                  transform="rotate(-90 64 64)"
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient
                    id="scoreGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="flex flex-col items-center">
                <span
                  className={`text-3xl font-bold ${getAccuracyColor(session.accuracy)}`}
                >
                  {session.accuracy}%
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Accuracy
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-amber-400" />
                <span className="text-3xl font-bold text-white">{grade}</span>
                <span className="rounded-lg bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300">
                  {label}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{session.title}</p>
              <p className="text-xs text-slate-600">
                {EXAM_LABELS[selectedExam]}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="metric-card flex flex-col items-center gap-1 !rounded-2xl !px-4 !py-3">
              <span className="text-lg font-bold text-white">
                {session.scoreObtained}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Score
              </span>
              <span className="text-[10px] text-slate-600">
                / {session.maxScore}
              </span>
            </div>

            <div className="metric-card flex flex-col items-center gap-1 !rounded-2xl !px-4 !py-3">
              <span className="flex items-center gap-1 text-lg font-bold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                {correctCount}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Correct
              </span>
            </div>

            <div className="metric-card flex flex-col items-center gap-1 !rounded-2xl !px-4 !py-3">
              <span className="flex items-center gap-1 text-lg font-bold text-rose-400">
                <XCircle className="h-4 w-4" />
                {wrongCount}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Wrong
              </span>
            </div>

            <div className="metric-card flex flex-col items-center gap-1 !rounded-2xl !px-4 !py-3">
              <span className="flex items-center gap-1 text-lg font-bold text-slate-400">
                <SkipForward className="h-4 w-4" />
                {skippedCount}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Skipped
              </span>
            </div>
          </div>
        </div>

        {/* Time & Meta */}
        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-white/[0.06] pt-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            Time: {formatTime(session.timeSpentSecs)}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Target className="h-3.5 w-3.5" />
            Questions: {session.totalQuestions}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <TrendingUp className="h-3.5 w-3.5" />
            Difficulty: {session.difficulty}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Subject Breakdown ── */}
        <div className="lg:col-span-1">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Subject Breakdown
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              {[...subjectMap.entries()].map(([subject, stats]) => {
                const accuracy =
                  stats.total - stats.skipped > 0
                    ? Math.round(
                        (stats.correct / (stats.total - stats.skipped)) * 100,
                      )
                    : 0;

                return (
                  <div key={subject}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">
                        {subject}
                      </span>
                      <span
                        className={`text-xs font-bold ${getAccuracyColor(accuracy)}`}
                      >
                        {accuracy}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
                        style={{ width: `${accuracy}%` }}
                      />
                    </div>
                    <div className="mt-1 flex gap-3 text-[10px] text-slate-600">
                      <span>{stats.correct} ✓</span>
                      <span>{stats.wrong} ✗</span>
                      <span>{stats.skipped} skipped</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Question Review ── */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-xl">
            <h3 className="mb-5 text-sm font-bold text-white">
              Question Review
            </h3>

            <div className="flex flex-col gap-3">
              {displayedQuestions.map((q) => {
                const isExpanded = expandedQuestion === q.questionNumber;

                return (
                  <div
                    key={q.questionNumber}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.015] transition-all"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedQuestion(isExpanded ? null : q.questionNumber)
                      }
                      className="flex w-full items-center gap-3 p-4 text-left"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          q.isCorrect === true
                            ? "bg-emerald-500/15 text-emerald-300"
                            : q.isCorrect === false
                              ? "bg-rose-500/15 text-rose-300"
                              : "bg-slate-500/15 text-slate-400"
                        }`}
                      >
                        {q.isCorrect === true
                          ? "✓"
                          : q.isCorrect === false
                            ? "✗"
                            : "—"}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-slate-200">
                          Q{q.questionNumber}. {q.questionText.slice(0, 80)}
                          {q.questionText.length > 80 ? "..." : ""}
                        </p>
                        <div className="mt-0.5 flex gap-2 text-[10px] text-slate-600">
                          <span>{q.subjectTag}</span>
                          <span>•</span>
                          <span>{q.difficulty}</span>
                          {q.timeSpentSecs > 0 && (
                            <>
                              <span>•</span>
                              <span>{q.timeSpentSecs}s</span>
                            </>
                          )}
                        </div>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-white/[0.04] px-4 py-4 animate-in fade-in">
                        <p className="mb-3 text-sm leading-relaxed text-slate-300 whitespace-pre-line">
                          {q.questionText}
                        </p>

                        <div className="mb-3 flex flex-col gap-1.5">
                          {(q.options as Array<{ key: string; text?: string; left?: string; right?: string }>).map((opt) => {
                            const isCorrect =
                              q.correctAnswer.includes(opt.key);
                            const isUserAnswer = q.userAnswer === opt.key;

                            return (
                              <div
                                key={opt.key}
                                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                                  isCorrect
                                    ? "bg-emerald-500/[0.06] text-emerald-200"
                                    : isUserAnswer
                                      ? "bg-rose-500/[0.06] text-rose-200"
                                      : "text-slate-400"
                                }`}
                              >
                                <span className="font-bold">{opt.key}.</span>
                                <span>
                                  {opt.left && opt.right
                                    ? `${opt.left} → ${opt.right}`
                                    : opt.text}
                                </span>
                                {isCorrect && (
                                  <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-400" />
                                )}
                                {isUserAnswer && !isCorrect && (
                                  <XCircle className="ml-auto h-3.5 w-3.5 text-rose-400" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <div className="rounded-xl bg-blue-500/[0.04] border border-blue-400/10 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 mb-1">
                              Explanation
                            </p>
                            <p className="text-xs leading-relaxed text-slate-400">
                              {q.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {questions.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllQuestions(!showAllQuestions)}
                className="mt-4 w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-3 text-xs font-bold text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
              >
                {showAllQuestions
                  ? "Show Less"
                  : `Show All ${questions.length} Questions`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={onReturnToSetup}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-4 text-sm font-bold text-white shadow-[0_12px_30px_rgba(251,191,36,0.2)] transition hover:-translate-y-0.5 hover:brightness-110"
          id="scholar-new-quiz-btn"
        >
          <ArrowLeft className="h-4 w-4" />
          Start New Assessment
        </button>
      </div>
    </div>
  );
}

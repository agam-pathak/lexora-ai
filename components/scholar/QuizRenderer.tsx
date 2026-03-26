"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  SkipForward,
  Flag,
  Loader2,
  AlertTriangle,
} from "lucide-react";

import type {
  GeneratedQuestion,
  ScholarMockSession,
  ScholarQuestionLog,
} from "@/lib/scholar/types";

type QuizRendererProps = {
  session: ScholarMockSession;
  questions: GeneratedQuestion[];
  onCompleted: (
    session: ScholarMockSession,
    questions: ScholarQuestionLog[],
  ) => void;
  onExit: () => void;
};

type AnswerState = {
  [questionNumber: number]: {
    selected: string | null;
    submitted: boolean;
    isCorrect: boolean | null;
    timeSpent: number;
  };
};

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function QuizRenderer({
  session,
  questions,
  onCompleted,
  onExit,
}: QuizRendererProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [elapsedTime, setElapsedTime] = useState(0);
  const [questionTimer, setQuestionTimer] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion.questionNumber];
  const totalAnswered = Object.values(answers).filter(
    (a) => a.submitted,
  ).length;
  const totalCorrect = Object.values(answers).filter(
    (a) => a.isCorrect === true,
  ).length;

  // Global timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Per-question timer
  useEffect(() => {
    setQuestionTimer(0);
    questionTimerRef.current = setInterval(() => {
      setQuestionTimer((prev) => prev + 1);
    }, 1000);

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [currentIndex]);

  const handleSelectOption = useCallback(
    (key: string) => {
      if (currentAnswer?.submitted) return;

      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.questionNumber]: {
          selected: key,
          submitted: false,
          isCorrect: null,
          timeSpent: questionTimer,
        },
      }));
    },
    [currentAnswer?.submitted, currentQuestion.questionNumber, questionTimer],
  );

  const handleSubmitAnswer = useCallback(
    async (skip = false) => {
      const answerValue = skip
        ? null
        : answers[currentQuestion.questionNumber]?.selected ?? null;

      setIsSubmitting(true);

      try {
        const response = await fetch("/api/scholar/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            questionNumber: currentQuestion.questionNumber,
            userAnswer: answerValue,
            timeSpentSecs: questionTimer,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to submit answer");
        }

        const data = await response.json();
        const questionLog = data.questionLog as ScholarQuestionLog;

        setAnswers((prev) => ({
          ...prev,
          [currentQuestion.questionNumber]: {
            selected: answerValue,
            submitted: true,
            isCorrect: questionLog.isCorrect,
            timeSpent: questionTimer,
          },
        }));
      } catch (err) {
        console.error("Submit error:", err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [answers, currentQuestion.questionNumber, session.id, questionTimer],
  );

  const handleFinishQuiz = useCallback(async () => {
    setIsCompleting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      // Submit any unanswered questions as skipped
      for (const question of questions) {
        if (!answers[question.questionNumber]?.submitted) {
          await fetch("/api/scholar/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: session.id,
              questionNumber: question.questionNumber,
              userAnswer: null,
              timeSpentSecs: 0,
            }),
          });
        }
      }

      // Complete the session
      const response = await fetch("/api/scholar/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          totalTimeSpentSecs: elapsedTime,
        }),
      });

      if (!response.ok) throw new Error("Failed to complete session");

      const data = await response.json();
      onCompleted(data.session, data.questions);
    } catch (err) {
      console.error("Complete error:", err);
      setIsCompleting(false);
    }
  }, [answers, elapsedTime, onCompleted, questions, session.id]);

  const isMatchOption = (opt: GeneratedQuestion["options"][number]): opt is { key: string; left: string; right: string } => {
    return "left" in opt && "right" in opt;
  };

  if (isCompleting) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 text-amber-300 animate-spin" />
        <p className="text-sm font-semibold text-slate-300">
          Finalizing your results...
        </p>
      </div>
    );
  }

  return (
    <div className="reveal-rise">
      {/* ── Top Bar : Timer + Progress ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5 backdrop-blur-xl">
        <div className="flex items-center gap-6">
          {/* Global Timer */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="font-mono font-bold text-white">
              {formatTime(elapsedTime)}
            </span>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-bold text-white">{totalAnswered}</span>
            <span>/</span>
            <span>{questions.length}</span>
            <span>answered</span>
          </div>

          {/* Quick Stats */}
          <div className="hidden items-center gap-3 sm:flex">
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {totalCorrect}
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-rose-400">
              <XCircle className="h-3.5 w-3.5" />
              {totalAnswered - totalCorrect}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowConfirmFinish(true)}
            className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] px-4 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/[0.12]"
            id="scholar-finish-quiz-btn"
          >
            <Flag className="h-3.5 w-3.5" />
            Finish Quiz
          </button>

          <button
            type="button"
            onClick={onExit}
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-xs font-bold text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
          >
            Exit
          </button>
        </div>
      </div>

      {/* ── Confirm Finish Dialog ── */}
      {showConfirmFinish && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/[0.1] bg-slate-900/95 p-8 shadow-2xl backdrop-blur-2xl">
            <div className="mb-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
              <h3 className="text-lg font-bold text-white">Finish Quiz?</h3>
            </div>
            <p className="mb-2 text-sm text-slate-400">
              You have answered{" "}
              <span className="font-bold text-white">{totalAnswered}</span> of{" "}
              <span className="font-bold text-white">{questions.length}</span>{" "}
              questions.
            </p>
            {totalAnswered < questions.length && (
              <p className="mb-6 text-xs text-amber-400/80">
                {questions.length - totalAnswered} unanswered question(s) will
                be marked as skipped.
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmFinish(false)}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 text-sm font-bold text-slate-300 transition hover:bg-white/[0.06]"
              >
                Continue Quiz
              </button>
              <button
                type="button"
                onClick={() => void handleFinishQuiz()}
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
              >
                Finish & View Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Question Navigation Dots ── */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {questions.map((q, index) => {
          const state = answers[q.questionNumber];
          const isCurrent = index === currentIndex;

          let dotColor =
            "border-white/[0.08] bg-white/[0.03] text-slate-500";
          if (isCurrent)
            dotColor =
              "border-amber-400/30 bg-amber-500/10 text-amber-200 ring-2 ring-amber-400/20";
          else if (state?.isCorrect === true)
            dotColor =
              "border-emerald-400/30 bg-emerald-500/10 text-emerald-300";
          else if (state?.isCorrect === false)
            dotColor = "border-rose-400/30 bg-rose-500/10 text-rose-300";
          else if (state?.submitted)
            dotColor = "border-slate-400/30 bg-slate-500/10 text-slate-400";

          return (
            <button
              key={q.questionNumber}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-bold transition-all ${dotColor}`}
            >
              {q.questionNumber}
            </button>
          );
        })}
      </div>

      {/* ── Question Card ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-xl sm:p-8">
            {/* Question Header */}
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-lg bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    Q{currentQuestion.questionNumber}
                  </span>
                  <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {currentQuestion.questionType.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      currentQuestion.difficulty === "easy"
                        ? "bg-emerald-500/10 text-emerald-300"
                        : currentQuestion.difficulty === "hard"
                          ? "bg-rose-500/10 text-rose-300"
                          : "bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {currentQuestion.difficulty}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(questionTimer)}
              </div>
            </div>

            {/* Question Text */}
            <p className="mb-6 text-base font-medium leading-relaxed text-white whitespace-pre-line">
              {currentQuestion.questionText}
            </p>

            {/* Options */}
            <div className="flex flex-col gap-2.5">
              {currentQuestion.options.map((option) => {
                const key = option.key;
                const isSelected = currentAnswer?.selected === key;
                const isSubmitted = currentAnswer?.submitted;
                const isCorrectAnswer =
                  currentQuestion.correctAnswer.includes(key);
                const wasWrongSelection =
                  isSubmitted && isSelected && !isCorrectAnswer;

                let optionStyle =
                  "border-white/[0.08] bg-white/[0.02] text-slate-300 hover:border-white/[0.15] hover:bg-white/[0.04] hover:text-white";

                if (isSubmitted && isCorrectAnswer) {
                  optionStyle =
                    "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200";
                } else if (wasWrongSelection) {
                  optionStyle =
                    "border-rose-400/30 bg-rose-500/[0.08] text-rose-200";
                } else if (isSelected && !isSubmitted) {
                  optionStyle =
                    "border-amber-400/30 bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/20";
                }

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectOption(key)}
                    disabled={!!isSubmitted}
                    className={`flex items-start gap-3. rounded-xl border px-4 py-3.5 text-left text-sm transition-all disabled:cursor-default ${optionStyle}`}
                    id={`scholar-option-${key}`}
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        isSubmitted && isCorrectAnswer
                          ? "bg-emerald-400/20 text-emerald-300"
                          : wasWrongSelection
                            ? "bg-rose-400/20 text-rose-300"
                            : isSelected
                              ? "bg-amber-400/20 text-amber-200"
                              : "bg-white/[0.05] text-slate-500"
                      }`}
                    >
                      {isSubmitted && isCorrectAnswer
                        ? "✓"
                        : wasWrongSelection
                          ? "✗"
                          : key}
                    </span>
                    <span className="flex-1">
                      {isMatchOption(option)
                        ? `${option.left} → ${option.right}`
                        : option.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Explanation (shown after submit) */}
            {currentAnswer?.submitted && currentQuestion.explanation && (
              <div className="mt-5 rounded-2xl border border-blue-400/15 bg-blue-500/[0.04] p-5">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
                  Explanation
                </p>
                <p className="text-sm leading-relaxed text-slate-300">
                  {currentQuestion.explanation}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((prev) => Math.max(0, prev - 1))
                  }
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-xs font-bold text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((prev) =>
                      Math.min(questions.length - 1, prev + 1),
                    )
                  }
                  disabled={currentIndex === questions.length - 1}
                  className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-xs font-bold text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {!currentAnswer?.submitted && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSubmitAnswer(true)}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-xs font-bold text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                    id="scholar-skip-btn"
                  >
                    <SkipForward className="h-3.5 w-3.5" />
                    Skip
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleSubmitAnswer(false)}
                    disabled={
                      isSubmitting || !currentAnswer?.selected
                    }
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                    id="scholar-submit-answer-btn"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Submit Answer
                  </button>
                </div>
              )}

              {currentAnswer?.submitted &&
                currentIndex < questions.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => prev + 1)}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110"
                  >
                    Next Question
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
            </div>
          </div>
        </div>

        {/* ── Side Panel: Question Map ── */}
        <div className="hidden lg:block">
          <div className="sticky top-4 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-xl">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Question Map
            </h3>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, index) => {
                const state = answers[q.questionNumber];
                const isCurrent = index === currentIndex;

                let bg = "bg-white/[0.03] text-slate-500";
                if (isCurrent) bg = "bg-amber-500/15 text-amber-200 ring-2 ring-amber-400/20";
                else if (state?.isCorrect === true)
                  bg = "bg-emerald-500/15 text-emerald-300";
                else if (state?.isCorrect === false)
                  bg = "bg-rose-500/15 text-rose-300";
                else if (state?.submitted)
                  bg = "bg-slate-500/15 text-slate-400";

                return (
                  <button
                    key={q.questionNumber}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={`flex h-10 w-full items-center justify-center rounded-lg text-xs font-bold transition-all ${bg}`}
                  >
                    {q.questionNumber}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-5 flex flex-col gap-2 text-[10px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-amber-500/15" />
                Current
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-emerald-500/15" />
                Correct
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-rose-500/15" />
                Wrong
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-slate-500/15" />
                Skipped
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-white/[0.03]" />
                Unanswered
              </div>
            </div>

            {/* Session Info */}
            <div className="mt-5 border-t border-white/[0.06] pt-4">
              <p className="truncate text-xs font-bold text-white">
                {session.title}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                {session.examCategory.replace(/_/g, " ").toUpperCase()} •{" "}
                {session.difficulty}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

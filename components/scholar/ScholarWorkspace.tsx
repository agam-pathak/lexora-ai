"use client";

import { useState, useCallback } from "react";
import {
  GraduationCap,
  ArrowLeft,
  Sparkles,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

import ExamSelector from "./ExamSelector";
import ScholarQuizGenerator from "./ScholarQuizGenerator";
import QuizRenderer from "./QuizRenderer";
import ScholarQuizResults from "./ScholarQuizResults";
import AnalyticsDashboard from "./AnalyticsDashboard";

import type {
  ExamCategory,
  GeneratedQuestion,
  ScholarMockSession,
  ScholarQuestionLog,
} from "@/lib/scholar/types";

type ScholarView = "setup" | "quiz" | "results";
type SetupTab = "practice" | "analytics";

type ScholarWorkspaceProps = {
  userId: string;
  userName: string;
};

export default function ScholarWorkspace({
  userName,
}: ScholarWorkspaceProps) {
  const [selectedExam, setSelectedExam] = useState<ExamCategory>("upsc_cse");
  const [currentView, setCurrentView] = useState<ScholarView>("setup");
  const [setupTab, setSetupTab] = useState<SetupTab>("practice");
  const [session, setSession] = useState<ScholarMockSession | null>(null);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [completedSession, setCompletedSession] =
    useState<ScholarMockSession | null>(null);
  const [completedQuestions, setCompletedQuestions] = useState<
    ScholarQuestionLog[]
  >([]);

  const handleAssessmentGenerated = useCallback(
    (newSession: ScholarMockSession, newQuestions: GeneratedQuestion[]) => {
      setSession(newSession);
      setQuestions(newQuestions);
      setCurrentView("quiz");
    },
    [],
  );

  const handleQuizCompleted = useCallback(
    (
      finalSession: ScholarMockSession,
      finalQuestions: ScholarQuestionLog[],
    ) => {
      setCompletedSession(finalSession);
      setCompletedQuestions(finalQuestions);
      setCurrentView("results");
    },
    [],
  );

  const handleReturnToSetup = useCallback(() => {
    setSession(null);
    setQuestions([]);
    setCompletedSession(null);
    setCompletedQuestions([]);
    setCurrentView("setup");
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* ── Scholar Sub-Header ── */}
      <div className="relative z-40 shrink-0 border-b border-white/[0.06] bg-slate-950/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 shadow-inner ring-1 ring-white/10">
                <GraduationCap className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-400/80">
                  Lexora Scholar
                </p>
                <p className="text-xs font-bold text-white">
                  Omni-Exam Strategist
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Tab Switcher (only visible in setup view) */}
            {currentView === "setup" && (
              <div className="hidden items-center gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-0.5 sm:flex">
                <button
                  type="button"
                  onClick={() => setSetupTab("practice")}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11px] font-bold transition-all ${
                    setupTab === "practice"
                      ? "bg-amber-500/10 text-amber-200 shadow-sm"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                  id="scholar-tab-practice"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Practice
                </button>
                <button
                  type="button"
                  onClick={() => setSetupTab("analytics")}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11px] font-bold transition-all ${
                    setupTab === "analytics"
                      ? "bg-amber-500/10 text-amber-200 shadow-sm"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                  id="scholar-tab-analytics"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Analytics
                </button>
              </div>
            )}

            <ExamSelector
              selectedExam={selectedExam}
              onExamChange={(exam) => {
                setSelectedExam(exam);
              }}
              disabled={currentView === "quiz"}
            />

            <div className="hidden items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Scholar Mode
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">
          {currentView === "setup" && setupTab === "practice" && (
            <div className="reveal-rise">
              {/* Welcome Banner */}
              <div className="mb-8 overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-amber-500/[0.06] to-orange-600/[0.03] p-8 backdrop-blur-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white sm:text-3xl">
                      Welcome back,{" "}
                      <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                        {userName}
                      </span>
                    </h1>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
                      Select your target exam, choose a subject, and let Lexora
                      Scholar generate an AI-powered mock assessment tailored to
                      your preparation level.
                    </p>
                  </div>
                  <div className="hidden lg:block">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/10 to-orange-500/10 ring-1 ring-white/[0.08]">
                      <GraduationCap className="h-10 w-10 text-amber-300/60" />
                    </div>
                  </div>
                </div>

                {/* Mobile tab switcher */}
                <div className="mt-4 flex items-center gap-2 sm:hidden">
                  <button
                    type="button"
                    onClick={() => setSetupTab("practice")}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition bg-amber-500/10 text-amber-200 border border-amber-400/20"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Practice
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupTab("analytics")}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition text-slate-500 border border-white/[0.06]"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    Analytics
                  </button>
                </div>
              </div>

              <ScholarQuizGenerator
                selectedExam={selectedExam}
                onGenerated={handleAssessmentGenerated}
              />
            </div>
          )}

          {currentView === "setup" && setupTab === "analytics" && (
            <AnalyticsDashboard selectedExam={selectedExam} />
          )}

          {currentView === "quiz" && session && questions.length > 0 && (
            <QuizRenderer
              session={session}
              questions={questions}
              onCompleted={handleQuizCompleted}
              onExit={handleReturnToSetup}
            />
          )}

          {currentView === "results" &&
            completedSession &&
            completedQuestions.length > 0 && (
              <ScholarQuizResults
                session={completedSession}
                questions={completedQuestions}
                onReturnToSetup={handleReturnToSetup}
                selectedExam={selectedExam}
              />
            )}
        </div>
      </div>
    </div>
  );
}



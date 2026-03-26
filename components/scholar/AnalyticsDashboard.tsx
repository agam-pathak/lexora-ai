"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Trophy,
  CheckCircle2,
  XCircle,
  SkipForward,
  Loader2,
  RefreshCw,
  AlertCircle,
  Flame,
  Zap,
  Brain,
} from "lucide-react";

import type {
  ExamCategory,
  SessionAnalytics,
  PerformanceTrend,
  ScholarMockSession,
} from "@/lib/scholar/types";
import { EXAM_LABELS } from "@/lib/scholar/types";

type AnalyticsData = {
  examType: ExamCategory;
  summary: {
    totalSessions: number;
    totalQuestionsAttempted: number;
    totalCorrect: number;
    averageAccuracy: number;
    totalTimeSpentSecs: number;
  };
  weakSubjects: SessionAnalytics[];
  performanceTrend: PerformanceTrend[];
  recentSessions: ScholarMockSession[];
};

type AnalyticsDashboardProps = {
  selectedExam: ExamCategory;
};

function formatTime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function getAccuracyColor(accuracy: number) {
  if (accuracy >= 80) return "text-emerald-400";
  if (accuracy >= 60) return "text-amber-400";
  if (accuracy >= 40) return "text-orange-400";
  return "text-rose-400";
}

function getAccuracyBg(accuracy: number) {
  if (accuracy >= 80) return "from-emerald-400 to-emerald-500";
  if (accuracy >= 60) return "from-amber-400 to-amber-500";
  if (accuracy >= 40) return "from-orange-400 to-orange-500";
  return "from-rose-400 to-rose-500";
}

function getStrengthLabel(accuracy: number) {
  if (accuracy >= 80) return { label: "Strong", icon: Flame, color: "text-emerald-400" };
  if (accuracy >= 60) return { label: "Moderate", icon: Zap, color: "text-amber-400" };
  if (accuracy >= 40) return { label: "Developing", icon: Brain, color: "text-orange-400" };
  return { label: "Weak", icon: AlertCircle, color: "text-rose-400" };
}

export default function AnalyticsDashboard({
  selectedExam,
}: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/scholar/analytics?examType=${selectedExam}`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch analytics.");
      }

      const analyticsData: AnalyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedExam]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 text-amber-300 animate-spin" />
        <p className="text-sm text-slate-400">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-10 w-10 text-rose-400" />
        <p className="text-sm text-rose-300">{error}</p>
        <button
          type="button"
          onClick={() => void fetchAnalytics()}
          className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/[0.06]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.summary.totalSessions === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]">
          <BarChart3 className="h-10 w-10 text-slate-600" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-300">
            No data yet for {EXAM_LABELS[selectedExam]}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Complete your first mock assessment to see analytics here.
          </p>
        </div>
      </div>
    );
  }

  const { summary, weakSubjects, performanceTrend, recentSessions } = data;

  // Compute trend direction from last 2 sessions
  const trendDirection =
    performanceTrend.length >= 2
      ? performanceTrend[0].accuracy >= performanceTrend[1].accuracy
        ? "up"
        : "down"
      : "neutral";

  // Find worst and best subjects
  const worstSubject = weakSubjects.length > 0 ? weakSubjects[0] : null;
  const bestSubject =
    weakSubjects.length > 0 ? weakSubjects[weakSubjects.length - 1] : null;

  // Max height for chart bars
  const maxAccuracy = Math.max(
    ...performanceTrend.map((t) => t.accuracy),
    100,
  );

  return (
    <div className="reveal-rise">
      {/* ── Header Row ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white sm:text-2xl">
            Performance Analytics
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {EXAM_LABELS[selectedExam]} • Based on {summary.totalSessions}{" "}
            completed session{summary.totalSessions !== 1 ? "s" : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchAnalytics()}
          className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-xs font-bold text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
          id="scholar-refresh-analytics"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* ── Summary Stat Cards ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {/* Average Accuracy */}
        <div className="metric-card !rounded-2xl">
          <div className="mb-2 flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Accuracy
            </span>
          </div>
          <div className="flex items-end gap-2">
            <span
              className={`text-2xl font-bold ${getAccuracyColor(summary.averageAccuracy)}`}
            >
              {summary.averageAccuracy}%
            </span>
            {trendDirection === "up" && (
              <TrendingUp className="mb-1 h-4 w-4 text-emerald-400" />
            )}
            {trendDirection === "down" && (
              <TrendingDown className="mb-1 h-4 w-4 text-rose-400" />
            )}
          </div>
        </div>

        {/* Total Sessions */}
        <div className="metric-card !rounded-2xl">
          <div className="mb-2 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Sessions
            </span>
          </div>
          <span className="text-2xl font-bold text-white">
            {summary.totalSessions}
          </span>
        </div>

        {/* Questions Attempted */}
        <div className="metric-card !rounded-2xl">
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Correct
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-emerald-400">
              {summary.totalCorrect}
            </span>
            <span className="text-xs text-slate-600">
              / {summary.totalQuestionsAttempted}
            </span>
          </div>
        </div>

        {/* Total Time */}
        <div className="metric-card !rounded-2xl">
          <div className="mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Time Spent
            </span>
          </div>
          <span className="text-2xl font-bold text-white">
            {formatTime(summary.totalTimeSpentSecs)}
          </span>
        </div>

        {/* Trend */}
        <div className="metric-card !rounded-2xl hidden lg:block">
          <div className="mb-2 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-fuchsia-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Trend
            </span>
          </div>
          <span
            className={`text-lg font-bold ${trendDirection === "up" ? "text-emerald-400" : trendDirection === "down" ? "text-rose-400" : "text-slate-400"}`}
          >
            {trendDirection === "up"
              ? "↑ Improving"
              : trendDirection === "down"
                ? "↓ Declining"
                : "— Steady"}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Performance Trend Chart ── */}
        <div className="lg:col-span-3">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Accuracy Trend
              </h3>
              <span className="text-xs text-slate-600">
                (Last {performanceTrend.length} sessions)
              </span>
            </div>

            {performanceTrend.length > 0 ? (
              <div className="flex flex-col gap-3">
                {/* Chart Area */}
                <div className="flex items-end gap-1.5 overflow-x-auto pb-2" style={{ minHeight: 180 }}>
                  {[...performanceTrend].reverse().map((trend, index) => {
                    const barHeight = Math.max(
                      (trend.accuracy / maxAccuracy) * 160,
                      8,
                    );

                    return (
                      <div
                        key={trend.sessionId}
                        className="group relative flex flex-1 min-w-[28px] max-w-[56px] flex-col items-center gap-1"
                      >
                        {/* Tooltip */}
                        <div className="pointer-events-none absolute -top-16 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-xl border border-white/[0.1] bg-slate-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur-xl group-hover:block">
                          <p className="font-bold text-white">
                            {trend.accuracy}%
                          </p>
                          <p className="text-slate-500">
                            {trend.totalQuestions} Q •{" "}
                            {formatTime(trend.timeSpentSecs)}
                          </p>
                        </div>

                        {/* Value */}
                        <span className="text-[10px] font-bold text-slate-500 opacity-0 transition group-hover:opacity-100">
                          {trend.accuracy}%
                        </span>

                        {/* Bar */}
                        <div
                          className={`w-full rounded-t-lg bg-gradient-to-t ${getAccuracyBg(trend.accuracy)} opacity-70 transition-all duration-500 hover:opacity-100`}
                          style={{
                            height: barHeight,
                            animationDelay: `${index * 60}ms`,
                          }}
                        />

                        {/* Session # */}
                        <span className="text-[9px] text-slate-600">
                          #{performanceTrend.length - index}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Accuracy baseline */}
                <div className="flex items-center gap-2 border-t border-white/[0.04] pt-2">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                  <span className="text-[10px] text-slate-600">
                    Average: {summary.averageAccuracy}%
                  </span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                </div>
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-slate-600">
                No trend data available yet
              </div>
            )}
          </div>
        </div>

        {/* ── Weak Subjects Panel ── */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-2">
              <Target className="h-4 w-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white">
                Subject Analysis
              </h3>
            </div>

            {weakSubjects.length > 0 ? (
              <div className="flex flex-col gap-3.5">
                {weakSubjects.map((subject, index) => {
                  const strength = getStrengthLabel(subject.accuracyPct);
                  const StrengthIcon = strength.icon;

                  return (
                    <div key={subject.subjectTag}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${
                              index === 0
                                ? "bg-rose-500/15 text-rose-300"
                                : index === weakSubjects.length - 1
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : "bg-white/[0.04] text-slate-500"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-300">
                            {subject.subjectTag}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <StrengthIcon
                            className={`h-3 w-3 ${strength.color}`}
                          />
                          <span
                            className={`text-xs font-bold ${getAccuracyColor(subject.accuracyPct)}`}
                          >
                            {subject.accuracyPct}%
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${getAccuracyBg(subject.accuracyPct)} transition-all duration-700`}
                          style={{ width: `${subject.accuracyPct}%` }}
                        />
                      </div>

                      {/* Mini stats */}
                      <div className="mt-1 flex gap-3 text-[10px] text-slate-600">
                        <span className="flex items-center gap-0.5">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          {subject.correct}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <XCircle className="h-2.5 w-2.5" />
                          {subject.wrong}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <SkipForward className="h-2.5 w-2.5" />
                          {subject.skipped}
                        </span>
                        <span>• {subject.totalQuestions} total</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-slate-600">
                No subject data yet
              </div>
            )}

            {/* Quick Insights */}
            {worstSubject && bestSubject && worstSubject !== bestSubject && (
              <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Quick Insights
                </p>
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                    <span className="text-slate-400">
                      <span className="font-semibold text-rose-300">
                        {worstSubject.subjectTag}
                      </span>{" "}
                      needs the most attention at{" "}
                      {worstSubject.accuracyPct}% accuracy
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span className="text-slate-400">
                      <span className="font-semibold text-emerald-300">
                        {bestSubject.subjectTag}
                      </span>{" "}
                      is your strongest at {bestSubject.accuracyPct}% accuracy
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Sessions Table ── */}
      <div className="mt-6">
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Recent Sessions</h3>
          </div>

          {recentSessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      Session
                    </th>
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      Score
                    </th>
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                      Accuracy
                    </th>
                    <th className="hidden pb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 sm:table-cell">
                      Questions
                    </th>
                    <th className="hidden pb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 md:table-cell">
                      Time
                    </th>
                    <th className="hidden pb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 lg:table-cell">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {recentSessions.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-white/[0.03] transition hover:bg-white/[0.015]"
                    >
                      <td className="py-3 pr-4">
                        <p className="truncate text-xs font-semibold text-slate-200 max-w-[200px]">
                          {s.title}
                        </p>
                        <p className="text-[10px] text-slate-600">
                          {new Date(s.startedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs font-bold text-white">
                          {s.scoreObtained}
                        </span>
                        <span className="text-[10px] text-slate-600">
                          /{s.maxScore}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`text-xs font-bold ${getAccuracyColor(s.accuracy)}`}
                        >
                          {s.accuracy}%
                        </span>
                      </td>
                      <td className="hidden py-3 pr-4 sm:table-cell">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span className="text-emerald-400 font-bold">
                            {s.correctAnswers}
                          </span>
                          <span>/</span>
                          <span>{s.totalQuestions}</span>
                        </div>
                      </td>
                      <td className="hidden py-3 pr-4 md:table-cell">
                        <span className="text-xs text-slate-400">
                          {formatTime(s.timeSpentSecs)}
                        </span>
                      </td>
                      <td className="hidden py-3 lg:table-cell">
                        <span
                          className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            s.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-300"
                              : s.status === "in_progress"
                                ? "bg-amber-500/10 text-amber-300"
                                : "bg-slate-500/10 text-slate-400"
                          }`}
                        >
                          {s.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center text-sm text-slate-600">
              No sessions recorded yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

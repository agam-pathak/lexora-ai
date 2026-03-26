/**
 * Lexora Scholar – Analytics API
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * GET /api/scholar/analytics?examType=upsc_cse
 *
 * Returns weak-subject breakdown and performance trend for the
 * authenticated user, filtered by exam category.
 */

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { EXAM_CATEGORIES, type ExamCategory } from "@/lib/scholar/types";
import {
  getWeakSubjects,
  getPerformanceTrend,
  getUserSessions,
} from "@/lib/scholar/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // ── 1. Authentication ──────────────────────────────────────────────
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    // ── 2. Parse query params ──────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const examType = searchParams.get("examType") as ExamCategory | null;

    if (!examType || !EXAM_CATEGORIES.includes(examType)) {
      return NextResponse.json(
        {
          error: "A valid examType query parameter is required.",
          validValues: EXAM_CATEGORIES,
        },
        { status: 400 },
      );
    }

    // ── 3. Fetch analytics data in parallel ────────────────────────────
    const [weakSubjects, performanceTrend, recentSessions] = await Promise.all([
      getWeakSubjects(session.userId, examType, 15),
      getPerformanceTrend(session.userId, examType, 20),
      getUserSessions(session.userId, examType, 10),
    ]);

    // ── 4. Compute summary stats ───────────────────────────────────────
    const completedSessions = recentSessions.filter(
      (s) => s.status === "completed",
    );

    const totalAttempted = completedSessions.reduce(
      (sum, s) => sum + s.totalQuestions,
      0,
    );
    const totalCorrect = completedSessions.reduce(
      (sum, s) => sum + s.correctAnswers,
      0,
    );
    const averageAccuracy =
      completedSessions.length > 0
        ? completedSessions.reduce((sum, s) => sum + s.accuracy, 0) /
          completedSessions.length
        : 0;
    const totalTimeSpent = completedSessions.reduce(
      (sum, s) => sum + s.timeSpentSecs,
      0,
    );

    // ── 5. Return response ─────────────────────────────────────────────
    return NextResponse.json(
      {
        examType,
        summary: {
          totalSessions: completedSessions.length,
          totalQuestionsAttempted: totalAttempted,
          totalCorrect,
          averageAccuracy: Math.round(averageAccuracy * 100) / 100,
          totalTimeSpentSecs: totalTimeSpent,
        },
        weakSubjects,
        performanceTrend,
        recentSessions,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Scholar analytics route error:", error);

    return NextResponse.json(
      { error: "Analytics data could not be fetched." },
      { status: 500 },
    );
  }
}

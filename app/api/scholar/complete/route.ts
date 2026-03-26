/**
 * Lexora Scholar – Complete Session API
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * POST /api/scholar/complete
 *
 * Marks a mock session as completed, records total time, and
 * returns final aggregated results.
 */

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { CompleteSessionRequestSchema } from "@/lib/scholar/types";
import {
  completeSession,
  getSession as getScholarSession,
  getSessionQuestions,
} from "@/lib/scholar/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // ── 1. Authentication ──────────────────────────────────────────────
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    // ── 2. Request Validation ──────────────────────────────────────────
    const body = await request.json();
    const parseResult = CompleteSessionRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body.",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { sessionId, totalTimeSpentSecs } = parseResult.data;

    // ── 3. Verify session ownership ────────────────────────────────────
    const mockSession = await getScholarSession(session.userId, sessionId);

    if (!mockSession) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 },
      );
    }

    if (mockSession.status === "completed") {
      return NextResponse.json(
        { error: "This session has already been completed." },
        { status: 400 },
      );
    }

    // ── 4. Complete the session ────────────────────────────────────────
    const completedSession = await completeSession(
      sessionId,
      session.userId,
      totalTimeSpentSecs,
    );

    // ── 5. Fetch all question logs for the results view ────────────────
    const questions = await getSessionQuestions(session.userId, sessionId);

    // ── 6. Return response ─────────────────────────────────────────────
    return NextResponse.json(
      {
        session: completedSession,
        questions,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Scholar complete route error:", error);

    return NextResponse.json(
      { error: "Session completion failed." },
      { status: 500 },
    );
  }
}

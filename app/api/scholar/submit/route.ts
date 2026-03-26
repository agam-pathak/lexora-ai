/**
 * Lexora Scholar – Submit Answer API
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * POST /api/scholar/submit
 *
 * Records a user's answer to a single question within a mock session.
 * Handles correctness checking, negative marking, and aggregate updates.
 */

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import {
  SubmitAnswerRequestSchema,
  type SubmitAnswerResponse,
} from "@/lib/scholar/types";
import {
  submitAnswer,
  updateSessionAggregates,
  getSession as getScholarSession,
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
    const parseResult = SubmitAnswerRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body.",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { sessionId, questionNumber, userAnswer, timeSpentSecs } =
      parseResult.data;

    // ── 3. Verify session ownership ────────────────────────────────────
    const mockSession = await getScholarSession(session.userId, sessionId);

    if (!mockSession) {
      return NextResponse.json(
        { error: "Session not found." },
        { status: 404 },
      );
    }

    if (mockSession.status !== "in_progress") {
      return NextResponse.json(
        { error: "This session has already been completed or abandoned." },
        { status: 400 },
      );
    }

    // ── 4. Submit the answer ───────────────────────────────────────────
    const questionLog = await submitAnswer({
      userId: session.userId,
      sessionId,
      questionNumber,
      userAnswer,
      timeSpentSecs,
    });

    // ── 5. Update session aggregates ───────────────────────────────────
    const updatedSession = await updateSessionAggregates(
      sessionId,
      session.userId,
    );

    // ── 6. Return response ─────────────────────────────────────────────
    const response: SubmitAnswerResponse = {
      questionLog,
      session: updatedSession,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Scholar submit route error:", error);

    return NextResponse.json(
      { error: "Answer submission failed." },
      { status: 500 },
    );
  }
}

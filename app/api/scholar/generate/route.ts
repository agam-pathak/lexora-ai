/**
 * Lexora Scholar – Assessment Generation API
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * POST /api/scholar/generate
 *
 * Generates a mock assessment for a selected exam category using
 * Groq/Llama 3.3 structured JSON output. Dynamically switches the
 * system prompt and (future) pgvector namespace based on examType.
 *
 * QUARANTINE: This route is completely isolated from app/api/chat.
 */

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { CHAT_MODEL, getGroqClient } from "@/lib/embeddings";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  GenerateAssessmentRequestSchema,
  GeneratedAssessmentSchema,
  EXAM_LABELS,
  type GenerateAssessmentResponse,
} from "@/lib/scholar/types";
import { buildScholarSystemPrompt } from "@/lib/scholar/prompts";
import {
  createMockSession,
  insertQuestionLogs,
} from "@/lib/scholar/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Rate limit: 10 generations per 60 seconds per IP
const SCHOLAR_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60_000,
} as const;

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

    // ── 2. Rate Limiting ───────────────────────────────────────────────
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(
      `scholar:generate:${clientIp}`,
      SCHOLAR_RATE_LIMIT.maxRequests,
      SCHOLAR_RATE_LIMIT.windowMs,
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again shortly.",
          retryAfterMs: rateLimitResult.retryAfterMs,
        },
        { status: 429 },
      );
    }

    // ── 3. Request Validation (Zod) ────────────────────────────────────
    const body = await request.json();
    const parseResult = GenerateAssessmentRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body.",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const {
      examType,
      subject,
      topic,
      questionCount,
      difficulty,
    } = parseResult.data;

    // ── 4. (Future) Vector Context Retrieval ───────────────────────────
    // When a global exam knowledge base is populated:
    //
    //   const contextChunks = await retrieveExamContext({
    //     namespace: examType,             // e.g. "upsc_cse"
    //     query: `${subject} ${topic ?? ""}`,
    //     topK: 4,
    //   });
    //   const context = buildContext(contextChunks);
    //
    // For now, we generate questions purely from the LLM's parametric
    // knowledge. The prompt architecture is already context-aware — the
    // `context` parameter slots seamlessly into the system prompt.

    const context: string | undefined = undefined;

    // ── 5. Build Dynamic System Prompt ─────────────────────────────────
    const systemPrompt = buildScholarSystemPrompt({
      examType,
      subject,
      topic,
      questionCount,
      difficulty,
      context,
    });

    // ── 6. Call Groq (Structured JSON Output) ──────────────────────────
    const groq = getGroqClient();

    const completion = await groq.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.7,
      max_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Generate ${questionCount} ${difficulty} difficulty ${EXAM_LABELS[examType]} questions on the subject "${subject}"${topic ? ` focusing on "${topic}"` : ""}. Return valid JSON only.`,
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;

    if (!rawContent) {
      return NextResponse.json(
        { error: "The model returned an empty response. Please try again." },
        { status: 502 },
      );
    }

    // ── 7. Parse & Validate LLM Output ─────────────────────────────────
    let parsedJson: unknown;

    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      console.error("Scholar: LLM returned invalid JSON:", rawContent.slice(0, 500));
      return NextResponse.json(
        { error: "The model returned malformed output. Please try again." },
        { status: 502 },
      );
    }

    const assessmentResult = GeneratedAssessmentSchema.safeParse(parsedJson);

    if (!assessmentResult.success) {
      console.error(
        "Scholar: LLM output failed Zod validation:",
        assessmentResult.error.flatten(),
      );
      return NextResponse.json(
        {
          error: "The generated assessment failed validation. Please try again.",
          details: assessmentResult.error.flatten().fieldErrors,
        },
        { status: 502 },
      );
    }

    const { questions } = assessmentResult.data;

    // ── 8. Persist to Database ─────────────────────────────────────────
    const sessionTitle = topic
      ? `${subject} – ${topic}`
      : subject;

    const mockSession = await createMockSession({
      userId: session.userId,
      examCategory: examType,
      title: `${EXAM_LABELS[examType]}: ${sessionTitle}`,
      totalQuestions: questions.length,
      subjectScope: subject,
      difficulty,
    });

    await insertQuestionLogs(
      session.userId,
      mockSession.id,
      examType,
      questions,
    );

    // ── 9. Return Response ─────────────────────────────────────────────
    const response: GenerateAssessmentResponse = {
      session: mockSession,
      questions,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Scholar generate route error:", error);

    const message =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    return NextResponse.json(
      { error: `Assessment generation failed: ${message}` },
      { status: 500 },
    );
  }
}

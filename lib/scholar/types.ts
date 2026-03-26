/**
 * Lexora Scholar – Type Definitions & Zod Schemas
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Completely isolated from the core Lexora type system.
 * These types map 1-to-1 with the Phase 1 SQL schema.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Enum Constants (mirrors the PostgreSQL enums)
// ─────────────────────────────────────────────────────────────────────────────

export const EXAM_CATEGORIES = [
  "upsc_cse",
  "banking_ibps",
  "gate_cs",
  "gate_ee",
  "gate_me",
  "ssc_cgl",
  "cat_mba",
] as const;

export type ExamCategory = (typeof EXAM_CATEGORIES)[number];

export const QUESTION_TYPES = [
  "standard_mcq",
  "assertion_reasoning",
  "multi_correct",
  "quantitative",
  "true_false",
  "match_the_following",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const DIFFICULTY_LEVELS = ["easy", "medium", "hard", "mixed"] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const SESSION_STATUSES = [
  "in_progress",
  "completed",
  "abandoned",
] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// 2. Zod Schemas – Request Validation
// ─────────────────────────────────────────────────────────────────────────────

/** POST /api/scholar/generate – request body */
export const GenerateAssessmentRequestSchema = z.object({
  examType: z.enum(EXAM_CATEGORIES),
  subject: z.string().min(1).max(200),
  topic: z.string().max(200).optional(),
  questionCount: z.number().int().min(1).max(30).default(10),
  difficulty: z.enum(DIFFICULTY_LEVELS).default("medium"),
  /** Optional: pre-existing session to append to (for "continue" flow) */
  sessionId: z.string().uuid().optional(),
});

export type GenerateAssessmentRequest = z.infer<
  typeof GenerateAssessmentRequestSchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// 3. Zod Schemas – Polymorphic Question (Groq Structured Output)
// ─────────────────────────────────────────────────────────────────────────────

/** A single option within a question */
const BaseOptionSchema = z.object({
  key: z.string().min(1).max(2),
  text: z.string().min(1),
});

/** Extended option for "match the following" */
const MatchOptionSchema = z.object({
  key: z.string().min(1).max(2),
  left: z.string().min(1),
  right: z.string().min(1),
});

/** Union option: standard OR match */
export const OptionSchema = z.union([BaseOptionSchema, MatchOptionSchema]);
export type QuestionOption = z.infer<typeof OptionSchema>;

/** A single generated question – polymorphic via `questionType` discriminator */
export const GeneratedQuestionSchema = z.object({
  questionNumber: z.number().int().min(1),
  questionType: z.enum(QUESTION_TYPES),
  questionText: z.string().min(1),
  options: z.array(OptionSchema).min(2).max(8),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
  subjectTag: z.string().min(1),
  topicTag: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;

/** The full array returned by Groq structured output */
export const GeneratedAssessmentSchema = z.object({
  questions: z.array(GeneratedQuestionSchema).min(1).max(30),
});

export type GeneratedAssessment = z.infer<typeof GeneratedAssessmentSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 4. Zod Schemas – Submit Answer (for later use in Phase 3)
// ─────────────────────────────────────────────────────────────────────────────

export const SubmitAnswerRequestSchema = z.object({
  sessionId: z.string().uuid(),
  questionNumber: z.number().int().min(1),
  userAnswer: z.string().nullable(),
  timeSpentSecs: z.number().int().min(0).default(0),
});

export type SubmitAnswerRequest = z.infer<typeof SubmitAnswerRequestSchema>;

export const CompleteSessionRequestSchema = z.object({
  sessionId: z.string().uuid(),
  totalTimeSpentSecs: z.number().int().min(0).default(0),
});

export type CompleteSessionRequest = z.infer<
  typeof CompleteSessionRequestSchema
>;

// ─────────────────────────────────────────────────────────────────────────────
// 5. Database Row Types (camelCase mirrors of the SQL columns)
// ─────────────────────────────────────────────────────────────────────────────

export type ScholarMockSession = {
  id: string;
  userId: string;
  examCategory: ExamCategory;
  title: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skipped: number;
  scoreObtained: number;
  maxScore: number;
  accuracy: number;
  timeLimitSecs: number | null;
  timeSpentSecs: number;
  subjectScope: string | null;
  difficulty: string | null;
  status: SessionStatus;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
};

export type ScholarQuestionLog = {
  id: string;
  sessionId: string;
  userId: string;
  examCategory: ExamCategory;
  questionType: QuestionType;
  questionNumber: number;
  questionText: string;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string | null;
  subjectTag: string;
  topicTag: string | null;
  difficulty: string | null;
  userAnswer: string | null;
  isCorrect: boolean | null;
  isSkipped: boolean;
  timeSpentSecs: number;
  marksAwarded: number;
  maxMarks: number;
  answeredAt: string | null;
  createdAt: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. API Response Types
// ─────────────────────────────────────────────────────────────────────────────

export type GenerateAssessmentResponse = {
  session: ScholarMockSession;
  questions: GeneratedQuestion[];
};

export type SubmitAnswerResponse = {
  questionLog: ScholarQuestionLog;
  session: ScholarMockSession;
};

export type SessionAnalytics = {
  subjectTag: string;
  totalQuestions: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracyPct: number;
};

export type PerformanceTrend = {
  sessionId: string;
  title: string;
  examCategory: ExamCategory;
  accuracy: number;
  scoreObtained: number;
  maxScore: number;
  totalQuestions: number;
  timeSpentSecs: number;
  startedAt: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. Human-readable exam labels (for UI & prompts)
// ─────────────────────────────────────────────────────────────────────────────

export const EXAM_LABELS: Record<ExamCategory, string> = {
  upsc_cse: "UPSC Civil Services Examination",
  banking_ibps: "Banking & IBPS",
  gate_cs: "GATE Computer Science",
  gate_ee: "GATE Electrical Engineering",
  gate_me: "GATE Mechanical Engineering",
  ssc_cgl: "SSC Combined Graduate Level",
  cat_mba: "CAT (MBA Entrance)",
};

/** Maps exam categories to the question types they most commonly use */
export const EXAM_QUESTION_TYPES: Record<ExamCategory, QuestionType[]> = {
  upsc_cse: ["standard_mcq", "assertion_reasoning", "multi_correct"],
  banking_ibps: ["standard_mcq", "quantitative", "true_false"],
  gate_cs: ["standard_mcq", "multi_correct", "quantitative"],
  gate_ee: ["standard_mcq", "quantitative", "multi_correct"],
  gate_me: ["standard_mcq", "quantitative", "multi_correct"],
  ssc_cgl: ["standard_mcq", "quantitative", "true_false"],
  cat_mba: ["standard_mcq", "quantitative", "match_the_following"],
};

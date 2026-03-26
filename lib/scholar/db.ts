/**
 * Lexora Scholar – Supabase Database Helpers
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * CRUD operations for scholar_mock_sessions and scholar_question_logs.
 * Uses the existing getSupabaseAdminClient() singleton from lib/supabase.ts
 * but references ONLY Scholar-namespaced tables.
 */

import { getSupabaseAdminClient } from "@/lib/supabase";

import type {
  ExamCategory,
  ScholarMockSession,
  ScholarQuestionLog,
  GeneratedQuestion,
  SessionAnalytics,
  PerformanceTrend,
  SessionStatus,
} from "./types";
import { EXAM_MARKING_SCHEMES } from "./prompts";

// ─────────────────────────────────────────────────────────────────────────────
// Table constants (isolated from SUPABASE_TABLES in lib/supabase.ts)
// ─────────────────────────────────────────────────────────────────────────────

export const SCHOLAR_TABLES = {
  sessions: "scholar_mock_sessions",
  questionLogs: "scholar_question_logs",
} as const;

export const SCHOLAR_RPC = {
  weakSubjects: "scholar_weak_subjects",
  performanceTrend: "scholar_performance_trend",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Row mappers (snake_case DB ↔ camelCase TS)
// ─────────────────────────────────────────────────────────────────────────────

type SessionRow = {
  id: string;
  user_id: string;
  exam_category: ExamCategory;
  title: string;
  total_questions: number;
  correct_answers: number;
  wrong_answers: number;
  skipped: number;
  score_obtained: number;
  max_score: number;
  accuracy: number;
  time_limit_secs: number | null;
  time_spent_secs: number;
  subject_scope: string | null;
  difficulty: string | null;
  status: SessionStatus;
  started_at: string;
  completed_at: string | null;
  created_at: string;
};

type QuestionLogRow = {
  id: string;
  session_id: string;
  user_id: string;
  exam_category: ExamCategory;
  question_type: string;
  question_number: number;
  question_text: string;
  options: unknown;
  correct_answer: string;
  explanation: string | null;
  subject_tag: string;
  topic_tag: string | null;
  difficulty: string | null;
  user_answer: string | null;
  is_correct: boolean | null;
  is_skipped: boolean;
  time_spent_secs: number;
  marks_awarded: number;
  max_marks: number;
  answered_at: string | null;
  created_at: string;
};

function fromSessionRow(row: SessionRow): ScholarMockSession {
  return {
    id: row.id,
    userId: row.user_id,
    examCategory: row.exam_category,
    title: row.title,
    totalQuestions: row.total_questions,
    correctAnswers: row.correct_answers,
    wrongAnswers: row.wrong_answers,
    skipped: row.skipped,
    scoreObtained: Number(row.score_obtained),
    maxScore: Number(row.max_score),
    accuracy: Number(row.accuracy),
    timeLimitSecs: row.time_limit_secs,
    timeSpentSecs: row.time_spent_secs,
    subjectScope: row.subject_scope,
    difficulty: row.difficulty,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

function fromQuestionLogRow(row: QuestionLogRow): ScholarQuestionLog {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    examCategory: row.exam_category,
    questionType: row.question_type as ScholarQuestionLog["questionType"],
    questionNumber: row.question_number,
    questionText: row.question_text,
    options: (row.options ?? []) as ScholarQuestionLog["options"],
    correctAnswer: row.correct_answer,
    explanation: row.explanation,
    subjectTag: row.subject_tag,
    topicTag: row.topic_tag,
    difficulty: row.difficulty,
    userAnswer: row.user_answer,
    isCorrect: row.is_correct,
    isSkipped: row.is_skipped,
    timeSpentSecs: row.time_spent_secs,
    marksAwarded: Number(row.marks_awarded),
    maxMarks: Number(row.max_marks),
    answeredAt: row.answered_at,
    createdAt: row.created_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getClient() {
  const client = getSupabaseAdminClient();

  if (!client) {
    throw new Error(
      "Supabase is not configured. Scholar features require a Supabase connection.",
    );
  }

  return client;
}

// ─────────────────────────────────────────────────────────────────────────────
// Session CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function createMockSession(params: {
  userId: string;
  examCategory: ExamCategory;
  title: string;
  totalQuestions: number;
  subjectScope: string;
  difficulty: string;
}): Promise<ScholarMockSession> {
  const supabase = getClient();
  const marking = EXAM_MARKING_SCHEMES[params.examCategory];

  const { data, error } = await supabase
    .from(SCHOLAR_TABLES.sessions)
    .insert({
      user_id: params.userId,
      exam_category: params.examCategory,
      title: params.title,
      total_questions: params.totalQuestions,
      max_score: params.totalQuestions * marking.correctMarks,
      subject_scope: params.subjectScope,
      difficulty: params.difficulty,
      status: "in_progress" as SessionStatus,
    })
    .select("*")
    .single();

  if (error) throw error;
  return fromSessionRow(data as SessionRow);
}

export async function getSession(
  userId: string,
  sessionId: string,
): Promise<ScholarMockSession | null> {
  const supabase = getClient();

  const { data, error } = await supabase
    .from(SCHOLAR_TABLES.sessions)
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? fromSessionRow(data as SessionRow) : null;
}

export async function updateSessionAggregates(
  sessionId: string,
  userId: string,
): Promise<ScholarMockSession> {
  const supabase = getClient();

  // Recompute aggregates from question logs
  const { data: logs, error: logsError } = await supabase
    .from(SCHOLAR_TABLES.questionLogs)
    .select("is_correct, is_skipped, marks_awarded")
    .eq("session_id", sessionId)
    .eq("user_id", userId);

  if (logsError) throw logsError;

  const aggregates = (logs ?? []).reduce(
    (acc, log) => {
      if (log.is_skipped) {
        acc.skipped += 1;
      } else if (log.is_correct === true) {
        acc.correctAnswers += 1;
      } else if (log.is_correct === false) {
        acc.wrongAnswers += 1;
      }
      acc.scoreObtained += Number(log.marks_awarded);
      return acc;
    },
    { correctAnswers: 0, wrongAnswers: 0, skipped: 0, scoreObtained: 0 },
  );

  const { data, error } = await supabase
    .from(SCHOLAR_TABLES.sessions)
    .update({
      correct_answers: aggregates.correctAnswers,
      wrong_answers: aggregates.wrongAnswers,
      skipped: aggregates.skipped,
      score_obtained: aggregates.scoreObtained,
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return fromSessionRow(data as SessionRow);
}

export async function completeSession(
  sessionId: string,
  userId: string,
  timeSpentSecs: number,
): Promise<ScholarMockSession> {
  // First, update aggregates
  await updateSessionAggregates(sessionId, userId);

  const supabase = getClient();
  const { data, error } = await supabase
    .from(SCHOLAR_TABLES.sessions)
    .update({
      status: "completed" as SessionStatus,
      time_spent_secs: timeSpentSecs,
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return fromSessionRow(data as SessionRow);
}

export async function getUserSessions(
  userId: string,
  examCategory?: ExamCategory,
  limit = 20,
): Promise<ScholarMockSession[]> {
  const supabase = getClient();
  let query = supabase
    .from(SCHOLAR_TABLES.sessions)
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (examCategory) {
    query = query.eq("exam_category", examCategory);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => fromSessionRow(row as SessionRow));
}

// ─────────────────────────────────────────────────────────────────────────────
// Question Log CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function insertQuestionLogs(
  userId: string,
  sessionId: string,
  examCategory: ExamCategory,
  questions: GeneratedQuestion[],
): Promise<ScholarQuestionLog[]> {
  const supabase = getClient();
  const marking = EXAM_MARKING_SCHEMES[examCategory];

  const rows = questions.map((q) => ({
    session_id: sessionId,
    user_id: userId,
    exam_category: examCategory,
    question_type: q.questionType,
    question_number: q.questionNumber,
    question_text: q.questionText,
    options: q.options,
    correct_answer: q.correctAnswer,
    explanation: q.explanation,
    subject_tag: q.subjectTag,
    topic_tag: q.topicTag ?? null,
    difficulty: q.difficulty,
    max_marks: marking.correctMarks,
    is_skipped: true, // initially all unanswered
  }));

  const { data, error } = await supabase
    .from(SCHOLAR_TABLES.questionLogs)
    .insert(rows)
    .select("*");

  if (error) throw error;
  return (data ?? []).map((row) => fromQuestionLogRow(row as QuestionLogRow));
}

export async function submitAnswer(params: {
  userId: string;
  sessionId: string;
  questionNumber: number;
  userAnswer: string | null;
  timeSpentSecs: number;
}): Promise<ScholarQuestionLog> {
  const supabase = getClient();

  // Fetch the question to check correctness
  const { data: existingLog, error: fetchError } = await supabase
    .from(SCHOLAR_TABLES.questionLogs)
    .select("*")
    .eq("session_id", params.sessionId)
    .eq("user_id", params.userId)
    .eq("question_number", params.questionNumber)
    .single();

  if (fetchError) throw fetchError;

  const log = existingLog as QuestionLogRow;
  const isSkipped = params.userAnswer === null || params.userAnswer === "";
  const isCorrect = isSkipped
    ? null
    : params.userAnswer === log.correct_answer;

  // Look up marking scheme from exam category
  const examCategory = log.exam_category;
  const marking = EXAM_MARKING_SCHEMES[examCategory];

  let marksAwarded = 0;
  if (isSkipped) {
    marksAwarded = marking.skippedMarks;
  } else if (isCorrect) {
    marksAwarded = marking.correctMarks;
  } else {
    marksAwarded = -marking.wrongPenalty;
  }

  const { data, error } = await supabase
    .from(SCHOLAR_TABLES.questionLogs)
    .update({
      user_answer: params.userAnswer,
      is_correct: isCorrect,
      is_skipped: isSkipped,
      time_spent_secs: params.timeSpentSecs,
      marks_awarded: marksAwarded,
      answered_at: isSkipped ? null : new Date().toISOString(),
    })
    .eq("session_id", params.sessionId)
    .eq("user_id", params.userId)
    .eq("question_number", params.questionNumber)
    .select("*")
    .single();

  if (error) throw error;
  return fromQuestionLogRow(data as QuestionLogRow);
}

export async function getSessionQuestions(
  userId: string,
  sessionId: string,
): Promise<ScholarQuestionLog[]> {
  const supabase = getClient();

  const { data, error } = await supabase
    .from(SCHOLAR_TABLES.questionLogs)
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("question_number", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => fromQuestionLogRow(row as QuestionLogRow));
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics (calls the SQL helper functions from Phase 1)
// ─────────────────────────────────────────────────────────────────────────────

export async function getWeakSubjects(
  userId: string,
  examCategory: ExamCategory,
  limit = 10,
): Promise<SessionAnalytics[]> {
  const supabase = getClient();

  const { data, error } = await supabase.rpc(SCHOLAR_RPC.weakSubjects, {
    p_user_id: userId,
    p_exam_category: examCategory,
    p_limit: limit,
  });

  if (error) throw error;

  return (data ?? []).map(
    (row: {
      subject_tag: string;
      total_questions: number;
      correct: number;
      wrong: number;
      skipped: number;
      accuracy_pct: number;
    }) => ({
      subjectTag: row.subject_tag,
      totalQuestions: Number(row.total_questions),
      correct: Number(row.correct),
      wrong: Number(row.wrong),
      skipped: Number(row.skipped),
      accuracyPct: Number(row.accuracy_pct),
    }),
  );
}

export async function getPerformanceTrend(
  userId: string,
  examCategory: ExamCategory,
  limit = 20,
): Promise<PerformanceTrend[]> {
  const supabase = getClient();

  const { data, error } = await supabase.rpc(SCHOLAR_RPC.performanceTrend, {
    p_user_id: userId,
    p_exam_category: examCategory,
    p_limit: limit,
  });

  if (error) throw error;

  return (data ?? []).map(
    (row: {
      session_id: string;
      title: string;
      exam_category: ExamCategory;
      accuracy: number;
      score_obtained: number;
      max_score: number;
      total_questions: number;
      time_spent_secs: number;
      started_at: string;
    }) => ({
      sessionId: row.session_id,
      title: row.title,
      examCategory: row.exam_category,
      accuracy: Number(row.accuracy),
      scoreObtained: Number(row.score_obtained),
      maxScore: Number(row.max_score),
      totalQuestions: row.total_questions,
      timeSpentSecs: row.time_spent_secs,
      startedAt: row.started_at,
    }),
  );
}

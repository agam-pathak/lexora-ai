-- ============================================================================
-- Lexora Scholar – Phase 1: Database Architecture
-- Migration: Create performance-tracking tables for the Omni-Exam Strategist
-- ============================================================================
-- QUARANTINE NOTE: This migration ONLY creates NEW objects.
-- It does NOT alter or reference any existing Lexora tables/functions.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ENUM TYPE – Exam Category
--    Single source of truth for every supported exam namespace.
--    Extend this type with ALTER TYPE … ADD VALUE when new exams are onboarded.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'scholar_exam_category') then
    create type public.scholar_exam_category as enum (
      'upsc_cse',
      'banking_ibps',
      'gate_cs',
      'gate_ee',
      'gate_me',
      'ssc_cgl',
      'cat_mba'
    );
  end if;
end
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ENUM TYPE – Question Type (Polymorphic discriminator)
--    Drives the polymorphic JSON schema for the assessment engine.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'scholar_question_type') then
    create type public.scholar_question_type as enum (
      'standard_mcq',
      'assertion_reasoning',
      'multi_correct',
      'quantitative',
      'true_false',
      'match_the_following'
    );
  end if;
end
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TABLE – scholar_mock_sessions
--    Each row = one mock-test attempt by a user for a specific exam category.
--    Stores aggregate scores, timing data, and the exam namespace used.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.scholar_mock_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null references public.lexora_users(id) on delete cascade,

  -- Exam namespace – drives vector search filter + system prompt selection
  exam_category   public.scholar_exam_category not null,

  -- Session metadata
  title           text not null default 'Untitled Session',
  total_questions  integer not null default 0   check (total_questions >= 0),
  correct_answers  integer not null default 0   check (correct_answers >= 0),
  wrong_answers    integer not null default 0   check (wrong_answers >= 0),
  skipped          integer not null default 0   check (skipped >= 0),

  -- Scoring (supports negative marking; kept as numeric for decimal precision)
  score_obtained   numeric(8, 2) not null default 0,
  max_score        numeric(8, 2) not null default 0,
  accuracy         numeric(5, 2) generated always as (
                     case
                       when (correct_answers + wrong_answers) > 0
                       then round(correct_answers::numeric / (correct_answers + wrong_answers) * 100, 2)
                       else 0
                     end
                   ) stored,

  -- Timing (seconds)
  time_limit_secs  integer,                          -- null = untimed
  time_spent_secs  integer not null default 0 check (time_spent_secs >= 0),

  -- Free-form subject scope that was requested (e.g. "Indian Polity", "Quant – Profit & Loss")
  subject_scope    text,

  -- Difficulty requested
  difficulty       text check (difficulty in ('easy', 'medium', 'hard', 'mixed')),

  -- Status
  status           text not null default 'in_progress'
                   check (status in ('in_progress', 'completed', 'abandoned')),

  -- Timestamps
  started_at       timestamptz not null default timezone('utc', now()),
  completed_at     timestamptz,
  created_at       timestamptz not null default timezone('utc', now())
);

-- Primary access pattern: "my recent sessions for this exam"
create index if not exists scholar_mock_sessions_user_exam_idx
  on public.scholar_mock_sessions (user_id, exam_category, started_at desc);

-- Dashboard aggregation: "all sessions for this user sorted by date"
create index if not exists scholar_mock_sessions_user_recent_idx
  on public.scholar_mock_sessions (user_id, started_at desc);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TABLE – scholar_question_logs
--    Each row = one question answered (or skipped) within a mock session.
--    Stores the full polymorphic question payload, user's answer, and tags.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.scholar_question_logs (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references public.scholar_mock_sessions(id) on delete cascade,
  user_id          text not null references public.lexora_users(id) on delete cascade,

  -- Exam namespace (denormalized for fast per-user filtering w/o joining sessions)
  exam_category    public.scholar_exam_category not null,

  -- Question payload ──────────────────────────────────────────────────────────
  question_type    public.scholar_question_type not null,
  question_number  integer not null check (question_number >= 1),
  question_text    text not null,

  -- Options stored as JSONB array – polymorphic per question_type.
  -- Standard MCQ:         [{"key":"A","text":"…"}, …]
  -- Assertion/Reasoning:  [{"key":"A","text":"Both correct, …"}, …]
  -- Quantitative:         [{"key":"A","text":"42"}, …]  (or empty [] for numeric input)
  -- Match-the-following:  [{"key":"A","left":"…","right":"…"}, …]
  options          jsonb not null default '[]'::jsonb,

  -- Correct answer identifier(s) – single key ("B") or array ("A,C") for multi-correct
  correct_answer   text not null,

  -- Explanation generated by the LLM
  explanation      text,

  -- Subject & topic tags for analytics drill-down
  subject_tag      text not null,                    -- e.g. "Indian Polity", "Quantitative Aptitude"
  topic_tag        text,                             -- e.g. "Fundamental Rights", "Profit & Loss"

  -- Difficulty of this specific question
  difficulty       text check (difficulty in ('easy', 'medium', 'hard')),

  -- User response ─────────────────────────────────────────────────────────────
  user_answer      text,                             -- null = skipped
  is_correct       boolean,                          -- null = skipped
  is_skipped       boolean not null default false,
  time_spent_secs  integer not null default 0 check (time_spent_secs >= 0),

  -- Marks (supports negative marking per question)
  marks_awarded    numeric(6, 2) not null default 0,
  max_marks        numeric(6, 2) not null default 1,

  -- Timestamps
  answered_at      timestamptz,
  created_at       timestamptz not null default timezone('utc', now())
);

-- Fast lookups: all questions in a session (ordered)
create index if not exists scholar_question_logs_session_idx
  on public.scholar_question_logs (session_id, question_number);

-- Analytics: per-user weak-subject analysis filtered by exam
create index if not exists scholar_question_logs_user_exam_subject_idx
  on public.scholar_question_logs (user_id, exam_category, subject_tag);

-- Analytics: overall per-user performance timeline
create index if not exists scholar_question_logs_user_answered_idx
  on public.scholar_question_logs (user_id, answered_at desc);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY (RLS)
--    Users may only read/write their OWN scholar data.
--    The service-role key used by the API bypasses RLS, but these policies
--    protect against any direct client-side Supabase access.
-- ─────────────────────────────────────────────────────────────────────────────

-- 5a. scholar_mock_sessions ──────────────────────────────────────────────────
alter table public.scholar_mock_sessions enable row level security;

-- SELECT: users see only their own sessions
create policy "scholar_sessions_select_own"
  on public.scholar_mock_sessions
  for select
  using (user_id = current_setting('app.current_user_id', true));

-- INSERT: users can only create sessions for themselves
create policy "scholar_sessions_insert_own"
  on public.scholar_mock_sessions
  for insert
  with check (user_id = current_setting('app.current_user_id', true));

-- UPDATE: users can only update their own sessions
create policy "scholar_sessions_update_own"
  on public.scholar_mock_sessions
  for update
  using (user_id = current_setting('app.current_user_id', true))
  with check (user_id = current_setting('app.current_user_id', true));

-- DELETE: users can only delete their own sessions
create policy "scholar_sessions_delete_own"
  on public.scholar_mock_sessions
  for delete
  using (user_id = current_setting('app.current_user_id', true));


-- 5b. scholar_question_logs ──────────────────────────────────────────────────
alter table public.scholar_question_logs enable row level security;

-- SELECT: users see only their own question logs
create policy "scholar_questions_select_own"
  on public.scholar_question_logs
  for select
  using (user_id = current_setting('app.current_user_id', true));

-- INSERT: users can only log questions for themselves
create policy "scholar_questions_insert_own"
  on public.scholar_question_logs
  for insert
  with check (user_id = current_setting('app.current_user_id', true));

-- UPDATE: users can only update their own question logs
create policy "scholar_questions_update_own"
  on public.scholar_question_logs
  for update
  using (user_id = current_setting('app.current_user_id', true))
  with check (user_id = current_setting('app.current_user_id', true));

-- DELETE: users can only delete their own question logs
create policy "scholar_questions_delete_own"
  on public.scholar_question_logs
  for delete
  using (user_id = current_setting('app.current_user_id', true));


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. HELPER FUNCTION – Weak-Subject Analysis (used by the Analytics Dashboard)
--    Returns per-subject accuracy for a given user + exam, ordered worst-first.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.scholar_weak_subjects(
  p_user_id        text,
  p_exam_category  public.scholar_exam_category,
  p_limit          integer default 10
)
returns table (
  subject_tag      text,
  total_questions  bigint,
  correct          bigint,
  wrong            bigint,
  skipped          bigint,
  accuracy_pct     numeric(5, 2)
)
language sql
stable
as $$
  select
    ql.subject_tag,
    count(*)                                           as total_questions,
    count(*) filter (where ql.is_correct = true)       as correct,
    count(*) filter (where ql.is_correct = false)      as wrong,
    count(*) filter (where ql.is_skipped = true)       as skipped,
    case
      when count(*) filter (where ql.is_skipped = false) > 0
      then round(
        count(*) filter (where ql.is_correct = true)::numeric
        / count(*) filter (where ql.is_skipped = false) * 100,
        2
      )
      else 0
    end                                                as accuracy_pct
  from public.scholar_question_logs as ql
  where ql.user_id = p_user_id
    and ql.exam_category = p_exam_category
  group by ql.subject_tag
  order by accuracy_pct asc, total_questions desc
  limit greatest(p_limit, 1);
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. HELPER FUNCTION – Session Performance Over Time
--    Returns score-trend data for the analytics dashboard charts.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.scholar_performance_trend(
  p_user_id        text,
  p_exam_category  public.scholar_exam_category,
  p_limit          integer default 20
)
returns table (
  session_id       uuid,
  title            text,
  exam_category    public.scholar_exam_category,
  accuracy         numeric(5, 2),
  score_obtained   numeric(8, 2),
  max_score        numeric(8, 2),
  total_questions  integer,
  time_spent_secs  integer,
  started_at       timestamptz
)
language sql
stable
as $$
  select
    ms.id              as session_id,
    ms.title,
    ms.exam_category,
    ms.accuracy,
    ms.score_obtained,
    ms.max_score,
    ms.total_questions,
    ms.time_spent_secs,
    ms.started_at
  from public.scholar_mock_sessions as ms
  where ms.user_id = p_user_id
    and ms.exam_category = p_exam_category
    and ms.status = 'completed'
  order by ms.started_at desc
  limit greatest(p_limit, 1);
$$;


-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

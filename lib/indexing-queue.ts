import { randomUUID } from "node:crypto";
import path from "node:path";

import { ensureLexoraRoot, LEXORA_ROOT } from "@/lib/storage";
import { withFileLock } from "@/lib/file-lock";
import type { ParsedPdfDocument } from "@/lib/types";
import {
  getSupabaseAdminClient,
  isSupabaseConfigured,
  SUPABASE_RPC,
  SUPABASE_TABLES,
} from "@/lib/supabase";
import { indexDocument } from "@/lib/vectorStore";

export type IndexingJobStatus = "queued" | "processing" | "ready" | "failed";

export type IndexingJobRecord = {
  id: string;
  userId: string;
  name: string;
  fileName: string;
  fileUrl: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  status: IndexingJobStatus;
  error?: string;
  documentId?: string;
  attemptCount: number;
  availableAt: string;
  parsedPdf?: unknown;
};

type IndexingJobRow = {
  id: string;
  user_id: string;
  name: string;
  file_name: string;
  file_url: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
  status: IndexingJobStatus;
  error: string | null;
  document_id: string | null;
  attempt_count: number;
  available_at: string;
  parsed_pdf: unknown;
};

const INDEXING_JOBS_PATH = path.join(LEXORA_ROOT, "indexing-jobs.json");
const MAX_INDEXING_ATTEMPTS = 3;
const PROCESSING_LEASE_SECONDS = 300;
const activeJobs = new Set<string>();

function fromIndexingJobRow(row: IndexingJobRow): IndexingJobRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    fileName: row.file_name,
    fileUrl: row.file_url,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    error: row.error ?? undefined,
    documentId: row.document_id ?? undefined,
    attemptCount: row.attempt_count,
    availableAt: row.available_at,
    parsedPdf: row.parsed_pdf,
  };
}

function coerceQueuedParsedPdf(value: unknown): ParsedPdfDocument | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ParsedPdfDocument>;

  if (
    typeof candidate.text !== "string" ||
    typeof candidate.pageCount !== "number" ||
    !Array.isArray(candidate.pages) ||
    typeof candidate.extractionMode !== "string"
  ) {
    return null;
  }

  return candidate as ParsedPdfDocument;
}

async function readLocalJobs(): Promise<IndexingJobRecord[]> {
  try {
    const { readFile } = await import("node:fs/promises");
    const contents = await readFile(INDEXING_JOBS_PATH, "utf8");
    const parsed = JSON.parse(contents) as IndexingJobRecord[];
    return Array.isArray(parsed)
      ? parsed.map((job) => ({
          ...job,
          attemptCount: job.attemptCount ?? 0,
          availableAt: job.availableAt ?? job.createdAt,
        }))
      : [];
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}

async function writeLocalJobs(jobs: IndexingJobRecord[]) {
  const { writeFile } = await import("node:fs/promises");
  await ensureLexoraRoot();
  await writeFile(INDEXING_JOBS_PATH, JSON.stringify(jobs, null, 2), "utf8");
}

async function mutateLocalJobs<T>(
  updater: (jobs: IndexingJobRecord[]) => { jobs: IndexingJobRecord[]; result: T },
) {
  return withFileLock(INDEXING_JOBS_PATH, async () => {
    const jobs = await readLocalJobs();
    const { jobs: nextJobs, result } = updater(jobs);
    await writeLocalJobs(nextJobs);
    return result;
  });
}

export async function getIndexJob(jobId: string) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      throw new Error("Supabase is configured but its admin client is unavailable.");
    }

    const { data, error } = await supabase
      .from(SUPABASE_TABLES.indexingJobs)
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? fromIndexingJobRow(data as IndexingJobRow) : null;
  }

  const jobs = await readLocalJobs();
  return jobs.find((job) => job.id === jobId) ?? null;
}

export async function listIndexJobsForUser(userId: string) {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      throw new Error("Supabase is configured but its admin client is unavailable.");
    }

    const { data, error } = await supabase
      .from(SUPABASE_TABLES.indexingJobs)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return ((data as IndexingJobRow[] | null) ?? []).map(fromIndexingJobRow);
  }

  const jobs = await readLocalJobs();
  return jobs
    .filter((job) => job.userId === userId)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, 50);
}

export async function enqueueIndexJob(input: {
  userId: string;
  name: string;
  fileName: string;
  fileUrl: string;
  sizeBytes: number;
  parsedPdf?: unknown;
}) {
  const now = new Date().toISOString();
  const job: IndexingJobRecord = {
    id: randomUUID(),
    userId: input.userId,
    name: input.name,
    fileName: input.fileName,
    fileUrl: input.fileUrl,
    sizeBytes: input.sizeBytes,
    createdAt: now,
    updatedAt: now,
    status: "queued",
    attemptCount: 0,
    availableAt: now,
    parsedPdf: input.parsedPdf,
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      throw new Error("Supabase is configured but its admin client is unavailable.");
    }

    const { error } = await supabase.from(SUPABASE_TABLES.indexingJobs).insert({
      id: job.id,
      user_id: job.userId,
      name: job.name,
      file_name: job.fileName,
      file_url: job.fileUrl,
      size_bytes: job.sizeBytes,
      created_at: job.createdAt,
      updated_at: job.updatedAt,
      status: job.status,
      attempt_count: job.attemptCount,
      available_at: job.availableAt,
      parsed_pdf: job.parsedPdf ?? null,
    });

    if (error) {
      throw error;
    }

    return job;
  }

  return mutateLocalJobs((jobs) => ({
    jobs: [job, ...jobs],
    result: job,
  }));
}

async function updateJob(
  jobId: string,
  updates: {
    status: IndexingJobStatus;
    error?: string | null;
    documentId?: string | null;
    updatedAt?: string;
    availableAt?: string;
  },
) {
  const updatedAt = updates.updatedAt ?? new Date().toISOString();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      throw new Error("Supabase is configured but its admin client is unavailable.");
    }

    const { error } = await supabase
      .from(SUPABASE_TABLES.indexingJobs)
      .update({
        status: updates.status,
        error: updates.error ?? null,
        document_id: updates.documentId ?? null,
        updated_at: updatedAt,
        available_at: updates.availableAt ?? updatedAt,
        lease_expires_at: null,
      })
      .eq("id", jobId);

    if (error) {
      throw error;
    }

    return;
  }

  await mutateLocalJobs((jobs) => {
    const index = jobs.findIndex((job) => job.id === jobId);
    if (index < 0) {
      return { jobs, result: undefined };
    }

    const nextJobs = [...jobs];
    nextJobs[index] = {
      ...nextJobs[index],
      status: updates.status,
      updatedAt,
      ...(updates.error !== undefined ? { error: updates.error ?? undefined } : {}),
      ...(updates.documentId !== undefined
        ? { documentId: updates.documentId ?? undefined }
        : {}),
      ...(updates.availableAt !== undefined
        ? { availableAt: updates.availableAt }
        : {}),
    };

    return { jobs: nextJobs, result: undefined };
  });
}

async function claimNextSupabaseJob() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase is configured but its admin client is unavailable.");
  }

  const { error: exhaustedJobsError } = await supabase
    .from(SUPABASE_TABLES.indexingJobs)
    .update({
      status: "failed",
      error: "The indexing worker stopped before this job completed.",
      updated_at: new Date().toISOString(),
      lease_expires_at: null,
    })
    .eq("status", "processing")
    .gte("attempt_count", MAX_INDEXING_ATTEMPTS)
    .lt("lease_expires_at", new Date().toISOString());

  if (exhaustedJobsError) {
    throw exhaustedJobsError;
  }

  const { data, error } = await supabase.rpc(SUPABASE_RPC.claimIndexingJob, {
    lease_seconds: PROCESSING_LEASE_SECONDS,
    max_attempts: MAX_INDEXING_ATTEMPTS,
  });

  if (error) {
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as IndexingJobRow | null;
  return row ? fromIndexingJobRow(row) : null;
}

async function claimNextLocalJob() {
  const now = Date.now();
  const staleBefore = now - PROCESSING_LEASE_SECONDS * 1000;

  return mutateLocalJobs((jobs) => {
    const updatedJobs = jobs.map((job) =>
      job.status === "processing" &&
      job.attemptCount >= MAX_INDEXING_ATTEMPTS &&
      Date.parse(job.updatedAt) < staleBefore
        ? {
            ...job,
            status: "failed" as const,
            error: "The indexing worker stopped before this job completed.",
            updatedAt: new Date().toISOString(),
          }
        : job,
    );
    const index = updatedJobs.findIndex(
      (job) =>
        !activeJobs.has(job.id) &&
        job.attemptCount < MAX_INDEXING_ATTEMPTS &&
        (job.status === "queued" ||
          (job.status === "processing" &&
            Date.parse(job.updatedAt) < staleBefore)) &&
        Date.parse(job.availableAt) <= now,
    );

    if (index < 0) {
      return { jobs: updatedJobs, result: null };
    }

    const nextJobs = [...updatedJobs];
    nextJobs[index] = {
      ...nextJobs[index],
      status: "processing",
      attemptCount: nextJobs[index].attemptCount + 1,
      updatedAt: new Date().toISOString(),
    };

    return { jobs: nextJobs, result: nextJobs[index] };
  });
}

async function finishIndexingJob(job: IndexingJobRecord) {
  try {
    const document = await indexDocument({
      userId: job.userId,
      documentId: `${job.id}-doc`,
      name: job.name,
      fileName: job.fileName,
      fileUrl: job.fileUrl,
      sizeBytes: job.sizeBytes,
      parsedPdf: coerceQueuedParsedPdf(job.parsedPdf),
    });

    await updateJob(job.id, {
      status: "ready",
      documentId: document.id,
      error: null,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Document indexing failed unexpectedly.";
    const retryable = job.attemptCount < MAX_INDEXING_ATTEMPTS;

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        throw new Error("Supabase is configured but its admin client is unavailable.");
      }

      const backoffSeconds = Math.min(60, 2 ** job.attemptCount * 5);
      const { error: updateError } = await supabase
        .from(SUPABASE_TABLES.indexingJobs)
        .update({
          status: retryable ? "queued" : "failed",
          error: message.slice(0, 1000),
          updated_at: new Date().toISOString(),
          available_at: new Date(Date.now() + (retryable ? backoffSeconds * 1000 : 0)).toISOString(),
          lease_expires_at: null,
        })
        .eq("id", job.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      await updateJob(job.id, {
        status: retryable ? "queued" : "failed",
        error: message.slice(0, 1000),
        updatedAt: new Date().toISOString(),
        availableAt: new Date(
          Date.now() + (retryable ? Math.min(60, 2 ** job.attemptCount * 5) * 1000 : 0),
        ).toISOString(),
      });
    }
  }
}

export async function processNextIndexingJob() {
  const job = isSupabaseConfigured()
    ? await claimNextSupabaseJob()
    : await claimNextLocalJob();

  if (!job) {
    return { processed: false };
  }

  activeJobs.add(job.id);

  try {
    await finishIndexingJob(job);
  } finally {
    activeJobs.delete(job.id);
  }

  return { processed: true, jobId: job.id };
}

export async function triggerQueuedIndexProcessing() {
  return processNextIndexingJob();
}

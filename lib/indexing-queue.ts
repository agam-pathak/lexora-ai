import path from "node:path";

import { ensureLexoraRoot, LEXORA_ROOT } from "@/lib/storage";
import type { ParsedPdfDocument } from "@/lib/types";
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
  parsedPdf?: unknown;
};

const INDEXING_JOBS_PATH = path.join(LEXORA_ROOT, "indexing-jobs.json");
const activeJobs = new Set<string>();

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

async function readJobs(): Promise<IndexingJobRecord[]> {
  try {
    const { readFile } = await import("node:fs/promises");
    const contents = await readFile(INDEXING_JOBS_PATH, "utf8");
    const parsed = JSON.parse(contents) as IndexingJobRecord[];
    return Array.isArray(parsed) ? parsed : [];
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

async function writeJobs(jobs: IndexingJobRecord[]) {
  const { writeFile } = await import("node:fs/promises");
  await ensureLexoraRoot();
  await writeFile(INDEXING_JOBS_PATH, JSON.stringify(jobs, null, 2), "utf8");
}

export async function getIndexJob(jobId: string) {
  const jobs = await readJobs();
  return jobs.find((job) => job.id === jobId) ?? null;
}

export async function listIndexJobsForUser(userId: string) {
  const jobs = await readJobs();
  return jobs.filter((job) => job.userId === userId).sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
  );
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
  const jobs = await readJobs();
  const job: IndexingJobRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    userId: input.userId,
    name: input.name,
    fileName: input.fileName,
    fileUrl: input.fileUrl,
    sizeBytes: input.sizeBytes,
    createdAt: now,
    updatedAt: now,
    status: "queued",
    parsedPdf: input.parsedPdf,
  };

  jobs.unshift(job);
  await writeJobs(jobs);

  return job;
}

async function updateJobStatus(
  jobId: string,
  status: IndexingJobStatus,
  details?: { error?: string; documentId?: string },
) {
  const jobs = await readJobs();
  const index = jobs.findIndex((job) => job.id === jobId);

  if (index < 0) {
    return null;
  }

  jobs[index] = {
    ...jobs[index],
    status,
    updatedAt: new Date().toISOString(),
    ...(details?.error !== undefined ? { error: details.error } : {}),
    ...(details?.documentId !== undefined ? { documentId: details.documentId } : {}),
  };

  await writeJobs(jobs);
  return jobs[index];
}

async function processQueuedJob(job: IndexingJobRecord) {
  if (activeJobs.has(job.id)) {
    return;
  }

  activeJobs.add(job.id);
  await updateJobStatus(job.id, "processing");

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

    await updateJobStatus(job.id, "ready", {
      documentId: document.id,
    });
  } catch (error) {
    await updateJobStatus(job.id, "failed", {
      error:
        error instanceof Error
          ? error.message
          : "Document indexing failed unexpectedly.",
    });
  } finally {
    activeJobs.delete(job.id);
    await triggerQueuedIndexProcessing();
  }
}

export async function triggerQueuedIndexProcessing() {
  const jobs = await readJobs();
  const nextJob = jobs.find(
    (job) => job.status === "queued" && !activeJobs.has(job.id),
  );

  if (!nextJob) {
    return;
  }

  await processQueuedJob(nextJob);
}

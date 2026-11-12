import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getIndexJob, listIndexJobsForUser } from "@/lib/indexing-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toPublicJob(job: NonNullable<Awaited<ReturnType<typeof getIndexJob>>>) {
  return {
    id: job.id,
    status: job.status,
    error: job.status === "failed" ? "Indexing failed. Please retry the upload." : undefined,
    documentId: job.documentId,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId")?.trim();

    if (jobId) {
      const job = await getIndexJob(jobId);

      if (!job || job.userId !== session.userId) {
        return NextResponse.json(
          { error: "The requested indexing job could not be found." },
          { status: 404 },
        );
      }

      return NextResponse.json({ job: toPublicJob(job) });
    }

    const jobs = await listIndexJobsForUser(session.userId);
    return NextResponse.json({ jobs: jobs.map(toPublicJob) });
  } catch (error) {
    console.error("Upload status lookup failed:", error);
    return NextResponse.json(
      { error: "Unable to determine upload status." },
      { status: 500 },
    );
  }
}

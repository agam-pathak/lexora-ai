import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { processNextIndexingJob } from "@/lib/indexing-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.LEXORA_INDEXING_WORKER_SECRET?.trim();
  const authorization = request.headers.get("authorization") ?? "";

  if (!secret) {
    return false;
  }

  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization);

  return (
    expected.length === actual.length && timingSafeEqual(expected, actual)
  );
}

async function runWorker(request: Request) {
  if (!process.env.LEXORA_INDEXING_WORKER_SECRET?.trim()) {
    return NextResponse.json(
      { error: "The indexing worker secret is not configured." },
      { status: 503 },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await processNextIndexingJob();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Indexing worker failed:", error);
    return NextResponse.json(
      { error: "The indexing job could not be processed." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return runWorker(request);
}

export async function POST(request: Request) {
  return runWorker(request);
}

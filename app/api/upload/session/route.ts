import path from "node:path";

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase";
import {
  getSupabaseUploadsBucketName,
  isSupabaseUploadStorageConfigured,
  resolveUserUploadObjectKey,
  resolveUserUploadUrl,
} from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

function sanitizePdfFilename(originalName: string) {
  const baseName = path.basename(originalName, path.extname(originalName));
  const safeBaseName = baseName
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);

  return `${safeBaseName || "document"}-${Date.now()}.pdf`;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: "Authentication is required." },
        { status: 401 },
      );
    }

    if (!isSupabaseUploadStorageConfigured()) {
      return NextResponse.json(
        { error: "Direct uploads are not configured for this deployment." },
        { status: 400 },
      );
    }

    const body = await request.json();
    const fileName =
      typeof body.fileName === "string" ? body.fileName.trim() : "";
    const contentType =
      typeof body.contentType === "string" ? body.contentType.trim() : "";
    const sizeBytes =
      typeof body.sizeBytes === "number" ? body.sizeBytes : Number.NaN;
    const isPdfExtension = fileName.toLowerCase().endsWith(".pdf");
    const isPdfMimeType =
      contentType === "application/pdf" || contentType === "";

    if (!fileName || !isPdfExtension || !isPdfMimeType) {
      return NextResponse.json(
        { error: "Only PDF uploads are allowed." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return NextResponse.json(
        { error: "A valid PDF size is required." },
        { status: 400 },
      );
    }

    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "The PDF exceeds the 25 MB upload limit." },
        { status: 413 },
      );
    }

    const supabase = getSupabaseAdminClient();
    const bucket = getSupabaseUploadsBucketName();

    if (!supabase || !bucket) {
      return NextResponse.json(
        { error: "Direct uploads are not configured for this deployment." },
        { status: 400 },
      );
    }

    const safeFileName = sanitizePdfFilename(fileName);
    const objectPath = resolveUserUploadObjectKey(session.userId, safeFileName);
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(objectPath, {
        upsert: true,
      });

    if (error || !data?.signedUrl) {
      throw error ?? new Error("Signed upload URL could not be created.");
    }

    return NextResponse.json({
      fileName: safeFileName,
      fileUrl: resolveUserUploadUrl(session.userId, safeFileName),
      signedUrl: data.signedUrl,
      token: data.token,
      objectPath,
    });
  } catch (error) {
    console.error("Upload session route error:", error);

    return NextResponse.json(
      { error: "A direct upload session could not be created." },
      { status: 500 },
    );
  }
}

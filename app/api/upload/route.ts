import { randomUUID } from "node:crypto";
import path from "node:path";

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { coerceParsedPdfDocument } from "@/lib/parsedPdf";
import {
  persistUserUpload,
  resolveUserUploadUrl,
} from "@/lib/storage";
import { indexDocument } from "@/lib/vectorStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_VERCEL_PROXY_UPLOAD_BYTES =
  process.env.VERCEL === "1" ? 4 * 1024 * 1024 : MAX_FILE_SIZE_BYTES;

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

function getDisplayName(originalName: string) {
  return path.basename(originalName, path.extname(originalName)).trim() || "Untitled document";
}

function createIndexedDocumentResponse(document: Awaited<ReturnType<typeof indexDocument>>) {
  const extractionLimited =
    document.chunkCount === 0 && document.extractionMode === "ocr-recommended";

  return {
    message: extractionLimited
      ? "Document uploaded, but searchable text did not index completely in this deployment. Reindex after OCR is available to generate grounded answers."
      : "Document uploaded and indexed successfully.",
    document,
    warning: extractionLimited
      ? "No searchable text was indexed for this PDF."
      : undefined,
  };
}

async function readParsedPdfFormValue(formData: FormData) {
  const parsedPdfFile = formData.get("parsedPdfFile");

  if (parsedPdfFile instanceof File) {
    return coerceParsedPdfDocument(await parsedPdfFile.text());
  }

  return coerceParsedPdfDocument(formData.get("parsedPdf"));
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

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      const parsedPdf = coerceParsedPdfDocument(body.parsedPdf);
      const fileName =
        typeof body.fileName === "string" ? body.fileName.trim() : "";
      const sizeBytes =
        typeof body.sizeBytes === "number" ? body.sizeBytes : Number.NaN;
      const name =
        typeof body.name === "string" && body.name.trim()
          ? body.name.trim()
          : getDisplayName(fileName);

      if (!fileName || !fileName.toLowerCase().endsWith(".pdf")) {
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

      const document = await indexDocument({
        userId: session.userId,
        documentId: randomUUID(),
        name,
        fileName,
        fileUrl: resolveUserUploadUrl(session.userId, fileName),
        sizeBytes,
        parsedPdf,
      });

      return NextResponse.json(
        createIndexedDocumentResponse(document),
        { status: 201 },
      );
    }

    const formData = await request.formData();
    const uploadedFile = formData.get("file");
    const parsedPdf = await readParsedPdfFormValue(formData);

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        { error: "No PDF file was uploaded." },
        { status: 400 },
      );
    }

    const isPdfExtension = uploadedFile.name.toLowerCase().endsWith(".pdf");
    const isPdfMimeType =
      uploadedFile.type === "application/pdf" || uploadedFile.type === "";

    if (!isPdfExtension || !isPdfMimeType) {
      return NextResponse.json(
        { error: "Only PDF uploads are allowed." },
        { status: 400 },
      );
    }

    if (uploadedFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: "The PDF exceeds the 25 MB upload limit.",
        },
        { status: 413 },
      );
    }

    if (uploadedFile.size > MAX_VERCEL_PROXY_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error:
            "This deployment cannot proxy PDFs larger than 4 MB through a Vercel function. Use direct storage upload for larger files.",
        },
        { status: 413 },
      );
    }

    const safeFileName = sanitizePdfFilename(uploadedFile.name);
    const fileUrl = resolveUserUploadUrl(session.userId, safeFileName);
    const buffer = Buffer.from(await uploadedFile.arrayBuffer());

    await persistUserUpload(
      session.userId,
      safeFileName,
      buffer,
      uploadedFile.type || "application/pdf",
    );

    const document = await indexDocument({
      userId: session.userId,
      documentId: randomUUID(),
      name: getDisplayName(uploadedFile.name),
      fileName: safeFileName,
      fileUrl,
      sizeBytes: buffer.byteLength,
      parsedPdf,
    });

    return NextResponse.json(
      createIndexedDocumentResponse(document),
      { status: 201 },
    );
  } catch (error) {
    console.error("Upload indexing error:", error);

    return NextResponse.json(
      {
        error: "The document could not be uploaded and indexed.",
      },
      { status: 500 },
    );
  }
}

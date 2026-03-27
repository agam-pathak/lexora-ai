import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { coerceParsedPdfDocument } from "@/lib/parsedPdf";
import {
  indexUntrackedUploads,
  reindexAllDocuments,
  reindexDocument,
} from "@/lib/vectorStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function readFormBoolean(value: FormDataEntryValue | null) {
  return value === "true" || value === "1";
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
    const body = contentType.includes("multipart/form-data")
      ? await (async () => {
          const formData = await request.formData();

          return {
            documentId:
              typeof formData.get("documentId") === "string"
                ? (formData.get("documentId") as string)
                : undefined,
            parsedPdf: await readParsedPdfFormValue(formData),
            forceOcr: readFormBoolean(formData.get("forceOcr")),
          };
        })()
      : await request
          .json()
          .catch(
            () =>
              ({
                documentId: undefined as string | undefined,
                parsedPdf: undefined as unknown,
                forceOcr: false,
              }),
          );
    const parsedPdf =
      "parsedPdf" in body && body.parsedPdf && typeof body.parsedPdf === "object"
        ? body.parsedPdf
        : coerceParsedPdfDocument(body.parsedPdf);

    if (typeof body.documentId === "string" && body.documentId.trim()) {
      const document = await reindexDocument(
        session.userId,
        body.documentId.trim(),
        parsedPdf,
        body.forceOcr === true
      );
      
      const extractionLimited =
        document.chunkCount === 0 &&
        document.extractionMode === "ocr-recommended";

      return NextResponse.json({
        message: extractionLimited
          ? "Document reindexed, but OCR text extraction still did not produce searchable content."
          : "Document reindexed successfully.",
        document,
        warning: extractionLimited
          ? "No searchable text was indexed for this PDF."
          : undefined,
      });
    }

    const indexedUploads = await indexUntrackedUploads(session.userId);
    const reindexedDocuments = await reindexAllDocuments(session.userId);

    return NextResponse.json({
      message: "Index rebuild completed.",
      indexedUploads,
      reindexedDocuments,
    });
  } catch (error) {
    console.error("Index route error:", error);

    return NextResponse.json(
      { error: "The vector index could not be rebuilt." },
      { status: 500 },
    );
  }
}

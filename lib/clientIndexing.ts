"use client";

import type { IndexedDocument, ParsedPdfDocument } from "@/lib/types";

const MAX_INLINE_PARSED_PDF_BYTES = 1.5 * 1024 * 1024;

type ReindexRequest = {
  documentId: string;
  parsedPdf?: ParsedPdfDocument | null;
  forceOcr?: boolean;
};

type ReindexResponse = {
  message?: string;
  warning?: string;
  document: IndexedDocument;
};

function serializeParsedPdf(parsedPdf: ParsedPdfDocument) {
  return JSON.stringify(parsedPdf);
}

function canInlineParsedPdf(parsedPdf: ParsedPdfDocument | null | undefined) {
  if (!parsedPdf) {
    return true;
  }

  return new Blob([serializeParsedPdf(parsedPdf)]).size <=
    MAX_INLINE_PARSED_PDF_BYTES;
}

export function getInlineParsedPdf(parsedPdf: ParsedPdfDocument | null) {
  return canInlineParsedPdf(parsedPdf) ? parsedPdf : null;
}

export async function requestDocumentReindex({
  documentId,
  parsedPdf,
  forceOcr = false,
}: ReindexRequest): Promise<ReindexResponse> {
  const parsedPdfForTransfer = parsedPdf ?? null;
  const response = canInlineParsedPdf(parsedPdfForTransfer)
    ? await fetch("/api/index", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          parsedPdf: parsedPdfForTransfer,
          forceOcr,
        }),
      })
    : await (async () => {
        if (!parsedPdfForTransfer) {
          throw new Error("Parsed PDF payload is required for multipart reindex.");
        }

        const formData = new FormData();
        formData.set("documentId", documentId);
        if (forceOcr) {
          formData.set("forceOcr", "true");
        }
        formData.append(
          "parsedPdfFile",
          new Blob([serializeParsedPdf(parsedPdfForTransfer)], {
            type: "application/json",
          }),
          `${documentId}-parsed.json`,
        );

        return fetch("/api/index", {
          method: "POST",
          body: formData,
        });
      })();

  const data = (await response.json()) as Partial<ReindexResponse> & {
    error?: string;
  };

  if (!response.ok || !data.document) {
    throw new Error(data.error || "Reindex failed.");
  }

  return {
    document: data.document,
    message: data.message,
    warning: data.warning,
  };
}

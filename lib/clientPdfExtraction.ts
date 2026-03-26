"use client";

import {
  buildParsedPdfDocument,
  normalizeExtractedText,
} from "@/lib/parsedPdf";
import type { ParsedPdfDocument, ParsedPdfPage } from "@/lib/types";

// Dynamic PDF.js loader to prevent SSR issues (e.g., DOMMatrix not defined)
async function getPdfJs() {
  if (typeof window === "undefined") {
    throw new Error("PDF extraction is only supported on the client side.");
  }
  const { pdfjs } = await import("react-pdf");
  
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }
  
  return pdfjs;
}

function isPdfJsTextItem(
  value: unknown,
): value is {
  str: string;
  hasEOL?: boolean;
} {
  return Boolean(
    value &&
      typeof value === "object" &&
      "str" in value &&
      typeof value.str === "string",
  );
}

function normalizeClientPageText(items: unknown[]) {
  const parts: string[] = [];

  for (const item of items) {
    if (!isPdfJsTextItem(item)) {
      continue;
    }

    const text = item.str.trim();

    if (!text) {
      continue;
    }

    parts.push(text);
    parts.push(item.hasEOL ? "\n" : " ");
  }

  return normalizeExtractedText(parts.join(""));
}

export async function extractPdfDocumentFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
): Promise<ParsedPdfDocument> {
  const pdfjs = await getPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
  });
  const pdfDocument = await loadingTask.promise;

  try {
    const pages: ParsedPdfPage[] = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);

      try {
        const textContent = await page.getTextContent();
        const text = normalizeClientPageText(textContent.items);

        if (text) {
          pages.push({
            pageNumber,
            text,
          });
        }
      } finally {
        page.cleanup();
      }
    }

    return buildParsedPdfDocument(pages, pdfDocument.numPages);
  } finally {
    await loadingTask.destroy();
  }
}

export async function extractPdfDocumentFromFile(file: File) {
  return extractPdfDocumentFromArrayBuffer(await file.arrayBuffer());
}

export async function extractPdfDocumentFromUrl(url: string) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Unable to load the PDF for local text extraction.");
  }

  return extractPdfDocumentFromArrayBuffer(await response.arrayBuffer());
}

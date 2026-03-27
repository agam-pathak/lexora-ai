"use client";

import {
  buildParsedPdfDocument,
  normalizeExtractedText,
} from "@/lib/parsedPdf";
import type { ParsedPdfDocument, ParsedPdfPage } from "@/lib/types";

const FETCH_TIMEOUT_MS = 12_000;
const PDF_LOAD_TIMEOUT_MS = 12_000;
const PAGE_READ_TIMEOUT_MS = 6_000;

let pdfJsPromise:
  | Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")>
  | null = null;

function createTimeoutError(message: string) {
  return new Error(message);
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
  onTimeout?: () => void,
) {
  let timeoutId: number | undefined;

  return new Promise<T>((resolve, reject) => {
    timeoutId = window.setTimeout(() => {
      onTimeout?.();
      reject(createTimeoutError(message));
    }, timeoutMs);

    promise
      .then((value) => {
        resolve(value);
      })
      .catch((error: unknown) => {
        reject(error);
      })
      .finally(() => {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
      });
  });
}

async function getPdfJs() {
  if (typeof window === "undefined") {
    throw new Error("PDF extraction is only supported on the client side.");
  }

  pdfJsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;
    return pdfjs;
  });

  return pdfJsPromise;
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
    disableRange: true,
    disableStream: true,
    disableAutoFetch: true,
  });
  const pdfDocument = await withTimeout(
    loadingTask.promise,
    PDF_LOAD_TIMEOUT_MS,
    "Timed out while loading the PDF for live extraction.",
    () => {
      void loadingTask.destroy();
    },
  );

  try {
    const pages: ParsedPdfPage[] = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await withTimeout(
        pdfDocument.getPage(pageNumber),
        PAGE_READ_TIMEOUT_MS,
        `Timed out while loading page ${pageNumber}.`,
      );

      try {
        const textContent = await withTimeout(
          page.getTextContent(),
          PAGE_READ_TIMEOUT_MS,
          `Timed out while reading text from page ${pageNumber}.`,
        );
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
    await loadingTask.destroy().catch(() => undefined);
  }
}

export async function extractPdfDocumentFromFile(file: File) {
  return extractPdfDocumentFromArrayBuffer(await file.arrayBuffer());
}

export async function extractPdfDocumentFromUrl(url: string) {
  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => {
    abortController.abort();
  }, FETCH_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(url, {
      cache: "no-store",
      signal: abortController.signal,
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw createTimeoutError(
        "Timed out while fetching the PDF for live extraction.",
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error("Unable to load the PDF for local text extraction.");
  }

  return extractPdfDocumentFromArrayBuffer(await response.arrayBuffer());
}

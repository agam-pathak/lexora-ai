if (
  typeof global !== "undefined" &&
  typeof (global as { DOMMatrix?: unknown }).DOMMatrix === "undefined"
) {
  (global as { DOMMatrix?: new (...args: unknown[]) => unknown }).DOMMatrix =
    class DOMMatrixStub {};
}

import { PDFParse } from "pdf-parse";
import { createRequire } from "node:module";

import { extractPdfPagesWithOcr } from "@/lib/ocr";
import type {
  DocumentExtractionMode,
  ParsedPdfPage,
} from "@/lib/types";

// Polyfill PDF.js DOM globals for Node runtimes.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

type ParsedPdfDocument = {
  text: string;
  pageCount: number;
  pages: ParsedPdfPage[];
  extractionMode: DocumentExtractionMode;
};

const MIN_PAGE_CHARACTERS_FOR_NATIVE_TEXT = 70;
const MIN_AVERAGE_DOCUMENT_CHARACTERS = 80;

let didConfigurePdfWorker = false;
let didConfigureOcrDomPolyfills = false;
const require = createRequire(import.meta.url);
const CANVAS_MODULE_NAME = ["@napi-rs", "canvas"].join("/");

type CanvasPolyfillModule = {
  DOMMatrix: new (...args: unknown[]) => unknown;
  ImageData: new (...args: unknown[]) => unknown;
  Path2D: new (...args: unknown[]) => unknown;
};

function loadCanvasPolyfillModule() {
  return Function(
    "nodeRequire",
    "moduleName",
    "return nodeRequire(moduleName);",
  )(require, CANVAS_MODULE_NAME) as CanvasPolyfillModule;
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function configurePdfWorker() {
  if (didConfigurePdfWorker) {
    return;
  }

  const candidateWorkerPaths = [
    path.join(
      process.cwd(),
      "node_modules",
      "pdf-parse",
      "node_modules",
      "pdfjs-dist",
      "legacy",
      "build",
      "pdf.worker.min.mjs",
    ),
    path.join(
      process.cwd(),
      "node_modules",
      "pdfjs-dist",
      "legacy",
      "build",
      "pdf.worker.min.mjs",
    ),
  ];

  const workerPath = candidateWorkerPaths.find((candidatePath) =>
    existsSync(candidatePath),
  );

  if (workerPath) {
    PDFParse.setWorker(pathToFileURL(workerPath).href);
  }

  didConfigurePdfWorker = true;
}

function configureOcrDomPolyfills() {
  if (didConfigureOcrDomPolyfills || typeof global === "undefined") {
    return;
  }

  const { DOMMatrix, ImageData, Path2D } = loadCanvasPolyfillModule();

  if (
    typeof (global.DOMMatrix as typeof DOMMatrix | undefined) === "undefined"
  ) {
    (global as { DOMMatrix?: typeof DOMMatrix }).DOMMatrix = DOMMatrix;
  }

  if (
    typeof (global.ImageData as typeof ImageData | undefined) === "undefined"
  ) {
    (global as { ImageData?: typeof ImageData }).ImageData = ImageData;
  }

  if (typeof (global.Path2D as typeof Path2D | undefined) === "undefined") {
    (global as { Path2D?: typeof Path2D }).Path2D = Path2D;
  }

  didConfigureOcrDomPolyfills = true;
}

function pickBestPageText(nativeText: string, ocrText: string) {
  if (!ocrText) {
    return nativeText;
  }

  if (!nativeText) {
    return ocrText;
  }

  const normalizedNativeText = normalizeExtractedText(nativeText).toLowerCase();
  const normalizedOcrText = normalizeExtractedText(ocrText).toLowerCase();

  if (normalizedNativeText.includes(normalizedOcrText)) {
    return nativeText;
  }

  if (normalizedOcrText.includes(normalizedNativeText)) {
    return ocrText;
  }

  return ocrText.length > nativeText.length * 1.15 ? ocrText : nativeText;
}

export async function parsePdfFile(filePath: string): Promise<ParsedPdfDocument> {
  configurePdfWorker();

  const buffer = await readFile(filePath);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const result = await parser.getText();
    const extractedPages = result.pages.map((page) => ({
      pageNumber: page.num,
      text: normalizeExtractedText(page.text),
    }));
    const pageCount =
      result.total ||
      Math.max(
        1,
        ...extractedPages.map((page) => page.pageNumber),
      );
    const pageTexts = new Map<number, string>();

    for (const page of extractedPages) {
      pageTexts.set(page.pageNumber, page.text);
    }

    const pageNumbersNeedingOcr = Array.from(
      { length: pageCount },
      (_, index) => index + 1,
    ).filter(
      (pageNumber) =>
        (pageTexts.get(pageNumber) ?? "").length <
        MIN_PAGE_CHARACTERS_FOR_NATIVE_TEXT,
    );

    let ocrRecoveredPageCount = 0;

    if (pageNumbersNeedingOcr.length > 0) {
      try {
        configureOcrDomPolyfills();

        const ocrPages = await extractPdfPagesWithOcr(
          new Uint8Array(buffer),
          pageNumbersNeedingOcr,
        );

        for (const ocrPage of ocrPages) {
          const nextPageText = pickBestPageText(
            pageTexts.get(ocrPage.pageNumber) ?? "",
            ocrPage.text,
          );

          pageTexts.set(ocrPage.pageNumber, nextPageText);

          if (nextPageText.length >= MIN_PAGE_CHARACTERS_FOR_NATIVE_TEXT) {
            ocrRecoveredPageCount += 1;
          }
        }
      } catch (error) {
        console.error("PDF OCR Failure:", error);
      }
    }

    const pages = Array.from({ length: pageCount }, (_, index) => ({
      pageNumber: index + 1,
      text: normalizeExtractedText(pageTexts.get(index + 1) ?? ""),
    })).filter((page) => page.text.length > 0);

    const text = normalizeExtractedText(
      pages.map((page) => page.text).join("\n\n") || result.text || "",
    );
    const averageCharactersPerPage =
      pageCount > 0 ? text.length / pageCount : text.length;
    const extractionMode: DocumentExtractionMode =
      ocrRecoveredPageCount > 0
        ? "ocr"
        : text.length === 0 ||
            averageCharactersPerPage < MIN_AVERAGE_DOCUMENT_CHARACTERS
          ? "ocr-recommended"
          : "text";

    return {
      text,
      pageCount,
      extractionMode,
      pages,
    };
  } finally {
    await parser.destroy();
  }
}

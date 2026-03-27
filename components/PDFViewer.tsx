"use client";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileSearch,
  Minus,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import type { ChatSource, IndexedDocument } from "@/lib/types";

type PDFViewerProps = {
  document: IndexedDocument | null;
  pageNumber: number;
  onPageChange: (pageNumber: number) => void;
  focusedSource?: ChatSource | null;
  onDocumentUpdate?: (document: IndexedDocument) => void;
};

function toProtectedUrl(fileUrl: string): string {
  return `/api/files/serve?path=${encodeURIComponent(fileUrl)}`;
}

function formatPageRange(pageStart: number, pageEnd: number) {
  return pageStart === pageEnd ? `p.${pageStart}` : `pp.${pageStart}-${pageEnd}`;
}

function buildThumbnailPages(pageCount: number, currentPage: number) {
  if (pageCount <= 0) {
    return [];
  }

  const pages = new Set<number>([
    1,
    pageCount,
    currentPage,
    currentPage - 1,
    currentPage + 1,
    currentPage - 2,
    currentPage + 2,
  ]);

  return [...pages]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((left, right) => left - right);
}

function extractHighlightTerms(source: ChatSource | null) {
  if (!source) {
    return [];
  }

  return [
    ...new Set(
      source.excerpt
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length >= 4),
    ),
  ].slice(0, 8);
}

export default function PDFViewer({
  document,
  pageNumber,
  onPageChange,
  focusedSource = null,
}: PDFViewerProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageWidth, setPageWidth] = useState(680);
  const [zoom, setZoom] = useState(1);
  const [showThumbnails, setShowThumbnails] = useState(true);

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;
  }, []);

  useEffect(() => {
    const node = frameRef.current;

    if (!node) {
      return undefined;
    }

    const updateWidth = () => {
      setPageWidth(Math.max(280, Math.floor(node.clientWidth - 32)));
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  const fileUrl = document?.fileUrl ?? null;
  const safePageNumber =
    pageCount > 0 ? Math.min(Math.max(pageNumber, 1), pageCount) : pageNumber;
  const thumbnailPages = useMemo(
    () => buildThumbnailPages(pageCount, safePageNumber),
    [pageCount, safePageNumber],
  );
  const highlightTerms = useMemo(
    () =>
      focusedSource &&
      safePageNumber >= focusedSource.pageStart &&
      safePageNumber <= focusedSource.pageEnd
        ? extractHighlightTerms(focusedSource)
        : [],
    [focusedSource, safePageNumber],
  );

  useEffect(() => {
    const pageNode = pageContainerRef.current;

    if (!pageNode) {
      return;
    }

    const highlight = () => {
      const spans = pageNode.querySelectorAll<HTMLSpanElement>(
        ".react-pdf__Page__textContent span",
      );

      spans.forEach((span) => {
        span.style.backgroundColor = "";
        span.style.borderRadius = "";
        span.style.boxShadow = "";
      });

      if (highlightTerms.length === 0) {
        return;
      }

      spans.forEach((span) => {
        const text = span.textContent?.toLowerCase() ?? "";

        if (highlightTerms.some((term) => text.includes(term))) {
          span.style.backgroundColor = "rgba(34, 211, 238, 0.25)";
          span.style.borderRadius = "4px";
          span.style.boxShadow = "0 0 0 1px rgba(34, 211, 238, 0.18)";
        }
      });
    };

    const timeout = window.setTimeout(highlight, 120);
    return () => window.clearTimeout(timeout);
  }, [fileUrl, highlightTerms, safePageNumber, zoom]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-white">
              {document?.name ?? "Select a document"}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {focusedSource
                ? `Focused citation: ${formatPageRange(
                    focusedSource.pageStart,
                    focusedSource.pageEnd,
                  )}`
                : document
                  ? "Document preview"
                  : "Choose a PDF to preview it here."}
            </p>
          </div>

          {fileUrl && pageCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => onPageChange(Math.max(1, safePageNumber - 1))}
                  disabled={safePageNumber <= 1}
                  className="rounded p-1 transition hover:bg-white/10 disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5 text-slate-300" />
                </button>
                <span className="px-1.5 font-mono text-[11px] text-slate-300">
                  Pg {safePageNumber} / {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => onPageChange(Math.min(pageCount, safePageNumber + 1))}
                  disabled={safePageNumber >= pageCount}
                  className="rounded p-1 transition hover:bg-white/10 disabled:opacity-30"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                </button>
              </div>

              <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setZoom((value) => Math.max(0.6, +(value - 0.1).toFixed(1)))
                  }
                  className="rounded p-1 transition hover:bg-white/10"
                >
                  <Minus className="h-3.5 w-3.5 text-slate-300" />
                </button>
                <span className="px-1 font-mono text-[11px] text-slate-300">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setZoom((value) => Math.min(2, +(value + 0.1).toFixed(1)))
                  }
                  className="rounded p-1 transition hover:bg-white/10"
                >
                  <Plus className="h-3.5 w-3.5 text-slate-300" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowThumbnails((value) => !value)}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
              >
                {showThumbnails ? "Hide pages" : "Show pages"}
              </button>

              <Link
                href={toProtectedUrl(fileUrl)}
                target="_blank"
                className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {focusedSource ? (
        <div className="border-b border-cyan-400/10 bg-cyan-400/5 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-200/80">
            Citation
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {focusedSource.excerpt}
          </p>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {showThumbnails && fileUrl && pageCount > 0 ? (
          <aside className="hidden w-32 shrink-0 border-r border-white/[0.06] bg-[rgba(6,8,16,0.72)] p-2 md:block">
            <div className="space-y-2 overflow-y-auto pr-1">
              {thumbnailPages.map((thumbnailPage) => (
                <button
                  key={thumbnailPage}
                  type="button"
                  onClick={() => onPageChange(thumbnailPage)}
                  className={`w-full rounded-xl border p-1.5 text-left transition ${
                    thumbnailPage === safePageNumber
                      ? "border-cyan-400/30 bg-cyan-400/8"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/12"
                  }`}
                >
                  <Document file={toProtectedUrl(fileUrl)} loading={null} error={null}>
                    <Page
                      pageNumber={thumbnailPage}
                      width={88}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>
                  <div className="mt-1 text-[10px] text-slate-400">
                    Page {thumbnailPage}
                  </div>
                </button>
              ))}
            </div>
          </aside>
        ) : null}

        <div
          ref={frameRef}
          className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[rgba(4,6,14,0.5)]"
        >
          <div className="flex-1 overflow-auto p-4">
            {fileUrl ? (
              <div
                ref={pageContainerRef}
                className="flex min-h-full items-start justify-center"
              >
                <Document
                  file={toProtectedUrl(fileUrl)}
                  loading={
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <LoaderDots /> Loading document…
                    </div>
                  }
                  error={
                    <p className="text-sm text-rose-300">
                      The PDF preview could not be rendered.
                    </p>
                  }
                  onLoadSuccess={({ numPages }) => {
                    setPageCount(numPages);
                    if (safePageNumber > numPages) {
                      onPageChange(numPages);
                    }
                  }}
                >
                  <Page
                    pageNumber={safePageNumber}
                    width={Math.min(pageWidth, 900)}
                    scale={zoom}
                    renderAnnotationLayer
                    renderTextLayer
                    className="pdf-page-shadow"
                  />
                </Document>
              </div>
            ) : (
              <div className="flex max-w-xs flex-col items-center pt-20 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                  <FileSearch className="h-7 w-7" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-white">
                  No document selected
                </h3>
                <p className="text-sm leading-6 text-slate-400">
                  Pick a PDF from your library to preview it here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoaderDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400 delay-75" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400 delay-150" />
    </span>
  );
}

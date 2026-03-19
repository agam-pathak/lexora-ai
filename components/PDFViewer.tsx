"use client";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileSearch,
  Layers,
  Minus,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import type { ChatSource } from "@/lib/types";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type PDFViewerProps = {
  fileUrl: string | null;
  title: string;
  pageNumber: number;
  onPageChange: (pageNumber: number) => void;
  focusedSource?: ChatSource | null;
};

function toProtectedUrl(fileUrl: string): string {
  return `/api/files/serve?path=${encodeURIComponent(fileUrl)}`;
}

export default function PDFViewer({
  fileUrl,
  title,
  pageNumber,
  onPageChange,
  focusedSource = null,
}: PDFViewerProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageWidth, setPageWidth] = useState(680);
  const [zoom, setZoom] = useState(1);

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

  const safePageNumber =
    pageCount > 0 ? Math.min(Math.max(pageNumber, 1), pageCount) : pageNumber;

  return (
    <div className="flex h-full flex-col">
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-white">{title}</h2>
          {focusedSource ? (
            <span className="mt-1 text-[11px] text-cyan-300">
              Focused: p.{focusedSource.pageStart}
              {focusedSource.pageEnd !== focusedSource.pageStart
                ? `–${focusedSource.pageEnd}`
                : ""}
            </span>
          ) : null}
        </div>

        {fileUrl && pageCount > 0 ? (
          <div className="flex items-center gap-1">
            {/* Page nav */}
            <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-1.5 py-1 text-xs">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, safePageNumber - 1))}
                disabled={safePageNumber <= 1}
                className="rounded p-1 transition hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-slate-300" />
              </button>
              <span className="px-1.5 font-mono text-[11px] text-slate-300">
                Pg {safePageNumber} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() =>
                  onPageChange(Math.min(pageCount, safePageNumber + 1))
                }
                disabled={safePageNumber >= pageCount}
                className="rounded p-1 transition hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
              </button>
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-1.5 py-1">
              <button
                type="button"
                onClick={() =>
                  setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(1)))
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
                  setZoom((z) => Math.min(2, +(z + 0.1).toFixed(1)))
                }
                className="rounded p-1 transition hover:bg-white/10"
              >
                <Plus className="h-3.5 w-3.5 text-slate-300" />
              </button>
            </div>

            {/* Thumbnails pill */}
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              <Layers className="h-3.5 w-3.5" /> Thumbnails
            </button>

            {/* Open externally */}
            <Link
              href={toProtectedUrl(fileUrl)}
              target="_blank"
              className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </Link>
          </div>
        ) : null}
      </div>

      {/* ── Document render area ── */}
      <div
        ref={frameRef}
        className="flex flex-1 items-start justify-center overflow-auto bg-[rgba(4,6,14,0.5)] p-4"
      >
        {fileUrl ? (
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
        ) : (
          <div className="flex max-w-xs flex-col items-center pt-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
              <FileSearch className="h-7 w-7" />
            </div>
            <h3 className="mb-2 text-base font-semibold text-white">
              No document selected
            </h3>
            <p className="text-sm leading-6 text-slate-400">
              Pick an indexed PDF to keep the source visible while you chat.
            </p>
          </div>
        )}
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

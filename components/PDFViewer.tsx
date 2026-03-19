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

function formatPageRange(pageStart: number, pageEnd: number) {
  return pageStart === pageEnd ? `p.${pageStart}` : `pp.${pageStart}-${pageEnd}`;
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
      setPageWidth(Math.max(280, Math.floor(node.clientWidth - 48)));
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
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="mono text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">
            Document viewer
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
          {focusedSource ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/10 px-3 py-1.5 text-xs uppercase tracking-[0.22em] text-cyan-100">
              Focused source {formatPageRange(
                focusedSource.pageStart,
                focusedSource.pageEnd,
              )}
            </div>
          ) : null}
        </div>

        {fileUrl && pageCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-2 py-2 text-sm text-slate-200">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, safePageNumber - 1))}
                disabled={safePageNumber <= 1}
                className="rounded-full p-2 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="mono px-2 text-xs text-slate-300">
                Page {safePageNumber} / {pageCount}
              </span>

              <button
                type="button"
                onClick={() => onPageChange(Math.min(pageCount, safePageNumber + 1))}
                disabled={safePageNumber >= pageCount}
                className="rounded-full p-2 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-2 py-2 text-sm text-slate-200">
              <button
                type="button"
                onClick={() => setZoom((currentZoom) => Math.max(0.8, currentZoom - 0.1))}
                className="rounded-full p-2 transition hover:bg-white/10"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="mono px-1 text-xs text-slate-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((currentZoom) => Math.min(1.8, currentZoom + 0.1))}
                className="rounded-full p-2 transition hover:bg-white/10"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Link
              href={toProtectedUrl(fileUrl)}
              target="_blank"
              className="premium-button-secondary px-4 py-2.5"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </Link>
          </div>
        ) : null}
      </div>

      <div
        ref={frameRef}
        className="panel-soft flex min-h-[680px] flex-1 items-center justify-center overflow-auto p-5"
      >
        {fileUrl ? (
          <Document
            file={toProtectedUrl(fileUrl)}
            loading={
              <p className="text-sm text-slate-300">Loading document preview…</p>
            }
            error={
              <p className="text-sm text-rose-200">
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
            />
          </Document>
        ) : (
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-300/10 text-cyan-100">
              <FileSearch className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">
              No document selected
            </h3>
            <p className="text-sm leading-6 text-slate-300">
              Pick an indexed PDF to keep the source visible while you chat.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

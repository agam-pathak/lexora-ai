"use client";

import dynamic from "next/dynamic";
import {
  ArrowRight,
  MessageSquareText,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ChatBox from "@/components/ChatBox";
import type { ChatSource, IndexedDocument } from "@/lib/types";

const PDFViewer = dynamic(() => import("@/components/PDFViewer"), {
  ssr: false,
});

function ChatWorkspace() {
  const searchParams = useSearchParams();
  const requestedDocumentId = searchParams.get("doc");

  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [viewerPageNumber, setViewerPageNumber] = useState(1);
  const [focusedSource, setFocusedSource] = useState<ChatSource | null>(null);
  const selectedDocumentIdRef = useRef(selectedDocumentId);

  useEffect(() => {
    selectedDocumentIdRef.current = selectedDocumentId;
  }, [selectedDocumentId]);

  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      setLoadingDocuments(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/files", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load indexed documents.");
        }

        if (cancelled) {
          return;
        }

        const nextDocuments: IndexedDocument[] = data.files ?? [];
        const nextSelectedDocumentId =
          (requestedDocumentId &&
            nextDocuments.some((document) => document.id === requestedDocumentId) &&
            requestedDocumentId) ||
          (selectedDocumentIdRef.current &&
            nextDocuments.some(
              (document) => document.id === selectedDocumentIdRef.current,
            ) &&
            selectedDocumentIdRef.current) ||
          nextDocuments[0]?.id ||
          "";

        startTransition(() => {
          setDocuments(nextDocuments);
          setSelectedDocumentId(nextSelectedDocumentId);
          setViewerPageNumber(1);
          setFocusedSource(null);
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load documents.",
        );
      } finally {
        if (!cancelled) {
          setLoadingDocuments(false);
        }
      }
    }

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [requestedDocumentId]);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId],
  );

  if (!loadingDocuments && documents.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10">
            <MessageSquareText className="h-8 w-8 text-cyan-300" />
          </div>
          <h1 className="text-2xl font-semibold text-white">
            No indexed PDFs yet
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            Upload a document first, then come back to run grounded questions
            against retrieved evidence.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/upload" className="premium-button">
              Upload a PDF
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-1 gap-0 xl:grid-cols-2">
      {/* ── Left: PDF Viewer ── */}
      <section className="flex flex-col overflow-hidden border-r border-white/[0.06]">
        {errorMessage ? (
          <p className="border-b border-rose-400/20 bg-rose-400/5 px-4 py-2 text-xs text-rose-300">
            {errorMessage}
          </p>
        ) : null}

        <PDFViewer
          key={selectedDocument?.fileUrl ?? "no-document"}
          fileUrl={selectedDocument?.fileUrl ?? null}
          title={selectedDocument?.name ?? "Select a document"}
          pageNumber={viewerPageNumber}
          onPageChange={setViewerPageNumber}
          focusedSource={focusedSource}
        />
      </section>

      {/* ── Right: Chat ── */}
      <section className="flex flex-col overflow-hidden">
        <ChatBox
          documents={documents}
          selectedDocumentId={selectedDocumentId}
          onDocumentChange={(documentId) => {
            setSelectedDocumentId(documentId);
            setViewerPageNumber(1);
            setFocusedSource(null);
          }}
          onSourceSelect={(source) => {
            if (source.documentId && source.documentId !== selectedDocumentId) {
              setSelectedDocumentId(source.documentId);
            }

            setViewerPageNumber(source.pageStart);
            setFocusedSource(source);
          }}
        />
      </section>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <p className="text-sm text-slate-400">Loading workspace…</p>
          </div>
        </div>
      }
    >
      <ChatWorkspace />
    </Suspense>
  );
}

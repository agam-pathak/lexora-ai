"use client";

import dynamic from "next/dynamic";
import {
  ArrowRight,
  Eye,
  FileStack,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
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
      <div className="panel flex min-h-[760px] items-center justify-center p-8 text-center">
        <div className="max-w-xl">
          <span className="eyebrow">
            <MessageSquareText className="h-3.5 w-3.5" />
            Workspace
          </span>
          <h1 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">
            No indexed PDFs available yet
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
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
    <div className="grid gap-6 xl:grid-cols-[1.07fr_0.93fr] h-[calc(100vh-theme(spacing.32))] min-h-0">
      <section className="panel p-5 sm:p-6 flex flex-col overflow-hidden">
        {errorMessage ? (
          <p className="mb-4 text-sm text-rose-300">{errorMessage}</p>
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

      <section className="panel overflow-hidden flex flex-col">
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
        <div className="panel flex min-h-[760px] items-center justify-center p-8 text-center">
          <div>
            <span className="eyebrow">Workspace</span>
            <h1 className="mt-5 text-3xl font-semibold text-white">
              Loading workspace
            </h1>
          </div>
        </div>
      }
    >
      <ChatWorkspace />
    </Suspense>
  );
}

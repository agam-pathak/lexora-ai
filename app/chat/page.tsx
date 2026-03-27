"use client";

import dynamic from "next/dynamic";
import {
  ArrowRight,
  FileText,
  MessageSquareText,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ChatBox from "@/components/ChatBox";
import {
  cacheParsedPdfDocument,
  hasCachedParsedPdfDocument,
} from "@/lib/clientParsedPdfCache";
import { requestDocumentReindex } from "@/lib/clientIndexing";
import { extractPdfDocumentFromUrl } from "@/lib/clientPdfExtraction";
import type {
  ChatSource,
  IndexedDocument,
  ParsedPdfDocument,
} from "@/lib/types";

const PDFViewer = dynamic(() => import("@/components/PDFViewer"), {
  ssr: false,
});
const BACKGROUND_REINDEX_TIMEOUT_MS = 20_000;

function ChatWorkspace() {
  const searchParams = useSearchParams();
  const requestedDocumentId = searchParams.get("doc");

  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [repairingDocumentId, setRepairingDocumentId] = useState("");
  const [liveTextDocumentIds, setLiveTextDocumentIds] = useState<string[]>([]);
  const [viewerPageNumber, setViewerPageNumber] = useState(1);
  const [focusedSource, setFocusedSource] = useState<ChatSource | null>(null);
  const [mobilePane, setMobilePane] = useState<"viewer" | "chat">("chat");
  const selectedDocumentIdRef = useRef(selectedDocumentId);
  const repairedDocumentsRef = useRef(new Set<string>());

  const markLiveTextReady = useCallback(
    (documentId: string, parsedPdf: ParsedPdfDocument) => {
      cacheParsedPdfDocument(documentId, parsedPdf);
      setLiveTextDocumentIds((currentIds) =>
        currentIds.includes(documentId)
          ? currentIds
          : [...currentIds, documentId],
      );
    },
    [],
  );

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
          setMobilePane(nextDocuments.length > 0 ? "chat" : "viewer");
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
  const selectedDocumentKey = selectedDocument?.id ?? "";
  const selectedDocumentHasLiveText =
    Boolean(selectedDocumentKey) &&
    (liveTextDocumentIds.includes(selectedDocumentKey) ||
      hasCachedParsedPdfDocument(selectedDocumentKey));

  useEffect(() => {
    if (!selectedDocumentKey || !hasCachedParsedPdfDocument(selectedDocumentKey)) {
      return;
    }

    setLiveTextDocumentIds((currentIds) =>
      currentIds.includes(selectedDocumentKey)
        ? currentIds
        : [...currentIds, selectedDocumentKey],
    );
  }, [selectedDocumentKey]);

  useEffect(() => {
    if (
      !selectedDocument ||
      (selectedDocument.chunkCount > 0 &&
        selectedDocument.extractionMode !== "ocr-recommended") ||
      repairedDocumentsRef.current.has(selectedDocument.id)
    ) {
      return;
    }

    const targetDocument = selectedDocument;

    // Additional safety checks before attempting repair
    if (
      !targetDocument.fileUrl || // Ensure fileUrl exists
      targetDocument.extractionMode !== "ocr-recommended" || // Only repair if extractionMode is 'ocr-recommended'
      repairingDocumentId === targetDocument.id // Prevent re-repairing if already in progress
    ) {
      return;
    }

    repairedDocumentsRef.current.add(targetDocument.id);
    let cancelled = false;

    async function repairSearchableText() {
      setRepairingDocumentId(targetDocument.id);

      try {
        const parsedPdf = await extractPdfDocumentFromUrl(
          `/api/files/serve?path=${encodeURIComponent(targetDocument.fileUrl)}`,
        );

        if (parsedPdf.pages.length === 0) {
          return;
        }
        markLiveTextReady(targetDocument.id, parsedPdf);
        let timeoutId: number | undefined;
        let updatedDocument: IndexedDocument;

        try {
          ({ document: updatedDocument } = await Promise.race([
            requestDocumentReindex({
              documentId: targetDocument.id,
              parsedPdf,
            }),
            new Promise<never>((_, reject) => {
              timeoutId = window.setTimeout(() => {
                reject(
                  new Error(
                    "Background document sync took too long. Live chat remains available.",
                  ),
                );
              }, BACKGROUND_REINDEX_TIMEOUT_MS);
            }),
          ]));
        } finally {
          if (timeoutId) {
            window.clearTimeout(timeoutId);
          }
        }

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setDocuments((currentDocuments) =>
            currentDocuments.map((document) =>
              document.id === updatedDocument.id ? updatedDocument : document,
            ),
          );
        });
      } catch (error) {
        console.warn("Workspace auto-repair failed for searchable text.", error);
      } finally {
        if (!cancelled) {
          setRepairingDocumentId((currentId) =>
            currentId === targetDocument.id ? "" : currentId,
          );
        }
      }
    }

    void repairSearchableText();

    return () => {
      cancelled = true;
    };
  }, [markLiveTextReady, repairingDocumentId, selectedDocument]);

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
    <div className="flex h-full flex-col">
      <div className="border-b border-white/[0.06] px-4 py-2 xl:hidden">
        <div className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setMobilePane("viewer")}
            className={`rounded-lg px-3 py-1.5 text-xs transition ${
              mobilePane === "viewer"
                ? "bg-white/[0.08] text-white"
                : "text-slate-400"
            }`}
          >
            <FileText className="mr-1 inline h-3.5 w-3.5" />
            Viewer
          </button>
          <button
            type="button"
            onClick={() => setMobilePane("chat")}
            className={`rounded-lg px-3 py-1.5 text-xs transition ${
              mobilePane === "chat"
                ? "bg-white/[0.08] text-white"
                : "text-slate-400"
            }`}
          >
            <MessageSquareText className="mr-1 inline h-3.5 w-3.5" />
            Chat
          </button>
        </div>
      </div>

      <div className="grid h-full min-h-0 grid-cols-1 gap-0 xl:grid-cols-[minmax(420px,0.92fr)_minmax(560px,1.08fr)] 2xl:grid-cols-[minmax(460px,0.88fr)_minmax(680px,1.12fr)]">
      {/* ── Left: PDF Viewer ── */}
      <section
        className={`${
          mobilePane === "viewer" ? "flex" : "hidden"
        } min-h-0 flex-col overflow-hidden border-r border-white/[0.06] xl:flex`}
      >
        {errorMessage ? (
          <p className="border-b border-rose-400/20 bg-rose-400/5 px-4 py-2 text-xs text-rose-300">
            {errorMessage}
          </p>
        ) : null}
        {repairingDocumentId === selectedDocument?.id ? (
          <p className="border-b border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-xs text-cyan-200">
            {selectedDocumentHasLiveText
              ? "Live document text is ready. Background indexing is still syncing..."
              : "Rebuilding searchable text from the local PDF view..."}
          </p>
        ) : null}

        <PDFViewer
          key={selectedDocument?.fileUrl ?? "no-document"}
          document={selectedDocument}
          pageNumber={viewerPageNumber}
          onPageChange={setViewerPageNumber}
          focusedSource={focusedSource}
          onDocumentUpdate={(updatedDocument) =>
            setDocuments((currentDocuments) =>
              currentDocuments.map((document) =>
                document.id === updatedDocument.id ? updatedDocument : document,
              ),
            )
          }
        />
      </section>

      {/* ── Right: Chat ── */}
      <section
        className={`${
          mobilePane === "chat" ? "flex" : "hidden"
        } min-h-0 flex-col overflow-hidden xl:flex`}
      >
        <ChatBox
          documents={documents}
          selectedDocumentId={selectedDocumentId}
          documentRepairing={repairingDocumentId === selectedDocument?.id}
          liveDocumentTextReady={selectedDocumentHasLiveText}
          onDocumentChange={(documentId) => {
            setSelectedDocumentId(documentId);
            setViewerPageNumber(1);
            setFocusedSource(null);
            setMobilePane("viewer");
          }}
          onSourceSelect={(source) => {
            if (source.documentId && source.documentId !== selectedDocumentId) {
              setSelectedDocumentId(source.documentId);
            }

            setViewerPageNumber(source.pageStart);
            setFocusedSource(source);
            setMobilePane("viewer");
          }}
        />
      </section>
    </div>
    </div>
  );
}

import { WorkspaceLoadingSkeleton } from "@/components/ui/Skeleton";

export default function ChatPage() {
  return (
    <Suspense
      fallback={<WorkspaceLoadingSkeleton />}
    >
      <ChatWorkspace />
    </Suspense>
  );
}

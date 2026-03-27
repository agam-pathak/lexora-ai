"use client";

import dynamic from "next/dynamic";
import { ArrowRight, FileText, MessageSquareText } from "lucide-react";
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
import { WorkspaceLoadingSkeleton } from "@/components/ui/Skeleton";
import {
  cacheParsedPdfDocument,
  hasCachedParsedPdfDocument,
} from "@/lib/clientParsedPdfCache";
import { requestDocumentReindex } from "@/lib/clientIndexing";
import { extractPdfDocumentFromUrl } from "@/lib/clientPdfExtraction";
import type { ChatSource, IndexedDocument, ParsedPdfDocument } from "@/lib/types";

const PDFViewer = dynamic(() => import("@/components/PDFViewer"), {
  ssr: false,
});

const BACKGROUND_SYNC_TIMEOUT_MS = 20_000;

function ChatWorkspace() {
  const searchParams = useSearchParams();
  const requestedDocumentId = searchParams.get("doc");

  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [preparingDocumentId, setPreparingDocumentId] = useState("");
  const [viewerPageNumber, setViewerPageNumber] = useState(1);
  const [focusedSource, setFocusedSource] = useState<ChatSource | null>(null);
  const [mobilePane, setMobilePane] = useState<"viewer" | "chat">("chat");
  const [localTextDocumentIds, setLocalTextDocumentIds] = useState<string[]>([]);
  const selectedDocumentIdRef = useRef(selectedDocumentId);
  const syncedDocumentsRef = useRef(new Set<string>());

  const markLocalTextReady = useCallback(
    (documentId: string, parsedPdf: ParsedPdfDocument) => {
      cacheParsedPdfDocument(documentId, parsedPdf);
      setLocalTextDocumentIds((currentIds) =>
        currentIds.includes(documentId) ? currentIds : [...currentIds, documentId],
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
        const response = await fetch("/api/files", { cache: "no-store" });
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
          setMobilePane("chat");
        });
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load documents.",
          );
        }
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
  const localTextReady =
    Boolean(selectedDocumentKey) &&
    (localTextDocumentIds.includes(selectedDocumentKey) ||
      hasCachedParsedPdfDocument(selectedDocumentKey));
  const preparingDocument = preparingDocumentId === selectedDocumentKey;

  useEffect(() => {
    if (!selectedDocumentKey || !hasCachedParsedPdfDocument(selectedDocumentKey)) {
      return;
    }

    setLocalTextDocumentIds((currentIds) =>
      currentIds.includes(selectedDocumentKey)
        ? currentIds
        : [...currentIds, selectedDocumentKey],
    );
  }, [selectedDocumentKey]);

  useEffect(() => {
    if (!selectedDocument || localTextReady || preparingDocument) {
      return;
    }

    const targetDocument = selectedDocument;
    let cancelled = false;

    async function prepareDocument() {
      setPreparingDocumentId(targetDocument.id);

      try {
        const parsedPdf = await extractPdfDocumentFromUrl(
          `/api/files/serve?path=${encodeURIComponent(targetDocument.fileUrl)}`,
        );

        if (cancelled || parsedPdf.pages.length === 0) {
          return;
        }

        markLocalTextReady(targetDocument.id, parsedPdf);

        if (
          !syncedDocumentsRef.current.has(targetDocument.id) &&
          (targetDocument.chunkCount === 0 ||
            targetDocument.extractionMode === "ocr-recommended")
        ) {
          syncedDocumentsRef.current.add(targetDocument.id);

          let timeoutId: number | undefined;

          try {
            const { document: updatedDocument } = await Promise.race([
              requestDocumentReindex({
                documentId: targetDocument.id,
                parsedPdf,
              }),
              new Promise<never>((_, reject) => {
                timeoutId = window.setTimeout(() => {
                  reject(new Error("Background sync timed out."));
                }, BACKGROUND_SYNC_TIMEOUT_MS);
              }),
            ]);

            if (!cancelled) {
              setDocuments((currentDocuments) =>
                currentDocuments.map((document) =>
                  document.id === updatedDocument.id ? updatedDocument : document,
                ),
              );
            }
          } catch {
            // Live chat already works from cached text. Ignore background sync failures.
          } finally {
            if (timeoutId) {
              window.clearTimeout(timeoutId);
            }
          }
        }
      } catch {
        // If local extraction fails, the user can still rely on any existing server index.
      } finally {
        if (!cancelled) {
          setPreparingDocumentId((currentId) =>
            currentId === targetDocument.id ? "" : currentId,
          );
        }
      }
    }

    void prepareDocument();

    return () => {
      cancelled = true;
    };
  }, [localTextReady, markLocalTextReady, preparingDocument, selectedDocument]);

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
            Upload a document first, then come back to chat with it.
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

      {errorMessage ? (
        <p className="border-b border-rose-400/20 bg-rose-400/5 px-4 py-2 text-xs text-rose-300">
          {errorMessage}
        </p>
      ) : null}

      <div className="grid h-full min-h-0 grid-cols-1 gap-0 xl:grid-cols-[minmax(420px,0.78fr)_minmax(720px,1.22fr)] 2xl:grid-cols-[minmax(480px,0.74fr)_minmax(800px,1.26fr)]">
        <section
          className={`${
            mobilePane === "viewer" ? "flex" : "hidden"
          } min-h-0 flex-col overflow-hidden border-r border-white/[0.06] xl:flex`}
        >
          <PDFViewer
            key={selectedDocument?.fileUrl ?? "no-document"}
            document={selectedDocument}
            pageNumber={viewerPageNumber}
            onPageChange={setViewerPageNumber}
            focusedSource={focusedSource}
          />
        </section>

        <section
          className={`${
            mobilePane === "chat" ? "flex" : "hidden"
          } min-h-0 flex-col overflow-hidden xl:flex`}
        >
          <ChatBox
            documents={documents}
            selectedDocumentId={selectedDocumentId}
            localTextReady={localTextReady}
            preparingDocument={preparingDocument}
            onDocumentChange={(documentId) => {
              setSelectedDocumentId(documentId);
              setViewerPageNumber(1);
              setFocusedSource(null);
              setMobilePane("chat");
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

export default function ChatPage() {
  return (
    <Suspense fallback={<WorkspaceLoadingSkeleton />}>
      <ChatWorkspace />
    </Suspense>
  );
}

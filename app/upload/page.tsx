"use client";

import {
  ArrowRight,
  FilePlus2,
  FileStack,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";

import type { IndexedDocument } from "@/lib/types";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatIndexedAt(indexedAt: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(indexedAt));
}

export default function UploadPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<IndexedDocument[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [refreshingIndex, setRefreshingIndex] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [sortMode, setSortMode] = useState("recent");
  const [deletingDocumentId, setDeletingDocumentId] = useState("");

  async function loadDocuments() {
    setErrorMessage("");

    try {
      const response = await fetch("/api/files", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load indexed documents.");
      }

      startTransition(() => {
        setDocuments(data.files ?? []);
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load documents.",
      );
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  function handleFileSelection(file: File | null) {
    setStatusMessage("");
    setErrorMessage("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setSelectedFile(null);
      setErrorMessage("Only PDF files are allowed.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setSelectedFile(null);
      setErrorMessage("The PDF exceeds the 15 MB upload limit.");
      return;
    }

    setSelectedFile(file);
  }

  async function uploadFile() {
    if (!selectedFile) {
      setErrorMessage("Choose a PDF before uploading.");
      return;
    }

    setUploading(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed.");
      }

      setStatusMessage(data.message || "Document uploaded successfully.");
      await loadDocuments();
      router.push(`/chat?doc=${data.document.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Upload failed unexpectedly.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function rebuildIndex(documentId?: string) {
    setRefreshingIndex(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/index", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(documentId ? { documentId } : {}),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Index refresh failed.");
      }

      setStatusMessage(data.message || "Index rebuilt successfully.");
      await loadDocuments();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Index refresh failed.",
      );
    } finally {
      setRefreshingIndex(false);
    }
  }

  async function deleteIndexedDocument(documentId: string) {
    setDeletingDocumentId(documentId);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const response = await fetch(`/api/files/${documentId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Delete failed.");
      }

      setStatusMessage(data.message || "Document deleted successfully.");
      await loadDocuments();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Delete failed unexpectedly.",
      );
    } finally {
      setDeletingDocumentId("");
    }
  }

  const totalPages = documents.reduce((sum, document) => sum + document.pageCount, 0);
  const totalChunks = documents.reduce((sum, document) => sum + document.chunkCount, 0);
  const filteredDocuments = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    const nextDocuments = documents.filter((document) =>
      normalizedSearch
        ? document.name.toLowerCase().includes(normalizedSearch) ||
          document.embeddingModel.toLowerCase().includes(normalizedSearch)
        : true,
    );

    nextDocuments.sort((left, right) => {
      if (sortMode === "name") {
        return left.name.localeCompare(right.name);
      }

      if (sortMode === "pages") {
        return right.pageCount - left.pageCount;
      }

      if (sortMode === "chunks") {
        return right.chunkCount - left.chunkCount;
      }

      return Date.parse(right.indexedAt || "") - Date.parse(left.indexedAt || "");
    });

    return nextDocuments;
  }, [documents, searchValue, sortMode]);

  return (
    <div className="space-y-6">
      <section className="panel reveal-rise overflow-hidden px-6 py-7 sm:px-8">
        <div className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
          <div className="space-y-5">
            <span className="eyebrow">
              <UploadCloud className="h-3.5 w-3.5" />
              Library operations
            </span>

            <div className="space-y-3">
              <h1 className="section-title">
                Build a premium PDF library and move directly into the workspace.
              </h1>
              <p className="max-w-2xl section-copy">
                Upload, reindex, sort, and prune your document collection from one
                surface. The flow is now tuned like a product console instead of a
                plain upload form.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="metric-card">
                <p className="text-2xl font-semibold text-white">{documents.length}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">
                  indexed docs
                </p>
              </div>
              <div className="metric-card">
                <p className="text-2xl font-semibold text-white">{totalPages}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">
                  total pages
                </p>
              </div>
              <div className="metric-card">
                <p className="text-2xl font-semibold text-white">{totalChunks}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">
                  indexed chunks
                </p>
              </div>
              <div className="metric-card">
                <p className="text-2xl font-semibold text-white">Private</p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">
                  user scope
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="panel-soft p-4">
                <p className="mono text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">
                  Intake
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  PDF validation, filename sanitization, and immediate index handoff.
                </p>
              </div>
              <div className="panel-soft p-4">
                <p className="mono text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">
                  Library
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Search by document name or embedding model, then sort by size,
                  pages, or freshness.
                </p>
              </div>
              <div className="panel-soft p-4">
                <p className="mono text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">
                  Handoff
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  A successful upload routes directly into the retrieval workspace.
                </p>
              </div>
            </div>
          </div>

          <div className="panel-soft overflow-hidden p-5 sm:p-6">
            <div className="shine-surface absolute inset-0 opacity-20" />
            <div className="relative flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="mono text-[11px] uppercase tracking-[0.28em] text-cyan-100/70">
                    Upload lane
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Drop a PDF and trigger indexing
                  </h2>
                </div>

                <div className="data-pill">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-100" />
                  PDF only
                </div>
              </div>

              <label
                className={`relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-[30px] border border-dashed px-6 py-8 text-center transition ${
                  dragActive
                    ? "border-cyan-300/55 bg-cyan-300/10"
                    : "border-white/14 bg-slate-950/35 hover:border-cyan-300/35 hover:bg-white/[0.05]"
                }`}
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  handleFileSelection(event.dataTransfer.files?.[0] ?? null);
                }}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  onChange={(event) => {
                    handleFileSelection(event.target.files?.[0] ?? null);
                  }}
                />

                <div className="flex h-18 w-18 items-center justify-center rounded-[28px] bg-cyan-300/14 text-cyan-100">
                  <UploadCloud className="h-9 w-9" />
                </div>
                <p className="mt-5 text-xl font-semibold text-white">
                  Drop a PDF here or browse locally
                </p>
                <p className="mt-2 max-w-md text-sm leading-7 text-slate-300">
                  15 MB max. Files are stored inside the authenticated workspace and
                  indexed immediately after upload.
                </p>

                {selectedFile ? (
                  <div className="mt-5 min-w-[260px] rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-4 text-left">
                    <p className="truncate text-sm font-semibold text-white">
                      {selectedFile.name}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="data-pill">{formatBytes(selectedFile.size)}</span>
                      <span className="data-pill">Ready for indexing</span>
                    </div>
                  </div>
                ) : null}
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void uploadFile()}
                  disabled={!selectedFile || uploading}
                  className="premium-button disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {uploading ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <FilePlus2 className="h-4 w-4" />
                  )}
                  {uploading ? "Indexing..." : "Upload and index"}
                </button>

                <button
                  type="button"
                  onClick={() => void rebuildIndex()}
                  disabled={refreshingIndex}
                  className="premium-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshingIndex ? "animate-spin" : ""}`}
                  />
                  Rebuild index
                </button>

                <Link href="/chat" className="premium-button-secondary">
                  Open workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {statusMessage ? (
                <p className="text-sm text-emerald-300">{statusMessage}</p>
              ) : null}
              {errorMessage ? (
                <p className="text-sm text-rose-300">{errorMessage}</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-6 sm:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <span className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              Indexed collection
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
              Retrieval-ready documents in your private library
            </h2>
          </div>

          <div className="data-pill">
            <FileStack className="h-4 w-4 text-cyan-100" />
            {filteredDocuments.length} live documents
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_240px]">
          <label className="panel-soft flex items-center gap-3 px-4 py-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search by document name or model"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </label>

          <label className="panel-soft flex items-center gap-3 px-4 py-3">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none"
            >
              <option value="recent" className="bg-slate-950">
                Sort by recent
              </option>
              <option value="name" className="bg-slate-950">
                Sort by name
              </option>
              <option value="pages" className="bg-slate-950">
                Sort by pages
              </option>
              <option value="chunks" className="bg-slate-950">
                Sort by chunks
              </option>
            </select>
          </label>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {filteredDocuments.length === 0 ? (
            <div className="panel-soft flex min-h-[240px] items-center justify-center p-8 text-center xl:col-span-2">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {documents.length === 0 ? "No PDFs indexed yet" : "No documents match"}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  {documents.length === 0
                    ? "Your first upload will appear here and become available in chat."
                    : "Adjust the search term or sort mode to find the right document."}
                </p>
              </div>
            </div>
          ) : (
            filteredDocuments.map((document, index) => (
              <article
                key={document.id}
                className="panel-soft reveal-rise overflow-hidden p-5"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="data-pill">PDF intelligence asset</div>
                    <h3 className="mt-4 truncate text-xl font-semibold text-white">
                      {document.name}
                    </h3>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-slate-950/35 px-3 py-2 text-right text-xs uppercase tracking-[0.22em] text-slate-400">
                    {formatBytes(document.sizeBytes)}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[22px] border border-white/8 bg-slate-950/35 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      Pages
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {document.pageCount}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-slate-950/35 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      Chunks
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {document.chunkCount}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-white/8 bg-slate-950/35 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                      Indexed
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {formatIndexedAt(document.indexedAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <span className="data-pill">{document.embeddingModel}</span>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={`/chat?doc=${document.id}`} className="premium-button">
                    Open in workspace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => void rebuildIndex(document.id)}
                    disabled={refreshingIndex}
                    className="premium-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${refreshingIndex ? "animate-spin" : ""}`}
                    />
                    Reindex
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteIndexedDocument(document.id)}
                    disabled={deletingDocumentId === document.id}
                    className="premium-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingDocumentId === document.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

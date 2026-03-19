"use client";

import {
  FileText,
  Globe2,
  Sparkles,
} from "lucide-react";

import type { ConversationSummary, IndexedDocument } from "@/lib/types";

type SearchMode = "document" | "all";

type ChatHeaderProps = {
  documents: IndexedDocument[];
  selectedDocumentId: string;
  searchMode: SearchMode;
  activeConversation: ConversationSummary | null;
  canAskQuestion: boolean;
  promptChips: string[];
  messages: { id: string; role: string; text: string }[];
  onDocumentChange: (documentId: string) => void;
  onSearchModeChange: (mode: SearchMode) => void;
  onPromptChipClick: (prompt: string) => void;
};

export default function ChatHeader({
  documents,
  selectedDocumentId,
  searchMode,
  activeConversation,
  canAskQuestion,
  promptChips,
  messages,
  onDocumentChange,
  onSearchModeChange,
  onPromptChipClick,
}: ChatHeaderProps) {
  return (
    <div className="border-b border-white/[0.06] px-4 py-3">
      {/* ── Title row ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white">
            Lexora AI Assistant
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {canAskQuestion ? "Active" : "Waiting"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500">
            {activeConversation?.title ?? "Active conversation"}
          </span>
        </div>
      </div>

      {/* ── Search mode toggle ── */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
          <button
            type="button"
            onClick={() => onSearchModeChange("document")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
              searchMode === "document"
                ? "bg-white/[0.08] text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="h-3 w-3" />
            Single-document scope
          </button>
          <button
            type="button"
            onClick={() => onSearchModeChange("all")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition ${
              searchMode === "all"
                ? "bg-white/[0.08] text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe2 className="h-3 w-3" />
            All documents
          </button>
        </div>

        {documents.length > 1 && (
          <select
            value={selectedDocumentId}
            onChange={(event) => onDocumentChange(event.target.value)}
            className="max-w-[200px] appearance-none truncate rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-slate-300 outline-none transition focus:border-cyan-400/40"
          >
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── Suggestion chips ── */}
      {promptChips.length > 0 && messages.length <= 1 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {promptChips.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onPromptChipClick(prompt)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-slate-400 transition hover:border-cyan-400/20 hover:bg-cyan-400/5 hover:text-cyan-200"
            >
              <Sparkles className="h-3 w-3 text-cyan-400/60" />
              {prompt}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

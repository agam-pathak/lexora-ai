"use client";

import {
  BookOpenText,
  CircleDot,
  FileStack,
  FileText,
  Globe2,
  History,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

import type { ChatSource, ConversationSummary, IndexedDocument } from "@/lib/types";

type SearchMode = "document" | "all";

type ChatHeaderProps = {
  documents: IndexedDocument[];
  selectedDocumentId: string;
  selectedDocument: IndexedDocument | null;
  searchMode: SearchMode;
  conversationSummaries: ConversationSummary[];
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
  selectedDocument,
  searchMode,
  conversationSummaries,
  activeConversation,
  canAskQuestion,
  promptChips,
  messages,
  onDocumentChange,
  onSearchModeChange,
  onPromptChipClick,
}: ChatHeaderProps) {
  return (
    <div className="border-b border-white/5 bg-slate-950/20 px-5 py-4 sm:px-6 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-auto flex-1 max-w-sm">
          <select
            value={selectedDocumentId}
            onChange={(event) => onDocumentChange(event.target.value)}
            className="w-full appearance-none rounded-full border border-white/10 bg-slate-950/60 px-5 py-2.5 text-sm font-semibold text-white outline-none transition focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 shadow-inner"
          >
            {documents.length === 0 ? (
              <option value="">No indexed documents</option>
            ) : null}
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/40 p-1">
          <button
            type="button"
            onClick={() => onSearchModeChange("document")}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              searchMode === "document"
                ? "bg-cyan-400/20 text-cyan-200 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Active PDF
          </button>
          <button
            type="button"
            onClick={() => onSearchModeChange("all")}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              searchMode === "all"
                ? "bg-cyan-400/20 text-cyan-200 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe2 className="h-3.5 w-3.5" />
            Library
          </button>
        </div>
      </div>

      {promptChips.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {promptChips.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onPromptChipClick(prompt)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-100"
            >
              <Sparkles className="h-3 w-3 text-cyan-400" />
              {prompt}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

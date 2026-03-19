"use client";

import { ArrowUpRight, SendHorizontal, Sparkles } from "lucide-react";

import type { ConversationSummary, IndexedDocument } from "@/lib/types";

type SearchMode = "document" | "all";

type ChatComposerProps = {
  question: string;
  searchMode: SearchMode;
  selectedDocument: IndexedDocument | null;
  activeConversation: ConversationSummary | null;
  canAskQuestion: boolean;
  loading: boolean;
  conversationError: string;
  onQuestionChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
};

export default function ChatComposer({
  question,
  searchMode,
  selectedDocument,
  activeConversation,
  canAskQuestion,
  loading,
  conversationError,
  onQuestionChange,
  onSend,
  onKeyDown,
}: ChatComposerProps) {
  return (
    <div className="border-t border-white/10 px-5 py-5 sm:px-6">
      <div className="panel-soft overflow-hidden p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-3">
          <div className="flex flex-wrap gap-2">
            <span className="data-pill">
              <ArrowUpRight className="h-3.5 w-3.5 text-cyan-100" />
              Enter sends
            </span>
            <span className="data-pill">
              <Sparkles className="h-3.5 w-3.5 text-cyan-100" />
              Shift + Enter adds a line
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="data-pill">
              {searchMode === "all"
                ? "Library scope"
                : "Single-document scope"}
            </span>
            {activeConversation ? (
              <span className="data-pill">{activeConversation.title}</span>
            ) : null}
          </div>
        </div>

        <textarea
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            searchMode === "all"
              ? "Ask a grounded question across all indexed documents..."
              : selectedDocument
                ? `Ask a grounded question about "${selectedDocument.name}"...`
                : "Upload or select a document to enable chat."
          }
          disabled={!canAskQuestion || loading}
          rows={4}
          className="mt-3 w-full resize-none bg-transparent px-1 py-2 text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-3">
          <div className="text-xs text-slate-400">
            Answers stay constrained to retrieved evidence and can route
            citation clicks back into the viewer.
          </div>

          <button
            type="button"
            onClick={onSend}
            disabled={!canAskQuestion || loading || !question.trim()}
            className="premium-button disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            <SendHorizontal className="h-4 w-4" />
            Send
          </button>
        </div>

        {conversationError ? (
          <p className="mt-3 text-sm text-rose-300">{conversationError}</p>
        ) : null}
      </div>
    </div>
  );
}

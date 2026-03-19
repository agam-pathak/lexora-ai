"use client";

import {
  History,
  LoaderCircle,
  PencilLine,
  Plus,
  Trash2,
} from "lucide-react";

import type { ConversationSummary } from "@/lib/types";

type SearchMode = "document" | "all";

type ThreadHistoryProps = {
  conversationSummaries: ConversationSummary[];
  selectedConversationId: string;
  searchMode: SearchMode;
  loadingConversations: boolean;
  deletingConversationId: string;
  conversationScopeId: string;
  onLoadConversation: (conversationId: string) => void;
  onCreateNew: () => void;
  onRename: (conversationId: string, currentTitle: string) => void;
  onDelete: (conversationId: string) => void;
};

function formatConversationTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export default function ThreadHistory({
  conversationSummaries,
  selectedConversationId,
  searchMode,
  loadingConversations,
  deletingConversationId,
  conversationScopeId,
  onLoadConversation,
  onCreateNew,
  onRename,
  onDelete,
}: ThreadHistoryProps) {
  return (
    <div className="border-b border-white/8 px-5 py-4 sm:px-6">
      <div className="panel-soft p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <History className="h-4 w-4 text-cyan-100" />
              Thread history
            </div>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
              {searchMode === "all" ? "Library-wide scope" : "Document scope"}
            </p>
          </div>

          <button
            type="button"
            onClick={onCreateNew}
            disabled={!conversationScopeId || loadingConversations}
            className="premium-button-secondary px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingConversations ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            New thread
          </button>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {conversationSummaries.length === 0 ? (
            <div className="w-full min-w-[260px] rounded-[24px] border border-dashed border-white/10 bg-slate-950/35 px-5 py-5 text-sm text-slate-300">
              Your first question in this scope will create a persistent thread
              automatically.
            </div>
          ) : (
            conversationSummaries.map((conversation) => (
              <div
                key={conversation.id}
                className={`w-[280px] shrink-0 rounded-[26px] border p-4 transition ${
                  conversation.id === selectedConversationId
                    ? "border-cyan-300/24 bg-cyan-300/10"
                    : "border-white/8 bg-slate-950/35 hover:border-white/14 hover:bg-white/[0.05]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onLoadConversation(conversation.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {conversation.title}
                      </p>
                      <p className="mt-2 line-clamp-3 text-xs leading-6 text-slate-400">
                        {conversation.lastMessagePreview}
                      </p>
                    </div>
                    <span className="mono shrink-0 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      {formatConversationTime(conversation.updatedAt)}
                    </span>
                  </div>
                </button>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/8 pt-3">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    {conversation.messageCount} messages
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        onRename(conversation.id, conversation.title)
                      }
                      className="rounded-full p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                      aria-label={`Rename ${conversation.title}`}
                    >
                      <PencilLine className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(conversation.id)}
                      disabled={deletingConversationId === conversation.id}
                      className="rounded-full p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Delete ${conversation.title}`}
                    >
                      {deletingConversationId === conversation.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Sparkles } from "lucide-react";

import { buildClientChatContext } from "@/lib/clientChatContext";
import type {
  ChatSource,
  ConversationMessage,
  ConversationSummary,
  IndexedDocument,
} from "@/lib/types";

import ChatComposer from "./ChatComposer";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import { MessageSkeleton } from "./ui/Skeleton";

type ChatBoxProps = {
  documents: IndexedDocument[];
  selectedDocumentId: string;
  localTextReady: boolean;
  preparingDocument: boolean;
  ensureDocumentReady: (document: IndexedDocument) => Promise<boolean>;
  onDocumentChange: (documentId: string) => void;
  onSourceSelect?: (source: ChatSource) => void;
};

function createIntroMessage(
  document: IndexedDocument | null,
  localTextReady: boolean,
  preparingDocument: boolean,
): ConversationMessage {
  if (!document) {
    return {
      id: "assistant-intro",
      role: "assistant",
      text: "Select a PDF to start chatting with it.",
      createdAt: new Date(0).toISOString(),
    };
  }

  if (localTextReady) {
    return {
      id: "assistant-intro",
      role: "assistant",
      text:
        document.chunkCount > 0
          ? `Ready. Ask anything about "${document.name}" and I’ll answer from the document with citations.`
          : `Ready. "${document.name}" is available for live chat now, and background indexing can keep improving retrieval.`,
      createdAt: new Date(0).toISOString(),
    };
  }

  if (document.chunkCount > 0) {
    return {
      id: "assistant-intro",
      role: "assistant",
      text: `Ready. "${document.name}" is indexed and available for grounded answers.`,
      createdAt: new Date(0).toISOString(),
    };
  }

  if (preparingDocument) {
    return {
      id: "assistant-intro",
      role: "assistant",
      text: `Preparing "${document.name}" for instant answers. You can ask now and Lexora will finish the live text path in the background.`,
      createdAt: new Date(0).toISOString(),
    };
  }

  return {
    id: "assistant-intro",
    role: "assistant",
    text: `"${document.name}" is loaded. Ask your question and Lexora will prepare live document text on demand if the server index is still catching up.`,
    createdAt: new Date(0).toISOString(),
  };
}

function createPromptChips(document: IndexedDocument | null) {
  if (!document) {
    return [];
  }

  return [
    `Give me a concise summary of "${document.name}".`,
    "Extract the key facts, entities, and dates.",
    "What are the most important highlights in this document?",
    "List the strongest evidence with page references.",
  ];
}

export default function ChatBox({
  documents,
  selectedDocumentId,
  localTextReady,
  preparingDocument,
  ensureDocumentReady,
  onDocumentChange,
  onSourceSelect,
}: ChatBoxProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationError, setConversationError] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [hasLoadedConversation, setHasLoadedConversation] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  const selectedDocument =
    documents.find((document) => document.id === selectedDocumentId) ?? null;
  const canAskQuestion = selectedDocument !== null;
  const documentReadyForImmediateAnswers =
    selectedDocument !== null &&
    (localTextReady || selectedDocument.chunkCount > 0);
  const introMessage = useMemo(
    () => createIntroMessage(selectedDocument, localTextReady, preparingDocument),
    [localTextReady, preparingDocument, selectedDocument],
  );
  const promptChips = useMemo(
    () => createPromptChips(selectedDocument),
    [selectedDocument],
  );
  const displayedMessages = useMemo(
    () => (messages.length > 0 ? messages : [introMessage]),
    [introMessage, messages],
  );

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [displayedMessages, loading]);

  useEffect(() => {
    setMessages([]);
    setQuestion("");
    setConversationError("");
    setConversationId("");
    setHasLoadedConversation(false);
  }, [selectedDocumentId]);

  useEffect(() => {
    if (!selectedDocumentId) {
      return;
    }

    let cancelled = false;

    async function loadLatestConversation() {
      try {
        const response = await fetch(
          `/api/conversations?documentId=${encodeURIComponent(selectedDocumentId)}`,
          { cache: "no-store" },
        );
        const data = await response.json();

        if (!response.ok || cancelled) {
          return;
        }

        const latestConversation = (data.conversations as ConversationSummary[] | undefined)?.[0];

        if (!latestConversation) {
          setHasLoadedConversation(true);
          return;
        }

        const detailResponse = await fetch(
          `/api/conversations/${latestConversation.id}`,
          { cache: "no-store" },
        );
        const detailData = await detailResponse.json();

        if (!detailResponse.ok || cancelled) {
          return;
        }

        setConversationId(latestConversation.id);
        setMessages(detailData.conversation?.messages ?? []);
        setHasLoadedConversation(true);
      } catch {
        if (!cancelled) {
          setHasLoadedConversation(true);
        }
      }
    }

    void loadLatestConversation();

    return () => {
      cancelled = true;
    };
  }, [selectedDocumentId]);

  async function sendQuestion(prefilledQuestion?: string) {
    const trimmedQuestion = (prefilledQuestion ?? question).trim();

    if (!trimmedQuestion || !selectedDocument || !canAskQuestion) {
      return;
    }

    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmedQuestion,
      createdAt: new Date().toISOString(),
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setQuestion("");
    setLoading(true);
    setConversationError("");

    const assistantMessageId = `assistant-${Date.now()}`;

    try {
      let liveTextReadyForRequest = localTextReady;

      if (!liveTextReadyForRequest && selectedDocument.chunkCount === 0) {
        liveTextReadyForRequest = await ensureDocumentReady(selectedDocument);
      }

      if (!liveTextReadyForRequest && selectedDocument.chunkCount === 0) {
        throw new Error(
          "I could not prepare searchable text for this PDF. Reupload the file if it should contain selectable text, or run Deep Scan/OCR for scanned pages.",
        );
      }

      const clientContext =
        liveTextReadyForRequest &&
        (selectedDocument.chunkCount === 0 ||
          selectedDocument.extractionMode === "ocr-recommended")
          ? buildClientChatContext(selectedDocument, trimmedQuestion)
          : null;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          documentId: selectedDocument.id,
          conversationId: conversationId || undefined,
          searchMode: "document",
          clientContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "The document question failed.");
      }

      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("text/event-stream") && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        let sseBuffer = "";

        setMessages((currentMessages) => [
          ...currentMessages,
          {
            id: assistantMessageId,
            role: "assistant",
            text: "",
            createdAt: new Date().toISOString(),
          },
        ]);

        let finalSources: ChatSource[] = [];

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) {
              continue;
            }

            const payload = line.slice(6).trim();

            if (!payload || payload === "[DONE]") {
              continue;
            }

            try {
              const event = JSON.parse(payload) as {
                type?: string;
                text?: string;
                answer?: string;
                sources?: ChatSource[];
                conversation?: ConversationSummary;
              };

              if (event.type === "sources") {
                finalSources = event.sources ?? [];
                setMessages((currentMessages) =>
                  currentMessages.map((message) =>
                    message.id === assistantMessageId
                      ? { ...message, sources: finalSources }
                      : message,
                  ),
                );
              } else if (event.type === "delta") {
                accumulatedText += event.text ?? "";
                setMessages((currentMessages) =>
                  currentMessages.map((message) =>
                    message.id === assistantMessageId
                      ? { ...message, text: accumulatedText }
                      : message,
                  ),
                );
              } else if (event.type === "done") {
                accumulatedText = event.answer ?? accumulatedText;
                if (event.conversation?.id) {
                  setConversationId(event.conversation.id);
                }
              }
            } catch {
              // Ignore malformed SSE events.
            }
          }
        }

        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  text:
                    accumulatedText ||
                    "The information is not available in the document.",
                  sources: finalSources,
                }
              : message,
          ),
        );
      } else {
        const data = await response.json();

        if (data.conversation?.id) {
          setConversationId(data.conversation.id);
        }

        setMessages((currentMessages) => [
          ...currentMessages,
          {
            id: assistantMessageId,
            role: "assistant",
            text:
              data.answer ||
              "The information is not available in the document.",
            sources: data.sources ?? [],
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong while asking the document.";

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          text: message,
          createdAt: new Date().toISOString(),
        },
      ]);
      setConversationError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendQuestion();
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-white">
                Lexora AI
              </h2>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  documentReadyForImmediateAnswers
                    ? "bg-emerald-400/10 text-emerald-300"
                    : "bg-amber-400/10 text-amber-300"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    documentReadyForImmediateAnswers
                      ? "bg-emerald-400"
                      : "bg-amber-300"
                  }`}
                />
                {documentReadyForImmediateAnswers ? "Ready" : "Preparing"}
              </span>
            </div>
            <p className="text-sm text-slate-400">
              {selectedDocument
                ? `Ask directly about "${selectedDocument.name}" with grounded citations.`
                : "Choose a document to begin."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Document
              </label>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-300" />
                <select
                  value={selectedDocumentId}
                  onChange={(event) => onDocumentChange(event.target.value)}
                  className="min-w-[220px] bg-transparent text-sm text-white outline-none"
                >
                  {documents.map((document) => (
                    <option key={document.id} value={document.id} className="bg-slate-950">
                      {document.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedDocument ? (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-slate-400">
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Status
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                  <span>
                    {localTextReady
                      ? "Instant chat ready"
                      : preparingDocument
                        ? "Preparing live text in background"
                        : selectedDocument.chunkCount > 0
                          ? "Indexed"
                          : "First question will prepare live text"}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {promptChips.length > 0 && messages.length === 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {promptChips.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setQuestion(prompt)}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-slate-300 transition hover:border-cyan-400/20 hover:bg-cyan-400/8 hover:text-cyan-200"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative flex-1 min-h-0 overflow-y-auto px-5 py-6">
        {!hasLoadedConversation && selectedDocument ? (
          <div className="space-y-4 pb-4">
            <MessageSkeleton />
          </div>
        ) : null}

        <div className="space-y-6">
          {displayedMessages.map((message, index) => (
            <MessageBubble
              key={message.id}
              role={message.role}
              text={message.text}
              sources={message.sources}
              highlight={
                index === displayedMessages.length - 1 &&
                message.role === "assistant"
              }
              onSourceSelect={onSourceSelect}
              onFollowUpClick={(prompt) => void sendQuestion(prompt)}
            />
          ))}

          {loading ? <TypingIndicator /> : null}
          <div ref={endOfMessagesRef} />
        </div>
      </div>

      <ChatComposer
        question={question}
        searchMode="document"
        selectedDocument={selectedDocument}
        canAskQuestion={canAskQuestion}
        blockedReason={
          !selectedDocument ? "Select a document first." : ""
        }
        helperText={
          localTextReady && selectedDocument?.chunkCount === 0
            ? "Live document text is active. Background indexing can finish separately."
            : selectedDocument &&
                !localTextReady &&
                selectedDocument.chunkCount === 0
              ? preparingDocument
                ? "Live document text is preparing in the background. You can ask now."
                : "This document is not indexed yet. Your first question will trigger live preparation."
            : ""
        }
        loading={loading}
        conversationError={conversationError}
        onQuestionChange={setQuestion}
        onSend={() => void sendQuestion()}
        onKeyDown={handleComposerKeyDown}
      />
    </div>
  );
}

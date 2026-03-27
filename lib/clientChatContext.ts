"use client";

import { chunkText } from "@/lib/chunkText";
import { getCachedParsedPdfDocument } from "@/lib/clientParsedPdfCache";
import type {
  ClientChatChunkPayload,
  ClientChatContextPayload,
  IndexedDocument,
} from "@/lib/types";

const FALLBACK_TOP_K = 4;

function tokenizeSearchTerms(value: string) {
  return [
    ...new Set(
      value
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((term) => term.length >= 2),
    ),
  ];
}

function countOccurrences(text: string, term: string) {
  let count = 0;
  let cursor = 0;

  while (true) {
    const matchIndex = text.indexOf(term, cursor);

    if (matchIndex === -1) {
      break;
    }

    count += 1;
    cursor = matchIndex + term.length;
  }

  return count;
}

function scoreChunk(question: string, chunkTextValue: string, chunkIndex: number) {
  const normalizedQuestion = question.trim().toLowerCase();
  const normalizedChunk = chunkTextValue.toLowerCase();
  const terms = tokenizeSearchTerms(normalizedQuestion);

  let score = 0;

  if (normalizedQuestion && normalizedChunk.includes(normalizedQuestion)) {
    score += 8;
  }

  for (const term of terms) {
    const occurrences = countOccurrences(normalizedChunk, term);

    if (occurrences === 0) {
      continue;
    }

    const weight =
      term.length >= 8 ? 2.2 : term.length >= 5 ? 1.5 : 1;
    score += Math.min(occurrences, 4) * weight;
  }

  for (let index = 0; index < terms.length - 1; index += 1) {
    const pair = `${terms[index]} ${terms[index + 1]}`;

    if (pair.trim().length >= 5 && normalizedChunk.includes(pair)) {
      score += 2.5;
    }
  }

  if (
    /(summary|summarize|overview|brief|highlights|main points)/i.test(question)
  ) {
    score += Math.max(0, 3 - chunkIndex) * 0.75;
  }

  return score;
}

function toClientChunkPayload(
  document: IndexedDocument,
  chunk: ReturnType<typeof chunkText>[number],
  score: number,
): ClientChatChunkPayload {
  return {
    documentId: document.id,
    source: document.name,
    chunkIndex: chunk.chunkIndex,
    start: chunk.start,
    end: chunk.end,
    pageStart: chunk.pageStart,
    pageEnd: chunk.pageEnd,
    fileUrl: document.fileUrl,
    text: chunk.text,
    score: Number(score.toFixed(4)),
  };
}

export function buildClientChatContext(
  document: IndexedDocument,
  question: string,
  topK = FALLBACK_TOP_K,
): ClientChatContextPayload | null {
  const parsedPdf = getCachedParsedPdfDocument(document.id);

  if (!parsedPdf || parsedPdf.pages.length === 0) {
    return null;
  }

  const chunks = chunkText(parsedPdf.pages);

  if (chunks.length === 0) {
    return null;
  }

  const rankedChunks = chunks
    .map((chunk) => ({
      chunk,
      score: scoreChunk(question, chunk.text, chunk.chunkIndex),
    }))
    .sort((left, right) => right.score - left.score);

  const relevantChunks = rankedChunks.some((entry) => entry.score > 0)
    ? rankedChunks.slice(0, topK)
    : chunks.slice(0, topK).map((chunk, index) => ({
        chunk,
        score: Number((Math.max(0, topK - index) * 0.01).toFixed(4)),
      }));

  return {
    mode: "client-parsed-pdf",
    chunks: relevantChunks.map(({ chunk, score }) =>
      toClientChunkPayload(document, chunk, score),
    ),
  };
}

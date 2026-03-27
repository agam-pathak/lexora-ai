"use client";

import type { ParsedPdfDocument } from "@/lib/types";

const CACHE_PREFIX = "lexora:parsed-pdf:";
const SESSION_STORAGE_MAX_BYTES = 1_200_000;
const parsedPdfCache = new Map<string, ParsedPdfDocument>();

function canUseSessionStorage() {
  return (
    typeof window !== "undefined" &&
    typeof window.sessionStorage !== "undefined"
  );
}

function toStorageKey(documentId: string) {
  return `${CACHE_PREFIX}${documentId}`;
}

function serializeParsedPdf(parsedPdf: ParsedPdfDocument) {
  return JSON.stringify(parsedPdf);
}

export function cacheParsedPdfDocument(
  documentId: string,
  parsedPdf: ParsedPdfDocument,
) {
  parsedPdfCache.set(documentId, parsedPdf);

  if (!canUseSessionStorage()) {
    return;
  }

  try {
    const serialized = serializeParsedPdf(parsedPdf);

    if (new Blob([serialized]).size > SESSION_STORAGE_MAX_BYTES) {
      window.sessionStorage.removeItem(toStorageKey(documentId));
      return;
    }

    window.sessionStorage.setItem(toStorageKey(documentId), serialized);
  } catch {
    // Ignore storage failures and keep the in-memory cache.
  }
}

export function getCachedParsedPdfDocument(documentId: string) {
  const cachedDocument = parsedPdfCache.get(documentId);

  if (cachedDocument) {
    return cachedDocument;
  }

  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const serialized = window.sessionStorage.getItem(toStorageKey(documentId));

    if (!serialized) {
      return null;
    }

    const parsedPdf = JSON.parse(serialized) as ParsedPdfDocument;
    parsedPdfCache.set(documentId, parsedPdf);
    return parsedPdf;
  } catch {
    return null;
  }
}

export function hasCachedParsedPdfDocument(documentId: string) {
  return getCachedParsedPdfDocument(documentId) !== null;
}

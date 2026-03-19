import type { ChatSource, RetrievedChunk } from "@/lib/types";
import { embedQuery } from "@/lib/embeddings";
import {
  getDocuments,
  searchAcrossIndexedDocuments,
  searchIndexedDocument,
} from "@/lib/vectorStore";

type RetrieveChunksOptions = {
  userId: string;
  documentId?: string;
  question: string;
  embeddingModel?: string;
  topK?: number;
  searchMode?: "document" | "all";
};

function formatPageRange(pageStart: number, pageEnd: number) {
  return pageStart === pageEnd
    ? `page ${pageStart}`
    : `pages ${pageStart}-${pageEnd}`;
}

export async function retrieveRelevantChunks({
  userId,
  documentId,
  question,
  embeddingModel,
  topK = 4,
  searchMode = "document",
}: RetrieveChunksOptions) {
  if (searchMode === "all" || !documentId) {
    const documents = await getDocuments(userId);

    if (documents.length === 0) {
      return [];
    }

    const documentIdsByModel = new Map<string, string[]>();

    for (const document of documents) {
      const documentIds = documentIdsByModel.get(document.embeddingModel) ?? [];
      documentIds.push(document.id);
      documentIdsByModel.set(document.embeddingModel, documentIds);
    }

    const results: RetrievedChunk[] = [];

    for (const [model, documentIds] of documentIdsByModel.entries()) {
      const query = await embedQuery(question, model);
      const chunks = await searchAcrossIndexedDocuments(
        userId,
        query.embedding,
        topK,
        documentIds,
      );
      results.push(...chunks);
    }

    return results.sort((left, right) => right.score - left.score).slice(0, topK);
  }

  const query = await embedQuery(question, embeddingModel);
  return searchIndexedDocument(userId, documentId, query.embedding, topK);
}

export function buildContext(chunks: RetrievedChunk[]) {
  return chunks
    .map(
      (chunk, index) =>
        `Context ${index + 1} (${formatPageRange(
          chunk.pageStart,
          chunk.pageEnd,
        )}, chunk ${chunk.chunkIndex}):\n${chunk.text}`,
    )
    .join("\n\n");
}

export function toChatSources(chunks: RetrievedChunk[]): ChatSource[] {
  return chunks.map((chunk) => ({
    documentId: chunk.documentId,
    chunkIndex: chunk.chunkIndex,
    fileUrl: chunk.fileUrl,
    pageStart: chunk.pageStart,
    pageEnd: chunk.pageEnd,
    source: chunk.source,
    score: Number(chunk.score.toFixed(4)),
    excerpt: chunk.text.slice(0, 240).trim(),
  }));
}

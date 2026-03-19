import type { ChunkRecord, ParsedPdfPage } from "@/lib/types";

type ChunkOptions = {
  chunkSize?: number;
  overlap?: number;
};

type PageRange = {
  pageNumber: number;
  start: number;
  end: number;
};

function getPageRange(pageRanges: PageRange[], start: number, end: number) {
  const overlappingPages = pageRanges
    .filter((page) => page.end > start && page.start < end)
    .map((page) => page.pageNumber);

  const firstPage = overlappingPages[0] ?? 1;
  const lastPage = overlappingPages.at(-1) ?? firstPage;

  return {
    pageStart: firstPage,
    pageEnd: lastPage,
  };
}

export function chunkText(
  pages: ParsedPdfPage[],
  options: ChunkOptions = {},
): ChunkRecord[] {
  const chunkSize = options.chunkSize ?? 1000;
  const overlap = options.overlap ?? 200;
  const step = Math.max(1, chunkSize - overlap);

  const pageRanges: PageRange[] = [];
  let fullText = "";
  let cursor = 0;

  for (const page of pages) {
    const normalizedText = page.text.trim();

    if (!normalizedText) {
      continue;
    }

    if (fullText.length > 0) {
      fullText += "\n\n";
      cursor += 2;
    }

    const start = cursor;
    fullText += normalizedText;
    cursor += normalizedText.length;

    pageRanges.push({
      pageNumber: page.pageNumber,
      start,
      end: cursor,
    });
  }

  if (!fullText.trim()) {
    return [];
  }

  const chunks: ChunkRecord[] = [];

  for (let start = 0; start < fullText.length; start += step) {
    const end = Math.min(fullText.length, start + chunkSize);
    const text = fullText.slice(start, end).trim();

    if (!text) {
      if (end >= fullText.length) {
        break;
      }

      continue;
    }

    const pageRange = getPageRange(pageRanges, start, end);

    chunks.push({
      chunkIndex: chunks.length,
      text,
      start,
      end,
      pageStart: pageRange.pageStart,
      pageEnd: pageRange.pageEnd,
    });

    if (end >= fullText.length) {
      break;
    }
  }

  return chunks;
}

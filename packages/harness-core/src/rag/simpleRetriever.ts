import { loadWorkspaceIndex } from "./simpleIndexer";
import type { RetrievedChunk, WorkspaceChunk } from "./types";

const DEFAULT_MAX_CHUNKS = 4;
const MAX_CHUNKS = 8;

export async function retrieveRelevantChunks(
  workspacePath: string,
  query: string,
  options?: { maxChunks?: number; activeFile?: string; selection?: string }
): Promise<RetrievedChunk[]> {
  const index = await loadWorkspaceIndex(workspacePath);

  if (!index || index.chunks.length === 0) {
    return [];
  }

  const queryTokens = tokenize([
    query,
    options?.activeFile ?? "",
    options?.selection ?? ""
  ].join(" "));

  const scored = index.chunks
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(chunk, queryTokens, options?.activeFile)
    }))
    .filter((chunk) => chunk.score > 0)
    .sort((left, right) => right.score - left.score || left.filePath.localeCompare(right.filePath));

  return scored.slice(0, clampMaxChunks(options?.maxChunks));
}

function scoreChunk(chunk: WorkspaceChunk, queryTokens: Set<string>, activeFile: string | undefined): number {
  const chunkTokens = tokenize(`${chunk.filePath} ${chunk.text}`);
  let score = 0;

  for (const token of queryTokens) {
    if (token.length < 2) {
      continue;
    }

    if (chunkTokens.has(token)) {
      score += token.length >= 6 ? 3 : 1;
    }
  }

  if (activeFile && chunk.filePath === activeFile) {
    score += 5;
  }

  if (queryTokens.size === 0) {
    score += chunk.tokenCount > 0 ? 1 : 0;
  }

  return score;
}

function tokenize(text: string): Set<string> {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return new Set(
    normalized
      .split(/[^a-z0-9._/-]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
  );
}

function clampMaxChunks(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_MAX_CHUNKS;
  }

  return Math.max(1, Math.min(Math.floor(value), MAX_CHUNKS));
}

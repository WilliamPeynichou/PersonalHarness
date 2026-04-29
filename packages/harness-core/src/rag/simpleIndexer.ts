import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { listFilesTool } from "../tools/listFiles";
import { readFileTool } from "../tools/readFile";
import type { IndexedWorkspaceSummary, WorkspaceChunk, WorkspaceIndex } from "./types";

const INDEX_DIR = ".bilibop-ai";
const INDEX_FILE = "workspace-index.json";
const MAX_CHARS_PER_CHUNK = 1200;
const MAX_LINES_PER_CHUNK = 24;
const OVERLAP_LINES = 4;
const IGNORED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".pdf",
  ".zip",
  ".gz",
  ".tar",
  ".mp4",
  ".mov",
  ".mp3",
  ".wav",
  ".wasm"
]);
export async function indexWorkspace(workspacePath: string): Promise<IndexedWorkspaceSummary> {
  const { files } = await listFilesTool.execute({ maxDepth: 8 }, { workspacePath });
  const chunks: WorkspaceChunk[] = [];
  let skippedFiles = 0;

  for (const file of files) {
    if (!isIndexableFile(file)) {
      skippedFiles += 1;
      continue;
    }

    try {
      const fileContent = await readFileTool.execute({ path: file }, { workspacePath });
      chunks.push(...chunkFile(fileContent.path, fileContent.content));
    } catch {
      skippedFiles += 1;
    }
  }

  const index: WorkspaceIndex = {
    version: 1,
    workspacePath,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    chunks
  };

  const indexPath = getIndexPath(workspacePath);
  await mkdir(path.dirname(indexPath), { recursive: true });
  await writeFile(indexPath, JSON.stringify(index, null, 2), "utf8");

  return {
    workspacePath,
    indexPath,
    fileCount: files.length,
    chunkCount: chunks.length,
    skippedFiles
  };
}

async function readIndexFile(workspacePath: string): Promise<WorkspaceIndex | undefined> {
  try {
    const raw = await readFile(getIndexPath(workspacePath), "utf8");
    return JSON.parse(raw) as WorkspaceIndex;
  } catch {
    return undefined;
  }
}

export async function loadWorkspaceIndex(workspacePath: string): Promise<WorkspaceIndex | undefined> {
  return readIndexFile(workspacePath);
}

function chunkFile(filePath: string, content: string): WorkspaceChunk[] {
  const lines = content.split(/\r?\n/);
  const chunks: WorkspaceChunk[] = [];

  let startLine = 1;

  while (startLine <= lines.length) {
    const endLine = Math.min(startLine + MAX_LINES_PER_CHUNK - 1, lines.length);
    const text = lines.slice(startLine - 1, endLine).join("\n").trim();

    if (text.length > 0) {
      chunks.push({
        filePath,
        startLine,
        endLine,
        text: text.slice(0, MAX_CHARS_PER_CHUNK),
        tokenCount: estimateTokenCount(text)
      });
    }

    if (endLine >= lines.length) {
      break;
    }

    startLine = Math.max(endLine - OVERLAP_LINES + 1, startLine + 1);
  }

  return chunks;
}

function isIndexableFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();

  if (IGNORED_EXTENSIONS.has(ext)) {
    return false;
  }

  const lower = filePath.toLowerCase();

  if (lower.includes("/.git/") || lower.startsWith(".git/")) {
    return false;
  }

  if (lower.includes("/.bilibop-ai/") || lower.startsWith(".bilibop-ai/")) {
    return false;
  }

  return true;
}

function getIndexPath(workspacePath: string): string {
  return path.join(workspacePath, INDEX_DIR, INDEX_FILE);
}

function estimateTokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

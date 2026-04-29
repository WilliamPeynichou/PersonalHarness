import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { assertInsideWorkspace } from "../security/workspaceGuard";
import type { Tool } from "./types";

export type ListFilesInput = {
  directory?: string;
  maxDepth?: number;
};

export type ListFilesOutput = {
  files: string[];
};

const DEFAULT_MAX_DEPTH = 3;
const MAX_ALLOWED_DEPTH = 8;
const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "dist", "build", "out"]);

export const listFilesTool: Tool<ListFilesInput, ListFilesOutput> = {
  name: "list_files",
  description: "Liste les fichiers du workspace en lecture seule.",
  risk: "read",
  async execute(input, context) {
    const workspacePath = path.resolve(context.workspacePath);
    const requestedDirectory = input.directory ?? ".";
    const startDirectory = resolveInsideWorkspace(workspacePath, requestedDirectory);
    const maxDepth = clampDepth(input.maxDepth);
    const files: string[] = [];

    await walkDirectory({
      workspacePath,
      currentDirectory: startDirectory,
      currentDepth: 0,
      maxDepth,
      files
    });

    files.sort((left, right) => left.localeCompare(right));

    return { files };
  }
};

type WalkDirectoryOptions = {
  workspacePath: string;
  currentDirectory: string;
  currentDepth: number;
  maxDepth: number;
  files: string[];
};

async function walkDirectory(options: WalkDirectoryOptions): Promise<void> {
  if (options.currentDepth > options.maxDepth) {
    return;
  }

  const entries = await readdir(options.currentDirectory, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(options.currentDirectory, entry.name);

    assertInsideWorkspace(options.workspacePath, absolutePath);

    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      await walkDirectory({
        workspacePath: options.workspacePath,
        currentDirectory: absolutePath,
        currentDepth: options.currentDepth + 1,
        maxDepth: options.maxDepth,
        files: options.files
      });
      continue;
    }

    if (entry.isFile()) {
      const fileStat = await stat(absolutePath);

      if (fileStat.isFile()) {
        options.files.push(toWorkspaceRelativePath(options.workspacePath, absolutePath));
      }
    }
  }
}

function resolveInsideWorkspace(workspacePath: string, targetPath: string): string {
  assertInsideWorkspace(workspacePath, targetPath);
  return path.resolve(workspacePath, targetPath);
}

function toWorkspaceRelativePath(workspacePath: string, absolutePath: string): string {
  return path.relative(workspacePath, absolutePath).split(path.sep).join("/");
}

function clampDepth(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_MAX_DEPTH;
  }

  return Math.max(0, Math.min(Math.floor(value), MAX_ALLOWED_DEPTH));
}

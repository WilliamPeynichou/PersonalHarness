import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { assertInsideWorkspace } from "../security/workspaceGuard";
import { listFilesTool } from "./listFiles";
import type { Tool } from "./types";

export type GrepInput = {
  query: string;
  include?: string;
  maxResults?: number;
};

export type GrepOutput = {
  matches: Array<{
    file: string;
    line: number;
    text: string;
  }>;
};

const DEFAULT_MAX_RESULTS = 50;
const MAX_ALLOWED_RESULTS = 200;
const MAX_FILE_BYTES = 1024 * 1024;

export const grepTool: Tool<GrepInput, GrepOutput> = {
  name: "grep",
  description: "Recherche du texte dans les fichiers du workspace en lecture seule.",
  risk: "read",
  async execute(input, context) {
    const query = input.query.trim();

    if (query.length === 0) {
      return { matches: [] };
    }

    const maxResults = clampResults(input.maxResults);
    const { files } = await listFilesTool.execute({ maxDepth: 8 }, context);
    const matches: GrepOutput["matches"] = [];

    for (const file of files) {
      if (!matchesInclude(file, input.include)) {
        continue;
      }

      const absolutePath = path.resolve(context.workspacePath, file);
      assertInsideWorkspace(context.workspacePath, absolutePath);

      const fileStat = await stat(absolutePath);

      if (fileStat.size > MAX_FILE_BYTES) {
        continue;
      }

      const content = await readFile(absolutePath, "utf8");

      if (content.includes("\u0000")) {
        continue;
      }

      for (const [index, line] of content.split(/\r?\n/).entries()) {
        if (line.includes(query)) {
          matches.push({
            file,
            line: index + 1,
            text: line
          });

          if (matches.length >= maxResults) {
            return { matches };
          }
        }
      }
    }

    return { matches };
  }
};

function clampResults(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_MAX_RESULTS;
  }

  return Math.max(1, Math.min(Math.floor(value), MAX_ALLOWED_RESULTS));
}

function matchesInclude(filePath: string, include: string | undefined): boolean {
  if (!include) {
    return true;
  }

  if (!include.includes("*")) {
    return filePath.includes(include);
  }

  const escaped = include
    .split("*")
    .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, "\\$&"))
    .join(".*");

  return new RegExp(`^${escaped}$`).test(filePath);
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import { assertInsideWorkspace } from "../security/workspaceGuard";
import type { Tool } from "./types";

export type ReadFileInput = {
  path: string;
};

export type ReadFileOutput = {
  path: string;
  content: string;
};

export const readFileTool: Tool<ReadFileInput, ReadFileOutput> = {
  name: "read_file",
  description: "Lit un fichier du workspace en lecture seule.",
  risk: "read",
  async execute(input, context) {
    const absolutePath = resolveInsideWorkspace(context.workspacePath, input.path);
    const content = await readFile(absolutePath, "utf8");

    return {
      path: toWorkspaceRelativePath(context.workspacePath, absolutePath),
      content
    };
  }
};

function resolveInsideWorkspace(workspacePath: string, targetPath: string): string {
  assertInsideWorkspace(workspacePath, targetPath);
  return path.resolve(workspacePath, targetPath);
}

function toWorkspaceRelativePath(workspacePath: string, absolutePath: string): string {
  return path.relative(path.resolve(workspacePath), absolutePath).split(path.sep).join("/");
}

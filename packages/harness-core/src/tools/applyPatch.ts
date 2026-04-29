import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertAllowedWorkspacePath } from "../security/workspaceGuard";
import type { ProposedDiff } from "../types";
import type { Tool } from "./types";

export type ApplyPatchInput = {
  diff: ProposedDiff;
};

export type ApplyPatchOutput = {
  path: string;
  applied: boolean;
  rollbackAvailable: boolean;
};

const backupStore = new Map<string, string>();

export const applyPatchTool: Tool<ApplyPatchInput, ApplyPatchOutput> = {
  name: "apply_patch",
  description: "Applique un diff proposé après validation utilisateur.",
  risk: "write",
  async execute(input, context) {
    const absolutePath = resolveInsideWorkspace(context.workspacePath, input.diff.filePath);
    const currentContent = await readFile(absolutePath, "utf8");

    if (currentContent !== input.diff.originalContent) {
      throw new Error(`Le fichier a changé depuis la proposition du diff : ${input.diff.filePath}`);
    }

    const backupKey = getBackupKey(context.workspacePath, input.diff.filePath);
    if (!backupStore.has(backupKey)) {
      backupStore.set(backupKey, currentContent);
    }

    try {
      await writeFile(absolutePath, input.diff.newContent, "utf8");
    } catch (error) {
      const backup = backupStore.get(backupKey);

      if (backup !== undefined) {
        await writeFile(absolutePath, backup, "utf8");
      }

      throw error;
    }

    return {
      path: input.diff.filePath,
      applied: true,
      rollbackAvailable: true
    };
  }
};

function resolveInsideWorkspace(workspacePath: string, targetPath: string): string {
  assertAllowedWorkspacePath(workspacePath, targetPath);
  return path.resolve(workspacePath, targetPath);
}

function getBackupKey(workspacePath: string, filePath: string): string {
  return `${path.resolve(workspacePath)}::${filePath}`;
}

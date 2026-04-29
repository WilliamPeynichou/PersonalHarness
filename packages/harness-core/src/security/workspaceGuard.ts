import { realpathSync } from "node:fs";
import path from "node:path";

export function assertInsideWorkspace(workspacePath: string, targetPath: string): void {
  const workspace = path.resolve(workspacePath);
  const target = path.resolve(workspace, targetPath);

  assertInsideResolvedPath(workspace, target);

  const realWorkspace = realpathSync.native(workspace);

  try {
    const realTarget = realpathSync.native(target);
    assertInsideResolvedPath(realWorkspace, realTarget);
  } catch (error) {
    if (isNotFoundError(error)) {
      return;
    }

    throw error;
  }
}

function assertInsideResolvedPath(workspacePath: string, targetPath: string): void {
  const relativePath = path.relative(workspacePath, targetPath);

  if (relativePath === "") {
    return;
  }

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Path is outside workspace: ${targetPath}`);
  }
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

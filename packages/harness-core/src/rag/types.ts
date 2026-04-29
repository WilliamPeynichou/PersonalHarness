export type WorkspaceChunk = {
  filePath: string;
  startLine: number;
  endLine: number;
  text: string;
  tokenCount: number;
};

export type WorkspaceIndex = {
  version: 1;
  workspacePath: string;
  createdAt: string;
  updatedAt: string;
  chunks: WorkspaceChunk[];
};

export type IndexedWorkspaceSummary = {
  workspacePath: string;
  indexPath: string;
  fileCount: number;
  chunkCount: number;
  skippedFiles: number;
};

export type RetrievedChunk = WorkspaceChunk & {
  score: number;
};

import { createHash } from "node:crypto";
import path from "node:path";
import type { HarnessRequest, ProposedDiff } from "../types";
import { readFileTool } from "../tools/readFile";

export async function createProposedDiff(request: HarnessRequest): Promise<ProposedDiff> {
  if (!request.workspacePath) {
    throw new Error("workspacePath est requis pour proposer un diff.");
  }

  if (!request.activeFile) {
    throw new Error("Aucun fichier actif disponible pour proposer un diff.");
  }

  const original = await readFileTool.execute(
    {
      path: request.activeFile
    },
    {
      workspacePath: request.workspacePath
    }
  );

  const newContent = buildProposedContent(original.content, request);

  return {
    id: createDiffId(original.path, original.content, newContent),
    filePath: original.path,
    originalContent: original.content,
    newContent,
    summary: `Proposition de modification pour ${original.path}. Aucun fichier n'a été modifié.`
  };
}

export function isDiffRequest(prompt: string): boolean {
  const normalized = normalize(prompt);

  return (
    normalized.includes("propose un diff") ||
    normalized.includes("proposer un diff") ||
    normalized.includes("propose une modification") ||
    normalized.includes("modifie") ||
    normalized.includes("modifier") ||
    normalized.includes("change") ||
    normalized.includes("corrige") ||
    normalized.includes("ajoute") ||
    normalized.includes("update")
  );
}

function buildProposedContent(originalContent: string, request: HarnessRequest): string {
  const instruction = request.prompt.trim();
  const safeInstruction = instruction.length > 0 ? instruction : "Modification demandée par l'utilisateur.";
  const proposedComment = formatProposedComment(request.activeFile, safeInstruction);

  if (request.selection && request.selection.length > 0 && originalContent.includes(request.selection)) {
    const replacement = [
      proposedComment,
      request.selection
    ].join("\n");

    return originalContent.replace(request.selection, replacement);
  }

  const separator = originalContent.endsWith("\n") || originalContent.length === 0 ? "" : "\n";

  return [
    originalContent,
    separator,
    proposedComment,
    ""
  ].join("\n");
}

function formatProposedComment(filePath: string | undefined, instruction: string): string {
  const extension = path.extname(filePath ?? "").toLowerCase();
  const text = `Proposition Bilibop AI : ${instruction}`;

  if ([".md", ".markdown", ".html", ".xml", ".svg"].includes(extension)) {
    return `<!-- ${text} -->`;
  }

  if ([".css", ".scss", ".less"].includes(extension)) {
    return `/* ${text} */`;
  }

  if ([".py", ".sh", ".rb", ".yml", ".yaml", ".toml"].includes(extension)) {
    return `# ${text}`;
  }

  return `// ${text}`;
}

function createDiffId(filePath: string, originalContent: string, newContent: string): string {
  return createHash("sha256")
    .update(filePath)
    .update(originalContent)
    .update(newContent)
    .digest("hex")
    .slice(0, 16);
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

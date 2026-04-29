import type { HarnessRequest, HarnessResponse, HarnessStreamEvent } from "./types";
import { createProposedDiff, isDiffRequest } from "./diffs/proposeDiff";
import { createOpenAIProviderFromEnv } from "./providers/openaiProvider";
import type { LLMMessage, LLMProvider } from "./providers/types";
import { listFilesTool } from "./tools/listFiles";

export async function runHarness(request: HarnessRequest): Promise<HarnessResponse> {
  const prompt = request.prompt.trim();

  if (shouldListFiles(prompt)) {
    if (!request.workspacePath) {
      return {
        answer: "Impossible de lister les fichiers : aucun workspacePath fourni.",
        events: [
          {
            type: "error",
            message: "workspacePath est requis pour utiliser list_files."
          }
        ]
      };
    }

    const args = { maxDepth: 2 };
    const events: HarnessResponse["events"] = [
      {
        type: "tool_call_started",
        tool: listFilesTool.name,
        args
      }
    ];

    const result = await listFilesTool.execute(args, { workspacePath: request.workspacePath });

    events.push({
      type: "tool_call_finished",
      tool: listFilesTool.name,
      result
    });

    return {
      answer: formatFileList(result.files),
      events
    };
  }

  if (isDiffRequest(prompt)) {
    try {
      const proposedDiff = await createProposedDiff(request);

      return {
        answer: `Diff proposé pour ${proposedDiff.filePath} : ${proposedDiff.summary}`,
        events: [
          {
            type: "message",
            text: "Diff proposé généré sans modification du filesystem."
          }
        ],
        proposedDiffs: [proposedDiff]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de proposer un diff.";

      return {
        answer: message,
        events: [
          {
            type: "error",
            message
          }
        ]
      };
    }
  }

  try {
    const provider = createOpenAIProviderFromEnv();
    const answer = await provider.complete(buildMessages(request));

    return {
      answer,
      events: [
        {
          type: "message",
          text: `Réponse générée par ${provider.name}.`
        }
      ]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue du provider IA.";

    return {
      answer: message,
      events: [
        {
          type: "error",
          message
        }
      ]
    };
  }
}

export async function* runHarnessStream(request: HarnessRequest): AsyncGenerator<HarnessStreamEvent> {
  const prompt = request.prompt.trim();

  if (shouldListFiles(prompt)) {
    if (!request.workspacePath) {
      yield {
        type: "error",
        message: "workspacePath est requis pour utiliser list_files."
      };
      yield { type: "done" };
      return;
    }

    const args = { maxDepth: 2 };

    yield {
      type: "tool_call_started",
      tool: listFilesTool.name,
      args
    };

    const result = await listFilesTool.execute(args, { workspacePath: request.workspacePath });

    yield {
      type: "tool_call_finished",
      tool: listFilesTool.name,
      result
    };

    for (const chunk of chunkText(formatFileList(result.files))) {
      yield {
        type: "message_delta",
        text: chunk
      };
    }

    yield { type: "done" };
    return;
  }

  if (isDiffRequest(prompt)) {
    try {
      const proposedDiff = await createProposedDiff(request);

      yield {
        type: "proposed_diff",
        diff: proposedDiff
      };
      yield {
        type: "message_delta",
        text: `Diff proposé pour ${proposedDiff.filePath}. Aucun fichier n'a été modifié.`
      };
      yield { type: "done" };
    } catch (error) {
      yield {
        type: "error",
        message: error instanceof Error ? error.message : "Impossible de proposer un diff."
      };
      yield { type: "done" };
    }

    return;
  }

  try {
    const provider = createOpenAIProviderFromEnv();

    yield* streamProviderAnswer(provider, buildMessages(request));
    yield { type: "done" };
  } catch (error) {
    yield {
      type: "error",
      message: error instanceof Error ? error.message : "Erreur inconnue du provider IA."
    };
    yield { type: "done" };
  }
}

function shouldListFiles(prompt: string): boolean {
  const normalized = normalize(prompt);

  return (
    normalized.includes("liste les fichiers") ||
    normalized.includes("lister les fichiers") ||
    normalized.includes("liste fichiers") ||
    normalized.includes("list files")
  );
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatFileList(files: string[]): string {
  if (files.length === 0) {
    return "Aucun fichier trouvé dans le workspace.";
  }

  return `Fichiers du projet :\n${files.map((file) => `- ${file}`).join("\n")}`;
}

function buildMessages(request: HarnessRequest): LLMMessage[] {
  return [
    {
      role: "system",
      content: [
        "Tu es Bilibop AI, un assistant intégré à une extension VS Code.",
        "Réponds en français, de manière concise et utile.",
        "Utilise uniquement le contexte VS Code fourni dans le message utilisateur.",
        "Ne prétends pas avoir lu des fichiers qui ne sont pas présents dans ce contexte."
      ].join(" ")
    },
    {
      role: "user",
      content: [
        `Instruction utilisateur : ${request.prompt}`,
        "",
        "Contexte VS Code :",
        `- workspacePath: ${request.workspacePath ?? "non fourni"}`,
        `- activeFile: ${request.activeFile ?? "non fourni"}`,
        `- languageId: ${request.languageId ?? "non fourni"}`,
        `- selection: ${formatSelection(request.selection)}`,
        `- openTabs: ${request.openTabs?.join(", ") || "aucun"}`
      ].join("\n")
    }
  ];
}

function formatSelection(selection: string | undefined): string {
  if (!selection) {
    return "non fournie";
  }

  const normalized = selection.replace(/\s+/g, " ").trim();
  const preview = normalized.length > 2000 ? `${normalized.slice(0, 2000)}...` : normalized;

  return `${selection.length} caractères (${preview})`;
}

async function* streamProviderAnswer(provider: LLMProvider, messages: LLMMessage[]): AsyncGenerator<HarnessStreamEvent> {
  if (provider.stream) {
    for await (const text of provider.stream(messages)) {
      yield {
        type: "message_delta",
        text
      };
    }

    return;
  }

  const answer = await provider.complete(messages);

  for (const chunk of chunkText(answer)) {
    yield {
      type: "message_delta",
      text: chunk
    };
  }
}

function chunkText(text: string): string[] {
  if (text.length === 0) {
    return [];
  }

  return text.match(/[\s\S]{1,80}/g) ?? [text];
}

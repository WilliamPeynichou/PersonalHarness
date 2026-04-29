import * as vscode from "vscode";
import {
  applyPatchTool,
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_PROVIDER,
  isProviderId,
  listModels,
  runHarnessStream,
  STATIC_MODEL_CATALOG
} from "harness-core";
import type { ModelDescriptor, ProviderId } from "harness-core";
import { getWebviewHtml } from "./getWebviewHtml";

const STATE_PROVIDER_KEY = "bilibop.lastProvider";
const STATE_MODEL_KEY = "bilibop.lastModel";

type WebviewMessage = {
  type?: string;
  prompt?: unknown;
  diff?: unknown;
  provider?: unknown;
  model?: unknown;
};

export class BilibopSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "bilibop.chatView";

  public constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly workspaceState: vscode.Memento
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")]
    };

    webviewView.webview.html = getWebviewHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      if (message.type === "request_models") {
        await handleRequestModels(webviewView, message);
        return;
      }

      if (message.type === "request_initial_state") {
        await handleRequestInitialState(webviewView, this.workspaceState);
        return;
      }

      if (message.type === "user_prompt" && typeof message.prompt === "string") {
        await this.handleUserPrompt(webviewView, message);
        return;
      }

      if (message.type === "apply_proposed_diff") {
        await handleApplyProposedDiffMessage(webviewView, message);
        return;
      }
    });
  }

  private async handleUserPrompt(webviewView: vscode.WebviewView, message: WebviewMessage): Promise<void> {
    const prompt = (message.prompt as string).trim();
    const workspacePath = getWorkspacePath();

    if (!workspacePath) {
      await webviewView.webview.postMessage({
        type: "harness_event",
        event: {
          type: "error",
          message: "Aucun workspace ouvert. Ouvre un dossier dans VS Code avant d'utiliser Bilibop AI."
        }
      });
      await webviewView.webview.postMessage({
        type: "harness_event",
        event: { type: "done" }
      });
      return;
    }

    const provider = isProviderId(message.provider) ? message.provider : DEFAULT_PROVIDER;
    const model = typeof message.model === "string" && message.model.length > 0
      ? message.model
      : DEFAULT_MODEL_BY_PROVIDER[provider];

    await this.workspaceState.update(STATE_PROVIDER_KEY, provider);
    await this.workspaceState.update(STATE_MODEL_KEY, model);

    const activeEditor = vscode.window.activeTextEditor;
    const request = {
      prompt,
      workspacePath,
      activeFile: getActiveFile(activeEditor),
      selection: getSelection(activeEditor),
      openTabs: getOpenTabs(),
      languageId: activeEditor?.document.languageId,
      provider,
      model
    };

    for await (const event of runHarnessStream(request)) {
      await webviewView.webview.postMessage({
        type: "harness_event",
        event
      });
    }
  }
}

async function handleRequestInitialState(
  webviewView: vscode.WebviewView,
  workspaceState: vscode.Memento
): Promise<void> {
  const storedProvider = workspaceState.get<string>(STATE_PROVIDER_KEY);
  const storedModel = workspaceState.get<string>(STATE_MODEL_KEY);

  const provider: ProviderId = isProviderId(storedProvider) ? storedProvider : DEFAULT_PROVIDER;
  const model = storedModel ?? DEFAULT_MODEL_BY_PROVIDER[provider];

  await webviewView.webview.postMessage({
    type: "initial_state",
    provider,
    model
  });
}

async function handleRequestModels(webviewView: vscode.WebviewView, message: WebviewMessage): Promise<void> {
  const provider: ProviderId = isProviderId(message.provider) ? message.provider : DEFAULT_PROVIDER;

  let models: ModelDescriptor[];
  try {
    models = await listModels(provider);
  } catch {
    models = [];
  }

  if (models.length === 0) {
    models = STATIC_MODEL_CATALOG[provider];
  }

  await webviewView.webview.postMessage({
    type: "models_list",
    provider,
    models
  });
}

async function handleApplyProposedDiffMessage(
  webviewView: vscode.WebviewView,
  message: WebviewMessage
): Promise<void> {
  if (!message.diff || typeof message.diff !== "object") {
    await webviewView.webview.postMessage({
      type: "apply_result",
      success: false,
      message: "Aucun diff proposé à appliquer."
    });
    return;
  }

  const workspacePath = getWorkspacePath();

  if (!workspacePath) {
    await webviewView.webview.postMessage({
      type: "apply_result",
      success: false,
      message: "Aucun workspace ouvert. Ouvre un dossier dans VS Code avant d'appliquer un diff."
    });
    return;
  }

  try {
    const result = await applyPatchTool.execute(
      {
        diff: message.diff as Parameters<typeof applyPatchTool.execute>[0]["diff"]
      },
      {
        workspacePath
      }
    );

    await webviewView.webview.postMessage({
      type: "apply_result",
      success: true,
      diffId: (message.diff as { id?: string }).id,
      message: `Diff appliqué pour ${result.path}. Restauration mémoire disponible.`
    });
  } catch (error) {
    await webviewView.webview.postMessage({
      type: "apply_result",
      success: false,
      diffId: (message.diff as { id?: string }).id,
      message: error instanceof Error ? error.message : "Impossible d'appliquer le diff."
    });
  }
}

function getWorkspacePath(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function getActiveFile(editor: vscode.TextEditor | undefined): string | undefined {
  if (!editor || editor.document.uri.scheme !== "file") {
    return undefined;
  }

  return editor.document.uri.fsPath;
}

function getSelection(editor: vscode.TextEditor | undefined): string | undefined {
  if (!editor || editor.selection.isEmpty) {
    return undefined;
  }

  return editor.document.getText(editor.selection);
}

function getOpenTabs(): string[] {
  const paths = vscode.window.tabGroups.all.flatMap((group) => {
    return group.tabs
      .map((tab) => tab.input)
      .filter((input): input is vscode.TabInputText => input instanceof vscode.TabInputText)
      .filter((input) => input.uri.scheme === "file")
      .map((input) => input.uri.fsPath);
  });

  return Array.from(new Set(paths));
}

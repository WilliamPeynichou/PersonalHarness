import * as vscode from "vscode";
import { runHarnessStream } from "harness-core";
import { getWebviewHtml } from "./getWebviewHtml";

type WebviewMessage = {
  type?: string;
  prompt?: unknown;
};

export class BilibopSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "bilibop-ai.chatView";

  public constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")]
    };

    webviewView.webview.html = getWebviewHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      if (message.type !== "user_prompt" || typeof message.prompt !== "string") {
        return;
      }

      const prompt = message.prompt.trim();
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
          event: {
            type: "done"
          }
        });
        return;
      }

      const activeEditor = vscode.window.activeTextEditor;
      const request = {
        prompt,
        workspacePath,
        activeFile: getActiveFile(activeEditor),
        selection: getSelection(activeEditor),
        openTabs: getOpenTabs(),
        languageId: activeEditor?.document.languageId
      };

      for await (const event of runHarnessStream(request)) {
        await webviewView.webview.postMessage({
          type: "harness_event",
          event
        });
      }
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

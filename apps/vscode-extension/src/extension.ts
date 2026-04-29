import * as vscode from "vscode";
import { indexWorkspace } from "harness-core";
import { BilibopSidebarProvider } from "./sidebar/BilibopSidebarProvider";

export function activate(context: vscode.ExtensionContext) {
  const sidebarProvider = new BilibopSidebarProvider(context.extensionUri, context.workspaceState);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(BilibopSidebarProvider.viewType, sidebarProvider)
  );

  const disposable = vscode.commands.registerCommand("bilibop-ai-sidebar.helloWorld", () => {
    vscode.window.showInformationMessage("Bilibop AI extension is running.");
  });

  const indexWorkspaceDisposable = vscode.commands.registerCommand(
    "bilibop-ai-sidebar.indexWorkspace",
    async () => {
      const workspacePath = getWorkspacePath();

      if (!workspacePath) {
        vscode.window.showWarningMessage("Ouvre un workspace avant d'indexer le projet.");
        return;
      }

      const summary = await indexWorkspace(workspacePath);
      vscode.window.showInformationMessage(
        `Workspace indexé : ${summary.fileCount} fichiers, ${summary.chunkCount} chunks, ${summary.skippedFiles} fichiers ignorés.`
      );
    }
  );

  context.subscriptions.push(disposable, indexWorkspaceDisposable);
}

export function deactivate() {}

function getWorkspacePath(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

import * as vscode from "vscode";
import { BilibopSidebarProvider } from "./sidebar/BilibopSidebarProvider";

export function activate(context: vscode.ExtensionContext) {
  const sidebarProvider = new BilibopSidebarProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(BilibopSidebarProvider.viewType, sidebarProvider)
  );

  const disposable = vscode.commands.registerCommand("bilibop-ai-sidebar.helloWorld", () => {
    vscode.window.showInformationMessage("Bilibop AI extension is running.");
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

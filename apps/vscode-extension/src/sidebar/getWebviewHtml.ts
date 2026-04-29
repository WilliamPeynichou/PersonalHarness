import * as vscode from "vscode";

export function getWebviewHtml(webview: vscode.Webview): string {
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Bilibop AI</title>
  <style>
    :root {
      color-scheme: light dark;
    }

    body {
      margin: 0;
      padding: 16px;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }

    .layout {
      display: flex;
      min-height: calc(100vh - 32px);
      flex-direction: column;
      gap: 12px;
    }

    h1 {
      margin: 0;
      color: var(--vscode-sideBarTitle-foreground);
      font-size: 16px;
      font-weight: 600;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }

    textarea {
      box-sizing: border-box;
      width: 100%;
      min-height: 112px;
      resize: vertical;
      padding: 9px 10px;
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 4px;
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      font: inherit;
      line-height: 1.45;
    }

    textarea:focus {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    button {
      width: 100%;
      min-height: 32px;
      border: 0;
      border-radius: 4px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .response {
      flex: 1;
      min-height: 96px;
      padding: 10px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      line-height: 1.45;
      white-space: pre-wrap;
    }

    .response[data-empty="true"] {
      color: var(--vscode-descriptionForeground);
    }

    .events {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-height: 36px;
      padding: 8px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-sideBarSectionHeader-background);
      font-size: 12px;
      line-height: 1.35;
    }

    .event {
      overflow-wrap: anywhere;
    }

    .diffs {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .diff-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 10px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      background: var(--vscode-editorWidget-background);
    }

    .diff-title {
      margin: 0;
      color: var(--vscode-foreground);
      font-size: 13px;
      font-weight: 600;
    }

    .diff-meta,
    .diff-summary,
    .diff-status {
      margin: 0;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }

    .diff-actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }

    .diff-actions button {
      min-height: 28px;
      padding: 0 6px;
      font-size: 12px;
      font-weight: 500;
    }

    .diff-actions button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .diff-preview {
      display: none;
      max-height: 260px;
      overflow: auto;
      margin: 0;
      padding: 8px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      font-family: var(--vscode-editor-font-family);
      font-size: var(--vscode-editor-font-size);
      white-space: pre-wrap;
    }

    .diff-preview[data-visible="true"] {
      display: block;
    }
  </style>
</head>
<body>
  <main class="layout">
    <h1>Bilibop AI</h1>
    <label for="prompt">
      Instruction utilisateur
      <textarea id="prompt" placeholder="Décris ce que tu veux demander à l'agent."></textarea>
    </label>
    <button id="send" type="button">Envoyer</button>
    <section id="response" class="response" data-empty="true" aria-live="polite">Réponse mockée en attente.</section>
    <section id="diffs" class="diffs" aria-live="polite"></section>
    <section id="events" class="events" aria-live="polite"></section>
  </main>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const textarea = document.getElementById("prompt");
    const sendButton = document.getElementById("send");
    const response = document.getElementById("response");
    const diffs = document.getElementById("diffs");
    const events = document.getElementById("events");

    sendButton.addEventListener("click", () => {
      response.textContent = "";
      response.dataset.empty = "true";
      diffs.textContent = "";
      events.textContent = "";
      sendButton.disabled = true;

      vscode.postMessage({
        type: "user_prompt",
        prompt: textarea.value
      });
    });

    textarea.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        sendButton.click();
      }
    });

    window.addEventListener("message", (event) => {
      const message = event.data;

      if (message.type === "assistant_response") {
        response.textContent = message.text;
        response.dataset.empty = "false";
      }

      if (message.type === "harness_event") {
        handleHarnessEvent(message.event);
      }
    });

    function handleHarnessEvent(event) {
      if (!event || typeof event.type !== "string") {
        return;
      }

      if (event.type === "message_delta") {
        response.textContent += event.text;
        response.dataset.empty = "false";
        return;
      }

      if (event.type === "proposed_diff") {
        renderProposedDiff(event.diff);
        appendEvent("Diff proposé : " + event.diff.filePath);
        return;
      }

      if (event.type === "tool_call_started") {
        appendEvent("Tool démarré : " + event.tool);
        return;
      }

      if (event.type === "tool_call_finished") {
        appendEvent("Tool terminé : " + event.tool);
        return;
      }

      if (event.type === "permission_required") {
        appendEvent("Permission requise : " + event.reason);
        return;
      }

      if (event.type === "error") {
        response.textContent = event.message;
        response.dataset.empty = "false";
        appendEvent("Erreur : " + event.message);
        sendButton.disabled = false;
        return;
      }

      if (event.type === "done") {
        sendButton.disabled = false;
      }
    }

    function appendEvent(text) {
      const item = document.createElement("div");
      item.className = "event";
      item.textContent = text;
      events.appendChild(item);
    }

    function renderProposedDiff(diff) {
      if (!diff) {
        return;
      }

      const card = document.createElement("article");
      card.className = "diff-card";

      const title = document.createElement("h2");
      title.className = "diff-title";
      title.textContent = "Diff proposé";

      const file = document.createElement("p");
      file.className = "diff-meta";
      file.textContent = "Fichier concerné : " + diff.filePath;

      const summary = document.createElement("p");
      summary.className = "diff-summary";
      summary.textContent = diff.summary;

      const actions = document.createElement("div");
      actions.className = "diff-actions";

      const viewButton = document.createElement("button");
      viewButton.type = "button";
      viewButton.textContent = "Voir diff";

      const acceptButton = document.createElement("button");
      acceptButton.type = "button";
      acceptButton.textContent = "Accepter";
      acceptButton.disabled = true;
      acceptButton.title = "L'application de diff sera ajoutée à l'étape 10.";

      const rejectButton = document.createElement("button");
      rejectButton.type = "button";
      rejectButton.textContent = "Refuser";

      const preview = document.createElement("pre");
      preview.className = "diff-preview";
      preview.dataset.visible = "false";
      preview.textContent = formatDiffPreview(diff);

      const status = document.createElement("p");
      status.className = "diff-status";
      status.textContent = "En attente de validation. Aucun fichier n'a été modifié.";

      viewButton.addEventListener("click", () => {
        const isVisible = preview.dataset.visible === "true";
        preview.dataset.visible = String(!isVisible);
        viewButton.textContent = isVisible ? "Voir diff" : "Masquer";
      });

      rejectButton.addEventListener("click", () => {
        status.textContent = "Diff refusé localement. Aucun fichier n'a été modifié.";
        rejectButton.disabled = true;
      });

      actions.append(viewButton, acceptButton, rejectButton);
      card.append(title, file, summary, actions, preview, status);
      diffs.appendChild(card);
    }

    function formatDiffPreview(diff) {
      return [
        "--- " + diff.filePath,
        "+++ " + diff.filePath + " (proposé)",
        "",
        "@@ Contenu original @@",
        diff.originalContent,
        "",
        "@@ Nouveau contenu proposé @@",
        diff.newContent
      ].join("\\n");
    }
  </script>
</body>
</html>`;
}

function getNonce(): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";

  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

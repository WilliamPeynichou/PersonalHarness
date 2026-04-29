# Plan de développement — Front VS Code minimal + sidebar IA + harness maison

## 0. Cadrage strict

Objectif : créer un éditeur basé sur l’expérience front de VS Code, avec une sidebar IA maison branchée sur un harness contrôlé par nous.

Le projet ne doit pas commencer par un fork Code-OSS complet. Le développement commence par une extension VS Code classique, car c’est le chemin le plus rapide pour valider la sidebar, le bridge avec l’éditeur et le harness.

Le fork Code-OSS arrive uniquement quand l’extension + harness fonctionnent déjà.

### Ce que le projet doit faire

- Afficher une sidebar IA dans l’Activity Bar de VS Code.
- Envoyer un prompt utilisateur depuis la sidebar vers l’extension.
- Brancher l’extension sur un module `harness-core` maison.
- Faire évoluer le harness par étapes : mock, tools lecture seule, providers IA, diff, écriture contrôlée, RAG local.
- Garder la logique IA hors du front.
- Préparer plus tard une distribution Code-OSS minimale avec la sidebar IA préinstallée.

### Ce que le projet ne doit pas faire au début

- Ne pas forker Code-OSS au début.
- Ne pas créer de marketplace.
- Ne pas gérer les extensions tierces.
- Ne pas faire un agent complet dès la première étape.
- Ne pas intégrer directement OpenAI / Claude avant que le harness mock soit branché.
- Ne pas donner à un agent IA une mission globale du type “fais tout le projet”.

---

## 1. Références techniques à consulter

Ces références justifient les choix du plan :

- VS Code — première extension : `https://code.visualstudio.com/api/get-started/your-first-extension`
- VS Code — Webview API : `https://code.visualstudio.com/api/extension-guides/webview`
- VS Code — Activity Bar : `https://code.visualstudio.com/api/ux-guidelines/activity-bar`
- VS Code — Views et View Containers : `https://code.visualstudio.com/api/ux-guidelines/views`
- VS Code — Contribution Points : `https://code.visualstudio.com/api/references/contribution-points`
- VS Code — API reference : `https://code.visualstudio.com/api/references/vscode-api`
- VS Code — source code organization : `https://github.com/microsoft/vscode/wiki/source-code-organization`
- VS Code — build from source : `https://github.com/microsoft/vscode/wiki/How-to-Contribute`

Points retenus :

- Une extension VS Code peut être scaffoldée avec `npx --package yo --package generator-code -- yo code`.
- Une extension peut ajouter un View Container dans l’Activity Bar.
- Une Webview permet d’afficher une UI HTML/CSS/JS personnalisée.
- La communication Webview vers extension passe par `acquireVsCodeApi().postMessage()`.
- La communication extension vers Webview passe par `webview.postMessage()`.
- Les Webviews doivent utiliser une Content Security Policy stricte.
- Les extensions tournent dans un processus séparé appelé `extension host`, ce qui permet de développer la sidebar sans modifier le cœur de VS Code.

---

## 2. Architecture cible

```txt
bilibop-ai-ide/
├─ docs/
│  └─ PLAN_DEVELOPPEMENT.md
├─ apps/
│  └─ vscode-extension/              # Extension VS Code interne avec sidebar IA
├─ packages/
│  └─ harness-core/                  # Logique agentique testable hors VS Code
├─ scripts/
│  ├─ dev.sh
│  ├─ test.sh
│  └─ lint.sh
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ README.md
```

Architecture runtime :

```txt
Utilisateur
  ↓
Sidebar Webview
  ↓ postMessage
Extension VS Code
  ↓ appel TypeScript local
harness-core
  ↓
Tools / Providers IA / RAG / Diff / Permissions
  ↓
Extension VS Code
  ↓ postMessage
Sidebar Webview
```

À terme, une variante plus isolée pourra être ajoutée :

```txt
Extension VS Code
  ↓ HTTP localhost ou IPC
harness-server
  ↓
harness-core
```

Mais pour le démarrage, il faut garder simple : l’extension appelle directement `harness-core`.

---

## 3. Ordre de développement obligatoire

Ne pas sauter d’étape.

```txt
Étape 0  — Initialiser le repo
Étape 1  — Créer une extension VS Code minimale
Étape 2  — Ajouter une sidebar IA mockée
Étape 3  — Créer le package harness-core mocké
Étape 4  — Brancher sidebar → extension → harness-core → sidebar
Étape 5  — Ajouter les premiers tools lecture seule
Étape 6  — Ajouter la récupération du contexte VS Code
Étape 7  — Ajouter un provider IA OpenAI ou Anthropic
Étape 8  — Ajouter le streaming d’événements
Étape 9  — Ajouter le système de diff proposé
Étape 10 — Ajouter l’écriture contrôlée après validation utilisateur
Étape 11 — Ajouter le RAG local
Étape 12 — Ajouter les tests et la sécurité minimum
Étape 13 — Préparer le fork Code-OSS minimal
```

Le fork Code-OSS ne doit pas commencer avant la fin de l’étape 12.

---

# Étape 0 — Initialisation du repo

## Objectif

Créer un monorepo propre prêt pour l’extension VS Code et le harness.

## Commandes

```bash
mkdir bilibop-ai-ide
cd bilibop-ai-ide

git init
mkdir -p docs apps packages scripts
pnpm init
```

Créer `pnpm-workspace.yaml` :

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Créer `README.md` :

```md
# Bilibop AI IDE

Front VS Code minimal avec sidebar IA et harness maison.

Le projet démarre comme une extension VS Code classique. Le fork Code-OSS viendra plus tard.
```

Placer ce document ici :

```txt
docs/PLAN_DEVELOPPEMENT.md
```

## Critères de validation

- Le repo est initialisé avec Git.
- Le fichier `docs/PLAN_DEVELOPPEMENT.md` existe.
- `pnpm-workspace.yaml` existe.
- La structure de dossiers est propre.

## Commit attendu

```bash
git add .
git commit -m "chore: initialize monorepo"
```

## Prompt à donner à 5.5 pour cette étape

```txt
Tu es dans mon repo bilibop-ai-ide.

Objectif unique : initialiser proprement le monorepo.

Contraintes :
- Ne pas créer l’extension VS Code maintenant.
- Ne pas créer de harness maintenant.
- Ne pas intégrer OpenAI, Claude ou RAG.
- Créer uniquement la structure de base.

À faire :
- Créer pnpm-workspace.yaml.
- Créer README.md.
- Créer les dossiers docs, apps, packages, scripts.
- Vérifier que docs/PLAN_DEVELOPPEMENT.md est bien le document de référence.

Livrable :
- Structure propre.
- Aucun code inutile.
- Commandes de validation.
```

---

# Étape 1 — Créer une extension VS Code minimale

## Objectif

Créer une extension VS Code TypeScript qui compile et s’ouvre dans l’Extension Development Host.

## Commande recommandée

Depuis la racine :

```bash
cd apps
npx --package yo --package generator-code -- yo code
```

Choix recommandés :

```txt
Type: New Extension (TypeScript)
Name: bilibop-ai-sidebar
Identifier: bilibop-ai-sidebar
Description: Sidebar IA branchée sur harness maison
Package manager: pnpm ou npm selon disponibilité
Bundler: esbuild si proposé
```

Renommer ou déplacer le dossier généré en :

```txt
apps/vscode-extension/
```

## Structure attendue

```txt
apps/vscode-extension/
├─ src/
│  └─ extension.ts
├─ package.json
├─ tsconfig.json
├─ README.md
└─ .vscode/
   ├─ launch.json
   └─ tasks.json
```

## Critères de validation

Depuis `apps/vscode-extension` :

```bash
pnpm install
pnpm run compile
```

Puis dans VS Code :

```txt
F5
→ une fenêtre Extension Development Host s’ouvre
→ la commande générée par défaut est disponible
```

## Commit attendu

```bash
git add .
git commit -m "feat: scaffold VS Code extension"
```

## Prompt à donner à 5.5

```txt
Lis docs/PLAN_DEVELOPPEMENT.md.

Objectif unique : créer une extension VS Code TypeScript minimale dans apps/vscode-extension.

Contraintes :
- Ne pas créer de sidebar IA encore.
- Ne pas créer de harness.
- Ne pas appeler OpenAI ou Claude.
- Ne pas forker Code-OSS.
- Garder le code généré aussi minimal que possible.

À faire :
- Générer ou préparer une extension VS Code TypeScript.
- Vérifier que npm/pnpm compile.
- Documenter dans apps/vscode-extension/README.md comment lancer l’extension avec F5.

Critère de validation :
- L’extension compile.
- Une fenêtre Extension Development Host peut être lancée.
```

---

# Étape 2 — Ajouter une sidebar IA mockée

## Objectif

Ajouter une entrée dans l’Activity Bar appelée `Bilibop AI`, avec une sidebar affichant une Webview simple.

## UI minimale

La sidebar doit contenir :

```txt
Titre : Bilibop AI
Textarea : instruction utilisateur
Bouton : Envoyer
Zone de réponse : réponse mockée
```

## Fichiers à créer

```txt
apps/vscode-extension/src/extension.ts
apps/vscode-extension/src/sidebar/BilibopSidebarProvider.ts
apps/vscode-extension/src/sidebar/getWebviewHtml.ts
apps/vscode-extension/media/icon.svg
```

## Contribution `package.json`

Ajouter :

```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "bilibop-ai",
          "title": "Bilibop AI",
          "icon": "media/icon.svg"
        }
      ]
    },
    "views": {
      "bilibop-ai": [
        {
          "id": "bilibop-ai.chatView",
          "name": "Agent"
        }
      ]
    }
  }
}
```

## Communication Webview → Extension

Dans le HTML Webview :

```js
const vscode = acquireVsCodeApi();

vscode.postMessage({
  type: "user_prompt",
  prompt: textarea.value
});
```

Dans le provider côté extension :

```ts
webviewView.webview.onDidReceiveMessage(async (message) => {
  if (message.type === "user_prompt") {
    await webviewView.webview.postMessage({
      type: "assistant_response",
      text: `Réponse mockée pour : ${message.prompt}`
    });
  }
});
```

## Sécurité Webview obligatoire

La Webview doit définir une Content Security Policy.

À prévoir :

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
```

## Critères de validation

- L’icône `Bilibop AI` apparaît dans l’Activity Bar.
- La sidebar s’ouvre.
- Le textarea est visible.
- Le bouton `Envoyer` est visible.
- Quand on envoie un message, une réponse mockée s’affiche.
- Aucun appel réseau externe.
- Aucun provider IA.
- Aucun harness.

## Commit attendu

```bash
git add .
git commit -m "feat: add mocked AI sidebar"
```

## Prompt à donner à 5.5

```txt
Lis docs/PLAN_DEVELOPPEMENT.md.

Objectif unique : ajouter une sidebar IA mockée à l’extension VS Code.

Contraintes :
- Ne pas créer le harness maintenant.
- Ne pas intégrer OpenAI, Claude ou Ollama.
- Ne pas créer de RAG.
- Ne pas toucher à Code-OSS.
- Utiliser une Webview simple.
- Ajouter une Content Security Policy.

À faire :
- Ajouter un View Container dans l’Activity Bar nommé Bilibop AI.
- Ajouter une View nommée Agent.
- Créer une Webview avec textarea, bouton Envoyer et zone de réponse.
- Faire communiquer la Webview avec l’extension via postMessage.
- Répondre avec un texte mocké.

Critère de validation :
- F5 ouvre l’Extension Development Host.
- La sidebar Bilibop AI est visible.
- Envoyer un prompt affiche une réponse mockée.
```

---

# Étape 3 — Créer `harness-core` mocké

## Objectif

Créer un package TypeScript indépendant appelé `harness-core`, appelé par l’extension.

## Structure attendue

```txt
packages/harness-core/
├─ src/
│  ├─ index.ts
│  ├─ types.ts
│  └─ runHarness.ts
├─ package.json
└─ tsconfig.json
```

## Types obligatoires

```ts
export type HarnessRequest = {
  prompt: string;
  workspacePath?: string;
  activeFile?: string;
  selection?: string;
  openTabs?: string[];
};

export type HarnessEvent =
  | { type: "message"; text: string }
  | { type: "tool_call_started"; tool: string; args: unknown }
  | { type: "tool_call_finished"; tool: string; result: unknown }
  | { type: "error"; message: string };

export type HarnessResponse = {
  answer: string;
  events: HarnessEvent[];
};
```

## Fonction obligatoire

```ts
export async function runHarness(
  request: HarnessRequest
): Promise<HarnessResponse> {
  return {
    answer: `Harness reçu : ${request.prompt}`,
    events: [{ type: "message", text: "Réponse générée par harness-core mocké." }]
  };
}
```

## Critères de validation

- `packages/harness-core` compile.
- `runHarness()` est exporté.
- Aucun appel IA.
- Aucun accès fichier.
- Aucun effet de bord.

## Commit attendu

```bash
git add .
git commit -m "feat: add mocked harness core"
```

## Prompt à donner à 5.5

```txt
Lis docs/PLAN_DEVELOPPEMENT.md.

Objectif unique : créer packages/harness-core avec un runHarness mocké.

Contraintes :
- Ne pas modifier encore la sidebar.
- Ne pas intégrer OpenAI, Claude ou RAG.
- Ne pas ajouter de tools fichier.
- Le package doit être indépendant de VS Code.

À faire :
- Créer les types HarnessRequest, HarnessResponse, HarnessEvent.
- Créer runHarness(request).
- Exporter proprement depuis index.ts.
- Ajouter package.json et tsconfig.json.
- Ajouter une commande de build.

Critère de validation :
- Le package compile seul.
```

---

# Étape 4 — Brancher sidebar → harness-core

## Objectif

Remplacer la réponse mockée codée dans l’extension par un appel réel à `runHarness()`.

## Flux attendu

```txt
Webview
  ↓ user_prompt
Extension
  ↓ runHarness({ prompt })
harness-core
  ↓ HarnessResponse
Extension
  ↓ assistant_response
Webview
```

## À modifier

```txt
apps/vscode-extension/src/sidebar/BilibopSidebarProvider.ts
apps/vscode-extension/package.json
package.json racine si nécessaire
pnpm-workspace.yaml si nécessaire
```

## Critères de validation

- La sidebar fonctionne toujours.
- La réponse affichée vient de `harness-core`.
- Si `runHarness()` est modifié, la réponse dans la sidebar change.
- L’extension compile.
- `harness-core` compile.

## Commit attendu

```bash
git add .
git commit -m "feat: connect sidebar to harness core"
```

## Prompt à donner à 5.5

```txt
Lis docs/PLAN_DEVELOPPEMENT.md.

Objectif unique : brancher la sidebar VS Code sur packages/harness-core.

Contraintes :
- Ne pas intégrer encore OpenAI, Claude ou RAG.
- Ne pas ajouter de tools.
- Ne pas changer l’UI sauf si nécessaire.
- Ne pas forker Code-OSS.

À faire :
- Importer runHarness depuis packages/harness-core.
- Quand la Webview envoie user_prompt, appeler runHarness({ prompt }).
- Renvoyer HarnessResponse.answer vers la Webview.
- Afficher la réponse dans la sidebar.

Critère de validation :
- La sidebar affiche une réponse venant de harness-core.
```

---

# Étape 5 — Ajouter les tools lecture seule

## Objectif

Ajouter les premiers tools du harness sans risque : lecture de fichiers, liste de fichiers, grep.

## Tools à créer

```txt
packages/harness-core/src/tools/readFile.ts
packages/harness-core/src/tools/listFiles.ts
packages/harness-core/src/tools/grep.ts
packages/harness-core/src/tools/types.ts
packages/harness-core/src/security/workspaceGuard.ts
```

## Interface Tool

```ts
export type ToolRisk = "read" | "write" | "shell" | "network";

export type ToolContext = {
  workspacePath: string;
};

export type Tool<Input = unknown, Output = unknown> = {
  name: string;
  description: string;
  risk: ToolRisk;
  execute(input: Input, context: ToolContext): Promise<Output>;
};
```

## Règle de sécurité obligatoire

Aucun tool ne doit pouvoir sortir du workspace.

À implémenter :

```ts
export function assertInsideWorkspace(workspacePath: string, targetPath: string): void {
  // resolve workspacePath
  // resolve targetPath
  // vérifier que targetPath commence par workspacePath
  // sinon throw Error
}
```

## Tools

### `list_files`

Entrée :

```ts
{ directory?: string; maxDepth?: number }
```

Sortie :

```ts
{ files: string[] }
```

### `read_file`

Entrée :

```ts
{ path: string }
```

Sortie :

```ts
{ path: string; content: string }
```

### `grep`

Entrée :

```ts
{ query: string; include?: string; maxResults?: number }
```

Sortie :

```ts
{ matches: Array<{ file: string; line: number; text: string }> }
```

## Critères de validation

- Les tools sont testables depuis `harness-core`.
- Aucun chemin hors workspace n’est accepté.
- Le harness peut répondre à une commande simple du type : `liste les fichiers du projet`.
- Aucun fichier n’est modifié.
- Aucune commande shell libre n’est exécutée.

## Commit attendu

```bash
git add .
git commit -m "feat: add read-only harness tools"
```

## Prompt à donner à 5.5

```txt
Lis docs/PLAN_DEVELOPPEMENT.md.

Objectif unique : ajouter les tools lecture seule au harness.

Contraintes :
- Ne pas ajouter d’écriture fichier.
- Ne pas ajouter de terminal shell libre.
- Ne pas intégrer OpenAI ou Claude.
- Tous les accès fichiers doivent rester dans workspacePath.

À faire :
- Créer Tool, ToolContext et ToolRisk.
- Créer read_file, list_files et grep.
- Créer assertInsideWorkspace.
- Brancher ces tools dans runHarness de manière simple : si le prompt contient “liste les fichiers”, appeler list_files.
- Ajouter des events tool_call_started et tool_call_finished.

Critère de validation :
- Depuis la sidebar, si je demande “liste les fichiers du projet”, le harness utilise list_files.
```

---

# Étape 6 — Ajouter le contexte VS Code

## Objectif

Envoyer au harness le contexte courant de VS Code.

## Contexte à transmettre

Depuis l’extension :

```txt
workspacePath
activeFile
selectedText
openTabs
languageId
```

## API request

```ts
const request: HarnessRequest = {
  prompt,
  workspacePath,
  activeFile,
  selection,
  openTabs
};
```

## Critères de validation

- Le harness sait quel workspace est ouvert.
- Le harness sait quel fichier actif est ouvert.
- Le harness reçoit la sélection courante si elle existe.
- Si aucun workspace n’est ouvert, afficher une erreur propre dans la sidebar.

## Commit attendu

```bash
git add .
git commit -m "feat: send VS Code context to harness"
```

## Prompt à donner à 5.5

```txt
Lis docs/PLAN_DEVELOPPEMENT.md.

Objectif unique : envoyer le contexte VS Code courant au harness.

Contraintes :
- Ne pas ajouter de provider IA.
- Ne pas ajouter de RAG.
- Ne pas écrire de fichiers.

À faire :
- Récupérer workspacePath depuis vscode.workspace.workspaceFolders.
- Récupérer activeFile depuis vscode.window.activeTextEditor.
- Récupérer selection si elle existe.
- Récupérer les fichiers ouverts si possible.
- Passer ces informations à runHarness.
- Afficher une erreur claire si aucun workspace n’est ouvert.

Critère de validation :
- Le harness reçoit workspacePath, activeFile et selection.
```

---

# Étape 7 — Ajouter un premier provider IA

## Objectif

Brancher un seul provider IA au départ. Choisir OpenAI ou Anthropic, pas les deux en même temps.

## Recommandation

Commencer par OpenAI ou Anthropic selon la clé disponible.

Ne jamais coder la clé API en dur.

## Variables d’environnement

```bash
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

## Interface provider

```ts
export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMProvider = {
  id: string;
  name: string;
  complete(messages: LLMMessage[]): Promise<string>;
};
```

## Structure

```txt
packages/harness-core/src/providers/types.ts
packages/harness-core/src/providers/openaiProvider.ts
packages/harness-core/src/providers/anthropicProvider.ts
```

## Critères de validation

- Un prompt depuis la sidebar appelle le provider.
- La réponse réelle du modèle s’affiche.
- Si la clé API est absente, une erreur propre s’affiche.
- Les clés ne sont pas commit.
- `.env` est dans `.gitignore`.

## Commit attendu

```bash
git add .
git commit -m "feat: add first LLM provider"
```

## Prompt à donner à 5.5

```txt
Lis docs/PLAN_DEVELOPPEMENT.md.

Objectif unique : ajouter un premier provider IA au harness.

Choix : commencer par [OpenAI ou Anthropic].

Contraintes :
- Ne pas ajouter plusieurs providers en même temps.
- Ne jamais mettre de clé API en dur.
- Utiliser une variable d’environnement.
- Garder l’interface provider abstraite.
- Ne pas ajouter de RAG.
- Ne pas ajouter d’écriture fichier.

À faire :
- Créer LLMProvider.
- Créer le provider choisi.
- Brancher runHarness sur ce provider.
- Gérer proprement l’absence de clé API.
- Mettre .env dans .gitignore.

Critère de validation :
- Depuis la sidebar, je peux envoyer un prompt et recevoir une vraie réponse IA.
```

---

# Étape 8 — Ajouter le streaming d’événements

## Objectif

Afficher progressivement les messages et les tools dans la sidebar.

## Nouveau flux

```txt
runHarnessStream(request)
  yield message_delta
  yield tool_call_started
  yield tool_call_finished
  yield done
```

## Types

```ts
export type HarnessStreamEvent =
  | { type: "message_delta"; text: string }
  | { type: "tool_call_started"; tool: string; args: unknown }
  | { type: "tool_call_finished"; tool: string; result: unknown }
  | { type: "permission_required"; permissionId: string; reason: string }
  | { type: "done" }
  | { type: "error"; message: string };
```

## Critères de validation

- La sidebar affiche les tokens progressivement si le provider le permet.
- Les tool calls apparaissent dans un journal visuel.
- Le mode non-streaming reste utilisable en fallback.

## Commit attendu

```bash
git add .
git commit -m "feat: add harness event streaming"
```

## Prompt à donner à 5.5

```txt
Lis docs/PLAN_DEVELOPPEMENT.md.

Objectif unique : ajouter le streaming d’événements entre harness et sidebar.

Contraintes :
- Ne pas ajouter de nouveaux tools.
- Ne pas ajouter de RAG.
- Ne pas faire d’écriture fichier.
- Garder un fallback non-streaming.

À faire :
- Ajouter HarnessStreamEvent.
- Ajouter runHarnessStream.
- Faire remonter les events à la Webview.
- Afficher message_delta progressivement.
- Afficher les tool_call_started et tool_call_finished.

Critère de validation :
- La sidebar affiche les événements du harness au fur et à mesure.
```

---

# Étape 9 — Ajouter le système de diff proposé

## Objectif

Permettre à l’agent de proposer une modification de fichier sans l’appliquer directement.

## Types

```ts
export type ProposedDiff = {
  id: string;
  filePath: string;
  originalContent: string;
  newContent: string;
  summary: string;
};
```

## Règle

À cette étape, l’agent ne doit jamais écrire directement dans le filesystem.

Il doit uniquement produire un diff ou un contenu modifié proposé.

## UI attendue

Dans la sidebar :

```txt
Diff proposé
Fichier concerné
Résumé
Bouton Voir diff
Bouton Accepter
Bouton Refuser
```

À cette étape, le bouton `Accepter` peut encore être désactivé ou mocké.

## Critères de validation

- Le harness peut produire un `ProposedDiff`.
- La sidebar affiche le diff proposé.
- Aucun fichier n’est modifié.

## Commit attendu

```bash
git add .
git commit -m "feat: add proposed diff flow"
```

## Prompt à donner à 5.5

```txt
Lis docs/PLAN_DEVELOPPEMENT.md.

Objectif unique : ajouter un flux de diff proposé sans écriture fichier.

Contraintes :
- Ne pas appliquer les modifications aux fichiers.
- Ne pas ajouter encore apply_patch.
- Ne pas ajouter de terminal shell.
- Le diff doit être visible dans la sidebar.

À faire :
- Créer le type ProposedDiff.
- Permettre au harness de retourner proposedDiffs.
- Afficher les diffs dans la sidebar.
- Ajouter boutons Voir diff, Accepter, Refuser.
- Les boutons Accepter/Refuser peuvent être mockés pour l’instant.

Critère de validation :
- Je peux demander une modification et voir une proposition de diff sans modification réelle du fichier.
```

---

# Étape 10 — Ajouter l’écriture contrôlée

## Objectif

Permettre l’application d’un diff uniquement après validation utilisateur.

## Tool à créer

```txt
packages/harness-core/src/tools/applyPatch.ts
```

## Règles de sécurité

- L’écriture nécessite toujours une validation utilisateur.
- L’écriture reste limitée au workspace.
- Avant écriture, sauvegarder le contenu original en mémoire pour rollback simple.
- Ne jamais modifier `.env`, `.git`, `node_modules`, fichiers système ou chemins hors workspace.

## Workflow

```txt
Agent propose diff
↓
Sidebar affiche diff
↓
Utilisateur clique Accepter
↓
Extension appelle applyPatch
↓
Fichier modifié
↓
Sidebar affiche succès ou erreur
```

## Critères de validation

- Un diff peut être accepté.
- Le fichier est modifié seulement après clic utilisateur.
- Les chemins hors workspace sont bloqués.
- `.env` est bloqué.

## Commit attendu

```bash
git add .
git commit -m "feat: apply approved diffs safely"
```

## Prompt à donner à 5.5

```txt
Lis docs/PLAN_DEVELOPPEMENT.md.

Objectif unique : permettre l’application d’un diff après validation utilisateur.

Contraintes :
- Ne jamais écrire sans clic explicite sur Accepter.
- Bloquer les chemins hors workspace.
- Bloquer .env, .git, node_modules.
- Ne pas ajouter de terminal shell.
- Ne pas ajouter de RAG.

À faire :
- Créer applyPatch.
- Brancher le bouton Accepter sur applyPatch.
- Garder un rollback simple en mémoire.
- Afficher succès ou erreur dans la sidebar.

Critère de validation :
- Un fichier peut être modifié seulement après validation utilisateur.
```

---

# Étape 11 — Ajouter le RAG local

## Objectif

Indexer le workspace local pour réduire les tokens et améliorer le contexte envoyé au modèle.

## Approche minimale

Commencer avec un index JSON local simple avant d’intégrer une vraie BDD vectorielle.

Phase 11A : index texte simple.

```txt
packages/harness-core/src/rag/simpleIndexer.ts
packages/harness-core/src/rag/simpleRetriever.ts
```

Phase 11B : vector store.

Options possibles :

```txt
LanceDB
sqlite-vec
Qdrant local
Chroma
```

Pour un produit desktop local, commencer par `sqlite-vec` ou `LanceDB`.

## Fichiers ignorés

Ne jamais indexer :

```txt
.git
node_modules
dist
build
.next
vendor
.env
*.lock sauf besoin précis
fichiers binaires
images lourdes
```

## Workflow

```txt
Commande : Bilibop: Index Workspace
↓
Indexer les fichiers texte utiles
↓
Chunking
↓
Stockage local
↓
Recherche sémantique ou textuelle
↓
Ajout du contexte pertinent dans le prompt
```

## Critères de validation

- Une commande `Index Workspace` existe.
- Le workspace peut être indexé.
- Les fichiers ignorés sont bien exclus.
- Le harness peut récupérer les chunks pertinents pour une question.
- Aucun secret `.env` n’est indexé.

## Commit attendu

```bash
git add .
git commit -m "feat: add local workspace indexing"
```

## Prompt à donner à 5.5

```txt
Lis docs/PLAN_DEVELOPPEMENT.md.

Objectif unique : ajouter un premier RAG local simple.

Contraintes :
- Commencer par un index local simple, pas forcément une vraie BDD vectorielle.
- Ne pas indexer .env, .git, node_modules, dist, build, .next.
- Ne pas envoyer tous les fichiers au modèle.
- Ne pas modifier les fichiers.

À faire :
- Créer simpleIndexer.
- Créer simpleRetriever.
- Ajouter une commande VS Code “Bilibop: Index Workspace”.
- Brancher le retriever dans runHarness.
- Ajouter les chunks pertinents au contexte envoyé au provider.

Critère de validation :
- Je peux indexer le projet et poser une question qui récupère du contexte pertinent.
```

---

# Étape 12 — Tests, garde-fous et qualité

## Objectif

Stabiliser avant d’aller vers Code-OSS.

## Tests minimum

```txt
harness-core:
- assertInsideWorkspace bloque les chemins externes
- read_file lit un fichier autorisé
- read_file bloque .env
- list_files ignore node_modules
- grep retourne les bonnes lignes
- applyPatch bloque les fichiers interdits

vscode-extension:
- Webview HTML généré
- messages user_prompt reçus
- réponses assistant_response envoyées
```

## Commandes attendues

```bash
pnpm run build
pnpm run test
pnpm run lint
```

## Critères de validation

- Build complet OK.
- Tests minimum OK.
- Aucun secret dans le repo.
- Sidebar utilisable.
- Harness utilisable.
- Tools lecture et écriture contrôlée.
- RAG simple fonctionnel.

## Commit attendu

```bash
git add .
git commit -m "test: add safety and harness tests"
```

## Prompt à donner à 5.5

```txt
Lis docs/PLAN_DEVELOPPEMENT.md.

Objectif unique : ajouter les tests et garde-fous minimum.

Contraintes :
- Ne pas ajouter de nouvelle fonctionnalité produit.
- Ne pas refactorer massivement.
- Se concentrer sur sécurité, build et tests.

À faire :
- Ajouter tests pour workspaceGuard.
- Ajouter tests pour read_file, list_files, grep.
- Ajouter tests pour applyPatch si déjà présent.
- Ajouter scripts build/test/lint.
- Vérifier que .env est ignoré.

Critère de validation :
- pnpm run build fonctionne.
- pnpm run test fonctionne.
```

---

# Étape 13 — Préparer le fork Code-OSS minimal

## Objectif

Créer une distribution personnalisée seulement quand l’extension + harness sont stables.

## Ce que le fork doit faire

```txt
- Branding personnalisé
- Extension Bilibop AI préinstallée
- Marketplace désactivé ou non configuré
- Settings par défaut
- Télémétrie désactivée si souhaité
- Build macOS Intel
- Build macOS Silicon
```

## Ce que le fork ne doit pas faire

```txt
- Réécrire le cœur VS Code
- Déplacer la logique agentique dans Code-OSS
- Mélanger harness et workbench VS Code
- Ajouter un marketplace maison au début
```

## Préparation

```txt
apps/code-oss/       # fork ou submodule plus tard
apps/vscode-extension/ # extension stable à préinstaller
packages/harness-core/ # logique IA
```

## Critères de validation

- L’extension fonctionne dans VS Code standard.
- Le harness fonctionne hors VS Code.
- Le fork Code-OSS n’est qu’une couche produit.

## Prompt à donner à 5.5

```txt
Lis docs/PLAN_DEVELOPPEMENT.md.

Objectif unique : préparer le plan de fork Code-OSS minimal.

Contraintes :
- Ne pas commencer le fork si les étapes 1 à 12 ne sont pas validées.
- Ne pas déplacer le harness dans le cœur VS Code.
- Le fork doit seulement préinstaller l’extension et ajuster le branding/settings.

À faire :
- Identifier les fichiers Code-OSS à modifier plus tard.
- Lister les changements nécessaires pour branding.
- Lister les changements nécessaires pour préinstaller l’extension.
- Lister les risques de build macOS Intel/Silicon.

Critère de validation :
- Un plan de fork existe, mais aucun fork lourd n’est lancé prématurément.
```

---

## 4. Règles de travail avec un agent IA type GPT-5.5 / Codex / Claude Code

### Règle principale

Ne jamais demander :

```txt
Fais tout le projet à partir du MD.
```

Toujours demander :

```txt
Fais uniquement l’étape X.
Respecte les contraintes.
Ne touche pas aux autres étapes.
À la fin, donne les fichiers modifiés et les commandes de validation.
```

### Format de prompt obligatoire

```txt
Lis docs/PLAN_DEVELOPPEMENT.md.

Objectif unique : [objectif de l’étape].

Contraintes :
- [contrainte 1]
- [contrainte 2]
- [contrainte 3]

À faire :
- [tâche 1]
- [tâche 2]
- [tâche 3]

Ne pas faire :
- [interdiction 1]
- [interdiction 2]

Critère de validation :
- [commande ou comportement attendu]

À la fin :
- Liste les fichiers modifiés.
- Donne les commandes à exécuter.
- Signale les points non faits.
```

### Après chaque étape

Faire systématiquement :

```bash
pnpm run build
pnpm run test
```

Si les scripts n’existent pas encore, faire au minimum :

```bash
pnpm run compile
```

Puis :

```bash
git diff
git status
```

Valider seulement si le résultat compile.

---

## 5. Checklist globale d’avancement

```txt
[ ] Étape 0  — Repo initialisé
[ ] Étape 1  — Extension VS Code minimale créée
[ ] Étape 2  — Sidebar IA mockée visible
[ ] Étape 3  — harness-core mocké créé
[ ] Étape 4  — Sidebar branchée au harness
[ ] Étape 5  — Tools lecture seule ajoutés
[ ] Étape 6  — Contexte VS Code transmis au harness
[ ] Étape 7  — Premier provider IA ajouté
[ ] Étape 8  — Streaming d’événements ajouté
[ ] Étape 9  — Diff proposé ajouté
[ ] Étape 10 — Écriture contrôlée ajoutée
[ ] Étape 11 — RAG local ajouté
[ ] Étape 12 — Tests et sécurité minimum
[ ] Étape 13 — Plan fork Code-OSS minimal
```

---

## 6. Définition du MVP

Le MVP est atteint quand :

```txt
- Une sidebar Bilibop AI existe dans VS Code.
- L’utilisateur peut envoyer un prompt.
- Le harness reçoit le prompt avec le contexte VS Code.
- Le harness peut lire le workspace via tools sécurisés.
- Le provider IA répond.
- Le harness peut proposer un diff.
- L’utilisateur peut accepter ou refuser le diff.
- Aucun fichier sensible n’est lu ou écrit sans contrôle.
- Un index local simple peut enrichir le contexte.
```

Le MVP ne nécessite pas encore :

```txt
- fork Code-OSS complet
- marketplace
- distribution macOS signée
- multi-provider avancé
- agent autonome complet
- exécution shell complexe
```

---

## 7. Commandes Git recommandées

Après chaque étape :

```bash
git status
git diff
pnpm run build
pnpm run test
```

Puis :

```bash
git add .
git commit -m "type: description courte"
```

Types de commits :

```txt
chore: structure, config, scripts
feat: fonctionnalité
fix: correction
test: tests
refactor: refactor sans changement fonctionnel
docs: documentation
```

---

## 8. Priorité immédiate

La première vraie tâche à exécuter est :

```txt
Étape 0 — Initialiser le repo
```

Puis immédiatement :

```txt
Étape 1 — Créer l’extension VS Code minimale
```

Ne pas penser au fork Code-OSS avant d’avoir une sidebar fonctionnelle et un harness branché.

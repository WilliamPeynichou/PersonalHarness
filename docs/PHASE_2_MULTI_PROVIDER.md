# Phase 2 — Multi-provider (OpenAI + Anthropic) + choix dynamique

Statut : ✅ implémentée. Builds, lint et tests verts (21/21).

Ce document récapitule ce qui a été livré dans cette phase et ce qui reste à faire avant d'entamer la Phase 3 (`docs/BILIBOP_IDE_CONTEXT_AND_PLAN.md`).

---

## 1. Ce qui a été fait

### 1.1 Décisions de design (cadrées avec l'utilisateur)

- Client Anthropic via **fetch direct** (pas de SDK `@anthropic-ai/sdk`) → cohérent avec `OpenAIProvider`, aucune dépendance npm ajoutée.
- Sidebar : **deux `<select>`** (provider + modèle), choix transmis avec chaque prompt.
- Persistance : **`workspaceState`** VS Code (clés `bilibop.lastProvider` / `bilibop.lastModel`).
- Catalogue : **récupération dynamique** via `/v1/models` au changement de provider, **fallback** transparent sur catalogue statique en dur si la clé manque ou l'API échoue.
- Cache : **mémoire uniquement**, pas de cache disque.
- Clés API : **variables d'environnement uniquement** (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) — status quo, jamais commit.
- Défaut rétrocompatible : `openai` + `gpt-5-mini` si `provider`/`model` absents de la requête.

### 1.2 Fichiers créés

```
packages/harness-core/src/providers/
  ├── catalog.ts              ProviderId, ModelDescriptor, STATIC_MODEL_CATALOG, défauts, isProviderId
  ├── sse.ts                  Helpers SSE partagés (readServerSentEvents, parseEventJson)
  ├── env.ts                  requireEnv (factorisé)
  ├── anthropicProvider.ts    AnthropicProvider + createAnthropicProviderFromEnv
  ├── registry.ts             createProvider({provider, model}, env)
  └── listModels.ts           listModels(providerId, env) — récup dynamique tolérante aux erreurs

packages/harness-core/test/
  └── providers.test.js       12 tests : routage, clés manquantes, mapping listModels
```

### 1.3 Fichiers modifiés

- `packages/harness-core/src/types.ts` — `HarnessRequest` étendu avec `provider?: ProviderId; model?: string;`
- `packages/harness-core/src/runHarness.ts` — utilise `createProvider` du registry au lieu d'instancier `OpenAIProvider` en dur ; nouveau helper `createProviderFromRequest` avec défauts.
- `packages/harness-core/src/providers/openaiProvider.ts` — refactor pour réutiliser `sse.ts` et `requireEnv` (plus de duplication).
- `packages/harness-core/src/index.ts` — exports complétés (`AnthropicProvider`, `createProvider`, `listModels`, `STATIC_MODEL_CATALOG`, `DEFAULT_PROVIDER`, `DEFAULT_MODEL_BY_PROVIDER`, `isProviderId`, `ProviderId`, `ModelDescriptor`).
- `apps/vscode-extension/src/extension.ts` — passe `context.workspaceState` au constructeur de la sidebar.
- `apps/vscode-extension/src/sidebar/BilibopSidebarProvider.ts` — handlers `request_models` (avec fallback statique) et `request_initial_state` (restauration `workspaceState`) ; transmission `{provider, model}` au harness.
- `apps/vscode-extension/src/sidebar/getWebviewHtml.ts` — deux `<select>` (provider + modèle), pipeline `request_initial_state` → `initial_state` → `request_models` → `models_list` → restauration de la sélection persistée.
- `apps/vscode-extension/test/webviewHtml.test.js` — assertions sur les nouveaux contrats du HTML.

### 1.4 API publique de `harness-core` (résumé)

```ts
// Types
export type ProviderId = "openai" | "anthropic";
export type ModelDescriptor = { id, label, provider, supportsStreaming, supportsTools };
export type HarnessRequest = { ..., provider?: ProviderId, model?: string };

// Catalogue
export const STATIC_MODEL_CATALOG: Record<ProviderId, ModelDescriptor[]>;
export const DEFAULT_PROVIDER: ProviderId; // "openai"
export const DEFAULT_MODEL_BY_PROVIDER: Record<ProviderId, string>;
export function isProviderId(value: unknown): value is ProviderId;

// Providers
export class OpenAIProvider implements LLMProvider { ... }
export class AnthropicProvider implements LLMProvider { ... }
export function createOpenAIProviderFromEnv(env?): OpenAIProvider;
export function createAnthropicProviderFromEnv(env?): AnthropicProvider;
export function createProvider({provider, model}, env?): LLMProvider;
export function listModels(provider: ProviderId, env?): Promise<ModelDescriptor[]>;
```

### 1.5 Catalogue statique de fallback

| Provider | Modèles en dur |
|---|---|
| `openai` | `gpt-5-mini` (défaut), `gpt-5` |
| `anthropic` | `claude-opus-4-7`, `claude-sonnet-4-6` (défaut), `claude-haiku-4-5-20251001` |

Ce catalogue ne s'affiche que si l'API `/v1/models` ne répond pas (clé absente, réseau, 4xx/5xx).

### 1.6 Flux UI complet

```
1. resolveWebviewView()
   └─ webview envoie ── postMessage("request_initial_state")

2. Extension lit workspaceState (lastProvider, lastModel)
   └─ webview reçoit ── { type: "initial_state", provider, model }
       └─ webview pré-sélectionne providerSelect, mémorise pendingModelId
           └─ webview envoie ── postMessage("request_models", provider)

3. Extension appelle listModels(provider)
   ├─ succès → ModelDescriptor[] frais
   └─ erreur → STATIC_MODEL_CATALOG[provider]
       └─ webview reçoit ── { type: "models_list", provider, models }
           └─ webview remplit modelSelect, restaure pendingModelId si présent

4. Utilisateur clique Envoyer
   └─ webview envoie ── postMessage("user_prompt", { prompt, provider, model })
       └─ Extension persiste workspaceState, appelle runHarnessStream(request)
           └─ events streamés vers la webview
```

### 1.7 Tests

- `packages/harness-core/test/providers.test.js` (12 tests)
  - Routage `createProvider` openai/anthropic → bonnes instances.
  - Clés manquantes → erreurs en français claires.
  - `isProviderId` narrowing.
  - `STATIC_MODEL_CATALOG` cohérent.
  - `listModels` sans clé → `[]`.
  - `listModels` OpenAI : mapping `body.data` → `ModelDescriptor[]`.
  - `listModels` Anthropic : préférence `display_name` sur `id`.
  - `listModels` fetch en erreur → `[]`.
  - `listModels` HTTP 401 → `[]`.
- `apps/vscode-extension/test/webviewHtml.test.js` (2 tests)
  - Bridge messages préservé (`user_prompt`, `harness_event`, `apply_proposed_diff`).
  - Selects + contrats `request_initial_state` / `initial_state` / `request_models` / `models_list` présents.

Total : **21/21 tests** passent.

### 1.8 Vérifications

```bash
pnpm run build   # ✅
pnpm run lint    # ✅
pnpm run test    # ✅ 21/21
```

---

## 2. Ce qui reste à faire

### 2.1 Petites finitions Phase 2 (avant Phase 3)

- [ ] **Test manuel** dans VS Code (Extension Development Host via `F5`) :
  - Sans clés → selects fallback, prompt → erreur claire.
  - Avec `OPENAI_API_KEY` → liste dynamique, streaming OK.
  - Avec `ANTHROPIC_API_KEY` → switch Anthropic + Claude, streaming OK.
  - Fermer/rouvrir VS Code → sélection restaurée depuis `workspaceState`.
  - Fausse clé Anthropic → erreur API rendue clairement dans le panneau erreurs.
- [ ] **README ou note** sur l'export des variables `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` avant `F5` (le shell qui lance VS Code doit les avoir).
- [ ] (Optionnel) **Logs côté webview** quand la liste tombe sur le catalogue statique, pour aider le debug ("Fallback statique : OPENAI_API_KEY introuvable").

### 2.2 Phase 3 — Rendre l'agent plus proche de Cursor

Objectif (rappel `BILIBOP_IDE_CONTEXT_AND_PLAN.md` §Phase 3) :

- [ ] Mieux exploiter `activeFile`, `selection`, `openTabs` dans le prompt système et utilisateur.
- [ ] Inclure le **langage** (`languageId`) dans le contexte injecté au modèle.
- [ ] Permettre à l'agent de demander la **lecture ciblée** d'un fichier (déclencher `read_file` via une heuristique plus riche que la seule détection FR actuelle).
- [ ] Améliorer la **lisibilité du diff** (rendu side-by-side ou unifié coloré).
- [ ] Conserver la validation utilisateur explicite avant écriture (déjà OK).

### 2.3 Phase 4 — Améliorer le RAG local

- [ ] Chunking plus fin (par fonction/classe quand parsable) au lieu du chunking ligne-fenêtre actuel.
- [ ] Métadonnées par chunk (langage, kind: function|class|imports, mtime).
- [ ] Score plus robuste (TF-IDF ou BM25 simple) en plus du lexical actuel.
- [ ] Liste d'ignore enrichie (`.next`, `dist`, `coverage`, `*.min.js`, etc.).
- [ ] Indication UI quand le RAG est utilisé pour une réponse (badge "contexte local").
- [ ] Préparer (sans rendre obligatoire) une couche embeddings optionnelle.

### 2.4 Phase 5 — Packaging

- [ ] `package.json` extension : vérifier `files`, `bundledDependencies` ou ESM bundle pour inclure `harness-core` dans le VSIX.
- [ ] Script `pnpm run package` (vsce) → produit un `.vsix` installable.
- [ ] Tester l'install dans VS Code Stable (pas seulement Dev Host).
- [ ] Documenter la liste des fichiers générés.

### 2.5 Phase 6 — Fork Code-OSS minimal

- [ ] Vrai fork ou submodule dans `apps/code-oss/` (aujourd'hui : seulement des `*.example.json`).
- [ ] Branding Bilibop (product.json, icônes, splash).
- [ ] Settings par défaut + désactivation marketplace.
- [ ] Préinstallation du VSIX BilibopAI.
- [ ] Builds macOS Apple Silicon + Intel.

### 2.6 Phase 7 — Distribution

- [ ] Signature macOS + notarisation.
- [ ] Scripts de release + versioning produit.
- [ ] Vérification absence de secrets dans les artefacts.
- [ ] Documentation utilisateur.

### 2.7 Améliorations différées (hors scope phases nommées)

- [ ] **Tool-calling Anthropic** : aujourd'hui les outils (`read_file`, `list_files`, `grep`, `applyPatch`) sont déclenchés par heuristique de prompt française dans `runHarness`, **pas via le provider**. Activer le tool-use natif Anthropic + OpenAI nécessitera de revoir `LLMProvider` (ajout d'une méthode `streamWithTools` ou similaire).
- [ ] **VS Code SecretStorage** pour les clés (alternative aux env vars).
- [ ] **Activity bar dédiée** Bilibop (la sidebar est dans `Explorer` aujourd'hui pour éviter le warning de conteneur custom — réintroduire quand stabilisé).
- [ ] **Refresh manuel** du catalogue de modèles depuis la sidebar (bouton 🔄).
- [ ] **Indicateur visuel** quand on est en train de fetch les modèles vs quand on est sur le fallback statique.
- [ ] **Cache disque** des modèles (`.bilibop-ai/models.json`) si le fetch dynamique au switch de provider devient gênant.

---

## 3. Pointeurs utiles

- Plan produit global : `docs/BILIBOP_IDE_CONTEXT_AND_PLAN.md`
- Plan d'implémentation détaillé Phase 2 : `~/.claude/plans/starry-cooking-sutton.md`
- Plan fork Code-OSS : `docs/CODE_OSS_FORK_PLAN.md`
- Plan développement initial : `docs/PLAN_DEVELOPPEMENT.md`

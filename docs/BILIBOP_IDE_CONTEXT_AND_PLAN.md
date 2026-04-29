# Bilibop IDE - contexte actuel et plan d'action

## Vision produit

Bilibop est un IDE complet basé sur un fork minimal de VS Code / Code-OSS.

BilibopAI est l'agent principal de l'IDE. Il doit fonctionner comme une sidebar de type Cursor :

- chat contextualisé sur le projet ouvert
- lecture contrôlée des fichiers
- recherche locale dans le workspace
- index local simple pour enrichir le contexte
- proposition de diffs
- acceptation ou refus explicite par l'utilisateur
- choix dynamique du provider IA et du modèle
- support OpenAI et Anthropic

La règle d'architecture centrale est simple : le coeur Code-OSS reste une couche produit. L'intelligence reste dans l'extension BilibopAI et dans `harness-core`.

## État actuel du repo

Le repo est déjà structuré en monorepo PNPM :

```txt
apps/
  vscode-extension/      # extension VS Code BilibopAI
  code-oss/              # zone de préparation du futur fork, pas encore un vrai fork

packages/
  harness-core/          # logique agentique testable hors VS Code

docs/
  PLAN_DEVELOPPEMENT.md
  CODE_OSS_FORK_PLAN.md
  BILIBOP_IDE_CONTEXT_AND_PLAN.md
```

Scripts racine disponibles :

```bash
pnpm run build
pnpm run test
pnpm run lint
```

## Ce qui existe déjà

### Extension VS Code

`apps/vscode-extension` contient une extension TypeScript minimale.

Fonctionnel aujourd'hui :

- lancement via `F5` avec `.vscode/launch.json`
- vue BilibopAI dans l'Explorer de l'Extension Development Host
- webview de chat
- envoi de prompt depuis la sidebar
- réception des événements du harness
- affichage des réponses streamées
- affichage des diffs proposés
- boutons accepter/refuser un diff
- commande `Bilibop: Index Workspace`

Décision temporaire :

- la vue est actuellement placée dans `Explorer` pour éviter le warning de conteneur custom pendant le développement
- l'activity bar dédiée Bilibop sera réintroduite une fois le comportement validé dans la version VS Code cible

### Harness local

`packages/harness-core` contient la logique agentique indépendante de VS Code.

Fonctionnel aujourd'hui :

- `runHarness`
- `runHarnessStream`
- provider OpenAI initial
- tools lecture seule :
  - `read_file`
  - `list_files`
  - `grep`
- garde-fous workspace :
  - blocage des chemins hors workspace
  - blocage `.env`
  - blocage `.git`
  - blocage `node_modules`
- système de diff proposé
- écriture contrôlée avec `applyPatch`
- RAG local simple :
  - index JSON dans `.bilibop-ai/`
  - récupération lexicale de chunks pertinents

### Tests et qualité

Des tests Node natifs existent pour :

- `assertInsideWorkspace`
- `read_file`
- blocage `.env`
- `list_files`
- `grep`
- `applyPatch`
- RAG simple
- génération HTML de la webview

Les commandes suivantes passent :

```bash
pnpm run build
pnpm run test
pnpm run lint
```

### Préparation Code-OSS

`apps/code-oss` contient seulement une préparation :

- `README.md`
- `product-overrides.example.json`
- `default-settings.example.json`
- `extension-preinstall.md`

Il ne contient pas encore Code-OSS. C'est volontaire.

## Ce qui a été fait

Les étapes 0 à 13 du plan initial ont été réalisées dans l'esprit suivant :

```txt
1. construire d'abord une extension VS Code standard
2. isoler la logique agentique dans harness-core
3. brancher la sidebar au harness
4. ajouter contexte VS Code, tools, streaming, diff et écriture contrôlée
5. ajouter RAG local simple
6. ajouter tests et scripts qualité
7. préparer le futur fork Code-OSS sans le lancer prématurément
```

Le choix important est de ne pas coder BilibopAI directement dans Code-OSS. BilibopAI doit rester une extension préinstallée dans le futur IDE.

## Architecture cible

```txt
Bilibop IDE
  = fork Code-OSS minimal
  + branding Bilibop
  + settings par défaut
  + marketplace désactivée ou contrôlée
  + extension BilibopAI préinstallée

BilibopAI
  = extension VS Code
  + sidebar Cursor-like
  + choix provider/modèle
  + gestion du contexte éditeur
  + appels harness-core

harness-core
  = boucle agentique
  + providers IA
  + tools sécurisés
  + RAG local
  + diffs proposés
  + écriture contrôlée
```

Flux cible :

```txt
Utilisateur
  -> Sidebar BilibopAI
  -> Extension VS Code
  -> harness-core
  -> provider OpenAI ou Anthropic
  -> tools locaux sécurisés
  -> réponse / diff proposé
  -> validation utilisateur
  -> applyPatch contrôlé
```

## Providers IA ciblés

BilibopAI doit supporter au minimum :

- OpenAI
- Anthropic

Le choix doit être dynamique :

- choix du provider dans l'UI
- choix du modèle selon le provider
- possibilité de changer sans recompiler
- fallback clair si la clé API manque

Configuration prévue :

```txt
OPENAI_API_KEY
ANTHROPIC_API_KEY
```

Les clés ne doivent jamais être stockées dans le repo, ni dans le futur bundle Code-OSS.

## Modèles dynamiques

Première version recommandée : catalogue local de modèles dans `harness-core`.

Exemple de structure cible :

```ts
type ProviderId = "openai" | "anthropic";

type ModelDescriptor = {
  id: string;
  label: string;
  provider: ProviderId;
  supportsStreaming: boolean;
  supportsTools: boolean;
};
```

UI cible :

```txt
[Provider: OpenAI | Anthropic]
[Model: modèle disponible pour ce provider]
[Prompt utilisateur]
[Envoyer]
```

Le catalogue peut être statique au début. Une récupération dynamique depuis les APIs peut venir plus tard, mais elle n'est pas nécessaire pour le MVP.

## Plan d'action vers Bilibop IDE complet

### Phase 1 - Stabiliser BilibopAI dans VS Code standard

Objectif : avoir une extension fiable avant tout fork.

À faire :

- stabiliser la sidebar actuelle
- remettre une activity bar dédiée BilibopAI quand le warning de conteneur est résolu
- améliorer l'affichage chat
- afficher clairement les erreurs provider/API key
- garder `F5` fonctionnel
- garder `pnpm run build/test/lint` verts

Critère :

```txt
BilibopAI fonctionne dans VS Code standard sans étape manuelle complexe.
```

### Phase 2 - Ajouter Anthropic et le choix dynamique des modèles ✅

Statut : **livrée**. Détail complet dans `docs/PHASE_2_MULTI_PROVIDER.md`.

Réalisé :

- `ProviderRegistry` (`createProvider({provider, model}, env)`) dans `harness-core`
- `AnthropicProvider` (fetch direct, SSE `content_block_delta`)
- Helpers SSE et `requireEnv` factorisés (`providers/sse.ts`, `providers/env.ts`)
- Catalogue statique (`STATIC_MODEL_CATALOG`) + récupération dynamique `/v1/models` (`listModels`)
- Sidebar : deux `<select>` provider/modèle, persistance via `workspaceState`
- Fallback transparent sur catalogue statique si clé manquante ou API en erreur
- 21/21 tests verts (12 nouveaux dans `providers.test.js` + adaptation `webviewHtml.test.js`)

Critère atteint :

```txt
L'utilisateur choisit OpenAI ou Anthropic dans la sidebar et le harness route correctement la requête.
```

### Phase 3 - Rendre l'agent plus proche de Cursor

Objectif : rendre BilibopAI réellement utile dans un projet.

À faire :

- mieux utiliser le fichier actif
- mieux utiliser la sélection active
- inclure les onglets ouverts
- enrichir les prompts système
- améliorer les réponses avec références de fichiers
- permettre la lecture ciblée de fichiers
- améliorer la proposition de diff
- afficher les diffs de manière plus lisible
- garder l'acceptation utilisateur obligatoire avant écriture

Critère :

```txt
BilibopAI peut comprendre un fichier, proposer une modification et appliquer un diff validé.
```

### Phase 4 - Améliorer le RAG local

Objectif : donner du contexte projet pertinent sans envoyer tout le repo.

À faire :

- mieux chunker les fichiers
- stocker des métadonnées utiles
- ignorer plus de fichiers générés
- ajouter un score plus robuste
- afficher quand le contexte RAG est utilisé
- prévoir une future couche embeddings, mais ne pas la rendre obligatoire au MVP

Critère :

```txt
Les réponses utilisent le contexte local pertinent sans exposer de secrets.
```

### Phase 5 - Préparer le packaging de l'extension

Objectif : rendre BilibopAI préinstallable dans le futur IDE.

À faire :

- vérifier que `harness-core` est bien inclus dans le package extension
- ajouter une commande de packaging VSIX
- tester l'installation de l'extension packagée dans VS Code standard
- documenter les fichiers générés
- éviter les chemins locaux absolus dans le package

Critère :

```txt
L'extension peut être packagée et installée proprement.
```

### Phase 6 - Lancer le fork Code-OSS minimal

Objectif : créer l'IDE Bilibop sans modifier le coeur inutilement.

À faire :

- créer le vrai fork ou submodule Code-OSS dans `apps/code-oss`
- appliquer le branding Bilibop
- appliquer les settings par défaut
- désactiver ou laisser vide la marketplace
- préinstaller BilibopAI
- désactiver la télémétrie si décidé
- produire une build macOS Apple Silicon
- produire une build macOS Intel

Critère :

```txt
Une application Bilibop se lance avec BilibopAI déjà disponible.
```

### Phase 7 - Distribution et durcissement

Objectif : passer d'un prototype utilisable à un produit distribuable.

À faire :

- signature macOS
- notarisation
- scripts de release
- versioning produit
- vérification des secrets dans les artefacts
- documentation utilisateur
- politique provider/API keys

Critère :

```txt
Bilibop peut être installé et lancé comme une application macOS.
```

## Ce qu'il ne faut pas faire maintenant

À éviter avant stabilisation :

- forker Code-OSS trop tôt
- déplacer `harness-core` dans Code-OSS
- modifier profondément `src/vs/workbench`
- créer un marketplace maison
- hardcoder des clés API
- rendre Anthropic/OpenAI obligatoires pour lancer l'extension
- ajouter des features agentiques sans tests de garde-fous

## Priorité immédiate

Phase 2 livrée (cf. `docs/PHASE_2_MULTI_PROVIDER.md`). La prochaine priorité technique est :

```txt
Phase 3 — Rendre l'agent plus proche de Cursor.
```

Ordre recommandé :

```txt
1. Mieux exploiter activeFile/selection/openTabs/languageId dans les prompts
2. Permettre la lecture ciblée de fichiers déclenchée par l'agent
3. Améliorer la lisibilité du diff (rendu coloré ou side-by-side)
4. Conserver l'acceptation utilisateur explicite (déjà OK)
```

Cette étape doit rester indépendante du fork Code-OSS.

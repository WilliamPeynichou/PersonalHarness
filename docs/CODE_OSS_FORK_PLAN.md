# Plan de fork Code-OSS minimal

## Objectif

Préparer une distribution personnalisée de VS Code seulement après validation de l'extension standard et du harness hors VS Code.

Le fork Code-OSS doit rester une couche produit :

- branding Bilibop AI
- extension Bilibop AI préinstallée
- marketplace désactivé ou non configuré
- settings par défaut
- télémétrie désactivée si le produit le demande
- builds macOS Intel et Apple Silicon

Le fork ne doit pas contenir la logique agentique. Le harness reste dans `packages/harness-core` et l'interface produit reste dans `apps/vscode-extension`.

## Préconditions avant création du fork

À vérifier avant de créer `apps/code-oss` :

```bash
pnpm run build
pnpm run test
pnpm run lint
```

Critères bloquants :

- l'extension fonctionne dans VS Code standard avec F5
- la sidebar reste utilisable sans patcher le workbench VS Code
- `harness-core` fonctionne hors VS Code
- les outils lecture/écriture restent contrôlés par `workspaceGuard`
- aucun secret réel n'est commité

## Emplacement futur

```txt
apps/code-oss/             # zone de préparation puis fork ou submodule Code-OSS
apps/vscode-extension/     # extension Bilibop AI à packager et préinstaller
packages/harness-core/     # logique agentique, hors fork Code-OSS
```

`apps/code-oss` peut contenir uniquement des notes et exemples de configuration tant que le fork n'est pas réellement lancé. Ne pas y copier Code-OSS avant décision explicite.

## Fichiers Code-OSS à inspecter plus tard

Ces chemins sont à vérifier dans la version Code-OSS retenue au moment du fork.

| Zone | Fichiers probables | Changement prévu |
| --- | --- | --- |
| Identité produit | `product.json` | Nom produit, nom court, identifiants, dossiers de données, protocole URL, qualité de build |
| Branding visuel | `resources/darwin/*`, `resources/linux/*`, `resources/win32/*` | Icônes application, icônes dock, icônes installer si nécessaire |
| Packaging | `build/gulpfile.*`, `build/darwin/*`, scripts `gulp` | Vérifier les cibles macOS Intel et Apple Silicon |
| Extension préinstallée | `extensions/` ou configuration d'extensions intégrées dans `product.json` | Ajouter l'extension Bilibop AI comme extension builtin |
| Marketplace | `product.json` | Omettre ou neutraliser la configuration `extensionsGallery` |
| Settings par défaut | `product.json` ou configuration defaults supportée par la version retenue | Defaults produit, télémétrie, mise à jour extensions |
| Télémétrie | `product.json`, configuration defaults, scripts de build | Désactiver ou retirer les endpoints de télémétrie |

À éviter explicitement :

- modifications profondes dans `src/vs/workbench`
- import direct de `packages/harness-core` dans le coeur Code-OSS
- marketplace maison au premier fork
- changement du modèle d'extensions VS Code

## Branding minimal

Changements à préparer :

- nom complet : `Bilibop AI`
- nom court : `Bilibop`
- commande CLI éventuelle : `bilibop`
- dossier de données utilisateur dédié, par exemple `.bilibop-ai`
- icône macOS `icns`
- icônes Linux `png`
- icône Windows `ico` si un build Windows est ajouté plus tard
- texte d'about dialog et crédits produit, si exposés par `product.json`

Règle : modifier d'abord les fichiers de configuration produit et les ressources. Ne pas patcher le workbench pour afficher la marque si `product.json` suffit.

## Préinstallation de l'extension

Plan recommandé :

1. Compiler l'extension depuis `apps/vscode-extension`.
2. Packager l'extension en VSIX ou copier sa sortie compilée dans le format builtin attendu par Code-OSS.
3. Déclarer l'extension comme extension intégrée du produit.
4. Vérifier que `harness-core` est inclus comme dépendance workspace packagée.
5. Lancer le produit et confirmer que la vue `Bilibop AI` apparaît sans installation manuelle.

Contraintes :

- l'extension doit continuer à fonctionner dans VS Code standard
- le fork ne doit pas appeler directement le harness
- la sidebar reste le point d'entrée utilisateur
- aucune clé API ne doit être fournie dans le produit

## Marketplace et télémétrie

Marketplace :

- commencer sans marketplace configuré
- éviter toute implémentation de marketplace maison
- documenter clairement le comportement attendu si l'utilisateur ouvre la vue Extensions

Télémétrie :

- définir le niveau par défaut à `off` si supporté par la version retenue
- ne pas configurer d'endpoint propriétaire tant que la politique produit n'est pas écrite
- vérifier que les logs de build ne contiennent pas de secrets

## Builds macOS Intel et Apple Silicon

Risques principaux :

- dépendances natives différentes entre `x64` et `arm64`
- signature et notarisation macOS non configurées
- icônes ou métadonnées incohérentes entre architectures
- scripts Code-OSS sensibles à la version exacte de Node/Yarn
- taille du bundle si l'extension embarque trop de dépendances
- chemins absolus ou artefacts locaux injectés par erreur dans le build

Validation minimale future :

```bash
# dans apps/code-oss, commandes exactes à confirmer avec la version retenue
yarn
yarn gulp vscode-darwin-x64
yarn gulp vscode-darwin-arm64
```

Après chaque build :

- lancer l'application
- vérifier le nom et l'icône
- ouvrir la sidebar Bilibop AI
- exécuter une demande locale sans clé API obligatoire
- confirmer que le marketplace n'est pas configuré
- scanner les artefacts pour secrets ou chemins locaux sensibles

## Décision de lancement

Le fork peut être lancé seulement si :

- les commandes racine `build`, `test` et `lint` passent
- l'extension est stable dans VS Code standard
- l'extension peut être packagée sans dépendre d'un chemin local
- le plan de branding est validé
- la stratégie marketplace/télémétrie est décidée

Jusque-là, `apps/code-oss` reste absent.

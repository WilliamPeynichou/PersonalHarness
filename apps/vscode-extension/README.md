# Bilibop AI Sidebar

Extension VS Code TypeScript minimale pour le projet Bilibop AI IDE.

## Développement

Depuis ce dossier :

```bash
pnpm install
pnpm run compile
```

Pour lancer l'extension :

1. Ouvrir le dossier `apps/vscode-extension` dans VS Code.
2. Aller dans l'onglet Run and Debug.
3. Lancer la configuration `Run Extension`, ou appuyer sur `F5`.
4. Une fenêtre `Extension Development Host` doit s'ouvrir.

## Provider OpenAI

Le provider OpenAI lit la clé depuis l'environnement :

```bash
export OPENAI_API_KEY="..."
```

Le modèle par défaut est `gpt-5-mini`. Il peut être remplacé avec :

```bash
export OPENAI_MODEL="gpt-5.2"
```

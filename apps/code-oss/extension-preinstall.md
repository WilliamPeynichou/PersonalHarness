# Extension preinstall plan

The future Code-OSS fork should consume the existing VS Code extension as a packaged artifact. The extension must remain runnable in standard VS Code.

## Source of truth

```txt
apps/vscode-extension/package.json
apps/vscode-extension/out/
packages/harness-core/dist/
```

## Preparation steps

1. Build the monorepo from the repo root:

   ```bash
   pnpm run build
   ```

2. Package or copy `apps/vscode-extension` in the format expected by the selected Code-OSS version.
3. Ensure the packaged extension includes the workspace dependency `harness-core`.
4. Register the extension as a built-in extension in the future Code-OSS product configuration.
5. Launch the fork and confirm the Bilibop AI view appears without manual install.

## Boundaries

- The fork loads the extension.
- The extension calls `harness-core`.
- Code-OSS core does not call `harness-core`.
- Provider secrets stay in the user's environment, not in the product bundle.

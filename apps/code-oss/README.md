# Code-OSS fork preparation

This directory is a preparation area only. It is not a Code-OSS fork yet and it must not contain copied Code-OSS sources until the fork is explicitly started.

## Current scope

The future fork should only provide product packaging:

- Bilibop AI branding
- Bilibop AI extension preinstalled
- default settings
- marketplace disabled or left unconfigured
- optional telemetry disablement
- macOS Intel and Apple Silicon build targets

The agentic logic stays outside Code-OSS:

```txt
apps/vscode-extension/     # VS Code extension and sidebar
packages/harness-core/     # harness, tools, RAG, providers
apps/code-oss/             # future product wrapper only
```

## Do not do here

- Do not move `packages/harness-core` into Code-OSS.
- Do not import the harness directly from the workbench.
- Do not rewrite VS Code workbench internals for the MVP.
- Do not add a custom marketplace implementation at this stage.
- Do not commit API keys, local certificates, notarization credentials, or build secrets.

## Future fork workflow

1. Keep validating the existing repo first:

   ```bash
   pnpm run build
   pnpm run test
   pnpm run lint
   ```

2. Create the actual Code-OSS source as either:

   ```txt
   apps/code-oss/source/       # copied fork source
   apps/code-oss/code-oss/     # git submodule or clone
   ```

3. Apply the product changes using the examples in this directory.
4. Package `apps/vscode-extension` as the built-in Bilibop AI extension.
5. Build and test macOS `x64` and `arm64` separately.

## Minimal validation once the fork exists

- The application name and icon are Bilibop AI.
- The Bilibop AI activity bar entry is visible on first launch.
- The sidebar works without installing an extension manually.
- The harness still runs from the extension boundary, not from Code-OSS core.
- Marketplace configuration is absent or intentionally disabled.
- Telemetry defaults match the product decision.

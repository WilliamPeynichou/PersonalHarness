export type { HarnessEvent, HarnessRequest, HarnessResponse, HarnessStreamEvent, ProposedDiff } from "./types";
export { runHarness, runHarnessStream } from "./runHarness";
export { createProposedDiff } from "./diffs/proposeDiff";
export type { LLMMessage, LLMProvider } from "./providers/types";
export type { ModelDescriptor, ProviderId } from "./providers/catalog";
export {
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_PROVIDER,
  STATIC_MODEL_CATALOG,
  isProviderId
} from "./providers/catalog";
export { AnthropicProvider, createAnthropicProviderFromEnv } from "./providers/anthropicProvider";
export { createOpenAIProviderFromEnv, OpenAIProvider } from "./providers/openaiProvider";
export { createProvider } from "./providers/registry";
export { listModels } from "./providers/listModels";
export type { Tool, ToolContext, ToolRisk } from "./tools/types";
export { applyPatchTool } from "./tools/applyPatch";
export { grepTool } from "./tools/grep";
export { listFilesTool } from "./tools/listFiles";
export { readFileTool } from "./tools/readFile";
export { assertInsideWorkspace } from "./security/workspaceGuard";
export { assertAllowedWorkspacePath } from "./security/workspaceGuard";
export { indexWorkspace } from "./rag/simpleIndexer";
export { retrieveRelevantChunks } from "./rag/simpleRetriever";

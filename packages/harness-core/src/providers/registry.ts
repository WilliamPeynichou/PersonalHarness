import { AnthropicProvider } from "./anthropicProvider";
import type { ProviderId } from "./catalog";
import { requireEnv } from "./env";
import { OpenAIProvider } from "./openaiProvider";
import type { LLMProvider } from "./types";

type CreateProviderOptions = {
  provider: ProviderId;
  model?: string;
};

export function createProvider(
  options: CreateProviderOptions,
  env: NodeJS.ProcessEnv = process.env
): LLMProvider {
  switch (options.provider) {
    case "openai":
      return new OpenAIProvider({
        apiKey: requireEnv(env, "OPENAI_API_KEY", "OpenAI"),
        model: options.model
      });
    case "anthropic":
      return new AnthropicProvider({
        apiKey: requireEnv(env, "ANTHROPIC_API_KEY", "Anthropic"),
        model: options.model
      });
  }
}

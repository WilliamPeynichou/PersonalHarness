import type { ModelDescriptor, ProviderId } from "./catalog";

const OPENAI_MODELS_URL = "https://api.openai.com/v1/models";
const ANTHROPIC_MODELS_URL = "https://api.anthropic.com/v1/models";
const ANTHROPIC_VERSION = "2023-06-01";

type OpenAIModelsResponse = {
  data?: Array<{
    id?: unknown;
  }>;
};

type AnthropicModelsResponse = {
  data?: Array<{
    id?: unknown;
    display_name?: unknown;
  }>;
};

export async function listModels(
  provider: ProviderId,
  env: NodeJS.ProcessEnv = process.env
): Promise<ModelDescriptor[]> {
  try {
    if (provider === "openai") {
      return await listOpenAIModels(env);
    }
    return await listAnthropicModels(env);
  } catch {
    return [];
  }
}

async function listOpenAIModels(env: NodeJS.ProcessEnv): Promise<ModelDescriptor[]> {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return [];
  }

  const response = await fetch(OPENAI_MODELS_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    return [];
  }

  const body = (await response.json()) as OpenAIModelsResponse;
  const items = body.data ?? [];

  return items
    .map((item) => (typeof item.id === "string" ? item.id : null))
    .filter((id): id is string => id !== null && id.length > 0)
    .map((id) => ({
      id,
      label: id,
      provider: "openai" as const,
      supportsStreaming: true,
      supportsTools: true
    }));
}

async function listAnthropicModels(env: NodeJS.ProcessEnv): Promise<ModelDescriptor[]> {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return [];
  }

  const response = await fetch(ANTHROPIC_MODELS_URL, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json"
    }
  });

  if (!response.ok) {
    return [];
  }

  const body = (await response.json()) as AnthropicModelsResponse;
  const items = body.data ?? [];

  return items
    .map((item): ModelDescriptor | null => {
      const id = typeof item.id === "string" ? item.id : null;
      if (!id || id.length === 0) {
        return null;
      }
      const label = typeof item.display_name === "string" && item.display_name.length > 0 ? item.display_name : id;
      return {
        id,
        label,
        provider: "anthropic",
        supportsStreaming: true,
        supportsTools: true
      };
    })
    .filter((descriptor): descriptor is ModelDescriptor => descriptor !== null);
}

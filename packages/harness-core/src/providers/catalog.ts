export type ProviderId = "openai" | "anthropic";

export type ModelDescriptor = {
  id: string;
  label: string;
  provider: ProviderId;
  supportsStreaming: boolean;
  supportsTools: boolean;
};

export const STATIC_MODEL_CATALOG: Record<ProviderId, ModelDescriptor[]> = {
  openai: [
    {
      id: "gpt-5-mini",
      label: "GPT-5 mini",
      provider: "openai",
      supportsStreaming: true,
      supportsTools: true
    },
    {
      id: "gpt-5",
      label: "GPT-5",
      provider: "openai",
      supportsStreaming: true,
      supportsTools: true
    }
  ],
  anthropic: [
    {
      id: "claude-opus-4-7",
      label: "Claude Opus 4.7",
      provider: "anthropic",
      supportsStreaming: true,
      supportsTools: true
    },
    {
      id: "claude-sonnet-4-6",
      label: "Claude Sonnet 4.6",
      provider: "anthropic",
      supportsStreaming: true,
      supportsTools: true
    },
    {
      id: "claude-haiku-4-5-20251001",
      label: "Claude Haiku 4.5",
      provider: "anthropic",
      supportsStreaming: true,
      supportsTools: true
    }
  ]
};

export const DEFAULT_PROVIDER: ProviderId = "openai";

export const DEFAULT_MODEL_BY_PROVIDER: Record<ProviderId, string> = {
  openai: "gpt-5-mini",
  anthropic: "claude-sonnet-4-6"
};

export function isProviderId(value: unknown): value is ProviderId {
  return value === "openai" || value === "anthropic";
}

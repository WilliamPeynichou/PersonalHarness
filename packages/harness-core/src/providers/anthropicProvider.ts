import { requireEnv } from "./env";
import { parseEventJson, readServerSentEvents } from "./sse";
import type { LLMMessage, LLMProvider } from "./types";

type AnthropicProviderOptions = {
  apiKey: string;
  model?: string;
  maxTokens?: number;
};

type AnthropicResponseBody = {
  content?: Array<{
    type?: string;
    text?: unknown;
  }>;
  error?: {
    message?: unknown;
    type?: unknown;
  };
};

type AnthropicStreamEvent = {
  type?: unknown;
  delta?: {
    type?: unknown;
    text?: unknown;
  };
  error?: {
    message?: unknown;
  };
};

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 4096;

export class AnthropicProvider implements LLMProvider {
  public readonly id = "anthropic";
  public readonly name: string;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;

  public constructor(options: AnthropicProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_MODEL;
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.name = `Anthropic (${this.model})`;
  }

  public async complete(messages: LLMMessage[]): Promise<string> {
    const response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildRequestBody(messages, false))
    });

    const body = await parseResponseBody(response);

    if (!response.ok) {
      throw new Error(extractAnthropicError(body, response.status));
    }

    return extractAnthropicText(body);
  }

  public async *stream(messages: LLMMessage[]): AsyncIterable<string> {
    const response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildRequestBody(messages, true))
    });

    if (!response.ok) {
      const body = await parseResponseBody(response);
      throw new Error(extractAnthropicError(body, response.status));
    }

    if (!response.body) {
      throw new Error("La réponse Anthropic streaming ne contient pas de flux lisible.");
    }

    for await (const sseEvent of readServerSentEvents(response.body)) {
      const event = parseEventJson<AnthropicStreamEvent>(sseEvent);
      if (!event) {
        continue;
      }

      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta" &&
        typeof event.delta.text === "string"
      ) {
        yield event.delta.text;
      }

      if (event.type === "error") {
        const message = typeof event.error?.message === "string" ? event.error.message : "Erreur Anthropic streaming.";
        throw new Error(message);
      }
    }
  }

  private buildHeaders(): Record<string, string> {
    return {
      "x-api-key": this.apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json"
    };
  }

  private buildRequestBody(messages: LLMMessage[], stream: boolean): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.maxTokens,
      messages: buildAnthropicMessages(messages)
    };

    const systemPrompt = buildAnthropicSystem(messages);
    if (systemPrompt) {
      body.system = systemPrompt;
    }

    if (stream) {
      body.stream = true;
    }

    return body;
  }
}

export function createAnthropicProviderFromEnv(env: NodeJS.ProcessEnv = process.env): AnthropicProvider {
  return new AnthropicProvider({
    apiKey: requireEnv(env, "ANTHROPIC_API_KEY", "Anthropic"),
    model: env.ANTHROPIC_MODEL?.trim() || undefined
  });
}

function buildAnthropicSystem(messages: LLMMessage[]): string | null {
  const systemContent = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n")
    .trim();

  return systemContent.length > 0 ? systemContent : null;
}

function buildAnthropicMessages(
  messages: LLMMessage[]
): Array<{ role: "user" | "assistant"; content: string }> {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content
    }));
}

async function parseResponseBody(response: Response): Promise<AnthropicResponseBody> {
  const text = await response.text();

  if (text.length === 0) {
    return {};
  }

  try {
    return JSON.parse(text) as AnthropicResponseBody;
  } catch {
    return {
      error: {
        message: text
      }
    };
  }
}

function extractAnthropicError(body: AnthropicResponseBody, status: number): string {
  const message = typeof body.error?.message === "string" ? body.error.message : undefined;
  return `Erreur Anthropic (${status})${message ? ` : ${message}` : "."}`;
}

function extractAnthropicText(body: AnthropicResponseBody): string {
  const text = body.content
    ?.filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("");

  if (text && text.trim().length > 0) {
    return text;
  }

  throw new Error("La réponse Anthropic ne contient pas de texte exploitable.");
}

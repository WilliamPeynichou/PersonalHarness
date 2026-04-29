import type { LLMMessage, LLMProvider } from "./types";

type OpenAIProviderOptions = {
  apiKey: string;
  model?: string;
};

type OpenAIResponseBody = {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: unknown;
    }>;
  }>;
  error?: {
    message?: unknown;
  };
};

type OpenAIStreamEvent = {
  type?: unknown;
  delta?: unknown;
  error?: {
    message?: unknown;
  };
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5-mini";

export class OpenAIProvider implements LLMProvider {
  public readonly id = "openai";
  public readonly name: string;

  private readonly apiKey: string;
  private readonly model: string;

  public constructor(options: OpenAIProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_MODEL;
    this.name = `OpenAI (${this.model})`;
  }

  public async complete(messages: LLMMessage[]): Promise<string> {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        instructions: buildInstructions(messages),
        input: buildInput(messages),
        store: false
      })
    });

    const body = await parseResponseBody(response);

    if (!response.ok) {
      throw new Error(extractOpenAIError(body, response.status));
    }

    return extractOutputText(body);
  }

  public async *stream(messages: LLMMessage[]): AsyncIterable<string> {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        instructions: buildInstructions(messages),
        input: buildInput(messages),
        store: false,
        stream: true
      })
    });

    if (!response.ok) {
      const body = await parseResponseBody(response);
      throw new Error(extractOpenAIError(body, response.status));
    }

    if (!response.body) {
      throw new Error("La réponse OpenAI streaming ne contient pas de flux lisible.");
    }

    for await (const event of readServerSentEvents(response.body)) {
      if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
        yield event.delta;
      }

      if (event.type === "error") {
        const message = typeof event.error?.message === "string" ? event.error.message : "Erreur OpenAI streaming.";
        throw new Error(message);
      }
    }
  }
}

export function createOpenAIProviderFromEnv(env: NodeJS.ProcessEnv = process.env): OpenAIProvider {
  const apiKey = env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY est manquante. Définis cette variable d'environnement pour utiliser le provider OpenAI.");
  }

  return new OpenAIProvider({
    apiKey,
    model: env.OPENAI_MODEL?.trim() || undefined
  });
}

function buildInstructions(messages: LLMMessage[]): string {
  return messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
}

function buildInput(messages: LLMMessage[]): Array<{ role: "user" | "assistant"; content: string }> {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content
    }));
}

async function parseResponseBody(response: Response): Promise<OpenAIResponseBody> {
  const text = await response.text();

  if (text.length === 0) {
    return {};
  }

  try {
    return JSON.parse(text) as OpenAIResponseBody;
  } catch {
    return {
      error: {
        message: text
      }
    };
  }
}

function extractOpenAIError(body: OpenAIResponseBody, status: number): string {
  const message = typeof body.error?.message === "string" ? body.error.message : undefined;
  return `Erreur OpenAI (${status})${message ? ` : ${message}` : "."}`;
}

function extractOutputText(body: OpenAIResponseBody): string {
  if (typeof body.output_text === "string" && body.output_text.trim().length > 0) {
    return body.output_text;
  }

  const text = body.output
    ?.flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text" && typeof content.text === "string")
    .map((content) => content.text)
    .join("");

  if (text && text.trim().length > 0) {
    return text;
  }

  throw new Error("La réponse OpenAI ne contient pas de texte exploitable.");
}

async function* readServerSentEvents(stream: ReadableStream<Uint8Array>): AsyncIterable<OpenAIStreamEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      for (const rawEvent of drainServerSentEventFrames(buffer)) {
        buffer = rawEvent.remaining;

        for (const event of parseServerSentEvents(rawEvent.frame)) {
          yield event;
        }
      }
    }

    buffer += decoder.decode();

    for (const event of parseServerSentEvents(buffer)) {
      yield event;
    }
  } finally {
    reader.releaseLock();
  }
}

function drainServerSentEventFrames(buffer: string): Array<{ frame: string; remaining: string }> {
  const frames: Array<{ frame: string; remaining: string }> = [];
  let remaining = buffer;

  while (true) {
    const separator = remaining.match(/\r?\n\r?\n/);

    if (!separator || separator.index === undefined) {
      break;
    }

    frames.push({
      frame: remaining.slice(0, separator.index),
      remaining: remaining.slice(separator.index + separator[0].length)
    });

    remaining = remaining.slice(separator.index + separator[0].length);
  }

  return frames;
}

function parseServerSentEvents(frame: string): OpenAIStreamEvent[] {
  const dataLines = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trimStart().trim())
    .filter((line) => line.length > 0 && line !== "[DONE]");

  if (dataLines.length === 0) {
    return [];
  }

  const joinedData = dataLines.join("\n");

  try {
    return [JSON.parse(joinedData) as OpenAIStreamEvent];
  } catch {
    return dataLines.map((line) => JSON.parse(line) as OpenAIStreamEvent);
  }
}

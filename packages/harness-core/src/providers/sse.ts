export type ServerSentEvent = {
  type?: string;
  data: string;
};

export async function* readServerSentEvents(
  stream: ReadableStream<Uint8Array>
): AsyncIterable<ServerSentEvent> {
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

      while (true) {
        const separator = buffer.match(/\r?\n\r?\n/);

        if (!separator || separator.index === undefined) {
          break;
        }

        const frame = buffer.slice(0, separator.index);
        buffer = buffer.slice(separator.index + separator[0].length);

        const event = parseFrame(frame);
        if (event) {
          yield event;
        }
      }
    }

    buffer += decoder.decode();

    if (buffer.length > 0) {
      const event = parseFrame(buffer);
      if (event) {
        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseFrame(frame: string): ServerSentEvent | null {
  let eventType: string | undefined;
  const dataLines: string[] = [];

  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith(":")) {
      continue;
    }

    if (line.startsWith("event:")) {
      eventType = line.slice("event:".length).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
      continue;
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  const data = dataLines.join("\n").trim();

  if (data.length === 0 || data === "[DONE]") {
    return null;
  }

  return { type: eventType, data };
}

export function parseEventJson<T>(event: ServerSentEvent): T | null {
  try {
    return JSON.parse(event.data) as T;
  } catch {
    return null;
  }
}

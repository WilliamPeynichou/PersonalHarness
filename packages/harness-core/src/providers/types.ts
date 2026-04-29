export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMProvider = {
  id: string;
  name: string;
  complete(messages: LLMMessage[]): Promise<string>;
  stream?(messages: LLMMessage[]): AsyncIterable<string>;
};

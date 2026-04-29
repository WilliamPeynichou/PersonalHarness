export type ToolRisk = "read" | "write" | "shell" | "network";

export type ToolContext = {
  workspacePath: string;
};

export type Tool<Input = unknown, Output = unknown> = {
  name: string;
  description: string;
  risk: ToolRisk;
  execute(input: Input, context: ToolContext): Promise<Output>;
};

export type HarnessRequest = {
  prompt: string;
  workspacePath?: string;
  activeFile?: string;
  selection?: string;
  openTabs?: string[];
  languageId?: string;
};

export type ProposedDiff = {
  id: string;
  filePath: string;
  originalContent: string;
  newContent: string;
  summary: string;
};

export type HarnessEvent =
  | { type: "message"; text: string }
  | { type: "tool_call_started"; tool: string; args: unknown }
  | { type: "tool_call_finished"; tool: string; result: unknown }
  | { type: "error"; message: string };

export type HarnessStreamEvent =
  | { type: "message_delta"; text: string }
  | { type: "proposed_diff"; diff: ProposedDiff }
  | { type: "tool_call_started"; tool: string; args: unknown }
  | { type: "tool_call_finished"; tool: string; result: unknown }
  | { type: "permission_required"; permissionId: string; reason: string }
  | { type: "done" }
  | { type: "error"; message: string };

export type HarnessResponse = {
  answer: string;
  events: HarnessEvent[];
  proposedDiffs?: ProposedDiff[];
};

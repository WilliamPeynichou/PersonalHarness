const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  applyPatchTool,
  assertInsideWorkspace,
  grepTool,
  indexWorkspace,
  listFilesTool,
  readFileTool,
  retrieveRelevantChunks
} = require("../dist");

function createWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bilibop-harness-test-"));
}

function writeWorkspaceFile(workspacePath, relativePath, content) {
  const absolutePath = path.join(workspacePath, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
  return absolutePath;
}

test("assertInsideWorkspace blocks paths outside the workspace", () => {
  const workspacePath = createWorkspace();
  const outsidePath = path.join(path.dirname(workspacePath), "outside.txt");

  assert.throws(
    () => assertInsideWorkspace(workspacePath, outsidePath),
    /outside workspace/
  );
});

test("read_file reads an allowed workspace file", async () => {
  const workspacePath = createWorkspace();
  writeWorkspaceFile(workspacePath, "src/example.ts", "export const value = 42;\n");

  const result = await readFileTool.execute({ path: "src/example.ts" }, { workspacePath });

  assert.equal(result.path, "src/example.ts");
  assert.equal(result.content, "export const value = 42;\n");
});

test("read_file blocks .env files", async () => {
  const workspacePath = createWorkspace();
  writeWorkspaceFile(workspacePath, ".env", "OPENAI_API_KEY=secret\n");

  await assert.rejects(
    readFileTool.execute({ path: ".env" }, { workspacePath }),
    /blocked by workspace policy/
  );
});

test("list_files ignores node_modules", async () => {
  const workspacePath = createWorkspace();
  writeWorkspaceFile(workspacePath, "src/app.ts", "console.log('ok');\n");
  writeWorkspaceFile(workspacePath, "node_modules/pkg/index.js", "module.exports = {};\n");

  const result = await listFilesTool.execute({ maxDepth: 8 }, { workspacePath });

  assert.deepEqual(result.files, ["src/app.ts"]);
});

test("grep returns matching file and line", async () => {
  const workspacePath = createWorkspace();
  writeWorkspaceFile(workspacePath, "src/app.ts", "first line\nneedle here\nlast line\n");

  const result = await grepTool.execute(
    { query: "needle", include: "src/*.ts" },
    { workspacePath }
  );

  assert.deepEqual(result.matches, [
    {
      file: "src/app.ts",
      line: 2,
      text: "needle here"
    }
  ]);
});

test("applyPatch blocks forbidden files", async () => {
  const workspacePath = createWorkspace();
  writeWorkspaceFile(workspacePath, ".env", "TOKEN=secret\n");

  await assert.rejects(
    applyPatchTool.execute(
      {
        diff: {
          id: "blocked-env",
          filePath: ".env",
          originalContent: "TOKEN=secret\n",
          newContent: "TOKEN=changed\n",
          summary: "Should be blocked"
        }
      },
      { workspacePath }
    ),
    /blocked by workspace policy/
  );
});

test("applyPatch writes allowed files only when the original content matches", async () => {
  const workspacePath = createWorkspace();
  const filePath = writeWorkspaceFile(workspacePath, "src/app.ts", "const value = 1;\n");

  const result = await applyPatchTool.execute(
    {
      diff: {
        id: "allowed-src",
        filePath: "src/app.ts",
        originalContent: "const value = 1;\n",
        newContent: "const value = 2;\n",
        summary: "Update value"
      }
    },
    { workspacePath }
  );

  assert.equal(result.applied, true);
  assert.equal(fs.readFileSync(filePath, "utf8"), "const value = 2;\n");

  await assert.rejects(
    applyPatchTool.execute(
      {
        diff: {
          id: "stale-src",
          filePath: "src/app.ts",
          originalContent: "const value = 1;\n",
          newContent: "const value = 3;\n",
          summary: "Reject stale patch"
        }
      },
      { workspacePath }
    ),
    /fichier a changé/
  );
});

test("simple RAG indexes allowed content and skips blocked secrets", async () => {
  const workspacePath = createWorkspace();
  writeWorkspaceFile(workspacePath, "src/agent.ts", "export const topic = 'vector search harness';\n");
  writeWorkspaceFile(workspacePath, ".env", "VECTOR_SEARCH_SECRET=secret\n");

  const summary = await indexWorkspace(workspacePath);
  const chunks = await retrieveRelevantChunks(workspacePath, "vector search", { maxChunks: 2 });

  assert.equal(summary.chunkCount, 1);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].filePath, "src/agent.ts");
  assert.match(chunks[0].text, /vector search harness/);
  assert.doesNotMatch(JSON.stringify(chunks), /VECTOR_SEARCH_SECRET/);
});

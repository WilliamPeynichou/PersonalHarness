const assert = require("node:assert/strict");
const test = require("node:test");

const {
  AnthropicProvider,
  OpenAIProvider,
  STATIC_MODEL_CATALOG,
  createProvider,
  isProviderId,
  listModels
} = require("../dist");

test("createProvider routes openai to OpenAIProvider", () => {
  const provider = createProvider({ provider: "openai", model: "gpt-5-mini" }, { OPENAI_API_KEY: "sk-test" });

  assert.equal(provider.id, "openai");
  assert.ok(provider instanceof OpenAIProvider);
  assert.match(provider.name, /gpt-5-mini/);
});

test("createProvider routes anthropic to AnthropicProvider", () => {
  const provider = createProvider(
    { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
    { ANTHROPIC_API_KEY: "sk-ant-test" }
  );

  assert.equal(provider.id, "anthropic");
  assert.ok(provider instanceof AnthropicProvider);
  assert.match(provider.name, /claude-haiku-4-5-20251001/);
});

test("createProvider throws a clear error when OPENAI_API_KEY is missing", () => {
  assert.throws(
    () => createProvider({ provider: "openai" }, {}),
    /OPENAI_API_KEY est manquante/
  );
});

test("createProvider throws a clear error when ANTHROPIC_API_KEY is missing", () => {
  assert.throws(
    () => createProvider({ provider: "anthropic" }, {}),
    /ANTHROPIC_API_KEY est manquante/
  );
});

test("isProviderId narrows correctly", () => {
  assert.equal(isProviderId("openai"), true);
  assert.equal(isProviderId("anthropic"), true);
  assert.equal(isProviderId("mistral"), false);
  assert.equal(isProviderId(undefined), false);
  assert.equal(isProviderId(42), false);
});

test("STATIC_MODEL_CATALOG provides at least one model per provider", () => {
  assert.ok(STATIC_MODEL_CATALOG.openai.length >= 1);
  assert.ok(STATIC_MODEL_CATALOG.anthropic.length >= 1);
  assert.ok(STATIC_MODEL_CATALOG.openai.every((model) => model.provider === "openai"));
  assert.ok(STATIC_MODEL_CATALOG.anthropic.every((model) => model.provider === "anthropic"));
});

test("listModels returns [] when API key is missing", async () => {
  const openaiResult = await listModels("openai", {});
  const anthropicResult = await listModels("anthropic", {});

  assert.deepEqual(openaiResult, []);
  assert.deepEqual(anthropicResult, []);
});

test("listModels maps OpenAI /v1/models response to ModelDescriptor[]", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        data: [
          { id: "gpt-5-mini" },
          { id: "gpt-4o" },
          { id: 42 },
          { id: "" }
        ]
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );

  try {
    const models = await listModels("openai", { OPENAI_API_KEY: "sk-test" });

    assert.equal(models.length, 2);
    assert.deepEqual(
      models.map((m) => m.id),
      ["gpt-5-mini", "gpt-4o"]
    );
    assert.ok(models.every((m) => m.provider === "openai"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listModels maps Anthropic /v1/models response, preferring display_name", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        data: [
          { id: "claude-sonnet-4-6", display_name: "Claude Sonnet 4.6" },
          { id: "claude-opus-4-7" }
        ]
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );

  try {
    const models = await listModels("anthropic", { ANTHROPIC_API_KEY: "sk-ant-test" });

    assert.equal(models.length, 2);
    assert.equal(models[0].label, "Claude Sonnet 4.6");
    assert.equal(models[1].label, "claude-opus-4-7");
    assert.ok(models.every((m) => m.provider === "anthropic"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listModels returns [] when fetch throws", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network down");
  };

  try {
    const models = await listModels("openai", { OPENAI_API_KEY: "sk-test" });
    assert.deepEqual(models, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listModels returns [] when API responds with non-2xx", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: { message: "unauthorized" } }), { status: 401 });

  try {
    const models = await listModels("anthropic", { ANTHROPIC_API_KEY: "sk-ant-test" });
    assert.deepEqual(models, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

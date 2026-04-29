const assert = require("node:assert/strict");
const test = require("node:test");

const { getWebviewHtml } = require("../out/sidebar/getWebviewHtml");

test("webview HTML is generated with the expected chat message bridge", () => {
  const html = getWebviewHtml({ cspSource: "vscode-resource:" });

  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /Bilibop AI/);
  assert.match(html, /textarea id="prompt"/);
  assert.match(html, /vscode\.postMessage/);
  assert.match(html, /type: "user_prompt"/);
  assert.match(html, /harness_event/);
  assert.match(html, /apply_proposed_diff/);
});

test("webview HTML exposes provider/model selectors and dynamic catalog wiring", () => {
  const html = getWebviewHtml({ cspSource: "vscode-resource:" });

  assert.match(html, /<select id="provider">/);
  assert.match(html, /<option value="openai">/);
  assert.match(html, /<option value="anthropic">/);
  assert.match(html, /<select id="model"/);
  assert.match(html, /request_initial_state/);
  assert.match(html, /request_models/);
  assert.match(html, /models_list/);
  assert.match(html, /initial_state/);
});

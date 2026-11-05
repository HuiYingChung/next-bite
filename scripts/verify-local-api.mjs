import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer, preview } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const originalFetch = globalThis.fetch;
const localOrigins = new Set();
let providerCalls = 0;
const meal = {
  displayName: "飯與豆腐",
  mealSlot: "Lunch",
  components: [{
    name: "豆腐",
    group: "protein",
    amount: { quantity: 100, unit: "g", qualifier: "exact", originalText: "100 克豆腐" },
    confidence: "high",
  }],
  cookingMethod: "Other",
  mealSource: "Unspecified",
  portion: { size: "Unspecified", confidence: "limited" },
  assumptions: [],
  clarification: null,
};

globalThis.fetch = async (url, options) => {
  if (String(url) === "https://api.openai.com/v1/responses") {
    providerCalls += 1;
    assert.equal(options.headers.authorization, "Bearer sk-test-only");
    const body = JSON.parse(options.body);
    assert.equal(body.input, "100 克豆腐與飯");
    assert.equal(body.store, false);
    return new Response(JSON.stringify({
      status: "completed",
      output: [{ content: [{ type: "output_text", text: JSON.stringify(meal) }] }],
    }), { headers: { "content-type": "application/json" } });
  }
  assert.ok(localOrigins.has(new URL(url).origin), "Only local test servers may receive real HTTP requests.");
  return originalFetch(url, options);
};

async function verifyRoute(server, mode) {
  const address = server.httpServer.address();
  const origin = `http://127.0.0.1:${address.port}`;
  localOrigins.add(origin);
  async function request({ method = "POST", body, key, status }) {
    const response = await fetch(`${origin}/api/parse-meal`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(key ? { "x-nextbite-openai-key": key } : {}),
      },
      ...(body === undefined ? {} : { body }),
    });
    assert.equal(response.status, status, `${mode}: expected HTTP ${status}, received ${response.status}`);
    assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
    assert.match(response.headers.get("content-type"), /application\/json/);
    return response.json();
  }
  await request({ method: "GET", status: 405 });
  await request({ body: JSON.stringify({ text: "rice" }), status: 401 });
  await request({ body: "{", key: "sk-test-only", status: 400 });
  await request({ body: "x".repeat(8193), key: "sk-test-only", status: 413 });
  const result = await request({
    body: JSON.stringify({ text: "100 克豆腐與飯", locale: "zh", mealSlotHint: "Lunch" }),
    key: "sk-test-only",
    status: 200,
  });
  assert.deepEqual(result.meal, meal, `${mode}: the production handler must return the validated provider meal`);
}

let devServer;
let previewServer;
try {
  const config = { root, envFile: false, logLevel: "silent" };
  devServer = await createServer({ ...config, server: { host: "127.0.0.1", port: 0, strictPort: true } });
  // Vite 5's listen(0) selects its default port. Bind its underlying HTTP server
  // directly so this check gets a free port without disturbing an open app.
  await new Promise((resolve, reject) => {
    devServer.httpServer.once("error", reject);
    devServer.httpServer.listen(0, "127.0.0.1", resolve);
  });
  await verifyRoute(devServer, "development");
  previewServer = await preview({ ...config, preview: { host: "127.0.0.1", port: 0, strictPort: true } });
  await verifyRoute(previewServer, "preview");
  assert.equal(providerCalls, 2, "Only successful local fixtures should reach the mocked provider.");
  console.log(JSON.stringify({ developmentRoute: "passed", previewRoute: "passed", realProviderRequests: 0 }));
} finally {
  globalThis.fetch = originalFetch;
  if (previewServer) {
    previewServer.httpServer.closeAllConnections();
    await new Promise((resolve, reject) => previewServer.httpServer.close((error) => error ? reject(error) : resolve()));
  }
  if (devServer) await devServer.close();
}

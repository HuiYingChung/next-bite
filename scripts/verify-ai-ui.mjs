import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Render the actual App and invoke its actual JSX handlers. The small hook
// harness supplies React state/ref semantics; DOM layout and effects are not
// simulated. The request and record-store boundaries are controlled locally.
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const modules = new Map();
let active;
let client;
const hooks = {
  useState(initial) {
    const index = active.cursor++;
    if (!(index in active.values)) active.values[index] = typeof initial === "function" ? initial() : initial;
    const owner = active;
    return [owner.values[index], update => {
      owner.values[index] = typeof update === "function" ? update(owner.values[index]) : update;
    }];
  },
  useRef(initial) {
    const index = active.cursor++;
    return active.values[index] ??= { current: initial };
  },
  useMemo: callback => callback(),
  useEffect: callback => active.effects.push(callback),
  useId: () => "test-id",
};
function loadSource(relativePath) {
  const absolute = path.resolve(root, relativePath);
  if (modules.has(absolute)) return modules.get(absolute).exports;
  const module = { exports: {} };
  modules.set(absolute, module);
  const output = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    fileName: absolute.replace(/\.mjs$/, ".ts"),
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const localRequire = specifier => {
    if (specifier.endsWith(".css")) return {};
    if (specifier === "react") return hooks;
    if (specifier === "react/jsx-runtime") return require(specifier);
    if (specifier === "./use-record-state") return { useRecordState: () => active.store };
    if (specifier === "./ai") return { ...client, parseMealWithAi: request => active.parse(request) };
    assert.ok(specifier.startsWith("."), `Unexpected module: ${specifier}`);
    const candidate = path.resolve(path.dirname(absolute), specifier);
    const file = [candidate, `${candidate}.ts`, `${candidate}.tsx`].find(file => fs.existsSync(file) && fs.statSync(file).isFile());
    assert.ok(file, `Missing module: ${specifier}`);
    return loadSource(file);
  };
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}
client = loadSource("src/ai.ts");
const { default: App } = loadSource("src/App.tsx");
const { createBlankState } = loadSource("src/data.ts");
function elements(node, predicate, found = []) {
  if (!node || typeof node !== "object") return found;
  if (predicate(node)) found.push(node);
  for (const child of [node.props?.children].flat(Infinity)) elements(child, predicate, found);
  return found;
}
function content(node) {
  if (Array.isArray(node)) return node.map(content).join("");
  if (typeof node === "string" || typeof node === "number") return String(node);
  return node && typeof node === "object" ? content(node.props?.children) : "";
}
const one = (tree, predicate) => {
  const result = elements(tree, predicate);
  assert.equal(result.length, 1, "Expected one matching control");
  return result[0];
};
const button = (tree, label) => one(tree, node => node.type === "button" && content(node) === label);
const keyInput = tree => one(tree, node => node.type === "input" && node.props.type === "password");
const aiInput = tree => one(tree, node => node.type === "textarea" && node.props.maxLength === 600);
const composer = tree => one(tree, node => node.props?.id === "meal-input");
const drawer = tree => one(tree, node => node.props?.title === "Meal record" || node.props?.title === "餐點紀錄");
const labels = locale => locale === "zh"
  ? { open: "記錄一餐", run: "整理並檢查", busy: "整理中…", forget: "清除金鑰" }
  : { open: "Record a meal", run: "Organize & review", busy: "Organizing…", forget: "Forget this key" };
function harness(locale = "en") {
  const state = { ...createBlankState(new Date()), plannedMeals: [] };
  state.days.find(day => day.isToday).todayLog.Lunch.protein = ["Chicken"];
  const owner = { values: [], cursor: 0, effects: [], locale, requests: [], parse: null, saves: 0 };
  owner.store = {
    state, stateRef: { current: state }, ready: true, busy: false, failed: false,
    refresh: async () => {},
    update: async (update, base) => {
      owner.saves += 1;
      owner.store.state = update(base ?? owner.store.state);
      owner.store.stateRef.current = owner.store.state;
      return { status: "ok" };
    },
  };
  owner.parse = request => new Promise((resolve, reject) => owner.requests.push({ request, resolve, reject }));
  owner.render = () => {
    active = owner;
    owner.cursor = 0;
    owner.effects = [];
    owner.tree = App();
    return owner.tree;
  };
  owner.prepare = () => {
    let tree = owner.render();
    button(tree, labels(locale).open).props.onClick();
    tree = owner.render();
    keyInput(tree).props.onChange({ target: { value: "mock-key-never-sent" } });
    aiInput(tree).props.onChange({ target: { value: "rice for lunch" } });
    return owner.render();
  };
  owner.start = () => {
    const pending = button(owner.tree, labels(locale).run).props.onClick();
    owner.render();
    return pending;
  };
  return owner;
}
const meal = (name = "Rice") => ({
  displayName: name, mealSlot: "Lunch", cookingMethod: "Boiled", mealSource: "Unspecified",
  components: [{ name, group: "carb", confidence: "high", amount: { quantity: null, unit: "unspecified", qualifier: "unspecified", originalText: null } }],
  portion: { size: "Unspecified", confidence: "limited" }, assumptions: [], clarification: null,
});
const originalWindow = globalThis.window;
const originalFetch = globalThis.fetch;
globalThis.window = {
  localStorage: { getItem: key => key === "next-bite-locale" ? active.locale : null },
  requestAnimationFrame: callback => callback(),
};
globalThis.fetch = async () => { throw new Error("Network is prohibited in this test"); };
let cases = 0;
try {
  for (const locale of ["en", "zh"]) {
    const h = harness(locale);
    h.prepare();
    const pending = h.start();
    assert.equal(button(h.tree, labels(locale).busy).props.disabled, true);
    const section = composer(h.tree);
    const text = aiInput(h.tree);
    const disclosure = one(section, node => node.type === "details" && node.props.className === "ai-details");
    const summary = one(disclosure, node => node.type === "summary");
    // Focus and disclosure toggles do not mutate input. Invoke any handlers
    // on their path to catch accidental request cancellation at the parent.
    for (const node of [text, summary, disclosure, section]) {
      node.props.onFocus?.({ target: text });
      node.props.onClick?.({ target: summary });
      node.props.onClickCapture?.({ target: summary });
    }
    assert.equal(h.requests[0].request.signal.aborted, false);
    h.requests[0].resolve(meal());
    await pending;
    h.render();
    assert.equal(one(h.tree, node => node.type === "input" && node.props.value === "Rice").props.value, "Rice");
    assert.equal(h.saves, 0, "AI must open review without saving");
    cases += 1;
  }

  const mutations = [
    ["description edit", (h) => aiInput(h.tree).props.onChange({ target: { value: "tofu" } })],
    ["key edit", (h) => keyInput(h.tree).props.onChange({ target: { value: "replacement-test-key" } })],
    ["forget key", (h) => button(h.tree, labels("en").forget).props.onClick()],
    ["manual food edit", (h) => one(h.tree, node => node.props?.id === "food-protein").props.onChange({ target: { value: "Tofu" } })],
    ["quick food button", (h) => button(h.tree, "+ Chicken").props.onClick()],
    ["close editor", (h) => drawer(h.tree).props.onClose()],
    ["language change", (h) => button(h.tree, "繁中").props.onClick()],
    ["unmount", (h) => h.effects[0]()()],
  ];
  for (const [name, mutate] of mutations) {
    const h = harness(); h.prepare(); const pending = h.start();
    mutate(h);
    assert.equal(h.requests[0].request.signal.aborted, true, `${name} cancels its request`);
    // Simulate a response racing cancellation, even if transport ignores abort.
    h.requests[0].resolve(meal("Stale food")); await pending; h.render();
    assert.equal(elements(h.tree, node => node.type === "input" && node.props.value === "Stale food").length, 0, `${name} must preserve the newer draft`);
    assert.equal(h.saves, 0);
    cases += 1;
  }

  for (const locale of ["en", "zh"]) {
    for (const status of [401, 429, 504]) {
      const h = harness(locale); h.prepare();
      globalThis.fetch = async () => new Response(JSON.stringify({ error: "unsafe-provider-text" }), { status });
      h.parse = client.parseMealWithAi;
      await h.start(); h.render();
      const alert = one(composer(h.tree), node => node.props?.role === "alert");
      const expected = locale === "zh"
        ? { 401: "請檢查本次使用的 OpenAI API key，或使用免 AI 的快速輸入。", 429: "這個 OpenAI 專案已達使用限制或額度用盡。請稍後再試，或使用快速輸入。", 504: "AI 回應逾時，請再試一次或使用快速輸入。" }
        : { 401: "Check your session OpenAI API key, or use the quick form without AI.", 429: "This OpenAI project is rate-limited or out of credits. Try later or use the quick form.", 504: "AI took too long to respond. Try again or use the quick form." };
      assert.equal(content(alert), expected[status]);
      assert.equal(aiInput(h.tree).props.value, "rice for lunch");
      assert.equal(keyInput(h.tree).props.value, "mock-key-never-sent");
      cases += 1;
    }
  }

  const h = harness(); h.prepare();
  const first = h.start();
  aiInput(h.tree).props.onChange({ target: { value: "new description" } }); h.render();
  const second = h.start();
  h.requests[0].reject(new Error("old failure")); await first; h.render();
  assert.equal(button(h.tree, "Organizing…").props.disabled, true, "Old finally cannot end the new request");
  assert.equal(elements(composer(h.tree), node => node.props?.role === "alert").length, 0);
  h.requests[1].resolve(meal("Fresh rice")); await second; h.render();
  one(h.tree, node => node.type === "input" && node.props.value === "Fresh rice").props.onChange({ target: { value: "Brown rice" } });
  h.render();
  button(h.tree, "Back to input").props.onClick(); h.render();
  assert.equal(one(h.tree, node => node.props?.id === "food-carbs").props.value, "Brown rice");
  one(composer(h.tree), node => node.type === "form").props.onSubmit({ preventDefault() {} }); h.render();
  assert.equal(one(h.tree, node => node.type === "input" && node.props.value === "Brown rice").props.value, "Brown rice");
  await button(h.tree, "Replace this meal").props.onClick(); h.render();
  assert.equal(h.saves, 1, "Manual review can explicitly persist the AI draft");
  assert.ok(h.store.state.days.find(day => day.isToday).todayLog.Lunch.carbs.includes("Brown rice"));
  cases += 1;

  const editing = harness(); editing.prepare();
  const seed = editing.start(); editing.requests[0].resolve(meal()); await seed; editing.render();
  const duringReview = editing.start();
  const context = one(composer(editing.tree), node => node.type?.name === "ContextFields");
  const contextTree = context.type(context.props);
  one(contextTree, node => node.type === "select" && node.props.value === "Lunch").props.onChange({ target: { value: "Breakfast" } });
  assert.equal(editing.requests[1].request.signal.aborted, true, "Changing the meal slot in review cancels pending parsing");
  editing.requests[1].resolve(meal("Wrong meal")); await duringReview; editing.render();
  const updatedContext = one(composer(editing.tree), node => node.type?.name === "ContextFields");
  assert.equal(updatedContext.props.draft.mealSlot, "Breakfast");
  button(editing.tree, "Discard draft").props.onClick(); editing.render();
  assert.equal(drawer(editing.tree).props.open, false);
  cases += 1;

  const saving = harness(); saving.prepare();
  const reviewed = saving.start(); saving.requests[0].resolve(meal("Reviewed rice")); await reviewed; saving.render();
  const late = saving.start();
  await button(saving.tree, "Replace this meal").props.onClick();
  assert.equal(saving.requests[1].request.signal.aborted, true, "Saving the reviewed draft cancels a later parse");
  saving.requests[1].resolve(meal("Unreviewed rice")); await late; saving.render();
  assert.ok(saving.store.state.days.find(day => day.isToday).todayLog.Lunch.carbs.includes("Reviewed rice"));
  assert.equal(drawer(saving.tree).props.open, false);
  cases += 1;
} finally {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
}
console.log(JSON.stringify({ aiUiCases: cases, actualAppHandlers: true, mockedTransportOnly: true, liveProviderCalls: 0 }, null, 2));

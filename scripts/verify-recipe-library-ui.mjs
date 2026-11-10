import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

// Uses this project's Playwright by default; optional paths remain compatible.
// node scripts/verify-recipe-library-ui.mjs [package.json] [local URL] [screenshot recipe id] [--flows-only]
const [packagePath, localUrl, screenshotId] = process.argv.slice(2).filter(argument => argument !== "--flows-only");
const require = createRequire(packagePath ? path.resolve(packagePath) : new URL("../package.json", import.meta.url));
const { chromium } = require("playwright");
const base = new URL(localUrl || "http://127.0.0.1:5178/");
assert(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname));
const definitions = JSON.parse(await readFile(new URL("../data/nutrition/recipes.json", import.meta.url), "utf8"));
const foodDefinitions = JSON.parse(await readFile(new URL("../data/nutrition/food-definitions.json", import.meta.url), "utf8"));
const foodLabels = new Map(foodDefinitions.map(food => [`usda-${food.fdcId}`, food.label]));
const generated = { exports: {} };
new Function("exports", ts.transpileModule(
  await readFile(new URL("../src/nutrition-data.ts", import.meta.url), "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } },
).outputText)(generated.exports);
const generatedRecipes = new Map(generated.exports.standardizedRecipes.map(recipe => [recipe.mealId, recipe]));
// Load actual catalog and legacy helpers so migration checks use the preserved
// objects, not a second set of expected titles or ingredient names.
const sourceModules = new Map();
function loadSource(name) {
  const absolutePath = path.resolve(fileURLToPath(new URL("../src/", import.meta.url)), name);
  if (sourceModules.has(absolutePath)) return sourceModules.get(absolutePath).exports;
  const module = { exports: {} };
  sourceModules.set(absolutePath, module);
  const compiled = ts.transpileModule(readFileSync(absolutePath, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function("module", "exports", "require", compiled)(module, module.exports, dependency => {
    assert(dependency.startsWith("."), `Unexpected dependency: ${dependency}`);
    return loadSource(`${path.resolve(path.dirname(absolutePath), dependency)}.ts`);
  });
  return module.exports;
}
const { recommendationDataset: catalogMeals, legacyRecommendationDataset: legacyMeals, createBlankState } = loadSource("data.ts");
const { legacyMealTitle, getLegacyNamedMealComponents, translateFood } = loadSource("presentation.ts");
const recipeCount = definitions.length;
// Headings omit the stored "standard recipe" marker; the tag carries it once.
const displayName = (recipe, locale) => recipe.label[locale].replace(locale === "zh" ? /（標準配方）$/ : / — standard recipe$/, "");
const flowsOnly = process.argv.includes("--flows-only");
assert(recipeCount > 3, "The library must include recipes outside the top three");
const screenshotRecipeId = screenshotId || definitions.at(-1).mealId;
assert(definitions.some(recipe => recipe.mealId === screenshotRecipeId), "The screenshot recipe must exist in the current collection");
const output = new URL("../output/playwright/preference-first/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
let detailsChecked = 0;
let portionsChecked = 0;
let sourceLabelsChecked = 0;
let preparationPortionsChecked = 0;
let instructionListsChecked = 0;
const errors = [];
function assertPreparationQualifier(value, locale) {
  assert.match(value, locale === "en" ? /prepared|cooked/i : /備妥|備好|已熟|已煮熟|已處理/,
    "The complete time explanation states that ingredients are prepared first");
  assert.match(value, locale === "en" ? /not include|exclud/i : /不含|不包含/,
    "The complete time explanation preserves the excluded preparation work");
}
async function verifyCompactDefaultRecommendations(page, locale) {
  assert.equal(await page.locator(".recipe-ranking-note").count(), 1,
    "Neutral ordering is explained once for the recommendation list");
  assert.equal(await page.locator(".meal-feature .recipe-fit-summary").count(), 0,
    "No empty fit summary or generic preparation paragraph appears on a neutral card");
  assert.equal(await page.locator(".option-card .recipe-option-match").count(), 0,
    "Other options do not repeat the unselected-preference status");
  assert.equal(await page.locator(".option-card .recipe-option-reason").count(), 0,
    "Neutral alternatives do not manufacture personalized reasons");
  assert.equal(await page.locator(".meal-meta .recipe-time-label").count(), 1);
  assert.equal(await page.locator(".option-card .recipe-time-label").count(), 2);
  for (const time of await page.locator(".meal-meta .recipe-time-label, .option-card .recipe-time-label").allTextContents()) {
    assert.match(time, locale === "en" ? /\d+.*assembly/i : /\d+.*(?:組合|組裝)/,
      "Short time labels still identify assembly rather than total cooking time");
  }
  const preparation = page.locator(".meal-feature .action-tip");
  assert.equal(await preparation.evaluate(node => node.open), false);
  assert.equal(await preparation.locator(".recipe-time-note").isVisible(), false);
  await preparation.locator(":scope > summary").focus();
  await page.keyboard.press("Enter");
  assert.equal(await preparation.locator(".recipe-time-note").isVisible(), true,
    "Full preparation information is keyboard accessible when needed");
  assertPreparationQualifier(await preparation.locator(".recipe-time-note").innerText(), locale);
  await preparation.locator(":scope > summary").focus();
  await page.keyboard.press("Enter");
  assert.equal(await preparation.evaluate(node => node.open), false);
}
async function verifySavedPlans(locale) {
  const noon = new Date(2026, 10, 6, 12);
  const state = { ...createBlankState(noon), plannedMeals: [] };
  const renamed = legacyMeals.find(meal => meal.id === "mapo-tofu-light-rice");
  const retired = legacyMeals.find(meal => !catalogMeals.some(current => current.id === meal.id));
  const exact = definitions.find(recipe => recipe.mealId !== renamed.id);
  const unavailable = definitions.find(recipe => ![renamed.id, exact.mealId].includes(recipe.mealId));
  assert(renamed && retired && exact && unavailable);
  state.profile.preferenceTags = ["Chinese-style", "American light meals", "Bowl meals"];
  state.profile.avoidTags = ["Late-night heavy meals"];
  state.days.at(-1).todayLog.Breakfast.protein = ["Preserved breakfast food"];
  state.plannedMeals = [
    { id: "legacy-renamed", mealId: renamed.id, createdAt: noon.toISOString() },
    { id: "legacy-retired", mealId: retired.id, createdAt: noon.toISOString() },
    { id: "unavailable-version", mealId: unavailable.mealId, createdAt: noon.toISOString(), recipeVersion: "unavailable-archive-v0", portion: "small" },
    { id: "exact-version", mealId: exact.mealId, createdAt: noon.toISOString(), recipeVersion: generatedRecipes.get(exact.mealId).version, portion: "large" },
  ];
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    return url.origin === base.origin && !url.pathname.startsWith("/_vercel/") && !url.pathname.startsWith("/api/") ? route.continue() : route.abort();
  });
  await page.clock.install({ time: noon });
  await context.addInitScript(({ state, locale }) => {
    if (!sessionStorage.getItem("verification-seeded")) {
      localStorage.setItem("next-bite-mvp-launch-v5", JSON.stringify(state));
      localStorage.setItem("next-bite-locale", locale);
      sessionStorage.setItem("verification-seeded", "true");
    }
  }, { state, locale });
  await page.goto(base.href);
  await page.getByRole("button", { name: locale === "en" ? "Choose this meal" : "就選這道", exact: true }).waitFor();
  const dialog = page.locator("dialog[open]");
  const plansNav = () => page.locator(".workspace-nav").getByRole("button", { name: locale === "en" ? /^Plans/ : /^餐點計畫/ });
  const openPreferences = () => page.getByRole("button", { name: locale === "en" ? /^Preferences/ : /^偏好/ }).click();
  await openPreferences();
  assert.equal(await dialog.locator(".retained-preferences button").count(), 2);
  assert.equal(await dialog.locator(".retained-avoid").count(), 1);
  const currentStyles = dialog.getByRole("group", { name: locale === "en" ? "Foods & styles you enjoy" : "喜歡的餐點與風格", exact: true });
  assert.equal(await currentStyles.getByRole("button", { name: locale === "en" ? "Chinese-style" : "中式", exact: true }).count(), 0);
  assert.equal(await currentStyles.getByRole("button", { name: locale === "en" ? "American light meals" : "美式輕食", exact: true }).count(), 0);
  await page.keyboard.press("Escape");
  await plansNav().click();
  assert.equal(await page.locator(".plan-card").count(), 4);
  const renamedCard = page.locator(".plan-card").filter({ has: page.getByRole("heading", { name: legacyMealTitle(renamed, locale), exact: true }) });
  const retiredCard = page.locator(".plan-card").filter({ has: page.getByRole("heading", { name: legacyMealTitle(retired, locale), exact: true }) });
  const unavailableCard = page.locator(".plan-card").filter({ has: page.getByRole("heading", { name: locale === "en" ? "Saved recipe unavailable" : "無法取得的已存配方", exact: true }) });
  assert.equal(await renamedCard.count(), 1);
  assert.equal(await retiredCard.count(), 1);
  assert.equal(await unavailableCard.locator("span.small").innerText(), locale === "en" ? "Saved recipe" : "已存配方");
  assert((await unavailableCard.innerText()).includes("unavailable-archive-v0"));
  await page.screenshot({ path: fileURLToPath(new URL(`${locale}-saved-plans-desktop.png`, output)) });
  for (const legacy of [renamed, retired]) {
    const card = page.locator(".plan-card").filter({ has: page.getByRole("heading", { name: legacyMealTitle(legacy, locale), exact: true }) });
    await card.getByRole("button", { name: locale === "en" ? "I ate this — review" : "我吃了這道，確認內容", exact: true }).click();
    await dialog.getByRole("button", { name: locale === "en" ? /^Review this meal/ : /^檢查這餐內容/ }).click();
    const componentNames = await dialog.locator(".component-editor > label:first-child input").evaluateAll(nodes => nodes.map(node => node.value));
    assert.deepEqual(new Set(componentNames), new Set(getLegacyNamedMealComponents(legacy).map(component => translateFood(component.name, locale))));
    assert((await dialog.locator('.component-editor input[type="number"]').evaluateAll(nodes => nodes.map(node => node.value))).every(value => value === ""), "Old named ideas must not gain current recipe amounts");
    await dialog.getByRole("button", { name: locale === "en" ? "Discard draft" : "捨棄草稿", exact: true }).click();
    await plansNav().click();
  }
  await unavailableCard.getByRole("button", { name: locale === "en" ? "I ate this — review" : "我吃了這道，確認內容", exact: true }).click();
  assert.equal(await dialog.locator(".component-editor").count(), 0);
  assert((await dialog.locator('.composer form input:not([type="number"])').evaluateAll(nodes => nodes.map(node => node.value))).every(value => value === ""), "Unavailable versions start with no substituted foods");
  await dialog.getByRole("button", { name: locale === "en" ? /^Review this meal/ : /^檢查這餐內容/ }).click();
  assert((await dialog.locator('[role="alert"]').innerText()).includes(locale === "en" ? "Add at least one food" : "請先加入至少一項"));
  await page.screenshot({ path: fileURLToPath(new URL(`${locale}-unavailable-version-empty.png`, output)) });
  await dialog.getByRole("button", { name: locale === "en" ? "Discard draft" : "捨棄草稿", exact: true }).click();
  await plansNav().click();
  const exactCard = page.locator(".plan-card").filter({ has: page.getByRole("heading", { name: displayName(exact, locale), exact: true }) });
  assert.equal(await exactCard.locator(".plan-recipe-details").evaluate(node => node.open), false);
  await exactCard.locator(".plan-recipe-details > summary").click();
  assert.equal(await exactCard.locator(".action-tip").evaluate(node => node.open), false);
  await exactCard.locator(".action-tip > summary").click();
  assert.deepEqual(await exactCard.locator(".action-tip > ol > li").allTextContents(), exact.instructions.map(step => step[locale]));
  await exactCard.locator(".plan-recipe-details > summary").click();
  await exactCard.getByRole("button", { name: locale === "en" ? "I ate this — review" : "我吃了這道，確認內容", exact: true }).click();
  const amounts = await dialog.locator('.component-editor input[type="number"]').evaluateAll(nodes => nodes.map(node => Number(node.value)));
  assert.deepEqual(amounts, exact.ingredients.map(ingredient => Math.round(ingredient.grams * 1.25 * 10000) / 10000));
  await dialog.getByRole("button", { name: locale === "en" ? "Discard draft" : "捨棄草稿", exact: true }).click();
  // Download and inspect an actual export, preserving all four plan meanings.
  await page.getByRole("button", { name: locale === "en" ? "Data & method" : "資料與方法", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: locale === "en" ? "Export my data (JSON)" : "匯出我的資料（JSON）", exact: true }).click();
  const download = await downloadPromise;
  const exported = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.deepEqual(exported.data.plannedMeals, state.plannedMeals);
  assert.deepEqual(exported.data.profile.preferenceTags, state.profile.preferenceTags);
  assert.deepEqual(exported.data.days.at(-1).todayLog.Breakfast.protein, ["Preserved breakfast food"]);
  await page.keyboard.press("Escape");
  // Retained unsupported settings stay explicit at night and removal is an
  // intentional user action, never an automatic migration.
  await page.clock.setSystemTime(new Date(2026, 10, 6, 23));
  await page.reload();
  await page.locator(".avoid-summary .notice").waitFor();
  assert.equal(await page.getByRole("button", { name: locale === "en" ? "Choose this meal" : "就選這道", exact: true }).count(), 0);
  await openPreferences();
  await dialog.getByRole("button", { name: locale === "en" ? "Remove earlier late-night restriction" : "移除先前的宵夜限制", exact: true }).click();
  await dialog.locator(".retained-avoid").waitFor({ state: "detached" });
  await dialog.locator(".retained-preferences button").first().click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: locale === "en" ? "Choose this meal" : "就選這道", exact: true }).waitFor();
  await page.reload();
  await plansNav().click();
  assert.equal(await page.locator(".plan-card").count(), 4, "Review and discarded drafts must not consume plans");
  await context.close();
}

async function verifyPreferenceFirst(locale) {
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const noon = new Date(2026, 10, 6, 12);
  await page.clock.install({ time: noon });
  await context.addInitScript(locale => localStorage.setItem("next-bite-locale", locale), locale);
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    return url.origin === base.origin && !url.pathname.startsWith("/_vercel/") && !url.pathname.startsWith("/api/") ? route.continue() : route.abort();
  });
  await page.goto(base.href);
  const choose = () => page.getByRole("button", { name: locale === "en" ? "Choose this meal" : "就選這道", exact: true });
  await choose().waitFor();
  assert.equal(await page.locator(".meal-feature .recipe-match-count").count(), 0, "The default no-preference explanation is not duplicated");
  assert.equal(await page.locator(".recommendation-score").evaluate(node => node.open), false);
  await verifyCompactDefaultRecommendations(page, locale);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (width !== 320) await page.screenshot({ path: fileURLToPath(new URL(`${locale}-home-${width === 390 ? "mobile" : "desktop"}.png`, output)) });
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole("combobox", { name: locale === "en" ? "Preferred staple" : "偏好的主食", exact: true }).selectOption("noodles");
  await page.getByRole("combobox", { name: locale === "en" ? "Preferred style" : "偏好的風格", exact: true }).selectOption("asian");
  await page.locator(".meal-context-extra > summary").click();
  await page.getByRole("combobox", { name: locale === "en" ? "For this meal I want…" : "這餐比較想…", exact: true }).selectOption("Need something light");
  const readiness = page.getByRole("combobox", { name: locale === "en" ? "Are the ingredients ready?" : "食材準備好了嗎？", exact: true });
  await readiness.selectOption("ready");
  const { recommendPilotMeals } = loadSource("nutrition.ts");
  const { defaultMealContext } = loadSource("meal-context.ts");
  const expected = recommendPilotMeals({ ...createBlankState(noon).profile, feelToday: "Need something light" }, { ...defaultMealContext, preferredStaple: "noodles", cuisine: "asian", ingredientReadiness: "ready" }, locale, noon);
  assert.equal(await page.locator(".meal-feature h3").innerText(), displayName(expected.recommendations[0].recipe, locale));
  assert(expected.recommendations.every(rec => rec.recipe.staple === "noodles"));
  assert.equal(await page.locator(".recommendation-score").evaluate(node => node.open), false);
  assert.deepEqual(await page.locator(".meal-feature .recipe-fit-reasons li").allTextContents(), expected.recommendations[0].matchedPreferenceReasons.slice(0, 2),
    "Card reasons show actual matched preferences without preparation or fallback-ranking copy");
  assert.equal(await page.locator(".recipe-ranking-note").count(), 0,
    "Neutral ranking guidance disappears after meal preferences are selected");
  await page.locator(".meal-feature").evaluate(node => node.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: fileURLToPath(new URL(`${locale}-preference-match-mobile.png`, output)) });
  // "Show three more" pages through the engine's full order, three at a time.
  const nextGroup = expected.eligibleRecipes.slice(3, 6);
  await page.getByRole("button", { name: locale === "en" ? "Show three more" : "再換三道", exact: true }).click();
  assert.equal(await page.locator(".meal-feature h3").innerText(), displayName(nextGroup[0].recipe, locale));
  assert.deepEqual((await page.locator(".option-card > strong").allTextContents()).map(title => title.trim()),
    nextGroup.slice(1).map(rec => displayName(rec.recipe, locale)), "The other options come from the same next group");
  const receipt = page.locator(".recommendation-score");
  assert.equal(await receipt.evaluate(node => node.open), false);
  await receipt.locator(":scope > summary").focus();
  await page.keyboard.press("Enter");
  assert.equal(await receipt.locator(".score-model-row").count(), 7);
  assert.equal(await receipt.locator(".score-preference-row").count(), 5);
  const current = nextGroup[0].score.currentPreference;
  assert((await receipt.locator(".score-current-fit").innerText()).includes(`${current.points}/${current.possible}`));
  assert((await receipt.locator(".score-ranking-version").innerText()).includes(expected.trace.rankingPolicy.version));
  assert.equal(await receipt.locator(".score-ranking-order li").count(), expected.trace.rankingPolicy.order.length);
  assert((await receipt.locator(".score-rotation-seed").innerText()).includes(expected.trace.rotationSeed));
  await receipt.locator(".score-source-details > summary").focus();
  await page.keyboard.press("Enter");
  assert.equal(await receipt.locator(".score-source-links a").first().isVisible(), true);
  await receipt.locator(".history-basis > summary").focus();
  await page.keyboard.press("Enter");
  assert.equal(await receipt.locator(".history-basis p").first().isVisible(), true);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${locale} expanded receipt overflow at ${width}`);
    if (width <= 390) {
      assert.equal(await receipt.locator(".score-table-hint").isVisible(), true);
      const table = receipt.locator(".score-table-scroll");
      assert(await table.evaluate(node => node.scrollWidth > node.clientWidth), "The narrow table scrolls inside its own region");
      await table.evaluate(node => { node.scrollLeft = node.scrollWidth; });
      const reachable = await table.evaluate(node => {
        const cell = node.querySelector(".score-model-row .contribution-points");
        return cell.getBoundingClientRect().right <= node.getBoundingClientRect().right + 1;
      });
      assert(reachable, "The rightmost model-points column must be reachable by horizontal scroll");
      await table.evaluate(node => { node.scrollLeft = 0; });
    }
    if (width === 390) {
      await receipt.locator(".score-table-hint").evaluate(node => node.scrollIntoView({ block: "start" }));
      await page.screenshot({ path: fileURLToPath(new URL(`${locale}-calculation-mobile.png`, output)) });
    }
  }
  await readiness.selectOption("needs-prep");
  await page.getByRole("combobox", { name: locale === "en" ? "Time available" : "這餐可用時間", exact: true }).selectOption("10");
  await page.locator(".no-options").waitFor();
  assert((await page.locator(".no-options").innerText()).includes(locale === "en" ? "full cooking time is unknown" : "完整烹調時間資料"));
  assert.equal(await choose().count(), 0);
  await page.getByRole("combobox", { name: locale === "en" ? "Time available" : "這餐可用時間", exact: true }).selectOption("any");
  await choose().waitFor();
  assert.equal(await page.locator(".meal-meta .recipe-time-label").innerText(), locale === "en" ? "Cooking time unknown" : "料理時間未知",
    "An ingredient-readiness warning replaces the assembly estimate in the visible time label");
  assert((await page.locator(".option-card .recipe-time-label").allTextContents()).every(value => value === (locale === "en" ? "Cooking time unknown" : "料理時間未知")));
  const savedTitle = await page.locator(".meal-feature h3").innerText();
  await choose().click();
  await page.getByRole("button", { name: locale === "en" ? "Saved to plans" : "已儲存到計畫", exact: true }).waitFor();
  await page.reload();
  await page.locator(".workspace-nav").getByRole("button", { name: locale === "en" ? /^Plans/ : /^餐點計畫/ }).click();
  assert.equal(await page.locator(".plan-card h3").innerText(), savedTitle);
  await context.close();
}

try {
  for (const locale of flowsOnly ? [] : ["en", "zh"]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    let savedTitle = "";
    let savedVersion = "";
    let representativeCaptured = false;
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      return url.origin === base.origin && !url.pathname.startsWith("/_vercel/") && !url.pathname.startsWith("/api/")
        ? route.continue() : route.abort();
    });
    await page.goto(base.href);
    await page.getByRole("button", { name: "Choose this meal", exact: true }).waitFor();
    assert.equal(await page.locator(".recommendation-mode").count(), 0);
    assert.equal(await page.locator(".recommendation-score").count(), 1, "Fresh visits offer complete score details in a disclosure");
    assert.equal(await page.locator(".recommendation-score").evaluate(node => node.open), false);
    assert.equal(await page.locator(".recommendation-score-total").isVisible(), false);
    if (locale === "zh") await page.getByRole("button", { name: "切換繁體中文", exact: true }).click();
    await verifyCompactDefaultRecommendations(page, locale);
    assert((await page.locator(".workspace-heading").innerText()).includes(String(recipeCount)));
    assert((await page.locator("footer").innerText()).includes(locale === "en" ? `${recipeCount} recipes` : `${recipeCount} 道`));
    assert((await page.locator('meta[name="description"]').getAttribute("content")).includes(`${recipeCount} recipes`));
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${locale} default home overflow at ${width}`);
      if (width === 390 || width === 1280) await page.screenshot({ path: fileURLToPath(new URL(`${locale}-home-${width === 390 ? "mobile" : "desktop"}.png`, output)) });
    }
    await page.getByRole("button", { name: locale === "en" ? "Data & method" : "資料與方法", exact: true }).click();
    await page.locator("dialog[open] #method > summary").click();
    assert((await page.locator("dialog[open] #method").innerText()).includes(locale === "en" ? "Recommendations and the library use the same recipes" : "使用同一份配方"));
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: locale === "en" ? `Browse all ${recipeCount} recipes` : `瀏覽全部 ${recipeCount} 道配方`, exact: true }).click();
    assert.equal(await page.locator(".recipe-library-card").count(), recipeCount);
    assert.deepEqual(new Set(await page.locator(".recipe-library-card h3").allTextContents()),
      new Set(definitions.map(recipe => displayName(recipe, locale))), "Every live recipe title must match the authored bilingual label without its stored marker");
    assert.equal(await page.locator("#recipe-library-title").evaluate(node => document.activeElement === node), true);
    assert.equal(await page.locator(".recipe-library .recipe-ranking-note").count(), 1,
      "The whole library receives one neutral-ranking explanation");
    assert.equal(await page.locator(".recipe-library-card .recipe-time-label").count(), recipeCount);
    const cardCopy = (await page.locator(".recipe-library-card").allTextContents()).join("\n");
    assert(!/No preferences selected|未選擇偏好|assembly with prepared ingredients|食材備妥後，約|preparation time is not included|不含前置烹調/.test(cardCopy),
      "Library card bodies do not repeat generic time or neutral-preference paragraphs");
    const timeHelp = page.locator(".recipe-library details.recipe-time-help");
    assert.equal(await timeHelp.count(), 1);
    assert.equal(await timeHelp.evaluate(node => node.open), false);
    await timeHelp.locator(":scope > summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await timeHelp.evaluate(node => node.open), true,
      "The shared library time explanation opens with the keyboard");
    assertPreparationQualifier(await timeHelp.innerText(), locale);
    await timeHelp.locator(":scope > summary").focus();
    await page.keyboard.press("Enter");
    assert.equal(await timeHelp.evaluate(node => node.open), false);
    assert.equal(await page.locator(".catalog-grid").count(), 0, "The duplicate idea library must be removed");
    await page.getByRole("button", { name: locale === "en" ? "Foods & drinks" : "食材與飲料", exact: true }).click();
    await page.locator(".food-library").waitFor();
    await page.getByRole("button", { name: locale === "en" ? `${recipeCount} recipes` : `${recipeCount} 道配方`, exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: fileURLToPath(new URL(`${locale}-library-desktop.png`, output)) });
    // Exercise every recipe at a phone width, including long bilingual titles.
    await page.setViewportSize({ width: 390, height: 900 });
    const dialog = page.locator("dialog[open]");
    for (let index = 0; index < recipeCount; index++) {
      const opener = page.locator(".recipe-library-card button").nth(index);
      await opener.focus();
      await page.keyboard.press("Enter");
      await dialog.waitFor();
      const title = await dialog.locator(".drawer-heading h2").innerText();
      const definition = definitions.find(recipe => displayName(recipe, locale) === title);
      assert(definition, "The opened recipe must match an authored recipe label");
      const generatedRecipe = generatedRecipes.get(definition.mealId);
      const preparedIngredients = generatedRecipe.ingredients.filter(ingredient => ingredient.processing === "pureed");
      assert.equal(await dialog.evaluate(node => node.scrollWidth > node.clientWidth), false, `${locale} recipe ${index + 1} overflows at 390 px`);
      assert.equal(await dialog.locator(".recommendation-score").count(), 1);
      const receipt = dialog.locator(".recommendation-score");
      assert.equal(await receipt.evaluate(node => node.open), false, "Each recipe starts with all scoring collapsed");
      await receipt.locator(":scope > summary").focus();
      await page.keyboard.press("Enter");
      assert.equal(await receipt.evaluate(node => node.open), true);
      assert.equal(await receipt.locator(".score-model-row").count(), 7);
      assert.equal(await receipt.locator(".score-preference-row").count(), 5);
      assert.equal(await receipt.locator(".score-model-row").last().isVisible(), true);
      await receipt.locator(".score-source-details > summary").focus();
      await page.keyboard.press("Enter");
      assert.equal(await receipt.locator(".score-source-links a").first().isVisible(), true);
      assert((await receipt.locator(".score-input-note").count()) > 0);
      const score = await dialog.locator(".recommendation-score-total").innerText();
      const energy = [];
      for (const portion of ["small", "regular", "large"]) {
        await dialog.locator(".recipe-library-portion select").selectOption(portion);
        assert.equal(await dialog.locator(".recommendation-score-total").innerText(), score);
        energy.push(Number((await dialog.locator(".nutrition-metrics dd").first().innerText()).replace(/[^0-9.]/g, "")));
        const preparationValues = await dialog.locator(".nutrition-preparation-value span").allTextContents();
        assert.equal(preparationValues.length, preparedIngredients.length);
        for (const [preparedIndex, ingredient] of preparedIngredients.entries()) {
          const selectedGrams = Math.round(ingredient.grams * generatedRecipe.portions[portion] * 10000) / 10000;
          const freeSugarGrams = Math.round(ingredient.preparationModelBasis.freeSugarsPer100g * selectedGrams / 100 * 10000) / 10000;
          const expected = freeSugarGrams > 0 && freeSugarGrams < 0.1 ? "<0.1" : new Intl.NumberFormat(locale === "zh" ? "zh-TW" : "en-US", { maximumFractionDigits: 1 }).format(freeSugarGrams);
          assert.equal(preparationValues[preparedIndex], `${expected} g`, "Prepared ingredient free sugars must follow the selected ingredient amount");
          preparationPortionsChecked++;
        }
        portionsChecked++;
      }
      assert(Math.abs(energy[0] - energy[1] * 0.75) <= 1.1,
        `${locale} ${definition.mealId}: small/regular energy did not scale as expected (${energy.join(", ")})`);
      assert(Math.abs(energy[2] - energy[1] * 1.25) <= 1.1,
        `${locale} ${definition.mealId}: large/regular energy did not scale as expected (${energy.join(", ")})`);
      if (definition.mealId === screenshotRecipeId) {
        await page.screenshot({ path: fileURLToPath(new URL(`${locale}-recipe-mobile.png`, output)) });
        representativeCaptured = true;
      }
      await dialog.locator(".nutrition-sources summary").click();
      assert.equal(await dialog.locator(".nutrition-recipe-notes").innerText(), generatedRecipe.notes[locale],
        "Recipe notes must preserve the complete generated preparation and source explanation");
      assert((await dialog.locator(".nutrition-record-link").count()) > 0);
      const ingredientLabels = await dialog.locator(".nutrition-ingredient-name strong").allTextContents();
      assert.deepEqual(ingredientLabels, definition.ingredients.map(ingredient => foodLabels.get(ingredient.foodId)?.[locale]),
        "Ingredient labels must preserve the reviewed source identities and preparation states");
      sourceLabelsChecked += ingredientLabels.length;
      const links = await dialog.locator(".nutrition-record-link").evaluateAll(nodes => nodes.map(node => node.href));
      assert(links.every(url => /^https:\/\/fdc\.nal\.usda\.gov\/food-details\/\d+\/nutrients$/.test(url)));
      for (const [preparedIndex, ingredient] of preparedIngredients.entries()) {
        const preparation = dialog.locator(".nutrition-preparation-note").nth(preparedIndex);
        assert.equal(await preparation.isVisible(), true);
        assert((await preparation.innerText()).includes(ingredient.preparationModelBasis.note[locale]));
        assert.deepEqual(await preparation.locator(".nutrition-preparation-link").evaluateAll(nodes => nodes.map(node => node.href)), ingredient.preparationModelBasis.sourceUrls);
      }
      if (definition.mealId === screenshotRecipeId && preparedIngredients.length) {
        for (const width of [320, 390, 768, 1280]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(await dialog.evaluate(node => node.scrollWidth > node.clientWidth), false,
            `${locale} preparation source note overflows at ${width}`);
          if (width === 390) {
            await dialog.locator(".nutrition-preparation-note").first().evaluate(node => node.scrollIntoView({ block: "center" }));
            await page.screenshot({ path: fileURLToPath(new URL(`${locale}-recipe-preparation-mobile.png`, output)) });
          }
        }
        await page.setViewportSize({ width: 390, height: 900 });
      }
      assert.equal(await dialog.locator(".action-tip").evaluate(node => node.open), false);
      assert.equal(await dialog.locator(".action-tip .recipe-time-note").isVisible(), false);
      await dialog.locator(".action-tip summary").focus();
      await page.keyboard.press("Enter");
      assert.equal(await dialog.locator(".action-tip .recipe-time-note").isVisible(), true);
      assertPreparationQualifier(await dialog.locator(".action-tip .recipe-time-note").innerText(), locale);
      assert.deepEqual(await dialog.locator(".action-tip > ol > li").allTextContents(), generatedRecipe.instructions.map(step => step[locale]),
        "Every preparation step must match the reviewed recipe in the selected language");
      assert.deepEqual(await dialog.locator(".recipe-preparation-sources a").evaluateAll(links => links.map(link => ({ label: link.textContent, url: link.getAttribute("href") }))),
        (generatedRecipe.preparationGuide?.sources ?? []).map(source => ({ label: source.label[locale], url: source.url })),
        "Cooking references must remain available in both languages");
      instructionListsChecked++;
      if (definition.mealId === screenshotRecipeId) {
        await dialog.locator(".action-tip > ol > li").first().evaluate(node => node.scrollIntoView({ block: "center" }));
        await page.screenshot({ path: fileURLToPath(new URL(`${locale}-recipe-steps-mobile.png`, output)) });
      }
      if (index === recipeCount - 1) {
        savedTitle = await dialog.locator(".drawer-heading h2").innerText();
        savedVersion = (await dialog.locator(".nutrition-recipe-version").innerText()).replace(/^[^:]+:\s*/, "");
        await dialog.getByRole("button", { name: locale === "en" ? "Choose this meal" : "就選這道", exact: true }).click();
        await dialog.getByRole("button", { name: locale === "en" ? "Saved to plans" : "已儲存到計畫", exact: true }).waitFor();
        assert.match(await dialog.locator(".recipe-save-message").innerText(), locale === "en" ? /Saved/ : /已儲存/);
      }
      detailsChecked++;
      await page.keyboard.press("Escape");
      assert.equal(await opener.evaluate(node => document.activeElement === node), true);
    }
    assert(representativeCaptured, "The representative recipe must be captured in both languages");
    // A chosen recipe below the top three must survive a reload with its
    // exact version and portion, while this-meal controls reset independently.
    await page.reload();
    await page.getByRole("button", { name: locale === "en" ? "Choose this meal" : "就選這道", exact: true }).waitFor();
    assert.equal(await page.locator(".recommendation-mode").count(), 0);
    assert.equal(await page.locator(".recommendation-score").count(), 1);
    await page.locator(".workspace-nav").getByRole("button", { name: locale === "en" ? /^Plans/ : /^餐點計畫/ }).click();
    await page.locator(".plan-card").waitFor();
    assert.equal(await page.locator(".plan-card").count(), 1);
    assert.equal(await page.locator(".plan-card h3").innerText(), savedTitle);
    const plan = await page.locator(".plan-card").innerText();
    assert(plan.includes(savedVersion));
    assert(plan.includes(locale === "en" ? "Saved recipe portion: Large" : "已存配方份量: 大份"));
    await page.locator(".workspace-nav").getByRole("button", { name: locale === "en" ? "Library" : "資料庫", exact: true }).click();
    await page.getByRole("button", { name: locale === "en" ? `${recipeCount} recipes` : `${recipeCount} 道配方`, exact: true }).click();
    assert.equal(await page.locator(".recipe-library-controls .recipe-library-portion select").inputValue(), "unspecified");
    await page.locator(".recipe-library-controls .recipe-library-portion select").selectOption("large");
    // Every excluded recipe stays inspectable; no catalog path may save it.
    await page.getByRole("button", { name: locale === "en" ? "Preferences" : "偏好", exact: true }).click();
    const avoidGroup = dialog.getByRole("group", { name: locale === "en" ? "Keep these out of suggestions" : "從建議中避開這些項目", exact: true });
    const avoidName = locale === "en" ? "Large portions" : "大份量";
    await avoidGroup.getByRole("button", { name: avoidName, exact: true }).click();
    await avoidGroup.getByRole("button", { name: avoidName, exact: true, pressed: true }).waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".recipe-library-card").count(), recipeCount);
    await page.locator(".recipe-library-card button").first().click();
    assert.equal(await dialog.locator(".recipe-library-detail > button").isDisabled(), true);
    assert.equal(await dialog.locator(".recommendation-score").count(), 0);
    assert.equal(await dialog.locator(".nutrition-details").count(), 1);
    assert.match(await dialog.locator(".notice").innerText(), locale === "en" ? /Large portions/ : /大份量/);
    await page.keyboard.press("Escape");
    const search = page.locator(".recipe-library-controls input[type=search]");
    await search.fill("no-such-recipe-882211");
    assert.equal(await page.locator(".recipe-library-card").count(), 0);
    await search.fill("");
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${locale} library overflow at ${width}`);
      await page.locator(".recipe-library-card button").first().click();
      await dialog.locator(".nutrition-sources summary").click();
      assert.equal(await dialog.evaluate(node => node.scrollWidth > node.clientWidth), false, `${locale} recipe drawer overflow at ${width}`);
      if (width === 390) await page.screenshot({ path: fileURLToPath(new URL(`${locale}-excluded-mobile.png`, output)) });
      await page.keyboard.press("Escape");
    }
    await context.close();
  }
  for (const locale of ["en", "zh"]) { await verifySavedPlans(locale); await verifyPreferenceFirst(locale); }
  assert.deepEqual(errors, []);
  const report = { scope: flowsOnly ? "migration-and-preference-flows" : "complete-library-and-flows", recipeCount, canonicalCatalogCount: catalogMeals.length, soleRecipeDefault: true, completeScoreDisclosureClosedByDefault: true, contextualPreparationDisclosure: true, neutralRankingExplainedOnce: true, actualPreferenceReasonsOnly: true, allModelAndPreferenceRowsKeyboardAccessible: true, preferenceFirstMatchAndSwitch: true, ingredientReadinessHonest: true, mobileModelPointsReachableByHorizontalScroll: true, legacyAndRetiredPlansPreserved: true, unavailableVersionNotSubstituted: true, legacyExportPreserved: true, retiredSettingsExplicitAndRemovable: true, languages: 2, detailsChecked, portionsChecked, sourceLabelsChecked, preparationPortionsChecked, instructionListsChecked, screenshotRecipeId, ...(flowsOnly ? {} : { belowTopThreeSaved: true, savedVersionAndPortionSurviveReload: true, excludedRecipesBlocked: true, keyboardFocusRestored: true }), widths: flowsOnly ? [320, 390, 1280] : [320, 390, 768, 1280], pageErrors: errors.length };
  await writeFile(new URL(flowsOnly ? "preference-flow-verification.json" : "browser-verification.json", output), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}

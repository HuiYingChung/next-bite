import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const modules = new Map();
function loadSource(relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  if (modules.has(absolutePath)) return modules.get(absolutePath).exports;
  const module = { exports: {} };
  modules.set(absolutePath, module);
  const { outputText } = ts.transpileModule(fs.readFileSync(absolutePath, "utf8"), {
    fileName: absolutePath,
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const localRequire = specifier => {
    if (specifier === "react" || specifier === "react/jsx-runtime") return require(specifier);
    assert(specifier.startsWith("."), `Unexpected runtime dependency: ${specifier}`);
    if (specifier.endsWith(".css")) return {};
    const target = path.resolve(path.dirname(absolutePath), specifier);
    const resolved = [target, `${target}.ts`, `${target}.tsx`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    assert(resolved, `Missing source module: ${specifier}`);
    return loadSource(resolved);
  };
  new Function("require", "module", "exports", outputText)(localRequire, module, module.exports);
  return module.exports;
}

// Public recipe links must work without touching browser preferences, records or credentials.
for (const storage of ["localStorage", "sessionStorage"]) {
  Object.defineProperty(globalThis, storage, {
    configurable: true,
    get() { throw new Error(`Recipe card routing must not read ${storage}`); },
  });
}

const { parseRecipeCardRequest, createRecipeCardUrl } = loadSource("src/recipe-card-route.ts");
const { standardizedRecipes, sourceFoods, nutrientKeys } = loadSource("src/nutrition-data.ts");
const foodById = new Map(sourceFoods.map(food => [food.id, food]));
const portions = { small: 0.75, regular: 1, large: 1.25 };
const locales = ["en", "zh"];
const baseUrl = "https://mealhatch.example/product/?profile=private-profile&history=private-record&apiKey=private-key&lang=invalid#private-fragment";
const allowedKeys = ["recipe", "version", "portion", "lang"];
const round = value => Math.round((value + Number.EPSILON) * 10000) / 10000;
const close = (actual, expected, message) => assert(Math.abs(actual - expected) <= 0.00011, `${message}: ${actual} vs ${expected}`);
let routeCases = 0;
let independentlyCheckedNutrients = 0;

assert.equal(standardizedRecipes.length, 108, "This release must expose all 108 recipe cards");
assert.equal(new Set(standardizedRecipes.map(recipe => recipe.mealId)).size, 108);

for (const recipe of standardizedRecipes) {
  for (const [portion, factor] of Object.entries(portions)) {
    for (const locale of locales) {
      const url = new URL(createRecipeCardUrl(recipe, portion, locale, baseUrl));
      assert.equal(url.origin, "https://mealhatch.example");
      assert.equal(url.pathname, "/product/");
      assert.equal(url.hash, "");
      assert.deepEqual([...url.searchParams.keys()], allowedKeys);
      assert(!url.toString().includes("private-"), "Inherited user information must not enter a public recipe URL");
      const result = parseRecipeCardRequest(url.search);
      assert.equal(result?.status, "ready", `Missing public recipe ${recipe.mealId}`);
      assert.equal(result.recipe, recipe, "Resolve the canonical published object, not query-supplied content");
      assert.equal(result.recipe.version, url.searchParams.get("version"));
      assert.equal(result.portion, portion);
      assert.equal(result.locale, locale);
      assert.deepEqual(Object.keys(result).sort(), ["calculation", "locale", "portion", "recipe", "status"]);

      const calculation = result.calculation;
      assert.equal(calculation.ingredientAmounts.length, recipe.ingredients.length);
      const grams = recipe.ingredients.map(ingredient => round(ingredient.grams * factor));
      close(calculation.portionGrams, round(grams.reduce((sum, weight) => sum + weight, 0)), "Selected portion mass");
      for (const [index, ingredient] of recipe.ingredients.entries()) {
        const actual = calculation.ingredientAmounts[index];
        const food = foodById.get(ingredient.foodId);
        assert(food, `Missing source food ${ingredient.foodId}`);
        assert.equal(food.state, ingredient.weighedState);
        assert.equal(actual.foodId, ingredient.foodId);
        assert.equal(actual.sourceId, food.sourceId);
        close(actual.grams, grams[index], "Selected edible ingredient weight");
      }
      for (const nutrient of nutrientKeys) {
        const values = recipe.ingredients.map(ingredient => foodById.get(ingredient.foodId).nutrientsPer100g[nutrient]);
        const hasUnknown = values.some(value => value === null);
        if (hasUnknown) {
          assert.equal(calculation.nutrition[nutrient], null, "Missing nutrient values must remain unknown");
          assert(calculation.unknowns.some(entry => entry.nutrient === nutrient));
        } else {
          const expected = round(values.reduce((sum, value, index) => sum + value * grams[index] / 100, 0));
          close(calculation.nutrition[nutrient], expected, `${recipe.mealId} ${portion} ${nutrient}`);
        }
        independentlyCheckedNutrients++;
      }
      const withPrivateParameters = parseRecipeCardRequest(`${url.search}&profile=ignored&history=ignored&apiKey=ignored&title=%3Cscript%3Ebad%3C%2Fscript%3E`);
      assert.deepEqual(withPrivateParameters, result, "Only the four public display parameters may affect the recipe");
      assert.deepEqual(parseRecipeCardRequest(url.search), result, "Repeated parsing must be deterministic");
      routeCases++;
    }
  }
}

const example = standardizedRecipes[0];
const baseSearch = new URL(createRecipeCardUrl(example, "regular", "en", baseUrl)).search;
for (const search of ["", "?lang=zh", "?profile=anything&history=anything", "?version=current&portion=small"]) {
  assert.equal(parseRecipeCardRequest(search), null, "Only an explicit recipe parameter opens a recipe card");
}
const defaultRequest = parseRecipeCardRequest(`?recipe=${encodeURIComponent(example.mealId)}`);
assert.equal(defaultRequest.status, "ready");
assert.equal(defaultRequest.recipe.version, example.version);
assert.equal(defaultRequest.portion, "regular");
assert.equal(defaultRequest.locale, "en");
assert.equal(parseRecipeCardRequest(`${baseSearch.replace("lang=en", "lang=fr")}`).locale, "en");

const invalidSearches = [
  "?recipe=",
  "?recipe=missing-recipe&lang=zh",
  "?recipe=__proto__",
  "?recipe=constructor",
  "?recipe=..%2F..%2Fprivate",
  "?recipe=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E",
  "?recipe=%E0%A4%A",
  `${baseSearch}&recipe=${encodeURIComponent(example.mealId)}`,
  `${baseSearch}&recipe=missing-recipe`,
  `${baseSearch}&version=${encodeURIComponent(example.version)}`,
  `${baseSearch}&portion=large`,
  `${baseSearch}&lang=zh`,
];
for (const version of ["", "outdated-version", `${example.version}-changed`, "<script>"]) {
  const params = new URLSearchParams(baseSearch);
  params.set("version", version);
  invalidSearches.push(params.toString());
}
for (const portion of ["", "0", "2", "Regular", "huge", "small,large", "<script>"]) {
  const params = new URLSearchParams(baseSearch);
  params.set("portion", portion);
  invalidSearches.push(params.toString());
}
for (const search of invalidSearches) {
  const result = parseRecipeCardRequest(search);
  assert.equal(result?.status, "unavailable", `Invalid recipe card must not fall back: ${search}`);
  assert.deepEqual(Object.keys(result).sort(), ["locale", "status"], "Unavailable requests must not expose a substituted recipe or query text");
}

const credentialBase = "https://private-user:private-password@mealhatch.example/nested/path/?key=private-key#private-record";
const credentialFreeUrl = new URL(createRecipeCardUrl(example, "small", "zh", credentialBase));
assert.equal(credentialFreeUrl.username, "");
assert.equal(credentialFreeUrl.password, "");
assert.equal(credentialFreeUrl.pathname, "/nested/path/");
assert.equal(credentialFreeUrl.hash, "");
assert(!credentialFreeUrl.toString().includes("private-"));
const hostileLabel = { ...example, label: { en: '<img src=x onerror="alert(1)">', zh: "餐點 & 金鑰=private-key" } };
assert.equal(createRecipeCardUrl(hostileLabel, "regular", "en", baseUrl), createRecipeCardUrl(example, "regular", "en", baseUrl), "Titles and arbitrary object fields must never be serialized into a card URL");
assert.throws(() => createRecipeCardUrl({ ...example, mealId: "unpublished" }, "regular", "en", baseUrl), RangeError);
assert.throws(() => createRecipeCardUrl({ ...example, version: "old" }, "regular", "en", baseUrl), RangeError);
assert.throws(() => createRecipeCardUrl(example, "huge", "en", baseUrl), RangeError);
assert.throws(() => createRecipeCardUrl(example, "regular", "fr", baseUrl), RangeError);
for (const invalidBase of ["javascript:alert(1)", "data:text/html,hello", "file:///private/path", "/relative/path"]) {
  assert.throws(() => createRecipeCardUrl(example, "regular", "en", invalidBase), TypeError);
}

const { RecipeCard } = loadSource("src/RecipeCard.tsx");
const { recipeTimeExplanation } = loadSource("src/recipe-time.ts");
const htmlText = value => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;",
})[character]);
const block = (html, tag, className) => {
  const matched = html.match(new RegExp(`<${tag} class="${className}">([\\s\\S]*?)<\\/${tag}>`));
  assert(matched, `Missing ${className}`);
  return matched[1];
};
const listItems = (html, tag, className) => [...block(html, tag, className).matchAll(/<li(?:\s[^>]*)?>([\s\S]*?)<\/li>/g)].map(match => match[1]);
const numberText = (value, locale, maximumFractionDigits) => {
  const minimum = 10 ** -maximumFractionDigits;
  if (value > 0 && value < minimum) return `<${minimum}`;
  return new Intl.NumberFormat(locale === "zh" ? "zh-TW" : "en-US", { maximumFractionDigits }).format(value);
};
const propsFor = (recipe, portion, locale) => {
  const recipeUrl = createRecipeCardUrl(recipe, portion, locale, baseUrl);
  return { ...parseRecipeCardRequest(new URL(recipeUrl).search), recipeUrl, backUrl: "https://mealhatch.example/product/" };
};
const renderCard = props => renderToStaticMarkup(createElement(RecipeCard, props));
let renderedCards = 0;
let completeStepsChecked = 0;
let publicIngredientRowsChecked = 0;
function verifyRenderedCard(recipe, portion, locale) {
  const props = propsFor(recipe, portion, locale);
  const html = renderCard({ ...props, profile: "PRIVATE_PROFILE_CANARY", history: "PRIVATE_RECORD_CANARY", apiKey: "PRIVATE_KEY_CANARY" });
  assert(html.includes(`lang="${locale === "zh" ? "zh-Hant" : "en"}"`));
  const expectedTitle = recipe.label[locale].replace(locale === "zh" ? /（標準配方）$/ : / — standard recipe$/, "");
  assert(html.includes(`<h1 id="recipe-card-title">${htmlText(expectedTitle)}</h1>`));
  assert(!/PRIVATE_(?:PROFILE|RECORD|KEY)_CANARY/.test(html), "Private values must not be printed");
  assert(!/(?:recommendation-score|recommendation-receipt|score-receipt|Matching points|Matching-rule|配對計分|計分明細)/.test(html), "Public recipe cards must not include personalized ranking receipts");
  assert(html.includes('aria-describedby="recipe-card-print-help"'), "PDF instructions need an accessible association");
  assert(!/<details\b/.test(html), "Printable recipe content must remain expanded");

  const rows = listItems(html, "ul", "recipe-card-ingredient-list");
  assert.equal(rows.length, recipe.ingredients.length, "Every ingredient must appear, including oil, salt and retained water");
  for (const [index, ingredient] of props.calculation.ingredientAmounts.entries()) {
    assert(rows[index].includes(`<strong>${htmlText(ingredient.food.label[locale])}</strong>`), "Ingredient names must match the source-backed selected recipe");
    assert(rows[index].includes(`href="${htmlText(ingredient.food.recordUrl)}"`), "Each ingredient needs its actual public source link");
    assert(rows[index].includes(`FDC ${ingredient.food.fdcId}`));
    const amount = `${numberText(ingredient.grams, locale, 2)} g`;
    assert(rows[index].includes(`<span class="recipe-card-amount">${htmlText(amount)}</span>`), "Rendered grams must reflect the selected portion");
    const stateLabels = {
      cooked: locale === "en" ? "Cooked weight" : "熟後重量",
      raw: locale === "en" ? "Raw weight" : "生鮮重量",
      "ready-to-eat": locale === "en" ? "Ready-to-eat weight" : "即食重量",
    };
    assert(rows[index].includes(stateLabels[ingredient.food.state]), "The weighed food state must remain visible");
    publicIngredientRowsChecked++;
  }
  const steps = listItems(html, "ol", "recipe-card-steps");
  assert.deepEqual(steps, recipe.instructions.map(step => htmlText(step[locale])), "All cooking steps must be printed in full and in order");
  completeStepsChecked += steps.length;

  const expectedTime = locale === "en" ? `About ${recipe.prepMinutes} min assembly` : `約 ${recipe.prepMinutes} 分鐘組合`;
  assert.equal(block(html, "p", "recipe-card-time"), htmlText(expectedTime));
  if (recipe.preparationGuide) {
    assert.equal(block(html, "p", "recipe-card-kicker"), locale === "en" ? "Recipe &amp; cooking guide" : "食譜與烹調指南");
    assert.equal(block(html, "p", "recipe-card-section-note recipe-card-timing-note"), htmlText(recipe.preparationGuide.timingNote[locale]));
    assert(html.includes(htmlText(recipe.preparationGuide.version)), "Separate cooking-guide version must remain visible");
    for (const source of recipe.preparationGuide.sources) {
      assert(html.includes(`href="${htmlText(source.url)}"`));
      assert(html.includes(`>${htmlText(source.label[locale])}</a>`));
    }
  } else {
    assert.equal(block(html, "p", "recipe-card-kicker"), locale === "en" ? "Assembly recipe" : "食材組合食譜");
    assert.equal(block(html, "p", "recipe-card-section-note recipe-card-timing-note"), htmlText(recipeTimeExplanation(locale)));
  }
  assert(html.includes(htmlText(recipe.version)), "The nutrition formulation version must be printed");
  assert(html.includes(`href="${htmlText(props.recipeUrl)}"`), "The return recipe link must retain the selected identity, version, portion and language");
  assert(html.includes('<img '), "Every current recipe should resolve its existing illustration");
  const imageDisclosure = locale === "en" ? "Food image is an AI-generated illustration." : "餐點圖片為 AI 生成示意圖。";
  assert.equal(html.split(imageDisclosure).length - 1, 1, "Image disclosure appears once per public recipe card");
  renderedCards++;
}

for (const recipe of standardizedRecipes) for (const locale of locales) verifyRenderedCard(recipe, "regular", locale);
const specialPortionIds = new Set([
  example.mealId,
  "congee-egg-side-veg",
  standardizedRecipes.find(recipe => recipe.ingredients.some(ingredient => ingredient.processing === "pureed"))?.mealId,
  standardizedRecipes.at(-1).mealId,
]);
for (const recipe of standardizedRecipes.filter(recipe => specialPortionIds.has(recipe.mealId))) {
  for (const portion of ["small", "large"]) for (const locale of locales) verifyRenderedCard(recipe, portion, locale);
}

for (const locale of locales) {
  const props = propsFor(example, "regular", locale);
  const calculation = {
    ...props.calculation,
    nutrition: { ...props.calculation.nutrition, kcal: null, protein: null, fiber: 0, sodium: null },
  };
  const html = renderCard({ ...props, calculation });
  const unknown = locale === "en" ? "Unknown" : "未知";
  for (const label of locale === "en" ? ["Energy", "Protein", "Sodium"] : ["熱量", "蛋白質", "鈉"]) {
    assert(html.includes(`<dt>${label}</dt><dd>${unknown}</dd>`), "Unknown nutrients must not become a displayed zero");
  }
  assert(html.includes(`<dt>${locale === "en" ? "Fiber" : "膳食纖維"}</dt><dd>0 g</dd>`), "A known zero remains distinct from an unknown value");

  const missingIngredient = {
    ...props.calculation,
    ingredientAmounts: props.calculation.ingredientAmounts.map((ingredient, index) => index === 0 ? { ...ingredient, food: null, grams: null, sourceId: null } : ingredient),
  };
  const missingHtml = renderCard({ ...props, calculation: missingIngredient });
  assert(missingHtml.includes(locale === "en" ? "Ingredient reference unavailable" : "食材來源紀錄尚缺"));
  assert(listItems(missingHtml, "ul", "recipe-card-ingredient-list")[0].includes(`<span class="recipe-card-amount">${unknown}</span>`));

  const unavailablePhotoHtml = renderCard({ ...props, recipe: { ...props.recipe, version: "unavailable-image-version" } });
  assert(!/<img\b/.test(unavailablePhotoHtml), "A missing version-pinned image must safely omit the photo");
  assert.deepEqual(listItems(unavailablePhotoHtml, "ol", "recipe-card-steps"), example.instructions.map(step => htmlText(step[locale])), "Missing imagery must not remove recipe instructions");
  assert.equal(listItems(unavailablePhotoHtml, "ul", "recipe-card-ingredient-list").length, example.ingredients.length);

  const maliciousTitle = '<script>alert("bad")</script> & 故意測試';
  const hostileHtml = renderCard({ ...props, recipe: { ...props.recipe, label: { en: maliciousTitle, zh: maliciousTitle } } });
  assert(hostileHtml.includes(htmlText(maliciousTitle)), "Recipe titles must be escaped as text");
  assert(!hostileHtml.includes('<script>alert("bad")</script>'));
}

let layoutFixture = null;
if (process.argv.includes("--layout-fixture")) {
  const cases = [];
  for (const paper of ["letter", "a4"]) {
    for (const locale of locales) {
      for (const recipe of standardizedRecipes) {
        const props = propsFor(recipe, "regular", locale);
        const rendered = renderCard({ ...props, initialPaper: paper, initialPaperPreview: true });
        assert(rendered.includes("is-paper-preview"), "The layout fixture requires the production paper-preview mode");
        assert(rendered.includes(`data-paper-size="${paper}"`), "The layout fixture must use the actual selected paper size");
        assert(rendered.includes('class="recipe-card-paper-content"'), "The printable content boundary must be measurable");
        assert(rendered.includes('class="recipe-card-page-limit"'), "The one-page height limit must be measurable");
        assert.equal(listItems(rendered, "ol", "recipe-card-steps").length, recipe.instructions.length);
        assert.equal(listItems(rendered, "ul", "recipe-card-ingredient-list").length, recipe.ingredients.length);
        const caseId = `${paper}-${locale}-${recipe.mealId}`;
        cases.push(`<section class="recipe-card-audit-case" id="${htmlText(caseId)}" data-recipe-id="${htmlText(recipe.mealId)}" data-locale="${locale}" data-paper="${paper}" data-expected-ingredients="${recipe.ingredients.length}" data-expected-steps="${recipe.instructions.length}"><h2 class="recipe-card-audit-label">${htmlText(`${paper.toUpperCase()} · ${locale} · ${recipe.mealId}`)}</h2>${rendered}</section>`);
      }
    }
  }
  const artifactPath = path.resolve(root, "output/playwright/recipe-card/layout-audit.html");
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Recipe card layout audit — 432 cases</title>
<link rel="stylesheet" href="/src/index.css"><link rel="stylesheet" href="/src/launch.css"><link rel="stylesheet" href="/src/recipe-card.css">
<style>.recipe-card-audit-intro{margin:24px;padding:20px;background:white;color:#20312a}.recipe-card-audit-case{margin:0 0 36px}.recipe-card-audit-label{margin:0;padding:12px 24px;background:#d8e1db;color:#17382c;font:600 16px/1.4 system-ui,sans-serif}</style>
</head><body><div class="recipe-card-audit-intro"><h1>Recipe card layout audit</h1><p>${cases.length} static renders of the real RecipeCard component: 108 recipes × English/Traditional Chinese × Letter/A4. Standard portion. The three linked stylesheets match production order. This QA artifact has no interactive event handlers.</p><p>Measure each .recipe-card-paper-content against its .recipe-card-page-limit inside .recipe-card-audit-case. Case attributes identify the recipe, language, paper size and expected ingredient/step counts. No content is truncated or duplicated to fit.</p></div>${cases.join("\n")}</body></html>`;
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, html, "utf8");
  layoutFixture = { path: artifactPath, cases: cases.length, bytes: Buffer.byteLength(html), papers: ["letter", "a4"] };
}

console.log(JSON.stringify({
  recipes: standardizedRecipes.length,
  routeCases,
  independentlyCheckedNutrients,
  invalidLinksRejected: invalidSearches.length,
  exactIdentityAndVersion: "passed",
  privacyAndParameterWhitelist: "passed",
  storageIndependent: "passed",
  renderedCards,
  publicIngredientRowsChecked,
  completeStepsChecked,
  unknownValuesAndMissingImageFallback: "passed",
  ...(layoutFixture ? { layoutFixture } : {}),
}, null, 2));

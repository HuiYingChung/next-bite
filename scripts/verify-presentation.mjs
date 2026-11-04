import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Load the real TypeScript exports in memory. No generated fixtures, extra
// packages, browser, network request, or child compiler process is needed.
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const modules = new Map();
function loadSource(relativePath) {
  const absolutePath = path.resolve(projectRoot, relativePath);
  if (modules.has(absolutePath)) return modules.get(absolutePath).exports;
  const module = { exports: {} };
  modules.set(absolutePath, module);
  const { outputText } = ts.transpileModule(
    fs.readFileSync(absolutePath, "utf8"),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
      },
    },
  );
  const localRequire = (specifier) => {
    assert.ok(
      specifier.startsWith("."),
      `Unexpected runtime dependency: ${specifier}`,
    );
    return loadSource(
      path.resolve(path.dirname(absolutePath), `${specifier}.ts`),
    );
  };
  new Function("require", "module", "exports", outputText)(
    localRequire,
    module,
    module.exports,
  );
  return module.exports;
}

const data = loadSource("src/data.ts");
const logic = loadSource("src/logic.ts");
const {
  getMealPresentation,
  getNamedMealComponents,
  label,
  mealTitle,
  translateFood,
} = loadSource("src/presentation.ts");
const meals = data.recommendationDataset;
assert.equal(meals.length, 100, "The launch catalog should contain 100 meals");
assert.equal(
  new Set(meals.map((meal) => meal.id)).size,
  meals.length,
  "Catalog ids must be unique",
);

// Independent meaning checks catch untranslated or accidentally swapped titles,
// rather than accepting a title just because it contains a Chinese character.
const titleAnchors = [
  [/\bchicken\b/i, /雞/],
  [/\bsalmon\b/i, /鮭魚/],
  [/\btofu\b/i, /豆腐/],
  [/\bshrimp\b/i, /蝦/],
  [/\begg\b/i, /蛋/],
  [/\bbeef\b/i, /牛肉/],
  [/\bturkey\b/i, /火雞/],
  [/\bpork\b/i, /豬肉|肉燥/],
  [/\bbeans?\b/i, /豆/],
  [/\bcongee\b|\bporridge\b/i, /粥/],
  [/\boatmeal\b|\boats\b/i, /燕麥/],
  [/\byogurt\b/i, /優格/],
  [/\bdumplings?\b/i, /餃|湯包/],
  [/\bfish\b/i, /魚/],
  [/\bcod\b/i, /鱈魚/],
  [/\bfalafel\b/i, /鷹嘴豆丸/],
  [/\bpoke\b/i, /波奇/],
  [/\bonigiri\b/i, /飯糰/],
  [/\bcottage cheese\b/i, /茅屋起司/],
  [/\bgyro\b/i, /希臘烤肉/],
  [/\bsoba\b/i, /蕎麥/],
  [/\budon\b/i, /烏龍/],
  [/\brice\b/i, /飯|米/],
  [/\blentils?\b/i, /扁豆/],
  [/\bsoup\b|\bbroth\b/i, /湯/],
  [/\bbitter melon\b/i, /苦瓜/],
  [/\bcurry\b/i, /咖哩/],
  [/\bsalad\b/i, /沙拉/],
  [/\btoast\b/i, /吐司/],
  [/\bwrap\b/i, /捲餅/],
  [/\bbento\b/i, /便當/],
  [/\bsoy milk\b/i, /豆漿/],
];
const validGroups = new Set([
  "protein",
  "vegetable",
  "carb",
  "fruit",
  "soup",
  "drink",
  "other",
]);
const tokens = (value) =>
  value
    .toLowerCase()
    .replace(/veggie/g, "vegetable")
    .replace(/berries/g, "berry")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => !["a", "an", "and", "with", "of"].includes(word))
    .map((word) => (word.endsWith("s") ? word.slice(0, -1) : word));
const chineseTitles = new Set();
for (const meal of meals) {
  const english = getMealPresentation(meal, "en");
  const chinese = getMealPresentation(meal, "zh");
  assert.equal(english.title, meal.title, `English title changed: ${meal.id}`);
  assert.equal(
    chinese.title,
    mealTitle(meal, "zh"),
    `Title helpers disagree: ${meal.id}`,
  );
  assert.notEqual(
    chinese.title,
    meal.title,
    `Missing Chinese title: ${meal.id}`,
  );
  assert.ok(
    !/[a-z]/i.test(chinese.title),
    `Untranslated title fragment: ${meal.id}`,
  );
  assert.ok(
    !chineseTitles.has(chinese.title),
    `Duplicate Chinese title: ${chinese.title}`,
  );
  chineseTitles.add(chinese.title);
  const anchors = titleAnchors.filter(([englishPattern]) =>
    englishPattern.test(meal.title),
  );
  assert.ok(anchors.length, `Add a semantic title check for ${meal.id}`);
  for (const [, chinesePattern] of anchors) {
    assert.match(
      chinese.title,
      chinesePattern,
      `Chinese title lost a named food: ${meal.id}`,
    );
  }
  assert.ok(
    chinese.cuisine && chinese.effort && chinese.tip,
    `Incomplete presentation: ${meal.id}`,
  );
  assert.notEqual(
    chinese.tip,
    english.tip,
    `Missing Chinese preparation tip: ${meal.id}`,
  );
  assert.notEqual(
    chinese.effort,
    english.effort,
    `Missing Chinese preparation effort: ${meal.id}`,
  );
  const components = getNamedMealComponents(meal);
  assert.ok(components.length, `Missing named components: ${meal.id}`);
  assert.deepEqual(
    english.ingredients,
    components.map((item) => item.name),
    `Component helpers disagree: ${meal.id}`,
  );
  assert.equal(
    chinese.ingredients.length,
    components.length,
    `Chinese display added or dropped a component: ${meal.id}`,
  );
  const titleWords = new Set(tokens(meal.title));
  // Soba/udon already name a noodle type. This expands its English display
  // name, rather than adding a recipe ingredient that was never declared.
  if (titleWords.has("soba") || titleWords.has("udon"))
    titleWords.add("noodle");
  components.forEach((component, index) => {
    assert.ok(
      validGroups.has(component.group),
      `Invalid food group: ${meal.id}`,
    );
    assert.equal(
      typeof component.name,
      "string",
      `Missing component name: ${meal.id}`,
    );
    for (const word of tokens(component.name)) {
      assert.ok(
        titleWords.has(word),
        `Implicit recipe addition: ${meal.id} -> ${component.name}`,
      );
    }
    const translated = chinese.ingredients[index];
    assert.equal(
      translated,
      translateFood(component.name, "zh"),
      `Component translation mismatch: ${meal.id}`,
    );
    assert.notEqual(
      translated,
      component.name,
      `Untranslated named component: ${meal.id} -> ${component.name}`,
    );
    assert.ok(
      !/[a-z]/i.test(translated),
      `Untranslated component fragment: ${meal.id}`,
    );
  });
}

const units = [
  "serving",
  "portion",
  "cup",
  "bowl",
  "plate",
  "piece",
  "slice",
  "tablespoon",
  "teaspoon",
  "handful",
  "glass",
  "can",
  "bottle",
  "unspecified",
];
const supportedLabels = new Set([
  ...data.mealNames,
  ...data.avoidTags,
  ...data.preferenceTags,
  ...Object.values(data.mealOptions).flat(),
  ...data.drinkRecommendationDataset.map((drink) => drink.title),
  ...units,
  "home-cooked",
  "takeout",
  "low",
  "medium",
  "high",
  "Unspecified",
]);
for (const value of supportedLabels) {
  assert.equal(
    label(value, "en"),
    value,
    `Changed canonical English display value: ${value}`,
  );
  assert.notEqual(
    label(value, "zh"),
    value,
    `Missing Chinese display label: ${value}`,
  );
}

const state = data.createBlankState(new Date("2026-11-03T12:00:00"));
const today = state.days.find((day) => day.isToday);
const recommendations = logic.scoreRecommendations(
  state.profile,
  today.todayLog,
  state.days,
  "en",
  new Date("2026-11-03T12:00:00"),
);
assert.equal(
  recommendations.length,
  3,
  "Need all three selection perspectives for label checks",
);
const traceKeys = new Set(
  recommendations.flatMap((meal) =>
    meal.selectionTrace.perspectiveAdjustments.map((item) => item.key),
  ),
);
for (const meal of recommendations)
  assert.notEqual(
    label(meal.label, "zh"),
    meal.label,
    `Missing perspective label: ${meal.label}`,
  );
for (const key of traceKeys) {
  assert.notEqual(
    label(key, "en"),
    key,
    `Technical trace key exposed in English: ${key}`,
  );
  assert.notEqual(label(key, "zh"), key, `Missing Chinese trace label: ${key}`);
}

const freeTextValues = [
  "Grandma's special lunch",
  "阿嬤的菜＋leftovers",
  "  my own mystery dish  ",
  "tofu with my own sauce",
];
for (const text of freeTextValues) {
  for (const locale of ["en", "zh"]) {
    assert.equal(
      translateFood(text, locale),
      text,
      "Unknown user text must not be rewritten",
    );
    assert.equal(
      label(text, locale),
      text,
      "Unknown display text must not be rewritten",
    );
  }
}
const unknownMeal = { ...meals[0], id: "user-meal", title: freeTextValues[0] };
assert.equal(
  mealTitle(unknownMeal, "zh"),
  unknownMeal.title,
  "Unknown meal title must stay untouched",
);
assert.deepEqual(
  getNamedMealComponents(unknownMeal),
  [{ name: unknownMeal.title, group: "other" }],
  "Unknown meals must not acquire inferred ingredients",
);

console.log(
  `Presentation verification passed: ${meals.length} meals, ${supportedLabels.size} display labels, ${traceKeys.size} trace labels; named foods, bilingual output, and free-text boundaries checked.`,
);

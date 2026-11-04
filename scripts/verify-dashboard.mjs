import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Exercise the real TSX exports with the repository's existing TypeScript and
// React packages. No generated fixtures, browser, network, or child process.
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
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
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  );
  const localRequire = (specifier) => {
    if (specifier === "react/jsx-runtime") return require(specifier);
    assert.ok(
      specifier.startsWith("."),
      `Unexpected runtime dependency: ${specifier}`,
    );
    const target = path.resolve(path.dirname(absolutePath), specifier);
    const file = [target, `${target}.ts`, `${target}.tsx`].find(
      (candidate) =>
        fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
    );
    assert.ok(file, `Source module not found: ${specifier}`);
    return loadSource(file);
  };
  new Function("require", "module", "exports", outputText)(
    localRequire,
    module,
    module.exports,
  );
  return module.exports;
}

function elements(node, predicate, result = []) {
  if (!node || typeof node !== "object") return result;
  if (predicate(node)) result.push(node);
  for (const child of [node.props?.children].flat(Infinity))
    elements(child, predicate, result);
  return result;
}
const content = (node) => {
  if (Array.isArray(node)) return node.map(content).join("");
  if (typeof node === "string" || typeof node === "number") return String(node);
  return node && typeof node === "object" ? content(node.props?.children) : "";
};
const hasClass = (node, name) =>
  typeof node.props?.className === "string" &&
  node.props.className.split(" ").includes(name);

const { HistoryGrid, ScoreContributions, PilotScoreContributions } = loadSource(
  "src/DashboardInsights.tsx",
);
const { createBlankState, createEmptyMeal, mealNames, recommendationDataset } =
  loadSource("src/data.ts");
const { scoreMealOption, scoreRecommendations, summarizeTodayIntake } =
  loadSource("src/logic.ts");
const { NutritionDetails } = loadSource("src/NutritionDetails.tsx");
const { calculateRecipe, recommendPilotMeals, nutrientUnits } = loadSource("src/nutrition.ts");
const { sourceFoods, standardizedRecipes, nutritionSources } = loadSource("src/nutrition-data.ts");
const { defaultMealContext } = loadSource("src/meal-context.ts");
const now = new Date(2026, 10, 3, 12);
const state = createBlankState(now);
const component = (name) => ({
  name,
  group: "other",
  confidence: "limited",
  amount: {
    quantity: null,
    unit: "unspecified",
    qualifier: "unspecified",
    originalText: null,
  },
});
state.days[1].todayLog.Lunch.protein = ["Tofu"];
state.days[3].todayLog.Dinner.componentDetails = [
  component("Sandwich with unknown filling"),
];
state.days[5].todayLog.Breakfast.componentDetails = [
  component("Mixed meal sources: Home-cooked + Takeout. Review source."),
  component("Mixed preparation: Boiled + Fried. Review preparation."),
  component("Combined portions: Small + Large. Review overall portion."),
];
const originalDays = JSON.stringify(state.days);
const dates = state.days.map((day) => day.id);
assert.equal(dates.length, 7);
assert.deepEqual(mealNames, [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snacks / Drinks",
]);

let callbacksChecked = 0;
for (const locale of ["en", "zh"]) {
  const selected = [];
  const tree = HistoryGrid({
    days: [...state.days].reverse(),
    locale,
    onSelect: (day, slot) => selected.push({ day, slot }),
  });
  const html = renderToStaticMarkup(tree);
  const buttons = elements(tree, (node) => node.type === "button");
  assert.equal(
    buttons.length,
    28,
    "Seven days and four slots must have 28 selectable cells.",
  );
  assert.equal(
    new Set(buttons.map((button) => button.props["aria-label"])).size,
    28,
    "Each dated meal slot needs a distinct accessible name.",
  );
  assert.equal(
    elements(tree, (node) => node.type === "th" && node.props.scope === "col")
      .length,
    8,
  );
  assert.equal(
    elements(tree, (node) => node.type === "th" && node.props.scope === "row")
      .length,
    4,
  );
  assert.equal(elements(tree, (node) => node.type === "caption").length, 1);
  assert.deepEqual(
    elements(tree, (node) => node.type === "time").map(
      (node) => node.props.dateTime,
    ),
    dates,
    "Date columns must be chronological even when supplied in reverse order.",
  );
  const slotNames =
    locale === "en"
      ? ["Breakfast", "Lunch", "Dinner", "Snacks / Drinks"]
      : ["早餐", "午餐", "晚餐", "點心／飲料"];
  const recorded = locale === "en" ? "Recorded" : "有紀錄";
  const unknown = locale === "en" ? "Unknown" : "未知";
  let recordedCount = 0;
  for (let slotIndex = 0; slotIndex < 4; slotIndex += 1) {
    for (let dateIndex = 0; dateIndex < 7; dateIndex += 1) {
      const button = buttons[slotIndex * 7 + dateIndex];
      const expectedRecorded =
        (slotIndex === 1 && dateIndex === 1) ||
        (slotIndex === 2 && dateIndex === 3);
      if (expectedRecorded) recordedCount += 1;
      assert.equal(
        hasClass(button, "is-recorded"),
        expectedRecorded,
        "Named foods count as recorded; generated context notes do not.",
      );
      assert.equal(hasClass(button, "is-unknown"), !expectedRecorded);
      assert.ok(
        content(button).includes(expectedRecorded ? recorded : unknown),
      );
      const accessibleName = button.props["aria-label"];
      const [year, month, day] = dates[dateIndex].split("-").map(Number);
      if (locale === "en") {
        assert.ok(
          accessibleName.includes(month === 10 ? "October" : "November"),
        );
        assert.ok(new RegExp(`\\b${day}\\b`).test(accessibleName));
        assert.ok(accessibleName.includes(String(year)));
      } else {
        assert.ok(accessibleName.includes(`${year}年${month}月${day}日`));
      }
      assert.ok(
        button.props["aria-label"].includes(
          `${slotNames[slotIndex]} · ${expectedRecorded ? recorded : unknown}`,
        ),
        "Each accessible name must identify the localized slot and record status.",
      );
      button.props.onClick();
      assert.strictEqual(
        selected.at(-1).day,
        state.days[dateIndex],
        "Selection must return the exact source day.",
      );
      assert.equal(
        selected.at(-1).slot,
        mealNames[slotIndex],
        "Selection must return the exact slot.",
      );
      callbacksChecked += 1;
    }
  }
  assert.equal(recordedCount, 2);
  assert.ok(
    html.includes(
      locale === "en"
        ? "An unknown slot does not mean you skipped a meal."
        : "未知不代表你沒有吃這餐",
    ),
  );
  const legend = elements(tree, (node) => node.type === "ul")[0];
  assert.ok(
    content(legend).includes(recorded) && content(legend).includes(unknown),
    "Both statuses need a textual legend.",
  );
}
assert.equal(
  JSON.stringify(state.days),
  originalDays,
  "Rendering and selection must not mutate history.",
);

const log = Object.fromEntries(
  mealNames.map((slot) => [slot, createEmptyMeal()]),
);
for (const slot of ["Breakfast", "Lunch", "Dinner"]) {
  log[slot] = { ...createEmptyMeal(), carbs: ["Rice"], protein: ["Chicken"] };
}
let contributionRowsChecked = 0;
for (const locale of ["en", "zh"]) {
  const rec = scoreMealOption(
    summarizeTodayIntake(log),
    log,
    state.days,
    state.profile,
    recommendationDataset[0],
    "dinner",
    locale,
  );
  assert.ok(rec.scoreBreakdown.some((item) => item.points > 0));
  assert.ok(rec.scoreBreakdown.some((item) => item.points < 0));
  assert.ok(rec.scoreBreakdown.some((item) => item.points === 0));
  const trace = scoreRecommendations(
    state.profile,
    log,
    state.days,
    locale,
    now,
  )[0].selectionTrace;
  const withOtherTotals = {
    ...rec,
    score: 987654321,
    selectionTrace: {
      ...trace,
      perspectiveScore: 876543210,
      selectionScore: 765432109,
    },
  };
  const tree = ScoreContributions({ rec: withOtherTotals, locale });
  const html = renderToStaticMarkup(tree);
  const rows = elements(tree, (node) => hasClass(node, "contribution-row"));
  assert.equal(
    rows.length,
    rec.scoreBreakdown.length,
    "Every row must come from this meal's rule breakdown.",
  );
  assert.deepEqual(
    rows.map((row) => content(elements(row, (node) => hasClass(node, "contribution-note"))[0])),
    rec.scoreBreakdown.map((item) => item.note),
    "The actual localized engine explanations must survive rendering unchanged.",
  );
  assert.equal(elements(tree, (node) => node.type === "table").length, 1);
  assert.equal(elements(tree, (node) => node.type === "caption").length, 1);
  assert.equal(elements(tree, (node) => node.type === "th" && node.props.scope === "col").length, 3);
  assert.equal(elements(tree, (node) => node.type === "th" && node.props.scope === "row").length, rows.length);
  assert.equal(
    elements(tree, (node) => ["contribution-bar", "contribution-track", "contribution-zero"].some((name) => hasClass(node, name)) || node.type === "svg" || node.type === "canvas").length,
    0,
    "The compact receipt must contain numbers and notes, not bars or chart geometry.",
  );
  assert.equal(elements(tree, (node) => node.props?.style).length, 0, "Numeric rows must not encode magnitude with inline geometry.");
  for (let index = 0; index < rows.length; index += 1) {
    const points = rec.scoreBreakdown[index].points;
    const number = elements(rows[index], (node) =>
      hasClass(node, "contribution-points"),
    )[0];
    const formatted = new Intl.NumberFormat(locale === "zh" ? "zh-TW" : "en-US", { maximumFractionDigits: 2 }).format(Math.abs(points));
    assert.equal(
      content(number),
      `${points < 0 ? "−" : points > 0 ? "+" : ""}${formatted}`,
      "Points must retain their actual sign and value as text.",
    );
    contributionRowsChecked += 1;
  }
  assert.ok(
    html.includes(
      locale === "en"
        ? "not a nutrition or health score"
        : "不是營養或健康分數",
    ),
  );
  for (const sentinel of ["987654321", "876543210", "765432109"])
    assert.ok(
      !html.includes(sentinel),
      "Other totals must not be mixed into the numeric rule receipt.",
    );
  const zeros = ScoreContributions({
    rec: {
      ...rec,
      scoreBreakdown: rec.scoreBreakdown.map((item) => ({
        ...item,
        points: 0,
      })),
    },
    locale,
  });
  const zeroPoints = elements(zeros, (node) => hasClass(node, "contribution-points"));
  assert.equal(zeroPoints.length, rec.scoreBreakdown.length);
  assert.ok(
    zeroPoints.every((number) => content(number) === "0"),
    "An all-zero breakdown must display a literal zero for every actual rule.",
  );
}

let pilotContributionRowsChecked = 0;
let pilotZeroReceiptsChecked = 0;
let pilotPositiveReceiptsChecked = 0;
for (const locale of ["en", "zh"]) {
  const defaultPilot = recommendPilotMeals(state.profile, defaultMealContext, locale, now);
  assert.ok(defaultPilot.recommendations.length > 0);
  const preferredRecipe = defaultPilot.recommendations[0].recipe;
  const scenarios = [
    defaultPilot,
    recommendPilotMeals(state.profile, { ...defaultMealContext, preferredStaple: preferredRecipe.staple, cuisine: preferredRecipe.cuisine }, locale, now),
    recommendPilotMeals({ ...state.profile, preferenceTags: ["Warm meals", "Rice-based meals", "Light meals", "High-protein", "Vegetable-forward"] }, defaultMealContext, locale, now),
    recommendPilotMeals({ ...state.profile, feelToday: "Low energy" }, defaultMealContext, locale, now),
  ];
  for (const scenario of scenarios) {
    assert.ok(scenario.recommendations.length > 0);
    for (const recommendation of scenario.recommendations) {
      const before = JSON.stringify(recommendation);
      const rec = { ...recommendation, reasons: [...recommendation.reasons, "NONADDITIVE_REASON_987654321"] };
      const tree = PilotScoreContributions({ rec, locale });
      const html = renderToStaticMarkup(tree);
      const rows = elements(tree, (node) => hasClass(node, "contribution-row"));
      assert.equal(rows.length, 5, "Every pilot rule, including zero contributions, must be visible.");
      assert.deepEqual(rec.trace.pointBreakdown.map((item) => item.key), ["staple", "cuisine", "saved-styles", "light-preparation", "short-assembly"]);
      assert.deepEqual(
        rows.map((row) => content(elements(row, (node) => node.type === "th" && node.props.scope === "row")[0])),
        rec.trace.pointBreakdown.map((item) => item.label),
        "Pilot labels must come directly from the localized kernel trace.",
      );
      assert.deepEqual(
        rows.map((row) => content(elements(row, (node) => hasClass(node, "contribution-note"))[0])),
        rec.trace.pointBreakdown.map((item) => item.note),
        "Pilot notes must remain the actual localized explanations.",
      );
      let displayedSum = 0;
      for (const [index, row] of rows.entries()) {
        const points = rec.trace.pointBreakdown[index].points;
        const value = content(elements(row, (node) => hasClass(node, "contribution-points"))[0]);
        const expected = new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-TW", { maximumFractionDigits: 2 }).format(Math.abs(points));
        assert.equal(value, `${points > 0 ? "+" : points < 0 ? "−" : ""}${expected}`);
        displayedSum += Number(value.replace("−", "-").replaceAll(",", ""));
        pilotContributionRowsChecked += 1;
      }
      assert.equal(displayedSum, rec.trace.practicalFit, "Displayed rows must sum exactly to the visible practical matching total.");
      if (rec.trace.practicalFit === 0) {
        assert.ok(rows.every((row) => content(elements(row, (node) => hasClass(node, "contribution-points"))[0]) === "0"));
        pilotZeroReceiptsChecked += 1;
      } else pilotPositiveReceiptsChecked += 1;
      assert.equal(elements(tree, (node) => node.type === "table" && hasClass(node, "numeric-receipt")).length, 1);
      assert.equal(elements(tree, (node) => node.type === "th" && node.props.scope === "col").length, 3);
      assert.equal(elements(tree, (node) => node.type === "caption").length, 1);
      assert.ok(html.includes(locale === "en" ? "not a nutrition or health score" : "不是營養或健康分數"));
      assert.ok(!html.includes("NONADDITIVE_REASON_987654321"), "Separate nutrient ordering and other reasons cannot become additive score rows.");
      assert.equal(elements(tree, (node) => ["svg", "canvas", "meter", "progress"].includes(node.type) || node.props?.style || /(?:^|[ -])(bar|track|chart)(?:$|[ -])/.test(node.props?.className ?? "")).length, 0);
      assert.equal(JSON.stringify(recommendation), before);
    }
  }
}
assert.ok(pilotZeroReceiptsChecked >= 6, "The default pilot must retain a useful zero-point receipt in both languages.");
assert.ok(pilotPositiveReceiptsChecked > 0, "Exercise actual nonzero preference contributions as well as the default zeros.");

const nutritionLabels = {
  en: { kcal: "Energy", protein: "Protein", fiber: "Fiber", weight: "Edible weight", carbs: "Carbohydrate", fat: "Total fat", saturatedFat: "Saturated fat", sodium: "Sodium", addedSugar: "Added sugar" },
  zh: { kcal: "熱量", protein: "蛋白質", fiber: "膳食纖維", weight: "可食重量", carbs: "碳水化合物", fat: "總脂肪", saturatedFat: "飽和脂肪", sodium: "鈉", addedSugar: "添加糖" },
};
const mainNutrients = ["kcal", "protein", "fiber", "weight"];
const fullNutrients = ["carbs", "fat", "saturatedFat", "sodium", "addedSugar"];
const primaryValue = (node) => [node.props.children].flat(Infinity)
  .filter((child) => typeof child === "string" || typeof child === "number").join("");
const expectedNutritionValue = (value, unit, locale) => {
  if (value === null) return locale === "en" ? "Unknown" : "未知";
  const integer = unit === "kcal" || unit === "mg";
  const threshold = integer ? 1 : 0.1;
  const number = value > 0 && value < threshold ? `<${threshold}` : new Intl.NumberFormat(
    locale === "en" ? "en-US" : "zh-TW",
    { maximumFractionDigits: integer ? 0 : 1 },
  ).format(value);
  return `${number} ${unit}`;
};
let nutritionPanelsChecked = 0;
let unknownFiberPanelsChecked = 0;
let exactIngredientLinksChecked = 0;
function verifyNutritionPanel(recommendation, locale) {
  const before = JSON.stringify(recommendation);
  const tree = NutritionDetails({ recommendation, locale });
  const html = renderToStaticMarkup(tree);
  const metrics = elements(tree, (node) => hasClass(node, "nutrition-metrics"));
  assert.equal(metrics.length, 1);
  const mainValues = elements(metrics[0], (node) => hasClass(node, "nutrition-value"));
  assert.equal(mainValues.length, 4, "Only energy, protein, fiber and edible weight belong in the main facts.");
  assert.deepEqual(
    elements(metrics[0], (node) => node.type === "dt").map(content),
    mainNutrients.map((key) => nutritionLabels[locale][key]),
  );
  const full = elements(tree, (node) => hasClass(node, "nutrition-values"))[0];
  assert.deepEqual(
    elements(full, (node) => node.type === "dt").map(content),
    fullNutrients.map((key) => nutritionLabels[locale][key]),
  );
  const fullValues = elements(full, (node) => hasClass(node, "nutrition-value"));
  assert.equal(fullValues.length, fullNutrients.length);
  for (const [index, key] of [...mainNutrients, ...fullNutrients].entries()) {
    const wrapper = index < 4 ? mainValues[index] : fullValues[index - 4];
    const definition = elements(wrapper, (node) => node.type === "dd");
    assert.equal(definition.length, 1, "Each nutrient needs one semantic definition containing its value and reason.");
    const value = key === "weight" ? recommendation.portionGrams : recommendation.nutrition[key];
    assert.equal(primaryValue(definition[0]), expectedNutritionValue(value, key === "weight" ? "g" : nutrientUnits[key], locale));
    if (value === null && key !== "weight") {
      const missing = recommendation.unknowns.find((item) => item.nutrient === key);
      assert.ok(missing, "A missing value must have an actual calculation reason.");
      const sourceNotes = recommendation.ingredientAmounts
        .filter((ingredient) => missing.missingFoodIds.includes(ingredient.foodId))
        .flatMap((ingredient) => ingredient.food?.nutrientNotes[key]?.[locale] ?? []);
      for (const note of sourceNotes) assert.ok(content(definition[0]).includes(note), "Preserve the actual localized source reason instead of inventing a zero.");
      if (!sourceNotes.length) assert.ok(content(definition[0]).includes(missing.reason));
      assert.ok(elements(definition[0], (node) => node.type === "small" && hasClass(node, "nutrition-unknown-reason")).length > 0);
      if (key === "fiber") unknownFiberPanelsChecked += 1;
    }
  }
  assert.equal(recommendation.nutrition.addedSugar, null, "The pinned SR Legacy records do not supply added sugar.");
  const disclosures = elements(tree, (node) => node.type === "details");
  assert.equal(disclosures.length, 2);
  assert.ok(disclosures.every((node) => !node.props.open), "Full nutrition and source detail must start collapsed.");
  assert.deepEqual(
    disclosures.map((node) => content(elements(node, (child) => child.type === "summary")[0])),
    locale === "en" ? ["Full nutrition", "Standard recipe & sources"] : ["完整營養數值", "標準食譜與資料來源"],
  );
  const ingredients = elements(tree, (node) => hasClass(node, "nutrition-ingredients"))[0];
  const rows = elements(ingredients, (node) => node.type === "li");
  assert.equal(rows.length, recommendation.ingredientAmounts.length);
  recommendation.ingredientAmounts.forEach((ingredient, index) => {
    assert.ok(ingredient.food, "Every standard recipe must resolve an actual food record.");
    const row = rows[index];
    assert.ok(content(row).includes(ingredient.food.label[locale]));
    assert.equal(content(elements(row, (node) => hasClass(node, "nutrition-ingredient-weight"))[0]), expectedNutritionValue(ingredient.grams, "g", locale));
    const links = elements(row, (node) => hasClass(node, "nutrition-record-link"));
    assert.equal(links.length, 1);
    assert.equal(links[0].props.href, ingredient.food.recordUrl, "Link each ingredient to its exact official record, not a search or dataset homepage.");
    assert.equal(links[0].props.href, `https://fdc.nal.usda.gov/food-details/${ingredient.food.fdcId}/nutrients`);
    assert.ok(content(links[0]).includes(`USDA FDC ${ingredient.food.fdcId}`));
    exactIngredientLinksChecked += 1;
  });
  const heading = content(elements(tree, (node) => hasClass(node, "nutrition-recipe-heading"))[0]);
  assert.ok(heading.includes(recommendation.recipe.label[locale]));
  const portions = locale === "en" ? { small: "Smaller portion", regular: "Standard portion", large: "Larger portion" } : { small: "較小份", regular: "標準份", large: "較大份" };
  assert.ok(heading.includes(portions[recommendation.portion]));
  assert.ok(content(elements(tree, (node) => hasClass(node, "nutrition-recipe-version"))[0]).includes(recommendation.recipe.version));
  assert.equal(content(elements(tree, (node) => hasClass(node, "nutrition-recipe-notes"))[0]), recommendation.recipe.notes[locale]);
  const sourceList = elements(tree, (node) => hasClass(node, "nutrition-source-list"))[0];
  for (const source of nutritionSources.filter((item) => recommendation.sourceIds.includes(item.id))) {
    assert.ok(elements(sourceList, (node) => node.type === "a" && node.props.href === source.url).length > 0);
    for (const value of [source.provider, source.dataset, source.release, source.recordPublicationDate, source.retrievedAt]) assert.ok(content(sourceList).includes(value));
  }
  assert.ok(content(tree).includes(locale === "en" ? "not a measured meal you ate" : "並非你實際吃下餐點的測量結果"));
  assert.equal(elements(tree, (node) => ["svg", "canvas", "meter", "progress"].includes(node.type) || node.props?.style || /(?:^|[ -])(bar|track|chart)(?:$|[ -])/.test(node.props?.className ?? "")).length, 0, "Nutrition facts must be plain numeric definitions without chart geometry.");
  assert.equal(JSON.stringify(recommendation), before, "Rendering cannot modify the recommendation or its source data.");
  assert.ok(!html.includes("NaN") && !html.includes("Infinity"));
  nutritionPanelsChecked += 1;
  return tree;
}

const originalNutritionData = JSON.stringify({ sourceFoods, standardizedRecipes });
for (const locale of ["en", "zh"]) {
  const actual = recommendPilotMeals(state.profile, defaultMealContext, locale, now);
  assert.ok(actual.recommendations.length > 0, "Render recommendations selected by the actual pilot kernel.");
  actual.recommendations.forEach((recommendation) => verifyNutritionPanel(recommendation, locale));
  for (const recipe of standardizedRecipes) {
    const meal = recommendationDataset.find((item) => item.id === recipe.mealId);
    assert.ok(meal);
    for (const portion of ["small", "regular", "large"]) {
      verifyNutritionPanel({
        ...actual.recommendations[0],
        meal, recipe, portion,
        ...calculateRecipe(recipe, portion, locale),
      }, locale);
    }
  }
  // Controlled copies of real records exercise display boundaries through the
  // real calculation API, rather than manually replacing its output values.
  const boundaryFoods = sourceFoods.map((food) => ({
    ...food,
    nutrientsPer100g: { ...food.nutrientsPer100g, protein: 0, fat: 0.001 },
  }));
  const base = actual.recommendations[0];
  const calculated = calculateRecipe(base.recipe, "regular", locale, boundaryFoods);
  assert.equal(calculated.nutrition.protein, 0);
  assert.ok(calculated.nutrition.fat > 0 && calculated.nutrition.fat < 0.1);
  const boundary = verifyNutritionPanel({ ...base, portion: "regular", ...calculated }, locale);
  const values = elements(boundary, (node) => hasClass(node, "nutrition-value"));
  const protein = values.find((node) => content(elements(node, (child) => child.type === "dt")[0]) === nutritionLabels[locale].protein);
  const fat = values.find((node) => content(elements(node, (child) => child.type === "dt")[0]) === nutritionLabels[locale].fat);
  assert.equal(primaryValue(elements(protein, (node) => node.type === "dd")[0]), "0 g", "A reported zero remains known zero.");
  assert.equal(primaryValue(elements(fat, (node) => node.type === "dd")[0]), "<0.1 g", "A small positive amount must not be displayed as zero.");
}
assert.ok(unknownFiberPanelsChecked >= 6, "Exercise the actual missing shrimp fiber value in all portions and both languages.");
assert.equal(JSON.stringify({ sourceFoods, standardizedRecipes }), originalNutritionData, "Calculations and rendering must preserve the pinned catalog.");

console.log(
  JSON.stringify(
    {
      languages: ["en", "zh"],
      chronologicalHistorySlotsPerLanguage: 28,
      exactSelectionCallbacks: callbacksChecked,
      namedOtherRecorded: true,
      metadataOnlyUnknown: true,
      historyUnchanged: true,
      actualRuleContributionRows: contributionRowsChecked,
      signedNumbersAndAllZeroState: true,
      noBarChartGeometry: true,
      localizedEngineNotesPreserved: true,
      perspectiveTotalsExcluded: true,
      actualPilotContributionRows: pilotContributionRowsChecked,
      pilotZeroPointReceipts: pilotZeroReceiptsChecked,
      pilotPositivePointReceipts: pilotPositiveReceiptsChecked,
      pilotDisplayedRowsSumToActualTotal: true,
      actualNutritionPanels: nutritionPanelsChecked,
      missingFiberPanels: unknownFiberPanelsChecked,
      exactOfficialIngredientLinks: exactIngredientLinksChecked,
      fourMainNutritionMetrics: true,
      collapsedNutritionSourcesAndVersion: true,
      missingValuesNotZero: true,
      knownZeroAndSmallPositiveDistinct: true,
    },
    null,
    2,
  ),
);

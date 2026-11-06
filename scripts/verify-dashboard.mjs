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
      fileName: absolutePath,
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  );
  const localRequire = (specifier) => {
    if (specifier === "react" || specifier === "react/jsx-runtime") return require(specifier);
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

const { HistoryGrid, RecipeOptionFacts, RecipeFitSummary, recipeMatchLabel } = loadSource(
  "src/DashboardInsights.tsx",
);
const { createBlankState, createEmptyMeal, mealNames, recommendationDataset } =
  loadSource("src/data.ts");
const { NutritionDetails } = loadSource("src/NutritionDetails.tsx");
const { RecipeDetails } = loadSource("src/RecipeDetails.tsx");
const { RecipeLibrary } = loadSource("src/RecipeLibrary.tsx");
const { RecommendationScore } = loadSource("src/RecommendationScore.tsx");
const { HistoryBasis } = loadSource("src/HistoryBasis.tsx");
const { buildHistoryVarietyContext } = loadSource("src/history-variety.ts");
const { recommendMealIdeas } = loadSource("src/logic.ts");
const { calculateRecipe, calculateScoreForRecipe, recommendPilotMeals, nutrientUnits } = loadSource("src/nutrition.ts");
const { getNpm2018Band } = loadSource("src/nutrient-profile.ts");
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
assert.equal(buildHistoryVarietyContext(state.days, now).scope.loggedMealCount, 2,
  "Recommendation history coverage must agree with the grid: generated context notes are not recorded meals.");

let historyBasisPanelsChecked = 0;
function verifyHistoryBasis(trace, locale) {
  const before = JSON.stringify(trace);
  const tree = HistoryBasis({ trace, locale });
  const html = renderToStaticMarkup(tree);
  assert.equal(tree.type, "details");
  assert.equal(tree.props.open, undefined, "History detail starts collapsed.");
  const summary = content(elements(tree, node => node.type === "summary")[0]);
  assert(summary.includes(locale === "en" ? "Recent records" : "近期紀錄"));
  assert(summary.includes(locale === "en" ? `${trace.scope.loggedDayCount} days, ${trace.scope.loggedMealCount} meal slots` : `${trace.scope.loggedDayCount} 天、${trace.scope.loggedMealCount} 餐`));
  assert.equal(elements(tree, node => node.type === "p").filter(node => content(node) === trace.reason).length, 1,
    "The actual decision reason is visible exactly once when expanded.");
  assert(content(tree).includes(`${trace.scope.windowStart} – ${trace.scope.windowEnd}`));
  assert(content(tree).includes(locale === "en" ? `${trace.scope.recognizedMealCount} recorded meal slots` : `${trace.scope.recognizedMealCount} 餐有可辨識`));
  assert(content(tree).includes(locale === "en" ? "Missing records remain unknown" : "沒有記錄的部分仍是未知"));
  const rows = elements(tree, node => node.type === "li");
  assert.equal(rows.length, trace.applied ? trace.evidence.length : 0, "Dated evidence is shown only when history really distinguished a tied option.");
  if (trace.applied) for (const [index, record] of trace.evidence.entries()) {
    assert(content(rows[index]).includes(record.date));
    assert(content(rows[index]).includes(locale === "en" ? record.mealName : { Breakfast: "早餐", Lunch: "午餐", Dinner: "晚餐", "Snacks / Drinks": "點心／飲料" }[record.mealName]));
    assert(elements(rows[index], node => node.type === "span")[1].props.children.length > 0, "Actual recognized food names accompany each dated meal.");
  }
  assert(!html.includes("NaN") && !html.includes("Infinity"));
  assert.equal(JSON.stringify(trace), before, "Rendering must not mutate the engine's trace.");
  historyBasisPanelsChecked++;
  return tree;
}

const historyProfile = { ...state.profile, preferenceTags: [], avoidTags: [], feelToday: "Normal", eatingStyle: "Both" };
const historyState = createBlankState(now);
const historyToday = historyState.days.find(day => day.isToday).todayLog;
historyState.days[5].todayLog.Lunch.carbs = ["Rice"];
const historyBlank = createBlankState(now).days;
for (const locale of ["en", "zh"]) {
  const unchanged = recommendPilotMeals(historyProfile, defaultMealContext, locale, now, historyToday, historyBlank);
  const ranked = recommendPilotMeals(historyProfile, defaultMealContext, locale, now, historyToday, historyState.days);
  const quinoa = ranked.eligibleRecipes.find(rec => rec.recipe.mealId === "tofu-kale-quinoa-bowl");
  const beans = ranked.eligibleRecipes.find(rec => rec.recipe.mealId === "bean-veggie-rice-bowl");
  assert.ok(quinoa && beans, "The original equal-total recipe pair remains inspectable in the expanded collection");
  assert.equal(quinoa.score.total, beans.score.total);
  assert.equal(quinoa.trace.variety.applied, true);
  assert(ranked.eligibleRecipes.indexOf(quinoa) < ranked.eligibleRecipes.indexOf(beans),
    "A prior rice record can distinguish equal totals even below the top three");
  assert.deepEqual(ranked.recommendations.map(rec => rec.score.total), unchanged.recommendations.map(rec => rec.score.total), "History UI cannot hide a lower-total reorder.");
  const before = JSON.stringify(ranked);
  for (const rec of new Set([...ranked.recommendations, quinoa])) {
    verifyHistoryBasis(rec.trace.variety, locale);
    const scoreTree = RecommendationScore({ rec, locale });
    const nested = elements(scoreTree, node => node.type === HistoryBasis);
    assert.equal(nested.length, 1, "Every scored recommendation includes one actual history trace.");
    assert.strictEqual(nested[0].props.trace, rec.trace.variety);
    const scoreHtml = renderToStaticMarkup(scoreTree);
    assert.equal((scoreHtml.match(/class="history-basis"/g) ?? []).length, 1);
    assert.equal(content(elements(scoreTree, node => hasClass(node, "recommendation-score-total"))[0]), String(rec.score.nutritionReference));
  }
  assert.equal(JSON.stringify(ranked), before, "Rendering keeps engine order, totals and evidence unchanged.");
  verifyHistoryBasis(unchanged.recommendations[0].trace.variety, locale);
  const noDecision = { ...ranked.recommendations[0].trace.variety, applied: false };
  assert.equal(elements(verifyHistoryBasis(noDecision, locale), node => node.type === "li").length, 0,
    "A retained evidence array must not leak into a trace marked as unused.");
  const ideaHistory = createBlankState(now);
  ideaHistory.days[5].todayLog.Lunch.protein = ["Egg"];
  const idea = recommendMealIdeas(historyProfile, historyToday, ideaHistory.days, locale, now, defaultMealContext)[0];
  assert(idea.decisionTrace.variety.applied);
  verifyHistoryBasis(idea.decisionTrace.variety, locale);
  assert.notEqual(idea.shortReason, idea.decisionTrace.variety.reason, "The compact idea lead must not repeat the whole history explanation.");
}

const nutritionLabels = {
  en: { kcal: "Energy", energyKj: "Energy (kJ)", protein: "Protein", fiber: "Fiber", weight: "Edible weight", carbs: "Carbohydrate", fat: "Total fat", saturatedFat: "Saturated fat", sodium: "Sodium", addedSugar: "Added sugar" },
  zh: { kcal: "熱量", energyKj: "能量（kJ）", protein: "蛋白質", fiber: "膳食纖維", weight: "可食重量", carbs: "碳水化合物", fat: "總脂肪", saturatedFat: "飽和脂肪", sodium: "鈉", addedSugar: "添加糖" },
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
let comparisonFactsChecked = 0;
const scoreNumber = (value, locale, signed = false, precision = 2) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return locale === "en" ? "Unavailable" : "無法計分";
  return `${value < 0 ? "−" : signed && value > 0 ? "+" : ""}${new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-TW", { maximumFractionDigits: precision }).format(Math.abs(value))}`;
};
let scorePanelsChecked = 0;
let missingScorePanelsChecked = 0;
function verifyScorePanel(rec, locale) {
  const before = JSON.stringify(rec);
  const tree = RecommendationScore({ rec, locale });
  const html = renderToStaticMarkup(tree);
  assert.equal(elements(tree, (node) => ["svg", "canvas", "meter", "progress"].includes(node.type) || node.props?.style || /(?:^|[ -])(bar|track|chart)(?:$|[ -])/.test(node.props?.className ?? "")).length, 0);
  assert.ok(!/\/\s*100\s*%|less.healthy|below.threshold/i.test(content(tree)), "The custom ranking total cannot be framed as a percentage or binary health verdict.");
  if (!rec.score) {
    assert.ok(content(tree).includes(locale === "en" ? "Unavailable" : "無法計分"));
    assert.equal(elements(tree, (node) => hasClass(node, "recommendation-score-total")).length, 0, "An incomplete model must not acquire a fabricated zero total.");
    missingScorePanelsChecked += 1;
    return tree;
  }
  const { model } = rec.score;
  assert.equal(model.status, "complete");
  assert.equal(content(elements(tree, (node) => hasClass(node, "recommendation-score-total"))[0]), scoreNumber(rec.score.nutritionReference, locale));
  for (const key of ["nutrient", "energy", "preference"]) assert.equal(content(elements(tree, (node) => hasClass(node, `score-${key}`))[0]), scoreNumber(rec.score[key], locale, true));
  assert.equal(tree.type, "details", "The entire scoring receipt is one native disclosure");
  assert.ok(!tree.props.open, "All scoring starts collapsed");
  assert.equal(rec.score.nutritionReference, rec.score.nutrient + rec.score.energy);
  assert.equal(rec.score.nutritionReference, 10 - model.rawScore);
  assert(content(tree).includes(rec.trace.rankingPolicy.version));
  assert.equal(elements(tree, node => hasClass(node, "score-ranking-order"))[0].props.children.length, rec.trace.rankingPolicy.order.length);
  for (const scope of ["current", "saved"]) {
    const fit = rec.score[`${scope}Preference`];
    const summary = content(elements(tree, node => hasClass(node, `score-${scope}-fit`))[0]);
    assert(summary.includes(fit.selected ? `${fit.points}/${fit.possible}` : scope === "saved" ? locale === "en" ? "No active saved preference groups" : "目前沒有參與排序的已存偏好" : locale === "en" ? "No current-meal preferences selected" : "未選擇本餐偏好"));
    assert(!summary.includes("0/0"));
  }
  const disclosures = elements(tree, (node) => node.type === "details");
  assert.equal(disclosures.length, 2, "Keep one main calculation disclosure and a separate nested source disclosure.");
  assert.ok(disclosures.every((node) => !node.props.open));
  const sourceDetails = elements(disclosures[0], (node) => node.type === "details" && hasClass(node, "score-source-details"));
  assert.equal(sourceDetails.length, 1);
  assert.equal(content(elements(sourceDetails[0], (node) => node.type === "summary")[0]), locale === "en" ? "Sources & input derivations" : "來源與輸入值推導");
  const rows = elements(tree, (node) => hasClass(node, "score-model-row"));
  assert.equal(rows.length, 7);
  const pointValues = { energyKj: model.points.a.energy, saturatedFat: model.points.a.saturatedFat, freeSugars: model.points.a.freeSugars, salt: model.points.a.salt, protein: model.points.c.protein, fiber: model.points.c.fiber, fvnsPercent: model.points.c.fvns };
  for (const row of rows) {
    const key = row.props["data-component"];
    const unit = key === "energyKj" ? "kJ" : key === "fvnsPercent" ? "%" : "g";
    assert.equal(content(elements(row, (node) => hasClass(node, "score-model-input"))[0]), `≈ ${scoreNumber(model.inputs[key], locale)} ${unit}`, "Display inputs approximately to two decimal places without changing calculation inputs.");
    assert.equal(content(elements(row, (node) => hasClass(node, "contribution-points"))[0]), scoreNumber(pointValues[key], locale));
    const band = getNpm2018Band(key, model.inputs[key]);
    const lower = scoreNumber(band.lowerExclusive, locale), upper = scoreNumber(band.upperInclusive, locale);
    const expectedBand = band.lowerExclusive === null ? `≤ ${upper} ${unit}` : band.upperInclusive === null ? `> ${lower} ${unit}` : `> ${lower} – ≤ ${upper} ${unit}`;
    assert.equal(content(elements(row, (node) => hasClass(node, "score-model-band"))[0]), expectedBand, "Show the actual strict/inclusive official threshold band.");
  }
  assert.ok(content(elements(tree, (node) => hasClass(node, "score-rounding-note"))[0]).includes(locale === "en" ? "bands use unrounded calculations" : "門檻以未取整計算值判定"));
  const preferenceRows = elements(tree, (node) => hasClass(node, "score-preference-row"));
  assert.equal(preferenceRows.length, rec.score.preferenceRows.length);
  assert.deepEqual(preferenceRows.map((row) => content(elements(row, (node) => hasClass(node, "preference-row-label"))[0])), rec.score.preferenceRows.map((row) => row.label));
  assert.deepEqual(preferenceRows.map((row) => content(elements(row, (node) => hasClass(node, "contribution-note"))[0])), rec.score.preferenceRows.map((row) => row.note));
  assert.deepEqual(preferenceRows.map((row) => content(elements(row, (node) => hasClass(node, "contribution-points"))[0])), rec.score.preferenceRows.map((row) => scoreNumber(row.points, locale, true)));
  const raw = content(elements(tree, (node) => hasClass(node, "score-official-raw"))[0]);
  assert.ok(raw.includes(locale === "en" ? "lower is better" : "較低較佳"));
  assert.ok(raw.endsWith(scoreNumber(model.rawScore, locale)));
  const gate = content(elements(tree, (node) => hasClass(node, "score-protein-gate"))[0]);
  assert.ok(gate.includes(scoreNumber(model.creditedProteinPoints, locale)));
  assert.ok(gate.includes(scoreNumber(model.cTotal, locale)));
  const formula = content(elements(tree, (node) => hasClass(node, "score-formula"))[0]);
  assert.ok(formula.includes(locale === "en" ? "10 − energy A" : "10－能量 A 分"), "The arbitrary display offset must remain explicit.");
  const reasons = elements(tree, (node) => hasClass(node, "score-selection-reasons"))[0];
  const displayedReasons = elements(reasons, (node) => node.type === "li").map(content);
  assert.equal(new Set(displayedReasons).size, displayedReasons.length);
  assert.ok(!displayedReasons.includes(rec.score.basis.note), "Model provenance appears only in its source disclosure.");
  for (const row of rec.score.preferenceRows) assert.ok(!displayedReasons.includes(row.note), "Do not repeat explanations already shown in the preference table.");
  if (rec.trace.selectionMethod) assert.ok(!displayedReasons.includes(rec.trace.variety.reason), "The method already explains exact-tie variety.");
  for (const reason of rec.reasons.slice(1).filter((reason) => reason !== rec.score.basis.note && !rec.score.preferenceRows.some((row) => row.note === reason) && (!rec.trace.selectionMethod || reason !== rec.trace.variety.reason))) assert.ok(displayedReasons.includes(reason), "Keep unique dynamic constraints and portion context.");
  assert.equal(content(elements(tree, (node) => hasClass(node, "score-selection-method"))[0]), rec.trace.selectionMethod);
  const expectedSourceUrls = [...new Set([model.sourceUrl, ...rec.score.basis.sourceUrls, ...rec.score.inputBasis.flatMap((input) => input.sourceUrls)])];
  const sourceLinks = elements(sourceDetails[0], (node) => node.type === "a");
  assert.equal(sourceLinks.length, expectedSourceUrls.length);
  assert.equal(new Set(sourceLinks.map((node) => node.props.href)).size, sourceLinks.length, "List each exact source URL once.");
  for (const url of expectedSourceUrls) assert.equal(sourceLinks.filter((node) => node.props.href === url).length, 1);
  assert.ok(sourceLinks.every((node) => !/reference\s*\d|依據\s*\d/.test(content(node))), "Use descriptive source titles instead of numbered generic references.");
  assert.ok(sourceLinks.some((node) => content(node).includes(locale === "en" ? "technical guidance" : "技術指引")));
  assert.ok(content(tree).includes(rec.score.basis.note));
  const inputBasis = elements(tree, (node) => hasClass(node, "score-input-basis"))[0];
  assert.ok(content(sourceDetails[0]).includes(locale === "en" ? "unknown USDA added-sugar field" : "未知的 USDA 添加糖欄位"));
  assert.ok(content(sourceDetails[0]).includes(locale === "en" ? "dataset level" : "資料集"));
  assert.ok(content(sourceDetails[0]).includes("2.5"));
  assert.equal(content(tree).split(rec.score.basis.note).length - 1, 1, "Show the model summary exactly once.");
  assert.equal(elements(inputBasis, (node) => hasClass(node, "score-input-note")).length, new Set(rec.score.inputBasis.map((input) => input.note)).size, "Repeat identical ingredient assumptions once while retaining every food label.");
  for (const input of rec.score.inputBasis) {
    assert.ok(content(inputBasis).includes(input.label));
    assert.ok(content(inputBasis).includes(input.note));
  }
  assert.equal(elements(inputBasis, (node) => node.type === "a").length, 0, "Ingredient groups must not repeat the central source list.");
  assert.ok(!html.includes("NaN") && !html.includes("Infinity"));
  assert.equal(JSON.stringify(rec), before);
  scorePanelsChecked += 1;
  return tree;
}
function verifyRecipeOptionFacts(rec, locale) {
  const before = JSON.stringify(rec);
  const tree = RecipeOptionFacts({ rec, locale });
  const html = renderToStaticMarkup(tree);
  assert.equal(tree.type, "span");
  assert.ok(hasClass(tree, "recipe-option-facts"));
  assert.equal(elements(tree, (node) => typeof node.type === "string" && node.type !== "span").length, 0, "Facts must remain phrasing content for the enclosing option button.");
  assert.equal(content(elements(tree, node => hasClass(node, "recipe-option-match"))[0]), recipeMatchLabel(rec, locale));
  assert.deepEqual(elements(tree, node => hasClass(node, "recipe-option-reason")).map(content), (rec.score && rec.score.currentPreference.selected + rec.score.savedPreference.selected > 0 ? rec.matchReasons.slice(0, 2) : rec.matchReasons.slice(1, 3)), "Alternative cards use actual fit facts without presenting the old sum as rank");
  assert(!content(tree).includes(locale === "en" ? "Ranking total" : "排序總分"));
  if (rec.score) {
    const summary = RecipeFitSummary({ rec, locale });
    assert.equal(elements(summary, node => hasClass(node, "recipe-match-count")).length, rec.score.currentPreference.selected + rec.score.savedPreference.selected > 0 ? 1 : 0, "Do not repeat the no-preference explanation in a separate count line");
    assert.deepEqual(elements(elements(summary, node => hasClass(node, "recipe-fit-reasons"))[0], node => node.type === "li").map(content), rec.matchReasons.slice(0, 3));
    for (const reason of rec.mismatchReasons) assert(content(summary).includes(reason));
  }
  assert.ok(!/health score|健康分數|\/\s*100\s*%/i.test(content(tree)), "The product ranking total cannot become a health-score percentage.");
  assert.equal(elements(tree, (node) => ["svg", "canvas", "meter", "progress"].includes(node.type) || node.props?.style || /(?:^|[ -])(bar|track|chart)(?:$|[ -])/.test(node.props?.className ?? "")).length, 0);
  assert.ok(!html.includes("NaN") && !html.includes("Infinity"));
  assert.equal(JSON.stringify(rec), before);
  comparisonFactsChecked += 1;
  return tree;
}
let nutritionPanelsChecked = 0;
let unknownFiberPanelsChecked = 0;
let exactIngredientLinksChecked = 0;
let preparationNotesChecked = 0;
function verifyNutritionPanel(recommendation, locale) {
  verifyRecipeOptionFacts(recommendation, locale);
  verifyScorePanel(recommendation, locale);
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
    locale === "en" ? ["More nutrient estimates", "Standard recipe & sources"] : ["更多營養估算", "標準食譜與資料來源"],
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
    const preparationNotes = elements(row, (node) => hasClass(node, "nutrition-preparation-note"));
    assert.equal(preparationNotes.length, ingredient.processing === "pureed" ? 1 : 0,
      "Only the recipe's explicitly pureed ingredient receives a preparation-specific model note.");
    if (ingredient.processing === "pureed") {
      const note = preparationNotes[0];
      const value = elements(note, (node) => hasClass(node, "nutrition-preparation-value"))[0];
      assert.equal(content(elements(value, (node) => node.type === "span")[0]),
        expectedNutritionValue(ingredient.preparationFreeSugarsGrams ?? null, "g", locale),
        "Render the engine's selected-portion free-sugar estimate, not the plain source's zero or a new UI calculation.");
      assert.ok(content(note).includes(ingredient.preparationModelBasis.note[locale]));
      assert.deepEqual(elements(note, (node) => hasClass(node, "nutrition-preparation-link")).map(link => link.props.href),
        ingredient.preparationModelBasis.sourceUrls, "Expose the actual preparation-specific model references.");
      preparationNotesChecked += 1;
    }
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
  assert.deepEqual(actual.recommendations.map((rec) => rec.meal.id), actual.trace.candidateScores.slice(0, 3).map((candidate) => candidate.mealId), "The rendered choices must follow the actual total-ranked candidates.");
  assert.ok(actual.trace.candidateScores.every((candidate, index, candidates) => {
    if (!index) return true;
    const a = candidates[index - 1].score, b = candidate.score;
    return a.currentPreference.points > b.currentPreference.points || a.currentPreference.points === b.currentPreference.points && (a.savedPreference.points > b.savedPreference.points || a.savedPreference.points === b.savedPreference.points && a.nutritionReference >= b.nutritionReference);
  }), "Rendered choices preserve current, saved, then nutrition priority");
  assert.ok(actual.recommendations.every((rec) => rec.score.preference === 0), "Unselected preferences do not receive invented bonus points.");
  for (const appetite of ["small", "regular", "large"]) {
    const portionResult = recommendPilotMeals(state.profile, { ...defaultMealContext, appetite }, locale, now);
    assert.deepEqual(portionResult.trace.candidateScores, actual.trace.candidateScores, "Uniform portion scaling must not change per-100 g model inputs, component scores, or ranking.");
    assert.deepEqual(portionResult.recommendations.map((rec) => rec.meal.id), actual.recommendations.map((rec) => rec.meal.id));
    const factor = portionResult.recommendations[0].recipe.portions[appetite];
    assert.ok(Math.abs(portionResult.recommendations[0].nutrition.kcal - actual.recommendations[0].nutrition.kcal * factor) < 0.001, "The whole-portion nutrient facts still scale even when the model score does not.");
  }
  actual.recommendations.forEach((recommendation) => verifyNutritionPanel(recommendation, locale));
  const libraryHtml = renderToStaticMarkup(require("react").createElement(RecipeLibrary, {
    result: actual, context: defaultMealContext, locale, plans: [], busy: false,
    onPortionChange() {}, onChoose: async () => true, onAdjustConditions() {},
  }));
  assert.equal((libraryHtml.match(/class="recipe-library-card"/g) ?? []).length, standardizedRecipes.length,
    "The recipe library must expose every recipe, including those outside the top three");
  assert.equal((libraryHtml.match(/aria-haspopup="dialog"/g) ?? []).length, standardizedRecipes.length,
    "Every recipe has an accessible details action");
  for (const option of actual.eligibleRecipes) {
    const fullDetails = renderToStaticMarkup(require("react").createElement(RecipeDetails, {
      recipe: option.recipe, portion: option.portion, calculation: option, recommendation: option, locale,
    }));
    assert.equal((fullDetails.match(/class="recommendation-score score-receipt"/g) ?? []).length, 1);
    assert.equal((fullDetails.match(/class="nutrition-details"/g) ?? []).length, 1);
    assert(fullDetails.includes(locale === "en" ? "Make it happen" : "接下來怎麼準備"));
    const inspectOnly = renderToStaticMarkup(require("react").createElement(RecipeDetails, {
      recipe: option.recipe, portion: option.portion, calculation: option, locale,
    }));
    assert(!inspectOnly.includes('class="recommendation-score score-receipt"'),
      "Inspecting an excluded recipe must not fabricate eligibility or a ranking trace");
    assert(inspectOnly.includes('class="nutrition-details"'),
      "Ingredient weights and source estimates remain inspectable without eligibility");
  }
  for (const recipe of standardizedRecipes) {
    const meal = recommendationDataset.find((item) => item.id === recipe.mealId);
    assert.ok(meal);
    const score = calculateScoreForRecipe(recipe, state.profile, defaultMealContext, locale);
    assert.ok(score, "Every active source-complete recipe must have a real model result.");
    for (const portion of ["small", "regular", "large"]) {
      verifyNutritionPanel({
        ...actual.recommendations[0],
        meal, recipe, portion, score,
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
  const unselected = calculateScoreForRecipe(base.recipe, state.profile, defaultMealContext, locale);
  const unmatchedContext = { ...defaultMealContext, preferredStaple: base.recipe.staple === "noodles" ? "bread" : "noodles", cuisine: base.recipe.cuisine === "asian" ? "western" : "asian" };
  const unmatched = calculateScoreForRecipe(base.recipe, state.profile, unmatchedContext, locale);
  assert.ok(unselected && unmatched);
  assert.equal(unselected.preference, 0);
  assert.equal(unmatched.preference, 0);
  const unselectedTree = verifyScorePanel({ ...base, score: unselected }, locale);
  const unmatchedTree = verifyScorePanel({ ...base, score: unmatched }, locale);
  const unselectedNotes = content(elements(unselectedTree, (node) => hasClass(node, "score-preference-receipt"))[0]);
  const unmatchedNotes = content(elements(unmatchedTree, (node) => hasClass(node, "score-preference-receipt"))[0]);
  assert.ok(unselectedNotes.includes(locale === "en" ? "No staple preference selected" : "尚未選擇主食偏好"));
  assert.ok(unmatchedNotes.includes(locale === "en" ? "Selected staple does not match" : "已選主食未符合"));
  assert.ok(!unmatchedNotes.includes(locale === "en" ? "No staple preference selected" : "尚未選擇主食偏好"), "A selected but unmatched preference must not be mislabeled as unset.");
  const missingRecordCalculation = calculateRecipe(base.recipe, base.portion, locale, []);
  assert.equal(missingRecordCalculation.nutrition.kcal, null);
  assert.equal(missingRecordCalculation.nutrition.protein, null);
  assert.equal(calculateScoreForRecipe(base.recipe, state.profile, defaultMealContext, locale, []), null);
  verifyRecipeOptionFacts({ ...base, score: null, ...missingRecordCalculation }, locale);
  verifyScorePanel({ ...base, score: null, ...missingRecordCalculation }, locale);
  const calculated = calculateRecipe(base.recipe, "regular", locale, boundaryFoods);
  assert.equal(calculated.nutrition.protein, 0);
  assert.ok(calculated.nutrition.fat > 0 && calculated.nutrition.fat < 0.1);
  const boundary = verifyNutritionPanel({ ...base, portion: "regular", score: calculateScoreForRecipe(base.recipe, state.profile, defaultMealContext, locale, boundaryFoods), ...calculated }, locale);
  const values = elements(boundary, (node) => hasClass(node, "nutrition-value"));
  const protein = values.find((node) => content(elements(node, (child) => child.type === "dt")[0]) === nutritionLabels[locale].protein);
  const fat = values.find((node) => content(elements(node, (child) => child.type === "dt")[0]) === nutritionLabels[locale].fat);
  assert.equal(primaryValue(elements(protein, (node) => node.type === "dd")[0]), "0 g", "A reported zero remains known zero.");
  assert.equal(primaryValue(elements(fat, (node) => node.type === "dd")[0]), "<0.1 g", "A small positive amount must not be displayed as zero.");
  const missingFiberFoods = sourceFoods.map((food) => ({ ...food, nutrientsPer100g: { ...food.nutrientsPer100g, fiber: null } }));
  assert.equal(calculateScoreForRecipe(base.recipe, state.profile, defaultMealContext, locale, missingFiberFoods), null);
  for (const portion of ["small", "regular", "large"]) verifyNutritionPanel({
    ...base, portion, score: null, ...calculateRecipe(base.recipe, portion, locale, missingFiberFoods),
  }, locale);
  const gateFoods = sourceFoods.map((food) => ({ ...food,
    nutrientsPer100g: { ...food.nutrientsPer100g, energyKj: 2000, saturatedFat: 5, protein: 10, fiber: 2, sodium: 0 },
    modelBasis: { ...food.modelBasis, freeSugarsPer100g: 0, fvnsEligible: false, fiberMethod: "AOAC-compatible" },
  }));
  const gated = calculateScoreForRecipe(base.recipe, state.profile, defaultMealContext, locale, gateFoods);
  assert.ok(gated);
  assert.equal(gated.model.aTotal, 11);
  assert.equal(gated.model.proteinCredited, false);
  assert.equal(gated.model.creditedProteinPoints, 0);
  const gateTree = verifyScorePanel({ ...base, score: gated }, locale);
  assert.ok(content(elements(gateTree, (node) => hasClass(node, "score-protein-gate"))[0]).includes(locale === "en" ? "protein points not credited" : "蛋白質分數不計入"));
  const restored = calculateScoreForRecipe(base.recipe, state.profile, defaultMealContext, locale, gateFoods.map((food) => ({ ...food, modelBasis: { ...food.modelBasis, fvnsEligible: true } })));
  assert.ok(restored);
  assert.equal(restored.model.proteinCredited, true);
  assert.ok(restored.model.creditedProteinPoints > 0);
  verifyScorePanel({ ...base, score: restored }, locale);
}
assert.ok(unknownFiberPanelsChecked >= 6, "A missing required fiber value must remain unknown in every portion and both languages.");
assert.equal(JSON.stringify({ sourceFoods, standardizedRecipes }), originalNutritionData, "Calculations and rendering must preserve the pinned catalog.");

console.log(
  JSON.stringify(
    {
      languages: ["en", "zh"],
      chronologicalHistorySlotsPerLanguage: 28,
      exactSelectionCallbacks: callbacksChecked,
      namedOtherRecorded: true,
      metadataOnlyUnknown: true,
      actualHistoryBasisPanels: historyBasisPanelsChecked,
      historyEvidenceConditionalAndCollapsed: true,
      historyScopeMatchesRecordedGrid: true,
      historyUnchanged: true,
      noBarChartGeometry: true,
      actualRecipeComparisons: comparisonFactsChecked,
      actualScorePanels: scorePanelsChecked,
      missingScorePanels: missingScorePanelsChecked,
      nutritionComponentsSeparateFromPreferencePriority: true,
      officialRawModelAndCustomTotalSeparated: true,
      officialThresholdBandsAndProteinGateVisible: true,
      preferencePriorityControlsTopThree: true,
      per100gScoreStableWhilePortionFactsScale: true,
      unsetAndUnmatchedZeroPreferencesDistinct: true,
      modelInputDerivationsInspectable: true,
      estimatedAssemblyWithPreparedIngredients: true,
      actualNutritionPanels: nutritionPanelsChecked,
      missingFiberPanels: unknownFiberPanelsChecked,
      exactOfficialIngredientLinks: exactIngredientLinksChecked,
      preparationSpecificIngredientNotes: preparationNotesChecked,
      fourMainNutritionMetrics: true,
      collapsedNutritionSourcesAndVersion: true,
      missingValuesNotZero: true,
      knownZeroAndSmallPositiveDistinct: true,
    },
    null,
    2,
  ),
);

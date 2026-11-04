import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Transpile the real pure modules in memory using the installed compiler.
// No network, fixtures generated from the implementation, or dependencies.
const root = fileURLToPath(new URL("../", import.meta.url));
const modules = new Map();
function loadSource(relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  if (modules.has(absolutePath)) return modules.get(absolutePath).exports;
  const module = { exports: {} };
  modules.set(absolutePath, module);
  const { outputText } = ts.transpileModule(fs.readFileSync(absolutePath, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  });
  const localRequire = specifier => {
    assert(specifier.startsWith("."), `Unexpected runtime dependency: ${specifier}`);
    return loadSource(`${path.resolve(path.dirname(absolutePath), specifier)}.ts`);
  };
  new Function("require", "module", "exports", outputText)(localRequire, module, module.exports);
  return module.exports;
}
const { calculateRecipe, recommendPilotMeals, getRecipeHardAvoidConflicts } = loadSource("src/nutrition.ts");
const { nutrientKeys, nutritionSources, sourceFoods, standardizedRecipes } = loadSource("src/nutrition-data.ts");
const { defaultMealContext } = loadSource("src/meal-context.ts");
const { createBlankState, seedProfile, recommendationDataset, avoidTags } = loadSource("src/data.ts");
const { getHardAvoidConflicts, getMealTimeWindow, summarizeTodayIntake } = loadSource("src/logic.ts");
const clone = value => JSON.parse(JSON.stringify(value));
const close = (actual, expected, label) => assert(Math.abs(actual - expected) < 0.00011, `${label}: ${actual} !== ${expected}`);
const now = new Date(2026, 10, 4, 12, 30);
const profile = changes => ({ ...clone(seedProfile), preferenceTags: [], avoidTags: [], sensitiveDrinkOptIns: [], ...changes });
const context = changes => ({ ...defaultMealContext, ...changes });
const recipe = id => {
  const found = standardizedRecipes.find(item => item.mealId === id);
  assert(found, `Missing standardized recipe ${id}`);
  return found;
};

assert.equal(standardizedRecipes.length, 12);
assert.equal(new Set(standardizedRecipes.map(item => item.mealId)).size, 12);
assert.equal(sourceFoods.length, 17);
const sourceNutrients = { kcal: 1008, protein: 1003, carbs: 1005, fat: 1004, saturatedFat: 1258, fiber: 1079, sodium: 1093, addedSugar: 1235 };
let sourceValues = 0;
for (const source of nutritionSources) {
  const snapshot = fs.readFileSync(path.resolve(root, source.snapshotPath));
  assert.equal(createHash("sha256").update(snapshot).digest("hex"), source.snapshotSha256, "Pinned USDA bytes changed");
  const rawFoods = JSON.parse(snapshot.toString("utf8"));
  for (const food of sourceFoods.filter(item => item.sourceId === source.id)) {
    const raw = rawFoods.find(item => item.fdcId === food.fdcId);
    assert(raw, `Missing archived source ${food.fdcId}`);
    assert.equal(food.description, raw.description, "Identity/preparation must match source");
    for (const key of nutrientKeys) {
      const rawNutrient = raw.foodNutrients.find(item => item.nutrient.id === sourceNutrients[key]);
      assert.equal(food.nutrientsPer100g[key], rawNutrient?.amount ?? null, `${food.id}/${key} must match the archived value or remain null`);
      sourceValues++;
    }
  }
}

for (const item of standardizedRecipes) {
  assert(recommendationDataset.some(meal => meal.id === item.mealId));
  assert.deepEqual(item.portions, { small: .75, regular: 1, large: 1.25 });
  assert(item.version && item.basis === "standardized-recipe" && item.confidence === "recipe-estimate");
  assert.equal(item.yieldMethod, "sum-final-ingredient-weights");
  assert.equal(item.prepBasis, "assembly-from-prepared-ingredients");
  const regular = calculateRecipe(item, "regular");
  assert(regular.portionGrams > 0);
  for (const amount of regular.ingredientAmounts) {
    assert(amount.food && amount.grams >= 0);
    assert(nutritionSources.some(source => source.id === amount.sourceId));
    assert.equal(amount.food.state, item.ingredients.find(ingredient => ingredient.foodId === amount.foodId).weighedState);
  }
  for (const portion of ["small", "large"]) {
    const calculated = calculateRecipe(item, portion);
    close(calculated.portionGrams, regular.portionGrams * item.portions[portion], `${item.mealId}/${portion} grams`);
    for (const key of nutrientKeys) {
      if (regular.nutrition[key] === null) assert.equal(calculated.nutrition[key], null);
      else close(calculated.nutrition[key], regular.nutrition[key] * item.portions[portion], `${item.mealId}/${portion}/${key}`);
    }
  }
}
// Independent golden arithmetic from the archived source records, including
// five grams of retained oil and half a gram of salt, not an engine snapshot.
const chicken = calculateRecipe(recipe("chicken-broccoli-rice-bowl"), "regular");
assert.equal(chicken.portionGrams, 425.5);
for (const [key, expected] of Object.entries({ kcal: 489.7, protein: 44.829, carbs: 53.025, fat: 10.319, saturatedFat: 2.1364, fiber: 5.55, sodium: 345.69 })) close(chicken.nutrition[key], expected, `Independent chicken recipe ${key}`);
assert.equal(chicken.nutrition.addedSugar, null);
assert.equal(calculateRecipe(recipe("congee-egg-side-veg"), "regular").portionGrams, 560.5, "Congee retains the explicitly weighed water; no raw-rice yield assumption");
const shrimp = calculateRecipe(recipe("shrimp-quinoa-bowl"), "regular", "zh");
assert.equal(shrimp.nutrition.fiber, null, "Missing shrimp fiber propagates to recipe fiber");
assert(shrimp.unknowns.some(item => item.nutrient === "fiber" && item.missingFoodIds.includes("usda-175180") && item.reason.includes("未知，並非零")));
const missingFood = calculateRecipe(recipe("chicken-broccoli-rice-bowl"), "regular", "en", sourceFoods.filter(food => food.id !== "usda-171477"));
assert(nutrientKeys.every(key => missingFood.nutrition[key] === null));
assert(missingFood.ingredientAmounts.some(item => item.foodId === "usda-171477" && item.food === null));
const stateMismatch = clone(recipe("chicken-broccoli-rice-bowl"));
stateMismatch.ingredients[0].weighedState = "raw";
assert(nutrientKeys.every(key => calculateRecipe(stateMismatch, "regular").nutrition[key] === null), "Raw/cooked mismatch cannot silently use source values");
const invalidGrams = clone(recipe("chicken-broccoli-rice-bowl"));
invalidGrams.ingredients[0].grams = -1;
assert.equal(calculateRecipe(invalidGrams, "regular").portionGrams, null);
const limited = { ...recipe("chicken-broccoli-rice-bowl"), confidence: "limited" };
assert.deepEqual(calculateRecipe(limited, "regular").nutrition, chicken.nutrition, "Confidence does not shrink physical amounts or nutrient values");

const normal = recommendPilotMeals(profile(), context(), "en", now);
assert.equal(normal.candidateCount + normal.excludedCount, 12);
assert.equal(normal.recommendations.length, 3);
assert.deepEqual(normal, recommendPilotMeals(profile(), context(), "en", now), "Same inputs produce identical output");
const receiptCases = [
  [profile(), context(), "en"],
  [profile(), context({ preferredStaple: "rice", cuisine: "asian" }), "en"],
  [profile({ preferenceTags: ["Chinese-style", "Bowl meals", "Rice-based meals"] }), context({ cuisine: "western" }), "en"],
  [profile({ feelToday: "Need something light" }), context({ appetite: "large" }), "en"],
  [profile({ feelToday: "Low energy" }), context(), "en"],
  [profile({ feelToday: "Low energy", preferenceTags: ["Light meals"] }), context(), "en"],
  [profile({ preferenceTags: ["High-protein", "Vegetable-forward"] }), context(), "en"],
  [profile(), context({ preferredStaple: "rice", cuisine: "asian" }), "zh"],
];
for (const [selectedProfile, selectedContext, locale] of receiptCases) {
  for (const item of recommendPilotMeals(selectedProfile, selectedContext, locale, now).recommendations) {
    const rows = item.trace.pointBreakdown;
    assert.deepEqual(rows.map(row => row.key), ["staple", "cuisine", "saved-styles", "light-preparation", "short-assembly"]);
    assert.equal(rows.reduce((sum, row) => sum + row.points, 0), item.trace.practicalFit, "Visible additive receipt must equal the actual practical total");
    const row = key => rows.find(value => value.key === key);
    assert.equal(row("staple").points, selectedContext.preferredStaple !== "any" && selectedContext.preferredStaple === item.recipe.staple ? 2 : 0);
    assert.equal(row("cuisine").points, selectedContext.cuisine !== "any" && selectedContext.cuisine === item.recipe.cuisine ? 1 : 0);
    assert(row("saved-styles").points >= 0 && row("saved-styles").points <= 2);
    assert.equal(row("light-preparation").points, (selectedProfile.feelToday === "Need something light" || selectedProfile.preferenceTags.includes("Light meals")) && item.recipe.seasoning.oilGrams * item.recipe.portions[item.portion] <= 5 && item.recipe.prepMinutes <= 15 ? 1 : 0);
    assert.equal(row("short-assembly").points, selectedProfile.feelToday === "Low energy" && item.recipe.prepMinutes <= 10 ? 1 : 0);
    assert(rows.every(value => value.label && value.note && Number.isFinite(value.points)));
    if (locale === "zh") {
      assert.equal(row("staple").label, "偏好主食");
      assert(row("staple").note.includes("加 2 分"));
    }
  }
}
assert(normal.recommendations.every(item => item.trace.pointBreakdown.length === 5 && item.trace.pointBreakdown.every(row => row.points === 0)), "All-zero practical receipts retain every row");
const lightWithLessEffort = recommendPilotMeals(profile({ feelToday: "Low energy", preferenceTags: ["Light meals"] }), context(), "en", now);
assert(lightWithLessEffort.recommendations.length === 3 && lightWithLessEffort.recommendations.every(item => item.recipe.prepMinutes <= 10), "Saved light-meal preference must not suppress the current less-effort preference");
assert(lightWithLessEffort.recommendations.every(item => item.trace.pointBreakdown.find(row => row.key === "light-preparation").points === 1 && item.trace.pointBreakdown.find(row => row.key === "short-assembly").points === 1 && item.trace.practicalFit === 2), "Independent light and short-assembly contributions must coexist and sum correctly");
for (const hunger of ["not-hungry", "moderate", "hungry", "unspecified"]) {
  const expected = hunger === "not-hungry" ? "small" : hunger === "hungry" ? "large" : "regular";
  assert(recommendPilotMeals(profile(), context({ hunger }), "en", now).recommendations.every(item => item.portion === expected));
}
assert(recommendPilotMeals(profile(), context({ hunger: "hungry", appetite: "small" }), "en", now).recommendations.every(item => item.portion === "small" && item.trace.portionBasis === "explicit-appetite"));
for (const warmProfile of [profile(), profile({ feelToday: "Want something warm" })]) {
  const warm = recommendPilotMeals(warmProfile, context({ temperature: "warm" }), "en", now);
  assert(warm.recommendations.length && warm.recommendations.every(item => item.recipe.temperature === "warm"));
  assert(warm.trace.exclusions.some(item => item.mealId === "tofu-egg-protein-bowl" && item.stage === "context"));
}
const quick = recommendPilotMeals(profile(), context({ maxPrepMinutes: 10 }), "en", now);
assert(quick.recommendations.length && quick.recommendations.every(item => item.recipe.prepMinutes <= 10));
assert.equal(recommendPilotMeals(profile(), context({ maxPrepMinutes: 0 }), "en", now).recommendations.length, 0, "No fallback may relax a strict preparation limit");
const unsupportedPreference = recommendPilotMeals(profile(), context({ preferredStaple: "noodles", cuisine: "asian" }), "en", now);
assert.equal(unsupportedPreference.candidateCount, 12, "Soft staple/cuisine preferences do not exclude unmatched recipes");
assert(unsupportedPreference.recommendations.every(item => item.trace.unmatchedPreferences.includes("staple") && item.reasons.some(reason => reason.includes("preference is flexible"))));

// Actual reported source-state counterexamples plus all ingredient avoids.
const coldAvoid = recommendPilotMeals(profile({ avoidTags: ["Cold food"] }), context({ preferredStaple: "none", cuisine: "asian" }), "en", now);
assert(!coldAvoid.trace.eligibleRecipeIds.includes("tofu-egg-protein-bowl"));
assert(coldAvoid.recommendations.every(item => item.recipe.temperature === "warm"));
const rawAvoid = recommendPilotMeals(profile({ avoidTags: ["Raw food"] }), context({ preferredStaple: "rice", cuisine: "asian" }), "en", now);
assert(!rawAvoid.trace.eligibleRecipeIds.includes("egg-tomato-rice"));
assert(rawAvoid.recommendations.every(item => item.recipe.ingredients.every(ingredient => ingredient.weighedState !== "raw")));
for (const tag of avoidTags) {
  const selected = profile({ avoidTags: [tag] });
  const result = recommendPilotMeals(selected, context(), "en", now);
  for (const id of result.trace.eligibleRecipeIds) {
    const meal = recommendationDataset.find(item => item.id === id);
    assert.equal(getHardAvoidConflicts(selected, meal, getMealTimeWindow(now)).length, 0, `Eligible catalog candidate ${id} must obey ${tag}`);
    assert.equal(getRecipeHardAvoidConflicts(selected, recipe(id), "regular").length, 0, `Eligible recipe candidate ${id} must obey ${tag}`);
  }
  for (const item of result.recommendations) {
    assert.equal(getHardAvoidConflicts(selected, item.meal, getMealTimeWindow(now)).length, 0, `Catalog ${tag} exclusion must persist`);
    assert.equal(getRecipeHardAvoidConflicts(selected, item.recipe, item.portion).length, 0, `Recipe ${tag} exclusion must persist`);
  }
}
for (const [tag, id] of [["Soy", "tofu-egg-protein-bowl"], ["Soy", "salmon-edamame-bowl"], ["Egg", "congee-egg-side-veg"], ["Fishy seafood", "salmon-rice-bowl-veg"], ["Shellfish", "shrimp-quinoa-bowl"]]) assert(!recommendPilotMeals(profile({ avoidTags: [tag] }), context(), "en", now).trace.eligibleRecipeIds.includes(id), `${tag} must exclude the actual named recipe ingredient`);
assert.equal(recommendPilotMeals(profile({ avoidTags: ["Large portions"] }), context({ appetite: "large" }), "en", now).candidateCount, 0);

const byRecipeId = [...standardizedRecipes].map(item => item.mealId).sort();
assert.deepEqual(normal.trace.eligibleRecipeIds, byRecipeId, "No unrequested lower-calorie preference or random nutrition rotation");
const proteinDirection = recommendPilotMeals(profile({ preferenceTags: ["High-protein"] }), context(), "en", now);
assert(proteinDirection.recommendations[0].nutrition.protein >= proteinDirection.recommendations[1].nutrition.protein, "Explicit protein preference uses actual source-calculated grams");
const blank = createBlankState(now).days.find(day => day.isToday).todayLog;
const recorded = clone(blank);
recorded.Lunch.carbs = ["白飯"];
const recordResult = recommendPilotMeals(profile(), context(), "en", now, recorded);
assert.deepEqual(recordResult.trace.eligibleRecipeIds, normal.trace.eligibleRecipeIds, "Logged staple variety cannot rotate materially different nutrient vectors");
assert(recordResult.recommendations.filter(item => item.recipe.staple === "rice").every(item => item.trace.recentRecordsUsed.includes("staple:rice")));
const unknownOnly = clone(blank);
unknownOnly.Lunch.componentDetails = [{ name: "Unknown sandwich", group: "other", confidence: "limited", amount: { quantity: null, unit: "unspecified", qualifier: "unspecified", originalText: null } }];
const unknownResults = recommendPilotMeals(profile(), context(), "en", now, unknownOnly);
assert(unknownResults.recommendations.every(item => item.trace.recentRecordsUsed.length === 0 && item.reasons.some(reason => reason.includes("without inferring missing nutrients"))));
assert.deepEqual(unknownResults.recommendations.map(item => item.nutrition), normal.recommendations.map(item => item.nutrition), "Incomplete logs cannot change recipe nutrient totals");
const metric = clone(blank);
metric.Lunch.protein = ["Chicken"];
metric.Lunch.componentDetails = [{ name: "Chicken", group: "protein", confidence: "high", amount: { quantity: 1, unit: "g", qualifier: "exact", originalText: null } }];
const oneGram = summarizeTodayIntake(metric).proteinCount;
metric.Lunch.componentDetails[0].amount.quantity = 1000;
assert.equal(summarizeTodayIntake(metric).proteinCount, oneGram, "Unmapped grams must not impersonate legacy serving quantities");
const takeout = recommendPilotMeals(profile({ eatingStyle: "Mostly takeout" }), context(), "en", now);
assert(takeout.recommendations.every(item => item.trace.unmatchedPreferences.includes("takeout-portions-unconfirmed") && item.reasons.some(reason => reason.includes("Restaurant ingredients and portion weights are unconfirmed"))));
const zh = recommendPilotMeals(profile(), context({ hunger: "hungry", preferredStaple: "noodles" }), "zh", now, unknownOnly);
assert(zh.recommendations.every(item => item.reasons.some(reason => reason.includes("並非估算熱量需求")) && item.reasons.some(reason => reason.includes("此偏好保留彈性")) && item.unknowns.every(unknown => unknown.reason.includes("未知，並非零"))));

console.log(JSON.stringify({ standardizedRecipes: 12, sourceFoods: 17, pinnedSourceValues: sourceValues, independentChickenGolden: true, allPortionFactors: true, missingValuesPropagate: true, sourceStateAndIngredientSafety: true, hardAvoidContexts: avoidTags.length * 12, sharedContextConstraints: true, hungerAndAppetitePortions: true, practicalPointReceipts: true, noDefaultCalorieOrHealthScore: true, explicitNutrientDirection: true, recordVarietyCannotOverrideNutrients: true, metricPresenceOnlyInLegacy: true, bilingualReasons: true }, null, 2));

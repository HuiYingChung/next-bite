import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const modules = new Map();
function load(file) {
  const absolute = path.resolve(file);
  if (modules.has(absolute)) return modules.get(absolute).exports;
  const module = { exports: {} }; modules.set(absolute, module);
  const { outputText } = ts.transpileModule(fs.readFileSync(absolute, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } });
  new Function("require", "module", "exports", outputText)(name => load(path.resolve(path.dirname(absolute), name + ".ts")), module, module.exports);
  return module.exports;
}
const { recommendationDataset: current, legacyRecommendationDataset: legacy, seedProfile, createBlankState, avoidTags } = load("src/data.ts");
const { standardizedRecipes: recipes, sourceFoods } = load("src/nutrition-data.ts");
const { buildRecipeSafetyMetadata, getCatalogRecipe } = load("src/recipe-catalog.ts");
const { mealTitle, legacyMealTitle, getNamedMealComponents, getLegacyNamedMealComponents, getMealPresentation, getLegacyMealPresentation } = load("src/presentation.ts");
const { getHardAvoidConflicts, getMatchedPreferenceTags, getMealTimeWindow } = load("src/logic.ts");
const { calculateScoreForRecipe, recommendPilotMeals } = load("src/nutrition.ts");
const { defaultMealContext } = load("src/meal-context.ts");
const { normalizeState, createLocalDataExport } = load("src/launch-state.ts");
const byId = new Map(sourceFoods.map(food => [food.id, food]));
const now = new Date(2026, 10, 6, 12);
const profile = { ...seedProfile, preferenceTags: [], avoidTags: [], sensitiveDrinkOptIns: [], feelToday: "Normal" };

assert.equal(current.length, 108);
assert.equal(legacy.length, 112);
assert.deepEqual(current.map(meal => meal.id), recipes.map(recipe => recipe.mealId), "The sole current catalog is the actual recipe collection");
assert.equal(new Set(current.map(meal => meal.title)).size, current.length);
const retired = legacy.filter(meal => !current.some(item => item.id === meal.id));
assert.deepEqual(retired.map(meal => meal.id).sort(), ["ready-made-soup-dumplings-veg", "frozen-dumplings-bok-choy", "chicken-cabbage-dumpling-soup", "pork-chive-dumpling-soup-light"].sort());

let safetyChecks = 0;
for (const recipe of recipes) {
  const meal = current.find(item => item.id === recipe.mealId);
  assert.equal(meal.recipeVersion, recipe.version);
  assert.equal(getCatalogRecipe(meal), recipe);
  assert.equal(getCatalogRecipe({ ...meal, recipeVersion: "unavailable-version" }), undefined);
  assert.deepEqual(meal.worksFor, ["home-cooked"], "A measured assembly recipe cannot imply restaurant equivalence");
  const ingredients = recipe.ingredients.filter(item => item.grams > 0);
  const known = new Set(ingredients.flatMap(item => byId.get(item.foodId).avoidTags));
  if (ingredients.some(item => item.weighedState === "raw")) known.add("Raw food");
  if (recipe.temperature === "cool") known.add("Cold food");
  const unknown = new Set(ingredients.flatMap(item => byId.get(item.foodId).unknownAvoidTags ?? []).filter(tag => !known.has(tag)));
  if (recipe.temperature === "flexible" && !known.has("Cold food")) unknown.add("Cold food");
  assert.deepEqual([...meal.safety.contains].sort(), [...known].sort());
  assert.deepEqual([...meal.safety.unknown].sort(), [...unknown].sort());
  assert.deepEqual(meal.safety.mayContain, []);
  for (const tag of avoidTags.filter(tag => tag !== "Large portions")) {
    const conflicts = getHardAvoidConflicts({ ...profile, avoidTags: [tag] }, meal, getMealTimeWindow(now));
    assert.equal(conflicts.length > 0, known.has(tag) || unknown.has(tag), `${recipe.mealId}/${tag}: no inherited template conflict`);
    safetyChecks++;
  }
  for (const locale of ["en", "zh"]) {
    assert.equal(mealTitle(meal, locale), recipe.label[locale]);
    const display = getMealPresentation(meal, locale);
    assert.equal(display.title, recipe.label[locale]);
    assert.deepEqual(display.ingredients, ingredients.map(item => byId.get(item.foodId).label[locale]));
    assert(display.effort.includes(String(recipe.prepMinutes)));
  }
  assert.deepEqual(getNamedMealComponents(meal).map(item => [item.sourceFoodId, item.group]), ingredients.map(item => [item.foodId, item.group]));
}

// Regression: the stable historical ID is not a declaration of today's food.
for (const [id, tag] of [["soy-milk-oatmeal-egg-fruit", "Soy"], ["miso-fish-set-veg", "Soy"], ["tofu-mushroom-udon-soup", "Soy"], ["shrimp-fried-rice-light-veg", "Fried food"]]) {
  const legacyMeal = legacy.find(meal => meal.id === id);
  const actualMeal = current.find(meal => meal.id === id);
  assert(getHardAvoidConflicts({ ...profile, avoidTags: [tag] }, legacyMeal, "lunch").length > 0, "Old idea declaration stays available for an old saved idea");
  assert.equal(getHardAvoidConflicts({ ...profile, avoidTags: [tag] }, actualMeal, "lunch").length, 0);
  assert(recommendPilotMeals({ ...profile, avoidTags: [tag] }, defaultMealContext, "en", now).eligibleRecipes.some(item => item.recipe.mealId === id));
}
const plainRiceRecipe = recipes.find(recipe => recipe.mealId === "tofu-vegetable-rice-bowl");
const plainRiceMeal = current.find(meal => meal.id === plainRiceRecipe.mealId);
assert(getHardAvoidConflicts({ ...profile, avoidTags: ["Soy"] }, plainRiceMeal, "lunch").some(item => item.tag === "Soy"), "Actual edamame still requires soy exclusion even after the old tofu name is removed");
assert(!plainRiceMeal.title.toLowerCase().includes("tofu"));
assert(!getNamedMealComponents(plainRiceMeal).some(item => item.name.toLowerCase().includes("tofu")));
const noPreferences = calculateScoreForRecipe(plainRiceRecipe, profile, defaultMealContext);
const selectedCuisine = calculateScoreForRecipe(plainRiceRecipe, profile, { ...defaultMealContext, cuisine: plainRiceRecipe.cuisine });
assert.equal(selectedCuisine.total - noPreferences.total, 2, "Actual recipe cuisine still supplies its existing bounded preference bonus");
assert.equal(selectedCuisine.model.rawScore, noPreferences.model.rawScore);
const sandwich = current.find(meal => meal.id === "tuna-tomato-cucumber-sandwich");
assert.deepEqual(getMatchedPreferenceTags({ ...profile, preferenceTags: ["American light meals", "Takeout-friendly", "Quick grocery meals", "Wraps / sandwiches"] }, sandwich), ["Wraps / sandwiches"], "A sandwich format does not establish an American cuisine, takeout suitability or ready-made grocery meal");
const lateProfile = { ...profile, avoidTags: ["Late-night heavy meals"] };
const late = new Date(2026, 10, 6, 22);
for (const meal of current) {
  assert.deepEqual(getHardAvoidConflicts(lateProfile, meal, "lunch"), []);
  for (const heaviness of ["light", "medium", "heavy"]) assert.deepEqual(getHardAvoidConflicts(lateProfile, { ...meal, heaviness }, "late"), [{ tag: "Late-night heavy meals", certainty: "unknown" }], "An unsupported classification stays unknown regardless of the retired ordinal field");
}
const limitedAtNight = recommendPilotMeals(lateProfile, defaultMealContext, "en", late);
assert.equal(limitedAtNight.candidateCount, 0, "A retained strict condition cannot be silently relaxed");
assert(limitedAtNight.trace.exclusions.every(item => item.reasons.includes("Late-night heavy meals:unknown")));
assert.equal(recommendPilotMeals(lateProfile, defaultMealContext, "en", now).candidateCount, current.length);
assert.equal(recommendPilotMeals(profile, defaultMealContext, "en", late).candidateCount, current.length, "Removing the unsupported saved condition restores eligible recipes");
const breadMeal = current.find(meal => meal.id === "tuna-tomato-cucumber-sandwich");
for (const tag of ["Dairy", "Egg", "Soy", "Sesame", "Peanuts", "Tree nuts"]) {
  assert(getHardAvoidConflicts({ ...profile, avoidTags: [tag] }, breadMeal, "lunch").some(conflict => conflict.tag === tag && conflict.certainty === "unknown"), "The recipe catalog retains unresolved bread composition");
  assert(!recommendPilotMeals({ ...profile, avoidTags: [tag] }, defaultMealContext, "en", now).eligibleRecipes.some(item => item.recipe.mealId === breadMeal.id));
}
assert(buildRecipeSafetyMetadata({ ...plainRiceRecipe, temperature: "flexible" }).unknown.includes("Cold food"));
assert.throws(() => buildRecipeSafetyMetadata(plainRiceRecipe, sourceFoods.filter(food => food.id !== plainRiceRecipe.ingredients[0].foodId)), /Missing reviewed ingredient safety/);

const unversioned = legacy.find(meal => meal.id === plainRiceRecipe.mealId);
assert.match(legacyMealTitle(unversioned, "en"), /tofu/i);
assert(getLegacyNamedMealComponents(unversioned).some(item => /tofu/i.test(item.name)));
assert.match(getLegacyMealPresentation(unversioned, "zh").title, /豆腐/);
const plannedMeals = [
  ...retired.map((meal, index) => ({ id: `old-${index}`, mealId: meal.id, createdAt: now.toISOString() })),
  { id: "exact-recipe", mealId: plainRiceRecipe.mealId, createdAt: now.toISOString(), portion: "large", recipeVersion: plainRiceRecipe.version },
  { id: "unknown-version", mealId: recipes[0].mealId, createdAt: now.toISOString(), portion: "small", recipeVersion: "old-unavailable-version" },
];
const restored = normalizeState({ ...createBlankState(now), plannedMeals }, now);
assert.deepEqual(restored.plannedMeals, plannedMeals, "Retired ideas, exact saved versions and unavailable-version records survive normalization unchanged");
const exported = createLocalDataExport(restored, "en", now);
assert.deepEqual(exported.data.plannedMeals, plannedMeals, "Export preserves saved identity and version without upgrading an idea into a recipe");
assert(legacy.every(meal => meal.recipeVersion === undefined));
console.log(JSON.stringify({ currentRecipeCatalog: current.length, legacyCompatibilityIdeas: legacy.length, retainedRetiredPlans: retired.length, bilingualRecipeIdentity: true, sourceSafetyChecks: safetyChecks, noInheritedFalseExclusions: true, exactSavedVersions: true, currentCuisineBonus: true }, null, 2));

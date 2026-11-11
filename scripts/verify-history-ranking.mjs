import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { independentRecipeRanking, compareIndependentTiers } from "./recipe-ranking-oracle.mjs";

// Exercise the same exported functions called by App, not the retired scorer.
const root = fileURLToPath(new URL("../", import.meta.url));
const modules = new Map();
function loadSource(relativePath) {
  const absolute = path.resolve(root, relativePath);
  if (modules.has(absolute)) return modules.get(absolute).exports;
  const module = { exports: {} };
  modules.set(absolute, module);
  const { outputText } = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    fileName: absolute, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  });
  const localRequire = name => {
    assert(name.startsWith("."), `Unexpected dependency: ${name}`);
    return loadSource(`${path.resolve(path.dirname(absolute), name)}.ts`);
  };
  new Function("require", "module", "exports", outputText)(localRequire, module, module.exports);
  return module.exports;
}

const { createBlankState, createEmptyMeal, seedProfile, toLocalDateId } = loadSource("src/data.ts");
const { recommendPilotMeals, getRecipeHardAvoidConflicts } = loadSource("src/nutrition.ts");
const { recommendMealIdeas } = loadSource("src/logic.ts");
const { defaultMealContext } = loadSource("src/meal-context.ts");
const { buildHistoryVarietyContext, pickHistoryVariedChoices } = loadSource("src/history-variety.ts");
const { sourceFoods, standardizedRecipes } = loadSource("src/nutrition-data.ts");
const clone = value => JSON.parse(JSON.stringify(value));
const now = new Date(2026, 10, 4, 12, 30);
const profile = { ...clone(seedProfile), preferenceTags: [], avoidTags: [], sensitiveDrinkOptIns: [], eatingStyle: "Both", feelToday: "Normal" };
const state = () => createBlankState(now);
const blank = state();
const today = blank.days.find(day => day.date === "2026-11-04").todayLog;
const recipeIds = result => result.recommendations.map(item => item.recipe.mealId);
const scores = result => Object.fromEntries(result.trace.candidateScores.map(item => [item.mealId, [item.score.nutrient, item.score.energy, item.score.currentPreference.points, item.score.savedPreference.points, item.score.nutritionReference]]).sort());
const recipes = (history, selectedToday = today, locale = "en", selectedProfile = profile, context = defaultMealContext) => recommendPilotMeals(selectedProfile, context, locale, now, selectedToday, history);
const ideas = (history, selectedToday = today, locale = "en", context = defaultMealContext) => recommendMealIdeas(profile, selectedToday, history, locale, now, context);
const normal = recipes(blank.days);
const riceTieId = "bean-veggie-rice-bowl", quinoaTieId = "tofu-kale-quinoa-bowl";
const candidate = (result, id) => result.eligibleRecipes.find(item => item.recipe.mealId === id);
const position = (result, id) => result.trace.eligibleRecipeIds.indexOf(id);
assert.deepEqual(candidate(normal, riceTieId).trace.rankTier, candidate(normal, quinoaTieId).trace.rankTier, "The retained rice/quinoa recipes form an actual equal-priority tie");
const previous = state();
previous.days.find(day => day.date === "2026-11-03").todayLog.Lunch.carbs = ["Rice"];
const priorRice = recipes(previous.days);
assert(position(priorRice, quinoaTieId) < position(priorRice, riceTieId), "Yesterday's rice puts the non-rice recipe first within the live equal-priority tie, even below the top three");
const quinoaHistory = candidate(priorRice, quinoaTieId).trace.variety;
assert.equal(quinoaHistory.applied, true);
assert.equal(candidate(priorRice, quinoaHistory.comparison.candidateId).recipe.staple, "rice");
assert.deepEqual(candidate(priorRice, quinoaHistory.comparison.candidateId).trace.rankTier, candidate(priorRice, quinoaTieId).trace.rankTier);
assert.deepEqual(quinoaHistory.evidence.map(item => [item.date, item.mealName, item.foodNames]), [["2026-11-03", "Lunch", ["Rice"]]]);
assert.equal(quinoaHistory.scope.recognizedMealCount, 1);
assert.equal(quinoaHistory.scope.recognizedDayCount, 1);
assert.deepEqual(scores(priorRice), scores(normal), "History must not alter any nutrient, energy, preference or total points");

const edited = clone(previous);
edited.days.find(day => day.date === "2026-11-03").todayLog.Lunch.carbs = ["Quinoa"];
const priorQuinoa = recipes(edited.days);
assert(position(priorQuinoa, riceTieId) < position(priorQuinoa, quinoaTieId), "Editing history recomputes the actual live tie");
edited.days.find(day => day.date === "2026-11-03").todayLog.Lunch = createEmptyMeal();
assert.deepEqual(recipes(edited.days).trace.eligibleRecipeIds, normal.trace.eligibleRecipeIds, "Deleting history removes its ranking effect across all 130 recipes");

const alias = clone(previous);
alias.days.find(day => day.date === "2026-11-03").todayLog.Lunch.carbs = ["Rice", "白飯", "白米飯"];
const riceSource = sourceFoods.find(food => food.id === "usda-168878");
alias.days.find(day => day.date === "2026-11-03").todayLog.Lunch.componentDetails = [{ name: riceSource.label.zh, group: "carb", sourceFoodId: riceSource.id, confidence: "high", amount: { quantity: 1000, unit: "g", qualifier: "exact", originalText: null } }];
const aliasResult = recipes(alias.days, today, "zh");
assert.deepEqual(recipeIds(aliasResult), recipeIds(priorRice), "Aliases and selected source forms preserve ranking across locales");
assert.deepEqual(aliasResult.trace.eligibleRecipeIds, priorRice.trace.eligibleRecipeIds);
assert.equal(candidate(aliasResult, quinoaTieId).trace.variety.comparison.otherStapleMeals, 1, "Aliases and grams do not multiply the meal count");
assert.deepEqual(scores(aliasResult), scores(priorRice));

const duplicateToday = state();
duplicateToday.days.find(day => day.isToday).todayLog.Lunch.carbs = ["Rice"];
const selectedToday = duplicateToday.days.find(day => day.isToday).todayLog;
assert.equal(recipes(duplicateToday.days, selectedToday).recommendations[0].trace.variety.scope.recognizedMealCount, 1, "Today passed twice is counted once");
assert.deepEqual(recipeIds(recipes(duplicateToday.days, today)), recipeIds(normal), "An explicitly blank today overrides a stale history copy");

const unknown = state();
unknown.days.find(day => day.date === "2026-11-03").todayLog.Lunch.protein = ["Mystery dish without identified foods"];
const unknownResult = recipes(unknown.days);
assert.deepEqual(recipeIds(unknownResult), recipeIds(normal), "Unknown names cannot fabricate protein identities");
assert.equal(unknownResult.recommendations[0].trace.variety.scope.loggedMealCount, 1);
assert.equal(unknownResult.recommendations[0].trace.variety.scope.recognizedMealCount, 0);
assert(unknownResult.recommendations.every(item => !item.trace.variety.applied && !item.trace.variety.evidence.length));

const staleDates = ["2026-10-28", "2026-11-05", "2026-02-30", "not-a-date"].map(date => ({ ...clone(previous.days.find(day => day.date === "2026-11-03")), date, id: date, isToday: true }));
assert.deepEqual(recipeIds(recipes(staleDates)), recipeIds(normal), "Expired, future and invalid dates are ignored even if marked today");

const recordedEgg = state();
recordedEgg.days.find(day => day.date === "2026-11-03").todayLog.Lunch.protein = ["Egg"];
const normalIdeas = ideas(blank.days);
const eggIdeas = ideas(recordedEgg.days);
assert.equal(normalIdeas[0].id, "avocado-egg-toast-soup");
assert.notEqual(eggIdeas[0].id, normalIdeas[0].id, "The retained legacy idea compatibility path also responds to previous-day foods");
assert(eggIdeas[0].decisionTrace.variety.applied);
assert(eggIdeas[0].decisionTrace.variety.evidence.some(item => item.date === "2026-11-03" && item.foodNames.includes("Egg")));
assert.deepEqual(ideas(recordedEgg.days, today, "zh").map(item => item.id), eggIdeas.map(item => item.id));
recordedEgg.days.find(day => day.date === "2026-11-03").todayLog.Lunch = createEmptyMeal();
assert.deepEqual(ideas(recordedEgg.days).map(item => item.id), normalIdeas.map(item => item.id));
const ricePreferred = ideas(previous.days, today, "en", { ...defaultMealContext, preferredStaple: "rice" });
assert(ricePreferred.every(item => item.matchReasons.includes("Matches this meal's selected staple.")), "History must not outrank an explicit idea preference tier");

// Independent rule examples: recurrence count first, recency only on equal
// counts, and higher priority always before a less repetitive lower priority.
const candidates = [
  { id: "chicken", value: "chicken", tier: [-20], proteins: ["chicken"], staple: null },
  { id: "fish", value: "fish", tier: [-20], proteins: ["fish"], staple: null },
  { id: "tofu-low-total", value: "tofu", tier: [-19], proteins: ["soy"], staple: null },
];
const recency = state();
recency.days.find(day => day.date === "2026-11-03").todayLog.Lunch.protein = ["Chicken"];
recency.days.find(day => day.date === "2026-10-29").todayLog.Lunch.protein = ["Fish"];
assert.deepEqual(pickHistoryVariedChoices(candidates, buildHistoryVarietyContext(recency.days, now)).map(item => item.id), ["fish", "chicken", "tofu-low-total"]);
recency.days.find(day => day.date === "2026-10-29").todayLog.Dinner.protein = ["Fish"];
assert.deepEqual(pickHistoryVariedChoices(candidates, buildHistoryVarietyContext(recency.days, now)).map(item => item.id), ["chicken", "fish", "tofu-low-total"]);

let topThreeChecks = 0;
for (const logged of [previous.days, alias.days, recency.days]) for (const locale of ["en", "zh"]) for (const changes of [{}, { preferenceTags: ["High-protein"] }, { avoidTags: ["Soy"] }, { avoidTags: ["Shellfish", "Fishy seafood"] }, { preferenceTags: ["Rice-based meals", "Light meals", "High-protein"] }]) for (const selectedStaple of ["any", "bread", "rice", "noodles"]) {
  const selectedProfile={...profile,...changes}, context={...defaultMealContext,preferredStaple:selectedStaple};
  const result = recipes(logged, today, locale, selectedProfile, context);
  const independentlyRanked=standardizedRecipes.filter(recipe=>result.trace.eligibleRecipeIds.includes(recipe.mealId)).map(recipe=>independentRecipeRanking(recipe,sourceFoods,selectedProfile,context).tier).sort(compareIndependentTiers);
  const independentlyActual=result.eligibleRecipes.map(item=>independentRecipeRanking(item.recipe,sourceFoods,selectedProfile,context).tier);
  assert.deepEqual(independentlyActual,independentlyRanked,"History cannot overturn any independently calculated preference/nutrition priority level");
  assert.deepEqual(result.recommendations.map(item=>independentRecipeRanking(item.recipe,sourceFoods,selectedProfile,context).tier),independentlyRanked.slice(0,3),"Actual live top three follow the highest eligible priority levels");
  assert.deepEqual(result.eligibleRecipes.slice(0, 3), result.recommendations, "Full collection and top-three history order stay consistent");
  if (changes.avoidTags?.includes("Soy")) assert(result.recommendations.every(item => getRecipeHardAvoidConflicts({ ...profile, ...changes }, item.recipe, item.portion).length === 0), "Actual ingredient safety, not historical IDs, governs soy exclusion");
  topThreeChecks++;
}

// Equal old sums are not equal priorities. Recording the preferred bread
// must never promote a non-bread meal whose nutrition points fill the gap.
const breadContext={...defaultMealContext,preferredStaple:"bread"};
const breadRanked=recipes(blank.days,today,"en",profile,breadContext);
const oldSumPair=breadRanked.eligibleRecipes.flatMap(preferred=>preferred.recipe.staple!=="bread"?[]:breadRanked.eligibleRecipes.filter(other=>other.recipe.staple!=="bread"&&other.score.total===preferred.score.total).map(other=>[preferred,other]))[0];
assert(oldSumPair,"A real recipe pair must demonstrate equal diagnostic sums but different current preference tiers");
const breadHistory=state();
for(const day of breadHistory.days)day.todayLog.Lunch.carbs=["Bread"];
const breadWithHistory=recipes(breadHistory.days,breadHistory.days.find(day=>day.isToday).todayLog,"en",profile,breadContext);
assert(position(breadWithHistory,oldSumPair[0].recipe.mealId)<position(breadWithHistory,oldSumPair[1].recipe.mealId),"History cannot treat equal diagnostic sums with different current-preference points as a tie");
for(const item of breadWithHistory.eligibleRecipes){
  if(item.trace.variety.comparison) assert.deepEqual(item.trace.rankTier,candidate(breadWithHistory,item.trace.variety.comparison.candidateId).trace.rankTier,"Every history comparison is confined to equal current/saved/nutrition priorities");
}

// DST, leap day and year boundaries exercise local date selection in the new
// ranking context. Do not infer seven days from an elapsed millisecond count.
const originalTz = process.env.TZ;
let calendarChecks = 0;
for (const timezone of ["America/Chicago", "Asia/Taipei", "Pacific/Auckland", "UTC"]) {
  process.env.TZ = timezone;
  for (const [year, month, day] of [[2026, 2, 9], [2026, 10, 2], [2024, 2, 1], [2027, 0, 1]]) {
    const date = new Date(year, month, day, 0, 5);
    const window = createBlankState(date).days;
    for (const item of window) item.todayLog.Lunch.carbs = ["Rice"];
    const basis = buildHistoryVarietyContext(window, date);
    assert.equal(basis.scope.recognizedDayCount, 7);
    assert.equal(basis.scope.recognizedMealCount, 7);
    assert.equal(basis.scope.windowEnd, toLocalDateId(date));
    assert.equal(basis.records.at(-1).daysAgo, 6);
    calendarChecks++;
  }
}
if (originalTz === undefined) delete process.env.TZ; else process.env.TZ = originalTz;

console.log(JSON.stringify({ liveRecipeHistoryEditDelete: true, legacyIdeaHistoryEditDelete: true, unchangedNutritionAndPreferenceGroups: true, aliasSourceAndLocaleParity: true,
  todayCountedOnce: true, datedDecisionEvidence: true, unknownHistoryNeutral: true, staleAndFutureDatesIgnored: true,
  repeatFrequencyAndRecency: true, topThreeChecks, calendarChecks }, null, 2));

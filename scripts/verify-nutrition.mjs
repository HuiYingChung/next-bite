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
    fileName: absolutePath, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
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
const { getNamedMealComponents } = loadSource("src/presentation.ts");
const { resolveFoodIdentity, isSourceFoodIdentityValid, getRecordedFoodIdentities } = loadSource("src/food-identity.ts");
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

assert.equal(standardizedRecipes.length, 108);
assert.equal(new Set(standardizedRecipes.map(item => item.mealId)).size, 108);
assert.equal(sourceFoods.length, 76, "Retain all 76 reviewed sources; the new recipes reuse supported ingredients");
assert.equal(new Set(sourceFoods.map(item => item.id)).size, 76);
assert.equal(recommendationDataset.length, 108);
// Every current catalog entry uses its reviewed recipe formulation and must
// enforce the same known/unknown ingredients and raw/cool conditions.
// Derive expectations from source records, independently of catalog metadata.
const recipeLinkedIdeas = recommendationDataset;
for (const idea of recipeLinkedIdeas) {
  const linked = recipe(idea.id);
  const ingredients = linked.ingredients.filter(item => item.grams > 0);
  const foods = ingredients.map(item => sourceFoods.find(food => food.id === item.foodId));
  const known = new Set(foods.flatMap(food => food.avoidTags));
  if (ingredients.some(item => item.weighedState === "raw")) known.add("Raw food");
  if (linked.temperature === "cool") known.add("Cold food");
  const unknown = new Set(foods.flatMap(food => food.unknownAvoidTags ?? []).filter(tag => !known.has(tag)));
  if (linked.temperature === "flexible") unknown.add("Cold food");
  assert.deepEqual([...idea.safety.contains].sort(), [...known].sort(), `${idea.id}: idea contains declarations match the reviewed ingredients and serving state`);
  assert.deepEqual([...idea.safety.unknown].sort(), [...unknown].sort(), `${idea.id}: ingredient uncertainty must persist in the idea path`);
  assert.deepEqual(idea.safety.mayContain, [], `${idea.id}: no unsupported extra formulation assumptions`);
  for (const [certainty, tags] of [["contains", known], ["unknown", unknown]]) for (const tag of tags) {
    const selected = profile({ avoidTags: [tag] });
    // Delete names/tags to prove this protection does not depend on word scans.
    const nameless = { ...idea, title: "", description: "", tags: [] };
    assert(getHardAvoidConflicts(selected, nameless, getMealTimeWindow(now)).some(conflict => conflict.tag === tag && conflict.certainty === certainty), `${idea.id}/${tag}: structured idea exclusion remains effective`);
    assert(!recommendPilotMeals(selected, context(), "en", now).trace.eligibleRecipeIds.includes(idea.id));
  }
  assert.deepEqual(getNamedMealComponents(idea).map(item => item.sourceFoodId), ingredients.map(item => item.foodId), `${idea.id}: the current catalog lists exactly the source-linked ingredients`);
}
assert(standardizedRecipes.filter(item => item.staple === "noodles").length >= 4, "Retain the four existing noodle formulations");
assert(standardizedRecipes.filter(item => item.staple === "bread").length >= 3, "Retain the three existing bread formulations");
const sourceNutrients = { kcal: 1008, energyKj: 1062, protein: 1003, carbs: 1005, fat: 1004, saturatedFat: 1258, fiber: 1079, sodium: 1093, addedSugar: 1235 };
let sourceValues = 0;
const archivedFoods = new Map();
for (const source of nutritionSources) {
  const snapshot = fs.readFileSync(path.resolve(root, source.snapshotPath));
  assert.equal(createHash("sha256").update(snapshot).digest("hex"), source.snapshotSha256, "Pinned USDA bytes changed");
  const rawFoods = JSON.parse(snapshot.toString("utf8"));
  for (const food of sourceFoods.filter(item => item.sourceId === source.id)) {
    const raw = rawFoods.find(item => item.fdcId === food.fdcId);
    assert(raw, `Missing archived source ${food.fdcId}`);
    archivedFoods.set(food.id, raw);
    assert(Array.isArray(food.avoidTags), `${food.id} has an explicit reviewed avoidance declaration`);
    assert(food.avoidTags.every(tag => avoidTags.includes(tag)), `${food.id} only declares supported avoid tags`);
    assert((food.unknownAvoidTags ?? []).every(tag => avoidTags.includes(tag)), `${food.id} only declares supported uncertain avoid tags`);
    assert.equal(food.description, raw.description, "Identity/preparation must match source");
    for (const key of nutrientKeys) {
      const rawNutrient = raw.foodNutrients.find(item => item.nutrient.id === sourceNutrients[key]);
      assert.equal(food.nutrientsPer100g[key], rawNutrient?.amount ?? null, `${food.id}/${key} must match the archived value or remain null`);
      sourceValues++;
    }
  }
}

for (const id of ["usda-171534", "usda-171986", "usda-174314"]) {
  assert.equal(archivedFoods.get(id).foodNutrients.find(item => item.nutrient.id === 2000)?.amount, 0, `${id} has an actual archived total-sugar zero, independently of its missing added-sugar field`);
}
assert.equal(archivedFoods.get("usda-173757").foodNutrients.find(item=>item.nutrient.id===2000)?.amount,4.8,"The recipe-specific chickpea puree input is the actual archived total-sugar amount");
assert.equal(archivedFoods.get("usda-170932").foodNutrients.find(item=>item.nutrient.id===2000)?.amount,10.34,"Ground pepper free sugars retain the actual source total, without rounding or assuming zero");
for(const [id,sugars,energyKj] of [["usda-171325",2.43,1386]]){
  const archived=archivedFoods.get(id);
  assert.equal(archived.foodNutrients.find(item=>item.nutrient.id===2000)?.amount,sugars,`${id} retains actual nonzero spice-powder sugars`);
  assert.equal(archived.foodNutrients.find(item=>item.nutrient.id===1062)?.amount,energyKj,`${id} uses the full source precision, not the rounded library discovery projection`);
}
for(const id of ["usda-170845","usda-171651"]) assert.equal(archivedFoods.get(id).foodNutrients.find(item=>item.nutrient.id===2000)?.amount,0,`${id} has an archived total-sugar zero, not an assumed missing-value zero`);

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
  for (const portion of ["small", "regular", "large"]) {
    const calculated = calculateRecipe(item, portion);
    // Independently sum the archived source values, not the regular result.
    // This catches wrong multipliers/fields shared by all serving variants.
    for (const key of nutrientKeys) {
      const values = item.ingredients.filter(ingredient => ingredient.grams > 0).map(ingredient => ({
        amount: archivedFoods.get(ingredient.foodId).foodNutrients.find(value => value.nutrient.id === sourceNutrients[key])?.amount,
        grams: ingredient.grams * item.portions[portion],
      }));
      if (values.some(value => value.amount === undefined || value.amount === null)) assert.equal(calculated.nutrition[key], null, `${item.mealId}/${portion}/${key} preserves an archived unknown`);
      else close(calculated.nutrition[key], values.reduce((sum, value) => sum + value.grams * value.amount / 100, 0), `${item.mealId}/${portion}/${key} independently summed archived nutrients`);
    }
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
assert(Number.isFinite(shrimp.nutrition.fiber), "The active shrimp record supplies fiber");
assert(recipe("shrimp-quinoa-bowl").ingredients.some(item => item.foodId === "usda-171971"));
const retiredShrimpRecipe = { ...recipe("shrimp-quinoa-bowl"), ingredients: recipe("shrimp-quinoa-bowl").ingredients.map(item => item.foodId === "usda-171971" ? { ...item, foodId: "usda-175180" } : item) };
const retiredShrimp = calculateRecipe(retiredShrimpRecipe, "regular", "zh");
assert.equal(retiredShrimp.nutrition.fiber, null, "An archived missing value remains missing; supplementation must not backfill an old record");
assert(retiredShrimp.unknowns.some(item => item.nutrient === "fiber" && item.missingFoodIds.includes("usda-175180") && item.reason.includes("未知，並非零")));
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
assert.equal(normal.candidateCount + normal.excludedCount, 108);
assert.equal(normal.candidateCount, 108, "Every detailed recipe has enough evidence to be eligible without restrictions");
assert.equal(normal.eligibleRecipes.length, 108, "Every eligible recipe is available for browsing and selection");
assert.deepEqual(normal.eligibleRecipes.slice(0, 3), normal.recommendations, "Browsing does not replace or reorder the ranked top three");
assert.deepEqual(normal.eligibleRecipes.map(item => item.recipe.mealId), normal.trace.eligibleRecipeIds);
assert.equal(normal.recommendations.length, 3);
assert.deepEqual(normal, recommendPilotMeals(profile(), context(), "en", now), "Same inputs produce identical output");
// Scoring now uses the exact profile decomposition plus bounded preferences.
assert.equal(new Set(normal.recommendations.map(item => item.recipe.mealId)).size, 3);
assert.equal(normal.trace.candidateScores.length,108);
for (const item of normal.trace.candidateScores) {
  assert.equal(item.score.total,item.score.nutrient+item.score.energy+item.score.preference);
  assert.equal(item.score.total,10-item.score.model.rawScore+item.score.preference);
  assert.equal(item.score.preferenceRows.reduce((sum,row)=>sum+row.points,0),item.score.preference);
}
for (const portion of ["small", "regular", "large"]) {
  const chosen = recommendPilotMeals(profile(), context({ appetite: portion }), "en", now);
  assert.deepEqual(chosen.trace.candidateScores.map(item=>[item.mealId,item.score.total]),normal.trace.candidateScores.map(item=>[item.mealId,item.score.total]),"Per100g model and preference basis are independent of selected portion");
}
const lightWithLessEffort = recommendPilotMeals(profile({ feelToday: "Low energy", preferenceTags: ["Light meals"] }), context(), "en", now);
for(const item of lightWithLessEffort.trace.candidateScores) {
  const preparation=item.score.preferenceRows.find(row=>row.key==="preparation");
  assert.equal(preparation.points,recipe(item.mealId).prepMinutes<=10?2:0,"Current effort determines the single preparation group, without adding saved oil twice");
}
for (const hunger of ["not-hungry", "moderate", "hungry", "unspecified"]) {
  const expected = hunger === "not-hungry" ? "small" : hunger === "hungry" ? "large" : "regular";
  assert(recommendPilotMeals(profile(), context({ hunger }), "en", now).recommendations.every(item => item.portion === expected));
}
assert(recommendPilotMeals(profile(), context({ hunger: "hungry", appetite: "small" }), "en", now).recommendations.every(item => item.portion === "small" && item.trace.portionBasis === "explicit-appetite"));
for (const warmProfile of [profile(), profile({ feelToday: "Want something warm" })]) {
  const warm = recommendPilotMeals(warmProfile, context({ temperature: "warm" }), "en", now);
  assert(warm.recommendations.length && warm.recommendations.every(item => item.recipe.temperature === "warm"));
  assert(warm.trace.exclusions.some(item => item.mealId === "egg-tomato-rice" && item.stage === "context"));
}
const quick = recommendPilotMeals(profile(), context({ maxPrepMinutes: 10 }), "en", now);
assert(quick.recommendations.length && quick.recommendations.every(item => item.recipe.prepMinutes <= 10));
assert.equal(recommendPilotMeals(profile(), context({ maxPrepMinutes: 0 }), "en", now).recommendations.length, 0, "No fallback may relax a strict preparation limit");
const noodlePreference = recommendPilotMeals(profile(), context({ preferredStaple: "noodles", cuisine: "asian" }), "en", now);
assert.equal(noodlePreference.candidateCount, 108, "Soft staple/cuisine preferences do not exclude unmatched recipes");
assert.equal(noodlePreference.eligibleRecipes.filter(item => item.recipe.staple === "noodles").length, standardizedRecipes.filter(item => item.staple === "noodles").length);
for (const item of noodlePreference.eligibleRecipes) {
  assert.equal(item.score.preferenceRows.find(row => row.key === "staple").points, item.recipe.staple === "noodles" ? 2 : 0);
  if (item.recipe.staple !== "noodles") assert(item.trace.unmatchedPreferences.includes("staple") && item.reasons.some(reason => reason.includes("flexible preference")));
}

// Actual reported source-state counterexamples plus all ingredient avoids.
const coldAvoid = recommendPilotMeals(profile({ avoidTags: ["Cold food"] }), context({ preferredStaple: "none", cuisine: "asian" }), "en", now);
assert(!coldAvoid.trace.eligibleRecipeIds.includes("egg-tomato-rice"));
assert(coldAvoid.recommendations.every(item => item.recipe.temperature === "warm"));
const rawAvoid = recommendPilotMeals(profile({ avoidTags: ["Raw food"] }), context({ preferredStaple: "rice", cuisine: "asian" }), "en", now);
assert(!rawAvoid.trace.eligibleRecipeIds.includes("egg-tomato-rice"));
assert(rawAvoid.recommendations.every(item => item.recipe.ingredients.every(ingredient => ingredient.weighedState !== "raw")));
const parsleyIngredient = recipe("pho-lean-beef-herbs").ingredients.find(item => item.foodId === "usda-170416");
assert.equal(parsleyIngredient.weighedState, "raw", "The narrowly reviewed fresh-parsley source is still a raw ingredient");
const parsleyOnly = { ...recipe("pho-lean-beef-herbs"), ingredients: [parsleyIngredient] };
assert(getRecipeHardAvoidConflicts(profile({ avoidTags: ["Raw food"] }), parsleyOnly, "regular").some(conflict => conflict.tag === "Raw food" && conflict.certainty === "contains"), "Raw parsley independently triggers the raw-food avoidance gate");
for (const tag of avoidTags) {
  const selected = profile({ avoidTags: [tag] });
  const result = recommendPilotMeals(selected, context(), "en", now);
  for (const id of result.trace.eligibleRecipeIds) {
    const meal = recommendationDataset.find(item => item.id === id);
    assert.equal(getHardAvoidConflicts(selected, meal, getMealTimeWindow(now)).length, 0, `Eligible catalog candidate ${id} must obey ${tag}`);
    assert.equal(getRecipeHardAvoidConflicts(selected, recipe(id), "regular").length, 0, `Eligible recipe candidate ${id} must obey ${tag}`);
  }
  for (const item of result.eligibleRecipes) {
    assert.equal(getHardAvoidConflicts(selected, item.meal, getMealTimeWindow(now)).length, 0, `Catalog ${tag} exclusion must persist`);
    assert.equal(getRecipeHardAvoidConflicts(selected, item.recipe, item.portion).length, 0, `Recipe ${tag} exclusion must persist`);
  }
}
for (const [tag, id] of [["Soy", "tofu-egg-protein-bowl"], ["Soy", "salmon-edamame-bowl"], ["Egg", "congee-egg-side-veg"], ["Fishy seafood", "salmon-rice-bowl-veg"], ["Shellfish", "shrimp-quinoa-bowl"]]) assert(!recommendPilotMeals(profile({ avoidTags: [tag] }), context(), "en", now).trace.eligibleRecipeIds.includes(id), `${tag} must exclude the actual named recipe ingredient`);
// Independent identities for animal proteins, wheat staples and bitter melon. Check the
// entire browsable collection so a non-top-three recipe cannot bypass avoids.
for (const [foodId, tags] of [
  ["usda-168649", ["Beef"]], ["usda-170894", ["Dairy"]],
  ["usda-169732", ["Egg", "Wheat / gluten"]], ["usda-168910", ["Wheat / gluten"]], ["usda-174091", ["Wheat / gluten"]],
  ["usda-169193", ["Pork"]], ["usda-171956", ["Fishy seafood"]],
  ["usda-172182", ["Dairy"]],
  ["usda-168394", ["Bitter melon"]],
  ["usda-171986", ["Fishy seafood", "Processed food"]], ["usda-174314", ["Lamb"]],
  ["usda-170152", ["Sesame"]], ["usda-170848", ["Dairy"]], ["usda-170844", ["Dairy"]], ["usda-170845", ["Dairy"]],
  ["usda-174271", ["Soy"]], ["usda-169229", ["Eggplant"]], ["usda-169989", ["Celery"]], ["usda-170932", ["Spicy food"]],
]) {
  const food = sourceFoods.find(item => item.id === foodId);
  assert(food, `Expanded collection contains the reviewed ${foodId} source`);
  const affected = standardizedRecipes.filter(item => item.ingredients.some(ingredient => ingredient.foodId === foodId && ingredient.grams > 0));
  assert(affected.length, `${foodId} is used by a detailed recipe`);
  for (const tag of tags) {
    assert(food.avoidTags.includes(tag), `${foodId} declares ${tag}`);
    const safe = recommendPilotMeals(profile({ avoidTags: [tag] }), context(), "en", now);
    for (const item of affected) {
      assert(getRecipeHardAvoidConflicts(profile({ avoidTags: [tag] }), item, "regular").some(conflict => conflict.tag === tag));
      assert(!safe.eligibleRecipes.some(candidate => candidate.recipe.mealId === item.mealId), `${item.mealId} is not browsable/selectable under ${tag}`);
    }
  }
}
const cannedTunaMeal = recommendationDataset.find(item => item.id === "tuna-mayo-onigiri-side-soup");
assert(getHardAvoidConflicts(profile({ avoidTags: ["Processed food"] }), cannedTunaMeal, getMealTimeWindow(now)).some(conflict => conflict.tag === "Processed food" && conflict.certainty === "contains"), "The explicit canned-tuna declaration preserves the existing product convenience-food exclusion");
const breadRecipes = standardizedRecipes.filter(item => item.ingredients.some(ingredient => ingredient.foodId === "usda-174091" && ingredient.grams > 0));
assert(breadRecipes.length >= 3);
for (const tag of ["Dairy", "Egg", "Soy", "Sesame", "Peanuts", "Tree nuts"]) {
  assert(sourceFoods.find(item => item.id === "usda-174091").unknownAvoidTags?.includes(tag), `Generic bread composition does not certify absence of ${tag}`);
  const safe = recommendPilotMeals(profile({ avoidTags: [tag] }), context(), "en", now);
  for (const item of breadRecipes) {
    const conflicts = getRecipeHardAvoidConflicts(profile({ avoidTags: [tag] }), item, "regular");
    assert(conflicts.some(conflict => conflict.tag === tag), `${tag} must exclude each bread recipe until its actual label is known`);
    const contains = item.ingredients.some(ingredient => sourceFoods.find(food => food.id === ingredient.foodId).avoidTags.includes(tag));
    assert(conflicts.some(conflict => conflict.tag === tag && conflict.certainty === (contains ? "contains" : "unknown")), `${tag} reports known ingredients before uncertainty, without inventing ingredient presence`);
    assert(!safe.eligibleRecipes.some(candidate => candidate.recipe.mealId === item.mealId));
    assert(safe.trace.exclusions.some(exclusion => exclusion.mealId === item.mealId && exclusion.reasons.some(reason => reason === `${tag}:unknown` || reason === `${tag}:contains`)));
  }
}
const cerealRecipe=recipe("greek-yogurt-granola-fruit-bowl");
const cerealOnly={...cerealRecipe,ingredients:cerealRecipe.ingredients.filter(item=>item.foodId==="usda-171651")};
for(const tag of ["Dairy","Egg","Wheat / gluten","Soy","Sesame","Peanuts","Tree nuts"]){
  const selected=profile({avoidTags:[tag]});
  assert(getRecipeHardAvoidConflicts(selected,cerealOnly,"regular").some(conflict=>conflict.tag===tag&&conflict.certainty==="unknown"),"An archived cereal nutrient record does not certify current ingredient absence");
  assert(!recommendPilotMeals(selected,context(),"en",now).eligibleRecipes.some(item=>item.recipe.mealId===cerealRecipe.mealId));
}
const declaredFood = sourceFoods.find(item => item.id === "usda-171477");
const retainedDeclaration = declaredFood.avoidTags;
try {
  delete declaredFood.avoidTags;
  const incompleteDeclaration = recommendPilotMeals(profile(), context(), "en", now);
  for (const item of standardizedRecipes.filter(item => item.ingredients.some(ingredient => ingredient.foodId === declaredFood.id && ingredient.grams > 0))) {
    assert(!incompleteDeclaration.eligibleRecipes.some(candidate => candidate.recipe.mealId === item.mealId), "Missing ingredient safety review cannot silently become an empty declaration");
    assert(incompleteDeclaration.trace.exclusions.some(exclusion => exclusion.mealId === item.mealId && exclusion.stage === "evidence"));
  }
} finally { declaredFood.avoidTags = retainedDeclaration; }
assert.equal(recommendPilotMeals(profile({ avoidTags: ["Large portions"] }), context({ appetite: "large" }), "en", now).candidateCount, 0);
// Historical idea names do not impose ingredients on the current formulation.
const oatsWithoutSoy = recipe("soy-milk-oatmeal-egg-fruit");
assert.equal(getRecipeHardAvoidConflicts(profile({ avoidTags: ["Soy"] }), oatsWithoutSoy, "regular").length, 0, "The detailed oats recipe itself contains no declared soy ingredient");
const actualSoyAvoid = recommendPilotMeals(profile({ avoidTags: ["Soy"] }), context(), "en", now);
assert(actualSoyAvoid.eligibleRecipes.some(item => item.recipe.mealId === oatsWithoutSoy.mealId), "Water-cooked oats with egg and banana remain eligible when soy is avoided");

const proteinDirection = recommendPilotMeals(profile({ preferenceTags: ["High-protein"] }), context(), "en", now);
assert(proteinDirection.trace.candidateScores.every(item=>item.score.preferenceRows.find(row=>row.key==="nutrition-direction").points===(item.score.model.inputs.protein>8.5?2:0)),"Explicit protein direction adds only its disclosed bounded bonus");
const blank = createBlankState(now).days.find(day => day.isToday).todayLog;
const recorded = clone(blank);
recorded.Lunch.carbs = ["白飯"];
const recordResult = recommendPilotMeals(profile(), context(), "en", now, recorded);
assert.deepEqual(recordResult.recommendations.map(item=>item.score.total),normal.recommendations.map(item=>item.score.total),"Record variety cannot replace a higher total");
assert(recordResult.recommendations.every(item=>item.reasons.some(reason=>reason.includes("equal current preferences, saved preferences and nutrition reference"))),"Record variety is explicitly limited to equal priority tiers");
for (const [id, family] of [["usda-171534", "chicken"], ["usda-171986", "fish"], ["usda-174314", "lamb"], ["usda-174271", "soy"]]) {
  const food = sourceFoods.find(item => item.id === id);
  for (const locale of ["en", "zh"]) {
    assert.equal(resolveFoodIdentity(food.label[locale], id).protein, family, `${id}/${locale} uses the reviewed protein family for history variety`);
    const recorded = getRecordedFoodIdentities([{ protein: [], carbs: [], componentDetails: [{ name: food.label[locale], sourceFoodId: id, group: "protein" }] }]);
    assert.deepEqual([...recorded.proteins], [family], `${id}/${locale} records one actual protein identity`);
  }
}
for (const food of sourceFoods) for (const locale of ["en", "zh"]) {
  const ingredients = standardizedRecipes.flatMap(item => item.ingredients).filter(item => item.foodId === food.id);
  const display = food.label[locale].replace(/[,，]/g, " ·");
  const validGroups = ["protein", "vegetable", "carb", "fruit", "soup", "drink", "other"].filter(group => isSourceFoodIdentityValid(food.id, display, group));
  assert.equal(validGroups.length, 1, `${food.id}/${locale} has one reviewed source group, including retained unused sources`);
  for (const ingredient of ingredients) assert.equal(validGroups[0], ingredient.group, `${food.id}/${locale} display form preserves every recipe's source group`);
  assert.equal(resolveFoodIdentity(display, food.id).sourceFoodId, food.id);
  assert(!isSourceFoodIdentityValid(food.id, "Unknown edited food", validGroups[0]));
}
const soyMilkSource = sourceFoods.find(food => food.id === "usda-173768");
assert(soyMilkSource.avoidTags.includes("Soy"));
assert(!standardizedRecipes.some(item => item.ingredients.some(ingredient => ingredient.foodId === soyMilkSource.id)), "Retained soy milk with unresolved FVNS is not used to complete the 108-recipe collection");
assert(isSourceFoodIdentityValid(soyMilkSource.id, soyMilkSource.label.en, "drink"));
assert(!isSourceFoodIdentityValid(soyMilkSource.id, soyMilkSource.label.en, "protein"), "A soy-milk drink cannot silently become a protein-group record");
assert.equal(resolveFoodIdentity(soyMilkSource.label.en, soyMilkSource.id).protein, null);
assert.equal(getRecordedFoodIdentities([{ protein: [], carbs: [], componentDetails: [{ name: soyMilkSource.label.en, sourceFoodId: soyMilkSource.id, group: "drink" }] }]).proteins.size, 0, "Drinks do not fabricate protein-source history matches");
assert(!archivedFoods.get("usda-169980").foodNutrients.some(item => item.nutrient.id === 2000 && item.amount !== null && item.amount !== undefined), "Napa cabbage's archived total sugar remains absent");
for (const locale of ["en", "zh"]) {
  const sourceLog = clone(blank), riceFood = sourceFoods.find(food => food.id === "usda-168878");
  sourceLog.Lunch.carbs = [riceFood.label[locale]];
  sourceLog.Lunch.componentDetails = [{ name: riceFood.label[locale], sourceFoodId: riceFood.id, group: "carb", confidence: "limited", amount: { quantity:150, unit:"g", qualifier:"exact", originalText:null } }];
  assert.deepEqual(recommendPilotMeals(profile(), context(), "en", now, sourceLog).recommendations.map(item => item.recipe.mealId), recordResult.recommendations.map(item => item.recipe.mealId));
}
const unknownOnly = clone(blank);
unknownOnly.Lunch.componentDetails = [{ name: "Unknown sandwich", group: "other", confidence: "limited", amount: { quantity: null, unit: "unspecified", qualifier: "unspecified", originalText: null } }];
const unknownResults = recommendPilotMeals(profile(), context(), "en", now, unknownOnly);
assert(unknownResults.recommendations.every(item => item.trace.recentRecordsUsed.length === 0 && item.reasons.some(reason => reason.includes("Records do not change calculated nutrition"))));
assert.deepEqual(unknownResults.recommendations.map(item => item.nutrition), normal.recommendations.map(item => item.nutrition));
const metric = clone(blank);
metric.Lunch.protein = ["Chicken"];
metric.Lunch.componentDetails = [{ name: "Chicken", group: "protein", confidence: "high", amount: { quantity: 1, unit: "g", qualifier: "exact", originalText: null } }];
const oneGram = summarizeTodayIntake(metric).proteinCount;
metric.Lunch.componentDetails[0].amount.quantity = 1000;
assert.equal(summarizeTodayIntake(metric).proteinCount, oneGram, "Unmapped grams must not impersonate legacy serving quantities");
const takeout = recommendPilotMeals(profile({ eatingStyle: "Mostly takeout" }), context(), "en", now);
assert(takeout.recommendations.every(item => item.reasons.some(reason => reason.includes("Restaurant ingredients and weights are unconfirmed"))));
const zh = recommendPilotMeals(profile(), context({ hunger: "hungry", preferredStaple: "noodles" }), "zh", now, unknownOnly);
assert(zh.eligibleRecipes.every(item => item.reasons.some(reason => reason.includes("並非估算熱量需求")) && (item.recipe.staple === "noodles" || item.reasons.some(reason => reason.includes("此偏好保留彈性"))) && item.unknowns.every(unknown => unknown.reason.includes("未知，並非零"))));

console.log(JSON.stringify({ standardizedRecipes: 108, sourceFoods: sourceFoods.length, pinnedSourceValues: sourceValues, independentChickenGolden: true, independentAllPortionNutrients: true, allPortionFactors: true, missingValuesPropagate: true, sourceStateAndIngredientSafety: true, hardAvoidContexts: avoidTags.length * 108, sharedContextConstraints: true, hungerAndAppetitePortions: true, allEligibleRecipesBrowsable: true, retainedArithmeticDiagnostic: true, officialProfileAndProductScoreSeparated: true, explicitNutrientDirection: true, recordVarietyOnlyEqualPriorityTiers: true, metricPresenceOnlyInLegacy: true, bilingualReasons: true }, null, 2));

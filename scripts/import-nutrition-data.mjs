import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { assertReviewedSourceState, deriveFreeSugars, deriveRecipePreparation } from "./nutrition-model-inputs.mjs";

// Offline only: regenerate the small application subset from pinned USDA bytes.
// Acquiring a different source snapshot is a separate, reviewed operation.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const manifests = await Promise.all([
  "data/nutrition/source-manifest.json",
  "data/nutrition/source-supplement-manifest.json",
  "data/nutrition/source-expansion-manifest.json",
  "data/nutrition/source-expansion-36-manifest.json",
  "data/nutrition/source-expansion-48-manifest.json",
  "data/nutrition/source-expansion-60-manifest.json",
  "data/nutrition/source-expansion-72-manifest.json",
  "data/nutrition/source-expansion-84-manifest.json",
  "data/nutrition/source-expansion-96-manifest.json",
].map(readJson));
const definitions = await readJson("data/nutrition/food-definitions.json");
const recipes = await readJson("data/nutrition/recipes.json");
const modelAssessments = await readJson("data/nutrition/model-assessments.json");
const sourceForFood = new Map();
const rawFoods = [];
for (const manifest of manifests) {
  const snapshotPath = resolve(root, manifest.snapshotPath);
  assert(snapshotPath.startsWith(`${root}/`) || snapshotPath.startsWith(`${root}\\`), "Snapshot must stay inside this repository.");
  const snapshotBytes = await readFile(snapshotPath);
  assert.equal(createHash("sha256").update(snapshotBytes).digest("hex"), manifest.snapshotSha256, "Pinned USDA source bytes changed; review the source and manifest before importing.");
  const records = JSON.parse(snapshotBytes.toString("utf8"));
  assert.deepEqual(records.map(food => food.fdcId).sort(), [...manifest.acquisition.fdcIds].sort(), "Snapshot record IDs do not match its manifest.");
  for (const food of records) {
    assert(!sourceForFood.has(food.fdcId), "Ambiguous food across source snapshots.");
    sourceForFood.set(food.fdcId, manifest);
    rawFoods.push(food);
  }
}
assert.equal(rawFoods.length, definitions.length, "Every archived record must have an explicit definition.");
assert.equal(new Set(definitions.map((food) => food.fdcId)).size, definitions.length, "Duplicate source food definition.");
assert.equal(recipes.length, 130, "This release authorizes exactly one hundred thirty standardized meal recipes.");
assert.equal(new Set(recipes.map((recipe) => recipe.mealId)).size, recipes.length, "Duplicate pilot meal.");

const nutrientDefinitions = {
  kcal: { id: 1008, unit: "kcal" },
  energyKj: { id: 1062, unit: "kJ" },
  protein: { id: 1003, unit: "g" },
  carbs: { id: 1005, unit: "g" },
  fat: { id: 1004, unit: "g" },
  saturatedFat: { id: 1258, unit: "g" },
  fiber: { id: 1079, unit: "g" },
  sodium: { id: 1093, unit: "mg" },
  addedSugar: { id: 1235, unit: "g" },
};
const nutrientKeys = Object.keys(nutrientDefinitions);
const sourceFoods = definitions.map((definition) => {
  const food = rawFoods.find((item) => item.fdcId === definition.fdcId);
  assert(food, `Missing source food ${definition.fdcId}.`);
  const manifest = sourceForFood.get(food.fdcId);
  assert.equal(food.description, definition.description, `Preparation/identity mismatch for ${definition.fdcId}.`);
  assert.equal(food.dataType, "SR Legacy");
  assert.equal(new Date(food.publicationDate).toISOString().slice(0, 10), manifest.recordPublicationDate);
  assertReviewedSourceState(food, definition.state);
  assert(Array.isArray(definition.avoidTags) && definition.avoidTags.every(tag => typeof tag === "string" && tag.trim()), `Missing ingredient avoidance declaration for ${definition.fdcId}.`);
  assert.equal(new Set(definition.avoidTags).size, definition.avoidTags.length, `Duplicate ingredient avoidance in ${definition.fdcId}.`);
  if (definition.unknownAvoidTags !== undefined) {
    assert(Array.isArray(definition.unknownAvoidTags) && definition.unknownAvoidTags.every(tag => typeof tag === "string" && tag.trim()), `Invalid avoidance uncertainty for ${definition.fdcId}.`);
    assert.equal(new Set(definition.unknownAvoidTags).size, definition.unknownAvoidTags.length);
    assert(definition.unknownAvoidTags.every(tag => !definition.avoidTags.includes(tag)), `Conflicting avoidance certainty for ${definition.fdcId}.`);
  }
  const nutrientNotes = {};
  const nutrientsPer100g = Object.fromEntries(nutrientKeys.map((key) => {
    const expected = nutrientDefinitions[key];
    const matches = food.foodNutrients.filter((item) => item.nutrient.id === expected.id);
    assert(matches.length <= 1, `Ambiguous ${key} source value in ${food.fdcId}.`);
    const selected = matches[0];
    if (!selected || selected.amount === null || selected.amount === undefined) {
      nutrientNotes[key] = {
        en: `${key === "addedSugar" ? "Added sugars" : key === "fiber" ? "Dietary fiber" : key} is not supplied in this source record. Unknown is not zero.`,
        zh: `此來源紀錄未提供${key === "addedSugar" ? "添加糖" : key === "fiber" ? "膳食纖維" : key}，未知值不等於零。`,
      };
      return [key, null];
    }
    assert.equal(selected.nutrient.unitName.toLowerCase(), expected.unit.toLowerCase(), `Unit mismatch for ${food.fdcId}/${key}.`);
    assert(typeof selected.amount === "number" && Number.isFinite(selected.amount) && selected.amount >= 0, `Invalid nutrient amount for ${food.fdcId}/${key}; blanks may never become zero.`);
    return [key, selected.amount];
  }));
  const assessment = modelAssessments.foods.find(item => item.fdcId === food.fdcId);
  assert(assessment && [true, false, null].includes(assessment.fvnsEligible), `Missing model classification for ${food.fdcId}.`);
  const freeSugarsPer100g = deriveFreeSugars(food, assessment);
  const fiberMethod = nutrientsPer100g.fiber === null ? "unknown" : "AOAC-compatible";
  const freeSugarNote = freeSugarsPer100g === null
    ? { en: "Free-sugars interpretation is unresolved; this retained historical source is not used by the current scored recipes.", zh: "游離糖判讀尚未解決；此保留的歷史來源不納入目前計分配方。" }
    : assessment.freeSugarBasis === "reported-total-sugars-as-free"
      ? { en: `All ${freeSugarsPer100g} g of source-reported total sugars per 100 g qualify as free sugars under the reviewed ingredient classification. This is a model derivation, not a USDA added-sugars measurement.`, zh: `依已審核食材分類，來源每 100 克的總糖 ${freeSugarsPer100g} 克全部計為游離糖。這是模型推導，並非 USDA 添加糖實測值。` }
      : assessment.freeSugarBasis === "reported-total-sugars-zero"
        ? { en: "The source reports total sugars 0 g per 100 g, supporting a derived free-sugars value of 0 for this exact source estimate. This does not fill the unknown added-sugars field or describe an unspecified substitute.", zh: "來源每 100 克總糖為 0 克，支持此特定來源估算的游離糖推導值為 0；這不會填補未知的添加糖欄位，也不適用於未指定替代品。" }
        : { en: "Free sugars 0 g is derived for the specified plain ingredient with no added sugars, sugar-containing marinades/additives, or fruit/vegetable puree, juice or paste. It is not a USDA added-sugars measurement.", zh: "游離糖 0 克依指定原味食材推導：不含添加糖、含糖醃料或添加物，也不含蔬果泥、汁、醬；這不是 USDA 添加糖實測值。" };
  const modelBasis = {
    freeSugarsPer100g, fvnsEligible: assessment.fvnsEligible, fiberMethod,
    note: {
      en: `${freeSugarNote.en} ${assessment.note?.en ?? ""} ${fiberMethod === "unknown" ? "This source does not supply dietary fiber." : "USDA SR total dietary fiber uses an AOAC-compatible database basis (985.29/991.43); individual values may be calculated or imputed, not individually assayed. This does not establish equivalence to every newer enhanced AOAC assay."} ${assessment.fvnsEligible === null ? "FVNS treatment is unresolved." : assessment.fvnsEligible ? "This ingredient qualifies for FVNS at its documented prepared weight." : "This ingredient contributes to recipe mass, not the FVNS numerator."}`.replace(/ {2,}/g, " "),
      zh: `${freeSugarNote.zh}${assessment.note?.zh ?? ""}${fiberMethod === "unknown" ? "此來源沒有提供膳食纖維。" : "USDA SR 總膳食纖維採 AOAC 相容的資料庫方法基礎（985.29／991.43）；個別數值可能來自計算或推估，並非逐項實測，也不代表與每種較新的增強型 AOAC 檢測完全等同。"}${assessment.fvnsEligible === null ? "FVNS 分類尚未解決。" : assessment.fvnsEligible ? "此食材以標示的處理後重量納入 FVNS。" : "此食材只納入配方總重，不納入 FVNS 分子。"}`,
    },
    sourceUrls: [...new Set([...Object.values(modelAssessments.sources), ...(assessment.sourceUrls ?? []), `https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`])],
  };
  return {
    id: `usda-${food.fdcId}`,
    fdcId: food.fdcId,
    description: food.description,
    label: definition.label,
    state: definition.state,
    avoidTags: definition.avoidTags,
    unknownAvoidTags: definition.unknownAvoidTags ?? [],
    sourceId: manifest.id,
    recordUrl: `https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`,
    publicationDate: manifest.recordPublicationDate,
    nutrientsPer100g,
    nutrientNotes,
    modelBasis,
  };
});
const byId = new Map(sourceFoods.map((food) => [food.id, food]));
const roleGroups = { protein: "protein", vegetable: "vegetable", fruit: "fruit", staple: "carb", fat: "other", seasoning: "other", sauce: "other", liquid: "other" };
const standardizedRecipes = recipes.map((recipe) => {
  assert(["warm", "cool", "flexible"].includes(recipe.temperature));
  assert(["rice", "noodles", "bread", "potato", "other", "none"].includes(recipe.staple));
  assert(["asian", "western"].includes(recipe.cuisine));
  assert(Number.isInteger(recipe.prepMinutes) && recipe.prepMinutes > 0);
  const ingredients = recipe.ingredients.map((ingredient) => {
    const food = byId.get(ingredient.foodId);
    assert(food, `Unmapped ingredient in ${recipe.mealId}: ${ingredient.foodId}.`);
    assert.equal(ingredient.weighedState, food.state, `Raw/cooked weight mismatch in ${recipe.mealId}.`);
    assert(food.modelBasis.freeSugarsPer100g !== null && food.modelBasis.fvnsEligible !== null && food.modelBasis.fiberMethod === "AOAC-compatible", `Incomplete active model input in ${recipe.mealId}: ${food.id}.`);
    assert(Number.isFinite(ingredient.grams) && ingredient.grams > 0 && ingredient.grams <= 1000);
    assert(roleGroups[ingredient.role], `Unmapped ingredient group in ${recipe.mealId}.`);
    const preparation = deriveRecipePreparation(rawFoods.find(item => item.fdcId === food.fdcId), ingredient);
    return { ...ingredient, ...preparation, group: roleGroups[ingredient.role] };
  });
  for (const [field, foodId] of [["oilGrams", "usda-171413"], ["saltGrams", "usda-173468"]]) {
    const actual = ingredients.filter((ingredient) => ingredient.foodId === foodId).reduce((sum, ingredient) => sum + ingredient.grams, 0);
    assert.equal(actual, recipe.seasoning[field], `Oil/salt declaration mismatch in ${recipe.mealId}.`);
  }
  const sauceGrams = ingredients.filter(ingredient => ingredient.role === "sauce").reduce((sum, ingredient) => sum + ingredient.grams, 0);
  assert.equal(recipe.seasoning.sauceGrams, sauceGrams, `Sauces require matching sourced, weighed ingredients in ${recipe.mealId}.`);
  const fvnsStates = new Set(ingredients.filter(item => byId.get(item.foodId).modelBasis.fvnsEligible).map(item => item.weighedState));
  assert.equal(fvnsStates.size, 1, `FVNS ingredients must have one consistent raw/cooked basis in ${recipe.mealId}.`);
  if (recipe.instructions) assert(recipe.instructions.length >= 2 && recipe.instructions.every(step => step.en?.trim() && step.zh?.trim()), `Incomplete bilingual preparation steps in ${recipe.mealId}.`);
  if (recipe.preparationGuide) {
    const guide = recipe.preparationGuide;
    assert(guide.version?.trim() && guide.timingNote?.en?.trim() && guide.timingNote?.zh?.trim(), `Incomplete preparation guide in ${recipe.mealId}.`);
    assert(recipe.instructions?.length >= 5, `A preparation guide needs recipe-specific steps: ${recipe.mealId}.`);
    assert(guide.sources?.length && guide.sources.every(source => source.label?.en?.trim() && source.label?.zh?.trim() && new URL(source.url).protocol === "https:"), `Missing preparation references in ${recipe.mealId}.`);
  }
  return {
    ...recipe,
    version: recipe.version ?? "nextbite-pilot-2026-11-04-v1",
    basis: "standardized-recipe",
    confidence: "recipe-estimate",
    ingredients,
    portions: { small: 0.75, regular: 1, large: 1.25 },
    prepBasis: "assembly-from-prepared-ingredients",
    yieldMethod: "sum-final-ingredient-weights",
    notes: {
      en: `${recipe.notes.en} Model inputs follow each listed ingredient's documented specification and source. Added-sugar unknowns remain unknown; free sugars are derived separately, including weighed honey or juice where listed. FVNS ingredients share a ${[...fvnsStates][0]} weight basis. Assembly time is an editorial estimate starting with the prepared ingredients shown; raw-ingredient cooking time is excluded. Small/regular/large are product choices, not medical serving recommendations.`,
      zh: `${recipe.notes.zh} 模型依各表列食材的規格與來源計算。添加糖未知值保留未知；游離糖另外推導，若列有蜂蜜或果汁，也依重量計入。FVNS 食材統一採${[...fvnsStates][0] === "raw" ? "生重" : "熟重"}。時間是從表列已處理食材開始的組合時間估計，不含從生食材烹煮的時間。小／標準／大份是產品選項，不是醫療建議份量。`,
    },
    instructions: recipe.instructions ?? [
      { en: "Prepare ingredients to the exact raw/cooked/ready-to-eat states shown. Weigh edible parts only, after removing shells, bones, pods or any excluded skin.", zh: "食材須符合表列的生／熟／即食狀態，去除殼、骨、豆莢或註明不食用的皮後，只秤可食部分。" },
      { en: "Assemble the measured ingredients and consume all listed oil, salt and retained liquid. No extra sauce, marinade, sweetener or unmeasured garnish is included in the estimate.", zh: "依重量組合，表列油、鹽與保留湯水皆全數食用。估算不包含額外醬汁、醃料、甜味料或未秤重配料。" },
      { en: "Scale every ingredient, including seasonings and water, by the chosen portion factor. This is a standardized recipe estimate, not a measured restaurant dish or a dietary target.", zh: "依選擇份量倍率縮放每一項食材，連油鹽與水也一併調整。這是定量配方估算，不是餐廳實測值或飲食目標。" },
    ],
  };
});
const nutritionSources = manifests.map(({ acquisition: _acquisition, termsVerifiedAt: _termsVerifiedAt, termsUrl: _termsUrl, ...source }) => source);
const output = `// Generated by scripts/import-nutrition-data.mjs from pinned USDA snapshots.\n// Do not hand-edit nutrient values. Run the importer or --check offline.\nimport type { NutritionSource, SourceFood, StandardizedRecipe } from "./nutrition-types";\n\nexport const nutrientKeys = ${JSON.stringify(nutrientKeys)} as const;\n\nexport const nutritionSources: NutritionSource[] = ${JSON.stringify(nutritionSources, null, 2)};\n\nexport const sourceFoods: SourceFood[] = ${JSON.stringify(sourceFoods, null, 2)};\n\nexport const standardizedRecipes: StandardizedRecipe[] = ${JSON.stringify(standardizedRecipes, null, 2)};\n`;
const outputPath = resolve(root, "src/nutrition-data.ts");
if (process.argv.includes("--check")) {
  assert.equal(await readFile(outputPath, "utf8"), output, "Generated nutrition subset differs from the pinned source. Run the offline importer and review the change.");
} else await writeFile(outputPath, output, "utf8");
console.log(JSON.stringify({ snapshots: manifests.map(source => ({ path: source.snapshotPath, sha256: source.snapshotSha256 })), sourceRecords: sourceFoods.length, recipes: standardizedRecipes.length, runtimeNutritionRequests: 0, unknownAddedSugarRecords: sourceFoods.filter((food) => food.nutrientsPer100g.addedSugar === null).length, unknownFiberRecords: sourceFoods.filter((food) => food.nutrientsPer100g.fiber === null).map((food) => food.fdcId), activeRecipesModelComplete: true, mode: process.argv.includes("--check") ? "verified" : "generated" }, null, 2));

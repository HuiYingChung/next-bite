import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Offline only: regenerate the small application subset from pinned USDA bytes.
// Acquiring a different source snapshot is a separate, reviewed operation.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const manifest = await readJson("data/nutrition/source-manifest.json");
const definitions = await readJson("data/nutrition/food-definitions.json");
const recipes = await readJson("data/nutrition/recipes.json");
const snapshotPath = resolve(root, manifest.snapshotPath);
assert(snapshotPath.startsWith(`${root}/`) || snapshotPath.startsWith(`${root}\\`), "Snapshot must stay inside this repository.");
const snapshotBytes = await readFile(snapshotPath);
const snapshotHash = createHash("sha256").update(snapshotBytes).digest("hex");
assert.equal(snapshotHash, manifest.snapshotSha256, "The pinned USDA source bytes changed. Review the source and manifest before importing.");
const rawFoods = JSON.parse(snapshotBytes.toString("utf8"));
assert.equal(rawFoods.length, definitions.length, "Every archived record must have an explicit definition.");
assert.equal(new Set(definitions.map((food) => food.fdcId)).size, definitions.length, "Duplicate source food definition.");
assert.equal(recipes.length, 12, "This release authorizes exactly twelve standardized meal recipes.");
assert.equal(new Set(recipes.map((recipe) => recipe.mealId)).size, recipes.length, "Duplicate pilot meal.");

const nutrientDefinitions = {
  kcal: { id: 1008, unit: "kcal" },
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
  assert.equal(food.description, definition.description, `Preparation/identity mismatch for ${definition.fdcId}.`);
  assert.equal(food.dataType, "SR Legacy");
  assert.equal(new Date(food.publicationDate).toISOString().slice(0, 10), manifest.recordPublicationDate);
  assert(["cooked", "raw", "ready-to-eat"].includes(definition.state));
  if (definition.state === "cooked") assert(/cooked|prepared/i.test(food.description), `No cooked-state evidence for ${definition.fdcId}.`);
  if (definition.state === "raw") assert(/raw/i.test(food.description), `No raw-state evidence for ${definition.fdcId}.`);
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
  return {
    id: `usda-${food.fdcId}`,
    fdcId: food.fdcId,
    description: food.description,
    label: definition.label,
    state: definition.state,
    sourceId: manifest.id,
    recordUrl: `https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`,
    publicationDate: manifest.recordPublicationDate,
    nutrientsPer100g,
    nutrientNotes,
  };
});
const byId = new Map(sourceFoods.map((food) => [food.id, food]));
const roleGroups = { protein: "protein", vegetable: "vegetable", staple: "carb", fat: "other", seasoning: "other", liquid: "other" };
const standardizedRecipes = recipes.map((recipe) => {
  assert(["warm", "cool", "flexible"].includes(recipe.temperature));
  assert(["rice", "noodles", "bread", "potato", "other", "none"].includes(recipe.staple));
  assert(["asian", "western"].includes(recipe.cuisine));
  assert(Number.isInteger(recipe.prepMinutes) && recipe.prepMinutes > 0);
  const ingredients = recipe.ingredients.map((ingredient) => {
    const food = byId.get(ingredient.foodId);
    assert(food, `Unmapped ingredient in ${recipe.mealId}: ${ingredient.foodId}.`);
    assert.equal(ingredient.weighedState, food.state, `Raw/cooked weight mismatch in ${recipe.mealId}.`);
    assert(Number.isFinite(ingredient.grams) && ingredient.grams > 0 && ingredient.grams <= 1000);
    assert(roleGroups[ingredient.role], `Unmapped ingredient group in ${recipe.mealId}.`);
    return { ...ingredient, group: roleGroups[ingredient.role] };
  });
  for (const [field, foodId] of [["oilGrams", "usda-171413"], ["saltGrams", "usda-173468"]]) {
    const actual = ingredients.filter((ingredient) => ingredient.foodId === foodId).reduce((sum, ingredient) => sum + ingredient.grams, 0);
    assert.equal(actual, recipe.seasoning[field], `Oil/salt declaration mismatch in ${recipe.mealId}.`);
  }
  assert.equal(recipe.seasoning.sauceGrams, 0, "Pilot sauces require their own sourced, weighed ingredient records.");
  return {
    ...recipe,
    version: "nextbite-pilot-2026-11-04-v1",
    basis: "standardized-recipe",
    confidence: "recipe-estimate",
    ingredients,
    portions: { small: 0.75, regular: 1, large: 1.25 },
    prepBasis: "assembly-from-prepared-ingredients",
    yieldMethod: "sum-final-ingredient-weights",
    notes: {
      en: `${recipe.notes.en} Assembly time is an editorial estimate starting with the prepared ingredients shown; raw-ingredient cooking time is excluded. Small/regular/large are product choices, not medical serving recommendations. Added-sugar data remain unknown.`,
      zh: `${recipe.notes.zh} 時間是從表列已處理食材開始的組合時間估計，不含從生食材烹煮的時間。小／標準／大份是產品選項，不是醫療建議份量。添加糖資料維持未知。`,
    },
    instructions: [
      { en: "Prepare ingredients to the exact raw/cooked/ready-to-eat states shown. Weigh edible parts only, after removing shells, bones, pods or any excluded skin.", zh: "食材須符合表列的生／熟／即食狀態，去除殼、骨、豆莢或註明不食用的皮後，只秤可食部分。" },
      { en: "Assemble the measured ingredients and consume all listed oil, salt and retained liquid. No extra sauce, marinade, sweetener or unmeasured garnish is included in the estimate.", zh: "依重量組合，表列油、鹽與保留湯水皆全數食用。估算不包含額外醬汁、醃料、甜味料或未秤重配料。" },
      { en: "Scale every ingredient, including seasonings and water, by the chosen portion factor. This is a standardized recipe estimate, not a measured restaurant dish or a dietary target.", zh: "依選擇份量倍率縮放每一項食材，連油鹽與水也一併調整。這是定量配方估算，不是餐廳實測值或飲食目標。" },
    ],
  };
});
const { acquisition: _acquisition, termsVerifiedAt: _termsVerifiedAt, termsUrl: _termsUrl, ...nutritionSource } = manifest;
const output = `// Generated by scripts/import-nutrition-data.mjs from a pinned USDA snapshot.\n// Do not hand-edit nutrient values. Run the importer or --check offline.\nimport type { NutritionSource, SourceFood, StandardizedRecipe } from "./nutrition-types";\n\nexport const nutrientKeys = ${JSON.stringify(nutrientKeys)} as const;\n\nexport const nutritionSources: NutritionSource[] = ${JSON.stringify([nutritionSource], null, 2)};\n\nexport const sourceFoods: SourceFood[] = ${JSON.stringify(sourceFoods, null, 2)};\n\nexport const standardizedRecipes: StandardizedRecipe[] = ${JSON.stringify(standardizedRecipes, null, 2)};\n`;
const outputPath = resolve(root, "src/nutrition-data.ts");
if (process.argv.includes("--check")) {
  assert.equal(await readFile(outputPath, "utf8"), output, "Generated nutrition subset differs from the pinned source. Run the offline importer and review the change.");
} else await writeFile(outputPath, output, "utf8");
console.log(JSON.stringify({ snapshotSha256: snapshotHash, sourceRecords: sourceFoods.length, recipes: standardizedRecipes.length, runtimeNutritionRequests: 0, unknownAddedSugarRecords: sourceFoods.filter((food) => food.nutrientsPer100g.addedSugar === null).length, unknownFiberRecords: sourceFoods.filter((food) => food.nutrientsPer100g.fiber === null).map((food) => food.fdcId), mode: process.argv.includes("--check") ? "verified" : "generated" }, null, 2));

import { sourceFoods, standardizedRecipes } from "./nutrition-data";
import { resolveFoodIdentity } from "./food-identity";
import type { SourceFood, StandardizedRecipe } from "./nutrition-types";
import type { MealOption, MealSafetyMetadata, MustAvoidTag, Recommendation } from "./types";

const recipeById = new Map(standardizedRecipes.map(recipe => [recipe.mealId, recipe]));
const foodById = new Map(sourceFoods.map(food => [food.id, food]));

/** A version marks a measured formulation, never an old saved meal idea. */
export const getCatalogRecipe = (meal: Pick<MealOption, "id" | "recipeVersion">): StandardizedRecipe | undefined => {
  const recipe = recipeById.get(meal.id);
  return recipe && recipe.version === meal.recipeVersion ? recipe : undefined;
};

export const buildRecipeSafetyMetadata = (recipe: StandardizedRecipe, foods: SourceFood[] = sourceFoods): MealSafetyMetadata => {
  const byId = new Map(foods.map(food => [food.id, food]));
  const contains = new Set<MustAvoidTag>();
  const unknown = new Set<MustAvoidTag>();
  for (const ingredient of recipe.ingredients.filter(item => item.grams > 0)) {
    const food = byId.get(ingredient.foodId);
    if (!food || !Array.isArray(food.avoidTags)) throw new Error(`Missing reviewed ingredient safety: ${ingredient.foodId}`);
    food.avoidTags.forEach(tag => contains.add(tag));
    food.unknownAvoidTags?.forEach(tag => unknown.add(tag));
    if (ingredient.weighedState === "raw") contains.add("Raw food");
  }
  if (recipe.temperature === "cool") contains.add("Cold food");
  if (recipe.temperature === "flexible") unknown.add("Cold food");
  return { contains: [...contains], mayContain: [], unknown: [...unknown].filter(tag => !contains.has(tag)) };
};

// These are format and preparation descriptions. Old conceptual titles and
// cuisine associations must not confer styles on a different actual recipe.
const recipeTags = (recipe: StandardizedRecipe): string[] => {
  const title = recipe.label.en.toLowerCase();
  const tags = new Set<string>();
  if (recipe.temperature === "warm") tags.add("warm");
  if (recipe.staple === "rice") tags.add("rice-based");
  if (recipe.staple === "noodles") tags.add("noodle-based");
  if (/\bbowl\b/.test(title)) tags.add("bowl");
  if (/\bplate\b/.test(title)) tags.add("plate");
  if (/\bsoup\b|\bporridge\b|\bcongee\b/.test(title)) tags.add("soupy");
  if (/\bsandwich\b/.test(title)) tags.add("sandwich");
  const proteins = recipe.ingredients.filter(item => item.role === "protein" && item.grams > 0)
    .map(item => { const food = foodById.get(item.foodId); return food ? resolveFoodIdentity(food.label.en, food.id, undefined, item.group).protein : null; });
  if (proteins.length && proteins.every(protein => protein === "soy" || protein === "pulses")) tags.add("plant-protein");
  return [...tags];
};

/** Current catalog identity and safety come from the same measured recipe. */
export const recipeRecommendationDataset: Recommendation[] = standardizedRecipes.map(recipe => ({
  id: recipe.mealId,
  recipeVersion: recipe.version,
  title: recipe.label.en,
  description: recipe.notes.en,
  tags: recipeTags(recipe),
  // Compatibility fields for the retired template scorer. They are neutral,
  // are never displayed as nutrient facts, and do not enter recipe scoring.
  proteinLevel: "medium", vegetableLevel: "medium", carbLevel: "medium", heaviness: "medium",
  convenience: recipe.prepMinutes <= 10 ? "high" : "medium",
  worksFor: ["home-cooked"], mealType: "balanced", fairnessExposureAdjustment: 0,
  safety: buildRecipeSafetyMetadata(recipe),
  evidence: {
    confidence: "medium",
    sourceIds: ["usda-fdc", "nextbite-editorial"],
    reviewedOn: "",
    method: "Recipe estimates from stated edible ingredient weights and pinned USDA records. Nutrient composition uses UK NPM 2018; preference points are product rules, not a personal nutrition or health assessment.",
    assumption: recipe.notes.en,
  },
}));

import { standardizedRecipes } from "./nutrition-data";
import { calculateRecipe } from "./nutrition";
import type { RecipeCalculation } from "./nutrition";
import type { NutritionPortion, StandardizedRecipe } from "./nutrition-types";
import type { Locale } from "./types";

export type ReadyRecipeCardRequest = {
  status: "ready";
  recipe: StandardizedRecipe;
  portion: NutritionPortion;
  locale: Locale;
  calculation: RecipeCalculation;
};

export type RecipeCardRequest = ReadyRecipeCardRequest | {
  status: "unavailable";
  locale: Locale;
};

const recipeById = new Map(standardizedRecipes.map(recipe => [recipe.mealId, recipe]));
const cardParameters = ["recipe", "version", "portion", "lang"] as const;
const isPortion = (value: string): value is NutritionPortion => value === "small" || value === "regular" || value === "large";

/** Resolve only public recipe identity and display choices, independently of saved user state. */
export function parseRecipeCardRequest(search: string): RecipeCardRequest | null {
  const params = new URLSearchParams(search);
  if (!params.has("recipe")) return null;

  const locale: Locale = params.get("lang") === "zh" ? "zh" : "en";
  const unavailable: RecipeCardRequest = { status: "unavailable", locale };
  // Reject ambiguous links instead of letting first/last-value behavior select a recipe.
  if (cardParameters.some(parameter => params.getAll(parameter).length > 1)) return unavailable;

  const recipe = recipeById.get(params.get("recipe") ?? "");
  const portion = params.get("portion") ?? "regular";
  if (!recipe || !isPortion(portion)) return unavailable;
  if (params.has("version") && params.get("version") !== recipe.version) return unavailable;

  return {
    status: "ready",
    recipe,
    portion,
    locale,
    calculation: calculateRecipe(recipe, portion, locale),
  };
}

/** Build a shareable URL with current public recipe data and no inherited query or fragment. */
export function createRecipeCardUrl(
  recipe: StandardizedRecipe,
  portion: NutritionPortion,
  locale: Locale,
  baseUrl: string,
): string {
  const currentRecipe = recipeById.get(recipe.mealId);
  if (!currentRecipe || currentRecipe.version !== recipe.version) {
    throw new RangeError("The recipe card requires a current published recipe version.");
  }
  if (!isPortion(portion) || (locale !== "en" && locale !== "zh")) {
    throw new RangeError("Unsupported recipe card portion or language.");
  }

  const url = new URL(baseUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("Recipe card URLs require an HTTP or HTTPS base URL.");
  }
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  url.searchParams.set("recipe", currentRecipe.mealId);
  url.searchParams.set("version", currentRecipe.version);
  url.searchParams.set("portion", portion);
  url.searchParams.set("lang", locale);
  return url.toString();
}

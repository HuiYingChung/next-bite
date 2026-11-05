import type { MealContext } from "./meal-context";
import { standardizedRecipes } from "./nutrition-data";

export type RecipeStapleAvailability = {
  staple: MealContext["preferredStaple"];
  status: "unselected" | "available" | "absent" | "excluded";
  catalogMatches: number;
  eligibleMatches: number;
};

/**
 * Coverage is separate from ranking: a matching recipe can be eligible without
 * reaching the top three. Use the engine's complete eligible-ID trace so this
 * notice never bypasses hard avoids, meal conditions or data completeness.
 */
export function getRecipeStapleAvailability(
  preferredStaple: MealContext["preferredStaple"],
  eligibleRecipeIds: readonly string[],
): RecipeStapleAvailability {
  if (preferredStaple === "any") {
    return {
      staple: preferredStaple,
      status: "unselected",
      catalogMatches: 0,
      eligibleMatches: 0,
    };
  }
  const matches = standardizedRecipes.filter(
    recipe => recipe.staple === preferredStaple,
  );
  const eligibleIds = new Set(eligibleRecipeIds);
  const eligibleMatches = matches.filter(recipe =>
    eligibleIds.has(recipe.mealId),
  ).length;
  return {
    staple: preferredStaple,
    status: !matches.length ? "absent" : eligibleMatches ? "available" : "excluded",
    catalogMatches: matches.length,
    eligibleMatches,
  };
}

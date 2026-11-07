import type { Locale } from "./types";
import { recipeImageEntries } from "./recipe-images.generated";

export type RecipeImageIdentity = { mealId: string; version: string };

export type RecipeImageAsset = {
  recipeVersion: string;
  src: string;
  srcSet: string;
  alt: Record<Locale, string>;
};

function asset(
  basename: string,
  recipeVersion: string,
  alt: Record<Locale, string>,
): RecipeImageAsset {
  const path = `/images/recipes/${basename}`;
  return {
    recipeVersion,
    src: `${path}-480.webp`,
    srcSet: `${path}-480.webp 480w, ${path}-960.webp 960w`,
    alt,
  };
}

// Presentation only. Exact versions prevent a legacy recipe with the same ID
// from borrowing an illustration of different ingredients.
const recipeImages: Readonly<Record<string, RecipeImageAsset>> = Object.fromEntries(
  recipeImageEntries.map(({ mealId, basename, recipeVersion, alt }) => [
    mealId,
    asset(basename, recipeVersion, alt),
  ]),
);

export function getRecipeImage(
  recipe: RecipeImageIdentity | null | undefined,
): RecipeImageAsset | undefined {
  if (!recipe) return undefined;
  const image = recipeImages[recipe.mealId];
  return image?.recipeVersion === recipe.version ? image : undefined;
}

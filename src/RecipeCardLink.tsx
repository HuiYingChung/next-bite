import { createRecipeCardUrl } from "./recipe-card-route";
import type { NutritionPortion, StandardizedRecipe } from "./nutrition-types";
import type { Locale } from "./types";

export const PUBLIC_APP_URL = "https://mealhatch.vercel.app/";

/** A public recipe link carries no records, saved preferences or session keys. */
export function RecipeCardLink({ recipe, portion, locale }: {
  recipe: StandardizedRecipe;
  portion: NutritionPortion;
  locale: Locale;
}) {
  const baseUrl = typeof window === "undefined" ? PUBLIC_APP_URL : window.location.href;
  return <a className="text-button recipe-card-link" href={createRecipeCardUrl(recipe, portion, locale, baseUrl)} target="_blank" rel="noopener noreferrer">
    {locale === "en" ? "Recipe card" : "食譜卡"}
    <span className="sr-only">{locale === "en" ? " (opens a new tab)" : "（開啟新分頁）"}</span>
  </a>;
}

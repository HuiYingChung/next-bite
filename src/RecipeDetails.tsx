import { NutritionDetails } from "./NutritionDetails";
import { RecommendationScore } from "./RecommendationScore";
import type { PilotRecommendation, RecipeCalculation } from "./nutrition";
import type { NutritionPortion, StandardizedRecipe } from "./nutrition-types";
import type { Locale } from "./types";

/** One details view for both a recommended recipe and an inspected catalog entry. */
export function RecipeDetails({ recipe, portion, calculation, recommendation, locale }: {
  recipe: StandardizedRecipe;
  portion: NutritionPortion;
  calculation: RecipeCalculation;
  recommendation?: PilotRecommendation;
  locale: Locale;
}) {
  return <>
    {recommendation && <RecommendationScore rec={recommendation} locale={locale} />}
    <NutritionDetails recommendation={{ ...calculation, recipe, portion }} locale={locale} />
    <details className="action-tip">
      <summary>{locale === "en" ? "Make it happen" : "接下來怎麼準備"}</summary>
      <ol>{recipe.instructions.map((step, index) => <li key={index}>{step[locale]}</li>)}</ol>
    </details>
  </>;
}

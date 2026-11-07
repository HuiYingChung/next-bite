import { NutritionDetails } from "./NutritionDetails";
import { RecommendationScore } from "./RecommendationScore";
import { recipeTimeExplanation } from "./recipe-time";
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
      <p className="small muted recipe-time-note">{locale === "en" ? `Estimated assembly: ${recipe.prepMinutes} minutes. ` : `預估組合時間：${recipe.prepMinutes} 分鐘。`}{recipe.preparationGuide?.timingNote[locale] ?? recipeTimeExplanation(locale)}</p>
      <ol>{recipe.instructions.map((step, index) => <li key={index}>{step[locale]}</li>)}</ol>
      {recipe.preparationGuide && <div className="recipe-preparation-sources">
        <p className="small muted">{locale === "en" ? "Cooking and food-handling references" : "烹調與食材處理參考"}</p>
        <ul>{recipe.preparationGuide.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label[locale]}</a></li>)}</ul>
      </div>}
    </details>
  </>;
}

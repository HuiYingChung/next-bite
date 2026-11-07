import { useEffect } from "react";
import { RecipeCard } from "./RecipeCard";
import { createRecipeCardUrl } from "./recipe-card-route";
import type { RecipeCardRequest } from "./recipe-card-route";
import { PUBLIC_APP_URL } from "./RecipeCardLink";

export function RecipeCardEntry({ request }: { request: NonNullable<RecipeCardRequest> }) {
  const title = request.status === "ready" ? request.recipe.label[request.locale]
    : request.locale === "zh" ? "無法取得這份食譜" : "Recipe unavailable";
  useEffect(() => {
    document.title = `${title} | MealHatch`;
    document.documentElement.lang = request.locale === "zh" ? "zh-Hant" : "en";
    document.querySelector('meta[name="robots"]')?.setAttribute("content", "noindex, follow");
  }, [title, request.locale]);

  const backUrl = new URL(window.location.pathname, window.location.origin).toString();
  if (request.status === "unavailable") return <main className="recipe-card-unavailable">
    <p className="recipe-card-brand">MealHatch</p>
    <h1>{title}</h1>
    <p>{request.locale === "zh" ? "這個連結的配方、版本或份量無法取得。請回到網站重新選取食譜。" : "The recipe, version or portion in this link is unavailable. Return to MealHatch to select a recipe."}</p>
    <a href={backUrl}>{request.locale === "zh" ? "回到 MealHatch" : "Back to MealHatch"}</a>
  </main>;

  return <RecipeCard recipe={request.recipe} portion={request.portion} locale={request.locale}
    calculation={request.calculation} backUrl={backUrl}
    recipeUrl={createRecipeCardUrl(request.recipe, request.portion, request.locale, PUBLIC_APP_URL)} />;
}

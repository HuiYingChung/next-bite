import { useMemo, useState } from "react";
import { Drawer } from "./Drawer";
import { RecipeDetails } from "./RecipeDetails";
import { RecipeImage } from "./RecipeImage";
import { RecipeCardLink } from "./RecipeCardLink";
import { RecipeFitSummary, RecipeRankingNote, recipeMatchLabel } from "./DashboardInsights";
import { recipeTimeLabel, recipeTimeExplanation } from "./recipe-time";
import { getPortionPreference } from "./meal-context";
import type { MealContext } from "./meal-context";
import { calculateRecipe } from "./nutrition";
import type { PilotRecommendation, PilotResult } from "./nutrition";
import { sourceFoods, standardizedRecipes } from "./nutrition-data";
import type { PlannedMeal } from "./launch-state";
import { label } from "./presentation";
import { recipeDisplayName } from "./recipe-name";
import type { Locale } from "./types";

const text = (locale: Locale, en: string, zh: string) => locale === "en" ? en : zh;
const foods = new Map(sourceFoods.map(food => [food.id, food]));
const recipeSearchText = new Map(standardizedRecipes.map(recipe => [recipe.mealId,
  [recipe.label.en, recipe.label.zh, ...recipe.ingredients.flatMap(ingredient => {
    const food = foods.get(ingredient.foodId);
    return food ? [food.label.en, food.label.zh] : [];
  })].join(" ").toLowerCase(),
]));

function exclusionText(exclusion: PilotResult["trace"]["exclusions"][number] | undefined, locale: Locale) {
  if (exclusion?.stage === "hard-avoid") {
    const tags = [...new Set(exclusion.reasons.map(reason => reason.split(":")[0]))];
    return text(locale, "Excluded by your avoids: ", "因避開設定排除：") + tags.map(tag => label(tag, locale)).join(text(locale, ", ", "、"));
  }
  if (exclusion?.stage === "context") return exclusion.reasons.map(reason =>
    reason === "warm-temperature-not-confirmed"
      ? text(locale, "Does not meet the warm-meal condition.", "不符合溫熱餐點條件。")
      : reason === "preparation-total-time-unknown"
        ? text(locale, "Ingredients still need preparation, but full cooking time is unknown. Remove the time limit or return when ingredients are ready.", "食材仍需處理，但完整烹調時間未知。請移除時間上限，或等食材備妥後再選餐。")
      : text(locale, "Does not meet the preparation-time limit.", "不符合準備時間上限。"),
  ).join(" ");
  return text(locale, "Required recipe or scoring data are incomplete.", "必要配方或計分資料不完整。");
}

export function RecipeLibrary({ result, context, locale, plans, busy, onPortionChange, onChoose, onAdjustConditions }: {
  result: PilotResult;
  context: MealContext;
  locale: Locale;
  plans: PlannedMeal[];
  busy: boolean;
  onPortionChange: (appetite: MealContext["appetite"]) => void;
  onChoose: (recommendation: PilotRecommendation) => Promise<boolean>;
  onAdjustConditions: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const eligible = new Map(result.eligibleRecipes.map((recipe, index) => [recipe.meal.id, { recipe, rank: index + 1 }]));
  const exclusions = new Map(result.trace.exclusions.map(exclusion => [exclusion.mealId, exclusion]));
  const recipes = [...standardizedRecipes].sort((a, b) =>
    (eligible.get(a.mealId)?.rank ?? Infinity) - (eligible.get(b.mealId)?.rank ?? Infinity)
      || a.label[locale].localeCompare(b.label[locale], locale === "en" ? "en" : "zh-Hant"),
  ).filter(recipe => recipeSearchText.get(recipe.mealId)?.includes(query.trim().toLowerCase()));
  const selectedRecipe = standardizedRecipes.find(recipe => recipe.mealId === selectedId);
  const selectedOption = selectedId ? eligible.get(selectedId)?.recipe : undefined;
  // The portion the engine actually used, so hunger with "Large portions" kept out shows the same amounts as the options.
  const portion = result.eligibleRecipes[0]?.portion ?? getPortionPreference(context).portion;
  const calculation = useMemo(() => selectedRecipe
    ? calculateRecipe(selectedRecipe, portion, locale) : null, [selectedRecipe, portion, locale]);
  const saved = selectedRecipe && plans.some(plan => plan.mealId === selectedRecipe.mealId
    && plan.portion === portion && plan.recipeVersion === selectedRecipe.version);
  const portionControl = <label className="recipe-library-portion">
    {text(locale, "Portion to explore", "想探索的份量")}
    <select value={context.appetite} onChange={event => {
      setSaveMessage("");
      onPortionChange(event.target.value as MealContext["appetite"]);
    }}>
      <option value="unspecified">{text(locale, "Suggest from my hunger", "依飢餓感建議")}</option>
      <option value="small">{text(locale, "Smaller · 0.75×", "較小份 · 0.75 倍")}</option>
      <option value="regular">{text(locale, "Standard · 1×", "標準份 · 1 倍")}</option>
      <option value="large">{text(locale, "Larger · 1.25×", "較大份 · 1.25 倍")}</option>
    </select>
  </label>;

  return <section className="panel recipe-library" aria-labelledby="recipe-library-title">
    <h2 id="recipe-library-title" tabIndex={-1}>{text(locale, `${standardizedRecipes.length} recipes with nutrition & portions`, `${standardizedRecipes.length} 道附營養與份量配方`)}</h2>
    <p className="muted">{text(locale,
      "Browse every recipe, including those outside the current suggestions. Your current preferences come first; excluded recipes can be inspected but cannot be chosen.",
      "可查看全部配方，包含目前這組建議之外的選項。優先依本餐偏好排序；被排除的配方仍可查看，但無法選入計畫。",
    )}</p>
    <div className="recipe-library-controls">
      <label>{text(locale, "Find a recipe or ingredient", "搜尋配方或食材")}
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={text(locale, "Try noodles, chicken, or beans", "試試麵、雞肉或豆類")} />
      </label>
      {portionControl}
    </div>
    <div className="recipe-library-summary">
      <p className="small muted" role="status">{text(locale,
        `${recipes.length} of ${standardizedRecipes.length} shown · ${result.candidateCount} eligible under current conditions`,
        `顯示 ${standardizedRecipes.length} 道中的 ${recipes.length} 道 · 目前條件下有 ${result.candidateCount} 道可選`,
      )}</p>
      <button type="button" className="text-button" onClick={onAdjustConditions}>{text(locale, "Adjust meal conditions", "調整選餐條件")}</button>
    </div>
    <RecipeRankingNote rec={result.eligibleRecipes[0]} locale={locale} />
    <details className="recipe-time-help">
      <summary>{text(locale, "About assembly times", "關於組合時間")}</summary>
      <p className="small muted">{recipeTimeExplanation(locale)}</p>
    </details>
    {recipes.length === 0 && <p>{text(locale, "No recipes match this search. Try another ingredient or clear the search.", "沒有符合搜尋的配方。試試其他食材或清除搜尋。")}</p>}
    <div className="recipe-library-grid">
      {recipes.map(recipe => {
        const option = eligible.get(recipe.mealId);
        const hasPreferences = option && option.recipe.score.currentPreference.selected + option.recipe.score.savedPreference.selected > 0;
        return <article key={recipe.mealId} className="recipe-library-card">
          {(!option || hasPreferences) && <p className="small muted">{option ? recipeMatchLabel(option.recipe, locale) : text(locale, "Excluded under current conditions", "目前條件下已排除")}</p>}
          <div className="recipe-library-card-heading">
            <RecipeImage recipe={recipe} locale={locale} />
            <h3>{recipeDisplayName(recipe, locale)}</h3>
          </div>
          <p className="small muted recipe-time-label">{recipeTimeLabel(recipe.prepMinutes, context.ingredientReadiness, locale)}</p>
          <button type="button" className="button quiet" aria-haspopup="dialog" aria-label={text(locale, `View recipe: ${recipeDisplayName(recipe, "en")}`, `查看配方：${recipeDisplayName(recipe, "zh")}`)} onClick={() => { setSelectedId(recipe.mealId); setSaveMessage(""); }}>
            {text(locale, "View recipe", "查看配方")}
          </button>
        </article>;
      })}
    </div>
    <Drawer open={Boolean(selectedRecipe)} title={(selectedRecipe ? recipeDisplayName(selectedRecipe, locale) : undefined) ?? text(locale, "Recipe details", "配方詳細資料")} closeLabel={text(locale, "Close recipe", "關閉配方")} onClose={() => setSelectedId(null)}>
      {selectedRecipe && calculation && <div className="recipe-library-detail">
        <RecipeImage recipe={selectedRecipe} locale={locale} variant="detail" />
        {portionControl}
        <p className="small muted">{text(locale,
          "Portions scale the listed recipe. They do not estimate your energy needs; per-100-g scores stay the same.",
          "份量依列出的配方等比例調整，不推算個人熱量需求；每百克分數維持相同。",
        )}</p>
        {selectedOption && <RecipeFitSummary rec={selectedOption} locale={locale} />}
        {!selectedOption && <p className="notice" role="status">{exclusionText(exclusions.get(selectedRecipe.mealId), locale)}</p>}
        <button type="button" className="button primary full-width" disabled={busy || !selectedOption} onClick={async () => {
          if (!selectedOption) return;
          if (await onChoose(selectedOption)) setSaveMessage(text(locale, "Saved to your next-meal plans. It isn't recorded as eaten.", "已儲存到下一餐計畫，尚未加入已吃紀錄。"));
          else setSaveMessage(text(locale, "Could not save this plan. Close the recipe to review the message and try again.", "本次未儲存計畫。請關閉配方查看訊息後重試。"));
        }}>{!selectedOption ? text(locale, "Not available under current conditions", "目前條件下無法選擇") : saved ? text(locale, "Saved to plans", "已儲存到計畫") : text(locale, "Choose this meal", "就選這道")}</button>
        <p role="status" className="small recipe-save-message">{saveMessage}</p>
        <RecipeCardLink recipe={selectedRecipe} portion={portion} locale={locale} />
        <RecipeDetails recipe={selectedRecipe} portion={portion} calculation={calculation} recommendation={selectedOption} locale={locale} />
      </div>}
    </Drawer>
  </section>;
}

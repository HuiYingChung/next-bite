import { nutrientUnits } from "./nutrition";
import type { PilotRecommendation } from "./nutrition";
import { nutritionSources } from "./nutrition-data";
import type { NutrientKey } from "./nutrition-types";
import { recipeDisplayName } from "./recipe-name";
import type { Locale } from "./types";

type NutritionDetailsProps = {
  recommendation: Pick<PilotRecommendation,
    "recipe" | "portion" | "nutrition" | "ingredientAmounts" | "sourceIds" | "unknowns" | "portionGrams"
  >;
  locale: Locale;
};

const text = (locale: Locale, en: string, zh: string) =>
  locale === "en" ? en : zh;

const nutrientLabels: Record<NutrientKey, [string, string]> = {
  kcal: ["Energy", "熱量"],
  energyKj: ["Energy (kJ)", "能量（kJ）"],
  protein: ["Protein", "蛋白質"],
  carbs: ["Carbohydrate", "碳水化合物"],
  fat: ["Total fat", "總脂肪"],
  saturatedFat: ["Saturated fat", "飽和脂肪"],
  fiber: ["Fiber", "膳食纖維"],
  sodium: ["Sodium", "鈉"],
  addedSugar: ["Added sugar", "添加糖"],
};

const remainingNutrients: NutrientKey[] = [
  "carbs",
  "fat",
  "saturatedFat",
  "sodium",
  "addedSugar",
];
const portionLabels = {
  small: ["Smaller portion", "較小份"],
  regular: ["Standard portion", "標準份"],
  large: ["Larger portion", "較大份"],
} as const;

/** Presents the engine's recipe estimates; it never fills missing values or recalculates nutrition. */
export function NutritionDetails({
  recommendation,
  locale,
}: NutritionDetailsProps) {
  const { nutrition, recipe, ingredientAmounts } = recommendation;
  const unknown = text(locale, "Unknown", "未知");
  const number = (value: number, integer = false) =>
    new Intl.NumberFormat(locale === "zh" ? "zh-TW" : "en-US", {
      maximumFractionDigits: integer ? 0 : 1,
    }).format(value);
  const quantity = (value: number, integer = false) =>
    value > 0 && value < (integer ? 1 : 0.1)
      ? `<${integer ? "1" : "0.1"}`
      : number(value, integer);
  const unknownReason = (nutrient: NutrientKey) => {
    const missing = recommendation.unknowns.find(
      (item) => item.nutrient === nutrient,
    );
    const notes = ingredientAmounts
      .filter(
        (ingredient) =>
          !missing || missing.missingFoodIds.includes(ingredient.foodId),
      )
      .flatMap((ingredient) => {
        const note = ingredient.food?.nutrientNotes[nutrient];
        return note ? [note[locale]] : [];
      });
    return (
      [...new Set(notes)].join(" ") ||
      missing?.reason ||
      text(
        locale,
        "The ingredient records do not provide a complete value for this nutrient.",
        "食材紀錄未提供這項營養素的完整數值。",
      )
    );
  };
  const nutrientValue = (key: NutrientKey) =>
    nutrition[key] === null
      ? unknown
      : `${quantity(nutrition[key], key === "kcal" || key === "sodium")} ${nutrientUnits[key]}`;
  const dataSources = nutritionSources.filter((source) =>
    recommendation.sourceIds.includes(source.id),
  );
  const matchedIngredients = ingredientAmounts.filter(
    (ingredient) => ingredient.food !== null,
  ).length;
  const renderNutrient = (key: NutrientKey) => (
    <div className="nutrition-value" key={key}>
      <dt>{text(locale, ...nutrientLabels[key])}</dt>
      <dd>
        {nutrientValue(key)}
        {nutrition[key] === null && (
          <small className="nutrition-unknown-reason">
            {unknownReason(key)}
          </small>
        )}
      </dd>
    </div>
  );

  return (
    <section
      className="nutrition-details"
      aria-label={text(locale, "Standard-recipe nutrition", "標準食譜營養估算")}
    >
      <p className="nutrition-basis">
        {text(
          locale,
          "Estimates for this selected whole portion",
          "此選定整份配方的估算值",
        )}
      </p>
      <dl className="nutrition-metrics">
        {renderNutrient("kcal")}
        {renderNutrient("protein")}
        {renderNutrient("fiber")}
        <div className="nutrition-value">
          <dt>{text(locale, "Edible weight", "可食重量")}</dt>
          <dd>
            {recommendation.portionGrams === null
              ? unknown
              : `${quantity(recommendation.portionGrams)} g`}
            {recommendation.portionGrams === null && (
              <small className="nutrition-unknown-reason">
                {text(
                  locale,
                  "The recipe's ingredient weights are incomplete.",
                  "食譜的食材重量資料不完整。",
                )}
              </small>
            )}
          </dd>
        </div>
      </dl>

      <details className="nutrition-full">
        <summary>{text(locale, "More nutrient estimates", "更多營養估算")}</summary>
        <dl className="nutrition-values">
          {remainingNutrients.map(renderNutrient)}
        </dl>
        <p className="nutrition-evidence-status">
          {text(
            locale,
            `Recipe estimate · ${matchedIngredients} of ${ingredientAmounts.length} ingredient records identified.`,
            `食譜估算 · ${ingredientAmounts.length} 項食材中，${matchedIngredients} 項已對應來源紀錄。`,
          )}
        </p>
        <p className="nutrition-limit">
          {text(
            locale,
            "Actual recipes and restaurant portions vary. These values describe this standard recipe, not a measured meal you ate.",
            "實際配方與餐廳份量各有不同。這些數值描述此標準食譜，並非你實際吃下餐點的測量結果。",
          )}
        </p>
      </details>

      <details className="nutrition-sources">
        <summary>
          {text(locale, "Standard recipe & sources", "標準食譜與資料來源")}
        </summary>
        <p className="nutrition-recipe-heading">
          <strong>{recipeDisplayName(recipe, locale)}</strong>
          {" · "}
          {portionLabels[recommendation.portion][locale === "en" ? 0 : 1]}
        </p>
        <p className="nutrition-recipe-version">
          {text(locale, "Recipe version", "食譜版本")}: {recipe.version}
        </p>
        <p className="nutrition-weight-basis">
          {text(
            locale,
            "Ingredient weights below are edible amounts in the stated condition, scaled to this portion.",
            "以下為依本份量換算、在標示狀態下的食材可食重量。",
          )}
        </p>
        <ul className="nutrition-ingredients">
          {ingredientAmounts.map((ingredient, index) => {
            const food = ingredient.food;
            const state =
              food?.state === "cooked"
                ? text(locale, "Cooked", "熟食")
                : food?.state === "raw"
                  ? text(locale, "Raw", "生鮮")
                  : food?.state === "ready-to-eat"
                    ? text(locale, "Ready to eat", "即食")
                    : unknown;
            return (
              <li key={`${ingredient.foodId}-${index}`}>
                <div className="nutrition-ingredient-name">
                  <strong>
                    {food?.label[locale] ??
                      text(locale, "Unmatched ingredient", "尚未對應的食材")}
                  </strong>
                  <span className="nutrition-ingredient-state">{state}</span>
                </div>
                <span className="nutrition-ingredient-weight">
                  {ingredient.grams === null
                    ? unknown
                    : `${quantity(ingredient.grams)} g`}
                </span>
                {food ? (
                  <a
                    href={food.recordUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="nutrition-record-link"
                  >
                    USDA FDC {food.fdcId}
                    <span className="sr-only"> — {food.description}</span>
                  </a>
                ) : (
                  <span className="nutrition-unknown-reason">
                    {text(
                      locale,
                      "Ingredient reference unavailable",
                      "食材來源紀錄尚缺",
                    )}
                  </span>
                )}
                {ingredient.processing === "pureed" && (
                  <div className="nutrition-preparation-note">
                    <p className="nutrition-preparation-value">
                      {text(
                        locale,
                        "Puréed ingredient · estimated free sugars in this selected portion",
                        "打成泥的食材 · 此選定份量的估計游離糖",
                      )}
                      {": "}
                      <span>
                        {ingredient.preparationFreeSugarsGrams == null
                          ? unknown
                          : `${quantity(ingredient.preparationFreeSugarsGrams)} g`}
                      </span>
                    </p>
                    <p>
                      {ingredient.preparationModelBasis?.note[locale] ??
                        text(
                          locale,
                          "The preparation-specific free-sugar basis is unavailable; it is unknown, not zero.",
                          "此調製方式的游離糖依據尚缺；未知不等於零。",
                        )}
                    </p>
                    {ingredient.preparationModelBasis?.sourceUrls.map((url, sourceIndex, urls) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="nutrition-preparation-link"
                      >
                        {text(locale, "Preparation basis", "調製方式依據")}
                        {urls.length > 1 ? ` ${sourceIndex + 1}` : ""}
                      </a>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="nutrition-recipe-notes">{recipe.notes[locale]}</p>
        <dl className="nutrition-source-list">
          {dataSources.map((source) => (
            <div key={source.id}>
              <dt>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.provider} · {source.dataset}
                </a>
              </dt>
              <dd>
                {text(locale, "Dataset release", "資料版本")}: {source.release}
              </dd>
              <dd>
                {text(locale, "Record publication", "紀錄發布日期")}:{" "}
                {source.recordPublicationDate}
              </dd>
              <dd>
                {text(locale, "Retrieved", "擷取日期")}: {source.retrievedAt}
              </dd>
            </div>
          ))}
        </dl>
        {dataSources.length === 0 && (
          <p className="nutrition-unknown-reason">
            {text(
              locale,
              "Dataset metadata is unavailable for these ingredient references.",
              "這些食材來源的資料集資訊尚缺。",
            )}
          </p>
        )}
      </details>
    </section>
  );
}

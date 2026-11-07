import type { MealContext } from "./meal-context";
import type { Locale } from "./types";

export function recipeTimeLabel(minutes: number, readiness: MealContext["ingredientReadiness"], locale: Locale): string {
  if (readiness === "needs-prep") return locale === "en" ? "Cooking time unknown" : "料理時間未知";
  return locale === "en" ? `~${minutes} min assembly` : `約 ${minutes} 分鐘組合`;
}

export function recipeTimeExplanation(locale: Locale): string {
  return locale === "en"
    ? "Times estimate assembly with the listed ingredients already cooked or prepared. Shopping, thawing and cooking ingredients are not included; full cooking time is unknown."
    : "時間為列出食材已煮熟或處理後的組合估算，不含採買、解凍與食材烹調；完整料理時間尚無資料。";
}

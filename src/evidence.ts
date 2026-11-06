import type {
  BaseMealOption,
  EvidenceSourceId,
  Locale,
  MealOption,
} from "./types";
import { standardizedRecipes } from "./nutrition-data";

export const evidenceSources: Record<
  EvidenceSourceId,
  { name: string; shortName: string; url: string; role: string }
> = {
  "usda-myplate": {
    name: "USDA MyPlate",
    shortName: "USDA MyPlate",
    url: "https://www.myplate.gov/eat-healthy/what-is-myplate",
    role: "General food-group background; not meal-level evidence",
  },
  "usda-fdc": {
    name: "USDA FoodData Central",
    shortName: "USDA FDC",
    url: "https://fdc.nal.usda.gov/data-documentation/",
    role: "Pinned ingredient-composition records for the measured recipe catalog",
  },
  "taiwan-fda": {
    name: "Taiwan FDA Food Nutrition Database",
    shortName: "Taiwan FDA",
    url: "https://www.fda.gov.tw/tc/siteList.aspx?sid=284",
    role: "Background food-composition reference; no source records imported into this pilot",
  },
  "nextbite-editorial": {
    name: "MealHatch editorial method",
    shortName: "MealHatch",
    url: "/#method",
    role: "Editorial named-food, style, practical-preference and variety policy",
  },
};

export const enrichRecommendation = (meal: BaseMealOption): MealOption => {
  return {
    ...meal,
    evidence: {
      // Retained for the existing schema, not presented as verified confidence.
      confidence: "limited",
      sourceIds: ["nextbite-editorial"],
      // This shared statement does not establish an individual template review.
      // Real source publication/retrieval dates belong to the separate recipes.
      reviewedOn: "",
      method:
        "Meal inspiration using supported constraints, named foods, saved styles, practical preferences and variety; not verified meal-level nutrition evidence. Suggestions are not serving-adequacy, calorie, or medical-nutrition estimates. Recorded food names do not establish nutrient deficits, and qualitative catalog nutrient labels do not determine this selection.",
      assumption:
        "Uses the named meal components as an editorial template. Ingredients, recipes, and portions vary; missing details remain unverified.",
    },
  };
};

export const catalogMethod = {
  name: `MealHatch ${standardizedRecipes.length} recipes`,
  statement:
    "Measured recipes use stated edible ingredient weights and pinned source records. Recommendations apply strict conditions, composition scores and disclosed preference points, with history breaking exact-total ties.",
  limitation:
    "Recipe estimates describe the listed ingredients and portions, not restaurant servings or individual requirements. Logs may be incomplete; food names do not establish nutrient deficits or a need for nutritional compensation.",
};

export const getCatalogMethod = (locale: Locale) =>
  locale === "en"
    ? catalogMethod
    : {
        name: `MealHatch ${standardizedRecipes.length} 道配方`,
        statement: "配方以明確可食重量與固定來源紀錄計算，推薦先套用必要條件，再比較營養組成分數與公開的偏好加分；只有總分相同時，才由近期紀錄決定變化順序。",
        limitation: "估算對應表列食材與份量，不代表餐廳實際餐點或個人所需份量。紀錄可能不完整；食物名稱無法判斷營養缺口或補償需求。",
      };

export const getMealEvidenceNotes = (meal: MealOption, locale: Locale) => {
  const recipe = standardizedRecipes.find(item => item.mealId === meal.id && item.version === meal.recipeVersion);
  if (recipe) return {
    method: locale === "en" ? meal.evidence.method : "依明確可食食材重量與固定 USDA 紀錄估算配方營養。營養組成採 UK NPM 2018，偏好加分為產品規則，不是個人營養或健康評估。",
    assumption: recipe.notes[locale],
  };
  return locale === "en"
    ? { method: meal.evidence.method, assumption: meal.evidence.assumption }
    : {
        method: "依有依據的必要條件、具名食物、已存餐食風格、實用偏好與變化提供靈感，目前沒有經查證的餐點級營養證據。這些想法不是份量充足度、熱量或醫療營養評估；食物名稱不能推定營養缺口，餐點庫的定性營養標籤也不決定此次選擇。",
        assumption: "以餐名列出的組成作為編輯餐型。實際食材、作法與份量會變動；缺少的細節仍未經確認。",
      };
};

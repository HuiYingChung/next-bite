import type {
  BaseMealOption,
  EvidenceSourceId,
  Locale,
  MealOption,
} from "./types";

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
    role: "Ingredient-composition source for the separate standardized-recipe pilot, not evidence for these generic meal ideas",
  },
  "taiwan-fda": {
    name: "Taiwan FDA Food Nutrition Database",
    shortName: "Taiwan FDA",
    url: "https://www.fda.gov.tw/tc/siteList.aspx?sid=284",
    role: "Background food-composition reference; no source records imported into this pilot",
  },
  "nextbite-editorial": {
    name: "NextBite editorial method",
    shortName: "NextBite",
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
  name: "NextBite 100 meal ideas",
  statement:
    "100 editorial everyday meal ideas selected through supported constraints, style and practical preferences, and named-food variety.",
  limitation:
    "These generic ideas have no verified recipe-to-food-record mapping for nutrient totals. Logs may be incomplete; food names do not establish nutrient adequacy, exact calories, medical needs or nutritional compensation.",
};

export const getCatalogMethod = (locale: Locale) =>
  locale === "en"
    ? catalogMethod
    : {
        name: "NextBite 100 道餐點靈感",
        statement: "依有依據的必要條件、餐食風格與實用偏好，以及具名食物的變化，挑選 100 道人工整理的日常餐點想法。",
        limitation: "這些一般餐點想法未建立可計算營養總量的配方與食品來源對應。紀錄可能不完整；食物名稱無法判斷營養充足度、精確熱量、醫療需求或營養補償。",
      };

export const getMealEvidenceNotes = (meal: MealOption, locale: Locale) =>
  locale === "en"
    ? { method: meal.evidence.method, assumption: meal.evidence.assumption }
    : {
        method: "依有依據的必要條件、具名食物、已存餐食風格、實用偏好與變化提供靈感，目前沒有經查證的餐點級營養證據。這些想法不是份量充足度、熱量或醫療營養評估；食物名稱不能推定營養缺口，餐點庫的定性營養標籤也不決定此次選擇。",
        assumption: "以餐名列出的組成作為編輯餐型。實際食材、作法與份量會變動；缺少的細節仍未經確認。",
      };

import type {
  BaseMealOption,
  EvidenceSourceId,
  Locale,
  MealOption,
} from "./types";

export const EVIDENCE_REVIEW_DATE = "2026-11-03";

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
    role: "General food-composition reference; no catalog record mapping yet",
  },
  "taiwan-fda": {
    name: "Taiwan FDA Food Nutrition Database",
    shortName: "Taiwan FDA",
    url: "https://www.fda.gov.tw/tc/siteList.aspx?sid=284",
    role: "General food-composition reference; no catalog record mapping yet",
  },
  "nextbite-editorial": {
    name: "NextBite editorial method",
    shortName: "NextBite",
    url: "/#method",
    role: "Editorial template composition and practical-fit rules",
  },
};

export const enrichRecommendation = (meal: BaseMealOption): MealOption => {
  return {
    ...meal,
    evidence: {
      // Retained for the existing schema, not presented as verified confidence.
      confidence: "limited",
      sourceIds: ["nextbite-editorial"],
      reviewedOn: EVIDENCE_REVIEW_DATE,
      method:
        "Editorial meal template and qualitative fit rules, not verified meal-level nutrition evidence. Points describe logged food-group presence and practical fit; they are not serving-adequacy, calorie, or medical-nutrition estimates.",
      assumption:
        "Uses the named meal components as an editorial template. Ingredients, recipes, and portions vary; missing details remain unverified.",
    },
  };
};

export const catalogMethod = {
  name: "NextBite Curated 100",
  statement:
    "100 curated everyday meal templates compared with visible qualitative food-group and practical-fit rules.",
  limitation:
    "Templates are editorial, without verified food-record mapping. Logs may be incomplete; points do not establish nutrient adequacy, exact calories, or medical needs.",
};

export const getCatalogMethod = (locale: Locale) =>
  locale === "en"
    ? catalogMethod
    : {
        name: "NextBite 精選 100 餐型",
        statement: "以可查看的食物類別與實用性規則，比較 100 種人工整理的日常餐型。",
        limitation: "餐型屬於編輯整理，目前未對應經查證的個別食品資料。紀錄可能不完整；點數不代表營養充足度、精確熱量或醫療需求。",
      };

export const getMealEvidenceNotes = (meal: MealOption, locale: Locale) =>
  locale === "en"
    ? { method: meal.evidence.method, assumption: meal.evidence.assumption }
    : {
        method: "使用人工整理的餐型與定性配對規則，目前沒有經查證的餐點級營養證據。點數描述已記錄的食物類別與實用性，不代表份量充足度、熱量或醫療營養評估。",
        assumption: "以餐名列出的組成作為編輯餐型。實際食材、作法與份量會變動；缺少的細節仍未經確認。",
      };

import type {
  BaseMealOption,
  EvidenceConfidence,
  EvidenceSourceId,
  MealOption,
} from "./types";

export const EVIDENCE_REVIEW_DATE = "2026-07-29";

export const evidenceSources: Record<
  EvidenceSourceId,
  { name: string; shortName: string; url: string; role: string }
> = {
  "usda-myplate": {
    name: "USDA MyPlate",
    shortName: "USDA MyPlate",
    url: "https://www.myplate.gov/eat-healthy/what-is-myplate",
    role: "Food-group balance framework",
  },
  "usda-fdc": {
    name: "USDA FoodData Central",
    shortName: "USDA FDC",
    url: "https://fdc.nal.usda.gov/data-documentation/",
    role: "Ingredient and food-composition reference",
  },
  "taiwan-fda": {
    name: "Taiwan FDA Food Nutrition Database",
    shortName: "Taiwan FDA",
    url: "https://www.fda.gov.tw/tc/siteList.aspx?sid=284",
    role: "Cross-check for Taiwanese and Chinese everyday foods",
  },
  "nextbite-editorial": {
    name: "NextBite editorial method",
    shortName: "NextBite",
    url: "/#method",
    role: "Meal-template composition, convenience, and preparation context",
  },
};

const hasAny = (meal: BaseMealOption, terms: string[]) => {
  const text = [meal.title, meal.description, ...meal.tags].join(" ").toLowerCase();
  return terms.some((term) => text.includes(term));
};

const inferConfidence = (meal: BaseMealOption): EvidenceConfidence => {
  if (
    hasAny(meal, [
      "burrito",
      "bento",
      "bibimbap",
      "curry",
      "dumpling",
      "gyro",
      "mapo",
      "poke",
      "shawarma",
    ])
  ) {
    return "limited";
  }

  if (
    meal.worksFor.length === 1 &&
    meal.worksFor[0] === "home-cooked" &&
    hasAny(meal, ["plate", "toast", "oatmeal", "omelet", "soup"])
  ) {
    return "high";
  }

  return "medium";
};

const inferSources = (meal: BaseMealOption): EvidenceSourceId[] => {
  const sources: EvidenceSourceId[] = [
    "usda-myplate",
    "usda-fdc",
    "nextbite-editorial",
  ];

  if (
    meal.tags.some((tag) =>
      ["chinese-style", "taiwanese-style"].includes(tag.toLowerCase()),
    )
  ) {
    sources.splice(2, 0, "taiwan-fda");
  }

  return sources;
};

export const enrichRecommendation = (meal: BaseMealOption): MealOption => {
  const confidence = inferConfidence(meal);

  return {
    ...meal,
    evidence: {
      confidence,
      sourceIds: inferSources(meal),
      reviewedOn: EVIDENCE_REVIEW_DATE,
      method:
        "Qualitative food-group template. Recommendation points use declared meal composition; they are not calorie or medical-nutrition estimates.",
      assumption:
        confidence === "limited"
          ? "Restaurant and mixed-dish recipes vary substantially; the template assumes a typical single serving and should be adjusted when details are known."
          : "Assumes a typical single serving with the components named in the meal title.",
    },
  };
};

export const catalogMethod = {
  name: "NextBite Source-Backed 100",
  statement:
    "100 curated everyday meal templates scored from visible food-group, fit, and context signals.",
  limitation:
    "The catalog does not claim exact calories or diagnose nutrition needs. Mixed dishes and restaurant portions vary.",
};

import { recommendationDataset } from "./data";
import { getHardAvoidConflicts, getMatchedPreferenceTags, getMealTimeWindow, normalizeLoggedFoodName } from "./logic";
import type { HardAvoidConflict } from "./logic";
import { defaultMealContext, getContextExclusions, getContextPreferenceFit, getPortionPreference, normalizeMealContext, requiresWarmMeal } from "./meal-context";
import type { MealContext } from "./meal-context";
import { nutrientKeys, sourceFoods, standardizedRecipes } from "./nutrition-data";
import type { NutrientKey, NutrientValues, NutritionPortion, SourceFood, StandardizedRecipe } from "./nutrition-types";
import type { Locale, MustAvoidTag, Profile, Recommendation, TodayLog } from "./types";

export const nutrientUnits: Record<NutrientKey, string> = {
  kcal: "kcal", protein: "g", carbs: "g", fat: "g", saturatedFat: "g",
  fiber: "g", sodium: "mg", addedSugar: "g",
};

export type RecipeCalculation = {
  portionGrams: number | null;
  nutrition: NutrientValues;
  ingredientAmounts: Array<{ foodId: string; food: SourceFood | null; grams: number | null; sourceId: string | null }>;
  sourceIds: string[];
  unknowns: Array<{ nutrient: NutrientKey; missingFoodIds: string[]; reason: string }>;
};

export type PilotRecommendation = RecipeCalculation & {
  meal: Recommendation;
  recipe: StandardizedRecipe;
  portion: NutritionPortion;
  reasons: string[];
  trace: {
    portionBasis: "explicit-appetite" | "hunger-preference" | "standard";
    practicalFit: number;
    pointBreakdown: Array<{ key: string; label: string; points: number; note: string }>;
    matchedPreferences: string[];
    unmatchedPreferences: string[];
    recentRecordsUsed: string[];
    nutritionEquivalentRecipeIds: string[];
    selectionMethod: string;
  };
};

export type PilotResult = {
  recommendations: PilotRecommendation[];
  candidateCount: number;
  excludedCount: number;
  trace: {
    catalogCount: number;
    exclusions: Array<{ mealId: string; stage: "hard-avoid" | "context" | "evidence"; reasons: string[] }>;
    eligibleRecipeIds: string[];
    selectionMethod: string;
  };
};

const localized = (locale: Locale, en: string, zh: string) => locale === "en" ? en : zh;
const finiteNonnegative = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const round = (value: number) => Math.round((value + Number.EPSILON) * 10000) / 10000;

// Ingredient identity declarations for this bounded pilot, keyed to actual
// source records. Empty lists mean none of the supported named ingredient
// conflicts, not an allergy-free or cross-contact certification.
const ingredientAvoidTags: Record<string, MustAvoidTag[]> = {
  "usda-168878": [], "usda-171477": [], "usda-175168": ["Fishy seafood"],
  "usda-174291": ["Soy"], "usda-173424": ["Egg"], "usda-170457": [],
  "usda-169967": [], "usda-173735": [], "usda-168483": [], "usda-169238": [],
  "usda-168917": [], "usda-168409": [], "usda-175180": ["Shellfish"],
  "usda-171413": [], "usda-173468": [], "usda-173647": [], "usda-168411": ["Soy"],
};

export const getRecipeHardAvoidConflicts = (profile: Profile, recipe: StandardizedRecipe, portion: NutritionPortion): HardAvoidConflict[] => {
  const declared: Array<{ tag: MustAvoidTag; certainty: HardAvoidConflict["certainty"] }> = recipe.ingredients
    .filter(ingredient => ingredient.grams > 0)
    .flatMap(ingredient => (ingredientAvoidTags[ingredient.foodId] ?? []).map(tag => ({ tag, certainty: "contains" as const })));
  if (recipe.ingredients.some(ingredient => ingredient.grams > 0 && ingredient.weighedState === "raw")) declared.push({ tag: "Raw food", certainty: "contains" });
  if (recipe.temperature === "cool") declared.push({ tag: "Cold food", certainty: "contains" });
  else if (recipe.temperature !== "warm") declared.push({ tag: "Cold food", certainty: "unknown" });
  if (portion === "large") declared.push({ tag: "Large portions", certainty: "contains" });
  return profile.avoidTags.flatMap(tag => {
    const match = declared.find(item => item.tag === tag);
    return match ? [match] : [];
  });
};

// All inputs are edible ingredient weights in their documented source state.
// Missing values propagate by field; recipe-estimate confidence is a disclosure,
// never a multiplier on physical amounts or nutrients.
export const calculateRecipe = (
  recipe: StandardizedRecipe,
  portion: NutritionPortion,
  locale: Locale = "en",
  foods: SourceFood[] = sourceFoods,
): RecipeCalculation => {
  const byId = new Map(foods.map(food => [food.id, food]));
  const factor = recipe.portions[portion];
  const ingredientAmounts = recipe.ingredients.map(ingredient => {
    const food = byId.get(ingredient.foodId) ?? null;
    const grams = finiteNonnegative(factor) && factor > 0 && finiteNonnegative(ingredient.grams)
      ? round(ingredient.grams * factor) : null;
    return { foodId: ingredient.foodId, food, grams, sourceId: food?.sourceId ?? null };
  });
  const portionGrams = ingredientAmounts.length > 0 && ingredientAmounts.every(item => item.grams !== null)
    ? round(ingredientAmounts.reduce((sum, item) => sum + item.grams!, 0)) : null;
  const nutrition = {} as NutrientValues;
  const unknowns: RecipeCalculation["unknowns"] = [];
  for (const nutrient of nutrientKeys) {
    let sum = 0;
    const missingFoodIds: string[] = [];
    ingredientAmounts.forEach((item, index) => {
      // A declared zero-gram ingredient contributes exactly zero.
      if (item.grams === 0) return;
      const value = item.food?.nutrientsPer100g[nutrient];
      if (item.grams === null || !item.food || item.food.state !== recipe.ingredients[index].weighedState || !finiteNonnegative(value)) {
        missingFoodIds.push(item.foodId);
      } else sum += item.grams / 100 * value;
    });
    if (!ingredientAmounts.length || missingFoodIds.length) {
      nutrition[nutrient] = null;
      unknowns.push({
        nutrient, missingFoodIds: [...new Set(missingFoodIds)],
        reason: localized(locale,
          "A required ingredient amount, matching food-state record, or source nutrient value is missing. The recipe total is unknown, not zero.",
          "部分食材份量、相同食物狀態的來源紀錄，或該營養素數值缺漏，因此整份食譜的此項總量未知，並非零。"),
      });
    } else nutrition[nutrient] = round(sum);
  }
  return { portionGrams, nutrition, ingredientAmounts,
    sourceIds: [...new Set(ingredientAmounts.flatMap(item => item.sourceId ? [item.sourceId] : []))], unknowns };
};

const stapleNames: Record<string, MealContext["preferredStaple"]> = {
  rice: "rice", "white rice": "rice", "brown rice": "rice", congee: "rice", "rice porridge": "rice",
  noodles: "noodles", noodle: "noodles", pasta: "noodles", udon: "noodles", soba: "noodles",
  "udon noodles": "noodles", "soba noodles": "noodles", "rice noodles": "noodles", "wheat noodles": "noodles", "ramen noodles": "noodles", "noodle soup": "noodles",
  bread: "bread", toast: "bread", "whole wheat bread": "bread", wrap: "bread", tortilla: "bread",
  potato: "potato", potatoes: "potato", "sweet potato": "potato", "sweet potatoes": "potato",
};

const recordedStaples = (todayLog?: TodayLog) => [...new Set(Object.values(todayLog ?? {}).flatMap(meal =>
  meal.carbs.flatMap(name => stapleNames[normalizeLoggedFoodName(name)] ? [stapleNames[normalizeLoggedFoodName(name)]] : [])))];

// This equality check is deliberately strict: variety never wins a trade-off
// between different nutrient totals. There is no default "healthier" total.
const nutrientVector = (item: PilotRecommendation) => JSON.stringify([item.portionGrams, ...nutrientKeys.map(key => item.nutrition[key])]);

export const recommendPilotMeals = (
  profile: Profile,
  suppliedContext: MealContext = defaultMealContext,
  locale: Locale = "en",
  now = new Date(),
  todayLog?: TodayLog,
): PilotResult => {
  const context = normalizeMealContext(suppliedContext);
  const portionChoice = getPortionPreference(context);
  const meals = new Map(recommendationDataset.map(meal => [meal.id, meal]));
  const exclusions: PilotResult["trace"]["exclusions"] = [];
  const recentStaples = recordedStaples(todayLog);
  const eligible: PilotRecommendation[] = [];
  const method = localized(locale,
    "Eligible standardized recipes are ordered by declared practical preferences. If saved, higher protein grams and then more listed vegetable grams resolve practical ties. Remaining ties use a stable recipe ID; recorded-staple variety can only resolve identical nutrient totals. There is no calorie target or health score.",
    "符合條件的標準食譜依實際偏好排序。若已選擇蛋白質或蔬菜偏好，實用偏好相同時，依序以蛋白質克數與列出的蔬菜克數較多者優先。其餘同分依固定食譜代碼排序；已記錄主食的變化只可用於營養總量完全相同的選項。不設定熱量目標或健康分數。");
  for (const recipe of standardizedRecipes) {
    const meal = meals.get(recipe.mealId);
    if (!meal) { exclusions.push({ mealId: recipe.mealId, stage: "evidence", reasons: ["catalog-meal-missing"] }); continue; }
    const conflicts = [...getHardAvoidConflicts(profile, meal, getMealTimeWindow(now)), ...getRecipeHardAvoidConflicts(profile, recipe, portionChoice.portion)];
    if (conflicts.length) { exclusions.push({ mealId: recipe.mealId, stage: "hard-avoid", reasons: conflicts.map(conflict => `${conflict.tag}:${conflict.certainty}`) }); continue; }
    const contextConflicts = getContextExclusions(profile, context, recipe);
    if (contextConflicts.length) { exclusions.push({ mealId: recipe.mealId, stage: "context", reasons: contextConflicts }); continue; }
    const calculation = calculateRecipe(recipe, portionChoice.portion, locale);
    const evidenceGaps = calculation.ingredientAmounts.flatMap((item, index) =>
      !item.food || item.grams === null || item.food.state !== recipe.ingredients[index].weighedState || !Object.prototype.hasOwnProperty.call(ingredientAvoidTags, item.foodId) ? [item.foodId] : []);
    if (calculation.portionGrams === null || calculation.portionGrams <= 0 || evidenceGaps.length ||
        (["kcal", "protein", "carbs", "fat"] as const).some(key => calculation.nutrition[key] === null)) {
      exclusions.push({ mealId: recipe.mealId, stage: "evidence", reasons: ["incomplete-core-portion-or-nutrient-data", ...evidenceGaps] }); continue;
    }
    const fit = getContextPreferenceFit(context, recipe, locale);
    const matchedPreferences = [...fit.matched];
    const unmatchedPreferences = [...fit.unmatched];
    let practicalFit = fit.points;
    // Qualitative legacy nutrient levels do not describe these measured recipe
    // versions. Only meal-style tags transfer to the pilot; actual nutrient
    // preferences are handled directly from the calculated values below.
    const profileMatches = getMatchedPreferenceTags(profile, meal)
      .filter(tag => !["High-protein", "Vegetable-forward", "Light meals", "Warm meals", "Rice-based meals", "Noodle-based meals"].includes(tag));
    if (profile.preferenceTags.includes("Rice-based meals") && recipe.staple === "rice") profileMatches.push("Rice-based meals");
    if (profile.preferenceTags.includes("Noodle-based meals") && recipe.staple === "noodles") profileMatches.push("Noodle-based meals");
    if (profile.preferenceTags.includes("Warm meals") && recipe.temperature === "warm") profileMatches.push("Warm meals");
    // A bounded editorial-preference contribution cannot impersonate nutrient quality.
    if (profileMatches.length) {
      practicalFit += Math.min(profileMatches.length, 2);
      matchedPreferences.push(...profileMatches.map(tag => `profile:${tag}`));
    }
    const moodNotes: string[] = [];
    let lightPreparationPoints = 0;
    let shortAssemblyPoints = 0;
    if (profile.eatingStyle === "Mostly takeout") {
      unmatchedPreferences.push("takeout-portions-unconfirmed");
      moodNotes.push(localized(locale, "These are weighed recipe versions. Restaurant ingredients and portion weights are unconfirmed, so eating-out meals cannot inherit these nutrition totals.", "這些是秤重配方版本；外食的食材與重量未經確認，因此不能直接套用為餐廳餐點的營養總量。"));
    } else if (profile.eatingStyle === "Mostly home-cooked") {
      matchedPreferences.push("home-assembly");
      moodNotes.push(localized(locale, "Fits home assembly when you use the listed prepared ingredients and weights.", "依列出的已處理食材與重量，可在家組裝這份食譜。"));
    }
    if (profile.feelToday === "On period") moodNotes.push(localized(locale, "This day context does not establish a calorie or nutrient requirement; portions still follow your hunger and appetite choices.", "此身體感受不會被用來推定熱量或營養需求；份量仍依你選擇的飢餓感與食慾調整。"));
    if (profile.feelToday === "Need something light" || profile.preferenceTags.includes("Light meals")) {
      if (recipe.seasoning.oilGrams * recipe.portions[portionChoice.portion] <= 5 && recipe.prepMinutes <= 15) {
        practicalFit += 1; lightPreparationPoints = 1; matchedPreferences.push("light-preparation");
        moodNotes.push(localized(locale, "For your light-meal preference, this version uses at most 5 g added oil and prepared-ingredient assembly within 15 minutes; this is not a low-calorie claim.", "依你想吃清爽的偏好，這個版本添加油不超過 5 克，且以備妥食材在 15 分鐘內組裝；這不代表低熱量。"));
      }
    }
    if (profile.feelToday === "Low energy" && recipe.prepMinutes <= 10) {
      practicalFit += 1; shortAssemblyPoints = 1; matchedPreferences.push("short-assembly");
      moodNotes.push(localized(locale, "For a low-energy day, this recipe keeps assembly to 10 minutes using already prepared ingredients; it does not infer a nutrient deficiency.", "依今天沒精神的感受，這份食譜以備妥食材在 10 分鐘內組裝；不據此推測營養缺乏。"));
    }
    const recentRecordsUsed = recentStaples.includes(recipe.staple) ? [`staple:${recipe.staple}`] : [];
    const portionNote = portionChoice.basis === "explicit-appetite"
      ? localized(locale, `Uses your selected ${portionChoice.portion} recipe version.`, `依你選擇的${portionChoice.portion === "small" ? "小" : portionChoice.portion === "large" ? "大" : "標準"}份食譜計算。`)
      : portionChoice.basis === "hunger-preference"
        ? localized(locale, `Your hunger choice suggests the ${portionChoice.portion} recipe version; you can change it. This is a product preference rule, not an estimated energy requirement.`, `依飢餓感先選${portionChoice.portion === "small" ? "小" : "大"}份食譜，你可以調整；這是產品偏好規則，並非估算熱量需求。`)
        : localized(locale, "Uses the standard recipe version; this is not an individually estimated serving requirement.", "採用標準版食譜；並非個人化估算的必要份量。");
    const recordNote = recentRecordsUsed.length
      ? localized(locale, "This staple is already named in today's records. Variety only changes order for otherwise identical nutrient totals; recorded quantities do not estimate intake here.", "今天的紀錄已出現此主食。主食變化只影響營養總量完全相同的選項；此處不以紀錄份量估算攝取量。")
      : localized(locale, "No matching named staple was found in today's records for this recipe; selection uses current preferences, without inferring missing nutrients from unrecorded meals.", "今天的紀錄沒有可對應此食譜的具名主食；依目前偏好選擇，不以未記錄餐點推測營養缺口。");
    const nutrientPreferenceNotes: string[] = [];
    if (profile.preferenceTags.includes("High-protein")) {
      matchedPreferences.push("higher-protein-direction");
      nutrientPreferenceNotes.push(localized(locale, "Your saved protein preference orders equally practical recipes by their calculated protein grams, without a daily target or a health score.", "依已儲存的蛋白質偏好，實用偏好相同時，以此份量實際算出的蛋白質克數較多者優先；不設定每日目標或健康分數。"));
    }
    if (profile.preferenceTags.includes("Vegetable-forward")) {
      matchedPreferences.push("more-vegetable-weight-direction");
      nutrientPreferenceNotes.push(localized(locale, "Your vegetable preference orders equally practical recipes by listed vegetable grams, without treating grams as a nutrient-adequacy score.", "依蔬菜偏好，實用偏好相同時，以列出的蔬菜克數較多者優先；重量不代表營養充足分數。"));
    }
    const pointBreakdown: PilotRecommendation["trace"]["pointBreakdown"] = [
      { key: "staple", label: localized(locale, "Preferred staple", "偏好主食"), points: fit.matched.includes("staple") ? 2 : 0,
        note: localized(locale, fit.matched.includes("staple") ? "This recipe matches your selected staple: +2 points." : "No staple-match contribution applies; this preference remains flexible.", fit.matched.includes("staple") ? "此配方符合你選擇的主食，加 2 分。" : "此配方不適用主食配對加分；主食偏好保留彈性。") },
      { key: "cuisine", label: localized(locale, "Preferred cuisine", "偏好料理類型"), points: fit.matched.includes("cuisine") ? 1 : 0,
        note: localized(locale, fit.matched.includes("cuisine") ? "This recipe matches your selected cuisine group: +1 point." : "No cuisine-match contribution applies; this preference remains flexible.", fit.matched.includes("cuisine") ? "此配方符合你選擇的料理類型，加 1 分。" : "此配方不適用料理類型配對加分；此偏好保留彈性。") },
      { key: "saved-styles", label: localized(locale, "Saved meal styles", "已儲存餐食風格"), points: Math.min(profileMatches.length, 2),
        note: localized(locale, profileMatches.length ? "Structured meal-style matches add 1 point each, capped at 2. Nutrient directions are separate tie-breaks." : "No saved meal-style contribution applies. Nutrient directions are separate tie-breaks.", profileMatches.length ? "依結構化餐食風格，每項符合加 1 分，最多 2 分；營養數值偏好另外用於同分排序。" : "此配方不適用已儲存餐食風格加分；營養數值偏好另外用於同分排序。") },
      { key: "light-preparation", label: localized(locale, "Light preparation preference", "清爽作法偏好"), points: lightPreparationPoints,
        note: localized(locale, lightPreparationPoints ? "Your light-meal preference matches at most 5 g added oil and prepared-ingredient assembly within 15 minutes: +1 point." : "The light-preparation preference or its oil/time conditions do not apply: +0 points.", lightPreparationPoints ? "符合清爽餐食偏好：此份量添加油不超過 5 克，且備妥食材可在 15 分鐘內組裝，加 1 分。" : "未套用清爽作法偏好，或未符合添加油與時間條件，加 0 分。") },
      { key: "short-assembly", label: localized(locale, "Short assembly preference", "簡短組裝偏好"), points: shortAssemblyPoints,
        note: localized(locale, shortAssemblyPoints ? "Your low-energy-day preference matches prepared-ingredient assembly within 10 minutes: +1 point." : "No short-assembly contribution applies to the current day preference: +0 points.", shortAssemblyPoints ? "符合今天沒精神時的省力偏好：備妥食材可在 10 分鐘內組裝，加 1 分。" : "此配方不適用目前感受的簡短組裝加分，加 0 分。") },
    ];
    eligible.push({ meal, recipe, portion: portionChoice.portion, ...calculation,
      reasons: [portionNote, localized(locale, "Nutrition is the sum of the listed edible ingredient weights and USDA source values; actual preparation can differ.", "營養數值由列出的可食食材重量與 USDA 來源數值相加；實際製作可能不同。"),
        ...(requiresWarmMeal(profile, context) ? [localized(locale, "Only recipes explicitly documented as warm are eligible.", "只保留明確標示為溫熱的食譜。")] : []),
        ...(context.maxPrepMinutes !== null ? [localized(locale, `Fits your ${context.maxPrepMinutes}-minute assembly limit with already prepared ingredients.`, `符合你設定的 ${context.maxPrepMinutes} 分鐘組裝上限，前提是食材已備妥。`)] : []),
        ...fit.notes, ...(profileMatches.length ? [localized(locale, "Matches one or more saved meal-style preferences using structured catalog tags.", "依餐點的結構化標籤，符合一項或多項已儲存餐食偏好。") ] : []), ...moodNotes, ...nutrientPreferenceNotes, recordNote],
      trace: { portionBasis: portionChoice.basis, practicalFit, pointBreakdown, matchedPreferences, unmatchedPreferences,
        recentRecordsUsed, nutritionEquivalentRecipeIds: [], selectionMethod: method } });
  }
  const vectors = new Map<string, PilotRecommendation[]>();
  for (const item of eligible) {
    const vector = nutrientVector(item);
    vectors.set(vector, [...(vectors.get(vector) ?? []), item]);
  }
  for (const item of eligible) item.trace.nutritionEquivalentRecipeIds = vectors.get(nutrientVector(item))!
    .filter(other => other.recipe.mealId !== item.recipe.mealId).map(other => other.recipe.mealId);
  const vegetableGrams = (item: PilotRecommendation) => item.recipe.ingredients.reduce((sum, ingredient, index) => sum + (ingredient.role === "vegetable" ? item.ingredientAmounts[index].grams ?? 0 : 0), 0);
  // Stable group keys keep the comparator transitive when equivalent recipes
  // are separated by another recipe ID. Variety acts only within one group.
  const groupKey = (item: PilotRecommendation) => vectors.get(nutrientVector(item))!
    .filter(other => other.trace.practicalFit === item.trace.practicalFit &&
      (!profile.preferenceTags.includes("Vegetable-forward") || vegetableGrams(other) === vegetableGrams(item)))
    .map(other => other.recipe.mealId).sort()[0];
  eligible.sort((a, b) => b.trace.practicalFit - a.trace.practicalFit ||
    (profile.preferenceTags.includes("High-protein") ? b.nutrition.protein! - a.nutrition.protein! : 0) ||
    (profile.preferenceTags.includes("Vegetable-forward") ? vegetableGrams(b) - vegetableGrams(a) : 0) ||
    groupKey(a).localeCompare(groupKey(b), "en") ||
    (nutrientVector(a) === nutrientVector(b) ? a.trace.recentRecordsUsed.length - b.trace.recentRecordsUsed.length : 0) ||
    a.recipe.mealId.localeCompare(b.recipe.mealId, "en"));
  return { recommendations: eligible.slice(0, 3), candidateCount: eligible.length, excludedCount: exclusions.length,
    trace: { catalogCount: standardizedRecipes.length, exclusions, eligibleRecipeIds: eligible.map(item => item.recipe.mealId), selectionMethod: method } };
};

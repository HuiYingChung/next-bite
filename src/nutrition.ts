import { recommendationDataset, toLocalDateId } from "./data";
import { getHardAvoidConflicts, getMatchedPreferenceTags, getMealTimeWindow } from "./logic";
import type { HardAvoidConflict } from "./logic";
import { defaultMealContext, getContextExclusions, getPortionPreference, normalizeMealContext, requiresWarmMeal } from "./meal-context";
import type { PreferenceCandidate } from "./meal-context";
import { resolveFoodIdentity } from "./food-identity";
import { buildHistoryVarietyContext, describeHistoryVariety, pickHistoryVariedChoices } from "./history-variety";
import type { HistoryVarietyTrace } from "./history-variety";
import { calculateNutrientProfile, NPM2018_SOURCE_URL, NPM2018_VERSION } from "./nutrient-profile";
import type { NutrientProfileResult } from "./nutrient-profile";
import type { MealContext } from "./meal-context";
import { nutrientKeys, sourceFoods, standardizedRecipes } from "./nutrition-data";
import type { IngredientPreparationModelBasis, NutrientKey, NutrientValues, NutritionPortion, RecipeIngredient, SourceFood, StandardizedRecipe } from "./nutrition-types";
import type { DayHistory, Locale, MustAvoidTag, Profile, Recommendation, TodayLog } from "./types";
import { label } from "./presentation";
import { getRecipeMainProteinGroups, proteinGroupLabels } from "./protein-preference";
import { recipeDisplayName } from "./recipe-name";

export const nutrientUnits: Record<NutrientKey, string> = {
  kcal: "kcal", energyKj: "kJ", protein: "g", carbs: "g", fat: "g", saturatedFat: "g",
  fiber: "g", sodium: "mg", addedSugar: "g",
};

export type RecipeCalculation = {
  portionGrams: number | null;
  nutrition: NutrientValues;
  ingredientAmounts: Array<{ foodId: string; food: SourceFood | null; grams: number | null; sourceId: string | null;
    processing?: "pureed"; preparationModelBasis?: IngredientPreparationModelBasis; preparationFreeSugarsGrams?: number | null }>;
  sourceIds: string[];
  unknowns: Array<{ nutrient: NutrientKey; missingFoodIds: string[]; reason: string }>;
};

export type PilotRecommendation = RecipeCalculation & {
  meal: Recommendation;
  recipe: StandardizedRecipe;
  portion: NutritionPortion;
  reasons: string[];
  matchReasons: string[];
  /** Actual preference matches for cards; general method notes stay in details. */
  matchedPreferenceReasons: string[];
  ingredientReadiness: MealContext["ingredientReadiness"];
  mismatchReasons: string[];
  score: PilotScore;
  trace: {
    portionBasis: "explicit-appetite" | "hunger-preference" | "standard";
    practicalFit: number;
    pointBreakdown: Array<{ key: string; label: string; points: number; note: string }>;
    matchedPreferences: string[];
    unmatchedPreferences: string[];
    recentRecordsUsed: string[];
    nutritionEquivalentRecipeIds: string[];
    selectionMethod: string;
    preferenceOrder: string[];
    rankingPolicy: RankingPolicy;
    rankTier: number[];
    /** Date and meal window that order recipes still tied after every other rule. */
    rotationSeed: string;
    variety: HistoryVarietyTrace;
  };
};

export type PilotResult = {
  recommendations: PilotRecommendation[];
  /** All eligible recipes in the same preference-first and equal-tier order as the top three. */
  eligibleRecipes: PilotRecommendation[];
  candidateCount: number;
  excludedCount: number;
  trace: {
    catalogCount: number;
    exclusions: Array<{ mealId: string; stage: "hard-avoid" | "context" | "evidence"; reasons: string[] }>;
    eligibleRecipeIds: string[];
    selectionMethod: string;
    candidateScores: Array<{ mealId: string; score: PilotScore }>;
    rankingPolicy: RankingPolicy;
    rotationSeed: string;
  };
};

export type PreferenceScope = "current" | "saved" | "inactive";
export type PreferenceScoreRow = {
  key: string; label: string; points: number; note: string;
  active: boolean; scope: PreferenceScope; matched: boolean; available: boolean;
  requestedValues: string[]; matchedValues: string[]; unmatchedValues: string[];
};
export type PreferenceFit = { points: number; possible: number; matched: number; selected: number };
export type RankingPolicy = { version: string; order: string[] };
export const RECIPE_RANKING_POLICY: RankingPolicy = {
  version: "mealhatch-banded-rotation-2026-11-10-v3",
  order: ["current-preference-descending", "saved-preference-descending", "nutrition-level-descending", "equal-tier-record-variety", "equal-tier-alternative-variety", "meal-window-rotation", "stable-id"],
};

// Product rule, not a published threshold. The model's own point bands make a
// one-point difference between two mixed meals too fine to order them by, so
// recipes are compared by level and the exact reference stays visible.
export const NUTRITION_LEVEL_MINIMUMS = { higher: 18, middle: 14 } as const;
export type NutritionLevel = 0 | 1 | 2;
export const getNutritionLevel = (nutritionReference: number): NutritionLevel =>
  nutritionReference >= NUTRITION_LEVEL_MINIMUMS.higher ? 2 : nutritionReference >= NUTRITION_LEVEL_MINIMUMS.middle ? 1 : 0;

/** Options are offered in groups of this size; variety is judged within each group. */
export const RECIPE_OPTION_GROUP_SIZE = 3;

// Deterministic turn-taking: the same date, meal window and recipe always give
// the same key, so a result can be reproduced without stored random state.
export const getRotationSeed = (now: Date) => `${toLocalDateId(now)}:${getMealTimeWindow(now)}`;
export const getRotationKey = (seed: string, recipeId: string) => {
  let hash = 0x811c9dc5;
  for (const character of `${seed}:${recipeId}`) hash = Math.imul(hash ^ character.codePointAt(0)!, 0x01000193);
  // Final mixing: without it, keys that share a recipe ID stay correlated
  // across seeds and the same recipes would lead on most days.
  hash ^= hash >>> 16; hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13; hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
};
export type PilotScore = {
  model: NutrientProfileResult;
  nutrient: number;
  energy: number;
  preference: number;
  nutritionReference: number;
  /** Ranking compares this level; the exact reference above is for inspection. */
  nutritionLevel: NutritionLevel;
  currentPreference: PreferenceFit;
  savedPreference: PreferenceFit;
  unsupportedSavedPreferences: string[];
  /** @deprecated Historical arithmetic diagnostic; never used for ranking. */
  total: number;
  preferenceRows: PreferenceScoreRow[];
  basis: { normalization: "per-100g"; model: "UK NPM 2018"; version: string; sourceUrls: string[]; note: string };
  inputBasis: Array<{ foodId: string; label: string; note: string; sourceUrls: string[] }>;
};

const localized = (locale: Locale, en: string, zh: string) => locale === "en" ? en : zh;
const finiteNonnegative = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const round = (value: number) => Math.round((value + Number.EPSILON) * 10000) / 10000;

// The importer derives this narrow preparation input from the pinned cooked
// chickpea record. Processing changes free-sugar classification, not source
// nutrient quantities, FVNS eligibility, thresholds, or preference weights.
const ingredientFreeSugars = (ingredient: RecipeIngredient, food: SourceFood): number | null | undefined => {
  if (ingredient.processing === undefined && ingredient.preparationModelBasis === undefined) return food.modelBasis?.freeSugarsPer100g;
  const prepared = ingredient.preparationModelBasis;
  if (ingredient.processing !== "pureed" || food.id !== "usda-173757" || food.state !== "cooked" || ingredient.weighedState !== "cooked"
    || prepared?.freeSugarBasis !== "reported-total-sugars-as-free"
    || !finiteNonnegative(prepared.freeSugarsPer100g) || prepared.freeSugarsPer100g > 100
    || typeof prepared.note?.en !== "string" || !prepared.note.en.trim()
    || typeof prepared.note?.zh !== "string" || !prepared.note.zh.trim()
    || !Array.isArray(prepared.sourceUrls) || !prepared.sourceUrls.length
    || !prepared.sourceUrls.every(url => typeof url === "string" && url.startsWith("https://"))) return null;
  return prepared.freeSugarsPer100g;
};

// Reviewed declarations travel with the source food. Empty lists mean no
// supported named ingredient conflict, not allergy or cross-contact clearance.
const sourceFoodById = new Map(sourceFoods.map(food => [food.id, food]));

export const getRecipeHardAvoidConflicts = (profile: Profile, recipe: StandardizedRecipe, portion: NutritionPortion): HardAvoidConflict[] => {
  const declared: Array<{ tag: MustAvoidTag; certainty: HardAvoidConflict["certainty"] }> = recipe.ingredients
    .filter(ingredient => ingredient.grams > 0)
    .flatMap(ingredient => {
      const food = sourceFoodById.get(ingredient.foodId);
      return [
        ...(food?.avoidTags ?? []).map(tag => ({ tag, certainty: "contains" as const })),
        ...(food?.unknownAvoidTags ?? []).map(tag => ({ tag, certainty: "unknown" as const })),
      ];
    });
  if (recipe.ingredients.some(ingredient => ingredient.grams > 0 && ingredient.weighedState === "raw")) declared.push({ tag: "Raw food", certainty: "contains" });
  if (recipe.temperature === "cool") declared.push({ tag: "Cold food", certainty: "contains" });
  else if (recipe.temperature !== "warm") declared.push({ tag: "Cold food", certainty: "unknown" });
  if (portion === "large") declared.push({ tag: "Large portions", certainty: "contains" });
  return profile.avoidTags.flatMap(tag => {
    const match = declared.find(item => item.tag === tag && item.certainty === "contains") ?? declared.find(item => item.tag === tag);
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
    const preparationFreeSugars = food ? ingredientFreeSugars(ingredient, food) : null;
    const preparation = ingredient.processing === undefined && ingredient.preparationModelBasis === undefined ? {} : {
      ...(ingredient.processing !== undefined ? { processing: ingredient.processing } : {}),
      ...(ingredient.preparationModelBasis !== undefined ? { preparationModelBasis: ingredient.preparationModelBasis } : {}),
      preparationFreeSugarsGrams: grams === 0 ? 0 : grams !== null && finiteNonnegative(preparationFreeSugars)
        ? round(grams / 100 * preparationFreeSugars) : null,
    };
    return { foodId: ingredient.foodId, food, grams, sourceId: food?.sourceId ?? null, ...preparation };
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

// Model inputs use the standard recipe directly, before display rounding or
// portion scaling. Changing a serving factor cannot move a threshold band.
export const calculateRecipeProfile = (recipe: StandardizedRecipe, foods: SourceFood[] = sourceFoods): NutrientProfileResult => {
  const byId = new Map(foods.map(food => [food.id, food]));
  const validAmounts = recipe.ingredients.length > 0 && recipe.ingredients.every(item => finiteNonnegative(item.grams));
  const grams = validAmounts ? recipe.ingredients.reduce((sum, item) => sum + item.grams, 0) : 0;
  const weighted = (read: (food: SourceFood, ingredient: RecipeIngredient) => number | null | undefined) => {
    if (grams <= 0) return null;
    let sum = 0;
    for (const ingredient of recipe.ingredients) {
      if (ingredient.grams === 0) continue;
      const food = byId.get(ingredient.foodId);
      if (!food || food.state !== ingredient.weighedState) return null;
      const value = read(food, ingredient);
      if (!finiteNonnegative(value)) return null;
      sum += ingredient.grams * value;
    }
    return sum / grams;
  };
  const fiberCompatible = grams > 0 && recipe.ingredients.every(item => item.grams === 0 || byId.get(item.foodId)?.modelBasis?.fiberMethod === "AOAC-compatible");
  const fvnsStates = new Set(recipe.ingredients.filter(item => item.grams > 0 && byId.get(item.foodId)?.modelBasis?.fvnsEligible === true).map(item => byId.get(item.foodId)!.state));
  const mixedFvnsStates = fvnsStates.has("raw") && fvnsStates.has("cooked");
  const result = calculateNutrientProfile({ energyKj: weighted(food => food.nutrientsPer100g.energyKj), saturatedFat: weighted(food => food.nutrientsPer100g.saturatedFat),
    freeSugars: weighted((food, ingredient) => ingredientFreeSugars(ingredient, food)), salt: weighted(food => food.nutrientsPer100g.sodium === null ? null : food.nutrientsPer100g.sodium * 2.5 / 1000),
    protein: weighted(food => food.nutrientsPer100g.protein), fiber: weighted(food => food.nutrientsPer100g.fiber),
    fvnsPercent: mixedFvnsStates ? null : weighted(food => typeof food.modelBasis?.fvnsEligible === "boolean" ? food.modelBasis.fvnsEligible ? 100 : 0 : null),
    fiberMethod: fiberCompatible ? "AOAC-compatible" : "unknown" });
  if (mixedFvnsStates) result.missing.push("fvnsStateBasis");
  return result;
};

export const calculateScoreForRecipe = (recipe: StandardizedRecipe, profile: Profile, suppliedContext: MealContext = defaultMealContext, locale: Locale = "en", foods: SourceFood[] = sourceFoods): PilotScore | null => {
  const context = normalizeMealContext(suppliedContext);
  const model = calculateRecipeProfile(recipe, foods);
  if (model.status !== "complete") return null;
  const meal = recommendationDataset.find(item => item.id === recipe.mealId);
  const staple = context.preferredStaple !== "any" && recipe.staple === context.preferredStaple;
  const cuisine = context.cuisine !== "any" && recipe.cuisine === context.cuisine;
  const mainProtein = context.preferredProtein !== "any" && getRecipeMainProteinGroups(recipe, foods).has(context.preferredProtein);
  const oilPer100g = recipe.seasoning.oilGrams / recipe.ingredients.reduce((sum, item) => sum + item.grams, 0) * 100;
  const preparation = profile.feelToday === "Need something light" ? "oil" : profile.feelToday === "Low energy" ? "time" : profile.preferenceTags.includes("Light meals") ? "oil" : null;
  const preparationAvailable = preparation !== "time" || context.ingredientReadiness !== "needs-prep";
  const preparationFit = preparation === "oil" ? oilPer100g <= 1 : preparation === "time" ? preparationAvailable && recipe.prepMinutes <= 10 : false;
  const preparationScope = profile.feelToday === "Need something light" || profile.feelToday === "Low energy" ? "current" : "saved";
  const savedStyleKeys = ["Bowl meals", "Set meals", "Wraps / sandwiches", "Soupy meals", "Plant-protein", "Warm meals", "Rice-based meals", "Noodle-based meals"];
  const requestedStyles = profile.preferenceTags.filter(tag => savedStyleKeys.includes(tag));
  const unsupportedSavedPreferences = profile.preferenceTags.filter(tag => ![...savedStyleKeys, "Light meals", "High-protein", "Vegetable-forward"].includes(tag));
  const styles = meal ? getMatchedPreferenceTags(profile, meal).filter(tag => !["High-protein", "Vegetable-forward", "Light meals", "Warm meals", "Rice-based meals", "Noodle-based meals"].includes(tag)) : [];
  if (profile.preferenceTags.includes("Rice-based meals") && recipe.staple === "rice") styles.push("Rice-based meals");
  if (profile.preferenceTags.includes("Noodle-based meals") && recipe.staple === "noodles") styles.push("Noodle-based meals");
  if (profile.preferenceTags.includes("Warm meals") && recipe.temperature === "warm") styles.push("Warm meals");
  const proteinPreference = profile.preferenceTags.includes("High-protein") && model.inputs.protein! > 8.5;
  const plantPreference = profile.preferenceTags.includes("Vegetable-forward") && model.inputs.fvnsPercent! > 40;
  type RowFacts = Pick<PreferenceScoreRow, "active" | "scope" | "matched" | "available" | "requestedValues" | "matchedValues" | "unmatchedValues">;
  const facts = (scope: "current" | "saved", requestedValues: string[], matchedValues: string[], available = true): RowFacts => ({
    active: requestedValues.length > 0, scope: requestedValues.length ? scope : "inactive", matched: matchedValues.length > 0,
    available, requestedValues, matchedValues, unmatchedValues: requestedValues.filter(value => !matchedValues.includes(value)),
  });
  const preparationValue = preparation === "oil" ? "less-added-oil" : "less-effort";
  const rowFacts: Record<string, RowFacts> = {
    staple: facts("current", context.preferredStaple === "any" ? [] : [context.preferredStaple], staple ? [context.preferredStaple] : []),
    protein: facts("current", context.preferredProtein === "any" ? [] : [context.preferredProtein], mainProtein ? [context.preferredProtein] : []),
    cuisine: facts("current", context.cuisine === "any" ? [] : [context.cuisine], cuisine ? [context.cuisine] : []),
    preparation: facts(preparationScope, preparation ? [preparationValue] : [], preparationFit ? [preparationValue] : [], preparationAvailable),
    "saved-styles": facts("saved", requestedStyles, styles),
    "nutrition-direction": facts("saved", profile.preferenceTags.filter(tag => ["High-protein", "Vegetable-forward"].includes(tag)), [...(proteinPreference ? ["High-protein"] : []), ...(plantPreference ? ["Vegetable-forward"] : [])]),
  };
  const preferenceRows: PreferenceScoreRow[] = [
    { key: "staple", label: localized(locale, "Selected staple", "本餐主食"), points: staple ? 2 : 0, note: localized(locale, staple ? "Matches the selected staple: +2 product preference points." : context.preferredStaple === "any" ? "No staple preference selected: +0." : "Selected staple does not match: +0. This is a flexible preference.", staple ? "符合本餐主食，加 2 點產品偏好分。" : context.preferredStaple === "any" ? "尚未選擇主食偏好，加 0 點。" : "已選主食未符合，加 0 點；此偏好保留彈性。") },
    { key: "protein", label: localized(locale, "Selected main protein", "本餐主菜"), points: mainProtein ? 2 : 0, note: localized(locale, mainProtein ? "A declared protein ingredient is in the selected group: +2 product preference points." : context.preferredProtein === "any" ? "No main protein selected: +0." : "No declared protein ingredient is in the selected group: +0. This is a flexible preference.", mainProtein ? "配方標示的蛋白質食材屬於本餐選擇的主菜類別，加 2 點產品偏好分。" : context.preferredProtein === "any" ? "尚未選擇主菜，加 0 點。" : "配方標示的蛋白質食材不屬於已選主菜類別，加 0 點；此偏好保留彈性。") },
    { key: "cuisine", label: localized(locale, "Selected cuisine", "本餐料理類型"), points: cuisine ? 2 : 0, note: localized(locale, cuisine ? "Matches the selected cuisine group: +2 product preference points." : context.cuisine === "any" ? "No cuisine preference selected: +0." : "Selected cuisine does not match: +0. This is a flexible preference.", cuisine ? "符合本餐料理類型，加 2 點產品偏好分。" : context.cuisine === "any" ? "尚未選擇料理類型偏好，加 0 點。" : "已選料理類型未符合，加 0 點；此偏好保留彈性。") },
    { key: "preparation", label: localized(locale, "Preparation preference", "作法偏好"), points: preparationFit ? 2 : 0,
      note: preparation === "oil" ? localized(locale, `Requested less added oil: ${round(oilPer100g)} g/100 g; +2 when at most 1 g/100 g. This is a product threshold, not a nutrition standard.`, `偏好較少添加油：每 100 克含 ${round(oilPer100g)} 克添加油；不超過 1 克時加 2 點。這是產品門檻，並非營養標準。`)
        : preparation === "time" ? !preparationAvailable
          ? localized(locale, "Ingredients still need preparation. Total cooking time is unknown, so the less-effort preference cannot be confirmed: +0.", "食材仍需前置準備，完整料理時間未知，無法確認符合較省力偏好：加 0 點。")
          : localized(locale, `Requested less effort: ${recipe.prepMinutes} estimated assembly minutes; +2 when at most 10 minutes using prepared ingredients. Product threshold; preparation from raw ingredients is not included.`, `偏好較省力：備妥食材後預估 ${recipe.prepMinutes} 分鐘組裝；不超過 10 分鐘時加 2 點，這是產品門檻，不含從生食材開始的前置烹調。`)
          : localized(locale, "No preparation preference is selected: +0. Current preparation choices override the equivalent saved preference; this group counts once.", "未選擇作法偏好，加 0 點；本餐作法選擇優先於相同的已儲存偏好，此組只計一次。") },
    { key: "saved-styles", label: localized(locale, "Saved meal styles", "已儲存餐食風格"), points: styles.length ? 2 : 0, note: localized(locale, styles.length ? "At least one structured meal-style match: +2 total, regardless of how many styles match." : requestedStyles.length > 0 ? "Saved meal styles were selected but do not match: +0." : "No supported saved meal-style group is active: +0.", styles.length ? "符合至少一項結構化餐食風格，此組合計加 2 點，不因符合多項而累加。" : requestedStyles.length > 0 ? "已選餐食風格未符合，加 0 點。" : "目前沒有參與排序的已儲存餐食風格，加 0 點。") },
    { key: "nutrition-direction", label: localized(locale, "Requested nutrient direction", "已選營養方向"), points: proteinPreference || plantPreference ? 2 : 0,
      note: !profile.preferenceTags.some(tag => ["High-protein", "Vegetable-forward"].includes(tag)) ? localized(locale, "No protein or FVNS direction selected: +0.", "尚未選擇蛋白質或蔬果堅果種子方向，加 0 點。") : localized(locale, "Only if requested: protein >8.5 g/100 g or eligible fruit/vegetables/nuts/seeds >40% gives +2 total. This product bonus intentionally reinforces an explicit preference separately from model C points; both matches still count once.", "僅在已選擇時，蛋白質超過每 100 克 8.5 克，或模型合格蔬果堅果種子比例超過 40%，此組合計加 2 點。這是另行強化明確偏好的產品加分，與模型 C 分分開；兩項都符合仍只計一次。") },
  ].map(row => ({ ...row, ...rowFacts[row.key] }));
  const preference = preferenceRows.reduce((sum, row) => sum + row.points, 0);
  const fit = (scope: "current" | "saved"): PreferenceFit => {
    const rows = preferenceRows.filter(row => row.active && row.scope === scope);
    return { points: rows.reduce((sum, row) => sum + row.points, 0), possible: rows.length * 2, matched: rows.filter(row => row.matched).length, selected: rows.length };
  };
  const nutrient = model.cTotal! - model.points.a.saturatedFat! - model.points.a.freeSugars! - model.points.a.salt!;
  const energy = 10 - model.points.a.energy!;
  const inputBasis = recipe.ingredients.flatMap(ingredient => {
    const food = foods.find(item => item.id === ingredient.foodId);
    if (!food) return [];
    const basis = ingredient.processing === "pureed" && ingredient.preparationModelBasis ? ingredient.preparationModelBasis : food.modelBasis;
    return [{ foodId: food.id, label: food.label[locale], note: basis.note[locale], sourceUrls: basis.sourceUrls }];
  });
  const sourceUrls = [...new Set([NPM2018_SOURCE_URL, ...inputBasis.flatMap(item => item.sourceUrls)])];
  return { model, nutrient, energy, preference, nutritionReference: nutrient + energy, nutritionLevel: getNutritionLevel(nutrient + energy), currentPreference: fit("current"), savedPreference: fit("saved"), unsupportedSavedPreferences, total: nutrient + energy + preference, preferenceRows,
    inputBasis,
    basis: { normalization: "per-100g", model: "UK NPM 2018", version: NPM2018_VERSION, sourceUrls,
      note: localized(locale, "UK NPM 2018 composition is calculated per 100 g. The nutrition reference is nutrient + energy =10 minus the official raw score; energy is counted once. After current-meal and saved preferences are compared separately, recipes are compared by nutrition level (18 or more, 14 to 17, 13 or less), not by single points. These levels and this priority are a product policy, not a scientifically weighted health score or personal adequacy assessment. Free sugars use reviewed classifications, not the unknown USDA added-sugar field. Salt is sodium (mg) ×2.5/1000; AOAC compatibility is documented at dataset level.", "以每 100 克組成計算 UK NPM 2018。營養參考＝營養項＋能量項＝10 減官方原始分，能量只計一次；先分別比較本餐及已儲存偏好，再比較營養級別（18 以上、14 至 17、13 以下），不逐點比較。這些級別與優先順序是產品規則，不是科學加權的健康分數或個人營養充足評估。游離糖採已審核分類，不套用未知的 USDA 添加糖欄位；鹽當量為鈉（毫克）乘 2.5 再除以 1000，AOAC 相容性依資料集紀錄。") } };
};

export const getRecipeRankingTier = (score: PilotScore): number[] => [-score.currentPreference.points, -score.savedPreference.points, -score.nutritionLevel];

const recipeFitReasons = (recipe: StandardizedRecipe, score: PilotScore, context: MealContext, locale: Locale) => {
  const text = (en: string, zh: string) => localized(locale, en, zh);
  const stapleNames: Record<string, string> = { rice: "米飯", noodles: "麵類", bread: "麵包", potato: "馬鈴薯／地瓜", other: "其他主食", none: "不另加主食" };
  const englishStapleNames: Record<string, string> = { rice: "rice", noodles: "noodles", bread: "bread or wraps", potato: "potato or sweet potato", other: "other grains", none: "no separate staple" };
  const stapleName = (locale === "zh" ? stapleNames : englishStapleNames)[context.preferredStaple];
  const cuisineName = context.cuisine === "asian" ? text("Asian-style", "亞洲風格") : text("Western-style", "西式風格");
  const proteinName = context.preferredProtein === "any" ? "" : locale === "zh" ? proteinGroupLabels[context.preferredProtein].zh : proteinGroupLabels[context.preferredProtein].en.toLowerCase();
  const matches: string[] = [], mismatches: string[] = [];
  for (const row of score.preferenceRows.filter(item => item.active)) {
    if (row.key === "staple") {
      (row.matched ? matches : mismatches).push(row.matched ? text(`Matches your selected staple: ${stapleName}.`, `符合本餐選擇的主食：${stapleName}。`) : text(`Does not match your selected staple (${stapleName}); it remains a flexible alternative.`, `未符合本餐選擇的主食（${stapleName}），保留為彈性替代選項。`));
    } else if (row.key === "protein") {
      (row.matched ? matches : mismatches).push(row.matched ? text(`Matches your selected main protein: ${proteinName}.`, `符合本餐選擇的主菜：${proteinName}。`) : text(`Does not match your selected main protein (${proteinName}); it remains a flexible alternative.`, `未符合本餐選擇的主菜（${proteinName}），保留為彈性替代選項。`));
    } else if (row.key === "cuisine") {
      (row.matched ? matches : mismatches).push(row.matched ? text(`Matches your selected cuisine: ${cuisineName}.`, `符合本餐料理偏好：${cuisineName}。`) : text(`Does not match your selected cuisine (${cuisineName}); it remains a flexible alternative.`, `未符合本餐料理偏好（${cuisineName}），保留為彈性替代選項。`));
    } else if (row.key === "preparation") {
      if (row.matched && row.matchedValues.includes("less-added-oil")) matches.push(text("Matches your preference for at most 1 g added oil per 100 g.", "符合每 100 克不超過 1 克添加油的作法偏好。"));
      else if (row.matched) matches.push(text("Matches your preference for at most 10 minutes of assembly with prepared ingredients.", "符合備妥食材後 10 分鐘內組裝的偏好。"));
      else mismatches.push(row.available ? text("Does not meet the selected preparation preference; it remains flexible.", "未符合選擇的作法偏好，保留為彈性條件。") : text("Less effort cannot be confirmed because ingredients still need preparation and total cooking time is unknown.", "食材仍需前置準備，完整料理時間未知，無法確認符合較省力偏好。"));
    } else {
      if (row.matchedValues.length) matches.push(text(`Matches saved ${row.key === "saved-styles" ? "styles" : "nutrient directions"}: ${row.matchedValues.map(value => label(value, locale)).join(", ")}.`, `符合已儲存${row.key === "saved-styles" ? "風格" : "營養方向"}：${row.matchedValues.map(value => label(value, locale)).join("、")}。`));
      if (row.unmatchedValues.length) mismatches.push(text(`Saved preferences not matched: ${row.unmatchedValues.map(value => label(value, locale)).join(", ")}. These remain flexible.`, `未符合的已儲存偏好：${row.unmatchedValues.map(value => label(value, locale)).join("、")}；這些條件保留彈性。`));
    }
  }
  if (score.unsupportedSavedPreferences.length) mismatches.push(text(`Retained saved preferences are unavailable for this catalog and do not affect ranking: ${score.unsupportedSavedPreferences.map(value => label(value, locale)).join(", ")}.`, `保留的已儲存偏好目前無法由此配方集判定，不影響排序：${score.unsupportedSavedPreferences.map(value => label(value, locale)).join("、")}。`));
  const matchedPreferenceReasons = matches.slice(0, 2);
  if (!matches.length) matches.push(score.currentPreference.selected + score.savedPreference.selected === 0
    ? score.unsupportedSavedPreferences.length
      ? text("No applicable meal preferences selected; eligible recipes are ordered by nutrition level and take turns within it.", "目前沒有可套用的餐食偏好，符合必要條件的配方依營養級別排列，同級內輪流出現。")
      : text("No meal preferences selected; eligible recipes are ordered by nutrition level and take turns within it.", "尚未選擇餐食偏好，符合必要條件的配方依營養級別排列，同級內輪流出現。")
    : text("No selected preference group matched; this is an eligible alternative.", "未符合已選偏好組，此配方仍符合必要條件，可作為替代選項。"));
  const preparationFact = context.ingredientReadiness === "needs-prep"
    ? text("Ingredients need preparation; total cooking time is unknown.", "食材仍需前置準備，完整料理時間未知。")
    : context.ingredientReadiness === "ready"
      ? text(`About ${recipe.prepMinutes} minutes to assemble with your prepared ingredients.`, `使用已備妥食材，約 ${recipe.prepMinutes} 分鐘組裝。`)
      : text(`${recipe.prepMinutes} minutes is assembly time after ingredients are prepared; preparation time is not included.`, `${recipe.prepMinutes} 分鐘為食材備妥後的組裝時間，不含前置烹調。`);
  return { matchReasons: [...matches.slice(0, 2), preparationFact], matchedPreferenceReasons,
    ingredientReadiness: context.ingredientReadiness, mismatchReasons: [...new Set(mismatches)] };
};

export const recommendPilotMeals = (
  profile: Profile, suppliedContext: MealContext = defaultMealContext,
  locale: Locale = "en", now = new Date(), todayLog?: TodayLog, history: DayHistory[] = [],
): PilotResult => {
  const context = normalizeMealContext(suppliedContext);
  const portionChoice = getPortionPreference(context, profile.avoidTags.includes("Large portions"));
  const meals = new Map(recommendationDataset.map(meal => [meal.id, meal]));
  const exclusions: PilotResult["trace"]["exclusions"] = [];
  const records = buildHistoryVarietyContext(history, now, todayLog);
  const candidates: PreferenceCandidate<PilotRecommendation>[] = [];
  const preferenceOrder = RECIPE_RANKING_POLICY.order;
  const method = localized(locale,
    "Apply hard avoids and strict meal conditions first. Compare current-meal preference points, then saved-preference points, then the nutrition level of the unchanged nutrition reference (10 minus raw UK NPM 2018 score): 18 or more, 14 to 17, or 13 or less. These are separate priority levels, not a weighted health score. Within equal levels, recognized records from today and the preceding six calendar days affect variety: fewer protein-source repeats, fewer staple repeats, then less recent matches. Options shown together then differ in staple where possible (or in main protein once a staple is selected), followed by a fixed rotation for this date and meal window, then stable IDs. Records and rotation do not alter nutrition or establish a deficit.",
    "先套用避食與本餐必要條件，再依序比較本餐偏好分、已儲存偏好分，以及未改變的營養參考（10 減 UK NPM 2018 原始分）所屬的營養級別：18 以上、14 至 17、13 以下。這是分開的優先層級，不是加權健康分數。同級時參考今天與前六個日曆日的可辨識紀錄：依序比較蛋白質來源重複較少、主食重複較少及最近紀錄較早者，接著讓同一組選項的主食盡量不同（已選主食時改為主要蛋白質來源不同），再依此日期與餐別時段的固定輪替順序，最後依固定代碼。紀錄與輪替不改變營養，也不代表營養缺口。");
  const rotationSeed = getRotationSeed(now);
  for (const recipe of standardizedRecipes) {
    const meal = meals.get(recipe.mealId);
    if (!meal) { exclusions.push({ mealId: recipe.mealId, stage: "evidence", reasons: ["catalog-meal-missing"] }); continue; }
    const conflicts = [...getHardAvoidConflicts(profile, meal, getMealTimeWindow(now)), ...getRecipeHardAvoidConflicts(profile, recipe, portionChoice.portion)];
    if (conflicts.length) { exclusions.push({ mealId: recipe.mealId, stage: "hard-avoid", reasons: conflicts.map(conflict => `${conflict.tag}:${conflict.certainty}`) }); continue; }
    const contextConflicts = getContextExclusions(profile, context, recipe);
    if (contextConflicts.length) { exclusions.push({ mealId: recipe.mealId, stage: "context", reasons: contextConflicts }); continue; }
    const calculation = calculateRecipe(recipe, portionChoice.portion, locale);
    const gaps = calculation.ingredientAmounts.filter((item, index) => !item.food || item.grams === null || item.food.state !== recipe.ingredients[index].weighedState || (item.grams > 0 && !Array.isArray(item.food.avoidTags)));
    if (!calculation.portionGrams || gaps.length || (["kcal", "protein", "carbs", "fat"] as const).some(key => calculation.nutrition[key] === null)) {
      exclusions.push({ mealId: recipe.mealId, stage: "evidence", reasons: ["incomplete-core-portion-or-nutrient-data", ...gaps.map(item => item.foodId)] }); continue;
    }
    const score = calculateScoreForRecipe(recipe, profile, context, locale);
    if (!score) {
      exclusions.push({ mealId: recipe.mealId, stage: "evidence", reasons: calculateRecipeProfile(recipe).missing.map(key => `model-input:${key}`) }); continue;
    }
    const fitReasons = recipeFitReasons(recipe, score, context, locale);
    const reasons = [localized(locale, `Preference-first order: current ${score.currentPreference.points}/${score.currentPreference.possible}, saved ${score.savedPreference.points}/${score.savedPreference.possible}, then the level of nutrition reference ${score.nutritionReference}.`, `依序比較本餐偏好 ${score.currentPreference.points}/${score.currentPreference.possible}、已儲存偏好 ${score.savedPreference.points}/${score.savedPreference.possible}，再比較營養參考 ${score.nutritionReference} 所屬級別。`),
      score.basis.note,
      ...score.preferenceRows.filter(row => row.active).map(row => row.note), ...fitReasons.mismatchReasons];
    if (context.preferredStaple !== "any" && recipe.staple !== context.preferredStaple) reasons.push(localized(locale, "Does not match the selected staple; this flexible preference contributes 0 points rather than excluding the recipe.", "未符合本餐選擇的主食；此偏好保留彈性，該項加 0 點，不據此排除配方。"));
    if (score.preferenceRows.some(row => row.key === "protein" && row.active && !row.matched)) reasons.push(localized(locale, "Does not match the selected main protein; this flexible preference contributes 0 points rather than excluding the recipe.", "未符合本餐選擇的主菜；此偏好保留彈性，該項加 0 點，不據此排除配方。"));
    if (context.cuisine !== "any" && recipe.cuisine !== context.cuisine) reasons.push(localized(locale, "Does not match the selected cuisine; this flexible preference contributes 0 points rather than excluding the recipe.", "未符合本餐料理類型；此偏好保留彈性，該項加 0 點，不據此排除配方。"));
    if (requiresWarmMeal(profile, context)) reasons.push(localized(locale, "Only recipes documented as warm are eligible.", "只保留明確標示為溫熱的食譜。"));
    if (context.maxPrepMinutes !== null) reasons.push(localized(locale, `Fits the ${context.maxPrepMinutes}-minute limit using prepared ingredients.`, `以備妥食材組裝，符合 ${context.maxPrepMinutes} 分鐘上限。`));
    reasons.push(portionChoice.basis === "explicit-appetite" ? localized(locale, "Uses your explicit portion choice, overriding the hunger suggestion. The per 100 g profile score is unchanged by serving size.", "採用你明確選擇的份量，優先於飢餓感建議；每 100 克的模型分數不因份量改變。") : portionChoice.basis === "hunger-preference" ? localized(locale, "Hunger suggests this editable recipe portion; it is not an estimated energy requirement. The per 100 g profile score is portion-invariant.", "飢餓感先決定可調整的配方份量；並非估算熱量需求，每 100 克的模型分數不因份量改變。") : localized(locale, "Uses the standard recipe portion, not an individually assessed requirement.", "採用標準配方份量，不代表個人化評估的必要份量。"));
    if (profile.eatingStyle === "Mostly takeout") reasons.push(localized(locale, "Restaurant ingredients and weights are unconfirmed; these totals describe the listed recipe only.", "餐廳食材與重量未經確認；這些數值只描述列出的配方。"));
    const identities = recipe.ingredients.filter(ingredient => ingredient.role === "protein").map(ingredient => resolveFoodIdentity(calculation.ingredientAmounts.find(item => item.foodId === ingredient.foodId)?.food?.label.en ?? "", ingredient.foodId));
    const rankTier = getRecipeRankingTier(score);
    const value: PilotRecommendation = { meal, recipe, portion: portionChoice.portion, ...calculation, score, reasons, ...fitReasons,
      trace: { portionBasis: portionChoice.basis, practicalFit: score.preference, pointBreakdown: score.preferenceRows, preferenceOrder,
        rankingPolicy: RECIPE_RANKING_POLICY, rankTier, rotationSeed,
        matchedPreferences: score.preferenceRows.filter(row => row.active && row.matched).map(row => row.key),
        unmatchedPreferences: score.preferenceRows.filter(row => row.active && row.unmatchedValues.length).map(row => row.key),
        recentRecordsUsed: [], nutritionEquivalentRecipeIds: [], selectionMethod: method,
        variety: { recordMatches: [], selectedMatches: [], reason: "", scope: records.scope, applied: false, evidence: [], comparison: null } } };
    candidates.push({ id: recipe.mealId, value, tier: rankTier, proteins: [...new Set(identities.flatMap(identity => identity.protein ? [identity.protein] : []))], staple: recipe.staple === "none" ? null : recipe.staple });
  }
  const ordered = pickHistoryVariedChoices(candidates, records, candidates.length, {
    key: id => getRotationKey(rotationSeed, id), groupSize: RECIPE_OPTION_GROUP_SIZE,
    varyBy: context.preferredStaple === "any" ? "staple" : "protein",
  });
  const eligibleRecipes = ordered.map((choice, index) => {
    const variety = describeHistoryVariety(choice, records.scope, locale, "recipe", value => recipeDisplayName(value.recipe, locale));
    choice.value.reasons[0] = localized(locale, `Rank ${index + 1} of ${candidates.length}: current preference ${choice.value.score.currentPreference.points}, then saved preference ${choice.value.score.savedPreference.points}, then the level of nutrition reference ${choice.value.score.nutritionReference}. Equal priority levels use recorded variety, then this date and meal window's rotation.`, `在 ${candidates.length} 道符合條件配方中排第 ${index + 1} 名：先比較本餐偏好 ${choice.value.score.currentPreference.points}，再比較已儲存偏好 ${choice.value.score.savedPreference.points}，最後比較營養參考 ${choice.value.score.nutritionReference} 所屬級別；相同層級依紀錄變化，再依此日期與餐別時段輪替。`);
    choice.value.trace.variety = variety;
    choice.value.trace.recentRecordsUsed = variety.evidence.map(record => `${record.date} ${record.mealName}: ${record.foodNames.join(", ")}`);
    choice.value.reasons.push(variety.reason);
    return choice.value;
  });
  return { recommendations: eligibleRecipes.slice(0, RECIPE_OPTION_GROUP_SIZE), eligibleRecipes, candidateCount: candidates.length, excludedCount: exclusions.length,
    trace: { catalogCount: standardizedRecipes.length, exclusions, eligibleRecipeIds: ordered.map(choice => choice.id), selectionMethod: method,
      rankingPolicy: RECIPE_RANKING_POLICY, rotationSeed,
      candidateScores: ordered.map(choice => ({ mealId: choice.id, score: choice.value.score })) } };
};

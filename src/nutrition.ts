import { recommendationDataset } from "./data";
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
import type { NutrientKey, NutrientValues, NutritionPortion, SourceFood, StandardizedRecipe } from "./nutrition-types";
import type { DayHistory, Locale, MustAvoidTag, Profile, Recommendation, TodayLog } from "./types";

export const nutrientUnits: Record<NutrientKey, string> = {
  kcal: "kcal", energyKj: "kJ", protein: "g", carbs: "g", fat: "g", saturatedFat: "g",
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
    variety: HistoryVarietyTrace;
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
    candidateScores: Array<{ mealId: string; score: PilotScore }>;
  };
};

export type PreferenceScoreRow = { key: string; label: string; points: number; note: string };
export type PilotScore = {
  model: NutrientProfileResult;
  nutrient: number;
  energy: number;
  preference: number;
  total: number;
  preferenceRows: PreferenceScoreRow[];
  basis: { normalization: "per-100g"; model: "UK NPM 2018"; version: string; sourceUrls: string[]; note: string };
  inputBasis: Array<{ foodId: string; label: string; note: string; sourceUrls: string[] }>;
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
  "usda-168917": [], "usda-168409": [], "usda-175180": ["Shellfish"], "usda-171971": ["Shellfish"],
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

// Model inputs use the standard recipe directly, before display rounding or
// portion scaling. Changing a serving factor cannot move a threshold band.
export const calculateRecipeProfile = (recipe: StandardizedRecipe, foods: SourceFood[] = sourceFoods): NutrientProfileResult => {
  const byId = new Map(foods.map(food => [food.id, food]));
  const validAmounts = recipe.ingredients.length > 0 && recipe.ingredients.every(item => finiteNonnegative(item.grams));
  const grams = validAmounts ? recipe.ingredients.reduce((sum, item) => sum + item.grams, 0) : 0;
  const weighted = (read: (food: SourceFood) => number | null | undefined) => {
    if (grams <= 0) return null;
    let sum = 0;
    for (const ingredient of recipe.ingredients) {
      if (ingredient.grams === 0) continue;
      const food = byId.get(ingredient.foodId);
      if (!food || food.state !== ingredient.weighedState) return null;
      const value = read(food);
      if (!finiteNonnegative(value)) return null;
      sum += ingredient.grams * value;
    }
    return sum / grams;
  };
  const fiberCompatible = grams > 0 && recipe.ingredients.every(item => item.grams === 0 || byId.get(item.foodId)?.modelBasis?.fiberMethod === "AOAC-compatible");
  const fvnsStates = new Set(recipe.ingredients.filter(item => item.grams > 0 && byId.get(item.foodId)?.modelBasis?.fvnsEligible === true).map(item => byId.get(item.foodId)!.state));
  const mixedFvnsStates = fvnsStates.has("raw") && fvnsStates.has("cooked");
  const result = calculateNutrientProfile({ energyKj: weighted(food => food.nutrientsPer100g.energyKj), saturatedFat: weighted(food => food.nutrientsPer100g.saturatedFat),
    freeSugars: weighted(food => food.modelBasis?.freeSugarsPer100g), salt: weighted(food => food.nutrientsPer100g.sodium === null ? null : food.nutrientsPer100g.sodium * 2.5 / 1000),
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
  const oilPer100g = recipe.seasoning.oilGrams / recipe.ingredients.reduce((sum, item) => sum + item.grams, 0) * 100;
  const preparation = profile.feelToday === "Need something light" ? "oil" : profile.feelToday === "Low energy" ? "time" : profile.preferenceTags.includes("Light meals") ? "oil" : null;
  const preparationFit = preparation === "oil" ? oilPer100g <= 1 : preparation === "time" ? recipe.prepMinutes <= 10 : false;
  const styles = meal ? getMatchedPreferenceTags(profile, meal).filter(tag => !["High-protein", "Vegetable-forward", "Light meals", "Warm meals", "Rice-based meals", "Noodle-based meals"].includes(tag)) : [];
  if (profile.preferenceTags.includes("Rice-based meals") && recipe.staple === "rice") styles.push("Rice-based meals");
  if (profile.preferenceTags.includes("Noodle-based meals") && recipe.staple === "noodles") styles.push("Noodle-based meals");
  if (profile.preferenceTags.includes("Warm meals") && recipe.temperature === "warm") styles.push("Warm meals");
  const proteinPreference = profile.preferenceTags.includes("High-protein") && model.inputs.protein! > 8.5;
  const plantPreference = profile.preferenceTags.includes("Vegetable-forward") && model.inputs.fvnsPercent! > 40;
  const preferenceRows: PreferenceScoreRow[] = [
    { key: "staple", label: localized(locale, "Selected staple", "本餐主食"), points: staple ? 2 : 0, note: localized(locale, staple ? "Matches the selected staple: +2 product preference points." : context.preferredStaple === "any" ? "No staple preference selected: +0." : "Selected staple does not match: +0. This is a flexible preference.", staple ? "符合本餐主食，加 2 點產品偏好分。" : context.preferredStaple === "any" ? "尚未選擇主食偏好，加 0 點。" : "已選主食未符合，加 0 點；此偏好保留彈性。") },
    { key: "cuisine", label: localized(locale, "Selected cuisine", "本餐料理類型"), points: cuisine ? 2 : 0, note: localized(locale, cuisine ? "Matches the selected cuisine group: +2 product preference points." : context.cuisine === "any" ? "No cuisine preference selected: +0." : "Selected cuisine does not match: +0. This is a flexible preference.", cuisine ? "符合本餐料理類型，加 2 點產品偏好分。" : context.cuisine === "any" ? "尚未選擇料理類型偏好，加 0 點。" : "已選料理類型未符合，加 0 點；此偏好保留彈性。") },
    { key: "preparation", label: localized(locale, "Preparation preference", "作法偏好"), points: preparationFit ? 2 : 0,
      note: preparation === "oil" ? localized(locale, `Requested less added oil: ${round(oilPer100g)} g/100 g; +2 when at most 1 g/100 g. This is a product threshold, not a nutrition standard.`, `偏好較少添加油：每 100 克含 ${round(oilPer100g)} 克添加油；不超過 1 克時加 2 點。這是產品門檻，並非營養標準。`)
        : preparation === "time" ? localized(locale, `Requested less effort: ${recipe.prepMinutes} estimated assembly minutes; +2 when at most 10 minutes using prepared ingredients. Product threshold.`, `偏好較省力：備妥食材後預估 ${recipe.prepMinutes} 分鐘組裝；不超過 10 分鐘時加 2 點，這是產品門檻。`)
          : localized(locale, "No preparation preference is selected: +0. Current preparation choices override the equivalent saved preference; this group counts once.", "未選擇作法偏好，加 0 點；本餐作法選擇優先於相同的已儲存偏好，此組只計一次。") },
    { key: "saved-styles", label: localized(locale, "Saved meal styles", "已儲存餐食風格"), points: styles.length ? 2 : 0, note: localized(locale, styles.length ? "At least one structured meal-style match: +2 total, regardless of how many styles match." : profile.preferenceTags.some(tag => !["High-protein", "Vegetable-forward", "Light meals", "Tea", "Coffee / caffeine", "Simple drinks", "Juices / smoothies"].includes(tag)) ? "Saved meal styles were selected but do not match: +0." : "No saved meal-style preference selected: +0.", styles.length ? "符合至少一項結構化餐食風格，此組合計加 2 點，不因符合多項而累加。" : profile.preferenceTags.some(tag => !["High-protein", "Vegetable-forward", "Light meals", "Tea", "Coffee / caffeine", "Simple drinks", "Juices / smoothies"].includes(tag)) ? "已選餐食風格未符合，加 0 點。" : "尚未選擇餐食風格偏好，加 0 點。") },
    { key: "nutrition-direction", label: localized(locale, "Requested nutrient direction", "已選營養方向"), points: proteinPreference || plantPreference ? 2 : 0,
      note: !profile.preferenceTags.some(tag => ["High-protein", "Vegetable-forward"].includes(tag)) ? localized(locale, "No protein or FVNS direction selected: +0.", "尚未選擇蛋白質或蔬果堅果種子方向，加 0 點。") : localized(locale, "Only if requested: protein >8.5 g/100 g or eligible fruit/vegetables/nuts/seeds >40% gives +2 total. This product bonus intentionally reinforces an explicit preference separately from model C points; both matches still count once.", "僅在已選擇時，蛋白質超過每 100 克 8.5 克，或模型合格蔬果堅果種子比例超過 40%，此組合計加 2 點。這是另行強化明確偏好的產品加分，與模型 C 分分開；兩項都符合仍只計一次。") },
  ];
  const preference = preferenceRows.reduce((sum, row) => sum + row.points, 0);
  const nutrient = model.cTotal! - model.points.a.saturatedFat! - model.points.a.freeSugars! - model.points.a.salt!;
  const energy = 10 - model.points.a.energy!;
  const sourceUrls = [...new Set([NPM2018_SOURCE_URL, ...recipe.ingredients.flatMap(ingredient => foods.find(food => food.id === ingredient.foodId)?.modelBasis?.sourceUrls ?? [])])];
  return { model, nutrient, energy, preference, total: nutrient + energy + preference, preferenceRows,
    inputBasis: recipe.ingredients.flatMap(ingredient => { const food = foods.find(item => item.id === ingredient.foodId); return food ? [{ foodId: food.id, label: food.label[locale], note: food.modelBasis.note[locale], sourceUrls: food.modelBasis.sourceUrls }] : []; }),
    basis: { normalization: "per-100g", model: "UK NPM 2018", version: NPM2018_VERSION, sourceUrls,
      note: localized(locale, "UK NPM 2018 profile composition is calculated per 100 g of the standard recipe. The NextBite total is 10 minus the official raw score plus product preference points; it is not the official profile score or a personal adequacy assessment. Energy is included once. Portion amounts are displayed separately. Free sugars use reviewed ingredient classifications, not the unknown USDA added-sugar field. Salt is source sodium (mg) ×2.5/1000. AOAC compatibility is documented at dataset level, not an individual meal assay.", "以標準配方每 100 克的組成計算 UK NPM 2018 模型。NextBite 總分是 10 減官方原始分再加產品偏好分；不是官方模型原始分，也不是個人營養充足評估。能量只計一次，實際選擇份量另外呈現。游離糖依已審核食材分類計算，並非套用未知的 USDA 添加糖欄位。鹽當量由來源鈉（毫克）乘 2.5 再除以 1000 計算。AOAC 相容性依資料集方法紀錄，並非逐份餐點實驗測定。") } };
};

export const recommendPilotMeals = (
  profile: Profile, suppliedContext: MealContext = defaultMealContext,
  locale: Locale = "en", now = new Date(), todayLog?: TodayLog, history: DayHistory[] = [],
): PilotResult => {
  const context = normalizeMealContext(suppliedContext);
  const portionChoice = getPortionPreference(context);
  const meals = new Map(recommendationDataset.map(meal => [meal.id, meal]));
  const exclusions: PilotResult["trace"]["exclusions"] = [];
  const records = buildHistoryVarietyContext(history, now, todayLog);
  const candidates: PreferenceCandidate<PilotRecommendation>[] = [];
  const preferenceOrder = ["total-descending", "exact-total-tie-record-variety", "exact-total-tie-alternative-variety", "stable-id"];
  const method = localized(locale,
    "After hard ingredient and meal-condition exclusions, all complete recipes are sorted by the actual NextBite total: nutrient contribution + energy contribution + product preference contribution =10 minus raw UK NPM 2018 profile score plus preference points. Only exact-total ties use today's and the preceding six calendar days' recognized records: fewer protein-source repeat meals, then fewer staple repeat meals, then less recent matches. Earlier-option variety and stable IDs resolve remaining ties. These are product variety rules; records do not change nutrition scores or establish a deficit.",
    "先套用食材與本餐必要條件的硬性排除，再依完整配方的 NextBite 實際總分排序：營養貢獻＋能量貢獻＋產品偏好貢獻＝10 減 UK NPM 2018 原始分再加偏好分。只有總分完全相同時，才參考今天與前六個日曆日的可辨識紀錄：先選蛋白質來源重複餐數較少者，再比較主食重複餐數，再比較最近紀錄較早者，最後依前面選項的變化與固定代碼決定。這是產品變化規則，紀錄不改變營養分數，也不代表營養缺口。");
  for (const recipe of standardizedRecipes) {
    const meal = meals.get(recipe.mealId);
    if (!meal) { exclusions.push({ mealId: recipe.mealId, stage: "evidence", reasons: ["catalog-meal-missing"] }); continue; }
    const conflicts = [...getHardAvoidConflicts(profile, meal, getMealTimeWindow(now)), ...getRecipeHardAvoidConflicts(profile, recipe, portionChoice.portion)];
    if (conflicts.length) { exclusions.push({ mealId: recipe.mealId, stage: "hard-avoid", reasons: conflicts.map(conflict => `${conflict.tag}:${conflict.certainty}`) }); continue; }
    const contextConflicts = getContextExclusions(profile, context, recipe);
    if (contextConflicts.length) { exclusions.push({ mealId: recipe.mealId, stage: "context", reasons: contextConflicts }); continue; }
    const calculation = calculateRecipe(recipe, portionChoice.portion, locale);
    const gaps = calculation.ingredientAmounts.filter((item, index) => !item.food || item.grams === null || item.food.state !== recipe.ingredients[index].weighedState || !Object.prototype.hasOwnProperty.call(ingredientAvoidTags, item.foodId));
    if (!calculation.portionGrams || gaps.length || (["kcal", "protein", "carbs", "fat"] as const).some(key => calculation.nutrition[key] === null)) {
      exclusions.push({ mealId: recipe.mealId, stage: "evidence", reasons: ["incomplete-core-portion-or-nutrient-data", ...gaps.map(item => item.foodId)] }); continue;
    }
    const score = calculateScoreForRecipe(recipe, profile, context, locale);
    if (!score) {
      exclusions.push({ mealId: recipe.mealId, stage: "evidence", reasons: calculateRecipeProfile(recipe).missing.map(key => `model-input:${key}`) }); continue;
    }
    const reasons = [localized(locale, `Selected by the highest eligible totals: nutrient ${score.nutrient} + energy ${score.energy} + preference ${score.preference} = ${score.total}.`, `依符合條件配方的最高總分選出：營養 ${score.nutrient}＋能量 ${score.energy}＋偏好 ${score.preference}＝${score.total}。`),
      score.basis.note,
      ...score.preferenceRows.filter(row => row.points > 0).map(row => row.note)];
    if (context.preferredStaple !== "any" && recipe.staple !== context.preferredStaple) reasons.push(localized(locale, "Does not match the selected staple; this flexible preference contributes 0 points rather than excluding the recipe.", "未符合本餐選擇的主食；此偏好保留彈性，該項加 0 點，不據此排除配方。"));
    if (context.cuisine !== "any" && recipe.cuisine !== context.cuisine) reasons.push(localized(locale, "Does not match the selected cuisine; this flexible preference contributes 0 points rather than excluding the recipe.", "未符合本餐料理類型；此偏好保留彈性，該項加 0 點，不據此排除配方。"));
    if (requiresWarmMeal(profile, context)) reasons.push(localized(locale, "Only recipes documented as warm are eligible.", "只保留明確標示為溫熱的食譜。"));
    if (context.maxPrepMinutes !== null) reasons.push(localized(locale, `Fits the ${context.maxPrepMinutes}-minute limit using prepared ingredients.`, `以備妥食材組裝，符合 ${context.maxPrepMinutes} 分鐘上限。`));
    reasons.push(portionChoice.basis === "explicit-appetite" ? localized(locale, "Uses your explicit portion choice, overriding the hunger suggestion. The per 100 g profile score is unchanged by serving size.", "採用你明確選擇的份量，優先於飢餓感建議；每 100 克的模型分數不因份量改變。") : portionChoice.basis === "hunger-preference" ? localized(locale, "Hunger suggests this editable recipe portion; it is not an estimated energy requirement. The per 100 g profile score is portion-invariant.", "飢餓感先決定可調整的配方份量；並非估算熱量需求，每 100 克的模型分數不因份量改變。") : localized(locale, "Uses the standard recipe portion, not an individually assessed requirement.", "採用標準配方份量，不代表個人化評估的必要份量。"));
    if (profile.eatingStyle === "Mostly takeout") reasons.push(localized(locale, "Restaurant ingredients and weights are unconfirmed; these totals describe the listed recipe only.", "餐廳食材與重量未經確認；這些數值只描述列出的配方。"));
    const identities = recipe.ingredients.filter(ingredient => ingredient.role === "protein").map(ingredient => resolveFoodIdentity(calculation.ingredientAmounts.find(item => item.foodId === ingredient.foodId)?.food?.label.en ?? "", ingredient.foodId));
    const value: PilotRecommendation = { meal, recipe, portion: portionChoice.portion, ...calculation, score, reasons,
      trace: { portionBasis: portionChoice.basis, practicalFit: score.preference, pointBreakdown: score.preferenceRows, preferenceOrder,
        matchedPreferences: score.preferenceRows.filter(row => row.points > 0).map(row => row.key),
        unmatchedPreferences: [...(context.preferredStaple !== "any" && recipe.staple !== context.preferredStaple ? ["staple"] : []), ...(context.cuisine !== "any" && recipe.cuisine !== context.cuisine ? ["cuisine"] : [])],
        recentRecordsUsed: [], nutritionEquivalentRecipeIds: [], selectionMethod: method,
        variety: { recordMatches: [], selectedMatches: [], reason: "", scope: records.scope, applied: false, evidence: [], comparison: null } } };
    candidates.push({ id: recipe.mealId, value, tier: [-score.total], proteins: [...new Set(identities.flatMap(identity => identity.protein ? [identity.protein] : []))], staple: recipe.staple === "none" ? null : recipe.staple });
  }
  const ordered = pickHistoryVariedChoices(candidates, records, candidates.length);
  const recommendations = ordered.slice(0, 3).map((choice, index) => {
    const variety = describeHistoryVariety(choice, records.scope, locale, "recipe", value => value.recipe.label[locale]);
    choice.value.reasons[0] = localized(locale, `Rank ${index + 1} of ${candidates.length} eligible recipes by total ${choice.value.score.total}; exact ties use declared ingredient variety.`, `以總分 ${choice.value.score.total} 排在 ${candidates.length} 道符合條件配方中的第 ${index + 1} 名；總分相同時，依明示食材變化規則決定。`);
    choice.value.trace.variety = variety;
    choice.value.trace.recentRecordsUsed = variety.evidence.map(record => `${record.date} ${record.mealName}: ${record.foodNames.join(", ")}`);
    choice.value.reasons.push(variety.reason);
    return choice.value;
  });
  return { recommendations, candidateCount: candidates.length, excludedCount: exclusions.length,
    trace: { catalogCount: standardizedRecipes.length, exclusions, eligibleRecipeIds: ordered.map(choice => choice.id), selectionMethod: method,
      candidateScores: ordered.map(choice => ({ mealId: choice.id, score: choice.value.score })) } };
};

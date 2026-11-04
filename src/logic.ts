import { drinkRecommendationDataset, recommendationDataset } from "./data";
import { buildDrinkSafetyMetadata } from "./catalog-metadata";
import type {
  AvoidanceCertainty,
  DailyStatus,
  DayHistory,
  DrinkOption,
  Locale,
  MealEntry,
  ParsedMealComponent,
  MustAvoidTag,
  Profile,
  Recommendation,
  RecommendationCardLabel,
  ScoredRecommendation,
  SelectionAdjustment,
  ScoreBreakdownItem,
  TodayIntakeSummary,
  TodayLog,
  WeeklyHistoryBasis,
} from "./types";

export type MealTimeWindow =
  | "breakfast"
  | "lunch"
  | "afternoon"
  | "dinner"
  | "late";

const preferenceTagMap: Record<string, string[]> = {
  "Chinese-style": ["chinese-style", "comfort", "warm", "mapo"],
  "Taiwanese-style": ["taiwanese-style", "bento"],
  Japanese: ["japanese-inspired", "set-meal", "soba", "udon"],
  Korean: ["korean-inspired", "kimchi", "bibimbap"],
  "American light meals": ["american-light", "sandwich", "wrap"],
  "Bowl meals": ["bowl", "rice bowl", "grain bowl", "poke bowl", "bibimbap"],
  "Set meals": ["set-meal", "set meal", "bento", "plate"],
  "Wraps / sandwiches": ["wrap", "sandwich"],
  "Portable meals": ["portable", "wrap", "sandwich", "hand roll"],
  "Soupy meals": ["soupy", "soup", "congee"],
  "Rice-based meals": ["rice-based", "bowl"],
  "Noodle-based meals": ["noodle", "udon", "soba"],
  "High-protein": ["high-protein"],
  "Light meals": ["light", "gentle"],
  "Warm meals": ["warm", "soupy", "comfort", "steamed"],
  "Comfort meals": ["comfort", "gentle", "congee", "soup", "curry"],
  "Quick grocery meals": ["quick", "ready-made", "rotisserie", "microwave", "grocery"],
  "Takeout-friendly": ["takeout", "convenient", "portable", "quick"],
  "Vegetable-forward": ["vegetable-forward", "vegetable", "greens", "salad", "bok choy", "broccoli", "cabbage"],
  "Breakfast-for-dinner": ["breakfast-for-dinner", "omelet", "toast", "egg"],
  "Plant-protein": ["plant-protein", "tofu", "beans", "chickpeas", "edamame", "tempeh"],
  "Coffee / caffeine": ["coffee", "green tea", "black tea", "milk tea", "energy drink", "caffeine"],
  Tea: ["tea", "green tea", "black tea"],
  "Simple drinks": ["water", "sparkling water", "tea"],
  "Juices / smoothies": ["smoothie", "juice", "green juice", "orange juice", "apple juice", "coconut water"],
  Mediterranean: ["mediterranean", "gyro", "hummus"],
  "Mexican-inspired": ["mexican-inspired", "burrito", "fajita", "quesadilla", "chili"],
};

const createBreakdownItem = (category: ScoreBreakdownItem["category"], points: number, note: string): ScoreBreakdownItem => ({
  category,
  points,
  note,
});


const ruleNoteTranslations: Record<string, string> = {
  "Protein is less prominent in the current logs, so protein-forward templates get a boost.": "目前紀錄中的蛋白質較少，因此蛋白質較多的餐型獲得加分。",
  "Protein is less prominent in the current logs, so templates with some protein get a boost.": "目前紀錄中的蛋白質較少，因此含有蛋白質的餐型獲得加分。",
  "Logs may be incomplete.": "紀錄可能不完整，不代表實際攝取量。",
  "Protein appears often in the current logs, so heavier protein-forward templates get a small reduction.": "目前紀錄常出現蛋白質食物，因此較厚重的蛋白質餐型略為減分。",
  "Protein fit is neutral for this meal.": "這個餐型的蛋白質配對沒有額外加減分。",
  "Vegetables are less prominent in the current logs, so vegetable-forward templates get priority.": "目前紀錄中的蔬菜較少，因此蔬菜較多的餐型優先。",
  "Vegetables are less prominent in the current logs, so this template gets a moderate boost.": "目前紀錄中的蔬菜較少，因此這個餐型獲得適度加分。",
  "Vegetables already appear in the current logs; this vegetable-forward template keeps a small bonus.": "目前紀錄已有蔬菜；這個蔬菜較多的餐型仍保留少量加分。",
  "Vegetable fit is neutral for this meal.": "這個餐型的蔬菜配對沒有額外加減分。",
  "Carbohydrate foods appear often in the current logs, so carb-heavy templates get a reduction.": "目前紀錄常出現碳水食物，因此碳水較多的餐型減分。",
  "A moderate-carb template adds variety to the current logged pattern.": "碳水適中的餐型為目前紀錄增加變化。",
  "A lower-carb template adds variety when carbohydrate foods appear often in the logs.": "目前紀錄常出現碳水食物，碳水較少的餐型可增加變化。",
  "Carb balance is neutral for this meal.": "這個餐型的碳水配對沒有額外加減分。",
  "Larger portions or fried cooking methods appear in the current logs, so lighter templates move up.": "目前紀錄有較大份量或油炸作法，因此較清爽的餐型加分。",
  "This medium-heaviness template gets a smaller bonus for the current logged pattern.": "依目前紀錄的組合，這個厚重程度適中的餐型獲得少量加分。",
  "Heavier templates get a reduction when larger portions or fried cooking methods appear in the logs.": "紀錄有較大份量或油炸作法時，較厚重的餐型減分。",
  "A lighter template gets a bonus for the current logged preparation and portion pattern.": "依目前記錄的作法與份量，較清爽的餐型獲得加分。",
  "Heavier templates get a small reduction for the current logged pattern.": "依目前紀錄的組合，較厚重的餐型略為減分。",
  "Heaviness fit is neutral for this meal.": "這個餐型的厚重程度沒有額外加減分。",
  "High convenience matches a takeout-leaning style.": "高便利性符合偏好外帶的習慣。",
  "Medium convenience still works for a takeout-leaning style.": "中等便利性也符合偏好外帶的習慣。",
  "This meal works well as takeout.": "這個餐型適合外帶。",
  "This meal fits a home-cooked routine.": "這個餐型符合在家料理的習慣。",
  "It also keeps effort low.": "準備起來也比較省事。",
  "It stays flexible for both home and takeout.": "在家料理或外帶都適合。",
  "It still fits one side of a mixed routine.": "符合混合用餐習慣中的一種選擇。",
  "The current logs include convenience meals, so a high-convenience option fits that pattern.": "目前紀錄包含便利餐點，高便利性的選項符合這個模式。",
  "A medium-effort option fits the practical pattern in the current logs.": "中等準備程度的選項符合目前紀錄的實用取向。",
  "Convenience fit is neutral for this meal.": "這個餐型的便利性沒有額外加減分。",
  "The activity preference gives protein-forward templates a small bonus.": "活動偏好讓蛋白質較多的餐型獲得少量加分。",
  "The activity preference gives templates with carbohydrate foods a small bonus.": "活動偏好讓含碳水食物的餐型獲得少量加分。",
  "A lighter meal often fits a lower-key day well.": "較清爽的餐型符合活動較少的偏好設定。",
  "Very heavy meals get a small pullback for a lower-key routine.": "活動較少的偏好設定讓較厚重的餐型略為減分。",
  "Soupy or gentler meals are the closest match when you want something warm.": "想吃溫熱餐點時，湯類或溫和餐型最符合設定。",
  "Warm and comforting meals fit how you feel today.": "溫熱、舒適的餐型符合目前的心情設定。",
  "Keeping the meal warm without too much heaviness is a nice fit here.": "溫熱而較清爽的餐型符合這個設定。",
  "A lighter meal fits how you want today to feel.": "較清爽的餐型符合目前想吃清淡一點的設定。",
  "Heavier meals get pulled back because you want something lighter today.": "因為設定想吃清淡一點，較厚重的餐型減分。",
  "Lower-energy days benefit from meals that are easier to follow through on.": "精神較少的設定優先考慮容易準備的餐型。",
  "Something warmer or more comforting can fit a lower-energy day well.": "溫熱、舒適的餐型符合精神較少的設定。",
  "The comfort setting gives warm or gentle templates a bonus; this is not a treatment recommendation.": "舒適偏好讓溫熱或溫和餐型加分，不代表治療建議。",
  "The comfort setting gives templates with protein a small editorial bonus.": "舒適偏好讓含蛋白質的餐型獲得少量編輯規則加分。",
  "The comfort setting gives lighter templates a small editorial bonus.": "舒適偏好讓較清爽的餐型獲得少量編輯規則加分。",
  "Profile fit is neutral for this meal.": "這個餐型與個人設定的配對沒有額外加減分。",
  "No strong preference match here.": "這個餐型沒有明顯符合已儲存的偏好。",
  "No declared contains, may-contain, or unknown conflict.": "已宣告的含有、可能含有與未知項目，沒有與避開設定衝突。",
  "Slightly reduced because today already had multiple rice-style meals.": "目前紀錄有多餐飯類，因此略為減分。",
  "Slightly reduced because noodles already showed up a lot today.": "目前紀錄多次出現麵類，因此略為減分。",
  "Reduced because this repeats a protein that already showed up multiple times today.": "重複目前紀錄中已多次出現的蛋白質食物，因此減分。",
  "Variety fit is neutral for this meal.": "這個餐型的變化性沒有額外加減分。",
  "Sweeter snacks or drinks already showed up today, so meals with more vegetables move up.": "目前紀錄有甜點或甜飲，因此蔬菜較多的餐型加分。",
  "A lighter meal can feel like a steadier next step after sweeter snacks or drinks.": "目前紀錄有甜點或甜飲，因此較清爽的餐型獲得少量偏好加分。",
  "A lighter meal often fits better after alcohol earlier in the day.": "目前紀錄有酒精飲品，編輯規則讓較清爽的餐型加分。",
  "Meals with some protein or vegetables tend to feel steadier here.": "這個設定讓含蛋白質或蔬菜的餐型獲得少量加分。",
  "Lighter meals tend to fit better when caffeinated drinks already showed up a lot today.": "目前紀錄多次出現含咖啡因飲品，編輯規則讓較清爽的餐型加分。",
  "Something steadier or gentler can pair better after multiple caffeinated drinks.": "目前紀錄有多杯含咖啡因飲品，編輯規則讓溫和餐型獲得少量加分。",
  "Snack and drink fit is neutral for this meal.": "這個餐型與點心、飲品紀錄的配對沒有額外加減分。",
  "This fits an earlier-in-the-day meal window.": "這個餐型符合較早的用餐時段。",
  "Heavier options get a small pullback earlier in the day.": "較早的用餐時段讓厚重餐型略為減分。",
  "This fits a more standard lunch-style meal.": "這個餐型符合午餐時段。",
  "This fits the afternoon transition without treating it as late-night.": "這個餐型符合下午時段；下午不視為深夜。",
  "Heavy options get a small afternoon pullback.": "較厚重的餐型在下午略為減分。",
  "Breakfast-style meals stay possible at dinner, but get a small pullback.": "早餐型餐點仍可在晚餐選擇，但略為減分。",
  "Warmer or more complete meals fit dinner a little better.": "溫熱或組合較完整的餐型在晚餐略為加分。",
  "Lighter meals fit a later meal window better.": "較清爽的餐型在較晚的用餐時段加分。",
  "Warm, gentler meals are a good fit later on.": "溫熱、溫和的餐型在較晚時段加分。",
  "Heavy meals get pulled back later in the day.": "較厚重的餐型在較晚時段減分。",
  "Time-of-day fit is neutral for this meal.": "這個餐型與用餐時段的配對沒有額外加減分。",
  "Rice appears often in the recent logs, so this gets a small variety reduction.": "近期紀錄常出現飯類，因此這個餐型的變化性略為減分。",
  "Noodles already showed up often this week, so this is slightly less distinct.": "近期紀錄常出現麵類，因此這個餐型的變化性略為減分。",
  "Fried or stir-fried meals appear in the recent logs, so lighter templates move up.": "近期紀錄有油炸或炒製餐點，因此較清爽的餐型加分。",
  "Heavier templates get a reduction after repeated fried or stir-fried records.": "近期紀錄多次出現油炸或炒製餐點，因此較厚重的餐型減分。",
  "Vegetables appear in fewer of the recent logged meals, so this gets a boost.": "近期有記錄的餐點較少出現蔬菜，因此這個餐型加分。",
  "This adds vegetables to the recent logged mix.": "這個餐型為近期有記錄的組合增加蔬菜。",
  "This fits the more takeout-leaning rhythm from recent days.": "這個餐型符合近期紀錄偏外帶的模式。",
  "This fits the more home-style rhythm from recent days.": "這個餐型符合近期紀錄偏家常的模式。",
  "Recent-pattern fit is neutral for this meal.": "這個餐型與近期紀錄的配對沒有額外加減分。",
  "Catalog-declared exposure plus uncommon structured tags receive a capped, visible fairness adjustment.": "餐型目錄的曝光設定與較少出現的標籤，獲得有上限的輪替調整。",
  "No catalog exposure or uncommon structured-tag fairness adjustment applied.": "沒有套用目錄曝光或少見標籤的輪替調整。",
  "A format already used by an earlier perspective receives a diversity penalty.": "先前選項已使用相同餐型，因此變化性減分。",
  "This format did not duplicate an earlier perspective.": "這個餐型沒有與先前選項重複。",
  "Sum of the visible deterministic rule receipt.": "加總畫面中可查看的固定規則點數。",
  "Best Match gives recent-pattern fit an additional 0.75× perspective weight.": "整體配對額外給予近期紀錄配對 0.75 倍權重。",
  "Best Match adds the declared current-feeling priority.": "整體配對加入目前心情設定的優先程度。",
  "Best Match applies its declared meal-type fit.": "整體配對套用設定中的餐型配對。",
  "Best Balance weights the food-group and heaviness subtotal 2×.": "組合變化對食物類別與厚重程度小計給予 2 倍權重。",
  "Recent-pattern points remain fully visible.": "近期紀錄配對的點數完整保留。",
  "Preferences retain a 0.35× influence in the balance perspective.": "偏好在組合變化選項中保留 0.35 倍影響。",
  "The structured hard-avoid result is carried through.": "保留結構化的必須避開判斷。",
  "Same-day variety remains part of this perspective.": "這個選項保留當天餐型變化的影響。",
  "Balanced, recovery, and light templates receive the declared fit.": "組合完整、溫和與清爽餐型依設定獲得配對點數。",
  "Lighter templates receive the declared steadiness adjustment.": "較清爽的餐型依設定獲得調整。",
  "Most Convenient weights the visible convenience subtotal 2×.": "最方便對便利性小計給予 2 倍權重。",
  "The catalog convenience level supplies the declared perspective fit.": "目錄中的便利程度提供這個選項的配對點數。",
  "Structured portable, takeout, quick, or convenient tags add one point.": "含方便攜帶、外帶、快速或便利標籤時加 1 點。",
  "Balance keeps a 0.5× guardrail in this perspective.": "組合變化在這個選項中保留 0.5 倍影響。",
  "Recent-pattern fit keeps a 0.5× influence.": "近期紀錄配對保留 0.5 倍影響。",
  "A non-negative balance subtotal receives the declared guard.": "組合變化小計不小於零時，套用設定中的加分。"
};

const localizeRuleNote = (note: string, locale: Locale): string => {
  if (locale === "en") return note;
  return note.split(/(?<=\.)\s+(?=[A-Z])/u).map((sentence) => {
    if (ruleNoteTranslations[sentence]) return ruleNoteTranslations[sentence];
    const preference = sentence.match(/^Matches your preferences for (.+)\.$/);
    if (preference) return `符合已儲存的偏好：${preference[1].split(", ").map((tag) => describeTrend(tag, locale)).join("、")}。`;
    const empty = sentence.match(/^No logged meals across the (\d+) prior days, so recent history does not adjust this recommendation\.$/);
    if (empty) return `過去 ${empty[1]} 天沒有餐點紀錄，因此近期紀錄不影響這次建議。`;
    const partial = sentence.match(/^Only (\d+) logged meals? across (\d+) prior days?; recent history needs at least 4 meals across 2 days before it adjusts a score\.$/);
    if (partial) return `過去 ${partial[2]} 天只有 ${partial[1]} 餐紀錄；至少需要 2 天、共 4 餐紀錄才會調整點數。`;
    const basis = sentence.match(/^Based on (\d+) logged meals across (\d+) prior days\.$/);
    if (basis) return `依據過去 ${basis[2]} 天、共 ${basis[1]} 餐紀錄。`;
    if (sentence.startsWith("Hard conflict:")) return "與必須避開的設定衝突，這個餐型不具備推薦資格。";
    return sentence;
  }).join(" ");
};

export const todaySignalThresholds = {
  protein: { lowMax: 1.25, mediumMax: 3 },
  vegetables: { lowMax: 1.25, mediumMax: 2.5 },
  carbs: { lowMax: 1.25, mediumMax: 2.5 },
  heaviness: { lowMax: 0.75, mediumMax: 2 },
  friedOily: { lowMax: 0.75, mediumMax: 1.75 },
  convenience: { lowMax: 0.75, mediumMax: 1.75 },
} as const;

export const getMealTimeWindow = (date: Date) => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "breakfast" as MealTimeWindow;
  if (hour >= 11 && hour < 15) return "lunch" as MealTimeWindow;
  if (hour >= 15 && hour < 17) return "afternoon" as MealTimeWindow;
  if (hour >= 17 && hour < 21) return "dinner" as MealTimeWindow;
  return "late" as MealTimeWindow;
};

const getMealFormats = (meal: Recommendation) => {
  const tags = meal.tags.map((tag) => tag.toLowerCase());
  const formats = new Set<string>();

  if (tags.some((tag) => tag.includes("soupy") || tag.includes("soup"))) formats.add("soup");
  if (tags.some((tag) => tag.includes("bowl"))) formats.add("bowl");
  if (tags.some((tag) => tag.includes("wrap") || tag.includes("sandwich") || tag.includes("portable"))) formats.add("portable");
  if (tags.some((tag) => tag.includes("set-meal") || tag.includes("bento"))) formats.add("set");
  if (tags.some((tag) => tag.includes("plate"))) formats.add("plate");
  if (tags.some((tag) => tag.includes("breakfast-for-dinner"))) formats.add("breakfast");
  if (tags.some((tag) => tag.includes("cold-meal"))) formats.add("cold");
  if (tags.some((tag) => tag.includes("warm") || tag.includes("comfort"))) formats.add("warm");

  if (formats.size === 0) formats.add(meal.mealType);
  return [...formats];
};

export const flattenMeals = (todayLog: TodayLog) => Object.values(todayLog);

const dedupeHistoryDays = (history: DayHistory[]) => {
  const unique = new Map<string, DayHistory>();
  history.forEach((day) => unique.set(day.id || day.date, day));
  return [...unique.values()];
};

const flattenHistoryMeals = (history: DayHistory[]) =>
  dedupeHistoryDays(history)
    .flatMap((day) => flattenMeals(day.todayLog))
    .filter(isMealLogged);

export const getPriorHistory = (history: DayHistory[]) =>
  dedupeHistoryDays(history).filter((day) => !day.isToday);

export const summarizeHistoryBasis = (
  history: DayHistory[],
): WeeklyHistoryBasis => {
  const uniqueDays = dedupeHistoryDays(history);
  const loggedDays = uniqueDays.filter((day) =>
    flattenMeals(day.todayLog).some(isMealLogged),
  );
  const loggedMealCount = loggedDays.reduce(
    (count, day) =>
      count + flattenMeals(day.todayLog).filter(isMealLogged).length,
    0,
  );
  const dateIds = uniqueDays
    .map((day) => day.date || day.id)
    .filter(Boolean)
    .sort();

  return {
    windowStart: dateIds[0] ?? "",
    windowEnd: dateIds[dateIds.length - 1] ?? "",
    availableDayCount: uniqueDays.length,
    loggedDayCount: loggedDays.length,
    loggedMealCount,
    sufficientForAdjustment:
      loggedDays.length >= 2 && loggedMealCount >= 4,
  };
};

const toStatus = (value: number, lowMax: number, mediumMax: number): DailyStatus => {
  if (value <= lowMax) return "low";
  if (value <= mediumMax) return "medium";
  return "high";
};

// Manual logging is intentionally lightweight, so these are qualitative
// presence signals rather than serving or nutrient-adequacy estimates.
const getCategoryUnits = (items: string[]) => {
  if (items.length === 0) return 0;
  return 1 + Math.min(items.length - 1, 2) * 0.5;
};

const confidenceWeight = { high: 1, medium: 0.85, limited: 0.65 } as const;

const getAmountWeight = (
  amount: MealEntry["componentDetails"][number]["amount"],
) => {
  if (
    amount.qualifier === "unspecified" ||
    amount.quantity === null ||
    amount.unit === "unspecified"
  ) {
    return 1;
  }

  const unitScale =
    amount.unit === "tablespoon" || amount.unit === "teaspoon"
      ? 0.35
      : amount.unit === "slice" ||
          amount.unit === "piece" ||
          amount.unit === "handful"
        ? 0.55
        : 1;
  const quantitySignal = Math.max(
    0.5,
    Math.min(1.5, amount.quantity * unitScale),
  );
  return amount.qualifier === "approximate"
    ? quantitySignal * 0.9
    : quantitySignal;
};

const getCategorySignal = (
  meal: MealEntry,
  group: MealEntry["componentDetails"][number]["group"],
  fallbackItems: string[],
) => {
  const details = (meal.componentDetails ?? []).filter(
    (component) => component.group === group,
  );
  if (details.length === 0) return getCategoryUnits(fallbackItems);

  const componentSignal = details.reduce(
    (sum, component) =>
      sum +
      getAmountWeight(component.amount) *
        confidenceWeight[component.confidence],
    0,
  );
  const portionWeight =
    meal.portion === "Small" ? 0.85 : meal.portion === "Large" ? 1.15 : 1;
  return Math.round(Math.min(2, componentSignal * portionWeight) * 100) / 100;
};

const getHeavinessUnits = (meal: MealEntry) => {
  let value = 0;

  if (meal.portion === "Large") value += 1.5;
  else if (meal.portion === "Medium" && isMealLogged(meal)) value += 0.25;

  if (meal.cookingMethod === "Fried") value += 1.5;
  else if (meal.cookingMethod === "Stir-fried") value += 0.75;
  else if (meal.cookingMethod === "Soup / stew") value -= 0.25;

  return Math.max(0, value);
};

const getFriedOilyUnits = (meal: MealEntry) => {
  if (meal.cookingMethod === "Fried") return 2;
  if (meal.cookingMethod === "Stir-fried") return 1;
  return 0;
};

const getConvenienceUnits = (meal: MealEntry) => {
  if (meal.mealSource === "Ready-made") return 1.25;
  if (meal.mealSource === "Takeout" || meal.mealSource === "Restaurant") return 1;
  return 0;
};

// Exact aliases normalize user-declared food names for descriptive patterns.
// They do not decompose mixed dishes, infer food groups, or filter safety.
const loggedFoodAliases: Record<string, string> = {
  "飯": "rice", "白飯": "rice", "白米飯": "rice", "米飯": "rice", "米饭": "rice",
  "糙米": "brown rice", "糙米飯": "brown rice", "糙米饭": "brown rice",
  "炒飯": "fried rice", "炒饭": "fried rice", "雞肉飯": "chicken rice", "鸡肉饭": "chicken rice",
  "粥": "congee", "稀飯": "congee", "稀饭": "congee", "白粥": "congee",
  "麵": "noodles", "面": "noodles", "麵條": "noodles", "面条": "noodles", "湯麵": "noodle soup", "汤面": "noodle soup",
  "烏龍麵": "udon noodles", "乌龙面": "udon noodles", "蕎麥麵": "soba noodles", "荞麦面": "soba noodles",
  "米粉": "rice noodles", "米線": "rice noodles", "米线": "rice noodles", "拉麵": "ramen noodles", "拉面": "ramen noodles",
  "河粉": "rice noodles", "米粉/河粉": "rice noodles", "小麥麵條": "wheat noodles", "小麦面条": "wheat noodles",
  "義大利麵": "pasta", "意大利面": "pasta", "麵包": "bread", "面包": "bread", "吐司": "toast", "燕麥": "oatmeal", "燕麦": "oatmeal",
  "燕麥粥": "oatmeal", "燕麦粥": "oatmeal", "貝果": "bagel", "贝果": "bagel", "捲餅": "wrap", "卷饼": "wrap", "包子/饅頭": "bao / bun", "包子/馒头": "bao / bun",
  "水": "water", "白開水": "water", "白开水": "water", "氣泡水": "sparkling water", "气泡水": "sparkling water",
  "茶": "tea", "無糖茶": "tea", "无糖茶": "tea", "綠茶": "green tea", "绿茶": "green tea", "無糖綠茶": "green tea", "无糖绿茶": "green tea",
  "紅茶": "black tea", "红茶": "black tea", "無糖紅茶": "black tea", "无糖红茶": "black tea",
  "無咖啡因茶": "caffeine-free tea", "无咖啡因茶": "caffeine-free tea",
  "咖啡": "coffee", "黑咖啡": "coffee", "美式咖啡": "coffee", "冰咖啡": "iced coffee",
  "奶茶": "milk tea", "珍珠奶茶": "boba", "波霸奶茶": "boba", "手搖奶茶": "milk tea", "手摇奶茶": "milk tea",
  "汽水": "soda", "可樂": "soda", "可乐": "soda", "無糖汽水": "diet soda", "无糖汽水": "diet soda", "零卡可樂": "diet soda", "零卡可乐": "diet soda",
  "甜飲": "sweet drink", "甜饮": "sweet drink", "運動飲料": "sports drink", "运动饮料": "sports drink", "能量飲料": "energy drink", "能量饮料": "energy drink",
  "含糖飲料": "sweet drink", "含糖饮料": "sweet drink",
  "柳橙汁": "orange juice", "橙汁": "orange juice", "蘋果汁": "apple juice", "苹果汁": "apple juice", "果昔": "smoothie",
  "蔬果汁": "green juice", "椰子水": "coconut water", "優格飲": "yogurt drink", "优格饮": "yogurt drink", "蛋白飲": "protein shake", "蛋白饮": "protein shake",
  "啤酒": "beer", "葡萄酒": "wine", "紅酒": "wine", "红酒": "wine", "白葡萄酒": "wine", "調酒": "cocktail", "调酒": "cocktail", "酒": "alcohol", "白酒": "alcohol", "酒精飲品": "alcohol",
  "牛奶": "milk", "鮮奶": "milk", "鲜奶": "milk", "豆漿": "soy milk", "豆浆": "soy milk", "燕麥奶": "oat milk", "燕麦奶": "oat milk", "杏仁奶": "almond milk",
  "蛋糕": "cake", "杯子蛋糕": "cupcake", "布朗尼": "brownie", "甜甜圈": "donut", "起司蛋糕": "cheesecake", "乳酪蛋糕": "cheesecake",
  "冰淇淋": "ice cream", "雪糕": "ice cream bar", "布丁": "pudding", "餅乾": "cookies", "饼干": "cookies", "巧克力": "chocolate", "馬芬": "muffin", "玛芬": "muffin", "酥皮點心": "pastry",
  "雞肉": "chicken", "鸡肉": "chicken", "雞蛋": "egg", "鸡蛋": "egg", "蛋": "egg", "豆腐": "tofu", "天貝": "tempeh", "天贝": "tempeh",
  "豆類": "beans", "豆类": "beans", "黑豆": "black beans", "鷹嘴豆": "chickpeas", "鹰嘴豆": "chickpeas", "毛豆": "edamame",
};

export const normalizeLoggedFoodName = (value: string) => {
  const normalized = value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
  return loggedFoodAliases[normalized] ?? normalized;
};

const matchesLoggedFood = (value: string, keywords: string[]) =>
  keywords.includes(normalizeLoggedFoodName(value));

const sweetDrinkKeywords = ["milk tea", "boba", "soda", "sweet drink", "sports drink", "energy drink", "orange juice", "apple juice", "smoothie", "yogurt drink"];
const alcoholKeywords = ["beer", "wine", "cocktail", "alcohol"];
const caffeineKeywords = ["coffee", "iced coffee", "tea", "green tea", "black tea", "milk tea", "boba", "energy drink"];
const dessertSnackKeywords = [
  "cake",
  "cupcake",
  "brownie",
  "donut",
  "cheesecake",
  "ice cream",
  "ice cream bar",
  "frozen yogurt",
  "pudding",
  "cookies",
  "cookie sandwich",
  "chocolate",
  "muffin",
  "pastry",
];
const serializeMeal = (meal: Recommendation) =>
  [meal.title, meal.description, ...meal.tags].join(" ").toLowerCase();

const detectMealFormatSignals = (meal: MealEntry) => {
  const names = meal.carbs.map(normalizeLoggedFoodName);
  const noodleHeavy = names.some((item) => ["noodle", "pasta", "udon", "soba", "ramen"].some((term) => item.includes(term)));
  const riceHeavy = names.some((item) => !["noodle", "pasta"].some((term) => item.includes(term)) && (item.includes("rice") || item.includes("congee")));
  return {
    riceHeavy,
    noodleHeavy,
    friedLike: meal.cookingMethod === "Fried" || meal.cookingMethod === "Stir-fried",
  };
};

const summarizeWeeklyPatterns = (history: DayHistory[]) => {
  const meals = flattenHistoryMeals(history);
  const riceHeavyCount = meals.filter((meal) => detectMealFormatSignals(meal).riceHeavy).length;
  const noodleHeavyCount = meals.filter((meal) => detectMealFormatSignals(meal).noodleHeavy).length;
  const friedCount = meals.filter((meal) => detectMealFormatSignals(meal).friedLike).length;
  const takeoutCount = meals.filter((meal) => meal.mealSource === "Takeout" || meal.mealSource === "Restaurant").length;
  const homeCount = meals.filter((meal) => meal.mealSource === "Home-cooked").length;
  const vegetableMeals = meals.filter((meal) => meal.vegetables.length > 0).length;

  return {
    mealsCount: meals.length,
    riceHeavyCount,
    noodleHeavyCount,
    friedCount,
    takeoutCount,
    homeCount,
    vegetableMeals,
  };
};

export const summarizeTodayIntake = (todayLog: TodayLog): TodayIntakeSummary => {
  const meals = flattenMeals(todayLog).filter(isMealLogged);
  const proteinCount = meals.reduce(
    (sum, meal) =>
      sum + getCategorySignal(meal, "protein", meal.protein),
    0,
  );
  const vegetableCount = meals.reduce(
    (sum, meal) =>
      sum + getCategorySignal(meal, "vegetable", meal.vegetables),
    0,
  );
  const carbCount = meals.reduce(
    (sum, meal) => sum + getCategorySignal(meal, "carb", meal.carbs),
    0,
  );
  const fruitCount = meals.reduce(
    (sum, meal) => sum + getCategorySignal(meal, "fruit", meal.fruit),
    0,
  );
  const soupCount = meals.reduce(
    (sum, meal) => sum + getCategorySignal(meal, "soup", meal.soup),
    0,
  );
  const drinkCount = meals.reduce(
    (sum, meal) => sum + getCategorySignal(meal, "drink", meal.drink),
    0,
  );
  const caffeineCount = meals.reduce(
    (sum, meal) => sum + meal.drink.filter((item) => matchesLoggedFood(item, caffeineKeywords)).length,
    0,
  );
  const sweetDrinkCount = meals.reduce(
    (sum, meal) => sum + meal.drink.filter((item) => matchesLoggedFood(item, sweetDrinkKeywords)).length,
    0,
  );
  const alcoholCount = meals.reduce(
    (sum, meal) => sum + meal.drink.filter((item) => matchesLoggedFood(item, alcoholKeywords)).length,
    0,
  );
  const dessertSnackCount = meals.reduce(
    (sum, meal) => sum + meal.carbs.filter((item) => matchesLoggedFood(item, dessertSnackKeywords)).length,
    0,
  );
  const heavyMeals = meals.reduce((sum, meal) => sum + getHeavinessUnits(meal), 0);
  const friedMeals = meals.reduce((sum, meal) => sum + getFriedOilyUnits(meal), 0);
  const convenienceMeals = meals.reduce((sum, meal) => sum + getConvenienceUnits(meal), 0);
  const homeCookedMeals = meals.filter((meal) => meal.mealSource === "Home-cooked").length;
  const takeoutMeals = meals.filter((meal) => meal.mealSource === "Takeout" || meal.mealSource === "Restaurant").length;

  return {
    proteinStatus: toStatus(proteinCount, todaySignalThresholds.protein.lowMax, todaySignalThresholds.protein.mediumMax),
    vegetableStatus: toStatus(vegetableCount, todaySignalThresholds.vegetables.lowMax, todaySignalThresholds.vegetables.mediumMax),
    carbStatus: toStatus(carbCount, todaySignalThresholds.carbs.lowMax, todaySignalThresholds.carbs.mediumMax),
    heavinessStatus: toStatus(heavyMeals, todaySignalThresholds.heaviness.lowMax, todaySignalThresholds.heaviness.mediumMax),
    friedOilyStatus: toStatus(friedMeals, todaySignalThresholds.friedOily.lowMax, todaySignalThresholds.friedOily.mediumMax),
    convenienceStatus: toStatus(convenienceMeals, todaySignalThresholds.convenience.lowMax, todaySignalThresholds.convenience.mediumMax),
    proteinCount,
    vegetableCount,
    carbCount,
    fruitCount,
    soupCount,
    drinkCount,
    caffeineCount,
    sweetDrinkCount,
    alcoholCount,
    dessertSnackCount,
    heavyMeals,
    friedMeals,
    convenienceMeals,
    homeCookedMeals,
    takeoutMeals,
  };
};

export const isNamedFoodComponent = (component: ParsedMealComponent) =>
  Boolean(component.name.trim()) &&
  !(component.group === "other" && /^(Mixed meal sources:|Mixed preparation:|Combined portions:)/.test(component.name));

export const isMealLogged = (meal: MealEntry) =>
  meal.protein.length > 0 ||
  meal.vegetables.length > 0 ||
  meal.carbs.length > 0 ||
  meal.fruit.length > 0 ||
  meal.soup.length > 0 ||
  meal.drink.length > 0 ||
  (meal.componentDetails ?? []).some(isNamedFoodComponent);

export const mealSummaryChips = (meal: MealEntry) => {
  const picked = [...meal.protein, ...meal.vegetables, ...meal.carbs, ...meal.fruit, ...meal.drink].filter(Boolean);
  return picked.slice(0, 4);
};

const scoreProteinBalance = (summary: TodayIntakeSummary, meal: Recommendation) => {
  if (summary.proteinStatus === "low") {
    if (meal.proteinLevel === "high") return createBreakdownItem("protein", 3, "Protein is less prominent in the current logs, so protein-forward templates get a boost. Logs may be incomplete.");
    if (meal.proteinLevel === "medium") return createBreakdownItem("protein", 2, "Protein is less prominent in the current logs, so templates with some protein get a boost. Logs may be incomplete.");
  }

  if (summary.proteinStatus === "high" && meal.proteinLevel === "high" && meal.heaviness !== "light") {
    return createBreakdownItem("protein", -1, "Protein appears often in the current logs, so heavier protein-forward templates get a small reduction.");
  }

  return createBreakdownItem("protein", 0, "Protein fit is neutral for this meal.");
};

const scoreVegetableBalance = (summary: TodayIntakeSummary, meal: Recommendation) => {
  if (summary.vegetableStatus === "low") {
    if (meal.vegetableLevel === "high") return createBreakdownItem("vegetables", 3, "Vegetables are less prominent in the current logs, so vegetable-forward templates get priority. Logs may be incomplete.");
    if (meal.vegetableLevel === "medium") return createBreakdownItem("vegetables", 2, "Vegetables are less prominent in the current logs, so this template gets a moderate boost. Logs may be incomplete.");
  }

  if (summary.vegetableStatus !== "low" && meal.vegetableLevel === "high") {
    return createBreakdownItem("vegetables", 1, "Vegetables already appear in the current logs; this vegetable-forward template keeps a small bonus.");
  }

  return createBreakdownItem("vegetables", 0, "Vegetable fit is neutral for this meal.");
};

const scoreCarbBalance = (summary: TodayIntakeSummary, meal: Recommendation) => {
  if (summary.carbStatus === "high") {
    if (meal.carbLevel === "high") return createBreakdownItem("carbs", -2, "Carbohydrate foods appear often in the current logs, so carb-heavy templates get a reduction.");
    if (meal.carbLevel === "medium") return createBreakdownItem("carbs", 1, "A moderate-carb template adds variety to the current logged pattern.");
    return createBreakdownItem("carbs", 2, "A lower-carb template adds variety when carbohydrate foods appear often in the logs.");
  }

  return createBreakdownItem("carbs", 0, "Carb balance is neutral for this meal.");
};

const scoreHeavinessBalance = (summary: TodayIntakeSummary, meal: Recommendation) => {
  if (summary.heavinessStatus === "high" || summary.friedOilyStatus === "high") {
    if (meal.heaviness === "light") return createBreakdownItem("heaviness", 3, "Larger portions or fried cooking methods appear in the current logs, so lighter templates move up.");
    if (meal.heaviness === "medium") return createBreakdownItem("heaviness", 1, "This medium-heaviness template gets a smaller bonus for the current logged pattern.");
    return createBreakdownItem("heaviness", -3, "Heavier templates get a reduction when larger portions or fried cooking methods appear in the logs.");
  }

  if (summary.heavinessStatus === "medium") {
    if (meal.heaviness === "light") return createBreakdownItem("heaviness", 2, "A lighter template gets a bonus for the current logged preparation and portion pattern.");
    if (meal.heaviness === "heavy") return createBreakdownItem("heaviness", -1, "Heavier templates get a small reduction for the current logged pattern.");
  }

  return createBreakdownItem("heaviness", 0, "Heaviness fit is neutral for this meal.");
};

const scoreConvenienceFit = (summary: TodayIntakeSummary, profile: Profile, meal: Recommendation) => {
  let score = 0;
  const notes: string[] = [];

  if (profile.eatingStyle === "Mostly takeout") {
    if (meal.convenience === "high") {
      score += 3;
      notes.push("High convenience matches a takeout-leaning style.");
    } else if (meal.convenience === "medium") {
      score += 2;
      notes.push("Medium convenience still works for a takeout-leaning style.");
    }
    if (meal.worksFor.includes("takeout")) {
      score += 2;
      notes.push("This meal works well as takeout.");
    }
  }

  if (profile.eatingStyle === "Mostly home-cooked") {
    if (meal.worksFor.includes("home-cooked")) {
      score += 2;
      notes.push("This meal fits a home-cooked routine.");
    }
    if (meal.convenience === "high") {
      score += 1;
      notes.push("It also keeps effort low.");
    }
  }

  if (profile.eatingStyle === "Both") {
    if (meal.worksFor.length > 1) {
      score += 2;
      notes.push("It stays flexible for both home and takeout.");
    } else {
      score += 1;
      notes.push("It still fits one side of a mixed routine.");
    }
  }

  if (summary.convenienceStatus === "high") {
    if (meal.convenience === "high") {
      score += 2;
      notes.push("The current logs include convenience meals, so a high-convenience option fits that pattern.");
    } else if (meal.convenience === "medium") {
      score += 1;
      notes.push("A medium-effort option fits the practical pattern in the current logs.");
    }
  }

  return createBreakdownItem("convenience", score, notes.join(" ") || "Convenience fit is neutral for this meal.");
};

const scoreProfileFit = (profile: Profile, meal: Recommendation) => {
  let score = 0;
  const notes: string[] = [];

  if (profile.activityLevel === "Active") {
    if (meal.proteinLevel === "high") {
      score += 1;
      notes.push("The activity preference gives protein-forward templates a small bonus.");
    }
    if (meal.carbLevel !== "low") {
      score += 1;
      notes.push("The activity preference gives templates with carbohydrate foods a small bonus.");
    }
  }

  if (profile.activityLevel === "Low") {
    if (meal.heaviness === "light") {
      score += 1;
      notes.push("A lighter meal often fits a lower-key day well.");
    }
    if (meal.heaviness === "heavy") {
      score -= 1;
      notes.push("Very heavy meals get a small pullback for a lower-key routine.");
    }
  }

  if (profile.feelToday === "Want something warm") {
    const warmTags = meal.tags.map((tag) => tag.toLowerCase());
    const isSoupyGentle = warmTags.some((tag) => ["soupy", "gentle"].includes(tag));
    const isComfortWarm = warmTags.some((tag) => ["comfort", "warm"].includes(tag));

    if (isSoupyGentle) {
      score += 4;
      notes.push("Soupy or gentler meals are the closest match when you want something warm.");
    } else if (isComfortWarm) {
      score += 3;
      notes.push("Warm and comforting meals fit how you feel today.");
    }
    if (meal.heaviness === "light") {
      score += 1;
      notes.push("Keeping the meal warm without too much heaviness is a nice fit here.");
    }
  }

  if (profile.feelToday === "Need something light") {
    if (meal.heaviness === "light") {
      score += 2;
      notes.push("A lighter meal fits how you want today to feel.");
    } else if (meal.heaviness === "heavy") {
      score -= 2;
      notes.push("Heavier meals get pulled back because you want something lighter today.");
    }
  }

  if (profile.feelToday === "Low energy") {
    if (meal.convenience === "high") {
      score += 2;
      notes.push("Lower-energy days benefit from meals that are easier to follow through on.");
    }
    if (meal.tags.some((tag) => ["comfort", "warm", "soupy"].includes(tag.toLowerCase()))) {
      score += 1;
      notes.push("Something warmer or more comforting can fit a lower-energy day well.");
    }
  }

  if (profile.feelToday === "On period") {
    if (meal.tags.some((tag) => ["warm", "comfort", "soupy", "gentle"].includes(tag.toLowerCase()))) {
      score += 4;
      notes.push("The comfort setting gives warm or gentle templates a bonus; this is not a treatment recommendation.");
    }
    if (meal.proteinLevel === "high" || meal.proteinLevel === "medium") {
      score += 1;
      notes.push("The comfort setting gives templates with protein a small editorial bonus.");
    }
    if (meal.heaviness === "light") {
      score += 1;
      notes.push("The comfort setting gives lighter templates a small editorial bonus.");
    }
  }

  return createBreakdownItem("profile", score, notes.join(" ") || "Profile fit is neutral for this meal.");
};

const scoreFeelPriority = (profile: Profile, meal: Recommendation) => {
  const tags = meal.tags.map((tag) => tag.toLowerCase());

  if (profile.feelToday === "Want something warm") {
    const warmGentle = tags.some((tag) => ["soupy", "comfort", "gentle"].includes(tag));
    const soupyGentle = tags.some((tag) => ["soupy", "gentle"].includes(tag));
    if (soupyGentle && meal.heaviness === "light") return 4;
    if (warmGentle && meal.heaviness === "light") return 2.5;
    if (soupyGentle) return 2;
    if (tags.includes("warm")) return 1;
  }

  if (profile.feelToday === "On period") {
    const gentleComfort = tags.some((tag) => ["soupy", "comfort", "gentle"].includes(tag));
    if (gentleComfort && meal.heaviness === "light") return 4;
    if (gentleComfort) return 2;
  }

  if (profile.feelToday === "Low energy") {
    const easyAndComforting = meal.convenience === "high" && tags.some((tag) => ["comfort", "warm", "soupy", "grocery", "quick"].includes(tag));
    if (easyAndComforting) return 2;
  }

  if (profile.feelToday === "Need something light" && meal.heaviness === "light") {
    return 1.5;
  }

  return 0;
};

const scorePreferenceFit = (profile: Profile, meal: Recommendation) => {
  let score = 0;
  const mealText = serializeMeal(meal);
  const mealTags = meal.tags.map((tag) => tag.toLowerCase());
  const matches: string[] = [];

  profile.preferenceTags.forEach((tag) => {
    const mapped = preferenceTagMap[tag] ?? [tag.toLowerCase()];
    if (mapped.some((keyword) => mealText.includes(keyword.toLowerCase()))) {
      score += 2;
      matches.push(tag);

      // Give a small extra bump to direct cuisine/style matches so narrower
      // preference-driven meals are not always crowded out by more generic bowls.
      if (
        (tag === "Korean" && mealTags.includes("korean-inspired")) ||
        (tag === "Taiwanese-style" && mealTags.includes("taiwanese-style")) ||
        (tag === "Chinese-style" && mealTags.includes("chinese-style")) ||
        (tag === "Mediterranean" && mealTags.includes("mediterranean")) ||
        (tag === "Mexican-inspired" && mealTags.includes("mexican-inspired")) ||
        (tag === "Japanese" && mealTags.includes("japanese-inspired"))
      ) {
        score += 1;
      }
    }
  });

  const capped = Math.min(score, 8);
  return createBreakdownItem("preferences", capped, matches.length > 0 ? `Matches your preferences for ${matches.join(", ")}.` : "No strong preference match here.");
};

export type HardAvoidConflict = {
  tag: MustAvoidTag;
  certainty: AvoidanceCertainty;
};

export const getDrinkHardAvoidConflicts = (
  profile: Profile,
  drink: DrinkOption,
): HardAvoidConflict[] => {
  const safety = buildDrinkSafetyMetadata(drink.id);
  return profile.avoidTags.flatMap((tag) => {
    const certainty = (["contains", "mayContain", "unknown"] as const).find(
      (state) => safety[state].includes(tag),
    );
    return certainty ? [{ tag, certainty }] : [];
  });
};

export const isDrinkEligible = (profile: Profile, drink: DrinkOption) =>
  getDrinkHardAvoidConflicts(profile, drink).length === 0 &&
  (!drink.alcohol || (profile.sensitiveDrinkOptIns ?? []).includes("alcohol")) &&
  (drink.id !== "energy-drink" ||
    (profile.sensitiveDrinkOptIns ?? []).includes("energy-drink"));

export const getHardAvoidConflicts = (
  profile: Profile,
  meal: Recommendation,
  timeWindow: MealTimeWindow,
): HardAvoidConflict[] => {
  const conflicts: HardAvoidConflict[] = [];

  for (const tag of profile.avoidTags) {
    for (const certainty of [
      "contains",
      "mayContain",
      "unknown",
    ] as const) {
      if (meal.safety[certainty].includes(tag)) {
        conflicts.push({ tag, certainty });
        break;
      }
    }

    if (
      tag === "Late-night heavy meals" &&
      timeWindow === "late" &&
      meal.heaviness !== "light" &&
      !conflicts.some((conflict) => conflict.tag === tag)
    ) {
      conflicts.push({
        tag,
        certainty: meal.heaviness === "heavy" ? "contains" : "mayContain",
      });
    }
  }

  return conflicts;
};

const scoreAvoidConflicts = (
  profile: Profile,
  meal: Recommendation,
  timeWindow: MealTimeWindow,
) => {
  const conflicts = getHardAvoidConflicts(profile, meal, timeWindow);
  const note =
    conflicts.length > 0
      ? `Hard conflict: ${conflicts
          .map(({ tag, certainty }) => `${tag} (${certainty})`)
          .join(", ")}.`
      : "No declared contains, may-contain, or unknown conflict.";
  return createBreakdownItem("avoid", conflicts.length * -100, note);
};

const scoreVariety = (todayLog: TodayLog, meal: Recommendation) => {
  const meals = flattenMeals(todayLog);
  const riceHeavyCount = meals.filter((entry) => detectMealFormatSignals(entry).riceHeavy).length;
  const noodleHeavyCount = meals.filter((entry) => detectMealFormatSignals(entry).noodleHeavy).length;
  const repeatedProteins = [...meals.reduce<Map<string, number>>((map, entry) => {
    entry.protein.forEach((item) => {
      const normalized = normalizeLoggedFoodName(item);
      map.set(normalized, (map.get(normalized) ?? 0) + 1);
    });
    return map;
  }, new Map())]
    .filter(([, count]) => count >= 2)
    .map(([protein]) => protein);
  let score = 0;
  const notes: string[] = [];
  const mealText = serializeMeal(meal);

  if (riceHeavyCount >= 2 && meal.tags.some((tag) => ["rice-based", "bowl"].includes(tag.toLowerCase()))) {
    score -= 1;
    notes.push("Slightly reduced because today already had multiple rice-style meals.");
  }
  if (noodleHeavyCount >= 2 && meal.tags.some((tag) => tag.toLowerCase().includes("noodle"))) {
    score -= 1;
    notes.push("Slightly reduced because noodles already showed up a lot today.");
  }
  if (repeatedProteins.some((protein) => mealText.includes(protein))) {
    score -= 2;
    notes.push("Reduced because this repeats a protein that already showed up multiple times today.");
  }

  return createBreakdownItem("variety", score, notes.join(" ") || "Variety fit is neutral for this meal.");
};

const scoreSnackDrinkFit = (summary: TodayIntakeSummary, meal: Recommendation) => {
  let score = 0;
  const notes: string[] = [];

  if (summary.sweetDrinkCount + summary.dessertSnackCount >= 2) {
    if (meal.vegetableLevel === "high") {
      score += 2;
      notes.push("Sweeter snacks or drinks already showed up today, so meals with more vegetables move up.");
    } else if (meal.heaviness === "light") {
      score += 1;
      notes.push("A lighter meal can feel like a steadier next step after sweeter snacks or drinks.");
    }
  }

  if (summary.alcoholCount >= 1) {
    if (meal.heaviness === "light") {
      score += 2;
      notes.push("A lighter meal often fits better after alcohol earlier in the day.");
    }
    if (meal.vegetableLevel !== "low" || meal.proteinLevel !== "low") {
      score += 1;
      notes.push("Meals with some protein or vegetables tend to feel steadier here.");
    }
  }

  if (summary.caffeineCount >= 2) {
    if (meal.heaviness === "light") {
      score += 1;
      notes.push("Lighter meals tend to fit better when caffeinated drinks already showed up a lot today.");
    }
    if (meal.tags.some((tag) => ["warm", "soupy", "gentle"].includes(tag.toLowerCase()))) {
      score += 1;
      notes.push("Something steadier or gentler can pair better after multiple caffeinated drinks.");
    }
  }

  return createBreakdownItem("snack-drink", score, notes.join(" ") || "Snack and drink fit is neutral for this meal.");
};

const scoreDrinkOption = (
  summary: TodayIntakeSummary,
  profile: Profile,
  meal: Recommendation,
  timeWindow: MealTimeWindow,
  drink: DrinkOption,
) => {
  let score = 0;
  const mealTags = meal.tags.map((tag) => tag.toLowerCase());

  if (
    drink.alcohol &&
    !(profile.sensitiveDrinkOptIns ?? []).includes("alcohol")
  )
    return -1000;
  if (
    drink.id === "energy-drink" &&
    !(profile.sensitiveDrinkOptIns ?? []).includes("energy-drink")
  )
    return -1000;

  if (summary.alcoholCount >= 1) {
    if (drink.category === "simple" || drink.category === "tea") score += 4;
    if (drink.tags.includes("hydrating")) score += 2;
    if (drink.alcohol) score -= 5;
  }

  if (summary.sweetDrinkCount >= 2) {
    if (drink.category === "simple" || drink.category === "tea") score += 4;
    if (drink.category === "juice" && !drink.sweetened) score += 3;
    if (drink.category === "milk" && !drink.sweetened) score += 1;
    if (drink.category === "sweet") score -= 4;
  }

  if (summary.caffeineCount >= 2) {
    if (!drink.caffeine && (drink.category === "simple" || drink.category === "juice" || drink.category === "milk")) score += 3;
    if (drink.caffeine) score -= 4;
  }

  if (profile.preferenceTags.includes("Tea")) {
    if (drink.category === "tea") score += 3;
    if (drink.title === "Milk tea") score += 1;
  }

  if (profile.preferenceTags.includes("Coffee / caffeine") && !profile.avoidTags.includes("Caffeine")) {
    if (drink.category === "coffee") score += 3;
    if (drink.title === "Energy drink" || drink.title === "Milk tea") score += 1;
  }

  if (profile.preferenceTags.includes("Simple drinks")) {
    if (drink.category === "simple") score += 3;
    if (drink.title === "Tea" || drink.title === "Coconut water") score += 1;
  }

  if (profile.preferenceTags.includes("Juices / smoothies")) {
    if (drink.category === "juice") score += 3;
    if (drink.title === "Smoothie" || drink.title === "Green juice") score += 1;
  }

  if (profile.feelToday === "Want something warm") {
    if (["Tea", "Caffeine-free tea", "Green tea", "Black tea", "Soy milk", "Oat milk", "Milk"].includes(drink.title)) score += 3;
    if (drink.tags.includes("cold")) score -= 1;
  }

  if (profile.feelToday === "Need something light") {
    if (drink.category === "simple" || drink.title === "Green juice" || drink.title === "Coconut water") score += 3;
    if (drink.title === "Yogurt drink" && summary.sweetDrinkCount === 0) score += 1;
    if (drink.category === "alcohol" || drink.category === "sweet") score -= 2;
  }

  if (profile.feelToday === "Low energy") {
    if ((drink.category === "coffee" || drink.title === "Energy drink") && summary.caffeineCount < 2 && !profile.avoidTags.includes("Caffeine")) score += 3;
    if (drink.title === "Protein shake" || drink.title === "Sports drink") score += 2;
  }

  if (profile.feelToday === "On period") {
    if (["Tea", "Caffeine-free tea", "Soy milk", "Oat milk", "Milk"].includes(drink.title)) score += 3;
    if (drink.category === "alcohol") score -= 2;
  }

  if (timeWindow === "breakfast") {
    if (["Coffee", "Tea", "Caffeine-free tea", "Orange juice", "Smoothie", "Milk", "Soy milk", "Oat milk"].includes(drink.title)) score += 2;
    if (drink.title === "Yogurt drink") score += 2;
  } else if (timeWindow === "lunch") {
    if (["Iced coffee", "Sparkling water", "Green tea", "Black tea", "Coconut water"].includes(drink.title)) score += 2;
    if (drink.title === "Yogurt drink" || drink.title === "Sweet drink") score += 1;
  } else if (timeWindow === "afternoon") {
    if (
      ["Water", "Sparkling water", "Caffeine-free tea", "Coconut water"].includes(
        drink.title,
      )
    )
      score += 2;
    if (drink.caffeine && summary.caffeineCount >= 1) score -= 1;
  } else if (timeWindow === "dinner") {
    if (["Sparkling water", "Tea", "Caffeine-free tea", "Wine", "Beer", "Cocktail", "Alcohol"].includes(drink.title)) score += 2;
    if (drink.category === "coffee") score -= 1;
    if (drink.title === "Sweet drink" && summary.sweetDrinkCount === 0) score += 1;
  } else if (timeWindow === "late") {
    if (["Water", "Tea", "Caffeine-free tea", "Soy milk", "Oat milk", "Milk", "Almond milk"].includes(drink.title)) score += 3;
    if (drink.caffeine) score -= 4;
    if (drink.category === "alcohol") score -= 2;
  }

  if (mealTags.some((tag) => ["soupy", "warm", "gentle", "comfort"].includes(tag))) {
    if (drink.category === "tea" || ["Soy milk", "Oat milk", "Milk"].includes(drink.title)) score += 2;
  }

  if (mealTags.some((tag) => ["portable", "wrap", "sandwich", "takeout", "hearty"].includes(tag))) {
    if (["Sparkling water", "Soda", "Diet soda", "Beer", "Milk tea", "Boba"].includes(drink.title)) score += 2;
    if (drink.title === "Sweet drink") score += 2;
  }

  if (mealTags.some((tag) => ["light", "vegetable-forward", "plant-protein"].includes(tag))) {
    if (["Water", "Green juice", "Coconut water", "Tea", "Sparkling water"].includes(drink.title)) score += 2;
    if (drink.title === "Yogurt drink" && !profile.avoidTags.includes("Dairy")) score += 2;
  }

  if (mealTags.some((tag) => ["breakfast-for-dinner", "quick", "simple"].includes(tag))) {
    if (drink.title === "Yogurt drink") score += 2;
  }

  if (meal.proteinLevel === "high" && ["Protein shake", "Milk", "Soy milk"].includes(drink.title)) score -= 1;
  if (drink.hydration === "high") score += 1;

  return score;
};

const hashDrinkContext = (summary: TodayIntakeSummary, profile: Profile, meal: Recommendation, timeWindow: MealTimeWindow) => {
  const seed = [
    meal.title,
    timeWindow,
    profile.feelToday,
    profile.eatingStyle,
    [...profile.preferenceTags].sort().join("|"),
    [...profile.avoidTags].sort().join("|"),
    summary.sweetDrinkCount,
    summary.caffeineCount,
    summary.alcoholCount,
  ].join("::");

  return [...seed].reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 7);
};

export const buildSuggestedDrink = (
  summary: TodayIntakeSummary,
  profile: Profile,
  meal: Recommendation,
  timeWindow: MealTimeWindow,
  _locale: Locale,
) => {
  const scored = drinkRecommendationDataset
    .filter((drink) => isDrinkEligible(profile, drink))
    .map((drink) => ({ drink, score: scoreDrinkOption(summary, profile, meal, timeWindow, drink) }))
    .sort((a, b) => b.score - a.score || a.drink.title.localeCompare(b.drink.title));

  if (scored.length === 0) return "";

  const topScore = scored[0].score;
  const pool = scored.filter((entry) => entry.score >= topScore - DRINK_FAIRNESS_SCORE_WINDOW).slice(0, DRINK_FAIRNESS_MAX_POOL);
  const preferredDrinkTags = profile.preferenceTags.filter((tag) =>
    ["Tea", "Coffee / caffeine", "Simple drinks", "Juices / smoothies"].includes(tag),
  );

  let candidatePool = pool;

  // If the user selected multiple drink preferences, rotate within the top-scoring
  // pool across those preferred drink families so one category does not dominate.
  if (preferredDrinkTags.length >= 2) {
    const preferredPool = pool.filter((entry) => preferredDrinkTags.some((tag) => matchesDrinkPreference(entry.drink, tag)));
    if (preferredPool.length > 0) {
      candidatePool = preferredPool;
    }
  }

  const index = hashDrinkContext(summary, profile, meal, timeWindow) % candidatePool.length;
  return candidatePool[index].drink.title;
};

const scoreTimeOfDayFit = (timeWindow: MealTimeWindow, meal: Recommendation) => {
  const tags = meal.tags.map((tag) => tag.toLowerCase());
  let score = 0;
  const notes: string[] = [];

  if (timeWindow === "breakfast") {
    if (tags.includes("breakfast-for-dinner") || tags.includes("quick")) {
      score += 2;
      notes.push("This fits an earlier-in-the-day meal window.");
    } else if (meal.heaviness === "heavy") {
      score -= 1;
      notes.push("Heavier options get a small pullback earlier in the day.");
    }
  }

  if (timeWindow === "lunch") {
    if (meal.mealType === "balanced" || tags.includes("bowl") || tags.includes("plate")) {
      score += 1;
      notes.push("This fits a more standard lunch-style meal.");
    }
  }

  if (timeWindow === "afternoon") {
    if (
      meal.mealType === "balanced" ||
      meal.mealType === "light" ||
      tags.includes("bowl") ||
      tags.includes("plate")
    ) {
      score += 1;
      notes.push(
        "This fits the afternoon transition without treating it as late-night.",
      );
    }
    if (meal.heaviness === "heavy") {
      score -= 1;
      notes.push("Heavy options get a small afternoon pullback.");
    }
  }

  if (timeWindow === "dinner") {
    if (tags.includes("breakfast-for-dinner")) {
      score -= 1;
      notes.push("Breakfast-style meals stay possible at dinner, but get a small pullback.");
    }
    if (tags.some((tag) => ["warm", "comfort", "soupy", "set-meal", "plate"].includes(tag))) {
      score += 1;
      notes.push("Warmer or more complete meals fit dinner a little better.");
    }
  }

  if (timeWindow === "late") {
    if (meal.heaviness === "light") {
      score += 2;
      notes.push("Lighter meals fit a later meal window better.");
    }
    if (tags.some((tag) => ["soupy", "gentle", "warm"].includes(tag))) {
      score += 1;
      notes.push("Warm, gentler meals are a good fit later on.");
    }
    if (meal.heaviness === "heavy") {
      score -= 2;
      notes.push("Heavy meals get pulled back later in the day.");
    }
  }

  return createBreakdownItem("time-of-day", score, notes.join(" ") || "Time-of-day fit is neutral for this meal.");
};

const scoreWeeklyPatternFit = (
  history: DayHistory[],
  basis: WeeklyHistoryBasis,
  meal: Recommendation,
) => {
  const weekly = summarizeWeeklyPatterns(history);
  if (!basis.sufficientForAdjustment) {
    return createBreakdownItem(
      "weekly-pattern",
      0,
      basis.loggedMealCount === 0
        ? `No logged meals across the ${basis.availableDayCount} prior days, so recent history does not adjust this recommendation.`
        : `Only ${basis.loggedMealCount} logged meal${basis.loggedMealCount === 1 ? "" : "s"} across ${basis.loggedDayCount} prior day${basis.loggedDayCount === 1 ? "" : "s"}; recent history needs at least 4 meals across 2 days before it adjusts a score.`,
    );
  }

  let score = 0;
  const notes: string[] = [];
  const lowerTags = meal.tags.map((tag) => tag.toLowerCase());

  if (weekly.riceHeavyCount >= 4 && lowerTags.some((tag) => tag.includes("rice-based") || tag.includes("bowl"))) {
    score -= 1;
    notes.push("Rice appears often in the recent logs, so this gets a small variety reduction.");
  }

  if (weekly.noodleHeavyCount >= 4 && lowerTags.some((tag) => tag.includes("noodle") || tag.includes("udon") || tag.includes("soba"))) {
    score -= 1;
    notes.push("Noodles already showed up often this week, so this is slightly less distinct.");
  }

  if (weekly.friedCount >= 3) {
    if (meal.heaviness === "light") {
      score += 2;
      notes.push("Fried or stir-fried meals appear in the recent logs, so lighter templates move up.");
    } else if (meal.heaviness === "heavy") {
      score -= 2;
      notes.push("Heavier templates get a reduction after repeated fried or stir-fried records.");
    }
  }

  if (weekly.vegetableMeals < Math.max(4, Math.ceil(weekly.mealsCount * 0.45))) {
    if (meal.vegetableLevel === "high") {
      score += 2;
      notes.push("Vegetables appear in fewer of the recent logged meals, so this gets a boost.");
    } else if (meal.vegetableLevel === "medium") {
      score += 1;
      notes.push("This adds vegetables to the recent logged mix.");
    }
  }

  if (weekly.takeoutCount > weekly.homeCount && meal.worksFor.includes("takeout")) {
    score += 1;
    notes.push("This fits the more takeout-leaning rhythm from recent days.");
  }

  if (weekly.homeCount > weekly.takeoutCount && meal.worksFor.includes("home-cooked")) {
    score += 1;
    notes.push("This fits the more home-style rhythm from recent days.");
  }

  const basisNote = `Based on ${basis.loggedMealCount} logged meals across ${basis.loggedDayCount} prior days.`;
  return createBreakdownItem(
    "weekly-pattern",
    score,
    `${notes.join(" ") || "Recent-pattern fit is neutral for this meal."} ${basisNote}`,
  );
};

const scoreBalanceBias = (summary: TodayIntakeSummary, meal: Recommendation) => {
  const protein = scoreProteinBalance(summary, meal);
  const vegetables = scoreVegetableBalance(summary, meal);
  const carbs = scoreCarbBalance(summary, meal);
  const heaviness = scoreHeavinessBalance(summary, meal);

  return {
    items: [protein, vegetables, carbs, heaviness],
    total: protein.points + vegetables.points + carbs.points + heaviness.points,
  };
};

const trendLabelMap: Record<string, { en: string; zh: string }> = {
  "Chinese-style": { en: "Chinese-style meals", zh: "中式餐點" },
  "Taiwanese-style": { en: "Taiwanese-style meals", zh: "台式餐點" },
  Japanese: { en: "Japanese-inspired meals", zh: "日式餐點" },
  Korean: { en: "Korean-inspired meals", zh: "韓式餐點" },
  "American light meals": { en: "American light meals", zh: "美式輕食" },
  "Bowl meals": { en: "bowl meals", zh: "碗餐" },
  "Set meals": { en: "set meals", zh: "套餐" },
  "Wraps / sandwiches": { en: "wraps or sandwiches", zh: "捲餅或三明治" },
  "High-protein": { en: "protein-forward templates", zh: "蛋白質較多的餐型" },
  "Comfort meals": { en: "comfort meals", zh: "舒適家常餐" },
  "Breakfast-for-dinner": { en: "breakfast-style meals", zh: "早餐型餐點" },
  Mediterranean: { en: "Mediterranean-inspired meals", zh: "地中海式餐點" },
  "Mexican-inspired": { en: "Mexican-inspired meals", zh: "墨西哥風味餐點" },
  "Rice-based meals": { en: "rice-based meals", zh: "飯類餐點" },
  "Noodle-based meals": { en: "noodle-based meals", zh: "麵類餐點" },
  "Soupy meals": { en: "soupy meals", zh: "湯類餐點" },
  "Warm meals": { en: "warm meals", zh: "溫熱餐點" },
  "Light meals": { en: "lighter meal formats", zh: "比較清爽的餐型" },
  "Takeout-friendly": { en: "takeout-friendly choices", zh: "外帶友善的選擇" },
  "Quick grocery meals": { en: "quick grocery meals", zh: "超市快速組合餐" },
  "Plant-protein": { en: "plant-protein options", zh: "植物性蛋白選項" },
  "Vegetable-forward": { en: "vegetable-forward meals", zh: "蔬菜比例較高的餐點" },
  "Portable meals": { en: "portable meals", zh: "方便攜帶的餐點" },
  "Coffee / caffeine": { en: "coffee or caffeinated drinks", zh: "咖啡或含咖啡因飲品" },
  Tea: { en: "tea", zh: "茶類" },
  "Simple drinks": { en: "simple drinks", zh: "簡單飲品" },
  "Juices / smoothies": { en: "juices or smoothies", zh: "果汁或果昔" },
};

const observedTrendLabelMap: Record<string, { en: string; zh: string }> = {
  "rice-based meals": { en: "rice-based meals", zh: "飯類餐點" },
  "noodle-based meals": { en: "noodle-based meals", zh: "麵類餐點" },
  "soupy meals": { en: "soupy meals", zh: "湯類餐點" },
  "warm meals": { en: "warm meals", zh: "溫熱餐點" },
  "lighter meal formats": { en: "lighter meal formats", zh: "比較清爽的餐型" },
  "takeout-friendly choices": { en: "takeout-friendly choices", zh: "外帶友善的選擇" },
  "home-style meals": { en: "home-style meals", zh: "家常型餐點" },
  "plant-protein options": { en: "plant-protein options", zh: "植物性蛋白選項" },
  "vegetable-forward meals": { en: "vegetable-forward meals", zh: "蔬菜比例較高的餐點" },
  "portable meals": { en: "portable meals", zh: "方便攜帶的餐點" },
  "coffee / caffeine": { en: "coffee or caffeinated drinks", zh: "咖啡或含咖啡因飲品" },
  "sweet drinks": { en: "sweet drinks", zh: "甜飲" },
  "alcohol drinks": { en: "alcohol drinks", zh: "酒精飲品" },
  "juices or smoothies": { en: "juices or smoothies", zh: "果汁或果昔" },
};

const joinList = (items: string[], locale: Locale) => {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return locale === "en" ? `${items[0]} and ${items[1]}` : `${items[0]}和${items[1]}`;
  return locale === "en"
    ? `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`
    : `${items.slice(0, -1).join("、")}和${items[items.length - 1]}`;
};

const describeTrend = (key: string, locale: Locale) => trendLabelMap[key]?.[locale] ?? key;
const describeObservedTrend = (key: string, locale: Locale) => observedTrendLabelMap[key]?.[locale] ?? key;

const getPrimaryReason = (summary: TodayIntakeSummary, profile: Profile, meal: Recommendation, locale: Locale) => {
  if ((summary.sweetDrinkCount + summary.dessertSnackCount >= 2) && meal.vegetableLevel === "high") {
    return locale === "en"
      ? "A steadier next meal if snacks or sweeter drinks already showed up earlier."
      : "如果前面已經有點心或偏甜飲料，這會是更穩一點的下一餐。";
  }

  if (summary.alcoholCount >= 1 && meal.heaviness === "light") {
    return locale === "en"
      ? "A lighter option that can feel more comfortable after drinks earlier in the day."
      : "如果今天前面有喝酒，這會是比較舒服、也比較輕一點的選擇。";
  }

  if (summary.vegetableStatus === "low" && meal.vegetableLevel === "high" && meal.proteinLevel !== "low") {
    return locale === "en"
      ? "Vegetables are less prominent in your logs. This template includes vegetables and protein; incomplete logs cannot show actual intake."
      : "目前紀錄中的蔬菜較少。這個餐型包含蔬菜與蛋白質；不完整的紀錄無法代表實際攝取量。";
  }

  if ((summary.heavinessStatus === "high" || summary.friedOilyStatus === "high") && meal.heaviness === "light") {
    return locale === "en"
      ? "A lighter option if today's meals already felt heavy."
      : "如果今天前面幾餐已經偏重，這會是比較輕盈的下一餐。";
  }

  if (meal.convenience === "high") {
    return locale === "en" ? "Practical when you want balance with minimal effort." : "想吃得比較平衡、又不想太費力時，這個很實際。";
  }

  if (scorePreferenceFit(profile, meal).points > 0) {
    return locale === "en" ? "Fits your saved preferences without feeling one-note." : "符合你平常的偏好，同時又不會太單調。";
  }

  return locale === "en"
    ? "A realistic next meal that keeps things balanced and easy to act on."
    : "是一個實際、平衡，也容易立刻執行的下一餐選擇。";
};

export const buildRecommendationReason = (
  label: RecommendationCardLabel,
  summary: TodayIntakeSummary,
  profile: Profile,
  meal: Recommendation,
  locale: Locale,
) => {
  if (
    summary.proteinCount + summary.vegetableCount + summary.carbCount +
      summary.fruitCount + summary.soupCount === 0
  ) {
    return locale === "en"
      ? "No classified food groups are logged yet. This is a general meal idea; incomplete logs cannot show actual intake or what you need."
      : "目前尚未記錄可分類的食物組成。這只是一般餐型提案；不完整的紀錄無法代表實際攝取量或營養需求。";
  }
  if (label === "Most Convenient") {
    if (meal.convenience === "high") return locale === "en" ? "A low-friction option when you want something practical and easy to follow through on." : "想吃得實際、又容易做到時，這是一個低阻力的選擇。";
    if (scorePreferenceFit(profile, meal).points > 0) return locale === "en" ? "Keeps things convenient while still lining up with the styles you usually enjoy." : "在保持方便的同時，也還是貼近你平常喜歡的餐型。";
    return locale === "en" ? "An easier next step that still keeps the meal feeling reasonably balanced." : "是個更容易執行的下一步，也還保留了基本的平衡感。";
  }

  if (label === "Best Balance") {
    if (summary.vegetableStatus === "low" && meal.vegetableLevel !== "low") return locale === "en" ? "This template adds vegetables and protein to the logged pattern; it does not establish what you need." : "這個餐型為目前紀錄的組合增加蔬菜與蛋白質，不代表你需要補充多少營養。";
    if ((summary.heavinessStatus === "high" || summary.friedOilyStatus === "high") && meal.heaviness === "light") return locale === "en" ? "A gentler pick when the earlier meals already carried more weight." : "如果前面幾餐已經偏重，這會是更溫和一點的選擇。";
    return locale === "en" ? "A more balanced pick for keeping the next meal supportive and not overcomplicated." : "是比較平衡的一張卡，讓下一餐有支持感，但不會太複雜。";
  }

  return getPrimaryReason(summary, profile, meal, locale);
};

const getBaseBalanceNote = (meal: Recommendation, locale: Locale) => {
  const parts: string[] = [];
  if (meal.proteinLevel === "high") parts.push(locale === "en" ? "strong on protein" : "蛋白質很穩");
  else if (meal.proteinLevel === "medium") parts.push(locale === "en" ? "steady on protein" : "蛋白質適中");
  if (meal.vegetableLevel === "high") parts.push(locale === "en" ? "good vegetable coverage" : "蔬菜比例不錯");
  else if (meal.vegetableLevel === "medium") parts.push(locale === "en" ? "some vegetables built in" : "有帶一些蔬菜");
  if (meal.carbLevel === "low") parts.push(locale === "en" ? "lighter on carbs" : "碳水比較輕");
  else if (meal.carbLevel === "medium") parts.push(locale === "en" ? "moderate carbs" : "碳水適中");
  return (locale === "en" ? "Editorial template: " : "編輯餐型：") +
    parts.slice(0, 2).join(locale === "en" ? " with " : "，");
};

export const generateBalanceNote = (label: RecommendationCardLabel, meal: Recommendation, locale: Locale) => {
  const base = getBaseBalanceNote(meal, locale);

  if (label === "Most Convenient") return locale === "en" ? `${base}; easier to pull off on a busy day.` : `${base}；忙碌的日子也比較容易做到。`;
  if (label === "Best Balance") return locale === "en" ? `${base}; a steadier overall composition.` : `${base}；整體組合更穩一些。`;
  return base;
};

export const scoreMealOption = (
  summary: TodayIntakeSummary,
  todayLog: TodayLog,
  history: DayHistory[],
  profile: Profile,
  meal: Recommendation,
  timeWindow: MealTimeWindow,
  locale: Locale,
  weeklyHistoryBasis = summarizeHistoryBasis(history),
): ScoredRecommendation => {
  const balance = scoreBalanceBias(summary, meal);
  const convenience = scoreConvenienceFit(summary, profile, meal);
  const profileFit = scoreProfileFit(profile, meal);
  const preferences = scorePreferenceFit(profile, meal);
  const avoid = scoreAvoidConflicts(profile, meal, timeWindow);
  const variety = scoreVariety(todayLog, meal);
  const snackDrink = scoreSnackDrinkFit(summary, meal);
  const timeOfDay = scoreTimeOfDayFit(timeWindow, meal);
  const weeklyPattern = scoreWeeklyPatternFit(
    history,
    weeklyHistoryBasis,
    meal,
  );
  const balanceScore = balance.total;
  const convenienceScore = convenience.points;
  const preferenceScore = preferences.points;
  const avoidScore = avoid.points;
  const varietyScore = variety.points;
  const weeklyPatternScore = weeklyPattern.points;
  const score = balanceScore + convenienceScore + profileFit.points + preferenceScore + avoidScore + varietyScore + snackDrink.points + timeOfDay.points + weeklyPatternScore;

  return {
    ...meal,
    score,
    balanceScore,
    convenienceScore,
    preferenceScore,
    avoidScore,
    varietyScore,
    weeklyPatternScore,
    weeklyHistoryBasis,
    label: "Best Match",
    shortReason: buildRecommendationReason("Best Match", summary, profile, meal, locale),
    balanceNote: generateBalanceNote("Best Match", meal, locale),
    suggestedDrink: buildSuggestedDrink(summary, profile, meal, timeWindow, locale),
    convenienceLabel: locale === "en" ? meal.convenience.charAt(0).toUpperCase() + meal.convenience.slice(1) : meal.convenience === "high" ? "高" : meal.convenience === "medium" ? "中" : "低",
    scoreBreakdown: [...balance.items, convenience, profileFit, preferences, avoid, variety, snackDrink, timeOfDay, weeklyPattern].map((item) => ({ ...item, note: localizeRuleNote(item.note, locale) })),
    selectionTrace: null,
  };
};

export const dedupeRecommendations = (items: ScoredRecommendation[]) => {
  const pickedTitles = new Set<string>();

  return items.filter((item) => {
    if (pickedTitles.has(item.title)) return false;
    pickedTitles.add(item.title);
    return true;
  });
};

const FAIRNESS_SCORE_WINDOW = 3;
const FAIRNESS_MAX_POOL = 12;
const DRINK_FAIRNESS_SCORE_WINDOW = 2;
const DRINK_FAIRNESS_MAX_POOL = 8;

const matchesDrinkPreference = (drink: DrinkOption, preferenceTag: string) => {
  if (preferenceTag === "Tea") return drink.category === "tea";
  if (preferenceTag === "Coffee / caffeine") return drink.category === "coffee" || drink.caffeine;
  if (preferenceTag === "Simple drinks") return drink.category === "simple";
  if (preferenceTag === "Juices / smoothies") return drink.category === "juice";
  return false;
};

const genericFairnessTags = new Set([
  "balanced",
  "light",
  "warm",
  "comfort",
  "everyday",
  "quick",
  "convenient",
  "takeout",
  "bowl",
  "plate",
  "portable",
  "high-protein",
  "rice-based",
  "savory",
  "flavorful",
]);

const datasetTagFrequency = recommendationDataset.reduce<Map<string, number>>((map, meal) => {
  meal.tags.forEach((tag) => {
    const normalized = tag.toLowerCase();
    map.set(normalized, (map.get(normalized) ?? 0) + 1);
  });
  return map;
}, new Map());

const stableHash = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const getFairnessExposureBonus = (meal: Recommendation) => {
  let bonus = meal.fairnessExposureAdjustment;

  meal.tags.forEach((tag) => {
    const normalized = tag.toLowerCase();
    if (genericFairnessTags.has(normalized)) return;

    const frequency = datasetTagFrequency.get(normalized) ?? 0;
    if (frequency > 0 && frequency <= 3) bonus += 0.9;
    else if (frequency <= 5) bonus += 0.55;
    else if (frequency <= 8) bonus += 0.25;
  });

  return Math.round(Math.min(3, bonus) * 100) / 100;
};

const roundSelectionScore = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const selectionAdjustment = (
  key: string,
  points: number,
  note: string,
): SelectionAdjustment => ({
  key,
  points: roundSelectionScore(points),
  note,
});

type RankedCandidate = {
  item: ScoredRecommendation;
  perspectiveAdjustments: SelectionAdjustment[];
  perspectiveScore: number;
  fairnessAdjustment: number;
  formatDiversityAdjustment: number;
  selectionScore: number;
};

const rankCandidate = (
  item: ScoredRecommendation,
  pickedFormats: Set<string>,
  buildPerspectiveAdjustments: (
    item: ScoredRecommendation,
  ) => SelectionAdjustment[],
): RankedCandidate => {
  const formats = getMealFormats(item);
  const formatDiversityAdjustment = formats.some((format) =>
    pickedFormats.has(format),
  )
    ? -1.5
    : 0;
  const fairnessAdjustment = getFairnessExposureBonus(item);
  const perspectiveAdjustments = buildPerspectiveAdjustments(item);
  const perspectiveScore = roundSelectionScore(
    perspectiveAdjustments.reduce((sum, adjustment) => sum + adjustment.points, 0),
  );
  const selectionScore = roundSelectionScore(
    perspectiveScore + fairnessAdjustment + formatDiversityAdjustment,
  );

  return {
    item,
    perspectiveAdjustments,
    perspectiveScore,
    fairnessAdjustment,
    formatDiversityAdjustment,
    selectionScore,
  };
};

const rankCandidates = (
  source: ScoredRecommendation[],
  picked: Set<string>,
  pickedFormats: Set<string>,
  buildPerspectiveAdjustments: (
    item: ScoredRecommendation,
  ) => SelectionAdjustment[],
) =>
  source
    .filter((item) => !picked.has(item.id))
    .map((item) =>
      rankCandidate(item, pickedFormats, buildPerspectiveAdjustments),
    )
    .sort(
      (a, b) =>
        b.selectionScore - a.selectionScore ||
        a.item.id.localeCompare(b.item.id),
    );

const pickRecommendation = (
  label: RecommendationCardLabel,
  summary: TodayIntakeSummary,
  profile: Profile,
  locale: Locale,
  rotationSeed: string,
  source: ScoredRecommendation[],
  picked: Set<string>,
  pickedFormats: Set<string>,
  buildPerspectiveAdjustments: (
    item: ScoredRecommendation,
  ) => SelectionAdjustment[],
) => {
  const ranked = rankCandidates(
    source,
    picked,
    pickedFormats,
    buildPerspectiveAdjustments,
  );
  if (ranked.length === 0) return null;

  const topScore = ranked[0].selectionScore;
  const nearTiePool = ranked
    .filter(
      ({ selectionScore }) =>
        topScore - selectionScore <= FAIRNESS_SCORE_WINDOW,
    )
    .slice(0, FAIRNESS_MAX_POOL);
  const traceSeed = `${label}:${rotationSeed}`;
  const rotationIndex =
    nearTiePool.length > 1 ? stableHash(traceSeed) % nearTiePool.length : 0;
  const selected = nearTiePool[rotationIndex];
  const next = selected.item;
  picked.add(next.id);
  getMealFormats(next).forEach((format) => pickedFormats.add(format));

  return {
    ...next,
    label,
    shortReason: buildRecommendationReason(label, summary, profile, next, locale),
    balanceNote: generateBalanceNote(label, next, locale),
    selectionTrace: {
      perspective: label,
      ruleScore: next.score,
      perspectiveAdjustments: selected.perspectiveAdjustments.map((adjustment) => ({ ...adjustment, note: localizeRuleNote(adjustment.note, locale) })),
      perspectiveScore: selected.perspectiveScore,
      fairnessAdjustment: selected.fairnessAdjustment,
      fairnessNote: localizeRuleNote(
        selected.fairnessAdjustment > 0
          ? "Catalog-declared exposure plus uncommon structured tags receive a capped, visible fairness adjustment."
          : "No catalog exposure or uncommon structured-tag fairness adjustment applied.", locale),
      formatDiversityAdjustment: selected.formatDiversityAdjustment,
      formatDiversityNote: localizeRuleNote(
        selected.formatDiversityAdjustment < 0
          ? "A format already used by an earlier perspective receives a diversity penalty."
          : "This format did not duplicate an earlier perspective.", locale),
      selectionScore: selected.selectionScore,
      candidateCount: ranked.length,
      nearTieCount: nearTiePool.length,
      nearTieWindow: FAIRNESS_SCORE_WINDOW,
      rotationApplied: nearTiePool.length > 1,
      rotationIndex,
      rotationSeed: traceSeed,
      selectedPoolRank: rotationIndex + 1,
    },
  };
};

export const getBestMatch = (summary: TodayIntakeSummary, profile: Profile, locale: Locale, rotationSeed: string, items: ScoredRecommendation[], picked: Set<string>, pickedFormats: Set<string>) =>
  pickRecommendation("Best Match", summary, profile, locale, `${rotationSeed}:best-match`, items, picked, pickedFormats, (item) => {
    const mealTypeBonus =
      item.mealType === "balanced"
        ? 1
        : item.mealType === "preference" && item.preferenceScore > 0
          ? 2.5
          : item.mealType === "preference"
            ? 0.5
            : 0;
    return [
      selectionAdjustment(
        "rule-score",
        item.score,
        "Sum of the visible deterministic rule receipt.",
      ),
      selectionAdjustment(
        "weekly-perspective",
        item.weeklyPatternScore * 0.75,
        "Best Match gives recent-pattern fit an additional 0.75× perspective weight.",
      ),
      selectionAdjustment(
        "feel-priority",
        scoreFeelPriority(profile, item),
        "Best Match adds the declared current-feeling priority.",
      ),
      selectionAdjustment(
        "meal-type",
        mealTypeBonus,
        "Best Match applies its declared meal-type fit.",
      ),
    ];
  });

export const getBestBalance = (summary: TodayIntakeSummary, profile: Profile, locale: Locale, rotationSeed: string, items: ScoredRecommendation[], picked: Set<string>, pickedFormats: Set<string>) =>
  pickRecommendation("Best Balance", summary, profile, locale, `${rotationSeed}:best-balance`, items, picked, pickedFormats, (item) => {
    const mealTypeBonus = item.mealType === "balanced" || item.mealType === "recovery" || item.mealType === "light" ? 2 : 0;
    const steadinessBonus = item.heaviness === "light" ? 1 : item.heaviness === "medium" ? 0.5 : -1;
    return [
      selectionAdjustment("balance-focus", item.balanceScore * 2, "Best Balance weights the food-group and heaviness subtotal 2×."),
      selectionAdjustment("weekly-pattern", item.weeklyPatternScore, "Recent-pattern points remain fully visible."),
      selectionAdjustment("preference-temper", item.preferenceScore * 0.35, "Preferences retain a 0.35× influence in the balance perspective."),
      selectionAdjustment("hard-avoid", item.avoidScore, "The structured hard-avoid result is carried through."),
      selectionAdjustment("variety", item.varietyScore, "Same-day variety remains part of this perspective."),
      selectionAdjustment("meal-type", mealTypeBonus, "Balanced, recovery, and light templates receive the declared fit."),
      selectionAdjustment("steadiness", steadinessBonus, "Lighter templates receive the declared steadiness adjustment."),
    ];
  });

export const getMostConvenient = (summary: TodayIntakeSummary, profile: Profile, locale: Locale, rotationSeed: string, items: ScoredRecommendation[], picked: Set<string>, pickedFormats: Set<string>) =>
  pickRecommendation("Most Convenient", summary, profile, locale, `${rotationSeed}:most-convenient`, items, picked, pickedFormats, (item) => {
    const convenienceBonus = item.convenience === "high" ? 2 : item.convenience === "medium" ? 1 : -1;
    const reasonableBalanceGuard = item.balanceScore >= 0 ? 1 : -1;
    const portableBonus = item.tags.some((tag) => ["portable", "takeout", "quick", "convenient"].includes(tag.toLowerCase())) ? 1 : 0;
    return [
      selectionAdjustment("convenience-focus", item.convenienceScore * 2, "Most Convenient weights the visible convenience subtotal 2×."),
      selectionAdjustment("declared-convenience", convenienceBonus, "The catalog convenience level supplies the declared perspective fit."),
      selectionAdjustment("portable-format", portableBonus, "Structured portable, takeout, quick, or convenient tags add one point."),
      selectionAdjustment("balance-guard", item.balanceScore * 0.5, "Balance keeps a 0.5× guardrail in this perspective."),
      selectionAdjustment("weekly-pattern", item.weeklyPatternScore * 0.5, "Recent-pattern fit keeps a 0.5× influence."),
      selectionAdjustment("hard-avoid", item.avoidScore, "The structured hard-avoid result is carried through."),
      selectionAdjustment("variety", item.varietyScore, "Same-day variety remains part of this perspective."),
      selectionAdjustment("reasonable-balance", reasonableBalanceGuard, "A non-negative balance subtotal receives the declared guard."),
    ];
  });

export const scoreRecommendations = (profile: Profile, todayLog: TodayLog, history: DayHistory[], locale: Locale, now = new Date()): ScoredRecommendation[] => {
  const summary = summarizeTodayIntake(todayLog);
  const timeWindow = getMealTimeWindow(now);
  const priorHistory = getPriorHistory(history);
  const weeklyHistoryBasis = summarizeHistoryBasis(priorHistory);
  const todayId = history.find((day) => day.isToday)?.id ?? history[history.length - 1]?.id ?? now.toISOString().slice(0, 10);
  const rotationSeed = [
    todayId,
    timeWindow,
    profile.feelToday,
    profile.eatingStyle,
    [...profile.preferenceTags].sort().join("|"),
    [...profile.avoidTags].sort().join("|"),
    summary.proteinStatus,
    summary.vegetableStatus,
    summary.carbStatus,
    summary.heavinessStatus,
  ].join(":");
  const eligibleMeals = recommendationDataset.filter(
    (meal) => getHardAvoidConflicts(profile, meal, timeWindow).length === 0,
  );
  const scored = eligibleMeals
    .map((meal) =>
      scoreMealOption(
        summary,
        todayLog,
        priorHistory,
        profile,
        meal,
        timeWindow,
        locale,
        weeklyHistoryBasis,
      ),
    )
    .sort((a, b) => b.score - a.score);

  const deduped = dedupeRecommendations(scored);
  const picked = new Set<string>();
  const pickedFormats = new Set<string>();

  const bestMatch = getBestMatch(summary, profile, locale, rotationSeed, deduped, picked, pickedFormats);
  const bestBalance = getBestBalance(summary, profile, locale, rotationSeed, deduped, picked, pickedFormats);
  const mostConvenient = getMostConvenient(summary, profile, locale, rotationSeed, deduped, picked, pickedFormats);

  return [bestMatch, bestBalance, mostConvenient].filter(Boolean) as ScoredRecommendation[];
};

export const countHardAvoidedRecommendations = (
  profile: Profile,
  now = new Date(),
) => {
  const timeWindow = getMealTimeWindow(now);
  return recommendationDataset.filter(
    (meal) => getHardAvoidConflicts(profile, meal, timeWindow).length > 0,
  ).length;
};

const buildPreferenceTrendSummary = (history: DayHistory[], profile: Profile, locale: Locale) => {
  const meals = flattenHistoryMeals(history);

  if (meals.length < 4) {
    return locale === "en"
      ? "There is not enough weekly logging yet to say much about your recent food pattern."
      : "目前這週的紀錄還不夠多，暫時看不出太明確的飲食偏好變化。";
  }

  const riceCount = meals.filter((meal) => detectMealFormatSignals(meal).riceHeavy).length;
  const noodleCount = meals.filter((meal) => detectMealFormatSignals(meal).noodleHeavy).length;
  const soupyCount = meals.filter((meal) => meal.soup.length > 0 || meal.cookingMethod === "Soup / stew").length;
  const warmCount = meals.filter((meal) => ["Soup / stew", "Boiled", "Stir-fried", "Steamed", "Grilled"].includes(meal.cookingMethod)).length;
  const lightCount = meals.filter((meal) => ["Steamed", "Boiled", "Soup / stew", "Raw / cold", "Other"].includes(meal.cookingMethod)).length;
  const convenienceCount = meals.filter((meal) => ["Takeout", "Restaurant", "Ready-made"].includes(meal.mealSource)).length;
  const takeoutCount = meals.filter((meal) => meal.mealSource === "Takeout" || meal.mealSource === "Restaurant").length;
  const homeCount = meals.filter((meal) => meal.mealSource === "Home-cooked").length;
  const caffeineCount = meals.filter((meal) => meal.drink.some((item) => matchesLoggedFood(item, caffeineKeywords))).length;
  const sweetDrinkCount = meals.filter((meal) => meal.drink.some((item) => matchesLoggedFood(item, sweetDrinkKeywords))).length;
  const alcoholDrinkCount = meals.filter((meal) => meal.drink.some((item) => matchesLoggedFood(item, alcoholKeywords))).length;
  const plantProteinCount = meals.filter((meal) => meal.protein.some((item) => matchesLoggedFood(item, ["tofu", "tempeh", "beans", "black beans", "chickpeas", "edamame"]))).length;
  const vegetableForwardCount = meals.filter((meal) => meal.vegetables.length >= 2 || (meal.vegetables.length >= 1 && meal.fruit.length >= 1)).length;
  const portableCount = meals.filter((meal) => meal.carbs.some((item) => matchesLoggedFood(item, ["wrap", "bread", "bagel", "toast", "bao / bun"]))).length;

  const matchedTrends: string[] = [];
  const unmatchedPreferences: string[] = [];

  const preferenceChecks: Record<string, boolean> = {
    "Rice-based meals": riceCount >= 2,
    "Noodle-based meals": noodleCount >= 2,
    "Soupy meals": soupyCount >= 2,
    "Warm meals": warmCount >= Math.max(3, Math.ceil(meals.length * 0.45)),
    "Light meals": lightCount >= Math.max(3, Math.ceil(meals.length * 0.45)),
    "Takeout-friendly": takeoutCount >= Math.max(2, homeCount),
    "Quick grocery meals": convenienceCount >= Math.max(2, Math.ceil(meals.length * 0.4)),
    "Plant-protein": plantProteinCount >= 2,
    "Vegetable-forward": vegetableForwardCount >= 2,
    "Portable meals": portableCount >= 2,
    "Coffee / caffeine": caffeineCount >= 2,
    Tea: meals.filter((meal) => meal.drink.some((item) => matchesLoggedFood(item, ["tea", "green tea", "black tea"]))).length >= 2,
    "Simple drinks": meals.filter((meal) => meal.drink.some((item) => matchesLoggedFood(item, ["water", "sparkling water", "tea", "green tea", "black tea"]))).length >= 2,
  };

  profile.preferenceTags.forEach((tag) => {
    if (!(tag in preferenceChecks)) return;
    if (preferenceChecks[tag]) matchedTrends.push(tag);
    else unmatchedPreferences.push(tag);
  });

  const observedTrendPool = [
    riceCount >= 2 ? "rice-based meals" : "",
    noodleCount >= 2 ? "noodle-based meals" : "",
    soupyCount >= 2 ? "soupy meals" : "",
    warmCount >= Math.max(3, Math.ceil(meals.length * 0.45)) ? "warm meals" : "",
    lightCount >= Math.max(3, Math.ceil(meals.length * 0.45)) ? "lighter meal formats" : "",
    takeoutCount >= Math.max(2, homeCount) ? "takeout-friendly choices" : "",
    homeCount > takeoutCount ? "home-style meals" : "",
    plantProteinCount >= 2 ? "plant-protein options" : "",
    vegetableForwardCount >= 2 ? "vegetable-forward meals" : "",
    portableCount >= 2 ? "portable meals" : "",
    caffeineCount >= 2 ? "coffee / caffeine" : "",
    sweetDrinkCount >= 2 ? "sweet drinks" : "",
    alcoholDrinkCount >= 1 ? "alcohol drinks" : "",
  ].filter(Boolean);

  if (matchedTrends.length > 0) {
    const topMatch = joinList(matchedTrends.slice(0, 2).map((item) => describeTrend(item, locale)), locale);
    if (unmatchedPreferences.length > 0) {
      const softerGap = describeTrend(unmatchedPreferences[0], locale);
      return locale === "en"
        ? `Your recent meals lined up well with your preference for ${topMatch}. ${softerGap.charAt(0).toUpperCase() + softerGap.slice(1)} showed up less often in the actual logs.`
        : `你最近的實際紀錄和你偏好的 ${topMatch} 很一致。不過 ${softerGap} 在這週的實際紀錄裡出現得比較少。`;
    }
    return locale === "en"
      ? `Your recent meals lined up well with your preference for ${topMatch}.`
      : `你最近的實際紀錄和你偏好的 ${topMatch} 很一致。`;
  }

  if (profile.preferenceTags.length > 0 && observedTrendPool.length > 0) {
    const observed = joinList(observedTrendPool.slice(0, 2).map((item) => describeObservedTrend(item, locale)), locale);
    return locale === "en"
      ? `Your saved preferences are broader than what showed up this week. Recent logs leaned more toward ${observed}.`
      : `你儲存的偏好比這週實際出現的餐型更廣一些。最近的紀錄比較偏向 ${observed}。`;
  }

  if (observedTrendPool.length > 0) {
    const observed = joinList(observedTrendPool.slice(0, 2).map((item) => describeObservedTrend(item, locale)), locale);
    return locale === "en" ? `This week mostly leaned toward ${observed}.` : `這一週整體比較偏向 ${observed}。`;
  }

  return locale === "en"
    ? "As you log more meals, this will start reflecting your own style more clearly."
    : "隨著你記錄更多餐點，這裡會更清楚地反映出你的飲食風格。";
};

export const buildWeeklySnapshot = (history: DayHistory[], profile: Profile, locale: Locale) => {
  const flatMeals = flattenHistoryMeals(history);
  const loggedMealsCount = flatMeals.length;
  const dataBasis = summarizeHistoryBasis(history);
  const riceMeals = flatMeals.filter((meal) => detectMealFormatSignals(meal).riceHeavy).length;
  const noodleMeals = flatMeals.filter((meal) => detectMealFormatSignals(meal).noodleHeavy).length;
  const vegetableMeals = flatMeals.filter((meal) => meal.vegetables.length > 0).length;
  const friedMeals = flatMeals.filter((meal) => meal.cookingMethod === "Fried" || meal.cookingMethod === "Stir-fried").length;
  const warmMeals = flatMeals.filter((meal) => ["Soup / stew", "Boiled", "Stir-fried", "Steamed", "Grilled"].includes(meal.cookingMethod)).length;
  const takeoutMeals = flatMeals.filter((meal) => meal.mealSource === "Takeout" || meal.mealSource === "Restaurant" || meal.mealSource === "Ready-made").length;
  const homeMeals = flatMeals.filter((meal) => meal.mealSource === "Home-cooked").length;
  const caffeineMeals = flatMeals.filter((meal) => meal.drink.some((item) => matchesLoggedFood(item, caffeineKeywords))).length;
  const sweetDrinkMeals = flatMeals.filter((meal) => meal.drink.some((item) => matchesLoggedFood(item, sweetDrinkKeywords))).length;
  const alcoholDrinkMeals = flatMeals.filter((meal) => meal.drink.some((item) => matchesLoggedFood(item, alcoholKeywords))).length;
  const uniqueProteins = new Set(flatMeals.flatMap((meal) => meal.protein.map(normalizeLoggedFoodName))).size;
  const uniqueProduce = new Set(flatMeals.flatMap((meal) => [...meal.vegetables, ...meal.fruit].map(normalizeLoggedFoodName))).size;
  const mealDiversityScore = new Set(
    flatMeals.flatMap((meal) => {
      const formats: string[] = [];
      if (detectMealFormatSignals(meal).riceHeavy) formats.push("rice");
      if (detectMealFormatSignals(meal).noodleHeavy) formats.push("noodle");
      if (meal.carbs.some((item) => matchesLoggedFood(item, ["bread", "bagel", "wrap", "tortilla", "toast", "bao / bun"]))) formats.push("bread-wrap");
      if (meal.soup.length > 0 || meal.cookingMethod === "Soup / stew") formats.push("soup");
      if (meal.protein.some((item) => matchesLoggedFood(item, ["tofu", "tempeh", "beans", "black beans", "chickpeas", "edamame"]))) formats.push("plant-protein");
      if (meal.mealSource === "Takeout" || meal.mealSource === "Restaurant") formats.push("takeout");
      if (meal.mealSource === "Home-cooked") formats.push("home");
      return formats;
    }),
  ).size;

  if (
    loggedMealsCount < 4 ||
    dataBasis.loggedDayCount < 2
  ) {
    return {
      dataBasis,
      summaryLines: [
        locale === "en"
          ? "You only have a small amount of meal data so far, so this weekly view is still very early."
          : "你目前只記錄了很少的餐點，所以這個每週摘要還在很初期的階段。",
        locale === "en"
          ? "Log a few more meals across the week and the pattern summary will become more believable."
          : "等你這週再多記幾餐，這裡的飲食模式摘要才會更可信。",
      ],
      indicators: [
        { label: locale === "en" ? "Protein" : "蛋白質", value: locale === "en" ? "Too early" : "資料太少" },
        { label: locale === "en" ? "Vegetables" : "蔬菜", value: locale === "en" ? "Too early" : "資料太少" },
        { label: locale === "en" ? "Fiber variety" : "纖維多樣性", value: locale === "en" ? "Too early" : "資料太少" },
        { label: locale === "en" ? "Fried foods" : "炸物", value: locale === "en" ? "Too early" : "資料太少" },
        { label: locale === "en" ? "Meal diversity" : "餐型變化", value: locale === "en" ? "Too early" : "資料太少" },
      ],
      preferenceSummary: locale === "en"
        ? "There is not enough weekly logging yet to say much about your recent food pattern."
        : "目前這週的紀錄還不夠多，暫時看不出太明確的飲食偏好變化。",
    };
  }

  const summaryLines: string[] = [];

  if (riceMeals >= 2 && riceMeals > noodleMeals) {
    summaryLines.push(
      locale === "en"
        ? "Rice-based meals showed up more often than noodle-based ones."
        : "這週飯類餐點比麵類更常出現。",
    );
  } else if (noodleMeals >= 2 && noodleMeals > riceMeals) {
    summaryLines.push(
      locale === "en"
        ? "Noodle-based meals showed up more often than rice-based ones."
        : "這週麵類餐點比飯類更常出現。",
    );
  }

  if (vegetableMeals <= Math.floor(loggedMealsCount * 0.4)) {
    summaryLines.push(
      locale === "en"
        ? "Vegetables have shown up less often so far."
        : "目前蔬菜出現的頻率還偏少。",
    );
  } else if (vegetableMeals >= Math.ceil(loggedMealsCount * 0.7)) {
    summaryLines.push(
      locale === "en"
        ? "Vegetables have shown up fairly consistently so far."
        : "目前蔬菜出現得算蠻穩定。",
    );
  }

  if (warmMeals >= Math.max(3, Math.ceil(loggedMealsCount * 0.6))) {
    summaryLines.push(
      locale === "en"
        ? "Warm meals have shown up often in the current logs."
        : "目前的紀錄裡，溫熱餐點出現得蠻頻繁。",
    );
  }

  if (takeoutMeals >= 3 && takeoutMeals > homeMeals) {
    summaryLines.push(
      locale === "en"
        ? "Recent meals have leaned more toward takeout and convenience."
        : "最近幾餐比較偏向外帶和方便型選擇。",
    );
  } else if (homeMeals >= 3 && homeMeals > takeoutMeals) {
    summaryLines.push(
      locale === "en"
        ? "Recent meals have leaned more home-style."
        : "最近幾餐比較偏向家常型選擇。",
    );
  }

  if (caffeineMeals >= 3) {
    summaryLines.push(
      locale === "en"
        ? "Caffeinated drinks have shown up fairly often in the current logs."
        : "目前的紀錄裡，含咖啡因飲品出現得蠻頻繁。",
    );
  } else if (sweetDrinkMeals >= 2) {
    summaryLines.push(
      locale === "en"
        ? "Sweeter drinks have shown up a few times in the current logs."
        : "目前的紀錄裡，甜飲已經出現了幾次。",
    );
  } else if (alcoholDrinkMeals >= 1) {
    summaryLines.push(
      locale === "en"
        ? "Alcohol has shown up in the current logs."
        : "目前的紀錄裡有出現酒精飲品。",
    );
  }

  return {
    dataBasis,
    summaryLines: summaryLines.length > 0
      ? summaryLines
      : [
          locale === "en"
            ? "There is some weekly data now, but not enough repeated patterns to make a stronger summary yet."
            : "目前已經有一些每週資料了，但還沒有足夠重複的模式可以下更明確的摘要。",
        ],
    indicators: [
      { label: locale === "en" ? "Protein" : "蛋白質", value: uniqueProteins >= 5 ? (locale === "en" ? "Good range" : "種類不錯") : (locale === "en" ? "Could vary more" : "還可以更多樣") },
      { label: locale === "en" ? "Vegetables" : "蔬菜", value: vegetableMeals >= 14 ? (locale === "en" ? "Steady" : "算穩定") : (locale === "en" ? "A little light" : "稍微偏少") },
      { label: locale === "en" ? "Fiber variety" : "纖維多樣性", value: uniqueProduce >= 8 ? (locale === "en" ? "Nice mix" : "搭配不錯") : (locale === "en" ? "Could widen a bit" : "還能更廣一些") },
      { label: locale === "en" ? "Fried foods" : "炸物", value: friedMeals <= 2 ? (locale === "en" ? "Occasional" : "偶爾") : friedMeals <= 5 ? (locale === "en" ? "Moderate" : "中等") : (locale === "en" ? "Showed up often" : "出現偏多") },
      { label: locale === "en" ? "Meal diversity" : "餐型變化", value: mealDiversityScore >= 6 ? (locale === "en" ? "Flexible" : "很有彈性") : mealDiversityScore >= 4 ? (locale === "en" ? "Fairly varied" : "還算多樣") : (locale === "en" ? "Somewhat repetitive" : "稍微重複") },
    ],
    preferenceSummary: buildPreferenceTrendSummary(history, profile, locale),
  };
};

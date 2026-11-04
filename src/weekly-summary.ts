import { resolveObservedFoodIdentity } from "./food-identity";
import type { ObservedFoodIdentity } from "./food-identity";
import type { DayHistory, Locale, MealEntry, ParsedMealComponent, Profile, WeeklyHistoryBasis } from "./types";

const fields = [
  ["protein", "protein"], ["vegetables", "vegetable"], ["carbs", "carb"],
  ["fruit", "fruit"], ["soup", "soup"], ["drink", "drink"],
] as const;
const isNamed = (item: Pick<ParsedMealComponent, "name" | "group">) => Boolean(item.name.trim()) &&
  !(item.group === "other" && /^(Mixed meal sources:|Mixed preparation:|Combined portions:)/.test(item.name));
const namedItems = (meal: MealEntry) => [
  ...fields.flatMap(([field, group]) => meal[field].map(name => ({ name, group }))),
  ...(meal.componentDetails ?? []),
].filter(isNamed);
const teaCoffeeKeys = new Set([
  "tea", "green tea", "black tea", "oolong tea", "herbal tea", "caffeine-free tea",
  "coffee", "iced coffee", "latte", "cappuccino", "milk tea", "boba",
]);
const juiceKeys = new Set(["orange juice", "apple juice", "grape juice", "grapefruit juice", "tomato juice", "fruit juice, unspecified", "green juice"]);

/** Counts describe recorded slots and recognized names, never servings or nutrient intake. */
export const buildWeeklySnapshot = (history: DayHistory[], _profile: Profile, locale: Locale) => {
  const text = (en: string, zh: string) => locale === "zh" ? zh : en;
  const days = [...new Map(history.map(day => [day.date || day.id, day])).values()]
    .sort((a, b) => (a.date || a.id).localeCompare(b.date || b.id)).slice(-7);
  const records = days.flatMap(day => Object.values(day.todayLog).map(meal => ({
    date: day.date || day.id, meal, items: namedItems(meal),
  }))).filter(record => record.items.length > 0);
  const loggedDays = new Set(records.map(record => record.date));
  const dataBasis: WeeklyHistoryBasis = {
    windowStart: days[0]?.date || days[0]?.id || "",
    windowEnd: days[days.length - 1]?.date || days[days.length - 1]?.id || "",
    availableDayCount: days.length,
    loggedDayCount: loggedDays.size,
    loggedMealCount: records.length,
    // Compatibility metadata only; factual counts need no minimum-record threshold.
    sufficientForAdjustment: loggedDays.size >= 2 && records.length >= 4,
  };
  const observations = records.map(record => {
    const identities = record.items.map(resolveObservedFoodIdentity);
    return { ...record, identities: identities.filter((identity): identity is ObservedFoodIdentity => identity !== null), unknown: identities.some(identity => identity === null) };
  });
  const count = (predicate: (record: (typeof observations)[number]) => boolean) => observations.filter(predicate).length;
  const hasGroup = (group: ParsedMealComponent["group"]) => count(record => record.identities.some(identity => identity.group === group));
  const distinct = (groups: ParsedMealComponent["group"][]) => new Set(observations.flatMap(record =>
    record.identities.flatMap(identity => groups.includes(identity.group) && identity.distinctKey ? [identity.distinctKey] : []),
  )).size;
  const counts = {
    proteinMeals: hasGroup("protein"), vegetableMeals: hasGroup("vegetable"), fruitMeals: hasGroup("fruit"),
    riceMeals: count(record => record.identities.some(identity => identity.staple === "rice")),
    noodleMeals: count(record => record.identities.some(identity => identity.staple === "noodles")),
    teaCoffeeMeals: count(record => record.identities.some(identity => identity.group === "drink" && teaCoffeeKeys.has(identity.key))),
    juiceMeals: count(record => record.identities.some(identity => identity.group === "drink" && juiceKeys.has(identity.key))),
    alcoholicDrinkMeals: count(record => record.identities.some(identity => identity.group === "drink" && identity.alcohol)),
    friedMeals: count(record => record.meal.cookingMethod === "Fried"),
    stirFriedMeals: count(record => record.meal.cookingMethod === "Stir-fried"),
    homeMeals: count(record => record.meal.mealSource === "Home-cooked"),
    outsideMeals: count(record => ["Takeout", "Restaurant", "Ready-made"].includes(record.meal.mealSource)),
    unknownMeals: count(record => record.unknown),
    groupOnlyMeals: count(record => record.identities.some(identity => identity.distinctKey === null)),
    distinctProteinFoods: distinct(["protein"]), distinctProduceFoods: distinct(["vegetable", "fruit"]),
  };
  const total = dataBasis.loggedMealCount;
  const slotCount = (value: number) => text(`${value} / ${total} slots`, `${value} / ${total} 個餐別`);
  const summaryLines = [
    text(`${total} recorded meal slots across ${dataBasis.loggedDayCount} of ${days.length} calendar days. Empty slots remain unknown.`,
      `${days.length} 個日曆日中有 ${dataBasis.loggedDayCount} 天、${total} 個餐別有紀錄。空白餐別維持未知。`),
  ];
  if (total > 0) {
    summaryLines.push(
      text(`Recognized protein foods in ${counts.proteinMeals} of ${total} recorded slots, vegetables in ${counts.vegetableMeals}, and fruit in ${counts.fruitMeals}.`,
        `${total} 個有紀錄的餐別中，${counts.proteinMeals} 個辨識到蛋白質食物、${counts.vegetableMeals} 個辨識到蔬菜、${counts.fruitMeals} 個辨識到水果。`),
      text(`Recognized ${counts.distinctProteinFoods} distinct named protein foods and ${counts.distinctProduceFoods} distinct named vegetables or fruits. Aliases count once; source records without a reviewed food identity are excluded from these distinct-food counts.`,
        `辨識到 ${counts.distinctProteinFoods} 種具名蛋白質食物、${counts.distinctProduceFoods} 種具名蔬菜或水果。別名合併計算；尚未確認具名食材身分的來源資料不列入種類數。`),
      text(`Preparation was recorded as fried in ${counts.friedMeals} slots and stir-fried in ${counts.stirFriedMeals} slots.`,
        `烹調方式記為油炸的有 ${counts.friedMeals} 個餐別，記為炒的有 ${counts.stirFriedMeals} 個餐別。`),
    );
    if (counts.teaCoffeeMeals || counts.juiceMeals || counts.alcoholicDrinkMeals) summaryLines.push(
      text(`Recognized tea or coffee in ${counts.teaCoffeeMeals} recorded slots, juice in ${counts.juiceMeals}, and alcoholic drinks in ${counts.alcoholicDrinkMeals}. Each category counts a slot once; these are not cups or amounts of caffeine, sugar, or alcohol.`,
        `${counts.teaCoffeeMeals} 個餐別辨識到茶或咖啡、${counts.juiceMeals} 個辨識到果菜汁、${counts.alcoholicDrinkMeals} 個辨識到酒精飲品。每類每個餐別只計一次；這不是杯數或咖啡因、糖、酒精的攝取量。`),
    );
    if (counts.unknownMeals || counts.groupOnlyMeals) summaryLines.push(
      text(`${counts.unknownMeals} recorded slots contain names that could not be identified; ${counts.groupOnlyMeals} contain source records classified by food group only. Unrecognized names are excluded from category counts.`,
        `${counts.unknownMeals} 個餐別含有尚未辨識的名稱，${counts.groupOnlyMeals} 個餐別含有目前只能確認食物分類的來源資料。未辨識的名稱不計入分類統計。`),
    );
  }
  return {
    dataBasis, counts, summaryLines,
    indicators: [
      { label: text("Protein foods recorded", "有蛋白質食物紀錄"), value: slotCount(counts.proteinMeals) },
      { label: text("Vegetables recorded", "有蔬菜紀錄"), value: slotCount(counts.vegetableMeals) },
      { label: text("Recognized produce types", "辨識到的蔬果種類"), value: String(counts.distinctProduceFoods) },
      { label: text("Recorded as fried", "記為油炸"), value: slotCount(counts.friedMeals) },
      { label: text("Recorded as stir-fried", "記為炒"), value: slotCount(counts.stirFriedMeals) },
    ],
    preferenceSummary: text(`Meal source was recorded as home-cooked in ${counts.homeMeals} slots and takeout, restaurant, or ready-made in ${counts.outsideMeals} slots.`,
      `餐點來源記為自煮的有 ${counts.homeMeals} 個餐別，記為外帶、餐廳或即食的有 ${counts.outsideMeals} 個餐別。`),
  };
};

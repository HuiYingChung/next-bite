import { buildSuggestedDrink, summarizeTodayIntake } from "../.audit-tmp/logic.mjs";
import { createEmptyMeal, drinkRecommendationDataset, recommendationDataset, seedProfile } from "../.audit-tmp/data.mjs";

const mealNames = ["Breakfast", "Lunch", "Dinner", "Snacks / Drinks"];
const timeWindows = ["breakfast", "lunch", "dinner", "late"];
const feelStates = ["Normal", "Want something warm", "Need something light", "Low energy", "On period"];
const eatingStyles = ["Mostly home-cooked", "Mostly takeout", "Both"];
const preferenceSets = [
  [],
  ["Tea"],
  ["Coffee / caffeine"],
  ["Simple drinks"],
  ["Juices / smoothies"],
  ["Tea", "Simple drinks"],
  ["Coffee / caffeine", "Juices / smoothies"],
];
const avoidSets = [
  [],
  ["Caffeine"],
  ["Sweet drinks"],
  ["Alcohol drinks"],
  ["Dairy"],
];

const clone = (value) => JSON.parse(JSON.stringify(value));

const makeLog = (overrides = {}) => {
  const base = Object.fromEntries(mealNames.map((name) => [name, createEmptyMeal()]));
  for (const [mealName, meal] of Object.entries(overrides)) {
    base[mealName] = {
      ...createEmptyMeal(),
      ...meal,
    };
  }
  return base;
};

const todayLogs = [
  makeLog(),
  makeLog({
    Breakfast: { drink: ["Coffee"], carbs: ["Toast"] },
    Lunch: { drink: ["Green tea"], protein: ["Chicken"], carbs: ["Rice"] },
  }),
  makeLog({
    Breakfast: { drink: ["Orange juice"], fruit: ["Banana"] },
    Lunch: { drink: ["Milk tea"], carbs: ["Crackers"] },
    Dinner: { drink: ["Sweet drink"], protein: ["Chicken"], carbs: ["Noodles"] },
  }),
  makeLog({
    Dinner: { drink: ["Beer"], protein: ["Beef"], carbs: ["Rice"], mealSource: "Restaurant" },
  }),
  makeLog({
    Breakfast: { drink: ["Smoothie"], protein: ["Greek yogurt"] },
    Lunch: { drink: ["Protein shake"], protein: ["Chicken"], vegetables: ["Broccoli"] },
  }),
  makeLog({
    Dinner: { protein: ["Tofu"], vegetables: ["Bok choy"], soup: ["Tofu soup"], cookingMethod: "Soup / stew" },
  }),
  makeLog({
    Lunch: { protein: ["Chicken"], carbs: ["Wrap"], mealSource: "Takeout" },
    "Snacks / Drinks": { drink: ["Boba"] },
  }),
];

const reached = new Map(drinkRecommendationDataset.map((drink) => [drink.title, 0]));

for (const todayLog of todayLogs) {
  const summary = summarizeTodayIntake(todayLog);
  for (const feelToday of feelStates) {
    for (const eatingStyle of eatingStyles) {
      for (const preferenceTags of preferenceSets) {
        for (const avoidTags of avoidSets) {
          const profile = {
            ...clone(seedProfile),
            feelToday,
            eatingStyle,
            preferenceTags,
            avoidTags,
          };

          for (const timeWindow of timeWindows) {
            for (const meal of recommendationDataset) {
              const suggestedDrink = buildSuggestedDrink(summary, profile, meal, timeWindow, "en");
              reached.set(suggestedDrink, (reached.get(suggestedDrink) ?? 0) + 1);
            }
          }
        }
      }
    }
  }
}

const totalDrinks = drinkRecommendationDataset.length;
const reachedDrinks = [...reached.entries()].filter(([, count]) => count > 0);
const unreachableDrinks = [...reached.entries()].filter(([, count]) => count === 0).map(([title]) => title);

console.log(
  JSON.stringify(
    {
      totalDrinks,
      reachedDrinks: reachedDrinks.length,
      unreachableDrinks,
      topDrinks: [...reached.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([title, count]) => ({ title, count })),
    },
    null,
    2,
  ),
);

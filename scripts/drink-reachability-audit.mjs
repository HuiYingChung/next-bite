import { buildSuggestedDrink, summarizeTodayIntake } from "../.audit-tmp/logic.mjs";
import { createEmptyMeal, drinkRecommendationDataset, recommendationDataset, seedProfile } from "../.audit-tmp/data.mjs";

const mealNames = ["Breakfast", "Lunch", "Dinner", "Snacks / Drinks"];
const timeWindows = ["breakfast", "lunch", "afternoon", "dinner", "late"];
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

const reachedDefault = new Map(drinkRecommendationDataset.map((drink) => [drink.title, 0]));
const reachedWithOptIn = new Map(drinkRecommendationDataset.map((drink) => [drink.title, 0]));
const drinkByTitle = new Map(drinkRecommendationDataset.map((drink) => [drink.title, drink]));
const sensitiveDrinkViolations = [];

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
              reachedDefault.set(
                suggestedDrink,
                (reachedDefault.get(suggestedDrink) ?? 0) + 1,
              );
              const defaultDrink = drinkByTitle.get(suggestedDrink);
              if (defaultDrink?.alcohol || defaultDrink?.id === "energy-drink") {
                sensitiveDrinkViolations.push({
                  suggestedDrink,
                  timeWindow,
                  feelToday,
                  preferenceTags,
                  avoidTags,
                  mealId: meal.id,
                });
              }

              const optedInDrink = buildSuggestedDrink(
                summary,
                {
                  ...profile,
                  sensitiveDrinkOptIns: ["alcohol", "energy-drink"],
                },
                meal,
                timeWindow,
                "en",
              );
              reachedWithOptIn.set(
                optedInDrink,
                (reachedWithOptIn.get(optedInDrink) ?? 0) + 1,
              );
            }
          }
        }
      }
    }
  }
}

const totalDrinks = drinkRecommendationDataset.length;
if (sensitiveDrinkViolations.length > 0) {
  throw new Error(
    `Sensitive drinks were suggested without opt-in: ${JSON.stringify(
      sensitiveDrinkViolations.slice(0, 3),
    )}`,
  );
}

const reachedDefaultDrinks = [...reachedDefault.entries()].filter(([, count]) => count > 0);
const reachedOptedInDrinks = [...reachedWithOptIn.entries()].filter(([, count]) => count > 0);
const unreachableWithOptIn = [...reachedWithOptIn.entries()].filter(([, count]) => count === 0).map(([title]) => title);

console.log(
  JSON.stringify(
    {
      totalDrinks,
      defaultDeniedSensitiveDrinks: true,
      reachedWithoutSensitiveOptIn: reachedDefaultDrinks.length,
      reachedWithSensitiveOptIn: reachedOptedInDrinks.length,
      unreachableWithOptIn,
      sensitiveReachability: {
        alcohol: [...reachedWithOptIn.entries()].some(
          ([title, count]) => count > 0 && drinkByTitle.get(title)?.alcohol,
        ),
        energyDrink: (reachedWithOptIn.get("Energy drink") ?? 0) > 0,
      },
      topDefaultDrinks: [...reachedDefault.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([title, count]) => ({ title, count })),
    },
    null,
    2,
  ),
);

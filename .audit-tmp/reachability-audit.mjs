import { scoreRecommendations } from "./logic.mjs";
import { createEmptyMeal, recommendationDataset, seedHistory, seedProfile } from "./data.mjs";

const mealNames = ["Breakfast", "Lunch", "Dinner", "Snacks / Drinks"];

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

const todayPatterns = [
  {
    name: "default-today",
    log: clone(seedHistory[seedHistory.length - 1].todayLog),
  },
  {
    name: "empty-day",
    log: makeLog(),
  },
  {
    name: "carb-heavy",
    log: makeLog({
      Breakfast: { carbs: ["Bagel"], drink: ["Coffee"], portion: "Medium" },
      Lunch: {
        protein: ["Chicken"],
        carbs: ["Rice", "Noodles"],
        mealSource: "Takeout",
        portion: "Large",
      },
      "Snacks / Drinks": { carbs: ["Crackers"], drink: ["Milk tea"] },
    }),
  },
  {
    name: "fried-heavy",
    log: makeLog({
      Breakfast: { protein: ["Egg"], carbs: ["Toast"], cookingMethod: "Fried", portion: "Medium" },
      Lunch: {
        protein: ["Chicken"],
        vegetables: ["Cabbage"],
        carbs: ["Rice"],
        cookingMethod: "Fried",
        mealSource: "Takeout",
        portion: "Large",
      },
      "Snacks / Drinks": { drink: ["Soda"] },
    }),
  },
  {
    name: "veg-light-convenience",
    log: makeLog({
      Breakfast: { carbs: ["Bagel"], drink: ["Coffee"], mealSource: "Ready-made" },
      Lunch: {
        protein: ["Ham"],
        carbs: ["Bread"],
        mealSource: "Takeout",
        portion: "Medium",
      },
      "Snacks / Drinks": { carbs: ["Protein bar"], drink: ["Sweet drink"], mealSource: "Ready-made" },
    }),
  },
  {
    name: "warm-soupy",
    log: makeLog({
      Breakfast: { protein: ["Egg"], carbs: ["Congee"], soup: ["Chicken soup"], cookingMethod: "Soup / stew" },
      Lunch: {
        protein: ["Tofu"],
        vegetables: ["Bok choy"],
        carbs: ["Rice"],
        soup: ["Miso soup"],
        cookingMethod: "Soup / stew",
      },
    }),
  },
  {
    name: "takeout-heavy",
    log: makeLog({
      Breakfast: { protein: ["Greek yogurt"], fruit: ["Banana"], mealSource: "Ready-made" },
      Lunch: {
        protein: ["Beef"],
        vegetables: ["Mixed vegetables"],
        carbs: ["Rice"],
        mealSource: "Takeout",
        portion: "Large",
      },
      Dinner: {
        protein: ["Shrimp"],
        carbs: ["Noodles"],
        mealSource: "Restaurant",
        portion: "Medium",
      },
      "Snacks / Drinks": { drink: ["Boba"], mealSource: "Takeout" },
    }),
  },
];

const historyPatterns = [
  { name: "seed-week", build: () => clone(seedHistory) },
  {
    name: "rice-heavy-week",
    build: () =>
      clone(seedHistory).map((day, index, list) => ({
        ...day,
        todayLog:
          index === list.length - 1
            ? day.todayLog
            : makeLog({
                Lunch: {
                  protein: ["Chicken"],
                  vegetables: ["Broccoli"],
                  carbs: ["Rice"],
                  mealSource: "Takeout",
                  portion: "Medium",
                },
                Dinner: {
                  protein: ["Fish"],
                  vegetables: ["Bok choy"],
                  carbs: ["Jasmine rice"],
                  cookingMethod: "Steamed",
                  mealSource: "Home-cooked",
                  portion: "Medium",
                },
              }),
      })),
  },
  {
    name: "noodle-heavy-week",
    build: () =>
      clone(seedHistory).map((day, index, list) => ({
        ...day,
        todayLog:
          index === list.length - 1
            ? day.todayLog
            : makeLog({
                Lunch: {
                  protein: ["Chicken"],
                  vegetables: ["Cabbage"],
                  carbs: ["Noodles"],
                  mealSource: "Restaurant",
                  portion: "Medium",
                },
                Dinner: {
                  protein: ["Tofu"],
                  vegetables: ["Mushrooms"],
                  carbs: ["Rice noodles"],
                  soup: ["Tofu soup"],
                  cookingMethod: "Soup / stew",
                  portion: "Medium",
                },
              }),
      })),
  },
  {
    name: "fried-heavy-week",
    build: () =>
      clone(seedHistory).map((day, index, list) => ({
        ...day,
        todayLog:
          index === list.length - 1
            ? day.todayLog
            : makeLog({
                Lunch: {
                  protein: ["Chicken"],
                  vegetables: ["Cabbage"],
                  carbs: ["Rice"],
                  cookingMethod: "Fried",
                  mealSource: "Takeout",
                  portion: "Large",
                },
                Dinner: {
                  protein: ["Pork"],
                  carbs: ["Noodles"],
                  cookingMethod: "Stir-fried",
                  mealSource: "Restaurant",
                  portion: "Large",
                },
              }),
      })),
  },
  {
    name: "veg-light-week",
    build: () =>
      clone(seedHistory).map((day, index, list) => ({
        ...day,
        todayLog:
          index === list.length - 1
            ? day.todayLog
            : makeLog({
                Breakfast: { carbs: ["Toast"], drink: ["Coffee"] },
                Lunch: {
                  protein: ["Chicken"],
                  carbs: ["Rice"],
                  mealSource: "Takeout",
                  portion: "Medium",
                },
                Dinner: {
                  protein: ["Beef"],
                  carbs: ["Noodles"],
                  mealSource: "Restaurant",
                  portion: "Medium",
                },
              }),
      })),
  },
  {
    name: "takeout-heavy-week",
    build: () =>
      clone(seedHistory).map((day, index, list) => ({
        ...day,
        todayLog:
          index === list.length - 1
            ? day.todayLog
            : makeLog({
                Lunch: {
                  protein: ["Chicken"],
                  vegetables: ["Mixed vegetables"],
                  carbs: ["Rice"],
                  mealSource: "Takeout",
                  portion: "Medium",
                },
                Dinner: {
                  protein: ["Fish"],
                  vegetables: ["Seaweed"],
                  carbs: ["Rice"],
                  mealSource: "Restaurant",
                  portion: "Medium",
                },
                "Snacks / Drinks": { drink: ["Milk tea"], mealSource: "Takeout" },
              }),
      })),
  },
  {
    name: "home-heavy-week",
    build: () =>
      clone(seedHistory).map((day, index, list) => ({
        ...day,
        todayLog:
          index === list.length - 1
            ? day.todayLog
            : makeLog({
                Breakfast: { protein: ["Egg"], carbs: ["Oatmeal"], mealSource: "Home-cooked" },
                Lunch: {
                  protein: ["Tofu"],
                  vegetables: ["Bok choy"],
                  carbs: ["Rice"],
                  mealSource: "Home-cooked",
                  cookingMethod: "Steamed",
                  portion: "Medium",
                },
                Dinner: {
                  protein: ["Chicken"],
                  vegetables: ["Broccoli"],
                  carbs: ["Sweet potato"],
                  mealSource: "Home-cooked",
                  cookingMethod: "Grilled",
                  portion: "Medium",
                },
              }),
      })),
  },
];

const preferenceSets = [
  [],
  ["Chinese-style", "Warm meals", "Comfort meals"],
  ["Japanese", "Soupy meals", "Rice-based meals"],
  ["Korean", "Warm meals", "Comfort meals"],
  ["Taiwanese-style", "Set meals"],
  ["Mediterranean", "Light meals"],
  ["Mexican-inspired", "Takeout-friendly"],
  ["Plant-protein", "Vegetable-forward"],
  ["Wraps / sandwiches", "Portable meals", "American light meals"],
  ["Breakfast-for-dinner", "Comfort meals"],
];

const avoidSets = [
  [],
  ["Fishy seafood", "Shellfish"],
  ["Dairy", "Beef"],
  ["Spicy food", "Egg"],
  ["Pork", "Fried food"],
];

const feelTodayOptions = ["Normal", "Want something warm", "Need something light", "Low energy", "On period"];
const eatingStyles = ["Mostly home-cooked", "Mostly takeout", "Both"];
const timeWindows = [
  new Date("2026-03-27T08:30:00"),
  new Date("2026-03-27T12:30:00"),
  new Date("2026-03-27T18:30:00"),
  new Date("2026-03-27T22:30:00"),
];

const counts = new Map(recommendationDataset.map((meal) => [meal.id, { title: meal.title, total: 0, byLabel: {} }]));

let scenarioCount = 0;

for (const historyPattern of historyPatterns) {
  for (const todayPattern of todayPatterns) {
    for (const feelToday of feelTodayOptions) {
      for (const eatingStyle of eatingStyles) {
        for (const preferenceTags of preferenceSets) {
          for (const avoidTags of avoidSets) {
            for (const now of timeWindows) {
              const history = historyPattern.build();
              history[history.length - 1].todayLog = clone(todayPattern.log);
              const profile = {
                ...clone(seedProfile),
                feelToday,
                eatingStyle,
                preferenceTags: [...preferenceTags],
                avoidTags: [...avoidTags],
              };
              const results = scoreRecommendations(profile, history[history.length - 1].todayLog, history, "en", now);
              for (const result of results) {
                const entry = counts.get(result.id);
                entry.total += 1;
                entry.byLabel[result.label] = (entry.byLabel[result.label] ?? 0) + 1;
              }
              scenarioCount += 1;
            }
          }
        }
      }
    }
  }
}

const ranked = [...counts.entries()]
  .map(([id, value]) => ({ id, ...value }))
  .sort((a, b) => b.total - a.total);

const unreachable = ranked.filter((item) => item.total === 0);
const lowReach = ranked.filter((item) => item.total > 0 && item.total <= 10);

const summary = {
  scenarios: scenarioCount,
  totalMeals: recommendationDataset.length,
  reachedMeals: ranked.filter((item) => item.total > 0).length,
  unreachableMeals: unreachable.length,
  top15: ranked.slice(0, 15),
  bottom15: [...ranked].reverse().slice(0, 15).reverse(),
  unreachable,
  lowReach,
};

console.log(JSON.stringify(summary, null, 2));

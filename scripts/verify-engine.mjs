import { readFileSync } from "node:fs";
import { buildDrinkSafetyMetadata, catalogMetadataAudit } from "../.audit-tmp/catalog-metadata.mjs";
import {
  avoidTags,
  createBlankState,
  createEmptyMeal,
  createSeededState,
  drinkRecommendationDataset,
  recommendationDataset,
  rollSevenDayHistory,
  seedProfile,
  toLocalDateId,
} from "../.audit-tmp/data.mjs";
import {
  buildSuggestedDrink,
  buildWeeklySnapshot,
  countHardAvoidedRecommendations,
  getHardAvoidConflicts,
  getMatchedPreferenceTags,
  getDrinkHardAvoidConflicts,
  isDrinkEligible,
  isMealLogged,
  normalizeLoggedFoodName,
  getMealTimeWindow,
  getPriorHistory,
  scoreMealOption,
  scoreRecommendations,
  summarizeHistoryBasis,
  summarizeTodayIntake,
} from "../.audit-tmp/logic.mjs";

const fail = (message) => {
  throw new Error(message);
};

const expect = (condition, message) => {
  if (!condition) fail(message);
};

const close = (actual, expected, message) => {
  if (Math.abs(actual - expected) > 1e-9) {
    fail(`${message}: expected ${expected}, received ${actual}.`);
  }
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const mealNames = ["Breakfast", "Lunch", "Dinner", "Snacks / Drinks"];
const fixtureNow = new Date(2026, 6, 29, 18, 30);
const seedHistory = createSeededState(fixtureNow).days;

const makeLog = (overrides = {}) => {
  const log = Object.fromEntries(
    mealNames.map((mealName) => [mealName, createEmptyMeal()]),
  );
  for (const [mealName, meal] of Object.entries(overrides)) {
    log[mealName] = { ...createEmptyMeal(), ...meal };
  }
  return log;
};

const makeProfile = (overrides = {}) => ({
  ...clone(seedProfile),
  preferenceTags: [],
  avoidTags: [],
  sensitiveDrinkOptIns: [],
  ...overrides,
});

const byId = new Map(recommendationDataset.map((meal) => [meal.id, meal]));
const requireMeal = (id) => {
  const meal = byId.get(id);
  if (!meal) fail(`Missing test meal ${id}.`);
  return meal;
};

// Structured must-avoid metadata: all certainty states are hard gates, and
// exact metadata replaces title/description keyword guessing.
const containsConflict = getHardAvoidConflicts(
  makeProfile({ avoidTags: ["Soy"] }),
  requireMeal("tofu-vegetable-rice-bowl"),
  "dinner",
);
expect(
  containsConflict.some(
    (conflict) =>
      conflict.tag === "Soy" && conflict.certainty === "contains",
  ),
  "Known soy must produce a structured contains conflict.",
);

const mayContainConflict = getHardAvoidConflicts(
  makeProfile({ avoidTags: ["Dairy"] }),
  requireMeal("chicken-shawarma-rice-bowl"),
  "dinner",
);
expect(
  mayContainConflict.some(
    (conflict) =>
      conflict.tag === "Dairy" && conflict.certainty === "mayContain",
  ),
  "Recipe-variable dairy must produce a structured mayContain conflict.",
);

const unknownConflict = getHardAvoidConflicts(
  makeProfile({ avoidTags: ["Lamb"] }),
  requireMeal("gyro-bowl-rice-salad"),
  "dinner",
);
expect(
  unknownConflict.some(
    (conflict) =>
      conflict.tag === "Lamb" && conflict.certainty === "unknown",
  ),
  "Ambiguous gyro protein must produce a structured unknown conflict.",
);

expect(
  getHardAvoidConflicts(
    makeProfile({ avoidTags: ["Egg"] }),
    requireMeal("black-bean-chicken-bitter-melon"),
    "dinner",
  ).length === 0,
  "Hard avoids must not infer Egg from unrelated title text.",
);

const lateHeavyMeal = requireMeal("mapo-tofu-light-rice");
expect(
  getHardAvoidConflicts(
    makeProfile({ avoidTags: ["Late-night heavy meals"] }),
    lateHeavyMeal,
    "afternoon",
  ).length === 0,
  "A heavy meal must not be treated as a late-night conflict at 15:00–17:00.",
);
expect(
  getHardAvoidConflicts(
    makeProfile({ avoidTags: ["Late-night heavy meals"] }),
    lateHeavyMeal,
    "late",
  ).some((conflict) => conflict.tag === "Late-night heavy meals"),
  "A declared heavy meal must be filtered in the actual late window.",
);

const avoidSubset = makeProfile({ avoidTags: ["Dairy"] });
const avoidSuperset = makeProfile({
  avoidTags: ["Dairy", "Soy", "Wheat / gluten"],
});
expect(
  countHardAvoidedRecommendations(
    avoidSuperset,
    new Date("2026-07-29T18:00:00"),
  ) >=
    countHardAvoidedRecommendations(
      avoidSubset,
      new Date("2026-07-29T18:00:00"),
    ),
  "Adding hard-avoid constraints must never increase eligibility.",
);

// Named ingredients and recipe uncertainty are hard eligibility constraints
// for drinks as well as meals; opt-ins and preferences cannot bypass them.
const expectedDrinkConflicts = [
  ["soy-milk", "Soy", "contains"],
  ["almond-milk", "Tree nuts", "contains"],
  ["milk", "Dairy", "contains"],
  ["milk-tea", "Caffeine", "contains"],
  ["orange-juice", "Sweet drinks", "contains"],
  ["beer", "Wheat / gluten", "mayContain"],
  ["protein-shake", "Dairy", "unknown"],
  ["smoothie", "Peanuts", "unknown"],
  ["green-juice", "Celery", "mayContain"],
];
for (const [drinkId, tag, certainty] of expectedDrinkConflicts) {
  const drink = drinkRecommendationDataset.find((item) => item.id === drinkId);
  const profile = makeProfile({ avoidTags: [tag], sensitiveDrinkOptIns: ["alcohol", "energy-drink"] });
  expect(
    getDrinkHardAvoidConflicts(profile, drink).some((conflict) => conflict.tag === tag && conflict.certainty === certainty),
    `${drinkId} needs its ${certainty} ${tag} declaration.`,
  );
  expect(!isDrinkEligible(profile, drink), `${drinkId} must be excluded before scoring for ${tag}.`);
}
expect(
  getHardAvoidConflicts(makeProfile({ avoidTags: ["Wheat / gluten"] }), requireMeal("turkey-pesto-sandwich-salad"), "dinner").length === 1,
  "The turkey pesto sandwich must declare its bread conflict.",
);

const launchRegressionDate = new Date(2026, 10, 3, 12);
const launchRegressionHistory = createBlankState(launchRegressionDate).days;
const launchRegressionLog = makeLog({ Lunch: { protein: ["Chicken"], carbs: ["Rice"], cookingMethod: "Boiled", mealSource: "Home-cooked", portion: "Medium" } });
for (const [tag, feelToday, eatingStyle, preferenceTags, hour, forbidden] of [
  ["Soy", "Normal", "Mostly home-cooked", [], 22, "Soy milk"],
  ["Tree nuts", "Low energy", "Mostly home-cooked", ["American light meals"], 22, "Almond milk"],
  ["Wheat / gluten", "Normal", "Mostly takeout", ["Tea"], 18, "turkey-pesto-sandwich-salad"],
]) {
  const profile = makeProfile({ avoidTags: [tag], feelToday, eatingStyle, preferenceTags });
  const cards = scoreRecommendations(profile, launchRegressionLog, launchRegressionHistory, "en", new Date(2026, 10, 3, hour, 30));
  expect(cards.length > 0, "Safety regressions must still leave useful eligible meal choices.");
  expect(!cards.some((card) => card.id === forbidden || card.suggestedDrink === forbidden), `The launch regression returned ${forbidden} despite ${tag}.`);
}

for (const tag of avoidTags) {
  const profile = makeProfile({ avoidTags: [tag], feelToday: "Low energy", preferenceTags: ["Coffee / caffeine", "Juices / smoothies"], sensitiveDrinkOptIns: ["alcohol", "energy-drink"] });
  for (const meal of recommendationDataset) {
    const title = buildSuggestedDrink(summarizeTodayIntake(launchRegressionLog), profile, meal, "dinner", "en");
    const drink = drinkRecommendationDataset.find((item) => item.title === title);
    expect(drink && getDrinkHardAvoidConflicts(profile, drink).length === 0, `${tag} was bypassed by the suggested drink ${title}.`);
  }
}
expect(
  new Set(catalogMetadataAudit.drinkIds).size === drinkRecommendationDataset.length &&
    drinkRecommendationDataset.every((drink) => catalogMetadataAudit.drinkIds.includes(drink.id)),
  "Every catalog drink must have an explicit reviewed safety declaration.",
);
for (const drink of drinkRecommendationDataset) {
  const metadata = buildDrinkSafetyMetadata(drink.id);
  const tags = [...metadata.contains, ...metadata.mayContain, ...metadata.unknown];
  expect(new Set(tags).size === tags.length && tags.every((tag) => avoidTags.includes(tag)), `${drink.id} has inconsistent safety declarations.`);
  for (const [flag, tag] of [["caffeine", "Caffeine"], ["dairy", "Dairy"], ["sweetened", "Sweet drinks"], ["alcohol", "Alcohol drinks"]]) {
    expect(!drink[flag] || metadata.contains.includes(tag), `${drink.id} is missing its declared ${tag} flag.`);
  }
}

// Incomplete logging must not be described as a measured deficit. The score
// remains a qualitative presence rule; both languages make that boundary clear.
const waterOnlyLog = makeLog({ Lunch: { drink: ["Water"] } });
for (const locale of ["en", "zh"]) {
  const cards = scoreRecommendations(makeProfile(), waterOnlyLog, launchRegressionHistory, locale, launchRegressionDate);
  for (const card of cards) {
    expect(locale === "en" ? card.shortReason.includes("incomplete logs") : card.shortReason.includes("不完整的紀錄"), "Drink-only records must produce a general meal idea with an incomplete-log explanation.");
    expect(!/Protein is low today|Vegetables are still a need|lighter produce day/.test(JSON.stringify(card)), "A missing food record must not be called a measured intake deficit.");
  }
}

const namedOtherComponent = { name: "Sandwich with unknown filling", group: "other", amount: { quantity: null, unit: "unspecified", qualifier: "unspecified", originalText: null }, confidence: "limited" };
const namedOtherLog = makeLog({ Lunch: { componentDetails: [namedOtherComponent] } });
expect(isMealLogged(namedOtherLog.Lunch), "A named mixed dish must remain a meal record without guessed food groups.");
const namedOtherSummary = summarizeTodayIntake(namedOtherLog);
expect(namedOtherSummary.proteinCount === 0 && namedOtherSummary.carbCount === 0 && namedOtherSummary.vegetableCount === 0, "An unclassified mixed dish must not invent protein, staples, or vegetables.");
expect(!isMealLogged({ ...createEmptyMeal(), componentDetails: [{ ...namedOtherComponent, name: "  " }] }), "Blank component names must not create a record.");
for (const name of ["Mixed meal sources: Home-cooked + Takeout. Review source.", "Mixed preparation: Boiled + Fried. Review preparation.", "Combined portions: Small + Large. Review overall portion."]) {
  expect(!isMealLogged({ ...createEmptyMeal(), componentDetails: [{ ...namedOtherComponent, name }] }), "Merge context annotations alone must not create meal records.");
}

// Chinese free input and its explicit English aliases produce the same
// descriptive signals. No keyword matching participates in safety eligibility.
const englishNames = makeLog({
  Breakfast: { carbs: ["Rice"], protein: ["Chicken"], drink: ["Coffee", "Tea"] },
  Lunch: { carbs: ["Noodles"], protein: ["Tofu"], drink: ["Milk tea", "Boba"] },
  Dinner: { carbs: ["Rice noodles", "Cake"], drink: ["Beer", "Wine", "Sports drink"] },
});
const chineseNames = makeLog({
  Breakfast: { carbs: ["白飯"], protein: ["雞肉"], drink: ["咖啡", "茶"] },
  Lunch: { carbs: ["麵"], protein: ["豆腐"], drink: ["奶茶", "珍珠奶茶"] },
  Dinner: { carbs: ["米粉", "蛋糕"], drink: ["啤酒", "葡萄酒", "運動飲料"] },
});
expect(JSON.stringify(summarizeTodayIntake(englishNames)) === JSON.stringify(summarizeTodayIntake(chineseNames)), "Bilingual logged staples and drinks must have matching descriptive signals.");
expect(normalizeLoggedFoodName("  ＭＩＬＫ　ＴＥＡ  ") === "milk tea", "Signal matching must normalize width, case, and whitespace.");
const noCaffeineTea = summarizeTodayIntake(makeLog({ Lunch: { drink: ["無咖啡因茶", "無糖汽水"] } }));
expect(noCaffeineTea.caffeineCount === 0 && noCaffeineTea.sweetDrinkCount === 0, "Exact aliases must not mistake caffeine-free tea or diet soda for their positive signals.");
const bilingualHistories = [englishNames, chineseNames].map((log) => {
  const history = createBlankState(fixtureNow).days;
  history[4].todayLog = clone(log);
  history[5].todayLog = clone(log);
  return history;
});
expect(JSON.stringify(buildWeeklySnapshot(bilingualHistories[0], makeProfile(), "en")) === JSON.stringify(buildWeeklySnapshot(bilingualHistories[1], makeProfile(), "en")), "Weekly descriptive patterns must use the same bilingual signal normalization.");
expect(JSON.stringify(scoreRecommendations(makeProfile(), englishNames, bilingualHistories[0], "en", fixtureNow)) === JSON.stringify(scoreRecommendations(makeProfile(), chineseNames, bilingualHistories[1], "en", fixtureNow)), "Equivalent bilingual records must produce the same suggestions and receipts.");

const richLog = makeLog({
  Breakfast: { protein: ["Egg", "Tofu"], vegetables: ["Broccoli", "Carrot"], carbs: ["Rice", "Toast"], drink: ["Coffee", "Milk tea"], portion: "Large", cookingMethod: "Fried", mealSource: "Takeout" },
  Lunch: { protein: ["Egg", "Tofu"], vegetables: ["Cabbage", "Spinach"], carbs: ["Rice", "Noodles"], drink: ["Beer", "Soda"], portion: "Large", cookingMethod: "Stir-fried", mealSource: "Ready-made" },
  Dinner: { carbs: ["Noodles", "Toast"], drink: ["Coffee"] },
});
for (const todayLog of [makeLog(), richLog]) {
  for (const feelToday of ["Normal", "Want something warm", "Need something light", "Low energy", "On period"]) {
    for (const timeWindow of ["breakfast", "lunch", "afternoon", "dinner", "late"]) {
      for (const eatingStyle of ["Mostly home-cooked", "Mostly takeout", "Both"]) {
        const profile = makeProfile({ feelToday, eatingStyle, activityLevel: feelToday === "Normal" ? "Active" : "Low", preferenceTags: ["Chinese-style", "Japanese", "Korean", "High-protein", "American light meals"] });
        for (const meal of recommendationDataset.filter((_, index) => index % 10 === 0)) {
          const card = scoreMealOption(summarizeTodayIntake(todayLog), todayLog, seedHistory, profile, meal, timeWindow, "zh");
          for (const item of card.scoreBreakdown) {
            expect(!/[A-Za-z]{3}/.test(item.note), `Chinese ${item.category} explanation is untranslated: ${item.note}`);
          }
        }
      }
    }
  }
}

// Sensitive drinks: default denial, explicit opt-in, and avoid-tag precedence.
const drinkByTitle = new Map(
  drinkRecommendationDataset.map((drink) => [drink.title, drink]),
);
const drinkTestSummary = summarizeTodayIntake(makeLog());
let alcoholReachedWithOptIn = false;
let energyReachedWithOptIn = false;

for (const timeWindow of ["breakfast", "lunch", "afternoon", "dinner", "late"]) {
  for (const feelToday of [
    "Normal",
    "Want something warm",
    "Need something light",
    "Low energy",
    "On period",
  ]) {
    for (const preferenceTags of [
      [],
      ["Coffee / caffeine"],
      ["Tea"],
      ["Simple drinks"],
      ["Juices / smoothies"],
    ]) {
      for (const meal of recommendationDataset) {
        const deniedTitle = buildSuggestedDrink(
          drinkTestSummary,
          makeProfile({ feelToday, preferenceTags }),
          meal,
          timeWindow,
          "en",
        );
        const deniedDrink = drinkByTitle.get(deniedTitle);
        expect(deniedDrink, `Unknown suggested drink ${deniedTitle}.`);
        expect(
          !deniedDrink.alcohol && deniedDrink.id !== "energy-drink",
          `Sensitive drink ${deniedTitle} was suggested without opt-in.`,
        );

        const allowedTitle = buildSuggestedDrink(
          drinkTestSummary,
          makeProfile({
            feelToday,
            preferenceTags,
            sensitiveDrinkOptIns: ["alcohol", "energy-drink"],
          }),
          meal,
          timeWindow,
          "en",
        );
        const allowedDrink = drinkByTitle.get(allowedTitle);
        alcoholReachedWithOptIn ||= allowedDrink?.alcohol === true;
        energyReachedWithOptIn ||= allowedDrink?.id === "energy-drink";
      }
    }
  }
}

expect(
  alcoholReachedWithOptIn,
  "Alcohol should become reachable only after explicit opt-in.",
);
expect(
  energyReachedWithOptIn,
  "Energy drinks should become reachable only after explicit opt-in.",
);

for (const [optIn, avoidTag, forbidden] of [
  ["alcohol", "Alcohol drinks", (drink) => drink.alcohol],
  ["energy-drink", "Caffeine", (drink) => drink.id === "energy-drink"],
]) {
  for (const meal of recommendationDataset) {
    const title = buildSuggestedDrink(
      drinkTestSummary,
      makeProfile({
        feelToday: "Low energy",
        preferenceTags: ["Coffee / caffeine"],
        sensitiveDrinkOptIns: [optIn],
        avoidTags: [avoidTag],
      }),
      meal,
      "dinner",
      "en",
    );
    expect(
      !forbidden(drinkByTitle.get(title)),
      `${avoidTag} must override the ${optIn} opt-in.`,
    );
  }
}

// Time boundary regression.
const windowCases = [
  ["2026-07-29T14:59:59", "lunch"],
  ["2026-07-29T15:00:00", "afternoon"],
  ["2026-07-29T16:59:59", "afternoon"],
  ["2026-07-29T17:00:00", "dinner"],
  ["2026-07-29T20:59:59", "dinner"],
  ["2026-07-29T21:00:00", "late"],
];
for (const [timestamp, expectedWindow] of windowCases) {
  expect(
    getMealTimeWindow(new Date(timestamp)) === expectedWindow,
    `${timestamp} should be ${expectedWindow}.`,
  );
}

// Today is scored through daily signals; weekly patterns receive prior unique
// days only, so embedding the same today log in history cannot double-count it.
const state = createBlankState(fixtureNow);
const todayIndex = state.days.findIndex((day) => day.isToday);
const todayLog = makeLog({
  Breakfast: { carbs: ["Rice"], portion: "Large" },
  Lunch: { carbs: ["Rice", "Noodles"], portion: "Large" },
});
const historyWithToday = clone(state.days);
historyWithToday[todayIndex].todayLog = clone(todayLog);
const historyWithoutEmbeddedToday = clone(historyWithToday);
historyWithoutEmbeddedToday[todayIndex].todayLog = makeLog();
const comparisonNow = new Date("2026-07-29T18:30:00");
const withTodayResults = scoreRecommendations(
  makeProfile(),
  todayLog,
  historyWithToday,
  "en",
  comparisonNow,
);
const withoutEmbeddedTodayResults = scoreRecommendations(
  makeProfile(),
  todayLog,
  historyWithoutEmbeddedToday,
  "en",
  comparisonNow,
);
expect(
  JSON.stringify(withTodayResults) ===
    JSON.stringify(withoutEmbeddedTodayResults),
  "Embedding today's daily log in history must not change weekly scoring.",
);
expect(
  getPriorHistory([
    ...historyWithToday,
    clone(historyWithToday[0]),
  ]).length ===
    new Set(
      historyWithToday.filter((day) => !day.isToday).map((day) => day.id),
    ).size,
  "Prior history must exclude today and deduplicate day ids.",
);

// The persisted history is a rolling local-calendar window: a new date creates
// a blank today, retains still-in-range logs, and evicts dates older than six
// prior calendar days.
const rolloverStart = new Date(2026, 6, 29, 12, 0, 0);
const rolloverState = createBlankState(rolloverStart);
const originalOldestId = rolloverState.days[0].id;
const loggedTodayId = toLocalDateId(rolloverStart);
rolloverState.days.find((day) => day.id === loggedTodayId).todayLog.Lunch = {
  ...createEmptyMeal(),
  protein: ["Tofu"],
  vegetables: ["Bok choy"],
  carbs: ["Rice"],
};

const nextDay = new Date(2026, 6, 30, 12, 0, 0);
const rolledOnce = rollSevenDayHistory(rolloverState.days, nextDay);
expect(rolledOnce.length === 7, "Rollover must keep exactly seven calendar days.");
expect(
  new Set(rolledOnce.map((day) => day.id)).size === 7,
  "Rollover must not duplicate calendar dates.",
);
expect(
  rolledOnce.at(-1).id === toLocalDateId(nextDay) &&
    rolledOnce.at(-1).isToday,
  "Rollover must append the new local-calendar today.",
);
expect(
  rolledOnce.find((day) => day.id === loggedTodayId)?.todayLog.Lunch.protein[0] ===
    "Tofu",
  "A still-in-range logged day must survive rollover.",
);
expect(
  mealNames.every(
    (mealName) =>
      !Object.values(rolledOnce.at(-1).todayLog[mealName])
        .flat()
        .includes("Tofu"),
  ),
  "A newly created today must be blank instead of copying yesterday.",
);
expect(
  !rolledOnce.some((day) => day.id === originalOldestId),
  "Rollover must evict the date that left the seven-day window.",
);

const rolledBeyondWindow = rollSevenDayHistory(
  rolledOnce,
  new Date(2026, 7, 6, 12, 0, 0),
);
expect(
  !rolledBeyondWindow.some((day) => day.id === loggedTodayId),
  "Logs older than the rolling seven-day window must be evicted.",
);

const thresholdHistory = createBlankState(
  new Date(2026, 6, 29, 12, 0, 0),
).days;
thresholdHistory[4].todayLog = makeLog({
  Breakfast: { protein: ["Egg"] },
  Lunch: { vegetables: ["Broccoli"] },
  Dinner: { carbs: ["Rice"] },
});
expect(
  !summarizeHistoryBasis(thresholdHistory).sufficientForAdjustment,
  "Three meals on one day must not unlock a weekly pattern.",
);
thresholdHistory[5].todayLog = makeLog({
  Lunch: { protein: ["Tofu"], vegetables: ["Bok choy"] },
});
const sufficientBasis = summarizeHistoryBasis(thresholdHistory);
expect(
  sufficientBasis.sufficientForAdjustment &&
    sufficientBasis.loggedMealCount === 4 &&
    sufficientBasis.loggedDayCount === 2,
  "Four meals across two distinct days must unlock the weekly pattern.",
);

const priorThresholdHistory = thresholdHistory.map((day) => ({
  ...day,
  isToday: false,
}));
priorThresholdHistory.at(-1).isToday = true;
const expectedPriorBasis = summarizeHistoryBasis(
  getPriorHistory(priorThresholdHistory),
);
const historyBasisResults = scoreRecommendations(
  makeProfile(),
  makeLog(),
  priorThresholdHistory,
  "en",
  comparisonNow,
);
expect(
  historyBasisResults.every(
    (recommendation) =>
      JSON.stringify(recommendation.weeklyHistoryBasis) ===
      JSON.stringify(expectedPriorBasis),
  ),
  "Every decision receipt must expose the exact prior-history basis used by scoring.",
);

// Monotonic qualitative signals and level scoring.
const limitedHalfServing = {
  name: "chicken",
  group: "protein",
  amount: {
    quantity: 0.5,
    unit: "serving",
    qualifier: "approximate",
    originalText: "about half a serving",
  },
  confidence: "limited",
};
const highOneServing = {
  ...limitedHalfServing,
  amount: {
    quantity: 1,
    unit: "serving",
    qualifier: "exact",
    originalText: "one serving",
  },
  confidence: "high",
};
const lowerSignalLog = makeLog({
  Lunch: {
    protein: ["chicken"],
    componentDetails: [limitedHalfServing],
    portion: "Small",
  },
});
const higherSignalLog = makeLog({
  Lunch: {
    protein: ["chicken"],
    componentDetails: [highOneServing],
    portion: "Large",
  },
});
expect(
  summarizeTodayIntake(higherSignalLog).proteinCount >
    summarizeTodayIntake(lowerSignalLog).proteinCount,
  "Normalized amount, portion, and confidence must affect the signal monotonically.",
);

const emptySummary = summarizeTodayIntake(makeLog());
const baseMeal = requireMeal("grilled-chicken-plate-rice-greens");
const levelScore = (field, value, summary = emptySummary) => {
  const scored = scoreMealOption(
    summary,
    makeLog(),
    [],
    makeProfile(),
    { ...baseMeal, [field]: value },
    "dinner",
    "en",
  );
  const category =
    field === "proteinLevel"
      ? "protein"
      : field === "vegetableLevel"
        ? "vegetables"
        : "carbs";
  return scored.scoreBreakdown.find((item) => item.category === category).points;
};
expect(
  levelScore("proteinLevel", "high") >=
    levelScore("proteinLevel", "medium") &&
    levelScore("proteinLevel", "medium") >=
      levelScore("proteinLevel", "low"),
  "Protein scoring must be monotonic when today's protein signal is low.",
);
expect(
  levelScore("vegetableLevel", "high") >=
    levelScore("vegetableLevel", "medium") &&
    levelScore("vegetableLevel", "medium") >=
      levelScore("vegetableLevel", "low"),
  "Vegetable scoring must be monotonic when today's vegetable signal is low.",
);
const highCarbSummary = summarizeTodayIntake(
  makeLog({
    Breakfast: { carbs: ["Rice", "Toast"] },
    Lunch: { carbs: ["Noodles", "Bread"] },
    Dinner: { carbs: ["Pasta"] },
  }),
);
expect(
  levelScore("carbLevel", "low", highCarbSummary) >=
    levelScore("carbLevel", "medium", highCarbSummary) &&
    levelScore("carbLevel", "medium", highCarbSummary) >=
      levelScore("carbLevel", "high", highCarbSummary),
  "Carb scoring must be monotonic when today's carb signal is high.",
);

// Selection trace is the actual rank receipt, including perspective, fairness,
// format diversity, and deterministic near-tie rotation.
const tracedResults = scoreRecommendations(
  makeProfile({
    feelToday: "Normal",
    preferenceTags: ["Mediterranean"],
  }),
  makeLog(),
  seedHistory,
  "en",
  comparisonNow,
);
expect(tracedResults.length === 3, "Expected three traced perspectives.");
let sawFairness = false;
let sawRotation = false;
for (const recommendation of tracedResults) {
  const trace = recommendation.selectionTrace;
  expect(trace, `${recommendation.id} is missing a selection trace.`);
  close(
    recommendation.scoreBreakdown.reduce(
      (sum, item) => sum + item.points,
      0,
    ),
    recommendation.score,
    `${recommendation.id} rule receipt`,
  );
  close(
    trace.perspectiveAdjustments.reduce(
      (sum, adjustment) => sum + adjustment.points,
      0,
    ),
    trace.perspectiveScore,
    `${recommendation.id} perspective receipt`,
  );
  close(
    Math.round(
      (trace.perspectiveScore +
        trace.fairnessAdjustment +
        trace.formatDiversityAdjustment +
        Number.EPSILON) *
        100,
    ) / 100,
    trace.selectionScore,
    `${recommendation.id} selection receipt`,
  );
  expect(
    trace.perspective === recommendation.label,
    "Trace perspective must match the selected card label.",
  );
  expect(
    trace.nearTieCount >= 1 &&
      trace.selectedPoolRank >= 1 &&
      trace.selectedPoolRank <= trace.nearTieCount,
    "Near-tie pool metadata is inconsistent.",
  );
  sawFairness ||= trace.fairnessAdjustment > 0;
  sawRotation ||= trace.rotationApplied;
}
expect(sawFairness, "The trace scenario should expose a fairness adjustment.");
expect(sawRotation, "The trace scenario should expose near-tie rotation.");
expect(
  JSON.stringify(tracedResults) ===
    JSON.stringify(
      scoreRecommendations(
        makeProfile({
          feelToday: "Normal",
          preferenceTags: ["Mediterranean"],
        }),
        makeLog(),
        seedHistory,
        "en",
        comparisonNow,
      ),
    ),
  "Selection and rotation must be deterministic for the same inputs.",
);
expect(
  scoreRecommendations(
    makeProfile({ eatingStyle: "Mostly home-cooked" }),
    makeLog(),
    seedHistory,
    "en",
    new Date("2026-07-29T12:30:00"),
  ).some((recommendation) => recommendation.id === "egg-tomato-rice"),
  "The calibrated fairness path must keep Egg and Tomato over Rice reachable.",
);
// Exact winner snapshots depended on title substrings ("bowl", "beans",
// "veggie"). Test the intended preference contract instead of forcing a
// particular near-tie winner after correcting those accidental matches.
expect(getMatchedPreferenceTags(makeProfile({ preferenceTags: ["Chinese-style"] }), requireMeal("mapo-tofu-light-rice")).includes("Chinese-style"), "Mapo Tofu must retain its declared Chinese-style preference match.");
const preferenceCounterexamples = [
  ["Rice-based meals", "greek-yogurt-granola-fruit-bowl"],
  ["Plant-protein", "rotisserie-chicken-corn-green-beans"],
  ["Breakfast-for-dinner", "veggie-black-bean-quesadilla-salad"],
];
for (const [tag, id] of preferenceCounterexamples) {
  const meal = id === "rotisserie-chicken-corn-green-beans"
    ? recommendationDataset.find(item => item.title === "Rotisserie Chicken with Corn and Green Beans")
    : requireMeal(id);
  expect(meal && !getMatchedPreferenceTags(makeProfile({ preferenceTags: [tag] }), meal).includes(tag), `${tag} must use declared structured meal properties rather than accidental title fragments.`);
}
const context = { hunger: "hungry", appetite: "unspecified", temperature: "any", preferredStaple: "rice", cuisine: "asian", maxPrepMinutes: null };
const contextCards = scoreRecommendations(makeProfile(), makeLog(), seedHistory, "en", fixtureNow, context);
expect(contextCards.length === 3 && contextCards.every(card => card.selectionTrace.perspectiveAdjustments.some(item => item.key === "meal-context")), "Every legacy perspective must include the same declared context preferences.");
for (const profile of [makeProfile({ feelToday: "Want something warm" }), makeProfile()]) {
  const cards = scoreRecommendations(profile, makeLog(), seedHistory, "en", fixtureNow, { ...context, temperature: "warm" });
  expect(cards.length > 0 && cards.every(card => ![...card.safety.contains, ...card.safety.mayContain, ...card.safety.unknown].includes("Cold food") && card.tags.some(tag => ["warm", "soupy"].includes(tag))), "Only-warm must exclude cold and unconfirmed options across every perspective.");
}
expect(scoreRecommendations(makeProfile(), makeLog(), seedHistory, "en", fixtureNow, { ...context, maxPrepMinutes: 10 }).length === 0, "Unknown legacy preparation minutes must not satisfy a strict minute budget.");

// Catalog completeness and calibrated distribution gates.
const catalogIds = new Set(recommendationDataset.map((meal) => meal.id));
const knownAvoidTags = new Set(avoidTags);
for (const meal of recommendationDataset) {
  expect(
    !Object.hasOwn(meal, "avoidTags"),
    `${meal.id} still exports legacy avoidTags.`,
  );
  expect(
    meal.fairnessExposureAdjustment >= 0 &&
      meal.fairnessExposureAdjustment <= 3,
    `${meal.id} has an out-of-bounds fairness exposure adjustment.`,
  );
  for (const certainty of ["contains", "mayContain", "unknown"]) {
    expect(
      Array.isArray(meal.safety[certainty]),
      `${meal.id} is missing safety.${certainty}.`,
    );
    expect(
      meal.safety[certainty].every((tag) => knownAvoidTags.has(tag)),
      `${meal.id} has an unknown safety tag.`,
    );
  }
  const allSafetyTags = [
    ...meal.safety.contains,
    ...meal.safety.mayContain,
    ...meal.safety.unknown,
  ];
  expect(
    new Set(allSafetyTags).size === allSafetyTags.length,
    `${meal.id} repeats a safety tag across certainty states.`,
  );
}
expect(
  catalogMetadataAudit.safetyAssignments.every(({ mealId }) =>
    catalogIds.has(mealId),
  ),
  "Safety metadata references an unknown meal id.",
);
expect(
  catalogMetadataAudit.calibratedMealIds.every((mealId) =>
    catalogIds.has(mealId),
  ),
  "Calibration metadata references an unknown meal id.",
);
for (const certainty of ["contains", "mayContain", "unknown"]) {
  expect(
    recommendationDataset.some(
      (meal) => meal.safety[certainty].length > 0,
    ),
    `Catalog needs at least one ${certainty} safety declaration.`,
  );
}

const distributions = {};
for (const field of [
  "proteinLevel",
  "vegetableLevel",
  "carbLevel",
  "heaviness",
  "convenience",
]) {
  distributions[field] = Object.fromEntries(
    [...new Set(recommendationDataset.map((meal) => meal[field]))].map(
      (value) => [
        value,
        recommendationDataset.filter((meal) => meal[field] === value).length,
      ],
    ),
  );
}
expect(
  JSON.stringify(distributions) ===
    JSON.stringify({
      proteinLevel: { high: 36, medium: 57, low: 7 },
      vegetableLevel: { high: 30, medium: 53, low: 17 },
      carbLevel: { high: 24, low: 15, medium: 61 },
      heaviness: { medium: 26, light: 57, heavy: 17 },
      convenience: { medium: 42, low: 10, high: 48 },
    }),
  "Catalog signal distributions changed without recalibration.",
);

const logicSource = readFileSync(
  new URL("../src/logic.ts", import.meta.url),
  "utf8",
);
expect(
  !logicSource.includes("avoidKeywordMap"),
  "Hard-avoid keyword inference returned to the engine.",
);
const hardAvoidSection = logicSource.slice(
  logicSource.indexOf("export const getHardAvoidConflicts"),
  logicSource.indexOf("const scoreAvoidConflicts"),
);
expect(
  !/\b(title|description|serializeMeal)\b/.test(hardAvoidSection),
  "Hard-avoid filtering must not inspect title, description, or serialized text.",
);

console.log(
  JSON.stringify(
    {
      hardAvoidCertainties: ["contains", "mayContain", "unknown"],
      launchSafetyRegressions: 3,
      namedDrinkIngredientRegressions: expectedDrinkConflicts.length,
      drinkAvoidContextsChecked: avoidTags.length * recommendationDataset.length,
      drinkSafetyCatalogCoverage: catalogMetadataAudit.drinkIds.length,
      incompleteLogCopy: ["en", "zh"],
      chineseRuleExplanationContexts: 1500,
      sensitiveDrinkDefaultDeny: true,
      sensitiveDrinkOptInReachable: {
        alcohol: alcoholReachedWithOptIn,
        energyDrink: energyReachedWithOptIn,
      },
      timeBoundaries: Object.fromEntries(windowCases),
      todayExcludedFromWeeklyScoring: true,
      rollingSevenDayHistory: {
        calendarWindow: true,
        retainsInRangeLogs: true,
        createsBlankToday: true,
        evictsExpiredDates: true,
        patternThreshold: "4 meals across 2 days",
        receiptBasisMatchesScoring: true,
      },
      monotonicity: {
        structuredSignal: true,
        protein: true,
        vegetables: true,
        carbs: true,
        hardAvoidEligibility: true,
      },
      selectionTrace: {
        perspectives: tracedResults.length,
        fairnessVisible: sawFairness,
        nearTieRotationVisible: sawRotation,
        deterministic: true,
      },
      distributions,
    },
    null,
    2,
  ),
);

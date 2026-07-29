import { readFileSync } from "node:fs";
import { catalogMetadataAudit } from "../.audit-tmp/catalog-metadata.mjs";
import {
  avoidTags,
  createBlankState,
  createEmptyMeal,
  drinkRecommendationDataset,
  recommendationDataset,
  seedHistory,
  seedProfile,
} from "../.audit-tmp/data.mjs";
import {
  buildSuggestedDrink,
  countHardAvoidedRecommendations,
  getHardAvoidConflicts,
  getMealTimeWindow,
  getPriorHistory,
  scoreMealOption,
  scoreRecommendations,
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
const state = createBlankState();
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
expect(
  scoreRecommendations(
    makeProfile({
      eatingStyle: "Mostly takeout",
      preferenceTags: ["Chinese-style"],
    }),
    makeLog(),
    seedHistory,
    "en",
    new Date("2026-07-29T08:30:00"),
  ).some((recommendation) => recommendation.id === "mapo-tofu-light-rice"),
  "The calibrated fairness path must keep Mapo Tofu reachable.",
);

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
      sensitiveDrinkDefaultDeny: true,
      sensitiveDrinkOptInReachable: {
        alcohol: alcoholReachedWithOptIn,
        energyDrink: energyReachedWithOptIn,
      },
      timeBoundaries: Object.fromEntries(windowCases),
      todayExcludedFromWeeklyScoring: true,
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

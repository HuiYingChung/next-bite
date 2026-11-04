import {
  createBlankState,
  recommendationDataset,
} from "../.audit-tmp/data.mjs";
import { catalogMethod, evidenceSources, getCatalogMethod, getMealEvidenceNotes } from "../.audit-tmp/evidence.mjs";
import {
  countHardAvoidedRecommendations,
  scoreRecommendations,
} from "../.audit-tmp/logic.mjs";

const fail = (message) => {
  throw new Error(message);
};

const expect = (condition, message) => {
  if (!condition) fail(message);
};

const duplicates = (items) =>
  [...new Set(items.filter((item, index) => items.indexOf(item) !== index))];

expect(
  recommendationDataset.length === 100,
  `Expected exactly 100 meals, found ${recommendationDataset.length}.`,
);

expect(
  duplicates(recommendationDataset.map((meal) => meal.id)).length === 0,
  "Meal IDs must be unique.",
);

expect(
  duplicates(recommendationDataset.map((meal) => meal.title.toLowerCase())).length ===
    0,
  "Meal titles must be unique.",
);

for (const meal of recommendationDataset) {
  expect(meal.title.trim().length > 0, `${meal.id} has no title.`);
  expect(
    !/\b(light version|light set)\b/i.test(meal.title),
    `${meal.id} uses a vague variant title.`,
  );
  expect(meal.description.trim().length > 0, `${meal.id} has no description.`);
  expect(meal.worksFor.length > 0, `${meal.id} has no preparation context.`);
  expect(
    ["high", "medium", "limited"].includes(meal.evidence.confidence),
    `${meal.id} has an invalid confidence label.`,
  );
  expect(
    JSON.stringify(meal.evidence.sourceIds) === JSON.stringify(["nextbite-editorial"]),
    `${meal.id} must identify editorial rules without claiming generic official links as meal-level evidence.`,
  );
  expect(
    meal.evidence.sourceIds.every((sourceId) => evidenceSources[sourceId]),
    `${meal.id} references an unknown evidence source.`,
  );
  expect(
    /^\d{4}-\d{2}-\d{2}$/.test(meal.evidence.reviewedOn),
    `${meal.id} has no review date.`,
  );
  expect(
    meal.evidence.method.includes("not serving-adequacy, calorie, or medical-nutrition estimates"),
    `${meal.id} does not state its evidence limitation.`,
  );
  expect(
    meal.evidence.assumption.trim().length > 0,
    `${meal.id} has no visible assumption.`,
  );
  expect(
    meal.evidence.confidence === "limited" &&
      meal.evidence.method.includes("not verified meal-level nutrition evidence"),
    `${meal.id} must retain its unverified editorial boundary.`,
  );
  const zhNotes = getMealEvidenceNotes(meal, "zh");
  expect(/目前沒有經查證/.test(zhNotes.method), "Chinese method notes must disclose the same evidence boundary.");
}

expect(!/source-backed/i.test(catalogMethod.name), "The editorial catalog must not claim to be source-backed.");
expect(getCatalogMethod("zh").limitation.includes("紀錄可能不完整"), "Chinese catalog copy must disclose incomplete logs.");
const fixtureNow = new Date(2026, 6, 29, 18, 30);
const state = createBlankState(fixtureNow);
const today = state.days.find((day) => day.id === state.selectedDayId);
expect(today, "Blank state has no selected day.");

const recommendations = scoreRecommendations(
  state.profile,
  today.todayLog,
  state.days,
  "en",
  new Date("2026-07-29T18:30:00"),
);

expect(
  recommendations.length === 3,
  `Expected three recommendation perspectives, found ${recommendations.length}.`,
);

for (const recommendation of recommendations) {
  const recalculated = recommendation.scoreBreakdown.reduce(
    (total, item) => total + item.points,
    0,
  );
  expect(
    recalculated === recommendation.score,
    `${recommendation.id} score receipt sums to ${recalculated}, not ${recommendation.score}.`,
  );
  expect(
    recommendation.selectionTrace,
    `${recommendation.id} has no actual selection trace.`,
  );
  const trace = recommendation.selectionTrace;
  const perspectiveTotal = trace.perspectiveAdjustments.reduce(
    (total, item) => total + item.points,
    0,
  );
  expect(
    perspectiveTotal === trace.perspectiveScore,
    `${recommendation.id} perspective receipt does not recalculate.`,
  );
  const selectionTotal =
    Math.round(
      (perspectiveTotal +
        trace.fairnessAdjustment +
        trace.formatDiversityAdjustment +
        Number.EPSILON) *
        100,
    ) / 100;
  expect(
    selectionTotal === trace.selectionScore,
    `${recommendation.id} selection receipt sums to ${selectionTotal}, not ${trace.selectionScore}.`,
  );
  expect(
    recommendation.weeklyHistoryBasis.availableDayCount === 6 &&
      recommendation.weeklyHistoryBasis.loggedDayCount === 0 &&
      recommendation.weeklyHistoryBasis.loggedMealCount === 0 &&
      !recommendation.weeklyHistoryBasis.sufficientForAdjustment,
    `${recommendation.id} does not disclose its exact blank prior-history basis.`,
  );
}

const hardAvoidProfile = {
  ...state.profile,
  avoidTags: ["Fishy seafood", "Shellfish", "Dairy", "Beef", "Egg", "Pork"],
};
const avoidedCount = countHardAvoidedRecommendations(hardAvoidProfile);
const filteredRecommendations = scoreRecommendations(
  hardAvoidProfile,
  today.todayLog,
  state.days,
  "en",
  new Date("2026-07-29T18:30:00"),
);

expect(avoidedCount > 0, "The must-avoid filter did not remove any meals.");

for (const recommendation of filteredRecommendations) {
  expect(
    recommendation.avoidScore === 0,
    `${recommendation.id} survived a hard avoid conflict.`,
  );
}

console.log(
  JSON.stringify(
    {
      catalogMeals: recommendationDataset.length,
      uniqueIds: true,
      uniqueTitles: true,
      editorialBasisDeclared: true,
      scoreReceiptsRecalculate: true,
      selectionReceiptsRecalculate: true,
      historyBasisDisclosed: true,
      hardAvoidedMeals: avoidedCount,
      hardAvoidFilterPassed: true,
    },
    null,
    2,
  ),
);

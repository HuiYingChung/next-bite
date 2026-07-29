import {
  createBlankState,
  recommendationDataset,
} from "../.audit-tmp/data.mjs";
import { evidenceSources } from "../.audit-tmp/evidence.mjs";
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
    meal.evidence.sourceIds.length >= 3,
    `${meal.id} needs at least three declared evidence sources.`,
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
}

const state = createBlankState();
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
      evidenceComplete: true,
      scoreReceiptsRecalculate: true,
      selectionReceiptsRecalculate: true,
      hardAvoidedMeals: avoidedCount,
      hardAvoidFilterPassed: true,
    },
    null,
    2,
  ),
);

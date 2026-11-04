import {
  createBlankState,
  recommendationDataset,
} from "../.audit-tmp/data.mjs";
import { catalogMethod, evidenceSources, getCatalogMethod, getMealEvidenceNotes } from "../.audit-tmp/evidence.mjs";
import {
  countHardAvoidedRecommendations,
  getHardAvoidConflicts,
  getMealTimeWindow,
  recommendMealIdeas,
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
    meal.evidence.reviewedOn === "",
    `${meal.id} must not claim an individual nutrition-review date from the shared editorial statement.`,
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
  expect(
    !/\bpoints?\b/i.test(meal.evidence.method) && !/點數/.test(zhNotes.method),
    `${meal.id} still describes the live inspiration selection as a summed point score.`,
  );
}

expect(!/source-backed/i.test(catalogMethod.name), "The editorial catalog must not claim to be source-backed.");
expect(getCatalogMethod("zh").limitation.includes("紀錄可能不完整"), "Chinese catalog copy must disclose incomplete logs.");
const fixtureNow = new Date(2026, 6, 29, 18, 30);
const state = createBlankState(fixtureNow);
const today = state.days.find((day) => day.id === state.selectedDayId);
expect(today, "Blank state has no selected day.");

const liveIdeas = recommendMealIdeas(
  state.profile,
  today.todayLog,
  state.days,
  "en",
  fixtureNow,
);
expect(liveIdeas.length === 3, "The live inspiration path must provide three eligible ideas for a blank ordinary profile.");
expect(new Set(liveIdeas.map((meal) => meal.id)).size === liveIdeas.length, "Live inspiration ideas must be distinct.");
for (const idea of liveIdeas) {
  expect(
    getHardAvoidConflicts(state.profile, idea, getMealTimeWindow(fixtureNow)).length === 0,
    `${idea.id} violates the live inspiration path's hard exclusions.`,
  );
  expect(
    idea.score === 0 && idea.scoreBreakdown.length === 0 && idea.selectionTrace === null,
    `${idea.id} must not inherit the historical nutritional point receipt.`,
  );
  expect(
    idea.matchReasons.length > 0 && idea.matchReasons.every((reason) => typeof reason === "string" && reason.trim()),
    `${idea.id} has no actual selection reasons.`,
  );
  expect(
    idea.decisionTrace.preferenceOrder.length > 0 && idea.decisionTrace.varietyReason.trim() && idea.decisionTrace.selectionMethod.trim(),
    `${idea.id} must expose its real directional preference and variety method.`,
  );
}

// The old point engine remains a compatibility implementation. Its arithmetic
// still has to recalculate, but these checks do not describe the live product.
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

const filteredLiveIdeas = recommendMealIdeas(
  hardAvoidProfile,
  today.todayLog,
  state.days,
  "en",
  fixtureNow,
);
expect(filteredLiveIdeas.length > 0, "The hard-avoid fixture must exercise an eligible live inspiration result.");
for (const idea of filteredLiveIdeas) {
  expect(
    getHardAvoidConflicts(hardAvoidProfile, idea, getMealTimeWindow(fixtureNow)).length === 0,
    `${idea.id} survived a hard avoid in the live inspiration path.`,
  );
}

console.log(
  JSON.stringify(
    {
      catalogMeals: recommendationDataset.length,
      uniqueIds: true,
      uniqueTitles: true,
      editorialBasisDeclared: true,
      liveInspirationDirections: true,
      noLiveNutritionalPointReceipt: true,
      compatibilityScoreReceiptsRecalculate: true,
      compatibilitySelectionReceiptsRecalculate: true,
      compatibilityHistoryBasisDisclosed: true,
      hardAvoidedMeals: avoidedCount,
      hardAvoidFilterPassed: true,
    },
    null,
    2,
  ),
);

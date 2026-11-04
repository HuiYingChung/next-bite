import assert from "node:assert/strict";
import { build } from "esbuild";

await build({
  entryPoints: ["src/launch-state.ts", "src/data.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  logLevel: "error",
  outdir: ".audit-tmp/launch",
});
const helpers = await import("../.audit-tmp/launch/launch-state.js");
const { recommendationDataset, createEmptyMeal, toLocalDateId } = await import(
  "../.audit-tmp/launch/data.js"
);
const {
  LAUNCH_STORAGE_KEY,
  LEGACY_STORAGE_KEYS,
  LOCALE_STORAGE_KEY,
  MAX_PLANNED_MEALS,
  loadLaunchState,
  saveLaunchState,
  loadLocale,
  saveLocale,
  clearLaunchStorage,
  parsedMealToEntry,
  normalizeMealEntry,
  mergeMealEntries,
  savePlan,
  removePlan,
  createLocalDataExport,
} = helpers;

const storage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};
const now = new Date(2026, 10, 3, 12);
const date = toLocalDateId(now);
const legacy = storage({
  [LEGACY_STORAGE_KEYS[0]]: JSON.stringify({
    profile: {
      preferenceTags: ["Japanese"],
      avoidTags: ["Dairy"],
      sensitiveDrinkOptIns: ["alcohol", "invalid"],
    },
    selectedDayId: date,
    days: [
      {
        id: date,
        todayLog: {
          Lunch: {
            protein: ["Tofu"],
            cookingMethod: "Steamed",
            mealSource: "Home-cooked",
            portion: "Small",
          },
        },
      },
    ],
  }),
});
let state = loadLaunchState(legacy, now);
assert.equal(state.days.length, 7);
assert.deepEqual(state.days.find((day) => day.isToday).todayLog.Lunch.protein, [
  "Tofu",
]);
assert.deepEqual(state.profile.avoidTags, ["Dairy"]);
assert.deepEqual(state.profile.sensitiveDrinkOptIns, ["alcohol"]);
assert.deepEqual(state.plannedMeals, []);
const migratedStore = storage({
  [LEGACY_STORAGE_KEYS[0]]: legacy.getItem(LEGACY_STORAGE_KEYS[0]),
});
assert.equal(saveLaunchState(state, migratedStore), true);
assert.equal(
  migratedStore.getItem(LEGACY_STORAGE_KEYS[0]),
  null,
  "A successful migration should retire old private snapshots.",
);
assert(migratedStore.getItem(LAUNCH_STORAGE_KEY));

const malformed = storage({
  [LAUNCH_STORAGE_KEY]: JSON.stringify({
    profile: {
      preferenceTags: [null, {}, "Bogus", "Japanese"],
      feelToday: "invented",
      avoidTags: "Dairy",
    },
    days: [
      null,
      false,
      {
        date,
        todayLog: {
          Lunch: {
            protein: [null, 4, {}, "Egg", "egg"],
            vegetables: "Broccoli",
            cookingMethod: {},
            mealSource: "invented",
            portion: "Huge",
            componentDetails: [
              null,
              {
                name: "Rice",
                group: "carb",
                amount: { quantity: -1, unit: "bowl" },
                confidence: "invented",
              },
            ],
          },
        },
      },
    ],
    plannedMeals: [
      null,
      { id: "bad", mealId: "unknown", createdAt: now.toISOString() },
    ],
  }),
});
const safe = loadLaunchState(malformed, now);
const safeLunch = safe.days.find((day) => day.isToday).todayLog.Lunch;
assert.deepEqual(safeLunch.protein, ["Egg"]);
assert.deepEqual(safeLunch.vegetables, []);
assert.deepEqual(safeLunch.carbs, ["Rice"]);
assert.equal(safeLunch.cookingMethod, "Other");
assert.equal(safeLunch.mealSource, "Unspecified");
assert.equal(safeLunch.portion, "Unspecified");
assert.equal(safeLunch.componentDetails[0].amount.quantity, null);
assert.equal(safeLunch.componentDetails[0].confidence, "limited");
assert.deepEqual(safe.profile.preferenceTags, ["Japanese"]);
assert.equal(safe.profile.feelToday, "Normal");
assert.deepEqual(safe.plannedMeals, []);
assert.deepEqual(
  loadLaunchState(
    storage({
      [LAUNCH_STORAGE_KEY]: "{",
      [LEGACY_STORAGE_KEYS[0]]: legacy.getItem(LEGACY_STORAGE_KEYS[0]),
    }),
    now,
  ),
  state,
);

const blocked = {
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("quota");
  },
  removeItem() {
    throw new Error("blocked");
  },
};
assert.equal(loadLaunchState(blocked, now).days.length, 7);
assert.equal(loadLocale(blocked), "en");
assert.equal(saveLaunchState(state, blocked), false);
assert.equal(saveLocale("zh", blocked), false);
assert.equal(clearLaunchStorage(blocked), false);

for (const meal of recommendationDataset.slice(0, MAX_PLANNED_MEALS + 3))
  state = savePlan(state, meal.id, now);
assert.equal(state.plannedMeals.length, MAX_PLANNED_MEALS);
assert.equal(savePlan(state, state.plannedMeals[0].mealId, now), state);
assert.equal(savePlan(state, "missing-meal", now), state);
const legacyPlan = state.plannedMeals[0];
assert.equal(legacyPlan.createdAt, now.toISOString(), "The third argument must remain the creation Date.");
assert.equal(Object.hasOwn(legacyPlan, "portion"), false, "Older plans must not acquire an invented portion.");
const choiceDate = new Date(now.getTime() + 60_000);
state = savePlan(state, legacyPlan.mealId, choiceDate, { portion: "small", recipeVersion: "pilot-v1" });
assert.deepEqual(state.plannedMeals[0], { ...legacyPlan, portion: "small", recipeVersion: "pilot-v1" });
const changedChoice = savePlan(state, legacyPlan.mealId, new Date(choiceDate.getTime() + 60_000), { portion: "large", recipeVersion: "pilot-v2" });
assert.deepEqual(changedChoice.plannedMeals[0], { ...legacyPlan, portion: "large", recipeVersion: "pilot-v2" }, "A changed choice must update metadata without replacing the saved identity/date.");
assert.equal(changedChoice.plannedMeals.length, MAX_PLANNED_MEALS);
assert.equal(savePlan(changedChoice, legacyPlan.mealId, choiceDate), changedChoice, "A metadata-free duplicate must preserve an explicit choice.");
assert.equal(savePlan(changedChoice, legacyPlan.mealId, choiceDate, { portion: "large", recipeVersion: "pilot-v2" }), changedChoice, "An unchanged choice must remain a no-op.");
assert.equal(savePlan(changedChoice, legacyPlan.mealId, choiceDate, { portion: "huge", recipeVersion: {}, apiKey: "must-not-export" }), changedChoice, "Invalid or unrelated metadata cannot overwrite a valid choice.");
state = changedChoice;
const whitelistedPlans = loadLaunchState(storage({ [LAUNCH_STORAGE_KEY]: JSON.stringify({ ...state, plannedMeals: state.plannedMeals.map((plan, index) => index === 0 ? { ...plan, apiKey: "must-not-export", arbitrary: "must-not-export" } : plan) }) }), now).plannedMeals;
assert.deepEqual(whitelistedPlans, state.plannedMeals, "Plan normalization must preserve valid metadata and strip unrelated fields.");
const oldPlansReloaded = loadLaunchState(storage({ [LAUNCH_STORAGE_KEY]: JSON.stringify({ ...state, plannedMeals: [legacyPlan] }) }), now).plannedMeals;
assert.deepEqual(oldPlansReloaded, [legacyPlan], "Existing plans without choice metadata must still load unchanged.");
const newChoiceState = savePlan(loadLaunchState(storage(), now), legacyPlan.mealId, now, { portion: "regular", recipeVersion: "pilot-v1" });
assert.equal(newChoiceState.plannedMeals[0].portion, "regular");
assert.equal(newChoiceState.plannedMeals[0].recipeVersion, "pilot-v1");
const invalidChoiceReload = loadLaunchState(storage({ [LAUNCH_STORAGE_KEY]: JSON.stringify({ ...state, plannedMeals: [{ ...legacyPlan, portion: "huge", recipeVersion: { nested: "invalid" }, apiKey: "must-not-export" }] }) }), now).plannedMeals;
assert.deepEqual(invalidChoiceReload, [legacyPlan], "Invalid stored metadata must be removed without dropping the old plan or inventing a choice.");
const persisted = storage();
assert.equal(saveLaunchState(state, persisted), true);
assert.deepEqual(
  loadLaunchState(persisted, now).plannedMeals,
  state.plannedMeals,
);
const removed = removePlan(state, state.plannedMeals[0].id);
assert.equal(removed.plannedMeals.length, MAX_PLANNED_MEALS - 1);
assert.equal(saveLocale("zh", persisted), true);
assert.equal(loadLocale(persisted), "zh");
persisted.setItem("unrelated-project", "keep");
LEGACY_STORAGE_KEYS.forEach((key) => persisted.setItem(key, "legacy"));
assert.equal(clearLaunchStorage(persisted), true);
assert.equal(persisted.getItem("unrelated-project"), "keep");
[LAUNCH_STORAGE_KEY, ...LEGACY_STORAGE_KEYS, LOCALE_STORAGE_KEY].forEach(
  (key) => assert.equal(persisted.getItem(key), null),
);

const rice = (quantity, unit = "bowl") => ({
  name: "Rice",
  group: "carb",
  amount: {
    quantity,
    unit,
    qualifier: "exact",
    originalText: `${quantity} ${unit}`,
  },
  confidence: "high",
});
const parsed = {
  displayName: "Rice and tofu",
  mealSlot: "Lunch",
  components: [
    rice(0.5),
    {
      name: "Tofu",
      group: "protein",
      amount: {
        quantity: null,
        unit: "unspecified",
        qualifier: "unspecified",
        originalText: null,
      },
      confidence: "high",
    },
  ],
  cookingMethod: "Steamed",
  mealSource: "Home-cooked",
  portion: { size: "Small", confidence: "high" },
  assumptions: [],
  clarification: null,
};
const entry = parsedMealToEntry(parsed);
assert.deepEqual(entry.carbs, ["Rice"]);
assert.deepEqual(entry.protein, ["Tofu"]);
assert.notEqual(entry.componentDetails[0], parsed.components[0]);
for (const unit of ["g", "ml"]) {
  for (const quantity of [0.01, 150, 10_000]) {
    const metric = parsedMealToEntry({ ...parsed, components: [rice(quantity, unit)] });
    assert.equal(metric.componentDetails[0].amount.quantity, quantity);
    assert.equal(metric.componentDetails[0].amount.unit, unit);
    assert.equal(normalizeMealEntry(metric).componentDetails[0].amount.quantity, quantity, "Metric quantities must survive normalization/reload boundaries.");
  }
  for (const quantity of [0, 0.001, -1, 10_000.01, Number.NaN, Number.POSITIVE_INFINITY]) {
    const invalid = normalizeMealEntry({ ...createEmptyMeal(), componentDetails: [rice(quantity, unit)] }).componentDetails[0];
    assert.equal(invalid.amount.quantity, null);
    assert.equal(invalid.amount.unit, "unspecified");
  }
}
for (const unit of ["serving", "bowl", "tablespoon"]) {
  assert.equal(normalizeMealEntry({ ...createEmptyMeal(), componentDetails: [rice(50, unit)] }).componentDetails[0].amount.quantity, 50);
  assert.equal(normalizeMealEntry({ ...createEmptyMeal(), componentDetails: [rice(50.01, unit)] }).componentDetails[0].amount.quantity, null, "Metric support must not raise household-unit bounds.");
}
const gramsMerged = mergeMealEntries(
  parsedMealToEntry({ ...parsed, components: [rice(125, "g")] }),
  parsedMealToEntry({ ...parsed, components: [rice(175, "g")] }),
);
assert.equal(gramsMerged.componentDetails[0].amount.quantity, 300, "Compatible edible gram amounts should add without becoming servings.");
assert.equal(gramsMerged.componentDetails[0].amount.unit, "g");
const gramsAtLimit = mergeMealEntries(
  parsedMealToEntry({ ...parsed, components: [rice(6_000, "g")] }),
  parsedMealToEntry({ ...parsed, components: [rice(6_000, "g")] }),
);
assert.deepEqual(gramsAtLimit.componentDetails.filter((item) => item.name === "Rice").map((item) => item.amount.quantity), [6_000, 6_000], "Merging must preserve separate valid amounts when their sum exceeds the unit bound.");
assert.deepEqual(normalizeMealEntry(gramsAtLimit).componentDetails.map((item) => item.amount.quantity), [6_000, 6_000]);
const householdAtLimit = mergeMealEntries(
  parsedMealToEntry({ ...parsed, components: [rice(30, "bowl")] }),
  parsedMealToEntry({ ...parsed, components: [rice(30, "bowl")] }),
);
assert.deepEqual(normalizeMealEntry(householdAtLimit).componentDetails.map((item) => item.amount.quantity), [30, 30], "Household amounts over the combined cap must also remain separate and reloadable.");
const gramsAndMilliliters = mergeMealEntries(
  parsedMealToEntry({ ...parsed, components: [rice(150, "g")] }),
  parsedMealToEntry({ ...parsed, components: [rice(150, "ml")] }),
);
assert.equal(gramsAndMilliliters.componentDetails.length, 2, "Grams and milliliters must not be converted or combined.");
const incoming = {
  ...createEmptyMeal(),
  carbs: ["Rice"],
  vegetables: ["Broccoli"],
  cookingMethod: "Grilled",
  mealSource: "Takeout",
  portion: "Large",
  componentDetails: [rice(1)],
};
const merged = mergeMealEntries(entry, incoming);
assert.deepEqual(merged.protein, ["Tofu"]);
assert.deepEqual(merged.vegetables, ["Broccoli"]);
assert.equal(
  merged.componentDetails.find((item) => item.name === "Rice").amount.quantity,
  1.5,
);
assert.equal(
  entry.componentDetails[0].amount.quantity,
  0.5,
  "Merging must not mutate an existing meal.",
);
assert.equal(merged.cookingMethod, "Other");
assert.equal(merged.mealSource, "Unspecified");
assert.equal(merged.portion, "Unspecified");
assert(
  merged.componentDetails.some(
    (item) =>
      item.group === "other" && item.name.includes("Mixed meal sources"),
  ),
);
const incompatible = mergeMealEntries(entry, {
  ...incoming,
  componentDetails: [rice(2, "tablespoon")],
});
assert.equal(
  incompatible.componentDetails.filter((item) => item.name === "Rice").length,
  2,
  "Different units must stay separate.",
);
const oldUnquantified = mergeMealEntries(
  { ...createEmptyMeal(), carbs: ["Rice"] },
  incoming,
);
assert.equal(
  oldUnquantified.componentDetails.filter((item) => item.name === "Rice")
    .length,
  2,
  "Adding a known amount must preserve an earlier unknown amount.",
);
assert.deepEqual(mergeMealEntries(createEmptyMeal(), entry), entry);
const composite = parsedMealToEntry({
  ...parsed,
  components: [{ ...parsed.components[1], name: "Dumplings", group: "other" }],
});
const withComposite = mergeMealEntries(composite, incoming);
assert(
  withComposite.componentDetails.some((item) => item.name === "Dumplings"),
  "An earlier composite dish must survive adding food to its slot.",
);
assert.deepEqual(withComposite.vegetables, ["Broccoli"]);
const contextOnly = {
  ...createEmptyMeal(),
  componentDetails: [
    {
      ...parsed.components[1],
      name: "Mixed meal sources: Home-cooked + Takeout. Review source.",
      group: "other",
    },
  ],
};
assert.deepEqual(
  mergeMealEntries(contextOnly, entry),
  entry,
  "Generated context notes alone do not make a meal logged.",
);

const exported = createLocalDataExport(
  {
    ...state,
    apiKey: "must-not-export",
    profile: { ...state.profile, secret: "must-not-export" },
  },
  "zh",
  now,
);
assert.equal(exported.version, 1);
assert.equal(exported.locale, "zh");
assert.equal(exported.exportedAt, now.toISOString());
assert.deepEqual(exported.data.plannedMeals, state.plannedMeals, "Exports must preserve the user's explicit portion/recipe choice.");
const gramExportState = { ...state, days: state.days.map((day) => day.isToday ? { ...day, todayLog: { ...day.todayLog, Lunch: gramsMerged } } : day) };
const gramExport = createLocalDataExport(gramExportState, "en", now);
assert.equal(gramExport.data.days.find((day) => day.isToday).todayLog.Lunch.componentDetails[0].amount.quantity, 300);
assert.equal(gramExport.data.days.find((day) => day.isToday).todayLog.Lunch.componentDetails[0].amount.unit, "g");
const metricStorage = storage();
assert.equal(saveLaunchState(gramExportState, metricStorage), true);
assert.deepEqual(loadLaunchState(metricStorage, now).days.find((day) => day.isToday).todayLog.Lunch.componentDetails[0].amount, gramsMerged.componentDetails[0].amount, "Saved grams must survive the actual storage/reload path.");
assert(
  !JSON.stringify(exported).includes("must-not-export"),
  "Export must whitelist local data, excluding arbitrary fields and credentials.",
);
console.log(
  JSON.stringify(
    {
      legacyMigration: true,
      malformedState: true,
      storageUnavailable: true,
      boundedUniquePlans: true,
      planPersistence: true,
      backwardCompatiblePlanChoices: true,
      planMetadataWhitelisted: true,
      metricAmountBoundsAndExport: true,
      clearOnlyOwnKeys: true,
      amountPreservingMerge: true,
      mixedContextUnknown: true,
      credentialFreeExport: true,
    },
    null,
    2,
  ),
);

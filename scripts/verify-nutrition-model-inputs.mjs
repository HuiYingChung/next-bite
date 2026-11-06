import assert from "node:assert/strict";
import { assertReviewedSourceState, deriveFreeSugars, deriveRecipePreparation } from "./nutrition-model-inputs.mjs";

const boiledApple = { fdcId: 173928, description: "Apples, raw, without skin, cooked, boiled" };
assert.doesNotThrow(() => assertReviewedSourceState(boiledApple, "cooked"));
assert.throws(() => assertReviewedSourceState(boiledApple, "raw"));
assert.throws(() => assertReviewedSourceState(boiledApple, "ready-to-eat"));
assert.throws(() => assertReviewedSourceState({ ...boiledApple, description: "Apples, raw" }, "cooked"));
const toastedSesame = { fdcId: 170152, description: "Seeds, sesame seed kernels, toasted, without salt added (decorticated)" };
assert.doesNotThrow(() => assertReviewedSourceState(toastedSesame, "cooked"));
assert.throws(() => assertReviewedSourceState({ ...toastedSesame, fdcId: 999 }, "cooked"));
assert.throws(() => assertReviewedSourceState({ ...toastedSesame, description: "Seeds, toasted" }, "cooked"));
assert.throws(() => assertReviewedSourceState(toastedSesame, "raw"));
console.log("Reviewed preparation states: cooked apple final-state guard and exact toasted sesame identity verified.");

const record = amount => ({ fdcId: 169640, foodNutrients: [{ nutrient: { id: 2000, unitName: "g" }, amount }] });
const all = { freeSugarBasis: "reported-total-sugars-as-free", note: { en: "Honey sugars qualify as free sugars.", zh: "蜂蜜糖類列為游離糖。" }, sourceUrls: ["https://www.gov.uk/government/publications/nutrient-profiling-model-2018/nutrient-profiling-model-2018-technical-guidance"] };
const zero = { freeSugarBasis: "reported-total-sugars-zero" };
assert.equal(deriveFreeSugars(record(82.1), all), 82.1);
assert.equal(deriveFreeSugars(record(0), zero), 0);
assert.equal(deriveFreeSugars(record(3), { freeSugarBasis: "unresolved" }), null);
assert.equal(deriveFreeSugars(record(3), { freeSugarBasis: "declared-plain-food-no-free-sugar-source" }), 0);
for (const invalid of [null, undefined, "", "0", -1, 101, NaN, Infinity]) {
  assert.throws(() => deriveFreeSugars(record(invalid), all));
  assert.throws(() => deriveFreeSugars(record(invalid), zero));
}
assert.throws(() => deriveFreeSugars(record(2.66), zero));
assert.throws(() => deriveFreeSugars({ fdcId: 1, foodNutrients: [] }, all));
assert.throws(() => deriveFreeSugars({ fdcId: 1, foodNutrients: [...record(0).foodNutrients, ...record(0).foodNutrients] }, zero));
assert.throws(() => deriveFreeSugars({ fdcId: 1, foodNutrients: [{ nutrient: { id: 2000, unitName: "mg" }, amount: 82.1 }] }, all));
assert.throws(() => deriveFreeSugars(record(82.1), { ...all, note: undefined }));
assert.throws(() => deriveFreeSugars(record(82.1), { ...all, sourceUrls: [] }));
assert.throws(() => deriveFreeSugars(record(82.1), { freeSugarBasis: "guessed" }));
console.log("Free-sugar derivations: sourced nonzero/zero, unknown, units and missing/invalid evidence verified.");

const chickpeas = {
  ...record(4.8), fdcId: 173757,
  description: "Chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled, without salt",
};
const intact = { foodId: "usda-173757", weighedState: "cooked", grams: 100 };
const pureed = { ...intact, processing: "pureed" };
const unchanged = structuredClone(chickpeas);
assert.deepEqual(deriveRecipePreparation(chickpeas, intact), {});
assert.equal(deriveRecipePreparation(chickpeas, pureed).preparationModelBasis.freeSugarsPer100g, 4.8);
assert.deepEqual(chickpeas, unchanged, "Preparation derivation cannot alter the whole-food record");
for (const invalid of [null, undefined, "", "0", -1, 101, NaN, Infinity]) {
  assert.throws(() => deriveRecipePreparation({ ...chickpeas, foodNutrients: record(invalid).foodNutrients }, pureed));
}
for (const invalid of [
  { ...pureed, processing: "fried" },
  { ...pureed, processing: null },
  { ...pureed, foodId: "usda-173735" },
  { ...pureed, weighedState: "raw" },
  { ...pureed, preparationModelBasis: { freeSugarsPer100g: 0 } },
  { ...intact, preparationModelBasis: { freeSugarsPer100g: 0 } },
]) assert.throws(() => deriveRecipePreparation(chickpeas, invalid));
for (const invalid of [
  { ...chickpeas, fdcId: 173735 },
  { ...chickpeas, description: "Chickpeas, raw" },
  { ...chickpeas, foodNutrients: [] },
  { ...chickpeas, foodNutrients: [...chickpeas.foodNutrients, ...chickpeas.foodNutrients] },
  { ...chickpeas, foodNutrients: [{ nutrient: { id: 2000, unitName: "mg" }, amount: 4.8 }] },
]) assert.throws(() => deriveRecipePreparation(invalid, pureed));
console.log("Recipe preparation: intact/puréed distinction, exact identity/state, source-derived values and rejected overrides verified.");

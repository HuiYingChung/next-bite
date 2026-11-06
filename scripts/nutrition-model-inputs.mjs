import assert from "node:assert/strict";

export function assertReviewedSourceState(food, state) {
  assert(["cooked", "raw", "ready-to-eat"].includes(state));
  // This source's title retains an intermediate "raw" descriptor. Its final
  // preparation is explicitly cooked/boiled; never match the raw token alone.
  if (food.fdcId === 173928) {
    assert.equal(food.description, "Apples, raw, without skin, cooked, boiled");
    assert.equal(state, "cooked", "The reviewed boiled apple must use cooked weight.");
  }
  if (state === "cooked") {
    const reviewedToastedSesame = food.fdcId === 170152
      && food.description === "Seeds, sesame seed kernels, toasted, without salt added (decorticated)";
    assert(/\b(cooked|prepared|baked|boiled|roasted|grilled)\b/i.test(food.description) || reviewedToastedSesame,
      `No cooked-state evidence for ${food.fdcId}.`);
  }
  if (state === "raw") {
    const reviewedFreshParsley = food.fdcId === 170416 && food.description === "Parsley, fresh";
    assert(/\braw\b/i.test(food.description) || reviewedFreshParsley, `No raw-state evidence for ${food.fdcId}.`);
  }
}

// Keep measurement, a documented formulation assumption, and an unresolved
// value distinct. In particular, absent total sugar can never stand in for 0.
export function deriveFreeSugars(food, assessment) {
  const basis = assessment.freeSugarBasis;
  assert(["unresolved", "declared-plain-food-no-free-sugar-source", "reported-total-sugars-zero", "reported-total-sugars-as-free"].includes(basis), `Unreviewed free-sugar basis for ${food.fdcId}.`);
  if (basis === "unresolved") return null;
  if (basis === "declared-plain-food-no-free-sugar-source") return 0;
  const matches = food.foodNutrients.filter(item => item.nutrient.id === 2000);
  assert.equal(matches.length, 1, `A total-sugar derivation needs one actual source value for ${food.fdcId}.`);
  const sugar = matches[0];
  assert.equal(sugar.nutrient.unitName.toLowerCase(), "g");
  assert(typeof sugar.amount === "number" && Number.isFinite(sugar.amount) && sugar.amount >= 0 && sugar.amount <= 100, `Invalid source total sugar for ${food.fdcId}.`);
  if (basis === "reported-total-sugars-zero") {
    assert.equal(sugar.amount, 0, `A zero derivation requires an actual source zero for ${food.fdcId}.`);
  } else {
    // This reviewed classification is valid only where *all* source sugars
    // qualify, e.g. honey. It is not a fallback for unspecified mixed foods.
    assert(assessment.note?.en?.trim() && assessment.note?.zh?.trim(), `Explain the all-sugars classification for ${food.fdcId}.`);
    assert(assessment.sourceUrls?.length && assessment.sourceUrls.every(url => typeof url === "string" && url.startsWith("https://")), `Cite the all-sugars classification for ${food.fdcId}.`);
  }
  return sugar.amount;
}

// A preparation-specific interpretation must not overwrite the whole food's
// source values. Only this exact cooked chickpea source has been reviewed for
// purée processing; numeric overrides cannot be authored in recipes.json.
export function deriveRecipePreparation(food, ingredient) {
  assert(!Object.hasOwn(ingredient, "preparationModelBasis"), "Recipe preparation values must be derived from the source, not supplied by a recipe.");
  if (!Object.hasOwn(ingredient, "processing")) return {};
  assert.equal(ingredient.processing, "pureed", "Unreviewed recipe processing method.");
  assert.equal(ingredient.foodId, "usda-173757", "Purée processing needs an explicitly reviewed ingredient source.");
  assert.equal(food.fdcId, 173757, "Purée source identity mismatch.");
  assert.equal(food.description, "Chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled, without salt", "Purée preparation must use the exact reviewed cooked chickpea source.");
  assert.equal(ingredient.weighedState, "cooked", "Purée chickpeas must use cooked edible weight.");
  const assessment = {
    freeSugarBasis: "reported-total-sugars-as-free",
    note: {
      en: "These cooked chickpeas are puréed in this recipe. UK NPM 2018 worked example 8 counts their source-reported total sugars as free sugars after puréeing. The original nutrient values, cooked FVNS weight and unknown added sugars remain unchanged. This recipe-specific derivation does not apply to intact chickpeas.",
      zh: "本配方將熟鷹嘴豆打成泥。依 UK NPM 2018 官方範例 8，打成泥後以來源總糖計為游離糖。原始營養數值、熟重 FVNS 與未知添加糖均保留不變；這項配方處理推導不適用於完整鷹嘴豆。",
    },
    sourceUrls: [
      "https://www.gov.uk/government/publications/nutrient-profiling-model-2018/nutrient-profiling-model-2018-worked-examples-and-further-advice-on-calculations",
      "https://fdc.nal.usda.gov/food-details/173757/nutrients",
    ],
  };
  return {
    processing: "pureed",
    preparationModelBasis: { ...assessment, freeSugarsPer100g: deriveFreeSugars(food, assessment) },
  };
}

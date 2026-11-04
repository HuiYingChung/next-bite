import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const modules = new Map();
function loadSource(relative) {
  const file = path.resolve(root, relative);
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} };
  modules.set(file, module);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), { fileName: file, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } });
  new Function("require", "module", "exports", outputText)(specifier => {
    assert(specifier.startsWith("."));
    return loadSource(`${path.resolve(path.dirname(file), specifier)}.ts`);
  }, module, module.exports);
  return module.exports;
}
const {
  createFoodLibraryIndex, validateFoodLibraryData, searchFoodLibrary, identifyFood,
  isLibrarySelectionValid, calculateFoodLibraryScore, getFoodLibraryScoreStatus, loadFoodLibrary,
} = loadSource("src/food-library.ts");
const { defaultMealContext } = loadSource("src/meal-context.ts");
const { seedProfile } = loadSource("src/data.ts");
const profile = { ...seedProfile, preferenceTags: [], avoidTags: [] };
const clone = value => JSON.parse(JSON.stringify(value));
const source = { id: "test", provider: "Test fixtures", dataset: "Independent inputs", release: "1", url: "https://example.org/", license: "Test", licenseUrl: "https://example.org/", retrievedAt: "2026-11-04" };
const base = {
  id: "test-beef-raw", sourceId: "test", sourceRecordId: "1", sourceUrl: "https://example.org/1", names: { en: "Beef, raw", zh: "生牛肉" }, aliases: ["Raw beef"], category: "Meat", kind: "food", state: "raw", group: "protein",
  identity: { key: "beef", protein: "beef", staple: null },
  nutrientsPer100g: { kcal: 100, energyKj: 418.4, protein: 20, carbs: 0, fat: 2, saturatedFat: 1, fiber: 0, sodium: 50, addedSugar: null, totalSugars: 0 },
  modelBasis: { freeSugarsPer100g: 0, fvnsPercent: 0, fiberMethod: "AOAC-compatible", notes: { en: "Independent fixture", zh: "獨立測試值" }, sourceUrls: ["https://example.org/"] },
};
const cooked = { ...clone(base), id: "test-beef-cooked", sourceRecordId: "2", names: { en: "Beef, cooked", zh: "熟牛肉" }, aliases: [], state: "cooked" };
const duplicate = { ...clone(base), id: "test-beef-raw-other", sourceRecordId: "3", aliases: [] };
const rice = { ...clone(base), id: "test-rice", sourceRecordId: "4", names: { en: "White rice, cooked", zh: "熟白飯" }, aliases: ["cooked white rice"], group: "carb", identity: { key: "rice", protein: null, staple: "rice" } };
const data = { schemaVersion: 1, generatedAt: "2026-11-04", sources: [source], records: [base, cooked, duplicate, rice], concepts: [
  { id: "beef", names: { en: "Beef", zh: "牛肉" }, aliases: ["牛", "牛肉類"], group: "protein", protein: "beef", staple: null, recordIds: [base.id, cooked.id, duplicate.id] },
  { id: "fish", names: { en: "Fish", zh: "魚" }, aliases: ["鱼"], group: "protein", protein: "fish", staple: null, recordIds: [] },
] };
const index = createFoodLibraryIndex(data);
assert.equal(identifyFood(index, "牛肉").status, "concept", "A generic name must not choose a cut or raw/cooked record");
assert.equal(identifyFood(index, "魚").status, "concept", "A recognized concept does not need a nutrient record");
assert.equal(identifyFood(index, "魚").record, null);
assert.equal(identifyFood(index, "Beef, raw").status, "ambiguous", "Shared official names need explicit selection");
assert.equal(identifyFood(index, "Ｂｅｅｆ, cooked ").record?.id, cooked.id, "Normalize fullwidth names without dropping preparation state");
assert.equal(identifyFood(index, "Beef, not cooked").status, "unrecognized", "Do not remove negation or guess fuzzy matches");
assert.equal(identifyFood(index, "shrmp").status, "unrecognized");
assert.equal(identifyFood(index, "熟白飯").record?.id, rice.id);
assert.equal(isLibrarySelectionValid(index, base.id, "Beef, raw", "protein"), true);
assert.equal(isLibrarySelectionValid(data, base.id, "Beef, raw", "protein"), true);
assert.equal(isLibrarySelectionValid(index, base.id, "Beef, cooked", "protein"), false, "Editing preparation invalidates a stored nutrient source");
assert.equal(isLibrarySelectionValid(index, base.id, "Beef, raw", "drink"), false, "Stored source must agree with meal group");
assert.equal(identifyFood(index, "Beef, raw", { id: base.id, group: "protein" }).record?.id, base.id);
assert.equal(identifyFood(index, "Beef, cooked", { id: base.id, group: "protein" }).record?.id, cooked.id, "Stale selection never wins against edited source identity");
assert.equal(searchFoodLibrary(index, "牛肉", { locale: "zh", limit: 10 }).length, 3, "Reviewed concepts make specific source variants discoverable");
assert.equal(searchFoodLibrary(index, "white cooked", { locale: "en" })[0]?.id, rice.id, "Search uses all tokens without making identification claims");
assert.equal(searchFoodLibrary(index, "beef", { locale: "en", group: "drink" }).length, 0);
assert.equal(searchFoodLibrary(index, "", { locale: "en", limit: 2 }).length, 2);
assert.equal(searchFoodLibrary(index, "beef", { locale: "en", limit: 0 }).length, 0);

// A concept takes precedence even when an official source uses a generic name.
const genericSource = { ...clone(base), id: "test-generic", names: { en: "Beef", zh: "牛肉" } };
assert.equal(identifyFood(createFoodLibraryIndex({ ...data, records: [...data.records, genericSource] }), "牛肉").status, "concept");

const score = calculateFoodLibraryScore(base, profile);
assert.equal(score.status, "complete");
assert.equal(score.energy, 9, "418.4 kJ lies in the one-point A band");
assert.equal(score.nutrient, 4, "Five protein points minus one saturated-fat point");
assert.equal(score.total, 13);
assert.equal(score.total, 10 - score.model.rawScore + score.preference, "Energy appears exactly once in the product total");
assert.equal(calculateFoodLibraryScore(base, { ...profile, preferenceTags: ["High-protein"] }).preference, 2);
assert.equal(calculateFoodLibraryScore(base, { ...profile, feelToday: "Low energy", preferenceTags: ["Chinese-style", "Light meals"] }, { ...defaultMealContext, cuisine: "asian" }).preference, 0, "A source ingredient must not pretend to know cuisine or assembly time");
assert.equal(calculateFoodLibraryScore(rice, { ...profile, preferenceTags: ["High-protein"] }, { ...defaultMealContext, preferredStaple: "rice" }).preference, 4, "Ingredient preferences have only two supported groups");
const plants = clone(rice); plants.modelBasis.fvnsPercent = 100;
assert.equal(calculateFoodLibraryScore(plants, { ...profile, preferenceTags: ["High-protein", "Vegetable-forward"] }).preference, 2, "Both directions share one capped group");
const boundaryProtein = clone(base); boundaryProtein.nutrientsPer100g.protein = 8.5;
assert.equal(calculateFoodLibraryScore(boundaryProtein, { ...profile, preferenceTags: ["High-protein"] }).preference, 0, "Preference cutoffs are strict");

// Official worked example: hummus. Inputs and expected raw result are independently
// transcribed from the published guidance, not generated by the model under test.
const hummus = clone(base);
Object.assign(hummus.nutrientsPer100g, { energyKj: 1251, saturatedFat: 2.6, sodium: 360, protein: 6.9, fiber: 4.9 });
Object.assign(hummus.modelBasis, { freeSugarsPer100g: .48, fvnsPercent: 73 });
assert.equal(calculateFoodLibraryScore(hummus, profile).model.rawScore, -6);
assert.equal(calculateFoodLibraryScore(hummus, profile).total, 16);

const belowProteinGate = clone(base);
Object.assign(belowProteinGate.nutrientsPer100g, { energyKj: 315, saturatedFat: 7.6, sodium: 0, protein: 9 });
belowProteinGate.modelBasis.freeSugarsPer100g = 1.91;
const atProteinGate = clone(belowProteinGate); atProteinGate.nutrientsPer100g.energyKj += 1e-8;
assert.equal(calculateFoodLibraryScore(belowProteinGate, profile).model.creditedProteinPoints, 5);
assert.equal(calculateFoodLibraryScore(atProteinGate, profile).model.creditedProteinPoints, 0, "The official protein gate uses the complete A total, including energy");

const missingCases = [
  ["energyKj", item => { item.nutrientsPer100g.energyKj = null; }],
  ["saturatedFat", item => { item.nutrientsPer100g.saturatedFat = null; }],
  ["freeSugars", item => { item.modelBasis.freeSugarsPer100g = null; item.nutrientsPer100g.totalSugars = 10; item.nutrientsPer100g.addedSugar = 0; }],
  ["salt", item => { item.nutrientsPer100g.sodium = null; }],
  ["protein", item => { item.nutrientsPer100g.protein = null; }],
  ["fiber", item => { item.nutrientsPer100g.fiber = null; }],
  ["fiberMethod", item => { item.modelBasis.fiberMethod = "unknown"; }],
  ["fvnsPercent", item => { item.modelBasis.fvnsPercent = null; }],
];
for (const [key, mutate] of missingCases) {
  const incomplete = clone(base); mutate(incomplete);
  const result = calculateFoodLibraryScore(incomplete, profile);
  assert.equal(result.total, null, `${key}: never impute zero for a missing input`);
  assert.equal(result.nutrient, null);
  assert.equal(result.status, "incomplete");
  assert(result.missingInputs.includes(key));
  assert.equal(result.energy, key === "energyKj" ? null : 9, "Energy can be reported separately without inventing a total");
}
const beverage = { ...clone(base), kind: "drink", group: "drink" };
assert.equal(calculateFoodLibraryScore(beverage, profile).total, score.total, "Drinks are also compared per 100 g, without a guessed density");
assert.equal(calculateFoodLibraryScore(beverage, profile).model.kind, "drink");
const alcohol = calculateFoodLibraryScore({ ...beverage, kind: "alcohol" }, { ...profile, preferenceTags: ["High-protein"] });
assert.equal(alcohol.status, "out-of-scope");
assert.equal(alcohol.total, null);
assert.equal(alcohol.energy, null);
assert.equal(alcohol.preference, 0, "Do not award a product bonus to out-of-scope alcohol");
const unknown = calculateFoodLibraryScore({ ...base, kind: "unknown" }, profile);
assert.equal(unknown.status, "incomplete");
assert.equal(unknown.total, null);
assert(unknown.missingInputs.includes("kind"));

for (const mutate of [
  item => { item.schemaVersion = 2; }, item => { item.records.push(clone(item.records[0])); },
  item => { item.records[0].sourceId = "not-in-snapshot"; }, item => { item.concepts[0].recordIds.push("missing-source"); },
  item => { item.records[0].nutrientsPer100g.sodium = -1; }, item => { item.records[0].modelBasis.fvnsPercent = 101; },
  item => { item.records[0].nutrientsPer100g.energyKj = Infinity; },
]) { const invalid = clone(data); mutate(invalid); assert.throws(() => validateFoodLibraryData(invalid)); }
const analyticalFat = clone(data); analyticalFat.records[0].nutrientsPer100g.fat = 100.3;
assert.equal(validateFoodLibraryData(analyticalFat).records[0].nutrientsPer100g.fat, 100.3, "Preserve source analytical rounding; do not clamp a non-model nutrient or reject the release");
assert.equal(calculateFoodLibraryScore(analyticalFat.records[0], profile).total, score.total, "Total fat is not saturated fat and does not enter the model");
for (const [key, value, missing] of [["protein", 100.1, "protein"], ["sodium", 100001, "salt"], ["fiber", 100.1, "fiber"], ["saturatedFat", 100.1, "saturatedFat"]]) {
  const impossibleModelInput = clone(data); impossibleModelInput.records[0].nutrientsPer100g[key] = value;
  validateFoodLibraryData(impossibleModelInput);
  const result = calculateFoodLibraryScore(impossibleModelInput.records[0], profile);
  assert.equal(result.total, null, "Out-of-range model inputs fail closed without changing source values");
  assert(result.missingInputs.includes(missing));
}

// Loading is lazy, concurrent consumers share one request, failed loads can retry.
const originalFetch = globalThis.fetch;
let requests = 0;
globalThis.fetch = async requestedPath => {
  requests++;
  assert.equal(requestedPath, "/food-library/catalog.json");
  if (requests === 1) return { ok: false };
  return { ok: true, json: async () => clone(data) };
};
try {
  assert.equal(requests, 0);
  await assert.rejects(loadFoodLibrary());
  const first = loadFoodLibrary(), second = loadFoodLibrary();
  assert.equal(first, second);
  assert.equal((await first).data.records.length, 4);
  await loadFoodLibrary();
  assert.equal(requests, 2);
} finally { globalThis.fetch = originalFetch; }

const catalogPath = path.join(root, "public/food-library/catalog.json");
let catalogSummary = null;
if (fs.existsSync(catalogPath)) {
  const actual = createFoodLibraryIndex(JSON.parse(fs.readFileSync(catalogPath, "utf8").replace(/^\uFEFF/, "")));
  assert(actual.data.records.length >= 1000, "The published library should contain broad official coverage");
  const counts = { complete: 0, incomplete: 0, "out-of-scope": 0 };
  for (const record of actual.data.records) {
    const result = calculateFoodLibraryScore(record, profile);
    assert.equal(getFoodLibraryScoreStatus(record), result.status, `${record.id}: availability filter and full scoring agree`);
    assert(record.names.en.length <= 300 && record.names.zh.length <= 300, `${record.id}: exact source labels must survive meal storage`);
    counts[result.status]++;
    if (result.status === "complete") {
      assert.equal(result.total, 10 - result.model.rawScore + result.preference, `${record.id}: one energy contribution`);
      assert(result.missing.length === 0);
    } else assert.equal(result.total, null, `${record.id}: no total without all evidence`);
  }
  for (const query of ["牛肉", "干貝", "蝦子", "魚", "豬肉", "羊肉", "螺肉", "鹿肉"]) assert.notEqual(identifyFood(actual, query).status, "unrecognized", `Requested common name: ${query}`);
  for (const [id, kind] of [["usda-fndds-2705383", "unknown"], ["usda-fndds-2710375", "drink"], ["usda-fndds-2710616", "alcohol"], ["usda-fndds-2710688", "alcohol"]]) {
    assert.equal(actual.recordsById.get(id)?.kind, kind, `${id}: use the actual FNDDS taxonomy for milk, coffee and alcohol`);
  }
  const { normalizeFoodName, resolveFoodIdentity, isFoodLibraryIdentityValid, getRecordedFoodIdentities } = loadSource("src/food-identity.ts");
  const { normalizeMealEntry, parsedMealToEntry } = loadSource("src/launch-state.ts");
  for (const [english, chinese] of [["Rice", "白飯"], ["Noodles", "麵"], ["Coffee", "咖啡"], ["Tea", "茶"], ["Boba", "珍珠奶茶"], ["Milk tea", "奶茶"]]) assert.equal(normalizeFoodName(english), normalizeFoodName(chinese), "Expanded concept labels must preserve existing bilingual descriptive signals");
  const knownRecords = actual.data.records.filter(record => record.identity);
  assert(knownRecords.some(record => record.identity.staple), "The actual library must support its disclosed staple preference");
  for (const record of knownRecords) {
    const name = record.names.en || record.names.zh;
    assert(isFoodLibraryIdentityValid(record.id, name, record.group), `${record.id}: reviewed ID-name-group tuple`);
    assert.equal(isFoodLibraryIdentityValid(record.id, "fabricated food", record.group), false);
    assert.equal(isFoodLibraryIdentityValid(record.id, name, "drink"), false);
    const resolved = resolveFoodIdentity(name, undefined, record.id, record.group);
    assert.equal(resolved.protein, record.identity.protein, `${record.id}: stored identity is deterministic before catalog loading`);
    assert.equal(resolved.staple, record.identity.staple);
    if (record.identity.staple) assert.equal(record.group, "carb", `${record.id}: staple source remains in a usable meal-record group`);
  }
  const selected = knownRecords.find(record => record.identity.protein && record.names.en.includes(","));
  assert(selected);
  const loggedComponent = { name: selected.names.en, group: selected.group, foodLibraryId: selected.id, amount: { quantity: null, unit: "unspecified", qualifier: "unspecified", originalText: null }, confidence: "high" };
  const loggedEntry = parsedMealToEntry({ displayName: selected.names.en, mealSlot: "Lunch", components: [loggedComponent], cookingMethod: "Other", mealSource: "Unspecified", portion: { size: "Unspecified", confidence: "limited" }, assumptions: [], clarification: null });
  const restoredEntry = normalizeMealEntry(JSON.parse(JSON.stringify(loggedEntry)));
  assert.equal(restoredEntry.componentDetails[0].foodLibraryId, selected.id);
  assert.equal(restoredEntry.componentDetails[0].name, selected.names.en, "Commas in a confirmed source name survive saving and reloading");
  assert(isLibrarySelectionValid(actual, restoredEntry.componentDetails[0].foodLibraryId, restoredEntry.componentDetails[0].name, restoredEntry.componentDetails[0].group));
  assert(getRecordedFoodIdentities([restoredEntry]).proteins.has(selected.identity.protein));
  const tampered = { ...loggedComponent, name: "Unknown unchanged text", foodLibraryId: selected.id };
  assert.equal(isLibrarySelectionValid(actual, tampered.foodLibraryId, tampered.name, tampered.group), false);
  assert.equal(getRecordedFoodIdentities([{ protein: [tampered.name], carbs: [], componentDetails: [tampered] }]).proteins.size, 0, "An opaque saved ID is not trusted when the name was changed");
  const sharedNames = [...actual.exactRecords.entries()].find(([, records]) => records.length > 1 && records.filter(record => record.identity).length > 1 && records.every(record => record.names.en.length > 30));
  if (sharedNames && !actual.exactConcepts.has(sharedNames[0])) {
    const resolved = resolveFoodIdentity(sharedNames[0]);
    assert.equal(resolved.foodLibraryId, undefined, "An ambiguous unselected source name cannot select the last source record");
  }
  catalogSummary = { records: actual.data.records.length, sources: actual.data.sources.length, concepts: actual.data.concepts.length, reviewedSourceIdentities: knownRecords.length, scores: counts };
}
console.log(JSON.stringify({ result: "pass", checks: "Exact identity, ambiguity, persisted selection, search, official model example, supported preferences, missing input propagation, scope, data validation, lazy loading", catalog: catalogSummary }, null, 2));

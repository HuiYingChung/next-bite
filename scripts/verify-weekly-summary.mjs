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
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  });
  new Function("require", "module", "exports", outputText)(specifier => {
    assert(specifier.startsWith("."));
    return loadSource(`${path.resolve(path.dirname(file), specifier)}.ts`);
  }, module, module.exports);
  return module.exports;
}
const { buildWeeklySnapshot } = loadSource("src/weekly-summary.ts");
const { resolveObservedFoodIdentity } = loadSource("src/food-identity.ts");
const { foodSourceIdentities } = loadSource("src/food-source-identities.generated.ts");
const { seedProfile } = loadSource("src/data.ts");
const emptyMeal = () => ({ protein: [], vegetables: [], carbs: [], fruit: [], soup: [], drink: [], componentDetails: [], cookingMethod: "Unspecified", portion: "Unspecified", mealSource: "Unspecified" });
const day = (overrides = {}, date = "2026-11-04") => ({ id: date, date, label: date, isToday: date === "2026-11-04", todayLog: Object.fromEntries(["Breakfast", "Lunch", "Dinner", "Snacks / Drinks"].map(slot => [slot, { ...emptyMeal(), ...overrides[slot] }])) });
const summary = (days, locale = "en") => buildWeeklySnapshot(days, seedProfile, locale);
const sourceItem = (id, locale = "en") => {
  const row = foodSourceIdentities.find(row => row[0] === id);
  assert(row, `Source metadata missing: ${id}`);
  return { name: row[locale === "en" ? 1 : 2] || row[1] || row[2], group: row[3], foodLibraryId: row[0], amount: { quantity: null, unit: "unspecified", qualifier: "unspecified", originalText: null }, confidence: "high" };
};

const bilingualDrinks = locale => [day({ Breakfast: { drink: [locale === "en" ? "Black tea" : "紅茶茶湯"], componentDetails: [sourceItem("tfda-O0700501", locale)] }, Lunch: { componentDetails: [sourceItem("tfda-O0100401", locale)] }, Dinner: { componentDetails: [sourceItem("tfda-R9900101", locale)] }, "Snacks / Drinks": { componentDetails: [sourceItem("usda-fndds-2710375", locale)] } })];
const enDrinks = summary(bilingualDrinks("en"));
assert.deepEqual(enDrinks, summary(bilingualDrinks("zh")), "The same source records must produce identical observations in English and Chinese.");
assert.equal(enDrinks.counts.teaCoffeeMeals, 2);
assert.equal(enDrinks.counts.juiceMeals, 1);
assert.equal(enDrinks.counts.alcoholicDrinkMeals, 1);
assert.equal(enDrinks.dataBasis.loggedMealCount, 4);
assert(!enDrinks.summaryLines.some(line => /Caffeinated drinks|Sweet(er)? drinks|frequently|fairly often/.test(line)), "Drink families do not establish caffeine/sugar exposure or frequency thresholds.");

const dedup = summary([day({ Lunch: { protein: ["Chicken", "雞肉", "Chicken"], vegetables: ["Broccoli", "青花菜"], drink: ["Black tea", "紅茶", "Coffee"], componentDetails: [sourceItem("tfda-O0700501")] } })]);
assert.equal(dedup.counts.proteinMeals, 1);
assert.equal(dedup.counts.distinctProteinFoods, 1);
assert.equal(dedup.counts.vegetableMeals, 1);
assert.equal(dedup.counts.distinctProduceFoods, 1);
assert.equal(dedup.counts.teaCoffeeMeals, 1, "Multiple named drinks and duplicate details count as one recorded slot.");

const preparation = summary([day({ Lunch: { protein: ["Egg"], cookingMethod: "Fried" }, Dinner: { vegetables: ["Broccoli"], cookingMethod: "Stir-fried" } })]);
assert.equal(preparation.counts.friedMeals, 1);
assert.equal(preparation.counts.stirFriedMeals, 1);
assert(preparation.summaryLines.some(line => line.includes("fried in 1 slots and stir-fried in 1 slots")));

const partial = summary([day({ Lunch: { vegetables: ["mystery greens", "not broccoli"], drink: ["beer bread", "coffee-flavored mystery"] } })]);
assert.equal(partial.dataBasis.loggedMealCount, 1, "Unrecognized foods remain genuine records.");
assert.equal(partial.counts.vegetableMeals, 0);
assert.equal(partial.counts.teaCoffeeMeals, 0);
assert.equal(partial.counts.alcoholicDrinkMeals, 0);
assert.equal(partial.counts.unknownMeals, 1);
assert.equal(partial.counts.distinctProduceFoods, 0);
assert(!JSON.stringify(partial).match(/Good range|Could vary more|Too early|Fiber variety|Steady|Could widen|repetitive|A little light/));
assert.equal(summary([day()]).dataBasis.loggedMealCount, 0);
assert.equal(summary([day()]).summaryLines.length, 1);
assert.equal(summary([day({ Lunch: { cookingMethod: "Fried", portion: "Large", componentDetails: [{ name: "Mixed preparation: Boiled + Fried. Review preparation.", group: "other" }] } })]).dataBasis.loggedMealCount, 0, "Metadata alone does not create a meal.");

const groupOnly = foodSourceIdentities.find(row => row[3] === "vegetable" && row[4].startsWith("source:"));
assert(groupOnly);
const groupSummary = summary([day({ Lunch: { componentDetails: [sourceItem(groupOnly[0])] } })]);
assert.equal(groupSummary.counts.vegetableMeals, 1, "Verified source categories support group occurrence counts.");
assert.equal(groupSummary.counts.distinctProduceFoods, 0, "A source category does not establish a distinct named-food identity.");
assert.equal(groupSummary.counts.groupOnlyMeals, 1);
assert.equal(groupSummary.counts.unknownMeals, 0);
assert.equal(resolveObservedFoodIdentity({ name: "mystery greens", group: "vegetable", foodLibraryId: groupOnly[0] }), null, "A stale source ID cannot classify a renamed item.");
assert.equal(resolveObservedFoodIdentity({ name: "Chicken", group: "drink", foodLibraryId: "tfda-O0700501" }), null, "A mismatched ID/name/group is not trusted.");

const original = day({ Lunch: { protein: ["Chicken"] } }, "2026-11-03");
const replacement = day({ Lunch: { protein: ["Tofu"] } }, "2026-11-03");
assert.equal(summary([original, replacement, day()]).dataBasis.loggedMealCount, 1, "Duplicate dates must not inflate slot counts.");
assert.equal(summary([original, replacement, day()]).counts.distinctProteinFoods, 1);
const measured = structuredClone(bilingualDrinks("en"));
measured[0].todayLog.Breakfast.componentDetails[0].amount = { quantity: 2000, unit: "ml", qualifier: "exact", originalText: "2000 ml" };
assert.deepEqual(summary(measured).counts, enDrinks.counts, "Observed slot counts must not turn measured amounts into cups or intake scoring.");

let bilingualSources = 0;
for (const row of foodSourceIdentities.filter(row => row[1] && row[2])) {
  const en = resolveObservedFoodIdentity(sourceItem(row[0], "en"));
  const zh = resolveObservedFoodIdentity(sourceItem(row[0], "zh"));
  assert(en && zh, `Both source names must be recognized: ${row[0]}`);
  assert.deepEqual([en.key, en.group, en.distinctKey, en.alcohol], [zh.key, zh.group, zh.distinctKey, zh.alcohol], `Bilingual source metadata mismatch: ${row[0]}`);
  bilingualSources++;
}
console.log(`Weekly summary: recorded-slot counts, exact source recognition, unknowns, aliases, separate frying methods and ${bilingualSources} bilingual source records passed.`);

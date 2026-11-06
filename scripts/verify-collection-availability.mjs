import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const modules = new Map();
function loadSource(relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  if (modules.has(absolutePath)) return modules.get(absolutePath).exports;
  const module = { exports: {} };
  modules.set(absolutePath, module);
  const { outputText } = ts.transpileModule(fs.readFileSync(absolutePath, "utf8"), {
    fileName: absolutePath,
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  });
  const localRequire = specifier => {
    assert(specifier.startsWith("."), `Unexpected runtime dependency: ${specifier}`);
    return loadSource(`${path.resolve(path.dirname(absolutePath), specifier)}.ts`);
  };
  new Function("require", "module", "exports", outputText)(localRequire, module, module.exports);
  return module.exports;
}

const { createBlankState } = loadSource("src/data.ts");
const { defaultMealContext } = loadSource("src/meal-context.ts");
const { recommendPilotMeals } = loadSource("src/nutrition.ts");
const { standardizedRecipes } = loadSource("src/nutrition-data.ts");
const { getRecipeStapleAvailability } = loadSource("src/collection-availability.ts");
const now = new Date(2026, 10, 5, 12);
const profile = createBlankState(now).profile;
const context = changes => ({ ...defaultMealContext, ...changes });
const result = (changes = {}, currentProfile = profile) =>
  recommendPilotMeals(currentProfile, context(changes), "en", now);
const availability = (staple, choices) =>
  getRecipeStapleAvailability(staple, choices.trace.eligibleRecipeIds);
const baseline = result();
assert.equal(availability("any", baseline).status, "unselected");
for (const staple of ["noodles", "bread"]) {
  const choices = result({ preferredStaple: staple });
  const matches = standardizedRecipes.filter(recipe => recipe.staple === staple).length;
  assert(matches > 0, `The expanded recipe collection must include ${staple}`);
  assert.deepEqual(availability(staple, choices), {
    staple, status: "available", catalogMatches: matches, eligibleMatches: matches,
  }, `${staple} availability includes all complete recipes`);
  assert.equal(choices.candidateCount, baseline.candidateCount,
    "A soft preference must not exclude otherwise eligible recipes");
  for (const option of choices.eligibleRecipes.filter(option => option.recipe.staple === staple)) {
    const base = baseline.eligibleRecipes.find(item => item.meal.id === option.meal.id);
    assert.equal(option.score.nutrient, base.score.nutrient);
    assert.equal(option.score.energy, base.score.energy);
    assert(option.score.preference > base.score.preference,
      "A matching staple preference contributes points without changing the model");
  }
}

// The catalog and full eligible list remain accessible outside the top three.
assert.equal(baseline.eligibleRecipes.length, standardizedRecipes.length);
assert.deepEqual(baseline.recommendations, baseline.eligibleRecipes.slice(0, 3));
for (const staple of ["rice", "noodles", "bread", "potato", "other", "none"]) {
  const matches = standardizedRecipes.filter(recipe => recipe.staple === staple).length;
  assert.deepEqual(availability(staple, baseline), {
    staple, status: "available", catalogMatches: matches, eligibleMatches: matches,
  });
}
assert.equal(availability("none", baseline).status, "available",
  "An explicit no-staple preference is distinct from having no preference");

const fishAvoid = result({ preferredStaple: "potato" }, {
  ...profile, avoidTags: ["Fishy seafood"],
});
assert(fishAvoid.trace.exclusions.some(item =>
  item.mealId === "costco-salmon-sweet-potato-veg" && item.stage === "hard-avoid"));
assert(!fishAvoid.eligibleRecipes.some(item => item.meal.id === "costco-salmon-sweet-potato-veg"),
  "An excluded fish recipe cannot be selected through browse-all");

const warmOnly = result({ preferredStaple: "none", temperature: "warm" });
const warmNoStaples = standardizedRecipes.filter(recipe => recipe.staple === "none" && recipe.temperature === "warm");
assert.equal(availability("none", warmOnly).eligibleMatches, warmNoStaples.length,
  "No-staple availability counts only documented warm recipes under a warm-only condition");
assert.equal(availability("none", warmOnly).status, warmNoStaples.length ? "available" : "excluded");
assert(warmOnly.eligibleRecipes.every(item => item.recipe.temperature === "warm"),
  "Neither a new no-staple recipe nor any other recipe can bypass the warm-only condition");
const quickOnly = result({ preferredStaple: "potato", maxPrepMinutes: 10 });
assert.equal(availability("potato", quickOnly).eligibleMatches,
  quickOnly.eligibleRecipes.filter(item => item.recipe.staple === "potato").length,
  "Coverage respects the real engine's preparation-time limit across new recipes");
assert.equal(availability("rice", quickOnly).status, "available",
  "A restricted collection can still contain eligible alternatives");
const noOptions = result({ preferredStaple: "rice", maxPrepMinutes: 0 });
assert.equal(noOptions.candidateCount, 0);
assert.equal(availability("rice", noOptions).status, "excluded");
assert.equal(availability("noodles", noOptions).status, "excluded",
  "New noodles are excluded by the zero-minute limit, not missing from the catalog");
assert.equal(noOptions.eligibleRecipes.length, 0);
assert.equal(noOptions.excludedCount, standardizedRecipes.length);

console.log("Collection availability verified: expanded staples, full eligible coverage, and hard conditions.");

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
const { getRecipeStapleAvailability } = loadSource("src/collection-availability.ts");
const now = new Date(2026, 10, 5, 12);
const profile = createBlankState(now).profile;
const context = changes => ({ ...defaultMealContext, ...changes });
const result = (changes = {}, currentProfile = profile) =>
  recommendPilotMeals(currentProfile, context(changes), "en", now);
const availability = (staple, choices) =>
  getRecipeStapleAvailability(staple, choices.trace.eligibleRecipeIds);
const scores = choices => choices.trace.candidateScores.map(({ mealId, score }) => ({
  mealId, nutrient: score.nutrient, energy: score.energy,
  preference: score.preference, total: score.total, modelRawScore: score.model.rawScore,
}));

const baseline = result();
assert.equal(availability("any", baseline).status, "unselected");
for (const staple of ["noodles", "bread"]) {
  const choices = result({ preferredStaple: staple });
  assert.deepEqual(availability(staple, choices), {
    staple, status: "absent", catalogMatches: 0, eligibleMatches: 0,
  }, `${staple} is absent from the recipe catalog, not removed by user conditions`);
  assert.equal(choices.candidateCount, baseline.candidateCount,
    "An unavailable soft preference must not exclude otherwise eligible recipes");
  assert.deepEqual(scores(choices), scores(baseline),
    "An unavailable preference adds no score and leaves the nutrient model intact");
}

// Coverage must include the whole eligible collection, not just the displayed
// three: the sole potato recipe is available even when its total ranks lower.
assert(!baseline.recommendations.some(item => item.recipe.staple === "potato"));
assert.deepEqual(availability("potato", baseline), {
  staple: "potato", status: "available", catalogMatches: 1, eligibleMatches: 1,
});
assert.equal(availability("none", baseline).status, "available",
  "An explicit no-staple preference is distinct from having no preference");

const fishAvoid = result({ preferredStaple: "potato" }, {
  ...profile, avoidTags: ["Fishy seafood"],
});
assert(fishAvoid.trace.exclusions.some(item =>
  item.mealId === "costco-salmon-sweet-potato-veg" && item.stage === "hard-avoid"));
assert.deepEqual(availability("potato", fishAvoid), {
  staple: "potato", status: "excluded", catalogMatches: 1, eligibleMatches: 0,
}, "An avoided ingredient is not misreported as missing catalog coverage");

const warmOnly = result({ preferredStaple: "none", temperature: "warm" });
assert.equal(availability("none", warmOnly).status, "excluded",
  "The cold no-staple recipe cannot be advertised under a warm-only condition");
const quickOnly = result({ preferredStaple: "potato", maxPrepMinutes: 10 });
assert.equal(availability("potato", quickOnly).status, "excluded",
  "Coverage respects the real engine's preparation-time limit");
assert.equal(availability("rice", quickOnly).status, "available",
  "A restricted collection can still contain eligible alternatives");
const noOptions = result({ preferredStaple: "rice", maxPrepMinutes: 0 });
assert.equal(noOptions.candidateCount, 0);
assert.equal(availability("rice", noOptions).status, "excluded");
assert.equal(availability("noodles", noOptions).status, "absent",
  "Catalog absence stays distinguishable even when every recipe is excluded");

console.log("Collection availability verified: missing staples, full eligible coverage, and hard conditions.");

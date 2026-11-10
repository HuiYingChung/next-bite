// Verification-only policy oracle: reads reviewed recipe/source facts, never
// the engine's scores, ranking tiers, canonical tags or preference helpers.
const bands = {
  energyKj: [315,630,945,1260,1575,1890,2205,2520,2835,3150],
  saturatedFat: [.9,1.9,2.8,3.7,4.7,5.6,6.6,7.5,8.4,9.4],
  freeSugars: [.9,1.9,2.8,3.7,4.6,5.6,6.5,7.4,8.3,9.3],
  salt: [.2,.5,.7,.9,1.1,1.4,1.6,1.8,2,2.3],
  protein: [1.7,3.4,5.1,6.8,8.5], fiber: [.6,1.2,1.8,2.4,3,3.6,4.2,4.8,5.4,6],
  fvnsPercent: [40,60,80],
};
// Main-protein groups listed by source record, independently of the engine's
// identity table, so a wrong identity or group there fails the comparison.
export const proteinGroupSources = {
  poultry: ["usda-171477", "usda-171534", "usda-171496"],
  egg: ["usda-173424"],
  seafood: ["usda-175168", "usda-171956", "usda-171986", "usda-171971"],
  beans: ["usda-168411", "usda-174271", "usda-173735", "usda-172421", "usda-173757", "usda-175203"],
  "red-meat": ["usda-168649", "usda-169193", "usda-174314"],
  dairy: ["usda-170844", "usda-170845", "usda-170848", "usda-170894", "usda-172182"],
};
const plantProteinSources = new Set(["usda-174291","usda-173735","usda-168411","usda-172421","usda-173757","usda-175203","usda-174271"]);

export function independentRecipeRanking(recipe, foods, profile, context) {
  const byId = new Map(foods.map(food => [food.id, food]));
  const grams = recipe.ingredients.reduce((sum, item) => sum + item.grams, 0);
  const weighted = read => recipe.ingredients.reduce((sum, item) => sum + item.grams * read(byId.get(item.foodId), item), 0) / grams;
  const values = {
    energyKj: weighted(food => food.nutrientsPer100g.energyKj),
    saturatedFat: weighted(food => food.nutrientsPer100g.saturatedFat),
    freeSugars: weighted((food, item) => item.processing === "pureed" ? 4.8 : food.modelBasis.freeSugarsPer100g),
    salt: weighted(food => food.nutrientsPer100g.sodium * .0025),
    protein: weighted(food => food.nutrientsPer100g.protein),
    fiber: weighted(food => food.nutrientsPer100g.fiber),
    fvnsPercent: weighted(food => food.modelBasis.fvnsEligible ? 100 : 0),
  };
  const points = key => {
    const index = bands[key].filter(threshold => values[key] > threshold).length;
    return key === "fvnsPercent" ? [0,1,2,5][index] : index;
  };
  const a = points("energyKj") + points("saturatedFat") + points("freeSugars") + points("salt");
  const c = points("fiber") + points("fvnsPercent") + ((a < 11 || points("fvnsPercent") === 5) ? points("protein") : 0);
  const raw = a - c, reference = 10 - raw;
  const saved = new Set(profile.preferenceTags);
  const title = recipe.label.en.toLowerCase();
  const proteins = recipe.ingredients.filter(item => item.role === "protein" && item.grams > 0);
  const styleMatches = {
    "Bowl meals": /\bbowl\b/.test(title), "Set meals": /\bplate\b/.test(title),
    "Wraps / sandwiches": /\bsandwich\b/.test(title), "Soupy meals": /\bsoup\b|\bporridge\b|\bcongee\b/.test(title),
    "Plant-protein": proteins.length > 0 && proteins.every(item => plantProteinSources.has(item.foodId)),
    "Warm meals": recipe.temperature === "warm", "Rice-based meals": recipe.staple === "rice", "Noodle-based meals": recipe.staple === "noodles",
  };
  let current = 0, savedPoints = 0;
  if (context.preferredStaple !== "any" && recipe.staple === context.preferredStaple) current += 2;
  if (context.preferredProtein && context.preferredProtein !== "any" && proteins.some(item => proteinGroupSources[context.preferredProtein].includes(item.foodId))) current += 2;
  if (context.cuisine !== "any" && recipe.cuisine === context.cuisine) current += 2;
  const lowOil = recipe.seasoning.oilGrams * 100 / grams <= 1;
  if (profile.feelToday === "Need something light") current += lowOil ? 2 : 0;
  else if (profile.feelToday === "Low energy") current += context.ingredientReadiness !== "needs-prep" && recipe.prepMinutes <= 10 ? 2 : 0;
  else if (saved.has("Light meals")) savedPoints += lowOil ? 2 : 0;
  if (Object.entries(styleMatches).some(([tag, matches]) => saved.has(tag) && matches)) savedPoints += 2;
  if ((saved.has("High-protein") && values.protein > 8.5) || (saved.has("Vegetable-forward") && values.fvnsPercent > 40)) savedPoints += 2;
  // Ranking compares the reference by level, restated here from the policy
  // rather than imported from the engine: 18 or more, 14 to 17, 13 or less.
  const level = reference >= 18 ? 2 : reference >= 14 ? 1 : 0;
  return { current, saved: savedPoints, reference, level, raw, values, total: reference + current + savedPoints, tier: [-current, -savedPoints, -level] };
}

export const compareIndependentTiers = (a, b) => {
  for (let index = 0; index < 3; index++) if (a[index] !== b[index]) return a[index] - b[index];
  return 0;
};

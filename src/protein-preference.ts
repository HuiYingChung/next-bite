import { resolveFoodIdentity } from "./food-identity";
import type { MealContext } from "./meal-context";
import type { SourceFood, StandardizedRecipe } from "./nutrition-types";
import type { Locale } from "./types";

export type ProteinGroup = Exclude<MealContext["preferredProtein"], "any">;

export const proteinGroups: ProteinGroup[] = ["poultry", "egg", "seafood", "beans", "red-meat", "dairy"];

export const proteinGroupLabels: Record<ProteinGroup, Record<Locale, string>> = {
  poultry: { en: "Chicken or turkey", zh: "雞肉或火雞" },
  egg: { en: "Egg", zh: "蛋" },
  seafood: { en: "Fish or seafood", zh: "魚或海鮮" },
  beans: { en: "Beans or soy", zh: "豆類或黃豆" },
  "red-meat": { en: "Beef, pork or lamb", zh: "牛、豬或羊" },
  dairy: { en: "Dairy", zh: "乳製品" },
};

// Groups follow the reviewed protein identity of each source food, never a
// search of recipe names. An identity outside this table belongs to no group,
// so an unrecognized ingredient cannot count as a match.
const groupByIdentity: Record<string, ProteinGroup> = {
  chicken: "poultry", turkey: "poultry",
  egg: "egg",
  fish: "seafood", shellfish: "seafood",
  soy: "beans", pulses: "beans",
  beef: "red-meat", pork: "red-meat", lamb: "red-meat",
  dairy: "dairy",
};

/**
 * The main protein of a recipe: the group whose declared protein ingredients
 * provide the most protein. A second ingredient in a smaller role (yogurt
 * beside lamb, an egg beside beef, beans beside chicken) does not make the
 * recipe a match for its group. Exact ties count for each tied group. If a
 * source value is missing the amounts cannot be compared, so every declared
 * group counts rather than guessing.
 */
export const getRecipeMainProteinGroups = (recipe: StandardizedRecipe, foods: SourceFood[]): Set<ProteinGroup> => {
  const proteinByGroup = new Map<ProteinGroup, number>();
  let comparable = true;
  for (const ingredient of recipe.ingredients) {
    if (ingredient.role !== "protein" || !(ingredient.grams > 0)) continue;
    const food = foods.find(item => item.id === ingredient.foodId);
    const identity = food ? resolveFoodIdentity(food.label.en, food.id).protein : null;
    const group = identity ? groupByIdentity[identity] : undefined;
    if (!group) continue;
    const per100g = food?.nutrientsPer100g.protein;
    if (typeof per100g !== "number" || !Number.isFinite(per100g)) comparable = false;
    proteinByGroup.set(group, (proteinByGroup.get(group) ?? 0) + ingredient.grams / 100 * (per100g ?? 0));
  }
  if (!comparable) return new Set(proteinByGroup.keys());
  const most = Math.max(0, ...proteinByGroup.values());
  return new Set([...proteinByGroup].filter(([, grams]) => grams === most).map(([group]) => group));
};

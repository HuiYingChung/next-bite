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

/** Groups of the ingredients a recipe declares as its protein, in any amount above zero. */
export const getRecipeProteinGroups = (recipe: StandardizedRecipe, foods: SourceFood[]): Set<ProteinGroup> => {
  const groups = new Set<ProteinGroup>();
  for (const ingredient of recipe.ingredients) {
    if (ingredient.role !== "protein" || !(ingredient.grams > 0)) continue;
    const food = foods.find(item => item.id === ingredient.foodId);
    const identity = food ? resolveFoodIdentity(food.label.en, food.id).protein : null;
    const group = identity ? groupByIdentity[identity] : undefined;
    if (group) groups.add(group);
  }
  return groups;
};

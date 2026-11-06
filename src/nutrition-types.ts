import type { MustAvoidTag } from "./types";

export type LocalizedNutritionText = { en: string; zh: string };
export type NutrientKey = "kcal" | "energyKj" | "protein" | "carbs" | "fat" | "saturatedFat" | "fiber" | "sodium" | "addedSugar";
export type NutrientValues = Record<NutrientKey, number | null>;
export type NutritionPortion = "small" | "regular" | "large";
export type FoodState = "cooked" | "raw" | "ready-to-eat";

export type NutritionSource = {
  id: string;
  provider: string;
  dataset: string;
  release: string;
  recordPublicationDate: string;
  retrievedAt: string;
  url: string;
  license: string;
  licenseUrl: string;
  snapshotPath: string;
  snapshotSha256: string;
};

export type SourceFood = {
  id: string;
  fdcId: number;
  description: string;
  label: LocalizedNutritionText;
  state: FoodState;
  avoidTags: MustAvoidTag[];
  unknownAvoidTags?: MustAvoidTag[];
  sourceId: string;
  recordUrl: string;
  publicationDate: string;
  nutrientsPer100g: NutrientValues;
  nutrientNotes: Partial<Record<NutrientKey, LocalizedNutritionText>>;
  modelBasis: {
    freeSugarsPer100g: number | null;
    fvnsEligible: boolean | null;
    fiberMethod: "AOAC-compatible" | "unknown";
    note: LocalizedNutritionText;
    sourceUrls: string[];
  };
};

export type IngredientPreparationModelBasis = {
  freeSugarBasis: "reported-total-sugars-as-free";
  freeSugarsPer100g: number | null;
  note: LocalizedNutritionText;
  sourceUrls: string[];
};

export type RecipeIngredient = {
  foodId: string;
  grams: number;
  weighedState: FoodState;
  group: "protein" | "vegetable" | "carb" | "fruit" | "soup" | "drink" | "other";
  role: "protein" | "vegetable" | "fruit" | "staple" | "fat" | "seasoning" | "sauce" | "liquid";
  processing?: "pureed";
  preparationModelBasis?: IngredientPreparationModelBasis;
};

export type StandardizedRecipe = {
  mealId: string;
  version: string;
  label: LocalizedNutritionText;
  basis: "standardized-recipe";
  confidence: "recipe-estimate";
  ingredients: RecipeIngredient[];
  portions: Record<NutritionPortion, number>;
  temperature: "warm" | "cool" | "flexible";
  staple: "rice" | "noodles" | "bread" | "potato" | "other" | "none";
  cuisine: "asian" | "western";
  prepMinutes: number;
  prepBasis: "assembly-from-prepared-ingredients";
  seasoning: { oilGrams: number; saltGrams: number; sauceGrams: number };
  yieldMethod: "sum-final-ingredient-weights";
  notes: LocalizedNutritionText;
  instructions: LocalizedNutritionText[];
};

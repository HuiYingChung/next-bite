import type { MealContext } from "./meal-context";
import type { NutrientProfileResult } from "./nutrient-profile";
import type { LocalizedNutritionText, NutrientValues } from "./nutrition-types";
import type { ParsedMealComponent } from "./types";

export type FoodLibraryGroup = ParsedMealComponent["group"];
export type FoodLibraryStaple = Exclude<MealContext["preferredStaple"], "any" | "none">;
export type FoodLibraryKind = "food" | "drink" | "alcohol" | "unknown";
export type FoodLibraryIdentity = { key: string; protein: string | null; staple: FoodLibraryStaple | null };

export type FoodLibrarySource = {
  id: string;
  provider: string;
  dataset: string;
  release: string;
  url: string;
  license: string;
  licenseUrl: string;
  retrievedAt: string;
};

/** One source record in its named preparation state, never a generic food average. */
export type FoodLibraryRecord = {
  id: string;
  sourceId: string;
  sourceRecordId: string;
  sourceUrl: string;
  names: LocalizedNutritionText;
  aliases: string[];
  category: string;
  kind: FoodLibraryKind;
  state: string | null;
  group: FoodLibraryGroup;
  identity: FoodLibraryIdentity | null;
  nutrientsPer100g: NutrientValues & { totalSugars: number | null };
  modelBasis: {
    freeSugarsPer100g: number | null;
    fvnsPercent: number | null;
    fiberMethod: "AOAC-compatible" | "unknown";
    notes: LocalizedNutritionText;
    sourceUrls: string[];
  };
};

/** Reviewed name recognition. A concept does not identify a nutrient record. */
export type FoodLibraryConcept = {
  id: string;
  names: LocalizedNutritionText;
  aliases: string[];
  group: FoodLibraryGroup;
  protein: string | null;
  staple: FoodLibraryStaple | null;
  recordIds: string[];
};

export type FoodLibraryData = {
  schemaVersion: 1;
  generatedAt: string;
  sources: FoodLibrarySource[];
  records: FoodLibraryRecord[];
  concepts: FoodLibraryConcept[];
};

export type FoodLibraryIndex = {
  data: FoodLibraryData;
  recordsById: Map<string, FoodLibraryRecord>;
  conceptsById: Map<string, FoodLibraryConcept>;
  exactRecords: Map<string, FoodLibraryRecord[]>;
  exactConcepts: Map<string, FoodLibraryConcept[]>;
  searchEntries: Array<{ record: FoodLibraryRecord; names: string[]; text: string }>;
};

export type FoodLibraryIdentification = {
  status: "record" | "concept" | "ambiguous" | "unrecognized";
  record: FoodLibraryRecord | null;
  concept: FoodLibraryConcept | null;
  candidates: FoodLibraryRecord[];
};

export type FoodLibraryScore = {
  status: "complete" | "incomplete" | "out-of-scope";
  nutrient: number | null;
  energy: number | null;
  preference: number;
  total: number | null;
  model: NutrientProfileResult | null;
  preferenceRows: Array<{ key: string; label: string; points: number; note: string }>;
  /** Human-readable, localized missing inputs; not claims of dietary deficiency. */
  missing: string[];
  missingInputs: string[];
  note: string;
};

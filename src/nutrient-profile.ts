// Exact UK NPM2018 thresholds from the guidance published27January2026.
// This profiles food composition; it does not assess personal dietary adequacy.
export const NPM2018_SOURCE_URL = "https://www.gov.uk/government/publications/nutrient-profiling-model-2018/nutrient-profiling-model-2018-technical-guidance";
export const NPM2018_VERSION = "uk-npm-2018-guidance-2026-01-27";

export const npm2018Thresholds = {
  energyKj: [315, 630, 945, 1260, 1575, 1890, 2205, 2520, 2835, 3150],
  saturatedFat: [0.9, 1.9, 2.8, 3.7, 4.7, 5.6, 6.6, 7.5, 8.4, 9.4],
  freeSugars: [0.9, 1.9, 2.8, 3.7, 4.6, 5.6, 6.5, 7.4, 8.3, 9.3],
  salt: [0.2, 0.5, 0.7, 0.9, 1.1, 1.4, 1.6, 1.8, 2, 2.3],
  protein: [1.7, 3.4, 5.1, 6.8, 8.5],
  fiber: [0.6, 1.2, 1.8, 2.4, 3, 3.6, 4.2, 4.8, 5.4, 6],
  fvnsPercent: [40, 60, 80],
} as const;
export type NutrientProfileKey = keyof typeof npm2018Thresholds;
export type NutrientProfileInputs = Record<NutrientProfileKey, number | null> & { fiberMethod: "AOAC-compatible" | "unknown" };
export type NutrientProfileResult = {
  status: "complete" | "incomplete";
  kind: "food" | "drink";
  inputs: NutrientProfileInputs;
  points: {
    a: { energy: number | null; saturatedFat: number | null; freeSugars: number | null; salt: number | null };
    c: { protein: number | null; fiber: number | null; fvns: number | null };
  };
  aTotal: number | null;
  cTotal: number | null;
  proteinCredited: boolean | null;
  creditedProteinPoints: number | null;
  rawScore: number | null;
  classification: "less-healthy" | "below-threshold" | null;
  missing: string[];
  sourceUrl: string;
  version: string;
};

const valid = (key: NutrientProfileKey, value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && (key === "energyKj" || value <= 100);
export const getNpm2018Band = (key: NutrientProfileKey, value: number | null): { lowerExclusive: number | null; upperInclusive: number | null; points: number | null } => {
  if (!valid(key, value)) return { lowerExclusive: null, upperInclusive: null, points: null };
  const thresholds: readonly number[] = npm2018Thresholds[key];
  // Exactly at a threshold remains in the lower band. Never round here.
  const band = thresholds.filter(threshold => value > threshold).length;
  return { lowerExclusive: band ? thresholds[band - 1] : null, upperInclusive: thresholds[band] ?? null,
    points: key === "fvnsPercent" ? [0, 1, 2, 5][band] : band };
};

export const calculateNutrientProfile = (inputs: NutrientProfileInputs, kind: "food" | "drink" = "food"): NutrientProfileResult => {
  const missing: string[] = (Object.keys(npm2018Thresholds) as NutrientProfileKey[]).filter(key => !valid(key, inputs[key]));
  if (inputs.fiberMethod !== "AOAC-compatible") missing.push("fiberMethod");
  const points = {
    a: { energy: getNpm2018Band("energyKj", inputs.energyKj).points, saturatedFat: getNpm2018Band("saturatedFat", inputs.saturatedFat).points,
      freeSugars: getNpm2018Band("freeSugars", inputs.freeSugars).points, salt: getNpm2018Band("salt", inputs.salt).points },
    c: { protein: getNpm2018Band("protein", inputs.protein).points, fiber: inputs.fiberMethod === "AOAC-compatible" ? getNpm2018Band("fiber", inputs.fiber).points : null,
      fvns: getNpm2018Band("fvnsPercent", inputs.fvnsPercent).points },
  };
  const aTotal = Object.values(points.a).every(value => value !== null) ? Object.values(points.a).reduce<number>((sum, value) => sum + value!, 0) : null;
  // Protein eligibility depends on ALL A points, including energy.
  const proteinCredited = aTotal === null || points.c.fvns === null ? null : aTotal < 11 || points.c.fvns === 5;
  const creditedProteinPoints = proteinCredited === null ? null : proteinCredited ? points.c.protein : 0;
  const cTotal = creditedProteinPoints !== null && points.c.fiber !== null && points.c.fvns !== null ? creditedProteinPoints + points.c.fiber + points.c.fvns : null;
  const rawScore = missing.length === 0 && aTotal !== null && cTotal !== null ? aTotal - cTotal : null;
  return { status: rawScore === null ? "incomplete" : "complete", kind, inputs: { ...inputs }, points, aTotal, cTotal, proteinCredited, creditedProteinPoints, rawScore,
    classification: rawScore === null ? null : rawScore >= (kind === "food" ? 4 : 1) ? "less-healthy" : "below-threshold", missing,
    sourceUrl: NPM2018_SOURCE_URL, version: NPM2018_VERSION };
};

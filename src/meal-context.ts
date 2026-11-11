import type { Locale, Profile, Recommendation } from "./types";

export type MealContext = {
  hunger: "unspecified" | "not-hungry" | "moderate" | "hungry";
  appetite: "unspecified" | "small" | "regular" | "large";
  temperature: "any" | "warm";
  preferredStaple: "any" | "rice" | "noodles" | "bread" | "potato" | "other" | "none";
  /** The main protein wanted for this meal; a flexible preference, not a filter. */
  preferredProtein: "any" | "poultry" | "egg" | "seafood" | "beans" | "red-meat" | "dairy";
  cuisine: "any" | "asian" | "western";
  maxPrepMinutes: number | null;
  ingredientReadiness: "unspecified" | "ready" | "needs-prep";
};

export const defaultMealContext: MealContext = {
  hunger: "unspecified", appetite: "unspecified", temperature: "any",
  preferredStaple: "any", preferredProtein: "any", cuisine: "any", maxPrepMinutes: null, ingredientReadiness: "unspecified",
};
const proteinPreferences: ReadonlyArray<MealContext["preferredProtein"]> = ["any", "poultry", "egg", "seafood", "beans", "red-meat", "dairy"];

export type ContextMealMetadata = {
  temperature: "warm" | "cool" | "flexible" | "unknown";
  staple: Exclude<MealContext["preferredStaple"], "any"> | "unknown";
  cuisine: "asian" | "western" | "unknown";
  prepMinutes: number | null;
};

export const normalizeMealContext = (context?: Partial<MealContext>): MealContext => ({
  ...defaultMealContext, ...context,
  maxPrepMinutes: typeof context?.maxPrepMinutes === "number" && Number.isFinite(context.maxPrepMinutes) && context.maxPrepMinutes >= 0
    ? context.maxPrepMinutes : null,
  ingredientReadiness: context?.ingredientReadiness === "ready" || context?.ingredientReadiness === "needs-prep" ? context.ingredientReadiness : "unspecified",
  // Contexts saved or constructed before this field existed have no selection.
  preferredProtein: context?.preferredProtein && proteinPreferences.includes(context.preferredProtein) ? context.preferredProtein : "any",
});

export const requiresWarmMeal = (profile: Profile, context?: Partial<MealContext>) =>
  context?.temperature === "warm" || profile.feelToday === "Want something warm";

export const getContextExclusions = (profile: Profile, context: MealContext, metadata: ContextMealMetadata): string[] => {
  const exclusions: string[] = [];
  if (requiresWarmMeal(profile, context) && metadata.temperature !== "warm") exclusions.push("warm-temperature-not-confirmed");
  if (context.maxPrepMinutes !== null) {
    if (context.ingredientReadiness === "needs-prep") exclusions.push("preparation-total-time-unknown");
    else if (metadata.prepMinutes === null || metadata.prepMinutes > context.maxPrepMinutes) exclusions.push("preparation-budget-not-confirmed");
  }
  return exclusions;
};

// Legacy templates have no measured preparation times. A convenience label
// must not impersonate a known number of minutes.
export const getLegacyMealContext = (meal: Recommendation): ContextMealMetadata => {
  const tags = new Set(meal.tags.map(tag => tag.toLowerCase()));
  const cold = [...meal.safety.contains, ...meal.safety.mayContain, ...meal.safety.unknown].includes("Cold food");
  return {
    temperature: cold ? "cool" : tags.has("warm") || tags.has("soupy") ? "warm" : "unknown",
    staple: tags.has("rice-based") ? "rice" : tags.has("noodle-based") ? "noodles" : tags.has("wrap") || tags.has("sandwich") ? "bread" : "unknown",
    cuisine: ["chinese-style", "taiwanese-style", "japanese-inspired", "korean-inspired"].some(tag => tags.has(tag)) ? "asian"
      : ["american-light", "mediterranean", "mexican-inspired"].some(tag => tags.has(tag)) ? "western" : "unknown",
    prepMinutes: null,
  };
};

export const getContextPreferenceFit = (context: MealContext, metadata: ContextMealMetadata, locale: Locale) => {
  const matched: string[] = [], unmatched: string[] = [];
  let points = 0;
  if (context.preferredStaple !== "any") {
    if (metadata.staple === context.preferredStaple) { matched.push("staple"); points += 2; }
    else unmatched.push("staple");
  }
  if (context.cuisine !== "any") {
    if (metadata.cuisine === context.cuisine) { matched.push("cuisine"); points += 1; }
    else unmatched.push("cuisine");
  }
  const notes = [
    matched.includes("staple") ? (locale === "en" ? "Matches your preferred staple." : "符合你偏好的主食。") : "",
    matched.includes("cuisine") ? (locale === "en" ? "Matches your preferred cuisine group." : "符合你偏好的料理類型。") : "",
    unmatched.includes("staple") ? (locale === "en" ? "Your preferred staple is not confirmed for this option; this preference is flexible." : "這個選項未確認符合偏好主食；此偏好保留彈性。") : "",
    unmatched.includes("cuisine") ? (locale === "en" ? "Your preferred cuisine group is not confirmed for this option; this preference is flexible." : "這個選項未確認符合偏好料理類型；此偏好保留彈性。") : "",
  ].filter(Boolean);
  return { points, matched, unmatched, notes };
};

// Hunger only suggests a portion. With "Large portions" kept out it must not
// suggest the large one, which would exclude every recipe at once. A portion
// the person picks explicitly is left as chosen.
export const getPortionPreference = (context: MealContext, avoidsLargePortions = false) => {
  if (context.appetite !== "unspecified") return { portion: context.appetite, basis: "explicit-appetite" as const };
  if (context.hunger === "not-hungry") return { portion: "small" as const, basis: "hunger-preference" as const };
  if (context.hunger === "hungry" && !avoidsLargePortions) return { portion: "large" as const, basis: "hunger-preference" as const };
  return { portion: "regular" as const, basis: "standard" as const };
};

/** `mainProteins` is the group supplying the most protein, when the caller knows it. */
export type PreferenceCandidate<T> = { id: string; value: T; tier: number[]; proteins: string[]; staple: string | null; mainProteins?: string[] };
export type VarietyDecision<T> = PreferenceCandidate<T> & { recordMatches: string[]; selectedMatches: string[]; recordContextPresent: boolean; earlierChoices: number };
export const comparePreferenceTiers = (a: number[], b: number[]) => {
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
};

// Preference tiers are lexicographic, never added across unlike concepts.
// Variety only acts after every declared preference is equal. A recorded
// ingredient is a reason to offer variation, not evidence of excess intake.
export const pickVariedChoices = <T>(candidates: PreferenceCandidate<T>[], records: { proteins: Set<string>; staples: Set<string> }, limit = 3): VarietyDecision<T>[] => {
  const remaining = [...candidates], selected: VarietyDecision<T>[] = [];
  const selectedProteins = new Set<string>(), selectedStaples = new Set<string>();
  const overlap = (item: PreferenceCandidate<T>, proteins: Set<string>, staples: Set<string>) => [item.proteins.filter(protein => proteins.has(protein)).length, item.staple && staples.has(item.staple) ? 1 : 0];
  while (remaining.length && selected.length < limit) {
    remaining.sort((a, b) => comparePreferenceTiers(a.tier, b.tier) ||
      comparePreferenceTiers([...overlap(a, records.proteins, records.staples), ...overlap(a, selectedProteins, selectedStaples)], [...overlap(b, records.proteins, records.staples), ...overlap(b, selectedProteins, selectedStaples)]) || a.id.localeCompare(b.id, "en"));
    const next = remaining.shift()!;
    const matches = (proteins: Set<string>, staples: Set<string>) => [
      ...next.proteins.filter(protein => proteins.has(protein)).map(protein => `protein:${protein}`),
      ...(next.staple && staples.has(next.staple) ? [`staple:${next.staple}`] : []),
    ];
    selected.push({ ...next, recordMatches: matches(records.proteins, records.staples), selectedMatches: matches(selectedProteins, selectedStaples), recordContextPresent: records.proteins.size + records.staples.size > 0, earlierChoices: selected.length });
    next.proteins.forEach(protein => selectedProteins.add(protein));
    if (next.staple) selectedStaples.add(next.staple);
  }
  return selected;
};

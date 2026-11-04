import type { Locale, Profile, Recommendation } from "./types";

export type MealContext = {
  hunger: "unspecified" | "not-hungry" | "moderate" | "hungry";
  appetite: "unspecified" | "small" | "regular" | "large";
  temperature: "any" | "warm";
  preferredStaple: "any" | "rice" | "noodles" | "bread" | "potato" | "other" | "none";
  cuisine: "any" | "asian" | "western";
  maxPrepMinutes: number | null;
};

export const defaultMealContext: MealContext = {
  hunger: "unspecified", appetite: "unspecified", temperature: "any",
  preferredStaple: "any", cuisine: "any", maxPrepMinutes: null,
};

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
});

export const requiresWarmMeal = (profile: Profile, context?: Partial<MealContext>) =>
  context?.temperature === "warm" || profile.feelToday === "Want something warm";

export const getContextExclusions = (profile: Profile, context: MealContext, metadata: ContextMealMetadata): string[] => {
  const exclusions: string[] = [];
  if (requiresWarmMeal(profile, context) && metadata.temperature !== "warm") exclusions.push("warm-temperature-not-confirmed");
  if (context.maxPrepMinutes !== null && (metadata.prepMinutes === null || metadata.prepMinutes > context.maxPrepMinutes)) exclusions.push("preparation-budget-not-confirmed");
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

export const getPortionPreference = (context: MealContext) => {
  if (context.appetite !== "unspecified") return { portion: context.appetite, basis: "explicit-appetite" as const };
  if (context.hunger === "not-hungry") return { portion: "small" as const, basis: "hunger-preference" as const };
  if (context.hunger === "hungry") return { portion: "large" as const, basis: "hunger-preference" as const };
  return { portion: "regular" as const, basis: "standard" as const };
};

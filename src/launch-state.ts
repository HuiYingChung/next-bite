import {
  STORAGE_KEY,
  avoidTags,
  createBlankState,
  createEmptyMeal,
  mealNames,
  preferenceTags,
  recommendationDataset,
  rollSevenDayHistory,
} from "./data";
import type {
  AppState,
  DayHistory,
  Locale,
  MealEntry,
  ParsedMeal,
  ParsedMealComponent,
  Profile,
} from "./types";

export type PlannedMeal = { id: string; mealId: string; createdAt: string };
export type LaunchState = AppState & { plannedMeals: PlannedMeal[] };
export type LocalStorageAccess = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export const LAUNCH_STORAGE_KEY = `${STORAGE_KEY}-launch-v5`;
export const LOCALE_STORAGE_KEY = "next-bite-locale";
export const LEGACY_STORAGE_KEYS = [
  `${STORAGE_KEY}-seven-day-v4`,
  `${STORAGE_KEY}-deterministic-v3`,
  `${STORAGE_KEY}-explainable-v2`,
  STORAGE_KEY,
];
export const MAX_PLANNED_MEALS = 12;

const foodFields = [
  "protein",
  "vegetables",
  "carbs",
  "fruit",
  "soup",
  "drink",
] as const;
const foodGroups = [
  "protein",
  "vegetable",
  "carb",
  "fruit",
  "soup",
  "drink",
] as const;
const methods = [
  "Stir-fried",
  "Grilled",
  "Steamed",
  "Boiled",
  "Fried",
  "Soup / stew",
  "Raw / cold",
  "Other",
] as const;
const sources = [
  "Home-cooked",
  "Ready-made",
  "Takeout",
  "Restaurant",
  "Unspecified",
] as const;
const portions = ["Small", "Medium", "Large", "Unspecified"] as const;
const confidence = ["limited", "medium", "high"] as const;
const units = [
  "serving",
  "portion",
  "cup",
  "bowl",
  "plate",
  "piece",
  "slice",
  "tablespoon",
  "teaspoon",
  "handful",
  "glass",
  "can",
  "bottle",
  "unspecified",
] as const;
const qualifiers = ["exact", "approximate", "unspecified"] as const;
const catalogIds = new Set(recommendationDataset.map((meal) => meal.id));
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const cleanText = (value: unknown, limit = 200) =>
  typeof value === "string" ? value.trim().slice(0, limit) : "";
const enumValue = <T extends string>(
  value: unknown,
  values: readonly T[],
  fallback: T,
): T =>
  typeof value === "string" && values.includes(value as T)
    ? (value as T)
    : fallback;
const textList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .flatMap((item) => {
      const name = cleanText(item);
      const key = name.toLocaleLowerCase();
      if (!name || seen.has(key)) return [];
      seen.add(key);
      return [name];
    })
    .slice(0, 64);
};

export const getBrowserStorage = (): LocalStorageAccess | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

const normalizeComponent = (value: unknown): ParsedMealComponent | null => {
  const component = record(value);
  const name = cleanText(component.name);
  if (!name) return null;
  const amount = record(component.amount);
  const unit = enumValue(amount.unit, units, "unspecified");
  const quantity =
    typeof amount.quantity === "number" &&
    Number.isFinite(amount.quantity) &&
    amount.quantity > 0 &&
    amount.quantity <= 10_000
      ? amount.quantity
      : null;
  const knownAmount = quantity !== null && unit !== "unspecified";
  return {
    name,
    group: enumValue(component.group, [...foodGroups, "other"], "other"),
    amount: {
      quantity: knownAmount ? quantity : null,
      unit: knownAmount ? unit : "unspecified",
      qualifier: knownAmount
        ? enumValue(amount.qualifier, qualifiers, "approximate")
        : "unspecified",
      originalText: cleanText(amount.originalText, 400) || null,
    },
    confidence: enumValue(component.confidence, confidence, "limited"),
  };
};

export const normalizeMealEntry = (value: unknown): MealEntry => {
  const meal = record(value);
  const normalized = createEmptyMeal();
  foodFields.forEach((field) => {
    normalized[field] = textList(meal[field]);
  });
  normalized.cookingMethod = enumValue(meal.cookingMethod, methods, "Other");
  normalized.mealSource = enumValue(meal.mealSource, sources, "Unspecified");
  normalized.portion = enumValue(meal.portion, portions, "Unspecified");
  normalized.componentDetails = Array.isArray(meal.componentDetails)
    ? meal.componentDetails
        .map(normalizeComponent)
        .filter((item): item is ParsedMealComponent => item !== null)
        .slice(0, 128)
    : [];
  normalized.componentDetails.forEach((component) => {
    const index = foodGroups.indexOf(
      component.group as (typeof foodGroups)[number],
    );
    if (index >= 0)
      normalized[foodFields[index]] = textList([
        ...normalized[foodFields[index]],
        component.name,
      ]);
  });
  return normalized;
};

const normalizeProfile = (value: unknown, fallback: Profile): Profile => {
  const profile = record(value);
  return {
    heightCm: cleanText(profile.heightCm, 12) || fallback.heightCm,
    heightFt: cleanText(profile.heightFt, 12) || fallback.heightFt,
    heightIn: cleanText(profile.heightIn, 12) || fallback.heightIn,
    weightKg: cleanText(profile.weightKg, 12) || fallback.weightKg,
    weightLb: cleanText(profile.weightLb, 12) || fallback.weightLb,
    heightUnit: enumValue(
      profile.heightUnit,
      ["cm", "ft/in"],
      fallback.heightUnit,
    ),
    weightUnit: enumValue(
      profile.weightUnit,
      ["kg", "lb"],
      fallback.weightUnit,
    ),
    feelToday: enumValue(
      profile.feelToday,
      [
        "Normal",
        "Want something warm",
        "Need something light",
        "Low energy",
        "On period",
      ],
      fallback.feelToday,
    ),
    activityLevel: enumValue(
      profile.activityLevel,
      ["Low", "Moderate", "Active"],
      fallback.activityLevel,
    ),
    eatingStyle: enumValue(
      profile.eatingStyle,
      ["Mostly home-cooked", "Mostly takeout", "Both"],
      fallback.eatingStyle,
    ),
    preferenceTags: textList(profile.preferenceTags).filter((tag) =>
      preferenceTags.includes(tag),
    ),
    avoidTags: textList(profile.avoidTags).filter(
      (tag): tag is Profile["avoidTags"][number] =>
        avoidTags.includes(tag as Profile["avoidTags"][number]),
    ),
    sensitiveDrinkOptIns: textList(profile.sensitiveDrinkOptIns).filter(
      (tag): tag is Profile["sensitiveDrinkOptIns"][number] =>
        tag === "alcohol" || tag === "energy-drink",
    ),
  };
};

const normalizePlans = (value: unknown): PlannedMeal[] => {
  if (!Array.isArray(value)) return [];
  const seenMeals = new Set<string>();
  const seenIds = new Set<string>();
  return value
    .flatMap((item) => {
      const plan = record(item);
      const id = cleanText(plan.id, 150);
      const mealId = cleanText(plan.mealId, 100);
      const createdAt = cleanText(plan.createdAt, 40);
      if (
        !id ||
        !catalogIds.has(mealId) ||
        !createdAt ||
        !Number.isFinite(Date.parse(createdAt)) ||
        seenMeals.has(mealId) ||
        seenIds.has(id)
      )
        return [];
      seenMeals.add(mealId);
      seenIds.add(id);
      return [{ id, mealId, createdAt: new Date(createdAt).toISOString() }];
    })
    .slice(0, MAX_PLANNED_MEALS);
};

const normalizeState = (value: unknown, now: Date): LaunchState => {
  const blank = createBlankState(now);
  const saved = record(value);
  const days: DayHistory[] = Array.isArray(saved.days)
    ? saved.days
        .flatMap((item) => {
          const day = record(item);
          const id = cleanText(day.date || day.id, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(id)) return [];
          const todayLog = record(day.todayLog);
          return [
            {
              id,
              date: id,
              label: "",
              isToday: false,
              todayLog: Object.fromEntries(
                mealNames.map((slot) => [
                  slot,
                  normalizeMealEntry(todayLog[slot]),
                ]),
              ) as DayHistory["todayLog"],
            },
          ];
        })
        .slice(-366)
    : [];
  const rolled = rollSevenDayHistory(days, now);
  return {
    profile: normalizeProfile(saved.profile, blank.profile),
    days: rolled,
    selectedDayId: rolled.some((day) => day.id === saved.selectedDayId)
      ? (saved.selectedDayId as string)
      : blank.selectedDayId,
    plannedMeals: normalizePlans(saved.plannedMeals),
  };
};

export const loadLaunchState = (
  storage: LocalStorageAccess | null = getBrowserStorage(),
  now = new Date(),
): LaunchState => {
  for (const key of [LAUNCH_STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
    try {
      const saved = storage?.getItem(key);
      if (!saved) continue;
      const parsed: unknown = JSON.parse(saved);
      if (!Array.isArray(record(parsed).days)) continue;
      return normalizeState(parsed, now);
    } catch {
      // A blocked store or damaged snapshot must not prevent a first result.
    }
  }
  return normalizeState(null, now);
};

export const saveLaunchState = (
  state: LaunchState,
  storage: LocalStorageAccess | null = getBrowserStorage(),
): boolean => {
  try {
    if (!storage) return false;
    storage.setItem(
      LAUNCH_STORAGE_KEY,
      JSON.stringify(normalizeState(state, new Date())),
    );
    // Retire migrated snapshots only after the current state is safely written.
    for (const key of LEGACY_STORAGE_KEYS) {
      try {
        storage.removeItem(key);
      } catch {
        /* The current snapshot is saved even if an old key cannot be retired. */
      }
    }
    return true;
  } catch {
    return false;
  }
};

export const loadLocale = (
  storage: LocalStorageAccess | null = getBrowserStorage(),
): Locale => {
  try {
    return storage?.getItem(LOCALE_STORAGE_KEY) === "zh" ? "zh" : "en";
  } catch {
    return "en";
  }
};

export const saveLocale = (
  locale: Locale,
  storage: LocalStorageAccess | null = getBrowserStorage(),
): boolean => {
  try {
    if (!storage) return false;
    storage.setItem(LOCALE_STORAGE_KEY, locale === "zh" ? "zh" : "en");
    return true;
  } catch {
    return false;
  }
};

export const clearLaunchStorage = (
  storage: LocalStorageAccess | null = getBrowserStorage(),
): boolean => {
  if (!storage) return false;
  let cleared = true;
  for (const key of [
    LAUNCH_STORAGE_KEY,
    ...LEGACY_STORAGE_KEYS,
    LOCALE_STORAGE_KEY,
  ]) {
    try {
      storage.removeItem(key);
    } catch {
      cleared = false;
    }
  }
  return cleared;
};

export const parsedMealToEntry = (meal: ParsedMeal): MealEntry =>
  normalizeMealEntry({
    ...Object.fromEntries(
      foodFields.map((field, index) => [
        field,
        meal.components
          .filter((component) => component.group === foodGroups[index])
          .map((component) => component.name),
      ]),
    ),
    cookingMethod: meal.cookingMethod,
    mealSource: meal.mealSource,
    portion: meal.portion.size,
    componentDetails: meal.components,
  });

export const isMergeContextComponent = (component: ParsedMealComponent) =>
  component.group === "other" &&
  ["Mixed meal sources:", "Mixed preparation:", "Combined portions:"].some(
    (prefix) => component.name.startsWith(prefix),
  );
const hasFood = (meal: MealEntry) =>
  foodFields.some((field) => meal[field].length > 0) ||
  meal.componentDetails.some(
    (component) =>
      component.name.trim().length > 0 && !isMergeContextComponent(component),
  );
const materializeDetails = (meal: MealEntry) => {
  const details = meal.componentDetails.map((component) => ({
    ...component,
    amount: { ...component.amount },
  }));
  foodFields.forEach((field, index) => {
    meal[field].forEach((name) => {
      if (
        !details.some(
          (component) =>
            component.group === foodGroups[index] &&
            component.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
        )
      ) {
        details.push({
          name,
          group: foodGroups[index],
          amount: {
            quantity: null,
            unit: "unspecified",
            qualifier: "unspecified",
            originalText: null,
          },
          confidence: "limited",
        });
      }
    });
  });
  return details;
};

export const mergeMealEntries = (
  existing: MealEntry,
  incoming: MealEntry,
): MealEntry => {
  const first = normalizeMealEntry(existing);
  const second = normalizeMealEntry(incoming);
  if (!hasFood(first)) return second;
  if (!hasFood(second)) return first;
  const details = materializeDetails(first);
  materializeDetails(second).forEach((component) => {
    const compatible = details.find(
      (previous) =>
        previous.group === component.group &&
        previous.name.toLocaleLowerCase() ===
          component.name.toLocaleLowerCase() &&
        previous.amount.quantity !== null &&
        component.amount.quantity !== null &&
        previous.amount.unit === component.amount.unit &&
        previous.amount.unit !== "unspecified" &&
        previous.amount.qualifier !== "unspecified" &&
        component.amount.qualifier !== "unspecified",
    );
    if (compatible) {
      compatible.amount.quantity =
        Math.round(
          ((compatible.amount.quantity ?? 0) +
            (component.amount.quantity ?? 0)) *
            1_000_000,
        ) / 1_000_000;
      compatible.amount.qualifier =
        compatible.amount.qualifier === "exact" &&
        component.amount.qualifier === "exact"
          ? "exact"
          : "approximate";
      compatible.amount.originalText =
        [compatible.amount.originalText, component.amount.originalText]
          .filter(Boolean)
          .join(" + ") || null;
      compatible.confidence =
        confidence[
          Math.min(
            confidence.indexOf(compatible.confidence),
            confidence.indexOf(component.confidence),
          )
        ];
    } else details.push(component);
  });
  const contextNotes: string[] = [];
  if (first.mealSource !== second.mealSource)
    contextNotes.push(
      `Mixed meal sources: ${first.mealSource} + ${second.mealSource}. Review source.`,
    );
  if (first.cookingMethod !== second.cookingMethod)
    contextNotes.push(
      `Mixed preparation: ${first.cookingMethod} + ${second.cookingMethod}. Review preparation.`,
    );
  if (first.portion !== second.portion)
    contextNotes.push(
      `Combined portions: ${first.portion} + ${second.portion}. Review overall portion.`,
    );
  contextNotes.forEach((name) =>
    details.push({
      name,
      group: "other",
      amount: {
        quantity: null,
        unit: "unspecified",
        qualifier: "unspecified",
        originalText: null,
      },
      confidence: "limited",
    }),
  );
  return {
    ...(Object.fromEntries(
      foodFields.map((field) => [
        field,
        textList([...first[field], ...second[field]]),
      ]),
    ) as Pick<MealEntry, (typeof foodFields)[number]>),
    cookingMethod:
      first.cookingMethod === second.cookingMethod
        ? first.cookingMethod
        : "Other",
    mealSource:
      first.mealSource === second.mealSource ? first.mealSource : "Unspecified",
    portion: first.portion === second.portion ? first.portion : "Unspecified",
    componentDetails: details,
  };
};

export const savePlan = (
  state: LaunchState,
  mealId: string,
  now = new Date(),
): LaunchState => {
  if (
    !catalogIds.has(mealId) ||
    state.plannedMeals.some((plan) => plan.mealId === mealId)
  )
    return state;
  const createdAt = now.toISOString();
  return {
    ...state,
    plannedMeals: [
      { id: `plan-${mealId}-${now.getTime().toString(36)}`, mealId, createdAt },
      ...state.plannedMeals,
    ].slice(0, MAX_PLANNED_MEALS),
  };
};

export const removePlan = (
  state: LaunchState,
  planId: string,
): LaunchState => ({
  ...state,
  plannedMeals: state.plannedMeals.filter((plan) => plan.id !== planId),
});

export const createLocalDataExport = (
  state: LaunchState,
  locale: Locale,
  now = new Date(),
) => ({
  format: "nextbite-local-data",
  version: 1,
  exportedAt: now.toISOString(),
  locale: locale === "zh" ? "zh" : "en",
  data: normalizeState(state, now),
});

export const downloadLocalData = (state: LaunchState, locale: Locale): void => {
  const exported = createLocalDataExport(state, locale);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `nextbite-data-${exported.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

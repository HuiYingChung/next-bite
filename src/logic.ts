import { recommendationDataset } from "./data";
import type {
  DailyStatus,
  DayHistory,
  Locale,
  MealEntry,
  Profile,
  Recommendation,
  RecommendationCardLabel,
  ScoredRecommendation,
  ScoreBreakdownItem,
  TodayIntakeSummary,
  TodayLog,
} from "./types";

type MealTimeWindow = "breakfast" | "lunch" | "dinner" | "late";

const levelToPoints = { low: 1, medium: 2, high: 3 } as const;
const convenienceToPoints = { low: 1, medium: 2, high: 3 } as const;

const avoidKeywordMap: Record<string, string[]> = {
  "Fried food": ["fried", "fried rice", "crispy"],
  Beef: ["beef"],
  Pork: ["pork", "ham", "bacon"],
  Lamb: ["lamb"],
  "Organ meats": ["organ", "liver", "tripe"],
  Egg: ["egg"],
  Dairy: ["dairy", "milk", "yogurt", "greek yogurt", "cottage cheese", "cheese", "caesar", "mayo"],
  Shellfish: ["shrimp", "crab", "shellfish"],
  "Fishy seafood": ["fish", "salmon", "tuna", "cod", "shrimp", "crab", "shellfish", "poke", "seafood"],
  "Spicy food": ["spicy", "kimchi"],
  "Raw food": ["salad", "poke", "cold"],
  "Cold food": ["salad", "poke", "cold"],
  "Sweet drinks": ["milk tea", "boba", "sweet drink", "juice", "soda"],
  "Processed food": ["sausage", "bacon", "ham", "ready-made", "sub", "combo"],
  "Large portions": ["hearty", "filling", "bento", "burrito", "combo", "gyro"],
  "Late-night heavy meals": ["hearty", "comfort", "dumplings", "burrito", "combo", "curry"],
  Cilantro: ["cilantro"],
  Celery: ["celery"],
  "Bitter melon": ["bitter melon"],
  Eggplant: ["eggplant"],
  Okra: ["okra"],
  "Green bell pepper": ["bell pepper"],
};

const preferenceTagMap: Record<string, string[]> = {
  "Chinese-style": ["chinese-style", "comfort", "warm", "mapo"],
  "Taiwanese-style": ["taiwanese-style", "bento"],
  Japanese: ["japanese-inspired", "set-meal", "soba", "udon"],
  Korean: ["korean-inspired", "kimchi", "bibimbap"],
  "American light meals": ["american-light", "sandwich", "wrap"],
  "Bowl meals": ["bowl", "rice bowl", "grain bowl", "poke bowl", "bibimbap"],
  "Set meals": ["set-meal", "set meal", "bento", "plate"],
  "Wraps / sandwiches": ["wrap", "sandwich"],
  "Portable meals": ["portable", "wrap", "sandwich", "hand roll"],
  "Soupy meals": ["soupy", "soup", "congee"],
  "Rice-based meals": ["rice-based", "bowl"],
  "Noodle-based meals": ["noodle", "udon", "soba"],
  "High-protein": ["high-protein"],
  "Light meals": ["light", "gentle"],
  "Warm meals": ["warm", "soupy", "comfort", "steamed"],
  "Comfort meals": ["comfort", "gentle", "congee", "soup", "curry"],
  "Quick grocery meals": ["quick", "ready-made", "rotisserie", "microwave", "grocery"],
  "Takeout-friendly": ["takeout", "convenient", "portable", "quick"],
  "Vegetable-forward": ["vegetable-forward", "vegetable", "greens", "salad", "bok choy", "broccoli", "cabbage"],
  "Breakfast-for-dinner": ["breakfast-for-dinner", "omelet", "toast", "egg"],
  "Plant-protein": ["plant-protein", "tofu", "beans", "chickpeas", "edamame", "tempeh"],
  Mediterranean: ["mediterranean", "gyro", "hummus"],
  "Mexican-inspired": ["mexican-inspired", "burrito", "fajita", "quesadilla", "chili"],
};

const createBreakdownItem = (category: ScoreBreakdownItem["category"], points: number, note: string): ScoreBreakdownItem => ({
  category,
  points,
  note,
});

export const getMealTimeWindow = (date: Date) => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "breakfast" as MealTimeWindow;
  if (hour >= 11 && hour < 15) return "lunch" as MealTimeWindow;
  if (hour >= 17 && hour < 21) return "dinner" as MealTimeWindow;
  return "late" as MealTimeWindow;
};

const getMealFormats = (meal: Recommendation) => {
  const tags = meal.tags.map((tag) => tag.toLowerCase());
  const formats = new Set<string>();

  if (tags.some((tag) => tag.includes("soupy") || tag.includes("soup"))) formats.add("soup");
  if (tags.some((tag) => tag.includes("bowl"))) formats.add("bowl");
  if (tags.some((tag) => tag.includes("wrap") || tag.includes("sandwich") || tag.includes("portable"))) formats.add("portable");
  if (tags.some((tag) => tag.includes("set-meal") || tag.includes("bento"))) formats.add("set");
  if (tags.some((tag) => tag.includes("plate"))) formats.add("plate");
  if (tags.some((tag) => tag.includes("breakfast-for-dinner"))) formats.add("breakfast");
  if (tags.some((tag) => tag.includes("cold-meal"))) formats.add("cold");
  if (tags.some((tag) => tag.includes("warm") || tag.includes("comfort"))) formats.add("warm");

  if (formats.size === 0) formats.add(meal.mealType);
  return [...formats];
};

export const flattenMeals = (todayLog: TodayLog) => Object.values(todayLog);

const flattenHistoryMeals = (history: DayHistory[]) => history.flatMap((day) => flattenMeals(day.todayLog)).filter(isMealLogged);

const toStatus = (value: number, lowMax: number, mediumMax: number): DailyStatus => {
  if (value <= lowMax) return "low";
  if (value <= mediumMax) return "medium";
  return "high";
};

// Meal logging is intentionally lightweight, so we use rough "meal units"
// instead of raw item counts. This makes each logged meal matter more and
// keeps small edits visible in the recommendations.
const getCategoryUnits = (items: string[]) => {
  if (items.length === 0) return 0;
  return 1 + Math.min(items.length - 1, 2) * 0.5;
};

const getHeavinessUnits = (meal: MealEntry) => {
  let value = 0;

  if (meal.portion === "Large") value += 1.5;
  else if (meal.portion === "Medium" && isMealLogged(meal)) value += 0.25;

  if (meal.cookingMethod === "Fried") value += 1.5;
  else if (meal.cookingMethod === "Stir-fried") value += 0.75;
  else if (meal.cookingMethod === "Soup / stew") value -= 0.25;

  return Math.max(0, value);
};

const getFriedOilyUnits = (meal: MealEntry) => {
  if (meal.cookingMethod === "Fried") return 2;
  if (meal.cookingMethod === "Stir-fried") return 1;
  return 0;
};

const getConvenienceUnits = (meal: MealEntry) => {
  if (meal.mealSource === "Ready-made") return 1.25;
  if (meal.mealSource === "Takeout" || meal.mealSource === "Restaurant") return 1;
  return 0;
};

const sweetDrinkKeywords = ["milk tea", "boba", "soda", "sweet drink", "sports drink", "energy drink", "orange juice", "apple juice", "smoothie"];
const alcoholKeywords = ["beer", "wine", "cocktail", "alcohol"];
const dessertSnackKeywords = [
  "cake",
  "cupcake",
  "brownie",
  "donut",
  "cheesecake",
  "ice cream",
  "ice cream bar",
  "frozen yogurt",
  "pudding",
  "cookies",
  "cookie sandwich",
  "chocolate",
  "muffin",
  "pastry",
];

const serializeMeal = (meal: Recommendation) => [meal.title, meal.description, ...meal.tags, ...meal.avoidTags].join(" ").toLowerCase();

const detectMealFormatSignals = (meal: MealEntry) => {
  const riceHeavy = meal.carbs.some((item) => item.toLowerCase().includes("rice") || item.toLowerCase().includes("congee"));
  const noodleHeavy = meal.carbs.some((item) => item.toLowerCase().includes("noodle") || item.toLowerCase().includes("pasta"));
  return {
    riceHeavy,
    noodleHeavy,
    friedLike: meal.cookingMethod === "Fried" || meal.cookingMethod === "Stir-fried",
  };
};

const summarizeWeeklyPatterns = (history: DayHistory[]) => {
  const meals = flattenHistoryMeals(history);
  const riceHeavyCount = meals.filter((meal) => detectMealFormatSignals(meal).riceHeavy).length;
  const noodleHeavyCount = meals.filter((meal) => detectMealFormatSignals(meal).noodleHeavy).length;
  const friedCount = meals.filter((meal) => detectMealFormatSignals(meal).friedLike).length;
  const takeoutCount = meals.filter((meal) => meal.mealSource === "Takeout" || meal.mealSource === "Restaurant").length;
  const homeCount = meals.filter((meal) => meal.mealSource === "Home-cooked").length;
  const vegetableMeals = meals.filter((meal) => meal.vegetables.length > 0).length;

  return {
    mealsCount: meals.length,
    riceHeavyCount,
    noodleHeavyCount,
    friedCount,
    takeoutCount,
    homeCount,
    vegetableMeals,
  };
};

export const summarizeTodayIntake = (todayLog: TodayLog): TodayIntakeSummary => {
  const meals = flattenMeals(todayLog);
  const proteinCount = meals.reduce((sum, meal) => sum + getCategoryUnits(meal.protein), 0);
  const vegetableCount = meals.reduce((sum, meal) => sum + getCategoryUnits(meal.vegetables), 0);
  const carbCount = meals.reduce((sum, meal) => sum + getCategoryUnits(meal.carbs), 0);
  const fruitCount = meals.reduce((sum, meal) => sum + getCategoryUnits(meal.fruit), 0);
  const soupCount = meals.reduce((sum, meal) => sum + getCategoryUnits(meal.soup), 0);
  const drinkCount = meals.reduce((sum, meal) => sum + getCategoryUnits(meal.drink), 0);
  const sweetDrinkCount = meals.reduce(
    (sum, meal) => sum + meal.drink.filter((item) => sweetDrinkKeywords.includes(item.toLowerCase())).length,
    0,
  );
  const alcoholCount = meals.reduce(
    (sum, meal) => sum + meal.drink.filter((item) => alcoholKeywords.includes(item.toLowerCase())).length,
    0,
  );
  const dessertSnackCount = meals.reduce(
    (sum, meal) => sum + meal.carbs.filter((item) => dessertSnackKeywords.includes(item.toLowerCase())).length,
    0,
  );
  const heavyMeals = meals.reduce((sum, meal) => sum + getHeavinessUnits(meal), 0);
  const friedMeals = meals.reduce((sum, meal) => sum + getFriedOilyUnits(meal), 0);
  const convenienceMeals = meals.reduce((sum, meal) => sum + getConvenienceUnits(meal), 0);
  const homeCookedMeals = meals.filter((meal) => meal.mealSource === "Home-cooked").length;
  const takeoutMeals = meals.filter((meal) => meal.mealSource === "Takeout" || meal.mealSource === "Restaurant").length;

  return {
    proteinStatus: toStatus(proteinCount, 1.25, 2.5),
    vegetableStatus: toStatus(vegetableCount, 1.25, 2.5),
    carbStatus: toStatus(carbCount, 1.25, 2.5),
    heavinessStatus: toStatus(heavyMeals, 0.75, 2),
    friedOilyStatus: toStatus(friedMeals, 0.75, 1.75),
    convenienceStatus: toStatus(convenienceMeals, 0.75, 1.75),
    proteinCount,
    vegetableCount,
    carbCount,
    fruitCount,
    soupCount,
    drinkCount,
    sweetDrinkCount,
    alcoholCount,
    dessertSnackCount,
    heavyMeals,
    friedMeals,
    convenienceMeals,
    homeCookedMeals,
    takeoutMeals,
  };
};

export const isMealLogged = (meal: MealEntry) =>
  meal.protein.length > 0 ||
  meal.vegetables.length > 0 ||
  meal.carbs.length > 0 ||
  meal.fruit.length > 0 ||
  meal.soup.length > 0 ||
  meal.drink.length > 0;

export const mealSummaryChips = (meal: MealEntry) => {
  const picked = [...meal.protein, ...meal.vegetables, ...meal.carbs, ...meal.fruit, ...meal.drink].filter(Boolean);
  return picked.slice(0, 4);
};

const scoreProteinBalance = (summary: TodayIntakeSummary, meal: Recommendation) => {
  if (summary.proteinStatus === "low") {
    if (meal.proteinLevel === "high") return createBreakdownItem("protein", 3, "Protein is low today, so high-protein meals get a strong boost.");
    if (meal.proteinLevel === "medium") return createBreakdownItem("protein", 2, "Protein is low today, so medium-protein meals still help.");
  }

  if (summary.proteinStatus === "high" && meal.proteinLevel === "high" && meal.heaviness !== "light") {
    return createBreakdownItem("protein", -1, "Protein is already strong today, so heavier protein-forward meals get a slight pullback.");
  }

  return createBreakdownItem("protein", 0, "Protein fit is neutral for this meal.");
};

const scoreVegetableBalance = (summary: TodayIntakeSummary, meal: Recommendation) => {
  if (summary.vegetableStatus === "low") {
    if (meal.vegetableLevel === "high") return createBreakdownItem("vegetables", 3, "Vegetables are light today, so vegetable-forward meals get priority.");
    if (meal.vegetableLevel === "medium") return createBreakdownItem("vegetables", 2, "Vegetables are still a need, so this gets a moderate boost.");
  }

  if (summary.vegetableStatus !== "low" && meal.vegetableLevel === "high") {
    return createBreakdownItem("vegetables", 1, "Extra vegetables are still a nice plus even though today already has some.");
  }

  return createBreakdownItem("vegetables", 0, "Vegetable fit is neutral for this meal.");
};

const scoreCarbBalance = (summary: TodayIntakeSummary, meal: Recommendation) => {
  if (summary.carbStatus === "high") {
    if (meal.carbLevel === "high") return createBreakdownItem("carbs", -2, "Carbs are already running high today, so carb-heavy meals get reduced.");
    if (meal.carbLevel === "medium") return createBreakdownItem("carbs", 1, "Moderate carbs still fit reasonably well today.");
    return createBreakdownItem("carbs", 2, "Lower-carb meals fit well after a carb-heavier day.");
  }

  return createBreakdownItem("carbs", 0, "Carb balance is neutral for this meal.");
};

const scoreHeavinessBalance = (summary: TodayIntakeSummary, meal: Recommendation) => {
  if (summary.heavinessStatus === "high" || summary.friedOilyStatus === "high") {
    if (meal.heaviness === "light") return createBreakdownItem("heaviness", 3, "Today already feels heavy, so lighter meals move up.");
    if (meal.heaviness === "medium") return createBreakdownItem("heaviness", 1, "Medium-heaviness still works, but less strongly.");
    return createBreakdownItem("heaviness", -3, "Heavy meals get penalized after a heavier or fried day.");
  }

  if (summary.heavinessStatus === "medium") {
    if (meal.heaviness === "light") return createBreakdownItem("heaviness", 2, "A lighter meal still fits well after a medium-feeling day.");
    if (meal.heaviness === "heavy") return createBreakdownItem("heaviness", -1, "Heavier meals get a small penalty here.");
  }

  return createBreakdownItem("heaviness", 0, "Heaviness fit is neutral for this meal.");
};

const scoreConvenienceFit = (summary: TodayIntakeSummary, profile: Profile, meal: Recommendation) => {
  let score = 0;
  const notes: string[] = [];

  if (profile.eatingStyle === "Mostly takeout") {
    if (meal.convenience === "high") {
      score += 3;
      notes.push("High convenience matches a takeout-leaning style.");
    } else if (meal.convenience === "medium") {
      score += 2;
      notes.push("Medium convenience still works for a takeout-leaning style.");
    }
    if (meal.worksFor.includes("takeout")) {
      score += 2;
      notes.push("This meal works well as takeout.");
    }
  }

  if (profile.eatingStyle === "Mostly home-cooked") {
    if (meal.worksFor.includes("home-cooked")) {
      score += 2;
      notes.push("This meal fits a home-cooked routine.");
    }
    if (meal.convenience === "high") {
      score += 1;
      notes.push("It also keeps effort low.");
    }
  }

  if (profile.eatingStyle === "Both") {
    if (meal.worksFor.length > 1) {
      score += 2;
      notes.push("It stays flexible for both home and takeout.");
    } else {
      score += 1;
      notes.push("It still fits one side of a mixed routine.");
    }
  }

  if (summary.convenienceStatus === "high") {
    if (meal.convenience === "high") {
      score += 2;
      notes.push("Today's meals already lean practical, so a high-convenience option fits well.");
    } else if (meal.convenience === "medium") {
      score += 1;
      notes.push("A medium-effort option still fits today's practical rhythm.");
    }
  }

  return createBreakdownItem("convenience", score, notes.join(" ") || "Convenience fit is neutral for this meal.");
};

const estimateFrameNeeds = (profile: Profile) => {
  const heightCm =
    profile.heightUnit === "cm"
      ? Number(profile.heightCm)
      : Number(profile.heightFt || 0) * 30.48 + Number(profile.heightIn || 0) * 2.54;

  const weightKg =
    profile.weightUnit === "kg"
      ? Number(profile.weightKg)
      : Number(profile.weightLb || 0) / 2.20462;

  const taller = Number.isFinite(heightCm) && heightCm >= 175;
  const heavier = Number.isFinite(weightKg) && weightKg >= 75;

  return {
    biggerFrame: taller || heavier,
    smallerFrame:
      Number.isFinite(heightCm) &&
      Number.isFinite(weightKg) &&
      heightCm > 0 &&
      weightKg > 0 &&
      heightCm <= 160 &&
      weightKg <= 55,
  };
};

const scoreProfileFit = (profile: Profile, meal: Recommendation) => {
  let score = 0;
  const notes: string[] = [];
  const { biggerFrame, smallerFrame } = estimateFrameNeeds(profile);

  if (profile.activityLevel === "Active") {
    if (meal.proteinLevel === "high") {
      score += 1;
      notes.push("Higher activity makes stronger protein support a nice fit.");
    }
    if (meal.carbLevel !== "low") {
      score += 1;
      notes.push("A moderate amount of carbs fits a more active routine.");
    }
  }

  if (profile.activityLevel === "Low") {
    if (meal.heaviness === "light") {
      score += 1;
      notes.push("A lighter meal often fits a lower-key day well.");
    }
    if (meal.heaviness === "heavy") {
      score -= 1;
      notes.push("Very heavy meals get a small pullback for a lower-key routine.");
    }
  }

  if (biggerFrame && meal.proteinLevel === "high" && meal.heaviness !== "heavy") {
    score += 1;
    notes.push("A steadier protein-forward meal may fit your usual needs a little better.");
  }

  if (smallerFrame && meal.heaviness === "heavy") {
    score -= 1;
    notes.push("Extra-heavy options get a light pullback here.");
  }

  if (profile.feelToday === "Want something warm") {
    const warmTags = meal.tags.map((tag) => tag.toLowerCase());
    const isSoupyGentle = warmTags.some((tag) => ["soupy", "gentle"].includes(tag));
    const isComfortWarm = warmTags.some((tag) => ["comfort", "warm"].includes(tag));

    if (isSoupyGentle) {
      score += 4;
      notes.push("Soupy or gentler meals are the closest match when you want something warm.");
    } else if (isComfortWarm) {
      score += 3;
      notes.push("Warm and comforting meals fit how you feel today.");
    }
    if (meal.heaviness === "light") {
      score += 1;
      notes.push("Keeping the meal warm without too much heaviness is a nice fit here.");
    }
  }

  if (profile.feelToday === "Need something light") {
    if (meal.heaviness === "light") {
      score += 2;
      notes.push("A lighter meal fits how you want today to feel.");
    } else if (meal.heaviness === "heavy") {
      score -= 2;
      notes.push("Heavier meals get pulled back because you want something lighter today.");
    }
  }

  if (profile.feelToday === "Low energy") {
    if (meal.convenience === "high") {
      score += 2;
      notes.push("Lower-energy days benefit from meals that are easier to follow through on.");
    }
    if (meal.tags.some((tag) => ["comfort", "warm", "soupy"].includes(tag.toLowerCase()))) {
      score += 1;
      notes.push("Something warmer or more comforting can fit a lower-energy day well.");
    }
  }

  if (profile.feelToday === "On period") {
    if (meal.tags.some((tag) => ["warm", "comfort", "soupy", "gentle"].includes(tag.toLowerCase()))) {
      score += 4;
      notes.push("Warmer, gentler meals often feel better for this kind of day.");
    }
    if (meal.proteinLevel === "high" || meal.proteinLevel === "medium") {
      score += 1;
      notes.push("A steadier meal with some protein can be a helpful fit today.");
    }
    if (meal.heaviness === "light") {
      score += 1;
      notes.push("Lighter meals tend to pair better with this kind of day.");
    }
  }

  return createBreakdownItem("profile", score, notes.join(" ") || "Profile fit is neutral for this meal.");
};

const scoreFeelPriority = (profile: Profile, meal: Recommendation) => {
  const tags = meal.tags.map((tag) => tag.toLowerCase());

  if (profile.feelToday === "Want something warm") {
    const warmGentle = tags.some((tag) => ["soupy", "comfort", "gentle"].includes(tag));
    const soupyGentle = tags.some((tag) => ["soupy", "gentle"].includes(tag));
    if (soupyGentle && meal.heaviness === "light") return 4;
    if (warmGentle && meal.heaviness === "light") return 2.5;
    if (soupyGentle) return 2;
    if (tags.includes("warm")) return 1;
  }

  if (profile.feelToday === "On period") {
    const gentleComfort = tags.some((tag) => ["soupy", "comfort", "gentle"].includes(tag));
    if (gentleComfort && meal.heaviness === "light") return 4;
    if (gentleComfort) return 2;
  }

  if (profile.feelToday === "Low energy") {
    const easyAndComforting = meal.convenience === "high" && tags.some((tag) => ["comfort", "warm", "soupy", "grocery", "quick"].includes(tag));
    if (easyAndComforting) return 2;
  }

  if (profile.feelToday === "Need something light" && meal.heaviness === "light") {
    return 1.5;
  }

  return 0;
};

const scorePreferenceFit = (profile: Profile, meal: Recommendation) => {
  let score = 0;
  const mealText = serializeMeal(meal);
  const mealTags = meal.tags.map((tag) => tag.toLowerCase());
  const matches: string[] = [];

  profile.preferenceTags.forEach((tag) => {
    const mapped = preferenceTagMap[tag] ?? [tag.toLowerCase()];
    if (mapped.some((keyword) => mealText.includes(keyword.toLowerCase()))) {
      score += 2;
      matches.push(tag);

      // Give a small extra bump to direct cuisine/style matches so narrower
      // preference-driven meals are not always crowded out by more generic bowls.
      if (
        (tag === "Korean" && mealTags.includes("korean-inspired")) ||
        (tag === "Taiwanese-style" && mealTags.includes("taiwanese-style")) ||
        (tag === "Chinese-style" && mealTags.includes("chinese-style")) ||
        (tag === "Mediterranean" && mealTags.includes("mediterranean")) ||
        (tag === "Mexican-inspired" && mealTags.includes("mexican-inspired")) ||
        (tag === "Japanese" && mealTags.includes("japanese-inspired"))
      ) {
        score += 1;
      }
    }
  });

  const capped = Math.min(score, 8);
  return createBreakdownItem("preferences", capped, matches.length > 0 ? `Matches your preferences for ${matches.join(", ")}.` : "No strong preference match here.");
};

const scoreAvoidConflicts = (profile: Profile, meal: Recommendation) => {
  let score = 0;
  const mealText = serializeMeal(meal);
  const conflicts: string[] = [];
  const mealTags = meal.tags.map((tag) => tag.toLowerCase());

  profile.avoidTags.forEach((avoid) => {
    const normalized = avoid.toLowerCase();
    if (meal.avoidTags.map((tag) => tag.toLowerCase()).includes(normalized)) {
      score -= 3;
      conflicts.push(avoid);
      return;
    }

    const matchedKeywords = avoidKeywordMap[avoid];
    if (matchedKeywords?.some((keyword) => mealText.includes(keyword))) {
      score -= 3;
      conflicts.push(avoid);
      return;
    }

    // A few avoid tags map more naturally to the structured meal metadata than raw text.
    if (avoid === "Fried food" && mealText.includes("fried")) {
      score -= 3;
      conflicts.push(avoid);
      return;
    }

    if (avoid === "Large portions" && meal.heaviness === "heavy") {
      score -= 2;
      conflicts.push(avoid);
      return;
    }

    if (avoid === "Late-night heavy meals" && meal.heaviness !== "light") {
      score -= meal.heaviness === "heavy" ? 3 : 1;
      conflicts.push(avoid);
      return;
    }

    if ((avoid === "Cold food" || avoid === "Raw food") && mealTags.includes("cold-meal")) {
      score -= 3;
      conflicts.push(avoid);
    }
  });

  return createBreakdownItem("avoid", score, conflicts.length > 0 ? `Conflicts with avoid tags: ${conflicts.join(", ")}.` : "No avoid-tag conflicts detected.");
};

const scoreVariety = (todayLog: TodayLog, meal: Recommendation) => {
  const meals = flattenMeals(todayLog);
  const riceHeavyCount = meals.filter((entry) => detectMealFormatSignals(entry).riceHeavy).length;
  const noodleHeavyCount = meals.filter((entry) => detectMealFormatSignals(entry).noodleHeavy).length;
  const repeatedProteins = [...meals.reduce<Map<string, number>>((map, entry) => {
    entry.protein.forEach((item) => {
      const normalized = item.toLowerCase();
      map.set(normalized, (map.get(normalized) ?? 0) + 1);
    });
    return map;
  }, new Map())]
    .filter(([, count]) => count >= 2)
    .map(([protein]) => protein);
  let score = 0;
  const notes: string[] = [];
  const mealText = serializeMeal(meal);

  if (riceHeavyCount >= 2 && meal.tags.some((tag) => ["rice-based", "bowl"].includes(tag.toLowerCase()))) {
    score -= 1;
    notes.push("Slightly reduced because today already had multiple rice-style meals.");
  }
  if (noodleHeavyCount >= 2 && meal.tags.some((tag) => tag.toLowerCase().includes("noodle"))) {
    score -= 1;
    notes.push("Slightly reduced because noodles already showed up a lot today.");
  }
  if (repeatedProteins.some((protein) => mealText.includes(protein))) {
    score -= 2;
    notes.push("Reduced because this repeats a protein that already showed up multiple times today.");
  }

  return createBreakdownItem("variety", score, notes.join(" ") || "Variety fit is neutral for this meal.");
};

const scoreSnackDrinkFit = (summary: TodayIntakeSummary, meal: Recommendation) => {
  let score = 0;
  const notes: string[] = [];

  if (summary.sweetDrinkCount + summary.dessertSnackCount >= 2) {
    if (meal.vegetableLevel === "high") {
      score += 2;
      notes.push("Sweeter snacks or drinks already showed up today, so meals with more vegetables move up.");
    } else if (meal.heaviness === "light") {
      score += 1;
      notes.push("A lighter meal can feel like a steadier next step after sweeter snacks or drinks.");
    }
  }

  if (summary.alcoholCount >= 1) {
    if (meal.heaviness === "light") {
      score += 2;
      notes.push("A lighter meal often fits better after alcohol earlier in the day.");
    }
    if (meal.vegetableLevel !== "low" || meal.proteinLevel !== "low") {
      score += 1;
      notes.push("Meals with some protein or vegetables tend to feel steadier here.");
    }
  }

  return createBreakdownItem("snack-drink", score, notes.join(" ") || "Snack and drink fit is neutral for this meal.");
};

const scoreTimeOfDayFit = (timeWindow: MealTimeWindow, meal: Recommendation) => {
  const tags = meal.tags.map((tag) => tag.toLowerCase());
  let score = 0;
  const notes: string[] = [];

  if (timeWindow === "breakfast") {
    if (tags.includes("breakfast-for-dinner") || tags.includes("quick")) {
      score += 2;
      notes.push("This fits an earlier-in-the-day meal window.");
    } else if (meal.heaviness === "heavy") {
      score -= 1;
      notes.push("Heavier options get a small pullback earlier in the day.");
    }
  }

  if (timeWindow === "lunch") {
    if (meal.mealType === "balanced" || tags.includes("bowl") || tags.includes("plate")) {
      score += 1;
      notes.push("This fits a more standard lunch-style meal.");
    }
  }

  if (timeWindow === "dinner") {
    if (tags.includes("breakfast-for-dinner")) {
      score -= 1;
      notes.push("Breakfast-style meals stay possible at dinner, but get a small pullback.");
    }
    if (tags.some((tag) => ["warm", "comfort", "soupy", "set-meal", "plate"].includes(tag))) {
      score += 1;
      notes.push("Warmer or more complete meals fit dinner a little better.");
    }
  }

  if (timeWindow === "late") {
    if (meal.heaviness === "light") {
      score += 2;
      notes.push("Lighter meals fit a later meal window better.");
    }
    if (tags.some((tag) => ["soupy", "gentle", "warm"].includes(tag))) {
      score += 1;
      notes.push("Warm, gentler meals are a good fit later on.");
    }
    if (meal.heaviness === "heavy") {
      score -= 2;
      notes.push("Heavy meals get pulled back later in the day.");
    }
  }

  return createBreakdownItem("time-of-day", score, notes.join(" ") || "Time-of-day fit is neutral for this meal.");
};

const scoreWeeklyPatternFit = (history: DayHistory[], meal: Recommendation) => {
  const weekly = summarizeWeeklyPatterns(history);
  if (weekly.mealsCount === 0) {
    return createBreakdownItem("weekly-pattern", 0, "Not enough weekly data yet to shape this recommendation.");
  }

  let score = 0;
  const notes: string[] = [];
  const lowerTags = meal.tags.map((tag) => tag.toLowerCase());

  if (weekly.riceHeavyCount >= 4 && lowerTags.some((tag) => tag.includes("rice-based") || tag.includes("bowl"))) {
    score -= 1;
    notes.push("Your recent week already leaned rice-heavy, so this gets a small variety penalty.");
  }

  if (weekly.noodleHeavyCount >= 4 && lowerTags.some((tag) => tag.includes("noodle") || tag.includes("udon") || tag.includes("soba"))) {
    score -= 1;
    notes.push("Noodles already showed up often this week, so this is slightly less distinct.");
  }

  if (weekly.friedCount >= 3) {
    if (meal.heaviness === "light") {
      score += 2;
      notes.push("The week has already had some heavier meals, so lighter options move up.");
    } else if (meal.heaviness === "heavy") {
      score -= 2;
      notes.push("Heavier meals get pulled back after a heavier week.");
    }
  }

  if (weekly.vegetableMeals < Math.max(4, Math.ceil(weekly.mealsCount * 0.45))) {
    if (meal.vegetableLevel === "high") {
      score += 2;
      notes.push("Vegetables have been a bit light across the week, so this gets a boost.");
    } else if (meal.vegetableLevel === "medium") {
      score += 1;
      notes.push("This helps bring vegetables back into the weekly mix.");
    }
  }

  if (weekly.takeoutCount > weekly.homeCount && meal.worksFor.includes("takeout")) {
    score += 1;
    notes.push("This fits the more takeout-leaning rhythm from recent days.");
  }

  if (weekly.homeCount > weekly.takeoutCount && meal.worksFor.includes("home-cooked")) {
    score += 1;
    notes.push("This fits the more home-style rhythm from recent days.");
  }

  return createBreakdownItem("weekly-pattern", score, notes.join(" ") || "Weekly pattern fit is neutral for this meal.");
};

const scoreBalanceBias = (summary: TodayIntakeSummary, meal: Recommendation) => {
  const protein = scoreProteinBalance(summary, meal);
  const vegetables = scoreVegetableBalance(summary, meal);
  const carbs = scoreCarbBalance(summary, meal);
  const heaviness = scoreHeavinessBalance(summary, meal);

  return {
    items: [protein, vegetables, carbs, heaviness],
    total: protein.points + vegetables.points + carbs.points + heaviness.points,
  };
};

const scoreOverallFit = (summary: TodayIntakeSummary, todayLog: TodayLog, profile: Profile, meal: Recommendation) =>
  scoreBalanceBias(summary, meal).total +
  scoreConvenienceFit(summary, profile, meal).points +
  scoreProfileFit(profile, meal).points +
  scorePreferenceFit(profile, meal).points +
  scoreAvoidConflicts(profile, meal).points +
  scoreVariety(todayLog, meal).points +
  scoreSnackDrinkFit(summary, meal).points;

const trendLabelMap: Record<string, { en: string; zh: string }> = {
  "Rice-based meals": { en: "rice-based meals", zh: "飯類餐點" },
  "Noodle-based meals": { en: "noodle-based meals", zh: "麵類餐點" },
  "Soupy meals": { en: "soupy meals", zh: "湯類餐點" },
  "Warm meals": { en: "warm meals", zh: "溫熱餐點" },
  "Light meals": { en: "lighter meal formats", zh: "比較清爽的餐型" },
  "Takeout-friendly": { en: "takeout-friendly choices", zh: "外帶友善的選擇" },
  "Quick grocery meals": { en: "quick grocery meals", zh: "超市快速組合餐" },
  "Plant-protein": { en: "plant-protein options", zh: "植物性蛋白選項" },
  "Vegetable-forward": { en: "vegetable-forward meals", zh: "蔬菜比例較高的餐點" },
  "Portable meals": { en: "portable meals", zh: "方便攜帶的餐點" },
};

const observedTrendLabelMap: Record<string, { en: string; zh: string }> = {
  "rice-based meals": { en: "rice-based meals", zh: "飯類餐點" },
  "noodle-based meals": { en: "noodle-based meals", zh: "麵類餐點" },
  "soupy meals": { en: "soupy meals", zh: "湯類餐點" },
  "warm meals": { en: "warm meals", zh: "溫熱餐點" },
  "lighter meal formats": { en: "lighter meal formats", zh: "比較清爽的餐型" },
  "takeout-friendly choices": { en: "takeout-friendly choices", zh: "外帶友善的選擇" },
  "home-style meals": { en: "home-style meals", zh: "家常型餐點" },
  "plant-protein options": { en: "plant-protein options", zh: "植物性蛋白選項" },
  "vegetable-forward meals": { en: "vegetable-forward meals", zh: "蔬菜比例較高的餐點" },
  "portable meals": { en: "portable meals", zh: "方便攜帶的餐點" },
};

const joinList = (items: string[], locale: Locale) => {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return locale === "en" ? `${items[0]} and ${items[1]}` : `${items[0]}和${items[1]}`;
  return locale === "en"
    ? `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`
    : `${items.slice(0, -1).join("、")}和${items[items.length - 1]}`;
};

const describeTrend = (key: string, locale: Locale) => trendLabelMap[key]?.[locale] ?? key;
const describeObservedTrend = (key: string, locale: Locale) => observedTrendLabelMap[key]?.[locale] ?? key;

const getPrimaryReason = (summary: TodayIntakeSummary, profile: Profile, meal: Recommendation, locale: Locale) => {
  if ((summary.sweetDrinkCount + summary.dessertSnackCount >= 2) && meal.vegetableLevel === "high") {
    return locale === "en"
      ? "A steadier next meal if snacks or sweeter drinks already showed up earlier."
      : "如果前面已經有點心或偏甜飲料，這會是更穩一點的下一餐。";
  }

  if (summary.alcoholCount >= 1 && meal.heaviness === "light") {
    return locale === "en"
      ? "A lighter option that can feel more comfortable after drinks earlier in the day."
      : "如果今天前面有喝酒，這會是比較舒服、也比較輕一點的選擇。";
  }

  if (summary.vegetableStatus === "low" && meal.vegetableLevel === "high" && meal.proteinLevel !== "low") {
    return locale === "en"
      ? "Good for adding more vegetables and steady protein after a lighter produce day."
      : "很適合在今天蔬菜偏少的情況下，補回一些蔬菜和穩定蛋白質。";
  }

  if ((summary.heavinessStatus === "high" || summary.friedOilyStatus === "high") && meal.heaviness === "light") {
    return locale === "en"
      ? "A lighter option if today's meals already felt heavy."
      : "如果今天前面幾餐已經偏重，這會是比較輕盈的下一餐。";
  }

  if (meal.convenience === "high") {
    return locale === "en" ? "Practical when you want balance with minimal effort." : "想吃得比較平衡、又不想太費力時，這個很實際。";
  }

  if (scorePreferenceFit(profile, meal).points > 0) {
    return locale === "en" ? "Fits your saved preferences without feeling one-note." : "符合你平常的偏好，同時又不會太單調。";
  }

  return locale === "en"
    ? "A realistic next meal that keeps things balanced and easy to act on."
    : "是一個實際、平衡，也容易立刻執行的下一餐選擇。";
};

export const buildRecommendationReason = (
  label: RecommendationCardLabel,
  summary: TodayIntakeSummary,
  profile: Profile,
  meal: Recommendation,
  locale: Locale,
) => {
  if (label === "Most Convenient") {
    if (meal.convenience === "high") return locale === "en" ? "A low-friction option when you want something practical and easy to follow through on." : "想吃得實際、又容易做到時，這是一個低阻力的選擇。";
    if (scorePreferenceFit(profile, meal).points > 0) return locale === "en" ? "Keeps things convenient while still lining up with the styles you usually enjoy." : "在保持方便的同時，也還是貼近你平常喜歡的餐型。";
    return locale === "en" ? "An easier next step that still keeps the meal feeling reasonably balanced." : "是個更容易執行的下一步，也還保留了基本的平衡感。";
  }

  if (label === "Best Balance") {
    if (summary.vegetableStatus === "low" && meal.vegetableLevel !== "low") return locale === "en" ? "A steadier choice for bringing protein, vegetables, and overall balance back into the day." : "如果今天蔬菜偏少，這會是比較穩的選擇，能把蛋白質、蔬菜和整體平衡補回來。";
    if ((summary.heavinessStatus === "high" || summary.friedOilyStatus === "high") && meal.heaviness === "light") return locale === "en" ? "A gentler pick when the earlier meals already carried more weight." : "如果前面幾餐已經偏重，這會是更溫和一點的選擇。";
    return locale === "en" ? "A more balanced pick for keeping the next meal supportive and not overcomplicated." : "是比較平衡的一張卡，讓下一餐有支持感，但不會太複雜。";
  }

  return getPrimaryReason(summary, profile, meal, locale);
};

const getBaseBalanceNote = (meal: Recommendation, locale: Locale) => {
  const parts: string[] = [];
  if (meal.proteinLevel === "high") parts.push(locale === "en" ? "strong on protein" : "蛋白質很穩");
  else if (meal.proteinLevel === "medium") parts.push(locale === "en" ? "steady on protein" : "蛋白質適中");
  if (meal.vegetableLevel === "high") parts.push(locale === "en" ? "good vegetable coverage" : "蔬菜比例不錯");
  else if (meal.vegetableLevel === "medium") parts.push(locale === "en" ? "some vegetables built in" : "有帶一些蔬菜");
  if (meal.carbLevel === "low") parts.push(locale === "en" ? "lighter on carbs" : "碳水比較輕");
  else if (meal.carbLevel === "medium") parts.push(locale === "en" ? "moderate carbs" : "碳水適中");
  return parts.slice(0, 2).join(locale === "en" ? " with " : "，");
};

export const generateBalanceNote = (label: RecommendationCardLabel, meal: Recommendation, locale: Locale) => {
  const base = getBaseBalanceNote(meal, locale);

  if (label === "Most Convenient") return locale === "en" ? `${base}; easier to pull off on a busy day.` : `${base}；忙碌的日子也比較容易做到。`;
  if (label === "Best Balance") return locale === "en" ? `${base}; a steadier overall composition.` : `${base}；整體組合更穩一些。`;
  return base;
};

export const scoreMealOption = (summary: TodayIntakeSummary, todayLog: TodayLog, history: DayHistory[], profile: Profile, meal: Recommendation, timeWindow: MealTimeWindow, locale: Locale): ScoredRecommendation => {
  const balance = scoreBalanceBias(summary, meal);
  const convenience = scoreConvenienceFit(summary, profile, meal);
  const profileFit = scoreProfileFit(profile, meal);
  const preferences = scorePreferenceFit(profile, meal);
  const avoid = scoreAvoidConflicts(profile, meal);
  const variety = scoreVariety(todayLog, meal);
  const snackDrink = scoreSnackDrinkFit(summary, meal);
  const timeOfDay = scoreTimeOfDayFit(timeWindow, meal);
  const weeklyPattern = scoreWeeklyPatternFit(history, meal);
  const balanceScore = balance.total;
  const convenienceScore = convenience.points;
  const preferenceScore = preferences.points;
  const avoidScore = avoid.points;
  const varietyScore = variety.points;
  const weeklyPatternScore = weeklyPattern.points;
  const score = balanceScore + convenienceScore + profileFit.points + preferenceScore + avoidScore + varietyScore + snackDrink.points + timeOfDay.points + weeklyPatternScore;

  return {
    ...meal,
    score,
    balanceScore,
    convenienceScore,
    preferenceScore,
    avoidScore,
    varietyScore,
    weeklyPatternScore,
    label: "Best Match",
    shortReason: buildRecommendationReason("Best Match", summary, profile, meal, locale),
    balanceNote: generateBalanceNote("Best Match", meal, locale),
    convenienceLabel: locale === "en" ? meal.convenience.charAt(0).toUpperCase() + meal.convenience.slice(1) : meal.convenience === "high" ? "高" : meal.convenience === "medium" ? "中" : "低",
    scoreBreakdown: [...balance.items, convenience, profileFit, preferences, avoid, variety, snackDrink, timeOfDay, weeklyPattern],
  };
};

export const dedupeRecommendations = (items: ScoredRecommendation[]) => {
  const pickedTitles = new Set<string>();

  return items.filter((item) => {
    if (pickedTitles.has(item.title)) return false;
    pickedTitles.add(item.title);
    return true;
  });
};

const FAIRNESS_SCORE_WINDOW = 3;
const FAIRNESS_MIN_POOL = 6;
const FAIRNESS_MAX_POOL = 12;

const genericFairnessTags = new Set([
  "balanced",
  "light",
  "warm",
  "comfort",
  "everyday",
  "quick",
  "convenient",
  "takeout",
  "bowl",
  "plate",
  "portable",
  "high-protein",
  "rice-based",
  "savory",
  "flavorful",
]);

const datasetTagFrequency = recommendationDataset.reduce<Map<string, number>>((map, meal) => {
  meal.tags.forEach((tag) => {
    const normalized = tag.toLowerCase();
    map.set(normalized, (map.get(normalized) ?? 0) + 1);
  });
  return map;
}, new Map());

const stableHash = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const getFairnessExposureBonus = (meal: Recommendation) => {
  let bonus = 0;

  meal.tags.forEach((tag) => {
    const normalized = tag.toLowerCase();
    if (genericFairnessTags.has(normalized)) return;

    const frequency = datasetTagFrequency.get(normalized) ?? 0;
    if (frequency > 0 && frequency <= 3) bonus += 0.9;
    else if (frequency <= 5) bonus += 0.55;
    else if (frequency <= 8) bonus += 0.25;
  });

  const title = meal.title.toLowerCase();
  if (title.includes("porridge") || title.includes("congee")) bonus += 0.5;
  if (title.includes("sub")) bonus += 0.45;
  if (title.includes("mapo")) bonus += 1.15;
  else if (title.includes("beef and tomato") || title.includes("scallion")) bonus += 0.6;
  if (title.includes("minced pork") || title.includes("protein bowl")) bonus += 0.45;
  if (title.includes("taiwanese minced pork")) bonus += 0.9;
  if (meal.tags.some((tag) => ["chinese-style", "taiwanese-style", "home-style", "simple"].includes(tag.toLowerCase()))) {
    bonus += 0.35;
  }

  return Math.min(1.6, bonus);
};

const getAdjustedRank = (
  item: ScoredRecommendation,
  pickedFormats: Set<string>,
  rankBy: (item: ScoredRecommendation) => number,
) => {
  const formats = getMealFormats(item);
  const formatPenalty = formats.some((format) => pickedFormats.has(format)) ? 1.5 : 0;
  const fairnessExposureBonus = getFairnessExposureBonus(item);
  return rankBy(item) + fairnessExposureBonus - formatPenalty;
};

const getFairCandidatePool = (
  source: ScoredRecommendation[],
  picked: Set<string>,
  pickedFormats: Set<string>,
  rankBy: (item: ScoredRecommendation) => number,
) => {
  const ranked = source
    .filter((item) => !picked.has(item.id))
    .map((item) => ({
      item,
      adjustedRank: getAdjustedRank(item, pickedFormats, rankBy),
    }))
    .sort((a, b) => b.adjustedRank - a.adjustedRank);

  if (ranked.length === 0) return [];

  const topRank = ranked[0].adjustedRank;
  const closeEnough = ranked.filter(({ adjustedRank }) => topRank - adjustedRank <= FAIRNESS_SCORE_WINDOW);
  const poolSize = Math.min(
    FAIRNESS_MAX_POOL,
    Math.max(FAIRNESS_MIN_POOL, closeEnough.length > 0 ? closeEnough.length : 1, ranked.length >= FAIRNESS_MIN_POOL ? FAIRNESS_MIN_POOL : ranked.length),
  );

  return ranked.slice(0, poolSize);
};

const pickFromFairPool = (
  label: RecommendationCardLabel,
  rotationSeed: string,
  pool: Array<{ item: ScoredRecommendation; adjustedRank: number }>,
) => {
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0].item;

  const topRank = pool[0].adjustedRank;
  const closePool = pool.filter(({ adjustedRank }) => topRank - adjustedRank <= FAIRNESS_SCORE_WINDOW);
  const usablePool = closePool.length > 0 ? closePool : pool;
  const rotationIndex = stableHash(`${label}:${rotationSeed}`) % usablePool.length;
  return usablePool[rotationIndex].item;
};

const pickRecommendation = (
  label: RecommendationCardLabel,
  summary: TodayIntakeSummary,
  profile: Profile,
  locale: Locale,
  rotationSeed: string,
  source: ScoredRecommendation[],
  picked: Set<string>,
  pickedFormats: Set<string>,
  rankBy: (item: ScoredRecommendation) => number,
) => {
  // Build a small candidate pool of close-scoring meals so the same strong item
  // does not always monopolize the top slot when several options are similarly good.
  const fairPool = getFairCandidatePool(source, picked, pickedFormats, rankBy);
  const next = pickFromFairPool(label, rotationSeed, fairPool);

  if (!next) return null;
  picked.add(next.id);
  getMealFormats(next).forEach((format) => pickedFormats.add(format));
  return {
    ...next,
    label,
    shortReason: buildRecommendationReason(label, summary, profile, next, locale),
    balanceNote: generateBalanceNote(label, next, locale),
  };
};

export const getBestMatch = (summary: TodayIntakeSummary, profile: Profile, locale: Locale, rotationSeed: string, items: ScoredRecommendation[], picked: Set<string>, pickedFormats: Set<string>) =>
  pickRecommendation("Best Match", summary, profile, locale, `${rotationSeed}:best-match`, items, picked, pickedFormats, (item) => {
    const mealTypeBonus =
      item.mealType === "balanced"
        ? 1
        : item.mealType === "preference" && item.preferenceScore > 0
          ? 2.5
          : item.mealType === "preference"
            ? 0.5
            : 0;
    return item.score + item.weeklyPatternScore * 0.75 + scoreFeelPriority(profile, item) + mealTypeBonus;
  });

export const getBestBalance = (summary: TodayIntakeSummary, profile: Profile, locale: Locale, rotationSeed: string, items: ScoredRecommendation[], picked: Set<string>, pickedFormats: Set<string>) =>
  pickRecommendation("Best Balance", summary, profile, locale, `${rotationSeed}:best-balance`, items, picked, pickedFormats, (item) => {
    const mealTypeBonus = item.mealType === "balanced" || item.mealType === "recovery" || item.mealType === "light" ? 2 : 0;
    const steadinessBonus = item.heaviness === "light" ? 1 : item.heaviness === "medium" ? 0.5 : -1;
    return item.balanceScore * 2 + item.weeklyPatternScore + item.preferenceScore * 0.35 + item.avoidScore + item.varietyScore + mealTypeBonus + steadinessBonus;
  });

export const getMostConvenient = (summary: TodayIntakeSummary, profile: Profile, locale: Locale, rotationSeed: string, items: ScoredRecommendation[], picked: Set<string>, pickedFormats: Set<string>) =>
  pickRecommendation("Most Convenient", summary, profile, locale, `${rotationSeed}:most-convenient`, items, picked, pickedFormats, (item) => {
    const convenienceBonus = item.convenience === "high" ? 2 : item.convenience === "medium" ? 1 : -1;
    const reasonableBalanceGuard = item.balanceScore >= 0 ? 1 : -1;
    const portableBonus = item.tags.some((tag) => ["portable", "takeout", "quick", "convenient"].includes(tag.toLowerCase())) ? 1 : 0;
    return item.convenienceScore * 2 + convenienceBonus + portableBonus + item.balanceScore * 0.5 + item.weeklyPatternScore * 0.5 + item.avoidScore + item.varietyScore + reasonableBalanceGuard;
  });

export const scoreRecommendations = (profile: Profile, todayLog: TodayLog, history: DayHistory[], locale: Locale, now = new Date()): ScoredRecommendation[] => {
  const summary = summarizeTodayIntake(todayLog);
  const timeWindow = getMealTimeWindow(now);
  const todayId = history.find((day) => day.isToday)?.id ?? history[history.length - 1]?.id ?? now.toISOString().slice(0, 10);
  const rotationSeed = `${todayId}:${profile.feelToday}:${profile.eatingStyle}:${summary.proteinStatus}:${summary.vegetableStatus}:${summary.carbStatus}:${summary.heavinessStatus}`;
  const scored = recommendationDataset
    .map((meal) => scoreMealOption(summary, todayLog, history, profile, meal, timeWindow, locale))
    .sort((a, b) => b.score - a.score);

  const deduped = dedupeRecommendations(scored);
  const picked = new Set<string>();
  const pickedFormats = new Set<string>();

  const bestMatch = getBestMatch(summary, profile, locale, rotationSeed, deduped, picked, pickedFormats);
  const bestBalance = getBestBalance(summary, profile, locale, rotationSeed, deduped, picked, pickedFormats);
  const mostConvenient = getMostConvenient(summary, profile, locale, rotationSeed, deduped, picked, pickedFormats);

  return [bestMatch, bestBalance, mostConvenient].filter(Boolean) as ScoredRecommendation[];
};

const buildPreferenceTrendSummary = (history: DayHistory[], profile: Profile, locale: Locale) => {
  const meals = history.flatMap((day) => flattenMeals(day.todayLog)).filter(isMealLogged);

  if (meals.length < 4) {
    return locale === "en"
      ? "There is not enough weekly logging yet to say much about your recent food pattern."
      : "目前這週的紀錄還不夠多，暫時看不出太明確的飲食偏好變化。";
  }

  const riceCount = meals.filter((meal) => meal.carbs.some((item) => item.toLowerCase().includes("rice") || item.toLowerCase().includes("congee"))).length;
  const noodleCount = meals.filter((meal) => meal.carbs.some((item) => item.toLowerCase().includes("noodle") || item.toLowerCase().includes("pasta") || item.toLowerCase().includes("udon") || item.toLowerCase().includes("soba"))).length;
  const soupyCount = meals.filter((meal) => meal.soup.length > 0 || meal.cookingMethod === "Soup / stew").length;
  const warmCount = meals.filter((meal) => ["Soup / stew", "Boiled", "Stir-fried", "Steamed", "Grilled"].includes(meal.cookingMethod)).length;
  const lightCount = meals.filter((meal) => ["Steamed", "Boiled", "Soup / stew", "Raw / cold", "Other"].includes(meal.cookingMethod)).length;
  const convenienceCount = meals.filter((meal) => ["Takeout", "Restaurant", "Ready-made"].includes(meal.mealSource)).length;
  const takeoutCount = meals.filter((meal) => meal.mealSource === "Takeout" || meal.mealSource === "Restaurant").length;
  const homeCount = meals.filter((meal) => meal.mealSource === "Home-cooked").length;
  const plantProteinCount = meals.filter((meal) => meal.protein.some((item) => ["tofu", "tempeh", "beans", "black beans", "chickpeas", "edamame"].includes(item.toLowerCase()))).length;
  const vegetableForwardCount = meals.filter((meal) => meal.vegetables.length >= 2 || (meal.vegetables.length >= 1 && meal.fruit.length >= 1)).length;
  const portableCount = meals.filter((meal) => meal.carbs.some((item) => ["wrap", "bread", "bagel", "toast", "bao / bun"].includes(item.toLowerCase()))).length;

  const matchedTrends: string[] = [];
  const unmatchedPreferences: string[] = [];

  const preferenceChecks: Record<string, boolean> = {
    "Rice-based meals": riceCount >= 2,
    "Noodle-based meals": noodleCount >= 2,
    "Soupy meals": soupyCount >= 2,
    "Warm meals": warmCount >= Math.max(3, Math.ceil(meals.length * 0.45)),
    "Light meals": lightCount >= Math.max(3, Math.ceil(meals.length * 0.45)),
    "Takeout-friendly": takeoutCount >= Math.max(2, homeCount),
    "Quick grocery meals": convenienceCount >= Math.max(2, Math.ceil(meals.length * 0.4)),
    "Plant-protein": plantProteinCount >= 2,
    "Vegetable-forward": vegetableForwardCount >= 2,
    "Portable meals": portableCount >= 2,
  };

  profile.preferenceTags.forEach((tag) => {
    if (!(tag in preferenceChecks)) return;
    if (preferenceChecks[tag]) matchedTrends.push(tag);
    else unmatchedPreferences.push(tag);
  });

  const observedTrendPool = [
    riceCount >= 2 ? "rice-based meals" : "",
    noodleCount >= 2 ? "noodle-based meals" : "",
    soupyCount >= 2 ? "soupy meals" : "",
    warmCount >= Math.max(3, Math.ceil(meals.length * 0.45)) ? "warm meals" : "",
    lightCount >= Math.max(3, Math.ceil(meals.length * 0.45)) ? "lighter meal formats" : "",
    takeoutCount >= Math.max(2, homeCount) ? "takeout-friendly choices" : "",
    homeCount > takeoutCount ? "home-style meals" : "",
    plantProteinCount >= 2 ? "plant-protein options" : "",
    vegetableForwardCount >= 2 ? "vegetable-forward meals" : "",
    portableCount >= 2 ? "portable meals" : "",
  ].filter(Boolean);

  if (matchedTrends.length > 0) {
    const topMatch = joinList(matchedTrends.slice(0, 2).map((item) => describeTrend(item, locale)), locale);
    if (unmatchedPreferences.length > 0) {
      const softerGap = describeTrend(unmatchedPreferences[0], locale);
      return locale === "en"
        ? `Your recent meals lined up well with your preference for ${topMatch}. ${softerGap.charAt(0).toUpperCase() + softerGap.slice(1)} showed up less often in the actual logs.`
        : `你最近的實際紀錄和你偏好的 ${topMatch} 很一致。不過 ${softerGap} 在這週的實際紀錄裡出現得比較少。`;
    }
    return locale === "en"
      ? `Your recent meals lined up well with your preference for ${topMatch}.`
      : `你最近的實際紀錄和你偏好的 ${topMatch} 很一致。`;
  }

  if (profile.preferenceTags.length > 0 && observedTrendPool.length > 0) {
    const observed = joinList(observedTrendPool.slice(0, 2).map((item) => describeObservedTrend(item, locale)), locale);
    return locale === "en"
      ? `Your saved preferences are broader than what showed up this week. Recent logs leaned more toward ${observed}.`
      : `你儲存的偏好比這週實際出現的餐型更廣一些。最近的紀錄比較偏向 ${observed}。`;
  }

  if (observedTrendPool.length > 0) {
    const observed = joinList(observedTrendPool.slice(0, 2).map((item) => describeObservedTrend(item, locale)), locale);
    return locale === "en" ? `This week mostly leaned toward ${observed}.` : `這一週整體比較偏向 ${observed}。`;
  }

  return locale === "en"
    ? "As you log more meals, this will start reflecting your own style more clearly."
    : "隨著你記錄更多餐點，這裡會更清楚地反映出你的飲食風格。";
};

export const buildWeeklySnapshot = (history: DayHistory[], profile: Profile, locale: Locale) => {
  const flatMeals = history.flatMap((day) => flattenMeals(day.todayLog));
  const loggedMealsCount = flatMeals.length;
  const riceMeals = flatMeals.filter((meal) =>
    meal.carbs.some((item) => {
      const lower = item.toLowerCase();
      return lower.includes("rice") || lower.includes("congee");
    }),
  ).length;
  const noodleMeals = flatMeals.filter((meal) =>
    meal.carbs.some((item) => {
      const lower = item.toLowerCase();
      return lower.includes("noodle") || lower.includes("pasta");
    }),
  ).length;
  const vegetableMeals = flatMeals.filter((meal) => meal.vegetables.length > 0).length;
  const friedMeals = flatMeals.filter((meal) => meal.cookingMethod === "Fried" || meal.cookingMethod === "Stir-fried").length;
  const warmMeals = flatMeals.filter((meal) => ["Soup / stew", "Boiled", "Stir-fried", "Steamed", "Grilled"].includes(meal.cookingMethod)).length;
  const takeoutMeals = flatMeals.filter((meal) => meal.mealSource === "Takeout" || meal.mealSource === "Restaurant" || meal.mealSource === "Ready-made").length;
  const homeMeals = flatMeals.filter((meal) => meal.mealSource === "Home-cooked").length;
  const uniqueProteins = new Set(flatMeals.flatMap((meal) => meal.protein)).size;
  const uniqueProduce = new Set(flatMeals.flatMap((meal) => [...meal.vegetables, ...meal.fruit])).size;
  const mealDiversityScore = new Set(
    flatMeals.flatMap((meal) => {
      const formats: string[] = [];
      if (meal.carbs.some((item) => item.toLowerCase().includes("rice") || item.toLowerCase().includes("congee"))) formats.push("rice");
      if (meal.carbs.some((item) => item.toLowerCase().includes("noodle") || item.toLowerCase().includes("pasta"))) formats.push("noodle");
      if (meal.carbs.some((item) => ["bread", "bagel", "wrap", "tortilla", "toast", "bao / bun"].includes(item.toLowerCase()))) formats.push("bread-wrap");
      if (meal.soup.length > 0 || meal.cookingMethod === "Soup / stew") formats.push("soup");
      if (meal.protein.some((item) => ["tofu", "tempeh", "beans", "black beans", "chickpeas", "edamame"].includes(item.toLowerCase()))) formats.push("plant-protein");
      if (meal.mealSource === "Takeout" || meal.mealSource === "Restaurant") formats.push("takeout");
      if (meal.mealSource === "Home-cooked") formats.push("home");
      return formats;
    }),
  ).size;

  if (loggedMealsCount < 4) {
    return {
      summaryLines: [
        locale === "en"
          ? "You only have a small amount of meal data so far, so this weekly view is still very early."
          : "你目前只記錄了很少的餐點，所以這個每週摘要還在很初期的階段。",
        locale === "en"
          ? "Log a few more meals across the week and the pattern summary will become more believable."
          : "等你這週再多記幾餐，這裡的飲食模式摘要才會更可信。",
      ],
      indicators: [
        { label: locale === "en" ? "Protein" : "蛋白質", value: locale === "en" ? "Too early" : "資料太少" },
        { label: locale === "en" ? "Vegetables" : "蔬菜", value: locale === "en" ? "Too early" : "資料太少" },
        { label: locale === "en" ? "Fiber variety" : "纖維多樣性", value: locale === "en" ? "Too early" : "資料太少" },
        { label: locale === "en" ? "Fried foods" : "炸物", value: locale === "en" ? "Too early" : "資料太少" },
        { label: locale === "en" ? "Meal diversity" : "餐型變化", value: locale === "en" ? "Too early" : "資料太少" },
      ],
      preferenceSummary: locale === "en"
        ? "There is not enough weekly logging yet to say much about your recent food pattern."
        : "目前這週的紀錄還不夠多，暫時看不出太明確的飲食偏好變化。",
    };
  }

  const summaryLines: string[] = [];

  if (riceMeals >= 2 && riceMeals > noodleMeals) {
    summaryLines.push(
      locale === "en"
        ? "Rice-based meals showed up more often than noodle-based ones."
        : "這週飯類餐點比麵類更常出現。",
    );
  } else if (noodleMeals >= 2 && noodleMeals > riceMeals) {
    summaryLines.push(
      locale === "en"
        ? "Noodle-based meals showed up more often than rice-based ones."
        : "這週麵類餐點比飯類更常出現。",
    );
  }

  if (vegetableMeals <= Math.floor(loggedMealsCount * 0.4)) {
    summaryLines.push(
      locale === "en"
        ? "Vegetables have shown up less often so far."
        : "目前蔬菜出現的頻率還偏少。",
    );
  } else if (vegetableMeals >= Math.ceil(loggedMealsCount * 0.7)) {
    summaryLines.push(
      locale === "en"
        ? "Vegetables have shown up fairly consistently so far."
        : "目前蔬菜出現得算蠻穩定。",
    );
  }

  if (warmMeals >= Math.max(3, Math.ceil(loggedMealsCount * 0.6))) {
    summaryLines.push(
      locale === "en"
        ? "Warm meals have shown up often in the current logs."
        : "目前的紀錄裡，溫熱餐點出現得蠻頻繁。",
    );
  }

  if (takeoutMeals >= 3 && takeoutMeals > homeMeals) {
    summaryLines.push(
      locale === "en"
        ? "Recent meals have leaned more toward takeout and convenience."
        : "最近幾餐比較偏向外帶和方便型選擇。",
    );
  } else if (homeMeals >= 3 && homeMeals > takeoutMeals) {
    summaryLines.push(
      locale === "en"
        ? "Recent meals have leaned more home-style."
        : "最近幾餐比較偏向家常型選擇。",
    );
  }

  return {
    summaryLines: summaryLines.length > 0
      ? summaryLines
      : [
          locale === "en"
            ? "There is some weekly data now, but not enough repeated patterns to make a stronger summary yet."
            : "目前已經有一些每週資料了，但還沒有足夠重複的模式可以下更明確的摘要。",
        ],
    indicators: [
      { label: locale === "en" ? "Protein" : "蛋白質", value: uniqueProteins >= 5 ? (locale === "en" ? "Good range" : "種類不錯") : (locale === "en" ? "Could vary more" : "還可以更多樣") },
      { label: locale === "en" ? "Vegetables" : "蔬菜", value: vegetableMeals >= 14 ? (locale === "en" ? "Steady" : "算穩定") : (locale === "en" ? "A little light" : "稍微偏少") },
      { label: locale === "en" ? "Fiber variety" : "纖維多樣性", value: uniqueProduce >= 8 ? (locale === "en" ? "Nice mix" : "搭配不錯") : (locale === "en" ? "Could widen a bit" : "還能更廣一些") },
      { label: locale === "en" ? "Fried foods" : "炸物", value: friedMeals <= 2 ? (locale === "en" ? "Occasional" : "偶爾") : friedMeals <= 5 ? (locale === "en" ? "Moderate" : "中等") : (locale === "en" ? "Showed up often" : "出現偏多") },
      { label: locale === "en" ? "Meal diversity" : "餐型變化", value: mealDiversityScore >= 6 ? (locale === "en" ? "Flexible" : "很有彈性") : mealDiversityScore >= 4 ? (locale === "en" ? "Fairly varied" : "還算多樣") : (locale === "en" ? "Somewhat repetitive" : "稍微重複") },
    ],
    preferenceSummary: buildPreferenceTrendSummary(history, profile, locale),
  };
};

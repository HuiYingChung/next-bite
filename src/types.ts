export type MealName = "Breakfast" | "Lunch" | "Dinner" | "Snacks / Drinks";
export type Locale = "en" | "zh";
export type ActivityLevel = "Low" | "Moderate" | "Active";
export type EatingStyle = "Mostly home-cooked" | "Mostly takeout" | "Both";
export type FeelToday = "Normal" | "Want something warm" | "Need something light" | "Low energy" | "On period";
export type PortionSize = "Small" | "Medium" | "Large";
export type Source = "Home-cooked" | "Takeout" | "Restaurant" | "Ready-made";
export type WorksFor = "home-cooked" | "takeout";
export type Convenience = "low" | "medium" | "high";
export type HeightUnit = "cm" | "ft/in";
export type WeightUnit = "kg" | "lb";
export type MealArrayField = "protein" | "vegetables" | "carbs" | "fruit" | "soup" | "drink";
export type MealSelectField = "cookingMethod" | "mealSource" | "portion";
export type MealLevel = "low" | "medium" | "high";
export type Heaviness = "light" | "medium" | "heavy";
export type RecommendationCardLabel = "Best Match" | "Best Balance" | "Most Convenient";
export type RecommendationMealType =
  | "balanced"
  | "light"
  | "convenient"
  | "preference"
  | "recovery";
export type DailyStatus = "low" | "medium" | "high";
export type DrinkCategory = "simple" | "tea" | "coffee" | "milk" | "juice" | "sweet" | "alcohol";
export type EvidenceConfidence = "high" | "medium" | "limited";
export type EvidenceSourceId = "usda-myplate" | "usda-fdc" | "taiwan-fda" | "nextbite-editorial";

export type Profile = {
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weightKg: string;
  weightLb: string;
  heightUnit: HeightUnit;
  weightUnit: WeightUnit;
  feelToday: FeelToday;
  activityLevel: ActivityLevel;
  eatingStyle: EatingStyle;
  preferenceTags: string[];
  avoidTags: string[];
};

export type MealEntry = {
  protein: string[];
  vegetables: string[];
  carbs: string[];
  fruit: string[];
  soup: string[];
  drink: string[];
  cookingMethod: string;
  mealSource: Source;
  portion: PortionSize;
};

export type TodayLog = Record<MealName, MealEntry>;

export interface MealOption {
  id: string;
  title: string;
  tags: string[];
  proteinLevel: MealLevel;
  vegetableLevel: MealLevel;
  carbLevel: MealLevel;
  heaviness: Heaviness;
  convenience: Convenience;
  worksFor: WorksFor[];
  mealType: RecommendationMealType;
  avoidTags: string[];
  description: string;
  evidence: {
    confidence: EvidenceConfidence;
    sourceIds: EvidenceSourceId[];
    reviewedOn: string;
    method: string;
    assumption: string;
  };
}

export type BaseMealOption = Omit<MealOption, "evidence">;

export interface DrinkOption {
  id: string;
  title: string;
  category: DrinkCategory;
  tags: string[];
  caffeine: boolean;
  sweetened: boolean;
  alcohol: boolean;
  dairy: boolean;
  hydration: MealLevel;
}

export type Recommendation = MealOption;

export type ScoredRecommendation = Recommendation & {
  score: number;
  balanceScore: number;
  convenienceScore: number;
  preferenceScore: number;
  avoidScore: number;
  varietyScore: number;
  weeklyPatternScore: number;
  label: RecommendationCardLabel;
  shortReason: string;
  balanceNote: string;
  suggestedDrink: string;
  convenienceLabel: string;
  scoreBreakdown: ScoreBreakdownItem[];
};

export type ScoreBreakdownItem = {
  category:
    | "protein"
    | "vegetables"
    | "carbs"
    | "heaviness"
    | "convenience"
    | "profile"
    | "preferences"
    | "avoid"
    | "variety"
    | "snack-drink"
    | "time-of-day"
    | "weekly-pattern";
  points: number;
  note: string;
};

export type ParsedMealComponent = {
  name: string;
  group: "protein" | "vegetable" | "carb" | "fruit" | "soup" | "drink" | "other";
  amount: string;
  confidence: EvidenceConfidence;
};

export type ParsedMeal = {
  displayName: string;
  mealSlot: MealName;
  components: ParsedMealComponent[];
  cookingMethod: string;
  mealSource: Source;
  portion: PortionSize;
  assumptions: string[];
  clarification: string | null;
};

export type TodayIntakeSummary = {
  proteinStatus: DailyStatus;
  vegetableStatus: DailyStatus;
  carbStatus: DailyStatus;
  heavinessStatus: DailyStatus;
  friedOilyStatus: DailyStatus;
  convenienceStatus: DailyStatus;
  proteinCount: number;
  vegetableCount: number;
  carbCount: number;
  fruitCount: number;
  soupCount: number;
  drinkCount: number;
  caffeineCount: number;
  sweetDrinkCount: number;
  alcoholCount: number;
  dessertSnackCount: number;
  heavyMeals: number;
  friedMeals: number;
  convenienceMeals: number;
  homeCookedMeals: number;
  takeoutMeals: number;
};

export type DayHistory = {
  id: string;
  date: string;
  label: string;
  isToday: boolean;
  todayLog: TodayLog;
};

export type AppState = {
  profile: Profile;
  days: DayHistory[];
  selectedDayId: string;
};

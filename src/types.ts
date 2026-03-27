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

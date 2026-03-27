import { useEffect, useMemo, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { InfoPill, LabeledField, TagGroup } from "./components";
import {
  avoidTags,
  categoryLabels,
  createBlankState,
  createEmptyMeal,
  createSeededState,
  mealNames,
  mealOptions,
  mealOptionGroups,
  preferenceTags,
  sectionDescriptions,
  snackOptionGroups,
  STORAGE_KEY,
} from "./data";
import { buildWeeklySnapshot, isMealLogged, mealSummaryChips, scoreRecommendations, summarizeTodayIntake } from "./logic";
import type { ActivityLevel, AppState, DayHistory, FeelToday, HeightUnit, Locale, MealArrayField, MealEntry, MealName, MealSelectField, Profile, WeightUnit } from "./types";

const LOCALE_KEY = "next-bite-locale";
const feelTodayOptions: FeelToday[] = ["Normal", "Want something warm", "Need something light", "Low energy", "On period"];
const activityOptions: ActivityLevel[] = ["Low", "Moderate", "Active"];
const eatingStyleOptions: Profile["eatingStyle"][] = ["Mostly home-cooked", "Mostly takeout", "Both"];
const dateLabelFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const localeText = {
  en: {
    switchLabel: "中文",
    mvp: "Single-page MVP",
    tagline: "A personal meal helper based on your habits, preferences, and balance.",
    caseStudy: "View case study",
    usage1: "Log what you already had today, then NextBite suggests a practical next meal.",
    usage2: "Tap a choice again to remove it, or use Reset saved data if you want to start fresh.",
    reset: "Reset saved data",
    todayFocus: "Today Focus",
    todaysMeals: "Today's Meals",
    todayIntro: "This is the main flow. Log today first, then use the recommendation panel to decide what to eat next.",
    noMealsToday: "No meals logged yet for Today. Start with one meal and NextBite will turn that into something useful.",
    todaySignals: "Today signals",
    todaySignalsHelp: "A quick look at what the recommendation engine is picking up from today's log.",
    past6Days: "Past 6 Days",
    pastDays: "Past Days",
    pastIntro: "These days provide background context for your weekly pattern. Recommendations on the right still focus on Today.",
    optionalBackfill: "Optional backfill. Open this section if you want to add or adjust meals from earlier in the week.",
    pastHelper: "You can still update past days if you are filling things in later, but Today is the main decision flow.",
    pastDay: "Past day",
    noMealsForDaySuffix: ". Add a few meals here if you want the weekly view to reflect your recent pattern more clearly.",
    daySignals: "signals",
    daySignalsHelp: "A quick look at what the meal summary is picking up from the currently selected day.",
    profile: "Profile / Preferences",
    profileIntro: "These shape the recommendations, but they are supporting context rather than the main task.",
    profileClosed: "Open this section when you want to fine-tune preferences, avoids, or your usual eating style.",
    height: "Height",
    weight: "Weight",
    feelToday: "How you feel today",
    activity: "Activity level",
    eatingStyle: "Eating style",
    preferenceTags: "Preference tags",
    preferenceHelp: "Choose what feels most like your real-life rotation.",
    avoidTags: "Avoid / dislike tags",
    avoidHelp: "These shape the suggestions quietly in the background.",
    recommendations: "Next Meal Recommendations",
    recommendationsHelp: "These are based on the Today tab and meant to reduce decision fatigue, not judge your day.",
    convenience: "Convenience",
    balance: "Balance",
    worksFor: "Works for",
    suggestedDrink: "Suggested drink",
    snapshot: "7-Day Snapshot",
    snapshotHelp: "A simple look at patterns from your last 7 saved days, using lightweight rules on locally stored meal logs.",
    snapshotEmpty: "No meals logged across the last 7 days yet. Add a few meals and this weekly view will start reflecting your pattern.",
    preferenceTrend: "Preference trend",
    expand: "Expand",
    collapse: "Collapse",
    open: "Open",
    clear: "Clear",
    clearAll: "Clear all",
    clearTags: "Clear tags",
    nothingLogged: "Nothing logged yet",
    noMealsLogged: "No meals logged yet.",
    oneMeal: "1 meal logged",
    mealsLoggedSuffix: "meals logged",
    lightVeg: "light on vegetables",
    lightProtein: "protein still light",
    heavier: "heavier than usual",
    convenienceBased: "mostly convenience-based",
    balancedSoFar: "fairly balanced so far",
    both: "Both",
    homeCooked: "Home-cooked",
    takeout: "Takeout",
    empty: "Empty",
    meal: "meal",
    meals: "meals",
    today: "Today",
    yesterday: "Yesterday",
    protein: "Protein",
    vegetables: "Vegetables",
    carbs: "Carbs",
    heaviness: "Heaviness",
    friedOily: "Fried / oily",
    footerCopyright: "© 2026 Huiying Chung. All rights reserved.",
    footerNonCommercial: "Built in collaboration with AI. NextBite is shared for personal, educational, and portfolio use only. Commercial reuse is not permitted without permission.",
  },
  zh: {
    switchLabel: "EN",
    mvp: "單頁 MVP",
    tagline: "根據你的習慣、偏好與整體平衡，幫你決定下一餐。",
    caseStudy: "查看 Case Study",
    usage1: "先記錄今天已經吃了什麼，NextBite 會幫你整理出下一餐的實用建議。",
    usage2: "再次點選可取消；如果想重新開始，可以使用 Reset saved data。",
    reset: "重設已儲存資料",
    todayFocus: "今日重點",
    todaysMeals: "今天吃了什麼",
    todayIntro: "這是主要流程。先記錄今天的飲食，再用右邊的建議區決定下一餐。",
    noMealsToday: "今天還沒有任何紀錄。先從一餐開始，NextBite 就能給你有用的下一餐建議。",
    todaySignals: "今日訊號",
    todaySignalsHelp: "快速看看推薦引擎從今天紀錄中讀到了什麼。",
    past6Days: "過去 6 天",
    pastDays: "過去幾天",
    pastIntro: "這些紀錄提供一週飲食模式的背景，右邊推薦仍然以今天為主。",
    optionalBackfill: "補記用區塊。若想補上或修正前幾天的餐點，可以展開這裡。",
    pastHelper: "如果你是之後才回來補記，還是可以修改過去幾天；但 Today 仍然是主要決策流程。",
    pastDay: "選擇日期",
    noMealsForDaySuffix: " 還沒有任何紀錄。若想讓每週摘要更貼近你的近期模式，可以補上幾餐。",
    daySignals: "訊號",
    daySignalsHelp: "快速看看目前選定這一天的飲食摘要。",
    profile: "個人資料 / 偏好",
    profileIntro: "這些會影響推薦，但它們是輔助資訊，不是主要任務。",
    profileClosed: "當你想細調偏好、避免食物或平常飲食方式時，再展開這一區即可。",
    height: "身高",
    weight: "體重",
    feelToday: "今天的狀態",
    activity: "活動量",
    eatingStyle: "飲食型態",
    preferenceTags: "偏好標籤",
    preferenceHelp: "選出最像你平常真實飲食輪廓的項目。",
    avoidTags: "避免 / 不喜歡",
    avoidHelp: "這些會安靜地在背景中影響推薦。",
    recommendations: "下一餐建議",
    recommendationsHelp: "這些建議以 Today 為主，目的是減少決策疲勞，不是評價你今天吃得怎麼樣。",
    convenience: "便利度",
    balance: "平衡",
    worksFor: "適合",
    suggestedDrink: "建議飲品",
    snapshot: "7 天摘要",
    snapshotHelp: "根據最近 7 天已儲存的紀錄，用輕量規則整理出簡單摘要。",
    snapshotEmpty: "最近 7 天還沒有任何餐點紀錄。先補上幾餐，這裡才會開始反映你的飲食模式。",
    preferenceTrend: "偏好趨勢",
    expand: "展開",
    collapse: "收起",
    open: "打開",
    clear: "清除",
    clearAll: "全部清除",
    clearTags: "清除標籤",
    nothingLogged: "尚未記錄",
    noMealsLogged: "尚未記錄任何餐點。",
    oneMeal: "已記錄 1 餐",
    mealsLoggedSuffix: "餐已記錄",
    lightVeg: "蔬菜偏少",
    lightProtein: "蛋白質偏少",
    heavier: "整體偏重一些",
    convenienceBased: "比較偏方便型",
    balancedSoFar: "目前看起來還算平衡",
    both: "都可以",
    homeCooked: "家裡做",
    takeout: "外帶 / 外食",
    empty: "空白",
    meal: "餐",
    meals: "餐",
    today: "今天",
    yesterday: "昨天",
    protein: "蛋白質",
    vegetables: "蔬菜",
    carbs: "碳水",
    heaviness: "厚重感",
    friedOily: "油炸 / 油膩",
    footerCopyright: "© 2026 Huiying Chung。版權所有。",
    footerNonCommercial: "本專案與 AI 協作完成。NextBite 僅供個人、教學與作品集展示使用；未經授權不得作為商業用途重複使用。",
  },
} as const;

const loadState = (): AppState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return createSeededState();

  try {
    // When saved data exists, build a fresh blank 7-day window for the current date
    // and then map any saved logs back onto their matching calendar day.
    // This lets yesterday's data move into Past Days while new Today starts clean.
    const baseState = createBlankState();
    const parsed = JSON.parse(saved) as Partial<AppState>;
    const legacyHistory = (parsed as { history?: Array<Partial<DayHistory> & { day?: string }>; todayLog?: DayHistory["todayLog"] }).history;

    const mergedDays = baseState.days.map((baseDay, index) => {
      const parsedDay = parsed.days?.find((day) => day.id === baseDay.id);
      const legacyDay = legacyHistory?.[index];
      const legacyTodayLog = baseDay.isToday ? (parsed as { todayLog?: DayHistory["todayLog"] }).todayLog : undefined;
      const sourceLog = parsedDay?.todayLog ?? legacyTodayLog ?? legacyDay?.todayLog;

      return {
        ...baseDay,
        ...(parsedDay ?? {}),
        todayLog: Object.fromEntries(
          mealNames.map((mealName) => [
            mealName,
            {
              ...baseDay.todayLog[mealName],
              ...sourceLog?.[mealName],
            },
          ]),
        ) as DayHistory["todayLog"],
      };
    });

    return {
      ...baseState,
      ...parsed,
      profile: {
        ...baseState.profile,
        ...parsed.profile,
      },
      days: mergedDays,
      selectedDayId: mergedDays.some((day) => day.id === parsed.selectedDayId)
        ? (parsed.selectedDayId as string)
        : mergedDays.find((day) => day.isToday)?.id ?? mergedDays[mergedDays.length - 1]?.id ?? "",
    };
  } catch {
    return createSeededState();
  }
};

const roundToWhole = (value: number) => Math.round(value).toString();
const roundToSingle = (value: number) => (Math.round(value * 10) / 10).toString();

const convertCmToFeetInches = (cmText: string) => {
  const cm = Number(cmText);
  if (!Number.isFinite(cm) || cm <= 0) return { feet: "", inches: "" };
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  if (inches === 12) return { feet: String(feet + 1), inches: "0" };
  return { feet: String(feet), inches: String(inches) };
};

const convertFeetInchesToCm = (feetText: string, inchesText: string) => {
  const feet = Number(feetText || "0");
  const inches = Number(inchesText || "0");
  if ((!Number.isFinite(feet) && !Number.isFinite(inches)) || feet < 0 || inches < 0) return "";
  const totalInches = feet * 12 + inches;
  if (totalInches <= 0) return "";
  return roundToWhole(totalInches * 2.54);
};

const convertKgToLb = (kgText: string) => {
  const kg = Number(kgText);
  if (!Number.isFinite(kg) || kg <= 0) return "";
  return roundToWhole(kg * 2.20462);
};

const convertLbToKg = (lbText: string) => {
  const lb = Number(lbText);
  if (!Number.isFinite(lb) || lb <= 0) return "";
  return roundToSingle(lb / 2.20462);
};

const getMealOptionGroups = (mealName: MealName) => (mealName === "Snacks / Drinks" ? snackOptionGroups : mealOptionGroups);
const formatWorksFor = (worksFor: string[], locale: Locale) => {
  const text = localeText[locale];
  if (worksFor.includes("home-cooked") && worksFor.includes("takeout")) return text.both;
  if (worksFor.includes("home-cooked")) return text.homeCooked;
  if (worksFor.includes("takeout")) return text.takeout;
  return text.both;
};
const formatShortDate = (isoDate: string) => {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return dateLabelFormatter.format(date);
};

const getDisplayDayLabel = (label: string, locale: Locale) => {
  const text = localeText[locale];
  if (label === "Today") return text.today;
  if (label === "Yesterday") return text.yesterday;
  return label;
};

const getFeelTodayLabel = (option: FeelToday, locale: Locale) => {
  if (locale === "en") return option;
  return {
    Normal: "一般",
    "Want something warm": "想吃熱一點",
    "Need something light": "想吃清爽一點",
    "Low energy": "沒什麼力氣",
    "On period": "生理期中",
  }[option];
};

const getActivityLabel = (option: ActivityLevel, locale: Locale) => {
  if (locale === "en") return option;
  return { Low: "低", Moderate: "中等", Active: "高" }[option];
};

const getEatingStyleLabel = (option: Profile["eatingStyle"], locale: Locale) => {
  if (locale === "en") return option;
  return {
    "Mostly home-cooked": "大多自己煮",
    "Mostly takeout": "大多外帶 / 外食",
    Both: "兩者都有",
  }[option];
};

const getDayStatusText = (day: DayHistory, locale: Locale) => {
  const text = localeText[locale];
  const loggedCount = mealNames.filter((mealName) => isMealLogged(day.todayLog[mealName])).length;
  if (loggedCount === 0) return text.empty;
  if (loggedCount === 1) return `1 ${text.meal}`;
  return `${loggedCount} ${text.meals}`;
};

const getSignalLabels = (locale: Locale) => {
  const text = localeText[locale];
  return {
    protein: locale === "en" ? "Protein" : text.protein,
    vegetables: locale === "en" ? "Vegetables" : text.vegetables,
    carbs: locale === "en" ? "Carbs" : text.carbs,
    heaviness: locale === "en" ? "Heaviness" : text.heaviness,
    friedOily: locale === "en" ? "Fried / oily" : text.friedOily,
    convenience: locale === "en" ? "Convenience" : text.convenience,
  };
};

const translateLevel = (value: string, locale: Locale) => {
  if (locale === "en") return value;
  return (
    {
      low: "低",
      medium: "中",
      high: "高",
      light: "輕",
      heavy: "重",
    }[value] ?? value
  );
};

const translateRecommendationLabel = (value: string, locale: Locale) => {
  if (locale === "en") return value;
  return (
    {
      "Best Match": "最適合",
      "Best Balance": "最平衡",
      "Most Convenient": "最方便",
      Low: "低",
      Medium: "中",
      High: "高",
    }[value] ?? value
  );
};

const getDayHeaderSummary = (day: DayHistory, summary: ReturnType<typeof summarizeTodayIntake>, locale: Locale) => {
  const text = localeText[locale];
  const loggedCount = mealNames.filter((mealName) => isMealLogged(day.todayLog[mealName])).length;
  if (loggedCount === 0) return text.noMealsLogged;

  const notes: string[] = [loggedCount === 1 ? text.oneMeal : `${loggedCount} ${text.mealsLoggedSuffix}`];

  if (summary.vegetableStatus === "low") notes.push(text.lightVeg);
  else if (summary.proteinStatus === "low") notes.push(text.lightProtein);
  else if (summary.heavinessStatus === "heavy" || summary.friedOilyStatus === "high") notes.push(text.heavier);
  else if (summary.convenienceStatus === "high") notes.push(text.convenienceBased);
  else notes.push(text.balancedSoFar);

  return notes.join(" · ");
};

function App() {
  const [locale, setLocale] = useState<Locale>(() => (localStorage.getItem(LOCALE_KEY) as Locale) || "en");
  const [state, setState] = useState<AppState>(() => loadState());
  const [openTodayMeal, setOpenTodayMeal] = useState<MealName | null>(null);
  const [openPastMeal, setOpenPastMeal] = useState<MealName | null>(null);
  const [selectedPastDayId, setSelectedPastDayId] = useState<string>("");
  const [pastDaysOpen, setPastDaysOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const t = localeText[locale];
  const signalLabels = getSignalLabels(locale);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(LOCALE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const todayDay = useMemo(() => state.days.find((day) => day.isToday) ?? state.days[state.days.length - 1], [state.days]);
  const pastDays = useMemo(() => state.days.filter((day) => !day.isToday), [state.days]);
  const selectedPastDay = useMemo(
    () => pastDays.find((day) => day.id === selectedPastDayId) ?? pastDays[pastDays.length - 1] ?? todayDay,
    [pastDays, selectedPastDayId, todayDay],
  );
  const recommendations = useMemo(() => scoreRecommendations(state.profile, todayDay.todayLog, state.days, locale, now), [state.profile, todayDay, state.days, locale, now]);
  const todaySummary = useMemo(() => summarizeTodayIntake(todayDay.todayLog), [todayDay]);
  const selectedPastDaySummary = useMemo(() => summarizeTodayIntake(selectedPastDay.todayLog), [selectedPastDay]);
  const weeklySnapshot = useMemo(() => buildWeeklySnapshot(state.days, state.profile, locale), [state.days, state.profile, locale]);
  const hasWeeklyData = useMemo(
    () => state.days.some((day) => mealNames.some((mealName) => isMealLogged(day.todayLog[mealName]))),
    [state.days],
  );
  const hasAnyTodayMeal = mealNames.some((mealName) => isMealLogged(todayDay.todayLog[mealName]));
  const hasAnyPastMeal = mealNames.some((mealName) => isMealLogged(selectedPastDay.todayLog[mealName]));
  const todaySignals = [
    { label: signalLabels.protein, value: todaySummary.proteinStatus },
    { label: signalLabels.vegetables, value: todaySummary.vegetableStatus },
    { label: signalLabels.carbs, value: todaySummary.carbStatus },
    { label: signalLabels.heaviness, value: todaySummary.heavinessStatus },
    { label: signalLabels.friedOily, value: todaySummary.friedOilyStatus },
    { label: signalLabels.convenience, value: todaySummary.convenienceStatus },
  ];
  const pastDaySignals = [
    { label: signalLabels.protein, value: selectedPastDaySummary.proteinStatus },
    { label: signalLabels.vegetables, value: selectedPastDaySummary.vegetableStatus },
    { label: signalLabels.carbs, value: selectedPastDaySummary.carbStatus },
    { label: signalLabels.heaviness, value: selectedPastDaySummary.heavinessStatus },
    { label: signalLabels.friedOily, value: selectedPastDaySummary.friedOilyStatus },
    { label: signalLabels.convenience, value: selectedPastDaySummary.convenienceStatus },
  ];
  const todayHeaderSummary = getDayHeaderSummary(todayDay, todaySummary, locale);
  const pastDayHeaderSummary = getDayHeaderSummary(selectedPastDay, selectedPastDaySummary, locale);

  const updateProfile = <K extends keyof Profile>(field: K, value: Profile[K]) => {
    setState((current) => ({ ...current, profile: { ...current.profile, [field]: value } }));
  };

  const toggleTag = (group: "preferenceTags" | "avoidTags", tag: string) => {
    setState((current) => {
      const active = current.profile[group];
      const next = active.includes(tag) ? active.filter((item) => item !== tag) : [...active, tag];
      return { ...current, profile: { ...current.profile, [group]: next } };
    });
  };

  const updateHeightUnit = (unit: HeightUnit) => {
    setState((current) => {
      const nextProfile = { ...current.profile, heightUnit: unit };
      if (unit === "ft/in" && current.profile.heightCm) {
        const converted = convertCmToFeetInches(current.profile.heightCm);
        nextProfile.heightFt = converted.feet;
        nextProfile.heightIn = converted.inches;
      }
      if (unit === "cm") {
        nextProfile.heightCm = convertFeetInchesToCm(current.profile.heightFt, current.profile.heightIn);
      }
      return { ...current, profile: nextProfile };
    });
  };

  const updateWeightUnit = (unit: WeightUnit) => {
    setState((current) => {
      const nextProfile = { ...current.profile, weightUnit: unit };
      if (unit === "lb" && current.profile.weightKg) {
        nextProfile.weightLb = convertKgToLb(current.profile.weightKg);
      }
      if (unit === "kg") {
        nextProfile.weightKg = convertLbToKg(current.profile.weightLb);
      }
      return { ...current, profile: nextProfile };
    });
  };

  useEffect(() => {
    if (!pastDays.length) return;
    if (!selectedPastDayId || !pastDays.some((day) => day.id === selectedPastDayId)) {
      setSelectedPastDayId(pastDays[pastDays.length - 1].id);
    }
  }, [pastDays, selectedPastDayId]);

  const updateDayLog = (dayId: string, updater: (log: DayHistory["todayLog"]) => DayHistory["todayLog"]) => {
    setState((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              todayLog: updater(day.todayLog),
            }
          : day,
      ),
    }));
  };

  const toggleMealArray = (dayIdOrMealName: string, mealNameOrKey: MealName | MealArrayField, keyOrValue: MealArrayField | string, maybeValue?: string) => {
    const dayId = maybeValue ? dayIdOrMealName : selectedPastDay.id;
    const mealName = (maybeValue ? mealNameOrKey : dayIdOrMealName) as MealName;
    const key = (maybeValue ? keyOrValue : mealNameOrKey) as MealArrayField;
    const value = (maybeValue ?? keyOrValue) as string;
    setState((current) => {
      const currentDay = current.days.find((day) => day.id === dayId) ?? current.days[current.days.length - 1];
      const existing = currentDay.todayLog[mealName][key];
      const nextValues = existing.includes(value) ? existing.filter((item) => item !== value) : [...existing, value];
      return {
        ...current,
        days: current.days.map((day) =>
          day.id === dayId
            ? {
                ...day,
                todayLog: {
                  ...day.todayLog,
                  [mealName]: { ...day.todayLog[mealName], [key]: nextValues },
                },
              }
            : day,
        ),
      };
    });
  };

  const updateMealField = (
    dayIdOrMealName: string,
    mealNameOrField: MealName | MealSelectField,
    fieldOrValue: MealSelectField | MealEntry[MealSelectField],
    maybeValue?: MealEntry[MealSelectField],
  ) => {
    const dayId = maybeValue ? dayIdOrMealName : selectedPastDay.id;
    const mealName = (maybeValue ? mealNameOrField : dayIdOrMealName) as MealName;
    const field = (maybeValue ? fieldOrValue : mealNameOrField) as MealSelectField;
    const value = (maybeValue ?? fieldOrValue) as MealEntry[MealSelectField];
    updateDayLog(dayId, (log) => ({
      ...log,
      [mealName]: { ...log[mealName], [field]: value },
    }));
  };

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setOpenTodayMeal(null);
    setOpenPastMeal(null);
    setState(createSeededState());
  };

  const clearMeal = (dayIdOrMealName: string, maybeMealName?: MealName) => {
    const dayId = maybeMealName ? dayIdOrMealName : selectedPastDay.id;
    const mealName = (maybeMealName ?? dayIdOrMealName) as MealName;
    updateDayLog(dayId, (log) => ({
      ...log,
      [mealName]: createEmptyMeal(),
    }));
  };

  const clearAllToday = () => {
    setOpenTodayMeal(null);
    updateDayLog(todayDay.id, () =>
      Object.fromEntries(
        mealNames.map((mealName) => [mealName, createEmptyMeal()]),
      ) as DayHistory["todayLog"],
    );
  };

  const clearAllPastDays = () => {
    setOpenPastMeal(null);
    setState((current) => ({
      ...current,
      days: current.days.map((day) => day.isToday
        ? day
        : {
            ...day,
            todayLog: Object.fromEntries(
              mealNames.map((mealName) => [mealName, createEmptyMeal()]),
            ) as DayHistory["todayLog"],
          }),
    }));
  };

  const clearProfileTags = () => {
    setState((current) => ({
      ...current,
      profile: {
        ...current.profile,
        preferenceTags: [],
        avoidTags: [],
      },
    }));
  };

  const renderSignals = (signals: { label: string; value: string }[], title: string, helper: string) => (
    <div className="subtle-card mt-5 p-4">
      <div className={`text-[11px] font-semibold text-slate-500 ${locale === "en" ? "uppercase tracking-[0.16em]" : "tracking-[0.08em]"}`}>{title}</div>
      <p className="mt-1 text-sm text-slate-600">{helper}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {signals.map((signal) => (
          <div key={signal.label} className="rounded-2xl border border-white/70 bg-white px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
            <div className={`text-[10px] text-slate-500 ${locale === "en" ? "uppercase tracking-[0.14em]" : "tracking-[0.08em]"}`}>{signal.label}</div>
            <div className="mt-1 text-sm font-medium capitalize text-slate-800">{translateLevel(signal.value, locale)}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEmptyState = (title: string, description: string, helper?: string) => (
    <div className="mb-4 overflow-hidden rounded-[24px] border border-dashed border-slate-300 bg-[linear-gradient(135deg,rgba(248,244,238,0.96),rgba(239,246,241,0.88))] p-4 text-sm text-slate-600 shadow-[0_14px_28px_rgba(15,23,42,0.04)] sm:mb-5 sm:rounded-[26px]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white/85 text-xs font-semibold text-moss shadow-sm sm:h-9 sm:w-9 sm:text-sm">
          01
        </div>
        <div>
          <div className="font-medium tracking-tight text-slate-900">{title}</div>
          <div className="mt-1 leading-6">{description}</div>
          {helper ? <div className="mt-2 text-xs leading-5 text-slate-500">{helper}</div> : null}
        </div>
      </div>
    </div>
  );

  const renderMealEditor = (day: DayHistory, openMeal: MealName | null, setOpenMeal: React.Dispatch<React.SetStateAction<MealName | null>>) => (
    <div className="space-y-4">
      {mealNames.map((mealName) => (
        <div key={`${day.id}-${mealName}`} className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,244,238,0.92),rgba(245,241,234,0.72))] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between md:gap-4">
            <button
              type="button"
              onClick={() => setOpenMeal((current) => (current === mealName ? null : mealName))}
              className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left md:gap-4"
              aria-expanded={openMeal === mealName}
            >
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">{mealName}</h3>
                <p className="mt-1 text-sm text-slate-600">{sectionDescriptions[mealName]}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {mealSummaryChips(day.todayLog[mealName]).length > 0 ? (
                    mealSummaryChips(day.todayLog[mealName]).map((item) => <InfoPill key={`${day.id}-${mealName}-${item}`} label={item} />)
                  ) : (
                    <div className="text-xs text-slate-400">{t.nothingLogged}</div>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                <span className="hidden sm:inline">{openMeal === mealName ? t.collapse : t.expand}</span>
                <span className={`inline-block text-sm leading-none transition-transform ${openMeal === mealName ? "rotate-90" : ""}`} aria-hidden="true">
                  &gt;
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => clearMeal(day.id, mealName)}
              className="w-full shrink-0 rounded-full border border-slate-300 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-clay hover:text-clay sm:w-auto"
            >
              {t.clear}
            </button>
          </div>

          {openMeal === mealName && (
            <div className="soft-divider mt-5 grid gap-4 pt-4">
              {(Object.keys(categoryLabels) as MealArrayField[]).map((category) => (
                <div key={`${day.id}-${mealName}-${category}`}>
                  <div className="mb-2 text-sm font-medium text-slate-700">{categoryLabels[category]}</div>
                  <div className="space-y-3">
                    {getMealOptionGroups(mealName)[category].map((group) => (
                      <div key={`${day.id}-${mealName}-${group.label}`}>
                        <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{group.label}</div>
                        <div className="flex flex-wrap gap-2">
                          {group.options.map((option) => {
                            const active = day.todayLog[mealName][category].includes(option);
                            return (
                              <button key={`${day.id}-${mealName}-${category}-${option}`} type="button" onClick={() => toggleMealArray(day.id, mealName, category, option)} className={`chip ${active ? "chip-active" : "chip-inactive"}`}>
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="grid gap-3 md:grid-cols-3 md:gap-4">
                <LabeledField label={locale === "en" ? "Cooking method" : "烹調方式"}><select className="field" value={day.todayLog[mealName].cookingMethod} onChange={(e) => updateMealField(day.id, mealName, "cookingMethod", e.target.value)}>{mealOptions.cookingMethod.map((option) => <option key={option}>{option}</option>)}</select></LabeledField>
                <LabeledField label={locale === "en" ? "Meal source" : "餐點來源"}><select className="field" value={day.todayLog[mealName].mealSource} onChange={(e) => updateMealField(day.id, mealName, "mealSource", e.target.value)}>{mealOptions.mealSource.map((option) => <option key={option}>{option}</option>)}</select></LabeledField>
                <LabeledField label={locale === "en" ? "Portion estimate" : "份量估計"}><select className="field" value={day.todayLog[mealName].portion} onChange={(e) => updateMealField(day.id, mealName, "portion", e.target.value)}>{mealOptions.portion.map((option) => <option key={option}>{option}</option>)}</select></LabeledField>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen text-ink">
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-6 md:px-6 md:py-8">
        <header className="relative mb-4 overflow-hidden rounded-[24px] border border-white/70 bg-[linear-gradient(135deg,rgba(247,240,230,0.98),rgba(228,239,232,0.98))] p-4 shadow-soft sm:mb-6 sm:rounded-[32px] sm:p-6 md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(116,145,123,0.22),rgba(116,145,123,0))]" />
          <div className="pointer-events-none absolute -bottom-16 left-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(196,123,92,0.14),rgba(196,123,92,0))]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(111,143,117,0.26),rgba(255,255,255,0))]" />
          <div className="flex flex-col gap-3.5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className={`mb-3 inline-flex items-center gap-2 rounded-full border border-moss/20 bg-white/65 px-3 py-1 text-xs font-medium text-moss shadow-sm ${locale === "en" ? "uppercase tracking-[0.2em]" : "tracking-[0.08em]"}`}>
                <span className="inline-flex h-2 w-2 rounded-full bg-moss" />
                <span>{t.mvp}</span>
              </div>
              <div>
                <h1 className="text-[2rem] font-semibold tracking-tight sm:text-4xl md:text-5xl">
                  <span className="bg-[linear-gradient(180deg,#F08A18,#D95A0E)] bg-clip-text text-transparent">Next</span>
                  <span className="bg-[linear-gradient(180deg,#4DAF28,#0E6A2A)] bg-clip-text text-transparent">Bite</span>
                </h1>
                <div className={`mt-1 text-[11px] font-medium text-slate-500 sm:text-xs ${locale === "en" ? "uppercase tracking-[0.18em] sm:tracking-[0.22em]" : "tracking-[0.08em]"}`}>
                  {locale === "en" ? "Practical Next-Meal Help" : "實用的下一餐助手"}
                </div>
              </div>
              <p className="mt-2.5 max-w-xl text-sm leading-6 text-slate-600 md:text-base">{t.tagline}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
                {[
                  locale === "en" ? "No calorie counting" : "不做熱量執著",
                  locale === "en" ? "Built for real mixed habits" : "貼近真實混合飲食",
                  locale === "en" ? "Made for U.S.-based Chinese users" : "為在美華人設計",
                ].map((pill) => (
                  <div key={pill} className={`rounded-full border border-white/80 bg-white/70 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm sm:px-3 sm:text-xs ${locale === "en" ? "" : "break-keep tracking-[0.02em]"}`}>
                    {pill}
                  </div>
                ))}
              </div>
              <div className="mt-3.5 max-w-2xl rounded-[18px] border border-white/70 bg-white/60 px-4 py-3 text-sm leading-6 text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.04)] sm:mt-4 sm:rounded-[24px]">
                <div>{t.usage1}</div>
                <div>{t.usage2}</div>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:min-w-[220px]">
              <div className="rounded-[20px] border border-white/80 bg-white/70 p-3 text-sm text-slate-600 shadow-[0_12px_26px_rgba(15,23,42,0.05)] sm:rounded-[22px]">
                <div className={`text-[11px] font-semibold text-slate-500 ${locale === "en" ? "uppercase tracking-[0.18em]" : "tracking-[0.08em]"}`}>
                  {locale === "en" ? "Product Principle" : "產品原則"}
                </div>
                <div className="mt-1 leading-5 text-slate-700">
                  {locale === "en"
                    ? "Support everyday decisions with calm, realistic meal suggestions."
                    : "用平靜、實際的建議，幫助日常飲食決策。"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLocale((current) => (current === "en" ? "zh" : "en"))}
                className="w-full rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-moss hover:text-moss"
              >
                {t.switchLabel}
              </button>
              <a
                href="https://www.huiyingchung.com/next-bite-case-study.html"
                target="_blank"
                rel="noreferrer"
                className="w-full rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-center text-sm font-medium text-slate-700 transition hover:border-moss hover:text-moss"
              >
                {t.caseStudy}
              </a>
              <button type="button" onClick={resetAll} className="w-full rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-clay hover:text-clay">
                {t.reset}
              </button>
            </div>
          </div>
        </header>

        <main className="space-y-3.5 md:space-y-6">
          <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr] xl:gap-6">
            <section className="space-y-6">
            <div className="panel">
              <div className="mb-4 sm:mb-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className={`section-kicker border-moss/20 bg-mist/60 text-moss ${locale === "zh" ? "normal-case tracking-[0.08em]" : ""}`}>{t.todayFocus}</div>
                    <h2 className="section-title">{t.todaysMeals}</h2>
                    <p className="mt-1 text-sm text-slate-600">{t.todayIntro}</p>
                    <div className="mt-3 inline-flex rounded-full border border-moss/15 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                      {todayHeaderSummary}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearAllToday}
                    className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-moss/35 hover:text-moss"
                  >
                    {t.clearAll}
                  </button>
                </div>
              </div>

              {!hasAnyTodayMeal && renderEmptyState(
                locale === "en" ? "Start with one meal" : "先從一餐開始",
                t.noMealsToday,
                locale === "en" ? "Breakfast, lunch, dinner, or snacks all work. The recommendations will respond as soon as you log one." : "早餐、午餐、晚餐或點心都可以，先記一餐，右邊建議就會開始變化。"
              )}

              {renderMealEditor(todayDay, openTodayMeal, setOpenTodayMeal)}
              {renderSignals(todaySignals, t.todaySignals, t.todaySignalsHelp)}
            </div>

            <div className="panel">
              <button
                type="button"
                onClick={() => setPastDaysOpen((current) => !current)}
                className="flex w-full items-start justify-between gap-3 text-left"
                aria-expanded={pastDaysOpen}
              >
                <div className="min-w-0">
                  <div className={`section-kicker border-slate-200 bg-slate-50 text-slate-600 ${locale === "zh" ? "normal-case tracking-[0.08em]" : ""}`}>{t.past6Days}</div>
                  <h2 className="section-title">{t.pastDays}</h2>
                  <p className="mt-1 text-sm text-slate-600">{t.pastIntro}</p>
                  <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                    {getDisplayDayLabel(selectedPastDay.label, locale)}: {pastDayHeaderSummary}
                  </div>
                </div>
                <div className="mt-1 flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                  <span className="hidden sm:inline">{pastDaysOpen ? t.collapse : t.open}</span>
                  <span className={`inline-block text-sm leading-none transition-transform ${pastDaysOpen ? "rotate-90" : ""}`} aria-hidden="true">
                    &gt;
                  </span>
                </div>
              </button>

              {!pastDaysOpen && (
                <div className="subtle-card mt-4 px-4 py-3 text-sm leading-6 text-slate-600">
                  {t.optionalBackfill}
                </div>
              )}

              {pastDaysOpen && (
                <>
                  <div className="mt-4 flex flex-col gap-3 sm:mt-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="subtle-card px-3 py-2 text-sm text-slate-600 sm:flex-1">
                      {t.pastHelper}
                    </div>
                    <button
                      type="button"
                      onClick={clearAllPastDays}
                      className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-moss/35 hover:text-moss"
                    >
                      {t.clearAll}
                    </button>
                  </div>

                  <div className="mb-4 mt-4 sm:hidden">
                    <LabeledField label={t.pastDay}>
                      <select
                        className="field"
                        value={selectedPastDay.id}
                        onChange={(e) => setSelectedPastDayId(e.target.value)}
                      >
                        {pastDays.map((day) => (
                          <option key={day.id} value={day.id}>
                            {`${getDisplayDayLabel(day.label, locale)} - ${formatShortDate(day.date)} - ${getDayStatusText(day, locale)}`}
                          </option>
                        ))}
                      </select>
                    </LabeledField>
                  </div>

                  <div className="-mx-1 mb-5 mt-4 hidden gap-2 overflow-x-auto px-1 pb-1 sm:flex">
                    {pastDays.map((day) => {
                      const active = day.id === selectedPastDay.id;
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => setSelectedPastDayId(day.id)}
                          className={`min-w-[96px] shrink-0 rounded-[20px] border px-3 py-3 text-left transition ${active ? "border-moss bg-mist text-moss shadow-sm" : "border-slate-200 bg-white/95 text-slate-700 hover:border-moss/35 hover:bg-white"}`}
                        >
                          <div className={`truncate text-[11px] font-semibold ${locale === "en" ? "uppercase tracking-[0.12em]" : "tracking-[0.06em]"}`}>{getDisplayDayLabel(day.label, locale)}</div>
                          <div className="mt-1 whitespace-nowrap text-xs text-slate-500">{formatShortDate(day.date)}</div>
                          <div className={`mt-2 text-sm font-medium ${active ? "text-moss" : "text-slate-700"}`}>{getDayStatusText(day, locale)}</div>
                        </button>
                      );
                    })}
                  </div>

                  {!hasAnyPastMeal && renderEmptyState(
                    locale === "en" ? `Nothing logged for ${getDisplayDayLabel(selectedPastDay.label, locale)}` : `${getDisplayDayLabel(selectedPastDay.label, locale)}還沒有紀錄`,
                    `${getDisplayDayLabel(selectedPastDay.label, locale)}${t.noMealsForDaySuffix}`,
                    locale === "en" ? "Backfilling even one or two meals helps the weekly snapshot feel more like you." : "就算只補一兩餐，也能讓 weekly snapshot 更貼近你。"
                  )}

                  {renderMealEditor(selectedPastDay, openPastMeal, setOpenPastMeal)}
                  {renderSignals(pastDaySignals, `${getDisplayDayLabel(selectedPastDay.label, locale)} ${t.daySignals}`, t.daySignalsHelp)}
                </>
              )}
            </div>

            <div className="panel">
              <button
                type="button"
                onClick={() => setProfileOpen((current) => !current)}
                className="flex w-full items-start justify-between gap-3 text-left"
                aria-expanded={profileOpen}
              >
                <div className="min-w-0">
                  <h2 className="section-title">{t.profile}</h2>
                  <p className="mt-1 text-sm text-slate-600">{t.profileIntro}</p>
                </div>
                <div className="mt-1 flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                  <span className="hidden sm:inline">{profileOpen ? t.collapse : t.expand}</span>
                  <span className={`inline-block text-sm leading-none transition-transform ${profileOpen ? "rotate-90" : ""}`} aria-hidden="true">
                    &gt;
                  </span>
                </div>
              </button>

              {!profileOpen && (
                <div className="subtle-card mt-4 px-4 py-3 text-sm text-slate-600">
                  {t.profileClosed}
                </div>
              )}

              {profileOpen && (
                <>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={clearProfileTags}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-moss/35 hover:text-moss"
                    >
                      {t.clearTags}
                    </button>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <LabeledField label={t.height}>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          {(["cm", "ft/in"] as HeightUnit[]).map((unit) => (
                            <button
                              key={unit}
                              type="button"
                              onClick={() => updateHeightUnit(unit)}
                              className={`rounded-2xl border px-3 py-2 text-sm transition ${state.profile.heightUnit === unit ? "border-moss bg-mist text-moss" : "border-slate-200 bg-white text-slate-600 hover:border-moss/40"}`}
                            >
                              {unit}
                            </button>
                          ))}
                        </div>
                        {state.profile.heightUnit === "cm" ? (
                          <input className="field" value={state.profile.heightCm} onChange={(e) => updateProfile("heightCm", e.target.value)} placeholder="cm" />
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <input className="field" value={state.profile.heightFt} onChange={(e) => updateProfile("heightFt", e.target.value)} placeholder="ft" />
                            <input className="field" value={state.profile.heightIn} onChange={(e) => updateProfile("heightIn", e.target.value)} placeholder="in" />
                          </div>
                        )}
                      </div>
                    </LabeledField>
                    <LabeledField label={t.weight}>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          {(["kg", "lb"] as WeightUnit[]).map((unit) => (
                            <button
                              key={unit}
                              type="button"
                              onClick={() => updateWeightUnit(unit)}
                              className={`rounded-2xl border px-3 py-2 text-sm transition ${state.profile.weightUnit === unit ? "border-moss bg-mist text-moss" : "border-slate-200 bg-white text-slate-600 hover:border-moss/40"}`}
                            >
                              {unit}
                            </button>
                          ))}
                        </div>
                        <input className="field" value={state.profile.weightUnit === "kg" ? state.profile.weightKg : state.profile.weightLb} onChange={(e) => updateProfile(state.profile.weightUnit === "kg" ? "weightKg" : "weightLb", e.target.value)} placeholder={state.profile.weightUnit} />
                      </div>
                    </LabeledField>
                    <LabeledField label={t.feelToday}><select className="field" value={state.profile.feelToday} onChange={(e) => updateProfile("feelToday", e.target.value as FeelToday)}>{feelTodayOptions.map((option) => <option key={option} value={option}>{getFeelTodayLabel(option, locale)}</option>)}</select></LabeledField>
                    <LabeledField label={t.activity}><select className="field" value={state.profile.activityLevel} onChange={(e) => updateProfile("activityLevel", e.target.value as ActivityLevel)}>{activityOptions.map((option) => <option key={option} value={option}>{getActivityLabel(option, locale)}</option>)}</select></LabeledField>
                  </div>

                  <div className="mt-4">
                    <LabeledField label={t.eatingStyle}>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        {eatingStyleOptions.map((style) => (
                          <button key={style} type="button" onClick={() => updateProfile("eatingStyle", style)} className={`rounded-2xl border px-4 py-3 text-sm transition ${state.profile.eatingStyle === style ? "border-moss bg-mist text-moss" : "border-slate-200 bg-white text-slate-600 hover:border-moss/40"}`}>
                            {getEatingStyleLabel(style, locale)}
                          </button>
                        ))}
                      </div>
                    </LabeledField>
                  </div>

                  <TagGroup title={t.preferenceTags} helper={t.preferenceHelp} tags={preferenceTags} activeTags={state.profile.preferenceTags} onToggle={(tag) => toggleTag("preferenceTags", tag)} />
                  <TagGroup title={t.avoidTags} helper={t.avoidHelp} tags={avoidTags} activeTags={state.profile.avoidTags} onToggle={(tag) => toggleTag("avoidTags", tag)} />
                </>
              )}
            </div>
            </section>

            <aside className="space-y-4 sm:space-y-6">
              <div className="panel bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(250,248,244,0.92))] p-3 sm:p-4 md:p-4 xl:sticky xl:top-3">
                <div className="mb-3.5 sm:mb-4">
                  <h2 className="section-title">{t.recommendations}</h2>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{t.recommendationsHelp}</p>
                </div>
                <div className="space-y-2">
                  {recommendations.map((recommendation, index) => {
                    const cardTone =
                      recommendation.label === "Best Match"
                        ? "border-moss/25 bg-[linear-gradient(180deg,rgba(244,250,246,0.98),rgba(255,255,255,0.98))]"
                        : recommendation.label === "Best Balance"
                          ? "border-clay/18 bg-[linear-gradient(180deg,rgba(255,249,245,0.98),rgba(255,255,255,0.98))]"
                          : "border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,249,246,0.98))]";
                    const topBar =
                      recommendation.label === "Best Match"
                        ? "from-moss/55 to-moss/5"
                        : recommendation.label === "Best Balance"
                          ? "from-clay/45 to-clay/5"
                          : "from-slate-300/60 to-transparent";

                    return (
                    <div key={recommendation.id} className={`relative overflow-hidden rounded-[18px] border p-2.5 shadow-[0_14px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)] sm:rounded-[20px] sm:p-3.5 ${cardTone}`}>
                      <div className={`pointer-events-none absolute inset-x-0 top-0 h-12 sm:h-14 bg-[linear-gradient(180deg,var(--tw-gradient-stops))] ${topBar}`} />
                      <div className="mb-1.5 flex items-start justify-between gap-1.5 sm:gap-2">
                        <div className="min-w-0">
                          <div className={`mb-1 inline-flex rounded-full border border-moss/20 bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-moss shadow-sm ${locale === "en" ? "uppercase tracking-[0.14em]" : "tracking-[0.06em]"}`}>{translateRecommendationLabel(recommendation.label, locale)}</div>
                          <h3 className={`text-[15px] font-semibold leading-5 tracking-tight text-slate-900 ${index === 0 ? "sm:text-base" : ""}`}>{recommendation.title}</h3>
                        </div>
                        <div className="shrink-0 rounded-2xl border border-slate-200/80 bg-white/90 px-2 py-1.5 text-right text-[10px] leading-4 text-slate-500 shadow-sm">
                          <div className={locale === "en" ? "uppercase tracking-[0.12em]" : "tracking-[0.06em]"}>{t.convenience}</div>
                          <div className="font-semibold text-slate-700">{translateRecommendationLabel(recommendation.convenienceLabel, locale)}</div>
                        </div>
                      </div>
                      <p className="text-[13px] leading-[1.45] text-slate-600">{recommendation.shortReason}</p>
                      <div className="mt-2 rounded-2xl border border-slate-200/70 bg-slate-50/90 px-2.5 py-1.5 text-[12px] leading-[1.45] text-slate-600">
                        <span className="font-medium text-slate-700">{t.balance}: </span>
                        <span>{recommendation.balanceNote}</span>
                      </div>
                      <div className="mt-1.5 rounded-2xl border border-slate-200/70 bg-slate-50/90 px-2.5 py-1.5 text-[12px] leading-[1.45] text-slate-600">
                        <span className="font-medium text-slate-700">{t.suggestedDrink}: </span>
                        <span>{recommendation.suggestedDrink}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <InfoPill label={`${t.worksFor}: ${formatWorksFor(recommendation.worksFor, locale)}`} />
                        {recommendation.tags.slice(0, 2).map((tag) => <InfoPill key={`${recommendation.id}-${tag}`} label={tag} />)}
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            </aside>
          </div>

          <section className="panel">
            <div className="mb-4 sm:mb-5">
              <h2 className="section-title">{t.snapshot}</h2>
              <p className="mt-1 text-sm text-slate-600">{t.snapshotHelp}</p>
            </div>
            {hasWeeklyData ? (
              <>
                <div className="space-y-2.5 text-sm text-slate-700 sm:space-y-3">
                  {weeklySnapshot.summaryLines.map((line) => <div key={line} className="rounded-2xl border border-white/80 bg-oat/85 px-4 py-3 leading-6 shadow-[0_10px_22px_rgba(15,23,42,0.04)]">{line}</div>)}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {weeklySnapshot.indicators.map((indicator) => (
                    <div key={indicator.label} className="rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
                      <div className={`text-xs text-slate-500 ${locale === "en" ? "uppercase tracking-[0.18em]" : "tracking-[0.06em]"}`}>{indicator.label}</div>
                      <div className="mt-1 text-sm font-medium text-slate-800">{indicator.value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-[24px] border border-moss/15 bg-[linear-gradient(135deg,rgba(224,239,229,0.86),rgba(244,248,243,0.86))] p-4 text-sm text-slate-700 shadow-[0_14px_28px_rgba(15,23,42,0.04)]">
                  <div className="font-medium text-slate-900">{t.preferenceTrend}</div>
                  <div className="mt-2 leading-6">{weeklySnapshot.preferenceSummary}</div>
                </div>
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-[rgba(255,255,255,0.7)] px-4 py-5 text-sm leading-6 text-slate-600">
                {t.snapshotEmpty}
              </div>
            )}
          </section>
        </main>
        <footer className="mt-5 border-t border-white/70 px-1 pb-4 pt-4 text-center text-xs leading-5 text-slate-500 sm:mt-7 sm:pb-6">
          <div>{t.footerCopyright}</div>
          <div className="mx-auto mt-1 max-w-3xl">{t.footerNonCommercial}</div>
        </footer>
      </div>
      <Analytics />
    </div>
  );
}

export default App;

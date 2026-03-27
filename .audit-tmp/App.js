import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { InfoPill, LabeledField, TagGroup } from "./components";
import { avoidTags, categoryLabels, createBlankState, createEmptyMeal, createSeededState, mealNames, mealOptions, mealOptionGroups, preferenceTags, sectionDescriptions, snackOptionGroups, STORAGE_KEY, } from "./data";
import { buildWeeklySnapshot, isMealLogged, mealSummaryChips, scoreRecommendations, summarizeTodayIntake } from "./logic";
const LOCALE_KEY = "next-bite-locale";
const feelTodayOptions = ["Normal", "Want something warm", "Need something light", "Low energy", "On period"];
const activityOptions = ["Low", "Moderate", "Active"];
const eatingStyleOptions = ["Mostly home-cooked", "Mostly takeout", "Both"];
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
        snapshot: "7-Day Snapshot",
        snapshotHelp: "A simple look at patterns from your last 7 saved days, using lightweight rules on locally stored meal logs.",
        preferenceTrend: "Preference trend",
        expand: "Expand",
        collapse: "Collapse",
        open: "Open",
        clear: "Clear",
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
        snapshot: "7 天摘要",
        snapshotHelp: "根據最近 7 天已儲存的紀錄，用輕量規則整理出簡單摘要。",
        preferenceTrend: "偏好趨勢",
        expand: "展開",
        collapse: "收起",
        open: "打開",
        clear: "清除",
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
    },
};
const loadState = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved)
        return createSeededState();
    try {
        // When saved data exists, build a fresh blank 7-day window for the current date
        // and then map any saved logs back onto their matching calendar day.
        // This lets yesterday's data move into Past Days while new Today starts clean.
        const baseState = createBlankState();
        const parsed = JSON.parse(saved);
        const legacyHistory = parsed.history;
        const mergedDays = baseState.days.map((baseDay, index) => {
            const parsedDay = parsed.days?.find((day) => day.id === baseDay.id);
            const legacyDay = legacyHistory?.[index];
            const legacyTodayLog = baseDay.isToday ? parsed.todayLog : undefined;
            const sourceLog = parsedDay?.todayLog ?? legacyTodayLog ?? legacyDay?.todayLog;
            return {
                ...baseDay,
                ...(parsedDay ?? {}),
                todayLog: Object.fromEntries(mealNames.map((mealName) => [
                    mealName,
                    {
                        ...baseDay.todayLog[mealName],
                        ...sourceLog?.[mealName],
                    },
                ])),
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
                ? parsed.selectedDayId
                : mergedDays.find((day) => day.isToday)?.id ?? mergedDays[mergedDays.length - 1]?.id ?? "",
        };
    }
    catch {
        return createSeededState();
    }
};
const roundToWhole = (value) => Math.round(value).toString();
const roundToSingle = (value) => (Math.round(value * 10) / 10).toString();
const convertCmToFeetInches = (cmText) => {
    const cm = Number(cmText);
    if (!Number.isFinite(cm) || cm <= 0)
        return { feet: "", inches: "" };
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches - feet * 12);
    if (inches === 12)
        return { feet: String(feet + 1), inches: "0" };
    return { feet: String(feet), inches: String(inches) };
};
const convertFeetInchesToCm = (feetText, inchesText) => {
    const feet = Number(feetText || "0");
    const inches = Number(inchesText || "0");
    if ((!Number.isFinite(feet) && !Number.isFinite(inches)) || feet < 0 || inches < 0)
        return "";
    const totalInches = feet * 12 + inches;
    if (totalInches <= 0)
        return "";
    return roundToWhole(totalInches * 2.54);
};
const convertKgToLb = (kgText) => {
    const kg = Number(kgText);
    if (!Number.isFinite(kg) || kg <= 0)
        return "";
    return roundToWhole(kg * 2.20462);
};
const convertLbToKg = (lbText) => {
    const lb = Number(lbText);
    if (!Number.isFinite(lb) || lb <= 0)
        return "";
    return roundToSingle(lb / 2.20462);
};
const getMealOptionGroups = (mealName) => (mealName === "Snacks / Drinks" ? snackOptionGroups : mealOptionGroups);
const formatWorksFor = (worksFor, locale) => {
    const text = localeText[locale];
    if (worksFor.includes("home-cooked") && worksFor.includes("takeout"))
        return text.both;
    if (worksFor.includes("home-cooked"))
        return text.homeCooked;
    if (worksFor.includes("takeout"))
        return text.takeout;
    return text.both;
};
const formatShortDate = (isoDate) => {
    const date = new Date(`${isoDate}T12:00:00`);
    if (Number.isNaN(date.getTime()))
        return isoDate;
    return dateLabelFormatter.format(date);
};
const getDisplayDayLabel = (label, locale) => {
    const text = localeText[locale];
    if (label === "Today")
        return text.today;
    if (label === "Yesterday")
        return text.yesterday;
    return label;
};
const getFeelTodayLabel = (option, locale) => {
    if (locale === "en")
        return option;
    return {
        Normal: "一般",
        "Want something warm": "想吃熱一點",
        "Need something light": "想吃清爽一點",
        "Low energy": "沒什麼力氣",
        "On period": "生理期中",
    }[option];
};
const getActivityLabel = (option, locale) => {
    if (locale === "en")
        return option;
    return { Low: "低", Moderate: "中等", Active: "高" }[option];
};
const getEatingStyleLabel = (option, locale) => {
    if (locale === "en")
        return option;
    return {
        "Mostly home-cooked": "大多自己煮",
        "Mostly takeout": "大多外帶 / 外食",
        Both: "兩者都有",
    }[option];
};
const getDayStatusText = (day, locale) => {
    const text = localeText[locale];
    const loggedCount = mealNames.filter((mealName) => isMealLogged(day.todayLog[mealName])).length;
    if (loggedCount === 0)
        return text.empty;
    if (loggedCount === 1)
        return `1 ${text.meal}`;
    return `${loggedCount} ${text.meals}`;
};
const getSignalLabels = (locale) => {
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
const translateLevel = (value, locale) => {
    if (locale === "en")
        return value;
    return ({
        low: "低",
        medium: "中",
        high: "高",
        light: "輕",
        heavy: "重",
    }[value] ?? value);
};
const translateRecommendationLabel = (value, locale) => {
    if (locale === "en")
        return value;
    return ({
        "Best Match": "最適合",
        "Best Balance": "最平衡",
        "Most Convenient": "最方便",
        Low: "低",
        Medium: "中",
        High: "高",
    }[value] ?? value);
};
const getDayHeaderSummary = (day, summary, locale) => {
    const text = localeText[locale];
    const loggedCount = mealNames.filter((mealName) => isMealLogged(day.todayLog[mealName])).length;
    if (loggedCount === 0)
        return text.noMealsLogged;
    const notes = [loggedCount === 1 ? text.oneMeal : `${loggedCount} ${text.mealsLoggedSuffix}`];
    if (summary.vegetableStatus === "low")
        notes.push(text.lightVeg);
    else if (summary.proteinStatus === "low")
        notes.push(text.lightProtein);
    else if (summary.heavinessStatus === "heavy" || summary.friedOilyStatus === "high")
        notes.push(text.heavier);
    else if (summary.convenienceStatus === "high")
        notes.push(text.convenienceBased);
    else
        notes.push(text.balancedSoFar);
    return notes.join(" · ");
};
function App() {
    const [locale, setLocale] = useState(() => localStorage.getItem(LOCALE_KEY) || "en");
    const [state, setState] = useState(() => loadState());
    const [openTodayMeal, setOpenTodayMeal] = useState(null);
    const [openPastMeal, setOpenPastMeal] = useState(null);
    const [selectedPastDayId, setSelectedPastDayId] = useState("");
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
        }, 60000);
        return () => window.clearInterval(intervalId);
    }, []);
    const todayDay = useMemo(() => state.days.find((day) => day.isToday) ?? state.days[state.days.length - 1], [state.days]);
    const pastDays = useMemo(() => state.days.filter((day) => !day.isToday), [state.days]);
    const selectedPastDay = useMemo(() => pastDays.find((day) => day.id === selectedPastDayId) ?? pastDays[pastDays.length - 1] ?? todayDay, [pastDays, selectedPastDayId, todayDay]);
    const recommendations = useMemo(() => scoreRecommendations(state.profile, todayDay.todayLog, state.days, locale, now), [state.profile, todayDay, state.days, locale, now]);
    const todaySummary = useMemo(() => summarizeTodayIntake(todayDay.todayLog), [todayDay]);
    const selectedPastDaySummary = useMemo(() => summarizeTodayIntake(selectedPastDay.todayLog), [selectedPastDay]);
    const weeklySnapshot = useMemo(() => buildWeeklySnapshot(state.days, state.profile, locale), [state.days, state.profile, locale]);
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
    const updateProfile = (field, value) => {
        setState((current) => ({ ...current, profile: { ...current.profile, [field]: value } }));
    };
    const toggleTag = (group, tag) => {
        setState((current) => {
            const active = current.profile[group];
            const next = active.includes(tag) ? active.filter((item) => item !== tag) : [...active, tag];
            return { ...current, profile: { ...current.profile, [group]: next } };
        });
    };
    const updateHeightUnit = (unit) => {
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
    const updateWeightUnit = (unit) => {
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
        if (!pastDays.length)
            return;
        if (!selectedPastDayId || !pastDays.some((day) => day.id === selectedPastDayId)) {
            setSelectedPastDayId(pastDays[pastDays.length - 1].id);
        }
    }, [pastDays, selectedPastDayId]);
    const updateDayLog = (dayId, updater) => {
        setState((current) => ({
            ...current,
            days: current.days.map((day) => day.id === dayId
                ? {
                    ...day,
                    todayLog: updater(day.todayLog),
                }
                : day),
        }));
    };
    const toggleMealArray = (dayIdOrMealName, mealNameOrKey, keyOrValue, maybeValue) => {
        const dayId = maybeValue ? dayIdOrMealName : selectedPastDay.id;
        const mealName = (maybeValue ? mealNameOrKey : dayIdOrMealName);
        const key = (maybeValue ? keyOrValue : mealNameOrKey);
        const value = (maybeValue ?? keyOrValue);
        setState((current) => {
            const currentDay = current.days.find((day) => day.id === dayId) ?? current.days[current.days.length - 1];
            const existing = currentDay.todayLog[mealName][key];
            const nextValues = existing.includes(value) ? existing.filter((item) => item !== value) : [...existing, value];
            return {
                ...current,
                days: current.days.map((day) => day.id === dayId
                    ? {
                        ...day,
                        todayLog: {
                            ...day.todayLog,
                            [mealName]: { ...day.todayLog[mealName], [key]: nextValues },
                        },
                    }
                    : day),
            };
        });
    };
    const updateMealField = (dayIdOrMealName, mealNameOrField, fieldOrValue, maybeValue) => {
        const dayId = maybeValue ? dayIdOrMealName : selectedPastDay.id;
        const mealName = (maybeValue ? mealNameOrField : dayIdOrMealName);
        const field = (maybeValue ? fieldOrValue : mealNameOrField);
        const value = (maybeValue ?? fieldOrValue);
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
    const clearMeal = (dayIdOrMealName, maybeMealName) => {
        const dayId = maybeMealName ? dayIdOrMealName : selectedPastDay.id;
        const mealName = (maybeMealName ?? dayIdOrMealName);
        updateDayLog(dayId, (log) => ({
            ...log,
            [mealName]: createEmptyMeal(),
        }));
    };
    const renderSignals = (signals, title, helper) => (_jsxs("div", { className: "subtle-card mt-5 p-4", children: [_jsx("div", { className: `text-[11px] font-semibold text-slate-500 ${locale === "en" ? "uppercase tracking-[0.16em]" : "tracking-[0.08em]"}`, children: title }), _jsx("p", { className: "mt-1 text-sm text-slate-600", children: helper }), _jsx("div", { className: "mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3", children: signals.map((signal) => (_jsxs("div", { className: "rounded-2xl border border-white/70 bg-white px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.04)]", children: [_jsx("div", { className: `text-[10px] text-slate-500 ${locale === "en" ? "uppercase tracking-[0.14em]" : "tracking-[0.08em]"}`, children: signal.label }), _jsx("div", { className: "mt-1 text-sm font-medium capitalize text-slate-800", children: translateLevel(signal.value, locale) })] }, signal.label))) })] }));
    const renderEmptyState = (title, description, helper) => (_jsx("div", { className: "mb-4 overflow-hidden rounded-[24px] border border-dashed border-slate-300 bg-[linear-gradient(135deg,rgba(248,244,238,0.96),rgba(239,246,241,0.88))] p-4 text-sm text-slate-600 shadow-[0_14px_28px_rgba(15,23,42,0.04)] sm:mb-5 sm:rounded-[26px]", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white/85 text-xs font-semibold text-moss shadow-sm sm:h-9 sm:w-9 sm:text-sm", children: "01" }), _jsxs("div", { children: [_jsx("div", { className: "font-medium tracking-tight text-slate-900", children: title }), _jsx("div", { className: "mt-1 leading-6", children: description }), helper ? _jsx("div", { className: "mt-2 text-xs leading-5 text-slate-500", children: helper }) : null] })] }) }));
    const renderMealEditor = (day, openMeal, setOpenMeal) => (_jsx("div", { className: "space-y-4", children: mealNames.map((mealName) => (_jsxs("div", { className: "rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,244,238,0.92),rgba(245,241,234,0.72))] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)] md:p-5", children: [_jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between md:gap-4", children: [_jsxs("button", { type: "button", onClick: () => setOpenMeal((current) => (current === mealName ? null : mealName)), className: "flex min-w-0 flex-1 items-start justify-between gap-3 text-left md:gap-4", "aria-expanded": openMeal === mealName, children: [_jsxs("div", { className: "min-w-0", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-900", children: mealName }), _jsx("p", { className: "mt-1 text-sm text-slate-600", children: sectionDescriptions[mealName] }), _jsx("div", { className: "mt-3 flex flex-wrap gap-1.5", children: mealSummaryChips(day.todayLog[mealName]).length > 0 ? (mealSummaryChips(day.todayLog[mealName]).map((item) => _jsx(InfoPill, { label: item }, `${day.id}-${mealName}-${item}`))) : (_jsx("div", { className: "text-xs text-slate-400", children: t.nothingLogged })) })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm", children: [_jsx("span", { className: "hidden sm:inline", children: openMeal === mealName ? t.collapse : t.expand }), _jsx("span", { className: `inline-block text-sm leading-none transition-transform ${openMeal === mealName ? "rotate-90" : ""}`, "aria-hidden": "true", children: ">" })] })] }), _jsx("button", { type: "button", onClick: () => clearMeal(day.id, mealName), className: "w-full shrink-0 rounded-full border border-slate-300 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-clay hover:text-clay sm:w-auto", children: t.clear })] }), openMeal === mealName && (_jsxs("div", { className: "soft-divider mt-5 grid gap-4 pt-4", children: [Object.keys(categoryLabels).map((category) => (_jsxs("div", { children: [_jsx("div", { className: "mb-2 text-sm font-medium text-slate-700", children: categoryLabels[category] }), _jsx("div", { className: "space-y-3", children: getMealOptionGroups(mealName)[category].map((group) => (_jsxs("div", { children: [_jsx("div", { className: "mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400", children: group.label }), _jsx("div", { className: "flex flex-wrap gap-2", children: group.options.map((option) => {
                                                    const active = day.todayLog[mealName][category].includes(option);
                                                    return (_jsx("button", { type: "button", onClick: () => toggleMealArray(day.id, mealName, category, option), className: `chip ${active ? "chip-active" : "chip-inactive"}`, children: option }, `${day.id}-${mealName}-${category}-${option}`));
                                                }) })] }, `${day.id}-${mealName}-${group.label}`))) })] }, `${day.id}-${mealName}-${category}`))), _jsxs("div", { className: "grid gap-3 md:grid-cols-3 md:gap-4", children: [_jsx(LabeledField, { label: locale === "en" ? "Cooking method" : "烹調方式", children: _jsx("select", { className: "field", value: day.todayLog[mealName].cookingMethod, onChange: (e) => updateMealField(day.id, mealName, "cookingMethod", e.target.value), children: mealOptions.cookingMethod.map((option) => _jsx("option", { children: option }, option)) }) }), _jsx(LabeledField, { label: locale === "en" ? "Meal source" : "餐點來源", children: _jsx("select", { className: "field", value: day.todayLog[mealName].mealSource, onChange: (e) => updateMealField(day.id, mealName, "mealSource", e.target.value), children: mealOptions.mealSource.map((option) => _jsx("option", { children: option }, option)) }) }), _jsx(LabeledField, { label: locale === "en" ? "Portion estimate" : "份量估計", children: _jsx("select", { className: "field", value: day.todayLog[mealName].portion, onChange: (e) => updateMealField(day.id, mealName, "portion", e.target.value), children: mealOptions.portion.map((option) => _jsx("option", { children: option }, option)) }) })] })] }))] }, `${day.id}-${mealName}`))) }));
    return (_jsxs("div", { className: "min-h-screen text-ink", children: [_jsxs("div", { className: "mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-6 md:px-6 md:py-8", children: [_jsxs("header", { className: "relative mb-4 overflow-hidden rounded-[24px] border border-white/70 bg-[linear-gradient(135deg,rgba(247,240,230,0.98),rgba(228,239,232,0.98))] p-4 shadow-soft sm:mb-6 sm:rounded-[32px] sm:p-6 md:p-8", children: [_jsx("div", { className: "pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(116,145,123,0.22),rgba(116,145,123,0))]" }), _jsx("div", { className: "pointer-events-none absolute -bottom-16 left-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(196,123,92,0.14),rgba(196,123,92,0))]" }), _jsx("div", { className: "pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(111,143,117,0.26),rgba(255,255,255,0))]" }), _jsxs("div", { className: "flex flex-col gap-3.5 md:flex-row md:items-end md:justify-between", children: [_jsxs("div", { className: "max-w-2xl", children: [_jsxs("div", { className: `mb-3 inline-flex items-center gap-2 rounded-full border border-moss/20 bg-white/65 px-3 py-1 text-xs font-medium text-moss shadow-sm ${locale === "en" ? "uppercase tracking-[0.2em]" : "tracking-[0.08em]"}`, children: [_jsx("span", { className: "inline-flex h-2 w-2 rounded-full bg-moss" }), _jsx("span", { children: t.mvp })] }), _jsxs("div", { children: [_jsxs("h1", { className: "text-[2rem] font-semibold tracking-tight sm:text-4xl md:text-5xl", children: [_jsx("span", { className: "bg-[linear-gradient(180deg,#F08A18,#D95A0E)] bg-clip-text text-transparent", children: "Next" }), _jsx("span", { className: "bg-[linear-gradient(180deg,#4DAF28,#0E6A2A)] bg-clip-text text-transparent", children: "Bite" })] }), _jsx("div", { className: `mt-1 text-[11px] font-medium text-slate-500 sm:text-xs ${locale === "en" ? "uppercase tracking-[0.18em] sm:tracking-[0.22em]" : "tracking-[0.08em]"}`, children: locale === "en" ? "Practical Next-Meal Help" : "實用的下一餐助手" })] }), _jsx("p", { className: "mt-2.5 max-w-xl text-sm leading-6 text-slate-600 md:text-base", children: t.tagline }), _jsx("div", { className: "mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2", children: [
                                                    locale === "en" ? "No calorie counting" : "不做熱量執著",
                                                    locale === "en" ? "Built for real mixed habits" : "貼近真實混合飲食",
                                                    locale === "en" ? "Made for U.S.-based Chinese users" : "為在美華人設計",
                                                ].map((pill) => (_jsx("div", { className: `rounded-full border border-white/80 bg-white/70 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm sm:px-3 sm:text-xs ${locale === "en" ? "" : "break-keep tracking-[0.02em]"}`, children: pill }, pill))) }), _jsxs("div", { className: "mt-3.5 max-w-2xl rounded-[18px] border border-white/70 bg-white/60 px-4 py-3 text-sm leading-6 text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.04)] sm:mt-4 sm:rounded-[24px]", children: [_jsx("div", { children: t.usage1 }), _jsx("div", { children: t.usage2 })] })] }), _jsxs("div", { className: "flex w-full flex-col gap-2.5 sm:w-auto sm:min-w-[220px]", children: [_jsxs("div", { className: "rounded-[20px] border border-white/80 bg-white/70 p-3 text-sm text-slate-600 shadow-[0_12px_26px_rgba(15,23,42,0.05)] sm:rounded-[22px]", children: [_jsx("div", { className: `text-[11px] font-semibold text-slate-500 ${locale === "en" ? "uppercase tracking-[0.18em]" : "tracking-[0.08em]"}`, children: locale === "en" ? "Product Principle" : "產品原則" }), _jsx("div", { className: "mt-1 leading-5 text-slate-700", children: locale === "en"
                                                            ? "Support everyday decisions with calm, realistic meal suggestions."
                                                            : "用平靜、實際的建議，幫助日常飲食決策。" })] }), _jsx("button", { type: "button", onClick: () => setLocale((current) => (current === "en" ? "zh" : "en")), className: "w-full rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-moss hover:text-moss", children: t.switchLabel }), _jsx("a", { href: "https://www.huiyingchung.com/next-bite-case-study.html", target: "_blank", rel: "noreferrer", className: "w-full rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-center text-sm font-medium text-slate-700 transition hover:border-moss hover:text-moss", children: t.caseStudy }), _jsx("button", { type: "button", onClick: resetAll, className: "w-full rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-clay hover:text-clay", children: t.reset })] })] })] }), _jsxs("main", { className: "space-y-3.5 md:space-y-6", children: [_jsxs("div", { className: "grid gap-5 xl:grid-cols-[1.08fr_0.92fr] xl:gap-6", children: [_jsxs("section", { className: "space-y-6", children: [_jsxs("div", { className: "panel", children: [_jsxs("div", { className: "mb-4 sm:mb-5", children: [_jsx("div", { className: `section-kicker border-moss/20 bg-mist/60 text-moss ${locale === "zh" ? "normal-case tracking-[0.08em]" : ""}`, children: t.todayFocus }), _jsx("h2", { className: "section-title", children: t.todaysMeals }), _jsx("p", { className: "mt-1 text-sm text-slate-600", children: t.todayIntro }), _jsx("div", { className: "mt-3 inline-flex rounded-full border border-moss/15 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm", children: todayHeaderSummary })] }), !hasAnyTodayMeal && renderEmptyState(locale === "en" ? "Start with one meal" : "先從一餐開始", t.noMealsToday, locale === "en" ? "Breakfast, lunch, dinner, or snacks all work. The recommendations will respond as soon as you log one." : "早餐、午餐、晚餐或點心都可以，先記一餐，右邊建議就會開始變化。"), renderMealEditor(todayDay, openTodayMeal, setOpenTodayMeal), renderSignals(todaySignals, t.todaySignals, t.todaySignalsHelp)] }), _jsxs("div", { className: "panel", children: [_jsxs("button", { type: "button", onClick: () => setPastDaysOpen((current) => !current), className: "flex w-full items-start justify-between gap-3 text-left", "aria-expanded": pastDaysOpen, children: [_jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: `section-kicker border-slate-200 bg-slate-50 text-slate-600 ${locale === "zh" ? "normal-case tracking-[0.08em]" : ""}`, children: t.past6Days }), _jsx("h2", { className: "section-title", children: t.pastDays }), _jsx("p", { className: "mt-1 text-sm text-slate-600", children: t.pastIntro }), _jsxs("div", { className: "mt-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm", children: [getDisplayDayLabel(selectedPastDay.label, locale), ": ", pastDayHeaderSummary] })] }), _jsxs("div", { className: "mt-1 flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm", children: [_jsx("span", { className: "hidden sm:inline", children: pastDaysOpen ? t.collapse : t.open }), _jsx("span", { className: `inline-block text-sm leading-none transition-transform ${pastDaysOpen ? "rotate-90" : ""}`, "aria-hidden": "true", children: ">" })] })] }), !pastDaysOpen && (_jsx("div", { className: "subtle-card mt-4 px-4 py-3 text-sm leading-6 text-slate-600", children: t.optionalBackfill })), pastDaysOpen && (_jsxs(_Fragment, { children: [_jsx("div", { className: "subtle-card mt-4 px-3 py-2 text-sm text-slate-600 sm:mt-5", children: t.pastHelper }), _jsx("div", { className: "mb-4 mt-4 sm:hidden", children: _jsx(LabeledField, { label: t.pastDay, children: _jsx("select", { className: "field", value: selectedPastDay.id, onChange: (e) => setSelectedPastDayId(e.target.value), children: pastDays.map((day) => (_jsx("option", { value: day.id, children: `${getDisplayDayLabel(day.label, locale)} - ${formatShortDate(day.date)} - ${getDayStatusText(day, locale)}` }, day.id))) }) }) }), _jsx("div", { className: "-mx-1 mb-5 mt-4 hidden gap-2 overflow-x-auto px-1 pb-1 sm:flex", children: pastDays.map((day) => {
                                                                    const active = day.id === selectedPastDay.id;
                                                                    return (_jsxs("button", { type: "button", onClick: () => setSelectedPastDayId(day.id), className: `min-w-[96px] shrink-0 rounded-[20px] border px-3 py-3 text-left transition ${active ? "border-moss bg-mist text-moss shadow-sm" : "border-slate-200 bg-white/95 text-slate-700 hover:border-moss/35 hover:bg-white"}`, children: [_jsx("div", { className: `truncate text-[11px] font-semibold ${locale === "en" ? "uppercase tracking-[0.12em]" : "tracking-[0.06em]"}`, children: getDisplayDayLabel(day.label, locale) }), _jsx("div", { className: "mt-1 whitespace-nowrap text-xs text-slate-500", children: formatShortDate(day.date) }), _jsx("div", { className: `mt-2 text-sm font-medium ${active ? "text-moss" : "text-slate-700"}`, children: getDayStatusText(day, locale) })] }, day.id));
                                                                }) }), !hasAnyPastMeal && renderEmptyState(locale === "en" ? `Nothing logged for ${getDisplayDayLabel(selectedPastDay.label, locale)}` : `${getDisplayDayLabel(selectedPastDay.label, locale)}還沒有紀錄`, `${getDisplayDayLabel(selectedPastDay.label, locale)}${t.noMealsForDaySuffix}`, locale === "en" ? "Backfilling even one or two meals helps the weekly snapshot feel more like you." : "就算只補一兩餐，也能讓 weekly snapshot 更貼近你。"), renderMealEditor(selectedPastDay, openPastMeal, setOpenPastMeal), renderSignals(pastDaySignals, `${getDisplayDayLabel(selectedPastDay.label, locale)} ${t.daySignals}`, t.daySignalsHelp)] }))] }), _jsxs("div", { className: "panel", children: [_jsxs("button", { type: "button", onClick: () => setProfileOpen((current) => !current), className: "flex w-full items-start justify-between gap-3 text-left", "aria-expanded": profileOpen, children: [_jsxs("div", { className: "min-w-0", children: [_jsx("h2", { className: "section-title", children: t.profile }), _jsx("p", { className: "mt-1 text-sm text-slate-600", children: t.profileIntro })] }), _jsxs("div", { className: "mt-1 flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm", children: [_jsx("span", { className: "hidden sm:inline", children: profileOpen ? t.collapse : t.expand }), _jsx("span", { className: `inline-block text-sm leading-none transition-transform ${profileOpen ? "rotate-90" : ""}`, "aria-hidden": "true", children: ">" })] })] }), !profileOpen && (_jsx("div", { className: "subtle-card mt-4 px-4 py-3 text-sm text-slate-600", children: t.profileClosed })), profileOpen && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: [_jsx(LabeledField, { label: t.height, children: _jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "grid grid-cols-2 gap-2", children: ["cm", "ft/in"].map((unit) => (_jsx("button", { type: "button", onClick: () => updateHeightUnit(unit), className: `rounded-2xl border px-3 py-2 text-sm transition ${state.profile.heightUnit === unit ? "border-moss bg-mist text-moss" : "border-slate-200 bg-white text-slate-600 hover:border-moss/40"}`, children: unit }, unit))) }), state.profile.heightUnit === "cm" ? (_jsx("input", { className: "field", value: state.profile.heightCm, onChange: (e) => updateProfile("heightCm", e.target.value), placeholder: "cm" })) : (_jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx("input", { className: "field", value: state.profile.heightFt, onChange: (e) => updateProfile("heightFt", e.target.value), placeholder: "ft" }), _jsx("input", { className: "field", value: state.profile.heightIn, onChange: (e) => updateProfile("heightIn", e.target.value), placeholder: "in" })] }))] }) }), _jsx(LabeledField, { label: t.weight, children: _jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "grid grid-cols-2 gap-2", children: ["kg", "lb"].map((unit) => (_jsx("button", { type: "button", onClick: () => updateWeightUnit(unit), className: `rounded-2xl border px-3 py-2 text-sm transition ${state.profile.weightUnit === unit ? "border-moss bg-mist text-moss" : "border-slate-200 bg-white text-slate-600 hover:border-moss/40"}`, children: unit }, unit))) }), _jsx("input", { className: "field", value: state.profile.weightUnit === "kg" ? state.profile.weightKg : state.profile.weightLb, onChange: (e) => updateProfile(state.profile.weightUnit === "kg" ? "weightKg" : "weightLb", e.target.value), placeholder: state.profile.weightUnit })] }) }), _jsx(LabeledField, { label: t.feelToday, children: _jsx("select", { className: "field", value: state.profile.feelToday, onChange: (e) => updateProfile("feelToday", e.target.value), children: feelTodayOptions.map((option) => _jsx("option", { value: option, children: getFeelTodayLabel(option, locale) }, option)) }) }), _jsx(LabeledField, { label: t.activity, children: _jsx("select", { className: "field", value: state.profile.activityLevel, onChange: (e) => updateProfile("activityLevel", e.target.value), children: activityOptions.map((option) => _jsx("option", { value: option, children: getActivityLabel(option, locale) }, option)) }) })] }), _jsx("div", { className: "mt-4", children: _jsx(LabeledField, { label: t.eatingStyle, children: _jsx("div", { className: "grid grid-cols-1 gap-2 md:grid-cols-3", children: eatingStyleOptions.map((style) => (_jsx("button", { type: "button", onClick: () => updateProfile("eatingStyle", style), className: `rounded-2xl border px-4 py-3 text-sm transition ${state.profile.eatingStyle === style ? "border-moss bg-mist text-moss" : "border-slate-200 bg-white text-slate-600 hover:border-moss/40"}`, children: getEatingStyleLabel(style, locale) }, style))) }) }) }), _jsx(TagGroup, { title: t.preferenceTags, helper: t.preferenceHelp, tags: preferenceTags, activeTags: state.profile.preferenceTags, onToggle: (tag) => toggleTag("preferenceTags", tag) }), _jsx(TagGroup, { title: t.avoidTags, helper: t.avoidHelp, tags: avoidTags, activeTags: state.profile.avoidTags, onToggle: (tag) => toggleTag("avoidTags", tag) })] }))] })] }), _jsx("aside", { className: "space-y-4 sm:space-y-6", children: _jsxs("div", { className: "panel bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(250,248,244,0.92))] p-3 sm:p-4 md:p-4 xl:sticky xl:top-3", children: [_jsxs("div", { className: "mb-3.5 sm:mb-4", children: [_jsx("h2", { className: "section-title", children: t.recommendations }), _jsx("p", { className: "mt-1 text-sm leading-5 text-slate-600", children: t.recommendationsHelp })] }), _jsx("div", { className: "space-y-2", children: recommendations.map((recommendation, index) => {
                                                        const cardTone = recommendation.label === "Best Match"
                                                            ? "border-moss/25 bg-[linear-gradient(180deg,rgba(244,250,246,0.98),rgba(255,255,255,0.98))]"
                                                            : recommendation.label === "Best Balance"
                                                                ? "border-clay/18 bg-[linear-gradient(180deg,rgba(255,249,245,0.98),rgba(255,255,255,0.98))]"
                                                                : "border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,249,246,0.98))]";
                                                        const topBar = recommendation.label === "Best Match"
                                                            ? "from-moss/55 to-moss/5"
                                                            : recommendation.label === "Best Balance"
                                                                ? "from-clay/45 to-clay/5"
                                                                : "from-slate-300/60 to-transparent";
                                                        return (_jsxs("div", { className: `relative overflow-hidden rounded-[18px] border p-2.5 shadow-[0_14px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)] sm:rounded-[20px] sm:p-3.5 ${cardTone}`, children: [_jsx("div", { className: `pointer-events-none absolute inset-x-0 top-0 h-12 sm:h-14 bg-[linear-gradient(180deg,var(--tw-gradient-stops))] ${topBar}` }), _jsxs("div", { className: "mb-1.5 flex items-start justify-between gap-1.5 sm:gap-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: `mb-1 inline-flex rounded-full border border-moss/20 bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-moss shadow-sm ${locale === "en" ? "uppercase tracking-[0.14em]" : "tracking-[0.06em]"}`, children: translateRecommendationLabel(recommendation.label, locale) }), _jsx("h3", { className: `text-[15px] font-semibold leading-5 tracking-tight text-slate-900 ${index === 0 ? "sm:text-base" : ""}`, children: recommendation.title })] }), _jsxs("div", { className: "shrink-0 rounded-2xl border border-slate-200/80 bg-white/90 px-2 py-1.5 text-right text-[10px] leading-4 text-slate-500 shadow-sm", children: [_jsx("div", { className: locale === "en" ? "uppercase tracking-[0.12em]" : "tracking-[0.06em]", children: t.convenience }), _jsx("div", { className: "font-semibold text-slate-700", children: translateRecommendationLabel(recommendation.convenienceLabel, locale) })] })] }), _jsx("p", { className: "text-[13px] leading-[1.45] text-slate-600", children: recommendation.shortReason }), _jsxs("div", { className: "mt-2 rounded-2xl border border-slate-200/70 bg-slate-50/90 px-2.5 py-1.5 text-[12px] leading-[1.45] text-slate-600", children: [_jsxs("span", { className: "font-medium text-slate-700", children: [t.balance, ": "] }), _jsx("span", { children: recommendation.balanceNote })] }), _jsxs("div", { className: "mt-1.5 flex flex-wrap gap-1", children: [_jsx(InfoPill, { label: `${t.worksFor}: ${formatWorksFor(recommendation.worksFor, locale)}` }), recommendation.tags.slice(0, 2).map((tag) => _jsx(InfoPill, { label: tag }, `${recommendation.id}-${tag}`))] })] }, recommendation.id));
                                                    }) })] }) })] }), _jsxs("section", { className: "panel", children: [_jsxs("div", { className: "mb-4 sm:mb-5", children: [_jsx("h2", { className: "section-title", children: t.snapshot }), _jsx("p", { className: "mt-1 text-sm text-slate-600", children: t.snapshotHelp })] }), _jsx("div", { className: "space-y-2.5 text-sm text-slate-700 sm:space-y-3", children: weeklySnapshot.summaryLines.map((line) => _jsx("div", { className: "rounded-2xl border border-white/80 bg-oat/85 px-4 py-3 leading-6 shadow-[0_10px_22px_rgba(15,23,42,0.04)]", children: line }, line)) }), _jsx("div", { className: "mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5", children: weeklySnapshot.indicators.map((indicator) => (_jsxs("div", { className: "rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-[0_10px_22px_rgba(15,23,42,0.04)]", children: [_jsx("div", { className: `text-xs text-slate-500 ${locale === "en" ? "uppercase tracking-[0.18em]" : "tracking-[0.06em]"}`, children: indicator.label }), _jsx("div", { className: "mt-1 text-sm font-medium text-slate-800", children: indicator.value })] }, indicator.label))) }), _jsxs("div", { className: "mt-5 rounded-[24px] border border-moss/15 bg-[linear-gradient(135deg,rgba(224,239,229,0.86),rgba(244,248,243,0.86))] p-4 text-sm text-slate-700 shadow-[0_14px_28px_rgba(15,23,42,0.04)]", children: [_jsx("div", { className: "font-medium text-slate-900", children: t.preferenceTrend }), _jsx("div", { className: "mt-2 leading-6", children: weeklySnapshot.preferenceSummary })] })] })] })] }), _jsx(Analytics, {})] }));
}
export default App;

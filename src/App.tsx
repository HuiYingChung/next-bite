import { useEffect, useMemo, useState } from "react";
import { parseMealWithAi } from "./ai";
import {
  STORAGE_KEY,
  avoidTags,
  createBlankState,
  mealNames,
  mealOptions,
  preferenceTags,
  recommendationDataset,
} from "./data";
import { catalogMethod, evidenceSources } from "./evidence";
import {
  countHardAvoidedRecommendations,
  isMealLogged,
  scoreRecommendations,
  summarizeTodayIntake,
} from "./logic";
import type {
  AppState,
  EatingStyle,
  FeelToday,
  Locale,
  MealEntry,
  MealName,
  ParsedMeal,
  ParsedMealComponent,
  Profile,
  ScoredRecommendation,
} from "./types";

const APP_STORAGE_KEY = `${STORAGE_KEY}-explainable-v2`;
const KEY_MAX_LENGTH = 512;

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const text = (locale: Locale, en: string, zh: string) =>
  locale === "en" ? en : zh;

const splitItems = (value: string) =>
  value
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);

const getDefaultMealSlot = (now = new Date()): MealName => {
  const hour = now.getHours();
  if (hour < 10) return "Breakfast";
  if (hour < 15) return "Lunch";
  if (hour < 21) return "Dinner";
  return "Snacks / Drinks";
};

const sampleMeal = (locale: Locale): ParsedMeal => ({
  displayName:
    locale === "en"
      ? "Beef noodle soup and half a milk tea"
      : "牛肉麵與半杯奶茶",
  mealSlot: "Lunch",
  components: [
    {
      name: locale === "en" ? "beef" : "牛肉",
      group: "protein",
      amount: locale === "en" ? "unspecified" : "未說明",
      confidence: "high",
    },
    {
      name: locale === "en" ? "wheat noodles" : "麵條",
      group: "carb",
      amount: locale === "en" ? "one bowl" : "一碗",
      confidence: "high",
    },
    {
      name: locale === "en" ? "soup broth" : "湯",
      group: "soup",
      amount: locale === "en" ? "unspecified" : "未說明",
      confidence: "medium",
    },
    {
      name: locale === "en" ? "milk tea" : "奶茶",
      group: "drink",
      amount: locale === "en" ? "half cup" : "半杯",
      confidence: "high",
    },
  ],
  cookingMethod: "Soup / stew",
  mealSource: "Restaurant",
  portion: "Medium",
  assumptions: [
    locale === "en"
      ? "No vegetable side was mentioned, so none was added."
      : "沒有提到配菜，因此沒有自行補上蔬菜。",
    locale === "en"
      ? "The soup recipe and milk-tea sweetness are unknown."
      : "湯頭配方與奶茶甜度未知。",
  ],
  clarification: null,
});

const parsedMealToEntry = (meal: ParsedMeal): MealEntry => {
  const byGroup = (group: ParsedMealComponent["group"]) =>
    meal.components
      .filter((component) => component.group === group)
      .map((component) => component.name);

  return {
    protein: byGroup("protein"),
    vegetables: byGroup("vegetable"),
    carbs: byGroup("carb"),
    fruit: byGroup("fruit"),
    soup: byGroup("soup"),
    drink: byGroup("drink"),
    cookingMethod: meal.cookingMethod,
    mealSource: meal.mealSource,
    portion: meal.portion,
  };
};

const loadInitialState = (): AppState => {
  try {
    const saved = localStorage.getItem(APP_STORAGE_KEY);
    if (saved) return JSON.parse(saved) as AppState;
  } catch {
    // A malformed local snapshot should never block the first decision.
  }
  return createBlankState();
};

const cuisineName = (recommendation: ScoredRecommendation | (typeof recommendationDataset)[number]) => {
  const tags = recommendation.tags.map((tag) => tag.toLowerCase());
  if (tags.includes("taiwanese-style")) return "Taiwanese";
  if (tags.includes("chinese-style")) return "Chinese";
  if (tags.includes("japanese-inspired")) return "Japanese";
  if (tags.includes("korean-inspired")) return "Korean";
  if (tags.includes("mediterranean")) return "Mediterranean";
  if (tags.includes("mexican-inspired")) return "Mexican / Latin";
  if (tags.includes("american-light")) return "American everyday";
  return "Mixed everyday";
};

const confidenceLabel = (locale: Locale, value: "high" | "medium" | "limited") => {
  if (value === "high") return text(locale, "Higher confidence", "信心較高");
  if (value === "medium") return text(locale, "Medium confidence", "中等信心");
  return text(locale, "Limited confidence", "信心有限");
};

const categoryLabel = (locale: Locale, category: ScoredRecommendation["scoreBreakdown"][number]["category"]) => {
  const labels: Record<typeof category, [string, string]> = {
    protein: ["Protein balance", "蛋白質平衡"],
    vegetables: ["Vegetable balance", "蔬菜平衡"],
    carbs: ["Carb balance", "碳水平衡"],
    heaviness: ["Meal weight", "餐點負擔"],
    convenience: ["Convenience fit", "便利性"],
    profile: ["Current context", "當下情境"],
    preferences: ["Preferences", "偏好"],
    avoid: ["Must-avoid check", "必須避開"],
    variety: ["Variety", "變化性"],
    "snack-drink": ["Snack & drink context", "點心與飲料"],
    "time-of-day": ["Time of day", "用餐時間"],
    "weekly-pattern": ["Recent pattern", "近期模式"],
  };
  return text(locale, ...labels[category]);
};

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[linear-gradient(145deg,#f58a1f,#ef5b17)] text-lg font-black text-white shadow-[0_10px_24px_rgba(239,91,23,0.24)]">
        N
      </div>
      <div>
        <div className="text-xl font-bold tracking-[-0.04em] text-slate-950">
          Next<span className="text-[#27833b]">Bite</span>
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Explainable meal decisions
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ score, locale }: { score: number; locale: Locale }) {
  return (
    <div className="min-w-[92px] rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
      <div className="text-2xl font-bold tracking-tight text-emerald-800">
        {score >= 0 ? "+" : ""}
        {score}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700/70">
        {text(locale, "decision points", "決策分數")}
      </div>
    </div>
  );
}

function ComponentChip({
  component,
  locale,
  onRemove,
}: {
  component: ParsedMealComponent;
  locale: Locale;
  onRemove: () => void;
}) {
  return (
    <div className="group flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <span className="font-medium text-slate-800">{component.name}</span>
      <span className="text-xs text-slate-400">{component.amount}</span>
      <span
        className={cx(
          "h-1.5 w-1.5 rounded-full",
          component.confidence === "high"
            ? "bg-emerald-500"
            : component.confidence === "medium"
              ? "bg-amber-400"
              : "bg-slate-300",
        )}
        title={confidenceLabel(locale, component.confidence)}
      />
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 grid h-5 w-5 place-items-center rounded-full text-slate-300 transition hover:bg-slate-100 hover:text-slate-700"
        aria-label={text(locale, `Remove ${component.name}`, `移除 ${component.name}`)}
      >
        ×
      </button>
    </div>
  );
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(() =>
    localStorage.getItem("next-bite-locale") === "zh" ? "zh" : "en",
  );
  const [state, setState] = useState<AppState>(loadInitialState);
  const [mealText, setMealText] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [keyOpen, setKeyOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [parsedMeal, setParsedMeal] = useState<ParsedMeal | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({
    protein: "",
    vegetables: "",
    carbs: "",
    drink: "",
  });
  const [selectedRecommendation, setSelectedRecommendation] = useState(0);
  const [receiptOpen, setReceiptOpen] = useState(true);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [choice, setChoice] = useState("");
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    localStorage.setItem("next-bite-locale", locale);
  }, [locale]);

  useEffect(() => {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const todayDay = useMemo(
    () => state.days.find((day) => day.isToday) ?? state.days[state.days.length - 1],
    [state.days],
  );
  const hasMeal = mealNames.some((mealName) =>
    isMealLogged(todayDay.todayLog[mealName]),
  );
  const summary = useMemo(
    () => summarizeTodayIntake(todayDay.todayLog),
    [todayDay.todayLog],
  );
  const recommendations = useMemo(
    () =>
      scoreRecommendations(
        state.profile,
        todayDay.todayLog,
        state.days,
        locale,
        new Date(),
      ),
    [locale, state.days, state.profile, todayDay.todayLog],
  );
  const activeRecommendation =
    recommendations[selectedRecommendation % Math.max(recommendations.length, 1)] ??
    null;
  const hardFilteredCount = useMemo(
    () => countHardAvoidedRecommendations(state.profile),
    [state.profile],
  );

  useEffect(() => {
    setSelectedRecommendation(0);
    setChoice("");
  }, [state.profile, todayDay.todayLog]);

  const filteredCatalog = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    if (!query) return recommendationDataset;
    return recommendationDataset.filter((meal) =>
      [meal.title, meal.description, ...meal.tags]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [catalogQuery]);

  const updateProfile = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setState((current) => ({
      ...current,
      profile: { ...current.profile, [key]: value },
    }));
  };

  const toggleProfileTag = (
    group: "preferenceTags" | "avoidTags",
    value: string,
  ) => {
    setState((current) => {
      const currentTags = current.profile[group];
      return {
        ...current,
        profile: {
          ...current.profile,
          [group]: currentTags.includes(value)
            ? currentTags.filter((tag) => tag !== value)
            : [...currentTags, value],
        },
      };
    });
  };

  const logParsedMeal = (meal: ParsedMeal) => {
    const entry = parsedMealToEntry(meal);
    setState((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === todayDay.id
          ? {
              ...day,
              todayLog: {
                ...day.todayLog,
                [meal.mealSlot]: entry,
              },
            }
          : day,
      ),
    }));
    setParsedMeal(null);
    setParseError("");
    window.setTimeout(
      () =>
        document
          .getElementById("decision")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      80,
    );
  };

  const analyzeMeal = async () => {
    const trimmed = mealText.trim();
    setParseError("");
    if (!trimmed) {
      setParseError(
        text(locale, "Describe one meal first.", "請先描述一餐。"),
      );
      return;
    }
    if (!apiKey) {
      setKeyOpen(true);
      setParseError(
        text(
          locale,
          "Add your OpenAI API key for this session, or try the example with no key.",
          "請加入本次工作階段使用的 OpenAI API key，或直接試用免 key 範例。",
        ),
      );
      return;
    }

    setIsParsing(true);
    try {
      const meal = await parseMealWithAi({
        text: trimmed,
        locale,
        mealSlotHint: getDefaultMealSlot(),
        apiKey,
      });
      setParsedMeal(meal);
    } catch (error) {
      setParseError(
        error instanceof Error
          ? error.message
          : text(locale, "The meal could not be analyzed.", "無法分析這一餐。"),
      );
    } finally {
      setIsParsing(false);
    }
  };

  const createManualMeal = () => {
    const components: ParsedMealComponent[] = [
      ...splitItems(manual.protein).map((name) => ({
        name,
        group: "protein" as const,
        amount: text(locale, "unspecified", "未說明"),
        confidence: "high" as const,
      })),
      ...splitItems(manual.vegetables).map((name) => ({
        name,
        group: "vegetable" as const,
        amount: text(locale, "unspecified", "未說明"),
        confidence: "high" as const,
      })),
      ...splitItems(manual.carbs).map((name) => ({
        name,
        group: "carb" as const,
        amount: text(locale, "unspecified", "未說明"),
        confidence: "high" as const,
      })),
      ...splitItems(manual.drink).map((name) => ({
        name,
        group: "drink" as const,
        amount: text(locale, "unspecified", "未說明"),
        confidence: "high" as const,
      })),
    ];

    if (!components.length) {
      setParseError(
        text(locale, "Add at least one meal detail.", "至少加入一項餐點內容。"),
      );
      return;
    }

    setParsedMeal({
      displayName: components.map((component) => component.name).join(", "),
      mealSlot: getDefaultMealSlot(),
      components,
      cookingMethod: "Other",
      mealSource: "Home-cooked",
      portion: "Medium",
      assumptions: [
        text(
          locale,
          "Only the details you entered are used. No ingredients were inferred.",
          "只使用你輸入的內容，沒有推測其他食材。",
        ),
      ],
      clarification: null,
    });
    setManualOpen(false);
    setParseError("");
  };

  const resetToday = () => {
    const blank = createBlankState();
    setState((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === todayDay.id
          ? {
              ...day,
              todayLog:
                blank.days.find((blankDay) => blankDay.isToday)?.todayLog ??
                blank.days[blank.days.length - 1].todayLog,
            }
          : day,
      ),
    }));
    setParsedMeal(null);
    setMealText("");
    setChoice("");
    setShowReset(false);
  };

  const receiptTotal =
    activeRecommendation?.scoreBreakdown.reduce(
      (total, item) => total + item.points,
      0,
    ) ?? 0;

  return (
    <div className="min-h-screen text-slate-900">
      <header className="border-b border-white/80 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <BrandMark />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800"
            >
              {text(locale, "Preferences", "偏好")}
              {(state.profile.preferenceTags.length > 0 ||
                state.profile.avoidTags.length > 0) &&
                ` · ${state.profile.preferenceTags.length + state.profile.avoidTags.length}`}
            </button>
            <button
              type="button"
              onClick={() => setLocale((current) => (current === "en" ? "zh" : "en"))}
              className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-800"
            >
              {locale === "en" ? "繁中" : "EN"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <section className="relative overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,247,234,0.98),rgba(237,248,238,0.96))] px-5 py-8 shadow-[0_24px_60px_rgba(42,63,47,0.08)] sm:px-9 sm:py-11">
          <div className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(67,145,78,0.18),transparent_68%)]" />
          <div className="relative max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {text(locale, "AI understands. Rules decide.", "AI 負責理解，規則負責決定。")}
            </div>
            <h1 className="max-w-2xl text-[2.35rem] font-bold leading-[1.04] tracking-[-0.055em] text-slate-950 sm:text-6xl">
              {text(
                locale,
                "One next meal. With the math.",
                "下一餐只給一個答案，並把計算攤開。",
              )}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {text(
                locale,
                "Tell NextBite what you ate. It turns the meal into checkable inputs, scores 100 source-backed options, and shows exactly why one moved to the top.",
                "告訴 NextBite 你吃了什麼。它會把餐點轉成可檢查的輸入，評估 100 道有來源依據的選項，並清楚顯示為什麼這一道排在最前面。",
              )}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              {[
                text(locale, "No calorie guesses", "不亂猜熱量"),
                text(locale, "Visible score receipt", "分數收據可見"),
                text(locale, "Mixed Asian + Western meals", "涵蓋亞洲與西式日常餐"),
                text(locale, "BYOK, only when you need AI", "需要 AI 時才使用 BYOK"),
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white bg-white/75 px-3 py-2 shadow-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {profileOpen && (
          <section className="mt-5 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight">
                  {text(locale, "Keep only high-impact preferences", "只保留真正會影響結果的偏好")}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {text(
                    locale,
                    "Nothing here is required before your first result.",
                    "第一次取得結果前，這裡沒有任何必填項目。",
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500"
              >
                {text(locale, "Close", "關閉")}
              </button>
            </div>
            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  {text(locale, "Prefer", "偏好")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {preferenceTags
                    .filter((tag) =>
                      [
                        "Chinese-style",
                        "Taiwanese-style",
                        "Japanese",
                        "Korean",
                        "Mediterranean",
                        "Mexican-inspired",
                        "Vegetable-forward",
                        "High-protein",
                        "Soupy meals",
                        "Quick grocery meals",
                      ].includes(tag),
                    )
                    .map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleProfileTag("preferenceTags", tag)}
                        className={cx(
                          "rounded-full border px-3 py-2 text-xs font-semibold transition",
                          state.profile.preferenceTags.includes(tag)
                            ? "border-emerald-600 bg-emerald-700 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300",
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  {text(locale, "Must avoid", "必須避開")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {avoidTags
                    .filter((tag) =>
                      [
                        "Dairy",
                        "Egg",
                        "Soy",
                        "Wheat / gluten",
                        "Peanuts",
                        "Tree nuts",
                        "Beef",
                        "Pork",
                        "Shellfish",
                        "Fishy seafood",
                        "Spicy food",
                        "Fried food",
                      ].includes(tag),
                    )
                    .map((tag) => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleProfileTag("avoidTags", tag)}
                        className={cx(
                          "rounded-full border px-3 py-2 text-xs font-semibold transition",
                          state.profile.avoidTags.includes(tag)
                            ? "border-rose-600 bg-rose-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-rose-300",
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-400">
                  {text(
                    locale,
                    "These remove matching templates before scoring. NextBite is not a medical allergy checker; confirm ingredients with the cook or restaurant.",
                    "這些條件會在計分前移除相符餐點。NextBite 不是醫療級過敏檢查工具，仍需向餐廳或料理者確認實際食材。",
                  )}
                </p>
              </div>
            </div>
          </section>
        )}

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(30,45,35,0.06)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-600">
                  01 · {text(locale, "Describe", "描述")}
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em]">
                  {text(locale, "What did you just eat?", "你剛剛吃了什麼？")}
                </h2>
              </div>
              {hasMeal && (
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  className="text-xs font-semibold text-slate-400 underline decoration-slate-200 underline-offset-4 hover:text-slate-700"
                >
                  {text(locale, "Clear today", "清除今天")}
                </button>
              )}
            </div>

            <textarea
              value={mealText}
              onChange={(event) => setMealText(event.target.value.slice(0, 600))}
              placeholder={text(
                locale,
                "Example: I had chicken rice, a few vegetables, and half a milk tea for lunch.",
                "例如：午餐吃了雞肉飯、一些青菜，還喝了半杯奶茶。",
              )}
              className="mt-5 min-h-32 w-full resize-y rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 text-base leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                {text(
                  locale,
                  "Natural language in English or Chinese",
                  "可使用中文或英文自然描述",
                )}
              </span>
              <span>{mealText.length}/600</span>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={analyzeMeal}
                disabled={isParsing}
                className="rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"
              >
                {isParsing
                  ? text(locale, "Understanding…", "正在理解…")
                  : text(locale, "Understand my meal with AI", "用 AI 理解這一餐")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setParsedMeal(sampleMeal(locale));
                  setParseError("");
                }}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-bold text-emerald-800 transition hover:-translate-y-0.5 hover:border-emerald-300"
              >
                {text(locale, "Try a no-key example", "試用免 key 範例")}
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setManualOpen((open) => !open)}
                className="text-xs font-semibold text-slate-500 underline decoration-slate-200 underline-offset-4 hover:text-slate-800"
              >
                {manualOpen
                  ? text(locale, "Hide manual mode", "收起手動模式")
                  : text(locale, "No key? Enter 4 quick details", "沒有 key？手動輸入 4 個重點")}
              </button>
              <button
                type="button"
                onClick={() => setKeyOpen((open) => !open)}
                className="text-xs font-semibold text-emerald-700 underline decoration-emerald-200 underline-offset-4 hover:text-emerald-900"
              >
                {apiKey
                  ? text(locale, "Key ready for this session", "本次 key 已就緒")
                  : text(locale, "Add my OpenAI key", "加入我的 OpenAI key")}
              </button>
            </div>

            {parseError && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                {parseError}
              </div>
            )}

            {keyOpen && (
              <div className="mt-4 rounded-[22px] border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-emerald-950">
                      {text(locale, "Bring your own OpenAI key", "使用你自己的 OpenAI key")}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-emerald-900/70">
                      {text(
                        locale,
                        "Held only in this page's memory. It is sent through NextBite's same-origin, no-store relay for this request and is never written to local storage.",
                        "只保留在目前頁面的記憶體中。分析時會經由 NextBite 同網域、禁止儲存的轉送端點送出，不會寫入 local storage。",
                      )}
                    </p>
                  </div>
                  {apiKey && (
                    <button
                      type="button"
                      onClick={() => setApiKey("")}
                      className="shrink-0 text-xs font-semibold text-emerald-800 underline"
                    >
                      {text(locale, "Forget", "清除")}
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={apiKey}
                  onChange={(event) =>
                    setApiKey(event.target.value.slice(0, KEY_MAX_LENGTH))
                  }
                  placeholder="sk-…"
                  className="mt-3 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-emerald-900/65">
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline underline-offset-4"
                  >
                    {text(locale, "OpenAI API keys", "OpenAI API keys")}
                  </a>
                  <span>
                    {text(
                      locale,
                      "Use a dedicated project key that you can revoke.",
                      "建議使用可隨時撤銷的獨立 project key。",
                    )}
                  </span>
                </div>
              </div>
            )}

            {manualOpen && (
              <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["protein", "Protein", "蛋白質"],
                      ["vegetables", "Vegetables", "蔬菜"],
                      ["carbs", "Carbs", "主食／碳水"],
                      ["drink", "Drink", "飲料"],
                    ] as const
                  ).map(([key, en, zh]) => (
                    <label key={key} className="text-xs font-bold text-slate-600">
                      {text(locale, en, zh)}
                      <input
                        value={manual[key]}
                        onChange={(event) =>
                          setManual((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }))
                        }
                        placeholder={text(
                          locale,
                          "Comma-separated",
                          "可用逗號分隔",
                        )}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-400"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={createManualMeal}
                  className="mt-3 w-full rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-white"
                >
                  {text(locale, "Review these details", "檢查這些內容")}
                </button>
              </div>
            )}

            {parsedMeal && (
              <div className="mt-5 rounded-[24px] border-2 border-amber-200 bg-amber-50/65 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
                      02 · {text(locale, "Confirm", "確認")}
                    </div>
                    <h3 className="mt-1.5 text-lg font-bold tracking-tight text-slate-900">
                      {parsedMeal.displayName}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setParsedMeal(null)}
                    className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500"
                  >
                    {text(locale, "Cancel", "取消")}
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {parsedMeal.components.map((component, index) => (
                    <ComponentChip
                      key={`${component.group}-${component.name}-${index}`}
                      component={component}
                      locale={locale}
                      onRemove={() =>
                        setParsedMeal((current) =>
                          current
                            ? {
                                ...current,
                                components: current.components.filter(
                                  (_, currentIndex) => currentIndex !== index,
                                ),
                              }
                            : current,
                        )
                      }
                    />
                  ))}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-600">
                    {text(locale, "Meal", "餐別")}
                    <select
                      value={parsedMeal.mealSlot}
                      onChange={(event) =>
                        setParsedMeal({
                          ...parsedMeal,
                          mealSlot: event.target.value as MealName,
                        })
                      }
                      className="mt-1.5 w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm font-normal"
                    >
                      {mealNames.map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-600">
                    {text(locale, "Source", "來源")}
                    <select
                      value={parsedMeal.mealSource}
                      onChange={(event) =>
                        setParsedMeal({
                          ...parsedMeal,
                          mealSource: event.target.value as ParsedMeal["mealSource"],
                        })
                      }
                      className="mt-1.5 w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm font-normal"
                    >
                      {mealOptions.mealSource.map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-600">
                    {text(locale, "Preparation", "烹調方式")}
                    <select
                      value={parsedMeal.cookingMethod}
                      onChange={(event) =>
                        setParsedMeal({
                          ...parsedMeal,
                          cookingMethod: event.target.value,
                        })
                      }
                      className="mt-1.5 w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm font-normal"
                    >
                      {mealOptions.cookingMethod.map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-600">
                    {text(locale, "Portion", "份量")}
                    <select
                      value={parsedMeal.portion}
                      onChange={(event) =>
                        setParsedMeal({
                          ...parsedMeal,
                          portion: event.target.value as ParsedMeal["portion"],
                        })
                      }
                      className="mt-1.5 w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm font-normal"
                    >
                      {mealOptions.portion.map((name) => (
                        <option key={name}>{name}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {(parsedMeal.assumptions.length > 0 || parsedMeal.clarification) && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-white/80 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-amber-700">
                      {text(locale, "Assumptions to verify", "需要確認的假設")}
                    </div>
                    <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-600">
                      {parsedMeal.assumptions.map((assumption) => (
                        <li key={assumption}>• {assumption}</li>
                      ))}
                      {parsedMeal.clarification && (
                        <li className="font-semibold text-slate-800">
                          • {parsedMeal.clarification}
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  disabled={parsedMeal.components.length === 0}
                  onClick={() => logParsedMeal(parsedMeal)}
                  className="mt-4 w-full rounded-2xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-amber-400 disabled:opacity-40"
                >
                  {text(locale, "Confirm and calculate", "確認並開始計算")}
                </button>
              </div>
            )}

            {showReset && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="text-sm font-semibold text-rose-800">
                  {text(locale, "Clear all of today's meal inputs?", "要清除今天所有餐點輸入嗎？")}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={resetToday}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white"
                  >
                    {text(locale, "Clear", "清除")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReset(false)}
                    className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-700"
                  >
                    {text(locale, "Keep it", "保留")}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section
            id="decision"
            className="scroll-mt-5 rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(30,45,35,0.06)] sm:p-7"
          >
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              03 · {text(locale, "Decide", "決定")}
            </div>
            {!hasMeal || !activeRecommendation ? (
              <div className="grid min-h-[440px] place-items-center py-12 text-center">
                <div className="max-w-sm">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-[24px] bg-emerald-50 text-3xl text-emerald-700">
                    ↗
                  </div>
                  <h2 className="mt-5 text-2xl font-bold tracking-tight">
                    {text(locale, "Your next meal will appear here", "你的下一餐會出現在這裡")}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {text(
                      locale,
                      "Use the no-key example to see the full decision receipt in under 15 seconds.",
                      "使用免 key 範例，15 秒內就能看到完整決策收據。",
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-white">
                        {selectedRecommendation === 0
                          ? text(locale, "Top decision", "首選")
                          : text(locale, "Alternative", "替代選項")}
                      </span>
                      <span className="rounded-full border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        {cuisineName(activeRecommendation)}
                      </span>
                      <span className="rounded-full border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        {confidenceLabel(locale, activeRecommendation.evidence.confidence)}
                      </span>
                    </div>
                    <h2 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.045em] text-slate-950">
                      {activeRecommendation.title}
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                      {activeRecommendation.shortReason}
                    </p>
                  </div>
                  <ScoreBadge score={activeRecommendation.score} locale={locale} />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {text(locale, "Balance", "平衡")}
                    </div>
                    <div className="mt-1.5 text-sm font-semibold text-slate-700">
                      {activeRecommendation.balanceNote}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {text(locale, "Practicality", "可執行性")}
                    </div>
                    <div className="mt-1.5 text-sm font-semibold text-slate-700">
                      {activeRecommendation.worksFor.join(" + ")} ·{" "}
                      {activeRecommendation.convenience}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      {text(locale, "With it", "搭配")}
                    </div>
                    <div className="mt-1.5 text-sm font-semibold text-slate-700">
                      {activeRecommendation.suggestedDrink}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[22px] border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-indigo-600">
                    {text(locale, "Change one assumption → recalculate", "改一個條件 → 立即重算")}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(
                      [
                        ["Normal", "Normal", "一般"],
                        ["Need something light", "Need lighter", "想清淡一點"],
                        ["Want something warm", "Want warm", "想吃熱的"],
                        ["Low energy", "Low energy", "沒力氣準備"],
                      ] as Array<[FeelToday, string, string]>
                    ).map(([value, en, zh]) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() => updateProfile("feelToday", value)}
                        className={cx(
                          "rounded-full border px-3 py-2 text-xs font-bold transition",
                          state.profile.feelToday === value
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-indigo-200 bg-white text-indigo-700 hover:border-indigo-400",
                        )}
                      >
                        {text(locale, en, zh)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(
                      [
                        ["Both", "Home or takeout", "自煮或外食"],
                        ["Mostly home-cooked", "Home-cooked", "偏好自煮"],
                        ["Mostly takeout", "Takeout", "偏好外食"],
                      ] as Array<[EatingStyle, string, string]>
                    ).map(([value, en, zh]) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() => updateProfile("eatingStyle", value)}
                        className={cx(
                          "rounded-full border px-3 py-2 text-xs font-bold transition",
                          state.profile.eatingStyle === value
                            ? "border-slate-700 bg-slate-800 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-400",
                        )}
                      >
                        {text(locale, en, zh)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setChoice(activeRecommendation.id)}
                    className={cx(
                      "rounded-2xl px-4 py-3.5 text-sm font-bold transition",
                      choice === activeRecommendation.id
                        ? "bg-emerald-700 text-white"
                        : "bg-slate-950 text-white hover:bg-emerald-900",
                    )}
                  >
                    {choice === activeRecommendation.id
                      ? text(locale, "Chosen ✓", "已選擇 ✓")
                      : text(locale, "Choose this meal", "就選這一道")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedRecommendation((current) =>
                        recommendations.length > 1
                          ? (current + 1) % recommendations.length
                          : current,
                      )
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
                  >
                    {text(locale, "Compare another option", "比較另一個選項")}
                  </button>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-5">
                  <button
                    type="button"
                    onClick={() => setReceiptOpen((open) => !open)}
                    className="flex w-full items-center justify-between gap-4 text-left"
                  >
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                        {text(locale, "Decision receipt", "決策收據")}
                      </div>
                      <div className="mt-1 text-lg font-bold tracking-tight">
                        {text(locale, "Every point is visible and additive", "每一分都可見，而且可以逐項相加")}
                      </div>
                    </div>
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-lg text-slate-500">
                      {receiptOpen ? "−" : "+"}
                    </span>
                  </button>

                  {receiptOpen && (
                    <div className="mt-4 space-y-4">
                      <div className="overflow-hidden rounded-[20px] border border-slate-200">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          <span>{text(locale, "Visible rule", "可見規則")}</span>
                          <span>{text(locale, "Points", "分數")}</span>
                        </div>
                        {activeRecommendation.scoreBreakdown.map((item) => (
                          <div
                            key={item.category}
                            className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
                          >
                            <div>
                              <div className="text-xs font-bold text-slate-700">
                                {categoryLabel(locale, item.category)}
                              </div>
                              <div className="mt-1 text-xs leading-5 text-slate-500">
                                {item.note}
                              </div>
                            </div>
                            <div
                              className={cx(
                                "pt-0.5 text-sm font-bold tabular-nums",
                                item.points > 0
                                  ? "text-emerald-700"
                                  : item.points < 0
                                    ? "text-rose-600"
                                    : "text-slate-400",
                              )}
                            >
                              {item.points > 0 ? "+" : ""}
                              {item.points}
                            </div>
                          </div>
                        ))}
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 bg-slate-950 px-4 py-3 text-sm font-bold text-white">
                          <span>
                            {text(locale, "Visible total", "可見總分")}
                            {receiptTotal !== activeRecommendation.score && (
                              <span className="ml-2 text-amber-300">
                                {text(locale, "Check needed", "需要檢查")}
                              </span>
                            )}
                          </span>
                          <span className="tabular-nums">
                            {receiptTotal > 0 ? "+" : ""}
                            {receiptTotal}
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[20px] border border-slate-200 p-4">
                          <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                            {text(locale, "Candidate comparison", "候選比較")}
                          </div>
                          <div className="mt-3 space-y-2.5">
                            {recommendations.map((recommendation, index) => (
                              <button
                                type="button"
                                key={recommendation.id}
                                onClick={() => setSelectedRecommendation(index)}
                                className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 text-left"
                              >
                                <span className="truncate text-xs font-semibold text-slate-600">
                                  {recommendation.title}
                                </span>
                                <span className="text-xs font-bold tabular-nums text-slate-900">
                                  {recommendation.score > 0 ? "+" : ""}
                                  {recommendation.score}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-[20px] border border-slate-200 p-4">
                          <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                            {text(locale, "Inputs used", "使用的輸入")}
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                            <span>{text(locale, "Protein units", "蛋白質單位")}</span>
                            <strong className="text-right">{summary.proteinCount}</strong>
                            <span>{text(locale, "Vegetable units", "蔬菜單位")}</span>
                            <strong className="text-right">{summary.vegetableCount}</strong>
                            <span>{text(locale, "Carb units", "碳水單位")}</span>
                            <strong className="text-right">{summary.carbCount}</strong>
                            <span>{text(locale, "Hard-filtered", "計分前排除")}</span>
                            <strong className="text-right">{hardFilteredCount}</strong>
                          </div>
                          <p className="mt-3 text-[11px] leading-5 text-slate-400">
                            {text(
                              locale,
                              "Meal units are qualitative category signals, not grams or calories.",
                              "餐點單位是質化分類訊號，不代表克數或熱量。",
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[20px] border border-emerald-200 bg-emerald-50/60 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-emerald-700">
                              {text(locale, "Evidence & limits", "證據與限制")}
                            </div>
                            <p className="mt-2 max-w-xl text-xs leading-5 text-emerald-950/75">
                              {activeRecommendation.evidence.method}
                            </p>
                          </div>
                          <span className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[10px] font-bold text-emerald-800">
                            {text(locale, "Reviewed", "檢視日期")}{" "}
                            {activeRecommendation.evidence.reviewedOn}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-emerald-950/75">
                          {activeRecommendation.evidence.assumption}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {activeRecommendation.evidence.sourceIds.map((sourceId) => {
                            const source = evidenceSources[sourceId];
                            return (
                              <a
                                key={sourceId}
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-[11px] font-bold text-emerald-800 underline decoration-emerald-200 underline-offset-4"
                              >
                                {source.shortName}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>

        <section
          id="method"
          className="mt-6 scroll-mt-6 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(30,45,35,0.05)]"
        >
          <button
            type="button"
            onClick={() => setCatalogOpen((open) => !open)}
            className="flex w-full flex-col gap-4 p-5 text-left sm:flex-row sm:items-center sm:justify-between sm:p-7"
          >
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">
                {text(locale, "Source-backed catalog", "有來源依據的餐點庫")}
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.035em]">
                {catalogMethod.name}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {catalogMethod.statement} {catalogMethod.limitation}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="text-right">
                <div className="text-3xl font-bold tracking-tight text-violet-700">
                  {recommendationDataset.length}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
                  {text(locale, "curated meals", "道整理餐點")}
                </div>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-xl text-slate-500">
                {catalogOpen ? "−" : "+"}
              </span>
            </div>
          </button>

          {catalogOpen && (
            <div className="border-t border-slate-200 p-5 sm:p-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <input
                  value={catalogQuery}
                  onChange={(event) => setCatalogQuery(event.target.value)}
                  placeholder={text(
                    locale,
                    "Search cuisine, ingredient, or format",
                    "搜尋料理、食材或餐點形式",
                  )}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 sm:max-w-md"
                />
                <div className="text-xs font-semibold text-slate-400">
                  {filteredCatalog.length} / {recommendationDataset.length}
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCatalog.map((meal, index) => (
                  <article
                    key={meal.id}
                    className="rounded-[20px] border border-slate-200 bg-slate-50/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          #{String(index + 1).padStart(3, "0")} · {cuisineName(meal)}
                        </div>
                        <h3 className="mt-1.5 text-sm font-bold leading-5 text-slate-800">
                          {meal.title}
                        </h3>
                      </div>
                      <span
                        className={cx(
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          meal.evidence.confidence === "high"
                            ? "bg-emerald-500"
                            : meal.evidence.confidence === "medium"
                              ? "bg-amber-400"
                              : "bg-slate-300",
                        )}
                        title={confidenceLabel(locale, meal.evidence.confidence)}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold text-slate-500">
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                        P {meal.proteinLevel}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                        V {meal.vegetableLevel}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                        C {meal.carbLevel}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                        {meal.worksFor.join(" / ")}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

        <footer className="mt-8 rounded-[24px] border border-slate-200/80 bg-white/65 px-5 py-5 text-xs leading-6 text-slate-500 sm:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-3xl">
              <strong className="text-slate-700">
                {text(locale, "Trust boundary:", "可信邊界：")}
              </strong>{" "}
              {text(
                locale,
                "AI may structure your words. It never supplies the final score. The visible rules calculate the recommendation, and food-source links describe the evidence basis. NextBite is for everyday decisions, not medical nutrition advice.",
                "AI 可以整理你的描述，但不負責產生最終分數。建議由畫面可見的規則計算，餐點來源連結則說明證據基礎。NextBite 用於日常決策，不提供醫療營養建議。",
              )}
            </p>
            <a
              href="#method"
              className="shrink-0 font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4"
            >
              {text(locale, "Method notes", "方法說明")}
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}

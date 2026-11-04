import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { parseMealWithAi } from "./ai";
import {
  avoidTags,
  createBlankState,
  createEmptyMeal,
  mealNames,
  mealOptions,
  preferenceTags,
  recommendationDataset,
  rollSevenDayHistory,
  toLocalDateId,
} from "./data";
import {
  buildWeeklySnapshot,
  countHardAvoidedRecommendations,
  getMealTimeWindow,
  getHardAvoidConflicts,
  isMealLogged,
  scoreRecommendations,
} from "./logic";
import {
  clearLaunchStorage,
  downloadLocalData,
  loadLaunchState,
  loadLocale,
  isMergeContextComponent,
  mergeMealEntries,
  parsedMealToEntry,
  removePlan,
  saveLaunchState,
  saveLocale,
  savePlan,
} from "./launch-state";
import type { LaunchState } from "./launch-state";
import {
  getMealPresentation,
  getNamedMealComponents,
  label,
  mealTitle,
  translateFood,
} from "./presentation";
import { downloadMealCard } from "./share-card";
import type {
  DayHistory,
  EatingStyle,
  FeelToday,
  Locale,
  MealEntry,
  MealName,
  ParsedAmountUnit,
  ParsedMeal,
  ParsedMealComponent,
  Profile,
  Recommendation,
  ScoredRecommendation,
} from "./types";

const t = (locale: Locale, en: string, zh: string) =>
  locale === "en" ? en : zh;
const cx = (...values: Array<string | false | undefined>) =>
  values.filter(Boolean).join(" ");
const groups = [
  {
    field: "protein",
    group: "protein",
    en: "Protein",
    zh: "蛋白質",
    examples: ["Chicken", "Tofu", "Egg"],
  },
  {
    field: "vegetables",
    group: "vegetable",
    en: "Vegetables",
    zh: "蔬菜",
    examples: ["Bok choy", "Broccoli", "Mushrooms"],
  },
  {
    field: "carbs",
    group: "carb",
    en: "Rice, noodles & more",
    zh: "飯、麵與主食",
    examples: ["Rice", "Noodles", "Bread"],
  },
  {
    field: "drink",
    group: "drink",
    en: "Drinks",
    zh: "飲料",
    examples: ["Water", "Tea", "Milk tea"],
  },
  {
    field: "fruit",
    group: "fruit",
    en: "Fruit",
    zh: "水果",
    examples: ["Apple", "Banana"],
  },
  {
    field: "soup",
    group: "soup",
    en: "Soup",
    zh: "湯品",
    examples: ["Miso soup"],
  },
  {
    field: "other",
    group: "other",
    en: "Other named foods",
    zh: "其他食物",
    examples: [],
  },
] as const;
type FoodFields = Record<(typeof groups)[number]["field"], string>;
const emptyFields = (): FoodFields => ({
  protein: "",
  vegetables: "",
  carbs: "",
  drink: "",
  fruit: "",
  soup: "",
  other: "",
});
const splitFoods = (raw: string) =>
  raw
    .split(/[,，、\n]/)
    .map((value) => value.trim())
    .filter(Boolean);
const amount = (): ParsedMealComponent["amount"] => ({
  quantity: null,
  unit: "unspecified",
  qualifier: "unspecified",
  originalText: null,
});
const defaultSlot = (now = new Date()): MealName =>
  now.getHours() < 10
    ? "Breakfast"
    : now.getHours() < 15
      ? "Lunch"
      : now.getHours() < 21
        ? "Dinner"
        : "Snacks / Drinks";
const blankDraft = (slot = defaultSlot()): ParsedMeal => ({
  displayName: "",
  mealSlot: slot,
  components: [],
  cookingMethod: "Other",
  mealSource: "Unspecified",
  portion: { size: "Unspecified", confidence: "limited" },
  assumptions: [],
  clarification: null,
});
const fieldsFrom = (draft: ParsedMeal): FoodFields =>
  Object.fromEntries(
    groups.map((item) => [
      item.field,
      draft.components
        .filter((component) => component.group === item.group)
        .map((component) => component.name)
        .join(", "),
    ]),
  ) as FoodFields;
const entryDraft = (
  entry: MealEntry,
  slot: MealName,
  locale: Locale,
): ParsedMeal => {
  const components = entry.componentDetails.filter(
    (component) => !isMergeContextComponent(component),
  );
  for (const item of groups) {
    if (item.field === "other") continue;
    for (const name of entry[item.field]) {
      if (
        !components.some(
          (component) =>
            component.group === item.group && component.name === name,
        )
      )
        components.push({
          name,
          group: item.group,
          amount: amount(),
          confidence: "high",
        });
    }
  }
  return {
    ...blankDraft(slot),
    components,
    mealSource: entry.mealSource,
    cookingMethod: entry.cookingMethod,
    portion: { size: entry.portion, confidence: "limited" },
    assumptions: entry.componentDetails.some(isMergeContextComponent)
      ? [
          t(
            locale,
            "This record combines entries with different context. Check the overall source, preparation and portion; individual food amounts remain separate where needed.",
            "這餐合併過不同情境的紀錄。請確認整體來源、烹調方式與份量；無法合併的個別食物數量會分開保留。",
          ),
        ]
      : [],
  };
};
const formatDate = (date: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale === "zh" ? "zh-TW" : "en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${date}T12:00:00`));
const entryNames = (entry: MealEntry, locale: Locale) =>
  [
    ...new Set([
      ...entry.protein,
      ...entry.vegetables,
      ...entry.carbs,
      ...entry.fruit,
      ...entry.soup,
      ...entry.drink,
      ...entry.componentDetails
        .filter(
          (component) =>
            component.group === "other" && !isMergeContextComponent(component),
        )
        .map((component) => component.name),
    ]),
  ]
    .map((name) => translateFood(name, locale))
    .join(" · ");

function ConfirmationDialog({
  title,
  children,
  confirm,
  cancel,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirm: string;
  cancel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    element.showModal();
    cancelButton.current?.focus();
    return () => {
      element.close();
      window.requestAnimationFrame(() => {
        if (returnFocus?.isConnected)
          returnFocus.focus({ preventScroll: true });
      });
    };
  }, []);
  return (
    <dialog
      className="confirmation-panel"
      ref={dialog}
      aria-labelledby="confirmation-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id="confirmation-title">{title}</h2>
      {children}
      <div className="button-row">
        <button
          type="button"
          className="button quiet"
          ref={cancelButton}
          onClick={onCancel}
        >
          {cancel}
        </button>
        <button type="button" className="button danger" onClick={onConfirm}>
          {confirm}
        </button>
      </div>
    </dialog>
  );
}

function BowlArt({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      className={compact ? "bowl-art compact" : "bowl-art"}
      viewBox="0 0 240 190"
      aria-hidden="true"
    >
      <ellipse cx="120" cy="167" rx="88" ry="12" fill="#194d3c" opacity=".08" />
      <path
        d="M30 85h180c-4 50-34 78-90 78S34 135 30 85"
        fill="#faf5e9"
        stroke="#234e40"
        strokeWidth="3"
      />
      <ellipse
        cx="120"
        cy="86"
        rx="89"
        ry="36"
        fill="#e8ddbf"
        stroke="#234e40"
        strokeWidth="3"
      />
      <ellipse cx="121" cy="83" rx="76" ry="27" fill="#fffaf0" />
      <path d="M48 80c8-23 25-34 46-27l16 32-36 15z" fill="#6c9d5e" />
      <path
        d="M57 79l29 13m-11-34 8 32m-20-17 24 10"
        stroke="#315b41"
        strokeWidth="2"
        fill="none"
      />
      <ellipse
        cx="145"
        cy="76"
        rx="29"
        ry="21"
        fill="#efa84b"
        transform="rotate(15 145 76)"
      />
      <ellipse cx="146" cy="76" rx="12" ry="11" fill="#f8cf6d" />
      <path d="m100 92 14-22 15 24-15 14z" fill="#c68155" />
      <path d="m166 90 9-15 17 15-15 12z" fill="#c68155" />
      <path
        d="m149 43 67-29m-57 36 65-25"
        stroke="#234e40"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M90 35c-8-11 9-12 1-25m27 31c-8-11 9-12 1-25"
        stroke="#839e8c"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M85 131c13 8 57 8 70-1"
        stroke="#c9ba97"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

function ContextFields({
  draft,
  setDraft,
  locale,
  lockSlot = false,
}: {
  draft: ParsedMeal;
  setDraft: Dispatch<SetStateAction<ParsedMeal>>;
  locale: Locale;
  lockSlot?: boolean;
}) {
  return (
    <div className="context-grid">
      <label>
        {t(locale, "Meal", "餐別")}
        <select
          value={draft.mealSlot}
          disabled={lockSlot}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              mealSlot: event.target.value as MealName,
            }))
          }
        >
          {mealNames.map((value) => (
            <option key={value} value={value}>
              {label(value, locale)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t(locale, "Where it came from", "餐點來源")}
        <select
          value={draft.mealSource}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              mealSource: event.target.value as ParsedMeal["mealSource"],
            }))
          }
        >
          {mealOptions.mealSource.map((value) => (
            <option key={value} value={value}>
              {label(value, locale)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t(locale, "Preparation", "烹調方式")}
        <select
          value={draft.cookingMethod}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              cookingMethod: event.target.value,
            }))
          }
        >
          {mealOptions.cookingMethod.map((value) => (
            <option key={value} value={value}>
              {value === "Other"
                ? t(locale, "Unspecified / other", "未說明／其他")
                : label(value, locale)}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t(locale, "Overall portion", "整體份量")}
        <select
          value={draft.portion.size}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              portion: {
                size: event.target.value as ParsedMeal["portion"]["size"],
                confidence: "high",
              },
            }))
          }
        >
          {mealOptions.portion.map((value) => (
            <option key={value} value={value}>
              {label(value, locale)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function LogList({
  day,
  locale,
  onEdit,
  onDelete,
}: {
  day: DayHistory;
  locale: Locale;
  onEdit: (slot: MealName) => void;
  onDelete: (slot: MealName) => void;
}) {
  const logged = mealNames.filter((slot) => isMealLogged(day.todayLog[slot]));
  return logged.length ? (
    <ul className="log-list">
      {logged.map((slot) => (
        <li key={slot}>
          <div className="log-copy">
            <strong>{label(slot, locale)}</strong>
            <p>{entryNames(day.todayLog[slot], locale)}</p>
            <span>
              {label(day.todayLog[slot].mealSource, locale)} ·{" "}
              {label(day.todayLog[slot].portion, locale)}
            </span>
          </div>
          <div className="log-actions">
            <button
              type="button"
              className="text-button"
              onClick={() => onEdit(slot)}
              aria-label={t(
                locale,
                `Edit ${slot}`,
                `編輯${label(slot, locale)}`,
              )}
            >
              {t(locale, "Edit", "編輯")}
            </button>
            <button
              type="button"
              className="text-button danger-text"
              onClick={() => onDelete(slot)}
              aria-label={t(
                locale,
                `Delete ${slot}`,
                `刪除${label(slot, locale)}`,
              )}
            >
              {t(locale, "Delete", "刪除")}
            </button>
          </div>
        </li>
      ))}
    </ul>
  ) : (
    <p className="muted empty-note">
      {t(
        locale,
        "Nothing recorded for this day. Add just what you remember.",
        "這天還沒有紀錄，記下你記得的內容就好。",
      )}
    </p>
  );
}

function PreferenceControls({
  profile,
  update,
  locale,
}: {
  profile: Profile;
  update: (next: Profile) => void;
  locale: Locale;
}) {
  const toggle = (field: "preferenceTags" | "avoidTags", value: string) =>
    update({
      ...profile,
      [field]: profile[field].includes(value as never)
        ? profile[field].filter((tag) => tag !== value)
        : [...profile[field], value],
    });
  return (
    <>
      <p className="muted">
        {t(
          locale,
          "Optional. Your choices stay in this browser. Avoided ingredients also apply to suggested drinks.",
          "可自由設定，選擇只存在此瀏覽器。避開食材也會套用到搭配飲料。",
        )}
      </p>
      <fieldset>
        <legend>
          {t(locale, "Foods & styles you enjoy", "喜歡的餐點與風格")}
        </legend>
        <div className="chip-list">
          {preferenceTags.map((tag) => (
            <button
              type="button"
              key={tag}
              className={cx(
                "chip",
                profile.preferenceTags.includes(tag) && "selected",
              )}
              aria-pressed={profile.preferenceTags.includes(tag)}
              onClick={() => toggle("preferenceTags", tag)}
            >
              {label(tag, locale)}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>
          {t(locale, "Keep these out of suggestions", "從建議中避開這些項目")}
        </legend>
        <p className="small muted">
          {t(
            locale,
            "Recipes vary. Check actual ingredients and preparation when ordering or cooking; this catalog cannot certify allergy safety.",
            "實際配方可能不同，點餐或料理時仍需確認食材與製作方式；餐點庫無法認證過敏安全。",
          )}
        </p>
        <div className="chip-list">
          {avoidTags.map((tag) => (
            <button
              type="button"
              key={tag}
              className={cx(
                "chip avoid-chip",
                profile.avoidTags.includes(tag) && "selected",
              )}
              aria-pressed={profile.avoidTags.includes(tag)}
              onClick={() => toggle("avoidTags", tag)}
            >
              {label(tag, locale)}
            </button>
          ))}
        </div>
      </fieldset>
    </>
  );
}

function Receipt({
  meal,
  locale,
}: {
  meal: ScoredRecommendation;
  locale: Locale;
}) {
  const trace = meal.selectionTrace;
  const categories: Record<string, [string, string]> = {
    protein: ["Recorded protein foods", "已記錄的蛋白質食物"],
    vegetables: ["Recorded vegetables", "已記錄的蔬菜"],
    carbs: ["Recorded staples", "已記錄的主食"],
    heaviness: ["Meal style", "餐點風格"],
    convenience: ["Practical fit", "便利程度"],
    profile: ["Current mood", "當下想法"],
    preferences: ["Preferences", "偏好"],
    avoid: ["Avoided items", "避開項目"],
    variety: ["Variety", "餐點變化"],
    "snack-drink": ["Snacks & drinks", "點心與飲料"],
    "time-of-day": ["Time window", "時段"],
    "weekly-pattern": ["Recent records", "近期紀錄"],
  };
  return (
    <details className="receipt">
      <summary>
        {t(
          locale,
          "How this suggestion was selected",
          "查看這道推薦的選擇方式",
        )}
      </summary>
      <p className="small muted">
        {t(
          locale,
          "These are product-rule points for matching and variety, not a nutrition or health score. Missing food records do not establish what you ate.",
          "這些是用來配對與增加變化的產品規則分數。紀錄未提到某種食物，不代表你沒有吃，也不代表營養不足。",
        )}
      </p>
      <table>
        <caption className="sr-only">
          {t(locale, "Matching rule calculation", "配對規則計算")}
        </caption>
        <thead>
          <tr>
            <th>{t(locale, "Rule", "規則")}</th>
            <th>{t(locale, "Points", "分數")}</th>
          </tr>
        </thead>
        <tbody>
          {meal.scoreBreakdown.map((item) => (
            <tr key={item.category}>
              <td>
                <strong>
                  {t(
                    locale,
                    ...(categories[item.category] ?? [
                      item.category,
                      item.category,
                    ]),
                  )}
                </strong>
                <span>{item.note}</span>
              </td>
              <td>
                {item.points > 0 ? "+" : ""}
                {item.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small">
        {t(locale, "Rule total", "規則合計")}: {meal.score} ·{" "}
        {t(locale, "Selection total", "選擇合計")}:{" "}
        {trace?.selectionScore ?? meal.score}
      </p>
      {trace && (
        <>
          <p className="small muted">
            {t(
              locale,
              `Practical perspective ${trace.perspectiveScore}, catalog rotation ${trace.fairnessAdjustment}, format variety ${trace.formatDiversityAdjustment}. The repeatable near-tie selection uses ${trace.nearTieCount} candidates within ${trace.nearTieWindow} points.`,
              `情境配對 ${trace.perspectiveScore}、餐點輪替 ${trace.fairnessAdjustment}、餐型變化 ${trace.formatDiversityAdjustment}。近同分選擇使用相差 ${trace.nearTieWindow} 分內的 ${trace.nearTieCount} 道候選，結果可重現。`,
            )}
          </p>
          <details>
            <summary>{t(locale, "Full calculation", "完整計算")}</summary>
            {trace.perspectiveAdjustments.map((item, index) => (
              <p className="small" key={`${item.key}-${index}`}>
                {label(item.key, locale)}: {item.points} · {item.note}
              </p>
            ))}
          </details>
        </>
      )}
      <p className="small muted">
        {t(
          locale,
          `Prior days logged: ${meal.weeklyHistoryBasis.loggedDayCount} / ${meal.weeklyHistoryBasis.availableDayCount}. Prior meals used: ${meal.weeklyHistoryBasis.loggedMealCount}. Weekly adjustment: ${meal.weeklyPatternScore}.`,
          `已記錄的過去天數：${meal.weeklyHistoryBasis.loggedDayCount}／${meal.weeklyHistoryBasis.availableDayCount}。使用的過去餐數：${meal.weeklyHistoryBasis.loggedMealCount}。近期紀錄調整：${meal.weeklyPatternScore}。`,
        )}
      </p>
      <p className="small muted">
        {t(
          locale,
          "Recent-pattern adjustments start when 4 meals are logged across at least 2 distinct prior days. Today is excluded. This is recorded food-group presence, not serving adequacy, calories, or a dietary assessment.",
          "前六天中至少兩天、合計四餐有紀錄，才會加入近期模式調整；不包含今天。這只描述紀錄中的食物類別，不代表份量充足度、熱量或飲食評估。",
        )}
      </p>
    </details>
  );
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(loadLocale);
  const [realState, setRealState] = useState<LaunchState>(loadLaunchState);
  const [demoState, setDemoState] = useState<LaunchState | null>(null);
  const state = demoState ?? realState;
  const isDemo = demoState !== null;
  const [clock, setClock] = useState(() => new Date());
  const [storageFailed, setStorageFailed] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [draft, setDraft] = useState<ParsedMeal>(blankDraft);
  const [fields, setFields] = useState<FoodFields>(emptyFields);
  const [review, setReview] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    dayId: string;
    slot: MealName;
  } | null>(null);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [selected, setSelected] = useState(0);
  const [changeNote, setChangeNote] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [aiText, setAiText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [historyDay, setHistoryDay] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    dayId: string;
    slot: MealName;
  } | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const composerRef = useRef<HTMLElement>(null);
  const decisionRef = useRef<HTMLElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const aiRequestGeneration = useRef(0);
  const realStateRef = useRef(realState);
  realStateRef.current = realState;
  const updateState = (update: (current: LaunchState) => LaunchState) =>
    isDemo
      ? setDemoState((current) => (current ? update(current) : current))
      : setRealState(update);
  const invalidateAiRequest = () => {
    aiRequestGeneration.current += 1;
    setIsParsing(false);
  };
  const scrollTo = (element: HTMLElement | null) =>
    element?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });

  useEffect(() => {
    return () => {
      aiRequestGeneration.current += 1;
    };
  }, []);
  useEffect(() => {
    if (!saveLocale(locale)) setStorageFailed(true);
    document.documentElement.lang = locale === "zh" ? "zh-Hant" : "en";
    document.title = t(
      locale,
      "NextBite — Find your next meal",
      "NextBite — 輕鬆選下一餐",
    );
  }, [locale]);
  useEffect(() => {
    setStorageFailed(!saveLaunchState(realState));
  }, [realState]);
  useEffect(() => {
    const refresh = () => {
      const now = new Date();
      setClock(now);
      const todayId = toLocalDateId(now);
      const roll = (current: LaunchState) =>
        current.days.some((day) => day.isToday && day.id === todayId)
          ? current
          : {
              ...current,
              days: rollSevenDayHistory(current.days, now),
              selectedDayId: todayId,
            };
      setRealState(roll);
      setDemoState((current) => (current ? roll(current) : null));
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  const timeWindow = getMealTimeWindow(clock);
  const dateId = toLocalDateId(clock);
  const today =
    state.days.find((day) => day.isToday) ?? state.days[state.days.length - 1];
  const hasMeal = mealNames.some((slot) => isMealLogged(today.todayLog[slot]));
  const recommendations = useMemo(
    () =>
      scoreRecommendations(
        state.profile,
        today.todayLog,
        state.days,
        locale,
        new Date(
          `${dateId}T${({ breakfast: "09", lunch: "12", afternoon: "16", dinner: "18", late: "22" } as const)[timeWindow]}:30:00`,
        ),
      ),
    [state.profile, state.days, today.todayLog, locale, timeWindow, dateId],
  );
  const active =
    recommendations[selected % Math.max(recommendations.length, 1)] ?? null;
  const filteredCount = countHardAvoidedRecommendations(state.profile, clock);
  const weekly = useMemo(
    () => buildWeeklySnapshot(state.days, state.profile, locale),
    [state.days, state.profile, locale],
  );
  const past = state.days.filter((day) => !day.isToday);
  const selectedPast =
    past.find((day) => day.id === historyDay) ?? past[past.length - 1];
  const targetDay = editTarget
    ? (state.days.find((day) => day.id === editTarget.dayId) ?? today)
    : today;
  const existing = targetDay.todayLog[draft.mealSlot];
  const conflict = !editTarget && isMealLogged(existing);
  const activePresentation = active
    ? getMealPresentation(active, locale)
    : null;
  const filteredCatalog = recommendationDataset.filter((meal) =>
    `${meal.title} ${mealTitle(meal, "zh")} ${meal.tags.join(" ")}`
      .toLowerCase()
      .includes(catalogQuery.toLowerCase().trim()),
  );

  const resetComposer = () => {
    invalidateAiRequest();
    setDraft(blankDraft());
    setFields(emptyFields());
    setReview(false);
    setEditTarget(null);
    setPendingPlanId(null);
    setFormError("");
  };
  const startDraft = (
    next: ParsedMeal,
    target: { dayId: string; slot: MealName } | null = null,
  ) => {
    invalidateAiRequest();
    setDraft(next);
    setFields(fieldsFrom(next));
    setEditTarget(target);
    setPendingPlanId(null);
    setReview(false);
    setFormError("");
    scrollTo(composerRef.current);
  };
  const startDemo = () => {
    const demo: LaunchState = {
      ...createBlankState(new Date()),
      plannedMeals: [],
    };
    const sample: ParsedMeal = {
      ...blankDraft("Lunch"),
      mealSource: "Restaurant",
      cookingMethod: "Soup / stew",
      displayName: "Beef noodle soup",
      components: [
        {
          name: "Beef",
          group: "protein",
          amount: amount(),
          confidence: "high",
        },
        {
          name: "Noodles",
          group: "carb",
          amount: amount(),
          confidence: "high",
        },
        {
          name: "Milk tea",
          group: "drink",
          amount: amount(),
          confidence: "high",
        },
      ],
    };
    const demoToday = demo.days.find((day) => day.isToday)!;
    demoToday.todayLog.Lunch = parsedMealToEntry(sample);
    setDemoState(demo);
    setSelected(0);
    resetComposer();
    setMessage(
      t(
        locale,
        "Example mode started. Your own data stays separate.",
        "已進入範例模式，你自己的資料會分開保留。",
      ),
    );
    window.requestAnimationFrame(() => scrollTo(decisionRef.current));
  };
  const exitDemo = () => {
    setDemoState(null);
    setSelected(0);
    resetComposer();
    setMessage(
      t(
        locale,
        "Back to your own meals and preferences.",
        "已回到你自己的餐點與偏好。",
      ),
    );
  };
  const reviewMeal = () => {
    const components = groups.flatMap((item) => {
      const previous = draft.components.filter(
        (component) => component.group === item.group,
      );
      return splitFoods(fields[item.field]).map((name) => {
        const index = previous.findIndex(
          (component) => component.name === name,
        );
        return index >= 0
          ? previous.splice(index, 1)[0]
          : {
              name,
              group: item.group,
              amount: amount(),
              confidence: "high" as const,
            };
      });
    });
    if (!components.length) {
      setFormError(
        t(
          locale,
          "Add at least one food or drink first.",
          "請先加入至少一項食物或飲料。",
        ),
      );
      return;
    }
    if (
      components.length > 40 ||
      components.some((component) => component.name.length > 120)
    ) {
      setFormError(
        t(
          locale,
          "Use up to 40 items, with each item under 120 characters.",
          "最多可輸入 40 個項目，每個項目請少於 120 個字元。",
        ),
      );
      return;
    }
    setDraft((current) => ({ ...current, components }));
    setReview(true);
    setFormError("");
    window.requestAnimationFrame(() => {
      reviewRef.current?.focus();
    });
  };
  const commitMeal = (mode: "append" | "replace") => {
    if (editTarget && !state.days.some((day) => day.id === editTarget.dayId)) {
      setFormError(
        t(
          locale,
          "That day is outside the rolling seven-day window. Cancel this edit and choose a current day.",
          "這天已超出滾動七天範圍，請取消編輯並重新選擇日期。",
        ),
      );
      return;
    }
    if (!draft.components.some((component) => component.name.trim())) {
      setFormError(
        t(locale, "Keep at least one named food.", "請保留至少一項食物。"),
      );
      return;
    }
    if (
      draft.components.some(
        (component) =>
          component.amount.quantity !== null &&
          (!Number.isFinite(component.amount.quantity) ||
            component.amount.quantity <= 0 ||
            component.amount.unit === "unspecified"),
      )
    ) {
      setFormError(
        t(
          locale,
          "Choose a unit for each stated amount, or leave the amount blank.",
          "有填數量時，請一起選擇單位；也可以將數量留白。",
        ),
      );
      return;
    }
    const entry = parsedMealToEntry({
      ...draft,
      components: draft.components
        .filter((component) => component.name.trim())
        .map((component) => ({ ...component, name: component.name.trim() })),
    });
    if (editTarget)
      entry.componentDetails.push(
        ...targetDay.todayLog[editTarget.slot].componentDetails.filter(
          isMergeContextComponent,
        ),
      );
    updateState((current) => {
      const next = {
        ...current,
        days: current.days.map((day) =>
          day.id === targetDay.id
            ? {
                ...day,
                todayLog: {
                  ...day.todayLog,
                  [draft.mealSlot]:
                    mode === "append"
                      ? mergeMealEntries(day.todayLog[draft.mealSlot], entry)
                      : entry,
                },
              }
            : day,
        ),
      };
      return pendingPlanId ? removePlan(next, pendingPlanId) : next;
    });
    setSelected(0);
    resetComposer();
    setMessage(
      t(
        locale,
        "Meal recorded. Your next options are ready.",
        "已儲存餐點，下一餐建議已更新。",
      ),
    );
    window.requestAnimationFrame(() => scrollTo(decisionRef.current));
  };
  const editMeal = (day: DayHistory, slot: MealName) =>
    startDraft(entryDraft(day.todayLog[slot], slot, locale), {
      dayId: day.id,
      slot,
    });
  const deleteMeal = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    updateState((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === target.dayId
          ? {
              ...day,
              todayLog: { ...day.todayLog, [target.slot]: createEmptyMeal() },
            }
          : day,
      ),
    }));
    setDeleteTarget(null);
    resetComposer();
    setMessage(
      t(locale, "Meal removed from your records.", "已從紀錄中移除這餐。"),
    );
  };
  const changeProfile = (profile: Profile, note?: string) => {
    updateState((current) => ({ ...current, profile }));
    setSelected(0);
    setChangeNote(
      note ??
        t(
          locale,
          "Preferences updated. Suggestions recalculated.",
          "偏好已更新，建議已重新配對。",
        ),
    );
  };
  const beginConsumed = (meal: Recommendation, planId: string) => {
    const next: ParsedMeal = {
      ...blankDraft(),
      displayName: mealTitle(meal, locale),
      components: getNamedMealComponents(meal).map((component) => ({
        ...component,
        name: translateFood(component.name, locale),
        amount: amount(),
        confidence: "limited",
      })),
      assumptions: [
        t(
          locale,
          "These are named components from a meal idea. Edit them to match what you actually ate; recipe details and amounts are unspecified.",
          "這些是餐名中的主要內容。請修改成你實際吃的食物，配方細節與份量尚未指定。",
        ),
      ],
    };
    startDraft(next);
    setPendingPlanId(planId);
  };
  const runAi = async () => {
    if (!apiKey || !aiText.trim()) {
      setFormError(
        t(
          locale,
          "Add your session key and describe a meal, or use the quick form above.",
          "請加入本次使用的金鑰並描述餐點，或直接使用上方快速輸入。",
        ),
      );
      return;
    }
    const requestGeneration = ++aiRequestGeneration.current;
    setIsParsing(true);
    setFormError("");
    try {
      const result = await parseMealWithAi({
        text: aiText.trim(),
        locale,
        apiKey,
        mealSlotHint: draft.mealSlot,
      });
      if (requestGeneration !== aiRequestGeneration.current) return;
      const next = {
        ...result,
        portion:
          result.portion.confidence === "limited"
            ? { size: "Unspecified" as const, confidence: "limited" as const }
            : result.portion,
      };
      setDraft(next);
      setFields(fieldsFrom(next));
      setEditTarget(null);
      setPendingPlanId(null);
      setReview(true);
      window.requestAnimationFrame(() => {
        if (requestGeneration === aiRequestGeneration.current)
          reviewRef.current?.focus();
      });
    } catch {
      if (requestGeneration !== aiRequestGeneration.current) return;
      setFormError(
        t(
          locale,
          "AI could not prepare this meal. Your text is still here; try the quick form or check your key and connection.",
          "AI 暫時無法整理這餐。你的文字仍保留著，可以使用快速輸入，或檢查金鑰與連線。",
        ),
      );
    } finally {
      if (requestGeneration === aiRequestGeneration.current)
        setIsParsing(false);
    }
  };
  const share = async () => {
    if (!activePresentation || sharing) return;
    setSharing(true);
    try {
      await downloadMealCard({
        title: activePresentation.title,
        cuisine: activePresentation.cuisine,
        tip: activePresentation.tip,
        locale,
      });
      setMessage(
        t(
          locale,
          "Meal card downloaded. It contains no personal records or preferences.",
          "已下載選餐小卡，不包含個人紀錄或偏好。",
        ),
      );
    } catch {
      setMessage(
        t(
          locale,
          "The card could not be downloaded. Please try again.",
          "小卡暫時無法下載，請再試一次。",
        ),
      );
    } finally {
      setSharing(false);
    }
  };
  const clearAll = () => {
    const cleared = clearLaunchStorage();
    const blank: LaunchState = {
      ...createBlankState(new Date()),
      plannedMeals: [],
    };
    setRealState(blank);
    setDemoState(null);
    setApiKey("");
    setAiText("");
    setLocale("en");
    setClearOpen(false);
    resetComposer();
    setPreferencesOpen(false);
    setSelected(0);
    setMessage(
      cleared
        ? "Your NextBite records, plans, preferences and session key have been cleared."
        : "This session was cleared, but browser storage could not be accessed. Check your browser's site-data settings.",
    );
    setStorageFailed(!cleared);
  };

  return (
    <>
      <a className="skip-link" href="#meal-input">
        {t(locale, "Skip to meal input", "跳到餐點輸入")}
      </a>
      <header className="site-header">
        <a
          href="#"
          className="brand"
          aria-label={t(locale, "NextBite home", "NextBite 首頁")}
        >
          <span className="brand-icon">N</span>
          <span>
            Next<span className="brand-green">Bite</span>
            <small>
              {t(locale, "A little less deciding.", "讓選餐輕鬆一點。")}
            </small>
          </span>
        </a>
        <nav aria-label={t(locale, "Settings", "設定")}>
          <button
            className="nav-button"
            type="button"
            aria-expanded={preferencesOpen}
            aria-controls="preferences"
            onClick={() => setPreferencesOpen((value) => !value)}
          >
            {t(locale, "Preferences", "偏好")}
            {state.profile.avoidTags.length > 0 && (
              <span className="count-dot">
                {state.profile.avoidTags.length}
              </span>
            )}
          </button>
          <button
            className="nav-button language"
            type="button"
            onClick={() => {
              setLocale((value) => (value === "en" ? "zh" : "en"));
              setMessage("");
              setChangeNote("");
              setFormError("");
            }}
            aria-label={t(locale, "切換繁體中文", "Switch to English")}
          >
            {locale === "en" ? "繁中" : "EN"}
          </button>
        </nav>
      </header>
      <main className="page-shell">
        {isDemo && (
          <aside className="demo-banner">
            <div>
              <strong>
                {t(locale, "You're trying an example", "你正在體驗範例")}
              </strong>
              <span>
                {t(
                  locale,
                  "Nothing here changes your own meals, plans or preferences.",
                  "這裡的操作不會改變你自己的餐點、計畫或偏好。",
                )}
              </span>
            </div>
            <button
              className="button small-button"
              type="button"
              onClick={exitDemo}
            >
              {t(locale, "Back to my meals", "回到我的餐點")}
            </button>
          </aside>
        )}
        {storageFailed && (
          <p className="notice warning" role="status">
            {t(
              locale,
              "Browser storage is unavailable or full. You can still use this page, but changes may not survive a reload. Export your records below.",
              "瀏覽器儲存空間無法使用或已滿。仍可在本頁操作，但重新整理可能無法保留變更，請從下方匯出紀錄。",
            )}
          </p>
        )}
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              {t(locale, "FOR YOUR EVERYDAY APPETITE", "照顧每天的選餐小煩惱")}
            </p>
            <h1 id="hero-title">
              {t(locale, "One less thing", "下一餐，")}
              <br className="en-break" />
              {t(locale, " to decide.", "輕鬆決定。")}
            </h1>
            <p className="hero-description">
              {t(
                locale,
                "From rice bowls to sandwiches. Find a next meal that fits what you've eaten, how you feel, and your day.",
                "從家常飯菜到三明治，根據你記錄的餐點、當下想法與生活安排，找到下一餐。",
              )}
            </p>
            <div className="hero-actions">
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  scrollTo(composerRef.current);
                  composerRef.current
                    ?.querySelector<HTMLInputElement>("input")
                    ?.focus({ preventScroll: true });
                }}
              >
                {t(locale, "Find my next meal", "開始選下一餐")}{" "}
                <span aria-hidden="true">↗</span>
              </button>
              <button
                type="button"
                className="button quiet"
                onClick={startDemo}
              >
                {t(locale, "Try an example", "看範例")}
              </button>
            </div>
            <p className="hero-footnote">
              {t(
                locale,
                "No account. No API key needed. English / 繁中.",
                "免登入、免 API key，支援英文與繁中。",
              )}
            </p>
          </div>
          <div className="hero-art">
            <BowlArt />
            <span>
              {t(
                locale,
                "Familiar food. A fresh idea.",
                "熟悉的食物，換個新想法。",
              )}
            </span>
          </div>
        </section>
        <div className="live-message" role="status" aria-live="polite">
          {message}
        </div>
        {preferencesOpen && (
          <section id="preferences" className="panel preference-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  {t(locale, "MAKE IT YOURS", "更貼近你的喜好")}
                </p>
                <h2>{t(locale, "Your preferences", "你的偏好")}</h2>
              </div>
              <button
                type="button"
                className="button quiet small-button"
                onClick={() => setPreferencesOpen(false)}
              >
                {t(locale, "Done", "完成")}
              </button>
            </div>
            <PreferenceControls
              profile={state.profile}
              update={(profile) => changeProfile(profile)}
              locale={locale}
            />
          </section>
        )}
        <div className="main-grid">
          <div className="input-column">
            <section
              className="panel composer"
              id="meal-input"
              ref={composerRef}
              aria-labelledby="input-title"
              onChangeCapture={() => {
                if (isParsing) invalidateAiRequest();
              }}
              onClickCapture={(event) => {
                if (
                  isParsing &&
                  event.target instanceof Element &&
                  event.target.closest(
                    "button, input, select, textarea, summary",
                  )
                )
                  invalidateAiRequest();
              }}
            >
              <p className="eyebrow">
                {t(locale, "01 / A LITTLE CONTEXT", "01／先了解一點")}
              </p>
              <div className="section-heading">
                <h2 id="input-title">
                  {editTarget
                    ? t(locale, "Edit your meal", "編輯這餐")
                    : pendingPlanId
                      ? t(
                          locale,
                          "What did you actually eat?",
                          "你實際吃了什麼？",
                        )
                      : t(locale, "What have you eaten?", "剛剛吃了什麼？")}
                </h2>
                {(editTarget || pendingPlanId) && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={resetComposer}
                  >
                    {t(locale, "Cancel", "取消")}
                  </button>
                )}
              </div>
              {editTarget && (
                <p className="small muted">
                  {formatDate(targetDay.date, locale)} ·{" "}
                  {label(editTarget.slot, locale)}
                </p>
              )}
              {!review ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    reviewMeal();
                  }}
                >
                  <p className="muted">
                    {t(
                      locale,
                      "Pick familiar foods or type your own. Add only what you know; amounts can stay unspecified.",
                      "選常見食物或自行輸入，只記得什麼就填什麼，份量可以保留未知。",
                    )}
                  </p>
                  {groups.slice(0, 4).map((item) => (
                    <div className="food-field" key={item.field}>
                      <label htmlFor={`food-${item.field}`}>
                        {t(locale, item.en, item.zh)}
                      </label>
                      <input
                        id={`food-${item.field}`}
                        value={fields[item.field]}
                        maxLength={1200}
                        onChange={(event) =>
                          setFields((current) => ({
                            ...current,
                            [item.field]: event.target.value,
                          }))
                        }
                        placeholder={t(
                          locale,
                          "Separate items with commas",
                          "多個項目可用頓號或逗號分隔",
                        )}
                      />
                      <div className="quick-foods">
                        {item.examples.map((food) => (
                          <button
                            type="button"
                            key={food}
                            onClick={() =>
                              setFields((current) => ({
                                ...current,
                                [item.field]: [
                                  ...new Set([
                                    ...splitFoods(current[item.field]),
                                    translateFood(food, locale),
                                  ]),
                                ].join(", "),
                              }))
                            }
                          >
                            + {translateFood(food, locale)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <details
                    className="optional-fields"
                    open={Boolean(fields.fruit || fields.soup || fields.other)}
                  >
                    <summary>
                      {t(
                        locale,
                        "Fruit, soup & other foods",
                        "水果、湯品與其他食物",
                      )}
                    </summary>
                    {groups.slice(4).map((item) => (
                      <label key={item.field}>
                        {t(locale, item.en, item.zh)}
                        <input
                          value={fields[item.field]}
                          maxLength={1200}
                          onChange={(event) =>
                            setFields((current) => ({
                              ...current,
                              [item.field]: event.target.value,
                            }))
                          }
                        />
                      </label>
                    ))}
                  </details>
                  <ContextFields
                    draft={draft}
                    setDraft={setDraft}
                    locale={locale}
                    lockSlot={Boolean(editTarget)}
                  />
                  <button type="submit" className="button primary full-width">
                    {t(locale, "Review this meal", "檢查這餐內容")}{" "}
                    <span aria-hidden="true">→</span>
                  </button>
                </form>
              ) : (
                <div className="review-area" ref={reviewRef} tabIndex={-1}>
                  <div className="review-heading">
                    <span className="eyebrow">
                      {t(locale, "CHECK BEFORE SAVING", "儲存前確認一下")}
                    </span>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setFields(fieldsFrom(draft));
                        setReview(false);
                      }}
                    >
                      {t(locale, "Back to input", "返回輸入")}
                    </button>
                  </div>
                  {draft.clarification && (
                    <p className="notice">{draft.clarification}</p>
                  )}
                  {draft.assumptions.map((note, index) => (
                    <p className="small muted" key={index}>
                      {note}
                    </p>
                  ))}
                  {draft.components.map((component, index) => (
                    <div className="component-editor" key={index}>
                      <label>
                        {t(locale, "Food", "食物")}
                        <input
                          value={component.name}
                          maxLength={120}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              components: current.components.map((item, i) =>
                                i === index
                                  ? { ...item, name: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                        />
                      </label>
                      <label>
                        {t(locale, "Group", "類別")}
                        <select
                          value={component.group}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              components: current.components.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      group: event.target
                                        .value as ParsedMealComponent["group"],
                                    }
                                  : item,
                              ),
                            }))
                          }
                        >
                          {groups.map((item) => (
                            <option key={item.group} value={item.group}>
                              {t(locale, item.en, item.zh)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {t(locale, "Amount (optional)", "數量（選填）")}
                        <input
                          type="number"
                          min="0.01"
                          max="100"
                          step="any"
                          value={component.amount.quantity ?? ""}
                          placeholder={t(locale, "Unspecified", "未說明")}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              components: current.components.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      amount: {
                                        quantity: event.target.value
                                          ? Math.max(
                                              0.01,
                                              Math.min(
                                                100,
                                                Number(event.target.value),
                                              ),
                                            )
                                          : null,
                                        unit: item.amount.unit,
                                        qualifier: event.target.value
                                          ? "exact"
                                          : "unspecified",
                                        originalText: null,
                                      },
                                    }
                                  : item,
                              ),
                            }))
                          }
                        />
                      </label>
                      <label>
                        {t(locale, "Unit", "單位")}
                        <select
                          value={component.amount.unit}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              components: current.components.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      amount: {
                                        ...item.amount,
                                        unit: event.target
                                          .value as ParsedAmountUnit,
                                        originalText: null,
                                      },
                                    }
                                  : item,
                              ),
                            }))
                          }
                        >
                          {[
                            "unspecified",
                            "bowl",
                            "cup",
                            "plate",
                            "piece",
                            "slice",
                            "serving",
                            "portion",
                            "tablespoon",
                            "teaspoon",
                            "handful",
                            "glass",
                            "can",
                            "bottle",
                          ].map((unit) => (
                            <option key={unit} value={unit}>
                              {label(unit, locale)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="text-button danger-text remove-component"
                        aria-label={t(
                          locale,
                          `Remove ${component.name}`,
                          `移除${component.name}`,
                        )}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            components: current.components.filter(
                              (_, i) => i !== index,
                            ),
                          }))
                        }
                      >
                        {t(locale, "Remove", "移除")}
                      </button>
                    </div>
                  ))}
                  <button
                    className="text-button"
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        components: [
                          ...current.components,
                          {
                            name: "",
                            group: "other",
                            amount: amount(),
                            confidence: "high",
                          },
                        ],
                      }))
                    }
                  >
                    + {t(locale, "Add a food", "加入食物")}
                  </button>
                  <ContextFields
                    draft={draft}
                    setDraft={setDraft}
                    locale={locale}
                    lockSlot={Boolean(editTarget)}
                  />
                  {conflict ? (
                    <div className="notice">
                      <strong>
                        {t(
                          locale,
                          `You already recorded ${label(draft.mealSlot, locale)}.`,
                          `你已經記錄過${label(draft.mealSlot, locale)}。`,
                        )}
                      </strong>
                      <p className="small">
                        {t(
                          locale,
                          "Add these foods to that meal, or replace it with this entry.",
                          "可以把這些食物補充到原本那餐，或用這筆內容取代。",
                        )}
                      </p>
                      <div className="button-row">
                        <button
                          type="button"
                          className="button primary"
                          onClick={() => commitMeal("append")}
                        >
                          {t(locale, "Add to this meal", "補充這餐")}
                        </button>
                        <button
                          type="button"
                          className="button quiet"
                          onClick={() => commitMeal("replace")}
                        >
                          {t(locale, "Replace this meal", "取代這餐")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="button primary full-width"
                      onClick={() => commitMeal("replace")}
                    >
                      {editTarget
                        ? t(locale, "Save changes", "儲存修改")
                        : t(
                            locale,
                            "Confirm & find my next meal",
                            "確認並找下一餐",
                          )}
                    </button>
                  )}
                </div>
              )}
              {formError && (
                <p className="notice error" role="alert">
                  {formError}
                </p>
              )}
              <details className="ai-details">
                <summary>
                  {t(
                    locale,
                    "Optional: let AI organize your words",
                    "進階選用：讓 AI 整理文字",
                  )}
                </summary>
                <p className="small muted">
                  {t(
                    locale,
                    "Bring your own OpenAI key. Your meal description and key pass through NextBite's relay to OpenAI. The key stays only in this page's memory; provider charges and data policies apply. The quick form works without AI.",
                    "使用自己的 OpenAI key。餐點描述與金鑰會經 NextBite 轉送至 OpenAI；金鑰只留在本頁記憶體。費用與資料處理依供應商政策，快速輸入不需要 AI。",
                  )}
                </p>
                <label>
                  {t(locale, "Session API key", "本次使用的 API key")}
                  <input
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={apiKey}
                    maxLength={512}
                    onChange={(event) => setApiKey(event.target.value)}
                    placeholder="sk-…"
                  />
                </label>
                {apiKey && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setApiKey("")}
                  >
                    {t(locale, "Forget this key", "清除金鑰")}
                  </button>
                )}
                <label>
                  {t(locale, "Describe one meal", "描述一餐")}
                  <textarea
                    maxLength={600}
                    value={aiText}
                    onChange={(event) => setAiText(event.target.value)}
                    placeholder={t(
                      locale,
                      "I had chicken rice and half a milk tea for lunch.",
                      "午餐吃了雞肉飯，喝了半杯奶茶。",
                    )}
                  />
                </label>
                <span className="small muted">{aiText.length}/600</span>
                <button
                  type="button"
                  className="button quiet full-width"
                  disabled={isParsing}
                  onClick={runAi}
                >
                  {isParsing
                    ? t(locale, "Organizing…", "整理中…")
                    : t(locale, "Organize & review", "整理並檢查")}
                </button>
              </details>
            </section>
            <section
              className="panel today-panel"
              aria-labelledby="today-title"
            >
              <div className="section-heading">
                <h2 id="today-title">
                  {t(locale, "Today, so far", "今天的紀錄")}
                </h2>
                <span className="small muted">
                  {formatDate(today.date, locale)}
                </span>
              </div>
              <LogList
                day={today}
                locale={locale}
                onEdit={(slot) => editMeal(today, slot)}
                onDelete={(slot) => setDeleteTarget({ dayId: today.id, slot })}
              />
              <p className="small muted">
                {t(
                  locale,
                  "Only what you record is shown. An empty slot does not mean you skipped a meal.",
                  "這裡只顯示你記下的內容，空白不代表你沒有吃。",
                )}
              </p>
            </section>
          </div>
          <section
            className="panel decision-panel"
            id="decision"
            ref={decisionRef}
            aria-labelledby="decision-title"
          >
            <p className="eyebrow">
              {t(locale, "02 / YOUR NEXT BITE", "02／你的下一餐")}
            </p>
            <h2 id="decision-title">
              {t(locale, "What sounds good now?", "現在想吃什麼？")}
            </h2>
            <div className="mood-controls">
              <fieldset>
                <legend>{t(locale, "I'm feeling…", "現在比較想…")}</legend>
                <div className="chip-list">
                  {(
                    [
                      ["Normal", "Open to ideas", "都可以"],
                      ["Need something light", "Something light", "清淡一點"],
                      ["Want something warm", "Something warm", "吃熱的"],
                      ["Low energy", "Keep it easy", "省點力氣"],
                    ] as Array<[FeelToday, string, string]>
                  ).map(([value, en, zh]) => (
                    <button
                      type="button"
                      className={cx(
                        "chip",
                        state.profile.feelToday === value && "selected",
                      )}
                      key={value}
                      aria-pressed={state.profile.feelToday === value}
                      onClick={() =>
                        changeProfile(
                          { ...state.profile, feelToday: value },
                          t(
                            locale,
                            `${en}. Suggestions recalculated for your choice.`,
                            `已改為「${zh}」，建議已重新配對。`,
                          ),
                        )
                      }
                    >
                      {t(locale, en, zh)}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>
                  {t(locale, "For this next meal", "下一餐的安排")}
                </legend>
                <div className="chip-list">
                  {(
                    [
                      ["Both", "Either works", "都方便"],
                      ["Mostly home-cooked", "At home", "在家準備"],
                      ["Mostly takeout", "Eating out", "外食"],
                    ] as Array<[EatingStyle, string, string]>
                  ).map(([value, en, zh]) => (
                    <button
                      type="button"
                      key={value}
                      className={cx(
                        "chip",
                        state.profile.eatingStyle === value && "selected",
                      )}
                      aria-pressed={state.profile.eatingStyle === value}
                      onClick={() =>
                        changeProfile(
                          { ...state.profile, eatingStyle: value },
                          t(
                            locale,
                            `${en}. Suggestions recalculated.`,
                            `已改為「${zh}」，建議已重新配對。`,
                          ),
                        )
                      }
                    >
                      {t(locale, en, zh)}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            <p
              className="change-announcement small"
              role="status"
              aria-live="polite"
            >
              {changeNote}
            </p>
            {!hasMeal ? (
              <div className="decision-empty">
                <BowlArt compact />
                <h3>
                  {t(
                    locale,
                    "A little context goes a long way.",
                    "從一餐開始就好。",
                  )}
                </h3>
                <p className="muted">
                  {t(
                    locale,
                    "Add something you've eaten to see three next-meal ideas, or explore an example.",
                    "記下一點吃過的內容，就能比較三個下一餐想法，也可以先體驗範例。",
                  )}
                </p>
                <button
                  type="button"
                  className="button quiet"
                  onClick={startDemo}
                >
                  {t(locale, "Explore an example", "體驗範例")}
                </button>
              </div>
            ) : !active || !activePresentation ? (
              <div className="notice no-options">
                <h3>
                  {t(
                    locale,
                    "No compatible meals in this catalog",
                    "目前餐點庫沒有符合條件的選項",
                  )}
                </h3>
                <p>
                  {t(
                    locale,
                    "Your avoided items remain excluded. Review your preferences if they have changed, or choose a meal outside this small catalog.",
                    "你設定的避開項目仍會維持排除。如果偏好有變，可以檢查設定；也可以選擇餐點庫以外的餐點。",
                  )}
                </p>
                <button
                  type="button"
                  className="button quiet"
                  onClick={() => {
                    setPreferencesOpen(true);
                    window.requestAnimationFrame(() =>
                      document
                        .getElementById("preferences")
                        ?.scrollIntoView({ block: "start" }),
                    );
                  }}
                >
                  {t(locale, "Review preferences", "檢查偏好")}
                </button>
              </div>
            ) : (
              <>
                <div className="meal-feature" key={active.id}>
                  <div className="meal-meta">
                    <span>{activePresentation.cuisine}</span>
                    <span>{activePresentation.effort}</span>
                  </div>
                  <h3>{activePresentation.title}</h3>
                  <p className="feature-reason">{active.shortReason}</p>
                  <ul className="reason-list">
                    <li>
                      {t(locale, "Named foods", "餐名中的食物")}:{" "}
                      {activePresentation.ingredients.join(
                        t(locale, ", ", "、"),
                      )}
                    </li>
                    <li>
                      {t(locale, "Works for", "適合")}{" "}
                      {active.worksFor
                        .map((value) => label(value, locale))
                        .join(t(locale, " or ", "或"))}{" "}
                      · {t(locale, "Pair with", "搭配")}{" "}
                      {label(active.suggestedDrink, locale)}
                    </li>
                  </ul>
                  <div className="feature-actions">
                    <button
                      type="button"
                      className="button primary full-width"
                      onClick={() => {
                        updateState((current) => savePlan(current, active.id));
                        setMessage(
                          t(
                            locale,
                            "Saved to your next-meal plans. It isn't recorded as eaten.",
                            "已儲存到下一餐計畫，尚未加入已吃紀錄。",
                          ),
                        );
                      }}
                    >
                      {state.plannedMeals.some(
                        (plan) => plan.mealId === active.id,
                      )
                        ? t(locale, "Saved to my plans ✓", "已儲存到計畫 ✓")
                        : t(locale, "Choose this meal", "就選這道")}{" "}
                      <span aria-hidden="true">↗</span>
                    </button>
                    <button
                      type="button"
                      className="button quiet full-width"
                      onClick={share}
                      disabled={sharing}
                    >
                      {sharing
                        ? t(locale, "Preparing card…", "製作小卡中…")
                        : t(locale, "Download meal card", "下載選餐小卡")}
                    </button>
                  </div>
                  <details className="action-tip">
                    <summary>
                      {t(locale, "Make it happen", "接下來怎麼準備")}
                    </summary>
                    <p>{activePresentation.tip}</p>
                    <p className="small muted">
                      {t(locale, "Named components", "餐名中的主要內容")}:{" "}
                      {activePresentation.ingredients.join(
                        t(locale, ", ", "、"),
                      )}
                    </p>
                    <p className="small muted">
                      {t(
                        locale,
                        "This is a meal idea, not a complete recipe. Check sauces, actual ingredients and preparation against your needs.",
                        "這是選餐想法，並非完整食譜；請依自己的需求確認醬料、實際食材與製作方式。",
                      )}
                    </p>
                  </details>
                </div>
                <div className="comparison">
                  <h3>{t(locale, "A few ways to go", "也可以這樣選")}</h3>
                  <div className="option-grid">
                    {recommendations.map((meal, index) => (
                      <button
                        type="button"
                        key={meal.id}
                        className={cx(
                          "option-card",
                          selected % recommendations.length === index &&
                            "active",
                        )}
                        aria-pressed={
                          selected % recommendations.length === index
                        }
                        onClick={() => {
                          setSelected(index);
                          setMessage(
                            t(
                              locale,
                              "Showing another option. Your meal records stay the same.",
                              "已切換比較選項，你的餐點紀錄不變。",
                            ),
                          );
                        }}
                      >
                        <span>{label(meal.label, locale)}</span>
                        <strong>{mealTitle(meal, locale)}</strong>
                        <small>
                          {getMealPresentation(meal, locale).effort} ·{" "}
                          {getMealPresentation(meal, locale).cuisine}
                        </small>
                      </button>
                    ))}
                  </div>
                </div>
                <Receipt meal={active} locale={locale} />
                <p className="small muted filtered-note">
                  {t(
                    locale,
                    `${filteredCount} of 100 curated meals excluded by your current avoids.`,
                    `目前避開設定已從 100 道精選餐點中排除 ${filteredCount} 道。`,
                  )}
                </p>
              </>
            )}
          </section>
        </div>
        <section className="panel plans-panel" aria-labelledby="plans-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {t(locale, "A SMALL PLAN FOR LATER", "留給下一餐的想法")}
              </p>
              <h2 id="plans-title">
                {t(locale, "My next-meal plans", "我的下一餐計畫")}
              </h2>
            </div>
            <span className="small muted">{state.plannedMeals.length}/12</span>
          </div>
          <p className="muted">
            {t(
              locale,
              "Saved ideas stay here until you remove them or record what you ate. Up to 12 recent ideas are kept in this browser.",
              "儲存的想法會留在這裡，直到你移除或記錄吃過的內容；此瀏覽器最多保留最近 12 道。",
            )}
          </p>
          {state.plannedMeals.length ? (
            <div className="plan-grid">
              {state.plannedMeals.map((plan) => {
                const meal = recommendationDataset.find(
                  (item) => item.id === plan.mealId,
                );
                if (!meal) return null;
                const detail = getMealPresentation(meal, locale);
                const conflicts = getHardAvoidConflicts(
                  state.profile,
                  meal,
                  timeWindow,
                );
                return (
                  <article className="plan-card" key={plan.id}>
                    <span className="small muted">{detail.cuisine}</span>
                    <h3>{detail.title}</h3>
                    {conflicts.length ? (
                      <p className="notice small">
                        {t(
                          locale,
                          "This saved idea conflicts with your current avoids. Review or remove it. Recording something you actually ate is still available.",
                          "這道先前儲存的想法不符合目前的避開設定，可檢查或移除。你仍可記錄實際吃過的內容。",
                        )}
                      </p>
                    ) : (
                      <p className="small">{detail.tip}</p>
                    )}
                    <div className="button-row">
                      <button
                        type="button"
                        className="button quiet small-button"
                        onClick={() => beginConsumed(meal, plan.id)}
                      >
                        {t(
                          locale,
                          "I ate this — review",
                          "我吃了這道，確認內容",
                        )}
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        aria-label={t(
                          locale,
                          `Remove plan: ${detail.title}`,
                          `移除計畫：${detail.title}`,
                        )}
                        onClick={() => {
                          updateState((current) =>
                            removePlan(current, plan.id),
                          );
                          setMessage(
                            t(
                              locale,
                              "Plan removed. Your meal records are unchanged.",
                              "已移除計畫，已吃紀錄不變。",
                            ),
                          );
                        }}
                      >
                        {t(locale, "Remove", "移除")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="empty-note muted">
              {t(
                locale,
                "Found something you like? Choose a meal above to keep it here.",
                "看到喜歡的餐點時，按「就選這道」就能留在這裡。",
              )}
            </p>
          )}
        </section>
        <section className="panel" id="recent-history">
          <details className="history-details">
            <summary>
              <span>
                <span className="eyebrow">
                  {t(
                    locale,
                    "WHEN YOU WANT THE BIGGER PICTURE",
                    "想回顧時再看看",
                  )}
                </span>
                <span className="summary-title">
                  {t(locale, "Recent 7 days", "最近七天")}
                </span>
              </span>
            </summary>
            <p className="muted">
              {t(
                locale,
                "Records stay in this browser and roll over after seven calendar days. Export them below if you want to keep a copy. Unrecorded meals remain unknown.",
                "紀錄只存在此瀏覽器，並保留滾動的七個日曆日。想保留副本可從下方匯出；未記錄的餐點仍是未知。",
              )}
            </p>
            <div
              className="date-tabs"
              role="group"
              aria-label={t(locale, "Previous days", "過去日期")}
            >
              {past.map((day) => (
                <button
                  className={cx(
                    "chip",
                    selectedPast?.id === day.id && "selected",
                  )}
                  type="button"
                  key={day.id}
                  aria-pressed={selectedPast?.id === day.id}
                  onClick={() => setHistoryDay(day.id)}
                >
                  {formatDate(day.date, locale)}
                </button>
              ))}
            </div>
            {selectedPast && (
              <>
                <LogList
                  day={selectedPast}
                  locale={locale}
                  onEdit={(slot) => editMeal(selectedPast, slot)}
                  onDelete={(slot) =>
                    setDeleteTarget({ dayId: selectedPast.id, slot })
                  }
                />
                <div className="button-row">
                  {mealNames
                    .filter(
                      (slot) => !isMealLogged(selectedPast.todayLog[slot]),
                    )
                    .map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        className="button quiet small-button"
                        onClick={() =>
                          startDraft(blankDraft(slot), {
                            dayId: selectedPast.id,
                            slot,
                          })
                        }
                      >
                        +{" "}
                        {t(
                          locale,
                          `Record ${label(slot, locale)}`,
                          `補登${label(slot, locale)}`,
                        )}
                      </button>
                    ))}
                </div>
              </>
            )}
            <div className="weekly-summary">
              <h3>
                {t(locale, "What appears in your records", "紀錄中出現的模式")}
              </h3>
              {weekly.summaryLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p className="small muted">
                {t(
                  locale,
                  `${weekly.dataBasis.loggedMealCount} recorded meal slots across ${weekly.dataBasis.loggedDayCount} days. This is a description of these records, not an assessment of your usual diet.`,
                  `${weekly.dataBasis.loggedDayCount} 天中共有 ${weekly.dataBasis.loggedMealCount} 個餐別有紀錄。這只描述這些紀錄，並非評估你平常的整體飲食。`,
                )}
              </p>
            </div>
          </details>
        </section>
        <section className="panel catalog-panel">
          <details>
            <summary>
              <span>
                <span className="eyebrow">
                  {t(locale, "A CURATED STARTING POINT", "精選的日常靈感")}
                </span>
                <span className="summary-title">
                  {t(locale, "100 everyday meal ideas", "100 道日常餐點想法")}
                </span>
              </span>
            </summary>
            <p className="muted">
              {t(
                locale,
                "A fixed collection of Asian and Western meal templates. Recipes and portions vary; these are ideas to adapt, not verified nutrient records.",
                "整理亞洲與西式日常餐點的固定選集。實際配方與份量各有不同，這些是可調整的選餐想法。",
              )}
            </p>
            <label>
              {t(locale, "Find a meal idea", "搜尋餐點想法")}
              <input
                type="search"
                value={catalogQuery}
                onChange={(event) => setCatalogQuery(event.target.value)}
                placeholder={t(
                  locale,
                  "Try rice, soup, or tofu",
                  "試試飯、湯或豆腐",
                )}
              />
            </label>
            <p className="small muted">{filteredCatalog.length}/100</p>
            <div className="catalog-grid">
              {filteredCatalog.map((meal) => (
                <article key={meal.id}>
                  <span className="small muted">
                    {getMealPresentation(meal, locale).cuisine}
                  </span>
                  <h3>{mealTitle(meal, locale)}</h3>
                  <p className="small">
                    {getMealPresentation(meal, locale).effort}
                  </p>
                </article>
              ))}
            </div>
          </details>
        </section>
        <section className="panel data-panel" id="your-data">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {t(locale, "YOUR BROWSER, YOUR DATA", "你的瀏覽器，你的資料")}
              </p>
              <h2>{t(locale, "Simple by design", "簡單，也清楚")}</h2>
            </div>
          </div>
          <p>
            {t(
              locale,
              "Meal records, preferences and plans are saved only in this browser. They do not sync across devices. No account or paid AI is needed for the main experience. Example data stays separate.",
              "餐點紀錄、偏好與計畫只儲存在此瀏覽器，不會跨裝置同步。主要流程免帳號，也不需要付費 AI；範例資料分開處理。",
            )}
          </p>
          <div className="button-row">
            <button
              type="button"
              className="button quiet"
              onClick={() => {
                try {
                  downloadLocalData(realStateRef.current, locale);
                  setMessage(
                    t(
                      locale,
                      "Your own records were exported. Example data and API keys are excluded.",
                      "已匯出你自己的紀錄，不含範例資料與 API key。",
                    ),
                  );
                } catch {
                  setMessage(
                    t(
                      locale,
                      "Export failed. Please try again.",
                      "匯出失敗，請再試一次。",
                    ),
                  );
                }
              }}
            >
              {t(locale, "Export my data (JSON)", "匯出我的資料（JSON）")}
            </button>
            <button
              type="button"
              className="button quiet danger-text"
              onClick={() => setClearOpen(true)}
            >
              {t(
                locale,
                "Clear all my NextBite data",
                "清除所有 NextBite 資料",
              )}
            </button>
            <a
              className="button quiet"
              href="https://github.com/HuiYingChung/next-bite/issues/new"
              target="_blank"
              rel="noreferrer"
            >
              {t(locale, "Feedback & issues", "回饋與問題")}{" "}
              <span aria-hidden="true">↗</span>
            </a>
          </div>
          <p className="small muted">
            {t(
              locale,
              "Feedback opens GitHub and may be public. Share the issue, not your private meal history or API key.",
              "回饋會開啟 GitHub，內容可能公開；描述問題即可，請保留私人飲食紀錄與金鑰。",
            )}
          </p>
          <details id="method">
            <summary>
              {t(
                locale,
                "About the method & optional AI",
                "關於選餐方式與選用 AI",
              )}
            </summary>
            <p>
              {t(
                locale,
                "NextBite matches curated meal templates using declared food groups, your preferences, practical context and recent recorded patterns. The weights and rotation are product heuristics. Generic source links are background reading, not meal-level verification. It does not calculate individual nutrient adequacy, exact calories or medical recommendations.",
                "NextBite 依整理餐點的食物類別、你的偏好、實際情境與近期紀錄配對。權重與輪替屬於產品規則，一般來源連結只供背景閱讀，不代表逐餐驗證。產品不計算個人營養充足度、精確熱量或醫療建議。",
              )}
            </p>
            <p>
              {t(
                locale,
                "If you choose AI, your description and session key are sent through NextBite to OpenAI. The request uses store:false and no-store caching, which does not override provider retention policies. The key is never written into local records, exports or meal cards. Reload or use Forget this key to remove it from the page.",
                "若選用 AI，描述與本次金鑰會經 NextBite 送至 OpenAI。請求設定 store:false 與禁止快取，仍適用供應商的資料保留政策。金鑰不會寫入本機紀錄、匯出資料或小卡；重新整理或按清除金鑰即可從頁面記憶體移除。",
              )}
            </p>
            <p>
              <a
                href="https://openai.com/policies/privacy-policy/"
                target="_blank"
                rel="noreferrer"
              >
                {t(locale, "OpenAI privacy policy", "OpenAI 隱私政策")}
              </a>
            </p>
          </details>
        </section>
        <footer className="site-footer">
          <span>
            NextBite ·{" "}
            {t(
              locale,
              "Made for the everyday in-between.",
              "讓日常選餐，輕鬆一點。",
            )}
          </span>
          <span>
            {t(locale, "A curated meal-choice beta", "精選餐點決策 Beta")}
          </span>
        </footer>
      </main>
      {deleteTarget && (
        <ConfirmationDialog
          title={t(
            locale,
            "Remove this meal record?",
            "要移除這筆餐點紀錄嗎？",
          )}
          confirm={t(locale, "Remove record", "移除紀錄")}
          cancel={t(locale, "Keep it", "保留")}
          onConfirm={deleteMeal}
          onCancel={() => setDeleteTarget(null)}
        >
          <p>
            {formatDate(deleteTarget.dayId, locale)} ·{" "}
            {label(deleteTarget.slot, locale)}
          </p>
          <p>
            {t(
              locale,
              "This clears this meal slot from your local records.",
              "這會清除本機紀錄中這個餐別的內容。",
            )}
          </p>
        </ConfirmationDialog>
      )}
      {clearOpen && (
        <ConfirmationDialog
          title={t(
            locale,
            "Clear all NextBite data?",
            "要清除所有 NextBite 資料嗎？",
          )}
          confirm={t(locale, "Clear all data", "清除全部資料")}
          cancel={t(locale, "Cancel", "取消")}
          onConfirm={clearAll}
          onCancel={() => setClearOpen(false)}
        >
          <p>
            {t(
              locale,
              "This removes your local meal records, saved plans, preferences, language choice and session key. Export a copy first if needed. Other websites' data is not affected.",
              "這會移除本機餐點紀錄、計畫、偏好、語言設定與本次金鑰。需要保留時，請先匯出副本；其他網站的資料不受影響。",
            )}
          </p>
        </ConfirmationDialog>
      )}
    </>
  );
}

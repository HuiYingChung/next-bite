import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { MealParseError, parseMealWithAi } from "./ai";
import { Drawer } from "./Drawer";
import { HistoryGrid, RecipeOptionFacts, recipeMatchLabel } from "./DashboardInsights";
import { MealContextControls } from "./MealContextControls";
import { getRecipeStapleAvailability } from "./collection-availability";
import { RecipeDetails } from "./RecipeDetails";
import { RecipeLibrary } from "./RecipeLibrary";
import { RecipeImage } from "./RecipeImage";
import { RECIPE_OPTION_GROUP_SIZE } from "./nutrition";
import { recipeDisplayName } from "./recipe-name";
import { recipeTimeLabel } from "./recipe-time";
import { FoodLibrary } from "./FoodLibrary";
import { FoodRecognition } from "./FoodRecognition";
import { foodLibraryName } from "./food-library";
import { useRecordState } from "./use-record-state";
import { defaultMealContext } from "./meal-context";
import type { MealContext } from "./meal-context";
import {
  recommendPilotMeals,
  calculateRecipe,
  getRecipeHardAvoidConflicts,
} from "./nutrition";
import type { PilotRecommendation } from "./nutrition";
import { standardizedRecipes } from "./nutrition-data";
import type { NutritionPortion } from "./nutrition-types";
import {
  avoidTags,
  createBlankState,
  createEmptyMeal,
  mealNames,
  mealOptions,
  preferenceTags,
  recommendationDataset,
  legacyRecommendationDataset,
  rollSevenDayHistory,
  toLocalDateId,
} from "./data";
import {
  buildWeeklySnapshot,
  getMealTimeWindow,
  getHardAvoidConflicts,
  getMatchedPreferenceTags,
  isMealLogged,
} from "./logic";
import {
  clearLaunchStorage,
  downloadLocalData,
  loadLocale,
  isMergeContextComponent,
  mergeMealEntries,
  parsedMealToEntry,
  getPlanDisplacedBy,
  MAX_PLANNED_MEALS,
  removePlan,
  saveLocale,
  savePlan,
} from "./launch-state";
import type { LaunchState, PlannedMeal } from "./launch-state";
import {
  getMealPresentation,
  getLegacyMealPresentation,
  getLegacyNamedMealComponents,
  legacyMealTitle,
  label,
  translateFood,
} from "./presentation";
import { RecipeCardLink } from "./RecipeCardLink";
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
} from "./types";

const recipeCount = standardizedRecipes.length;
const recipeDirectionTags = ["High-protein", "Vegetable-forward", "Light meals", "Warm meals", "Rice-based meals", "Noodle-based meals"];
const defaultPreferenceProfile = createBlankState().profile;
const supportedPreferenceTags = preferenceTags.filter(tag =>
  recipeDirectionTags.includes(tag) || recommendationDataset.some(meal =>
    getMatchedPreferenceTags({ ...defaultPreferenceProfile, preferenceTags: [tag] }, meal).includes(tag)),
);
// Staple, warmth and added oil are chosen for each meal beside the suggestions.
// Offering them again as saved preferences gave two controls for one idea, one
// of which (warm) filtered while the other only added points. Saved copies
// keep counting and stay removable; they are no longer offered as new choices.
const perMealPreferenceTags = ["Light meals", "Warm meals", "Rice-based meals", "Noodle-based meals"];
const offeredPreferenceTags = supportedPreferenceTags.filter(tag => !perMealPreferenceTags.includes(tag));
const retiredAvoidTag = "Late-night heavy meals";
const NARROW_LAYOUT = "(max-width: 860px)";
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
// Source food names can contain commas. Quoting keeps one selected record
// intact when the user returns from review to the manual input fields.
const quoteFoodName = (name: string) => /[,，、\n"]/.test(name) ? `"${name.replace(/"/g, '""')}"` : name;
const splitFoods = (raw: string) => {
  const names: string[] = [];
  let value = "", quoted = false;
  for (let index = 0; index < raw.length; index++) {
    const character = raw[index];
    if (character === '"') {
      if (quoted && raw[index + 1] === '"') { value += '"'; index++; }
      else if (quoted || !value.trim()) quoted = !quoted;
      else value += character;
    } else if (!quoted && /[,，、\n]/.test(character)) {
      if (value.trim()) names.push(value.trim());
      value = "";
    } else value += character;
  }
  if (value.trim()) names.push(value.trim());
  return names;
};
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
        .map((component) => quoteFoodName(component.name))
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
  busy = false,
}: {
  title: string;
  children: ReactNode;
  confirm: string;
  cancel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
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
        if (!busy) onCancel();
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
          disabled={busy}
        >
          {cancel}
        </button>
        <button type="button" className="button danger" onClick={onConfirm} disabled={busy}>
          {confirm}
        </button>
      </div>
    </dialog>
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
          "Optional. Saved preferences help shape your suggestions. Avoided items always filter the options. Your settings stay in this browser.",
          "可自由設定；已儲存偏好會影響推薦，避開項目則始終用於篩選。設定只存在此瀏覽器。",
        )}
      </p>
      <fieldset>
        <legend>
          {t(locale, "Foods & styles you enjoy", "喜歡的餐點與風格")}
        </legend>
        <p className="small muted">
          {t(
            locale,
            "Saved preferences are compared after this meal’s choices. Beans count toward the model's plant component.",
            "先比較本餐條件，再比較這些已存偏好；豆類也計入模型的植物食材項。",
          )}
        </p>
        <div className="chip-list">
          {offeredPreferenceTags.map((tag) => (
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
              {tag === "High-protein"
                  ? t(locale, "More protein", "較多蛋白質")
                  : tag === "Vegetable-forward"
                    ? t(locale, "More vegetables & beans", "較多蔬菜與豆類")
                    : label(tag, locale)}
            </button>
          ))}
        </div>
      </fieldset>
      {profile.preferenceTags.some(tag => perMealPreferenceTags.includes(tag)) && (
        <fieldset className="retained-preferences per-meal-preferences">
          <legend>{t(locale, "Now chosen for each meal", "現在改為每餐選擇")}</legend>
          <p className="small muted">{t(locale, "These earlier preferences still count after this meal’s choices. Staple, warm meals and less added oil can now be chosen beside the suggestions for each meal. Select one to remove it.", "這些先前偏好仍會在本餐條件之後計入。主食、溫熱餐點與較少添加油現在可在建議旁為每一餐選擇；點選即可移除。")}</p>
          <div className="chip-list">
            {profile.preferenceTags.filter(tag => perMealPreferenceTags.includes(tag)).map(tag => {
              const name = tag === "Light meals" ? t(locale, "Less added oil", "較少添加油") : label(tag, locale);
              return <button type="button" className="chip selected" key={tag} aria-label={t(locale, `Remove saved preference: ${name}`, `移除已存偏好：${name}`)} onClick={() => toggle("preferenceTags", tag)}>{name}</button>;
            })}
          </div>
        </fieldset>
      )}
      {profile.preferenceTags.some(tag => !supportedPreferenceTags.includes(tag)) && (
        <fieldset className="retained-preferences">
          <legend>{t(locale, "No matching recipes currently", "目前沒有對應配方")}</legend>
          <p className="small muted">{t(locale, "These earlier preferences remain saved but do not add recipe points. Select one to remove it.", "這些先前偏好仍保留，但不會增加配方分數；點選即可移除。")}</p>
          <div className="chip-list">
            {profile.preferenceTags.filter(tag => !supportedPreferenceTags.includes(tag)).map(tag => (
              <button type="button" className="chip selected" key={tag} aria-label={t(locale, `Remove saved preference: ${label(tag, locale)}`, `移除已存偏好：${label(tag, locale)}`)} onClick={() => toggle("preferenceTags", tag)}>{label(tag, locale)}</button>
            ))}
          </div>
        </fieldset>
      )}
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
          {avoidTags.filter(tag => tag !== retiredAvoidTag).map((tag) => (
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
        {profile.avoidTags.includes(retiredAvoidTag) && (
          <div className="notice retained-avoid">
            <p className="small">{t(locale, "Your earlier late-night heavy-meal restriction is still saved. Current recipes cannot assess this condition, so late-night suggestions pause until you remove it. Daytime suggestions are unaffected.", "先前的「宵夜厚重餐」限制仍保留。目前配方無法判斷此條件，因此深夜會暫停推薦，直到你移除此設定；白天推薦不受影響。")}</p>
            <button type="button" className="text-button" onClick={() => toggle("avoidTags", retiredAvoidTag)}>{t(locale, "Remove earlier late-night restriction", "移除先前的宵夜限制")}</button>
          </div>
        )}
      </fieldset>
    </>
  );
}

function createDemoState(profile?: Profile): LaunchState {
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
  if (profile) demo.profile = { ...profile };
  return demo;
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(loadLocale);
  const recordStore = useRecordState();
  const realState = recordStore.state;
  const [demoState, setDemoState] = useState<LaunchState | null>(null);
  const state = demoState ?? realState;
  const isDemo = demoState !== null;
  const [clock, setClock] = useState(() => new Date());
  const [storageFailed, setStorageFailed] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [view, setView] = useState<"today" | "history" | "plans" | "catalog">(
    "today",
  );
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
  const [writeError, setWriteError] = useState("");
  const [draftDayId, setDraftDayId] = useState<string | null>(null);
  const [draftConflict, setDraftConflict] = useState(false);
  const [selected, setSelected] = useState(0);
  // Recipe whose details are open. Kept by id, so details close by themselves
  // when a new group of options no longer contains that recipe.
  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [optionPage, setOptionPage] = useState({ order: "", index: 0 });
  // Options are image-top cards on wide screens and compact rows on narrow ones.
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(NARROW_LAYOUT).matches,
  );
  const [mealContext, setMealContext] =
    useState<MealContext>(defaultMealContext);
  const [mealMood, setMealMood] = useState<FeelToday>("Normal");
  const [mealSetting, setMealSetting] = useState<EatingStyle>("Both");
  const [changeNote, setChangeNote] = useState("");
  // Announced to assistive technology only: the options change in place, right
  // under the control that changed them.
  const [contextNote, setContextNote] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [aiText, setAiText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [historyDay, setHistoryDay] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    dayId: string;
    slot: MealName;
  } | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [catalogSection, setCatalogSection] = useState<"foods" | "recipes">("recipes");
  const composerRef = useRef<HTMLElement>(null);
  const decisionRef = useRef<HTMLElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const aiRequestGeneration = useRef(0);
  const aiRequestAbort = useRef<AbortController | null>(null);
  const realStateRef = recordStore.stateRef;
  const draftBaseRef = useRef<LaunchState | null>(null);
  const deleteBaseRef = useRef<LaunchState | null>(null);
  const clearBaseRef = useRef<LaunchState | null>(null);
  const saveFailure = (status: string) => t(locale,
    status === "conflict" ? "Another tab changed this record. This change was not saved. Review the latest record before trying again."
      : status === "expired" ? "This date is outside the current seven days. This change was not saved; choose a valid date."
        : status === "busy" ? "Please wait for the current save to finish."
          : "Could not save in this browser. Please try again.",
    status === "conflict" ? "另一個分頁已修改這筆資料，本次變更未儲存。請檢查最新紀錄後重試。"
      : status === "expired" ? "這天已超出目前七天範圍，本次變更未儲存。請選擇有效日期。"
        : status === "busy" ? "請等目前的儲存完成。"
          : "無法儲存到瀏覽器，請再試一次。",
  );
  const persistRealState = async (update: (current: LaunchState) => LaunchState, base?: LaunchState, replace = false) => {
    const result = await recordStore.update(update, base, replace);
    setWriteError(result.status === "ok" ? "" : saveFailure(result.status));
    return result.status;
  };
  const updateState = async (update: (current: LaunchState) => LaunchState, base?: LaunchState) => {
    if (demoState) {
      setDemoState(update(base ?? demoState));
      return "ok";
    }
    return persistRealState(update, base);
  };
  const invalidateAiRequest = () => {
    aiRequestGeneration.current += 1;
    aiRequestAbort.current?.abort();
    aiRequestAbort.current = null;
    setIsParsing(false);
  };
  const editDraft: Dispatch<SetStateAction<ParsedMeal>> = (update) => {
    invalidateAiRequest();
    setDraft(update);
  };
  const editFields: Dispatch<SetStateAction<FoodFields>> = (update) => {
    invalidateAiRequest();
    setFields(update);
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
      aiRequestAbort.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(NARROW_LAYOUT);
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!saveLocale(locale)) setStorageFailed(true);
    document.documentElement.lang = locale === "zh" ? "zh-Hant" : "en";
    document.title = t(
      locale,
      "MealHatch — Find your next meal",
      "MealHatch — 輕鬆選下一餐",
    );
  }, [locale]);
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
      void recordStore.refresh();
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
  }, [recordStore.refresh]);
  const timeWindow = getMealTimeWindow(clock);
  const dateId = toLocalDateId(clock);
  const resetMealContext = () => {
    setMealContext({ ...defaultMealContext });
    setMealMood("Normal");
    setMealSetting("Both");
    setSelected(0);
  };
  useEffect(() => {
    setMealContext({ ...defaultMealContext });
    setMealMood("Normal");
    setMealSetting("Both");
    setSelected(0);
    setChangeNote("");
  }, [dateId]);
  const effectiveProfile = useMemo(
    () => ({ ...state.profile, feelToday: mealMood, eatingStyle: mealSetting }),
    [state.profile, mealMood, mealSetting],
  );
  const today =
    state.days.find((day) => day.isToday) ?? state.days[state.days.length - 1];
  const pilot = useMemo(
    () =>
      recommendPilotMeals(
        effectiveProfile,
        mealContext,
        locale,
        new Date(
          `${dateId}T${({ breakfast: "09", lunch: "12", afternoon: "16", dinner: "18", late: "22" } as const)[timeWindow]}:30:00`,
        ),
        today.todayLog,
        state.days,
      ),
    [effectiveProfile, mealContext, locale, dateId, timeWindow, today.todayLog, state.days],
  );
  // "Show three more" pages through the engine's full order. The page belongs
  // to one ordering: any change to preferences, records or the meal window
  // produces a new order and starts again from its first group.
  const optionOrder = pilot.trace.eligibleRecipeIds.join("|");
  const optionPageCount = Math.ceil(pilot.eligibleRecipes.length / RECIPE_OPTION_GROUP_SIZE);
  const optionPageIndex = optionPage.order === optionOrder ? optionPage.index % Math.max(optionPageCount, 1) : 0;
  const shownOptions = pilot.eligibleRecipes.slice(
    optionPageIndex * RECIPE_OPTION_GROUP_SIZE,
    (optionPageIndex + 1) * RECIPE_OPTION_GROUP_SIZE,
  );
  const selectedIndex = selected % Math.max(shownOptions.length, 1);
  const detailOption = shownOptions.find((option) => option.meal.id === detailFor) ?? null;
  const firstShown = optionPageIndex * RECIPE_OPTION_GROUP_SIZE + 1;
  const hasActivePreferences = shownOptions.length > 0
    && shownOptions[0].score.currentPreference.selected + shownOptions[0].score.savedPreference.selected > 0;
  const lastShown = firstShown + shownOptions.length - 1;
  // Staple, main protein and saved choices put matching recipes first without
  // removing the rest. The lead group is what "matching" means on screen: the
  // recipes that share the first one's preference points.
  const leadOption = pilot.eligibleRecipes[0];
  const leadCount = leadOption && leadOption.score.currentPreference.points + leadOption.score.savedPreference.points > 0
    ? pilot.eligibleRecipes.filter((option) =>
        option.score.currentPreference.points === leadOption.score.currentPreference.points
        && option.score.savedPreference.points === leadOption.score.savedPreference.points).length
    : 0;
  const shownRange = (last: number) => (last === firstShown ? `${firstShown}` : `${firstShown}–${last}`);
  const rowMatched = (option: PilotRecommendation, key: string) =>
    option.score.preferenceRows.some((row) => row.key === key && row.matched);
  const noJointMatch = mealContext.preferredStaple !== "any" && mealContext.preferredProtein !== "any"
    && pilot.eligibleRecipes.length > 0
    && !pilot.eligibleRecipes.some((option) => rowMatched(option, "staple") && rowMatched(option, "protein"));
  // When nothing has both the staple and the main protein, the lead group only
  // matches one of them, so it is not counted as "matching".
  const matchingCount = noJointMatch ? 0 : leadCount;
  const withinLead = matchingCount > 0 && firstShown <= matchingCount;
  const todayRecorded = mealNames.some((slot) => isMealLogged(today.todayLog[slot]));
  const stapleAvailability = getRecipeStapleAvailability(
    mealContext.preferredStaple,
    pilot.trace.eligibleRecipeIds,
  );
  const weekly = useMemo(
    () => buildWeeklySnapshot(state.days, state.profile, locale),
    [state.days, state.profile, locale],
  );
  const selectedPast = state.days.find((day) => day.id === historyDay) ?? today;
  const targetDay = state.days.find(day => day.id === (editTarget?.dayId ?? draftDayId)) ?? today;
  const existing = targetDay.todayLog[draft.mealSlot];
  const conflict = !editTarget && isMealLogged(existing);
  // A draft opened from an empty slot in Records targets that day and meal
  // but edits nothing: it is a new record.
  const editingExisting = Boolean(editTarget) && isMealLogged(existing);
  const chooseRecipe = async (recipe: PilotRecommendation) => {
    // Recheck the current engine result instead of allowing a catalog entry to
    // bypass hard conditions or a changed portion.
    const eligible = pilot.eligibleRecipes.find(option => option.meal.id === recipe.meal.id
      && option.portion === recipe.portion && option.recipe.version === recipe.recipe.version);
    if (!eligible || !recordStore.ready || recordStore.busy) return false;
    // Plans are capped. Say which one makes room instead of dropping it silently.
    const displaced = getPlanDisplacedBy(state, eligible.meal.id);
    const displacedRecipe = displaced && standardizedRecipes.find(item => item.mealId === displaced.mealId);
    const displacedIdea = displaced && legacyRecommendationDataset.find(item => item.id === displaced.mealId);
    const displacedName = displacedRecipe ? recipeDisplayName(displacedRecipe, locale) : displacedIdea ? legacyMealTitle(displacedIdea, locale) : "";
    const status = await updateState(current => savePlan(current, eligible.meal.id, new Date(), {
      portion: eligible.portion, recipeVersion: eligible.recipe.version,
    }));
    if (status !== "ok") return false;
    const saved = displaced
      ? t(
          locale,
          `Saved to your next-meal plans. Plans hold ${MAX_PLANNED_MEALS}, so your oldest one${displacedName ? `, ${displacedName},` : ""} was removed.`,
          `已儲存到下一餐計畫。計畫最多保留 ${MAX_PLANNED_MEALS} 道，因此最舊的${displacedName ? `「${displacedName}」` : "一道"}已移除。`,
        )
      : t(locale, "Saved to your next-meal plans. It isn't recorded as eaten.", "已儲存到下一餐計畫，尚未加入已吃紀錄。");
    setMessage(saved);
    return saved;
  };
  const toggleDetails = (index: number) => {
    const id = shownOptions[index].meal.id;
    setSelected(index);
    setDetailFor((current) => (current === id ? null : id));
  };
  // Wide: the card opens its details. Narrow: the first tap selects the row
  // and shows its actions; a second tap opens the details.
  const activateOption = (index: number) => {
    if (!narrow || index === selectedIndex) return toggleDetails(index);
    setSelected(index);
    setDetailFor(null);
    const id = shownOptions[index].meal.id;
    window.requestAnimationFrame(() =>
      document.getElementById(`pick-${id}`)?.scrollIntoView({ block: "nearest" }),
    );
  };
  const renderOptionDetail = (option: PilotRecommendation, index: number) => {
    const name = recipeDisplayName(option.recipe, locale);
    return (
      <div
        className="pick-detail"
        id="pick-detail"
        role="region"
        aria-label={t(locale, `Details: ${name}`, `細節：${name}`)}
      >
        <div className="pick-detail-heading">
          <h3>{name}</h3>
          <button type="button" className="text-button" onClick={() => toggleDetails(index)}>
            {t(locale, "Close details", "收合細節")}
          </button>
        </div>
        {hasActivePreferences && (
          <p className="small muted recipe-match-count">{recipeMatchLabel(option, locale)}</p>
        )}
        {option.mismatchReasons
          .filter((reason) => !option.matchReasons.includes(reason))
          .map((reason) => (
            <p className="small muted pick-mismatch" key={reason}>{reason}</p>
          ))}
        <RecipeCardLink recipe={option.recipe} portion={option.portion} locale={locale} />
        <RecipeDetails recipe={option.recipe} portion={option.portion} calculation={option} recommendation={option} locale={locale} />
      </div>
    );
  };
  const browseRecipes = () => {
    setCatalogSection("recipes");
    setView("catalog");
    window.requestAnimationFrame(() => {
      const heading = document.getElementById("recipe-library-title");
      heading?.focus({ preventScroll: true });
      scrollTo(heading);
    });
  };
  const adjustRecipeConditions = () => {
    setView("today");
    window.requestAnimationFrame(() => {
      const panel = document.getElementById("meal-preferences");
      panel?.focus({ preventScroll: true });
      scrollTo(panel);
    });
  };

  const resetComposer = () => {
    invalidateAiRequest();
    setDraft(blankDraft());
    setFields(emptyFields());
    setReview(false);
    setEditTarget(null);
    setPendingPlanId(null);
    setFormError("");
    setDraftConflict(false);
    setDraftDayId(null);
    draftBaseRef.current = null;
  };
  const startDraft = (
    next: ParsedMeal,
    target: { dayId: string; slot: MealName } | null = null,
  ) => {
    if (!recordStore.ready || recordStore.busy) return;
    invalidateAiRequest();
    draftBaseRef.current = { ...state, days: rollSevenDayHistory(state.days, new Date()) };
    setDraftDayId(target?.dayId ?? toLocalDateId(new Date()));
    setDraftConflict(false);
    setDraft(next);
    setFields(fieldsFrom(next));
    setEditTarget(target);
    setPendingPlanId(null);
    setReview(false);
    setFormError("");
    setComposerOpen(true);
  };
  const startDemo = () => {
    resetMealContext();
    const demo = createDemoState(realState.profile);
    setDemoState(demo);
    setChangeNote("");
    setView("today");
    setComposerOpen(false);
    setSelected(0);
    resetComposer();
    setMessage("");
    window.requestAnimationFrame(() => scrollTo(decisionRef.current));
  };
  const exitDemo = () => {
    resetMealContext();
    setDemoState(null);
    setChangeNote("");
    setView("today");
    setComposerOpen(false);
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
    invalidateAiRequest();
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
      components.some((component) => component.name.length > 300)
    ) {
      setFormError(
        t(
          locale,
          "Use up to 40 items, with each item at most 300 characters.",
          "最多可輸入 40 個項目，每個項目最多 300 個字元。",
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
  const commitMeal = async (mode: "append" | "replace") => {
    invalidateAiRequest();
    const now = new Date();
    const dayId = editTarget?.dayId ?? draftDayId ?? toLocalDateId(now);
    if (!rollSevenDayHistory([], now).some(day => day.id === dayId)) {
      setClock(now);
      void recordStore.refresh();
      setFormError(
        t(
          locale,
          "That date has left the seven-day window. Your draft is still here; choose a current date below.",
          "這天已超出七天範圍。草稿仍保留，請在下方選擇有效日期。",
        ),
      );
      return;
    }
    if (draftConflict) return;
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
            component.amount.quantity < 0.01 ||
            component.amount.quantity >
              (component.amount.unit === "g" || component.amount.unit === "ml"
                ? 10000
                : 50) ||
            component.amount.unit === "unspecified"),
      )
    ) {
      setFormError(
        t(
          locale,
          "Choose a unit and an amount from 0.01–10,000 g/mL, or 0.01–50 for other units. You can also leave the amount blank.",
          "請選擇單位；克／毫升可填 0.01–10,000，其他單位可填 0.01–50，也可以將數量留白。",
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
    const rawBase = draftBaseRef.current ?? state;
    const base = { ...rawBase, days: rollSevenDayHistory(rawBase.days, now) };
    const original = base.days.find(day => day.id === dayId)?.todayLog[draft.mealSlot];
    if (editTarget && original)
      entry.componentDetails.push(
        ...original.componentDetails.filter(
          isMergeContextComponent,
        ),
      );
    const status = await updateState((current) => {
      const next = {
        ...current,
        days: current.days.map((day) =>
          day.id === dayId
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
    }, base);
    if (status !== "ok") {
      setFormError(`${saveFailure(status)} ${t(locale, "Your draft is still here.", "草稿仍保留。")}`);
      setDraftConflict(status === "conflict");
      if (status === "expired") setClock(new Date());
      return;
    }
    setSelected(0);
    setComposerOpen(false);
    if (dayId === toLocalDateId(now)) setView("today");
    resetMealContext();
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
  const requestDelete = (dayId: string, slot: MealName) => {
    deleteBaseRef.current = state;
    setDeleteTarget({ dayId, slot });
  };
  const hasDraft = !isDemo && Boolean(review || editTarget || pendingPlanId || Object.values(fields).some(Boolean));
  const openComposer = (ownRecords = false) => {
    if (!recordStore.ready || recordStore.busy) return;
    if (ownRecords && isDemo) {
      exitDemo();
      draftBaseRef.current = { ...realState, days: rollSevenDayHistory(realState.days, new Date()) };
      setDraftDayId(toLocalDateId(new Date()));
    } else if (!draftBaseRef.current) {
      draftBaseRef.current = { ...state, days: rollSevenDayHistory(state.days, new Date()) };
      setDraftDayId(toLocalDateId(new Date()));
    }
    setComposerOpen(true);
  };
  const deleteMeal = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    const status = await updateState((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === target.dayId
          ? {
              ...day,
              todayLog: { ...day.todayLog, [target.slot]: createEmptyMeal() },
            }
          : day,
      ),
    }), deleteBaseRef.current ?? state);
    if (status !== "ok") {
      setDeleteTarget(null);
      return;
    }
    setDeleteTarget(null);
    resetComposer();
    setMessage(
      t(locale, "Meal removed from your records.", "已從紀錄中移除這餐。"),
    );
  };
  const changeProfile = (profile: Profile, note?: string) => {
    setMealMood(profile.feelToday);
    setMealSetting(profile.eatingStyle);
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
  const beginConsumed = (meal: Recommendation, plan: PlannedMeal) => {
    const isLegacyIdea = !plan.recipeVersion;
    const recipe = standardizedRecipes.find(
      (item) => item.mealId === meal.id && item.version === plan.recipeVersion,
    );
    const calculation =
      recipe && plan.portion
        ? calculateRecipe(recipe, plan.portion, locale)
        : null;
    const next: ParsedMeal = {
      ...blankDraft(),
      displayName: (recipe ? recipeDisplayName(recipe, locale) : undefined) ?? (isLegacyIdea ? legacyMealTitle(meal, locale) : ""),
      components:
        calculation && recipe
          ? calculation.ingredientAmounts.map((ingredient, index) => ({
              name:
                ingredient.food?.label[locale].replace(/[,，]/g, " ·") ??
                ingredient.foodId,
              group: recipe.ingredients[index].group,
              sourceFoodId: ingredient.food?.id,
              amount: {
                quantity: ingredient.grams,
                unit: "g" as const,
                qualifier: "approximate" as const,
                originalText: t(
                  locale,
                  "Saved recipe estimate",
                  "已存配方估算",
                ),
              },
              confidence: "limited" as const,
            }))
          : isLegacyIdea ? getLegacyNamedMealComponents(meal).map((component) => ({
              ...component,
              name: translateFood(component.name, locale),
              amount: amount(),
              confidence: "limited",
            })) : [],
      assumptions: [
        t(
          locale,
          calculation
            ? "These are the saved recipe's ingredient amounts, not measured consumption. Edit every item and amount to match what you actually ate before recording."
            : isLegacyIdea
              ? "These are the original named components saved as a meal idea. Edit them to match what you actually ate; recipe details and amounts are unspecified."
              : "This saved recipe version is unavailable. No current recipe ingredients or amounts have been substituted. Enter what you actually ate before recording.",
          calculation
            ? "這些是已儲存配方的食材量，並非實際食用量。請先逐項修改成真正吃的內容與份量，再確認記錄。"
            : isLegacyIdea
              ? "這些是先前餐點想法中的具名食物。請修改成你實際吃的食物，配方細節與份量尚未指定。"
              : "此已存配方版本無法取得，未以目前配方的食材或份量代替。請填入實際吃下的內容再記錄。",
        ),
      ],
    };
    startDraft(next);
    if (calculation) setReview(true);
    setPendingPlanId(plan.id);
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
    aiRequestAbort.current?.abort();
    const controller = new AbortController();
    aiRequestAbort.current = controller;
    setIsParsing(true);
    setFormError("");
    try {
      const result = await parseMealWithAi({
        text: aiText.trim(),
        locale,
        apiKey,
        mealSlotHint: draft.mealSlot,
        signal: controller.signal,
      });
      if (requestGeneration !== aiRequestGeneration.current) return;
      const next = {
        ...result,
        mealSlot: editTarget?.slot ?? result.mealSlot,
        portion:
          result.portion.confidence === "limited"
            ? { size: "Unspecified" as const, confidence: "limited" as const }
            : result.portion,
      };
      setDraft(next);
      setFields(fieldsFrom(next));
      setReview(true);
      window.requestAnimationFrame(() => {
        if (requestGeneration === aiRequestGeneration.current)
          reviewRef.current?.focus();
      });
    } catch (error) {
      if (requestGeneration !== aiRequestGeneration.current) return;
      setFormError(
        error instanceof MealParseError ? error.message : t(
          locale,
          "AI could not prepare this meal. Your text is still here; try the quick form or check your key and connection.",
          "AI 暫時無法整理這餐。你的文字仍保留著，可以使用快速輸入，或檢查金鑰與連線。",
        ),
      );
    } finally {
      if (requestGeneration === aiRequestGeneration.current) {
        aiRequestAbort.current = null;
        setIsParsing(false);
      }
    }
  };
  const clearAll = async () => {
    const blank: LaunchState = {
      ...createBlankState(new Date()),
      plannedMeals: [],
    };
    const status = await persistRealState(() => blank, clearBaseRef.current ?? realState, true);
    if (status !== "ok") {
      setClearOpen(false);
      return;
    }
    resetMealContext();
    const cleared = clearLaunchStorage();
    setDemoState(null);
    setApiKey("");
    setAiText("");
    setClearOpen(false);
    resetComposer();
    setPreferencesOpen(false);
    setDataOpen(false);
    setComposerOpen(false);
    setView("today");
    setSelected(0);
    setMessage(
      cleared
        ? t(
            locale,
            "Your MealHatch records, plans, preferences and session key have been cleared.",
            "你的 MealHatch 紀錄、計畫、偏好與本次金鑰已清除。",
          )
        : t(
            locale,
            "This session was cleared, but browser storage could not be accessed. Check your browser's site-data settings.",
            "本次工作階段已清除，但無法存取瀏覽器儲存空間。請檢查瀏覽器的網站資料設定。",
          ),
    );
    setStorageFailed(!cleared);
  };

  return (
    <>
      <a className="skip-link" href="#workspace">
        {t(locale, "Skip to workspace", "跳到主要內容")}
      </a>
      <header className="site-header">
        <a href="#workspace" className="brand" onClick={() => setView("today")}>
          MealHatch<span className="beta-label">BETA</span>
        </a>
        <nav aria-label={t(locale, "Settings", "設定")}>
          <button
            className="nav-button"
            type="button"
            onClick={() => setPreferencesOpen(true)}
          >
            {t(locale, "Preferences", "偏好")}
            {state.profile.avoidTags.length > 0 && (
              <span className="count-dot">
                {state.profile.avoidTags.length}
              </span>
            )}
          </button>
          <button
            className="nav-button"
            type="button"
            onClick={() => setDataOpen(true)}
          >
            {t(locale, "Data & method", "資料與方法")}
          </button>
          <button
            className="nav-button language"
            type="button"
            aria-label={t(locale, "切換繁體中文", "Switch to English")}
            onClick={() => {
              invalidateAiRequest();
              setLocale((value) => (value === "en" ? "zh" : "en"));
              setMessage("");
              setChangeNote("");
              setFormError("");
            }}
          >
            {locale === "en" ? "繁中" : "EN"}
          </button>
        </nav>
      </header>
      <main className="page-shell" id="workspace" tabIndex={-1}>
        <div className="workspace-heading">
          <div>
            <h1>
              {t(locale, "Less deciding. More eating.", "下一餐，少想一點。")}
            </h1>
            <p className="muted">
              {t(
                locale,
                `Find your next meal among ${recipeCount} recipes. Your preferences first, nutrition as a reference. No account needed.`,
                `從 ${recipeCount} 道日常配方挑選下一餐。先看你的偏好，再參考營養。免註冊即可用。`,
              )}
            </p>
          </div>
          {view !== "today" && (
            <div className="workspace-actions">
              <button
                className="button quiet"
                type="button"
                disabled={!recordStore.ready || recordStore.busy}
                onClick={() => openComposer(true)}
              >
                {hasDraft
                  ? t(locale, "Continue editing", "繼續編輯")
                  : t(locale, "Record a meal", "記錄一餐")}
              </button>
            </div>
          )}
        </div>
        <nav
          className="workspace-nav"
          aria-label={t(locale, "Workspace", "主要功能")}
        >
          {(
            [
              ["today", "Next meal", "今日選餐"],
              ["history", "Records", "七天紀錄"],
              ["plans", "Plans", "餐點計畫"],
              ["catalog", "Library", "資料庫"],
            ] as const
          ).map(([key, en, zh]) => (
            <button
              key={key}
              type="button"
              aria-current={view === key ? "page" : undefined}
              onClick={() => {
                setView(key);
                setMessage("");
                setChangeNote("");
                setContextNote("");
              }}
            >
              {t(locale, en, zh)}
              {key === "plans" && state.plannedMeals.length > 0 && (
                <span>{state.plannedMeals.length}</span>
              )}
            </button>
          ))}
        </nav>
        {isDemo && (
          <aside className="demo-banner">
            <div>
              <strong>
                {t(locale, "You're exploring an example", "正在體驗範例")}
              </strong>
              <span>
                {t(
                  locale,
                  "Example records and plans stay separate. Your preferences still apply.",
                  "範例紀錄與計畫分開保留，偏好仍套用你的設定。",
                )}
              </span>
            </div>
            <button className="text-button" type="button" onClick={exitDemo}>
              {t(locale, "Use my own meals", "使用我的紀錄")}
            </button>
          </aside>
        )}
        {!recordStore.ready && <p className={view === "today" ? "sr-only" : "notice"} role="status">{t(locale, "Loading your saved records…", "正在載入已儲存紀錄…")}</p>}
        {(storageFailed || recordStore.failed) && (
          <p className="notice warning" role="status">
            {t(
              locale,
              "Browser storage is unavailable. New changes have not been saved. Your meal draft stays open; please try again or export existing records in Data & method.",
              "瀏覽器儲存空間無法使用，新的變更尚未儲存。餐點草稿會保留；請重試，或從「資料與方法」匯出現有紀錄。",
            )}
          </p>
        )}
        {writeError && <p className="notice error" role="alert">{writeError}</p>}
        <div className="live-message" role="status" aria-live="polite">
          {message}
        </div>
        <div
          className="change-announcement small"
          role="status"
          aria-live="polite"
        >
          {changeNote}
        </div>
        <div className="sr-only" role="status" aria-live="polite">
          {contextNote}
        </div>
        {view === "today" && (
          <div className="next-meal">
            <section
              className="quick-choices"
              id="meal-preferences"
              tabIndex={-1}
              aria-label={t(locale, "Conditions for this meal", "這餐的條件")}
            >
              <MealContextControls
                showRecipePortions
                showMealSetting={false}
                value={mealContext}
                profile={effectiveProfile}
                locale={locale}
                onChange={(next) => {
                  setMealContext(next);
                  setSelected(0);
                  setContextNote(
                    t(
                      locale,
                      "This meal's options have been updated.",
                      "已依本餐條件更新選項。",
                    ),
                  );
                }}
                onProfileChange={(profile) => {
                  changeProfile(profile, "");
                  setContextNote(
                    t(
                      locale,
                      "This meal's options have been updated.",
                      "已依本餐條件更新選項。",
                    ),
                  );
                }}
                aside={
                  <p className="avoid-line">
                    <span>
                      {state.profile.avoidTags.length
                        ? t(
                            locale,
                            `${state.profile.avoidTags.length} excluded`,
                            `已避開 ${state.profile.avoidTags.length} 項`,
                          )
                        : t(locale, "Nothing excluded", "沒有避開項目")}
                    </span>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setPreferencesOpen(true)}
                    >
                      {t(locale, "Edit", "調整")}
                      <span className="avoid-line-long">{t(locale, " preferences", "偏好")}</span>
                    </button>
                  </p>
                }
              />
              {timeWindow === "late" && state.profile.avoidTags.includes(retiredAvoidTag) && (
                <p className="notice small">{t(locale, "Your saved late-night restriction pauses suggestions because these recipes cannot assess meal heaviness. Edit preferences to review or remove it.", "已存的宵夜限制暫停了推薦，因為目前配方無法判斷餐點厚重程度。可開啟偏好檢查或移除此設定。")}</p>
              )}
            </section>
            <section
              className="pick-section"
              id="decision"
              ref={decisionRef}
              tabIndex={-1}
              aria-labelledby="decision-title"
            >
              <div className="pick-heading">
                <h2 id="decision-title">
                  {/* Recipes are not sorted by meal type, so the heading names no meal. */}
                  {shownOptions.length === RECIPE_OPTION_GROUP_SIZE
                    ? t(locale, "Three for your next meal", "下一餐的三道選擇")
                    : t(locale, "Options for your next meal", "下一餐的選擇")}
                </h2>
                {shownOptions.length > 0 && (
                  <p className="pick-count" role="status">
                    {withinLead
                      ? t(
                          locale,
                          `${shownRange(Math.min(lastShown, matchingCount))} of ${matchingCount} matching`,
                          `第 ${shownRange(Math.min(lastShown, matchingCount))} 道，符合 ${matchingCount} 道`,
                        )
                      : t(
                          locale,
                          `${shownRange(lastShown)} of ${pilot.eligibleRecipes.length}`,
                          `第 ${shownRange(lastShown)} 道，共 ${pilot.eligibleRecipes.length} 道`,
                        )}
                    <span className="pick-count-long">
                      {withinLead
                        ? t(locale, ` · ${pilot.eligibleRecipes.length} standard recipes in all`, ` · 全部 ${pilot.eligibleRecipes.length} 道標準配方`)
                        : t(locale, " standard recipes · options take turns each meal", "標準配方 · 每餐輪流出現")}
                    </span>
                  </p>
                )}
              </div>
              {shownOptions.length > 0 && !hasActivePreferences && shownOptions[0].score.unsupportedSavedPreferences.length > 0 && (
                <p className="small muted pick-note">
                  {t(locale, "Your saved preferences do not apply to this collection.", "已存偏好不適用於這組配方。")}
                </p>
              )}
              {matchingCount > 0 && !withinLead && shownOptions.length > 0 && (
                <p className="small muted pick-note" role="status">
                  {t(
                    locale,
                    `You have seen all ${matchingCount} matching recipes. These match fewer of your choices.`,
                    `符合的 ${matchingCount} 道已看完，以下選項符合的條件較少。`,
                  )}
                </p>
              )}
              {noJointMatch && stapleAvailability.status !== "absent" && stapleAvailability.status !== "excluded" && (
                <div className="collection-notice" role="status">
                  <p>
                    {t(
                      locale,
                      "No recipe has both your staple and your main protein. These match one of the two.",
                      "沒有同時符合主食與主菜的配方，以下選項只符合其中一項。",
                    )}
                  </p>
                </div>
              )}
              {(stapleAvailability.status === "absent" || stapleAvailability.status === "excluded") && (
                <div className="collection-notice" role="status">
                  <p>{stapleAvailability.status === "absent"
                    ? t(locale, `These ${standardizedRecipes.length} recipes do not include your selected staple.`, `這 ${standardizedRecipes.length} 道配方沒有你選的主食。`)
                    : t(locale, "No recipe with your selected staple is eligible under the current conditions.", "目前條件下，沒有符合所選主食的可用配方。")}
                    {shownOptions.length > 0 && t(locale, " The options below do not match that preference.", "以下選項未符合這項偏好。")}</p>
                  <button type="button" className="text-button" onClick={adjustRecipeConditions}>
                    {t(locale, "Adjust this meal", "調整這餐條件")}
                  </button>
                </div>
              )}
              {isDemo && (
                <div className="sample-context">
                  <strong>{t(locale, "EXAMPLE", "範例")}</strong>
                  <span>
                    {t(
                      locale,
                      "Example records reduce repeats among recipes with equal preference matches and nutrition level",
                      "本餐偏好、已存偏好與營養級別皆相同時，以範例紀錄減少重複",
                    )}
                  </span>
                </div>
              )}
              {shownOptions.length === 0 ? (
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
                      mealContext.ingredientReadiness === "needs-prep" && mealContext.maxPrepMinutes !== null
                        ? "Your ingredients still need preparation, but full cooking time is unknown. Remove the time limit or return when ingredients are ready. Your avoids remain applied."
                        : "Your avoided items and strict meal conditions remain applied. Review this meal’s temperature and time limits, or inspect the recipes in the library.",
                      mealContext.ingredientReadiness === "needs-prep" && mealContext.maxPrepMinutes !== null
                        ? "食材仍需處理或烹調，但目前沒有完整烹調時間資料。請移除時間上限，或等食材備妥後再選餐；避開設定仍維持套用。"
                        : "避開項目與本餐必要條件仍維持套用。可檢查溫度、時間上限，或到資料庫查看配方。",
                    )}
                  </p>
                  <button
                    type="button"
                    className="button quiet"
                    onClick={() => {
                      const context = document.getElementById("meal-preferences");
                      const extra = context?.querySelector<HTMLDetailsElement>(".meal-context-extra");
                      if (extra) extra.open = true;
                      context?.focus({ preventScroll: true });
                      scrollTo(context);
                    }}
                  >
                    {t(locale, "Review this meal's conditions", "檢查這餐條件")}
                  </button>
                </div>
              ) : (
                <>
                  <div className="pick-grid">
                    {shownOptions.map((option, index) => {
                      const name = recipeDisplayName(option.recipe, locale);
                      const isSelected = index === selectedIndex;
                      const isOpen = detailOption === option;
                      return (
                        <article
                          key={option.meal.id}
                          id={`pick-${option.meal.id}`}
                          className={`pick-card${isSelected ? " is-selected" : ""}${isOpen ? " is-open" : ""}`}
                        >
                          <div className="pick-summary">
                            <RecipeImage recipe={option.recipe} locale={locale} variant="card" priority={index === 0} />
                            <div className="pick-copy">
                              <p className="pick-meta">
                                <span className="recipe-time-label">{recipeTimeLabel(option.recipe.prepMinutes, option.ingredientReadiness, locale)}</span>
                                <span>{getMealPresentation(option.meal, locale).cuisine}</span>
                              </p>
                              <h3>
                                <button
                                  type="button"
                                  className="pick-title"
                                  aria-expanded={narrow ? isSelected : isOpen}
                                  onClick={() => activateOption(index)}
                                >
                                  {name}
                                </button>
                              </h3>
                              <RecipeOptionFacts rec={option} locale={locale} />
                            </div>
                          </div>
                          {(!narrow || isSelected) && (
                            <div className="pick-actions">
                              <button
                                type="button"
                                className="button primary"
                                disabled={!recordStore.ready || recordStore.busy}
                                onClick={async () => {
                                  await chooseRecipe(option);
                                }}
                              >
                                {state.plannedMeals.some(
                                  (plan) =>
                                    plan.mealId === option.meal.id &&
                                    plan.portion === option.portion &&
                                    plan.recipeVersion === option.recipe.version,
                                )
                                  ? t(locale, "Saved to plans", "已儲存到計畫")
                                  : t(locale, "Choose this meal", "就選這道")}
                              </button>
                              <button
                                type="button"
                                className="button quiet pick-details-toggle"
                                aria-expanded={isOpen}
                                aria-label={t(locale, `Details: ${name}`, `細節：${name}`)}
                                onClick={() => toggleDetails(index)}
                              >
                                {t(locale, "Details", "細節")}
                              </button>
                            </div>
                          )}
                          {narrow && isOpen && renderOptionDetail(option, index)}
                        </article>
                      );
                    })}
                  </div>
                  {!narrow && detailOption && (
                    <div className="pick-detail-wide">
                      {renderOptionDetail(detailOption, shownOptions.indexOf(detailOption))}
                    </div>
                  )}
                  <div className="pick-more">
                    <button type="button" className="button quiet" disabled={optionPageCount < 2} onClick={() => {
                      setOptionPage({ order: optionOrder, index: (optionPageIndex + 1) % optionPageCount });
                      setSelected(0);
                      setDetailFor(null);
                    }}>{t(locale, "Show three more", "再換三道")}</button>
                    <button type="button" className="text-button" onClick={browseRecipes}>
                      {t(locale, `Browse all ${recipeCount} recipes`, `瀏覽全部 ${recipeCount} 道配方`)}
                    </button>
                  </div>
                  {state.profile.avoidTags.length > 0 && (
                    <details className="applied-avoids">
                      <summary>
                        {t(
                          locale,
                          `${state.profile.avoidTags.length} avoid filters applied`,
                          `已套用 ${state.profile.avoidTags.length} 項避開設定`,
                        )}
                      </summary>
                      <p className="small muted">
                        {state.profile.avoidTags
                          .map((value) => label(value, locale))
                          .join(t(locale, ", ", "、"))}
                      </p>
                    </details>
                  )}
                  {pilot.excludedCount > 0 && (
                    <p className="small muted filtered-note">
                      {t(
                        locale,
                        `${pilot.excludedCount} of ${recipeCount} recipes excluded by avoids, strict conditions or incomplete scoring data.`,
                        `避開設定、必要條件或計分資料缺漏已排除 ${recipeCount} 道配方中的 ${pilot.excludedCount} 道。`,
                      )}
                    </p>
                  )}
                </>
              )}
            </section>
            <section className="panel today-row" aria-labelledby="today-title">
              <div className="today-row-heading">
                <h2 id="today-title">
                  {!recordStore.ready
                    ? t(locale, "Loading your saved records…", "正在載入已儲存紀錄…")
                    : todayRecorded
                      ? t(locale, "Recorded today", "今天的紀錄")
                      : t(locale, "Nothing recorded today.", "今天還沒有紀錄。")}
                </h2>
                <button
                  className="text-button"
                  type="button"
                  disabled={!recordStore.ready || recordStore.busy}
                  onClick={() => openComposer()}
                >
                  {hasDraft
                    ? t(locale, "Continue editing", "繼續編輯")
                    : t(locale, "Record what you ate", "記錄你吃了什麼")}
                </button>
              </div>
              {todayRecorded && (
                <LogList
                  day={today}
                  locale={locale}
                  onEdit={(slot) => editMeal(today, slot)}
                  onDelete={(slot) => requestDelete(today.id, slot)}
                />
              )}
            </section>
          </div>
        )}
        {view === "plans" && (
          <div className="view-content">
            {" "}
            <section
              className="panel plans-panel"
              aria-labelledby="plans-title"
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">
                    {t(locale, "A SMALL PLAN FOR LATER", "留給下一餐的想法")}
                  </p>
                  <h2 id="plans-title">
                    {t(locale, "My next-meal plans", "我的下一餐計畫")}
                  </h2>
                </div>
                <span className="small muted">
                  {state.plannedMeals.length}/12
                </span>
              </div>
              <p className="muted">
                {t(
                  locale,
                  "Saved meals stay here until you remove them or record what you ate. Up to 12 recent plans are kept in this browser.",
                  "儲存的餐點會留在這裡，直到你移除或記錄吃過的內容；此瀏覽器最多保留最近 12 道計畫。",
                )}
              </p>
              {state.plannedMeals.length ? (
                <div className="plan-grid">
                  {state.plannedMeals.map((plan) => {
                    const legacyMeal = legacyRecommendationDataset.find(item => item.id === plan.mealId);
                    const currentMeal = recommendationDataset.find(item => item.id === plan.mealId);
                    const isLegacyIdea = !plan.recipeVersion;
                    const meal = isLegacyIdea ? legacyMeal ?? currentMeal : currentMeal ?? legacyMeal;
                    if (!meal) return null;
                    const detail = isLegacyIdea ? getLegacyMealPresentation(meal, locale) : getMealPresentation(meal, locale);
                    const savedRecipe = standardizedRecipes.find(
                      (recipe) =>
                        recipe.mealId === meal.id &&
                        recipe.version === plan.recipeVersion,
                    );
                    const planTitle = (savedRecipe ? recipeDisplayName(savedRecipe, locale) : undefined) ?? (isLegacyIdea
                      ? legacyMealTitle(meal, locale)
                      : t(locale, "Saved recipe unavailable", "無法取得的已存配方"));
                    const conflicts = !isLegacyIdea && !savedRecipe ? [] : [
                      ...getHardAvoidConflicts(state.profile, meal, timeWindow),
                      ...(savedRecipe && plan.portion
                        ? getRecipeHardAvoidConflicts(
                            state.profile,
                            savedRecipe,
                            plan.portion,
                          )
                        : []),
                    ];
                    return (
                      <article className="plan-card" key={plan.id}>
                        <span className="small muted">{isLegacyIdea ? t(locale, "Earlier meal idea", "先前的餐點想法") : savedRecipe ? detail.cuisine : t(locale, "Saved recipe", "已存配方")}</span>
                        <div className="recipe-plan-heading">
                          <RecipeImage recipe={savedRecipe} locale={locale} />
                          <h3>{planTitle}</h3>
                        </div>
                        {isLegacyIdea && (
                          <p className="notice small">
                            {t(locale, "Saved as a meal idea. Its original name and named foods are preserved; no recipe version or ingredient amounts were saved.", "這是先前儲存的餐點想法，保留原有餐名與具名食物；當時未儲存配方版本或食材份量。")}
                          </p>
                        )}
                        {plan.portion && (
                          <p className="small muted">
                            {t(locale, "Saved recipe portion", "已存配方份量")}:{" "}
                            {t(
                              locale,
                              (
                                {
                                  small: "Small",
                                  regular: "Standard",
                                  large: "Large",
                                } as Record<NutritionPortion, string>
                              )[plan.portion],
                              (
                                {
                                  small: "小份",
                                  regular: "標準份",
                                  large: "大份",
                                } as Record<NutritionPortion, string>
                              )[plan.portion],
                            )}{" "}
                            · {plan.recipeVersion}
                          </p>
                        )}
                        {plan.recipeVersion && !savedRecipe && (
                          <p className="notice small">
                            {t(locale, "This saved recipe version is unavailable. Ingredients and amounts will not be replaced with the current recipe. Enter what you actually ate before recording.", "此已存配方版本已無法取得，不會以目前配方的食材與份量代替。請填入實際吃下的內容再記錄。")}
                            {legacyMeal && <> {t(locale, "Earlier meal reference", "先前餐點參照")}: {legacyMealTitle(legacyMeal, locale)}</>}
                          </p>
                        )}
                        {conflicts.length ? (
                          <p className="notice small">
                            {t(
                              locale,
                              "This saved meal conflicts with your current avoids. Review or remove it. Recording something you actually ate is still available.",
                              "這道已儲存的餐點不符合目前的避開設定，可檢查或移除。你仍可記錄實際吃過的內容。",
                            )}
                          </p>
                        ) : savedRecipe && plan.portion ? (
                          <details className="plan-recipe-details">
                            <summary>{t(locale, "Recipe & preparation", "食譜與準備方式")}</summary>
                            <RecipeCardLink recipe={savedRecipe} portion={plan.portion} locale={locale} />
                            <RecipeDetails recipe={savedRecipe} portion={plan.portion} calculation={calculateRecipe(savedRecipe, plan.portion, locale)} locale={locale} />
                          </details>
                        ) : isLegacyIdea ? <p className="small">{detail.tip}</p> : null}
                        <div className="button-row">
                          <button
                            type="button"
                            className="button quiet small-button"
                            onClick={() => beginConsumed(meal, plan)}
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
                              `Remove plan: ${planTitle}`,
                              `移除計畫：${planTitle}`,
                            )}
                            disabled={recordStore.busy}
                            onClick={async () => {
                              const status = await updateState((current) =>
                                removePlan(current, plan.id), state,
                              );
                              if (status !== "ok") return;
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
                    "Choose a recipe from Next meal or the Library to save a plan here.",
                    "到「今日選餐」找到喜歡的餐點，按「就選這道」就能儲存在這裡。",
                  )}
                </p>
              )}
            </section>
          </div>
        )}
        {view === "history" && (
          <section
            className="panel history-panel"
            aria-labelledby="history-title"
          >
            <div className="section-heading">
              <h2 id="history-title">
                {t(locale, "Your last seven days", "最近七天紀錄")}
              </h2>
              <span className="small muted">
                {t(
                  locale,
                  `${weekly.dataBasis.loggedMealCount} recorded slots`,
                  `${weekly.dataBasis.loggedMealCount} 個餐別有紀錄`,
                )}
              </span>
            </div>
            <p className="muted">
              {t(
                locale,
                "A record of what you logged, without daily completion targets.",
                "回顧你記下的內容，不設定每日完成目標。",
              )}
            </p>
            <HistoryGrid
              days={state.days}
              locale={locale}
              onSelect={(day, slot) => {
                setHistoryDay(day.id);
                if (isMealLogged(day.todayLog[slot])) editMeal(day, slot);
                else startDraft(blankDraft(slot), { dayId: day.id, slot });
              }}
            />
            <div className="record-detail">
              <label>
                {t(locale, "Review day", "查看日期")}
                <select
                  value={selectedPast.id}
                  onChange={(event) => setHistoryDay(event.target.value)}
                >
                  {state.days.map((day) => (
                    <option value={day.id} key={day.id}>
                      {formatDate(day.date, locale)}
                      {day.isToday ? t(locale, " · Today", " · 今天") : ""}
                    </option>
                  ))}
                </select>
              </label>
              <LogList
                day={selectedPast}
                locale={locale}
                onEdit={(slot) => editMeal(selectedPast, slot)}
                onDelete={(slot) => requestDelete(selectedPast.id, slot)}
              />
            </div>
            <details className="weekly-summary">
              <summary>
                {t(locale, "Patterns in these records", "這些紀錄中的模式")}
              </summary>
              {weekly.summaryLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p className="small muted">
                {t(
                  locale,
                  "Records stay in this browser and roll over after seven calendar days. Export a copy from Data & method. These patterns describe recorded food groups, not your usual diet or nutrient adequacy.",
                  "紀錄只存在此瀏覽器，保留滾動的七個日曆日；可從「資料與方法」匯出副本。這些模式只描述紀錄中的食物類別，並非評估平常飲食或營養充足度。",
                )}
              </p>
            </details>
          </section>
        )}
        {view === "catalog" && (
          <div className="view-content">
            <nav className="food-library-sections" aria-label={t(locale, "Library collection", "資料庫分類")}>
              <button type="button" className={cx("button", catalogSection === "recipes" && "primary")} aria-pressed={catalogSection === "recipes"} onClick={() => setCatalogSection("recipes")}>{t(locale, `${standardizedRecipes.length} recipes`, `${standardizedRecipes.length} 道配方`)}</button>
              <button type="button" className={cx("button", catalogSection === "foods" && "primary")} aria-pressed={catalogSection === "foods"} onClick={() => setCatalogSection("foods")}>{t(locale, "Foods & drinks", "食材與飲料")}</button>
            </nav>
            {catalogSection === "foods" ? <section className="panel"><FoodLibrary profile={effectiveProfile} context={mealContext} locale={locale} /></section> : (
              <RecipeLibrary result={pilot} context={mealContext} locale={locale} plans={state.plannedMeals} busy={!recordStore.ready || recordStore.busy}
                onPortionChange={appetite => setMealContext(current => ({ ...current, appetite }))}
                onChoose={chooseRecipe} onAdjustConditions={adjustRecipeConditions} />
            )}
          </div>
        )}
        <footer className="site-footer">
          <div className="site-footer-notes">
            <span>
              {t(
                locale,
                `${recipeCount} recipes with ingredients and portions. No account required.`,
                `${recipeCount} 道附食材與份量的配方，免帳號即可使用。`,
              )}
            </span>
            <span>{t(locale, "Food images are AI-generated illustrations.", "餐點圖片為 AI 生成示意圖。")}</span>
          </div>
          <button className="text-button" type="button" onClick={startDemo}>
            {t(locale, "Try the beef-noodle example", "試用牛肉麵範例")}
          </button>
        </footer>
      </main>
      <Drawer
        open={composerOpen}
        title={t(locale, "Meal record", "餐點紀錄")}
        closeLabel={t(locale, "Close editor", "關閉編輯")}
        onClose={() => {
          if (recordStore.busy) return;
          invalidateAiRequest();
          setComposerOpen(false);
        }}
      >
        {isDemo && (
          <p className="notice">
            {t(locale, "Editing example data only.", "目前只編輯範例資料。")}
          </p>
        )}
        <fieldset className="save-guard" disabled={recordStore.busy}>
        <section
          className="panel composer"
          id="meal-input"
          ref={composerRef}
          aria-labelledby="input-title"
        >
          <div className="section-heading">
            <h2 id="input-title">
              {editingExisting
                ? t(locale, "Edit your meal", "編輯這餐")
                : pendingPlanId
                  ? t(locale, "What did you actually eat?", "你實際吃了什麼？")
                  : t(locale, "What have you eaten?", "剛剛吃了什麼？")}
            </h2>
            {(editTarget ||
              pendingPlanId ||
              review ||
              Object.values(fields).some(Boolean)) && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  resetComposer();
                  setComposerOpen(false);
                }}
              >
                {t(locale, "Discard draft", "捨棄草稿")}
              </button>
            )}
          </div>
          {draftDayId && (
            <p className="small muted">
              {formatDate(draftDayId, locale)} ·{" "}
              {label(draft.mealSlot, locale)}
            </p>
          )}
          {draftDayId && !rollSevenDayHistory([], clock).some(day => day.id === draftDayId) && (
            <label>{t(locale, "Choose a date for this draft", "選擇草稿的記錄日期")}
              <select value="" onChange={event => {
                if (!event.target.value) return;
                invalidateAiRequest();
                const id = event.target.value;
                const latest = isDemo ? state : realStateRef.current;
                draftBaseRef.current = { ...latest, days: rollSevenDayHistory(latest.days, new Date()) };
                setDraftDayId(id);
                setEditTarget(null);
                setDraftConflict(false);
                setFormError("");
              }}>
                <option value="">{t(locale, "Select date", "選擇日期")}</option>
                {rollSevenDayHistory([], clock).map(day => <option key={day.id} value={day.id}>{formatDate(day.id, locale)}</option>)}
              </select>
            </label>
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
              <p className="small muted">{t(locale, "Review this meal to identify foods and choose source data.", "按「檢查這餐內容」後，可辨識食物並選擇來源資料。")}</p>
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
                      editFields((current) => ({
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
                          editFields((current) => ({
                            ...current,
                            [item.field]: [
                              ...new Set([
                                ...splitFoods(current[item.field]),
                                translateFood(food, locale),
                              ]),
                            ].map(quoteFoodName).join(", "),
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
                        editFields((current) => ({
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
                setDraft={editDraft}
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
                    editFields(fieldsFrom(draft));
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
              <p className="small muted">
                {t(locale, "Amounts are saved with your record. They are not used to calculate nutrient intake or a daily calorie balance.", "份量會隨紀錄保存，目前不據此計算實際營養攝取或每日熱量收支。")}
              </p>
              {draft.components.map((component, index) => (
                <div className="component-editor" key={index}>
                  <label>
                    {t(locale, "Food", "食物")}
                    <input
                      value={component.name}
                      maxLength={300}
                      onChange={(event) =>
                        editDraft((current) => ({
                          ...current,
                          components: current.components.map((item, i) =>
                            i === index
                              ? { ...item, name: event.target.value, sourceFoodId: undefined, foodLibraryId: undefined }
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
                        editDraft((current) => ({
                          ...current,
                          components: current.components.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  group: event.target
                                    .value as ParsedMealComponent["group"],
                                  sourceFoodId: undefined,
                                  foodLibraryId: undefined,
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
                      max={
                        component.amount.unit === "g" ||
                        component.amount.unit === "ml"
                          ? 10000
                          : 50
                      }
                      step="any"
                      value={component.amount.quantity ?? ""}
                      placeholder={t(locale, "Unspecified", "未說明")}
                      onChange={(event) =>
                        editDraft((current) => ({
                          ...current,
                          components: current.components.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  amount: {
                                    quantity: event.target.value
                                      ? Number(event.target.value)
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
                        editDraft((current) => ({
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
                        "g",
                        "ml",
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
                  <FoodRecognition
                    name={component.name}
                    group={component.group}
                    foodLibraryId={component.foodLibraryId}
                    profile={effectiveProfile}
                    context={mealContext}
                    locale={locale}
                    onSelect={(food) => editDraft(current => ({
                      ...current,
                      components: current.components.map((item, itemIndex) => itemIndex !== index ? item : food ? {
                        ...item, name: foodLibraryName(food, locale), group: food.group,
                        foodLibraryId: food.id, sourceFoodId: undefined,
                      } : { ...item, foodLibraryId: undefined }),
                    }))}
                  />
                  <button
                    type="button"
                    className="text-button danger-text remove-component"
                    aria-label={t(
                      locale,
                      `Remove ${component.name}`,
                      `移除${component.name}`,
                    )}
                    onClick={() =>
                      editDraft((current) => ({
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
                  editDraft((current) => ({
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
                setDraft={editDraft}
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
                  {editingExisting
                    ? t(locale, "Save changes", "儲存修改")
                    : editTarget
                      ? t(locale, "Save this record", "儲存這筆紀錄")
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
          {draftConflict && <div className="notice">
            <p>{t(locale, "Latest saved record", "最新儲存內容")}: {entryNames(targetDay.todayLog[draft.mealSlot], locale) || t(locale, "Empty", "空白")}</p>
            <button type="button" className="button quiet" onClick={() => {
              invalidateAiRequest();
              draftBaseRef.current = isDemo ? state : realStateRef.current;
              setDraftConflict(false);
              setFormError("");
              setWriteError("");
            }}>{t(locale, "Keep my draft and review against this record", "保留草稿，依這筆最新紀錄重新確認")}</button>
          </div>}
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
                "Bring your own OpenAI key. Your meal description and key pass through MealHatch's relay to OpenAI. The key stays only in this page's memory; provider charges and data policies apply. The quick form works without AI.",
                "使用自己的 OpenAI key。餐點描述與金鑰會經 MealHatch 轉送至 OpenAI；金鑰只留在本頁記憶體。費用與資料處理依供應商政策，快速輸入不需要 AI。",
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
                onChange={(event) => {
                  invalidateAiRequest();
                  setApiKey(event.target.value);
                }}
                placeholder="sk-…"
              />
            </label>
            {apiKey && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  invalidateAiRequest();
                  setApiKey("");
                }}
              >
                {t(locale, "Forget this key", "清除金鑰")}
              </button>
            )}
            <label>
              {t(locale, "Describe one meal", "描述一餐")}
              <textarea
                maxLength={600}
                value={aiText}
                onChange={(event) => {
                  invalidateAiRequest();
                  setAiText(event.target.value);
                }}
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
        </fieldset>
      </Drawer>
      <Drawer
        open={preferencesOpen}
        title={t(locale, "Your preferences", "你的偏好")}
        closeLabel={t(locale, "Close preferences", "關閉偏好")}
        onClose={() => setPreferencesOpen(false)}
      >
        <div className="drawer-status" role="status" aria-live="polite">
          {changeNote}
        </div>
        <fieldset className="save-guard" disabled={!recordStore.ready || recordStore.busy}>
        <PreferenceControls
          profile={realState.profile}
          update={async (profile) => {
            const preferences = {
              avoidTags: profile.avoidTags,
              preferenceTags: profile.preferenceTags,
            };
            const status = await persistRealState((current) => ({
              ...current,
              profile: { ...current.profile, ...preferences },
            }), realState);
            if (status !== "ok") {
              setChangeNote(saveFailure(status));
              return;
            }
            setDemoState((current) =>
              current
                ? {
                    ...current,
                    profile: { ...current.profile, ...preferences },
                  }
                : null,
            );
            setSelected(0);
            setChangeNote(
              t(
                locale,
                "Preferences saved. Suggestions recalculated.",
                "偏好已儲存，建議已重新配對。",
              ),
            );
          }}
          locale={locale}
        />
        </fieldset>
      </Drawer>
      <Drawer
        open={dataOpen}
        title={t(locale, "Data & method", "資料與方法")}
        closeLabel={t(locale, "Close data & method", "關閉資料與方法")}
        onClose={() => setDataOpen(false)}
      >
        <div className="drawer-status" role="status" aria-live="polite">
          {message}
        </div>
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
              "Meal records, preferences and plans are saved only in this browser for this website address. They do not sync across devices or website addresses. No account or paid AI is needed for the main experience. Example data stays separate.",
              "餐點紀錄、偏好與計畫只儲存在此瀏覽器的此網站網址中，不會跨裝置或跨網址同步。主要流程免帳號，也不需要付費 AI；範例資料分開處理。",
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
              disabled={!recordStore.ready || recordStore.busy}
              onClick={() => { clearBaseRef.current = realState; setClearOpen(true); }}
            >
              {t(
                locale,
                "Clear all my MealHatch data",
                "清除所有 MealHatch 資料",
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
                "MealHatch is available in English and Traditional Chinese. It helps choose a daily meal without grading eating habits or setting weight-loss goals. After ingredient and strict meal-condition exclusions, recipes are compared in order: current-meal preference groups, saved preference groups, then the nutrition level. The nutrition reference is nutrient contribution + energy contribution = 10 minus the raw UK NPM 2018 result per 100 g; preference points are not added to it. Recipes are compared by level (18 or more, 14 to 17, 13 or less) because single points are too fine to order mixed meals by. Within equal stages, recognized records reduce repeats, options shown together differ in staple or main protein where possible, and the remaining order rotates by date and meal window, so the same inputs at the same time always give the same result. These ordering choices are product rules, not scientific weights or a health grade. All model inputs, thresholds, protein conditions, preference points and sources remain in each recipe’s calculation details. Times describe assembly with prepared ingredients; full cooking time is unknown. Hunger suggests an editable portion, not calorie needs or predicted fullness. Recommendations and the library use the same recipes. This version supports general healthy adults’ daily meal choices, without individual adequacy or medical recommendations.",
                "提供英文與繁體中文，協助日常選餐；不評論飲食習慣，也不設定減重目標。先排除避開項目與不符合必要條件的配方，再依序比較本餐偏好群組、已存偏好群組、營養級別。營養參考值＝營養項＋熱量項＝10－每 100 克 UK NPM 2018 原始分數，偏好點數不加進營養。逐點比較混合餐點過於細微，因此改以級別比較（18 以上、14 至 17、13 以下）。前三個比較階段皆相同時，依具名紀錄減少重複，同一組選項盡量讓主食或主要蛋白質來源不同，其餘順序依日期與餐別時段輪替；相同的輸入在相同時段一定得到相同結果。這些先後順序是產品規則，並非科學權重或健康等級。所有模型輸入、門檻、蛋白質計分條件、偏好點數與來源都保留於各配方的計算明細。時間只描述備妥食材後的組合，完整烹調時間未知。飢餓感只建議可調整的份量，不推算熱量需求或飽足感。推薦與資料庫使用同一份配方，協助一般健康成人日常選餐，不評估個人營養充足度或提供醫療建議。",
              )}
            </p>
            <p>
              {t(locale,
                "The food and drink library preserves separate official records for different foods and preparation states. Name recognition runs in this browser; a broad name does not select a nutrient record. You can explicitly link a source while reviewing a meal. Source-food scores use the same per-100-g model plus only supported ingredient preferences (0–4 points), with missing inputs shown. They do not estimate your logged intake, certify avoided ingredients, or add new recipes to the recommendation pool. Open Library for source versions and calculation details.",
                "食材與飲料資料庫將不同食物與處理狀態的官方紀錄分開保存。名稱辨識在瀏覽器內進行，籠統名稱不會自動指定營養紀錄；檢查餐點時可自行選定來源。來源食物使用同一套每 100 克模型，另加有資料支持的食材偏好分（0–4 點），缺漏值會明確標示。這些分數不推算已記錄的攝取量、不認證已避開的成分，也不會將食材當成新配方加入推薦。資料版本與計算明細可在「資料庫」查看。",
              )}
            </p>
            <p>
              {t(
                locale,
                "If you choose AI, your description and session key are sent through MealHatch to OpenAI. The request uses store:false and no-store caching, which does not override provider retention policies. The key is never written into local records, exports or meal cards. Reload or use Forget this key to remove it from the page.",
                "若選用 AI，描述與本次金鑰會經 MealHatch 送至 OpenAI。請求設定 store:false 與禁止快取，仍適用供應商的資料保留政策。金鑰不會寫入本機紀錄、匯出資料或小卡；重新整理或按清除金鑰即可從頁面記憶體移除。",
              )}
            </p>
            <p>
              {t(
                locale,
                "Vercel Web Analytics records basic visit statistics. Analytics URLs exclude query strings and fragments. Meal records, descriptions and API keys are not attached to analytics events.",
                "Vercel Web Analytics 記錄基本瀏覽統計，統計網址會移除查詢參數與頁內標記。餐點紀錄、描述與 API key 不會附加到統計事件。",
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
      </Drawer>
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
          busy={recordStore.busy}
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
            "Clear all MealHatch data?",
            "要清除所有 MealHatch 資料嗎？",
          )}
          confirm={t(locale, "Clear all data", "清除全部資料")}
          cancel={t(locale, "Cancel", "取消")}
          onConfirm={clearAll}
          busy={recordStore.busy}
          onCancel={() => setClearOpen(false)}
        >
          <p>
            {t(
              locale,
              "This removes your local meal records, saved plans, preferences, saved language choice and session key. This page stays in the current language until you leave it. Export a copy first if needed. Other websites' data is not affected.",
              "這會移除本機餐點紀錄、計畫、偏好、已儲存的語言設定與本次金鑰；目前頁面在你離開前維持現在的語言。需要保留時，請先匯出副本；其他網站的資料不受影響。",
            )}
          </p>
        </ConfirmationDialog>
      )}
    </>
  );
}

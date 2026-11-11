import { useId, type ReactNode } from "react";
import type { MealContext } from "./meal-context";
import { proteinGroupLabels, proteinGroups } from "./protein-preference";
import type { Locale, Profile } from "./types";

const t = (locale: Locale, en: string, zh: string) =>
  locale === "zh" ? zh : en;

type Choice<T extends string> = {
  value: T;
  /** Full wording, shown where the row has room. */
  label: string;
  /** Wording for narrow screens, where the row scrolls sideways. */
  short: string;
};

const stapleChoices = (locale: Locale): Choice<MealContext["preferredStaple"]>[] =>
  (
    [
      ["any", "Any", "都可以", "Any", "都可以"],
      ["rice", "Rice", "飯類", "Rice", "飯"],
      ["noodles", "Noodles", "麵類", "Noodles", "麵"],
      ["bread", "Bread or wraps", "麵包／捲餅", "Bread", "麵包"],
      ["potato", "Potato or sweet potato", "馬鈴薯／地瓜", "Potato", "馬鈴薯"],
      ["other", "Other grains", "其他穀物", "Grains", "穀物"],
      ["none", "No staple", "無主食", "No staple", "無主食"],
    ] as const
  ).map(([value, en, zh, shortEn, shortZh]) => ({
    value,
    label: t(locale, en, zh),
    short: t(locale, shortEn, shortZh),
  }));

const shortProteinLabels: Record<(typeof proteinGroups)[number], [string, string]> = {
  poultry: ["Chicken", "雞肉"],
  egg: ["Egg", "蛋"],
  seafood: ["Fish", "魚"],
  beans: ["Beans", "豆"],
  "red-meat": ["Red meat", "紅肉"],
  dairy: ["Dairy", "乳品"],
};

const proteinChoices = (locale: Locale): Choice<MealContext["preferredProtein"]>[] => [
  { value: "any", label: t(locale, "Any", "都可以"), short: t(locale, "Any", "都可以") },
  ...proteinGroups.map((group) => ({
    value: group,
    label: proteinGroupLabels[group][locale],
    short: t(locale, ...shortProteinLabels[group]),
  })),
];

/** One row of mutually exclusive choices; native radios keep arrow-key behaviour. */
function ChoiceRow<T extends string>({
  title,
  field,
  value,
  choices,
  onChange,
}: {
  title: string;
  field: string;
  value: T;
  choices: Choice<T>[];
  onChange: (next: T) => void;
}) {
  const id = useId();
  return (
    <div className="choice-row" role="radiogroup" aria-labelledby={`${id}-title`} data-choice={field}>
      <span className="choice-title" id={`${id}-title`}>
        {title}
      </span>
      <div className="choice-chips">
        {choices.map((choice) => (
          <label className="choice-chip" key={choice.value}>
            <input
              type="radio"
              name={`${id}-${field}`}
              value={choice.value}
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
            />
            <span>
              <span className="choice-full">{choice.label}</span>
              <span className="choice-short">{choice.short}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function MealContextControls({
  value,
  profile,
  locale,
  onChange,
  onProfileChange,
  showMealSetting = true,
  showRecipePortions = true,
  aside,
}: {
  value: MealContext;
  profile: Profile;
  locale: Locale;
  onChange: (next: MealContext) => void;
  onProfileChange: (next: Profile) => void;
  showMealSetting?: boolean;
  showRecipePortions?: boolean;
  /** Shown on the same line as the "More conditions" control. */
  aside?: ReactNode;
}) {
  const timeHelpId = useId();
  const warmOnly =
    profile.feelToday === "Want something warm" || value.temperature === "warm";
  const extraCount = [
    value.cuisine !== "any",
    showRecipePortions && value.hunger !== "unspecified",
    showRecipePortions && value.appetite !== "unspecified",
    profile.feelToday === "Need something light" || profile.feelToday === "Low energy",
    warmOnly,
    value.ingredientReadiness !== "unspecified",
    value.maxPrepMinutes !== null,
    showMealSetting && profile.eatingStyle !== "Both",
  ].filter(Boolean).length;
  return (
    <div className="meal-context-controls">
      <ChoiceRow
        title={t(locale, "Staple", "主食")}
        field="staple"
        value={value.preferredStaple}
        choices={stapleChoices(locale)}
        onChange={(preferredStaple) => onChange({ ...value, preferredStaple })}
      />
      <ChoiceRow
        title={t(locale, "Protein", "主菜")}
        field="protein"
        value={value.preferredProtein}
        choices={proteinChoices(locale)}
        onChange={(preferredProtein) => onChange({ ...value, preferredProtein })}
      />
      <div className="context-more-row">
        <details className="meal-context-extra">
          <summary>
            <span className="context-more-label">
              {t(locale, "More conditions", "更多條件")}
            </span>
            {extraCount > 0 ? (
              <span className="context-more-count">
                <span className="context-more-count-word">{t(locale, "", "已設 ")}</span>
                {extraCount}
                <span className="context-more-count-word">{t(locale, " set", " 項")}</span>
              </span>
            ) : (
              <span className="context-more-hint">
                {t(
                  locale,
                  "style, portion, warm only, time limit, less oil",
                  "風格、份量、只要熱食、時間上限、少油",
                )}
              </span>
            )}
          </summary>
          <div className="context-more-grid">
            <label>
              {t(locale, "Preferred style", "偏好的風格")}
              <select
                value={value.cuisine}
                onChange={(event) =>
                  onChange({
                    ...value,
                    cuisine: event.target.value as MealContext["cuisine"],
                  })
                }
              >
                <option value="any">{t(locale, "Any style", "都可以")}</option>
                <option value="asian">
                  {t(locale, "Asian-style", "亞洲風味")}
                </option>
                <option value="western">
                  {t(locale, "Western-style", "西式風味")}
                </option>
              </select>
            </label>
            {showRecipePortions && (
              <>
                <label>
                  {t(locale, "How hungry are you?", "現在餓不餓？")}
                  <select
                    value={value.hunger}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        hunger: event.target.value as MealContext["hunger"],
                      })
                    }
                  >
                    <option value="unspecified">
                      {t(locale, "Not specified", "先不指定")}
                    </option>
                    <option value="not-hungry">
                      {t(locale, "Not very hungry", "不太餓")}
                    </option>
                    <option value="moderate">
                      {t(locale, "Somewhat hungry", "有一點餓")}
                    </option>
                    <option value="hungry">{t(locale, "Hungry", "很餓")}</option>
                  </select>
                </label>
                <label>
                  {t(locale, "Portion to explore", "這餐想看多大份？")}
                  <select
                    value={value.appetite}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        appetite: event.target.value as MealContext["appetite"],
                      })
                    }
                  >
                    <option value="unspecified">
                      {t(locale, "Suggest from my hunger", "依飢餓感先建議")}
                    </option>
                    <option value="small">
                      {t(locale, "Small recipe portion", "小份配方")}
                    </option>
                    <option value="regular">
                      {t(locale, "Standard recipe portion", "標準份配方")}
                    </option>
                    <option value="large">
                      {t(locale, "Large recipe portion", "大份配方")}
                    </option>
                  </select>
                </label>
              </>
            )}
            <label>
              {t(locale, "For this meal I want…", "這餐比較想…")}
              <select
                value={
                  profile.feelToday === "Want something warm"
                    ? "Normal"
                    : profile.feelToday
                }
                onChange={(event) =>
                  onProfileChange({
                    ...profile,
                    feelToday: event.target.value as Profile["feelToday"],
                  })
                }
              >
                <option value="Normal">
                  {t(locale, "Open to ideas", "都可以")}
                </option>
                <option value="Need something light">
                  {t(locale, "Less added oil", "較少添加油")}
                </option>
                <option value="Low energy">
                  {t(locale, "Less effort to prepare", "省點準備力氣")}
                </option>
              </select>
            </label>
            <label>
              {t(locale, "Meal temperature", "餐點溫度")}
              <select
                value={warmOnly ? "warm" : value.temperature}
                onChange={(event) => {
                  onChange({
                    ...value,
                    temperature: event.target.value as MealContext["temperature"],
                  });
                  if (profile.feelToday === "Want something warm")
                    onProfileChange({ ...profile, feelToday: "Normal" });
                }}
              >
                <option value="any">
                  {t(locale, "Any temperature", "都可以")}
                </option>
                <option value="warm">
                  {t(locale, "Warm meals only", "只要熱食")}
                </option>
              </select>
            </label>
            <label>
              {t(locale, "Are the ingredients ready?", "食材準備好了嗎？")}
              <select value={value.ingredientReadiness} onChange={event => onChange({ ...value, ingredientReadiness: event.target.value as MealContext["ingredientReadiness"] })}>
                <option value="unspecified">{t(locale, "Not specified", "先不指定")}</option>
                <option value="ready">{t(locale, "Ready to assemble", "已備妥，可直接組合")}</option>
                <option value="needs-prep">{t(locale, "Still need preparation", "還需要處理或烹調")}</option>
              </select>
            </label>
            <label>
              {t(locale, value.ingredientReadiness === "needs-prep" ? "Time available" : "Assembly time limit (ingredients ready)", value.ingredientReadiness === "needs-prep" ? "這餐可用時間" : "組合時間上限（食材已備妥）")}
              <select value={value.maxPrepMinutes ?? "any"} aria-describedby={timeHelpId} onChange={event => onChange({ ...value, maxPrepMinutes: event.target.value === "any" ? null : Number(event.target.value) })}>
                <option value="any">{t(locale, "No limit", "不限制")}</option>
                {[5, 10].map(minutes => <option key={minutes} value={minutes}>{t(locale, `Up to ${minutes} minutes`, `${minutes} 分鐘以內`)}</option>)}
              </select>
            </label>
            {showMealSetting && (
              <label>
                {t(locale, "Meal setting", "這餐的安排")}
                <select
                  value={profile.eatingStyle}
                  onChange={(event) =>
                    onProfileChange({
                      ...profile,
                      eatingStyle: event.target.value as Profile["eatingStyle"],
                    })
                  }
                >
                  <option value="Both">
                    {t(locale, "Either works", "都方便")}
                  </option>
                  <option value="Mostly home-cooked">
                    {t(locale, "At home", "在家準備")}
                  </option>
                  <option value="Mostly takeout">
                    {t(locale, "Eating out", "外食")}
                  </option>
                </select>
              </label>
            )}
          </div>
          <p id={timeHelpId} className="small muted">{value.ingredientReadiness === "needs-prep"
            ? t(locale, "Full preparation and cooking time is unknown. A time limit excludes recipes until ingredients are ready or the limit is removed.", "尚無完整處理與烹調時間資料。設定時間上限時會排除配方；食材備妥或移除時間限制後可再選餐。")
            : t(locale, "Times cover assembly with the listed ingredients already cooked or prepared. They do not include shopping, thawing or cooking ingredients.", "時間只包含將列出的已熟或已處理食材組合，不含採買、解凍或食材烹調。")}</p>
          <p className="small muted context-scope">
            {t(
              locale,
              "Warm-only and time limits filter all options; the rest are preferences. For this meal only: these reset after recording a meal, a new day or reloading.",
              "只要熱食與時間上限會篩選所有選項，其餘為偏好。只用於本次選餐；記錄一餐、換日或重新整理後重設。",
            )}
          </p>
        </details>
        {aside}
      </div>
    </div>
  );
}

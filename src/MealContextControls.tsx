import type { MealContext } from "./meal-context";
import type { Locale, Profile } from "./types";

const t = (locale: Locale, en: string, zh: string) =>
  locale === "zh" ? zh : en;

export function MealContextControls({
  value,
  profile,
  locale,
  onChange,
  onProfileChange,
  showMealSetting = true,
  showRecipePortions = true,
}: {
  value: MealContext;
  profile: Profile;
  locale: Locale;
  onChange: (next: MealContext) => void;
  onProfileChange: (next: Profile) => void;
  showMealSetting?: boolean;
  showRecipePortions?: boolean;
}) {
  return (
    <div className="meal-context-controls">
      {showRecipePortions && (
        <div className="context-primary">
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
        </div>
      )}
      <details className="meal-context-extra">
        <summary>
          {t(
            locale,
            "Taste, preparation & other preferences",
            "口味、準備方式與其他條件",
          )}
        </summary>
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
            value={
              profile.feelToday === "Want something warm"
                ? "warm"
                : value.temperature
            }
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
          {t(locale, "Preferred staple", "偏好的主食")}
          <select
            value={value.preferredStaple}
            onChange={(event) =>
              onChange({
                ...value,
                preferredStaple: event.target
                  .value as MealContext["preferredStaple"],
              })
            }
          >
            {(
              [
                ["any", "Open to ideas", "都可以"],
                ["rice", "Rice", "飯類"],
                ["noodles", "Noodles", "麵類"],
                ["bread", "Bread or wraps", "麵包／捲餅"],
                ["potato", "Potato or sweet potato", "馬鈴薯／地瓜"],
                ["other", "Other grains", "其他穀物"],
                ["none", "Prefer no staple", "偏好無主食餐型"],
              ] as const
            ).map(([key, en, zh]) => (
              <option key={key} value={key}>
                {t(locale, en, zh)}
              </option>
            ))}
          </select>
        </label>
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
        <label>
          {t(
            locale,
            "Estimated assembly time limit (ingredients ready)",
            "預估組合時間上限（食材已備妥）",
          )}
          <select
            value={value.maxPrepMinutes ?? "any"}
            onChange={(event) =>
              onChange({
                ...value,
                maxPrepMinutes:
                  event.target.value === "any"
                    ? null
                    : Number(event.target.value),
              })
            }
          >
            <option value="any">{t(locale, "No limit", "不限制")}</option>
            {[10, 15, 20, 30].map((minutes) => (
              <option key={minutes} value={minutes}>
                {t(locale, `Up to ${minutes} minutes`, `${minutes} 分鐘以內`)}
              </option>
            ))}
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
        <p className="small muted">
          {t(
            locale,
            showRecipePortions
              ? "Preferences add to the recipe ranking total; an unmatched preference gives no bonus. Warm-only and estimated time limits filter every option."
              : "Staple comes first, then style and preparation preferences. Unmatched preferences are explained. Warm-only and estimated time limits filter every option.",
            showRecipePortions
              ? "偏好會加入配方排序總分，未符合時不加分。只要熱食與預估時間上限會篩選每個選項。"
              : "先依主食，再依風格與準備偏好排序；未符合時會說明。只要熱食與預估時間上限會篩選每個選項。",
          )}
        </p>
      </details>
      <p className="small muted context-scope">
        {t(
          locale,
          "For this meal only. Resets after recording a meal, a new day or reloading.",
          "只用於本次選餐；記錄一餐、換日或重新整理後重設。",
        )}
      </p>
    </div>
  );
}

import { mealNames } from "./data";
import { isMealLogged } from "./logic";
import { label } from "./presentation";
import type { PilotRecommendation } from "./nutrition";
import type {
  DayHistory,
  Locale,
  MealName,
} from "./types";

const text = (locale: Locale, en: string, zh: string) =>
  locale === "en" ? en : zh;

const dateLabel = (day: DayHistory, locale: Locale, compact = false) => {
  const date = new Date(`${day.date || day.id}T12:00:00`);
  if (Number.isNaN(date.getTime())) return day.date || day.id;
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-TW" : "en-US", {
    month: compact ? "numeric" : "long",
    day: "numeric",
    weekday: "short",
    ...(compact ? {} : { year: "numeric" }),
  }).format(date);
};

type HistoryGridProps = {
  days: DayHistory[];
  locale: Locale;
  onSelect: (day: DayHistory, slot: MealName) => void;
};

/** Recorded slots describe logging coverage, never whether a meal was skipped. */
export function HistoryGrid({ days, locale, onSelect }: HistoryGridProps) {
  const orderedDays = [...days]
    .sort((first, second) =>
      (first.date || first.id).localeCompare(second.date || second.id),
    )
    .slice(-7);
  const recorded = text(locale, "Recorded", "有紀錄");
  const unknown = text(locale, "Unknown", "未知");

  return (
    <div className="dashboard-history">
      <p className="history-explanation">
        {text(
          locale,
          "Select a meal slot to review or add a record. An unknown slot does not mean you skipped a meal.",
          "選擇餐別即可查看或補登紀錄。未知不代表你沒有吃這餐。",
        )}
      </p>
      <div className="history-table-scroll">
        <table>
          <caption>
            {text(
              locale,
              "Meal records across the recent seven days",
              "最近七天的餐別紀錄",
            )}
          </caption>
          <thead>
            <tr>
              <th scope="col">{text(locale, "Meal", "餐別")}</th>
              {orderedDays.map((day) => (
                <th scope="col" key={day.id}>
                  <time dateTime={day.date || day.id}>
                    {dateLabel(day, locale, true)}
                  </time>
                  {day.isToday && (
                    <span className="history-today">
                      {text(locale, "Today", "今天")}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mealNames.map((slot) => (
              <tr key={slot}>
                <th scope="row">{label(slot, locale)}</th>
                {orderedDays.map((day) => {
                  const hasRecord = isMealLogged(day.todayLog[slot]);
                  const status = hasRecord ? recorded : unknown;
                  return (
                    <td key={day.id}>
                      <button
                        type="button"
                        className={`history-cell ${hasRecord ? "is-recorded" : "is-unknown"}`}
                        aria-label={`${dateLabel(day, locale)} · ${label(slot, locale)} · ${status}`}
                        onClick={() => onSelect(day, slot)}
                      >
                        <span className="history-cell-mark" aria-hidden="true">
                          {hasRecord ? "●" : "○"}
                        </span>
                        <span className="history-cell-status">{status}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul
        className="history-legend"
        aria-label={text(locale, "Record status legend", "紀錄狀態圖例")}
      >
        <li>
          <span className="history-legend-mark is-recorded" aria-hidden="true">
            ●
          </span>{" "}
          {recorded}
        </li>
        <li>
          <span className="history-legend-mark is-unknown" aria-hidden="true">
            ○
          </span>{" "}
          {unknown}
        </li>
      </ul>
    </div>
  );
}

type RecipeFitProps = { rec: PilotRecommendation; locale: Locale };

export function recipeMatchLabel(rec: PilotRecommendation, locale: Locale): string {
  if (!rec.score) return text(locale, "Unavailable", "無法計分");
  const current = rec.score.currentPreference;
  const saved = rec.score.savedPreference;
  return current.selected
    ? text(locale, `This meal: ${current.matched}/${current.selected} preferences match`, `本餐偏好符合 ${current.matched}/${current.selected} 項`)
    : saved.selected
      ? text(locale, `Saved preferences: ${saved.matched}/${saved.selected} groups match`, `已存偏好符合 ${saved.matched}/${saved.selected} 組`)
      : rec.score.unsupportedSavedPreferences.length ? text(locale, "No applicable meal preferences selected", "目前沒有可用於選餐的偏好") : text(locale, "No preferences selected", "未選擇偏好");
}

/** Compact, engine-derived reasons; full arithmetic stays in the disclosure. */
export function RecipeFitSummary({ rec, locale }: RecipeFitProps) {
  const hasActivePreferences = rec.score.currentPreference.selected + rec.score.savedPreference.selected > 0;
  if (!hasActivePreferences && !rec.matchedPreferenceReasons.length && !rec.mismatchReasons.length) return null;
  return <div className="recipe-fit-summary">
    {hasActivePreferences && <p className="small muted recipe-match-count">{recipeMatchLabel(rec, locale)}</p>}
    {rec.matchedPreferenceReasons.length > 0 && <ul className="recipe-fit-reasons">{rec.matchedPreferenceReasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
    {rec.mismatchReasons.length > 0 && <div className="recipe-fit-mismatches">{rec.mismatchReasons.filter(reason => !rec.matchReasons.includes(reason)).map(reason => <p className="small muted" key={reason}>{reason}</p>)}</div>}
  </div>;
}

/** Card copy under the title: actual matches, then energy and protein for the shown portion. */
export function RecipeOptionFacts({ rec, locale }: RecipeFitProps) {
  const whole = (value: number) =>
    new Intl.NumberFormat(locale === "zh" ? "zh-TW" : "en-US", { maximumFractionDigits: 0 }).format(value);
  const { kcal, protein, fiber } = rec.nutrition;
  const main = [
    kcal !== null && text(locale, `${whole(kcal)} kcal`, `${whole(kcal)} 大卡`),
    protein !== null && text(locale, `${whole(protein)} g protein`, `蛋白質 ${whole(protein)} 克`),
  ].filter(Boolean).join(" · ");
  return <div className="recipe-option-facts">
    {rec.matchedPreferenceReasons.length > 0 && <ul className="pick-reasons">
      {rec.matchedPreferenceReasons.map(reason => <li className="recipe-option-reason" key={reason}>{reason}</li>)}
    </ul>}
    {main && <p className="pick-facts">
      {main}
      {fiber !== null && <span className="pick-facts-long">{" · "}{text(locale, `${whole(fiber)} g fiber`, `膳食纖維 ${whole(fiber)} 克`)}</span>}
    </p>}
  </div>;
}

/** Explain the default ordering once for the collection, not on every card. */
export function RecipeRankingNote({ rec, locale }: { rec?: PilotRecommendation; locale: Locale }) {
  if (!rec || rec.score.currentPreference.selected + rec.score.savedPreference.selected > 0) return null;
  return <p className="small muted recipe-ranking-note">{rec.score.unsupportedSavedPreferences.length
    ? text(locale, "Your saved preferences do not apply to this collection. Options with a higher nutrition level take turns.", "已存偏好不適用於這組配方，目前由營養級別較高的配方輪流出現。")
    : text(locale, "No preferences set · options with a higher nutrition level take turns.", "尚未設定偏好 · 營養級別較高的配方輪流出現。")}</p>;
}

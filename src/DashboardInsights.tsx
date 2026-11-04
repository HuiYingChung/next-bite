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

type RecipeOptionFactsProps = { rec: PilotRecommendation; locale: Locale };

/** Keeps the recipe ranking total separate from facts for the selected portion. */
export function RecipeOptionFacts({ rec, locale }: RecipeOptionFactsProps) {
  const unknown = text(locale, "Unknown", "未知");
  const quantity = (value: number | null, unit: string, integer = false) => {
    if (value === null) return unknown;
    const threshold = integer ? 1 : 0.1;
    const formatted = value > 0 && value < threshold
      ? `<${threshold}`
      : new Intl.NumberFormat(locale === "zh" ? "zh-TW" : "en-US", {
          maximumFractionDigits: integer ? 0 : 1,
        }).format(value);
    return `${formatted} ${unit}`;
  };
  return (
    <span className="recipe-option-facts">
      <span className="recipe-option-fact recipe-option-total">
        <span className="recipe-option-label">{text(locale, "Ranking total", "排序總分")}</span>{" "}
        <span className="recipe-option-value">{rec.score?.model.status === "complete" && Number.isFinite(rec.score.total)
          ? new Intl.NumberFormat(locale === "zh" ? "zh-TW" : "en-US", { maximumFractionDigits: 2 }).format(rec.score.total)
          : text(locale, "Unavailable", "無法計分")}</span>
      </span>{" "}
      <span className="recipe-option-fact">
        <span className="recipe-option-label">{text(locale, "Portion energy", "本份熱量")}</span>{" "}
        <span className="recipe-option-value">{quantity(rec.nutrition.kcal, "kcal", true)}</span>
      </span>{" "}
      <span className="recipe-option-fact">
        <span className="recipe-option-label">{text(locale, "Portion protein", "本份蛋白質")}</span>{" "}
        <span className="recipe-option-value">{quantity(rec.nutrition.protein, "g")}</span>
      </span>{" "}
      <span className="recipe-option-fact">
        <span className="recipe-option-label">{text(locale, "Assembly (ingredients ready)", "組裝（食材已備妥）")}</span>{" "}
        <span className="recipe-option-value">{text(locale, `About ${rec.recipe.prepMinutes} min`, `約 ${rec.recipe.prepMinutes} 分鐘`)}</span>
      </span>
    </span>
  );
}

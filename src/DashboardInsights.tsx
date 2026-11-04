import { mealNames } from "./data";
import { isMealLogged } from "./logic";
import { label } from "./presentation";
import type {
  DayHistory,
  Locale,
  MealName,
  ScoreBreakdownItem,
  ScoredRecommendation,
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

const categoryLabels: Record<ScoreBreakdownItem["category"], [string, string]> =
  {
    protein: ["Recorded protein foods", "已記錄的蛋白質食物"],
    vegetables: ["Recorded vegetables", "已記錄的蔬菜"],
    carbs: ["Recorded staples", "已記錄的主食"],
    heaviness: ["Meal style", "餐點風格"],
    convenience: ["Practical fit", "便利程度"],
    profile: ["Current preferences", "當下設定"],
    preferences: ["Saved preferences", "已儲存的偏好"],
    avoid: ["Avoided items", "避開項目"],
    variety: ["Same-day variety", "當天餐點變化"],
    "snack-drink": ["Snacks and drinks", "點心與飲料"],
    "time-of-day": ["Time window", "用餐時段"],
    "weekly-pattern": ["Recent records", "近期紀錄"],
  };

type ScoreContributionsProps = { rec: ScoredRecommendation; locale: Locale };

/** Each bar uses only this recommendation's visible rule breakdown. */
export function ScoreContributions({ rec, locale }: ScoreContributionsProps) {
  const maxMagnitude = Math.max(
    1,
    ...rec.scoreBreakdown.map((item) => Math.abs(item.points)),
  );
  const format = new Intl.NumberFormat(locale === "zh" ? "zh-TW" : "en-US", {
    maximumFractionDigits: 2,
  });

  return (
    <section
      className="score-contributions"
      aria-label={text(
        locale,
        "Matching rule contributions",
        "配對規則的加減分",
      )}
    >
      <p className="contribution-explanation">
        {text(
          locale,
          "These heuristic points describe how this meal matches your records and preferences. They are not a nutrition or health score. Zero means that rule added no points.",
          "這些經驗規則點數描述這道餐點如何配對你的紀錄與偏好，不是營養或健康分數。零表示該規則沒有加減分。",
        )}
      </p>
      <ul className="contribution-list">
        {rec.scoreBreakdown.map((item) => {
          const direction =
            item.points < 0
              ? "negative"
              : item.points > 0
                ? "positive"
                : "neutral";
          const width = (Math.abs(item.points) / maxMagnitude) * 50;
          const points = `${item.points > 0 ? "+" : item.points < 0 ? "−" : ""}${format.format(Math.abs(item.points))}`;
          return (
            <li className={`contribution-row ${direction}`} key={item.category}>
              <div className="contribution-heading">
                <strong>
                  {text(locale, ...categoryLabels[item.category])}
                </strong>
                <span className="contribution-points">
                  {points} {text(locale, "pts", "點")}
                </span>
              </div>
              <div className="contribution-track" aria-hidden="true">
                <span className="contribution-zero" />
                <span
                  className={`contribution-bar ${direction}`}
                  style={{
                    width: `${width}%`,
                    left: `${item.points < 0 ? 50 - width : 50}%`,
                  }}
                />
              </div>
              <p className="contribution-note">{item.note}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

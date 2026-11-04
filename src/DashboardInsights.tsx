import { mealNames } from "./data";
import { isMealLogged } from "./logic";
import { label } from "./presentation";
import type { PilotRecommendation } from "./nutrition";
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

/** The numeric receipt uses only this recommendation's visible rule breakdown. */
export function ScoreContributions({ rec, locale }: ScoreContributionsProps) {
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
          "Product-rule points only, not a nutrition or health score. Zero means no adjustment.",
          "產品規則點數，不是營養或健康分數。零表示沒有加減分。",
        )}
      </p>
      <table className="numeric-receipt">
        <caption className="sr-only">
          {text(locale, "Matching rule points", "配對規則點數")}
        </caption>
        <thead>
          <tr>
            <th scope="col">{text(locale, "Rule", "規則")}</th>
            <th scope="col">{text(locale, "Points", "點數")}</th>
            <th scope="col">{text(locale, "Reason", "說明")}</th>
          </tr>
        </thead>
        <tbody>
          {rec.scoreBreakdown.map((item) => {
            const points = `${item.points > 0 ? "+" : item.points < 0 ? "−" : ""}${format.format(Math.abs(item.points))}`;
            return (
              <tr className="contribution-row" key={item.category}>
                <th scope="row">
                  {text(locale, ...categoryLabels[item.category])}
                </th>
                <td className="contribution-points">{points}</td>
                <td className="contribution-note">{item.note}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

type PilotScoreContributionsProps = { rec: PilotRecommendation; locale: Locale };

/** Practical points are the kernel's additive rules, separate from nutrient facts. */
export function PilotScoreContributions({ rec, locale }: PilotScoreContributionsProps) {
  const format = new Intl.NumberFormat(locale === "zh" ? "zh-TW" : "en-US", {
    maximumFractionDigits: 2,
  });

  return (
    <section
      className="score-contributions"
      aria-label={text(locale, "Practical matching rule contributions", "實用偏好的配對規則計分")}
    >
      <p className="contribution-explanation">
        {text(
          locale,
          "Product-rule points for practical preferences, not a nutrition or health score. Zero means no points from that rule.",
          "依實用偏好計算的產品規則點數，不是營養或健康分數。零表示此規則未加減分。",
        )}
      </p>
      <table className="numeric-receipt">
        <caption className="sr-only">
          {text(locale, "Practical preference points", "實用偏好點數")}
        </caption>
        <thead>
          <tr>
            <th scope="col">{text(locale, "Rule", "規則")}</th>
            <th scope="col">{text(locale, "Points", "點數")}</th>
            <th scope="col">{text(locale, "Reason", "說明")}</th>
          </tr>
        </thead>
        <tbody>
          {rec.trace.pointBreakdown.map((item) => (
            <tr className="contribution-row" key={item.key}>
              <th scope="row">{item.label}</th>
              <td className="contribution-points">
                {`${item.points > 0 ? "+" : item.points < 0 ? "−" : ""}${format.format(Math.abs(item.points))}`}
              </td>
              <td className="contribution-note">{item.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

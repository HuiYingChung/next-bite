import type { HistoryVarietyTrace } from "./history-variety";
import { label, translateFood } from "./presentation";
import type { Locale } from "./types";

export function HistoryBasis({ trace, locale }: { trace: HistoryVarietyTrace; locale: Locale }) {
  const { scope } = trace;
  const text = (en: string, zh: string) => locale === "en" ? en : zh;
  return <details className="history-basis">
    <summary>{text("Recent records", "近期紀錄")}{" · "}{text(
      `${scope.loggedDayCount} days, ${scope.loggedMealCount} meal slots`,
      `${scope.loggedDayCount} 天、${scope.loggedMealCount} 餐`,
    )}</summary>
    <p>{trace.reason}</p>
    <p className="small muted">{scope.windowStart} – {scope.windowEnd}{" · "}{text(
      `${scope.recognizedMealCount} recorded meal slots have recognized protein or staple identities. Missing records remain unknown.`,
      `${scope.recognizedMealCount} 餐有可辨識的蛋白質來源或主食。沒有記錄的部分仍是未知。`,
    )}</p>
    {trace.applied && trace.evidence.length > 0 && <ul className="history-evidence">
      {trace.evidence.map(record => <li key={`${record.date}-${record.mealName}`}>
        <span>{record.date} · {label(record.mealName, locale)}</span>
        <span>{record.foodNames.map(name => translateFood(name, locale)).join(text(", ", "、"))}</span>
      </li>)}
    </ul>}
  </details>;
}

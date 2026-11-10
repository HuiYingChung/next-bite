import { mealNames, toLocalDateId } from "./data";
import { getRecordedFoodIdentities, resolveFoodIdentity } from "./food-identity";
import { comparePreferenceTiers } from "./meal-context";
import type { PreferenceCandidate, VarietyDecision } from "./meal-context";
import type { DayHistory, Locale, MealEntry, MealName, ParsedMealComponent, TodayLog } from "./types";

export type HistoryVarietyScope = {
  windowStart: string;
  windowEnd: string;
  loggedDayCount: number;
  loggedMealCount: number;
  recognizedDayCount: number;
  recognizedMealCount: number;
};
export type HistoryVarietyRecord = {
  date: string;
  mealName: MealName;
  daysAgo: number;
  proteins: string[];
  staples: string[];
  foodNames: string[];
};
export type HistoryVarietyContext = { scope: HistoryVarietyScope; records: HistoryVarietyRecord[] };
export type HistoryVarietyTrace = {
  reason: string;
  scope: HistoryVarietyScope;
  applied: boolean;
  evidence: HistoryVarietyRecord[];
  recordMatches: string[];
  selectedMatches: string[];
  comparison: { candidateId: string; proteinMeals: number; stapleMeals: number; otherProteinMeals: number; otherStapleMeals: number } | null;
};

const hasNamedFood = (meal: MealEntry) =>
  [meal.protein, meal.vegetables, meal.carbs, meal.fruit, meal.soup, meal.drink].some(items => items.some(name => name.trim())) ||
  meal.componentDetails.some(item => item.name.trim() && !(item.group === "other" && /^(?:Mixed meal sources:|Mixed preparation:|Combined portions:)/i.test(item.name.trim())));

// Local calendar dates, not elapsed 24-hour periods: daylight-saving changes
// must not move a meal into or out of the seven-day window. Today is supplied
// once and overrides a stale copy in history, including a deliberately blank log.
export const buildHistoryVarietyContext = (history: DayHistory[], now: Date, todayLog?: TodayLog): HistoryVarietyContext => {
  const day = new Date(now);
  day.setHours(12, 0, 0, 0);
  const dates = Array.from({ length: 7 }, (_, daysAgo) => {
    const date = new Date(day);
    date.setDate(day.getDate() - daysAgo);
    return toLocalDateId(date);
  });
  const byDate = new Map(history.filter(item => dates.includes(item.date)).map(item => [item.date, item.todayLog]));
  if (todayLog) byDate.set(dates[0], todayLog);
  const loggedDays = new Set<string>(), recognizedDays = new Set<string>();
  let loggedMealCount = 0;
  const records: HistoryVarietyRecord[] = [];
  dates.forEach((date, daysAgo) => {
    const log = byDate.get(date);
    if (!log) return;
    for (const mealName of mealNames) {
      const meal = log[mealName];
      if (!meal || !hasNamedFood(meal)) continue;
      loggedDays.add(date);
      loggedMealCount++;
      // Sets deduplicate aliases, source selections and repeated components
      // inside one meal. Quantities never become repetition multipliers.
      const identities = getRecordedFoodIdentities([meal]);
      if (!identities.proteins.size && !identities.staples.size) continue;
      recognizedDays.add(date);
      const names: Array<Pick<ParsedMealComponent, "name" | "group" | "sourceFoodId" | "foodLibraryId">> = [...meal.protein.map(name => ({ name, group: "protein" as const })), ...meal.carbs.map(name => ({ name, group: "carb" as const })),
        ...meal.componentDetails.filter(item => item.group === "protein" || item.group === "carb")];
      const namedIdentities = new Map<string, string>();
      for (const item of names) {
        const identity = resolveFoodIdentity(item.name, item.sourceFoodId, item.foodLibraryId, item.group);
        const key = item.group === "protein" ? identity.protein : identity.staple;
        if (key) namedIdentities.set(`${item.group}:${key}`, item.name);
      }
      records.push({ date, mealName, daysAgo, proteins: [...identities.proteins].sort(), staples: [...identities.staples].sort(), foodNames: [...new Set(namedIdentities.values())] });
    }
  });
  return { scope: { windowStart: dates[6], windowEnd: dates[0], loggedDayCount: loggedDays.size, loggedMealCount,
    recognizedDayCount: recognizedDays.size, recognizedMealCount: records.length }, records };
};

const recordOverlap = <T>(item: PreferenceCandidate<T>, record: HistoryVarietyRecord) => ({
  protein: item.proteins.some(protein => record.proteins.includes(protein)),
  staple: Boolean(item.staple && record.staples.includes(item.staple)),
});
const historyTier = <T>(item: PreferenceCandidate<T>, records: HistoryVarietyRecord[]) => {
  const protein = records.filter(record => recordOverlap(item, record).protein);
  const staple = records.filter(record => recordOverlap(item, record).staple);
  return [protein.length, staple.length,
    protein.length ? 7 - Math.min(...protein.map(record => record.daysAgo)) : 0,
    staple.length ? 7 - Math.min(...staple.map(record => record.daysAgo)) : 0];
};
type HistoryChoice<T> = VarietyDecision<T> & {
  historyTier: number[];
  historyComparison: (PreferenceCandidate<T> & { historyTier: number[] }) | null;
  equalTierCount: number;
  evidence: HistoryVarietyRecord[];
};

// A product variety rule, not a nutrient rule: compare repeat meal counts,
// then recency, only after every score/preference tier is exactly equal.
// Optional rotation lets equal options take turns without randomness: a key
// orders what is still tied before the stable ID. Options are then shown in
// groups, so variety is judged within each group on one visible trait. Judging
// protein and staple together kept choosing the few recipes that share neither.
export type RotationOptions = { key: (id: string) => number; groupSize: number; varyBy: "staple" | "protein" };
export const pickHistoryVariedChoices = <T>(candidates: PreferenceCandidate<T>[], history: HistoryVarietyContext, limit = 3, rotation?: RotationOptions): HistoryChoice<T>[] => {
  const remaining = candidates.map(item => ({ ...item, historyTier: historyTier(item, history.records), rotationKey: rotation ? rotation.key(item.id) : 0 }));
  const selected: HistoryChoice<T>[] = [], selectedProteins = new Set<string>(), selectedStaples = new Set<string>();
  const overlap = (item: PreferenceCandidate<T>) => {
    const proteins = item.proteins.filter(protein => selectedProteins.has(protein)).length;
    const staple = item.staple && selectedStaples.has(item.staple) ? 1 : 0;
    return !rotation ? [proteins, staple] : rotation.varyBy === "staple" ? [staple] : [proteins ? 1 : 0];
  };
  while (remaining.length && selected.length < limit) {
    if (rotation && selected.length % rotation.groupSize === 0) { selectedProteins.clear(); selectedStaples.clear(); }
    remaining.sort((a, b) => comparePreferenceTiers(a.tier, b.tier) || comparePreferenceTiers(a.historyTier, b.historyTier) || comparePreferenceTiers(overlap(a), overlap(b)) || a.rotationKey - b.rotationKey || a.id.localeCompare(b.id, "en"));
    const next = remaining.shift()!;
    const equals = remaining.filter(item => comparePreferenceTiers(next.tier, item.tier) === 0);
    const comparison = equals.find(item => comparePreferenceTiers(next.historyTier, item.historyTier) < 0) ?? null;
    const evidence = comparison ? history.records.filter(record => {
      const ours = recordOverlap(next, record), theirs = recordOverlap(comparison, record);
      return ours.protein || ours.staple || theirs.protein || theirs.staple;
    }) : [];
    const records = history.records.filter(record => { const match = recordOverlap(next, record); return match.protein || match.staple; });
    const recordMatches = [...new Set(records.flatMap(record => [
      ...next.proteins.filter(protein => record.proteins.includes(protein)).map(protein => `protein:${protein}`),
      ...(next.staple && record.staples.includes(next.staple) ? [`staple:${next.staple}`] : []),
    ]))];
    const selectedMatches = [...next.proteins.filter(protein => selectedProteins.has(protein)).map(protein => `protein:${protein}`),
      ...(next.staple && selectedStaples.has(next.staple) ? [`staple:${next.staple}`] : [])];
    selected.push({ ...next, recordMatches, selectedMatches, recordContextPresent: history.records.length > 0, earlierChoices: selected.length,
      historyComparison: comparison, equalTierCount: equals.length, evidence });
    next.proteins.forEach(protein => selectedProteins.add(protein));
    if (next.staple) selectedStaples.add(next.staple);
  }
  return selected;
};

export const describeHistoryVariety = <T>(choice: HistoryChoice<T>, scope: HistoryVarietyScope, locale: Locale, kind: "recipe" | "idea", title: (value: T) => string): HistoryVarietyTrace => {
  const text = (en: string, zh: string) => locale === "en" ? en : zh;
  const other = choice.historyComparison;
  const boundary = kind === "recipe" ? text("History only separates recipes with equal current preferences, saved preferences and nutrition level.", "只有本餐偏好、已儲存偏好及營養級別三項完全相同時，才參考歷史紀錄。") : text("History only separates equally preferred ideas.", "只有同樣符合偏好的靈感才參考歷史紀錄。");
  let explanation: string;
  if (other) {
    const countsDiffer = choice.historyTier[0] !== other.historyTier[0] || choice.historyTier[1] !== other.historyTier[1];
    explanation = countsDiffer
      ? text(`This option repeats protein sources in ${choice.historyTier[0]} recorded meals and staples in ${choice.historyTier[1]}; “${title(other.value)}” repeats them in ${other.historyTier[0]} and ${other.historyTier[1]}. Fewer protein repeats are compared first, then staple repeats.`,
        `此選項的蛋白質來源與 ${choice.historyTier[0]} 餐紀錄重複，主食與 ${choice.historyTier[1]} 餐重複；「${title(other.value)}」分別與 ${other.historyTier[0]}、${other.historyTier[1]} 餐重複。先比較蛋白質來源重複餐數，再比較主食。`)
      : text(`Repeat counts are equal to “${title(other.value)}”, but this option's matching foods were recorded less recently.`, `重複餐數與「${title(other.value)}」相同，但此選項相符食材的最近紀錄較早。`);
  } else if (!choice.recordContextPresent) {
    explanation = text("No recognized protein or staple records are available in this seven-day window; history did not change this choice.", "這七天沒有可辨識的蛋白質來源或主食紀錄；歷史紀錄未影響此選項。");
  } else if (!choice.equalTierCount) {
    explanation = text("No equal-ranked alternative remained at this position; history did not decide this choice.", "此順位沒有剩餘的同分或同偏好選項；歷史紀錄未決定此選項。");
  } else {
    explanation = kind === "recipe"
      ? text("The remaining equal-ranked options have equal history matches; options shown together differ in staple (or in main protein once a staple is selected) where possible, then this date and meal window's rotation resolves the tie.", "剩餘同級選項的歷史符合程度相同；同一組選項盡量讓主食不同（已選主食時改為主要蛋白質來源不同），再依此日期與餐別時段的輪替順序決定。")
      : text("The remaining equal-ranked options have equal history matches; other-option variety and stable IDs resolve the tie.", "剩餘同分或同偏好選項的歷史符合程度相同；依其他選項的食材變化與固定代碼決定。");
  }
  const reason = `${boundary} ${explanation} ${text("Records do not change calculated nutrition or establish a deficit.", "紀錄不會改變配方營養計算，也不代表營養缺口。")}`;
  return { reason, scope, applied: Boolean(other), evidence: choice.evidence, recordMatches: choice.recordMatches, selectedMatches: choice.selectedMatches,
    comparison: other ? { candidateId: other.id, proteinMeals: choice.historyTier[0], stapleMeals: choice.historyTier[1], otherProteinMeals: other.historyTier[0], otherStapleMeals: other.historyTier[1] } : null };
};

import { useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import { calculateFoodLibraryScore, getFoodLibraryScoreStatus, loadFoodLibrary, searchFoodLibrary } from "./food-library";
import type { FoodLibraryIndex, FoodLibraryRecord, FoodLibraryScore } from "./food-library";
import { getNpm2018Band } from "./nutrient-profile";
import type { NutrientProfileKey } from "./nutrient-profile";
import type { MealContext } from "./meal-context";
import type { Locale, Profile } from "./types";
import "./food-library.css";

const t = (locale: Locale, en: string, zh: string) => locale === "zh" ? zh : en;
const PAGE_SIZE = 12;

export const foodLibraryName = (food: FoodLibraryRecord, locale: Locale) => food.names[locale] || food.names.en || food.names.zh;
export const foodLibraryNumber = (value: number | null | undefined, locale: Locale, digits = 1) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat(locale === "zh" ? "zh-TW" : "en-US", { maximumFractionDigits: digits }).format(value)
    : t(locale, "Unavailable", "資料不足");

export function useFoodLibrary(enabled = true) {
  const [index, setIndex] = useState<FoodLibraryIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setFailed(false);
    loadFoodLibrary().then(result => { if (active) setIndex(result); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [enabled, attempt]);
  return { index, failed, retry: () => setAttempt(value => value + 1) };
}

const kindLabel = (kind: FoodLibraryRecord["kind"], locale: Locale) => ({
  food: t(locale, "Food", "食物"), drink: t(locale, "Drink", "飲料"),
  alcohol: t(locale, "Alcohol", "酒類"), unknown: t(locale, "Type not confirmed", "類型未確認"),
})[kind];

export function FoodRecordMeta({ food, locale }: { food: FoodLibraryRecord; locale: Locale }) {
  const states: Record<string, string> = {
    raw: t(locale, "Raw", "生鮮"), cooked: t(locale, "Cooked", "熟食"),
    "ready-to-eat": t(locale, "Ready to eat", "即食"),
  };
  const sampleState = food.state?.match(/^樣品狀態\s*[:：]\s*(生|熟)(?=[,，;；(（\s]|$)/)?.[1];
  const compactState = food.state && states[food.state] || (sampleState === "生" ? states.raw : sampleState === "熟" ? states.cooked : "");
  const sourceLabel = food.id.startsWith("tfda-") ? "TFDA" : food.id.startsWith("usda-fndds-") ? "USDA FNDDS" : food.id.startsWith("usda-sr-") ? "USDA SR" : food.sourceId;
  return <p className="food-record-meta">{kindLabel(food.kind, locale)}{compactState ? ` · ${compactState}` : ""} · {sourceLabel} {food.sourceRecordId}</p>;
}

type FoodRecordProps = { food: FoodLibraryRecord; profile: Profile; context: MealContext; locale: Locale };

/** Values and contributions come from the shared engine; this component only formats them. */
export function FoodRecordScores({ food, profile, context, locale }: FoodRecordProps) {
  const score = calculateFoodLibraryScore(food, profile, context, locale);
  if (score.status === "out-of-scope") return <p className="food-record-note">{t(locale, "Outside model scope · no scores assigned", "不在模型適用範圍 · 不提供分數")}</p>;
  return <dl className="food-score-values" aria-label={t(locale, "Scores per 100 g", "每 100 克分數")}>
    <div><dt>{t(locale, "Nutrient", "營養項")}</dt><dd>{foodLibraryNumber(score.nutrient, locale)}</dd></div>
    <div><dt>{t(locale, "Energy", "熱量項")}</dt><dd>{foodLibraryNumber(score.energy, locale)}</dd></div>
    <div><dt>{t(locale, "Preference", "偏好項")}</dt><dd>{foodLibraryNumber(score.preference, locale)}</dd></div>
    <div className="food-total"><dt>{t(locale, "Total", "總分")}</dt><dd>{foodLibraryNumber(score.total, locale)}</dd></div>
  </dl>;
}

export function FoodRecordDetails({ food, profile, context, locale }: FoodRecordProps) {
  const score = calculateFoodLibraryScore(food, profile, context, locale);
  const model = score.model;
  const n = (value: number | null | undefined, digits = 2) => foodLibraryNumber(value, locale, digits);
  const modelRows: { key: NutrientProfileKey; en: string; zh: string; unit: string; points: number | null }[] = model ? [
    { key: "energyKj", en: "Energy · A", zh: "能量 · A", unit: "kJ", points: model.points.a.energy },
    { key: "saturatedFat", en: "Saturated fat · A", zh: "飽和脂肪 · A", unit: "g", points: model.points.a.saturatedFat },
    { key: "freeSugars", en: "Free sugars · A", zh: "游離糖 · A", unit: "g", points: model.points.a.freeSugars },
    { key: "salt", en: "Salt · A", zh: "鹽 · A", unit: "g", points: model.points.a.salt },
    { key: "protein", en: "Protein · C", zh: "蛋白質 · C", unit: "g", points: model.points.c.protein },
    { key: "fiber", en: "Fibre · C", zh: "膳食纖維 · C", unit: "g", points: model.points.c.fiber },
    { key: "fvnsPercent", en: "Fruit, vegetables, nuts & seeds · C", zh: "水果、蔬菜、堅果與種子 · C", unit: "%", points: model.points.c.fvns },
  ] : [];
  const missingLabels: Record<string, string> = {
    energyKj: t(locale, "Energy", "能量"), saturatedFat: t(locale, "Saturated fat", "飽和脂肪"),
    freeSugars: t(locale, "Free sugars", "游離糖"), salt: t(locale, "Salt", "鹽"),
    protein: t(locale, "Protein", "蛋白質"), fiber: t(locale, "Fibre", "膳食纖維"),
    fvnsPercent: t(locale, "Fruit, vegetable, nut and seed percentage", "水果、蔬菜、堅果與種子比例"),
    fiberMethod: t(locale, "Compatible fibre measurement method", "相容的膳食纖維測量方法"),
  };
  const nutrients = [
    ["kcal", "Energy", "熱量", "kcal"], ["protein", "Protein", "蛋白質", "g"],
    ["carbs", "Carbohydrate", "碳水化合物", "g"], ["fat", "Total fat", "總脂肪", "g"],
    ["saturatedFat", "Saturated fat", "飽和脂肪", "g"], ["fiber", "Fibre", "膳食纖維", "g"],
    ["sodium", "Sodium", "鈉", "mg"], ["totalSugars", "Total sugars", "總糖", "g"],
    ["addedSugar", "Added sugars", "添加糖", "g"],
  ] as const;
  const modelBand = (key: NutrientProfileKey, value: number | null, unit: string) => {
    const band = getNpm2018Band(key, value);
    if (band.points === null) return n(null);
    if (band.lowerExclusive === null) return `≤ ${n(band.upperInclusive)} ${unit}`;
    if (band.upperInclusive === null) return `> ${n(band.lowerExclusive)} ${unit}`;
    return `> ${n(band.lowerExclusive)} – ≤ ${n(band.upperInclusive)} ${unit}`;
  };
  return <details className="food-record-details">
    <summary>{t(locale, "Nutrition, scoring & source", "營養、計分與來源")}</summary>
    <p className="food-record-note">{score.note}</p>
    {score.missing.length > 0 && <p className="food-record-missing">{t(locale, "Missing for a complete score", "完整計分仍缺少")}: {score.missing.map(key => missingLabels[key] ?? key).join(t(locale, ", ", "、"))}{t(locale, ".", "。")}</p>}
    <dl className="food-nutrient-values">{nutrients.map(([key, en, zh, unit]) => <div key={key}>
      <dt>{t(locale, en, zh)}</dt><dd>{food.nutrientsPer100g[key] === null ? t(locale, "Unknown", "未知") : `${n(food.nutrientsPer100g[key])} ${unit}`}</dd>
    </div>)}</dl>
    <p className="food-record-note">{t(locale, "All values are per 100 g of the source food, including drinks. Unknown values are not zero; these are not the nutrients in a logged meal.", "以上皆為來源食物每 100 克的數值，飲料也以重量計算。未知不等於零；這不是已記錄餐點的攝取量。")}</p>
    {model && <details className="food-calculation">
      <summary>{t(locale, "Show calculation", "展開計算明細")}</summary>
      <p>{t(locale, "Nutrient = credited C − saturated-fat A − free-sugars A − salt A. Energy = 10 − energy A. Total = nutrient + energy + preference.", "營養項＝可計入 C 分－飽和脂肪 A 分－游離糖 A 分－鹽 A 分；熱量項＝10－能量 A 分；總分＝營養項＋熱量項＋偏好項。")}</p>
      <p>{t(locale, "NextBite custom combination; 10 is a shared display offset. The model uses kJ per 100 g (1 kcal = 4.184 kJ).", "此組合為 NextBite 自訂；固定 10 分為所有項目共用的顯示位移。模型使用每 100 克的 kJ（1 kcal＝4.184 kJ）。")}</p>
      <div className="food-table-scroll" role="region" tabIndex={0} aria-label={t(locale, "Food scoring calculation, scroll horizontally", "食物計分表，可左右捲動")}>
        <table className="food-model-table">
          <caption>{t(locale, "UK NPM 2018 · per 100 g", "英國 NPM 2018 · 每 100 克")}</caption>
          <thead><tr><th scope="col">{t(locale, "Component", "項目")}</th><th scope="col">{t(locale, "Input", "輸入值")}</th><th scope="col">{t(locale, "Band", "門檻")}</th><th scope="col">{t(locale, "Points", "分數")}</th></tr></thead>
          <tbody>{modelRows.map(row => <tr key={row.key}><th scope="row">{t(locale, row.en, row.zh)}</th><td>{model.inputs[row.key] === null ? n(null) : `≈ ${n(model.inputs[row.key])} ${row.unit}`}</td><td>{modelBand(row.key, model.inputs[row.key], row.unit)}</td><td>{n(row.points)}</td></tr>)}</tbody>
        </table>
      </div>
      <p>{t(locale, `Credited protein points: ${n(model.creditedProteinPoints)}. Protein counts only when A is below 11, or fruit/vegetable/nut/seed points equal 5. Bands use unrounded inputs.`, `可計入蛋白質分數：${n(model.creditedProteinPoints)}。A 分低於 11，或水果／蔬菜／堅果／種子取得 5 分時，才計入蛋白質分數。門檻使用未取整的數值。`)}</p>
      <p>{t(locale, "Published-model raw result (lower is better)", "公開模型原始分數（較低較佳）")}: {n(model.rawScore)}</p>
      <a href={model.sourceUrl} target="_blank" rel="noreferrer">{t(locale, "Official model rules", "模型官方規則")}</a>
    </details>}
    {score.preferenceRows.length > 0 && <details className="food-calculation">
      <summary>{t(locale, "Preference calculation", "偏好計分明細")}</summary>
      <ul className="food-preference-list">{score.preferenceRows.map(row => <li key={row.key}><div><strong>{row.label}</strong><span>{n(row.points)}</span></div><p>{row.note}</p></li>)}</ul>
    </details>}
    <div className="food-source-detail">
      <p><strong>{t(locale, "Source record", "來源紀錄")}</strong>: {food.names.en}{food.names.zh && food.names.zh !== food.names.en ? ` / ${food.names.zh}` : ""}</p>
      {food.state && <p><strong>{t(locale, "Source preparation / sample description", "來源處理方式／樣品描述")}</strong>: {food.state}</p>}
      <p>{food.modelBasis.notes[locale]}</p>
      <a href={food.sourceUrl} target="_blank" rel="noreferrer">{t(locale, "View source", "查看來源")} · {food.sourceRecordId}</a>
      {food.modelBasis.sourceUrls.filter(url => url !== food.sourceUrl && url !== model?.sourceUrl).map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">{t(locale, `Input derivation reference ${index + 1}`, `輸入值推導依據 ${index + 1}`)}</a>)}
    </div>
  </details>;
}

export function FoodLibrary({ profile, context, locale }: { profile: Profile; context: MealContext; locale: Locale }) {
  const { index, failed, retry } = useFoodLibrary();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [kind, setKind] = useState<FoodLibraryRecord["kind"] | "all">("all");
  const [availability, setAvailability] = useState<FoodLibraryScore["status"] | "all">("all");
  const [page, setPage] = useState(0);
  const searchId = useId();
  const coverage = useMemo(() => {
    const byId = new Map<string, FoodLibraryScore["status"]>();
    const counts = { complete: 0, incomplete: 0, "out-of-scope": 0 };
    for (const food of index?.data.records ?? []) {
      const status = getFoodLibraryScoreStatus(food);
      byId.set(food.id, status);
      counts[status]++;
    }
    return { byId, counts };
  }, [index]);
  const results = useMemo(() => index ? searchFoodLibrary(index, deferredQuery, { locale, limit: index.data.records.length, ...(kind === "all" ? {} : { kind }) }).filter(food => availability === "all" || coverage.byId.get(food.id) === availability) : [], [index, deferredQuery, kind, locale, availability, coverage]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(results.length / PAGE_SIZE) - 1));
  const visible = results.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const changeQuery = (value: string) => { setQuery(value); setPage(0); };
  return <section className="food-library" aria-labelledby={`${searchId}-heading`}>
    <div className="food-library-heading"><h2 id={`${searchId}-heading`}>{t(locale, "Food & drink data", "食材與飲料資料")}</h2><p>{t(locale, "Search source foods, compare their composition and inspect each score.", "搜尋來源食物、比較營養組成，並查看每項分數的依據。")}</p></div>
    <div className="food-library-controls">
      <label htmlFor={searchId}>{t(locale, "Search food or drink", "搜尋食材或飲料")}<input id={searchId} type="search" value={query} placeholder={t(locale, "Beef, shrimp, tea…", "牛肉、蝦子、茶…")} onChange={event => changeQuery(event.target.value)} /></label>
      <label>{t(locale, "Type", "類型")}<select value={kind} onChange={event => { setKind(event.target.value as typeof kind); setPage(0); }}><option value="all">{t(locale, "All types", "全部類型")}</option>{(["food", "drink", "alcohol", "unknown"] as const).map(value => <option value={value} key={value}>{kindLabel(value, locale)}</option>)}</select></label>
      <label>{t(locale, "Scoring availability", "計分狀態")}<select value={availability} onChange={event => { setAvailability(event.target.value as typeof availability); setPage(0); }}><option value="all">{t(locale, "All records", "全部紀錄")}</option><option value="complete">{t(locale, "Complete scores", "可完整計分")}</option><option value="incomplete">{t(locale, "Incomplete data", "資料不足")}</option><option value="out-of-scope">{t(locale, "Outside model scope", "模型不適用")}</option></select></label>
    </div>
    {failed ? <div role="status" className="food-library-status"><p>{t(locale, "Food data could not load. Your meal records are unchanged.", "食物資料載入失敗；已保存的餐點紀錄不受影響。")}</p><button type="button" className="secondary-button" onClick={retry}>{t(locale, "Retry", "重試")}</button></div> : !index ? <p role="status" className="food-library-status">{t(locale, "Loading food data…", "正在載入食物資料…")}</p> : <>
      <p className="food-library-count" role="status">{t(locale, `${results.length.toLocaleString("en-US")} matching source records · ${index.data.records.length.toLocaleString("en-US")} in this version`, `符合 ${results.length.toLocaleString("zh-TW")} 筆來源紀錄 · 此版本共 ${index.data.records.length.toLocaleString("zh-TW")} 筆`)}{deferredQuery !== query ? t(locale, " · Updating…", " · 更新中…") : ""}</p>
      <p className="food-library-scope">{t(locale, "Per 100 g · preparation variants are separate records. Scores describe the selected source food, not a complete meal or your personal needs. Missing required data means no total.", "以每 100 克比較；不同處理方式分列為來源紀錄。分數描述來源食物，不代表完整一餐或個人需求；必要資料不足時不提供總分。")}</p>
      {visible.length === 0 ? <p className="food-library-status">{t(locale, "No matching source record. Try a simpler name or another language. An unlisted food can still be saved in your meal record.", "找不到符合的來源紀錄。可以改用較簡單的名稱或另一種語言；未收錄的食物仍可保存到餐點紀錄。")}</p> : <ul className="food-library-results">{visible.map(food => <li key={food.id} className="food-library-item"><div className="food-record-heading"><h3>{foodLibraryName(food, locale)}</h3><FoodRecordMeta food={food} locale={locale} /></div><FoodRecordScores food={food} profile={profile} context={context} locale={locale} /><FoodRecordDetails food={food} profile={profile} context={context} locale={locale} /></li>)}</ul>}
      {results.length > PAGE_SIZE && <nav className="food-library-pagination" aria-label={t(locale, "Food data pages", "食物資料分頁")}><button type="button" className="secondary-button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{t(locale, "Previous", "上一頁")}</button><span>{currentPage + 1} / {Math.ceil(results.length / PAGE_SIZE)}</span><button type="button" className="secondary-button" disabled={(currentPage + 1) * PAGE_SIZE >= results.length} onClick={() => setPage(currentPage + 1)}>{t(locale, "Next", "下一頁")}</button></nav>}
      <details className="food-library-sources"><summary>{t(locale, "Catalog sources & coverage", "詞庫來源與收錄範圍")}</summary><p>{t(locale, `This version: ${coverage.counts.complete.toLocaleString("en-US")} records with complete scores; ${coverage.counts.incomplete.toLocaleString("en-US")} with incomplete model data; ${coverage.counts["out-of-scope"].toLocaleString("en-US")} outside model scope.`, `此版本：${coverage.counts.complete.toLocaleString("zh-TW")} 筆可完整計分；${coverage.counts.incomplete.toLocaleString("zh-TW")} 筆模型資料不足；${coverage.counts["out-of-scope"].toLocaleString("zh-TW")} 筆不適用模型。`)}</p><p>{t(locale, "A record count is not a count of distinct ingredients. Different cuts, cooking methods and source datasets remain separate; coverage is limited to this published version.", "紀錄筆數不等於不同食材的數量。部位、烹調方式及資料來源分開保留；辨識範圍以此版本收錄內容為限。")}</p><ul>{index.data.sources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.provider} · {source.dataset}</a><span>{source.release} · {t(locale, "Retrieved", "擷取日期")} {source.retrievedAt}</span><a href={source.licenseUrl} target="_blank" rel="noreferrer">{source.license}</a></li>)}</ul></details>
    </>}
  </section>;
}

import { useDeferredValue, useId, useMemo, useState } from "react";
import { identifyFood, isLibrarySelectionValid, searchFoodLibrary } from "./food-library";
import type { FoodLibraryRecord } from "./food-library";
import { FoodRecordDetails, FoodRecordMeta, FoodRecordScores, foodLibraryName, foodLibraryNumber, useFoodLibrary } from "./FoodLibrary";
import type { MealContext } from "./meal-context";
import type { Locale, ParsedMealComponent, Profile } from "./types";

const t = (locale: Locale, en: string, zh: string) => locale === "zh" ? zh : en;

export type FoodRecognitionProps = {
  name: string;
  group: ParsedMealComponent["group"];
  foodLibraryId?: string;
  locale: Locale;
  profile: Profile;
  context: MealContext;
  /** Only an explicit user selection calls this; matching a name never changes a record. */
  onSelect?: (record: FoodLibraryRecord | null) => void;
};

export function FoodRecognition({ name, group, foodLibraryId, locale, profile, context, onSelect }: FoodRecognitionProps) {
  const { index, failed, retry } = useFoodLibrary(Boolean(name.trim()));
  const [search, setSearch] = useState({ forName: name, value: name });
  const [previewId, setPreviewId] = useState<string | null>(null);
  const query = search.forName === name ? search.value : name;
  const deferredQuery = useDeferredValue(query);
  const inputId = useId();
  const candidates = useMemo(() => index ? searchFoodLibrary(index, deferredQuery, { locale, limit: 8 }) : [], [index, deferredQuery, locale]);
  if (!name.trim()) return null;
  if (failed) return <div className="food-recognition"><p role="status">{t(locale, "Food recognition could not load. Your text can still be saved.", "食物辨識資料載入失敗；仍可保存原文。")}</p><button type="button" className="text-button" onClick={retry}>{t(locale, "Retry recognition", "重試辨識")}</button></div>;
  if (!index) return <p className="food-recognition-loading" role="status">{t(locale, "Checking food names…", "正在核對食物名稱…")}</p>;

  const selected = foodLibraryId && isLibrarySelectionValid(index, foodLibraryId, name, group) ? index.recordsById.get(foodLibraryId)! : null;
  const identity = identifyFood(index, name);
  const preview = previewId ? candidates.find(food => food.id === previewId) : null;
  const identityName = identity.concept ? identity.concept.names[locale] || identity.concept.names.en : identity.record ? foodLibraryName(identity.record, locale) : "";
  const status = selected
    ? t(locale, "Source record confirmed", "已確認來源紀錄")
    : foodLibraryId
      ? t(locale, "Previous source no longer matches this name and group. Choose again to link source data.", "先前來源已不符合目前名稱與分類，請重新選擇後再連結資料。")
      : identity.status === "concept"
        ? t(locale, `Recognized: ${identityName}. Preparation and nutrient record are not yet selected.`, `已辨識：${identityName}。尚未選定處理方式與營養來源紀錄。`)
        : identity.status === "record"
          ? t(locale, "A matching source name was found. Confirm the source if it describes what you ate.", "找到相符來源名稱；請確認來源是否符合你吃的食物。")
          : identity.status === "ambiguous"
            ? t(locale, "Several foods use this name. Choose a source or keep the original text.", "此名稱有多個可能的食物，可選擇來源或只保留原文。")
            : t(locale, "Name not recognized yet. You can keep the original text or search source records.", "目前尚未辨識此名稱。可以保留原文，或搜尋來源紀錄。");

  return <div className="food-recognition">
    <p className="food-recognition-status" role="status">{status}</p>
    {selected ? <div className="food-recognition-selected">
      <p><strong>{foodLibraryName(selected, locale)}</strong></p>
      <FoodRecordMeta food={selected} locale={locale} />
      <FoodRecordScores food={selected} profile={profile} context={context} locale={locale} />
      <p className="food-record-note">{t(locale, "Per 100 g of this source record; this does not calculate your intake or verify ingredient avoids.", "依此來源每 100 克計算；這不代表實際攝取量，也不代表已確認避開的成分。")}</p>
      <FoodRecordDetails food={selected} profile={profile} context={context} locale={locale} />
      {onSelect && <button type="button" className="text-button" onClick={() => onSelect(null)}>{t(locale, "Remove source link", "移除來源連結")}</button>}
    </div> : <details className="food-recognition-search">
      <summary>{t(locale, "Find a source & inspect scores", "尋找來源並查看分數")}</summary>
      <label htmlFor={inputId}>{t(locale, "Food name or preparation", "食物名稱或處理方式")}<input id={inputId} type="search" value={query} onChange={event => { setSearch({ forName: name, value: event.target.value }); setPreviewId(null); }} /></label>
      <p className="food-record-note">{t(locale, "Choose only a matching food and preparation. Selection uses the source name and food group; keeping your text without a source is also fine.", "請選擇符合的食物與處理方式。選取後會使用來源名稱與分類；也可以只保留原文，不指定來源。")}</p>
      {candidates.length > 0 ? <ul className="food-recognition-candidates">{candidates.map(food => <li key={food.id}>
        <div><strong>{foodLibraryName(food, locale)}</strong><FoodRecordMeta food={food} locale={locale} /><p className="food-record-meta">{food.nutrientsPer100g.kcal === null ? t(locale, "Energy unknown", "熱量未知") : `${foodLibraryNumber(food.nutrientsPer100g.kcal, locale)} kcal`} / 100 g</p></div>
        <div className="food-candidate-actions"><button type="button" className="text-button" aria-expanded={preview?.id === food.id} onClick={() => setPreviewId(preview?.id === food.id ? null : food.id)}>{t(locale, "Inspect", "查看分數")}<span className="sr-only"> — {foodLibraryName(food, locale)}</span></button>{onSelect && <button type="button" className="secondary-button" onClick={() => onSelect(food)}>{t(locale, "Use source", "選用來源")}<span className="sr-only"> — {foodLibraryName(food, locale)}</span></button>}</div>
        {preview?.id === food.id && <div className="food-candidate-preview"><FoodRecordScores food={food} profile={profile} context={context} locale={locale} /><FoodRecordDetails food={food} profile={profile} context={context} locale={locale} /></div>}
      </li>)}</ul> : <p className="food-library-status">{t(locale, "No matching source. Your text can still be saved.", "找不到相符來源，仍可保存原文。")}</p>}
      {candidates.length === 8 && <p className="food-record-note">{t(locale, "Showing up to 8 matches. Add a cut, cooking method or more specific name to narrow the list.", "先顯示 8 筆結果，可加入部位、烹調方式或更精確的名稱來縮小範圍。")}</p>}
    </details>}
  </div>;
}

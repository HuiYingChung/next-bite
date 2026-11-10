import { getNpm2018Band } from "./nutrient-profile";
import { HistoryBasis } from "./HistoryBasis";
import { label } from "./presentation";
import type { PilotRecommendation } from "./nutrition";
import type { Locale } from "./types";

type RecommendationScoreProps = { rec: PilotRecommendation; locale: Locale };
const text = (locale: Locale, en: string, zh: string) => locale === "en" ? en : zh;

/** Preserves the complete calculation receipt behind a native disclosure. */
export function RecommendationScore({ rec, locale }: RecommendationScoreProps) {
  const score = rec.score;
  const unknown = text(locale, "Unavailable", "無法計分");
  const number = (value: number | null | undefined, signed = false, precision = 2) => {
    if (value === null || value === undefined || !Number.isFinite(value)) return unknown;
    const formatted = new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-TW", {
      maximumFractionDigits: precision,
    }).format(Math.abs(value));
    return `${value < 0 ? "−" : signed && value > 0 ? "+" : ""}${formatted}`;
  };
  if (!score) return <details className="recommendation-score score-receipt">
    <summary>{text(locale, "Match & nutrition details", "配對與營養計算明細")}</summary>
    <h4>{text(locale, "Nutrition reference", "營養參考值")}</h4>
    <p className="score-unavailable">{unknown}</p>
  </details>;

  const model = score.model;
  const complete = model.status === "complete" &&
    [score.nutrient, score.energy, score.preference, score.nutritionReference].every(Number.isFinite);
  const inputNotes = new Map<string, string[]>();
  for (const input of score.inputBasis) {
    const group = inputNotes.get(input.note) ?? [];
    group.push(input.label);
    inputNotes.set(input.note, group);
  }
  const sourceUrls = [...new Set([model.sourceUrl, ...score.basis.sourceUrls, ...score.inputBasis.flatMap(input => input.sourceUrls)])];
  const sourceTitle = (url: string) => {
    if (url === model.sourceUrl) return text(locale, "UK NPM 2018 technical guidance", "英國 NPM 2018 技術指引");
    if (url.includes("fruit-vegetables-nuts-and-seeds-definitions")) return text(locale, "NPM fruit, vegetables, nuts & seeds definitions", "模型蔬果、堅果與種子定義");
    const fdcId = url.match(/\/food-details\/(\d+)\/nutrients/)?.[1];
    if (fdcId) {
      const food = rec.ingredientAmounts.find(ingredient => ingredient.food?.recordUrl === url)?.food;
      return `USDA FDC ${fdcId}${food ? ` · ${food.label[locale]}` : ""}`;
    }
    if (/ars\.usda\.gov.*FIBER/i.test(url)) return text(locale, "USDA dietary-fibre method comparison", "USDA 膳食纖維方法比較");
    return url;
  };
  const preferenceValue = (value: string) => {
    const values: Record<string, [string, string]> = {
      rice: ["Rice", "飯類"], noodles: ["Noodles", "麵類"], bread: ["Bread or wraps", "麵包／捲餅"], potato: ["Potato or sweet potato", "馬鈴薯／地瓜"], other: ["Other grains", "其他穀物"], none: ["No staple", "無主食"],
      poultry: ["Chicken or turkey", "雞肉或火雞"], egg: ["Egg", "蛋"], seafood: ["Fish or seafood", "魚或海鮮"], beans: ["Beans or soy", "豆類或黃豆"], "red-meat": ["Beef, pork or lamb", "牛、豬或羊"], dairy: ["Dairy", "乳製品"],
      asian: ["Asian-style", "亞洲風味"], western: ["Western-style", "西式風味"], "less-added-oil": ["Less added oil", "較少添加油"], "less-effort": ["Less effort to prepare", "較省準備力氣"],
      "High-protein": ["More protein", "較多蛋白質"], "Vegetable-forward": ["More vegetables & beans", "較多蔬菜與豆類"],
    };
    return values[value] ? text(locale, ...values[value]) : label(value, locale);
  };
  const valueList = (values: string[]) => values.length ? values.map(preferenceValue).join(text(locale, ", ", "、")) : text(locale, "None", "無");
  const scopeLabel = (scope: "current" | "saved" | "inactive") => scope === "current" ? text(locale, "Current meal", "本餐偏好") : scope === "saved" ? text(locale, "Saved preference", "已存偏好") : text(locale, "Not selected", "未選擇");
  const orderLabels: Record<string, [string, string]> = {
    "current-preference-descending": ["Current-meal matches", "本餐偏好符合數"], "saved-preference-descending": ["Saved preference matches", "已存偏好符合數"], "nutrition-level-descending": ["Nutrition level (18+, 14–17, 13 or less)", "營養級別（18 以上、14–17、13 以下）"], "equal-tier-record-variety": ["Recorded variety within equal priorities", "同層級時的紀錄多樣性"], "equal-tier-alternative-variety": ["Different staple or main protein among options shown together", "同一組選項的主食或主要蛋白質來源不同"], "meal-window-rotation": ["Rotation by date and meal window", "依日期與餐別時段輪替"], "stable-id": ["Stable recipe ID", "固定配方 ID"],
  };
  const coveredReasons = new Set([score.basis.note, ...score.preferenceRows.map(row => row.note),
    ...(rec.trace.selectionMethod ? [rec.trace.variety.reason] : [])]);
  const selectionReasons = [...new Set(rec.reasons.slice(1))].filter(reason => !coveredReasons.has(reason));
  const rows = [
    { key: "energyKj" as const, label: text(locale, "Energy", "能量"), value: model.inputs.energyKj, unit: "kJ", points: model.points.a.energy },
    { key: "saturatedFat" as const, label: text(locale, "Saturated fat", "飽和脂肪"), value: model.inputs.saturatedFat, unit: "g", points: model.points.a.saturatedFat },
    { key: "freeSugars" as const, label: text(locale, "Free sugars", "游離糖"), value: model.inputs.freeSugars, unit: "g", points: model.points.a.freeSugars },
    { key: "salt" as const, label: text(locale, "Salt", "鹽"), value: model.inputs.salt, unit: "g", points: model.points.a.salt },
    { key: "protein" as const, label: text(locale, "Protein", "蛋白質"), value: model.inputs.protein, unit: "g", points: model.points.c.protein },
    { key: "fiber" as const, label: text(locale, "Fibre", "膳食纖維"), value: model.inputs.fiber, unit: "g", points: model.points.c.fiber },
    { key: "fvnsPercent" as const, label: text(locale, "Fruit, vegetables, nuts & seeds", "水果、蔬菜、堅果與種子"), value: model.inputs.fvnsPercent, unit: "%", points: model.points.c.fvns },
  ];
  const bandText = (key: (typeof rows)[number]["key"], value: number | null, unit: string) => {
    if (value === null) return unknown;
    const band = getNpm2018Band(key, value);
    if (band.points === null) return unknown;
    if (band.lowerExclusive === null) return `≤ ${number(band.upperInclusive)} ${unit}`;
    if (band.upperInclusive === null) return `> ${number(band.lowerExclusive)} ${unit}`;
    return `> ${number(band.lowerExclusive)} – ≤ ${number(band.upperInclusive)} ${unit}`;
  };

  return (
    <details className="recommendation-score score-receipt" aria-label={text(locale, "Match and nutrition calculation", "配對與營養計算")} >
      <summary>{text(locale, "Match & nutrition details", "配對與營養計算明細")}</summary>
      <div className="recommendation-score-heading">
        <h4>{text(locale, "Nutrition reference", "營養參考值")}</h4>
        <strong className="recommendation-score-total">{complete ? number(score.nutritionReference) : unknown}</strong>
      </div>
      <dl className="score-components">
        <div><dt>{text(locale, "Nutrient component", "營養項")}</dt><dd className="score-nutrient">{complete ? number(score.nutrient, true) : unknown}</dd></div>
        <div><dt>{text(locale, "Energy component", "熱量項")}</dt><dd className="score-energy">{complete ? number(score.energy, true) : unknown}</dd></div>
        <div><dt>{text(locale, "Preference points (separate)", "偏好點數（獨立比較）")}</dt><dd className="score-preference">{number(score.preference, true)}</dd></div>
      </dl>
      <p className="score-basis-note">{text(locale,
        "Nutrition reference per 100 g. First compare current-meal matches, then saved matches; after both tie, compare the level this reference falls in (18 or more, 14 to 17, 13 or less), not single points.",
        "每 100 克的營養參考值。先比較本餐偏好符合數，再比較已存偏好符合數；兩者皆相同時，比較此參考值所屬級別（18 以上、14 至 17、13 以下），不逐點比較。",
      )}</p>
      {!complete && <p className="score-unavailable">{text(locale, "Required model data are incomplete; no nutrition reference is assigned.", "必要模型資料不完整，因此不提供營養參考值。")}</p>}
      <HistoryBasis trace={rec.trace.variety} locale={locale} />
      <dl className="score-match-groups">
        {(["current", "saved"] as const).map(scope => {
          const fit = scope === "current" ? score.currentPreference : score.savedPreference;
          return <div className={`score-${scope}-fit`} key={scope}><dt>{scopeLabel(scope)}</dt><dd>{fit.selected
            ? text(locale, `${fit.matched}/${fit.selected} groups match · ${fit.points}/${fit.possible} points`, `符合 ${fit.matched}/${fit.selected} 組 · ${fit.points}/${fit.possible} 點`)
            : scope === "saved" ? text(locale, "No active saved preference groups · 0 points", "目前沒有參與排序的已存偏好 · 0 點") : text(locale, "No current-meal preferences selected · 0 points", "未選擇本餐偏好 · 0 點")}</dd></div>;
        })}
      </dl>
      {score.unsupportedSavedPreferences.length > 0 && <p className="score-unsupported-preferences">{text(locale, "Retained preferences unavailable for this catalog; excluded from ranking and match counts", "保留偏好目前無法由此配方集判定，不計入排序或符合數")}: {valueList(score.unsupportedSavedPreferences)}</p>}
      <p className="score-ranking-version">{text(locale, "Ranking policy", "排序規則版本")}: {rec.trace.rankingPolicy.version}</p>
      <p className="score-rotation-seed">{text(locale, "Rotation for", "輪替依據")}: {rec.trace.rotationSeed}</p>
      <ol className="score-ranking-order">{rec.trace.rankingPolicy.order.map(step => <li key={step}>{orderLabels[step] ? text(locale, ...orderLabels[step]) : step}</li>)}</ol>
      <div className="score-calculations">
        <p className="score-formula">{text(locale,
          "Nutrient component = credited C − saturated-fat A − free-sugars A − salt A. Energy component = 10 − energy A. Nutrition reference = nutrient component + energy component = 10 − raw NPM. Current-meal and saved preference points are compared separately; they are not added to nutrition.",
          "營養項＝可計入 C 分－飽和脂肪 A 分－游離糖 A 分－鹽 A 分；熱量項＝10－能量 A 分；營養參考值＝營養項＋熱量項＝10－NPM 原始分數。本餐偏好與已存偏好點數分開比較，不與營養相加。",
        )}</p>
        <p>{text(locale,
          "The constant 10 is a display offset in the energy component, not an official NPM bonus. All options use the same offset.",
          "熱量項中的固定 10 分是顯示用位移，並非官方 NPM 加分；所有選項套用相同位移。",
        )}</p>
        <p>{text(locale,
          "Energy in this table uses kJ per 100 g (1 kcal = 4.184 kJ). The nutrition panel shows kcal for your selected whole portion.",
          "此表的能量以每 100 克的 kJ 計算（1 kcal＝4.184 kJ）；營養區則顯示你選定整份的 kcal。",
        )}</p>
        <p className="score-table-hint">{text(locale, "Swipe the table sideways to see all model points.", "左右滑動表格，查看完整模型分數。")}</p>
        <div className="score-table-scroll" tabIndex={0} role="region" aria-label={text(locale, "Per-100-g model table, scroll horizontally on small screens", "每百克模型計算表，小螢幕可左右捲動")}>
          <table className="numeric-receipt score-model-receipt">
            <caption>{text(locale, "UK NPM 2018 · inputs per 100 g", "英國 NPM 2018・每 100 克輸入值")}</caption>
            <thead><tr>
              <th scope="col">{text(locale, "Component", "項目")}</th>
              <th scope="col">{text(locale, "Input", "輸入值")}</th>
              <th scope="col">{text(locale, "Applied band", "套用門檻")}</th>
              <th scope="col">{text(locale, "Model points", "模型分數")}</th>
            </tr></thead>
            <tbody>{rows.map((row, index) => <tr className="score-model-row" key={row.key} data-component={row.key}>
              <th scope="row">{row.label} · {index < 4 ? "A" : "C"}</th>
              <td className="score-model-input">{row.value === null ? unknown : `≈ ${number(row.value)} ${row.unit}`}</td>
              <td className="score-model-band">{bandText(row.key, row.value, row.unit)}</td>
              <td className="contribution-points">{number(row.points)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="score-rounding-note">{text(locale, "Display values are rounded; bands use unrounded calculations.", "顯示值經四捨五入，門檻以未取整計算值判定。")}</p>
        <p className="score-protein-gate">{text(locale,
          `Protein gate: ${model.proteinCredited === null ? "unavailable" : model.proteinCredited ? "protein points credited" : "protein points not credited"}. A total ${number(model.aTotal)}; listed protein points ${number(model.points.c.protein)}; credited protein points ${number(model.creditedProteinPoints)}; credited C total ${number(model.cTotal)}.`,
          `蛋白質計分條件：${model.proteinCredited === null ? "資料不足" : model.proteinCredited ? "蛋白質分數可計入" : "蛋白質分數不計入"}。A 分合計 ${number(model.aTotal)}；蛋白質表列分數 ${number(model.points.c.protein)}；可計入蛋白質分數 ${number(model.creditedProteinPoints)}；可計入 C 分合計 ${number(model.cTotal)}。`,
        )}</p>
        <p>{text(locale, "Protein points count only when A is below 11, or fruit/vegetable/nut/seed points equal 5.", "A 分低於 11，或水果／蔬菜／堅果／種子取得 5 分時，才計入蛋白質分數。")}</p>
        <p className="score-official-raw">{text(locale, "Published-model raw result (lower is better)", "公開模型原始分數（較低較佳）")}: {number(model.rawScore)}</p>
        {model.missing.length > 0 && <p className="score-missing">{text(locale, "Missing inputs", "缺少輸入資料")}: {model.missing.join(", ")}</p>}
        <table className="numeric-receipt score-preference-receipt">
          <caption>{text(locale, "Preference groups · 2 points for each matched group", "偏好群組・每個符合群組 2 點")}</caption>
          <thead><tr><th scope="col">{text(locale, "Preference", "偏好")}</th><th scope="col">{text(locale, "Points", "點數")}</th><th scope="col">{text(locale, "Reason", "說明")}</th></tr></thead>
          <tbody>{score.preferenceRows.map((row) => <tr className="score-preference-row" key={row.key}>
            <th scope="row"><span className="preference-row-label">{row.label}</span><span className="preference-row-scope">{scopeLabel(row.scope)}</span></th><td className="contribution-points">{number(row.points, true)}</td><td>
              <p className="contribution-note">{row.note}</p>
              <dl className="preference-row-values">
                <div><dt>{text(locale, "Selected", "已選")}</dt><dd className="preference-requested">{valueList(row.requestedValues)}</dd></div>
                <div><dt>{text(locale, "Matched", "符合")}</dt><dd className="preference-matched">{valueList(row.matchedValues)}</dd></div>
                <div><dt>{text(locale, "Unmatched", "未符合")}</dt><dd className="preference-unmatched">{valueList(row.unmatchedValues)}</dd></div>
              </dl>
              {!row.available && <p>{text(locale, "Cannot confirm with available preparation data.", "現有準備資料無法確認。")}</p>}
            </td>
          </tr>)}</tbody>
        </table>
        {score.preference === 0 && <p className="score-zero-preference">{text(locale, "No selected preference group matches this option.", "此選項沒有符合已選的偏好群組。")}</p>}
        <ul className="score-selection-reasons">{selectionReasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>
        <p className="score-selection-method">{rec.trace.selectionMethod}</p>
        <details className="score-source-details">
          <summary>{text(locale, "Sources & input derivations", "來源與輸入值推導")}</summary>
          <p className="score-model-reference">{score.basis.model} · {score.basis.version}. {score.basis.note}</p>
          <div className="score-input-basis">
            <ul>{[...inputNotes].map(([note, labels]) => <li key={note} className="score-input-note">
              <strong>{labels.join(text(locale, ", ", "、"))}</strong><p>{note}</p>
            </li>)}</ul>
          </div>
          <ul className="score-source-links">{sourceUrls.map(url => <li key={url}><a href={url} target="_blank" rel="noreferrer">{sourceTitle(url)}</a></li>)}</ul>
        </details>
      </div>
    </details>
  );
}

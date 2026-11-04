import { getNpm2018Band } from "./nutrient-profile";
import { HistoryBasis } from "./HistoryBasis";
import type { PilotRecommendation } from "./nutrition";
import type { Locale } from "./types";

type RecommendationScoreProps = { rec: PilotRecommendation; locale: Locale };
const text = (locale: Locale, en: string, zh: string) => locale === "en" ? en : zh;

/** Presents the ranking engine's actual components, without recalculating them. */
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
  if (!score) return <section className="recommendation-score">
    <h4>{text(locale, "NextBite ranking total", "NextBite 排序總分")}</h4>
    <p className="score-unavailable">{unknown}</p>
  </section>;

  const model = score.model;
  const complete = model.status === "complete" &&
    [score.nutrient, score.energy, score.preference, score.total].every(Number.isFinite);
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
    <section className="recommendation-score" aria-label={text(locale, "NextBite ranking calculation", "NextBite 排序計算")}>
      <div className="recommendation-score-heading">
        <h4>{text(locale, "NextBite ranking total", "NextBite 排序總分")}</h4>
        <strong className="recommendation-score-total">{complete ? number(score.total) : unknown}</strong>
      </div>
      <dl className="score-components">
        <div><dt>{text(locale, "Nutrient component", "營養項")}</dt><dd className="score-nutrient">{complete ? number(score.nutrient, true) : unknown}</dd></div>
        <div><dt>{text(locale, "Energy component", "熱量項")}</dt><dd className="score-energy">{complete ? number(score.energy, true) : unknown}</dd></div>
        <div><dt>{text(locale, "Preference component", "偏好項")}</dt><dd className="score-preference">{number(score.preference, true)}</dd></div>
      </dl>
      <p className="score-basis-note">{text(locale,
        "Per 100 g · higher ranks first. A NextBite custom combination.",
        "每 100 克計算，總分較高者優先；這是 NextBite 自訂組合。",
      )}</p>
      {!complete && <p className="score-unavailable">{text(locale, "Required model data are incomplete; no total is assigned.", "必要模型資料不完整，因此不提供總分。")}</p>}
      <HistoryBasis trace={rec.trace.variety} locale={locale} />
      <details className="score-receipt">
        <summary>{text(locale, "Calculation & recommendation basis", "計算明細與推薦依據")}</summary>
        <p className="score-formula">{text(locale,
          "Nutrient component = credited C − saturated-fat A − free-sugars A − salt A. Energy component = 10 − energy A. Total = 10 − raw NPM + preference bonus.",
          "營養項＝可計入 C 分－飽和脂肪 A 分－游離糖 A 分－鹽 A 分；熱量項＝10－能量 A 分；總分＝10－NPM 原始分數＋偏好加分。",
        )}</p>
        <p>{text(locale,
          "The constant 10 is a display offset in the energy component, not an official NPM bonus. All options use the same offset.",
          "熱量項中的固定 10 分是顯示用位移，並非官方 NPM 加分；所有選項套用相同位移。",
        )}</p>
        <p>{text(locale,
          "Energy in this table uses kJ per 100 g (1 kcal = 4.184 kJ). The nutrition panel shows kcal for your selected whole portion.",
          "此表的能量以每 100 克的 kJ 計算（1 kcal＝4.184 kJ）；營養區則顯示你選定整份的 kcal。",
        )}</p>
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
          <caption>{text(locale, "NextBite preference bonus · up to 10", "NextBite 自訂偏好加分・最多 10 分")}</caption>
          <thead><tr><th scope="col">{text(locale, "Preference", "偏好")}</th><th scope="col">{text(locale, "Points", "點數")}</th><th scope="col">{text(locale, "Reason", "說明")}</th></tr></thead>
          <tbody>{score.preferenceRows.map((row) => <tr className="score-preference-row" key={row.key}>
            <th scope="row">{row.label}</th><td className="contribution-points">{number(row.points, true)}</td><td className="contribution-note">{row.note}</td>
          </tr>)}</tbody>
        </table>
        {score.preference === 0 && <p className="score-zero-preference">{text(locale, "No preference bonus applies to this option.", "此選項沒有適用的偏好加分。")}</p>}
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
      </details>
    </section>
  );
}

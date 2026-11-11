import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { RecipeCalculation } from "./nutrition";
import type { FoodState, NutritionPortion, StandardizedRecipe } from "./nutrition-types";
import { getRecipeImage } from "./recipe-images";
import { recipeDisplayName } from "./recipe-name";
import { recipeTimeExplanation } from "./recipe-time";
import type { Locale } from "./types";
import "./recipe-card.css";

type RecipeCardProps = {
  recipe: StandardizedRecipe;
  portion: NutritionPortion;
  locale: Locale;
  calculation: RecipeCalculation;
  recipeUrl: string;
  backUrl: string;
  initialPaper?: "letter" | "a4";
  initialPaperPreview?: boolean;
};

const text = (locale: Locale, en: string, zh: string) => locale === "en" ? en : zh;
const portionNames: Record<NutritionPortion, [string, string]> = {
  small: ["Smaller portion", "較小份"],
  regular: ["Standard portion", "標準份"],
  large: ["Larger portion", "較大份"],
};
const stateNames: Record<FoodState, [string, string]> = {
  cooked: ["Cooked weight", "熟後重量"],
  raw: ["Raw weight", "生鮮重量"],
  "ready-to-eat": ["Ready-to-eat weight", "即食重量"],
};

/** A bounded wait keeps an unavailable image or web font from blocking retry. */
function readyWithin<T>(promise: PromiseLike<T>, signal: AbortSignal, milliseconds = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const finish = () => {
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", cancel);
    };
    const cancel = () => { finish(); reject(new Error("Print preparation canceled")); };
    const timeout = window.setTimeout(() => { finish(); reject(new Error("Print assets are not ready")); }, milliseconds);
    if (signal.aborted) { cancel(); return; }
    signal.addEventListener("abort", cancel, { once: true });
    Promise.resolve(promise).then(
      value => { finish(); resolve(value); },
      error => { finish(); reject(error); },
    );
  });
}

/** Public recipe content only: no preference scores, records, profile or key. */
export function RecipeCard({ recipe, portion, locale, calculation, recipeUrl, backUrl, initialPaper = "letter", initialPaperPreview = false }: RecipeCardProps) {
  const image = getRecipeImage(recipe);
  const pageRef = useRef<HTMLElement>(null);
  const previewViewport = useRef<HTMLDivElement>(null);
  const paperContent = useRef<HTMLDivElement>(null);
  const pageLimit = useRef<HTMLSpanElement>(null);
  const photoRef = useRef<HTMLImageElement>(null);
  const printing = useRef(false);
  const mounted = useRef(false);
  const printPreparation = useRef<AbortController | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [printError, setPrintError] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [paper, setPaper] = useState<"letter" | "a4">(initialPaper);
  const [paperPreview, setPaperPreview] = useState(initialPaperPreview);
  const [previewScale, setPreviewScale] = useState(1);
  const [overflowsPage, setOverflowsPage] = useState<boolean | null>(null);
  const imageFailed = Boolean(image && failedImage === image.src);
  const measurePaper = () => {
    const content = paperContent.current;
    const limit = pageLimit.current;
    if (content && limit && limit.offsetHeight > 0) {
      setOverflowsPage(content.offsetHeight > limit.offsetHeight + 1 || content.scrollWidth > content.clientWidth + 1);
    }
  };
  useEffect(() => {
    mounted.current = true;
    const beforePrint = () => {
      pageRef.current?.classList.add("is-print-layout");
      measurePaper();
    };
    const afterPrint = () => pageRef.current?.classList.remove("is-print-layout");
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      mounted.current = false;
      printPreparation.current?.abort();
      printPreparation.current = null;
      printing.current = false;
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);
  useEffect(() => {
    if (!paperPreview) return;
    const viewport = previewViewport.current;
    const content = paperContent.current;
    if (!viewport || !content) return;
    const update = () => {
      const paperWidth = (paper === "a4" ? 210 : 215.9) * 96 / 25.4;
      setPreviewScale(Math.min(1, Math.max(0.1, viewport.clientWidth / paperWidth)));
      measurePaper();
    };
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    observer.observe(content);
    update();
    return () => observer.disconnect();
  }, [paperPreview, paper, recipe.mealId, portion, locale, imageFailed]);
  const title = recipeDisplayName(recipe, locale);
  const guide = recipe.preparationGuide;
  const unknown = text(locale, "Unknown", "未知");
  const number = (value: number | null, maximumFractionDigits = 1) => {
    if (value === null || !Number.isFinite(value)) return unknown;
    const minimum = 10 ** -maximumFractionDigits;
    if (value > 0 && value < minimum) return `<${minimum}`;
    return new Intl.NumberFormat(locale === "zh" ? "zh-TW" : "en-US", { maximumFractionDigits }).format(value);
  };
  const nutrient = (value: number | null, unit: string, precision = 1) =>
    value === null ? unknown : `${number(value, precision)} ${unit}`;

  const printRecipe = async () => {
    if (printing.current) return;
    printing.current = true;
    const controller = new AbortController();
    printPreparation.current = controller;
    setPreparing(true);
    setPrintError(false);
    try {
      const photo = photoRef.current;
      await Promise.all([
        readyWithin(document.fonts.ready, controller.signal),
        photo ? readyWithin(photo.decode(), controller.signal).catch(error => {
          if (controller.signal.aborted) throw error;
          // A missing photo must not prevent access to the complete recipe.
          if (mounted.current && image) setFailedImage(image.src);
        }) : Promise.resolve(),
      ]);
      if (!mounted.current || controller.signal.aborted) return;
      pageRef.current?.classList.add("is-print-layout");
      measurePaper();
      // A timer also settles hidden tabs, where animation frames can pause.
      // Reset the visible state before a native print dialog can block this call.
      setPreparing(false);
      await readyWithin(new Promise<void>(resolve => window.setTimeout(resolve, 80)), controller.signal, 1000);
      if (mounted.current && !controller.signal.aborted) window.print();
    } catch {
      if (mounted.current && !controller.signal.aborted) setPrintError(true);
    } finally {
      controller.abort();
      pageRef.current?.classList.remove("is-print-layout");
      if (printPreparation.current === controller) {
        printPreparation.current = null;
        printing.current = false;
        if (mounted.current) setPreparing(false);
      }
    }
  };

  return <main ref={pageRef} className={`recipe-card-page${paperPreview ? " is-paper-preview" : ""}`}
    data-paper-size={paper} data-page-overflow={overflowsPage ?? undefined}
    style={{ "--recipe-preview-scale": previewScale } as CSSProperties} lang={locale === "zh" ? "zh-Hant" : "en"}>
    <div className="recipe-card-toolbar">
      <a className="recipe-card-back" href={backUrl}>{text(locale, "Back to MealHatch", "返回 MealHatch")}</a>
      <div className="recipe-card-print-actions">
        <label className="recipe-card-paper-choice">{text(locale, "Paper", "紙張")}
          <select value={paper} onChange={event => setPaper(event.target.value as "letter" | "a4")}>
            <option value="letter">Letter</option><option value="a4">A4</option>
          </select>
        </label>
        <button type="button" className="recipe-card-preview-toggle" aria-pressed={paperPreview} onClick={() => setPaperPreview(value => !value)}>
          {paperPreview ? text(locale, "Reading view", "閱讀模式") : text(locale, "Page preview", "紙張預覽")}
        </button>
        <button type="button" onClick={printRecipe} disabled={preparing} aria-describedby="recipe-card-print-help">
          {preparing ? text(locale, "Preparing…", "準備中…") : text(locale, "Print / Save PDF", "列印／儲存 PDF")}
        </button>
      </div>
      <p id="recipe-card-print-help" className="recipe-card-print-help">
        {text(locale, "Choose “Save as PDF” at 100% scale, with browser headers and footers off.", "在列印視窗選擇「另存為 PDF」、100% 比例，並關閉瀏覽器的頁首與頁尾。")}
      </p>
      {paperPreview && <p className="recipe-card-preview-status" role="status">{overflowsPage
        ? text(locale, "This recipe needs another page at this paper size. All ingredients and steps will be kept.", "這道食譜在此紙張尺寸需要續頁，所有食材與步驟都會完整保留。")
        : overflowsPage === false
          ? text(locale, `One-page ${paper === "a4" ? "A4" : "Letter"} layout · preview fits your screen; print stays full size.`, `${paper === "a4" ? "A4" : "Letter"} 單頁排版 · 預覽配合螢幕縮放，列印維持原尺寸。`)
          : text(locale, "Page preview · print stays full size.", "紙張預覽 · 列印維持原尺寸。")}</p>}
      {printError && <p className="recipe-card-status" role="alert">
        {text(locale, "The recipe could not finish loading for printing. Please wait a moment and try again.", "食譜尚未完成列印前的載入。請稍候再試一次。")}
      </p>}
      {imageFailed && <p className="recipe-card-status" role="status">
        {text(locale, "The photo could not load. The complete recipe is still available to print.", "圖片未能載入，完整食譜仍可列印。")}
      </p>}
    </div>

    <div className="recipe-card-preview-viewport" ref={previewViewport}>
    <article className="recipe-card-sheet" aria-labelledby="recipe-card-title">
      <span ref={pageLimit} className="recipe-card-page-limit" aria-hidden="true" />
      <div ref={paperContent} className="recipe-card-paper-content">
      <div className="recipe-card-masthead">
        <a href={backUrl}>MealHatch</a>
        <p>{text(locale, "Your next meal, ready to make.", "下一餐，準備開動。")}</p>
      </div>

      <header className="recipe-card-heading">
        <div className="recipe-card-heading-copy">
          <p className="recipe-card-kicker">{guide ? text(locale, "Recipe & cooking guide", "食譜與烹調指南") : text(locale, "Assembly recipe", "食材組合食譜")}</p>
          <h1 id="recipe-card-title">{title}</h1>
          <p className="recipe-card-portion">
            {text(locale, ...portionNames[portion])} <span>· {number(recipe.portions[portion], 2)}×</span>
            {calculation.portionGrams !== null && <span> · {number(calculation.portionGrams)} g {text(locale, "edible weight", "可食重量")}</span>}
          </p>
          <p className="recipe-card-time">{text(locale, `About ${recipe.prepMinutes} min assembly`, `約 ${recipe.prepMinutes} 分鐘組合`)}</p>
          <p className="recipe-card-heading-note">{text(locale,
            "Assembly starts with prepared ingredients. Full cooking time is not included.",
            "組合時間從食材備妥後起算，不含完整烹調時間。",
          )}</p>
        </div>
        {image && !imageFailed && <figure className="recipe-card-photo">
          <img ref={photoRef} src={image.src} srcSet={image.srcSet}
            sizes="(max-width: 640px) 180px, 220px" width={960} height={720}
            alt={image.alt[locale]} loading="eager" decoding="async"
            onError={() => setFailedImage(image.src)} />
        </figure>}
      </header>

      <section className="recipe-card-nutrition" aria-label={text(locale, "Nutrition for the selected whole portion", "所選整份的營養估算")}>
        <p>{text(locale, "Nutrition estimate · this whole portion", "營養估算 · 此選定整份")}</p>
        <dl>
          <div><dt>{text(locale, "Energy", "熱量")}</dt><dd>{nutrient(calculation.nutrition.kcal, "kcal", 0)}</dd></div>
          <div><dt>{text(locale, "Protein", "蛋白質")}</dt><dd>{nutrient(calculation.nutrition.protein, "g")}</dd></div>
          <div><dt>{text(locale, "Fiber", "膳食纖維")}</dt><dd>{nutrient(calculation.nutrition.fiber, "g")}</dd></div>
          <div><dt>{text(locale, "Sodium", "鈉")}</dt><dd>{nutrient(calculation.nutrition.sodium, "mg", 0)}</dd></div>
        </dl>
      </section>

      <div className="recipe-card-columns">
        <section className="recipe-card-ingredients" aria-labelledby="recipe-card-ingredients-title">
          <h2 id="recipe-card-ingredients-title">{text(locale, "Ingredients", "食材")}</h2>
          <p className="recipe-card-section-note">{text(locale,
            "All amounts below match this portion. Weigh edible parts in the stated raw, cooked or ready-to-eat condition.",
            "以下用量已依本份量換算。請在標示的生鮮、熟後或即食狀態下，只秤可食部分。",
          )}</p>
          <ul className="recipe-card-ingredient-list">
            {calculation.ingredientAmounts.map((ingredient, index) => <li key={`${ingredient.foodId}-${index}`}>
              <div className="recipe-card-ingredient-copy">
                <strong>{ingredient.food?.label[locale] ?? text(locale, "Ingredient reference unavailable", "食材來源紀錄尚缺")}</strong>
                <span>{ingredient.food ? text(locale, ...stateNames[ingredient.food.state]) : unknown}
                  {ingredient.processing === "pureed" && <> · {text(locale, "Puréed", "打成泥")}</>}
                  {ingredient.food && <> · <a href={ingredient.food.recordUrl} target="_blank" rel="noreferrer">FDC {ingredient.food.fdcId}</a></>}
                </span>
              </div>
              <span className="recipe-card-amount">{ingredient.grams === null ? unknown : `${number(ingredient.grams, 2)} g`}</span>
            </li>)}
          </ul>
        </section>

        <section className="recipe-card-method" aria-labelledby="recipe-card-method-title">
          <h2 id="recipe-card-method-title">{guide ? text(locale, "Make it", "準備與烹調") : text(locale, "Assemble it", "組合步驟")}</h2>
          <p className="recipe-card-section-note recipe-card-timing-note">{guide?.timingNote[locale] ?? recipeTimeExplanation(locale)}</p>
          <ol className="recipe-card-steps">{recipe.instructions.map((step, index) => <li key={index}>{step[locale]}</li>)}</ol>
        </section>
      </div>

      <footer className="recipe-card-footer">
        <section className="recipe-card-source-section" aria-labelledby="recipe-card-sources-title">
          <h2 id="recipe-card-sources-title">{text(locale, "Recipe notes & sources", "配方說明與來源")}</h2>
          <p className="recipe-card-source-note">{text(locale,
            "Nutrition: USDA FoodData Central, linked with each ingredient. Substitutions can change the estimates.",
            "營養來源：每項食材旁的 USDA FoodData Central 連結。替換食材可能改變估算值。",
          )}</p>
          {guide && <div className="recipe-card-cooking-sources">
            <p>{text(locale, "Cooking & food handling", "烹調與食材處理")}</p>
            <ul>{guide.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label[locale]}</a></li>)}</ul>
          </div>}
          <p className="recipe-card-version">{text(locale, "Formulation", "配方版本")}: {recipe.version}
            {guide && <> · {text(locale, "Cooking guide", "烹調指南版本")}: {guide.version}</>}
          </p>
        </section>
        <div className="recipe-card-bottomline">
          <a href={recipeUrl}>{text(locale, "Open this recipe on MealHatch", "在 MealHatch 開啟這道食譜")}</a>
          {image && !imageFailed && <span>{text(locale, "Food image is an AI-generated illustration.", "餐點圖片為 AI 生成示意圖。")}</span>}
        </div>
      </footer>
      </div>
    </article>
    </div>
  </main>;
}

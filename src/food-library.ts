import { calculateNutrientProfile } from "./nutrient-profile";
import { defaultMealContext, normalizeMealContext } from "./meal-context";
import type { MealContext } from "./meal-context";
import type { Locale, Profile } from "./types";
import type {
  FoodLibraryConcept, FoodLibraryData, FoodLibraryGroup, FoodLibraryIdentification,
  FoodLibraryIndex, FoodLibraryKind, FoodLibraryRecord, FoodLibraryScore,
} from "./food-library-types";
export type * from "./food-library-types";

const choose = (locale: Locale, en: string, zh: string) => locale === "zh" ? zh : en;
// Keep preparation and negation words. Recognition must not equate raw/cooked,
// sweetened/unsweetened, or a broad animal name with one particular cut.
export const normalizeLibraryFoodName = (value: string) => value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
export const foodLibraryName = (record: Pick<FoodLibraryRecord, "names">, locale: Locale) => record.names[locale] || record.names.en || record.names.zh;
const namesFor = (record: Pick<FoodLibraryRecord, "names" | "aliases">) => [...new Set([record.names.en, record.names.zh, ...record.aliases].map(normalizeLibraryFoodName).filter(Boolean))];
const validNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isText = (value: unknown) => typeof value === "string";
const isTextList = (value: unknown): value is string[] => Array.isArray(value) && value.every(isText);
const isLocalized = (value: unknown) => isObject(value) && isText(value.en) && isText(value.zh);
const groups = ["protein", "vegetable", "carb", "fruit", "soup", "drink", "other"];
const staples = ["rice", "noodles", "bread", "potato", "other"];
const nutrientKeys = ["kcal", "energyKj", "protein", "carbs", "fat", "saturatedFat", "fiber", "sodium", "addedSugar", "totalSugars"];
const nullableNumber = (value: unknown) => value === null || validNumber(value);

/** Validate the local release before making any source values available to UI. */
export const validateFoodLibraryData = (input: unknown): FoodLibraryData => {
  if (!isObject(input) || input.schemaVersion !== 1 || !isText(input.generatedAt) || !Array.isArray(input.sources) || !Array.isArray(input.records) || !Array.isArray(input.concepts)) throw new Error("Unsupported food-library data.");
  const sourceIds = new Set<string>(), recordIds = new Set<string>(), conceptIds = new Set<string>();
  for (const source of input.sources) {
    if (!isObject(source) || !["id", "provider", "dataset", "release", "url", "license", "licenseUrl", "retrievedAt"].every(key => isText(source[key])) || !source.id || sourceIds.has(source.id as string)) throw new Error("Invalid food-library source.");
    sourceIds.add(source.id as string);
  }
  for (const record of input.records) {
    if (!isObject(record) || !["id", "sourceId", "sourceRecordId", "sourceUrl", "category", "kind", "group"].every(key => isText(record[key])) || !record.id || recordIds.has(record.id as string) || !sourceIds.has(record.sourceId as string) || !isLocalized(record.names) || !isTextList(record.aliases) || !groups.includes(record.group as string) || !["food", "drink", "alcohol", "unknown"].includes(record.kind as string) || !(record.state === null || isText(record.state))) throw new Error("Invalid food-library record.");
    if (!(record.identity === null || isObject(record.identity) && isText(record.identity.key) && (record.identity.protein === null || isText(record.identity.protein)) && (record.identity.staple === null || staples.includes(record.identity.staple as string)))) throw new Error("Invalid food-library identity.");
    const nutrients = record.nutrientsPer100g, basis = record.modelBasis;
    // Keep analytical source values unchanged (one TFDA oil reports 100.3 g fat).
    // Only the official model's required inputs face its 0–100 g/% constraints;
    // a source inconsistency in a non-model field must not hide the whole library.
    if (!isObject(nutrients) || !nutrientKeys.every(key => nullableNumber(nutrients[key])) || !isObject(basis) || !nullableNumber(basis.freeSugarsPer100g) || (typeof basis.freeSugarsPer100g === "number" && basis.freeSugarsPer100g > 100) || !nullableNumber(basis.fvnsPercent) || (typeof basis.fvnsPercent === "number" && basis.fvnsPercent > 100) || !["AOAC-compatible", "unknown"].includes(basis.fiberMethod as string) || !isLocalized(basis.notes) || !isTextList(basis.sourceUrls)) throw new Error("Invalid food-library nutrient evidence.");
    recordIds.add(record.id as string);
  }
  for (const concept of input.concepts) {
    if (!isObject(concept) || !isText(concept.id) || !concept.id || conceptIds.has(concept.id as string) || !isLocalized(concept.names) || !isTextList(concept.aliases) || !groups.includes(concept.group as string) || !(concept.protein === null || isText(concept.protein)) || !(concept.staple === null || staples.includes(concept.staple as string)) || !isTextList(concept.recordIds) || !concept.recordIds.every(id => recordIds.has(id))) throw new Error("Invalid food-library concept.");
    conceptIds.add(concept.id as string);
  }
  return input as unknown as FoodLibraryData;
};

export const createFoodLibraryIndex = (input: FoodLibraryData): FoodLibraryIndex => {
  const data = validateFoodLibraryData(input);
  const exactRecords = new Map<string, FoodLibraryRecord[]>(), exactConcepts = new Map<string, FoodLibraryConcept[]>();
  for (const record of data.records) for (const name of namesFor(record)) exactRecords.set(name, [...(exactRecords.get(name) ?? []), record]);
  for (const concept of data.concepts) for (const name of namesFor(concept)) exactConcepts.set(name, [...(exactConcepts.get(name) ?? []), concept]);
  return { data, recordsById: new Map(data.records.map(record => [record.id, record])), conceptsById: new Map(data.concepts.map(concept => [concept.id, concept])), exactRecords, exactConcepts,
    searchEntries: data.records.map(record => { const names = namesFor(record); return { record, names, text: [...names, normalizeLibraryFoodName(record.category)].join("\n") }; }) };
};

let libraryPromise: Promise<FoodLibraryIndex> | null = null;
/** Loaded only when recognition or the food library is opened, never at startup. */
export const loadFoodLibrary = (): Promise<FoodLibraryIndex> => {
  if (!libraryPromise) libraryPromise = fetch("/food-library/catalog.json").then(response => {
    if (!response.ok) throw new Error("Food-library data could not be loaded.");
    return response.json() as Promise<unknown>;
  }).then(data => createFoodLibraryIndex(validateFoodLibraryData(data))).catch(error => { libraryPromise = null; throw error; });
  return libraryPromise;
};

export const searchFoodLibrary = (index: FoodLibraryIndex, query: string, options: { locale: Locale; limit?: number; kind?: FoodLibraryKind; group?: FoodLibraryGroup } = { locale: "en" }): FoodLibraryRecord[] => {
  const normalized = normalizeLibraryFoodName(query), tokens = normalized.split(/\s+/).filter(Boolean);
  const concepts = index.exactConcepts.get(normalized) ?? [];
  const linked = new Set(concepts.flatMap(concept => concept.recordIds));
  const ranked = index.searchEntries.flatMap(entry => {
    if (options.kind && entry.record.kind !== options.kind || options.group && entry.record.group !== options.group) return [];
    let rank = normalized ? Number.POSITIVE_INFINITY : 5;
    if (entry.names.includes(normalized)) rank = 0;
    else if (normalized && entry.names.some(name => name.startsWith(normalized))) rank = 1;
    else if (linked.has(entry.record.id)) rank = 2;
    else if (normalized && entry.names.some(name => name.includes(normalized))) rank = 3;
    else if (tokens.length && tokens.every(token => entry.text.includes(token))) rank = 4;
    const groupFit = concepts.some(concept => concept.group === entry.record.group) ? 0 : 1;
    const identityFit = entry.record.identity && concepts.some(concept => concept.protein !== null && concept.protein === entry.record.identity?.protein || concept.staple !== null && concept.staple === entry.record.identity?.staple) ? 0 : 1;
    return Number.isFinite(rank) ? [{ record: entry.record, rank, groupFit, identityFit }] : [];
  });
  // Discovery is ordered by name specificity, then reviewed food-family fit;
  // never by nutrient or preference points. Source variants remain separate.
  return ranked.sort((a, b) => a.rank - b.rank || a.groupFit - b.groupFit || a.identityFit - b.identityFit || foodLibraryName(a.record, options.locale).localeCompare(foodLibraryName(b.record, options.locale), options.locale === "zh" ? "zh-Hant" : "en") || a.record.id.localeCompare(b.record.id, "en"))
    .slice(0, Math.max(0, options.limit ?? 30)).map(item => item.record);
};

export const isLibrarySelectionValid = (data: FoodLibraryData | FoodLibraryIndex, id: string, name: string, group: FoodLibraryGroup): boolean => {
  const record = "recordsById" in data ? data.recordsById.get(id) : data.records.find(item => item.id === id);
  return Boolean(record && record.group === group && namesFor(record).includes(normalizeLibraryFoodName(name)));
};

/** Exact recognition only. Search suggestions are never accepted as nutrition. */
export const identifyFood = (index: FoodLibraryIndex, text: string, selection?: { id: string; group: FoodLibraryGroup }): FoodLibraryIdentification => {
  const normalized = normalizeLibraryFoodName(text);
  if (selection && isLibrarySelectionValid(index, selection.id, text, selection.group)) {
    const record = index.recordsById.get(selection.id)!;
    return { status: "record", record, concept: null, candidates: [record] };
  }
  const concepts = index.exactConcepts.get(normalized) ?? [];
  if (concepts.length === 1) return { status: "concept", record: null, concept: concepts[0], candidates: concepts[0].recordIds.flatMap(id => { const record = index.recordsById.get(id); return record ? [record] : []; }) };
  if (concepts.length > 1) return { status: "ambiguous", record: null, concept: null, candidates: [...new Set(concepts.flatMap(concept => concept.recordIds))].map(id => index.recordsById.get(id)!) };
  const records = index.exactRecords.get(normalized) ?? [];
  if (records.length === 1) return { status: "record", record: records[0], concept: null, candidates: records };
  if (records.length > 1) return { status: "ambiguous", record: null, concept: null, candidates: records };
  return { status: "unrecognized", record: null, concept: null, candidates: [] };
};

const missingNames: Record<string, { en: string; zh: string }> = {
  energyKj: { en: "Energy (kJ)", zh: "能量（kJ）" }, saturatedFat: { en: "Saturated fat", zh: "飽和脂肪" }, freeSugars: { en: "Free-sugar basis", zh: "游離糖依據" },
  salt: { en: "Sodium for salt conversion", zh: "換算鹽當量所需的鈉" }, protein: { en: "Protein", zh: "蛋白質" }, fiber: { en: "Dietary fiber", zh: "膳食纖維" },
  fvnsPercent: { en: "Eligible fruit, vegetables, nuts and seeds percentage", zh: "合格蔬果堅果種子比例" }, fiberMethod: { en: "Compatible fiber method", zh: "相容的纖維測定方法" }, kind: { en: "Confirmed model scope", zh: "確認適用的模型範圍" },
};

const modelForFoodRecord = (record: FoodLibraryRecord) => {
  if (record.kind !== "food" && record.kind !== "drink") return null;
  const values = record.nutrientsPer100g, basis = record.modelBasis;
  return calculateNutrientProfile({ energyKj: values.energyKj, saturatedFat: values.saturatedFat, freeSugars: basis.freeSugarsPer100g,
    salt: validNumber(values.sodium) ? values.sodium * 2.5 / 1000 : null, protein: values.protein, fiber: values.fiber, fvnsPercent: basis.fvnsPercent, fiberMethod: basis.fiberMethod }, record.kind);
};

/** Availability is independent of preferences and uses the same model validation. */
export const getFoodLibraryScoreStatus = (record: FoodLibraryRecord): FoodLibraryScore["status"] =>
  record.kind === "alcohol" ? "out-of-scope" : modelForFoodRecord(record)?.status === "complete" ? "complete" : "incomplete";

export const calculateFoodLibraryScore = (record: FoodLibraryRecord, profile: Profile, suppliedContext: MealContext = defaultMealContext, locale: Locale = "en"): FoodLibraryScore => {
  const context = normalizeMealContext(suppliedContext);
  if (record.kind === "alcohol") return { status: "out-of-scope", nutrient: null, energy: null, preference: 0, total: null, model: null, preferenceRows: [], missing: [], missingInputs: [],
    note: choose(locale, "Alcoholic drinks are outside the UK NPM 2018 scope. Source composition may be displayed, but no model or preference total is assigned.", "酒精飲品不適用 UK NPM 2018。可查看來源營養資料，但不給予模型分數或偏好總分。") };
  const values = record.nutrientsPer100g, basis = record.modelBasis;
  const model = modelForFoodRecord(record);
  const stapleMatch = context.preferredStaple !== "any" && record.identity?.staple === context.preferredStaple;
  const requestedProtein = profile.preferenceTags.includes("High-protein"), requestedPlants = profile.preferenceTags.includes("Vegetable-forward");
  const proteinMatch = requestedProtein && validNumber(values.protein) && values.protein > 8.5 && values.protein <= 100;
  const plantMatch = requestedPlants && validNumber(basis.fvnsPercent) && basis.fvnsPercent > 40 && basis.fvnsPercent <= 100;
  const preferenceRows = [
    { key: "staple", label: choose(locale, "Selected staple", "本餐主食"), points: stapleMatch ? 2 : 0,
      note: choose(locale, stapleMatch ? "The reviewed staple identity matches your selection: +2 product points." : context.preferredStaple === "any" ? "No staple preference selected: +0." : "A match to your selected staple is not confirmed: +0.", stapleMatch ? "已確認的主食身分符合本餐選擇，加 2 點產品偏好分。" : context.preferredStaple === "any" ? "未選擇主食偏好，加 0 點。" : "未確認符合所選主食，加 0 點。") },
    { key: "nutrition-direction", label: choose(locale, "Requested nutrient direction", "已選營養方向"), points: proteinMatch || plantMatch ? 2 : 0,
      note: !requestedProtein && !requestedPlants ? choose(locale, "No protein or plant direction selected: +0.", "未選擇蛋白質或植物食材方向，加 0 點。")
        : choose(locale, `Only explicit preferences count: protein >8.5 g/100 g or eligible fruit/vegetables/nuts/seeds >40%. This group awards at most +2 product points; current match: ${proteinMatch || plantMatch ? "yes" : "not confirmed"}.`, `僅在明確選擇偏好時，蛋白質超過每 100 克 8.5 克，或合格蔬果堅果種子比例超過 40%，此組最多加 2 點產品偏好分；目前${proteinMatch || plantMatch ? "符合" : "未確認符合"}。`) },
  ];
  const preference = preferenceRows.reduce((sum, row) => sum + row.points, 0);
  const complete = model?.status === "complete";
  const nutrient = complete ? model.cTotal! - model.points.a.saturatedFat! - model.points.a.freeSugars! - model.points.a.salt! : null;
  const energy = model?.points.a.energy === null || !model ? null : 10 - model.points.a.energy;
  const missingInputs = model?.missing ?? ["kind"];
  return { status: complete ? "complete" : "incomplete", nutrient, energy, preference, total: nutrient !== null && energy !== null ? nutrient + energy + preference : null, model, preferenceRows,
    missing: missingInputs.map(key => missingNames[key]?.[locale] ?? key), missingInputs,
    note: choose(locale, "Per 100 g of this exact source record, including drinks; 100 ml is not assumed to equal 100 g. NextBite total = 10 − UK NPM 2018 raw score + product preference points (0–4). Energy counts once. Unknown inputs remain unknown. Ingredient preferences use only reviewed staple identity and requested nutrient directions; cuisine, preparation, fullness and personal nutrient needs are not inferred. This is a composition comparison, not a complete-meal recommendation or personal health score.", "依此筆來源食品每 100 克計算，飲料亦同；不假定 100 毫升等於 100 克。NextBite 總分＝10 − UK NPM 2018 原始分＋產品偏好分（0–4 點），能量只計一次，未知值保留未知。食材偏好僅採已審核主食身分及明確選擇的營養方向，不推測料理、作法、飽足感或個人營養需求。這是成分比較，並非完整餐點推薦或個人健康分數。") };
};

import { sourceFoods } from "./nutrition-data";
import { foodConcepts } from "./food-concepts.generated";
import { foodSourceIdentities } from "./food-source-identities.generated";
import type { ParsedMealComponent } from "./types";

export type FoodIdentity = { key: string; staple: "rice" | "noodles" | "bread" | "potato" | "other" | null; protein: string | null; sourceFoodId?: string; foodLibraryId?: string };
const normalize = (value: string) => value.normalize("NFKC").trim().toLowerCase().replace(/[,，]/g, " ·").replace(/\s+/g, " ");
// Concepts describe the named food family, never its portion or nutrient data.
const conceptByName = new Map<string, (typeof foodConcepts)[number] | null>();
for (const concept of foodConcepts) for (const name of new Set([concept.names.en, concept.names.zh, ...concept.aliases].map(normalize).filter(Boolean))) {
  const previous = conceptByName.get(name);
  conceptByName.set(name, previous === undefined || previous?.id === concept.id ? concept : null);
}
type LibraryIdentityRow = readonly [string, string, string, string, string, string | null, FoodIdentity["staple"], string?];
const libraryRows: readonly LibraryIdentityRow[] = foodSourceIdentities;
const conceptById = new Map<string, (typeof foodConcepts)[number]>(foodConcepts.map(concept => [concept.id, concept]));
const normalizeSourceName = (value: string) => value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
const libraryById = new Map(libraryRows.map(row => [row[0], row]));
const libraryByName = new Map<string, LibraryIdentityRow[]>();
for (const row of libraryRows) for (const name of new Set([row[1], row[2]].map(normalizeSourceName).filter(Boolean))) libraryByName.set(name, [...(libraryByName.get(name) ?? []), row]);
export const isFoodLibraryIdentityValid = (id: string, name: string, group: string) => {
  const row = libraryById.get(id);
  return Boolean(row && row[3] === group && [row[1], row[2]].filter(Boolean).some(label => normalizeSourceName(label) === normalizeSourceName(name)));
};
const libraryIdentity = (name: string, id?: string, group?: string): FoodIdentity | null => {
  const candidates = libraryByName.get(normalizeSourceName(name)) ?? [];
  const selected = id && group && isFoodLibraryIdentityValid(id, name, group) ? libraryById.get(id) : undefined;
  const row = selected ?? (candidates.length === 1 && (!group || candidates[0][3] === group) ? candidates[0] : undefined);
  const concept = row?.[4].startsWith("concept:") ? conceptById.get(row[4].slice(8)) : undefined;
  return row ? { key: concept ? conceptCanonicalName(concept) : row[4], protein: row[5], staple: row[6], foodLibraryId: row[0] } : null;
};
const aliases: Record<string, string> = {
  "飯": "rice", "白飯": "rice", "白米飯": "rice", "米飯": "rice", "米饭": "rice", "糙米": "brown rice", "糙米飯": "brown rice", "糙米饭": "brown rice",
  "炒飯": "fried rice", "炒饭": "fried rice", "雞肉飯": "chicken rice", "鸡肉饭": "chicken rice", "粥": "congee", "稀飯": "congee", "稀饭": "congee", "白粥": "congee",
  "麵": "noodles", "面": "noodles", "麵條": "noodles", "面条": "noodles", "湯麵": "noodle soup", "汤面": "noodle soup", "烏龍麵": "udon noodles", "乌龙面": "udon noodles", "蕎麥麵": "soba noodles", "荞麦面": "soba noodles",
  "米粉": "rice noodles", "米線": "rice noodles", "米线": "rice noodles", "拉麵": "ramen noodles", "拉面": "ramen noodles", "河粉": "rice noodles", "米粉/河粉": "rice noodles", "小麥麵條": "wheat noodles", "小麦面条": "wheat noodles",
  "義大利麵": "pasta", "意大利面": "pasta", "麵包": "bread", "面包": "bread", "吐司": "toast", "燕麥": "oatmeal", "燕麦": "oatmeal", "燕麥粥": "oatmeal", "燕麦粥": "oatmeal", "貝果": "bagel", "贝果": "bagel", "捲餅": "wrap", "卷饼": "wrap", "包子/饅頭": "bao / bun", "包子/馒头": "bao / bun",
  "馬鈴薯": "potato", "马铃薯": "potato", "地瓜": "sweet potato", "番薯": "sweet potato", "藜麥": "quinoa", "藜麦": "quinoa",
  "水": "water", "白開水": "water", "白开水": "water", "氣泡水": "sparkling water", "气泡水": "sparkling water", "茶": "tea", "無糖茶": "tea", "无糖茶": "tea", "綠茶": "green tea", "绿茶": "green tea", "無糖綠茶": "green tea", "无糖绿茶": "green tea", "紅茶": "black tea", "红茶": "black tea", "無糖紅茶": "black tea", "无糖红茶": "black tea", "無咖啡因茶": "caffeine-free tea", "无咖啡因茶": "caffeine-free tea",
  "咖啡": "coffee", "黑咖啡": "coffee", "美式咖啡": "coffee", "冰咖啡": "iced coffee", "奶茶": "milk tea", "珍珠奶茶": "boba", "波霸奶茶": "boba", "手搖奶茶": "milk tea", "手摇奶茶": "milk tea",
  "汽水": "soda", "可樂": "soda", "可乐": "soda", "無糖汽水": "diet soda", "无糖汽水": "diet soda", "零卡可樂": "diet soda", "零卡可乐": "diet soda", "甜飲": "sweet drink", "甜饮": "sweet drink", "運動飲料": "sports drink", "运动饮料": "sports drink", "能量飲料": "energy drink", "能量饮料": "energy drink", "含糖飲料": "sweet drink", "含糖饮料": "sweet drink",
  "柳橙汁": "orange juice", "橙汁": "orange juice", "蘋果汁": "apple juice", "苹果汁": "apple juice", "果昔": "smoothie", "蔬果汁": "green juice", "椰子水": "coconut water", "優格飲": "yogurt drink", "优格饮": "yogurt drink", "蛋白飲": "protein shake", "蛋白饮": "protein shake",
  "啤酒": "beer", "葡萄酒": "wine", "紅酒": "wine", "红酒": "wine", "白葡萄酒": "wine", "調酒": "cocktail", "调酒": "cocktail", "酒": "alcohol", "白酒": "alcohol", "酒精飲品": "alcohol",
  "牛奶": "milk", "鮮奶": "milk", "鲜奶": "milk", "豆漿": "soy milk", "豆浆": "soy milk", "燕麥奶": "oat milk", "燕麦奶": "oat milk", "杏仁奶": "almond milk",
  "蛋糕": "cake", "杯子蛋糕": "cupcake", "布朗尼": "brownie", "甜甜圈": "donut", "起司蛋糕": "cheesecake", "乳酪蛋糕": "cheesecake", "冰淇淋": "ice cream", "雪糕": "ice cream bar", "布丁": "pudding", "餅乾": "cookies", "饼干": "cookies", "巧克力": "chocolate", "馬芬": "muffin", "玛芬": "muffin", "酥皮點心": "pastry",
  "雞肉": "chicken", "鸡肉": "chicken", "雞蛋": "egg", "鸡蛋": "egg", "蛋": "egg", "豆腐": "tofu", "天貝": "tempeh", "天贝": "tempeh", "豆類": "beans", "豆类": "beans", "鷹嘴豆": "chickpeas", "鹰嘴豆": "chickpeas", "毛豆": "edamame", "鮭魚": "salmon", "鲑鱼": "salmon", "魚": "fish", "鱼": "fish", "蝦": "shrimp", "虾": "shrimp",
};
const legacyCanonicalNames = new Set(Object.values(aliases));
const conceptCanonicalName = (concept: NonNullable<ReturnType<typeof conceptByName.get>>) =>
  [concept.names.en, ...concept.aliases].map(normalize).map(name => aliases[name] ?? name).find(name => legacyCanonicalNames.has(name)) ?? normalize(concept.names.en);
const sourceIdentity: Record<string, Omit<FoodIdentity, "sourceFoodId"> & { group: string }> = {
  "usda-168878": { key: "rice", staple: "rice", protein: null, group: "carb" },
  "usda-171477": { key: "chicken", staple: null, protein: "chicken", group: "protein" },
  "usda-175168": { key: "salmon", staple: null, protein: "fish", group: "protein" },
  "usda-174291": { key: "tofu", staple: null, protein: "soy", group: "protein" },
  "usda-173424": { key: "egg", staple: null, protein: "egg", group: "protein" },
  "usda-170457": { key: "tomato", staple: null, protein: null, group: "vegetable" },
  "usda-169967": { key: "broccoli", staple: null, protein: null, group: "vegetable" },
  "usda-173735": { key: "black beans", staple: null, protein: "pulses", group: "protein" },
  "usda-168483": { key: "sweet potato", staple: "potato", protein: null, group: "carb" },
  "usda-169238": { key: "kale", staple: null, protein: null, group: "vegetable" },
  "usda-168917": { key: "quinoa", staple: "other", protein: null, group: "carb" },
  "usda-168409": { key: "cucumber", staple: null, protein: null, group: "vegetable" },
  "usda-175180": { key: "shrimp", staple: null, protein: "shellfish", group: "protein" },
  "usda-171971": { key: "shrimp", staple: null, protein: "shellfish", group: "protein" },
  "usda-171413": { key: "olive oil", staple: null, protein: null, group: "other" },
  "usda-173468": { key: "salt", staple: null, protein: null, group: "other" },
  "usda-173647": { key: "water", staple: null, protein: null, group: "other" },
  "usda-168411": { key: "edamame", staple: null, protein: "soy", group: "protein" },
  "usda-168914": { key: "rice noodles", staple: "noodles", protein: null, group: "carb" },
  "usda-169732": { key: "egg noodles", staple: "noodles", protein: null, group: "carb" },
  "usda-168910": { key: "whole wheat pasta", staple: "noodles", protein: null, group: "carb" },
  "usda-168649": { key: "beef", staple: null, protein: "beef", group: "protein" },
  "usda-168463": { key: "spinach", staple: null, protein: null, group: "vegetable" },
  "usda-170394": { key: "carrots", staple: null, protein: null, group: "vegetable" },
  "usda-169247": { key: "romaine lettuce", staple: null, protein: null, group: "vegetable" },
  "usda-171496": { key: "turkey", staple: null, protein: "turkey", group: "protein" },
  "usda-174091": { key: "whole wheat bread", staple: "bread", protein: null, group: "carb" },
  "usda-170093": { key: "potato", staple: "potato", protein: null, group: "carb" },
  "usda-172421": { key: "lentils", staple: null, protein: "pulses", group: "protein" },
  "usda-170894": { key: "yogurt", staple: null, protein: "dairy", group: "protein" },
  "usda-173905": { key: "oatmeal", staple: "other", protein: null, group: "carb" },
  "usda-171711": { key: "blueberries", staple: null, protein: null, group: "fruit" },
  "usda-169640": { key: "honey", staple: null, protein: null, group: "other" },
  "usda-167747": { key: "lemon juice", staple: null, protein: null, group: "other" },
  "usda-169193": { key: "pork", staple: null, protein: "pork", group: "protein" },
  "usda-171956": { key: "cod", staple: null, protein: "fish", group: "protein" },
  "usda-173757": { key: "chickpeas", staple: null, protein: "pulses", group: "protein" },
  "usda-175203": { key: "white beans", staple: null, protein: "pulses", group: "protein" },
  "usda-172182": { key: "cottage cheese", staple: null, protein: "dairy", group: "protein" },
  "usda-173768": { key: "soy milk", staple: null, protein: null, group: "drink" },
  "usda-170391": { key: "bok choy", staple: null, protein: null, group: "vegetable" },
  "usda-169980": { key: "napa cabbage", staple: null, protein: null, group: "vegetable" },
  "usda-169252": { key: "mushrooms", staple: null, protein: null, group: "vegetable" },
  "usda-169976": { key: "cabbage", staple: null, protein: null, group: "vegetable" },
  "usda-170110": { key: "red bell pepper", staple: null, protein: null, group: "vegetable" },
  "usda-170001": { key: "onion", staple: null, protein: null, group: "vegetable" },
  "usda-169292": { key: "zucchini", staple: null, protein: null, group: "vegetable" },
  "usda-170050": { key: "tomato", staple: null, protein: null, group: "vegetable" },
  "usda-173944": { key: "banana", staple: null, protein: null, group: "fruit" },
  "usda-171705": { key: "avocado", staple: null, protein: null, group: "fruit" },
  "usda-169999": { key: "sweet corn", staple: null, protein: null, group: "vegetable" },
  "usda-169141": { key: "green beans", staple: null, protein: null, group: "vegetable" },
  "usda-168394": { key: "bitter melon", staple: null, protein: null, group: "vegetable" },
  "usda-171534": { key: "chicken", staple: null, protein: "chicken", group: "protein" },
  "usda-171986": { key: "tuna", staple: null, protein: "fish", group: "protein" },
  "usda-174314": { key: "lamb", staple: null, protein: "lamb", group: "protein" },
  "usda-170416": { key: "parsley", staple: null, protein: null, group: "vegetable" },
  "usda-170005": { key: "spring onion", staple: null, protein: null, group: "vegetable" },
  "usda-170152": { key: "sesame", staple: null, protein: null, group: "other" },
  "usda-173928": { key: "apple", staple: null, protein: null, group: "fruit" },
  "usda-167762": { key: "strawberry", staple: null, protein: null, group: "fruit" },
  "usda-168437": { key: "shiitake mushrooms", staple: null, protein: null, group: "vegetable" },
  "usda-169230": { key: "garlic", staple: null, protein: null, group: "vegetable" },
  "usda-170848": { key: "parmesan", staple: null, protein: "dairy", group: "protein" },
  "usda-170844": { key: "monterey jack", staple: null, protein: "dairy", group: "protein" },
  "usda-170845": { key: "mozzarella", staple: null, protein: "dairy", group: "protein" },
  "usda-171651": { key: "puffed rice", staple: "other", protein: null, group: "carb" },
  "usda-174271": { key: "soybeans", staple: null, protein: "soy", group: "protein" },
  "usda-168426": { key: "leek", staple: null, protein: null, group: "vegetable" },
  "usda-169229": { key: "eggplant", staple: null, protein: null, group: "vegetable" },
  "usda-169989": { key: "celery", staple: null, protein: null, group: "vegetable" },
  "usda-170058": { key: "turnip", staple: null, protein: null, group: "vegetable" },
  "usda-170397": { key: "cauliflower", staple: null, protein: null, group: "vegetable" },
  "usda-170420": { key: "green peas", staple: null, protein: null, group: "vegetable" },
  "usda-170932": { key: "cayenne pepper", staple: null, protein: null, group: "other" },
  "usda-171325": { key: "garlic powder", staple: null, protein: null, group: "other" },
};
const sourceByName = new Map(sourceFoods.flatMap(food => [food.label.en, food.label.zh].map(label => [normalize(label), food] as const)));
const sourceById = new Map(sourceFoods.map(food => [food.id, food]));
const sourceForName = (name: string) => sourceByName.get(normalize(name));
export const isSourceFoodIdentityValid = (sourceFoodId: string, name: string, group: string) => {
  return Boolean(sourceById.has(sourceFoodId) && sourceIdentity[sourceFoodId]?.group === group && sourceForName(name)?.id === sourceFoodId);
};
export const normalizeFoodName = (name: string) => {
  const source = sourceForName(name);
  if (source && sourceIdentity[source.id]) return sourceIdentity[source.id].key;
  const normalized = normalize(name);
  if (aliases[normalized]) return aliases[normalized];
  if (legacyCanonicalNames.has(normalized)) return normalized;
  const concept = conceptByName.get(normalized);
  return concept ? conceptCanonicalName(concept) : libraryIdentity(name)?.key ?? normalized;
};
export const resolveFoodIdentity = (name: string, sourceFoodId?: string, foodLibraryId?: string, group?: string): FoodIdentity => {
  const source = sourceFoodId && sourceForName(name)?.id === sourceFoodId ? sourceById.get(sourceFoodId) : sourceForName(name);
  if (source && sourceIdentity[source.id]) {
    const { group: _group, ...identity } = sourceIdentity[source.id];
    return { ...identity, sourceFoodId: source.id };
  }
  const concept = conceptByName.get(normalize(name));
  if (concept) return { key: normalizeFoodName(name), staple: concept.staple, protein: concept.protein };
  const library = libraryIdentity(name, foodLibraryId, group);
  if (library) return library;
  const key = normalizeFoodName(name);
  const staple = /^(rice|white rice|brown rice|fried rice|chicken rice|congee|rice porridge|porridge)$/.test(key) ? "rice"
    : /^(noodles?|pasta|udon( noodles)?|soba( noodles)?|rice noodles|wheat noodles|ramen( noodles)?|noodle soup|soft noodles)$/.test(key) ? "noodles"
      : /^(bread|toast|bagel|wrap|tortilla|whole wheat bread|bao \/ bun)$/.test(key) ? "bread"
        : /^(sweet )?potato(es)?$/.test(key) ? "potato" : /^(quinoa|oatmeal|oats)$/.test(key) ? "other" : null;
  const protein = /^(chicken|grilled chicken|rotisserie chicken|soy garlic chicken|chicken bento|chicken wrap|chicken sub|chicken fajita)$/.test(key) ? "chicken"
    : /^(egg|eggs|egg drop soup|omelet|omelette)$/.test(key) ? "egg"
      : /^(tofu|tempeh|edamame)$/.test(key) ? "soy"
        : /^(fish|salmon|baked salmon|teriyaki salmon|cod|tuna)$/.test(key) ? "fish"
          : /^(shrimp|crab|shrimp fried rice)$/.test(key) ? "shellfish"
            : /^(beans|black beans|chickpeas|lentils|hummus|vegetable black bean quesadilla)$/.test(key) ? "pulses"
              : /^(turkey|turkey sandwich)$/.test(key) ? "turkey" : /^(beef|beef bibimbap)$/.test(key) ? "beef" : /^(pork|ham|bacon)$/.test(key) ? "pork" : null;
  return { key, staple, protein };
};

export const getRecordedFoodIdentities = (meals: Array<{ protein: string[]; carbs: string[]; componentDetails?: ParsedMealComponent[] }>) => {
  const proteins = new Set<string>(), staples = new Set<string>();
  for (const meal of meals) {
    for (const name of meal.protein) { const identity = resolveFoodIdentity(name); if (identity.protein) proteins.add(identity.protein); }
    for (const name of meal.carbs) { const identity = resolveFoodIdentity(name); if (identity.staple) staples.add(identity.staple); }
    for (const item of meal.componentDetails ?? []) {
      const identity = resolveFoodIdentity(item.name, item.sourceFoodId, item.foodLibraryId, item.group);
      if (item.group === "protein" && identity.protein) proteins.add(identity.protein);
      if (item.group === "carb" && identity.staple) staples.add(identity.staple);
    }
  }
  return { proteins, staples };
};

export type ObservedFoodIdentity = FoodIdentity & {
  group: ParsedMealComponent["group"];
  /** Null when the source confirms a group but not a reviewed named-food family. */
  distinctKey: string | null;
  alcohol: boolean;
};

const alcoholConceptIds = new Set(["beer", "wine", "rice-wine", "sake", "spirits", "cocktail", "alcohol"]);
const observationForConcept = (concept: (typeof foodConcepts)[number]): ObservedFoodIdentity => ({
  key: conceptCanonicalName(concept), protein: concept.protein, staple: concept.staple,
  group: concept.group, distinctKey: conceptCanonicalName(concept), alcohol: alcoholConceptIds.has(concept.id),
});

/** Exact reviewed identities only. A typed category alone does not prove food identity. */
export const resolveObservedFoodIdentity = (
  item: Pick<ParsedMealComponent, "name" | "group" | "sourceFoodId" | "foodLibraryId">,
): ObservedFoodIdentity | null => {
  const { name, group, sourceFoodId, foodLibraryId } = item;
  const source = sourceFoodId && isSourceFoodIdentityValid(sourceFoodId, name, group)
    ? sourceById.get(sourceFoodId) : sourceForName(name);
  if (source && sourceIdentity[source.id]?.group === group) {
    const { group: _group, ...identity } = sourceIdentity[source.id];
    return { ...identity, sourceFoodId: source.id, group, distinctKey: identity.key, alcohol: false };
  }
  const candidates = (libraryByName.get(normalizeSourceName(name)) ?? []).filter(row => row[3] === group);
  const row = foodLibraryId && isFoodLibraryIdentityValid(foodLibraryId, name, group)
    ? libraryById.get(foodLibraryId) : candidates.length === 1 ? candidates[0] : undefined;
  if (row) {
    const concept = row[4].startsWith("concept:") ? conceptById.get(row[4].slice(8)) : undefined;
    const identity = concept ? observationForConcept(concept) : {
      key: row[4], protein: row[5], staple: row[6], group,
      distinctKey: row[4].startsWith("source:") ? null : row[4], alcohol: false,
    };
    return { ...identity, foodLibraryId: row[0], alcohol: row[7] === "alcohol" || identity.alcohol };
  }
  const normalized = normalize(name);
  const concept = conceptByName.get(normalized) ?? conceptByName.get(aliases[normalized] ?? normalized);
  return concept?.group === group ? observationForConcept(concept) : null;
};

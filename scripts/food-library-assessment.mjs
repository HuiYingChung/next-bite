// Versioned product interpretation of source descriptions; not USDA/TFDA model scores.
// A nutrient stays unknown unless supplied by the same source record. These rules
// only derive the NPM-specific free-sugar and FVNS inputs for explicit plain foods.
export const FOOD_LIBRARY_ASSESSMENT_VERSION = 'plain-source-rules-2026-11-04-v2';
export const modelSources = {
  model: 'https://www.gov.uk/government/publications/nutrient-profiling-model-2018/nutrient-profiling-model-2018-technical-guidance',
  fvns: 'https://www.gov.uk/government/publications/nutrient-profiling-model-2018/nutrient-profiling-model-2018-fruit-vegetables-nuts-and-seeds-definitions',
  fiber: 'https://www.ars.usda.gov/ARSUSERFILES/80400535/DATA/PUBLICATIONS/FNR/IMPLICATIONS%20OF%20TWO%20DIRRERENT%20METHODS%20FOR%20ANALYZING%20TOTAL%20DIETARY%20FIBER.PDF',
};

const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const unpreparedDrink = /\b(powder|powdered|dry|dried|concentrate|concentrated|undiluted)\b/i;
const reconstituted = /\b(prepared with|reconstituted|diluted|ready[- ]to[- ]drink)\b/i;
const processed = /\b(sauce|breaded|battered|fried|marinated|marinade|glazed|sugared|sweetened|honey|syrup|seasoned|preseasoned|basted|cured|smoked|enhanced|solution|additives|added solution|flavored|flavoured|imitation|meatless|stuffed|spread|filling|pie|salad|dressing|patties|sandwich|with gravy)\b/i;
const brokenPlant = /\b(juice|puree|pureed|purée|paste|powder|powdered|nectar|concentrate|concentrated|flour|oil|sauce|spread|butter|protein|isolate|extract|extruded|leather|liquid)\b/i;
const animalCategories = new Set(['Beef Products', 'Pork Products', 'Poultry Products', 'Lamb, Veal, and Game Products', 'Finfish and Shellfish Products']);
const raw = /(?:^|[, ])raw(?:[, (]|$)/i;
const plainCooked = /\bcooked, (?:roasted|braised|broiled|stewed|simmered|steamed|poached|dry heat|moist heat|boiled)(?:,|$)/i;
const tuber = /^(?:potato(?:es)?|sweet potato(?:es)?|yams?|mountain yam|cassava|taro|plantains?|jerusalem[- ]artichokes?|winged bean tuber)(?:,|$)/i;
// Do not extend the named FVNS definitions to unusual starchy roots or isolated
// seaweed products merely because USDA places them in the vegetable category.
const unresolvedPlantFvns = /^(?:arrowroot|arrowhead|yautia|eppaw|yambean|breadfruit|lotus root|waterchestnuts|seaweed, agar)(?:,|\s|$)/i;
const plantPercent = description => tuber.test(description) ? 0 : unresolvedPlantFvns.test(description) ? null : 100;
const plainPulse = /^(?:beans|lentils|lima beans|lupins|mothbeans|mungo beans|mung beans|peas|peanuts|pigeon peas|soybeans|winged beans|broadbeans|chickpeas|cowpeas|hyacinth beans|yardlong beans)(?:,|\s|$)/i;
const plainGrain = /^(?:rice|quinoa|oats|oat bran|barley|buckwheat|bulgur|millet|rye|sorghum|spelt|teff|triticale|wheat|wild rice|amaranth grain|corn grain)(?:,|\s|$)/i;
const wholeNuts = /^(?:Nuts, (?:almonds|brazilnuts|cashew nuts|chestnuts|hazelnuts|filberts|hickorynuts|macadamia nuts|pecans|pine nuts|pistachio nuts|walnuts|coconut meat)|Seeds, (?:flaxseed|chia seeds|sesame seeds|sesame seed kernels|sunflower seed kernels|pumpkin and squash seeds|pumpkin and squash seed kernels|poppy seed|pine nuts))(?:,|\s|$)/i;
const surveyAlcoholCategories = new Set(['Beer','Liquor and cocktails','Wine']);
const surveyDrinkCategories = new Set([
  'Milk, reduced fat','Milk, whole','Milk, lowfat','Milk, nonfat',
  'Flavored milk, whole','Flavored milk, lowfat','Flavored milk, reduced fat','Flavored milk, nonfat',
  'Plant-based milk','Milk shakes and other dairy drinks','Smoothies and grain drinks',
  'Fruit drinks','Citrus juice','Other fruit juice','Apple juice','Vegetable juice',
  'Coffee','Tea','Soft drinks','Diet soft drinks','Flavored or carbonated water','Other diet drinks',
  'Tap water','Bottled water','Enhanced water','Nutritional beverages','Sport and energy drinks','Diet sport and energy drinks',
  ...surveyAlcoholCategories,
]);

export function classifyLibraryGroup(description, category) {
  if (surveyDrinkCategories.has(category) || /飲料|Beverage|drink|Milk and milk drinks/i.test(category)) return 'drink';
  if (/Fruit|水果/i.test(category)) return 'fruit';
  if (/Vegetable|蔬菜|菇類|藻類/i.test(category)) return 'vegetable';
  if (/Beef|Pork|Poultry|Lamb|Finfish|Shellfish|Legume|肉類|魚貝|蛋類|豆類/i.test(category)) return 'protein';
  if (/Grain|Pasta|Cereal|穀物|澱粉|澱粉|薯類/i.test(category)) return 'carb';
  if (/Soup|湯/i.test(category)) return 'soup';
  if (/^Egg,|^Eggs,/.test(description)) return 'protein';
  return 'other';
}

function classifyKind(description, category, nutrients, sourceId) {
  if (/Baby Foods|Baby food:|Baby water|Baby juice|^Formula,|Human milk|嬰兒|嬰幼兒|infant|toddler/i.test(category)
    || /\binfant\b|\btoddler\b|^Milk, human(?:,|$)/i.test(description)) return 'unknown';
  if (category === 'Protein and nutritional powders') return 'unknown';
  const explicitlyNonAlcoholic = /non[- ]?alcoholic|alcohol[- ]?free|root beer|ginger beer/i.test(description);
  const drinkCategory = surveyDrinkCategories.has(category) || /Beverage|drink|飲料/i.test(category);
  // All alcoholic source drinks are outside this NPM's published scope.
  if (!explicitlyNonAlcoholic && (/^Alcoholic beverages?\b|^Beverages, Malt liquor\b/i.test(description)
    || (sourceId === 'tfda' && description === 'Draught beer; Draft beer')
    || /酒類/.test(category)
    || surveyAlcoholCategories.has(category)
    || (drinkCategory && /\b(beer|wine|sake|spirits|liqueur|cocktail)\b/i.test(description))
    || (finite(nutrients.alcohol) && nutrients.alcohol > 0 && /飲料類/.test(category)))) return 'alcohol';
  const namedJuice = sourceId === 'usda-sr' && ['Fruits and Fruit Juices','Vegetables and Vegetable Products'].includes(category) && /^[^,]+ juice(?:,|$)/i.test(description);
  const beverage = /^(?:Beverages?,|Water,|Milk,|Soymilk,)/i.test(description)
    || /^Nuts, coconut water /i.test(description) || namedJuice || drinkCategory;
  const isPrepared = reconstituted.test(description) && !/\bnot reconstituted\b|\bundiluted\b/i.test(description);
  if (beverage && unpreparedDrink.test(description) && !isPrepared) return 'unknown';
  if (beverage && !/\b(dry|dried|condensed|evaporated|powder|powdered)\b/i.test(description)) return 'drink';
  if (beverage && isPrepared) return 'drink';
  return 'food';
}

// Identity is only a coarse named-food identity for variety and explicit staple
// preference; it never stands in for a source record or a nutrient calculation.
export function sourceFoodIdentity(description, category, sourceId) {
  if (sourceId !== 'usda-sr' || processed.test(description)) return null;
  const identity = (key, protein = null, staple = null) => ({key, protein, staple});
  if (animalCategories.has(category)) {
    const animal = /^(Beef|Pork|Chicken|Turkey|Duck|Goose|Lamb|Veal|Goat|Quail|Squab)(?:,| )/i.exec(description)?.[1].toLowerCase();
    if (animal) return identity(animal === 'squab' ? 'pigeon' : animal, animal === 'squab' ? 'pigeon' : animal === 'veal' ? 'beef' : animal);
    const game = /^Game meat, (deer|rabbit|goat|bison|elk|moose|antelope|caribou|boar)(?:,| )/i.exec(description)?.[1].toLowerCase();
    if (game) return identity(game === 'deer' ? 'venison' : game, game === 'deer' ? 'venison' : game === 'boar' ? 'pork' : game);
    if (/^Fish,/.test(description)) return identity('fish', 'fish');
    const shellfish = /^(?:Crustaceans|Mollusks), ([^,]+)/i.exec(description)?.[1].toLowerCase();
    if (shellfish) return identity(shellfish, 'shellfish');
  }
  if (category === 'Dairy and Egg Products' && /^Egg(?:s)?,/.test(description)) return identity('egg', 'egg');
  if (category === 'Legumes and Legume Products') {
    if (/^(?:Soybeans|Tofu|Tempeh),/i.test(description)) return identity(/^Soybeans/i.test(description) ? 'soybeans' : /^Tofu/i.test(description) ? 'tofu' : 'tempeh', 'soy');
    if (plainPulse.test(description) && !/peanut|flour|protein|extract|liquid|noodle|vermicelli/i.test(description)) return identity('beans', 'pulses');
  }
  if (category === 'Cereal Grains and Pasta') {
    if (/^(?:Rice|Wild rice),/i.test(description)) return identity('rice', null, 'rice');
    if (/^(?:Noodles|Pasta|Spaghetti|Macaroni),/i.test(description)) return identity('noodles', null, 'noodles');
    if (/^(?:Quinoa|Oats|Millet|Barley|Bulgur|Buckwheat|Sorghum|Teff|Spelt)(?:,|$| \()/i.test(description)) return identity('grain', null, 'other');
  }
  if (category === 'Baked Products' && /^Bread,/.test(description)) return identity('bread', null, 'bread');
  if (category === 'Vegetables and Vegetable Products' && /^(?:Potatoes|Sweet potato),/i.test(description)) return identity(/^Sweet/i.test(description) ? 'sweet potato' : 'potato', null, 'potato');
  return null;
}

/** Discovery links only. The user still chooses a full named source record. */
export function conceptMatchesSource(conceptId, {description = '', category = '', sourceId}) {
  if (sourceId !== 'usda-sr') return false;
  const identity = sourceFoodIdentity(description, category, sourceId);
  if (['beef','pork','chicken','turkey','duck','goose','lamb','goat','venison','rabbit','quail','pigeon'].includes(conceptId)) return identity?.key === conceptId;
  if (conceptId === 'sheep-goat') return ['lamb','goat'].includes(identity?.key);
  if (conceptId === 'fish') return identity?.protein === 'fish';
  const fishNames = {salmon:'salmon',tuna:'tuna',cod:'cod',mackerel:'mackerel',sardine:'sardine',tilapia:'tilapia',milkfish:'milkfish',eel:'eel','sea-bass':'sea bass',grouper:'grouper',halibut:'halibut',trout:'trout',anchovy:'anchovy',saury:'saury'};
  if (fishNames[conceptId]) return description.toLowerCase().startsWith('fish, '+fishNames[conceptId]+',');
  const shellfishNames = {shrimp:'shrimp',crab:'crab',lobster:'lobster',crayfish:'crayfish',scallop:'scallop',clam:'clam',oyster:'oyster',mussel:'mussel',abalone:'abalone',squid:'squid',cuttlefish:'cuttlefish',octopus:'octopus','land-snail':'snail',whelk:'whelk'};
  const shellfish = /^(?:Crustaceans|Mollusks), ([^,]+)/i.exec(description)?.[1].toLowerCase();
  if (shellfishNames[conceptId]) return shellfish === shellfishNames[conceptId];
  if (conceptId === 'snail-unspecified') return shellfish === 'snail' || shellfish === 'whelk';
  if (conceptId === 'fresh-scallop') return shellfish === 'scallop' && raw.test(description);
  if (conceptId === 'dried-scallop') return shellfish === 'scallop' && /\bdried\b/i.test(description);
  if (conceptId === 'black-bean') return /^Beans, black(?: turtle)?(?:,| )/i.test(description);
  if (conceptId === 'black-soybean') return /^Soybeans, black(?:,| )/i.test(description);
  if (conceptId === 'chickpea') return /^Chickpeas \(garbanzo beans/i.test(description);
  if (conceptId === 'edamame') return /^Edamame,|^Soybeans, green,/i.test(description);
  if (conceptId === 'bok-choy') return /^Cabbage, chinese \(pak-choi\)/i.test(description);
  if (conceptId === 'napa-cabbage') return /^Cabbage, chinese \(pe-tsai\)/i.test(description);
  if (conceptId === 'shiitake') return /^Mushrooms, shiitake,/i.test(description);
  if (conceptId === 'enoki') return /^Mushrooms, enoki,/i.test(description);
  if (conceptId === 'oyster-mushroom') return /^Mushrooms, oyster,/i.test(description);
  if (conceptId === 'button-mushroom') return /^Mushrooms?, white,/i.test(description);
  const beverageNames = {'coffee':'coffee','black-coffee':'coffee','tea':'tea','green-tea':'tea, green','black-tea':'tea, black','oolong-tea':'tea, oolong','almond-milk':'almond milk','rice-milk':'rice milk','oat-milk':'oat milk','coconut-water':'coconut water'};
  if (beverageNames[conceptId]) return description.toLowerCase().startsWith('beverages, '+beverageNames[conceptId]+',');
  if (conceptId === 'soy-milk') return /^Soymilk,/i.test(description);
  if (conceptId === 'milk') return /^Milk,/i.test(description) && !/human|chocolate|imitation|filled|lactose|dry|dried|condensed|evaporated|powder/i.test(description);
  if (conceptId === 'water') return /^Water,/i.test(description) && !/flavor|sweet|sugar/i.test(description);
  return false;
}

/**
 * SR whole-food descriptors are used as declared standard-food specifications,
 * not laboratory ingredient lists. Scores apply only to that named state.
 * TFDA laboratory homogenization (打碎) is NOT treated as culinary pureeing.
 * TFDA/FNDDS fiber method is unknown until separately evidenced for the release.
 */
export function assessRecord({ description = '', category = '', sourceId, nutrients = {}, state = '' }) {
  const kind = classifyKind(description, category, nutrients, sourceId);
  const identity = sourceFoodIdentity(description, category, sourceId);
  const group = kind === 'drink' || kind === 'alcohol' ? 'drink' : identity?.staple ? 'carb' : identity?.protein ? 'protein' : classifyLibraryGroup(description, category);
  const fiberMethod = sourceId === 'usda-sr' ? 'AOAC-compatible' : 'unknown';
  let freeSugarsPer100g = null;
  let fvnsPercent = null;
  let rule = 'unreviewed-composition';
  let reasonEn = 'This source does not establish the free-sugar and fruit/vegetable/nut/seed composition needed by the model.';
  let reasonZh = '這筆資料尚未確認模型需要的游離糖及蔬果、堅果與種子比例。';
  const set = (id, free, fvns, en, zh) => { rule = id; freeSugarsPer100g = free; fvnsPercent = fvns; reasonEn = en; reasonZh = zh; };
  const totalSugars = finite(nutrients.totalSugars) ? nutrients.totalSugars : null;

  if (kind === 'alcohol') {
    set('outside-model-alcohol', null, null, 'Alcoholic drinks are outside the published UK NPM 2018 scope.', '酒精飲品不在已發布的 UK NPM 2018 適用範圍內。');
  } else if (kind === 'unknown') {
    set('unresolved-consumption-state', null, null, 'The consumption state or intended population requires a separate review; no food score is assigned.', '需另行確認沖調狀態或適用對象，因此不提供食品分數。');
  } else if (sourceId === 'usda-sr') {
    if (animalCategories.has(category) && !processed.test(description) && (raw.test(description) || plainCooked.test(description))) {
      set('sr-plain-animal-food', 0, 0, 'Derived from the named plain animal-food specification, with no added sugar or plant ingredients. It does not cover a marinade, coating or restaurant variation.', '依原資料所列的單純動物性食材狀態推導，無另加糖或植物配料；不適用於醃料、裹粉或餐廳變化版本。');
    } else if (category === 'Dairy and Egg Products' && /^Egg(?:s)?,/.test(description) && !processed.test(description) && (raw.test(description) || /cooked, (hard-boiled|poached|soft-boiled)/i.test(description))) {
      set('sr-plain-egg', 0, 0, 'The named plain egg has no declared free-sugar source or FVNS ingredient.', '原資料所列的單純蛋類沒有游離糖來源或蔬果、堅果與種子配料。');
    } else if ((category === 'Fruits and Fruit Juices' || category === 'Vegetables and Vegetable Products') && raw.test(description) && !processed.test(description) && !brokenPlant.test(description)) {
      set('sr-raw-intact-plant', 0, plantPercent(description), 'Derived for the named intact plant in its stated preparation state. Intrinsic sugars are not free sugars. Tubers and plantain do not qualify for FVNS; unreviewed starchy roots remain unresolved.', '依原資料所列完整植物及其製備狀態推導：內在糖不列為游離糖；薯類及大蕉不計入蔬果、堅果與種子，尚未審查的澱粉根莖比例維持未知。');
    } else if (category === 'Vegetables and Vegetable Products' && /cooked, boiled, drained, without salt/i.test(description) && !processed.test(description) && !brokenPlant.test(description) && !/mixed|combination/i.test(description)) {
      set('sr-plain-boiled-plant', 0, plantPercent(description), 'Derived for this single vegetable boiled in water and drained, without salt or other ingredients. The score belongs to its cooked state; unreviewed starchy roots retain unknown FVNS.', '依這筆單一蔬菜水煮、瀝乾且未加鹽或其他配料的資料推導；分數適用於所列熟食狀態，尚未審查的澱粉根莖比例維持未知。');
    } else if (category === 'Legumes and Legume Products' && plainPulse.test(description) && !processed.test(description) && !brokenPlant.test(description) && (raw.test(description) || /cooked, boiled, without salt/i.test(description))) {
      set('sr-plain-pulse', 0, 100, 'The named intact pulse/peanut is raw or boiled without salt. Pulses and peanuts qualify for FVNS; intrinsic sugars are not free sugars.', '原資料所列完整豆類／花生為生品或無鹽水煮品；可計入蔬果、堅果與種子，內在糖不列為游離糖。');
    } else if (category === 'Nut and Seed Products' && wholeNuts.test(description) && !processed.test(description) && !brokenPlant.test(description) && !/with salt|salted|salt added|oil roasted|oil-roasted|creamed|butter|mixed/i.test(description)) {
      set('sr-plain-nut-seed', 0, 100, 'The named whole nut or seed has no declared added sugar, oil or salt. Intrinsic sugars are not free sugars, and the intact ingredient qualifies for FVNS.', '原資料所列完整堅果或種子沒有另加糖、油或鹽；內在糖不列為游離糖，完整食材可計入蔬果、堅果與種子。');
    } else if (category === 'Cereal Grains and Pasta' && plainGrain.test(description) && !processed.test(description) && !/with (?:vegetables|meat|sauce)|dessert|pudding|pilaf|mix|noodles|pasta|malt/i.test(description)) {
      set('sr-plain-grain', 0, 0, 'Derived for the named plain cereal grain, including its specified raw, dry or cooked state. Intrinsic grain sugars are not free sugars; cereal grains do not qualify for FVNS.', '依原資料所列單純穀物及其生、乾或熟狀態推導；穀物內在糖不列為游離糖，穀物不計入蔬果、堅果與種子。');
    } else if (category === 'Fats and Oils' && /^(?:Oil,|Lard$|Shortening,)/i.test(description) && totalSugars === 0 && !/spread|dressing|with|flavor|mixture/i.test(description)) {
      set('sr-extracted-fat-reported-zero-sugar', 0, 0, 'The source reports total sugars as zero. Extracted oil/fat is not the intact fruit, vegetable, nut or seed.', '來源總糖為零；萃取油脂不等於完整蔬果、堅果或種子。');
    } else if (/^Salt, table$/.test(description)) {
      set('sr-table-salt', totalSugars === 0 ? 0 : null, 0, 'Table salt contains no qualifying FVNS. Free sugar is zero only when source total sugar is zero.', '食鹽不含合格蔬果、堅果或種子；只有來源總糖為零時，游離糖才記為零。');
    } else if (/^(?:Sugars, (?:granulated|brown|powdered)|Honey$|Syrups, maple$)/i.test(description)) {
      set('sr-sugar-honey-syrup', totalSugars, 0, 'Source total sugars count as free sugars for this named sugar, honey or syrup; no intact FVNS is present.', '所列糖、蜂蜜或糖漿的來源總糖全數計為游離糖，不含完整蔬果、堅果或種子。');
    } else if (kind === 'drink' && /^Milk,/.test(description) && /fluid|^Milk, whole,/.test(description) && !/chocolate|flavor|imitation|filled|lactose|whey|protein fortified|nonfat milk solids|malt|sweetened/i.test(description)) {
      set('sr-plain-fluid-dairy', 0, 0, 'For this plain dairy milk, naturally occurring lactose is excluded from free sugars. This rule does not cover flavoured or lactose-hydrolysed milk.', '此單純乳品天然含有的乳糖不列為游離糖；這條規則不適用於調味或乳糖水解乳品。');
    } else if (kind === 'drink' && /^Water,/.test(description) && !/sweetened|flavor|fruit|vitamin|sugar|enhanced/i.test(description)) {
      set('sr-plain-water', totalSugars, 0, 'For this non-dairy water, total sugar equals free sugar. No fruit, vegetable, nut or seed ingredient is declared.', '此非乳類飲用水的總糖等於游離糖，資料未列蔬果、堅果或種子配料。');
    } else if (kind === 'drink' && description === 'Nuts, coconut water (liquid from coconuts)') {
      set('sr-pure-coconut-water', totalSugars, 100, 'The official FVNS definition includes pure coconut water. As a non-dairy drink, all source total sugars are free sugars; this does not extend to diluted or flavoured coconut drinks.', '官方蔬果、堅果與種子定義納入純椰子水；此非乳類飲品的來源總糖全數屬游離糖，不延伸套用於稀釋或調味椰子飲料。');
    } else if (kind === 'drink' && /^Beverages, (?:coffee|tea),/i.test(description) && /brewed|prepared with (?:tap )?water/i.test(description) && !/milk|cream|whitener|flavor|juice|lemon|honey|soy|almond|coconut|oat/i.test(description)) {
      set('sr-plain-infused-drink', totalSugars, 0, 'For this coffee/tea infusion without dairy or fruit ingredients, total sugars equal free sugars. Brew water does not count as FVNS.', '此不含乳品或水果配料的咖啡／茶飲，其總糖等於游離糖；沖泡液不計為蔬果、堅果與種子。');
    } else if (kind === 'drink' && /^Beverages, carbonated, (?:cola|low calorie, cola|root beer|tonic water)/i.test(description) && !/juice|milk|cream|fruit|coconut/i.test(description)) {
      set('sr-nondairy-soft-drink', totalSugars, 0, 'For this named non-dairy soft drink without fruit ingredients, all source total sugars are free sugars, including when marketed as low calorie.', '此所列不含乳品與水果配料的汽水，來源總糖全數計為游離糖；低熱量標示不改變此規則。');
    } else if (kind === 'drink' && category === 'Fruits and Fruit Juices' && /^[^,]+ juice, raw$/i.test(description)) {
      set('sr-raw-pure-juice', totalSugars, 100, 'This explicitly raw single-fruit juice counts as FVNS; its total sugars count as free sugars. This rule does not extend to juice drinks or concentrates.', '此明確標示單一水果原汁的資料可計為蔬果比例，但總糖全數屬游離糖；不延伸套用於果汁飲料或濃縮液。');
    } else if (kind === 'drink' && (/^Soymilk,/i.test(description) || /^Beverages, (?:almond milk|rice milk|oat milk)/i.test(description)) && !/dairy|whey|cow/i.test(description)) {
      set('sr-plant-drink-fvns-unresolved', totalSugars, null, 'All sugars in this non-dairy drink are free sugars, even if unsweetened. The original plant proportion is not established, so no complete score is assigned.', '非乳類植物飲品的所有糖都屬游離糖，即使標示無加糖亦同；原植物比例尚未確認，因此不提供完整分數。');
    }
  }

  // A reported zero establishes a zero sugar upper bound without inventing an
  // ingredient list. It never resolves unknown FVNS or the fiber method.
  if (kind !== 'alcohol' && kind !== 'unknown' && freeSugarsPer100g === null && totalSugars === 0) {
    freeSugarsPer100g = 0;
    reasonEn += ' Source total sugars are zero, so free sugars are also zero; other missing inputs remain unknown.';
    reasonZh += ' 來源總糖為零，因此游離糖亦為零；其他缺少的輸入值仍維持未知。';
  }
  if (fiberMethod === 'AOAC-compatible') {
    reasonEn += ' Fiber uses the documented SR Legacy AOAC database-method basis, not a claim that each value was individually assayed.';
    reasonZh += ' 膳食纖維依 SR Legacy 已記載的 AOAC 資料庫方法判定，不代表每筆數值都由個別檢驗取得。';
  } else {
    reasonEn += ' The source-release fiber method has not been verified for this import.';
    reasonZh += ' 此次匯入尚未核實該資料版本的膳食纖維測量方法。';
  }
  return { kind, group, identity, freeSugarsPer100g, fvnsPercent, fiberMethod, rule,
    notes: { en: reasonEn, zh: reasonZh },
    sourceUrls: [modelSources.model, modelSources.fvns, ...(fiberMethod === 'AOAC-compatible' ? [modelSources.fiber] : [])] };
}

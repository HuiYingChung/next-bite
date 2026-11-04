import type { Locale, MealOption, ParsedMealComponent } from "./types";

type CatalogPresentation = {
  title: string;
  components: string[];
};

// Components name only what is explicit in the catalog title. They are a
// shopping/ordering starting point, not a complete recipe or an allergy check.
const catalogPresentation: Record<string, CatalogPresentation> = {
  "salmon-rice-bowl-veg": {
    title: "鮭魚蔬菜飯碗",
    components: ["Salmon", "Rice", "Vegetables"],
  },
  "grilled-chicken-plate-rice-greens": {
    title: "烤雞佐白飯與青菜",
    components: ["Grilled chicken", "Rice", "Greens"],
  },
  "tofu-vegetable-rice-bowl": {
    title: "豆腐蔬菜飯碗",
    components: ["Tofu", "Vegetables", "Rice"],
  },
  "miso-fish-set-veg": {
    title: "味噌魚肉蔬菜套餐",
    components: ["Fish", "Miso", "Vegetables"],
  },
  "shrimp-quinoa-bowl": {
    title: "鮮蝦藜麥碗",
    components: ["Shrimp", "Quinoa"],
  },
  "chicken-broccoli-rice-bowl": {
    title: "雞肉花椰菜飯碗",
    components: ["Chicken", "Broccoli", "Rice"],
  },
  "tofu-vegetable-soup-rice": {
    title: "豆腐蔬菜湯配飯",
    components: ["Tofu", "Vegetables", "Rice"],
  },
  "chicken-noodle-soup-greens": {
    title: "雞肉青菜湯麵",
    components: ["Chicken", "Noodles", "Greens"],
  },
  "steamed-fish-rice-bokchoy": {
    title: "清蒸魚佐白飯與青江菜",
    components: ["Fish", "Rice", "Bok choy"],
  },
  "egg-tomato-rice": {
    title: "番茄雞蛋蓋飯",
    components: ["Egg", "Tomato", "Rice"],
  },
  "congee-egg-side-veg": {
    title: "白粥佐雞蛋與蔬菜",
    components: ["Congee", "Egg", "Vegetables"],
  },
  "miso-tofu-soup-rice": {
    title: "味噌豆腐湯配飯",
    components: ["Miso", "Tofu", "Rice"],
  },
  "chicken-wrap-salad": {
    title: "雞肉捲餅配沙拉",
    components: ["Chicken wrap", "Salad"],
  },
  "poke-bowl": { title: "波奇碗", components: ["Poke bowl"] },
  "turkey-sandwich-side-salad": {
    title: "火雞肉三明治配沙拉",
    components: ["Turkey sandwich", "Salad"],
  },
  "rotisserie-chicken-microwave-veg": {
    title: "熟食烤雞配玉米與四季豆",
    components: ["Rotisserie chicken", "Corn", "Green beans"],
  },
  "soba-salad-egg": {
    title: "蕎麥麵沙拉佐雞蛋",
    components: ["Soba noodles", "Salad", "Egg"],
  },
  "ready-made-soup-dumplings-veg": {
    title: "即食湯包配蔬菜",
    components: ["Ready-made soup dumplings", "Vegetables"],
  },
  "beef-bibimbap-extra-veg": {
    title: "牛肉韓式拌飯加蔬菜",
    components: ["Beef bibimbap", "Vegetables"],
  },
  "teriyaki-salmon-bowl": {
    title: "照燒鮭魚碗",
    components: ["Teriyaki salmon"],
  },
  "taiwanese-bento-light": {
    title: "台式雞肉便當配兩樣蔬菜",
    components: ["Chicken bento", "Two vegetable sides"],
  },
  "udon-soup-lean-protein": {
    title: "烏龍湯麵佐蛋白質食材",
    components: ["Udon noodles", "Lean protein"],
  },
  "burrito-bowl-beans-veg": {
    title: "墨西哥豆類蔬菜碗",
    components: ["Burrito bowl", "Beans", "Vegetables"],
  },
  "chicken-caesar-wrap-light": {
    title: "凱薩雞肉捲餅配水果",
    components: ["Chicken Caesar wrap", "Fruit"],
  },
  "kimchi-tofu-rice-bowl": {
    title: "泡菜豆腐飯碗",
    components: ["Kimchi", "Tofu", "Rice"],
  },
  "tofu-egg-protein-bowl": { title: "豆腐雞蛋碗", components: ["Tofu", "Egg"] },
  "bean-veggie-rice-bowl": {
    title: "豆類蔬菜飯碗",
    components: ["Beans", "Vegetables", "Rice"],
  },
  "grilled-chicken-sweet-potato-plate": {
    title: "烤雞地瓜餐盤",
    components: ["Grilled chicken", "Sweet potato"],
  },
  "salmon-edamame-bowl": {
    title: "鮭魚毛豆碗",
    components: ["Salmon", "Edamame"],
  },
  "vegetable-omelet-toast-fruit": {
    title: "蔬菜蛋捲配吐司與水果",
    components: ["Vegetable omelet", "Toast", "Fruit"],
  },
  "lean-beef-vegetable-noodle-soup": {
    title: "瘦牛肉蔬菜湯麵",
    components: ["Lean beef", "Vegetables", "Noodles"],
  },
  "rotisserie-chicken-rice-salad": {
    title: "熟食烤雞配飯與沙拉",
    components: ["Rotisserie chicken", "Rice", "Salad"],
  },
  "trader-joes-soup-salad": {
    title: "湯品沙拉組合",
    components: ["Soup", "Salad"],
  },
  "turkey-chili-rice-bowl": {
    title: "火雞肉辣豆醬飯碗",
    components: ["Turkey chili", "Rice"],
  },
  "pho-lean-beef-herbs": {
    title: "瘦牛肉越南河粉佐香草",
    components: ["Pho", "Lean beef", "Herbs"],
  },
  "mediterranean-chicken-plate": {
    title: "地中海風味雞肉餐盤",
    components: ["Mediterranean chicken"],
  },
  "falafel-salad-rice": {
    title: "鷹嘴豆丸沙拉皮塔餅餐盤",
    components: ["Falafel", "Salad", "Pita"],
  },
  "costco-salmon-sweet-potato-veg": {
    title: "烤鮭魚配地瓜與蔬菜",
    components: ["Baked salmon", "Sweet potato", "Vegetables"],
  },
  "mapo-tofu-light-rice": {
    title: "麻婆豆腐配飯與小黃瓜沙拉",
    components: ["Mapo tofu", "Rice", "Cucumber salad"],
  },
  "beef-tomato-rice-bowl": {
    title: "牛肉番茄飯碗",
    components: ["Beef", "Tomato", "Rice"],
  },
  "taiwanese-minced-pork-rice-light": {
    title: "台式肉燥飯配滷青菜",
    components: ["Taiwanese minced pork rice", "Braised greens"],
  },
  "japanese-curry-light-set": {
    title: "日式雞肉咖哩配高麗菜沙拉",
    components: ["Japanese chicken curry", "Cabbage salad"],
  },
  "tuna-mayo-onigiri-side-soup": {
    title: "飯糰配湯與水果",
    components: ["Onigiri", "Soup", "Fruit"],
  },
  "avocado-egg-toast-soup": {
    title: "酪梨雞蛋吐司配湯",
    components: ["Avocado", "Egg", "Toast", "Soup"],
  },
  "greek-yogurt-granola-fruit-bowl": {
    title: "希臘優格穀麥水果碗",
    components: ["Greek yogurt", "Granola", "Fruit"],
  },
  "cottage-cheese-fruit-toast-plate": {
    title: "茅屋起司佐水果與吐司",
    components: ["Cottage cheese", "Fruit", "Toast"],
  },
  "edamame-noodle-salad": {
    title: "毛豆麵沙拉",
    components: ["Edamame", "Noodles", "Salad"],
  },
  "chicken-sub-soup-combo": {
    title: "雞肉潛艇堡配湯",
    components: ["Chicken sub", "Soup"],
  },
  "shrimp-fried-rice-light-veg": {
    title: "蝦仁炒飯加蔬菜",
    components: ["Shrimp fried rice", "Vegetables"],
  },
  "tofu-kale-quinoa-bowl": {
    title: "豆腐羽衣甘藍藜麥碗",
    components: ["Tofu", "Kale", "Quinoa"],
  },
  "egg-drop-soup-dumpling-side-veg": {
    title: "蛋花湯配餃子與青菜",
    components: ["Egg drop soup", "Dumplings", "Greens"],
  },
  "gyro-bowl-rice-salad": {
    title: "希臘烤肉飯碗配沙拉",
    components: ["Gyro", "Rice", "Salad"],
  },
  "turkey-avocado-sandwich-soup": {
    title: "火雞肉酪梨三明治配湯",
    components: ["Turkey sandwich", "Avocado", "Soup"],
  },
  "chicken-fajita-bowl": {
    title: "墨西哥法士達雞肉碗",
    components: ["Chicken fajita"],
  },
  "soy-garlic-chicken-rice-cabbage": {
    title: "醬油蒜香雞配飯與高麗菜",
    components: ["Soy garlic chicken", "Rice", "Cabbage"],
  },
  "tofu-mushroom-udon-soup": {
    title: "豆腐菇菇烏龍湯麵",
    components: ["Tofu", "Mushrooms", "Udon noodles"],
  },
  "canned-soup-toast-egg": {
    title: "罐頭湯配吐司與雞蛋",
    components: ["Canned soup", "Toast", "Egg"],
  },
  "baked-salmon-bagged-salad-potato": {
    title: "烤鮭魚配袋裝沙拉與馬鈴薯",
    components: ["Baked salmon", "Bagged salad", "Potato"],
  },
  "hummus-chicken-wrap-fruit": {
    title: "鷹嘴豆泥雞肉捲餅配水果",
    components: ["Hummus", "Chicken wrap", "Fruit"],
  },
  "veggie-black-bean-quesadilla-salad": {
    title: "蔬菜黑菜豆墨西哥起司餅配沙拉",
    components: ["Vegetable black bean quesadilla", "Salad"],
  },
  "scallion-egg-tofu-rice-bowl": {
    title: "蔥香雞蛋豆腐飯碗",
    components: ["Scallion", "Egg", "Tofu", "Rice"],
  },
  "soba-tofu-bento": {
    title: "蕎麥麵豆腐便當",
    components: ["Soba noodles", "Tofu"],
  },
  "chicken-cabbage-dumpling-soup": {
    title: "雞肉高麗菜餃子湯",
    components: ["Chicken and cabbage dumplings"],
  },
  "ginger-chicken-rice-soup": {
    title: "薑香雞肉湯飯",
    components: ["Ginger", "Chicken", "Rice"],
  },
  "tofu-mushroom-congee": {
    title: "豆腐菇菇粥",
    components: ["Tofu", "Mushrooms", "Congee"],
  },
  "salmon-miso-porridge": {
    title: "鮭魚味噌粥",
    components: ["Salmon", "Miso", "Porridge"],
  },
  "soft-noodle-soup-egg-greens": {
    title: "軟麵湯佐雞蛋與青菜",
    components: ["Soft noodles", "Egg", "Greens"],
  },
  "steamed-fish-vegetable-plate": {
    title: "清蒸鱈魚配菇類與大白菜",
    components: ["Cod", "Mushrooms", "Napa cabbage"],
  },
  "tofu-greens-soup-small-rice": {
    title: "豆腐青菜湯配小碗飯",
    components: ["Tofu", "Greens", "Small rice"],
  },
  "chicken-salad-grain-bowl-light": {
    title: "雞肉沙拉穀物碗佐檸檬醬",
    components: ["Chicken", "Salad", "Grains", "Lemon dressing"],
  },
  "miso-tofu-spinach-bowl": {
    title: "味噌豆腐菠菜碗",
    components: ["Miso", "Tofu", "Spinach"],
  },
  "frozen-dumplings-bok-choy": {
    title: "冷凍餃子配青江菜",
    components: ["Frozen dumplings", "Bok choy"],
  },
  "greek-yogurt-fruit-granola-bowl": {
    title: "隔夜燕麥佐希臘優格與莓果",
    components: ["Overnight oats", "Greek yogurt", "Berries"],
  },
  "beef-tomato-noodle-soup": {
    title: "番茄牛肉湯麵",
    components: ["Beef", "Tomato", "Noodles"],
  },
  "egg-tofu-congee": {
    title: "雞蛋豆腐粥",
    components: ["Egg", "Tofu", "Congee"],
  },
  "chicken-ginger-noodle-soup": {
    title: "薑香雞肉湯麵",
    components: ["Chicken", "Ginger", "Noodles"],
  },
  "warm-soba-broth-set": {
    title: "熱湯蕎麥麵套餐",
    components: ["Soba noodles", "Broth"],
  },
  "soy-milk-oatmeal-egg-fruit": {
    title: "豆漿燕麥配雞蛋與水果",
    components: ["Soy milk", "Oatmeal", "Egg", "Fruit"],
  },
  "taiwanese-three-cup-chicken-light-set": {
    title: "三杯雞配飯與青菜",
    components: ["Three cup chicken", "Rice", "Greens"],
  },
  "taiwanese-shredded-chicken-rice-veg": {
    title: "台式雞絲飯配蔬菜",
    components: ["Shredded chicken", "Rice", "Vegetables"],
  },
  "korean-soft-tofu-soup-rice": {
    title: "韓式嫩豆腐湯配飯",
    components: ["Korean soft tofu soup", "Rice"],
  },
  "dak-galbi-light-bowl": {
    title: "韓式辣炒雞肉碗配高麗菜",
    components: ["Dak-galbi chicken", "Cabbage"],
  },
  "chicken-taco-rice-bowl": {
    title: "墨西哥塔可雞肉飯碗",
    components: ["Taco chicken", "Rice"],
  },
  "shrimp-fajita-plate": {
    title: "墨西哥法士達鮮蝦餐盤",
    components: ["Shrimp fajita"],
  },
  "mediterranean-salmon-plate": {
    title: "地中海風味鮭魚餐盤",
    components: ["Mediterranean salmon"],
  },
  "chicken-shawarma-rice-bowl": {
    title: "沙威瑪雞肉飯碗",
    components: ["Chicken shawarma", "Rice"],
  },
  "turkey-pesto-sandwich-salad": {
    title: "青醬火雞肉三明治配沙拉",
    components: ["Turkey sandwich", "Pesto", "Salad"],
  },
  "ginger-tofu-cabbage-rice-bowl": {
    title: "薑香豆腐高麗菜飯碗",
    components: ["Ginger", "Tofu", "Cabbage", "Rice"],
  },
  "chicken-zucchini-pasta-light": {
    title: "番茄醬雞肉櫛瓜義大利麵",
    components: ["Chicken", "Zucchini", "Pasta", "Tomato sauce"],
  },
  "spinach-egg-breakfast-wrap": {
    title: "菠菜雞蛋早餐捲餅",
    components: ["Spinach", "Egg", "Breakfast wrap"],
  },
  "taiwanese-turkey-rice-plate": {
    title: "台式火雞肉飯餐盤",
    components: ["Taiwanese turkey rice"],
  },
  "bean-cheese-veg-quesadilla-light": {
    title: "豆類蔬菜墨西哥起司餅佐莎莎醬",
    components: ["Bean and vegetable quesadilla", "Salsa"],
  },
  "salmon-cucumber-rice-set": {
    title: "鮭魚小黃瓜飯套餐",
    components: ["Salmon", "Cucumber", "Rice"],
  },
  "chicken-kale-white-bean-soup": {
    title: "雞肉羽衣甘藍白豆湯",
    components: ["Chicken", "Kale", "White beans"],
  },
  "tofu-broccoli-udon-bowl": {
    title: "豆腐花椰菜烏龍麵碗",
    components: ["Tofu", "Broccoli", "Udon noodles"],
  },
  "rotisserie-chicken-bagged-salad-wrap": {
    title: "熟食烤雞沙拉捲餅",
    components: ["Rotisserie chicken", "Salad wrap"],
  },
  "pork-chive-dumpling-soup-light": {
    title: "豬肉韭菜餃子湯配青江菜",
    components: ["Pork and chive dumplings", "Bok choy"],
  },
  "lentil-roasted-veg-bowl": {
    title: "扁豆烤蔬菜碗",
    components: ["Lentils", "Roasted vegetables"],
  },
  "bitter-melon-egg-rice-plate": {
    title: "苦瓜雞蛋飯餐盤",
    components: ["Bitter melon", "Egg", "Rice"],
  },
  "black-bean-chicken-bitter-melon": {
    title: "豆豉苦瓜雞肉",
    components: ["Black bean chicken", "Bitter melon"],
  },
};

const zhLabels: Record<string, string> = {
  Breakfast: "早餐",
  Lunch: "午餐",
  Dinner: "晚餐",
  "Snacks / Drinks": "點心／飲料",
  "Home-cooked": "自煮",
  "home-cooked": "自煮",
  Takeout: "外帶",
  takeout: "外帶",
  Restaurant: "餐廳",
  "Ready-made": "即食食品",
  "Stir-fried": "拌炒",
  Grilled: "烤製",
  Steamed: "清蒸",
  Boiled: "水煮",
  Fried: "油炸",
  "Soup / stew": "湯品／燉煮",
  "Raw / cold": "生食／冷食",
  Other: "其他",
  Small: "小份",
  Medium: "中份",
  Large: "大份",
  low: "低",
  medium: "中",
  high: "高",
  light: "清淡",
  heavy: "厚重",
  limited: "有限",
  "Fried food": "油炸食物",
  Dairy: "乳製品",
  Peanuts: "花生",
  "Tree nuts": "堅果",
  Sesame: "芝麻",
  Soy: "黃豆",
  "Wheat / gluten": "小麥／麩質",
  Beef: "牛肉",
  Pork: "豬肉",
  Lamb: "羊肉",
  "Organ meats": "內臟",
  Cilantro: "香菜",
  Celery: "芹菜",
  "Bitter melon": "苦瓜",
  Eggplant: "茄子",
  Okra: "秋葵",
  "Green bell pepper": "青椒",
  "Spicy food": "辛辣食物",
  Shellfish: "甲殼類／貝類",
  "Fishy seafood": "腥味較重的海鮮",
  "Raw food": "生食",
  "Cold food": "冷食",
  "Sweet drinks": "含糖飲料",
  Caffeine: "咖啡因",
  "Alcohol drinks": "酒精飲品",
  "Processed food": "加工食品",
  "Large portions": "大份量",
  "Late-night heavy meals": "深夜厚重餐點",
  Egg: "雞蛋",
  "Chinese-style": "中式",
  "Taiwanese-style": "台式",
  Japanese: "日式",
  Korean: "韓式",
  "American light meals": "美式輕食",
  "Bowl meals": "碗餐",
  "Set meals": "套餐",
  "Wraps / sandwiches": "捲餅／三明治",
  "Portable meals": "方便攜帶",
  "Soupy meals": "湯麵／湯飯",
  "Rice-based meals": "米飯類",
  "Noodle-based meals": "麵食類",
  "High-protein": "蛋白質較多",
  "Light meals": "清淡餐點",
  "Warm meals": "熱食",
  "Comfort meals": "暖心家常餐",
  "Quick grocery meals": "超市快速組餐",
  "Takeout-friendly": "適合外帶",
  "Vegetable-forward": "蔬菜較多",
  "Breakfast-for-dinner": "早餐當晚餐",
  "Plant-protein": "植物性蛋白質",
  "Coffee / caffeine": "咖啡／咖啡因",
  Tea: "茶",
  "Simple drinks": "簡單飲品",
  "Juices / smoothies": "果汁／果昔",
  Mediterranean: "地中海風味",
  "Mexican-inspired": "墨西哥風味",
  Taiwanese: "台式",
  Chinese: "中式",
  "Mexican / Latin": "墨西哥／拉丁風味",
  "American everyday": "美式日常餐",
  "Mixed everyday": "多元日常餐",
  "Best Match": "最符合目前條件",
  "Best Balance": "食物類別較均衡",
  "Most Convenient": "最省事",
  Normal: "一般",
  "Want something warm": "想吃熱的",
  "Need something light": "想清淡一點",
  "Low energy": "沒力氣準備",
  "On period": "生理期",
  "Mostly home-cooked": "偏好自煮",
  "Mostly takeout": "偏好外食",
  Both: "自煮或外食",
  Low: "低",
  Moderate: "中等",
  Active: "活動量較高",
  protein: "蛋白質食材",
  vegetable: "蔬菜",
  vegetables: "蔬菜",
  carb: "主食",
  carbs: "主食",
  fruit: "水果",
  soup: "湯品",
  drink: "飲品",
  other: "其他",
  g: "克",
  ml: "毫升",
  serving: "份",
  portion: "份",
  cup: "杯",
  bowl: "碗",
  plate: "盤",
  piece: "個",
  slice: "片",
  tablespoon: "大匙",
  teaspoon: "小匙",
  handful: "把",
  glass: "杯",
  can: "罐",
  bottle: "瓶",
  Unspecified: "未說明",
  unspecified: "未說明",
  exact: "已確認",
  approximate: "約略",
  "rule-score": "規則點數合計",
  "weekly-perspective": "近期紀錄權重",
  "feel-priority": "當下想法優先程度",
  "meal-type": "餐型配對",
  "balance-focus": "食物類別與餐點風格",
  "weekly-pattern": "近期紀錄",
  "preference-temper": "偏好權重",
  "hard-avoid": "必須避開檢查",
  variety: "當天餐點變化",
  steadiness: "餐點風格調整",
  "convenience-focus": "便利程度權重",
  "declared-convenience": "餐型便利程度",
  "portable-format": "攜帶與外帶便利性",
  "balance-guard": "食物類別配對權重",
  "reasonable-balance": "食物類別配對檢查",
  "fairness-exposure": "餐點輪替",
  "format-diversity": "餐型變化",
};

const englishLabels: Record<string, string> = {
  "rule-score": "Rule points",
  "weekly-perspective": "Recent-record weight",
  "feel-priority": "Current mood priority",
  "meal-type": "Meal-style fit",
  "balance-focus": "Food-group and meal-style fit",
  "weekly-pattern": "Recent records",
  "preference-temper": "Preference weight",
  "hard-avoid": "Must-avoid check",
  variety: "Same-day variety",
  steadiness: "Meal-style adjustment",
  "convenience-focus": "Convenience weight",
  "declared-convenience": "Catalog convenience",
  "portable-format": "Portable and takeout fit",
  "balance-guard": "Food-group fit weight",
  "reasonable-balance": "Food-group fit check",
  "fairness-exposure": "Catalog rotation",
  "format-diversity": "Meal-format variety",
};

const zhFoods: Record<string, string> = {
  Chicken: "雞肉",
  Turkey: "火雞肉",
  "Chicken sausage": "雞肉香腸",
  Beef: "牛肉",
  Pork: "豬肉",
  Ham: "火腿",
  Bacon: "培根",
  Fish: "魚肉",
  Salmon: "鮭魚",
  Tuna: "鮪魚",
  Cod: "鱈魚",
  Shrimp: "蝦",
  Crab: "蟹",
  Tofu: "豆腐",
  Tempeh: "天貝",
  Egg: "雞蛋",
  "Greek yogurt": "希臘優格",
  "Cottage cheese": "茅屋起司",
  Beans: "豆類",
  "Black beans": "黑菜豆（非黑大豆）",
  Chickpeas: "鷹嘴豆",
  Edamame: "毛豆",
  "Leafy greens": "葉菜",
  Greens: "青菜",
  Vegetables: "蔬菜",
  Spinach: "菠菜",
  Romaine: "蘿蔓生菜",
  Kale: "羽衣甘藍",
  Broccoli: "花椰菜",
  Cauliflower: "白花椰菜",
  "Brussels sprouts": "抱子甘藍",
  Cabbage: "高麗菜",
  "Napa cabbage": "大白菜",
  "Bok choy": "青江菜",
  Mushrooms: "菇類",
  Tomato: "番茄",
  Cucumber: "小黃瓜",
  Carrot: "紅蘿蔔",
  "Bell pepper": "甜椒",
  Zucchini: "櫛瓜",
  Asparagus: "蘆筍",
  "Green beans": "四季豆",
  "Snap peas": "甜豆",
  Corn: "玉米",
  Onion: "洋蔥",
  "Sweet onion": "甜洋蔥",
  Celery: "芹菜",
  Avocado: "酪梨",
  "Mixed vegetables": "綜合蔬菜",
  Seaweed: "海帶／海苔",
  Rice: "米飯",
  "Brown rice": "糙米飯",
  "Jasmine rice": "茉莉香米",
  "Rice noodles": "米粉／河粉",
  Noodles: "麵條",
  "Wheat noodles": "小麥麵條",
  Pasta: "義大利麵",
  Bread: "麵包",
  Bagel: "貝果",
  Wrap: "捲餅",
  Tortilla: "墨西哥薄餅",
  Oatmeal: "燕麥粥",
  Granola: "穀麥",
  Cereal: "早餐穀片",
  "Sweet potato": "地瓜",
  Potato: "馬鈴薯",
  "Mashed potato": "馬鈴薯泥",
  Quinoa: "藜麥",
  Farro: "法羅麥",
  Couscous: "庫斯庫斯",
  Crackers: "蘇打餅／脆餅",
  Toast: "吐司",
  Congee: "粥",
  Porridge: "粥",
  "Bao / bun": "包子／饅頭",
  Fruit: "水果",
  Berries: "莓果",
  Strawberries: "草莓",
  Blueberries: "藍莓",
  Banana: "香蕉",
  Apple: "蘋果",
  Orange: "柳橙",
  Mandarin: "橘子",
  Grapes: "葡萄",
  Watermelon: "西瓜",
  Cantaloupe: "哈密瓜",
  Pineapple: "鳳梨",
  Mango: "芒果",
  Kiwi: "奇異果",
  Peach: "桃子",
  Pear: "梨子",
  Plum: "李子",
  Cherries: "櫻桃",
  Grapefruit: "葡萄柚",
  Soup: "湯品",
  Broth: "湯底",
  "Soup broth": "湯底",
  "Miso soup": "味噌湯",
  "Tomato soup": "番茄湯",
  "Seaweed soup": "海帶湯",
  "Bone broth": "骨湯",
  "Vegetable soup": "蔬菜湯",
  "Chicken soup": "雞湯",
  "Tofu soup": "豆腐湯",
  "Corn soup": "玉米湯",
  "Hot and sour soup": "酸辣湯",
  "Clam soup": "蛤蜊湯",
  Water: "水",
  "Sparkling water": "氣泡水",
  "Caffeine-free tea": "無咖啡因茶",
  Tea: "茶",
  "Green tea": "綠茶",
  "Black tea": "紅茶",
  Coffee: "咖啡",
  "Iced coffee": "冰咖啡",
  Milk: "牛奶",
  "Soy milk": "豆漿",
  "Oat milk": "燕麥奶",
  "Almond milk": "杏仁奶",
  "Yogurt drink": "優格飲",
  "Protein shake": "蛋白飲",
  Smoothie: "果昔",
  "Green juice": "蔬果汁",
  "Orange juice": "柳橙汁",
  "Apple juice": "蘋果汁",
  "Coconut water": "椰子水",
  Soda: "汽水",
  "Diet soda": "無糖汽水",
  "Sweet drink": "含糖飲料",
  "Sports drink": "運動飲料",
  "Energy drink": "能量飲料",
  "Milk tea": "奶茶",
  Boba: "珍珠奶茶",
  Beer: "啤酒",
  Wine: "葡萄酒",
  Cocktail: "調酒",
  Alcohol: "酒精飲品",
  "Grilled chicken": "烤雞肉",
  "Chicken wrap": "雞肉捲餅",
  Salad: "沙拉",
  "Poke bowl": "波奇碗",
  "Turkey sandwich": "火雞肉三明治",
  "Rotisserie chicken": "熟食烤雞",
  "Soba noodles": "蕎麥麵",
  "Ready-made soup dumplings": "即食湯包",
  "Beef bibimbap": "牛肉韓式拌飯",
  "Teriyaki salmon": "照燒鮭魚",
  "Chicken bento": "雞肉便當",
  "Two vegetable sides": "兩樣蔬菜配菜",
  "Udon noodles": "烏龍麵",
  "Lean protein": "脂肪較少的蛋白質食材",
  "Burrito bowl": "墨西哥碗餐",
  "Chicken Caesar wrap": "凱薩雞肉捲餅",
  Kimchi: "泡菜",
  "Vegetable omelet": "蔬菜蛋捲",
  "Lean beef": "瘦牛肉",
  "Turkey chili": "火雞肉辣豆醬",
  Pho: "越南河粉",
  Herbs: "香草",
  "Mediterranean chicken": "地中海風味雞肉",
  Falafel: "鷹嘴豆丸",
  Pita: "皮塔餅",
  "Baked salmon": "烤鮭魚",
  "Mapo tofu": "麻婆豆腐",
  "Cucumber salad": "小黃瓜沙拉",
  "Taiwanese minced pork rice": "台式肉燥飯",
  "Braised greens": "滷青菜",
  "Japanese chicken curry": "日式雞肉咖哩",
  "Cabbage salad": "高麗菜沙拉",
  Onigiri: "飯糰",
  "Chicken sub": "雞肉潛艇堡",
  "Shrimp fried rice": "蝦仁炒飯",
  "Egg drop soup": "蛋花湯",
  Dumplings: "餃子",
  Gyro: "希臘烤肉",
  "Chicken fajita": "法士達雞肉",
  "Soy sauce": "醬油",
  "Soy garlic chicken": "醬油蒜香雞",
  Garlic: "蒜頭",
  "Canned soup": "罐頭湯",
  "Bagged salad": "袋裝沙拉",
  Hummus: "鷹嘴豆泥",
  "Vegetable black bean quesadilla": "蔬菜黑菜豆墨西哥起司餅",
  Scallion: "青蔥",
  "Chicken and cabbage dumplings": "雞肉高麗菜餃子",
  Ginger: "薑",
  "Soft noodles": "軟麵條",
  "Small rice": "小碗飯",
  Grains: "穀物",
  "Lemon dressing": "檸檬醬",
  Miso: "味噌",
  "Frozen dumplings": "冷凍餃子",
  "Overnight oats": "隔夜燕麥",
  "Three cup chicken": "三杯雞",
  "Shredded chicken": "雞絲",
  "Korean soft tofu soup": "韓式嫩豆腐湯",
  "Dak-galbi chicken": "韓式辣炒雞肉",
  "Taco chicken": "塔可風味雞肉",
  "Shrimp fajita": "法士達鮮蝦",
  "Mediterranean salmon": "地中海風味鮭魚",
  "Chicken shawarma": "沙威瑪雞肉",
  Pesto: "青醬",
  "Tomato sauce": "番茄醬",
  "Breakfast wrap": "早餐捲餅",
  "Taiwanese turkey rice": "台式火雞肉飯",
  "Bean and vegetable quesadilla": "豆類蔬菜墨西哥起司餅",
  Salsa: "莎莎醬",
  "White beans": "白豆",
  "Salad wrap": "沙拉捲餅",
  "Pork and chive dumplings": "豬肉韭菜餃子",
  Lentils: "扁豆",
  "Roasted vegetables": "烤蔬菜",
  "Bitter melon": "苦瓜",
  "Black bean chicken": "豆豉雞肉",
};

const lowerCaseFoods = new Map(
  Object.entries(zhFoods).map(([key, value]) => [key.toLowerCase(), value]),
);

/** Translates known display values only; never changes stored English keys. */
export const label = (value: string, locale: Locale): string => {
  if (locale === "en") return englishLabels[value] ?? value;
  return (
    zhLabels[value] ??
    zhFoods[value] ??
    lowerCaseFoods.get(value.toLowerCase()) ??
    value
  );
};

/** Exact known food names can be translated; unknown free text stays untouched. */
export const translateFood = (value: string, locale: Locale): string => {
  if (locale === "en") return value;
  return zhFoods[value] ?? lowerCaseFoods.get(value.toLowerCase()) ?? value;
};

export const mealTitle = (
  meal: Pick<MealOption, "id" | "title">,
  locale: Locale,
): string =>
  locale === "zh"
    ? (catalogPresentation[meal.id]?.title ?? meal.title)
    : meal.title;

const namedComponentGroups: Partial<
  Record<ParsedMealComponent["group"], readonly string[]>
> = {
  protein: [
    "Chicken",
    "Turkey",
    "Chicken sausage",
    "Beef",
    "Pork",
    "Ham",
    "Bacon",
    "Fish",
    "Salmon",
    "Tuna",
    "Cod",
    "Shrimp",
    "Crab",
    "Tofu",
    "Tempeh",
    "Egg",
    "Greek yogurt",
    "Cottage cheese",
    "Beans",
    "Black beans",
    "Chickpeas",
    "Edamame",
    "Grilled chicken",
    "Rotisserie chicken",
    "Lean protein",
    "Lean beef",
    "Mediterranean chicken",
    "Baked salmon",
    "Mapo tofu",
    "Vegetable omelet",
    "Gyro",
    "Chicken fajita",
    "Three cup chicken",
    "Shredded chicken",
    "Dak-galbi chicken",
    "Taco chicken",
    "Shrimp fajita",
    "Mediterranean salmon",
    "Chicken shawarma",
    "White beans",
    "Lentils",
    "Black bean chicken",
    "Teriyaki salmon",
    "Soy garlic chicken",
  ],
  vegetable: [
    "Vegetables",
    "Greens",
    "Leafy greens",
    "Spinach",
    "Romaine",
    "Kale",
    "Broccoli",
    "Cauliflower",
    "Brussels sprouts",
    "Cabbage",
    "Napa cabbage",
    "Bok choy",
    "Mushrooms",
    "Tomato",
    "Cucumber",
    "Carrot",
    "Bell pepper",
    "Zucchini",
    "Asparagus",
    "Green beans",
    "Snap peas",
    "Onion",
    "Sweet onion",
    "Celery",
    "Mixed vegetables",
    "Seaweed",
    "Salad",
    "Two vegetable sides",
    "Kimchi",
    "Cucumber salad",
    "Braised greens",
    "Cabbage salad",
    "Roasted vegetables",
    "Bitter melon",
  ],
  carb: [
    "Rice",
    "Brown rice",
    "Jasmine rice",
    "Rice noodles",
    "Noodles",
    "Wheat noodles",
    "Pasta",
    "Bread",
    "Bagel",
    "Wrap",
    "Tortilla",
    "Oatmeal",
    "Granola",
    "Cereal",
    "Sweet potato",
    "Potato",
    "Mashed potato",
    "Quinoa",
    "Farro",
    "Couscous",
    "Crackers",
    "Toast",
    "Congee",
    "Porridge",
    "Bao / bun",
    "Soba noodles",
    "Udon noodles",
    "Pita",
    "Soft noodles",
    "Small rice",
    "Grains",
    "Overnight oats",
    "Breakfast wrap",
    "Corn",
  ],
  fruit: [
    "Fruit",
    "Berries",
    "Strawberries",
    "Blueberries",
    "Banana",
    "Apple",
    "Orange",
    "Mandarin",
    "Grapes",
    "Watermelon",
    "Cantaloupe",
    "Pineapple",
    "Mango",
    "Kiwi",
    "Peach",
    "Pear",
    "Plum",
    "Cherries",
    "Grapefruit",
  ],
  soup: [
    "Soup",
    "Broth",
    "Soup broth",
    "Canned soup",
    "Egg drop soup",
    "Korean soft tofu soup",
  ],
  drink: [
    "Water",
    "Sparkling water",
    "Caffeine-free tea",
    "Tea",
    "Green tea",
    "Black tea",
    "Coffee",
    "Iced coffee",
    "Milk",
    "Soy milk",
    "Oat milk",
    "Almond milk",
    "Yogurt drink",
    "Protein shake",
    "Smoothie",
    "Green juice",
    "Orange juice",
    "Apple juice",
    "Coconut water",
    "Soda",
    "Diet soda",
    "Sweet drink",
    "Sports drink",
    "Energy drink",
    "Milk tea",
    "Boba",
    "Beer",
    "Wine",
    "Cocktail",
    "Alcohol",
  ],
};

const namedComponentGroupLookup = new Map(
  Object.entries(namedComponentGroups).flatMap(([group, names]) =>
    names.map(
      (name) =>
        [name.toLowerCase(), group as ParsedMealComponent["group"]] as const,
    ),
  ),
);

/** Draft components for review, not a claim about what the user actually ate. */
export const getNamedMealComponents = (
  meal: Pick<MealOption, "id" | "title">,
): Array<Pick<ParsedMealComponent, "name" | "group">> =>
  (catalogPresentation[meal.id]?.components ?? [meal.title]).map((name) => ({
    name,
    // Mixed prepared items and uncertain ingredients remain "other" instead
    // of inventing their recipe or classifying every component as a serving.
    group: namedComponentGroupLookup.get(name.toLowerCase()) ?? "other",
  }));

export type MealPresentation = {
  title: string;
  cuisine: string;
  effort: string;
  ingredients: string[];
  tip: string;
};

export const getMealPresentation = (
  meal: Pick<MealOption, "id" | "title" | "tags" | "worksFor" | "convenience">,
  locale: Locale,
): MealPresentation => {
  const tags = new Set(meal.tags.map((tag) => tag.toLowerCase()));
  const cuisine = tags.has("taiwanese-style")
    ? "Taiwanese"
    : tags.has("chinese-style")
      ? "Chinese"
      : tags.has("japanese-inspired")
        ? "Japanese"
        : tags.has("korean-inspired")
          ? "Korean"
          : tags.has("mediterranean")
            ? "Mediterranean"
            : tags.has("mexican-inspired")
              ? "Mexican / Latin"
              : tags.has("american-light")
                ? "American everyday"
                : "Mixed everyday";
  const takeawayOnly =
    meal.worksFor.length === 1 && meal.worksFor[0] === "takeout";
  const groceryMeal = /rotisserie|ready-made|frozen|canned|bagged/.test(
    meal.title.toLowerCase(),
  );
  const coldAssembly = /overnight oats|yogurt|cottage cheese/.test(
    meal.title.toLowerCase(),
  );
  const englishEffort = takeawayOnly
    ? "Ready to order"
    : meal.convenience === "high"
      ? "Less preparation"
      : meal.convenience === "medium"
        ? "Some preparation"
        : "More preparation";
  const chineseEffort = takeawayOnly
    ? "適合直接點餐"
    : meal.convenience === "high"
      ? "準備較省事"
      : meal.convenience === "medium"
        ? "需要一些準備"
        : "需要較多準備";
  let tipEn: string;
  let tipZh: string;
  if (takeawayOnly) {
    tipEn =
      "Use the meal name to find a menu option. Confirm the named components, sauces, and your must-avoid ingredients before ordering.";
    tipZh =
      "可用餐名尋找菜單選項。點餐前，確認餐點內容、醬料，以及是否含有你必須避開的食材。";
  } else if (groceryMeal) {
    tipEn =
      "Start with the named grocery item, then gather the listed sides. Check package ingredients and follow the product's preparation instructions.";
    tipZh =
      "先找餐名中的熟食或包裝食品，再準備列出的配菜。確認包裝成分，並依產品標示加熱或料理。";
  } else if (coldAssembly) {
    tipEn =
      "Gather the named components for a simple bowl or plate. Check package ingredients; this list is a starting point, not a complete recipe.";
    tipZh =
      "先備齊餐名中的內容，再組成一碗或一盤。確認包裝成分；這份清單是組餐起點，不是完整食譜。";
  } else if (meal.worksFor.includes("takeout")) {
    tipEn =
      "Use these named components as a cooking or ordering checklist. Confirm the actual recipe and sauces; ingredients can vary by cook or restaurant.";
    tipZh =
      "把列出的內容當作自煮或點餐清單。實際配方和醬料會因料理者或餐廳而異，選擇前再確認。";
  } else {
    tipEn =
      "Gather the named components and use a recipe you know. This short list does not include every seasoning or ingredient, so check those separately.";
    tipZh =
      "先備齊列出的內容，搭配你熟悉的食譜料理。這份清單沒有列出所有調味料與食材，仍需另外確認。";
  }
  return {
    title: mealTitle(meal, locale),
    cuisine: label(cuisine, locale),
    effort: locale === "en" ? englishEffort : chineseEffort,
    ingredients: (catalogPresentation[meal.id]?.components ?? [meal.title]).map(
      (component) => translateFood(component, locale),
    ),
    tip: locale === "en" ? tipEn : tipZh,
  };
};

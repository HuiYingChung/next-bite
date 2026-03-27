// src/data.ts
var mealNames = ["Breakfast", "Lunch", "Dinner", "Snacks / Drinks"];
var uniqueOptions = (groups) => [...new Set(groups.flatMap((group) => group.options))];
var snackOptionGroups = {
  protein: [
    { label: "Protein snacks", options: ["Greek yogurt", "Yogurt drink", "Protein shake", "Jerky", "String cheese", "Cottage cheese"] },
    { label: "Plant-based protein", options: ["Edamame", "Roasted chickpeas", "Trail mix", "Nuts", "Nut butter"] }
  ],
  vegetables: [
    { label: "Fresh crunchy", options: ["Baby carrots", "Mini cucumbers", "Celery sticks", "Cherry tomatoes", "Snap peas"] },
    { label: "Light prepared", options: ["Veggie tray", "Seaweed snacks", "Pickles"] }
  ],
  carbs: [
    { label: "Packaged snacks", options: ["Crackers", "Pretzels", "Popcorn", "Granola bar", "Protein bar", "Rice cakes"] },
    {
      label: "Sweet snacks",
      options: [
        "Cookies",
        "Cookie sandwich",
        "Chocolate",
        "Muffin",
        "Pastry",
        "Cake",
        "Cupcake",
        "Brownie",
        "Donut",
        "Cheesecake",
        "Ice cream",
        "Ice cream bar",
        "Frozen yogurt",
        "Pudding"
      ]
    },
    { label: "Chips and crunchy", options: ["Potato chips", "Tortilla chips", "Pita chips"] }
  ],
  fruit: [
    { label: "Whole fruit", options: ["Banana", "Apple", "Orange", "Mandarin", "Grapes"] },
    { label: "Berry and cut fruit", options: ["Strawberries", "Blueberries", "Watermelon", "Pineapple", "Fruit cup"] }
  ],
  soup: [
    { label: "Quick warm snacks", options: ["Cup soup", "Instant miso soup", "Tomato soup"] }
  ],
  drink: [
    { label: "Everyday drinks", options: ["Water", "Sparkling water", "Tea", "Coffee", "Milk"] },
    { label: "Grocery drinks", options: ["Yogurt drink", "Smoothie", "Orange juice", "Apple juice", "Coconut water"] },
    { label: "Sweet or fun drinks", options: ["Milk tea", "Boba", "Soda", "Energy drink"] }
  ]
};
var snackMealOptions = {
  protein: uniqueOptions(snackOptionGroups.protein),
  vegetables: uniqueOptions(snackOptionGroups.vegetables),
  carbs: uniqueOptions(snackOptionGroups.carbs),
  fruit: uniqueOptions(snackOptionGroups.fruit),
  soup: uniqueOptions(snackOptionGroups.soup),
  drink: uniqueOptions(snackOptionGroups.drink)
};
var createEmptyMeal = () => ({
  protein: [],
  vegetables: [],
  carbs: [],
  fruit: [],
  soup: [],
  drink: [],
  cookingMethod: "Boiled",
  mealSource: "Home-cooked",
  portion: "Medium"
});
var seedProfile = {
  heightCm: "165",
  heightFt: "5",
  heightIn: "5",
  weightKg: "60",
  weightLb: "132",
  heightUnit: "cm",
  weightUnit: "kg",
  feelToday: "Normal",
  activityLevel: "Moderate",
  eatingStyle: "Both",
  preferenceTags: ["Chinese-style", "Japanese", "Soupy meals", "Light meals"],
  avoidTags: ["Dairy"]
};
var seedTodayLog = {
  Breakfast: { ...createEmptyMeal(), protein: ["Egg"], carbs: ["Oatmeal"], fruit: ["Banana"], drink: ["Coffee"], portion: "Small" },
  Lunch: { ...createEmptyMeal(), protein: ["Chicken"], vegetables: ["Broccoli", "Mixed vegetables"], carbs: ["Rice"], drink: ["Tea"], cookingMethod: "Stir-fried", mealSource: "Takeout" },
  Dinner: createEmptyMeal(),
  "Snacks / Drinks": { ...createEmptyMeal(), fruit: ["Apple"], drink: ["Water"], cookingMethod: "Raw / cold", mealSource: "Ready-made", portion: "Small" }
};
var historyMeals = [
  [
    { protein: ["Egg"], carbs: ["Bread"], drink: ["Coffee"], portion: "Small" },
    { protein: ["Pork"], vegetables: ["Leafy greens"], carbs: ["Rice"], cookingMethod: "Stir-fried", mealSource: "Takeout" },
    { protein: ["Fish"], vegetables: ["Seaweed", "Mushrooms"], carbs: ["Rice"], soup: ["Miso soup"], cookingMethod: "Soup / stew" },
    { fruit: ["Orange"], drink: ["Tea"], portion: "Small", cookingMethod: "Raw / cold" }
  ],
  [
    { protein: ["Tofu"], carbs: ["Oatmeal"], drink: ["Soy milk"], portion: "Small" },
    { protein: ["Chicken"], vegetables: ["Tomato"], carbs: ["Tortilla"], cookingMethod: "Grilled", mealSource: "Restaurant" },
    { protein: ["Shrimp"], vegetables: ["Mixed vegetables"], carbs: ["Noodles"], cookingMethod: "Fried", mealSource: "Takeout" },
    { fruit: ["Cantaloupe"], drink: ["Water"], portion: "Small", cookingMethod: "Raw / cold" }
  ],
  [
    { protein: ["Egg"], carbs: ["Bread"], fruit: ["Apple"] },
    { protein: ["Beef"], vegetables: ["Broccoli"], carbs: ["Rice"], cookingMethod: "Stir-fried", mealSource: "Takeout" },
    { protein: ["Tofu"], vegetables: ["Leafy greens", "Mushrooms"], carbs: ["Rice"], soup: ["Vegetable soup"], cookingMethod: "Soup / stew" },
    { drink: ["Sparkling water"], portion: "Small", cookingMethod: "Raw / cold" }
  ],
  [
    { protein: ["Egg"], carbs: ["Oatmeal"], fruit: ["Berries"] },
    { protein: ["Chicken"], vegetables: ["Mixed vegetables"], carbs: ["Rice"], cookingMethod: "Grilled", mealSource: "Takeout" },
    { protein: ["Fish"], vegetables: ["Seaweed"], carbs: ["Sweet potato"], soup: ["Miso soup"], cookingMethod: "Steamed" },
    { drink: ["Tea"], portion: "Small", cookingMethod: "Raw / cold" }
  ],
  [
    { carbs: ["Bread"], drink: ["Coffee"], portion: "Small" },
    { protein: ["Pork"], vegetables: ["Leafy greens"], carbs: ["Noodles"], cookingMethod: "Fried", mealSource: "Restaurant" },
    { protein: ["Tofu"], vegetables: ["Tomato"], carbs: ["Rice"], soup: ["Tomato soup"], cookingMethod: "Soup / stew" },
    { fruit: ["Banana"], drink: ["Water"], portion: "Small", cookingMethod: "Raw / cold" }
  ],
  [
    { protein: ["Egg"], carbs: ["Bread"], drink: ["Soy milk"], portion: "Small" },
    { protein: ["Fish"], vegetables: ["Broccoli"], carbs: ["Rice"], cookingMethod: "Steamed", mealSource: "Restaurant" },
    { protein: ["Chicken"], vegetables: ["Mixed vegetables"], carbs: ["Tortilla"], cookingMethod: "Grilled", mealSource: "Takeout" },
    { fruit: ["Orange"], drink: ["Tea"], portion: "Small", cookingMethod: "Raw / cold" }
  ]
];
var buildSeedLogs = () => historyMeals.map((dayMeals) => ({
  Breakfast: { ...createEmptyMeal(), ...dayMeals[0] },
  Lunch: { ...createEmptyMeal(), ...dayMeals[1] },
  Dinner: { ...createEmptyMeal(), ...dayMeals[2] },
  "Snacks / Drinks": { ...createEmptyMeal(), ...dayMeals[3] }
})).concat([seedTodayLog]);
var cloneMealEntry = (meal) => ({
  protein: [...meal.protein],
  vegetables: [...meal.vegetables],
  carbs: [...meal.carbs],
  fruit: [...meal.fruit],
  soup: [...meal.soup],
  drink: [...meal.drink],
  cookingMethod: meal.cookingMethod,
  mealSource: meal.mealSource,
  portion: meal.portion
});
var cloneTodayLog = (todayLog) => Object.fromEntries(mealNames.map((mealName) => [mealName, cloneMealEntry(todayLog[mealName])]));
var toIsoDate = (date) => date.toISOString().slice(0, 10);
var buildSevenDaySeeds = () => {
  const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const today = /* @__PURE__ */ new Date();
  today.setHours(12, 0, 0, 0);
  const logs = buildSeedLogs();
  return logs.map((todayLog, index) => {
    const offset = logs.length - 1 - index;
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const isToday = offset === 0;
    const label = isToday ? "Today" : offset === 1 ? "Yesterday" : formatter.format(date);
    return {
      id: toIsoDate(date),
      date: toIsoDate(date),
      label,
      isToday,
      todayLog: cloneTodayLog(todayLog)
    };
  });
};
var seedHistory = buildSevenDaySeeds();
var cloneProfile = (profile) => ({
  ...profile,
  preferenceTags: [...profile.preferenceTags],
  avoidTags: [...profile.avoidTags]
});
var cloneDay = (day) => ({
  ...day,
  todayLog: cloneTodayLog(day.todayLog)
});
var createSeededState = () => ({
  profile: cloneProfile(seedProfile),
  days: seedHistory.map(cloneDay),
  selectedDayId: seedHistory[seedHistory.length - 1]?.id ?? ""
});
var recommendationDataset = [
  {
    id: "salmon-rice-bowl-veg",
    title: "Salmon Rice Bowl with Vegetables",
    tags: ["rice-based", "japanese-inspired", "balanced", "warm", "bowl", "vegetable-forward"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "balanced",
    avoidTags: ["fish"],
    description: "A warm balanced bowl with salmon, rice, and vegetables."
  },
  {
    id: "grilled-chicken-plate-rice-greens",
    title: "Grilled Chicken Plate with Rice and Greens",
    tags: ["balanced", "high-protein", "rice-based", "simple", "plate", "warm"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "balanced",
    avoidTags: [],
    description: "A simple balanced meal with lean protein, greens, and rice."
  },
  {
    id: "tofu-vegetable-rice-bowl",
    title: "Tofu and Vegetable Rice Bowl",
    tags: ["balanced", "plant-protein", "rice-based", "warm", "bowl", "vegetable-forward"],
    proteinLevel: "medium",
    vegetableLevel: "high",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "balanced",
    avoidTags: [],
    description: "A practical bowl with tofu, vegetables, and rice for a lighter balance."
  },
  {
    id: "miso-fish-set-veg",
    title: "Miso Fish Set with Vegetables",
    tags: ["japanese-inspired", "balanced", "warm", "set-meal"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "balanced",
    avoidTags: ["fish"],
    description: "A warm set-style meal with fish, vegetables, and steady balance."
  },
  {
    id: "shrimp-quinoa-bowl",
    title: "Shrimp Quinoa Bowl",
    tags: ["balanced", "high-protein", "bowl", "light"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "low",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "balanced",
    avoidTags: ["shellfish"],
    description: "A lighter bowl with shrimp, quinoa, and vegetables."
  },
  {
    id: "chicken-broccoli-rice-bowl",
    title: "Chicken Broccoli Rice Bowl",
    tags: ["balanced", "high-protein", "rice-based", "everyday", "bowl", "warm", "takeout"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "high",
    worksFor: ["home-cooked", "takeout"],
    mealType: "balanced",
    avoidTags: [],
    description: "A familiar everyday meal that brings protein, vegetables, and comfort."
  },
  {
    id: "tofu-vegetable-soup-rice",
    title: "Tofu Vegetable Soup with Rice",
    tags: ["soupy", "light", "gentle", "warm"],
    proteinLevel: "medium",
    vegetableLevel: "high",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked"],
    mealType: "light",
    avoidTags: [],
    description: "A gentle warm meal that feels lighter while still balanced."
  },
  {
    id: "chicken-noodle-soup-greens",
    title: "Chicken Noodle Soup with Greens",
    tags: ["soupy", "comfort", "warm", "light"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["home-cooked", "takeout"],
    mealType: "light",
    avoidTags: [],
    description: "A comforting soup choice with lean protein and a lighter feel."
  },
  {
    id: "steamed-fish-rice-bokchoy",
    title: "Steamed Fish with Rice and Bok Choy",
    tags: ["light", "chinese-style", "warm", "steamed", "plate", "vegetable-forward"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "low",
    worksFor: ["home-cooked"],
    mealType: "light",
    avoidTags: ["fish"],
    description: "A clean and gentle plate with steamed fish, greens, and rice."
  },
  {
    id: "egg-tomato-rice",
    title: "Egg and Tomato over Rice",
    tags: ["chinese-style", "simple", "warm", "comfort", "rice-based", "bowl", "quick"],
    proteinLevel: "medium",
    vegetableLevel: "low",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["home-cooked"],
    mealType: "light",
    avoidTags: [],
    description: "A simple home-style comfort meal that is easy and familiar."
  },
  {
    id: "congee-egg-side-veg",
    title: "Congee with Egg and Side Vegetables",
    tags: ["gentle", "soupy", "comfort", "chinese-style"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "light",
    avoidTags: [],
    description: "A gentle meal for days when you want something soft and easy."
  },
  {
    id: "miso-tofu-soup-rice",
    title: "Miso Tofu Soup with Rice",
    tags: ["japanese-inspired", "soupy", "light", "warm"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["home-cooked", "takeout"],
    mealType: "light",
    avoidTags: [],
    description: "A warm light meal that feels comforting without being too heavy."
  },
  {
    id: "chicken-wrap-salad",
    title: "Chicken Wrap with Salad",
    tags: ["convenient", "american-light", "portable", "quick"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["takeout"],
    mealType: "convenient",
    avoidTags: [],
    description: "A quick practical option with protein and vegetables."
  },
  {
    id: "poke-bowl",
    title: "Poke Bowl",
    tags: ["convenient", "bowl", "takeout", "balanced"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["takeout"],
    mealType: "convenient",
    avoidTags: ["fish"],
    description: "A fast bowl-style option that usually feels balanced and fresh."
  },
  {
    id: "turkey-sandwich-side-salad",
    title: "Turkey Sandwich with Side Salad",
    tags: ["american-light", "convenient", "portable", "quick"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["takeout", "home-cooked"],
    mealType: "convenient",
    avoidTags: [],
    description: "A very practical meal when you want something easy and reasonably balanced."
  },
  {
    id: "rotisserie-chicken-microwave-veg",
    title: "Rotisserie Chicken with Microwave Vegetables",
    tags: ["convenient", "high-protein", "quick", "everyday", "grocery", "plate"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "low",
    heaviness: "medium",
    convenience: "high",
    worksFor: ["home-cooked"],
    mealType: "convenient",
    avoidTags: [],
    description: "A low-effort meal that still adds protein and some vegetables."
  },
  {
    id: "soba-salad-egg",
    title: "Soba Salad with Egg",
    tags: ["japanese-inspired", "convenient", "light", "cold-meal", "noodle-based", "portable"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["takeout", "home-cooked"],
    mealType: "convenient",
    avoidTags: [],
    description: "A light and practical choice when you want something easy but not too heavy."
  },
  {
    id: "ready-made-soup-dumplings-veg",
    title: "Ready-Made Soup Dumplings with Vegetables",
    tags: ["convenient", "warm", "quick", "comfort", "set-meal", "grocery"],
    proteinLevel: "medium",
    vegetableLevel: "low",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "high",
    worksFor: ["home-cooked"],
    mealType: "convenient",
    avoidTags: [],
    description: "A fast comfort option that works better when paired with vegetables."
  },
  {
    id: "beef-bibimbap-extra-veg",
    title: "Beef Bibimbap with Extra Vegetables",
    tags: ["korean-inspired", "rice-based", "flavorful", "balanced", "bowl", "vegetable-forward", "warm", "takeout"],
    proteinLevel: "high",
    vegetableLevel: "high",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "medium",
    worksFor: ["takeout", "home-cooked"],
    mealType: "preference",
    avoidTags: ["beef"],
    description: "A flavorful bowl that adds protein and lots of vegetables."
  },
  {
    id: "teriyaki-salmon-bowl",
    title: "Teriyaki Salmon Bowl",
    tags: ["japanese-inspired", "rice-based", "savory", "warm", "bowl"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "medium",
    worksFor: ["takeout", "home-cooked"],
    mealType: "preference",
    avoidTags: ["fish"],
    description: "A savory bowl for users who like warm rice-based meals with fish."
  },
  {
    id: "taiwanese-bento-light",
    title: "Taiwanese Bento Light Version",
    tags: ["taiwanese-style", "set-meal", "warm", "comfort"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "high",
    worksFor: ["takeout"],
    mealType: "preference",
    avoidTags: [],
    description: "A lighter bento-style option with familiar flavors and better balance."
  },
  {
    id: "udon-soup-lean-protein",
    title: "Udon Soup with Lean Protein",
    tags: ["japanese-inspired", "soupy", "comfort", "warm"],
    proteinLevel: "medium",
    vegetableLevel: "low",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["takeout", "home-cooked"],
    mealType: "preference",
    avoidTags: [],
    description: "A warm noodle option that feels comforting and not overly heavy."
  },
  {
    id: "burrito-bowl-beans-veg",
    title: "Burrito Bowl with Beans and Vegetables",
    tags: ["mexican-inspired", "bowl", "hearty", "takeout", "warm", "convenient"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "high",
    worksFor: ["takeout"],
    mealType: "preference",
    avoidTags: [],
    description: "A filling bowl with beans, vegetables, and flexible toppings."
  },
  {
    id: "chicken-caesar-wrap-light",
    title: "Chicken Caesar Wrap Light Version",
    tags: ["american-light", "wrap", "convenient", "savory"],
    proteinLevel: "high",
    vegetableLevel: "low",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "high",
    worksFor: ["takeout"],
    mealType: "preference",
    avoidTags: ["dairy"],
    description: "A familiar convenient wrap that works for a quick protein-focused meal."
  },
  {
    id: "kimchi-tofu-rice-bowl",
    title: "Kimchi Tofu Rice Bowl",
    tags: ["korean-inspired", "rice-based", "plant-protein", "warm", "bowl"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "preference",
    avoidTags: ["spicy"],
    description: "A bold warm bowl with tofu and flavor for users who enjoy stronger tastes."
  },
  {
    id: "tofu-egg-protein-bowl",
    title: "Tofu and Egg Protein Bowl",
    tags: ["high-protein", "rice-based", "simple", "warm", "bowl"],
    proteinLevel: "high",
    vegetableLevel: "low",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["home-cooked"],
    mealType: "recovery",
    avoidTags: [],
    description: "A simple protein-forward bowl when earlier meals were low in protein."
  },
  {
    id: "bean-veggie-rice-bowl",
    title: "Bean and Vegetable Rice Bowl",
    tags: ["plant-protein", "fiber-support", "rice-based", "balanced", "bowl", "vegetable-forward", "warm"],
    proteinLevel: "medium",
    vegetableLevel: "high",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "recovery",
    avoidTags: [],
    description: "A useful option for adding fiber variety, vegetables, and steady energy."
  },
  {
    id: "grilled-chicken-sweet-potato-plate",
    title: "Grilled Chicken and Sweet Potato Plate",
    tags: ["high-protein", "simple", "balanced", "home-style", "plate", "warm"],
    proteinLevel: "high",
    vegetableLevel: "low",
    carbLevel: "low",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked"],
    mealType: "recovery",
    avoidTags: [],
    description: "A straightforward plate that helps add protein without feeling too heavy."
  },
  {
    id: "salmon-edamame-bowl",
    title: "Salmon and Edamame Bowl",
    tags: ["high-protein", "japanese-inspired", "bowl", "balanced", "warm", "takeout"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "low",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["takeout", "home-cooked"],
    mealType: "recovery",
    avoidTags: ["fish"],
    description: "A protein-supporting bowl with a lighter profile and balanced structure."
  },
  {
    id: "vegetable-omelet-toast-fruit",
    title: "Vegetable Omelet with Toast and Fruit",
    tags: ["breakfast-for-dinner", "simple", "balanced", "quick", "plate", "light"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["home-cooked"],
    mealType: "recovery",
    avoidTags: [],
    description: "A quick balanced option that feels flexible and easy for any time of day."
  },
  {
    id: "lean-beef-vegetable-noodle-soup",
    title: "Lean Beef Vegetable Noodle Soup",
    tags: ["soupy", "comfort", "warm", "hearty"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "medium",
    worksFor: ["takeout", "home-cooked"],
    mealType: "recovery",
    avoidTags: ["beef"],
    description: "A warm soup option with protein and vegetables when you want something satisfying."
  },
  {
    id: "rotisserie-chicken-rice-salad",
    title: "Rotisserie Chicken with Rice and Salad",
    tags: ["american-light", "balanced", "high-protein", "everyday", "grocery", "plate"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "high",
    worksFor: ["home-cooked"],
    mealType: "convenient",
    avoidTags: [],
    description: "A realistic low-effort dinner using grocery staples that still feels complete."
  },
  {
    id: "trader-joes-soup-salad",
    title: "Soup and Salad Combo",
    tags: ["light", "soupy", "convenient", "american-light", "grocery"],
    proteinLevel: "low",
    vegetableLevel: "high",
    carbLevel: "low",
    heaviness: "light",
    convenience: "high",
    worksFor: ["home-cooked", "takeout"],
    mealType: "convenient",
    avoidTags: [],
    description: "A simple soup-and-salad pairing that works well when you want something light and easy."
  },
  {
    id: "turkey-chili-rice-bowl",
    title: "Turkey Chili Rice Bowl",
    tags: ["warm", "high-protein", "bowl", "comfort", "mexican-inspired", "home-style", "meal-prep-friendly"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "medium",
    worksFor: ["home-cooked"],
    mealType: "balanced",
    avoidTags: [],
    description: "A hearty but still practical bowl with turkey chili, rice, and a warmer feel."
  },
  {
    id: "pho-lean-beef-herbs",
    title: "Pho with Lean Beef and Herbs",
    tags: ["soupy", "takeout", "warm", "noodle-based", "comfort"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["takeout"],
    mealType: "preference",
    avoidTags: ["beef"],
    description: "A light-feeling noodle soup that is easy to order and still satisfying."
  },
  {
    id: "mediterranean-chicken-plate",
    title: "Mediterranean Chicken Plate",
    tags: ["balanced", "high-protein", "takeout", "plate", "mediterranean", "vegetable-forward", "warm"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "high",
    worksFor: ["takeout"],
    mealType: "convenient",
    avoidTags: [],
    description: "A practical takeout plate with chicken, rice, and vegetables that usually balances well."
  },
  {
    id: "falafel-salad-rice",
    title: "Falafel Salad with Rice",
    tags: ["plant-protein", "balanced", "takeout", "bowl", "mediterranean", "vegetable-forward", "light", "convenient"],
    proteinLevel: "medium",
    vegetableLevel: "high",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "high",
    worksFor: ["takeout"],
    mealType: "preference",
    avoidTags: [],
    description: "A plant-forward bowl with vegetables and enough substance to feel like a full meal."
  },
  {
    id: "costco-salmon-sweet-potato-veg",
    title: "Baked Salmon with Sweet Potato and Vegetables",
    tags: ["balanced", "high-protein", "home-style", "warm", "grocery", "plate", "vegetable-forward"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "low",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked"],
    mealType: "recovery",
    avoidTags: ["fish"],
    description: "A straightforward plate that feels balanced and easy to repeat on a normal weeknight."
  },
  {
    id: "mapo-tofu-light-rice",
    title: "Mapo Tofu Light Version with Rice",
    tags: ["chinese-style", "warm", "rice-based", "comfort", "bowl", "plant-protein", "home-style", "simple", "spicy"],
    proteinLevel: "medium",
    vegetableLevel: "low",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "preference",
    avoidTags: ["spicy"],
    description: "A lighter take on a familiar comfort dish that still works for everyday dinner."
  },
  {
    id: "beef-tomato-rice-bowl",
    title: "Beef and Tomato Rice Bowl",
    tags: ["chinese-style", "rice-based", "warm", "comfort", "bowl"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "medium",
    worksFor: ["home-cooked"],
    mealType: "preference",
    avoidTags: ["beef"],
    description: "A familiar home-style bowl with a practical mix of protein, tomato, and rice."
  },
  {
    id: "taiwanese-minced-pork-rice-light",
    title: "Taiwanese Minced Pork Rice Light Version",
    tags: ["taiwanese-style", "rice-based", "comfort", "warm", "bowl"],
    proteinLevel: "medium",
    vegetableLevel: "low",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "preference",
    avoidTags: ["pork"],
    description: "A lighter version of a familiar rice bowl that still feels satisfying and recognizable."
  },
  {
    id: "japanese-curry-light-set",
    title: "Japanese Curry Light Set",
    tags: ["japanese-inspired", "set-meal", "warm", "comfort"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "preference",
    avoidTags: [],
    description: "A gentler curry-style set that keeps the comfort but avoids feeling too heavy."
  },
  {
    id: "tuna-mayo-onigiri-side-soup",
    title: "Onigiri with Side Soup and Fruit",
    tags: ["japanese-inspired", "convenient", "light", "portable", "grocery"],
    proteinLevel: "low",
    vegetableLevel: "low",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["home-cooked", "takeout"],
    mealType: "convenient",
    avoidTags: ["fish"],
    description: "A very practical light meal when you want something quick and easy to put together."
  },
  {
    id: "avocado-egg-toast-soup",
    title: "Avocado Toast with Egg and Soup",
    tags: ["breakfast-for-dinner", "simple", "light", "quick"],
    proteinLevel: "medium",
    vegetableLevel: "low",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["home-cooked"],
    mealType: "recovery",
    avoidTags: ["egg"],
    description: "A flexible quick meal that works well when dinner needs to stay simple."
  },
  {
    id: "greek-yogurt-granola-fruit-bowl",
    title: "Greek Yogurt Granola Fruit Bowl",
    tags: ["light", "quick", "breakfast-for-dinner", "cold-meal"],
    proteinLevel: "medium",
    vegetableLevel: "low",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["home-cooked"],
    mealType: "convenient",
    avoidTags: ["dairy"],
    description: "A low-friction option for nights when you want something very easy and not heavy."
  },
  {
    id: "cottage-cheese-fruit-toast-plate",
    title: "Cottage Cheese, Fruit, and Toast Plate",
    tags: ["light", "quick", "simple", "breakfast-for-dinner"],
    proteinLevel: "medium",
    vegetableLevel: "low",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["home-cooked"],
    mealType: "convenient",
    avoidTags: ["dairy"],
    description: "A very easy plate that covers protein, carbs, and fruit without much effort."
  },
  {
    id: "edamame-noodle-salad",
    title: "Edamame Noodle Salad",
    tags: ["plant-protein", "noodle-based", "light", "cold-meal"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "balanced",
    avoidTags: [],
    description: "A lighter noodle option with plant protein that still feels like a real meal."
  },
  {
    id: "chicken-sub-soup-combo",
    title: "Chicken Sub with Side Soup",
    tags: ["american-light", "convenient", "takeout", "comfort", "portable"],
    proteinLevel: "medium",
    vegetableLevel: "low",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "high",
    worksFor: ["takeout"],
    mealType: "convenient",
    avoidTags: [],
    description: "A realistic quick combo when convenience matters more than cooking from scratch."
  },
  {
    id: "shrimp-fried-rice-light-veg",
    title: "Shrimp Fried Rice with Extra Vegetables",
    tags: ["chinese-style", "rice-based", "takeout", "warm", "vegetable-forward"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "high",
    heaviness: "medium",
    convenience: "high",
    worksFor: ["takeout", "home-cooked"],
    mealType: "preference",
    avoidTags: ["shellfish"],
    description: "A familiar takeout-style meal that works better when paired with extra vegetables."
  },
  {
    id: "tofu-kale-quinoa-bowl",
    title: "Tofu Kale Quinoa Bowl",
    tags: ["plant-protein", "light", "balanced", "bowl"],
    proteinLevel: "medium",
    vegetableLevel: "high",
    carbLevel: "low",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "recovery",
    avoidTags: [],
    description: "A lighter grain bowl that brings vegetables and plant protein without much heaviness."
  },
  {
    id: "egg-drop-soup-dumpling-side-veg",
    title: "Egg Drop Soup with Dumplings and Greens",
    tags: ["soupy", "warm", "comfort", "chinese-style"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "balanced",
    avoidTags: ["egg"],
    description: "A warm comfort combination that feels more complete with soup and greens together."
  },
  {
    id: "gyro-bowl-rice-salad",
    title: "Gyro Bowl with Rice and Salad",
    tags: ["takeout", "bowl", "savory", "balanced", "mediterranean"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "high",
    worksFor: ["takeout"],
    mealType: "preference",
    avoidTags: [],
    description: "A practical takeout bowl with enough structure to feel balanced and satisfying."
  },
  {
    id: "turkey-avocado-sandwich-soup",
    title: "Turkey Avocado Sandwich with Soup",
    tags: ["american-light", "portable", "comfort", "quick", "sandwich", "convenient"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["takeout", "home-cooked"],
    mealType: "convenient",
    avoidTags: [],
    description: "A practical sandwich-and-soup combo that feels easy, familiar, and reasonably balanced."
  },
  {
    id: "chicken-fajita-bowl",
    title: "Chicken Fajita Bowl",
    tags: ["mexican-inspired", "bowl", "takeout", "vegetable-forward", "warm", "convenient"],
    proteinLevel: "high",
    vegetableLevel: "high",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "high",
    worksFor: ["takeout", "home-cooked"],
    mealType: "preference",
    avoidTags: [],
    description: "A colorful bowl with chicken and peppers that adds vegetables without losing practicality."
  },
  {
    id: "soy-garlic-chicken-rice-cabbage",
    title: "Soy Garlic Chicken with Rice and Cabbage",
    tags: ["korean-inspired", "rice-based", "warm", "comfort", "plate", "takeout"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "preference",
    avoidTags: [],
    description: "A savory rice plate that feels familiar and satisfying without going too heavy."
  },
  {
    id: "tofu-mushroom-udon-soup",
    title: "Tofu Mushroom Udon Soup",
    tags: ["japanese-inspired", "soupy", "warm", "plant-protein"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "balanced",
    avoidTags: [],
    description: "A warm noodle soup that gives you comfort, tofu protein, and a lighter overall feel."
  },
  {
    id: "canned-soup-toast-egg",
    title: "Canned Soup with Toast and Egg",
    tags: ["quick", "grocery", "comfort", "breakfast-for-dinner", "warm", "soupy"],
    proteinLevel: "medium",
    vegetableLevel: "low",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["home-cooked"],
    mealType: "convenient",
    avoidTags: ["egg"],
    description: "A very low-effort meal that still feels warm and complete on a busy night."
  },
  {
    id: "baked-salmon-bagged-salad-potato",
    title: "Baked Salmon with Bagged Salad and Potato",
    tags: ["balanced", "home-style", "warm", "grocery", "plate", "vegetable-forward"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked"],
    mealType: "balanced",
    avoidTags: ["fish"],
    description: "A realistic grocery-based dinner that brings protein and vegetables without much friction."
  },
  {
    id: "hummus-chicken-wrap-fruit",
    title: "Hummus Chicken Wrap with Fruit",
    tags: ["mediterranean", "wrap", "portable", "light"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["takeout", "home-cooked"],
    mealType: "convenient",
    avoidTags: [],
    description: "A portable wrap option that feels light, practical, and easy to act on."
  },
  {
    id: "veggie-black-bean-quesadilla-salad",
    title: "Veggie Black Bean Quesadilla with Salad",
    tags: ["mexican-inspired", "plant-protein", "comfort", "takeout", "vegetable-forward"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "high",
    worksFor: ["takeout", "home-cooked"],
    mealType: "preference",
    avoidTags: ["dairy"],
    description: "A flexible comfort-style meal with beans and vegetables that still feels approachable."
  },
  {
    id: "scallion-egg-tofu-rice-bowl",
    title: "Scallion Egg Tofu Rice Bowl",
    tags: ["chinese-style", "rice-based", "simple", "plant-protein", "bowl", "warm"],
    proteinLevel: "high",
    vegetableLevel: "low",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["home-cooked"],
    mealType: "recovery",
    avoidTags: ["egg"],
    description: "A simple bowl that is easy to make when you want more protein without extra heaviness."
  },
  {
    id: "soba-tofu-bento",
    title: "Soba and Tofu Bento",
    tags: ["japanese-inspired", "set-meal", "portable", "light"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["takeout", "home-cooked"],
    mealType: "convenient",
    avoidTags: [],
    description: "A tidy set-style meal that travels well and keeps the overall feel light."
  },
  {
    id: "chicken-cabbage-dumpling-soup",
    title: "Chicken and Cabbage Dumpling Soup",
    tags: ["soupy", "warm", "comfort", "chinese-style", "gentle"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "balanced",
    avoidTags: [],
    description: "A warm soup-based meal that feels comforting while still keeping some structure and balance."
  },
  {
    id: "ginger-chicken-rice-soup",
    title: "Ginger Chicken Rice Soup",
    tags: ["soupy", "warm", "comfort", "gentle", "chinese-style"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "light",
    avoidTags: [],
    description: "A gentle warm soup with chicken and rice that works well when you want something soothing and steady."
  },
  {
    id: "tofu-mushroom-congee",
    title: "Tofu Mushroom Congee",
    tags: ["soupy", "warm", "gentle", "comfort", "plant-protein", "chinese-style"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked"],
    mealType: "light",
    avoidTags: [],
    description: "A soft warm bowl that feels easy on the stomach while still giving you protein and comfort."
  },
  {
    id: "salmon-miso-porridge",
    title: "Salmon Miso Porridge",
    tags: ["japanese-inspired", "warm", "soupy", "comfort", "gentle"],
    proteinLevel: "high",
    vegetableLevel: "low",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked"],
    mealType: "recovery",
    avoidTags: ["fish"],
    description: "A warm porridge-style meal with salmon that feels soft, steady, and comforting."
  },
  {
    id: "soft-noodle-soup-egg-greens",
    title: "Soft Noodle Soup with Egg and Greens",
    tags: ["soupy", "warm", "comfort", "gentle", "noodle-based"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "light",
    avoidTags: ["egg"],
    description: "A soft noodle soup that feels gentle and warming without turning into a heavy meal."
  },
  {
    id: "steamed-fish-vegetable-plate",
    title: "Steamed Fish and Vegetable Plate",
    tags: ["light", "warm", "steamed", "balanced", "chinese-style", "vegetable-forward"],
    proteinLevel: "high",
    vegetableLevel: "high",
    carbLevel: "low",
    heaviness: "light",
    convenience: "low",
    worksFor: ["home-cooked"],
    mealType: "light",
    avoidTags: ["fish"],
    description: "A lighter plate with fish and vegetables that works well when you want something clean and not too much."
  },
  {
    id: "tofu-greens-soup-small-rice",
    title: "Tofu Greens Soup with Small Rice",
    tags: ["soupy", "light", "warm", "plant-protein", "vegetable-forward"],
    proteinLevel: "medium",
    vegetableLevel: "high",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked"],
    mealType: "light",
    avoidTags: [],
    description: "A warm soup-and-rice combination that keeps the meal light while still feeling complete."
  },
  {
    id: "chicken-salad-grain-bowl-light",
    title: "Chicken Salad Grain Bowl Light Version",
    tags: ["light", "balanced", "bowl", "american-light", "vegetable-forward"],
    proteinLevel: "high",
    vegetableLevel: "high",
    carbLevel: "low",
    heaviness: "light",
    convenience: "high",
    worksFor: ["takeout", "home-cooked"],
    mealType: "balanced",
    avoidTags: [],
    description: "A lighter grain bowl with chicken and plenty of vegetables when you want something fresh but still real."
  },
  {
    id: "miso-tofu-spinach-bowl",
    title: "Miso Tofu and Spinach Bowl",
    tags: ["japanese-inspired", "plant-protein", "warm", "light", "bowl"],
    proteinLevel: "medium",
    vegetableLevel: "high",
    carbLevel: "low",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked"],
    mealType: "recovery",
    avoidTags: [],
    description: "A warm light bowl that gives you tofu, greens, and a calmer overall feel."
  },
  {
    id: "rotisserie-chicken-microwave-veg-rice",
    title: "Rotisserie Chicken with Microwave Vegetables and Rice",
    tags: ["quick", "grocery", "high-protein", "warm", "convenient", "plate"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "high",
    worksFor: ["home-cooked"],
    mealType: "convenient",
    avoidTags: [],
    description: "A realistic grocery shortcut meal that still covers protein, vegetables, and a familiar starch."
  },
  {
    id: "frozen-dumplings-bok-choy",
    title: "Frozen Dumplings with Bok Choy",
    tags: ["quick", "warm", "comfort", "grocery", "chinese-style", "set-meal"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "high",
    worksFor: ["home-cooked"],
    mealType: "convenient",
    avoidTags: [],
    description: "A very doable comfort meal that feels better balanced when paired with greens."
  },
  {
    id: "greek-yogurt-fruit-granola-bowl",
    title: "Greek Yogurt Fruit Granola Bowl",
    tags: ["quick", "breakfast-for-dinner", "light", "grocery", "portable"],
    proteinLevel: "medium",
    vegetableLevel: "low",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["home-cooked"],
    mealType: "convenient",
    avoidTags: ["dairy"],
    description: "A very easy bowl that works when you want something low-effort and not too heavy."
  },
  {
    id: "beef-tomato-noodle-soup",
    title: "Beef Tomato Noodle Soup",
    tags: ["soupy", "warm", "comfort", "chinese-style", "noodle-based"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "preference",
    avoidTags: ["beef"],
    description: "A familiar warm noodle soup that feels comforting and satisfying in a very everyday way."
  },
  {
    id: "egg-tofu-congee",
    title: "Egg Tofu Congee",
    tags: ["soupy", "warm", "gentle", "comfort", "chinese-style", "plant-protein"],
    proteinLevel: "medium",
    vegetableLevel: "low",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked"],
    mealType: "light",
    avoidTags: ["egg"],
    description: "A soft, simple congee that feels gentle and easy to settle into on lower-energy days."
  },
  {
    id: "chicken-ginger-noodle-soup",
    title: "Chicken Ginger Noodle Soup",
    tags: ["soupy", "warm", "comfort", "gentle", "noodle-based"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["home-cooked", "takeout"],
    mealType: "light",
    avoidTags: [],
    description: "A warm ginger-forward soup that feels soothing while still giving you a proper meal."
  },
  {
    id: "warm-soba-broth-set",
    title: "Warm Soba Broth Set",
    tags: ["japanese-inspired", "soupy", "warm", "set-meal", "light"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["takeout", "home-cooked"],
    mealType: "convenient",
    avoidTags: [],
    description: "A tidy warm set that feels comforting and light enough for days when you want less friction."
  },
  {
    id: "soy-milk-oatmeal-egg-fruit",
    title: "Soy Milk Oatmeal with Egg and Fruit",
    tags: ["breakfast-for-dinner", "warm", "gentle", "quick", "light", "grocery", "plate"],
    proteinLevel: "medium",
    vegetableLevel: "low",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["home-cooked"],
    mealType: "convenient",
    avoidTags: ["egg"],
    description: "A very easy warm meal that works well when you want something soft, familiar, and uncomplicated."
  },
  {
    id: "taiwanese-three-cup-chicken-light-set",
    title: "Taiwanese Three Cup Chicken Light Set",
    tags: ["taiwanese-style", "set-meal", "warm", "comfort", "takeout"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "medium",
    worksFor: ["takeout", "home-cooked"],
    mealType: "preference",
    avoidTags: [],
    description: "A lighter set-style take on a familiar Taiwanese favorite with enough structure to feel balanced."
  },
  {
    id: "taiwanese-shredded-chicken-rice-veg",
    title: "Taiwanese Shredded Chicken Rice with Vegetables",
    tags: ["taiwanese-style", "rice-based", "warm", "everyday", "bowl", "convenient"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "high",
    worksFor: ["takeout", "home-cooked"],
    mealType: "preference",
    avoidTags: [],
    description: "A practical rice meal with familiar Taiwanese flavors that still keeps the overall feel steady."
  },
  {
    id: "korean-soft-tofu-soup-rice",
    title: "Korean Soft Tofu Soup with Rice",
    tags: ["korean-inspired", "soupy", "warm", "comfort", "gentle"],
    proteinLevel: "medium",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["takeout", "home-cooked"],
    mealType: "light",
    avoidTags: ["spicy"],
    description: "A warm tofu soup meal that feels comforting, protein-supportive, and easier on heavier days."
  },
  {
    id: "dak-galbi-light-bowl",
    title: "Dak-galbi Light Bowl",
    tags: ["korean-inspired", "rice-based", "warm", "bowl", "takeout"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "medium",
    worksFor: ["takeout", "home-cooked"],
    mealType: "preference",
    avoidTags: ["spicy"],
    description: "A Korean-style chicken bowl that stays flavorful without leaning too far into heaviness."
  },
  {
    id: "chicken-taco-rice-bowl",
    title: "Chicken Taco Rice Bowl",
    tags: ["mexican-inspired", "bowl", "takeout", "vegetable-forward"],
    proteinLevel: "high",
    vegetableLevel: "medium",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "high",
    worksFor: ["takeout", "home-cooked"],
    mealType: "preference",
    avoidTags: [],
    description: "A very approachable Mexican-inspired bowl with chicken, rice, and enough vegetables to feel complete."
  },
  {
    id: "shrimp-fajita-plate",
    title: "Shrimp Fajita Plate",
    tags: ["mexican-inspired", "warm", "plate", "vegetable-forward"],
    proteinLevel: "high",
    vegetableLevel: "high",
    carbLevel: "low",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["takeout", "home-cooked"],
    mealType: "balanced",
    avoidTags: ["shellfish"],
    description: "A lighter fajita-style plate that brings plenty of vegetables and steady protein."
  },
  {
    id: "mediterranean-salmon-plate",
    title: "Mediterranean Salmon Plate",
    tags: ["mediterranean", "plate", "balanced", "vegetable-forward", "warm"],
    proteinLevel: "high",
    vegetableLevel: "high",
    carbLevel: "low",
    heaviness: "light",
    convenience: "medium",
    worksFor: ["takeout", "home-cooked"],
    mealType: "balanced",
    avoidTags: ["fish"],
    description: "A Mediterranean-style plate with salmon, vegetables, and a lighter overall profile."
  },
  {
    id: "falafel-rice-salad-bowl",
    title: "Falafel Rice and Salad Bowl",
    tags: ["mediterranean", "bowl", "plant-protein", "vegetable-forward"],
    proteinLevel: "medium",
    vegetableLevel: "high",
    carbLevel: "medium",
    heaviness: "medium",
    convenience: "high",
    worksFor: ["takeout"],
    mealType: "preference",
    avoidTags: [],
    description: "A Mediterranean bowl that adds vegetables and plant protein while staying easy to pick up."
  }
];
var seededState = createSeededState();

// src/logic.ts
var avoidKeywordMap = {
  "Fried food": ["fried", "fried rice", "crispy"],
  Beef: ["beef"],
  Pork: ["pork", "ham", "bacon"],
  Lamb: ["lamb"],
  "Organ meats": ["organ", "liver", "tripe"],
  Egg: ["egg"],
  Dairy: ["dairy", "milk", "yogurt", "greek yogurt", "cottage cheese", "cheese", "caesar", "mayo"],
  Shellfish: ["shrimp", "crab", "shellfish"],
  "Fishy seafood": ["fish", "salmon", "tuna", "cod", "shrimp", "crab", "shellfish", "poke", "seafood"],
  "Spicy food": ["spicy", "kimchi"],
  "Raw food": ["salad", "poke", "cold"],
  "Cold food": ["salad", "poke", "cold"],
  "Sweet drinks": ["milk tea", "boba", "sweet drink", "juice", "soda"],
  "Processed food": ["sausage", "bacon", "ham", "ready-made", "sub", "combo"],
  "Large portions": ["hearty", "filling", "bento", "burrito", "combo", "gyro"],
  "Late-night heavy meals": ["hearty", "comfort", "dumplings", "burrito", "combo", "curry"],
  Cilantro: ["cilantro"],
  Celery: ["celery"],
  "Bitter melon": ["bitter melon"],
  Eggplant: ["eggplant"],
  Okra: ["okra"],
  "Green bell pepper": ["bell pepper"]
};
var preferenceTagMap = {
  "Chinese-style": ["chinese-style", "comfort", "warm", "mapo"],
  "Taiwanese-style": ["taiwanese-style", "bento"],
  Japanese: ["japanese-inspired", "set-meal", "soba", "udon"],
  Korean: ["korean-inspired", "kimchi", "bibimbap"],
  "American light meals": ["american-light", "sandwich", "wrap"],
  "Bowl meals": ["bowl", "rice bowl", "grain bowl", "poke bowl", "bibimbap"],
  "Set meals": ["set-meal", "set meal", "bento", "plate"],
  "Wraps / sandwiches": ["wrap", "sandwich"],
  "Portable meals": ["portable", "wrap", "sandwich", "hand roll"],
  "Soupy meals": ["soupy", "soup", "congee"],
  "Rice-based meals": ["rice-based", "bowl"],
  "Noodle-based meals": ["noodle", "udon", "soba"],
  "High-protein": ["high-protein"],
  "Light meals": ["light", "gentle"],
  "Warm meals": ["warm", "soupy", "comfort", "steamed"],
  "Comfort meals": ["comfort", "gentle", "congee", "soup", "curry"],
  "Quick grocery meals": ["quick", "ready-made", "rotisserie", "microwave", "grocery"],
  "Takeout-friendly": ["takeout", "convenient", "portable", "quick"],
  "Vegetable-forward": ["vegetable-forward", "vegetable", "greens", "salad", "bok choy", "broccoli", "cabbage"],
  "Breakfast-for-dinner": ["breakfast-for-dinner", "omelet", "toast", "egg"],
  "Plant-protein": ["plant-protein", "tofu", "beans", "chickpeas", "edamame", "tempeh"],
  Mediterranean: ["mediterranean", "gyro", "hummus"],
  "Mexican-inspired": ["mexican-inspired", "burrito", "fajita", "quesadilla", "chili"]
};
var createBreakdownItem = (category, points, note) => ({
  category,
  points,
  note
});
var getMealTimeWindow = (date) => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 17 && hour < 21) return "dinner";
  return "late";
};
var getMealFormats = (meal) => {
  const tags = meal.tags.map((tag) => tag.toLowerCase());
  const formats = /* @__PURE__ */ new Set();
  if (tags.some((tag) => tag.includes("soupy") || tag.includes("soup"))) formats.add("soup");
  if (tags.some((tag) => tag.includes("bowl"))) formats.add("bowl");
  if (tags.some((tag) => tag.includes("wrap") || tag.includes("sandwich") || tag.includes("portable"))) formats.add("portable");
  if (tags.some((tag) => tag.includes("set-meal") || tag.includes("bento"))) formats.add("set");
  if (tags.some((tag) => tag.includes("plate"))) formats.add("plate");
  if (tags.some((tag) => tag.includes("breakfast-for-dinner"))) formats.add("breakfast");
  if (tags.some((tag) => tag.includes("cold-meal"))) formats.add("cold");
  if (tags.some((tag) => tag.includes("warm") || tag.includes("comfort"))) formats.add("warm");
  if (formats.size === 0) formats.add(meal.mealType);
  return [...formats];
};
var flattenMeals = (todayLog) => Object.values(todayLog);
var flattenHistoryMeals = (history) => history.flatMap((day) => flattenMeals(day.todayLog)).filter(isMealLogged);
var toStatus = (value, lowMax, mediumMax) => {
  if (value <= lowMax) return "low";
  if (value <= mediumMax) return "medium";
  return "high";
};
var getCategoryUnits = (items) => {
  if (items.length === 0) return 0;
  return 1 + Math.min(items.length - 1, 2) * 0.5;
};
var getHeavinessUnits = (meal) => {
  let value = 0;
  if (meal.portion === "Large") value += 1.5;
  else if (meal.portion === "Medium" && isMealLogged(meal)) value += 0.25;
  if (meal.cookingMethod === "Fried") value += 1.5;
  else if (meal.cookingMethod === "Stir-fried") value += 0.75;
  else if (meal.cookingMethod === "Soup / stew") value -= 0.25;
  return Math.max(0, value);
};
var getFriedOilyUnits = (meal) => {
  if (meal.cookingMethod === "Fried") return 2;
  if (meal.cookingMethod === "Stir-fried") return 1;
  return 0;
};
var getConvenienceUnits = (meal) => {
  if (meal.mealSource === "Ready-made") return 1.25;
  if (meal.mealSource === "Takeout" || meal.mealSource === "Restaurant") return 1;
  return 0;
};
var sweetDrinkKeywords = ["milk tea", "boba", "soda", "sweet drink", "sports drink", "energy drink", "orange juice", "apple juice", "smoothie"];
var alcoholKeywords = ["beer", "wine", "cocktail", "alcohol"];
var dessertSnackKeywords = [
  "cake",
  "cupcake",
  "brownie",
  "donut",
  "cheesecake",
  "ice cream",
  "ice cream bar",
  "frozen yogurt",
  "pudding",
  "cookies",
  "cookie sandwich",
  "chocolate",
  "muffin",
  "pastry"
];
var serializeMeal = (meal) => [meal.title, meal.description, ...meal.tags, ...meal.avoidTags].join(" ").toLowerCase();
var detectMealFormatSignals = (meal) => {
  const riceHeavy = meal.carbs.some((item) => item.toLowerCase().includes("rice") || item.toLowerCase().includes("congee"));
  const noodleHeavy = meal.carbs.some((item) => item.toLowerCase().includes("noodle") || item.toLowerCase().includes("pasta"));
  return {
    riceHeavy,
    noodleHeavy,
    friedLike: meal.cookingMethod === "Fried" || meal.cookingMethod === "Stir-fried"
  };
};
var summarizeWeeklyPatterns = (history) => {
  const meals = flattenHistoryMeals(history);
  const riceHeavyCount = meals.filter((meal) => detectMealFormatSignals(meal).riceHeavy).length;
  const noodleHeavyCount = meals.filter((meal) => detectMealFormatSignals(meal).noodleHeavy).length;
  const friedCount = meals.filter((meal) => detectMealFormatSignals(meal).friedLike).length;
  const takeoutCount = meals.filter((meal) => meal.mealSource === "Takeout" || meal.mealSource === "Restaurant").length;
  const homeCount = meals.filter((meal) => meal.mealSource === "Home-cooked").length;
  const vegetableMeals = meals.filter((meal) => meal.vegetables.length > 0).length;
  return {
    mealsCount: meals.length,
    riceHeavyCount,
    noodleHeavyCount,
    friedCount,
    takeoutCount,
    homeCount,
    vegetableMeals
  };
};
var summarizeTodayIntake = (todayLog) => {
  const meals = flattenMeals(todayLog);
  const proteinCount = meals.reduce((sum, meal) => sum + getCategoryUnits(meal.protein), 0);
  const vegetableCount = meals.reduce((sum, meal) => sum + getCategoryUnits(meal.vegetables), 0);
  const carbCount = meals.reduce((sum, meal) => sum + getCategoryUnits(meal.carbs), 0);
  const fruitCount = meals.reduce((sum, meal) => sum + getCategoryUnits(meal.fruit), 0);
  const soupCount = meals.reduce((sum, meal) => sum + getCategoryUnits(meal.soup), 0);
  const drinkCount = meals.reduce((sum, meal) => sum + getCategoryUnits(meal.drink), 0);
  const sweetDrinkCount = meals.reduce(
    (sum, meal) => sum + meal.drink.filter((item) => sweetDrinkKeywords.includes(item.toLowerCase())).length,
    0
  );
  const alcoholCount = meals.reduce(
    (sum, meal) => sum + meal.drink.filter((item) => alcoholKeywords.includes(item.toLowerCase())).length,
    0
  );
  const dessertSnackCount = meals.reduce(
    (sum, meal) => sum + meal.carbs.filter((item) => dessertSnackKeywords.includes(item.toLowerCase())).length,
    0
  );
  const heavyMeals = meals.reduce((sum, meal) => sum + getHeavinessUnits(meal), 0);
  const friedMeals = meals.reduce((sum, meal) => sum + getFriedOilyUnits(meal), 0);
  const convenienceMeals = meals.reduce((sum, meal) => sum + getConvenienceUnits(meal), 0);
  const homeCookedMeals = meals.filter((meal) => meal.mealSource === "Home-cooked").length;
  const takeoutMeals = meals.filter((meal) => meal.mealSource === "Takeout" || meal.mealSource === "Restaurant").length;
  return {
    proteinStatus: toStatus(proteinCount, 1.25, 2.5),
    vegetableStatus: toStatus(vegetableCount, 1.25, 2.5),
    carbStatus: toStatus(carbCount, 1.25, 2.5),
    heavinessStatus: toStatus(heavyMeals, 0.75, 2),
    friedOilyStatus: toStatus(friedMeals, 0.75, 1.75),
    convenienceStatus: toStatus(convenienceMeals, 0.75, 1.75),
    proteinCount,
    vegetableCount,
    carbCount,
    fruitCount,
    soupCount,
    drinkCount,
    sweetDrinkCount,
    alcoholCount,
    dessertSnackCount,
    heavyMeals,
    friedMeals,
    convenienceMeals,
    homeCookedMeals,
    takeoutMeals
  };
};
var isMealLogged = (meal) => meal.protein.length > 0 || meal.vegetables.length > 0 || meal.carbs.length > 0 || meal.fruit.length > 0 || meal.soup.length > 0 || meal.drink.length > 0;
var mealSummaryChips = (meal) => {
  const picked = [...meal.protein, ...meal.vegetables, ...meal.carbs, ...meal.fruit, ...meal.drink].filter(Boolean);
  return picked.slice(0, 4);
};
var scoreProteinBalance = (summary, meal) => {
  if (summary.proteinStatus === "low") {
    if (meal.proteinLevel === "high") return createBreakdownItem("protein", 3, "Protein is low today, so high-protein meals get a strong boost.");
    if (meal.proteinLevel === "medium") return createBreakdownItem("protein", 2, "Protein is low today, so medium-protein meals still help.");
  }
  if (summary.proteinStatus === "high" && meal.proteinLevel === "high" && meal.heaviness !== "light") {
    return createBreakdownItem("protein", -1, "Protein is already strong today, so heavier protein-forward meals get a slight pullback.");
  }
  return createBreakdownItem("protein", 0, "Protein fit is neutral for this meal.");
};
var scoreVegetableBalance = (summary, meal) => {
  if (summary.vegetableStatus === "low") {
    if (meal.vegetableLevel === "high") return createBreakdownItem("vegetables", 3, "Vegetables are light today, so vegetable-forward meals get priority.");
    if (meal.vegetableLevel === "medium") return createBreakdownItem("vegetables", 2, "Vegetables are still a need, so this gets a moderate boost.");
  }
  if (summary.vegetableStatus !== "low" && meal.vegetableLevel === "high") {
    return createBreakdownItem("vegetables", 1, "Extra vegetables are still a nice plus even though today already has some.");
  }
  return createBreakdownItem("vegetables", 0, "Vegetable fit is neutral for this meal.");
};
var scoreCarbBalance = (summary, meal) => {
  if (summary.carbStatus === "high") {
    if (meal.carbLevel === "high") return createBreakdownItem("carbs", -2, "Carbs are already running high today, so carb-heavy meals get reduced.");
    if (meal.carbLevel === "medium") return createBreakdownItem("carbs", 1, "Moderate carbs still fit reasonably well today.");
    return createBreakdownItem("carbs", 2, "Lower-carb meals fit well after a carb-heavier day.");
  }
  return createBreakdownItem("carbs", 0, "Carb balance is neutral for this meal.");
};
var scoreHeavinessBalance = (summary, meal) => {
  if (summary.heavinessStatus === "high" || summary.friedOilyStatus === "high") {
    if (meal.heaviness === "light") return createBreakdownItem("heaviness", 3, "Today already feels heavy, so lighter meals move up.");
    if (meal.heaviness === "medium") return createBreakdownItem("heaviness", 1, "Medium-heaviness still works, but less strongly.");
    return createBreakdownItem("heaviness", -3, "Heavy meals get penalized after a heavier or fried day.");
  }
  if (summary.heavinessStatus === "medium") {
    if (meal.heaviness === "light") return createBreakdownItem("heaviness", 2, "A lighter meal still fits well after a medium-feeling day.");
    if (meal.heaviness === "heavy") return createBreakdownItem("heaviness", -1, "Heavier meals get a small penalty here.");
  }
  return createBreakdownItem("heaviness", 0, "Heaviness fit is neutral for this meal.");
};
var scoreConvenienceFit = (summary, profile, meal) => {
  let score = 0;
  const notes = [];
  if (profile.eatingStyle === "Mostly takeout") {
    if (meal.convenience === "high") {
      score += 3;
      notes.push("High convenience matches a takeout-leaning style.");
    } else if (meal.convenience === "medium") {
      score += 2;
      notes.push("Medium convenience still works for a takeout-leaning style.");
    }
    if (meal.worksFor.includes("takeout")) {
      score += 2;
      notes.push("This meal works well as takeout.");
    }
  }
  if (profile.eatingStyle === "Mostly home-cooked") {
    if (meal.worksFor.includes("home-cooked")) {
      score += 2;
      notes.push("This meal fits a home-cooked routine.");
    }
    if (meal.convenience === "high") {
      score += 1;
      notes.push("It also keeps effort low.");
    }
  }
  if (profile.eatingStyle === "Both") {
    if (meal.worksFor.length > 1) {
      score += 2;
      notes.push("It stays flexible for both home and takeout.");
    } else {
      score += 1;
      notes.push("It still fits one side of a mixed routine.");
    }
  }
  if (summary.convenienceStatus === "high") {
    if (meal.convenience === "high") {
      score += 2;
      notes.push("Today's meals already lean practical, so a high-convenience option fits well.");
    } else if (meal.convenience === "medium") {
      score += 1;
      notes.push("A medium-effort option still fits today's practical rhythm.");
    }
  }
  return createBreakdownItem("convenience", score, notes.join(" ") || "Convenience fit is neutral for this meal.");
};
var estimateFrameNeeds = (profile) => {
  const heightCm = profile.heightUnit === "cm" ? Number(profile.heightCm) : Number(profile.heightFt || 0) * 30.48 + Number(profile.heightIn || 0) * 2.54;
  const weightKg = profile.weightUnit === "kg" ? Number(profile.weightKg) : Number(profile.weightLb || 0) / 2.20462;
  const taller = Number.isFinite(heightCm) && heightCm >= 175;
  const heavier = Number.isFinite(weightKg) && weightKg >= 75;
  return {
    biggerFrame: taller || heavier,
    smallerFrame: Number.isFinite(heightCm) && Number.isFinite(weightKg) && heightCm > 0 && weightKg > 0 && heightCm <= 160 && weightKg <= 55
  };
};
var scoreProfileFit = (profile, meal) => {
  let score = 0;
  const notes = [];
  const { biggerFrame, smallerFrame } = estimateFrameNeeds(profile);
  if (profile.activityLevel === "Active") {
    if (meal.proteinLevel === "high") {
      score += 1;
      notes.push("Higher activity makes stronger protein support a nice fit.");
    }
    if (meal.carbLevel !== "low") {
      score += 1;
      notes.push("A moderate amount of carbs fits a more active routine.");
    }
  }
  if (profile.activityLevel === "Low") {
    if (meal.heaviness === "light") {
      score += 1;
      notes.push("A lighter meal often fits a lower-key day well.");
    }
    if (meal.heaviness === "heavy") {
      score -= 1;
      notes.push("Very heavy meals get a small pullback for a lower-key routine.");
    }
  }
  if (biggerFrame && meal.proteinLevel === "high" && meal.heaviness !== "heavy") {
    score += 1;
    notes.push("A steadier protein-forward meal may fit your usual needs a little better.");
  }
  if (smallerFrame && meal.heaviness === "heavy") {
    score -= 1;
    notes.push("Extra-heavy options get a light pullback here.");
  }
  if (profile.feelToday === "Want something warm") {
    const warmTags = meal.tags.map((tag) => tag.toLowerCase());
    const isSoupyGentle = warmTags.some((tag) => ["soupy", "gentle"].includes(tag));
    const isComfortWarm = warmTags.some((tag) => ["comfort", "warm"].includes(tag));
    if (isSoupyGentle) {
      score += 4;
      notes.push("Soupy or gentler meals are the closest match when you want something warm.");
    } else if (isComfortWarm) {
      score += 3;
      notes.push("Warm and comforting meals fit how you feel today.");
    }
    if (meal.heaviness === "light") {
      score += 1;
      notes.push("Keeping the meal warm without too much heaviness is a nice fit here.");
    }
  }
  if (profile.feelToday === "Need something light") {
    if (meal.heaviness === "light") {
      score += 2;
      notes.push("A lighter meal fits how you want today to feel.");
    } else if (meal.heaviness === "heavy") {
      score -= 2;
      notes.push("Heavier meals get pulled back because you want something lighter today.");
    }
  }
  if (profile.feelToday === "Low energy") {
    if (meal.convenience === "high") {
      score += 2;
      notes.push("Lower-energy days benefit from meals that are easier to follow through on.");
    }
    if (meal.tags.some((tag) => ["comfort", "warm", "soupy"].includes(tag.toLowerCase()))) {
      score += 1;
      notes.push("Something warmer or more comforting can fit a lower-energy day well.");
    }
  }
  if (profile.feelToday === "On period") {
    if (meal.tags.some((tag) => ["warm", "comfort", "soupy", "gentle"].includes(tag.toLowerCase()))) {
      score += 4;
      notes.push("Warmer, gentler meals often feel better for this kind of day.");
    }
    if (meal.proteinLevel === "high" || meal.proteinLevel === "medium") {
      score += 1;
      notes.push("A steadier meal with some protein can be a helpful fit today.");
    }
    if (meal.heaviness === "light") {
      score += 1;
      notes.push("Lighter meals tend to pair better with this kind of day.");
    }
  }
  return createBreakdownItem("profile", score, notes.join(" ") || "Profile fit is neutral for this meal.");
};
var scoreFeelPriority = (profile, meal) => {
  const tags = meal.tags.map((tag) => tag.toLowerCase());
  if (profile.feelToday === "Want something warm") {
    const warmGentle = tags.some((tag) => ["soupy", "comfort", "gentle"].includes(tag));
    const soupyGentle = tags.some((tag) => ["soupy", "gentle"].includes(tag));
    if (soupyGentle && meal.heaviness === "light") return 4;
    if (warmGentle && meal.heaviness === "light") return 2.5;
    if (soupyGentle) return 2;
    if (tags.includes("warm")) return 1;
  }
  if (profile.feelToday === "On period") {
    const gentleComfort = tags.some((tag) => ["soupy", "comfort", "gentle"].includes(tag));
    if (gentleComfort && meal.heaviness === "light") return 4;
    if (gentleComfort) return 2;
  }
  if (profile.feelToday === "Low energy") {
    const easyAndComforting = meal.convenience === "high" && tags.some((tag) => ["comfort", "warm", "soupy", "grocery", "quick"].includes(tag));
    if (easyAndComforting) return 2;
  }
  if (profile.feelToday === "Need something light" && meal.heaviness === "light") {
    return 1.5;
  }
  return 0;
};
var scorePreferenceFit = (profile, meal) => {
  let score = 0;
  const mealText = serializeMeal(meal);
  const mealTags = meal.tags.map((tag) => tag.toLowerCase());
  const matches = [];
  profile.preferenceTags.forEach((tag) => {
    const mapped = preferenceTagMap[tag] ?? [tag.toLowerCase()];
    if (mapped.some((keyword) => mealText.includes(keyword.toLowerCase()))) {
      score += 2;
      matches.push(tag);
      if (tag === "Korean" && mealTags.includes("korean-inspired") || tag === "Taiwanese-style" && mealTags.includes("taiwanese-style") || tag === "Chinese-style" && mealTags.includes("chinese-style") || tag === "Mediterranean" && mealTags.includes("mediterranean") || tag === "Mexican-inspired" && mealTags.includes("mexican-inspired") || tag === "Japanese" && mealTags.includes("japanese-inspired")) {
        score += 1;
      }
    }
  });
  const capped = Math.min(score, 8);
  return createBreakdownItem("preferences", capped, matches.length > 0 ? `Matches your preferences for ${matches.join(", ")}.` : "No strong preference match here.");
};
var scoreAvoidConflicts = (profile, meal) => {
  let score = 0;
  const mealText = serializeMeal(meal);
  const conflicts = [];
  const mealTags = meal.tags.map((tag) => tag.toLowerCase());
  profile.avoidTags.forEach((avoid) => {
    const normalized = avoid.toLowerCase();
    if (meal.avoidTags.map((tag) => tag.toLowerCase()).includes(normalized)) {
      score -= 3;
      conflicts.push(avoid);
      return;
    }
    const matchedKeywords = avoidKeywordMap[avoid];
    if (matchedKeywords?.some((keyword) => mealText.includes(keyword))) {
      score -= 3;
      conflicts.push(avoid);
      return;
    }
    if (avoid === "Fried food" && mealText.includes("fried")) {
      score -= 3;
      conflicts.push(avoid);
      return;
    }
    if (avoid === "Large portions" && meal.heaviness === "heavy") {
      score -= 2;
      conflicts.push(avoid);
      return;
    }
    if (avoid === "Late-night heavy meals" && meal.heaviness !== "light") {
      score -= meal.heaviness === "heavy" ? 3 : 1;
      conflicts.push(avoid);
      return;
    }
    if ((avoid === "Cold food" || avoid === "Raw food") && mealTags.includes("cold-meal")) {
      score -= 3;
      conflicts.push(avoid);
    }
  });
  return createBreakdownItem("avoid", score, conflicts.length > 0 ? `Conflicts with avoid tags: ${conflicts.join(", ")}.` : "No avoid-tag conflicts detected.");
};
var scoreVariety = (todayLog, meal) => {
  const meals = flattenMeals(todayLog);
  const riceHeavyCount = meals.filter((entry) => detectMealFormatSignals(entry).riceHeavy).length;
  const noodleHeavyCount = meals.filter((entry) => detectMealFormatSignals(entry).noodleHeavy).length;
  let score = 0;
  const notes = [];
  if (riceHeavyCount >= 2 && meal.tags.some((tag) => ["rice-based", "bowl"].includes(tag.toLowerCase()))) {
    score -= 1;
    notes.push("Slightly reduced because today already had multiple rice-style meals.");
  }
  if (noodleHeavyCount >= 2 && meal.tags.some((tag) => tag.toLowerCase().includes("noodle"))) {
    score -= 1;
    notes.push("Slightly reduced because noodles already showed up a lot today.");
  }
  return createBreakdownItem("variety", score, notes.join(" ") || "Variety fit is neutral for this meal.");
};
var scoreSnackDrinkFit = (summary, meal) => {
  let score = 0;
  const notes = [];
  if (summary.sweetDrinkCount + summary.dessertSnackCount >= 2) {
    if (meal.vegetableLevel === "high") {
      score += 2;
      notes.push("Sweeter snacks or drinks already showed up today, so meals with more vegetables move up.");
    } else if (meal.heaviness === "light") {
      score += 1;
      notes.push("A lighter meal can feel like a steadier next step after sweeter snacks or drinks.");
    }
  }
  if (summary.alcoholCount >= 1) {
    if (meal.heaviness === "light") {
      score += 2;
      notes.push("A lighter meal often fits better after alcohol earlier in the day.");
    }
    if (meal.vegetableLevel !== "low" || meal.proteinLevel !== "low") {
      score += 1;
      notes.push("Meals with some protein or vegetables tend to feel steadier here.");
    }
  }
  return createBreakdownItem("snack-drink", score, notes.join(" ") || "Snack and drink fit is neutral for this meal.");
};
var scoreTimeOfDayFit = (timeWindow, meal) => {
  const tags = meal.tags.map((tag) => tag.toLowerCase());
  let score = 0;
  const notes = [];
  if (timeWindow === "breakfast") {
    if (tags.includes("breakfast-for-dinner") || tags.includes("quick")) {
      score += 2;
      notes.push("This fits an earlier-in-the-day meal window.");
    } else if (meal.heaviness === "heavy") {
      score -= 1;
      notes.push("Heavier options get a small pullback earlier in the day.");
    }
  }
  if (timeWindow === "lunch") {
    if (meal.mealType === "balanced" || tags.includes("bowl") || tags.includes("plate")) {
      score += 1;
      notes.push("This fits a more standard lunch-style meal.");
    }
  }
  if (timeWindow === "dinner") {
    if (tags.includes("breakfast-for-dinner")) {
      score -= 1;
      notes.push("Breakfast-style meals stay possible at dinner, but get a small pullback.");
    }
    if (tags.some((tag) => ["warm", "comfort", "soupy", "set-meal", "plate"].includes(tag))) {
      score += 1;
      notes.push("Warmer or more complete meals fit dinner a little better.");
    }
  }
  if (timeWindow === "late") {
    if (meal.heaviness === "light") {
      score += 2;
      notes.push("Lighter meals fit a later meal window better.");
    }
    if (tags.some((tag) => ["soupy", "gentle", "warm"].includes(tag))) {
      score += 1;
      notes.push("Warm, gentler meals are a good fit later on.");
    }
    if (meal.heaviness === "heavy") {
      score -= 2;
      notes.push("Heavy meals get pulled back later in the day.");
    }
  }
  return createBreakdownItem("time-of-day", score, notes.join(" ") || "Time-of-day fit is neutral for this meal.");
};
var scoreWeeklyPatternFit = (history, meal) => {
  const weekly = summarizeWeeklyPatterns(history);
  if (weekly.mealsCount === 0) {
    return createBreakdownItem("weekly-pattern", 0, "Not enough weekly data yet to shape this recommendation.");
  }
  let score = 0;
  const notes = [];
  const lowerTags = meal.tags.map((tag) => tag.toLowerCase());
  if (weekly.riceHeavyCount >= 4 && lowerTags.some((tag) => tag.includes("rice-based") || tag.includes("bowl"))) {
    score -= 1;
    notes.push("Your recent week already leaned rice-heavy, so this gets a small variety penalty.");
  }
  if (weekly.noodleHeavyCount >= 4 && lowerTags.some((tag) => tag.includes("noodle") || tag.includes("udon") || tag.includes("soba"))) {
    score -= 1;
    notes.push("Noodles already showed up often this week, so this is slightly less distinct.");
  }
  if (weekly.friedCount >= 3) {
    if (meal.heaviness === "light") {
      score += 2;
      notes.push("The week has already had some heavier meals, so lighter options move up.");
    } else if (meal.heaviness === "heavy") {
      score -= 2;
      notes.push("Heavier meals get pulled back after a heavier week.");
    }
  }
  if (weekly.vegetableMeals < Math.max(4, Math.ceil(weekly.mealsCount * 0.45))) {
    if (meal.vegetableLevel === "high") {
      score += 2;
      notes.push("Vegetables have been a bit light across the week, so this gets a boost.");
    } else if (meal.vegetableLevel === "medium") {
      score += 1;
      notes.push("This helps bring vegetables back into the weekly mix.");
    }
  }
  if (weekly.takeoutCount > weekly.homeCount && meal.worksFor.includes("takeout")) {
    score += 1;
    notes.push("This fits the more takeout-leaning rhythm from recent days.");
  }
  if (weekly.homeCount > weekly.takeoutCount && meal.worksFor.includes("home-cooked")) {
    score += 1;
    notes.push("This fits the more home-style rhythm from recent days.");
  }
  return createBreakdownItem("weekly-pattern", score, notes.join(" ") || "Weekly pattern fit is neutral for this meal.");
};
var scoreBalanceBias = (summary, meal) => {
  const protein = scoreProteinBalance(summary, meal);
  const vegetables = scoreVegetableBalance(summary, meal);
  const carbs = scoreCarbBalance(summary, meal);
  const heaviness = scoreHeavinessBalance(summary, meal);
  return {
    items: [protein, vegetables, carbs, heaviness],
    total: protein.points + vegetables.points + carbs.points + heaviness.points
  };
};
var trendLabelMap = {
  "Rice-based meals": { en: "rice-based meals", zh: "\u98EF\u985E\u9910\u9EDE" },
  "Noodle-based meals": { en: "noodle-based meals", zh: "\u9EB5\u985E\u9910\u9EDE" },
  "Soupy meals": { en: "soupy meals", zh: "\u6E6F\u985E\u9910\u9EDE" },
  "Warm meals": { en: "warm meals", zh: "\u6EAB\u71B1\u9910\u9EDE" },
  "Light meals": { en: "lighter meal formats", zh: "\u6BD4\u8F03\u6E05\u723D\u7684\u9910\u578B" },
  "Takeout-friendly": { en: "takeout-friendly choices", zh: "\u5916\u5E36\u53CB\u5584\u7684\u9078\u64C7" },
  "Quick grocery meals": { en: "quick grocery meals", zh: "\u8D85\u5E02\u5FEB\u901F\u7D44\u5408\u9910" },
  "Plant-protein": { en: "plant-protein options", zh: "\u690D\u7269\u6027\u86CB\u767D\u9078\u9805" },
  "Vegetable-forward": { en: "vegetable-forward meals", zh: "\u852C\u83DC\u6BD4\u4F8B\u8F03\u9AD8\u7684\u9910\u9EDE" },
  "Portable meals": { en: "portable meals", zh: "\u65B9\u4FBF\u651C\u5E36\u7684\u9910\u9EDE" }
};
var observedTrendLabelMap = {
  "rice-based meals": { en: "rice-based meals", zh: "\u98EF\u985E\u9910\u9EDE" },
  "noodle-based meals": { en: "noodle-based meals", zh: "\u9EB5\u985E\u9910\u9EDE" },
  "soupy meals": { en: "soupy meals", zh: "\u6E6F\u985E\u9910\u9EDE" },
  "warm meals": { en: "warm meals", zh: "\u6EAB\u71B1\u9910\u9EDE" },
  "lighter meal formats": { en: "lighter meal formats", zh: "\u6BD4\u8F03\u6E05\u723D\u7684\u9910\u578B" },
  "takeout-friendly choices": { en: "takeout-friendly choices", zh: "\u5916\u5E36\u53CB\u5584\u7684\u9078\u64C7" },
  "home-style meals": { en: "home-style meals", zh: "\u5BB6\u5E38\u578B\u9910\u9EDE" },
  "plant-protein options": { en: "plant-protein options", zh: "\u690D\u7269\u6027\u86CB\u767D\u9078\u9805" },
  "vegetable-forward meals": { en: "vegetable-forward meals", zh: "\u852C\u83DC\u6BD4\u4F8B\u8F03\u9AD8\u7684\u9910\u9EDE" },
  "portable meals": { en: "portable meals", zh: "\u65B9\u4FBF\u651C\u5E36\u7684\u9910\u9EDE" }
};
var joinList = (items, locale) => {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return locale === "en" ? `${items[0]} and ${items[1]}` : `${items[0]}\u548C${items[1]}`;
  return locale === "en" ? `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}` : `${items.slice(0, -1).join("\u3001")}\u548C${items[items.length - 1]}`;
};
var describeTrend = (key, locale) => trendLabelMap[key]?.[locale] ?? key;
var describeObservedTrend = (key, locale) => observedTrendLabelMap[key]?.[locale] ?? key;
var getPrimaryReason = (summary, profile, meal, locale) => {
  if (summary.sweetDrinkCount + summary.dessertSnackCount >= 2 && meal.vegetableLevel === "high") {
    return locale === "en" ? "A steadier next meal if snacks or sweeter drinks already showed up earlier." : "\u5982\u679C\u524D\u9762\u5DF2\u7D93\u6709\u9EDE\u5FC3\u6216\u504F\u751C\u98F2\u6599\uFF0C\u9019\u6703\u662F\u66F4\u7A69\u4E00\u9EDE\u7684\u4E0B\u4E00\u9910\u3002";
  }
  if (summary.alcoholCount >= 1 && meal.heaviness === "light") {
    return locale === "en" ? "A lighter option that can feel more comfortable after drinks earlier in the day." : "\u5982\u679C\u4ECA\u5929\u524D\u9762\u6709\u559D\u9152\uFF0C\u9019\u6703\u662F\u6BD4\u8F03\u8212\u670D\u3001\u4E5F\u6BD4\u8F03\u8F15\u4E00\u9EDE\u7684\u9078\u64C7\u3002";
  }
  if (summary.vegetableStatus === "low" && meal.vegetableLevel === "high" && meal.proteinLevel !== "low") {
    return locale === "en" ? "Good for adding more vegetables and steady protein after a lighter produce day." : "\u5F88\u9069\u5408\u5728\u4ECA\u5929\u852C\u83DC\u504F\u5C11\u7684\u60C5\u6CC1\u4E0B\uFF0C\u88DC\u56DE\u4E00\u4E9B\u852C\u83DC\u548C\u7A69\u5B9A\u86CB\u767D\u8CEA\u3002";
  }
  if ((summary.heavinessStatus === "high" || summary.friedOilyStatus === "high") && meal.heaviness === "light") {
    return locale === "en" ? "A lighter option if today's meals already felt heavy." : "\u5982\u679C\u4ECA\u5929\u524D\u9762\u5E7E\u9910\u5DF2\u7D93\u504F\u91CD\uFF0C\u9019\u6703\u662F\u6BD4\u8F03\u8F15\u76C8\u7684\u4E0B\u4E00\u9910\u3002";
  }
  if (meal.convenience === "high") {
    return locale === "en" ? "Practical when you want balance with minimal effort." : "\u60F3\u5403\u5F97\u6BD4\u8F03\u5E73\u8861\u3001\u53C8\u4E0D\u60F3\u592A\u8CBB\u529B\u6642\uFF0C\u9019\u500B\u5F88\u5BE6\u969B\u3002";
  }
  if (scorePreferenceFit(profile, meal).points > 0) {
    return locale === "en" ? "Fits your saved preferences without feeling one-note." : "\u7B26\u5408\u4F60\u5E73\u5E38\u7684\u504F\u597D\uFF0C\u540C\u6642\u53C8\u4E0D\u6703\u592A\u55AE\u8ABF\u3002";
  }
  return locale === "en" ? "A realistic next meal that keeps things balanced and easy to act on." : "\u662F\u4E00\u500B\u5BE6\u969B\u3001\u5E73\u8861\uFF0C\u4E5F\u5BB9\u6613\u7ACB\u523B\u57F7\u884C\u7684\u4E0B\u4E00\u9910\u9078\u64C7\u3002";
};
var buildRecommendationReason = (label, summary, profile, meal, locale) => {
  if (label === "Most Convenient") {
    if (meal.convenience === "high") return locale === "en" ? "A low-friction option when you want something practical and easy to follow through on." : "\u60F3\u5403\u5F97\u5BE6\u969B\u3001\u53C8\u5BB9\u6613\u505A\u5230\u6642\uFF0C\u9019\u662F\u4E00\u500B\u4F4E\u963B\u529B\u7684\u9078\u64C7\u3002";
    if (scorePreferenceFit(profile, meal).points > 0) return locale === "en" ? "Keeps things convenient while still lining up with the styles you usually enjoy." : "\u5728\u4FDD\u6301\u65B9\u4FBF\u7684\u540C\u6642\uFF0C\u4E5F\u9084\u662F\u8CBC\u8FD1\u4F60\u5E73\u5E38\u559C\u6B61\u7684\u9910\u578B\u3002";
    return locale === "en" ? "An easier next step that still keeps the meal feeling reasonably balanced." : "\u662F\u500B\u66F4\u5BB9\u6613\u57F7\u884C\u7684\u4E0B\u4E00\u6B65\uFF0C\u4E5F\u9084\u4FDD\u7559\u4E86\u57FA\u672C\u7684\u5E73\u8861\u611F\u3002";
  }
  if (label === "Best Balance") {
    if (summary.vegetableStatus === "low" && meal.vegetableLevel !== "low") return locale === "en" ? "A steadier choice for bringing protein, vegetables, and overall balance back into the day." : "\u5982\u679C\u4ECA\u5929\u852C\u83DC\u504F\u5C11\uFF0C\u9019\u6703\u662F\u6BD4\u8F03\u7A69\u7684\u9078\u64C7\uFF0C\u80FD\u628A\u86CB\u767D\u8CEA\u3001\u852C\u83DC\u548C\u6574\u9AD4\u5E73\u8861\u88DC\u56DE\u4F86\u3002";
    if ((summary.heavinessStatus === "high" || summary.friedOilyStatus === "high") && meal.heaviness === "light") return locale === "en" ? "A gentler pick when the earlier meals already carried more weight." : "\u5982\u679C\u524D\u9762\u5E7E\u9910\u5DF2\u7D93\u504F\u91CD\uFF0C\u9019\u6703\u662F\u66F4\u6EAB\u548C\u4E00\u9EDE\u7684\u9078\u64C7\u3002";
    return locale === "en" ? "A more balanced pick for keeping the next meal supportive and not overcomplicated." : "\u662F\u6BD4\u8F03\u5E73\u8861\u7684\u4E00\u5F35\u5361\uFF0C\u8B93\u4E0B\u4E00\u9910\u6709\u652F\u6301\u611F\uFF0C\u4F46\u4E0D\u6703\u592A\u8907\u96DC\u3002";
  }
  return getPrimaryReason(summary, profile, meal, locale);
};
var getBaseBalanceNote = (meal, locale) => {
  const parts = [];
  if (meal.proteinLevel === "high") parts.push(locale === "en" ? "strong on protein" : "\u86CB\u767D\u8CEA\u5F88\u7A69");
  else if (meal.proteinLevel === "medium") parts.push(locale === "en" ? "steady on protein" : "\u86CB\u767D\u8CEA\u9069\u4E2D");
  if (meal.vegetableLevel === "high") parts.push(locale === "en" ? "good vegetable coverage" : "\u852C\u83DC\u6BD4\u4F8B\u4E0D\u932F");
  else if (meal.vegetableLevel === "medium") parts.push(locale === "en" ? "some vegetables built in" : "\u6709\u5E36\u4E00\u4E9B\u852C\u83DC");
  if (meal.carbLevel === "low") parts.push(locale === "en" ? "lighter on carbs" : "\u78B3\u6C34\u6BD4\u8F03\u8F15");
  else if (meal.carbLevel === "medium") parts.push(locale === "en" ? "moderate carbs" : "\u78B3\u6C34\u9069\u4E2D");
  return parts.slice(0, 2).join(locale === "en" ? " with " : "\uFF0C");
};
var generateBalanceNote = (label, meal, locale) => {
  const base = getBaseBalanceNote(meal, locale);
  if (label === "Most Convenient") return locale === "en" ? `${base}; easier to pull off on a busy day.` : `${base}\uFF1B\u5FD9\u788C\u7684\u65E5\u5B50\u4E5F\u6BD4\u8F03\u5BB9\u6613\u505A\u5230\u3002`;
  if (label === "Best Balance") return locale === "en" ? `${base}; a steadier overall composition.` : `${base}\uFF1B\u6574\u9AD4\u7D44\u5408\u66F4\u7A69\u4E00\u4E9B\u3002`;
  return base;
};
var scoreMealOption = (summary, todayLog, history, profile, meal, timeWindow, locale) => {
  const balance = scoreBalanceBias(summary, meal);
  const convenience = scoreConvenienceFit(summary, profile, meal);
  const profileFit = scoreProfileFit(profile, meal);
  const preferences = scorePreferenceFit(profile, meal);
  const avoid = scoreAvoidConflicts(profile, meal);
  const variety = scoreVariety(todayLog, meal);
  const snackDrink = scoreSnackDrinkFit(summary, meal);
  const timeOfDay = scoreTimeOfDayFit(timeWindow, meal);
  const weeklyPattern = scoreWeeklyPatternFit(history, meal);
  const balanceScore = balance.total;
  const convenienceScore = convenience.points;
  const preferenceScore = preferences.points;
  const avoidScore = avoid.points;
  const varietyScore = variety.points;
  const weeklyPatternScore = weeklyPattern.points;
  const score = balanceScore + convenienceScore + profileFit.points + preferenceScore + avoidScore + varietyScore + snackDrink.points + timeOfDay.points + weeklyPatternScore;
  return {
    ...meal,
    score,
    balanceScore,
    convenienceScore,
    preferenceScore,
    avoidScore,
    varietyScore,
    weeklyPatternScore,
    label: "Best Match",
    shortReason: buildRecommendationReason("Best Match", summary, profile, meal, locale),
    balanceNote: generateBalanceNote("Best Match", meal, locale),
    convenienceLabel: locale === "en" ? meal.convenience.charAt(0).toUpperCase() + meal.convenience.slice(1) : meal.convenience === "high" ? "\u9AD8" : meal.convenience === "medium" ? "\u4E2D" : "\u4F4E",
    scoreBreakdown: [...balance.items, convenience, profileFit, preferences, avoid, variety, snackDrink, timeOfDay, weeklyPattern]
  };
};
var dedupeRecommendations = (items) => {
  const pickedTitles = /* @__PURE__ */ new Set();
  return items.filter((item) => {
    if (pickedTitles.has(item.title)) return false;
    pickedTitles.add(item.title);
    return true;
  });
};
var FAIRNESS_SCORE_WINDOW = 3;
var FAIRNESS_MIN_POOL = 6;
var FAIRNESS_MAX_POOL = 12;
var genericFairnessTags = /* @__PURE__ */ new Set([
  "balanced",
  "light",
  "warm",
  "comfort",
  "everyday",
  "quick",
  "convenient",
  "takeout",
  "bowl",
  "plate",
  "portable",
  "high-protein",
  "rice-based",
  "savory",
  "flavorful"
]);
var datasetTagFrequency = recommendationDataset.reduce((map, meal) => {
  meal.tags.forEach((tag) => {
    const normalized = tag.toLowerCase();
    map.set(normalized, (map.get(normalized) ?? 0) + 1);
  });
  return map;
}, /* @__PURE__ */ new Map());
var stableHash = (value) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = hash * 31 + value.charCodeAt(index) >>> 0;
  }
  return hash;
};
var getFairnessExposureBonus = (meal) => {
  let bonus = 0;
  meal.tags.forEach((tag) => {
    const normalized = tag.toLowerCase();
    if (genericFairnessTags.has(normalized)) return;
    const frequency = datasetTagFrequency.get(normalized) ?? 0;
    if (frequency > 0 && frequency <= 3) bonus += 0.9;
    else if (frequency <= 5) bonus += 0.55;
    else if (frequency <= 8) bonus += 0.25;
  });
  const title = meal.title.toLowerCase();
  if (title.includes("porridge") || title.includes("congee")) bonus += 0.5;
  if (title.includes("sub")) bonus += 0.45;
  if (title.includes("mapo")) bonus += 1.15;
  else if (title.includes("beef and tomato") || title.includes("scallion")) bonus += 0.6;
  if (meal.tags.some((tag) => ["chinese-style", "taiwanese-style", "home-style", "simple"].includes(tag.toLowerCase()))) {
    bonus += 0.35;
  }
  return Math.min(1.6, bonus);
};
var getAdjustedRank = (item, pickedFormats, rankBy) => {
  const formats = getMealFormats(item);
  const formatPenalty = formats.some((format) => pickedFormats.has(format)) ? 1.5 : 0;
  const fairnessExposureBonus = getFairnessExposureBonus(item);
  return rankBy(item) + fairnessExposureBonus - formatPenalty;
};
var getFairCandidatePool = (source, picked, pickedFormats, rankBy) => {
  const ranked = source.filter((item) => !picked.has(item.id)).map((item) => ({
    item,
    adjustedRank: getAdjustedRank(item, pickedFormats, rankBy)
  })).sort((a, b) => b.adjustedRank - a.adjustedRank);
  if (ranked.length === 0) return [];
  const topRank = ranked[0].adjustedRank;
  const closeEnough = ranked.filter(({ adjustedRank }) => topRank - adjustedRank <= FAIRNESS_SCORE_WINDOW);
  const poolSize = Math.min(
    FAIRNESS_MAX_POOL,
    Math.max(FAIRNESS_MIN_POOL, closeEnough.length > 0 ? closeEnough.length : 1, ranked.length >= FAIRNESS_MIN_POOL ? FAIRNESS_MIN_POOL : ranked.length)
  );
  return ranked.slice(0, poolSize);
};
var pickFromFairPool = (label, rotationSeed, pool) => {
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0].item;
  const topRank = pool[0].adjustedRank;
  const closePool = pool.filter(({ adjustedRank }) => topRank - adjustedRank <= FAIRNESS_SCORE_WINDOW);
  const usablePool = closePool.length > 0 ? closePool : pool;
  const rotationIndex = stableHash(`${label}:${rotationSeed}`) % usablePool.length;
  return usablePool[rotationIndex].item;
};
var pickRecommendation = (label, summary, profile, locale, rotationSeed, source, picked, pickedFormats, rankBy) => {
  const fairPool = getFairCandidatePool(source, picked, pickedFormats, rankBy);
  const next = pickFromFairPool(label, rotationSeed, fairPool);
  if (!next) return null;
  picked.add(next.id);
  getMealFormats(next).forEach((format) => pickedFormats.add(format));
  return {
    ...next,
    label,
    shortReason: buildRecommendationReason(label, summary, profile, next, locale),
    balanceNote: generateBalanceNote(label, next, locale)
  };
};
var getBestMatch = (summary, profile, locale, rotationSeed, items, picked, pickedFormats) => pickRecommendation("Best Match", summary, profile, locale, `${rotationSeed}:best-match`, items, picked, pickedFormats, (item) => {
  const mealTypeBonus = item.mealType === "balanced" ? 1 : item.mealType === "preference" && item.preferenceScore > 0 ? 2.5 : item.mealType === "preference" ? 0.5 : 0;
  return item.score + item.weeklyPatternScore * 0.75 + scoreFeelPriority(profile, item) + mealTypeBonus;
});
var getBestBalance = (summary, profile, locale, rotationSeed, items, picked, pickedFormats) => pickRecommendation("Best Balance", summary, profile, locale, `${rotationSeed}:best-balance`, items, picked, pickedFormats, (item) => {
  const mealTypeBonus = item.mealType === "balanced" || item.mealType === "recovery" || item.mealType === "light" ? 2 : 0;
  const steadinessBonus = item.heaviness === "light" ? 1 : item.heaviness === "medium" ? 0.5 : -1;
  return item.balanceScore * 2 + item.weeklyPatternScore + item.preferenceScore * 0.35 + item.avoidScore + item.varietyScore + mealTypeBonus + steadinessBonus;
});
var getMostConvenient = (summary, profile, locale, rotationSeed, items, picked, pickedFormats) => pickRecommendation("Most Convenient", summary, profile, locale, `${rotationSeed}:most-convenient`, items, picked, pickedFormats, (item) => {
  const convenienceBonus = item.convenience === "high" ? 2 : item.convenience === "medium" ? 1 : -1;
  const reasonableBalanceGuard = item.balanceScore >= 0 ? 1 : -1;
  const portableBonus = item.tags.some((tag) => ["portable", "takeout", "quick", "convenient"].includes(tag.toLowerCase())) ? 1 : 0;
  return item.convenienceScore * 2 + convenienceBonus + portableBonus + item.balanceScore * 0.5 + item.weeklyPatternScore * 0.5 + item.avoidScore + item.varietyScore + reasonableBalanceGuard;
});
var scoreRecommendations = (profile, todayLog, history, locale, now = /* @__PURE__ */ new Date()) => {
  const summary = summarizeTodayIntake(todayLog);
  const timeWindow = getMealTimeWindow(now);
  const todayId = history.find((day) => day.isToday)?.id ?? history[history.length - 1]?.id ?? now.toISOString().slice(0, 10);
  const rotationSeed = `${todayId}:${profile.feelToday}:${profile.eatingStyle}:${summary.proteinStatus}:${summary.vegetableStatus}:${summary.carbStatus}:${summary.heavinessStatus}`;
  const scored = recommendationDataset.map((meal) => scoreMealOption(summary, todayLog, history, profile, meal, timeWindow, locale)).sort((a, b) => b.score - a.score);
  const deduped = dedupeRecommendations(scored);
  const picked = /* @__PURE__ */ new Set();
  const pickedFormats = /* @__PURE__ */ new Set();
  const bestMatch = getBestMatch(summary, profile, locale, rotationSeed, deduped, picked, pickedFormats);
  const bestBalance = getBestBalance(summary, profile, locale, rotationSeed, deduped, picked, pickedFormats);
  const mostConvenient = getMostConvenient(summary, profile, locale, rotationSeed, deduped, picked, pickedFormats);
  return [bestMatch, bestBalance, mostConvenient].filter(Boolean);
};
var buildPreferenceTrendSummary = (history, profile, locale) => {
  const meals = history.flatMap((day) => flattenMeals(day.todayLog)).filter(isMealLogged);
  if (meals.length === 0) {
    return locale === "en" ? "As you log more meals, this will start reflecting your own style more clearly." : "\u96A8\u8457\u4F60\u8A18\u9304\u66F4\u591A\u9910\u9EDE\uFF0C\u9019\u88E1\u6703\u66F4\u6E05\u695A\u5730\u53CD\u6620\u51FA\u4F60\u7684\u98F2\u98DF\u98A8\u683C\u3002";
  }
  const riceCount = meals.filter((meal) => meal.carbs.some((item) => item.toLowerCase().includes("rice") || item.toLowerCase().includes("congee"))).length;
  const noodleCount = meals.filter((meal) => meal.carbs.some((item) => item.toLowerCase().includes("noodle") || item.toLowerCase().includes("pasta") || item.toLowerCase().includes("udon") || item.toLowerCase().includes("soba"))).length;
  const soupyCount = meals.filter((meal) => meal.soup.length > 0 || meal.cookingMethod === "Soup / stew").length;
  const warmCount = meals.filter((meal) => ["Soup / stew", "Boiled", "Stir-fried", "Steamed", "Grilled"].includes(meal.cookingMethod)).length;
  const lightCount = meals.filter((meal) => ["Steamed", "Boiled", "Soup / stew", "Raw / cold", "Other"].includes(meal.cookingMethod)).length;
  const convenienceCount = meals.filter((meal) => ["Takeout", "Restaurant", "Ready-made"].includes(meal.mealSource)).length;
  const takeoutCount = meals.filter((meal) => meal.mealSource === "Takeout" || meal.mealSource === "Restaurant").length;
  const homeCount = meals.filter((meal) => meal.mealSource === "Home-cooked").length;
  const plantProteinCount = meals.filter((meal) => meal.protein.some((item) => ["tofu", "tempeh", "beans", "black beans", "chickpeas", "edamame"].includes(item.toLowerCase()))).length;
  const vegetableForwardCount = meals.filter((meal) => meal.vegetables.length >= 2 || meal.vegetables.length >= 1 && meal.fruit.length >= 1).length;
  const portableCount = meals.filter((meal) => meal.carbs.some((item) => ["wrap", "bread", "bagel", "toast", "bao / bun"].includes(item.toLowerCase()))).length;
  const matchedTrends = [];
  const unmatchedPreferences = [];
  const preferenceChecks = {
    "Rice-based meals": riceCount >= 2,
    "Noodle-based meals": noodleCount >= 2,
    "Soupy meals": soupyCount >= 2,
    "Warm meals": warmCount >= Math.max(3, Math.ceil(meals.length * 0.45)),
    "Light meals": lightCount >= Math.max(3, Math.ceil(meals.length * 0.45)),
    "Takeout-friendly": takeoutCount >= Math.max(2, homeCount),
    "Quick grocery meals": convenienceCount >= Math.max(2, Math.ceil(meals.length * 0.4)),
    "Plant-protein": plantProteinCount >= 2,
    "Vegetable-forward": vegetableForwardCount >= 2,
    "Portable meals": portableCount >= 2
  };
  profile.preferenceTags.forEach((tag) => {
    if (!(tag in preferenceChecks)) return;
    if (preferenceChecks[tag]) matchedTrends.push(tag);
    else unmatchedPreferences.push(tag);
  });
  const observedTrendPool = [
    riceCount >= 2 ? "rice-based meals" : "",
    noodleCount >= 2 ? "noodle-based meals" : "",
    soupyCount >= 2 ? "soupy meals" : "",
    warmCount >= Math.max(3, Math.ceil(meals.length * 0.45)) ? "warm meals" : "",
    lightCount >= Math.max(3, Math.ceil(meals.length * 0.45)) ? "lighter meal formats" : "",
    takeoutCount >= Math.max(2, homeCount) ? "takeout-friendly choices" : "",
    homeCount > takeoutCount ? "home-style meals" : "",
    plantProteinCount >= 2 ? "plant-protein options" : "",
    vegetableForwardCount >= 2 ? "vegetable-forward meals" : "",
    portableCount >= 2 ? "portable meals" : ""
  ].filter(Boolean);
  if (matchedTrends.length > 0) {
    const topMatch = joinList(matchedTrends.slice(0, 2).map((item) => describeTrend(item, locale)), locale);
    if (unmatchedPreferences.length > 0) {
      const softerGap = describeTrend(unmatchedPreferences[0], locale);
      return locale === "en" ? `Your recent meals lined up well with your preference for ${topMatch}. ${softerGap.charAt(0).toUpperCase() + softerGap.slice(1)} showed up less often in the actual logs.` : `\u4F60\u6700\u8FD1\u7684\u5BE6\u969B\u7D00\u9304\u548C\u4F60\u504F\u597D\u7684 ${topMatch} \u5F88\u4E00\u81F4\u3002\u4E0D\u904E ${softerGap} \u5728\u9019\u9031\u7684\u5BE6\u969B\u7D00\u9304\u88E1\u51FA\u73FE\u5F97\u6BD4\u8F03\u5C11\u3002`;
    }
    return locale === "en" ? `Your recent meals lined up well with your preference for ${topMatch}.` : `\u4F60\u6700\u8FD1\u7684\u5BE6\u969B\u7D00\u9304\u548C\u4F60\u504F\u597D\u7684 ${topMatch} \u5F88\u4E00\u81F4\u3002`;
  }
  if (profile.preferenceTags.length > 0 && observedTrendPool.length > 0) {
    const observed = joinList(observedTrendPool.slice(0, 2).map((item) => describeObservedTrend(item, locale)), locale);
    return locale === "en" ? `Your saved preferences are broader than what showed up this week. Recent logs leaned more toward ${observed}.` : `\u4F60\u5132\u5B58\u7684\u504F\u597D\u6BD4\u9019\u9031\u5BE6\u969B\u51FA\u73FE\u7684\u9910\u578B\u66F4\u5EE3\u4E00\u4E9B\u3002\u6700\u8FD1\u7684\u7D00\u9304\u6BD4\u8F03\u504F\u5411 ${observed}\u3002`;
  }
  if (observedTrendPool.length > 0) {
    const observed = joinList(observedTrendPool.slice(0, 2).map((item) => describeObservedTrend(item, locale)), locale);
    return locale === "en" ? `This week mostly leaned toward ${observed}.` : `\u9019\u4E00\u9031\u6574\u9AD4\u6BD4\u8F03\u504F\u5411 ${observed}\u3002`;
  }
  return locale === "en" ? "As you log more meals, this will start reflecting your own style more clearly." : "\u96A8\u8457\u4F60\u8A18\u9304\u66F4\u591A\u9910\u9EDE\uFF0C\u9019\u88E1\u6703\u66F4\u6E05\u695A\u5730\u53CD\u6620\u51FA\u4F60\u7684\u98F2\u98DF\u98A8\u683C\u3002";
};
var buildWeeklySnapshot = (history, profile, locale) => {
  const flatMeals = history.flatMap((day) => flattenMeals(day.todayLog));
  const riceMeals = flatMeals.filter(
    (meal) => meal.carbs.some((item) => {
      const lower = item.toLowerCase();
      return lower.includes("rice") || lower.includes("congee");
    })
  ).length;
  const noodleMeals = flatMeals.filter(
    (meal) => meal.carbs.some((item) => {
      const lower = item.toLowerCase();
      return lower.includes("noodle") || lower.includes("pasta");
    })
  ).length;
  const vegetableMeals = flatMeals.filter((meal) => meal.vegetables.length > 0).length;
  const friedMeals = flatMeals.filter((meal) => meal.cookingMethod === "Fried" || meal.cookingMethod === "Stir-fried").length;
  const warmMeals = flatMeals.filter((meal) => ["Soup / stew", "Boiled", "Stir-fried", "Steamed", "Grilled"].includes(meal.cookingMethod)).length;
  const takeoutMeals = flatMeals.filter((meal) => meal.mealSource === "Takeout" || meal.mealSource === "Restaurant" || meal.mealSource === "Ready-made").length;
  const homeMeals = flatMeals.filter((meal) => meal.mealSource === "Home-cooked").length;
  const uniqueProteins = new Set(flatMeals.flatMap((meal) => meal.protein)).size;
  const uniqueProduce = new Set(flatMeals.flatMap((meal) => [...meal.vegetables, ...meal.fruit])).size;
  const mealDiversityScore = new Set(
    flatMeals.flatMap((meal) => {
      const formats = [];
      if (meal.carbs.some((item) => item.toLowerCase().includes("rice") || item.toLowerCase().includes("congee"))) formats.push("rice");
      if (meal.carbs.some((item) => item.toLowerCase().includes("noodle") || item.toLowerCase().includes("pasta"))) formats.push("noodle");
      if (meal.carbs.some((item) => ["bread", "bagel", "wrap", "tortilla", "toast", "bao / bun"].includes(item.toLowerCase()))) formats.push("bread-wrap");
      if (meal.soup.length > 0 || meal.cookingMethod === "Soup / stew") formats.push("soup");
      if (meal.protein.some((item) => ["tofu", "tempeh", "beans", "black beans", "chickpeas", "edamame"].includes(item.toLowerCase()))) formats.push("plant-protein");
      if (meal.mealSource === "Takeout" || meal.mealSource === "Restaurant") formats.push("takeout");
      if (meal.mealSource === "Home-cooked") formats.push("home");
      return formats;
    })
  ).size;
  return {
    summaryLines: [
      riceMeals >= noodleMeals ? locale === "en" ? "You leaned toward rice-based meals this week." : "\u4F60\u9019\u9031\u6BD4\u8F03\u504F\u5411\u98EF\u985E\u9910\u9EDE\u3002" : locale === "en" ? "Noodle-based meals showed up pretty often this week." : "\u4F60\u9019\u9031\u9EB5\u985E\u9910\u9EDE\u51FA\u73FE\u5F97\u883B\u983B\u7E41\u3002",
      vegetableMeals < 14 ? locale === "en" ? "Your meals were a bit low in vegetables." : "\u4F60\u9019\u9031\u7684\u9910\u9EDE\u88E1\uFF0C\u852C\u83DC\u7A0D\u5FAE\u5C11\u4E86\u4E00\u9EDE\u3002" : locale === "en" ? "Vegetables showed up fairly consistently across the week." : "\u4F60\u9019\u9031\u7684\u852C\u83DC\u51FA\u73FE\u5F97\u7B97\u883B\u7A69\u5B9A\u3002",
      warmMeals >= Math.max(5, Math.ceil(flatMeals.length * 0.45)) ? locale === "en" ? "You often chose warm and savory foods." : "\u4F60\u9019\u9031\u5E38\u5E38\u9078\u64C7\u6EAB\u71B1\u3001\u504F\u9E79\u9999\u7684\u9910\u9EDE\u3002" : locale === "en" ? "You mixed in a fair number of lighter or cooler meals." : "\u4F60\u9019\u9031\u4E5F\u6DF7\u9032\u4E86\u4E0D\u5C11\u6BD4\u8F03\u6E05\u723D\u6216\u504F\u6DBC\u7684\u9910\u9EDE\u3002",
      takeoutMeals > homeMeals ? locale === "en" ? "Recent meals leaned more convenient and grab-and-go." : "\u6700\u8FD1\u5E7E\u5929\u7684\u9910\u9EDE\u6BD4\u8F03\u504F\u65B9\u4FBF\u3001\u96A8\u624B\u53EF\u5F97\u3002" : locale === "en" ? "Home-style meals had a solid presence through the week." : "\u9019\u9031\u5BB6\u5E38\u578B\u9910\u9EDE\u7684\u6BD4\u4F8B\u883B\u7A69\u5B9A\u3002"
    ],
    indicators: [
      { label: locale === "en" ? "Protein" : "\u86CB\u767D\u8CEA", value: uniqueProteins >= 5 ? locale === "en" ? "Good range" : "\u7A2E\u985E\u4E0D\u932F" : locale === "en" ? "Could vary more" : "\u9084\u53EF\u4EE5\u66F4\u591A\u6A23" },
      { label: locale === "en" ? "Vegetables" : "\u852C\u83DC", value: vegetableMeals >= 14 ? locale === "en" ? "Steady" : "\u7B97\u7A69\u5B9A" : locale === "en" ? "A little light" : "\u7A0D\u5FAE\u504F\u5C11" },
      { label: locale === "en" ? "Fiber variety" : "\u7E96\u7DAD\u591A\u6A23\u6027", value: uniqueProduce >= 8 ? locale === "en" ? "Nice mix" : "\u642D\u914D\u4E0D\u932F" : locale === "en" ? "Could widen a bit" : "\u9084\u80FD\u66F4\u5EE3\u4E00\u4E9B" },
      { label: locale === "en" ? "Fried foods" : "\u70B8\u7269", value: friedMeals <= 2 ? locale === "en" ? "Occasional" : "\u5076\u723E" : friedMeals <= 5 ? locale === "en" ? "Moderate" : "\u4E2D\u7B49" : locale === "en" ? "Showed up often" : "\u51FA\u73FE\u504F\u591A" },
      { label: locale === "en" ? "Meal diversity" : "\u9910\u578B\u8B8A\u5316", value: mealDiversityScore >= 6 ? locale === "en" ? "Flexible" : "\u5F88\u6709\u5F48\u6027" : mealDiversityScore >= 4 ? locale === "en" ? "Fairly varied" : "\u9084\u7B97\u591A\u6A23" : locale === "en" ? "Somewhat repetitive" : "\u7A0D\u5FAE\u91CD\u8907" }
    ],
    preferenceSummary: buildPreferenceTrendSummary(history, profile, locale)
  };
};
export {
  buildRecommendationReason,
  buildWeeklySnapshot,
  dedupeRecommendations,
  flattenMeals,
  generateBalanceNote,
  getBestBalance,
  getBestMatch,
  getMealTimeWindow,
  getMostConvenient,
  isMealLogged,
  mealSummaryChips,
  scoreMealOption,
  scoreRecommendations,
  summarizeTodayIntake
};

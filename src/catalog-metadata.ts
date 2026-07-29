import type {
  Convenience,
  Heaviness,
  MealLevel,
  MealSafetyMetadata,
  MustAvoidTag,
} from "./types";

type SafetyAssignments = {
  contains?: string[];
  mayContain?: string[];
  unknown?: string[];
};

/**
 * Curated, id-addressed safety declarations. These are the only catalog facts
 * used by the must-avoid gate. Titles, descriptions, and tags are never scanned
 * to infer a hard conflict.
 */
const safetyAssignments: Partial<Record<MustAvoidTag, SafetyAssignments>> = {
  "Fried food": {
    contains: ["shrimp-fried-rice-light-veg"],
    mayContain: [
      "ready-made-soup-dumplings-veg",
      "frozen-dumplings-bok-choy",
      "pork-chive-dumpling-soup-light",
    ],
  },
  Dairy: {
    contains: [
      "chicken-caesar-wrap-light",
      "greek-yogurt-granola-fruit-bowl",
      "cottage-cheese-fruit-toast-plate",
      "veggie-black-bean-quesadilla-salad",
      "greek-yogurt-fruit-granola-bowl",
      "turkey-pesto-sandwich-salad",
      "bean-cheese-veg-quesadilla-light",
    ],
    mayContain: [
      "japanese-curry-light-set",
      "gyro-bowl-rice-salad",
      "chicken-shawarma-rice-bowl",
      "mediterranean-chicken-plate",
    ],
    unknown: ["trader-joes-soup-salad"],
  },
  Peanuts: {
    mayContain: [
      "dak-galbi-light-bowl",
      "chicken-taco-rice-bowl",
      "chicken-shawarma-rice-bowl",
    ],
  },
  "Tree nuts": {
    contains: ["turkey-pesto-sandwich-salad"],
    mayContain: [
      "mediterranean-chicken-plate",
      "mediterranean-salmon-plate",
      "chicken-shawarma-rice-bowl",
    ],
  },
  Sesame: {
    contains: ["hummus-chicken-wrap-fruit"],
    mayContain: [
      "beef-bibimbap-extra-veg",
      "kimchi-tofu-rice-bowl",
      "teriyaki-salmon-bowl",
      "mediterranean-chicken-plate",
      "falafel-salad-rice",
      "gyro-bowl-rice-salad",
      "korean-soft-tofu-soup-rice",
      "dak-galbi-light-bowl",
      "chicken-shawarma-rice-bowl",
      "mediterranean-salmon-plate",
    ],
  },
  Soy: {
    contains: [
      "tofu-vegetable-rice-bowl",
      "miso-fish-set-veg",
      "tofu-vegetable-soup-rice",
      "miso-tofu-soup-rice",
      "kimchi-tofu-rice-bowl",
      "tofu-egg-protein-bowl",
      "salmon-edamame-bowl",
      "mapo-tofu-light-rice",
      "edamame-noodle-salad",
      "tofu-kale-quinoa-bowl",
      "soy-garlic-chicken-rice-cabbage",
      "tofu-mushroom-udon-soup",
      "scallion-egg-tofu-rice-bowl",
      "soba-tofu-bento",
      "tofu-mushroom-congee",
      "salmon-miso-porridge",
      "tofu-greens-soup-small-rice",
      "miso-tofu-spinach-bowl",
      "egg-tofu-congee",
      "soy-milk-oatmeal-egg-fruit",
      "korean-soft-tofu-soup-rice",
      "ginger-tofu-cabbage-rice-bowl",
      "tofu-broccoli-udon-bowl",
    ],
    mayContain: [
      "salmon-rice-bowl-veg",
      "poke-bowl",
      "teriyaki-salmon-bowl",
      "beef-bibimbap-extra-veg",
      "taiwanese-bento-light",
      "lean-beef-vegetable-noodle-soup",
      "pho-lean-beef-herbs",
      "beef-tomato-rice-bowl",
      "taiwanese-minced-pork-rice-light",
      "japanese-curry-light-set",
      "beef-tomato-noodle-soup",
      "taiwanese-three-cup-chicken-light-set",
      "taiwanese-shredded-chicken-rice-veg",
      "dak-galbi-light-bowl",
      "taiwanese-turkey-rice-plate",
    ],
    unknown: [
      "udon-soup-lean-protein",
      "trader-joes-soup-salad",
      "warm-soba-broth-set",
    ],
  },
  "Wheat / gluten": {
    contains: [
      "chicken-noodle-soup-greens",
      "chicken-wrap-salad",
      "turkey-sandwich-side-salad",
      "soba-salad-egg",
      "ready-made-soup-dumplings-veg",
      "udon-soup-lean-protein",
      "chicken-caesar-wrap-light",
      "vegetable-omelet-toast-fruit",
      "lean-beef-vegetable-noodle-soup",
      "falafel-salad-rice",
      "tuna-mayo-onigiri-side-soup",
      "avocado-egg-toast-soup",
      "greek-yogurt-granola-fruit-bowl",
      "cottage-cheese-fruit-toast-plate",
      "edamame-noodle-salad",
      "chicken-sub-soup-combo",
      "egg-drop-soup-dumpling-side-veg",
      "turkey-avocado-sandwich-soup",
      "tofu-mushroom-udon-soup",
      "canned-soup-toast-egg",
      "hummus-chicken-wrap-fruit",
      "veggie-black-bean-quesadilla-salad",
      "soba-tofu-bento",
      "chicken-cabbage-dumpling-soup",
      "soft-noodle-soup-egg-greens",
      "frozen-dumplings-bok-choy",
      "greek-yogurt-fruit-granola-bowl",
      "beef-tomato-noodle-soup",
      "chicken-ginger-noodle-soup",
      "warm-soba-broth-set",
      "chicken-zucchini-pasta-light",
      "spinach-egg-breakfast-wrap",
      "bean-cheese-veg-quesadilla-light",
      "tofu-broccoli-udon-bowl",
      "rotisserie-chicken-bagged-salad-wrap",
      "pork-chive-dumpling-soup-light",
    ],
    mayContain: [
      "japanese-curry-light-set",
      "gyro-bowl-rice-salad",
      "chicken-shawarma-rice-bowl",
    ],
    unknown: ["trader-joes-soup-salad"],
  },
  Beef: {
    contains: [
      "beef-bibimbap-extra-veg",
      "lean-beef-vegetable-noodle-soup",
      "pho-lean-beef-herbs",
      "beef-tomato-rice-bowl",
      "beef-tomato-noodle-soup",
    ],
    unknown: [
      "udon-soup-lean-protein",
      "ready-made-soup-dumplings-veg",
      "gyro-bowl-rice-salad",
    ],
  },
  Pork: {
    contains: [
      "taiwanese-minced-pork-rice-light",
      "pork-chive-dumpling-soup-light",
    ],
    mayContain: ["korean-soft-tofu-soup-rice"],
    unknown: ["ready-made-soup-dumplings-veg", "udon-soup-lean-protein"],
  },
  Lamb: {
    unknown: ["gyro-bowl-rice-salad"],
  },
  "Bitter melon": {
    contains: [
      "bitter-melon-egg-rice-plate",
      "black-bean-chicken-bitter-melon",
    ],
  },
  "Spicy food": {
    contains: [
      "kimchi-tofu-rice-bowl",
      "mapo-tofu-light-rice",
      "korean-soft-tofu-soup-rice",
      "dak-galbi-light-bowl",
    ],
    mayContain: [
      "turkey-chili-rice-bowl",
      "japanese-curry-light-set",
      "chicken-taco-rice-bowl",
      "bean-cheese-veg-quesadilla-light",
    ],
  },
  Shellfish: {
    contains: [
      "shrimp-quinoa-bowl",
      "shrimp-fried-rice-light-veg",
      "shrimp-fajita-plate",
    ],
    unknown: ["ready-made-soup-dumplings-veg", "udon-soup-lean-protein"],
  },
  "Fishy seafood": {
    contains: [
      "salmon-rice-bowl-veg",
      "miso-fish-set-veg",
      "shrimp-quinoa-bowl",
      "steamed-fish-rice-bokchoy",
      "poke-bowl",
      "teriyaki-salmon-bowl",
      "salmon-edamame-bowl",
      "costco-salmon-sweet-potato-veg",
      "shrimp-fried-rice-light-veg",
      "baked-salmon-bagged-salad-potato",
      "salmon-miso-porridge",
      "steamed-fish-vegetable-plate",
      "shrimp-fajita-plate",
      "mediterranean-salmon-plate",
      "salmon-cucumber-rice-set",
    ],
    unknown: [
      "tuna-mayo-onigiri-side-soup",
      "udon-soup-lean-protein",
      "warm-soba-broth-set",
    ],
  },
  "Raw food": {
    contains: [
      "poke-bowl",
      "soba-salad-egg",
      "turkey-sandwich-side-salad",
      "rotisserie-chicken-rice-salad",
      "trader-joes-soup-salad",
      "falafel-salad-rice",
      "edamame-noodle-salad",
      "chicken-salad-grain-bowl-light",
      "baked-salmon-bagged-salad-potato",
      "turkey-pesto-sandwich-salad",
      "rotisserie-chicken-bagged-salad-wrap",
    ],
  },
  "Cold food": {
    contains: [
      "poke-bowl",
      "soba-salad-egg",
      "turkey-sandwich-side-salad",
      "trader-joes-soup-salad",
      "greek-yogurt-granola-fruit-bowl",
      "cottage-cheese-fruit-toast-plate",
      "edamame-noodle-salad",
      "chicken-salad-grain-bowl-light",
      "greek-yogurt-fruit-granola-bowl",
      "turkey-pesto-sandwich-salad",
      "rotisserie-chicken-bagged-salad-wrap",
    ],
    mayContain: ["rotisserie-chicken-rice-salad", "salmon-cucumber-rice-set"],
  },
  "Processed food": {
    contains: [
      "turkey-sandwich-side-salad",
      "rotisserie-chicken-microwave-veg",
      "ready-made-soup-dumplings-veg",
      "rotisserie-chicken-rice-salad",
      "tuna-mayo-onigiri-side-soup",
      "chicken-sub-soup-combo",
      "turkey-avocado-sandwich-soup",
      "canned-soup-toast-egg",
      "frozen-dumplings-bok-choy",
      "turkey-pesto-sandwich-salad",
      "rotisserie-chicken-bagged-salad-wrap",
    ],
    mayContain: [
      "taiwanese-bento-light",
      "greek-yogurt-granola-fruit-bowl",
      "spinach-egg-breakfast-wrap",
    ],
  },
  "Large portions": {
    mayContain: [
      "beef-bibimbap-extra-veg",
      "taiwanese-bento-light",
      "burrito-bowl-beans-veg",
      "turkey-chili-rice-bowl",
      "mediterranean-chicken-plate",
      "falafel-salad-rice",
      "japanese-curry-light-set",
      "chicken-sub-soup-combo",
      "gyro-bowl-rice-salad",
      "chicken-fajita-bowl",
      "chicken-shawarma-rice-bowl",
    ],
  },
  Egg: {
    contains: [
      "egg-tomato-rice",
      "congee-egg-side-veg",
      "soba-salad-egg",
      "tofu-egg-protein-bowl",
      "vegetable-omelet-toast-fruit",
      "avocado-egg-toast-soup",
      "egg-drop-soup-dumpling-side-veg",
      "scallion-egg-tofu-rice-bowl",
      "canned-soup-toast-egg",
      "soft-noodle-soup-egg-greens",
      "egg-tofu-congee",
      "soy-milk-oatmeal-egg-fruit",
      "spinach-egg-breakfast-wrap",
      "bitter-melon-egg-rice-plate",
    ],
    mayContain: [
      "chicken-caesar-wrap-light",
      "tuna-mayo-onigiri-side-soup",
      "ready-made-soup-dumplings-veg",
      "frozen-dumplings-bok-choy",
      "pork-chive-dumpling-soup-light",
    ],
  },
};

const certaintyOrder = ["contains", "mayContain", "unknown"] as const;

export const buildMealSafetyMetadata = (mealId: string): MealSafetyMetadata => {
  const metadata: MealSafetyMetadata = {
    contains: [],
    mayContain: [],
    unknown: [],
  };

  for (const [avoidTag, assignments] of Object.entries(safetyAssignments) as Array<
    [MustAvoidTag, SafetyAssignments]
  >) {
    for (const certainty of certaintyOrder) {
      if (assignments[certainty]?.includes(mealId)) {
        metadata[certainty].push(avoidTag);
        break;
      }
    }
  }

  return metadata;
};

export type CatalogCalibration = {
  proteinLevel?: MealLevel;
  vegetableLevel?: MealLevel;
  carbLevel?: MealLevel;
  heaviness?: Heaviness;
  convenience?: Convenience;
  fairnessExposureAdjustment?: number;
};

/**
 * Editorial re-checks that differ from the original v2 catalog labels. Values
 * are qualitative template signals, not nutrient or calorie measurements.
 */
export const catalogCalibration: Record<string, CatalogCalibration> = {
  "salmon-rice-bowl-veg": { vegetableLevel: "high", carbLevel: "high", heaviness: "medium" },
  "grilled-chicken-plate-rice-greens": { vegetableLevel: "high", carbLevel: "high", heaviness: "medium", convenience: "low" },
  "tofu-vegetable-rice-bowl": { carbLevel: "high", heaviness: "medium", fairnessExposureAdjustment: 0.4 },
  "miso-fish-set-veg": { vegetableLevel: "high", carbLevel: "high", heaviness: "medium" },
  "chicken-broccoli-rice-bowl": { carbLevel: "high" },
  "tofu-vegetable-soup-rice": { convenience: "low" },
  "steamed-fish-rice-bokchoy": { vegetableLevel: "high", carbLevel: "high" },
  "egg-tomato-rice": { carbLevel: "medium", heaviness: "light", fairnessExposureAdjustment: 2.4 },
  "miso-tofu-soup-rice": { carbLevel: "high" },
  "chicken-wrap-salad": { vegetableLevel: "high", heaviness: "medium" },
  "poke-bowl": { vegetableLevel: "high", carbLevel: "high", heaviness: "medium" },
  "turkey-sandwich-side-salad": { vegetableLevel: "high" },
  "rotisserie-chicken-microwave-veg": { vegetableLevel: "high" },
  "ready-made-soup-dumplings-veg": { proteinLevel: "low", heaviness: "heavy", fairnessExposureAdjustment: 0.8 },
  "beef-bibimbap-extra-veg": { carbLevel: "high", heaviness: "heavy" },
  "teriyaki-salmon-bowl": { carbLevel: "high", heaviness: "heavy", fairnessExposureAdjustment: 0.4 },
  "taiwanese-bento-light": { vegetableLevel: "high", carbLevel: "high", heaviness: "heavy" },
  "udon-soup-lean-protein": { proteinLevel: "low", carbLevel: "high" },
  "burrito-bowl-beans-veg": { carbLevel: "high", heaviness: "heavy" },
  "chicken-caesar-wrap-light": { heaviness: "heavy" },
  "kimchi-tofu-rice-bowl": { carbLevel: "high" },
  "bean-veggie-rice-bowl": { carbLevel: "high" },
  "grilled-chicken-sweet-potato-plate": { convenience: "low", fairnessExposureAdjustment: 0.6 },
  "lean-beef-vegetable-noodle-soup": { vegetableLevel: "high", carbLevel: "high" },
  "rotisserie-chicken-rice-salad": { vegetableLevel: "high", carbLevel: "high" },
  "turkey-chili-rice-bowl": { carbLevel: "high", heaviness: "heavy", fairnessExposureAdjustment: 0.8 },
  "mediterranean-chicken-plate": { heaviness: "heavy" },
  "falafel-salad-rice": { carbLevel: "high", heaviness: "heavy" },
  "mapo-tofu-light-rice": { vegetableLevel: "medium", carbLevel: "medium", heaviness: "medium", convenience: "medium", fairnessExposureAdjustment: 3 },
  "beef-tomato-rice-bowl": { carbLevel: "high" },
  "taiwanese-minced-pork-rice-light": { carbLevel: "high", heaviness: "heavy" },
  "japanese-curry-light-set": { carbLevel: "high", heaviness: "heavy" },
  "tuna-mayo-onigiri-side-soup": { carbLevel: "high" },
  "warm-soba-broth-set": { proteinLevel: "low" },
  "chicken-sub-soup-combo": { heaviness: "heavy", fairnessExposureAdjustment: 0.45 },
  "shrimp-fried-rice-light-veg": { heaviness: "heavy", fairnessExposureAdjustment: 0.6 },
  "egg-drop-soup-dumpling-side-veg": { heaviness: "heavy" },
  "gyro-bowl-rice-salad": { heaviness: "heavy" },
  "chicken-fajita-bowl": { heaviness: "heavy" },
  "soy-garlic-chicken-rice-cabbage": { heaviness: "heavy" },
  "tofu-mushroom-congee": { proteinLevel: "low" },
  "frozen-dumplings-bok-choy": { proteinLevel: "low" },
  "tofu-egg-protein-bowl": { fairnessExposureAdjustment: 0.8 },
  "scallion-egg-tofu-rice-bowl": { fairnessExposureAdjustment: 0.6 },
  "chicken-zucchini-pasta-light": { convenience: "low" },
  "chicken-kale-white-bean-soup": { convenience: "low" },
  "lentil-roasted-veg-bowl": { convenience: "low" },
  "black-bean-chicken-bitter-melon": { convenience: "low" },
  "tofu-greens-soup-small-rice": { convenience: "low" },
};

export const catalogMetadataAudit = {
  assignmentTags: Object.keys(safetyAssignments) as MustAvoidTag[],
  safetyAssignments: Object.entries(safetyAssignments).flatMap(
    ([tag, assignments]) =>
      certaintyOrder.flatMap((certainty) =>
        (assignments[certainty] ?? []).map((mealId) => ({
          tag: tag as MustAvoidTag,
          certainty,
          mealId,
        })),
      ),
  ),
  calibratedMealIds: Object.keys(catalogCalibration),
};

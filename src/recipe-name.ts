import type { Locale } from "./types";

type LabeledRecipe = { label: Record<Locale, string> };

// Authored labels end with a "standard recipe" marker that keeps stored names
// and versions distinct from similarly named restaurant meals. Interfaces show
// that distinction once, as a "STANDARD RECIPE" tag, so headings omit it.
const suffix: Record<Locale, RegExp> = {
  en: / — standard recipe$/,
  zh: /（標準配方）$/,
};

export const recipeDisplayName = (recipe: LabeledRecipe, locale: Locale): string =>
  recipe.label[locale].replace(suffix[locale], "");

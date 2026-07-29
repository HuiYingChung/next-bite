import type { Locale, MealName, ParsedMeal } from "./types";

type ParseMealRequest = {
  text: string;
  locale: Locale;
  mealSlotHint: MealName;
  apiKey: string;
};

export class MealParseError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MealParseError";
    this.status = status;
  }
}

export const parseMealWithAi = async ({
  text,
  locale,
  mealSlotHint,
  apiKey,
}: ParseMealRequest): Promise<ParsedMeal> => {
  const response = await fetch("/api/parse-meal", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-nextbite-openai-key": apiKey,
    },
    body: JSON.stringify({ text, locale, mealSlotHint }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { meal?: ParsedMeal; error?: string }
    | null;

  if (!response.ok || !payload?.meal) {
    throw new MealParseError(
      payload?.error ?? "The meal could not be analyzed. Please try again.",
      response.status,
    );
  }

  return payload.meal;
};

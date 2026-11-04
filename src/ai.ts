import type { Locale, MealName, ParsedMeal } from "./types";
import { validateParsedMeal } from "../shared/meal-validation.mjs";

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

const safeErrorMessage = (locale: Locale, status: number) => {
  const messages: Record<number, [string, string]> = {
    400: [
      "Describe one meal in 600 characters or fewer, or use the quick form.",
      "請用 600 字以內描述一餐，或使用快速輸入。",
    ],
    401: [
      "Check your session OpenAI API key, or use the quick form without AI.",
      "請檢查本次使用的 OpenAI API key，或使用免 AI 的快速輸入。",
    ],
    429: [
      "This OpenAI project is rate-limited or out of credits. Try later or use the quick form.",
      "這個 OpenAI 專案已達使用限制或額度用盡。請稍後再試，或使用快速輸入。",
    ],
    504: [
      "AI took too long to respond. Try again or use the quick form.",
      "AI 回應逾時，請再試一次或使用快速輸入。",
    ],
  };
  const fallback: [string, string] = [
    "AI could not organize this meal. Try again or use the quick form.",
    "AI 無法整理這一餐，請再試一次或使用快速輸入。",
  ];
  return (messages[status] ?? fallback)[locale === "zh" ? 1 : 0];
};

export const parseMealWithAi = async ({
  text,
  locale,
  mealSlotHint,
  apiKey,
}: ParseMealRequest): Promise<ParsedMeal> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35_000);
  try {
    const response = await fetch("/api/parse-meal", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-nextbite-openai-key": apiKey,
      },
      body: JSON.stringify({ text, locale, mealSlotHint }),
    });
    if (!response.ok)
      throw new MealParseError(
        safeErrorMessage(locale, response.status),
        response.status,
      );
    const payload: unknown = await response.json().catch(() => null);
    if (
      !payload ||
      typeof payload !== "object" ||
      !("meal" in payload) ||
      !validateParsedMeal(payload.meal)
    ) {
      throw new MealParseError(safeErrorMessage(locale, 502), 502);
    }
    return payload.meal;
  } catch (error) {
    if (error instanceof MealParseError) throw error;
    const status = controller.signal.aborted ? 504 : 502;
    throw new MealParseError(safeErrorMessage(locale, status), status);
  } finally {
    clearTimeout(timeout);
  }
};

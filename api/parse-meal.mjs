import { mealSchema, validateParsedMeal } from "../shared/meal-validation.mjs";
const MAX_INPUT_LENGTH = 600;
const MAX_KEY_LENGTH = 512;
const ALLOWED_SLOTS = ["Breakfast", "Lunch", "Dinner", "Snacks / Drinks"];

const setPrivateResponseHeaders = (res) => {
  res.setHeader("cache-control", "no-store, max-age=0");
  res.setHeader("pragma", "no-cache");
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "no-referrer");
};

const extractOutputText = (response) => {
  if (typeof response?.output_text === "string") return response.output_text;
  if (!Array.isArray(response?.output)) return null;

  for (const item of response.output) {
    if (!Array.isArray(item?.content)) continue;
    for (const content of item.content) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return null;
};

const parseBody = (body) => {
  const parsed = typeof body === "string" ? JSON.parse(body) : body;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expected a JSON object.");
  }
  return parsed;
};

const hasRefusal = (response) =>
  Array.isArray(response?.output) &&
  response.output.some(
    (item) =>
      Array.isArray(item?.content) &&
      item.content.some((content) => content?.type === "refusal"),
  );

export default async function handler(req, res) {
  setPrivateResponseHeaders(res);

  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = req.headers?.["x-nextbite-openai-key"];
  if (
    typeof apiKey !== "string" ||
    !apiKey.startsWith("sk-") ||
    apiKey.length > MAX_KEY_LENGTH
  ) {
    return res
      .status(401)
      .json({ error: "Enter a valid OpenAI API key for this session." });
  }

  let body;
  try {
    body = parseBody(req.body);
  } catch {
    return res.status(400).json({ error: "The request was not valid JSON." });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const locale = body.locale === "zh" ? "zh" : "en";
  const mealSlotHint = ALLOWED_SLOTS.includes(body.mealSlotHint)
    ? body.mealSlotHint
    : "Lunch";

  if (!text || text.length > MAX_INPUT_LENGTH) {
    return res
      .status(400)
      .json({
        error: `Describe one meal in ${MAX_INPUT_LENGTH} characters or fewer.`,
      });
  }

  const instructions = [
    "You are the meal-understanding layer for MealHatch.",
    "Extract only a structured description of what the user ate. Do not recommend a meal, score health, calculate calories, or provide medical advice.",
    "Do not invent invisible ingredients, cooking oils, sauces, preparation, meal sources, or portion sizes. Record unstated details as unknown and disclose relevant uncertainty in assumptions.",
    "Use mealSource 'Unspecified' unless the user explicitly states the source. Use cookingMethod 'Other' when preparation is not stated. Do not infer a home-cooked, takeout, restaurant, or ready-made source from the food name.",
    "Classify each visible or explicitly named component by its ordinary food-group role.",
    "Normalize each stated component amount into quantity, unit, and qualifier while preserving the user's phrase in originalText. For an unstated amount, use quantity null, unit 'unspecified', qualifier 'unspecified', and originalText null.",
    "A numeric quantity must have a supported unit and qualifier 'exact' or 'approximate'. If an amount cannot be normalized without guessing, use quantity null, unit 'unspecified', qualifier 'unspecified', and preserve the stated phrase in originalText.",
    "Use overall portion size Small, Medium, or Large only when the user states the overall size. If overall portion is not stated, use size 'Unspecified' with confidence 'limited' and disclose the unknown. Do not infer overall size from the number of components or a single component amount.",
    "Ask at most one clarification, and only when it would materially change the food-group interpretation.",
    `Use ${locale === "zh" ? "Traditional Chinese" : "English"} for displayName, component names, assumptions, and clarification.`,
    `If the user does not state the meal slot, use ${mealSlotHint}.`,
  ].join("\n");

  let openAiResponse;
  let responseBody;
  try {
    openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: AbortSignal.timeout(30_000),
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        store: false,
        reasoning: { effort: "none" },
        // Leave room for up to 16 structured components plus uncertainty notes.
        // This is an output ceiling, not a target length or measured guarantee.
        max_output_tokens: 4096,
        instructions,
        input: text,
        text: {
          format: {
            type: "json_schema",
            name: "mealhatch_meal_parse",
            strict: true,
            schema: mealSchema,
          },
        },
      }),
    });
    // The same deadline also covers reading the response body, not just headers.
    // Error bodies are intentionally unused so provider diagnostics stay private.
    if (openAiResponse.ok) responseBody = await openAiResponse.json();
  } catch (error) {
    const timedOut =
      error?.name === "TimeoutError" || error?.name === "AbortError";
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut
        ? "OpenAI took too long to respond. Try again."
        : "OpenAI could not be reached. Try again.",
    });
  }

  if (!openAiResponse.ok) {
    // Release an unread error response without exposing provider diagnostics.
    // Cleanup failure must not hide an authentication or rate-limit response.
    try {
      await openAiResponse.body?.cancel();
    } catch {
      // The HTTP status remains the authoritative recovery signal.
    }
    if (openAiResponse.status === 401) {
      return res.status(401).json({ error: "OpenAI rejected this API key." });
    }
    if (openAiResponse.status === 429) {
      return res
        .status(429)
        .json({
          error: "This OpenAI project is rate-limited or out of credits.",
        });
    }
    return res
      .status(502)
      .json({ error: "OpenAI could not analyze this meal." });
  }

  if (
    responseBody?.status !== "completed" ||
    responseBody?.incomplete_details ||
    responseBody?.error
  ) {
    return res
      .status(502)
      .json({
        error:
          "OpenAI did not finish organizing this meal. Try again or use the quick form.",
      });
  }
  if (hasRefusal(responseBody)) {
    return res
      .status(502)
      .json({
        error:
          "OpenAI could not organize this description. Try describing only the meal, or use the quick form.",
      });
  }

  const outputText = extractOutputText(responseBody);
  if (!outputText) {
    return res
      .status(502)
      .json({ error: "OpenAI returned no structured meal." });
  }

  try {
    const meal = JSON.parse(outputText);
    if (!validateParsedMeal(meal)) {
      return res
        .status(502)
        .json({
          error:
            "OpenAI returned an invalid structured meal. Try again or use the quick form.",
        });
    }
    return res.status(200).json({ meal });
  } catch {
    return res
      .status(502)
      .json({ error: "OpenAI returned an invalid structured meal." });
  }
}

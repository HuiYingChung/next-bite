const MAX_INPUT_LENGTH = 600;
const MAX_KEY_LENGTH = 512;
const ALLOWED_SLOTS = ["Breakfast", "Lunch", "Dinner", "Snacks / Drinks"];

const mealSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "displayName",
    "mealSlot",
    "components",
    "cookingMethod",
    "mealSource",
    "portion",
    "assumptions",
    "clarification",
  ],
  properties: {
    displayName: { type: "string", minLength: 1, maxLength: 100 },
    mealSlot: { type: "string", enum: ALLOWED_SLOTS },
    components: {
      type: "array",
      minItems: 1,
      maxItems: 16,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "group", "amount", "confidence"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 60 },
          group: {
            type: "string",
            enum: ["protein", "vegetable", "carb", "fruit", "soup", "drink", "other"],
          },
          amount: {
            type: "object",
            additionalProperties: false,
            required: ["quantity", "unit", "qualifier", "originalText"],
            properties: {
              quantity: {
                anyOf: [
                  { type: "number", minimum: 0.01, maximum: 50 },
                  { type: "null" },
                ],
              },
              unit: {
                type: "string",
                enum: [
                  "serving",
                  "portion",
                  "cup",
                  "bowl",
                  "plate",
                  "piece",
                  "slice",
                  "tablespoon",
                  "teaspoon",
                  "handful",
                  "glass",
                  "can",
                  "bottle",
                  "unspecified",
                ],
              },
              qualifier: {
                type: "string",
                enum: ["exact", "approximate", "unspecified"],
              },
              originalText: {
                anyOf: [
                  { type: "string", minLength: 1, maxLength: 40 },
                  { type: "null" },
                ],
              },
            },
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "limited"],
          },
        },
      },
    },
    cookingMethod: {
      type: "string",
      enum: [
        "Stir-fried",
        "Grilled",
        "Steamed",
        "Boiled",
        "Fried",
        "Soup / stew",
        "Raw / cold",
        "Other",
      ],
    },
    mealSource: {
      type: "string",
      enum: ["Home-cooked", "Takeout", "Restaurant", "Ready-made"],
    },
    portion: {
      type: "object",
      additionalProperties: false,
      required: ["size", "confidence"],
      properties: {
        size: { type: "string", enum: ["Small", "Medium", "Large"] },
        confidence: {
          type: "string",
          enum: ["high", "medium", "limited"],
        },
      },
    },
    assumptions: {
      type: "array",
      maxItems: 6,
      items: { type: "string", minLength: 1, maxLength: 120 },
    },
    clarification: {
      anyOf: [
        { type: "string", minLength: 1, maxLength: 140 },
        { type: "null" },
      ],
    },
  },
};

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
  if (body && typeof body === "object") return body;
  if (typeof body === "string") return JSON.parse(body);
  return {};
};

export default async function handler(req, res) {
  setPrivateResponseHeaders(res);

  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = req.headers["x-nextbite-openai-key"];
  if (
    typeof apiKey !== "string" ||
    !apiKey.startsWith("sk-") ||
    apiKey.length > MAX_KEY_LENGTH
  ) {
    return res.status(401).json({ error: "Enter a valid OpenAI API key for this session." });
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
      .json({ error: `Describe one meal in ${MAX_INPUT_LENGTH} characters or fewer.` });
  }

  const instructions = [
    "You are the meal-understanding layer for NextBite.",
    "Extract only a structured description of what the user ate. Do not recommend a meal, score health, calculate calories, or provide medical advice.",
    "Do not invent invisible ingredients, cooking oils, sauces, or portion sizes. If a detail is not stated, use the most neutral allowed value and record the uncertainty in assumptions.",
    "Classify each visible or explicitly named component by its ordinary food-group role.",
    "Normalize each stated component amount into quantity, unit, and qualifier while preserving the user's phrase in originalText. For an unstated amount, use quantity null, unit 'unspecified', qualifier 'unspecified', and originalText null.",
    "Normalize the overall portion to Small, Medium, or Large and attach confidence. If portion is not stated, use the most neutral Medium value with limited confidence and disclose that assumption.",
    "Ask at most one clarification, and only when it would materially change the food-group interpretation.",
    `Use ${locale === "zh" ? "Traditional Chinese" : "English"} for displayName, component names, assumptions, and clarification.`,
    `If the user does not state the meal slot, use ${mealSlotHint}.`,
  ].join("\n");

  let openAiResponse;
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
        max_output_tokens: 700,
        instructions,
        input: text,
        text: {
          format: {
            type: "json_schema",
            name: "nextbite_meal_parse",
            strict: true,
            schema: mealSchema,
          },
        },
      }),
    });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError";
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut
        ? "OpenAI took too long to respond. Try again."
        : "OpenAI could not be reached. Try again.",
    });
  }

  const responseBody = await openAiResponse.json().catch(() => null);
  if (!openAiResponse.ok) {
    if (openAiResponse.status === 401) {
      return res.status(401).json({ error: "OpenAI rejected this API key." });
    }
    if (openAiResponse.status === 429) {
      return res
        .status(429)
        .json({ error: "This OpenAI project is rate-limited or out of credits." });
    }
    return res.status(502).json({ error: "OpenAI could not analyze this meal." });
  }

  const outputText = extractOutputText(responseBody);
  if (!outputText) {
    return res.status(502).json({ error: "OpenAI returned no structured meal." });
  }

  try {
    const meal = JSON.parse(outputText);
    return res.status(200).json({ meal });
  } catch {
    return res.status(502).json({ error: "OpenAI returned an invalid structured meal." });
  }
}

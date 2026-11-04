const ALLOWED_SLOTS = ["Breakfast", "Lunch", "Dinner", "Snacks / Drinks"];

const householdUnits = ["serving", "portion", "cup", "bowl", "plate", "piece", "slice", "tablespoon", "teaspoon", "handful", "glass", "can", "bottle", "unspecified"];
const amountSchema = (units, maximum) => ({
  type: "object",
  additionalProperties: false,
  required: ["quantity", "unit", "qualifier", "originalText"],
  properties: {
    quantity: { anyOf: [{ type: "number", minimum: 0.01, maximum }, { type: "null" }] },
    unit: { type: "string", enum: units },
    qualifier: { type: "string", enum: ["exact", "approximate", "unspecified"] },
    originalText: { anyOf: [{ type: "string", minLength: 1, maxLength: 40 }, { type: "null" }] },
  },
});

export const mealSchema = {
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
            enum: [
              "protein",
              "vegetable",
              "carb",
              "fruit",
              "soup",
              "drink",
              "other",
            ],
          },
          amount: {
            anyOf: [amountSchema(householdUnits, 50), amountSchema(["g", "ml"], 10_000)],
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
      enum: [
        "Home-cooked",
        "Takeout",
        "Restaurant",
        "Ready-made",
        "Unspecified",
      ],
    },
    portion: {
      type: "object",
      additionalProperties: false,
      required: ["size", "confidence"],
      properties: {
        size: {
          type: "string",
          enum: ["Small", "Medium", "Large", "Unspecified"],
        },
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

// Keep the runtime guard and the provider's structured schema in one place.
const matchesSchema = (value, schema) => {
  if (schema.anyOf)
    return schema.anyOf.some((choice) => matchesSchema(value, choice));
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.type === "null") return value === null;
  if (schema.type === "string") {
    return (
      typeof value === "string" &&
      value.trim().length > 0 &&
      (schema.minLength === undefined || value.length >= schema.minLength) &&
      (schema.maxLength === undefined || value.length <= schema.maxLength)
    );
  }
  if (schema.type === "number") {
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      (schema.minimum === undefined || value >= schema.minimum) &&
      (schema.maximum === undefined || value <= schema.maximum)
    );
  }
  if (schema.type === "array") {
    return (
      Array.isArray(value) &&
      (schema.minItems === undefined || value.length >= schema.minItems) &&
      (schema.maxItems === undefined || value.length <= schema.maxItems) &&
      value.every((item) => matchesSchema(item, schema.items))
    );
  }
  if (schema.type === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      return false;
    const properties = schema.properties ?? {};
    return (
      (schema.required ?? []).every((key) => Object.hasOwn(value, key)) &&
      (schema.additionalProperties !== false ||
        Object.keys(value).every((key) => Object.hasOwn(properties, key))) &&
      Object.entries(properties).every(
        ([key, property]) =>
          !Object.hasOwn(value, key) || matchesSchema(value[key], property),
      )
    );
  }
  return false;
};

export const validateParsedMeal = (value) =>
  matchesSchema(value, mealSchema) &&
  (value.portion.size !== "Unspecified" ||
    value.portion.confidence === "limited");

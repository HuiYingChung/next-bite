import handler from "../api/parse-meal.mjs";

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const createResponse = () => {
  const headers = new Map();
  return {
    statusCode: 200,
    payload: null,
    setHeader(name, value) {
      headers.set(name.toLowerCase(), value);
    },
    getHeader(name) {
      return headers.get(name.toLowerCase());
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
};

const invoke = async (request) => {
  const response = createResponse();
  await handler(request, response);
  return response;
};

const getResponse = await invoke({ method: "GET", headers: {} });
expect(getResponse.statusCode === 405, "GET should return 405.");
expect(getResponse.getHeader("allow") === "POST", "405 should advertise POST.");

const missingKeyResponse = await invoke({
  method: "POST",
  headers: {},
  body: { text: "rice and chicken" },
});
expect(missingKeyResponse.statusCode === 401, "Missing key should return 401.");

const invalidJsonResponse = await invoke({
  method: "POST",
  headers: { "x-nextbite-openai-key": "sk-test-only" },
  body: "{",
});
expect(invalidJsonResponse.statusCode === 400, "Invalid JSON should return 400.");

const tooLongResponse = await invoke({
  method: "POST",
  headers: { "x-nextbite-openai-key": "sk-test-only" },
  body: { text: "x".repeat(601) },
});
expect(tooLongResponse.statusCode === 400, "Oversized meal text should return 400.");

const parsedMeal = {
  displayName: "Chicken rice with broccoli",
  mealSlot: "Lunch",
  components: [
    {
      name: "chicken",
      group: "protein",
      amount: {
        quantity: 1,
        unit: "serving",
        qualifier: "exact",
        originalText: "one serving",
      },
      confidence: "high",
    },
    {
      name: "rice",
      group: "carb",
      amount: {
        quantity: 1,
        unit: "bowl",
        qualifier: "exact",
        originalText: "one bowl",
      },
      confidence: "high",
    },
    {
      name: "broccoli",
      group: "vegetable",
      amount: {
        quantity: 1,
        unit: "portion",
        qualifier: "approximate",
        originalText: "one side",
      },
      confidence: "high",
    },
  ],
  cookingMethod: "Other",
  mealSource: "Home-cooked",
  portion: { size: "Medium", confidence: "high" },
  assumptions: [],
  clarification: null,
};

const originalFetch = globalThis.fetch;
let forwardedRequest;
globalThis.fetch = async (url, options) => {
  forwardedRequest = { url, options, body: JSON.parse(options.body) };
  return new Response(
    JSON.stringify({
      output: [
        {
          content: [
            {
              type: "output_text",
              text: JSON.stringify(parsedMeal),
            },
          ],
        },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
};

try {
  const successResponse = await invoke({
    method: "POST",
    headers: { "x-nextbite-openai-key": "sk-test-only" },
    body: { text: "chicken rice and broccoli", locale: "en", mealSlotHint: "Lunch" },
  });

  expect(successResponse.statusCode === 200, "Valid parse should return 200.");
  expect(
    successResponse.payload?.meal?.displayName === parsedMeal.displayName,
    "Structured meal should be returned unchanged.",
  );
  expect(
    forwardedRequest.url === "https://api.openai.com/v1/responses",
    "The relay should call the Responses API.",
  );
  expect(forwardedRequest.body.store === false, "OpenAI storage must be disabled.");
  expect(
    forwardedRequest.body.text?.format?.strict === true,
    "Structured Outputs must use strict mode.",
  );
  const forwardedSchema =
    forwardedRequest.body.text?.format?.schema;
  expect(
    forwardedSchema?.properties?.components?.items?.properties?.amount
      ?.properties?.quantity,
    "Component amounts must use the normalized structured schema.",
  );
  expect(
    forwardedSchema?.properties?.portion?.properties?.confidence,
    "Portion confidence must remain in the structured output.",
  );
  expect(
    forwardedRequest.body.model === "gpt-5.6-luna",
    "The extraction model changed unexpectedly.",
  );
  expect(
    forwardedRequest.options.headers.authorization === "Bearer sk-test-only",
    "The key should only be forwarded in the OpenAI authorization header.",
  );
  expect(
    successResponse.getHeader("cache-control") === "no-store, max-age=0",
    "The relay response must not be cached.",
  );
} finally {
  globalThis.fetch = originalFetch;
}

console.log(
  JSON.stringify(
    {
      methodGuard: true,
      keyGuard: true,
      inputLimit: true,
      responsesApi: true,
      structuredOutputs: true,
      normalizedAmountPortionConfidence: true,
      openAiStorageDisabled: true,
      responseCachingDisabled: true,
    },
    null,
    2,
  ),
);

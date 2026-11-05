import handler from "../api/parse-meal.mjs";
import { validateParsedMeal } from "../shared/meal-validation.mjs";
import { build } from "esbuild";

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => {
  throw new Error(
    "Unexpected request: all API verification must use local mocks.",
  );
};

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
  expect(
    response.getHeader("cache-control") === "no-store, max-age=0",
    "Every API response, including errors, must prohibit caching.",
  );
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
expect(
  invalidJsonResponse.statusCode === 400,
  "Invalid JSON should return 400.",
);

const tooLongResponse = await invoke({
  method: "POST",
  headers: { "x-nextbite-openai-key": "sk-test-only" },
  body: { text: "x".repeat(601) },
});
expect(
  tooLongResponse.statusCode === 400,
  "Oversized meal text should return 400.",
);
for (const body of ["null", "[]", "3", null, [], true]) {
  const response = await invoke({
    method: "POST",
    headers: { "x-nextbite-openai-key": "sk-test-only" },
    body,
  });
  expect(
    response.statusCode === 400,
    "Non-object JSON should return 400 without crashing.",
  );
}
const longKeyResponse = await invoke({
  method: "POST",
  headers: { "x-nextbite-openai-key": `sk-${"x".repeat(510)}` },
  body: { text: "rice" },
});
expect(
  longKeyResponse.statusCode === 401,
  "Oversized keys must be rejected before an upstream request.",
);

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

let forwardedRequest;
globalThis.fetch = async (url, options) => {
  forwardedRequest = { url, options, body: JSON.parse(options.body) };
  return new Response(
    JSON.stringify({
      status: "completed",
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
    body: {
      text: "chicken rice and broccoli",
      locale: "en",
      mealSlotHint: "Lunch",
    },
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
  expect(
    forwardedRequest.body.store === false,
    "OpenAI storage must be disabled.",
  );
  expect(
    forwardedRequest.body.text?.format?.strict === true,
    "Structured Outputs must use strict mode.",
  );
  const forwardedSchema = forwardedRequest.body.text?.format?.schema;
  const amountBranches = forwardedSchema?.properties?.components?.items?.properties?.amount?.anyOf;
  expect(
    Array.isArray(amountBranches) && amountBranches.length === 3 && amountBranches.every((branch) => branch.properties?.quantity && branch.additionalProperties === false),
    "Component amounts must separate known household/metric amounts from unknown amounts.",
  );
  const metricBranch = amountBranches.find((branch) => branch.properties.unit.enum.includes("g"));
  const householdBranch = amountBranches.find((branch) => branch.properties.unit.enum.includes("bowl"));
  const unknownBranch = amountBranches.find((branch) => branch.properties.quantity.type === "null");
  expect(metricBranch.properties.unit.enum.includes("ml") && metricBranch.properties.quantity.maximum === 10_000, "Grams and milliliters need their own bounded quantity branch.");
  expect(householdBranch.properties.quantity.maximum === 50 && !householdBranch.properties.unit.enum.includes("g") && !householdBranch.properties.unit.enum.includes("unspecified"), "Known household amounts must have a supported unit and retain their original upper bound.");
  expect(unknownBranch.properties.unit.enum.join() === "unspecified" && unknownBranch.properties.qualifier.enum.join() === "unspecified", "Unknown amounts must not claim an exact quantity or a known unit.");
  expect(forwardedRequest.body.max_output_tokens === 4096, "The output ceiling must leave room for the supported 16-component schema.");
  expect(
    forwardedSchema?.properties?.portion?.properties?.confidence,
    "Portion confidence must remain in the structured output.",
  );
  expect(
    forwardedSchema?.properties?.mealSource?.enum?.includes("Unspecified"),
    "Unstated sources must have an explicit unknown value.",
  );
  expect(
    forwardedSchema?.properties?.portion?.properties?.size?.enum?.includes(
      "Unspecified",
    ),
    "Unstated overall portions must not be forced to Medium.",
  );
  expect(
    forwardedRequest.body.instructions.includes(
      "Use mealSource 'Unspecified'",
    ) &&
      forwardedRequest.body.instructions.includes(
        "size 'Unspecified' with confidence 'limited'",
      ),
    "The extraction instructions must preserve unknown source and overall portion.",
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

  const validRequest = {
    method: "POST",
    headers: { "x-nextbite-openai-key": "sk-test-only" },
    body: { text: "rice and chicken" },
  };
  const respondWith = (body, status = 200) => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
  };
  for (const unit of ["g", "ml"]) {
    for (const quantity of [0.01, 150, 10_000]) {
      const meal = { ...parsedMeal, components: [{ ...parsedMeal.components[0], amount: { quantity, unit, qualifier: "exact", originalText: `${quantity} ${unit}` } }] };
      expect(validateParsedMeal(meal), `Valid ${unit} amounts must pass the shared guard.`);
      respondWith({ status: "completed", output_text: JSON.stringify(meal) });
      const response = await invoke(validRequest);
      expect(response.statusCode === 200 && response.payload.meal.components[0].amount.quantity === quantity && response.payload.meal.components[0].amount.unit === unit, `The relay must preserve ${unit} without converting it to servings.`);
    }
  }
  const invalidMeals = [
    { ...parsedMeal, components: [{ ...parsedMeal.components[0], sourceFoodId: "usda-168878" }] },
    {},
    null,
    [],
    { ...parsedMeal, components: [] },
    { ...parsedMeal, components: "not an array" },
    { ...parsedMeal, components: [null] },
    {
      ...parsedMeal,
      components: [{ ...parsedMeal.components[0], group: "invented" }],
    },
    {
      ...parsedMeal,
      components: [
        {
          ...parsedMeal.components[0],
          amount: { ...parsedMeal.components[0].amount, quantity: 100 },
        },
      ],
    },
    { ...parsedMeal, portion: { size: "Huge", confidence: "high" } },
    { ...parsedMeal, portion: { size: "Unspecified", confidence: "high" } },
    { ...parsedMeal, assumptions: [null] },
    { ...parsedMeal, displayName: "x".repeat(101) },
    { ...parsedMeal, displayName: "   " },
    { ...parsedMeal, apiKey: "must-not-echo" },
    ...["g", "ml"].flatMap((unit) => [0, 0.001, 10_000.01].map((quantity) => ({ ...parsedMeal, components: [{ ...parsedMeal.components[0], amount: { quantity, unit, qualifier: "exact", originalText: `${quantity} ${unit}` } }] }))),
    { ...parsedMeal, components: [{ ...parsedMeal.components[0], amount: { quantity: 50.01, unit: "bowl", qualifier: "exact", originalText: "too many bowls" } }] },
    ...[
      { quantity: 1, unit: "unspecified", qualifier: "exact", originalText: "one bowl" },
      { quantity: null, unit: "g", qualifier: "exact", originalText: "150 g" },
      { quantity: null, unit: "bowl", qualifier: "unspecified", originalText: "some bowls" },
      { quantity: null, unit: "unspecified", qualifier: "approximate", originalText: "some" },
      { quantity: 150, unit: "g", qualifier: "unspecified", originalText: null },
    ].map((amount) => ({ ...parsedMeal, components: [{ ...parsedMeal.components[0], amount }] })),
  ];
  for (const meal of invalidMeals) {
    expect(
      !validateParsedMeal(meal),
      "The shared guard must reject unsafe meal data.",
    );
    respondWith({ status: "completed", output_text: JSON.stringify(meal) });
    const response = await invoke(validRequest);
    expect(
      response.statusCode === 502 && !response.payload?.meal,
      "Malformed upstream meals must never reach the UI.",
    );
  }
  expect(
    !validateParsedMeal({
      ...parsedMeal,
      components: [
        {
          ...parsedMeal.components[0],
          amount: { ...parsedMeal.components[0].amount, quantity: Number.NaN },
        },
      ],
    }),
    "Non-finite amounts must fail validation.",
  );
  expect(
    validateParsedMeal({
      ...parsedMeal,
      components: [
        {
          ...parsedMeal.components[0],
          amount: {
            quantity: null,
            unit: "unspecified",
            qualifier: "unspecified",
            originalText: null,
          },
        },
      ],
    }),
    "Unknown amounts are valid and must not be invented.",
  );
  for (const originalText of ["a little", "少許"]) {
    const meal = { ...parsedMeal, components: [{ ...parsedMeal.components[0], amount: { quantity: null, unit: "unspecified", qualifier: "unspecified", originalText } }] };
    respondWith({ status: "completed", output_text: JSON.stringify(meal) });
    const response = await invoke(validRequest);
    expect(response.statusCode === 200 && response.payload.meal.components[0].amount.quantity === null && response.payload.meal.components[0].amount.originalText === originalText, "Vague amounts must preserve the user's phrase without inventing a normalized quantity.");
  }
  const unknownContextMeal = {
    ...parsedMeal,
    cookingMethod: "Other",
    mealSource: "Unspecified",
    portion: { size: "Unspecified", confidence: "limited" },
    assumptions: ["The source and overall portion were not stated."],
  };
  expect(
    validateParsedMeal(unknownContextMeal),
    "Unknown source and portion must be valid with limited portion confidence.",
  );
  respondWith({
    status: "completed",
    output_text: JSON.stringify(unknownContextMeal),
  });
  const unknownContextResponse = await invoke(validRequest);
  expect(
    unknownContextResponse.statusCode === 200 &&
      unknownContextResponse.payload.meal.mealSource === "Unspecified" &&
      unknownContextResponse.payload.meal.portion.size === "Unspecified" &&
      unknownContextResponse.payload.meal.portion.confidence === "limited",
    "Unknown source and portion must survive the relay without invented defaults.",
  );

  for (const responseBody of [
    {
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output_text: JSON.stringify(parsedMeal),
    },
    {
      status: "failed",
      error: { message: "must-not-echo" },
      output_text: JSON.stringify(parsedMeal),
    },
    {
      status: "completed",
      output: [
        {
          content: [
            { type: "refusal", refusal: "must-not-echo" },
            { type: "output_text", text: JSON.stringify(parsedMeal) },
          ],
        },
      ],
    },
    { status: "completed", output_text: "{" },
    { status: "completed", output: [] },
    null,
  ]) {
    respondWith(responseBody);
    const response = await invoke(validRequest);
    expect(
      response.statusCode === 502 && !response.payload?.meal,
      "Refusal, incomplete, or invalid responses must fail safely.",
    );
    expect(
      !JSON.stringify(response.payload).includes("must-not-echo"),
      "Raw provider details must not leak in API errors.",
    );
  }
  for (const [upstreamStatus, expectedStatus] of [
    [401, 401],
    [429, 429],
    [403, 502],
    [500, 502],
  ]) {
    respondWith({ error: { message: "must-not-echo" } }, upstreamStatus);
    const response = await invoke(validRequest);
    expect(
      response.statusCode === expectedStatus,
      "Upstream errors must map to a safe local status.",
    );
    expect(
      !JSON.stringify(response.payload).includes("must-not-echo"),
      "Provider error text must remain redacted.",
    );
  }
  for (const cleanupFails of [false, true]) {
    let bodyCancelled = false;
    let diagnosticsRead = false;
    globalThis.fetch = async () => ({
      ok: false,
      status: 429,
      body: {
        async cancel() {
          bodyCancelled = true;
          if (cleanupFails) throw new Error("must-not-echo");
        },
      },
      async json() {
        diagnosticsRead = true;
        return { error: { message: "must-not-echo" } };
      },
    });
    const response = await invoke(validRequest);
    expect(bodyCancelled && !diagnosticsRead, "Unread provider error bodies must be released without reading their diagnostics.");
    expect(response.statusCode === 429 && !JSON.stringify(response.payload).includes("must-not-echo"), "Response cleanup failures must preserve the provider recovery status and error redaction.");
  }
  for (const name of ["TimeoutError", "AbortError", "TypeError"]) {
    globalThis.fetch = async () => {
      const error = new Error("must-not-echo");
      error.name = name;
      throw error;
    };
    const response = await invoke(validRequest);
    expect(
      response.statusCode === (name === "TypeError" ? 502 : 504),
      "Timeout and network failures must return safe errors.",
    );
    expect(
      !JSON.stringify(response.payload).includes("must-not-echo"),
      "Network diagnostics must not leak.",
    );
  }
  for (const name of ["TimeoutError", "AbortError", "SyntaxError", "TypeError"]) {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      async json() {
        const error = new Error("must-not-echo");
        error.name = name;
        throw error;
      },
    });
    const response = await invoke(validRequest);
    expect(response.statusCode === (["TimeoutError", "AbortError"].includes(name) ? 504 : 502), "Response-body timeouts must retain the timeout recovery status after headers arrive.");
    expect(!JSON.stringify(response.payload).includes("must-not-echo"), "Response-body diagnostics must stay private.");
  }

  // Exercise the actual browser boundary using mocked HTTP; no provider access.
  await build({
    entryPoints: ["src/ai.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "error",
    outfile: ".audit-tmp/api-client.mjs",
  });
  const { parseMealWithAi, MealParseError } = await import(
    "../.audit-tmp/api-client.mjs"
  );
  const clientRequest = {
    text: "rice",
    locale: "zh",
    mealSlotHint: "Lunch",
    apiKey: "sk-test-only",
  };
  let clientForward;
  globalThis.fetch = async (url, options) => {
    clientForward = { url, options };
    return new Response(JSON.stringify({ meal: parsedMeal }), { status: 200 });
  };
  expect(
    (await parseMealWithAi(clientRequest)).displayName ===
      parsedMeal.displayName,
    "Valid client responses must remain usable.",
  );
  expect(
    clientForward.url === "/api/parse-meal" &&
      clientForward.options.cache === "no-store" &&
      clientForward.options.credentials === "same-origin",
    "Client must preserve the same-origin no-store relay.",
  );
  expect(
    clientForward.options.headers["x-nextbite-openai-key"] === "sk-test-only" &&
      !clientForward.options.body.includes("sk-test-only"),
    "Client must keep the session key in its dedicated request header.",
  );
  respondWith({ meal: unknownContextMeal });
  const clientUnknown = await parseMealWithAi(clientRequest);
  expect(
    clientUnknown.mealSource === "Unspecified" &&
      clientUnknown.portion.size === "Unspecified" &&
      clientUnknown.portion.confidence === "limited",
    "The browser boundary must preserve unknown meal context.",
  );
  const clientErrors = [
    {
      body: { meal: {} },
      status: 200,
      expectedStatus: 502,
      message: "AI 無法整理這一餐，請再試一次或使用快速輸入。",
    },
    {
      body: { error: "must-not-echo" },
      status: 401,
      expectedStatus: 401,
      message: "請檢查本次使用的 OpenAI API key，或使用免 AI 的快速輸入。",
    },
    {
      body: { error: "must-not-echo" },
      status: 429,
      expectedStatus: 429,
      message:
        "這個 OpenAI 專案已達使用限制或額度用盡。請稍後再試，或使用快速輸入。",
    },
    {
      body: { error: "must-not-echo" },
      status: 502,
      expectedStatus: 502,
      message: "AI 無法整理這一餐，請再試一次或使用快速輸入。",
    },
    {
      body: null,
      status: 200,
      expectedStatus: 502,
      message: "AI 無法整理這一餐，請再試一次或使用快速輸入。",
    },
  ];
  for (const { body, status, expectedStatus, message } of clientErrors) {
    respondWith(body, status);
    let caught;
    try {
      await parseMealWithAi(clientRequest);
    } catch (error) {
      caught = error;
    }
    expect(
      caught instanceof MealParseError,
      "Unsafe client payloads must become recoverable meal errors.",
    );
    expect(
      caught.status === expectedStatus,
      "Client error status must identify the actual recovery condition.",
    );
    expect(
      caught.message === message,
      "The client must show the correct localized recovery message, not arbitrary server text.",
    );
  }
  globalThis.fetch = async () => {
    throw new Error("must-not-echo");
  };
  let networkError;
  try {
    await parseMealWithAi(clientRequest);
  } catch (error) {
    networkError = error;
  }
  expect(
    networkError instanceof MealParseError &&
      networkError.status === 502 &&
      networkError.message === "AI 無法整理這一餐，請再試一次或使用快速輸入。",
    "Client network failure must retain the exact localized manual recovery path.",
  );

  const preAborted = new AbortController();
  preAborted.abort();
  let cancelledRequestSent = false;
  globalThis.fetch = async () => {
    cancelledRequestSent = true;
    return new Response(JSON.stringify({ meal: parsedMeal }));
  };
  let preAbortedError;
  try {
    await parseMealWithAi({ ...clientRequest, signal: preAborted.signal });
  } catch (error) {
    preAbortedError = error;
  }
  expect(preAbortedError?.name === "AbortError" && !(preAbortedError instanceof MealParseError) && !cancelledRequestSent, "A cancelled editor must not send a new request or report a provider timeout.");

  for (const phase of ["headers", "body"]) {
    const cancelled = new AbortController();
    let beginPhase;
    const phaseStarted = new Promise((resolve) => { beginPhase = resolve; });
    let requestSignal;
    globalThis.fetch = async (_url, options) => {
      requestSignal = options.signal;
      const pending = () => new Promise((_resolve, reject) => {
        requestSignal.addEventListener("abort", () => reject(new DOMException("must-not-echo", "AbortError")), { once: true });
        beginPhase();
      });
      return phase === "headers" ? pending() : { ok: true, status: 200, json: pending };
    };
    const parsing = parseMealWithAi({ ...clientRequest, signal: cancelled.signal });
    await phaseStarted;
    cancelled.abort();
    let cancellationError;
    try {
      await parsing;
    } catch (error) {
      cancellationError = error;
    }
    expect(requestSignal.aborted && cancellationError?.name === "AbortError" && !(cancellationError instanceof MealParseError), `Cancelling during ${phase} must abort the underlying request without a timeout error.`);
  }

  const originalSetTimeout = globalThis.setTimeout;
  try {
    // Exercise the real client timeout path without waiting 35 seconds.
    globalThis.setTimeout = (callback, delay, ...args) => originalSetTimeout(callback, delay === 35_000 ? 0 : delay, ...args);
    globalThis.fetch = async (_url, options) => ({
      ok: true,
      status: 200,
      json: () => new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new DOMException("must-not-echo", "AbortError")), { once: true });
      }),
    });
    let bodyTimeoutError;
    try {
      await parseMealWithAi(clientRequest);
    } catch (error) {
      bodyTimeoutError = error;
    }
    expect(bodyTimeoutError instanceof MealParseError && bodyTimeoutError.status === 504 && bodyTimeoutError.message === "AI 回應逾時，請再試一次或使用快速輸入。", "The client's own deadline must remain a localized 504 while reading the response body.");
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
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
      metricAndHouseholdQuantityBounds: true,
      coherentKnownAndUnknownAmounts: true,
      providerCannotClaimSourceFoodIdentity: true,
      unknownSourceAndPortionPreserved: true,
      openAiStorageDisabled: true,
      responseCachingDisabled: true,
      runtimeMealValidation: true,
      refusalAndIncompleteRejected: true,
      upstreamErrorRedaction: true,
      unreadProviderErrorsReleased: true,
      timeoutAndNetworkRecovery: true,
      responseBodyTimeoutRecovery: true,
      clientRequestCancellation: true,
      localizedClientGuard: true,
    },
    null,
    2,
  ),
);

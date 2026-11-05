import handler from "../api/parse-meal.mjs";

const MAX_BODY_BYTES = 8 * 1024;

// Adapt the production serverless handler to Vite's Node HTTP server. Keep the
// key in the incoming request only; no local environment secret is needed.
export function createMealApiMiddleware() {
  return async (req, res, next) => {
    if (req.url?.split("?")[0] !== "/api/parse-meal") return next();

    res.status = (statusCode) => {
      res.statusCode = statusCode;
      return res;
    };
    res.json = (payload) => {
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify(payload));
      return res;
    };
    res.setHeader("cache-control", "no-store, max-age=0");
    res.setHeader("pragma", "no-cache");
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("referrer-policy", "no-referrer");

    try {
      if (req.method === "POST") {
        const body = await new Promise((resolve, reject) => {
          const chunks = [];
          let bytes = 0;
          req.on("data", (chunk) => {
            bytes += chunk.length;
            if (bytes <= MAX_BODY_BYTES) chunks.push(chunk);
            else chunks.length = 0;
          });
          req.on("end", () => resolve(
            bytes > MAX_BODY_BYTES ? null : Buffer.concat(chunks).toString("utf8"),
          ));
          req.on("error", reject);
          req.on("aborted", () => reject(new Error("Request aborted.")));
        });
        if (body === null) {
          return res.status(413).json({ error: "The request is too large." });
        }
        req.body = body;
      }
      await handler(req, res);
    } catch {
      // Never echo errors that might contain a request body or key.
      if (!res.headersSent && !res.destroyed) {
        res.status(500).json({ error: "The meal service could not process this request." });
      }
    }
  };
}

export default function localMealApi() {
  return {
    name: "nextbite-local-meal-api",
    configureServer(server) {
      server.middlewares.use(createMealApiMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(createMealApiMiddleware());
    },
  };
}

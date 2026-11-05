# AI reliability

Status: review
Authorized: 2026-11-04, following the user's code-only AI audit and request to fix
the identified problems before they test with their own key.
Branch: `codex/ai-reliability`
Base: `dcb93df6c76993cece7368c8e08c629c57cb0a97`
Commit and branch push authorized by the user on 2026-11-04. Live-key testing
remains pending; this handoff does not include a merge or production deployment.

## Changes

- `src/App.tsx`, `src/ai.ts`: focusing a field or toggling a disclosure preserves
  an in-flight result. Actual edits, close/reset, forgetting a key, switching
  locale and manual review/save cancel the client request. Generation checks
  still reject late results. Safe localized 401/429/504 messages reach the UI;
  response-body timeouts remain timeouts.
- `shared/meal-validation.mjs`, `api/parse-meal.mjs`: numeric amounts need a
  supported unit and an exact/approximate qualifier. Unknown amounts remain
  unknown and can preserve vague phrases. The provider's response-body read
  shares its existing timeout. The output ceiling increases from 700 to 4096
  tokens to give the supported 16-component structure more room.
- `scripts/local-meal-api.mjs`, `vite.config.ts`: development and preview serve
  the production handler at `/api/parse-meal`, with bounded request bodies,
  no-store responses and no secret configuration or additional dependencies.
- `scripts/verify-api.mjs`, `scripts/verify-ai-ui.mjs`,
  `scripts/verify-local-api.mjs`, `package.json`, `.github/workflows/ci.yml`:
  regression checks cover the corrected boundaries locally and in CI.
- README instructions explain local key testing and static hosting limits.

Recommendation rules, nutrition scoring and persisted record format are unchanged.
AI continues to organize user input for confirmation, not calculate recommendations.

## Verification

- `npm run verify` passed: build, product/engine rules, API mocks, 19 actual-App
  handler cases, local development/preview HTTP routes, record storage,
  presentation, nutrition, food library, seven-day ranking and weekly summaries.
- Isolated Chromium against the production preview passed: pending-request
  focus/disclosure interactions; successful AI review, explicit save and reload
  persistence; distinct 401/429/504 screen messages; editing/closing discards
  stale responses. No page errors occurred. API responses were intercepted
  locally; the check made no real provider requests and used no real key.
- The user's existing local development route returned 401 for a missing key,
  confirming that it now reaches the handler instead of the old 404.
- `git diff --check` passed. The build retains its existing large-chunk warning.

## Boundaries and next validation

Real account/model access, extraction accuracy, provider latency and whether
long bilingual meals fit the output ceiling require the user's live key test.
The 4096-token ceiling is not an observed output length or quality guarantee.
Browser cancellation does not guarantee that already-started provider work or
charges are canceled. The server retains its independent 30-second timeout.

For live testing, refresh the local page, open **Record a meal → Optional: let AI
organize your words**, enter a session key and review a short meal description.
Then test vague portions and a longer description with multiple ingredients.
Review before saving. Do not put a real key in source, tests or documentation.

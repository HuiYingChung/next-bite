# Preference-first next-meal decisions

Status: review
Authorized: 2026-11-06. The user accepted the positioning and implementation
recommendations, explicitly requiring that calculation details remain available
and collapsed by default.
Branch: `codex/preference-first`, based on
`f21411e4d8f2cfe2e65e5825f09257e0fb7b5f5c` (also the verified remote
`codex/recipes-24` tip). Remote `main` remains `09471f1`; the catalog expansion
has not been merged by this iteration.

## Scope

MealHatch helps English/Traditional-Chinese-speaking Chinese adults in North
America decide what to prepare for their next meal. Current preferences and
practical preparation conditions lead; sourced composition is a reference.
No eating-habit grade, weight-loss objective or inferred nutrient deficit.

1. Apply ingredient avoids, required meal conditions and evidence completeness.
2. Compare current-meal preference points, then saved preference points, then
   the unchanged per-100-g nutrition reference (`10 - raw UK NPM 2018`).
3. Use existing seven-day and offered-option variety only when all three
   preceding values tie; stable IDs resolve remaining ties.
4. Retain every model input, threshold, credited point, preference contribution,
   formula, source derivation and history explanation. Put calculation details
   inside a native disclosure that starts closed. Lead cards with actual fit
   reasons and choosing a meal rather than a combined health-like total.
5. Record whether ingredients are prepared. Assembly estimates do not become
   full cooking estimates. If ingredients still need preparation and a time
   limit is required, unknown full time cannot satisfy that limit. Without a
   limit, permit browsing with a clear preparation-time qualification.
6. Align bilingual method copy, README, scoring policy and launch study drafts.

This is a disclosed product priority, not a newly validated nutrition model or
a scientific percentage weighting. Five existing preference groups keep their
0/+2 calculations, with current versus saved scope made explicit. The public
model, source records, 108 recipes/versions/portions, hard avoids, recording,
AI parsing, persistence and legacy plans remain intact.

## Verification

- Check that an available requested staple actually leads the top three,
  including bread, rice and noodles; current requests beat conflicting saved
  preferences and history cannot overturn preference/model priorities.
- Check no/partial matches, unsupported saved preferences, missing model inputs,
  ingredient readiness/time limits, deterministic repeatability and unchanged
  model arithmetic/portion estimates.
- Check all score rows and sources are still present behind initially closed,
  keyboard-operable disclosures in English and Traditional Chinese.
- Exercise changes, alternative selection, plan saving and recipe browsing in
  an isolated browser; inspect narrow and desktop layouts and page errors.
- Run the full existing repository suite with real provider access disabled.
  Update evidence here only after each check passes.

The implementation adds no dependencies, external service, nutrition data or
live AI request. Release authorization is recorded separately below.

## Implementation and verification evidence

- Ranking policy `mealhatch-preference-first-2026-11-06-v1` compares current
  points, saved points and nutrition reference separately. The trace and
  expanded receipt identify the version and ordering. The old additive `total`
  remains an explicitly deprecated internal arithmetic diagnostic, with no
  influence on ranking and no displayed health-like combined score.
- All seven model input rows, applied bands and points, A/C/protein gate,
  original raw result, five preference rows, source derivations and history
  evidence remain in the default-closed receipt. Preference rows identify
  scope, selected/matched/unmatched values and group subtotals. Unsupported
  legacy saved choices remain unscored and explicitly explained.
- Current meal preferences lead even against conflicting saved choices. An
  unknown raw-start preparation time cannot earn a less-effort match or pass a
  required time limit. Removing the time limit permits qualified browsing.
- `npm run verify` passed the build, product/engine, API/editor/local-route
  mocks, persistence, presentation/dashboard, nutrition, food-library, records,
  history and weekly checks. Log: `.audit-tmp/preference-first-verify.log`.
  The new `verify-preference-first.mjs` also passed independently and is now
  included in `verify:nutrition`; the complete nutrition command and final
  TypeScript check subsequently passed. No live-provider request was made.
- Independent source/recipe arithmetic verifies 108 recipes across 28 ranking
  contexts; history checks cover 120 scenarios and 16 calendar boundaries.
  A separate reviewer swept 1,260 contexts / 124,740 eligible recipe evaluations
  for priority order, row attribution and preparation conditions. Its exact
  reproducible command is in
  `.audit-tmp/preference-first-independent-review.json`.
- Isolated Chromium passed both languages, 216 recipe detail/instruction views,
  648 portions and 1,392 exact ingredient labels. New checks exercise initially
  closed scoring, keyboard expansion of every model/preference row and source,
  actual preference matches, switching, preparation limits and save/reload.
  Legacy/retired/unavailable-version plans, exports and exclusions still pass.
  Report: `output/playwright/preference-first/browser-verification.json`.
  Widths 320/390/768/1280 px pass; zero page errors.
- Final UI polish removes duplicate default preference text and adds a visible
  mobile table-scroll hint. Dashboard/availability checks and a targeted
  bilingual browser rerun passed after these changes, including reaching the
  rightmost model-point column, disclosures, selection/save/reload and migration.
  Report: `output/playwright/preference-first/preference-flow-verification.json`.
  Root reviewed the refreshed Chinese phone and calculation screenshots.
- Source data, recipe versions, public nutrient model, food-library scoring,
  record storage and AI/API implementation have no changes. Root visually
  reviewed English desktop, Chinese phone, matched mobile meal and expanded
  Chinese calculation screenshots. React review found no new state, dependency,
  persistence or request-lifecycle changes needed.
- README, public metadata, method and draft study/launch copy reflect the
  product priorities. Existing gallery/video captures are explicitly marked
  historical pending recapture; the capture script supports the new disclosure.
  User research and production release remain separate.

Final `git diff --check` passed. At implementation handoff, work was uncommitted
on `codex/preference-first`; no push, merge or deployment had been performed.

## Release authorization

On 2026-11-06 the user explicitly authorized commit, push and merge of this
reviewed version. The branch includes the previously committed 108-recipe
catalog (`f21411e`) because that dependency was not yet on `main` when this
iteration began. Release the combined current version through a pull request,
after its remote checks pass. Git history and pull-request checks record the
actual commit and merge results; deployment status is reported separately.
This authorization does not publish the Product Hunt materials or claim a
completed user study or real-provider AI test.

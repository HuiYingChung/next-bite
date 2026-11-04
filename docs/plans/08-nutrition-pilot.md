# Sourced recipe and meal-context pilot

Status: review
Authorized: 2026-11-04, user approved the researched implementation proposal,
then requested numeric matching receipts instead of contribution charts.
Branch: `codex/nutrition-pilot`
Base: `e0946afd679053ed5833bdf460aedf3752ab0290`

The later user-authorized [published-model scoring iteration](./09-published-model-scoring.md)
supersedes the no-score selection policy below. This file retains the prior
iteration's scope and historical verification evidence.

## Credibility correction — authorized 2026-11-04

The user approved the full rule-review findings with “改吧”. This supersedes
previous acceptance of visible matching totals and the identical-nutrient-only
variety rule. The correction keeps source arithmetic and hard exclusions while:

- Correcting ambiguous bean identity and false text/temperature inferences.
- Retaining confirmed source-food identity through local records; confidence
  must not shrink confirmed food presence and translation must not change it.
- Interpreting effort preference as preparation effort, not stimulant demand.
- Ordering recipes by explicit, disclosed preferences, with record/option
  variety among equally preferred candidates. No invented nutritional total.
- Exposing the 100-idea path as inspiration without nutrient-balance ranking.
- Replacing duplicated score/reason sections with one collapsed decision basis,
  and comparing actual recipe kcal/protein/estimated assembly time numerically.
- Preserving the chosen recipe identity in plans and public meal-card copy.
- Adding regressions for the audited counterexamples and verifying bilingual
  desktop/mobile, recording, persistence and hard-condition empty states.

No population program, clinical claim, source refresh service, push or deployment
is added. The original scope and historical verification below describe the
preceding implementation; final correction evidence is recorded below.

## Authorized outcome

Correct the confirmed cold/warm and lexical preference mismatches. Introduce
12 portion-defined, source-mapped recipes and usable hunger, appetite and
this-meal preferences. Preserve the compact bilingual dashboard and existing
local records, plans, hard avoids, credential and export boundaries.

This specific user-approved iteration supersedes the old deferred phases'
no-ranking-change and no-UI-change restrictions for this bounded pilot. It
does not authorize the full 100-meal nutrition migration, a clinical kernel,
personal calorie prescriptions, weight-loss or sports programs, pregnancy,
children or disease-specific recommendations. Those remain future work.

## Original acceptance (superseded where noted above)

- Correct confirmed warm/cold explanations and tag-based preference mistakes.
- Explicitly separate the 12-recipe numeric path from the 100 editorial meal
  ideas. Do not compare their scores or silently fall back between paths.
- Use actual pinned public source records with IDs, URLs, retrieval date,
  nutrient units, raw/cooked basis, license and reproducible snapshot hashes.
- Each recipe declares edible weights, oil/seasoning, preparation assumptions,
  version and limitations. Portion variants are recipe choices, not medical
  recommendations. Missing nutrients propagate as unknown, not zero.
- Show kcal and useful nutrient amounts, with full recipe/source details
  collapsed. Calculations describe the standard recipe, not an unspecified
  restaurant meal or the user's unmeasured prior intake.
- Hunger and appetite affect a transparent suggested portion; an explicit
  portion choice takes precedence. Temperature and preparation-time limits
  apply to every option. Cuisine and staple preferences affect ranking and
  disclose mismatches. Mood never implies a nutrient deficiency.
- Matching receipts show compact numbers and actual reasons; remove bars.
- New this-meal settings stay session-scoped and reset for a new day or a
  confirmed meal. Existing records and preferences migrate without loss.
- Preserve explicit review before a plan becomes consumed food. Preserve
  separation of real and example records and public share-card content.

## Verification and handoff

Run source/hash and arithmetic checks, unknown propagation, portion monotonicity,
all 12 recipe mappings, hard-avoid regressions and concrete context scenarios.
Run the existing full verification and applicable reachability/drink audits;
report pre-existing or intentional gate changes explicitly rather than weakening
checks. Check English/Traditional Chinese at desktop and phone widths, sources,
context changes, numeric receipts, plan/review/save, reload and drawer focus.

No new runtime dependency, runtime nutrition API, private import key, telemetry,
account, deployment or push. Keep source downloads apart from shipped curated
snapshots. Update this plan to review only after final-tree verification.

## Implemented behavior

- The default twelve-recipe collection uses seventeen archived USDA SR Legacy
  records with exact ingredient grams, food states, source IDs, versioned
  recipes, seasoning and three portion factors. Added sugars remain unknown;
  shrimp fiber remains unknown. The raw snapshot is not bundled into the app.
- Hunger suggests a portion, and an explicit portion overrides that suggestion.
  This-meal mood, temperature, staple, cuisine and assembly-time conditions
  participate in matching. Controls with no support in a collection are hidden
  or explicitly explain the missing evidence. Numeric time limits do not pass
  legacy meals with unknown preparation minutes.
- Saved profile avoids remain conservative. The pilot additionally filters
  the actual recipe's source-ID ingredient declarations, raw/cold states and
  selected large portion. Saved recipe plans apply the same added checks.
- Recipe matching has an additive five-row practical-points receipt. Nutrient
  preferences can additionally resolve practical ties using actual protein or
  vegetable grams; they are not added to a synthetic health score. The separate
  hundred-idea collection retains its own labeled editorial calculation.
- Both collections now show **Matching points / 配對計分 and its total without
  opening anything**, above the choose-meal action. Only the rule details are
  collapsed. This corrects an intermediate layout that made the score available
  only in the other collection. Rule labels and reasons align left, numbers
  right; fixed columns, top alignment and fine separators replace all bars.
- Plans retain recipe version/portion. Confirming consumption opens editable
  ingredients in grams, explicitly identified as recipe estimates. Returning
  to quick input preserves oil, salt and edited amounts without duplicate
  ingredients. Confirmation is still required before writing a meal record.
- Grams/mL persist and export with metric quantity bounds; household units
  retain their own smaller bound. Current meal context is session-only and
  resets after confirmation, day rollover, reload, or example entry/exit.

## Verification evidence — 2026-11-04

`npm run verify` passed against the integrated implementation, including production
build, product, engine, mocked API, local-state, bilingual presentation,
dashboard and nutrition checks. No real provider call was made.

- Offline importer verifies the archived source hash, all seventeen records,
  states, identities, units and twelve recipe declarations. Nutrition tests
  compare 136 source values, independent arithmetic for a chicken bowl, all
  portion factors, missing-field propagation and 348 hard-avoid contexts.
- The dashboard verifier renders eighty actual nutrition panels, 406 exact
  official ingredient links, 120 pilot rule rows, signed/zero points and exact
  receipt sums across both languages. It retains legacy numeric receipts and
  56 exact history-cell selection callbacks.
- Final drink reachability audit passed: 25 choices reachable without sensitive
  opt-in, all 30 with explicit opt-in, zero unreachable; sensitive default-deny
  and ingredient avoids held.
- The full legacy meal reachability audit passed 147,000 scenarios: all 100
  meals were selected at least once, with zero unreachable meals. This tests
  catalog reachability, not clinical quality or user satisfaction.
- Real in-app Chromium checked English/Traditional Chinese at 1365×900,
  390×844 and 320×740. Numeric receipts align left/right/left, contain no bar
  elements, and do not cause document overflow at the two phone widths.
- Browser checks confirmed hunger changes the displayed portion, explicit
  appetite wins, warmth/time conditions filter every option, unmatched staple
  preferences are disclosed, and unknown-time legacy results recover when the
  numeric limit is removed. Both paths show the matching-points heading and
  actual number in the normal page; expanding shows correctly summed rules.
- A plan retained its large portion/version across reload. A small-portion
  example opened with five source ingredients, allowed rice to be edited to
  180 g, preserved oil/salt and all amounts through back/review, and removed
  the plan only after a confirmed meal. That confirmation reset meal context.
- The editable review drawer focused its heading; Escape restored the opener.
  A fresh QA reload showed no console warnings/errors. QA used `localhost`,
  separate from the user's existing `127.0.0.1` storage origin.
- Final quantity-boundary review corrected acceptance of amounts below 0.01.
  A browser check confirmed that entering 0.001 g displays the explicit bounds
  error, keeps the draft editable and retains the plan. The subsequent build
  passed; no unsupported amount was silently saved as unknown.
- A final combined-preference regression corrected saved light-meal preferences
  overriding a current low-effort choice. Both now contribute independently
  when applicable; ten-minute options and the exact two-point receipt are
  verified. Nutrition, dashboard, TypeScript and production build checks passed
  after this correction. Legacy meal/drink rankings are unchanged by it.

Screenshots are local ignored QA artifacts in `.audit-tmp/`, including
`matching-score-restored.png`, `matching-score-detail.png`,
`matching-score-mobile.png` and `numeric-receipt-aligned.png`.

JSON/PNG download transport helpers are unchanged; storage/export content has
automated coverage. No new real download, physical-device test, Firefox/WebKit
test, dietitian review, clinical validation, launch result, push or deployment
is claimed. Goal-specific adult modes and special populations remain deferred.


## Credibility correction verification — 2026-11-04

- Implemented the approved rule correction on `codex/nutrition-pilot` without
  changing source nutrient values, ingredient weights or portion multipliers.
  Source-backed estimates and editorial preference ordering remain distinct.
- Full `npm run verify` passed after integration: build, live inspiration and
  compatibility engine checks, API validation, state/export, bilingual catalog,
  dashboard, frozen-source reproducibility and recipe arithmetic. Regression
  checks cover 348 recipe avoid contexts, 68 localized source-identity cases,
  82 recipe comparison cases and 80 nutrient-panel cases. These counts describe
  checks, not clinical validation or user-research outcomes.
- New blank profiles no longer invent height/weight measurements. Existing
  explicitly stored measurements and the separate sample profile are retained;
  body measurements do not rank live meal choices.
- Browser validation used `localhost:5173`, separate from the user's
  `127.0.0.1:5173` storage. Confirmed: less-added-oil changes the selected recipe;
  a large portion recalculates primary and comparison values; save plan →
  confirm eaten → edit an ingredient → export retains the four untouched IDs,
  removes the edited ingredient ID and preserves the large-portion gram values.
- Warm plus 10-minute constraints left only the documented eligible recipe.
  Switching to ideas produced an honest empty result because preparation times
  are unknown; removing the time limit restored ideas and explained that added
  oil cannot be compared there. No relaxed exclusions filled empty slots.
- Reviewed English and Traditional Chinese at desktop and 320/390px mobile
  widths. Comparison values share a baseline; mobile cards stack and have no
  horizontal document overflow. No browser warnings/errors were captured.
  Screenshots: `.audit-tmp/credibility-desktop-zh.png` and
  `.audit-tmp/credibility-mobile-zh.png` (ignored local verification artifacts).
- Final CSS refinement was browser-checked and the production build rerun.
  Historical exhaustive catalog reachability was not rerun: the live picker
  has dedicated directional/identity/constraint regressions, while legacy
  scorers remain compatibility code outside the app's selection path.
- No commit, push, deployment, clinical review, restaurant measurement or
  individualized energy/fullness claim was performed or asserted.

# Low-maintenance launch beta

Status: review
User authorization: 2026-11-03, steps 1–12, on a new branch.
Branch: `codex/launch-beta`
Base: `1e5306a95501ed767d32c878b115caae1fdc8f0b`

## Scope and acceptance

1. Curated-template positioning; no inferred source-confidence badge or
   unrecorded-intake deficiency claim.
2. Hard eligibility shared across meals and retained drinks. No compatible
   candidates has its own recoverable state; restrictions stay enforced.
3. Visible today log with edit, delete, explicit add/replace, no silent overwrite.
4. Isolated, visibly labeled demo; edits and plans never change real records.
5. Compact bilingual hero with a primary start action visible at phone width.
6. Own-input no-key flow with food quick choices and editable meal context.
   Optional BYOK retains same-origin no-store relay and memory-only credentials.
7. Meal, plain reasons and next action first; detailed ranking receipt collapsed.
8. Three comparable options and immediate, announced context recalculation.
9. Persistent local plans separate from consumed meals; explicit confirmation
   before a plan is added to the food log; conservative static action tips.
10. English and Traditional Chinese core tasks, errors and recovery, mobile,
    keyboard, and reduced-motion support.
11. Local PNG export with public meal content only, never records or preferences.
12. Plain data explanation, app-only clear-all, versioned JSON export, feedback.

## Boundaries

- Keep React/Vite and the current local catalog; no new runtime dependencies.
- No account, cloud sync, hosted AI credits, payments, live restaurant sources,
  nutrition import, telemetry, user research, launch media campaign, or deployment.
- Existing saved records must migrate without silent loss. Unknown amounts and
  differing meal context must remain explicitly unspecified/uncertain.
- Custom recipe variability remains disclosed. The app is not an allergy
  certification or an individual nutrition assessment.
- A saved plan is intent, not a consumed meal. Demo storage is entirely separate.
- Credentials never enter storage, export, share cards, logs or screenshots.

## Verification and handoff

- Build, product, engine, API and launch-state verification.
- Regression checks for soy/almond drinks, wheat omission, missing input,
  coherent fixture dates, storage migration and failure, merging, plan persistence,
  and scoped deletion.
- Browser checks for English/Chinese at desktop and 390px phone width, no-key
  own meal, editable confirmation, today add/replace/delete, isolated demo,
  context comparison, save/reload/consume, JSON/PNG and data controls.
- Do not use real API credentials or send real personal food records.
- Record exact commands, results, limitations and changed files. Mark `review`
  only after verification; do not mark merged/complete before actual acceptance.

## Handoff evidence

Implemented steps 1–12 on the authorized branch. All twelve acceptance areas
are implemented; review status does not imply user acceptance, merge or deployment.

### Automated verification

`npm run verify` passed in the local Windows environment (Node 22.21.0):

- TypeScript and Vite production build;
- product catalog and replayable recommendation receipts;
- engine: three original launch safety regressions, nine named drink ingredient
  cases, 2,900 drink/avoid contexts, 1,500 Chinese explanation contexts, matched
  English/Chinese input results, other-only foods, time boundaries and history;
- mocked API/client: unknown source and portion, runtime shape validation,
  refusal/incomplete output, 401/429/other errors, timeout/network recovery,
  safe localized errors, header-only credentials and no-store;
- storage migration, malformed/unavailable storage, scoped deletion,
  amount-preserving merges, mixed-context unknowns, other-only foods, bounded
  unique plan persistence and credential-free JSON;
- presentation: 100 translated meals, 219 canonical display labels, 15 actual
  trace labels, named components and preservation of unknown user free text.

CI now includes the launch-state and bilingual presentation checks alongside
the existing build, product, engine and API checks. No scheduled workflow state
was changed. No runtime dependency was added.

### Browser evidence

Local Chromium-based in-app browser, desktop 1365×900 and phone-sized 390×844:

- English and Traditional Chinese input, confirmation, result, contextual
  recalculation and saved plans;
- adding tea to a recorded lunch retained the chicken and rice;
- reload retained the real records, context and saved plan;
- example mode had separate meals and plans; exporting during example mode
  exported the real chicken/rice/tea records and real plan, without a key;
- marking a saved plan eaten opened editable named components and only moved
  it into the dinner log after confirmation;
- all 29 avoids remained active together (95 excluded, five compatible meals);
- prior-day breakfast backfill and deletion affected the chosen past day only;
- native confirmation dialogs initially focused Cancel/Keep, Escape dismissed,
  and focus returned to the opening button;
- clear-all followed by reload produced blank real records/plans and default
  language; only agent-generated synthetic local test records were cleared;
- real JSON and Chinese 1200×900 PNG downloads were inspected;
- final fresh load had no console warnings/errors; phone document width matched
  its viewport and the primary start action appeared within the first screen.

Local ignored artifacts: `output/playwright/launch-beta/desktop-en.png`,
`desktop-zh.png`, `mobile-zh.png`, and `meal-card-zh.png`.

### Limits and remaining boundaries

- No real provider request, credential, paid AI usage, public feedback submission,
  user study, physical phone test, Firefox/WebKit check, or deployment occurred.
- Optional AI was checked with mocks; local Vite preview serves the free core,
  while the same-origin API route is verified in-process for later Vercel use.
- The no-compatible-options UI is present, but the actual fixed catalog still
  contains five compatible templates with every supported avoid selected; no
  impossible empty result was forced through browser internals.
- Full catalog/drink reachability sweeps were not rerun. Targeted safety,
  matching, history and data checks passed; this release makes no universal
  reachability or record-level nutrition evidence claim.
- Nutrition research remains deferred. Steps 13–14 (user study and launch
  campaign assets) are outside this implementation authorization.

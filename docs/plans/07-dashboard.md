# Dashboard iteration

Status: review
User authorization: 2026-11-03–2026-11-04, 「好，改改看」 after the dashboard
proposal and its product/data boundaries were reviewed.
Branch: `codex/launch-beta`
Base: `730b5632222d5b303a72785c7be5b4dd25348cb7`
Underlying release: [`06-launch-beta.md`](./06-launch-beta.md), still `review`.

## Outcome

Make the existing low-maintenance meal-choice beta easier to use and inspect
without requiring visitors to work through a long page. Preserve the main job:
record a meal, understand the next-meal suggestion, and save a useful idea.
The dashboard is a task layout, not a nutrition-monitoring product.

The release supports a Product Hunt launch and a product-design case study.
This iteration does not establish usability-study results, Product Hunt votes,
featured status, improved health, or nutrition validation.

## Scope and acceptance

1. Task navigation: Today, Records, Plans and Library, with English and
   Traditional Chinese labels. Each view has a clear active state and avoids
   repeating the old long-page sections.
2. Today: compact context controls and today's records alongside the main
   recommendation on desktop. At phone width, place the result before
   secondary context/record panels. Keep recording and editing easy to find.
3. Native drawers for the meal editor, preferences, and data/method controls.
   Keyboard focus stays within an open drawer; Escape closes it; closing
   restores focus appropriately. A closed editor retains an unfinished draft
   and offers a clear way to resume it. Saving or cancelling has explicit
   behavior, rather than closing silently committing the draft.
4. Use a restrained gray, white and green visual system, squared surfaces,
   clear typography and purposeful spacing. Remove decorative illustration,
   gradients and excess card/label treatment. Compact layout must preserve
   readable form text, keyboard focus and usable phone touch targets.
5. Show a clearly labeled, automatic example when there are no real recorded
   meals or saved plans. Its meals and plans remain isolated from real data.
   Real saved food preferences and avoids apply to the example; changes made
   in the permanent preference controls persist to the real profile and also
   apply while viewing the example. Make this distinction visible. Starting
   the user's own input leaves example mode without copying sample records.
6. Records: a seven-day by four-meal-slot grid distinguishes recorded and
   unknown slots. Unknown does not mean skipped. Selecting a slot opens its
   exact date and meal for review or backfill; an existing entry loads its
   actual contents. Keep explicit append/replace, confirmation and deletion.
7. Collapse the scoring explanation by default. Signed contribution bars
   describe the visible product-rule points and retain readable text values.
   Explain the later perspective, rotation, format and near-tie steps. Totals
   from differently weighted perspectives are not comparable health scores.
8. Plans remain saved intent until the user reviews and confirms actual
   consumed food. Library search remains available in both languages. Keep
   the existing local meal-card download, JSON export, feedback and data tools.

## Boundaries

- Preserve the deterministic eligibility/ranking rules and current catalog.
  This iteration changes presentation and navigation, not scoring weights or
  hard-avoid decisions.
- Preserve local storage migration, the rolling calendar window, real versus
  example record isolation, amount/context uncertainty, and bounded plans.
- Export real user data even while an example is visible; do not introduce
  credentials or example records into JSON or public meal-card content.
- Preserve optional BYOK, memory-only credentials, same-origin relay,
  `store: false`, no-store behavior and existing input/error protections.
- Keep no-key manual entry as the main flow. Unknown source, portion or amount
  remains unspecified until the user supplies it.
- Charts describe recording coverage and rule contributions. Do not add
  nutrient-intake charts, health gauges, adequacy targets, inferred skipped
  meals, or clinical/allergy-certification claims.
- No new dependencies, accounts, hosted AI allowance, payments, telemetry,
  nutrition imports, live restaurant feeds, public launch campaign or deployment.
- The nutrition program remains deferred. The launch-beta `review` status
  remains separate from this iteration's status.

## Verification gate

Before changing this plan to `review`:

- Run the full `npm run verify` against the final current tree, including
  build, product, engine, API, launch-state, presentation and dashboard checks.
- Verify English and Traditional Chinese task views at desktop and phone
  widths, including result-first phone ordering and no page overflow.
- Check first-run example labeling, permanent preference persistence while
  viewing an example, real/example records and plans, and real-data export.
- Check record/review/save, draft close/resume, drawer Escape/focus restoration,
  alternatives and saved plans, and actual-consumption confirmation.
- Verify exact date/slot mapping for all meal types in component checks. In the
  browser, select representative recorded and unknown slots, check loaded
  contents and backfill, and retain the launch beta's scoped deletion checks.
- Check calendar/time-window rollover without moving or dropping prior data.
- Check collapsed explanations, signed values and per-perspective score
  boundaries; keep unknown data distinct from recorded absence.
- Inspect relevant console errors and state the browser/device coverage and
  any limits. Use synthetic records and no real API credentials.

## Final handoff

Implementation is ready for review. Review does not mean user acceptance,
merge, push or deployment; the underlying launch beta also remains `review`.

### Automated verification

`npm run verify` passed against the final source tree. Its new
`verify:dashboard` command is also included in CI. Dashboard checks cover:

- 28 chronological date/meal cells per language, with 56 exact selection
  callbacks across English and Traditional Chinese;
- named `other` food versus metadata-only unknown state;
- 24 actual rule rows across both languages, including signed and all-zero
  values, explanatory notes, and exclusion of perspective-total sentinels
  from the rule-contribution bars.

Existing build, product, engine, API, launch-state and presentation checks also
passed. Source review corrected optional-AI editing targets and permanent
preferences while viewing the example. No runtime dependency was added.

### Browser verification

Local in-app Chromium at 1365×900, 390×844 and 320×740:

- English/Traditional Chinese task views, automatic labeled example, two main
  context selectors, and phone result-first ordering worked. The primary
  action was visible within the 844px phone screen; no document overflow was
  observed. At 390px the 640px history table uses its own horizontal scroll.
- The desktop page measured about 1,135px high. An earlier layout measured
  about 2,827px at a different viewport width; this is evidence of a more
  compact layout, not a controlled percentage comparison.
- A temporary Dairy avoid applied during the example, survived example exit
  and reload in the real profile, and was reverted after the check. Example
  records/plans stayed separate. Final UI inspection showed blank real records;
  no final clear-all was performed during this iteration.
- Own Chicken/Rice Lunch saved. November 3 to November 4 calendar rollover
  retained it on the prior date. November 2 Breakfast backfill targeted that
  exact slot with Egg.
- An alternative saved as a plan, opened an editable Dinner draft when marked
  eaten, and left Plans only after confirmation.
- Drawer close/resume retained the draft and restored focus. Escape from a
  nested clear confirmation returned focus to its data opener; final clear
  was not executed in this iteration.
- Library search for tofu returned 17 results. The receipt was collapsed by
  default and exposed 12 rule-contribution bars when opened.
- A final fresh reload produced no console warnings or errors.

Confirmed local screenshots: `output/playwright/dashboard/desktop-zh.png`,
`mobile-en.png`, `mobile-zh.png`, `records-zh.png`, and `score-zh.png`.

### Limits

- JSON/PNG helpers were unchanged and existing automated checks passed.
  Downloads were not repeated for this iteration; their inspected-download
  evidence remains in `06-launch-beta.md`.
- No real provider request, user study, physical phone, Firefox/WebKit check,
  public launch, push or deployment occurred. Browser viewport checks do not
  establish cross-browser accessibility or real-device coverage.
- Nutrition research remains deferred. No Product Hunt traction, featured
  status, health outcome or user-study result is claimed.

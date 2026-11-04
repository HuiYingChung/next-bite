# Published-model scoring for the twelve recipes

Status: review
Authorized: 2026-11-04. The user requested nutrient, calorie and preference
components, summed to select the top three, and explicitly chose to complete
the source data and use a published nutrient profiling model without counting
energy twice.
Branch: `codex/nutrition-pilot`
Base: `edf903c` (the existing authorized working changes are preserved).

## Scope and decisions

- Use the published UK Nutrient Profiling Model 2018 per 100 g, including its
  thresholds and full-A protein gate. Its scope is food composition, not an
  individual's adequacy or a ranking of nutrient essentiality. The model is
  published reference guidance, not currently applied UK policy.
- Separate the same model algebra into nutrient contribution `credited C -
  saturated-fat A - free-sugar A - salt A` and energy contribution `10 - energy
  A`. Together these equal `10 - official NPM`. The constant ten changes the
  display direction, not order; energy is counted once.
- Add a bounded, explicitly product-defined preference bonus. Show the actual
  total and contributions; preserve the original model score in details.
  Select the highest three totals. Variety may only resolve exact total ties.
- Complete required inputs using immutable USDA source snapshots and explicit
  ingredient classifications. Unknown data never becomes a favorable zero.
  Replace unresolved ingredients with clearly named, versioned formulations
  rather than silently copying nutrient values from a different food.
- Keep source-added-sugar unknowns separate from derived free-sugar values.
  NPM does not assess every vitamin/mineral; do not claim it does.
- Keep whole-portion nutrition separate from per-100-g scoring. Portion choice
  changes the estimated amount, not the composition score. Energy bands may
  tie; lower energy density is not a guarantee of a lower-energy whole meal.
- Retain strict avoids, local data/plan versioning, the separate unscored
  100-idea catalog, compact numeric UI, and collapsed calculation details.
- No runtime data service, new provider integration, deployment or push.

This authorization supersedes the no-score selection policy from the prior
credibility correction in plan 08. It does not authorize the deferred broader
nutrition program or clinical/special-population recommendations.

## Verification gate

Check every threshold boundary, the protein gate, published worked examples,
source hashes, required-data completeness, unknown propagation, algebraic
energy separation, portion invariance, preference weights, top-three ordering
and hard exclusions. Run the complete existing verification suite. Review the
English/Traditional Chinese interface at desktop and narrow phone widths,
including changed preferences, portions, expanded calculations and empty
states. Record actual results below before changing status to review.

## Handoff evidence

- Implemented exact UK NPM 2018 boundaries, full-A protein gating and separate
  nutrient/energy/preference contributions. The bounded preference sum is
  visible; all eligible candidate totals are retained in the trace. Only exact
  total ties use named-food variety. The actual three highest totals are shown.
- Both immutable source archives verify. Eighteen retained records (sixteen
  currently used) support twelve complete model profiles. Added-sugar unknowns
  remain unknown; free sugars are separately derived under explicit recipe
  ingredient requirements. Three tofu formulations became named edamame
  formulations and one shrimp formulation uses the complete 171971 record;
  all four changed formulations are version 2.
- `npm run verify` passed: production build, product/engine/API mocks, storage,
  bilingual presentation/dashboard and nutrition/model verification. Model
  checks include 174 strict boundaries, three official worked examples, full-A
  gating, independently recalculated totals for all twelve recipes under four
  preference contexts, actual top-three totals, energy-once algebra, required
  unknown exclusions, mixed raw/cooked FVNS rejection and portion invariance.
- Source checks compare 162 nullable source fields and 348 hard-avoid contexts.
  Local-state checks cover 72 localized active/retired source-identity cases.
  UI tests cover 88 score panels, eight unavailable-score cases, 88 alternate
  comparisons and 86 whole-portion nutrition panels. No real provider call was
  made by these tests.
- Independent model/data review identified a runtime mixed-FVNS-state gap
  beyond the importer's existing check. It was corrected and the exact
  counterexample now fails closed. No remaining concrete defect was found in
  that review.
- In-app Chromium checked English and Traditional Chinese, desktop 1365 px
  and phone widths 390/320 px, collapsed and expanded calculation details.
  Selecting rice raised the bean bowl from 20 to 22 and moved it first. A large
  portion changed 451 to 563 kcal while retaining 22 points. Warm-only plus
  ten-minute assembly retained the single qualifying recipe. Combining a
  large portion with large-portion avoidance showed no compatible recipe.
- A version-2 edamame plan survived reload with its standard portion and
  opened an editable review containing the actual edamame, kale, quinoa, oil
  and salt amounts. It was not recorded as eaten during this check. QA used
  `localhost`, separate from the user's `127.0.0.1` storage origin.
- Corrected stale preference-tier wording and an eight-pixel overflow at the
  narrowest viewport. Final production build passed after these presentation
  corrections. The browser reported no warnings/errors on the final preview.
  Both phone widths have document scroll width equal to client width; the
  detailed model table scrolls within its own keyboard-focusable region.
- Final screenshots are ignored local artifacts:
  `.audit-tmp/published-score-desktop-zh.png`,
  `.audit-tmp/published-score-mobile-zh.png`, and
  `.audit-tmp/published-score-receipt-zh.png`.

Review status does not mean user acceptance, clinical validation, merge or
deployment. No commit, push, public deployment, paid AI integration or runtime
nutrition request was added. No physical-device or cross-browser validation is
claimed. The separate 100-idea path remains unscored inspiration.

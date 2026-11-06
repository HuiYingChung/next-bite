# Expand detailed recipes from 60 to 72

Status: review
Authorized: 2026-11-06. Continue `codex/recipes-24` at base
`09471f18f6612067fc734746607200413904c225`; preserve all prior uncommitted work.

## Scope

Add twelve distinct detailed formulations from the existing 100 meal ideas.
Use exact reviewed sources, explicit edible weights and preparation states,
version `mealhatch-recipes72-2026-11-06-v1` and bilingual preparation steps.
Pin any new official source records with original bytes and retrieval hashes.

Preserve all prior 60 raw/generated recipes, 58 source definitions, assessments
and generated foods. Baseline: `.audit-tmp/recipes72-baseline/`. Keep thresholds,
product weights, top-three selection, history ties and conservative exclusions.

Support puréed chickpeas only through an explicit recipe preparation marker:
the importer derives free sugars from the exact archived total-sugar field,
following UK NPM 2018 worked example 8. This is a recipe-specific processing
interpretation, not a global alteration of the whole-chickpea source. Display
its explanation and provenance beside the affected ingredient. Unknown inputs
must remain incomplete; arbitrary numeric overrides are not accepted.

Retain static local data and existing dependencies. No private key, live AI,
account, backend, commit, push, merge or deployment is included.

## Verification

Compare the complete preceding data against the baseline; verify every source
hash and model input. Independently calculate all 72 recipes and three portions,
including intact versus puréed chickpea sugar handling, malformed processing
inputs, total/ranking invariance of old recipes and all hard exclusions/history.
Check every bilingual detail, selected-portion persistence, narrow layouts,
keyboard focus, excluded inspection and visible preparation provenance.
Run the complete repository suite and visually inspect new recipe screenshots.

## Evidence

- Added twelve distinct formulations: chicken/hummus/apple bread plate;
  Greek-yogurt/puffed-rice/strawberry bowl; chicken/Parmesan/romaine bread plate;
  black-bean/Monterey bread plate; white-bean/mozzarella/vegetable bread plate;
  chicken/avocado/romaine sandwich; garlic-yogurt chicken rice; hummus/cooked
  vegetables/bread; pork/shiitake wholewheat noodle soup; egg/cucumber/tomato
  pasta salad; edamame/shiitake/spinach noodle soup; honey/raw-garlic salmon rice.
  Each has four bilingual, portion-aware steps. Their ingredient-ID sets do
  not duplicate previous formulations. Regular portions span approximately
  354–594 g and 344–573 kcal; these are authored choices, not dietary targets.
- Added nine full official USDA records. Archive size: 243,184 bytes; SHA-256
  `33ddf9a629c02d12931965a4b39bac3b5b3dfdc24ec0c45b9ed5e7450ea366e2`;
  retrieved `2026-11-06T20:29:06.6574389Z`. All seven source hashes passed.
  There are 67 retained sources and 64 active sources. All 67 added-sugar
  fields remain unknown. No private credential was used.
- Two hummus formulations derive recipe-specific free sugars from cooked
  chickpea FDC 173757's actual 4.8 g total sugar/100 g, following the official
  hummus worked example. Their standard-portion chickpea contributions are
  3.84 g and 6.24 g. The importer accepts only the reviewed source/state and
  generates the preparation metadata; handwritten numeric overrides and
  missing/invalid source sugar fail. Missing or malformed runtime preparation
  metadata excludes scoring. The visible source receipt contains a scaled
  contribution, bilingual explanation and official links. Thresholds,
  preference weights, FVNS weighting and physical source nutrients are unchanged.
- The toasted-sesame cooked-state exception matches its exact ID/description.
  Boiled apple 173928 retains its full contradictory title and raw FoodOn
  mapping in the archive; the reviewed final state is cooked/boiled, with
  explicit notes and a guard rejecting raw/ready-to-eat definitions. The
  QUAKER cereal is clearly a historical source estimate. Incomplete soba and
  unspecified tortilla formulations are not used to manufacture model inputs.
- The preceding 60 raw/generated recipes and 58 food definitions, assessments
  and generated foods are unchanged against `.audit-tmp/recipes72-baseline/`.
  Global model provenance, library metadata/concepts and 15,438 nutrition
  records are unchanged; nine localized recipe aliases were added. Evidence:
  `.audit-tmp/recipes72-preservation.log`.
  Independent baseline checks also passed 1,620 whole-portion nutrient values,
  420 per-100-g model inputs and 120 literal-threshold/preference totals for
  the prior recipes. Source identity persistence passed 268 round-trips;
  history passed 24 ranking and 16 calendar checks.
- Calculation checks passed 603 archived nutrient fields, 216 portion sums,
  2,088 hard-avoid contexts, 174 model boundaries, three official worked
  examples and independently recomputed totals/top-three order. Dedicated
  purée tests cover intact versus puréed inputs, proportionate contributions,
  unchanged physical nutrients/FVNS, malformed evidence and candidate exclusion.
- Real Chromium verification passed 144 bilingual details, 432 portion
  changes, 916 exact ingredient-label checks and 12 preparation contribution
  cases. The 72nd-ranked recipe saves/reloads with its exact version and large
  portion. Excluded recipes remain inspectable and cannot be selected. Keyboard
  focus and 320/390/768/1280 px layouts passed with zero page errors. Dashboard
  checks covered 448 score panels, 446 nutrition panels and 2,822 source links.
  Root visually reviewed Chinese desktop library, Chinese mobile preparation
  evidence and English steps. Screenshots: `output/playwright/recipes72/`.
- A final scoped CSS rule keeps the preparation value and unit together.
  Both languages and all four widths passed again; refreshed preparation
  screenshots and JSON results are in the same directory. `npm run verify`
  passed the full build, product/engine, API/AI mocks, local routes, launch,
  presentation/dashboard, nutrition/model, food-library, records, history and
  weekly checks. The production build passed again after that CSS change.
  Logs: `.audit-tmp/recipes72-verify.log` and `recipes72-final-build.log`.
  `git diff --check` passed. The existing large-bundle warning remains.

## Retained limitations

All inherited conservative catalog exclusions remain in force, including
unknown packaged-bread/cereal declarations. Catalog IDs describe original
ideas; visible names and ingredients describe the actual reviewed recipes.
Bread and pasta variants are not marketed as measured tortillas, quesadillas,
udon or soba. This expansion does not relax the earlier exclusion gate.

Source/model completeness supports reproducible recipe estimates, not personal
adequacy, measured intake or clinical validation. The purée rule is deliberately
limited to the reviewed cooked chickpea source; other preparation changes need
their own review. No real AI provider, commit, push, merge or deployment was used.

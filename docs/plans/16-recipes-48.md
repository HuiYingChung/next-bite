# Expand detailed recipes from 36 to 48

Status: review
Authorized: 2026-11-06. Continue `codex/recipes-24`; preserve the prior
uncommitted implementation. The branch name records its initial scope.

## Scope

Add twelve distinct detailed formulations from the existing 100 meal ideas.
Prefer meaningful meal and ingredient variety using verified source records;
acquire additional full official records only when needed for a suitable
formulation. Record any new source's retrieval, original bytes and hash.

Preserve all previous 36 recipes, versions, weights, 49 source definitions and
model assessments. A local baseline is stored in `.audit-tmp/recipes48-baseline/`.
Do not change model thresholds, preference weights, top-three selection,
seven-day tie-break rules or conservative ingredient exclusions.

New formulations use `mealhatch-recipes48-2026-11-06-v1`. Match exact ingredient
identity and preparation state, explicit edible grams and seasoning totals.
Every scored ingredient needs complete reviewed model inputs; an unresolved
value remains unknown. Supply bilingual portion-aware preparation steps.

Keep static data, existing dependencies and the existing library flow. No
private key, live AI request, account, backend, commit, push, merge or
deployment is included in this request.

## Verification

Compare prior data against the captured 36-recipe baseline. Validate source
hashes, nutrient fields and model classifications. Independently calculate
all 48 recipes, three portions, top-three scores, hard exclusions and history
ties. Verify all details and selected-portion persistence in English and
Traditional Chinese, narrow layouts, keyboard focus and excluded inspection.
Run the complete repository suite and review final browser screenshots.

## Evidence

- Added twelve distinct formulations: chicken/sweetcorn/green beans,
  chicken/rice/lemon salad, beef/egg/vegetable rice, turkey/two-bean/tomato
  rice, avocado/egg/bread with potato soup, turkey/avocado sandwich with
  potato soup, beef/tomato/napa noodle soup, salmon/chickpea vegetables,
  turkey/bok-choy/mushroom rice, bitter-melon/egg rice, cooked-salmon/avocado
  rice and chicken/black-bean/sweetcorn rice. Each has four bilingual,
  portion-aware preparation steps.
- Added four full official USDA records: 171705 avocado, 169999 cooked
  sweetcorn, 169141 cooked green snap beans and 168394 cooked bitter-gourd
  fruit. Snapshot: 124,782 bytes; SHA-256
  `40b0cc6c7df114918446a0ea0dd0ceb0e67076e91b45524866ca4f6e5651c790`;
  retrieved 2026-11-06T18:02:06.2504411Z. All five archive hashes verified.
  There are 53 retained foods, 50 active foods and 48 model-complete recipes.
  All 53 source added-sugar values remain unknown.
- Bitter-gourd FVNS is explicitly documented as an inference from the model's
  other-gourds category. NParks supplies the common/scientific name mapping;
  Kew confirms the plant family. These citations are local to that assessment
  and do not change earlier foods' provenance. Whole sweetcorn, avocado and
  green beans are named in the model's definitions.
- Previous 36 raw and generated recipes, 49 definitions, 49 assessments and
  generated source foods are unchanged against the captured baseline. Only
  four localized aliases changed in the food-library records; all 15,438
  records' other fields, concept definitions and source metadata are unchanged.
- Independent checks passed 477 pinned nutrient fields, 144 portion
  calculations, 1,392 avoidance contexts (including Bitter melon), 174 model
  boundaries, three published examples and all 48 scores under six preference
  contexts. Source identity now verifies every use in every recipe. All 212
  localized identity round trips, 24 top-three history contexts and 16 calendar
  checks passed.
- Real Chromium checks passed 96 bilingual recipe details, 288 portion
  changes and 576 ingredient labels. The 48th-ranked choice saves with its
  exact version/large portion after reload. Excluded recipes remain viewable
  and cannot be selected. Keyboard focus and 320/390/768/1280 px layouts passed;
  all 48 were opened at phone width with no page errors or observed overflow.
- Final copy review clarified restoring potato-and-water mass before adding
  oil/salt, corrected the Chinese noodle-soup title, and separated USDA common
  names from botanical evidence. The final 96 titles and both soup steps were
  rechecked in the browser. Root visually inspected the final desktop library,
  new beef-noodle mobile detail and English soup-preparation view. Screenshots
  are ignored local artifacts under `output/playwright/recipes48/`.
- Final `npm run verify` passed: production build, product/engine, API and AI
  mocks, local routes, state/presentation/dashboard, nutrition/model, food
  library, records, history and weekly summary. `git diff --check` passed.
  The existing large-bundle warning remains.

Existing conservative catalog exclusions, including the earlier oats/soy
over-exclusion, remain unchanged. No new exception bypass or ranking bonus was
introduced. Source and model completeness describe reproducible estimates,
not measured intake or individual nutritional adequacy. No private key, real
AI provider, commit, push, merge or deployment was used in this iteration.

# Expand detailed recipes from 72 to 84

Status: review
Authorized: 2026-11-06. Continue `codex/recipes-24`; preserve all prior
uncommitted work. Base remains `09471f18f6612067fc734746607200413904c225`.

## Scope

Add twelve distinct, practical formulations from the existing 100 meal ideas.
Name the actual sourced formulation, with explicit edible weights, preparation
states and four bilingual, portion-aware steps. New recipe version:
`mealhatch-recipes84-2026-11-06-v1`. Prefer reviewed ingredients; archive any new
official sources with original bytes, retrieval metadata and verified hashes.
Unresolved ingredients or processing assumptions cannot be filled with zeros.

Preserve all prior 72 raw/generated recipes, 67 source foods/assessments and
existing model provenance, as captured in `.audit-tmp/recipes84-baseline/`.
Keep scoring thresholds, product weights, exact-tie history, hard exclusions,
existing processing support, saved versions and portion factors unchanged.
Retain the local static architecture and existing dependencies.
No private key, live AI, account, commit, push, merge or deployment is included.

## Verification

Check exact source identities/units/states, all hashes, full model inputs,
distinct core ingredient sets, preparation steps and seasoning reconciliation.
Independently recalculate all 84 recipes at all three portions and preserve
the previous 72 recipes' source nutrients and model scores. Verify top-three
ordering, exclusions, food identity persistence and seven-day history.

Review 168 bilingual details and 504 portion changes in a real browser, plus
below-top-three save/reload, excluded inspection, keyboard focus, preparation
receipts and 320/390/768/1280 px layouts. Inspect representative screenshots.
Run the full repository verification and document evidence before review status.

## Evidence

- Added twelve distinct formulations: whole-soybean/cauliflower/leek soup with
  rice; white-bean/shiitake/turnip porridge; egg/soybean/pea porridge;
  edamame/bok-choy/celery soup with rice; white-bean/spinach/leek/sesame bowl;
  chickpea/broccoli/cauliflower wholewheat noodles; spicy pork/soybean/eggplant
  rice; spicy edamame/cabbage/carrot rice; spicy chicken/cabbage/sweet potato;
  chunky chicken/potato/pea/cauliflower stew; salmon/leek/pea porridge; and
  cod/pea/turnip rice. All have four bilingual, portion-aware steps and distinct
  core ingredient sets. Regular portions span approximately 398–636 g and
  380–534 kcal; these are authored choices, not dietary targets.
- Added eight complete official USDA records. Original archive: 191,241 bytes;
  SHA-256 `d095d6f5797d8a502a44a501045db2deeccfd830cbf352ba2f032a95b5730970`;
  retrieved `2026-11-06T20:43:14.8815644Z`. All eight archive hashes passed.
  There are 75 retained sources and 72 active sources. All 75 added-sugar
  fields remain unknown. No private credential was used.
- Seven new cooked whole-bean/vegetable sources have explicit source identities,
  preparation states and FVNS classifications. Mature soybeans are not tofu
  or edamame. Cayenne is a declared plain finely-ground dry-spice input; the
  USDA title itself does not establish grinding. Its original physical nutrient
  values remain unchanged. Under the cited UK powder rules, its actual
  10.34 g total sugars/100 g becomes derived free sugars and FVNS is false.
  This source/input interpretation is explicit, not a claim of a powder-specific
  USDA assay or a rule for pods/flakes/blends. Each of the three spicy recipes
  uses 0.3 g powder: 0.03102 g free sugars per standard portion. Existing
  thresholds, processing schema and ranking code are unchanged.
- All previous 72 raw/generated recipes, 67 food definitions/assessments and
  generated foods, and global model provenance are preserved. All 15,438
  food-library records and metadata/concepts are unchanged; exactly eight
  localized source aliases were added. Independent baseline checks passed
  1,944 portion nutrient values, 504 per-100-g inputs and 144 literal-threshold
  totals, including the two existing chickpea-purée interpretations.
  Evidence: `.audit-tmp/recipes84-preservation.log`.
- Calculation checks passed 675 archived nutrient fields, 252 portion sums,
  2,436 avoidance cases, 174 model boundaries and three official worked examples.
  Independent top-three ordering, all eligible recipes, uniform-scaling
  invariance, direct Soy/Eggplant/Celery/Spicy food exclusions and 300 localized
  source-identity round-trips passed. History passed 24 ranking contexts and
  16 calendar checks. Unknowns and malformed processing evidence still fail
  closed, with no fallback zero or changed recipe score.
- Real Chromium verification passed 168 bilingual details and exact instruction
  lists, 504 portion changes, 1,080 exact ingredient labels and 12 existing
  preparation-specific checks. All visible notes match generated data.
  The 84th-ranked recipe saves/reloads with the correct version and portion;
  excluded choices remain inspectable and cannot be selected. Keyboard focus,
  320/390/768/1280 px layouts and zero page errors passed. Dashboard checks
  covered 520 score panels, 518 nutrition panels and 3,322 source links.
  Root visually reviewed the Chinese desktop library and new stew's Chinese
  mobile details and English steps. No UI/CSS changes were needed.
  Evidence: `output/playwright/recipes84/browser-verification.json` and
  screenshots in the same directory.
- `npm run verify` passed the production build, product/engine, API/AI mocks,
  local routes, launch/presentation/dashboard, nutrition/model, food-library,
  records, history and weekly-summary checks. Log:
  `.audit-tmp/recipes84-verify.log`. `git diff --check` passed. The existing
  large-bundle warning remains. README and source/provenance documentation
  reflect 84 recipes while preserving historical archive/version descriptions.

## Retained limitations

The conservative catalog gate remains. Five soy-free formulations still inherit
Soy exclusions from their original tofu/miso ideas: white-bean porridge,
white-bean spinach bowl, chickpea noodles, salmon porridge and cod plate.
Other inherited possibilities include Raw food for the pork bowl, seafood for
the edamame/cabbage bowl, and dairy/soy/wheat/spice/raw/large-portion constraints
for the chicken stew. These describe retained catalog constraints, not the
current ingredient lists. No avoidance gate was relaxed in this expansion.

All values remain reproducible recipe estimates, not measured intake or personal
adequacy. Exact source and preparation assumptions remain visible. No live AI
provider, commit, push, merge or deployment was used.

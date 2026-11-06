# Expand detailed recipes from 84 to 96

Status: review
Authorized: 2026-11-06. Continue `codex/recipes-24`; preserve all preceding
uncommitted work. Base remains `09471f18f6612067fc734746607200413904c225`.

## Scope

Add twelve distinct practical formulations from the remaining catalog ideas.
Keep the 100-idea collection unchanged and name actual sourced ingredients,
with edible grams, exact preparation states and four bilingual steps. New
recipe version: `mealhatch-recipes96-2026-11-06-v1`. Prefer already reviewed
foods; archive any necessary new official source records with exact bytes,
IDs, retrieval metadata and hashes. Unsupported composition stays unknown.

Preserve the preceding 84 raw/generated recipes, 75 source definitions and
assessments, generated foods and global model provenance against
`.audit-tmp/recipes96-baseline/`. Keep the model, product weights, processing
rules, portion factors, saved versions, history ties and hard exclusions.
No new dependencies, backend, credentials or live AI calls. No commit, push,
merge or deployment is included.

## Verification

Review source completeness, matching identity/state/units, all hashes and
recipe model inputs. Check distinct core ingredient sets, oil/salt/sauce
reconciliation, retained liquid and bilingual preparation instructions.
Independently calculate all 96 recipes and three portions, top-three totals,
exclusions, source identity and seven-day history. Preserve prior84 source
values, per-100-g model inputs and scores, including existing purée/powder cases.

Run the repository suite and isolated browser checks for 192 bilingual detail,
note and instruction views, 576 portion changes, below-top-three save/reload,
exclusion handling, keyboard focus and 320/390/768/1280 px layouts. Visually
inspect new recipe screenshots and record evidence before review status.

## Implementation and data evidence

- Added twelve distinct formulations with four bilingual steps each: whole-
  soybean/zucchini/green-bean soup with rice; egg/spinach/corn noodle soup;
  garlic chicken/soybean/cabbage rice; white-bean/shiitake/leek noodle soup;
  egg/corn/celery soup with bread; scallion/egg/tomato/cucumber rice;
  lentil/carrot/pepper cold noodles; chicken/turnip/leek rice soup;
  chicken/cauliflower/pea noodle soup; sesame-garlic chicken/shiitake/green-bean
  rice; spicy shrimp/soybean/napa soup with rice; and soybean/cabbage/shiitake
  rice. Regular portions are 456.5–625.5 g and 394.32–528.47 kcal, including all
  listed liquid/seasoning. These are authored recipe choices, not dietary targets.
- Added only USDA FDC 171325, explicitly garlic powder. The full official
  one-record response is 43,098 bytes, retrieved `2026-11-06T20:59:39.5285851Z`,
  SHA-256 `f0f2b1f3264f845017c9184971421d61182d8c0597ce19d473144f1f7a1913a9`.
  Nine archive hashes pass. There are 76 retained sources, 73 used in recipes.
  All added-sugar values remain unknown. No private key was used.
- Garlic powder's actual 2.43 g total sugars/100 g is classified as free sugars
  under the cited UK vegetable-powder rule; the powder is excluded from FVNS.
  Earlier intact garlic remains unchanged. Ground ginger was omitted because
  its preparation identity alone does not settle the model's powdered-starchy-
  carbohydrate exception. No inferred complete score was assigned to it.
  The two 1 g garlic-powder recipes each contain 0.0243 g derived free sugars;
  shrimp soup combines 0.5 g garlic powder and 0.3 g cayenne for 0.04317 g.
  Shrimp soup retains all source sodium (780.85 mg per regular portion) and
  adds no salt. All other source, processing, threshold and ranking rules remain.
- The importer caught an invalid `cold` temperature enum on the new lentil
  noodle box; it was corrected to the existing `cool` value before regeneration.
  All 96 recipes then imported with complete model inputs and no runtime
  nutrition requests. No UI change or new schema value was introduced.
- Independent preservation audit passes: all 84 prior raw/generated recipes,
  75 sources/assessments and global model provenance are unchanged. All 15,438
  food-library records and metadata remain unchanged except one new source's
  localized aliases. The audit checks 2,268 prior portion nutrient values,
  588 per-100-g model inputs and 168 literal-threshold totals, including the
  existing chickpea-purée and cayenne interpretations. New core ingredient
  combinations are distinct. Log: `.audit-tmp/recipes96-preservation.log`.
- Nutrition checks pass 288 portions, 684 exact source fields, 2,784 avoidance
  cases, independent top-three ordering and seven-day-history tie handling.

## Final verification

- `npm run verify` passed the production build, product/engine, mocked API/AI,
  local routes, launch/presentation/dashboard, nutrition/model, food-library,
  records, history and weekly-summary checks. Model checks cover 174 boundaries
  and three official examples; history covers 24 ranking contexts and 16 calendar
  checks. Log: `.audit-tmp/recipes96-verify.log`. The existing large-bundle warning
  remains (current application JS 1,585.89 kB, 297.42 kB gzip).
- Dashboard checks pass 592 score panels, 590 nutrition panels, 3,832 exact
  ingredient-source links and 12 preparation-specific notes. No component or
  styling changes were needed for this expansion.
- Isolated Chromium checks pass 192 bilingual recipe details, notes and exact
  instruction lists; 576 portion changes; 1,250 ingredient labels; and 12
  existing purée-preparation checks. The 96th-ranked recipe saves/reloads with
  the correct version and large portion. Excluded choices remain inspectable
  and cannot be selected. Keyboard focus, 320/390/768/1280 px layouts and zero
  page errors pass. Root visually reviewed the Chinese desktop library and
  mobile shrimp-soup details, plus the English preparation/source view.
  Evidence: `output/playwright/recipes96/browser-verification.json` and
  screenshots in the same directory.
- README and source/model documentation reflect 96 recipes, 76 retained sources
  and 73 active sources, with historical archives/versions preserved.
  `git diff --check` passed. Work remains uncommitted on `codex/recipes-24`.

## Retained limitations

Stable meal IDs retain conservative catalog exclusions. The egg/noodle soup
still inherits a possible pork conflict from the dumpling idea. The white-bean
noodle soup, scallion egg bowl and lentil noodle box inherit Soy exclusions
from tofu ideas despite having no listed soy ingredient. The egg/corn/celery
soup inherits a processed-food exclusion; garlic chicken retains a wheat
possibility, sesame-garlic chicken retains wheat/soy possibilities, and shrimp soup retains additional
sesame/pork/fish possibilities. These are inherited catalog constraints, not
declarations that those foods occur in the actual formulation. No safety gate
was relaxed. The remaining four dumpling ideas have no detailed formulation.

Recipe estimates are not measured intake, restaurant-product composition or
individual nutritional adequacy. No live AI, commit, push, merge or deployment
is included in this iteration.

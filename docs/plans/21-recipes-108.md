# Expand detailed recipes from 96 to 108

Status: review
Authorized: 2026-11-06. Continue `codex/recipes-24`; preserve the preceding
uncommitted work. Base remains `09471f18f6612067fc734746607200413904c225`.

## Scope

Add twelve distinct, practical recipes using reviewed ingredient sources.
Version: `mealhatch-recipes108-2026-11-06-v1`. Each has edible weights, matching
source/preparation states, bilingual names and four preparation steps. Reuse
complete sources; do not invent values or unsupported processing classifications.

The original catalog has only four ideas without a detailed formulation, all
unresolved dumpling variants. Preserve those ideas and the original 100 entries;
append twelve accurately named entries for the new recipes. The resulting
collections are 112 meal ideas and 108 detailed recipes. Update current counts
and metadata consistently. Do not redesign the interface or weaken exclusions.

Preserve the previous 96 raw/generated recipes, 76 food definitions/assessments,
all source archives and library records, and original catalog metadata against
`.audit-tmp/recipes108-baseline/`. Keep model thresholds, product weights,
preparation rules, saved versions, portion factors and exact-total history ties.
Do not add dependencies, services or live provider calls. No commit, push,
merge or deployment is included.

## Verification

Review distinct core ingredient sets, exact state/identity/units, seasoning,
retained soup water, bilingual steps and new catalog safety metadata. Check all
108 recipes at three portions, top-three order, seven-day history, eligibility
and saved plans. Verify old recipe/model values and all 100 old catalog objects
remain unchanged, and new entries work in both recommendation collections.

Run the full repository suite and isolated Chromium checks for 216 bilingual
recipe details/instructions and 648 portion changes; verify below-top-three
save/reload, hard exclusions, keyboard focus and 320/390/768/1280 px layouts.
Review representative screenshots and record evidence before review status.

## Implementation evidence

- Added salmon/lentil/spinach bowl; turkey/sweet-potato/pepper plate;
  lamb/lentil/carrot bowl; pork/zucchini/cooked-tomato rice; cod/white-bean/leek
  soup; chickpea/quinoa/cauliflower with sesame; black-bean/corn/pepper baked
  potato; egg/edamame/bok-choy rice noodles; tuna/tomato/cucumber sandwich;
  mozzarella/avocado/tomato bread plate; cottage-cheese/banana/oatmeal with
  honey; and Parmesan/lentil/spinach pasta. All have distinct core ingredient
  sets and four bilingual steps. Regular portions span 353–594.4 g and
  363.06–534.82 kcal; these are authored portions, not dietary targets.
- Reused the 76 retained sources (73 active) and all nine existing archives.
  No new source, nutrient value, model assessment or processing rule was needed.
  All 76 added-sugar fields remain unknown. The honey oatmeal uses the existing
  82.12 g/100 g honey total-sugar derivation, contributing 4.106 g free sugars
  for 5 g honey; the pork bowl's 1 g garlic powder contributes 0.0243 g under
  the already reviewed powder rule. The soup retains all listed water.
- Added twelve corresponding catalog ideas, bilingual titles/components and
  explicitly reviewed safety metadata. Original tag assignments and calibration
  remain intact. New entries have no legacy exposure boost. Bread ingredient
  unknowns, raw/cool state and actual fish, dairy, egg, soy, sesame, celery,
  lamb, pork and wheat conflicts remain visible and enforceable.
- Current idea counts in the interface derive from the catalog length. Metadata,
  README, source/method docs and draft launch copy reflect 112 ideas / 108
  detailed recipes. The social preview was regenerated at 1200 × 630 and
  visually reviewed. Existing gallery images/video remain historical captures
  and are explicitly marked for recapture before publication. The unrun study
  protocol now reflects the available noodle recipes, with no fabricated results.
- Root reviewed all new recipes' ingredients, states and instructions, plus the
  catalog entries and safety table. The previous 96 raw recipes, definitions,
  assessments and global provenance match the captured baseline; food-library
  JSON is byte-for-byte unchanged.

## Final verification

- Independent preservation audit passes for the original 100 idea objects,
  96 raw/generated recipes, 76 source foods/assessments and global provenance,
  and all 15,438 library records/metadata. It checks 2,592 old portion nutrient
  values, 672 model inputs and 192 literal-threshold totals. The 12 new core sets
  are distinct and have no inherited unrelated catalog conflicts. Log:
  `.audit-tmp/recipes108-preservation.log`.
- Calculation checks pass 324 portions, 684 exact archived nutrient values,
  3,132 avoidance contexts, all 108 independently computed totals/top-three
  ordering, 174 boundaries and three official examples. New source-to-idea
  safety and named-staple parity assertions pass. Original catalog distribution
  checks still cover the unchanged 100 ideas; new recipe checks require explicit safety
  declarations and neutral legacy exposure adjustments. No ranking rule changed.
- Dashboard checks pass 664 score panels, 662 nutrition panels, 4,260 exact
  ingredient-source links and 12 preparation notes. Isolated Chromium verifies
  216 bilingual recipe details/notes/instruction lists, 648 portion changes,
  1,392 ingredient labels and 12 purée-preparation cases. All 224 bilingual idea
  titles, 112-count labels, new-idea search and idea-library layouts pass.
  The 108th-ranked recipe saves/reloads with its version and large portion;
  excluded choices remain blocked, keyboard focus is restored, all four widths
  pass and no page errors occur. Evidence:
  `output/playwright/recipes108/browser-verification.json` and screenshots.
- Root visually inspected the Chinese recipe and idea libraries, new cod-soup
  mobile details, English instructions and updated social preview. No layout
  or CSS edits were required. The App count change adds no hooks, effects,
  redundant state or dependencies.
- `npm run verify` passed the production build, product/engine, API/AI mocks,
  local routes, launch/presentation/dashboard, nutrition/model, food-library,
  records, history and weekly-summary checks. History includes 24 ranking
  contexts and 16 calendar checks. Log: `.audit-tmp/recipes108-verify.log`.
  The existing large-bundle warning remains. `git diff --check` passed.
  Work remains uncommitted on `codex/recipes-24`.

## Boundaries

Existing catalog exclusions remain conservative, including known mismatches
with older detailed variants. New entries declare their actual formulation's
ingredients rather than borrowing older IDs. Empty declarations are not allergy
or cross-contact certification. Recipe calculations remain composition estimates,
not measured intake, restaurant-product validation or personalized adequacy.
No live AI request, commit, push, merge or deployment is included.

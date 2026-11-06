# One recipe-backed meal library

Status: review
Authorized: 2026-11-06. User approved completing the existing catalog rather
than continuing to add parallel ideas. Continue `codex/recipes-24`; preserve
all earlier uncommitted work. Base is
`09471f18f6612067fc734746607200413904c225`.

## Scope and evidence decision

Use the 108 existing defined recipes as the single current meal collection.
Derive visible meal names, ingredients, preparation facts and avoidance metadata
from their actual formulations. Remove the duplicate idea collection and mode
selector. Keep the separate food/drink source library and the existing compact
numeric ranking. No scoring formula, model threshold or recipe portion changes.

The four remaining dumpling concepts cannot be completed honestly with the
reviewed sources: [USDA 172802 wrappers](https://fdc.nal.usda.gov/food-details/172802/nutrients)
lack total sugars and a cooked-weight basis;
[USDA 2708708 steamed dumplings](https://fdc.nal.usda.gov/food-details/2708708/nutrients)
reference a generic frozen dumpling rather than disclosing filling proportions
needed for FVNS/free-sugar inputs. [TFDA cooked dumplings](https://data.gov.tw/dataset/8543) also omit
those proportions. Do not substitute an unrelated recipe or invent values.
The [FAO recipe-calculation method](https://www.fao.org/4/y4705e/y4705e23.htm)
requires cooked yield and appropriate yield/retention adjustments where raw
ingredients are used. Adding untested cooking assumptions solely to reach 112
would undermine the stated evidence standard.

Retire those four concepts from current recommendations, preserving their IDs
and legacy descriptions for old saved plans. The complete current collection
therefore remains 108. This is consolidation, not four newly sourced recipes.

## Compatibility

- Preserve all 108 recipes, portions, versions, 76 retained source definitions
  and model assessments against `.audit-tmp/catalog-unification-baseline/`.
- Keep the previous 112 idea objects explicitly as legacy data. Unversioned
  saved plans retain their original meaning; never rename them to a different
  formulation merely because the stable ID matches.
- Exact versioned plans keep their original recipe details. An unavailable
  version does not receive current nutrition or ingredient substitutions.
- Keep retired IDs readable during persistence normalization. Consumption stays
  an editable confirmation; recorded foods, source identities and seven-day
  history are unchanged.
- Current avoidance rules reflect actual source ingredients and preparation,
  including unknowns. Removing an unrelated legacy ingredient warning is an
  intended correction, not certification of allergy or cross-contact safety.
- Current supported style matches may change with corrected recipe metadata;
  published nutrient values, model calculations and preference weights do not.
- Stop offering unsupported legacy style/late-night heaviness controls as new
  choices. Preserve old settings visibly and allow removal. An existing
  late-night heaviness avoid is an unknown constraint during the late window;
  never classify all recipes from a neutral compatibility placeholder or ignore
  a saved must-avoid silently.

## Verification and closeout

Check canonical name/component/safety parity for all recipes, preserved source
and numeric values, complete eligibility, ranking, history and saved-plan
compatibility. Cover retired, unversioned and unavailable-version plans.
Run the repository suite and isolated bilingual Chromium checks for recipe
browsing, choosing, details, portions, migration and responsive layouts.
Keep browser evidence in `output/playwright/catalog-unification/`.

Update current README, source/method and launch draft copy. Keep previous plans
as historical records. Refresh the local gallery/video when the old capture
flow no longer matches the unified interface; review before any publication.
No new service, dependency, runtime nutrition API, live AI test, commit, push,
merge or deployment is included.

## Implementation and preservation evidence

- `src/recipe-catalog.ts` projects the current catalog from the actual recipe
  definitions. Bilingual names, ingredient lists, preparation time and ingredient
  safety use the same sources as the recipe details. The separate legacy export
  retains all 112 previous objects for saved plans and retired diagnostics.
- The interface has one recipe recommendation flow and one browsable recipe
  list, with food/drink lookup alongside it. Unsupported legacy preferences
  remain visible and removable; no unsupported cuisine is silently substituted.
- Regression checks cover white-bean noodles and water-cooked oats remaining
  eligible under a soy avoid, actual edamame still being excluded, and unresolved
  bread composition remaining unknown/excluded. Current style matching no longer
  treats any sandwich as evidence of an American cuisine preference.
- A review caught the late-night rule reading the new catalog's neutral
  compatibility `heaviness` field. It now explicitly reports an unknown legacy
  restriction for recipes at night. Noon, night and user-removal cases are
  covered; no new nutritional threshold was invented.
- Unversioned plans retain original idea names/components. Exact recipe versions
  retain their ingredient amounts. Missing versions show an unavailable label
  and open a blank consumption draft rather than substituting current content.
- Independent data review found no identical core ingredient sets among 108
  recipes. Raw recipes, 76 source definitions/assessments and all nine source
  archives match the captured baseline. The full preservation audit additionally
  compares 112 legacy objects, 2,916 portion nutrient values, 756 model inputs,
  216 literal-score contexts and all 15,438 library records. Evidence:
  `.audit-tmp/catalog-unification-preservation.log`.

## Verification evidence

- `npm run verify` passed the build, product/engine, API and editor mocks, local
  routes, persistence, presentation/dashboard, nutrition/model, food library,
  record store, history and weekly summary. The canonical verifier checks 3,024
  source avoidance cases, bilingual recipe identity and saved-plan compatibility;
  nutrition verifies 324 portions and 3,132 avoidance contexts. The model checks
  174 boundaries and three official examples; history checks 24 rankings and
  16 calendar cases. Log: `.audit-tmp/catalog-unification-verify.log`.
- The capture tool was adapted to the actual recipe flow and successfully
  recaptured three local gallery images and the first-use video. The root review
  checked the fresh home screen and expanded calculation screenshot. The script
  captures the actual result of a preference change without promising a matching
  staple always wins. These are local review assets, not published launch results.
- The existing large-bundle advisory remains (production JavaScript about
  1,623 kB before compression, 304 kB gzip). No new dependency or service was added.
- Isolated Chromium passed 216 bilingual recipe details/instruction lists,
  648 portion changes, 1,392 ingredient labels and 12 processing-specific
  checks. The lowest-ranked recipe saves/reloads with its exact version/portion;
  excluded recipes remain inspectable but cannot be chosen. Keyboard focus and
  320/390/768/1280 px layouts passed, with zero page errors. Report:
  `output/playwright/catalog-unification/browser-verification.json`.
- Seeded browser migration checks in both languages confirm original renamed
  and retired idea components without grams, exact saved-version gram amounts,
  unavailable versions opening empty drafts that reject empty recording, and
  all four plans plus existing records/preferences surviving actual JSON export.
  Unsupported old preferences and the night restriction are explicit and removable.
- Root visually reviewed the Chinese phone home, desktop library and saved-plan
  compatibility screen, English unavailable-version draft, all three gallery
  screenshots and updated social preview. `git diff --check` passed.
- Implementation and verification completed on `codex/recipes-24` before
  release authorization. No live-provider AI request or user-study result is claimed.

## Release authorization

On 2026-11-06 the user authorized committing and pushing this complete version,
including the preceding recipe expansions and catalog consolidation. The
branch remains `codex/recipes-24`. Merge and deployment are separate steps;
use the Git history and remote checks for the actual release state.

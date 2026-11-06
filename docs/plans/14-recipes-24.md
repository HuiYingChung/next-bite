# Expand the detailed recipe collection to 24

Status: review
Authorized: 2026-11-05. User accepted the expansion recommendation and requested
a new branch. Branch: `codex/recipes-24`, based on `09471f1`.

## Scope

- Retain the existing 12 versioned formulations and add 12 sourced recipes.
- Prioritize four noodle meals, three bread meals, two potato meals, and three
  grain/legume meals. Reuse existing catalog identities; label the actual
  standardized formulation, including any evidence-driven substitutions.
- Pin new USDA source records and document ingredient weights, preparation,
  seasonings, free-sugar derivations, exclusions, and bilingual instructions.
- Add source-backed nonzero free-sugar support without filling unknown data.
- Make every recipe inspectable in the library. Browsing must not bypass hard
  exclusions; choosing an eligible recipe need not depend on a top-three rank.
- Preserve the published model, product weights, top-three selection, history
  tie-breaks, local storage and the separate 100-idea catalog.
- Keep the static/offline architecture. No provider key, backend, push, merge
  or deployment is part of this implementation request.

## Verification

Check archived source bytes, source-state matches, model-input provenance,
ingredient avoids, portion scaling and independent totals for all 24 recipes.
Verify browsing, details and selection of non-top-three candidates, exclusions,
English/Traditional Chinese, narrow layouts, and existing persistence/history.
Run the complete repository verification suite and record results here.

## Implementation evidence

- Added twelve formulations: four noodles, three bread, two potato and three
  grain/legume meals. The resulting collection has 8 rice, 4 noodles, 3 bread,
  3 potato, 5 other-grain and 1 no-staple recipe. All use complete model inputs.
- Archived sixteen additional full USDA SR records with their own manifest,
  retrieval time and SHA-256. There are 34 retained source foods, 32 active.
  The original twelve recipe definitions and original source nutrient values
  were independently compared against the base commit and are unchanged.
- Honey and lemon juice use source-reported total sugars as derived free
  sugars, with cited ingredient classifications; all 34 source added-sugar
  values remain unknown. Invalid, missing, duplicate or wrongly unit-labelled
  sugar values fail validation. Sauce, oil and salt weights reconcile.
- Two wrap candidates became explicitly named bread sandwiches. Other
  source-matched labels identify cooked oats, boiled vegetables and actual
  meat preparations. Recipe steps refer to selected portions rather than
  repeating regular-only amounts. Bread's six unresolved ingredient avoids
  exclude its recipes when selected, without claiming known presence.
- Added a searchable recipe library and dashboard entry. All 24 are
  inspectable; only currently eligible recipes can be saved. The shared detail
  view shows numeric scores, portion estimates, ingredients, sources and
  preparation steps. Top-three ranking and seven-day tie-breaks are retained.
- Regenerated the food-library search catalog. Structural comparison found
  only the sixteen new food aliases and the oats concept's discovery links
  changed; its 15,438 source records and nutrient values are unchanged.
- Final `npm run verify` passed, including production build, product/engine,
  API and AI mocks, local API routes, state/presentation/dashboard, source and
  nutrient calculations, food library, records, history and weekly summary.
  Nutrient checks compare 306 pinned fields and independently recalculate all
  24 recipes in three portions. Model checks cover 174 boundaries, three
  published examples and 24 totals under six preference contexts. Ingredient
  avoidance checks include 696 contexts plus uncertain bread ingredients.
- Optional real Chromium verification passed 48 bilingual recipe detail views
  and 144 portion checks, saving the 24th-ranked choice, excluded-but-inspectable
  details with disabled selection, keyboard focus restoration and 320/390/768/
  1280 px layouts. No page errors or document/drawer overflow were observed.
  Images are local ignored artifacts under `output/playwright/recipes24/`.
- Browser verification can be repeated without a new project dependency:

  ```text
  node scripts/verify-recipe-library-ui.mjs <absolute-package.json-with-playwright> http://127.0.0.1:5178/
  ```

No real AI provider was called. These checks do not establish individual
nutritional adequacy, restaurant equivalence or user-study outcomes. The
production build retains the existing large-bundle warning. No commit, push,
merge or production deployment was performed in this iteration.

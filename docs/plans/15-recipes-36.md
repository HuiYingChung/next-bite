# Expand detailed recipes from 24 to 36

Status: review
Authorized: 2026-11-05. User requested expansion to 36 after the completed
24-recipe implementation. Continue branch `codex/recipes-24` with its existing
uncommitted work; the branch name records its initial scope.

## Scope and boundaries

- Add twelve distinct, source-matched formulations from the existing 100 ideas.
  Prioritize protein, vegetable and meal-form variety rather than small
  ingredient-weight changes to existing recipes.
- Preserve all previous 24 formulations, their versions, weights and source
  values. A local baseline was captured before this iteration for comparison.
- Archive new full USDA records in a separate snapshot and manifest. Add
  explicit preparation states, ingredient avoidance declarations and reviewed
  model-input classifications. Missing nutrients remain unknown.
- Supply bilingual labels and portion-aware preparation instructions for each
  new formulation. Specific measured ingredients define the estimate.
- Keep published model thresholds, product weights, top-three ranking,
  history rules, full-library inspection and guarded plan selection intact.
- Retain offline/static data and existing dependencies. No account, live AI
  request, backend, commit, push, merge or deployment is part of this request.

## Verification

Reconcile source bytes, identities, nutrients, state, ingredient mass and
seasonings. Independently recalculate all 36 recipes and portion multipliers;
check hard exclusions, input completeness, top-three totals and history ties.
Verify all recipe details in English/Traditional Chinese, selecting a recipe
below the top three, persisted plans, exclusions, keyboard access and narrow
layouts. Run the complete repository suite and record results below.

## Evidence

- Added twelve source-matched formulations: two cod meals, pork/cabbage rice,
  chicken/chickpea vegetables, black/white bean rice, chicken/pepper/onion rice,
  chicken/zucchini/tomato pasta, cottage cheese/fruit/bread, oats/egg/banana,
  chicken/kale/white-bean soup, beef/tomato/cabbage rice and shrimp/potato/peppers.
  All have bilingual instructions that follow the selected portion.
- Archived fifteen full USDA records separately: 428,610 bytes, SHA-256
  `383f57acce0740f295b6f5c51940aa5198c2c234e235a3d2a7a6d3a5ad3330c3`.
  Retrieval was 2026-11-06T05:18:13.6597447Z (November 5 locally). The collection
  retains 49 sources and uses 46; all 36 recipes have complete model inputs.
- The reviewed soy beverage has a source-backed free-sugar derivation but
  unresolved FVNS. That input remains null and the source is not used in scored
  recipes. The breakfast uses water-cooked oats, egg and banana instead. The
  retained source still supports correct drink identity in saved records.
- Baseline comparison preserved all previous 24 raw/generated recipes, 34
  source definitions/generated foods and 34 model assessments exactly.
  The new food-library generation changes fifteen localized recipe aliases;
  all 15,438 library record identities and nutrient values remain unchanged.
- Independent nutrition verification passed 441 archived nutrient fields,
  108 portion calculations and 1,044 avoidance contexts. Model checks passed
  174 boundaries, three published examples and 36 totals across six preference
  contexts. History checks cover 24 ranking contexts and 16 calendar checks.
  Retained source-identity checks passed 196 localized round trips.
- Real Chromium verification passed 72 bilingual details and 216 portion
  switches, all recipes viewed at 390 px. The 36th-ranked option can be saved
  and its version/large portion survives reload. Excluded choices stay
  inspectable with disabled selection. Keyboard focus and 320/390/768/1280 px
  layouts passed with no page errors or detected overflow. Final copy changes
  received a separate 72-label comparison and bilingual source-label check.
  Screenshots are local ignored artifacts in `output/playwright/recipes36/`.
- Root visually reviewed the final Chinese desktop library and mobile cod
  detail. Existing compact numeric scores and the full-library flow remain.
- Full `npm run verify` passed: production build, product/engine, API and AI
  mocks, local routes, state/presentation/dashboard, nutrition/model, food
  library, records, history and weekly summary. The initial run identified an
  outdated retained-source test fixture; adding the unused soy drink's explicit
  group fixed it, and the full suite passed on the final run. The existing
  large-bundle build warning remains. `git diff --check` passed.

The catalog's existing conservative exclusions remain in force. For example,
the water-cooked oats formulation omits soy, but its original soy-milk idea
still excludes it for a Soy avoid. An explicit regression test preserves this
known over-exclusion; it is not an ingredient-level claim about the new recipe.
No recipe-specific safety bypass or score adjustment was added to promote new
meals. No private key, real AI provider, commit, push, merge or deployment was
used in this iteration.

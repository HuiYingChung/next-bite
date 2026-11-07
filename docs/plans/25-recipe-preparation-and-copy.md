# Recipe preparation and concise recommendation copy

Status: merged — PR #15, merge commit `239c9cc`
Authorized: 2026-11-06. User requested removing repetitive qualifications from
card bodies, then approved completing the original twelve recipes so people
can follow them, with nutrition recalculated if the formulation changes.
Branch: `codex/concise-recommendation-copy`, based on merged imagery commit
`3b393b1` (PR #14). That release's main CI and Vercel deployment passed.

## Scope

- Keep real preference matches in card bodies; show neutral ranking context
  once per collection. Use compact, explicitly qualified assembly-time labels.
- Keep full timing explanations in expanded time settings and preparation
  details, with keyboard/touch access. Preserve full default-collapsed scoring.
- Complete the first twelve records in `data/nutrition/recipes.json`, which
  previously used the importer's three generic preparation steps.
- Supply bilingual cooking order, source-supported methods and endpoints,
  final edible-weight instructions, and recipe-specific timing caveats. Give
  preparation guidance its own revision and linked sources.
- Preserve the sourced formulation, nutrition version, images, exclusions,
  priority tiers, and portion scaling when the food composition is unchanged.
  Preparation reference times do not become validated whole-meal durations.
- Keep later recipes and original food-source records unchanged.

## Verification

- `npm run build` passed. The existing large-chunk advisory remains.
- `npm run verify:nutrition` passed: 108 recipes, 76 source foods, 684 pinned
  source values, all portion calculations, preference priority and exclusions.
- `npm run verify:dashboard` passed: 676 recipe comparisons, 664 score panels,
  662 nutrient panels, both languages, and full collection availability.
- `npm run verify:recipe-images` passed: 108 unique images, 216 responsive
  assets, complete current-version coverage and historical-version fallback.
- A one-off comparison against `HEAD` confirmed unchanged source foods,
  original formulation fields, all 36 original-recipe portion calculations,
  nutrient profiles and preference scores. The later 96 recipes are unchanged.
- Independent preparation review checked cooking states, edible weights,
  endpoints, cold storage, rice enrichment, congee retained-water mass and the
  source-specific shrimp sodium limitation. Salmon now specifies foil-lined
  pans at 450°F. Each original recipe has 6–7 bilingual steps and 3–5 references.
- Actual in-app browser checks on port 5178 opened all 12 guides in both
  languages: steps and source links are present, preparation and scoring
  default collapsed. Checked smaller congee amounts (90 g rice + 180 g water),
  saved-plan disclosure and source access, keyboard expansion, concise main
  and library cards, preference updates, and needs-preparation/time-limit
  behavior. Removed the temporary saved plan; no eaten records were created.
- Captured `output/playwright/concise-recipes/compact-options.png` and
  `output/playwright/concise-recipes/initial-recipe-guide-zh.png`. No browser
  console errors were observed. This was not a complete device-width matrix.
- Updated the standalone browser test assertions for compact copy, numbered
  steps, separate source lists and collapsed saved recipes; syntax passed.
  That standalone browser script was not run in this iteration.
- `git diff --check` passed.

No whole-meal kitchen timing or taste test has been performed. Preparation
guides have a separate revision; the sourced formulation version is retained.
The user authorized commit, push and merge of this iteration on 2026-11-06.
Commit `e7fd473` was pushed and merged in PR #15 as `239c9cc`. PR CI
`42339576136` and main CI `42339691888` passed, as did Vercel preview and
merge-commit deployment statuses. Narrow-screen follow-up is tracked in plan 26.

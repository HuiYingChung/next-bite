# Rotating recommendations

Status: review — implemented and verified locally; committed, not pushed
Authorized: 2026-11-10. A review of the product's logic found that the default
suggestions never changed. The user approved working through the review's
recommendations one round at a time; this is round one.
Branch: `claude/rotating-recommendations`, from `claude/launch-polish`
(`0d4f71e`).

## Problem

Recipes were ordered by exact nutrition reference after preferences. Measured
on the 108-recipe collection before this change:

- Without preferences the same three recipes led at 07:00, 12:00, 19:00 and
  23:00, on every day. Records only separated exact ties.
- Across 105 combinations of staple, style and preparation choices, 50 recipes
  ever reached the first three; 58 never did.
- "Show another option" cycled among the same three.

## Scope

1. Compare the nutrition reference by level (18 or more, 14 to 17, 13 or less;
   28, 55 and 25 recipes). The levels are product rules. The exact reference
   and every model input stay in the details.
2. Order recipes still tied by a number derived from the local date, meal
   window and recipe ID. No randomness or stored state; the seed is shown in
   the details. Records keep their place ahead of rotation.
3. Judge variety among options offered together within each group of three, on
   staple, or on main protein once a staple is selected. The earlier joint
   protein-and-staple rule put one recipe in 45 of 84 first groups.
4. Replace "Show another option" with "Show three more", paging through the
   engine's full order. A new order (changed preferences, records or meal
   window) starts again from its first group.
5. Ranking policy `mealhatch-banded-rotation-2026-11-10-v1`. Update the method
   text, receipt labels, scoring policy, README and the usability protocol.

Unchanged: UK NPM 2018 arithmetic, preference groups and points, hard avoids,
strict conditions, evidence requirements, recipe data, portions, storage and
the legacy idea path. Saved plans do not affect the order; recorded meals do.

Rejected: random shuffling (not reproducible); removing the nutrition reference
(the inspectable calculation is a product strength); meal-type tagging such as
breakfast suitability (needs a judgment for each of 108 recipes).

## Verification

- `npm run verify` passed.
- New assertions in `verify-preference-first.mjs`: levels follow the stated
  boundaries; rotation never lifts a recipe above a higher level; the same
  inputs and meal window reproduce the same order; each date and window offers
  a different first group; over 28 days and three windows all 28 higher-level
  recipes lead and none exceeds twice its even share; the first group does not
  repeat a staple; a selected staple still leads.
- The independent ranking oracle restates the level boundaries and still
  matches the engine for every eligible recipe in `verify-history-ranking`,
  `verify-nutrient-profile` and `verify-preference-first`. Record and dashboard
  checks now assert that history cannot move a recipe across levels.
- Measured after the change: first-place appearances over 84 date-and-window
  combinations spread across all 28 higher-level recipes (most frequent 6);
  first-group appearances range from 3 to 14 against an even share of 9.
- `scripts/verify-recipe-library-ui.mjs` passed against the local development
  server with a fixed clock: both languages, "Show three more" shows the next
  group from the engine's order, the receipt lists seven ordering steps and the
  rotation seed, four widths, zero page errors.
- In-app browser: three successive groups showed nine different recipes, the
  status message reported "Showing options 4–6 of 108", selecting another
  option kept the group, and the console stayed clean.

Not verified: behaviour at the moment a meal window changes while the page is
open; a physical phone; whether people find a changing list helpful, which the
added usability question is meant to observe. No push, merge or deployment.

## Next rounds (not started)

2. A main-protein choice for the current meal, and merging the duplicated
   staple, warm and less-oil settings.
3. First screen: three equal image cards and quick choices; recording moved to
   a secondary position; explanatory copy gathered in Data & method. A mockup
   comes first.

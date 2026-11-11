# Main-protein preference

Status: review — implemented and verified locally; committed, not pushed
Authorized: 2026-11-10. Round two of the recommendations from the product-logic
review, approved one round at a time.
Branch: `claude/main-protein-preference`, from
`claude/rotating-recommendations` (`a193586`).

## Problem

- The only current-meal choices about the food itself were staple and a
  two-value style. People usually decide by the main ingredient first.
- Four saved preferences repeated per-meal controls: rice-based and
  noodle-based (staple), warm meals, and less added oil. The saved warm
  preference added points while the per-meal one filtered, so one idea had two
  behaviours.

## Scope

1. Add a current-meal main-protein choice: chicken or turkey; egg; fish or
   seafood; beans or soy; beef, pork or lamb; dairy. A recipe matches when an
   ingredient it declares as protein, above zero grams, is in the group. It is
   a flexible preference worth 0 or 2 points like the other groups and never
   excludes a recipe. Groups follow each source food's reviewed protein
   identity (`src/protein-preference.ts`), not recipe names.
2. Show the match in card reasons, the mismatch in details, and the group as a
   sixth row in the calculation receipt. Ranking policy
   `mealhatch-banded-rotation-2026-11-10-v2`; the order of steps is unchanged.
3. Stop offering the four duplicated saved preferences as new choices. Copies
   already saved keep their scoring, appear under "Now chosen for each meal"
   in preferences and can be removed.

Matches by group on 2026-11-10: beans or soy 40, chicken or turkey 33, fish or
seafood 20, egg 17, beef/pork/lamb 11, dairy 11. A recipe with two protein
ingredients matches both groups, so a chicken and black bean bowl appears for
"Beans or soy".

Unchanged: model arithmetic, nutrition levels, rotation, hard avoids, strict
conditions, recipe data, stored preferences and the legacy idea path.

Rejected: deleting the duplicated saved preferences (would silently change
existing users' results); matching on recipe titles; treating only the heaviest
protein ingredient as the main one (cooked pulses outweigh meat in several
recipes, which would mislabel them).

## Verification

- `npm run verify` passed.
- New assertions in `verify-preference-first.mjs`: every declared protein
  ingredient in the 108 recipes belongs to exactly one group in a list kept
  independently in the ranking oracle; for each group the engine's match equals
  that list for every recipe, matching recipes lead, nothing is excluded, the
  order equals the independent ranking and is reproducible; staple plus
  protein requires both to lead; unknown stored values fall back to no
  selection; mismatches are stated; the Traditional Chinese reason is present.
- `scripts/verify-recipe-library-ui.mjs` passed against the local development
  server: selecting fish or seafood shows the engine's first option and its
  reason in both languages, the receipt has six preference rows, four widths,
  zero page errors.
- In-app browser: chicken or turkey produced three chicken recipes with the
  reason shown; the preferences drawer offers seven saved choices; with
  "Rice-based meals" and "Less added oil" written into the stored profile, the
  retained section listed both, they still affected the suggestions, and each
  was removable. The test values were removed afterwards. Console clean.

Not verified: a physical phone; whether six options are the right grouping for
real users. The first-screen panel now has five selects, which round three
replaces with quick choices. No push, merge or deployment.

# Filter fixes

Status: review — implemented and verified locally; committed, not pushed
Authorized: 2026-11-10. The user reported that some filters looked wrong.
Every condition was compared with the ingredient lists, names and instructions
of the 108 recipes; the user approved fixing the five clear logic errors.
Branch: `claude/filter-fixes`, from `main` (`3f63578`).

## Problems and fixes

1. **A minor protein counted as the main protein.** Any declared protein
   ingredient matched its group. "Dairy" offered a lamb rice bowl whose yogurt
   provides 15% of the protein; "Egg" offered a beef bowl (egg 19%); of 40
   recipes matching "Beans or soy", 20 also contained meat or fish and in 15
   the beans provided less than half of the protein. The main protein is now
   the group that provides the most protein among the declared protein
   ingredients (weight × the source record's protein per 100 g). Matches per
   group: chicken or turkey 33, beans or soy 25, fish or seafood 20, egg 13,
   beef/pork/lamb 11, dairy 6. Every recipe has exactly one main group.
   Ranking policy `mealhatch-banded-rotation-2026-11-10-v3`.
2. **A staple and a main protein with no recipe in common said nothing.**
   Partial matches for one or the other were interleaved, each card giving a
   different reason. A notice now states that no recipe has both.
3. **"Large portions" kept out plus "Hungry" left no options.** Hunger
   suggested the large portion, which the avoid then excluded for all 108
   recipes. With that avoid set, hunger suggests the standard portion. A large
   portion chosen explicitly is still excluded.
4. **Three of four time limits did nothing.** Every recipe takes 5, 10 or 15
   minutes, so 15, 20 and 30 excluded nothing. The limits offered are 5 and 10
   minutes.
5. **The position line ignored the choices.** With "Rice" selected it still
   read "1–3 of 108". It now counts the recipes that match ("1–3 of 45
   matching · 108 standard recipes in all") and says so once the matching
   recipes have all been shown.

Unchanged: model arithmetic, nutrition levels, rotation, recipe data, stored
state, avoid handling other than the portion suggestion.

Rejected for the main protein: a share threshold such as one third or 40%
(the shares of second proteins run from 15% to 50% without a gap, so any
threshold splits near-identical recipes); matching by recipe name.

## Found but not changed

These follow deliberate, conservative rules and need a product decision:

- Allergen avoids exclude every recipe with packaged bread, puffed rice or soy
  drink, whose source records mark those allergens as unknown: peanuts 19 of
  19 exclusions, tree nuts 19 of 19, sesame 17 of 24, soy 19 of 35, egg 15 of
  35, dairy 13 of 24. The screen does not say why.
- The 20 recipes that can be served warm or cool are excluded both by "Warm
  meals only" and by avoiding "Cold food".
- Avoiding "Raw food" excludes 31 recipes for any raw produce, including a
  banana or 10 g of lemon juice; no recipe contains raw meat or fish.
- Avoiding "Processed food" excludes only the two canned-tuna recipes.
- Eight avoid choices exclude nothing in this collection.
- After fix 1, nine staple and main-protein pairs have no recipe (see the
  menu proposal in the conversation that led to this change).

## Verification

- `npm run verify` passed. `verify-preference-first.mjs` restates the
  main-protein rule independently from the source records, checks four named
  two-protein recipes in both directions, that every recipe has one main
  group, the portion rule in three cases and that each offered time limit
  filters some recipes and keeps some.
- `scripts/verify-recipe-library-ui.mjs --flows-only` passed against the
  local development server: the matching count, the notice for a pair with no
  recipe, and the offered time limits, in both languages.
- In-app browser: each change at 1280 px and 375 px.

Not verified: a physical phone.

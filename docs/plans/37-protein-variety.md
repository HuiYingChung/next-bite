# Options shown together differ in main protein

Status: review — implemented and verified locally; committed, not pushed
Authorized: 2026-11-11. After the 13 recipes of `36-recipes-143.md` were in
place, the user was shown the measured result with and without this rule and
chose to add it.
Branch: `claude/recipes-143`, on top of `2275bb0`.

## Problem

Options are offered three at a time. Within a group they differed in staple
only, so a group could be three versions of one protein. With 143 recipes and
no preferences, 37 of 84 first groups repeated a main protein and 6 showed one
protein only; the first launch screenshot showed two edamame bowls.

## Change

When no staple is selected, options shown together still differ in staple
first and now also differ in main protein where possible. The main protein is
the group that supplies the most protein (`getRecipeMainProteinGroups`), the
same definition the Protein choice uses. The comparison applies only among
recipes that are already equal in current preferences, saved preferences,
nutrition level and recorded variety, before the rotation for the date and
meal window. Ranking policy: `mealhatch-banded-rotation-2026-11-11-v4`.

Unchanged: the order of current preferences, saved preferences and nutrition
level; nutrition values; the rule once a staple is selected (protein sources
are compared, as before); the legacy idea list; the rotation key.

Measured over 28 days of three meal windows (84 first groups), no preferences
and no records:

| First three options | 130 recipes | 143 recipes | 143 with this rule |
| --- | --- | --- | --- |
| Beans or soy | 52% | 35% | 27% |
| Chicken or turkey | 21% | 13% | 15% |
| Fish or seafood | 13% | 16% | 15% |
| Beef, pork or lamb | 14% | 17% | 18% |
| Egg | 0% | 10% | 13% |
| Dairy | 0% | 10% | 11% |
| Groups repeating a main protein | 52 of 84 | 37 of 84 | 0 of 84 |
| Groups repeating a staple | 0 | 0 | 0 |
| Most-shown recipe against an even share | 1.67 times | 1.88 times | 2.05 times |
| Least-shown recipe against an even share | 0.36 times | 0.34 times | 0.17 times |

### Cost

Each group now takes at most one recipe per main protein, so recipes in the
smaller groups lead more often and those in the largest group less often.
The 16 higher-level bean recipes share about a quarter of the places; the
least-shown one led once in four weeks instead of twice. Every higher-level
recipe still takes a turn. The check that bounded the most-shown recipe at
twice an even share now allows two and a half times.

### Rejected

- Main protein before staple: the first group is the same in the simulation,
  and the existing guarantee that a group does not repeat a staple would no
  longer hold in later groups.
- Dropping the nutrition level from the default order: it would bring in
  middle-level recipes but removes the product's stated order.
- Counting every protein ingredient together with the staple, as tried
  before: it kept choosing the few recipes that share neither.

## Files

- `src/history-variety.ts`: the within-group comparison and its explanation.
- `src/nutrition.ts`: candidates carry their main-protein group; policy
  version; method text in both languages.
- `src/meal-context.ts`: optional `mainProteins` on a candidate.
- `scripts/verify-preference-first.mjs`: three main proteins in every first
  group over 84 windows, no repeated staple, later groups never one protein
  only, staple still varying when a main protein is selected, the new bound.
- `docs/nutrition/decision-policy.md`: policy version and step 4.

The summaries already shown in the interface ("options shown together differ
in staple or main protein where possible") describe the new behaviour and did
not need to change.

## Verification

- `npm run verify` passed, including the independent ranking oracle and the
  new checks above.
- `scripts/verify-recipe-library-ui.mjs` (complete run) passed against the
  local development server.
- In-app browser at 1280 and 375 px in both languages: the default three show
  three main proteins; console clean.
- Launch screenshots and recording captured again.

Not verified: a physical phone.

# Expand detailed recipes from 130 to 143

Status: review — implemented and verified locally; committed, not pushed
Authorized: 2026-11-11. A launch-readiness check of the live build found that
the three options a first-time visitor sees were dominated by one protein
group. The user chose to add recipes first and decide about the ordering rule
afterwards, and approved the list of 13 and the use of her Figma AI credits
for their illustrations.
Branch: `claude/recipes-143`, from `main` (`a400859`).

## Problem

Without preferences the first three options come from the higher nutrition
level (nutrition reference 18 or more). Of the 130 recipes, 30 were at that
level: 16 with beans or soy as the main protein, 7 chicken or turkey, 4 fish,
3 beef, pork or lamb, and none with egg or dairy.

Measured over 28 days of three meal windows (84 first groups) with no
preferences and no records:

| First three options | Before | After |
| --- | --- | --- |
| Beans or soy | 52% | 35% |
| Chicken or turkey | 21% | 13% |
| Fish or seafood | 13% | 16% |
| Beef, pork or lamb | 14% | 17% |
| Egg | 0% | 10% |
| Dairy | 0% | 10% |
| Groups repeating a main protein | 52 of 84 | 37 of 84 |
| Groups with one main protein only | 13 | 6 |
| Most-shown recipe against an even share | 1.67 times | 1.88 times |

## Scope

Add 13 recipes, version `mealhatch-recipes143-2026-11-11-v1`, each with edible
weights in the source state, bilingual names, notes and four preparation
steps. All 13 are at the higher nutrition level.

| Recipe | Main protein | Staple | Reference | kcal |
| --- | --- | --- | --- | --- |
| Boiled egg, green pea and broccoli rice bowl | Egg | Rice | 18 | 481 |
| Boiled egg, spinach and green pea wholewheat pasta | Egg | Noodles | 18 | 480 |
| Boiled egg, lentil and spinach bowl | Egg | None | 18 | 404 |
| Boiled egg, quinoa and kale bowl | Egg | Other grains | 18 | 454 |
| Greek yogurt, chickpea and kale bowl | Dairy | None | 19 | 398 |
| Greek yogurt baked potato with broccoli and green peas | Dairy | Potato | 18 | 421 |
| Greek yogurt, quinoa and chickpea bowl with spinach | Dairy | Other grains | 19 | 425 |
| Lean minced pork, edamame and cabbage rice bowl | Beef, pork or lamb | Rice | 19 | 477 |
| Lean beef, lentil and tomato wholewheat pasta | Beef, pork or lamb | Noodles | 19 | 461 |
| Chunky lean beef, potato, green pea and carrot stew | Beef, pork or lamb | Potato | 19 | 511 |
| Baked cod, green pea and broccoli rice bowl | Fish | Rice | 19 | 445 |
| Tuna, green pea and tomato wholewheat pasta | Fish | Noodles | 19 | 425 |
| Baked cod, baked potato and green bean plate | Fish | Potato | 18 | 439 |

Higher-level recipes by main protein, before and after: beans 16 and 16,
chicken 7 and 7, fish 4 and 7, beef, pork or lamb 3 and 6, egg 0 and 4, dairy
0 and 3. All 143 by level: 43 higher, 69 middle, 31 lower.

| All 143 | Chicken | Egg | Fish | Beans | Beef/pork/lamb | Dairy |
| --- | --- | --- | --- | --- | --- | --- |
| Rice | 14 | 5 | 12 | 10 | 7 | 0 |
| Noodles | 3 | 4 | 4 | 7 | 5 | 2 |
| Bread | 8 | 4 | 3 | 2 | 2 | 3 |
| Potato | 4 | 2 | 4 | 1 | 4 | 2 |
| Other grains | 2 | 2 | 2 | 3 | 2 | 4 |
| No staple | 2 | 3 | 4 | 2 | 2 | 3 |

Only source foods already used by scored recipes are used. No source, nutrient
value, model assessment, processing rule or ordering rule was added or changed,
and the 130 earlier recipes are byte-for-byte unchanged in `recipes.json`.

### How the amounts were chosen

Amounts were searched in steps of 10 to 40 g with the application's own model
code, keeping combinations at reference 18 or more, between 380 and 540 kcal,
with the intended group supplying the most protein. The recipes are therefore
formulated to reach the higher level: vegetables, green peas or pulses make up
more of the plate than in a typical home version, and several sit just above
a threshold (for example 60.4% fruit, vegetables and pulses against the 60%
step). The values are deterministic and checked by the independent oracle;
they are stated here so the choice is not mistaken for a typical serving.

### Decisions

- **Tomato and egg dishes are not included.** Tomato and egg over rice or
  noodles, the most familiar egg dishes, cannot reach the higher level with
  any amounts tried: cooked tomato has too little fibre and protein. They
  could be added at the middle level but would not appear among the first
  three, which is what this iteration addresses.
- **Pulses beside another protein.** Six recipes pair egg, yogurt, pork or
  beef with lentils, chickpeas or edamame. In each the named protein supplies
  more protein than the pulse, so the main-protein rule assigns the recipe to
  it; the notes say so.
- **The stew includes its water.** The first amounts were checked without the
  60 g of retained water; with it they gave reference 17. The amounts were
  searched again with water included and now give 19.
- **Tofu is still not used** (unresolved model assessment, see
  `34-recipes-130.md`). Bread dishes were not added: the bread's sodium costs
  a point.
- **The ordering rule is unchanged.** Options shown together differ in staple
  only. A simulated rule that also varies the main protein removes every
  repeat (0 of 84) and brings beans to 27%, with the most-shown recipe at
  2.05 times an even share. It is not implemented; the user decides after
  seeing this result.

### Images

The 13 illustrations were generated with Figma AI image generation (model
gpt-image-2.5-flare) from prompts in the wording used before, at 1280 × 960,
and prepared with `scripts/prepare-recipe-images.mjs`. Each asset's review
note in `docs/recipe-images/manifest.json` names the tool and what was
checked. The 130 earlier images and their files are unchanged.

Reviewed on four contact sheets against the ingredient lists: no unlisted
food. Recorded exceptions: one egg (two halves) is shown on three egg bowls
where the standard portion is about two eggs, and the two cod fillets carry
fine seasoning specks.

Generating the images used the user's Figma AI credits (13 images), in the
draft file "MealHatch recipe image test".

### Counts

Checks that assert the size of the collection now expect 143. Current-state
statements in `README.md`, `index.html`, the nutrition and image docs, the
Product Hunt draft and the social preview say 143; the social preview was
re-rendered and the launch screenshots and recording were captured again.
Historical plans and dated measurements keep their numbers.

## Verification

- `node scripts/import-nutrition-data.mjs` regenerated `src/nutrition-data.ts`:
  consistent cooked FVNS basis in every new recipe, oil and salt declarations
  equal to the ingredients, complete model inputs.
- `npm run verify` passed with 143 recipes, including source-to-catalog safety
  parity, the independent ranking oracle, exactly one main-protein group per
  recipe, every higher-level recipe taking a turn, 286 image files matching
  their recorded hashes and 143 unique images. `verify-preference-first.mjs`
  now also requires at least three higher-level recipes in every main-protein
  group and that each of the 13 stays at the higher level.
- `scripts/verify-recipe-library-ui.mjs` (complete run) passed against the
  local development server.
- In-app browser: choosing Egg, Dairy, Beef/pork/lamb and Fish shows the new
  recipes first with their images; console clean.

Not verified: cooking the recipes; a physical phone.

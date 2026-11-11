# Expand detailed recipes from 108 to 130

Status: review — implemented and verified locally; committed, not pushed
Authorized: 2026-11-10. After the filter audit (`33-filter-fixes.md`) the user
asked for the menu to be filled where it was short and for the work, images
included, to be done without her producing them.
Branch: `claude/menu-134`, from `claude/filter-fixes` (`6be9929`). The branch
name records the first estimate of 134; the result is 130.

## Problem

With the main protein defined as the largest protein contributor, nine of the
36 staple and main-protein pairs had no recipe and five had one.

| Before | Chicken | Egg | Fish | Beans | Beef/pork/lamb | Dairy |
| --- | --- | --- | --- | --- | --- | --- |
| Rice | 14 | 4 | 11 | 10 | 6 | 0 |
| Noodles | 3 | 3 | 0 | 7 | 4 | 0 |
| Bread | 8 | 4 | 1 | 2 | 0 | 3 |
| Potato | 4 | 1 | 3 | 1 | 0 | 0 |
| Other grains | 2 | 1 | 1 | 3 | 0 | 3 |
| No staple | 2 | 0 | 4 | 2 | 1 | 0 |

## Scope

Add 22 recipes, version `mealhatch-recipes130-2026-11-10-v1`, each with edible
weights in the source state, bilingual names, notes and four preparation
steps:

- Noodles: salmon and spinach pasta; shrimp, bok choy and shiitake rice-noodle
  soup; cod, napa cabbage and carrot egg-noodle soup; mozzarella, tomato and
  zucchini pasta; cottage cheese, spinach and pea pasta.
- Bread: beef, tomato and romaine sandwich; pork, cabbage and carrot bread
  plate; salmon, cucumber and avocado bread plate; shrimp, romaine and tomato
  sandwich.
- Potato: beef, baked potato and green beans; lamb, sweet potato and kale;
  pork, potato and cabbage stew; cottage cheese and broccoli baked potato;
  egg, sweet potato and spinach.
- Other grains: beef, quinoa and red pepper; lamb, quinoa and zucchini;
  salmon, quinoa and kale.
- No staple: egg, broccoli and mushroom plate; egg, tomato and spinach soup;
  Greek yogurt, banana and blueberry bowl; cottage cheese, tomato and cucumber
  plate; beef, broccoli and shiitake plate.

| After | Chicken | Egg | Fish | Beans | Beef/pork/lamb | Dairy |
| --- | --- | --- | --- | --- | --- | --- |
| Rice | 14 | 4 | 11 | 10 | 6 | 0 |
| Noodles | 3 | 3 | 3 | 7 | 4 | 2 |
| Bread | 8 | 4 | 3 | 2 | 2 | 3 |
| Potato | 4 | 2 | 3 | 1 | 3 | 1 |
| Other grains | 2 | 1 | 2 | 3 | 2 | 3 |
| No staple | 2 | 2 | 4 | 2 | 2 | 2 |

Rice with dairy is left empty on purpose: cheese or yogurt as the main protein
of a rice meal is not an everyday dish in this collection's style.

Only source foods already used by scored recipes are used. No source, nutrient
value, model assessment or processing rule was added, and the 108 earlier
recipes are byte-for-byte unchanged in `recipes.json`.

Regular portions span 324 to 724.5 g and 344 to 505 kcal (earlier recipes:
314.5 to 572.75 kcal). Nutrition levels of the 22: two at the higher level,
fourteen in the middle, six lower. All 130: 30, 69, 31.

### Decisions

- **Tofu is not used.** The retained tofu record has a food definition but its
  free-sugars basis is "unresolved" and its FVNS eligibility is undecided in
  `model-assessments.json`, so the importer rejects it for scored recipes.
  Resolving that is a source review, not something to assume. Four tofu
  dishes in the first proposal were dropped; the total is 130, not 134.
- **Shrimp sodium.** The shrimp source carries about 950 mg sodium per 100 g.
  The two new shrimp recipes use 90 to 100 g and no added salt (1,031 and
  1,162 mg), below the highest earlier recipe (1,402 mg).
- **Salmon pasta** contains salmon, pasta and spinach only, matching the
  illustration that was generated first as a style test.

### Images

The 22 illustrations were generated with Figma AI image generation (model
gpt-image-2.5-flare) from prompts in the wording used for the first 108, at
1280 × 960, and prepared with `scripts/prepare-recipe-images.mjs` (480 and 960
px WebP, quality 0.84). Each asset's review note in
`docs/recipe-images/manifest.json` names the tool and what was checked. The
first 108 images and their files are unchanged.

Reviewed on four contact sheets against the ingredient lists: no unlisted
food. Recorded exceptions: fine seasoning specks on three salmon fillets, a
slightly pink centre on one lamb plate, and one egg (two halves) shown on the
egg and sweet-potato plate where the standard portion is about two eggs.

Generating the images used the user's Figma AI credits (22 images). A draft
file "MealHatch recipe image test" was created in her Figma drafts to hold
them.

### Counts

Checks that assert the size of the collection now expect 130. Current-state
statements in `README.md`, `index.html`, the nutrition and image docs, the
Product Hunt draft and the social preview say 130; the social preview was
re-rendered. Historical plans and dated measurements keep 108.

## Verification

- `node scripts/import-nutrition-data.mjs` regenerated `src/nutrition-data.ts`:
  consistent raw or cooked FVNS basis in every recipe, oil and salt
  declarations equal to the ingredients, complete model inputs.
- `npm run verify` passed with 130 recipes, including source-to-catalog safety
  parity, the independent ranking oracle, exactly one main-protein group per
  recipe, at least three matches for every group, 260 image files matching
  their recorded hashes and 130 unique images.
- `scripts/verify-recipe-library-ui.mjs` (complete run) passed against the
  local development server: every recipe's details, three portions,
  ingredient labels and steps in both languages.
- In-app browser: new recipes appear with their images for the pairs they
  fill; console clean.

Not verified: cooking the recipes; a physical phone. The recipes follow the
collection's existing convention of assembling prepared, cooked ingredients.

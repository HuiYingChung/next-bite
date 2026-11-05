# Twelve-recipe nutrition pilot

The separate [food and drink library](./food-library.md) now provides broad
source lookup and ingredient-level composition scores. The twelve-recipe
calculations documented here retain their explicit formulation assumptions.

For the distinction between scientific evidence, authored portion choices and
the selection policy, see [the decision policy](./decision-policy.md). The
[model-input provenance](./model-input-provenance.md) documents the UK NPM 2018
inputs, their derivations and the revised recipes.

This pilot provides reproducible estimates for **twelve explicitly defined meal
ideas**. It does not validate the other 88 catalog templates, estimate an
arbitrary restaurant meal, or assess a person's nutrient adequacy. The recipe
formulations and portion choices are MealHatch product decisions. USDA supplies
the ingredient composition records, not these recipes or recommendations.

## Source and license

- Provider: U.S. Department of Agriculture, Agricultural Research Service,
  [FoodData Central](https://fdc.nal.usda.gov/).
- Dataset: SR Legacy, **April 2018** final release, as identified on the
  [official download page](https://fdc.nal.usda.gov/download-datasets/).
- The selected records have a separate FoodData Central publication date of
  **2019-04-01**. Neither that date nor this retrieval date is a new analytical
  release of SR Legacy.
- Retrieved: **2026-11-04T17:24:13.340Z**, through one small official Food Details
  batch, using the public demonstration facility documented in the
  [USDA API guide](https://fdc.nal.usda.gov/api-guide/). No account was created and
  no private API key was used or saved.
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), verified
  against USDA's API guide on 2026-11-04. USDA describes its FoodData Central data
  as public domain and requests source attribution.
- Suggested attribution: U.S. Department of Agriculture, Agricultural Research
  Service. FoodData Central, SR Legacy (April 2018). Selected records published
  April 1, 2019; retrieved November 4, 2026. Recipes and calculations: MealHatch.

The original seventeen-record JSON is retained unchanged in
`data/nutrition/usda-sr-legacy-2026-11-04.json` (568,341 bytes). Its SHA-256 is:

```text
f10761e7d36d53581ddff24e358dedc6ffc563e331c7695b522dda079c3b0e42
```

`source-manifest.json` records the release, retrieval, license, record IDs and
hash. `food-definitions.json` fixes food identity, preparation state and bilingual
display labels. `recipes.json` contains the reviewed product formulations.
Chinese labels are MealHatch translations; the untouched USDA descriptions stay
in the source records and generated application data.

A separate official one-record supplement, retrieved
**2026-11-04T20:24:55.3232573Z**, supplies FDC **171971**. It is retained in
`data/nutrition/usda-sr-legacy-shrimp-171971-2026-11-04.json` (47,341 bytes),
with SHA-256
`4cd11c19a62e9a6c25d0b92c9accedbcc6d6424266760e24ebdcd324ab86f37b`.
`source-supplement-manifest.json` records its separate retrieval and provenance.
It has the same SR Legacy release, record publication date and CC0 license.
There are now **18 retained source records, 16 used by the current recipes**.
The original tofu (174291) and shrimp (175180) records remain available for
historical identity/provenance; current recipes do not use them.

## Ingredient records

All nutrient values use the source record's **100 g edible portion** basis.
Preparation state is part of food identity, not a display preference.

| FDC ID | Exact source description | Weight used in recipes |
| --- | --- | --- |
| 168878 | Rice, white, long-grain, regular, enriched, cooked | Cooked rice |
| 171477 | Chicken, broilers or fryers, breast, meat only, cooked, roasted | Roasted edible meat, no skin/bone |
| 175168 | Fish, salmon, Atlantic, farmed, cooked, dry heat | Cooked edible salmon |
| 174291 | Tofu, hard, prepared with nigari | Retained historical source, not used by current recipes |
| 173424 | Egg, whole, cooked, hard-boiled | Cooked egg without shell |
| 170457 | Tomatoes, red, ripe, raw, year round average | Raw edible tomato |
| 169967 | Broccoli, cooked, boiled, drained, without salt | Cooked, drained broccoli |
| 173735 | Beans, black, mature seeds, cooked, boiled, without salt | Cooked black turtle beans (*Phaseolus vulgaris*), not black soybeans |
| 168483 | Sweet potato, cooked, baked in skin, flesh, without salt | Cooked flesh; skin excluded |
| 169238 | Kale, cooked, boiled, drained, without salt | Cooked, drained kale |
| 168917 | Quinoa, cooked | Cooked quinoa |
| 168409 | Cucumber, with peel, raw | Raw cucumber, peel retained |
| 175180 | Crustaceans, shrimp, cooked | Retained historical source with missing fiber; not used by current recipes |
| 171413 | Oil, olive, salad or cooking | All listed oil consumed |
| 173468 | Salt, table | All listed salt consumed |
| 173647 | Beverages, water, tap, drinking | Water retained and consumed |
| 168411 | Edamame, frozen, prepared | Prepared edible beans, no pods |
| 171971 | Crustaceans, shrimp, mixed species, cooked, moist heat (may contain additives to retain moisture) | Cooked edible shrimp, no shell; may contain moisture-retention additives |

Every generated food includes its official record URL, FDC ID, description,
publication date, source ID, localized name, preparation state and nullable
nutrients. These records include analytical, calculated and other derivations;
they must not all be described as independently lab-measured values. Original
derivation codes, source details and household measures remain in the snapshot.

FDC 173735 identifies *Phaseolus vulgaris* and calls it a black turtle bean in
its source attributes. Its Chinese display name is **黑菜豆（非黑大豆）**. This
distinguishes it from *Glycine max*, the black soybean commonly called 黑豆 in
Taiwan; see the [Ministry of Agriculture bilingual glossary](https://www.moa.gov.tw/theme_list.php?sub_theme=common_agri&theme=dictionary).
The source record is a common bean, so its recipe is not excluded as soy on
that ingredient's account. A black-soybean substitution would change both the
ingredient identity and its nutrition/allergen assumptions and is not covered
by this recipe. The wording correction does not change the archived USDA bytes,
food ID, ingredient weights or nutrient values. The recipe version remains
`nextbite-pilot-2026-11-04-v1` because the defined food and formulation are
unchanged; an actual ingredient or quantity change requires a new version.

## Calculation and unknowns

Use each ingredient's listed final-state edible mass:

```text
ingredient nutrient = source nutrient per 100 g × ingredient grams / 100
recipe nutrient = sum of ingredient nutrients
selected portion = every ingredient mass × product portion multiplier
```

No additional raw-to-cooked yield or nutrient-retention factor is applied to a
record already matched to its cooked state. No liquid-volume-to-gram conversion
is assumed. Recipe mass is the sum of the final ingredient weights; this is not
a measured raw-ingredient cooking yield. For the congee variant, 120 g cooked
rice plus retained water is brought to a final 360 g before adding the separately
weighed sides. Evaporation is replenished to that specified final weight and all
liquid is consumed. It is a recipe calculation, not a direct analysis of congee.

These boundaries follow the distinction between edible weights, cooking states,
recipe yields and retention factors in the
[FAO recipe-calculation procedure](https://www.fao.org/4/y4705e/y4705e23.htm).

- Energy: USDA nutrient ID **1008**, kcal, and **1062**, kJ; import each reported
  value independently. Do not replace them with a forced 4/4/9 calculation or
  overwrite reported kJ by converting rounded kcal.
- Protein **1003**, carbohydrate by difference **1005**, total fat **1004**,
  saturated fatty acids **1258**, dietary fiber **1079**, added sugars **1235**:
  grams. Sodium **1093**: milligrams.
- A source numeric zero stays zero. An absent/null value stays unknown. The
  importer never converts a blank string to zero.
- None of the eighteen retained SR Legacy records supplies added sugars.
  Consequently all retained foods and all twelve recipe totals have **unknown added sugars**,
  even though these formulations add no separate sweetener. Total sugars are not
  substituted for added sugars.
- The original shrimp 175180 record still has unknown fiber. Version 2 of the
  shrimp recipe uses **all values** from 171971, including its reported fiber
  zero, rather than borrowing that zero alone. Its sodium is **947 mg/100 g**,
  compared with 111 mg/100 g in 175180. The new recipe is a different defined
  ingredient match, not a correction to or completion of the original record.
- Free sugars are a separate **derived model input**, not a replacement for
  missing USDA added sugars. Zero applies only to the explicit plain-ingredient
  recipe specification excluding added sugars, sugar-containing marinades or
  additives, and fruit/vegetable puree, juice or paste. See the complete
  [derivation and AOAC qualification](./model-input-provenance.md).
- Missing values should remain visible and should not earn a low-sugar,
  low-sodium or other favorable ranking through a false zero. See the
  [FAO data-value conventions](https://www.fao.org/4/y4705e/y4705E14.htm).

## Recipe and portion interpretation

The twelve meal IDs retain the catalog's conservative structured exclusions.
Current pilot labels and ingredient lists describe the actual versioned recipe;
an old catalog ID or its generic title is not a current ingredient declaration.
Oil, salt, water and vegetable sides are shown rather than silently inferred.

The regular recipe is the documented gram specification. Small is **0.75×** and
large is **1.25×**, applied to **every** ingredient, including oil/salt/water.
These are product choices, not official serving sizes or individualized dietary
targets. Eight unchanged formulations retain `nextbite-pilot-2026-11-04-v1`.
The three edamame replacements and shrimp replacement use
`nextbite-pilot-2026-11-04-v2`. Saved plans retain their original version and
portion; an unavailable older recipe must not acquire a current numeric estimate.

- Tomato-and-egg rice is explicitly a hard-boiled egg plus raw tomato version,
  not an estimate of stir-fried tomato eggs.
- The three former tofu variants now explicitly use **cooked shelled edamame**.
  The egg bowl also uses cooked drained broccoli instead of raw cucumber, so
  qualifying FVNS ingredients have a consistent cooked-weight basis. Tofu's
  free-sugar/FVNS interpretation was not silently assumed complete. Cooled
  cooked-food variants follow the prepared products' storage/handling instructions.
- The shrimp version uses moist-heat cooked mixed-species shrimp that may
  contain moisture-retention additives. Its recipe additionally requires no
  sugar-containing marinade or additives; the USDA record itself does not
  establish a manufacturer's complete ingredient list. All source nutrient
  values, including its substantially higher sodium, are retained.
- The `costco-salmon-sweet-potato-veg` identifier is a legacy catalog identifier.
  Its visible pilot label is generic and its formulation is **not a verified
  Costco product or restaurant meal**.
- Sauces, marinades and sweeteners are explicitly **0 g included** in this
  pilot's formulations. This declaration does not establish that a restaurant
  version, a packaged substitute, or a chosen source record has zero added sugar.
- `prepMinutes`, cuisine, temperature and staple are editorial product metadata.
  Time estimates describe assembly **from the prepared ingredients shown** and
  exclude cooking from raw ingredients. They are not USDA findings.
- Real food varies by product, recipe and preparation. The displayed quantities
  support a reproducible estimate, not a measured exact intake or medical claim.

## Offline regeneration and review

```text
node scripts/import-nutrition-data.mjs
node scripts/import-nutrition-data.mjs --check
```

Both commands are offline. They validate the pinned raw bytes, exact food
identity, dataset/publication dates, raw/cooked state, nutrient identifiers and
units, finite values, ingredient references, positive grams, and oil/salt/sauce
declarations. The check mode also requires the generated
`src/nutrition-data.ts` to match those inputs exactly. Raw snapshots are not
imported by the application bundle. Runtime nutrition requests: **zero**.

The importer also requires a model assessment for every retained food and
complete model inputs for every active recipe ingredient. It checks that FVNS
ingredients within each recipe use one raw/cooked state, and verifies an actual
source total-sugars zero before using that specific derivation. The model
assessment file records reviewed classifications separately from the raw data.

For an update, obtain a new, separately named official snapshot; record its
source/release/retrieval/hash; review identity and preparation matches; inspect
nutrient and missing-value differences; revise recipe versions only when needed;
regenerate; run source, calculation, safety, ranking and UI checks. Do not edit
generated nutrient values by hand or silently overwrite the existing snapshot.

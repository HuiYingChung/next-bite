# One hundred eight standardized recipes

The separate [food and drink library](./food-library.md) now provides broad
source lookup and ingredient-level composition scores. The 130-recipe
calculations documented here retain their explicit formulation assumptions.

For the distinction between scientific evidence, authored portion choices and
the selection policy, see [the decision policy](./decision-policy.md). The
[model-input provenance](./model-input-provenance.md) documents the UK NPM 2018
inputs, their derivations and the revised recipes.

This collection provides reproducible estimates for **130 explicitly defined meal
formulations**. The four unsupported legacy dumpling ideas are no longer in
the current recommendation collection. It does not estimate an
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
  April 1, 2019; retrieved November 4–6, 2026 (UTC). Recipes and calculations: MealHatch.

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
A sixteen-record expansion was retrieved **2026-11-05T23:09:56.2557636Z**.
`source-expansion-manifest.json` identifies its record IDs and original full
API responses in `usda-sr-legacy-expansion-2026-11-05.json`, with SHA-256:

```text
f7755b176f019b17d0894867c92032d85c767f6c702d1a08905742c9f6409595
```

A further fifteen-record expansion was retrieved **2026-11-06T05:18:13.6597447Z**
(November 5 in the project's local timezone). Its manifest is
`source-expansion-36-manifest.json`; the full responses are retained in
`usda-sr-legacy-expansion-36-2026-11-05.json` (428,610 bytes), with SHA-256:

```text
383f57acce0740f295b6f5c51940aa5198c2c234e235a3d2a7a6d3a5ad3330c3
```

The four-record expansion for 48 recipes was retrieved
**2026-11-06T18:02:06.2504411Z**. Its manifest is
`source-expansion-48-manifest.json`; full responses are retained in
`usda-sr-legacy-expansion-48-2026-11-06.json` (124,782 bytes), with SHA-256:

```text
40b0cc6c7df114918446a0ea0dd0ceb0e67076e91b45524866ca4f6e5651c790
```

The five-record expansion for 60 recipes was retrieved
**2026-11-06T18:21:35.1014883Z**. Its manifest is
`source-expansion-60-manifest.json`; full responses are retained in
`usda-sr-legacy-expansion-60-2026-11-06.json` (146,139 bytes), with SHA-256:

```text
63b6ed272fb6c998c404edbd2d8e3e08292534908be0b1f534b6272dd531ae80
```

The nine-record expansion for 72 recipes was retrieved
**2026-11-06T20:29:06.6574389Z**. Its manifest is
`source-expansion-72-manifest.json`; full responses are retained in
`usda-sr-legacy-expansion-72-2026-11-06.json` (243,184 bytes), with SHA-256:

```text
33ddf9a629c02d12931965a4b39bac3b5b3dfdc24ec0c45b9ed5e7450ea366e2
```

The eight-record expansion for 84 recipes was retrieved
**2026-11-06T20:43:14.8815644Z**. Its manifest is
`source-expansion-84-manifest.json`; full responses are retained in
`usda-sr-legacy-expansion-84-2026-11-06.json` (191,241 bytes), with SHA-256:

```text
d095d6f5797d8a502a44a501045db2deeccfd830cbf352ba2f032a95b5730970
```

The one-record expansion for 96 recipes was retrieved
**2026-11-06T20:59:39.5285851Z**. Its manifest is
`source-expansion-96-manifest.json`; the full response is retained in
`usda-sr-legacy-expansion-96-2026-11-06.json` (43,098 bytes), with SHA-256:

```text
f0f2b1f3264f845017c9184971421d61182d8c0597ce19d473144f1f7a1913a9
```

There are now **76 retained source records, 73 used by the current recipes**.
The original tofu (174291) and shrimp (175180) records remain available for
historical identity/provenance; current recipes do not use them.
The newly reviewed soymilk (173768) is also retained without use: its FVNS
fraction is unresolved, so it cannot enter a complete scored recipe.

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

The expansion adds 168914 (cooked rice noodles), 169732 (cooked egg noodles),
168910 (cooked whole-wheat pasta), 168649 (grilled lean top-round beef), 168463
(boiled drained spinach), 170394 (boiled drained carrots), 169247 (raw romaine),
171496 (roasted turkey breast), 174091 (whole-wheat French/Vienna bread), 170093
(baked potato with skin), 172421 (boiled lentils), 170894 (plain nonfat Greek
yogurt), 173905 (oats cooked with water), 171711 (raw blueberries), 169640
(honey), and 167747 (raw lemon juice). Exact USDA descriptions, bilingual labels,
preparation states and ingredient avoidance declarations are in
`data/nutrition/food-definitions.json` and the visible recipe source tables.
The generic bread source does not establish the absence of dairy, egg, soy,
sesame, peanuts or tree nuts. Those declarations remain **unknown**, so selecting
any corresponding avoid excludes its recipes. This does not claim those
ingredients are present or establish cross-contact safety.

The 36-recipe expansion adds 169193 (cooked ground-pork crumbles), 171956
(Atlantic cod cooked by dry heat), 173757 (boiled chickpeas), 175203 (boiled
white beans), 172182 (low-fat 2% milkfat cottage cheese), 173768 (light,
unsweetened, fortified original/vanilla soymilk), 170391 (boiled drained pak
choi), 169980 (cooked napa cabbage), 169252 (boiled drained white mushrooms),
169976 (boiled drained cabbage), 170110 (boiled drained red sweet pepper),
170001 (boiled drained onion), 169292 (boiled drained zucchini with skin),
170050 (cooked red tomato) and 173944 (raw banana). The soymilk's incomplete
ingredient list likewise leaves Dairy, Egg, Wheat / gluten, Sesame, Peanuts
and Tree nuts unresolved; Soy is a known ingredient. Its data and unresolved
classification are retained for provenance; the new breakfast instead uses
water-cooked oats, boiled egg and banana. These are formulation checks, not
a guarantee about packaged products or cross-contact.

The 48-recipe expansion adds only four new foods: **171705** (raw avocado,
all commercial varieties), **169999** (yellow sweetcorn, boiled and drained
without salt), **169141** (green snap beans, boiled and drained without salt)
and **168394** (bitter-gourd pods, boiled and drained without salt). Weigh only
edible avocado flesh, kernels off the cob and prepared edible vegetable parts.
Other new formulations reuse the existing reviewed source records.

The 60-recipe expansion adds five exact ingredient sources: **171534**
(grilled skinless chicken breast), **171986** (light tuna canned in water,
without salt, drained solids), **174314** (roasted lean lamb leg), **170416**
(fresh parsley) and **170005** (raw spring onions/scallions). The new recipes
use weighed parsley and scallion where listed; they do not assume an
unreviewed nutrient-model classification for ginger, basil or cilantro.
The exact source description `Parsley, fresh` is reviewed as an intact raw
herb. The importer permits this equivalence only for FDC 170416 with that
description; it does not treat any food called "fresh" as raw.
The canned tuna's `Processed food` avoidance tag describes its explicit canned
format under the app's product rules, not a NOVA or health classification.

The 72-recipe expansion adds **170152** (toasted unsalted sesame kernels),
**173928** (peeled boiled apple), **167762** (raw strawberries), **168437**
(cooked unsalted shiitake), **169230** (raw garlic), **170848** (hard Parmesan),
**170844** (Monterey cheese), **170845** (whole-milk mozzarella) and **171651**
(the historical QUAKER Puffed Rice record). Sesame is a known Sesame conflict;
the three cheeses are Dairy conflicts. The cereal's unresolved manufacturer
ingredient declarations remain unknown, and its historical estimate does not
establish the current brand formulation. Bread variants are named as bread;
wholewheat pasta variants are named as pasta/noodles, not udon or soba. An
incomplete cooked-soba record and an unspecified tortilla formulation were
not used to fill gaps or manufacture a complete score.

Two hummus recipes mark the cooked chickpeas as puréed. Their free-sugar input
is derived separately from the exact source total sugar and the official
hummus example. The whole-food nutrient record and all prior intact-chickpea
recipes are unchanged. See [preparation provenance](./model-input-provenance.md)
for the derivation, the sesame exception and the boiled-apple source-state
ambiguity. Source details expose the selected-portion sugar contribution and
citations beside the affected ingredient.

The 84-recipe expansion adds **174271** (mature boiled soybeans), **168426**
(boiled drained leek bulb/lower leaf), **169229** (boiled drained eggplant),
**169989** (boiled drained celery), **170058** (boiled drained turnip), **170397**
(boiled drained cauliflower), **170420** (boiled drained green peas) and
**170932** (red/cayenne pepper spice, used as declared plain powder).
All seven whole beans/vegetables are unsalted cooked sources. They are weighed
after cooking/draining; their mass is not a raw purchase weight. Mature whole
soybeans are not tofu, soy drink or edamame. Cayenne is weighed as supplied;
its reviewed powder specification is documented in [model provenance](./model-input-provenance.md).
Soy, Eggplant, Celery and Spicy food ingredient exclusions remain explicit.

The new soups, rice porridges, stew and bowls have ingredient-specific names.
Whole-bean versions do not estimate tofu or miso, and the named chicken stew
does not estimate an unspecified curry product. Porridge and soup instructions
retain all listed liquid and restore evaporated water to the documented mass.
No new model or preparation rule is needed for these formulations.

The 96-recipe expansion adds **171325**, explicitly described as "Spices,
garlic powder". The recipe specification uses plain powder, without salt,
sugar or other ingredients added. Its source total sugars support the separate
free-sugar derivation; powdered garlic is excluded from the FVNS numerator.
Earlier raw garlic retains its original intact-ingredient classification.
See [model provenance](./model-input-provenance.md) for the rule and the
unresolved ginger classification that was left out of this expansion.

The 96-recipe iteration's twelve additions cover whole-soybean vegetable soup; egg/spinach/corn
egg-noodle soup; garlic chicken/soybean/cabbage rice; white-bean/shiitake/leek
wholewheat noodle soup; egg/corn/celery soup with bread; scallion/egg/raw-vegetable
rice; lentil/carrot/pepper cold wholewheat noodles; chicken/turnip/leek rice soup;
chicken/cauliflower/pea egg-noodle soup; sesame-garlic chicken/shiitake/green-bean
rice; spicy shrimp/soybean/napa-cabbage soup with rice; and whole-soybean/cabbage/
shiitake rice. Visible labels describe these actual formulations. Stable catalog
IDs do not imply that tofu, miso, soba, dumplings or three-cup sauce is present.
The remaining four dumpling concepts are retired from the current catalog.
Existing saved plans retain their original descriptions, without invented
ingredient weights or composition scores.

The 108-recipe expansion reuses the same 76 retained ingredient records and
added twelve matching catalog entries. The subsequent consolidation uses all
108 defined recipes as one current meal catalog, replacing the parallel
112-idea collection. The original idea objects remain only for historical plan
compatibility and diagnostics. All 108 formulations and their numeric inputs
remain unchanged. On 2026-11-10 twenty-two recipes were added to fill staple
and main-protein combinations that had none or one, version
`mealhatch-recipes130-2026-11-10-v1`, for 130 in all. They use only the
retained source records already used by scored recipes; no source, nutrient
value, model assessment or processing rule was added, and the earlier 108
formulations are unchanged. Tofu was not used: its free-sugars and FVNS
classification remain unresolved in the retained source review. Current names, ingredients and avoidance metadata derive from
the actual recipe sources and preparation states, including unresolved bread
declarations. They no longer inherit ingredients from unrelated old idea names.

The four unresolved IDs are `ready-made-soup-dumplings-veg`,
`chicken-cabbage-dumpling-soup`, `frozen-dumplings-bok-choy` and
`pork-chive-dumpling-soup-light`. The reviewed USDA wrapper record 172802 lacks
total sugars and a cooked-weight basis. Generic frozen/steamed dumplings and
TFDA cooked dumplings lack the ingredient proportions needed to establish
FVNS and free sugars for these specific recipes. The
[FAO recipe-calculation method](https://www.fao.org/4/y4705e/y4705e23.htm)
requires appropriate cooked yield and nutrient-retention treatment; raw dough
weights cannot simply be relabeled as cooked portions. These concepts can
return only after a defined preparation and complete reviewed evidence exist.

The new recipes are salmon/lentil/spinach; turkey/sweet-potato/pepper;
lamb/lentil/carrot; pork/zucchini/cooked-tomato rice; cod/white-bean/leek soup;
chickpea/quinoa/cauliflower with sesame; black-bean/corn/pepper baked potato;
egg/edamame/bok-choy rice noodles; tuna/tomato/cucumber sandwich;
mozzarella/avocado/tomato bread plate; cottage-cheese/banana/oatmeal with honey;
and Parmesan/lentil/spinach pasta. Fish/legume bowls and soup with no separate
grain or potato retain all carbohydrates in their ingredient totals. The honey
and garlic-powder recipes reuse existing nonzero free-sugar derivations; no new
model rule, source assessment or archive is introduced.

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
- None of the 76 retained SR Legacy records supplies added sugars.
  Consequently all retained foods and all 130 recipe totals have **unknown added sugars**,
  including the recipe with explicitly weighed honey. Total sugars are not
  substituted for added sugars.
- The original shrimp 175180 record still has unknown fiber. Version 2 of the
  shrimp recipe uses **all values** from 171971, including its reported fiber
  zero, rather than borrowing that zero alone. Its sodium is **947 mg/100 g**,
  compared with 111 mg/100 g in 175180. The new recipe is a different defined
  ingredient match, not a correction to or completion of the original record.
- Free sugars are a separate **derived model input**, not a replacement for
  missing USDA added sugars. Plain-ingredient zero assumptions apply only to
  ingredients explicitly excluding free-sugar sources. Honey, lemon juice and
  the specified nondairy soymilk instead use their source total sugars
  (82.12, 2.52 and 0.41 g/100 g respectively) as free sugars,
  according to their reviewed ingredient classifications. Bread's zero comes
  from an actual total-sugar zero in the specific source, not a claim about all
  bread. The importer requires source values, units and cited bilingual
  justification for the nonzero derivation. See the complete
  [derivation and AOAC qualification](./model-input-provenance.md).
- Missing values should remain visible and should not earn a low-sugar,
  low-sodium or other favorable ranking through a false zero. See the
  [FAO data-value conventions](https://www.fao.org/4/y4705e/y4705E14.htm).

## Recipe and portion interpretation

The first 96 meal IDs retain the catalog's conservative structured exclusions.
Current pilot labels and ingredient lists describe the actual versioned recipe;
an old catalog ID or its generic title is not a current ingredient declaration.
Oil, salt, water and vegetable sides are shown rather than silently inferred.
This inherited gate can exclude more than the detailed ingredient list alone:
the water-cooked oats/egg/banana formulation omits soy, but its original
soy-milk idea still has a Soy exclusion. That item remains excluded for a
Soy avoid. This is a known conservative limitation, not evidence that the
listed oats, egg or banana contains soy; this expansion does not relax the gate.
New detailed formulations inherit the same gate: the tuna rice bowl can be
excluded by the old idea's wheat/egg declarations, the plain lamb bowl by its
unknown beef declaration, the warm shrimp-rice assembly by its fried-food
declaration, and the parsley soup by its possible-cilantro declaration.
These are retained conservative catalog constraints, not declarations that
the actual listed ingredients contain those items.

The regular recipe is the documented gram specification. Small is **0.75×** and
large is **1.25×**, applied to **every** ingredient, including oil/salt/water.
These are product choices, not official serving sizes or individualized dietary
targets. Eight unchanged formulations retain `nextbite-pilot-2026-11-04-v1`.
The three edamame replacements and shrimp replacement use
`nextbite-pilot-2026-11-04-v2`. Saved plans retain their original version and
portion; an unavailable older recipe must not acquire a current numeric estimate.
Recipes 13–24 retain `mealhatch-recipes-2026-11-05-v1` and recipes 25–36 retain
`mealhatch-recipes36-2026-11-05-v1`. Recipes 37–48 retain
`mealhatch-recipes48-2026-11-06-v1`; recipes 49–60 retain
`mealhatch-recipes60-2026-11-06-v1`; recipes 61–72 retain
`mealhatch-recipes72-2026-11-06-v1`; recipes 73–84 retain
`mealhatch-recipes84-2026-11-06-v1`; recipes 85–96 retain
`mealhatch-recipes96-2026-11-06-v1`. The twelve newest formulations use
`mealhatch-recipes108-2026-11-06-v1`. Expanding the collection does not change
the preceding 96 formulations, versions or ingredient weights.
All 130 are inspectable through the recipe library, including excluded recipes.
Only eligible recipes may be selected; browsing does not change the top-three
ranking or override an avoidance or required meal condition.

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
- The original 12 formulations include no separate sauce or sweetener. New
  formulations explicitly weigh honey and lemon juice where used. Sauce mass
  must reconcile with sourced ingredients carrying the sauce role; oil and
  salt are reconciled separately. Unlisted dressings and substitutions are not
  covered by these estimates.
- The two proposed wrap variants use explicitly named whole-wheat French-bread
  sandwiches because the assessed tortilla records did not support the intended
  ready-to-eat formulation and complete free-sugar derivation. Their legacy idea
  IDs do not change what the current ingredient list actually contains.
- The two cod recipes use dry-heat cooked fish, not an unsupported steamed-fish
  estimate. The pepper/onion dishes use the documented boiled vegetables,
  and the cottage-cheese plate uses untoasted bread. Cooked tomato is an
  intact cooked ingredient, not an unspecified sauce or concentrated puree.
  Current names and instructions describe these actual formulations.
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
Source-backed nonzero free-sugar derivations are validated separately; missing,
blank, duplicate, negative or incorrectly labelled source values are rejected.
Recipe-level purée metadata is generated from its reviewed source, never
accepted as a handwritten numeric override. The runtime excludes scoring when
the required preparation evidence is missing or malformed.

For an update, obtain a new, separately named official snapshot; record its
source/release/retrieval/hash; review identity and preparation matches; inspect
nutrient and missing-value differences; revise recipe versions only when needed;
regenerate; run source, calculation, safety, ranking and UI checks. Do not edit
generated nutrient values by hand or silently overwrite the existing snapshot.

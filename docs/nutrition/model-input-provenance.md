# UK NPM 2018 input provenance

Reviewed 2026-11-06. This file documents the inputs to the published UK model,
not validation of MealHatch's separate energy/preference combination or a
personal dietary prescription. [The UK publication](https://www.gov.uk/government/publications/nutrient-profiling-model-2018)
was published on 27 January 2026 for reference and says the 2018 model has not
yet been applied to policy. The model classifies a food's composition per 100 g;
it does not estimate an individual's calorie requirement or nutritional adequacy.

## Source values and conversions

The [technical guide](https://www.gov.uk/government/publications/nutrient-profiling-model-2018/nutrient-profiling-model-2018-technical-guidance)
requires energy in kJ, saturated fat, free sugars, salt, protein, AOAC dietary
fiber and the proportion of fruit, vegetables, nuts and seeds (FVNS).

- Energy uses USDA **1062 kJ**, independently of reported **1008 kcal**.
- Saturated fat **1258**, protein **1003** and total dietary fiber **1079** use
  the archived USDA gram values in the matching preparation state.
- Salt equivalent is total sodium **1093** in mg multiplied by **2.5 / 1000**,
  including naturally occurring sodium and added salt. This follows the
  [UK nutrition-labelling guidance](https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/595961/Nutrition_Technical_Guidance.pdf).
  It is not just the separately added table-salt mass.
- Each ingredient contributes its source amount times edible grams / 100.
  The complete recipe is divided by its final edible mass and multiplied by
  100 to give the model's per-100-g inputs. Retained water, oil and salt belong
  in the denominator. A uniform portion multiplier does not change these
  composition ratios; portion energy remains a separate fact.

## Free sugars are derived, not filled missing values

All **76** USDA added-sugars values remain null. That field is neither total
sugars nor the UK definition of free sugars. `model-assessments.json` records
the separate derivation used for the explicitly defined recipe ingredients.

For ingredients using the plain-food derivation, the specification requires no
added sugars, sugar-containing marinades/additives, or fruit/vegetable puree,
juice or paste. Under the technical guide's food decision tree, this declared
formulation has no free-sugar source. Its model value is therefore **derived
0 g**, not a USDA measurement or a blanket statement about restaurant meals,
unspecified products, or the unused historical foods.

Oil, salt, water and the new shrimp source also report total sugars zero.
The importer verifies that source zero for the `reported-total-sugars-zero`
assessment. This supports a zero upper bound for free sugars in that source
estimate; it does not reveal the manufacturer's full ingredient list. In
particular, the shrimp recipe still excludes sugar-containing additives as
an explicit ingredient requirement. A substitute with a sugary glaze or
unknown sweetened marinade does not meet the recipe specification and cannot
inherit this score.

The expansion uses the actual zero total-sugar value in FDC **174091** for the
specified whole-wheat French/Vienna bread. This is a source estimate, not a
claim that all whole-wheat breads or tortillas contain no free sugars. The
two proposed wrap formulations are explicitly named bread sandwiches instead;
unresolved tortilla values were not filled with zero.

Four source-food assessments use **nonzero** derivations. The technical guide includes
all sugars in honey and fruit juice in free sugars. FDC **169640** supplies
**82.12 g total sugars/100 g** for honey; **167747** supplies **2.52 g/100 g** for
raw lemon juice. The importer reads these exact source values for the reviewed
`reported-total-sugars-as-free` classification. Five grams of honey therefore
contributes **4.106 g free sugars** to the standard oat/yogurt recipe. Whole
blueberry sugars and naturally occurring lactose in plain yogurt are not
treated as free sugars. Source added-sugar fields remain unknown throughout.

FDC **173768** is the specified light, unsweetened, fortified soymilk, with
**0.41 g total sugars/100 g**. The guide's drinks decision tree treats all
sugars in a drink containing no dairy as free sugars; its ingredient method
also identifies sugars in dairy alternatives. The specified nondairy soymilk
therefore uses the same `reported-total-sugars-as-free` derivation. Unsweetened
does not mean sugar-free. However, the official definitions do not resolve
this beverage's qualifying soybean fraction. That FVNS input remains
**unknown**, not zero, and the food is retained without use in current
recipes. The breakfast instead uses water-cooked oats, boiled egg and banana.

Cooked napa cabbage **169980** has no reported total-sugar value. Its separate
plain, intact-vegetable specification supports a derived free-sugar zero;
this does not invent a source total-sugar measurement. Plain cottage cheese
requires no added sugar, hydrolysed lactose or added whey powder, matching
the existing explicit plain-dairy formulation boundary.

This derivation requires an actual finite total-sugar value in grams and a
cited bilingual classification note. It cannot be used as an automatic
fallback for bread, sauces or other mixed foods with unknown sugar sources.

The historical tofu 174291 and shrimp 175180 model free-sugar assessments
remain unresolved. They are not used in the active scored formulations.

For the 60-recipe expansion, grilled chicken **171534**, drained unsalted
canned light tuna **171986** and roasted lean lamb leg **174314** each report
total sugars **0 g/100 g**. Their free-sugar zero is checked against that source
value. Fresh parsley **170416** and raw scallion **170005** report total sugars
**0.85** and **2.33 g/100 g**, respectively. Those natural sugars remain in the
source data; the plain intact-ingredient specification supports a separate
derived free-sugar zero. None of these derivations fills unknown added sugars.

## FVNS classification and preparation basis

For the 84-recipe expansion, cooked mature soybeans, leek, eggplant, celery,
turnip, cauliflower and green peas use plain intact formulations with no
free-sugar source. Their nonzero natural total sugars remain in the archive;
the derived free-sugar zeros do not fill any missing added-sugar measurement.
All seven are named in the official FVNS definitions and count at cooked
edible weight. Mature soybeans remain whole rather than blended or fermented.

FDC **170932** reports **10.34 g total sugars/100 g** for red/cayenne pepper
spice. This recipe input is explicitly plain dried cayenne finely ground to
powder, with nothing added or removed. The USDA title does not itself state
grinding. [FDA's spice definitions](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cpg-sec-525750-spices-definitions)
identify red/cayenne pepper as dried Capsicum fruit and describe spices in
whole, broken or ground form; they do not establish the USDA sample's form.
Using its nutrient composition for this declared powder is a reviewed
formulation assumption, not a separate powder-specific assay. The UK technical
guide counts vegetable-powder sugars as free sugars and excludes powders from
FVNS. Accordingly this input derives free sugars from the actual 10.34 g field
and uses FVNS false. No threshold or calculation code changes. This treatment
does not extend to whole pods, flakes, mixed chilli seasonings or sweetened
sauces; unknown added sugars remain unknown.

The 96-recipe expansion adds only garlic powder, FDC **171325**, with source
total sugars **2.43 g/100 g**. The source explicitly identifies powder. Garlic
is named in the official vegetable definitions, and the technical guide counts
vegetable-powder sugars as free sugars while excluding powders from FVNS.
The declared plain powder therefore uses the actual 2.43 g value as its derived
free-sugar input and FVNS false. It remains distinct from intact raw garlic;
neither added-sugar unknowns nor the earlier source assessment are changed.
Ground ginger is not included: its powdered form alone does not resolve the
guide's exception for powdered starchy carbohydrates. No score is assigned by
guessing that classification. All other ingredients reuse reviewed sources.

The 72-recipe expansion introduces a recipe-specific interpretation for
**puréed cooked chickpeas**, following [official worked example 8, hummus](https://www.gov.uk/government/publications/nutrient-profiling-model-2018/nutrient-profiling-model-2018-worked-examples-and-further-advice-on-calculations).
The example explicitly counts sugars in puréed chickpeas and garlic as free
sugars, while tahini's seed sugars remain excluded. Our hummus formulations
purée chickpeas only; they do not blend an unreviewed vegetable ingredient.
The marker `processing: "pureed"` is restricted to cooked FDC **173757**.
The importer derives **4.8 g free sugars/100 g chickpeas** from that record's
actual total-sugar field, not the illustrative example's different composition.
It rejects caller-supplied numeric preparation overrides and invalid sugar
values. Missing or malformed preparation evidence prevents runtime scoring.

This changes the sugar classification of that ingredient in those recipes,
not its physical nutrient values, cooked FVNS weight, unknown added sugars or
the source food's intact-chickpea assessment. The source receipt displays the
preparation note, selected-portion contribution and official links. Uniform
portion scaling still leaves the per-100-g score unchanged. No model threshold,
preference weight or earlier recipe score is changed by this treatment.
The rule is not generalized to every purée: the technical guide exempts
naturally occurring sugars in cereal grains, nuts, seeds and starchy tubers
except where its drink rules apply. Earlier diced-potato preparation remains
an authored recipe choice, not a requirement to avoid a purée sugar penalty.

Other new sources retain separate reviewed assumptions: intact boiled apple,
raw strawberry, cooked shiitake and chopped raw garlic contain no declared
free-sugar source. The new Parmesan and Monterey cheeses require plain dairy,
without added sugar, hydrolysed lactose or added whey powder. Mozzarella and
the archived QUAKER puffed-rice source report actual total-sugar zero; those
zeros support their free-sugar derivations without filling added-sugar unknowns.
The puffed-rice estimate describes that historical SR Legacy record, not the
current brand's formulation or a sweetened/granola substitute.

The [official FVNS definitions](https://www.gov.uk/government/publications/nutrient-profiling-model-2018/nutrient-profiling-model-2018-fruit-vegetables-nuts-and-seeds-definitions)
include common beans (*Phaseolus vulgaris*), soybeans (*Glycine max*), broccoli,
kale, tomato and cucumber. Those intact prepared ingredients contribute their
listed edible weight to the numerator. Cooked beans are hydrated prepared
beans, not dried ingredients receiving a double-weight allowance.

Sweet potato is an explicitly excluded tuber. Rice, quinoa, animal foods,
table salt and drinking water are not qualifying FVNS. Extracted olive oil is
not counted as the intact olive fruit. These ingredients remain in recipe
mass. No current recipe uses a dried-FVNS or concentrated-tomato adjustment.
The expansion also counts intact spinach, carrots, romaine, lentils and
blueberries, and the explicitly weighed lemon juice allowed by the official
juice definition. Potato, cereal grains, bread, honey and plain yogurt do not
contribute to the FVNS numerator.
The next expansion adds intact chickpeas, white beans, pak choi, napa cabbage,
mushrooms, cabbage, peppers, onions, zucchini, cooked tomato and banana.
Cooked tomato is not concentrated puree, so no double-weight adjustment is
used. Fish, pork and cottage cheese do not contribute to FVNS; the unused
soymilk's FVNS treatment is unresolved.

The 48-recipe expansion uses intact raw avocado, boiled yellow sweetcorn
kernels, boiled green snap beans and boiled bitter-gourd pods. The official
definitions name avocado, sweet corn and green beans. Bitter gourd is treated
under the broader Cucurbitaceae (other gourds) category, not as a separately
named worked example. [Singapore NParks](https://www.nparks.gov.sg/florafaunaweb/flora/1/4/1452)
connects the common name to *Momordica charantia*;
[Kew's classification](https://powo.science.kew.org/taxon/293413-1) confirms the
family. These plain ingredients contain no added sugar or
puree/juice/paste in the authored formulation, so their free-sugar zeros are
separate declared-formulation derivations, not added-sugar measurements.
Sweetcorn's qualifying vegetable classification does not extend to maize
flour. The avocado meals keep qualifying FVNS ingredients raw; their potato
side soup uses an excluded tuber and does not mix cooked qualifying FVNS
with raw avocado. Potato and retained soup water remain in total recipe mass.

The 60-recipe expansion adds fresh parsley and raw spring onions/scallions,
both explicitly named in the official FVNS definitions. Their qualifying
weight is raw, shared with any other qualifying vegetables in those recipes.
The newly sourced chicken, tuna and lamb contribute to total mass but not the
FVNS numerator. Unresolved ginger, basil and cilantro classifications were
not used to complete recipes; a classification from a different profiling
model is not substituted for the UK model.

The importer requires all qualifying FVNS ingredients in one recipe to share
the same raw/cooked state. Tomato and cucumber recipes use raw qualifying
vegetables; other current recipes use cooked qualifying vegetables/beans.
The model treatment uses those declared prepared ingredient weights and the
final food mass; it does not combine a raw purchase weight with its cooked yield.

For the 72-recipe additions, sesame kernels, apple, strawberry, shiitake and
garlic qualify as FVNS; cheese and puffed rice do not. Toasted sesame is used
with cooked chickpeas and other cooked qualifying ingredients. The source
description for FDC **173928** includes both "raw" and "cooked, boiled" and its
FoodOn mapping remains a raw-apple identity. The documented recipe follows
the explicit final cooked/boiled description; the importer rejects assigning
raw or ready-to-eat weight to this reviewed record. Toasted sesame's cooked
state is likewise accepted only for its exact reviewed ID and description.

The guide lists whole soybeans but does not provide a tofu-specific FVNS
classification or an ingredient percentage for tofu. The three former tofu
recipes therefore use cooked edamame in version 2. The former tofu/egg bowl
also replaces raw cucumber with cooked broccoli. Labels and notes identify
the actual new ingredients, while legacy catalog IDs remain stable.

## Fiber method and shrimp source replacement

The USDA-authored [Phillips, Haytowitz and Pehrsson 2019 paper, Table 2](https://www.ars.usda.gov/ARSUSERFILES/80400535/DATA/PUBLICATIONS/FNR/IMPLICATIONS%20OF%20TWO%20DIRRERENT%20METHODS%20FOR%20ANALYZING%20TOTAL%20DIETARY%20FIBER.PDF)
documents AOAC 985.29/991.43 total dietary fiber for SR releases 9–28 and
Legacy SR. `AOAC-compatible` means this database-method basis, rather than NSP
fiber. It is not a claim that every individual selected value was assayed, or
that older AOAC methods recover every component measured by newer enhanced
methods. Source derivations include analytical, calculated and imputed values;
their original metadata remain in the immutable snapshots.

Original cooked shrimp 175180 has no fiber value and remains unknown. The
active version-2 shrimp recipe uses the complete record **171971**, cooked
mixed-species shrimp by moist heat, which may contain moisture-retention
additives. Its fiber zero is USDA-reported and recipe-derived/imputed, not an
independent laboratory result. All its nutrient values are used together:
119 kcal, 497 kJ, protein 22.78 g, saturated fat 0.521 g and sodium 947 mg per
100 g. The old record's 111 mg sodium is not combined with the new fiber zero.

The original seventeen-record archive stays unchanged. The one-record
supplement and its hash are documented in [the source record](./README.md).
The sixteen-, fifteen-, four-, five-, nine-, eight- and one-record expansion archives are separately
pinned and cited in the same source record. Two retired source foods and the
newly reviewed, unused soymilk remain available for provenance, but
every ingredient used by the 143 current recipes has complete declared model
inputs. Data completeness is separate from the uncertainty of a recipe estimate.

## Update boundary

Changing an ingredient, its processing state, quantities, qualifying FVNS
fraction or free-sugar specification requires review and a recipe/model
version change. New or missing values must never be silently converted to
zero. Official model thresholds and their published worked examples are
verified separately from these food-source and formulation decisions.

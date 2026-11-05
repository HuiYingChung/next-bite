# UK NPM 2018 input provenance

Reviewed 2026-11-04. This file documents the inputs to the published UK model,
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

All **18** USDA added-sugars values remain null. That field is neither total
sugars nor the UK definition of free sugars. `model-assessments.json` records
the separate derivation used for the explicitly defined recipe ingredients.

For current recipes, ingredients are required to be plain and to contain no
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

The historical tofu 174291 and shrimp 175180 model free-sugar assessments
remain unresolved. They are not used in the active scored formulations.

## FVNS classification and preparation basis

The [official FVNS definitions](https://www.gov.uk/government/publications/nutrient-profiling-model-2018/nutrient-profiling-model-2018-fruit-vegetables-nuts-and-seeds-definitions)
include common beans (*Phaseolus vulgaris*), soybeans (*Glycine max*), broccoli,
kale, tomato and cucumber. Those intact prepared ingredients contribute their
listed edible weight to the numerator. Cooked beans are hydrated prepared
beans, not dried ingredients receiving a double-weight allowance.

Sweet potato is an explicitly excluded tuber. Rice, quinoa, animal foods,
table salt and drinking water are not qualifying FVNS. Extracted olive oil is
not counted as the intact olive fruit. These ingredients remain in recipe
mass. No current recipe uses a dried-FVNS or concentrated-tomato adjustment.

The importer requires all qualifying FVNS ingredients in one recipe to share
the same raw/cooked state. Tomato and cucumber recipes use raw qualifying
vegetables; other current recipes use cooked qualifying vegetables/beans.
The model treatment uses those declared prepared ingredient weights and the
final food mass; it does not combine a raw purchase weight with its cooked yield.

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
Two retired source foods remain available for provenance, but every ingredient
used by the twelve current recipes has complete declared model inputs.

## Update boundary

Changing an ingredient, its processing state, quantities, qualifying FVNS
fraction or free-sugar specification requires review and a recipe/model
version change. New or missing values must never be silently converted to
zero. Official model thresholds and their published worked examples are
verified separately from these food-source and formulation decisions.

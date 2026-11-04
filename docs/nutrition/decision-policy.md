# Pilot decision policy

Implemented and checked: 2026-11-04. Audience: general healthy adults choosing
an ordinary meal. The pilot has twelve authored standard recipes; it is not a
validated dietary assessment or a clinical recommendation system.

## What the evidence supports

| Decision                                          | Evidence and practical implication                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Calculate from ingredient grams                   | [USDA documentation](https://fdc.nal.usda.gov/Foundation_Foods_Documentation/) describes scaling per-100-g composition by edible weight. Each recipe sums its declared ingredients in matching preparation states; oil, salt and retained water are included.                                                                                                            |
| Keep missing values unknown                       | [FAO food composition guidance](https://www.fao.org/4/y4705e/y4705E14.htm) distinguishes missing values from zero. One missing required ingredient value makes that nutrient total unknown, while other nutrients remain calculable.                                                                                                                                     |
| Specify the actual recipe                         | [FAO recipe guidance](https://www.fao.org/4/y4705e/y4705e23.htm) explains yield and retention considerations. This pilot uses already cooked or ready-to-eat ingredients and their final weights. It does not substitute raw composition for cooked weight or apply a second cooking adjustment.                                                                         |
| Avoid meal-level adequacy claims                  | [NCI guidance on the Healthy Eating Index](https://epi.grants.cancer.gov/hei/uses.html) concerns diet quality and the limits of intake data. A partial record cannot establish a nutrient deficit; the app does not label one meal or an incomplete day as adequate.                                                                                                     |
| Avoid a universal calorie target                  | [Dietary Reference Intakes for Energy](https://www.nationalacademies.org/read/26818/chapter/9) considers individual characteristics and uncertainty. The pilot does not collect the inputs or assess the context required for individual energy estimates.                                                                                                               |
| Separate public-health guidance from meal ranking | [WHO healthy diet guidance](https://www.who.int/news-room/fact-sheets/detail/healthy-diet) and the [US 2025–2030 guidelines](https://cdn.realfood.gov/DGA.pdf) inform background understanding. Daily recommendations are not automatically cut into fixed per-meal pass/fail limits; their different definitions and populations are not combined into a made-up score. |

The ingredient records, dates, license, hash, recipe definitions and exact
arithmetic are documented in [the source record](./README.md). USDA supplies
composition data, not the recipes, recommendation weights or medical approval.

## Product choices, not research-derived thresholds

- Small, standard and large portions are 0.75, 1 and 1.25 times each authored
  recipe. These factors are convenient recipe options, not a recommended
  serving size, a calorie prescription or a prediction of fullness.
- An explicit portion choice wins. Otherwise, self-reported low hunger selects
  the smaller option, high hunger selects the larger option, and unspecified
  or moderate hunger selects the standard recipe. The user can change it.
- Avoided ingredients, raw/cold states and large-portion avoidance exclude
  conflicts conservatively. Confirmed warmth and an assembly-time budget are
  shared filters; the app does not silently relax them to fill three slots.
- Assembly times are editorial estimates starting with prepared ingredients.
  They exclude cooking raw ingredients. The older 100-idea catalog has no
  confirmed minute estimates and cannot satisfy a numeric time limit.
- Staple and cuisine preferences contribute 2 and 1 practical matching points.
  Structured saved meal-style preferences contribute at most 2. A defined
  light-preparation match or short-assembly match contributes 1. These are
  transparent ordering rules, without a claim that the weights are clinically
  validated. See `src/nutrition.ts` for the executable ordering and reasons.
- If explicitly requested, higher protein or more vegetables resolves equally
  practical choices using calculated protein grams or listed vegetable weight.
  There is no default preference for fewer calories or one universal health
  total. A stable recipe identifier resolves remaining ties.
- Today's named staples can resolve a variety tie only when the complete
  calculated nutrient vectors and edible weights are identical. Unmeasured
  previous food records never become a calculated nutritional deficit.
- Feeling tired means a preference for less assembly effort. Wanting a light
  meal is an explicitly defined preparation preference, not a diagnosis or a
  claim about low energy intake. No fullness duration is predicted.

## Presentation and upkeep

The twelve-recipe path displays kcal, protein, fiber and edible grams, with
full nutrients and exact recipe/source links collapsed. The separate 100-idea
path displays numeric editorial points and reasons. Their scales are not
combined. Selecting a meal saves a plan and its recipe version/portion; a
separate editable confirmation is required before recording food as eaten.

All new meal-context inputs are session-only. Recording a meal, changing the
day, reloading, or entering/leaving the example resets them. Permanent avoids
and saved preferences remain separate. Recipe versions are stored with plans;
an unavailable old version is never presented as a current numeric estimate.

There is no runtime nutrition API or recurring data refresh. A future source
or recipe update must regenerate from an archived snapshot, review preparation
states and safety declarations, increment changed recipe versions, and pass
source, arithmetic, context, storage, UI and safety checks. No dietitian or
clinical review has been claimed. Adult goal programs and special populations
require separate policy and review before release.

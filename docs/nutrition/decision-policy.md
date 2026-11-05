# Twelve-recipe scoring policy

Current authorization: 2026-11-04, published-model scoring. This supersedes the
previous preference-tier policy. Audience: general healthy adults choosing an
ordinary meal from twelve explicitly authored recipes.

## Published model and scope

Use [UK Nutrient Profiling Model 2018 technical guidance](https://www.gov.uk/government/publications/nutrient-profiling-model-2018/nutrient-profiling-model-2018-technical-guidance),
with its published per-100-g thresholds and protein-credit gate. The model
profiles food composition. It does not rank the biological importance of
nutrients, measure every vitamin/mineral, determine personal adequacy or
validate this meal recommender. The [publication page](https://www.gov.uk/government/publications/nutrient-profiling-model-2018)
states that the model is reference guidance and is not yet applied to policy.

The model's A points cover energy, saturated fat, free sugars and salt; C points
cover protein, fibre and qualifying fruit/vegetables/nuts/seeds (FVNS). Protein
is credited only when full A is below 11 or FVNS earns five points. The full A
includes energy even when the display separates energy into its own component.
The official result is `S = A - credited C`, with a lower result more favourable
under that model. Exact constants and calculation live in `src/nutrient-profile.ts`.

Use the [official ingredient definitions](https://www.gov.uk/government/publications/nutrient-profiling-model-2018/nutrient-profiling-model-2018-fruit-vegetables-nuts-and-seeds-definitions)
and [calculation advice](https://www.gov.uk/government/publications/nutrient-profiling-model-2018/nutrient-profiling-model-2018-worked-examples-and-further-advice-on-calculations)
for recipe inputs. USDA composition values, separately derived model inputs,
archived bytes, source hashes and ingredient replacements are documented in
[the source record](./README.md) and [model-input provenance](./model-input-provenance.md).

## Displayed components and total

The nutrient and energy components retain the model's relative point weights:

```text
Nutrient = credited C - saturated-fat A - free-sugar A - salt A
Energy   = 10 - energy A
Preference = sum of five product-defined bonuses, at most 10
MealHatch total = Nutrient + Energy + Preference
              = 10 - official NPM + Preference
```

The ten-point offset makes the energy contribution non-negative without
changing ordering. It is not an additional nutrition benefit. Energy is
arithmetically counted once; the published protein gate still depends on full
A. Nutrient contributions can be negative. None of these numbers is a percent,
a score out of 100, a measure of essentiality or an official combined health
grade. The UI keeps the original official model result visible in details.

The model uses energy bands: lower energy can have equal points within a band.
Per-100-g energy describes energy density, not whole-meal calories or whether
a person needs more/less energy. Water remains in the declared edible recipe
weight; arbitrary dilution is not a new recipe option. Every portion multiplier
leaves composition and model points unchanged while changing whole-portion
nutrient estimates. [WHO healthy-diet guidance](https://www.who.int/news-room/fact-sheets/detail/healthy-diet)
frames healthy diets around adequacy, balance, moderation and diversity; the
app does not turn a lower-energy ranking into a universal health claim.

## Preference bonuses: MealHatch product rules

Each group contributes either zero or two points; each group is capped at two.
No unspecified preference earns points. These weights and operational cutoffs
are product choices, not validated scientific recommendations.

| Group | Condition for +2 |
| --- | --- |
| This-meal staple | The explicitly selected staple matches the recipe. |
| This-meal cuisine | The explicitly selected cuisine group matches. |
| Preparation | A request for less added oil matches at most 1 g listed added oil per 100 g, or a request for less effort matches at most 10 estimated assembly minutes. The current preparation request takes priority; a saved light-meal request is used only without a current request. The same preparation preference cannot earn twice. |
| Saved meal style | At least one supported saved style matches structured recipe/catalog facts; additional matches do not stack. |
| Requested nutrient direction | An explicit more-protein request matches over 8.5 g protein per 100 g, or an explicit more-vegetables-and-beans request matches over 40% eligible FVNS. Both together still earn at most two. |

The final group deliberately gives an extra personal preference bonus to an
already represented composition characteristic. It is disclosed as such, not
presented as a second independent scientific finding. FVNS includes qualifying
pulses and is not identical to a serving of vegetables. Thresholds for the bonus
are operational product rules even where the number is borrowed from a model
boundary. Assembly times start with prepared ingredients and exclude cooking
from raw ingredients. Feeling tired affects preparation effort, not a nutrient
deficit or a stimulant recommendation.

## Selection and eligibility

1. Apply ingredient avoids and strict conditions, including raw/cold states,
   confirmed warmth, assembly time and large-portion avoidance. Never relax
   these to fill three slots.
2. Require complete matching ingredient identity/state/weight and all model
   inputs. Unknown is not zero; incomplete recipes are excluded from scoring
   with an evidence reason. Preserve other nutrient unknowns in the display.
3. Calculate each eligible recipe's same total and return its highest three.
   Explicit preference tiers cannot secretly override a better total.
4. Resolve exact total ties using recognized protein/staple variation across
   today and the preceding six local calendar dates. Deduplicate aliases within
   each meal slot; compare protein repeat counts, then staple repeat counts,
   then recency, earlier-alternative variety and stable recipe ID.
   No missing meal is treated as a nutrient deficit. The trace includes every
   eligible candidate total, recorded/recognized coverage, actual tie reasons
   and the dated food records used. This is a product variety rule, not a
   nutrition score adjustment. Unknown records do not establish absence.
5. An explicit portion takes priority over hunger. Otherwise hunger suggests
   0.75x, 1x or 1.25x of every ingredient. These are editable product choices,
   not official serving sizes, energy needs or fullness predictions.

The 100-idea collection remains separate, unscored inspiration without verified
recipe nutrient totals. It never silently fills vacancies in the scored list.

## Presentation, persistence and upkeep

Show nutrient, energy and preference contributions plus the actual ranking
total as compact numbers. Put formula, per-100-g inputs, points, thresholds,
protein gate, preference reasons, tie handling and source links in one
collapsed scoring explanation. Show whole-portion kcal/protein/fibre/weight
separately, with further nutrition and exact recipe ingredients collapsed.

Plans retain recipe version and portion. An unavailable old version is never
shown with new numeric estimates. Confirming consumption remains a separate
editable step. Source identity persists only while the edited food name/group
still matches. Session-only meal conditions reset as before; permanent avoids
and saved preferences remain separate.

No runtime nutrition API, recurring source refresh, new AI recommendation
service or clinical validation is claimed. Optional AI continues to structure
meal text; deterministic code selects and explains the recipe ranking. Future
source updates require a separate archived snapshot, reviewed source states,
versioned recipe changes, offline regeneration, model/source/arithmetic tests,
and bilingual UI checks. Specialized populations remain outside this scope.

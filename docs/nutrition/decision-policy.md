# Standard-recipe scoring policy

Published-model authorization: 2026-11-04. Preference-first ordering authorized
2026-11-06, on the 108-recipe collection. This ordering supersedes the additive
total ranking while retaining the published model and its detailed calculations.
Ranking policy: `mealhatch-preference-first-2026-11-06-v1`.
Audience: general healthy adults choosing an ordinary meal from
explicitly authored recipes. Browsing the full collection does not alter the
top-three ranking or bypass exclusions.

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

## Composition reference and preference calculations

The nutrient and energy components retain the model's relative point weights:

```text
Nutrient = credited C - saturated-fat A - free-sugar A - salt A
Energy   = 10 - energy A
Nutrition reference = Nutrient + Energy = 10 - official NPM
Current preference = sum of active current-meal groups (0 or 2 each)
Saved preference = sum of active saved groups (0 or 2 each)
```

The ten-point offset makes the energy contribution non-negative without
changing ordering. It is not an additional nutrition benefit. Energy is
arithmetically counted once; the published protein gate still depends on full
A. Nutrient contributions can be negative. None of these numbers is a percent,
a score out of 100, a measure of essentiality or a personal health grade.
The UI retains the original official model result, all seven input rows and
their bands, the protein gate and the component formulas in details. Energy
remains a model input, not an additional low-calorie or weight-loss bonus.

The model uses energy bands: lower energy can have equal points within a band.
Per-100-g energy describes energy density, not whole-meal calories or whether
a person needs more/less energy. Water remains in the declared edible recipe
weight; arbitrary dilution is not a new recipe option. Every portion multiplier
leaves composition and model points unchanged while changing whole-portion
nutrient estimates. [WHO healthy-diet guidance](https://www.who.int/news-room/fact-sheets/detail/healthy-diet)
frames healthy diets around adequacy, balance, moderation and diversity; the
app does not turn a lower-energy ranking into a universal health claim.

## Preference groups: MealHatch product rules

Each group contributes either zero or two points; each group is capped at two.
No unspecified preference earns points. These weights and operational cutoffs
are product choices, not validated scientific recommendations.

| Group | Condition for +2 |
| --- | --- |
| This-meal staple | The explicitly selected staple matches the recipe. |
| This-meal cuisine | The explicitly selected cuisine group matches. |
| Preparation | A request for less added oil matches at most 1 g listed added oil per 100 g, or a request for less effort matches at most 10 estimated assembly minutes. If ingredients still need preparation, assembly time cannot earn a less-effort match because total time is unknown. The current preparation request takes priority; a saved light-meal request is used only without a current request. The same preparation preference cannot earn twice. |
| Saved meal style | At least one supported saved style matches structured recipe/catalog facts; additional matches do not stack. |
| Requested nutrient direction | An explicit more-protein request matches over 8.5 g protein per 100 g, or an explicit more-vegetables-and-beans request matches over 40% eligible FVNS. Both together still earn at most two. |

Staple and cuisine belong to the current-meal group. Preparation belongs to
current-meal preferences when explicitly selected there; its saved fallback
belongs to saved preferences. Saved styles and nutrient directions belong to
saved preferences. A summary counts matched versus selected groups, not a
percentage of nutritional adequacy; an unset group earns nothing. The five
group contributions still sum to at most 10, but that sum is not the ranking.

The final group deliberately expresses a personal preference for an
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
3. Compare current-meal preference points first, then saved preference points,
   then nutrition reference. Compare each value only after the preceding value
   ties; do not add them or present an invented scientific percentage weight.
   Return the first three, or fewer if there are fewer eligible candidates.
   Matching every active current group beats a partial match. Explain actual
   mismatches when alternatives require compromise; never relax a hard avoid.
4. Only when all three values tie, use recognized protein/staple variation across
   today and the preceding six local calendar dates. Deduplicate aliases within
   each meal slot; compare protein repeat counts, then staple repeat counts,
   then recency, earlier-alternative variety and stable recipe ID.
   No missing meal is treated as a nutrient deficit. The trace includes every
   eligible candidate's priority tuple and ranking-policy version,
   recorded/recognized coverage, actual tie reasons
   and the dated food records used. This is a product variety rule, not a
   nutrition score adjustment. Unknown records do not establish absence.
5. An explicit portion takes priority over hunger. Otherwise hunger suggests
   0.75x, 1x or 1.25x of every ingredient. These are editable product choices,
   not official serving sizes, energy needs or fullness predictions.

Ingredient readiness is a current-meal condition: unspecified, prepared, or
still needing preparation. Unspecified/ready use the explicitly labeled
assembly-time limit. When preparation remains, full time is unknown and cannot
meet a required time limit. Without a limit the recipe remains browsable with
a clear qualification. No raw-start duration, inventory or ingredient
availability is inferred.

The current meal library contains only the 108 defined recipes. Legacy ideas
are retained for old saved plans and do not fill vacancies in the scored list.
Current names, ingredient groups and safety metadata derive from each actual
recipe. Unrelated old idea ingredients do not add exclusions or style bonuses;
source unknowns and actual preparation conditions still apply.

New saved-style choices are limited to supported recipe attributes. Previously
saved unsupported preferences remain visible and removable, without inventing
matching cuisine labels. The legacy “Late-night heavy meals” condition has no
reviewed classifier for these recipes and is no longer offered as a new choice.
If already saved, it remains an explicit unknown constraint at the late time
window, blocking selection until the user removes it. It does not classify every
recipe as heavy, use a compatibility placeholder, or silently relax an avoid.

## Presentation, persistence and upkeep

Lead with actual current preference/preparation reasons and the choose action.
Show compact current match counts and a composition reference separately.
Keep every formula, per-100-g input, point, threshold, protein gate, preference
contribution/reason, tie explanation and source derivation/link inside one
scoring disclosure that is closed by default and keyboard-operable. No scoring
detail is removed for visual simplification. Show whole-portion kcal/protein/fibre/weight
separately, with further nutrition and exact recipe ingredients collapsed.

Plans retain recipe version and portion. Unversioned legacy plans keep their
original idea descriptions, including retired dumpling ideas. An unavailable
old version is never shown with new numeric estimates or replacement recipe
ingredients. Confirming consumption remains a separate
editable step. Source identity persists only while the edited food name/group
still matches. Session-only meal conditions reset as before; permanent avoids
and saved preferences remain separate.

No runtime nutrition API, recurring source refresh, new AI recommendation
service or clinical validation is claimed. Optional AI continues to structure
meal text; deterministic code selects and explains the recipe ranking. Future
source updates require a separate archived snapshot, reviewed source states,
versioned recipe changes, offline regeneration, model/source/arithmetic tests,
and bilingual UI checks. Specialized populations remain outside this scope.

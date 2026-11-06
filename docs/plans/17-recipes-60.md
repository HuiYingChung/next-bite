# Expand detailed recipes from 48 to 60

Status: review
Authorized: 2026-11-06. Continue `codex/recipes-24` at base
`09471f18f6612067fc734746607200413904c225`; preserve all prior uncommitted work.

## Scope

Add twelve distinct detailed formulations from the existing 100 meal ideas.
Reuse reviewed ingredient sources when they accurately match; acquire any
necessary additional full official records separately with original bytes,
retrieval metadata and hashes. Do not substitute an unknown nutrient with zero.

Preserve the prior 48 recipes and versions, 53 retained source definitions and
model assessments. The baseline is in `.audit-tmp/recipes60-baseline/`.
New formulations use `mealhatch-recipes60-2026-11-06-v1` and provide exact
edible weights, preparation states, seasoning amounts and bilingual steps.
Keep model thresholds, product weights, top-three selection, seven-day
tie-break rules and conservative exclusions unchanged.

Retain the static architecture and existing interface/dependencies. This
request includes no private key, live AI request, account, backend, commit,
push, merge or deployment.

## Verification

Compare all preceding data against the captured 48-recipe baseline. Validate
source hashes and nutrient/model inputs. Recalculate all 60 recipes at all
three portions; verify top-three ordering, hard exclusions and history ties.
Check the entire collection in English and Traditional Chinese, phone widths,
keyboard navigation, excluded-recipe inspection and saved-portion persistence.
Run the complete repository verification and inspect representative new
recipe screenshots. Record results and any retained limitations below.

## Evidence

- Added twelve distinct formulations: grilled chicken/kale/green-bean rice;
  boiled egg/tomato/bread/blueberry plate; beef rice-noodle soup with raw
  parsley/scallion/cucumber; tuna rice bowl with potato soup and banana;
  chicken sandwich with potato soup; roast lamb/yogurt rice bowl;
  warm shrimp/corn/vegetable rice; shredded chicken with raw scallion/cucumber;
  parsley-turkey sandwich; chunky egg/potato soup with raw salad;
  grilled chicken/cabbage/carrot bento; chicken/black-turtle-bean/bitter-melon
  rice. Each has four bilingual, portion-aware steps. No new ingredient-ID
  set duplicates an existing recipe. Regular portions span approximately
  370–626 g and 380–502 kcal; these are authored portions, not dietary targets.
- Added five full official USDA records: 171534 grilled chicken breast,
  171986 unsalted water-packed light tuna, 174314 roasted lean lamb leg,
  170416 fresh parsley and 170005 raw scallion. Original snapshot is
  146,139 bytes; SHA-256
  `63b6ed272fb6c998c404edbd2d8e3e08292534908be0b1f534b6272dd531ae80`;
  retrieved 2026-11-06T18:21:35.1014883Z. All six source hashes passed.
  There are 58 retained foods, 55 active foods and 60 model-complete recipes.
  All 58 source added-sugar fields remain unknown.
- Three new animal sources report actual total-sugar zero. Parsley/scallion
  retain their nonzero source total sugars and separately justified free-sugar
  zeros. Both plants are explicitly named in UK FVNS definitions. A narrowly
  reviewed source-state equivalence accepts `Parsley, fresh` as raw only for
  FDC 170416 with that exact description; the generic raw-state check remains.
  Unresolved ginger/basil/cilantro and an unspecified omelet source were not
  imported. No private credential was used.
- All prior 48 raw/generated recipes, 53 definitions/assessments/generated
  foods and global model provenance are unchanged against the baseline.
  Food-library concepts, source metadata and 15,438 nutrition records are
  unchanged; only five localized recipe aliases were added.
- Checks passed 522 archived nutrient fields, 180 portion calculations,
  1,740 avoidance contexts, 174 model boundaries, three published examples
  and independently recomputed scores/order across six preference contexts.
  Direct tuna/Lamb exclusions, isolated raw-parsley exclusion, 232 bilingual
  source-identity persistence checks, 24 history contexts and 16 calendar
  checks passed. No scoring, preference or history rule was changed.
- Real Chromium verification passed 120 bilingual detail views, 360 portion
  switches and 742 exact ingredient-label checks. The 60th-ranked recipe saves
  and reloads with its exact version and large portion. Excluded recipes stay
  inspectable and cannot be selected. Keyboard focus and 320/390/768/1280 px
  layouts passed, including all 60 recipes at phone width; zero page errors.
  Dashboard checks covered 376 score panels, 374 nutrition panels and 2,300
  exact source links. No product UI or styling changes were needed.
- Final review made the long-grain tuna formulation a rice bowl, kept potato
  soup chunky, clarified warming both beef and noodles, and removed ambiguous
  title wording. Bread notes distinguish separately added ingredients from
  uncertain bread declarations. A final live check covered all 120 titles and
  ten affected bilingual notes/instruction dialogs. Root visually reviewed the
  Chinese desktop library, new soup's Chinese mobile detail and English steps.
  Screenshots are local ignored artifacts under `output/playwright/recipes60/`.
- `npm run verify` passed the full build, product/engine, API/AI mocks, local
  routes, state/presentation/dashboard, nutrition/model, food-library, records,
  history and weekly checks. Following the final notes-only clarification,
  the final production build, nutrition/model and baseline-preservation checks
  passed again. Logs are in
  `.audit-tmp/recipes60-verify.log`, `recipes60-final-nutrition.log` and
  `recipes60-preservation.log`. `git diff --check` passed. The existing bundle
  size warning remains.

## Retained limitations

The inherited conservative catalog exclusions remain in force. For example,
the tuna bowl retains old wheat/egg exclusions, the plain lamb bowl an unknown
beef exclusion, warm shrimp rice a fried-food exclusion, and parsley soup a
possible-cilantro exclusion. These do not establish that the current listed
ingredients contain those items; this quantity expansion does not relax the
existing gate. The earlier oats/soy limitation is also unchanged.

The shrimp-rice formulation retains the source's high sodium instead of
borrowing values from a different shrimp record. Source/model completeness
supports reproducible estimates, not measured intake or clinical validation.
No real AI provider, commit, push, merge or deployment was used.

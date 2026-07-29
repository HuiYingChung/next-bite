# Phase 3 — Catalog evidence migration

Status: blocked
Entry gate: Phase 2 kernel accepted and merged

## 1. Objective

Migrate all 100 meal recommendations and the drink catalog from qualitative
editorial nutrition metadata to the accepted evidence model and deterministic
kernel.

The migration must make uncertainty more explicit, not manufacture uniform
precision.

## 2. Migration batches

Freeze the catalog inventory and divide it into reviewable batches:

1. simple and home-style meals;
2. mixed bowls, plates, soups, sandwiches, and breakfast items;
3. Taiwanese, Chinese, and other regionally described meals;
4. restaurant-, takeout-, ready-made-, and grocery-variable meals;
5. drinks, including caffeinated, sweetened, energy, and alcoholic options.

Use batches of at most 25 meals. Each batch must pass source, schema,
derivation, and distribution checks before the next batch starts.

## 3. Per-item requirements

Every item must have:

- an evidence status;
- serving amount or range;
- record-level source references;
- recipe/component derivation when no prepared-food match is defensible;
- supported nutrition and food-pattern fields;
- mapping confidence;
- variability and unknown notes;
- a review record.

Rules:

- do not map by title substring alone;
- do not use one branded product for a generic catalog item;
- do not use a single restaurant recipe as a universal value;
- keep Taiwan FDA and USDA records on their own documented bases;
- use ranges for meaningful recipe or portion variation;
- leave unsupported fields unknown.

## 4. Recalibration

Derive the catalog's protein, vegetable, carbohydrate, heaviness, and
convenience behavior from the accepted model:

- nutrition dimensions must come from evidence-derived data;
- heaviness must have a documented product definition and must not impersonate
  calorie or health quality;
- convenience remains a product attribute;
- editorial overrides must be removed or reclassified with a documented
  reason;
- source coverage and confidence distributions must be reported.

The catalog does not need an aesthetically even distribution. It needs a
defensible distribution and enough candidate diversity for useful
recommendations.

## 5. Coverage gates

Required:

- 100% of meals and drinks have an explicit evidence status;
- 100% of known values have provenance;
- 100% of unknowns have a reason;
- at least 90 of 100 meals reach `high` or `medium` mapping confidence;
- no limited-confidence item is displayed as precise;
- all hard-avoid ingredient metadata is reviewed against the catalog
  definition without replacing structured uncertainty with a guarantee.

If fewer than 90 meals reach `high` or `medium`, stop and report which catalog
concepts require renaming, standardized recipes, broader ranges, or removal.
Do not lower the confidence standard to pass the gate.

## 6. Required audits and tests

Add:

- source coverage audit;
- duplicate or conflicting source-record audit;
- source-release and license audit;
- confidence-distribution audit;
- nutrient and product-attribute distribution audit;
- outlier detection;
- catalog reachability audit under the new kernel;
- hard-avoid coverage audit;
- drink safety and reachability audit;
- tests proving batch order does not affect final data;
- snapshot reproducibility tests.

Review a representative sample from every batch against the official source
after normalization.

## 7. Product copy

Replace any claim that all options are “source-backed” unless every displayed
claim actually satisfies that statement.

The product must distinguish:

- sourced value;
- recipe estimate;
- bounded range;
- limited confidence;
- unknown;
- product heuristic.

Keep the default UI concise. Provenance and assumptions may use progressive
disclosure, but uncertainty that changes the recommendation cannot be hidden.

## 8. Verification gate

Run batch-level targeted checks and, after the final batch:

```text
npm run build
npm run verify
npm run audit:reachability
npm run audit:drinks
```

Run the new source, distribution, hard-avoid, monotonicity, and trace audits.
Verify representative user flows and inspect the final generated bundle for
keys or accidental raw datasets.

## 9. Exit criteria

- Coverage and confidence gates pass.
- All catalog ranking uses compatible evidence-derived data.
- Legacy nutrition metadata is removed or explicitly isolated.
- Distribution and reachability remain useful and explainable.
- Product copy matches the actual evidence state.
- Full verification passes without security or no-store regressions.

## 10. Required handoff

Report:

- branch, base, and commits;
- catalog item count and batch membership;
- source and confidence distributions;
- unsupported and limited-confidence items;
- distribution before/after comparisons;
- reachability results;
- all verification evidence;
- proposed removals or renames, if any.

Do not begin Phase 4 until catalog coverage is accepted.

# Phase 2 — Deterministic nutrition kernel

Status: blocked
Entry gate: Phase 1 pilot accepted and merged

## 1. Objective

Replace the production engine's qualitative nutrition guesses with a
deterministic, evidence-aware calculation path while keeping current safety,
privacy, and AI-authority boundaries intact.

This phase integrates only the accepted Phase 1 pilot items. It proves the new
selection architecture before the full catalog is migrated.

## 2. Required decisions

The production decision must be expressed as ordered layers:

1. **Hard eligibility**
   - structured must-avoid metadata;
   - alcohol opt-in;
   - energy-drink opt-in;
   - other existing non-negotiable safety restrictions.
2. **Evidence eligibility**
   - known quantity, range, confidence, and source coverage;
   - unsupported fields stay unknown and cannot earn nutrition credit.
3. **Nutrition alignment**
   - supported food-pattern and nutrient components;
   - explicit formulas and versioned rule evidence.
4. **Practical fit**
   - time, convenience, preference, temperature, preparation, and other
     product considerations.
5. **Fairness and near-tie rotation**
   - allowed only inside a defined nutrition-equivalent band;
   - cannot rescue a materially worse nutrition candidate.

Do not recreate these layers as one opaque additive score. The selected result
may use a deterministic comparison tuple or staged candidate sets, provided the
trace can replay the exact choice.

## 3. Amount, portion, and confidence

Preserve AI- or user-supplied:

- original amount text;
- normalized quantity and unit;
- exact versus approximate qualifier;
- portion;
- component confidence;
- portion confidence.

Required behavior:

- missing amount remains unknown;
- approximate inputs may produce ranges;
- confidence affects uncertainty or eligibility, not by silently shrinking a
  component into a made-up amount;
- component count must never be displayed as serving adequacy;
- manual and AI-parsed entries use the same downstream calculation contract.

## 4. Nutrition components

Implement only components supported by Phase 1 data and an accepted rule
definition. Candidate components include:

- vegetables and fruit;
- whole and refined grains;
- total protein foods;
- seafood and plant proteins;
- fiber;
- sodium;
- added sugars;
- saturated fat and supported fatty-acid information.

Do not add a component solely because it exists in HEI or a dataset. Record
coverage and exclude components whose source or quantity quality is
insufficient.

Next-meal alignment may reference recent logged patterns, but it must not claim
to diagnose a deficiency or fulfill a daily requirement.

## 5. Selection trace and receipt

Create one typed trace that records:

- all hard exclusions and their structured reasons;
- evidence availability and unknowns;
- derived nutrition components and formulas;
- perspective or context adjustments;
- practical-fit effects;
- nutrition-equivalence comparison;
- fairness adjustment;
- near-tie membership and rotation;
- final ordering and winner.

The UI receipt must render this trace. It must not reconstruct a simplified
parallel explanation.

## 6. Migration behavior

During this phase:

- pilot items use the new kernel;
- nonpilot catalog items remain on an explicitly marked legacy path or are
  excluded from the controlled kernel experiment;
- the product must never compare legacy editorial scores with new
  evidence-derived values as if they were the same scale;
- choose a deterministic feature boundary that is testable and cannot produce
  mixed-authority ranking.

If a safe controlled boundary is impossible without migrating the catalog,
stop and report the architecture conflict rather than performing an unplanned
100-item migration.

## 7. Required tests

Add tests for:

- all hard-avoid states;
- alcohol and energy-drink opt-in;
- unknown amount propagation;
- approximate range propagation;
- confidence monotonicity;
- component-level monotonicity while holding other inputs fixed;
- nutrition dominance;
- practical fit not overriding a non-equivalent nutrition result;
- fairness not overriding nutrition;
- near-tie membership and deterministic rotation;
- stable tie-breaking;
- complete trace replay;
- receipt fields exactly matching the trace;
- current time boundaries, including 15:00, 17:00, and adjacent instants;
- same input plus same data snapshot producing the same output.

## 8. Verification gate

Run all new targeted tests plus:

```text
npm run build
npm run verify
npm run audit:reachability
npm run audit:drinks
```

Perform product/API verification and inspect the UI receipt for representative
desktop and mobile flows. Do not weaken no-store or BYOK boundaries to make
verification easier.

## 9. Exit criteria

- The pilot selection path uses ordered deterministic layers.
- Unknowns cannot create nutrition credit.
- Nutrition dominance is proven by tests.
- Fairness and rotation are bounded and visible.
- Receipt and calculation use the same trace.
- No mixed legacy/new scale comparison occurs.
- Safety, build, product, engine, API, and audit checks pass.
- Limitations and unsupported components are documented.

## 10. Stop conditions

Stop if:

- the evidence pilot did not provide sufficient quantity coverage;
- nutrition rules still require undocumented arbitrary thresholds;
- selection cannot avoid comparing incompatible legacy and new scores;
- receipt truth would require a separate calculation;
- safety or privacy boundaries regress.

## 11. Required handoff

Report:

- branch, base, and commits;
- the selected migration boundary;
- formulas and evidence rule IDs;
- supported and unsupported components;
- selection-trace example;
- targeted and aggregate verification;
- any ranking changes observed in the pilot;
- the decision on whether full catalog migration is viable.

Do not begin Phase 3 until this kernel is accepted.

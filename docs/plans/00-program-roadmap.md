# NextBite nutrition reliability program

Status: active
Program written: 2026-07-29
Original planning baseline: `main` at `bbff438`

## 1. Program outcome

Turn NextBite from a deterministic but mainly editorial recommendation system
into an auditable, guideline-informed everyday food decision product.

The target is not clinical validation. The target is:

- record-level food and nutrient provenance;
- explicit quantities, ranges, confidence, and unknowns;
- deterministic safety, calculation, ranking, and receipt generation;
- nutrition-facing rules tied to official data or published guidance;
- product heuristics clearly separated from nutrition evidence;
- a rolling seven-day pattern view that is useful without claiming individual
  nutrient adequacy or usual intake.

## 2. Canonical execution order

| Order | Plan | Status | Entry gate |
| --- | --- | --- | --- |
| 1 | [`01-evidence-foundation.md`](./01-evidence-foundation.md) | `ready` | Latest merged `main` verified |
| 2 | [`02-deterministic-nutrition-kernel.md`](./02-deterministic-nutrition-kernel.md) | `blocked` | Phase 1 pilot accepted |
| 3 | [`03-catalog-evidence-migration.md`](./03-catalog-evidence-migration.md) | `blocked` | Phase 2 kernel accepted |
| 4 | [`04-seven-day-pattern-signals.md`](./04-seven-day-pattern-signals.md) | `blocked` | Phase 3 catalog coverage accepted |
| 5 | [`05-product-verification-release.md`](./05-product-verification-release.md) | `blocked` | Phases 1–4 merged |

Allowed status values:

- `blocked`: an earlier gate has not passed.
- `ready`: authorized as the next implementation phase.
- `in-progress`: work exists on an identified branch.
- `review`: implementation is complete but exit evidence has not been accepted.
- `complete`: merged and all required evidence is recorded.

Only one phase may be `ready` or `in-progress` at a time. A future session must
not change a later plan to `ready` unless the preceding exit gate has actually
passed.

## 3. Program invariants

Every phase must preserve these boundaries:

1. AI structures user input; deterministic code owns the final decision.
2. Structured hard avoids and beverage opt-ins are eligibility constraints,
   never score adjustments.
3. Missing quantity or nutrition data remains unknown.
4. No generic source list may impersonate meal-level evidence.
5. Nutrition evidence, practical fit, and fairness are separate decision
   concepts.
6. Fairness or rotation cannot overturn a meaningfully better supported
   nutrition candidate.
7. The visible receipt must be generated from the same trace used to select the
   winner.
8. No runtime dependency on a third-party nutrition API.
9. No client-side external data key.
10. Preserve BYOK, same-origin relay, `store: false`, no-store caching, input
    limits, error redaction, and existing safety controls.
11. No medical diagnosis, treatment, personalized adequacy, calorie target, or
    weight-loss claim.
12. No production deployment or configuration change without explicit user
    authorization.

## 4. Per-session protocol

At the beginning of an implementation session:

1. Read this roadmap and the entire active phase plan.
2. Inspect `git status`, current branch, remote refs, merged PRs, and latest
   `main`.
3. Preserve unrelated user changes; do not stash, reset, clean, or broadly
   reformat them.
4. Create a new `codex/` branch from the verified base unless continuing the
   same phase branch.
5. Re-inspect the merged code and tests instead of treating plan file paths or
   prior findings as current truth.
6. Record the exact base commit.

During implementation:

1. Work only inside the active phase.
2. Use version-pinned local fixtures for deterministic tests.
3. Keep live source retrieval separate from offline verification.
4. Stop at the phase's explicit stop conditions.
5. Run targeted tests during development and the full phase gate before
   handoff.

At handoff:

1. Record branch, commits, changed files, commands, results, and limitations.
2. State whether each exit criterion passed.
3. Update the active plan status to `review`; do not mark it `complete` before
   merge and evidence acceptance.
4. Do not start the next phase in the same change set.

## 5. Source hierarchy

The program begins with these official sources:

- USDA FoodData Central FNDDS for prepared and mixed foods;
- USDA Foundation Foods for basic ingredients;
- USDA Branded Foods for specifically identified packaged products;
- Taiwan FDA Nutrition Information Database for defensible Taiwanese food and
  ingredient matches;
- USDA FPED only with a compatible FNDDS release;
- NCI/USDA HEI as a dietary-pattern framework with its version and individual
  use limitations disclosed;
- the current Dietary Guidelines for Americans as guideline context, stored
  separately from the HEI version.

The active phase must recheck source availability, release compatibility, and
license terms before importing data. Academic papers may support a rule, but
they do not replace food-record provenance.

## 6. Program-level success criteria

The program is ready for release review only when:

- every meal and drink has an evidence status;
- every known nutrition value has traceable provenance;
- unknowns and ranges survive through calculation and display;
- all nutrition rules have an evidence class and version;
- selection is reproducible from the recorded trace;
- safety always dominates scoring;
- nutrition dominance is protected from practical fit and rotation;
- seven-day output discloses record coverage and does not claim usual intake;
- source, data-distribution, monotonicity, time-boundary, trace, and safety
  tests pass;
- build, product verification, engine verification, API verification, and
  applicable audits pass;
- BYOK and no-store behavior have not weakened;
- the public limitations match what the implementation actually proves.

## 7. Known program limits

Even after all phases:

- generic and restaurant meals will retain recipe and portion uncertainty;
- self-reported meal records contain omission and quantity error;
- seven days do not establish usual individual intake;
- an evidence-backed general recommendation is not clinical nutrition advice;
- medical conditions, pregnancy, eating disorders, renal disease, diabetes,
  and other specialized needs remain outside the product's validated scope;
- official datasets and guidelines require versioned maintenance.

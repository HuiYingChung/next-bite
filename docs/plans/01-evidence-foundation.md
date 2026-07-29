# Phase 1 — Nutrition evidence foundation

Status: ready
Written: 2026-07-29
Planning baseline: `main` at `bbff438` (`Merge pull request #7 from HuiYingChung/codex/restore-seven-day-history`)

## 1. Objective

Build the first auditable nutrition-evidence layer for NextBite without changing the product's core authority boundary:

- AI may convert the user's words into structured input.
- Deterministic code owns eligibility, calculations, ranking, selection, and the decision receipt.
- Official data and published guidance support nutrition-facing claims.
- Product heuristics remain allowed only when explicitly identified as product heuristics.
- NextBite remains general everyday decision support, not clinical nutrition advice or an individualized adequacy assessment.

This phase is a foundation and feasibility gate. It covers the evidence policy, schemas, source registry, and a representative pilot. It does **not** recalibrate all 100 meals or replace the production ranking algorithm.

## 2. Required starting procedure

The implementation session must:

1. Inspect `git status`, the current branch, local/remote refs, and the latest merged `main`.
2. Preserve any user-owned changes. Do not stash, clean, reset, or broadly format them.
3. Update from the latest `origin/main` if safe and authorized.
4. Create a new branch from that verified base, suggested name:
   `codex/nutrition-evidence-foundation`.
5. Re-read the merged production code before implementing. Do not rely only on this plan or the previous conversation.
6. Record the actual base commit in the final handoff.

If the worktree is not clean apart from this intentional plan file, stop and distinguish expected files from unrelated user changes before editing.

## 3. Fixed product decisions

These decisions are not open for reinterpretation during Phase 1:

1. Do not present component counts as grams, servings, calories, nutrient adequacy, or medical nutrition.
2. Unknown amount is not equal to one serving and must not silently become a positive nutrition signal.
3. A generic source link is not evidence for a particular meal. Meal-level claims require record-level provenance or an explicit `unknown`.
4. Safety and hard eligibility remain above every score:
   - structured `contains / mayContain / unknown` hard-avoid metadata;
   - no alcohol recommendation without explicit opt-in;
   - no energy-drink recommendation without explicit opt-in.
5. Nutrition alignment and practical fit are different concepts. Future ranking must not hide both inside one supposedly scientific score.
6. Fairness and near-tie rotation may eventually act only among nutrition-equivalent candidates. Phase 1 must not change their current production behavior.
7. External nutrition APIs must not be called in the live recommendation path. Production calculations use reviewed, version-pinned local data.
8. No secret or external API key may enter client code, committed fixtures, logs, screenshots, or generated bundles.
9. Preserve existing BYOK, same-origin relay, `store: false`, cache/no-store, and related privacy/security boundaries.

## 4. Authoritative sources for this phase

Use primary, official sources. Record the exact dataset, release, record ID, URL, retrieval date, and applicable license.

### USDA FoodData Central

Source documentation:

- Data types: https://fdc.nal.usda.gov/data-documentation/
- Downloads and releases: https://fdc.nal.usda.gov/download-datasets/
- API guide: https://fdc.nal.usda.gov/api-guide/

Selection order:

1. **FNDDS** for prepared foods, mixed dishes, commonly eaten portions, and foods reported in dietary studies.
2. **Foundation Foods** for basic or minimally processed ingredients.
3. **Branded Foods** only for an actual packaged product whose identity is part of the catalog item. Preserve the product and data version; do not treat one branded product as every generic version of that food.

The API key is a maintenance/import credential only. If used, read it from an ignored environment variable. Tests and the running product must not require it.

### Taiwan FDA nutrition dataset

Source:

- https://data.gov.tw/en/datasets/8543

Use it for Taiwanese foods and ingredients when there is a defensible record match. Preserve the integration number, basis such as per 100 grams, sample information when available, retrieval date, and Open Government Data License version 1.0.

### HEI-2020 and FPED

Sources:

- HEI overview: https://epi.grants.cancer.gov/hei/
- HEI methods and limitations: https://epi.grants.cancer.gov/hei/hei-methods-and-calculations.html
- HEI research uses: https://epi.grants.cancer.gov/hei/uses.html
- FPED overview: https://www.ars.usda.gov/northeast-area/beltsville-md-bhnrc/beltsville-human-nutrition-research-center/food-surveys-research-group/docs/fped-overview/
- Public FPED releases: https://www.ars.usda.gov/northeast-area/beltsville-md-bhnrc/beltsville-human-nutrition-research-center/food-surveys-research-group/docs/fped-databases/

HEI is a total-diet quality framework, not a next-meal prescription. FPED supplies food-pattern equivalents needed for formal HEI calculations.

Do not combine an FNDDS food code with a nonmatching FPED release. At planning time, the public FPED page listed data through 2017–March 2020, while FoodData Central listed FNDDS 2021–2023. Re-verify this during implementation. Until a valid matched linkage and sufficiently complete intake data exist, use labels such as `HEI-2020-aligned component` rather than `HEI score`.

### Dietary Guidelines version boundary

The current Dietary Guidelines for Americans edition and the latest available HEI are not necessarily the same version. Store guideline and scoring-framework versions separately. Do not imply that HEI-2020 has already been validated against a later DGA edition unless an official update explicitly says so.

## 5. Evidence model requirements

The exact TypeScript names may change after inspecting the codebase, but the model must represent the following information without collapsing it into generic links.

### Source reference

Required fields:

- stable internal source-reference ID;
- provider and dataset;
- external record ID;
- dataset release or record version;
- canonical URL;
- retrieval date;
- license or reuse status;
- optional notes about sampling or product variability.

### Quantity and nutrient datum

Required fields:

- numeric value or a bounded range;
- unit;
- basis: per 100 g, per serving, or recipe estimate;
- serving grams or serving range when known;
- confidence: `high`, `medium`, `limited`, or `unknown`;
- source-reference IDs;
- transparent derivation;
- an `unknownReason` when a value is unavailable.

A single guessed midpoint must not replace a meaningful range. Unit conversion code must be centralized and tested.

### Meal evidence profile

Required fields:

- catalog meal ID;
- default serving amount or range and its basis;
- source-mapped ingredients or a defensible matching prepared-food record;
- supported nutrient data;
- supported food-pattern components, if available;
- overall mapping confidence;
- limitations and variability notes;
- provenance for every derived field.

Mixed and restaurant dishes must be modeled as a range or limited-confidence template unless a standardized recipe or specific product supports greater precision.

### Rule evidence

Each nutrition- or product-facing rule must be classified as one of:

- `guideline`
- `validated-index`
- `database-derived`
- `product-heuristic`

It must include:

- stable rule ID;
- evidence class;
- version;
- references;
- limitation;
- calculation or decision description.

Product heuristics must not be cited as nutrition science. A static global `reviewedOn` date must not substitute for rule- or record-level review.

## 6. WP0 — Evidence policy and claim inventory

### Deliverables

1. Add an evidence policy document that defines:
   - accepted source hierarchy;
   - provenance and version rules;
   - confidence meanings;
   - recipe/range handling;
   - unknown propagation;
   - source-refresh policy;
   - claim and display restrictions.
2. Add a current-claim inventory covering at least:
   - `src/evidence.ts`;
   - nutrition-related types in `src/types.ts`;
   - qualitative levels and overrides in `src/data.ts` and `src/catalog-metadata.ts`;
   - thresholds, weights, and nutrition-facing explanations in `src/logic.ts`;
   - nutrition and “source-backed” copy in `src/App.tsx`.
3. For each identified claim or rule, record:
   - current behavior;
   - current evidence, if any;
   - evidence class;
   - whether to retain, relabel, replace, or remove in a later phase;
   - risk if left unchanged.
4. Implement the evidence schema and source registry needed by the pilot.
5. Do not rewrite the production ranking or user interface during WP0.

### WP0 acceptance

- Every inventoried nutrition-facing rule has an evidence class or is explicitly unresolved.
- No new schema makes missing data appear known.
- Source records are versionable and independently reviewable.
- Existing product behavior remains unchanged.
- TypeScript and existing verification still pass.

## 7. WP1 — Representative pilot

### Pilot composition

Select ten existing meal catalog entries only after inspecting the current catalog. Record the selected IDs and why they represent the catalog.

The set must include:

- two relatively simple home-style meals;
- at least three mixed dishes;
- at least two Taiwanese or Chinese-style meals;
- one restaurant- or takeout-variable meal;
- one ready-made or grocery-oriented meal;
- plant and animal protein examples;
- both high- and low-variability mappings.

Also create three beverage evidence fixtures to prove the model can represent:

- a noncaloric ordinary drink;
- an energy drink or other high-caffeine product;
- an alcoholic drink.

The beverage fixtures validate provenance and unknown/range handling only. Do not alter opt-in or drink selection logic in this phase.

### Mapping procedure

For each pilot item:

1. Write a short mapping rationale before assigning values.
2. Prefer a directly matching FNDDS prepared-food record when defensible.
3. Otherwise use a transparent ingredient composition with weights or ranges.
4. Use TFDA when it gives a better supported match for a Taiwanese food or ingredient.
5. Use Branded Foods only for a specific product identity.
6. Preserve the original source values in a minimal reviewed extract.
7. Derive normalized values through tested code rather than hand-copying final totals.
8. Record variability, substitutions, preparation assumptions, and unknown fields.
9. Have a separate review pass compare the committed extract with the official source.

Do not commit multi-gigabyte upstream datasets. Commit only the minimal source extracts needed to reproduce and audit the pilot, subject to the source license.

### Pilot feasibility gate

The pilot passes only when:

- all ten meals and three beverage fixtures have an explicit mapping decision;
- every known value has record-level provenance;
- every unknown has a reason;
- at least eight of the ten meals reach `high` or `medium` mapping confidence;
- no mapping depends only on title substring similarity;
- regenerated normalized output is deterministic;
- committed source extracts contain no secrets or unrelated bulk data.

If fewer than eight meals can reach `high` or `medium` confidence, stop before expanding the catalog. Report whether the catalog needs standardized recipes, broader ranges, renamed meal concepts, or a different data strategy.

## 8. Test requirements

Add focused automated tests for:

- schema validation;
- stable source IDs and release fields;
- per-100-gram and per-serving unit conversion;
- range preservation;
- deterministic derivation;
- missing data remaining unknown;
- invalid or unbounded numeric values being rejected;
- source-record mismatch being rejected;
- FNDDS/FPED release mismatch being rejected;
- product-specific branded data not silently becoming generic;
- confidence not increasing without new evidence;
- no external network requirement in tests or the recommendation path.

Regression verification at the end of the phase:

```text
npm run build
npm run verify:product
npm run verify:engine
npm run verify:api
npm run audit:reachability
npm run audit:drinks
```

If the existing aggregate command remains valid, also run:

```text
npm run verify
```

Inspect generated output and the staged diff for credentials, large accidental datasets, temporary downloads, and changes to no-store/BYOK behavior.

## 9. Explicit non-goals

Phase 1 must not:

- recalibrate all 100 meals;
- replace the current recommendation score;
- publish an HEI total score;
- interpret seven logged days as usual individual intake;
- claim personalized nutrient adequacy;
- add calorie targets, weight-loss targets, diagnoses, or treatment advice;
- add demographic or medical personalization;
- weaken hard avoids, beverage opt-ins, BYOK, server-only key handling, or no-store behavior;
- redesign unrelated user interface;
- deploy or change production configuration.

Issues discovered in these areas should be documented as later work, not pulled into this phase.

## 10. Stop conditions

Stop implementation and report rather than guessing if:

- official data cannot be matched beyond title similarity;
- serving quantity or recipe composition is too uncertain for the intended claim;
- a source release cannot be pinned or its reuse terms are unclear;
- FPED and FNDDS versions do not match;
- a required import would expose an API key to the client or repository;
- the pilot requires production ranking changes to demonstrate success;
- unrelated worktree changes overlap the required files;
- existing security, no-store, or API verification regresses.

An explicit `unknown` or a narrower claim is a valid result.

## 11. Required final handoff

The implementation session must report:

- branch and exact commit(s);
- verified base commit;
- files changed;
- the ten selected meal IDs and three beverage fixtures;
- source datasets and releases used;
- mapping-confidence distribution;
- known/unknown field coverage;
- test and audit commands with results;
- confirmation that ranking behavior was unchanged;
- confirmation that BYOK, API-key handling, and no-store boundaries were unchanged;
- limitations and the decision on whether Phase 2 is viable.

Do not proceed to Phase 2 automatically. Phase 2 should begin only after this pilot is reviewed and accepted.

## 12. Next phase

If the pilot passes, continue with
[`02-deterministic-nutrition-kernel.md`](./02-deterministic-nutrition-kernel.md).
That phase will:

1. replace qualitative nutrition guesses with evidence-derived component signals;
2. preserve AI-parsed amount, portion, and confidence through calculation;
3. separate safety, evidence quality, nutrition alignment, practical fit, and fairness into ordered decision layers;
4. make the decision receipt a complete replay of those layers;
5. add nutrition-dominance, unknown-propagation, and fairness-non-override tests;
6. keep seven-day output descriptive and disclose data completeness;
7. defer all-100-meal migration until the new kernel passes.

# Phase 4 — Rolling seven-day pattern signals

Status: blocked
Entry gate: Phase 3 catalog evidence migration accepted and merged

## 1. Objective

Use the restored seven-day history to provide evidence-aware longitudinal
context without representing seven days as usual intake, a diagnosis, or
personal nutrient adequacy.

## 2. Time and record semantics

Define and test one canonical local-calendar model:

- the history view covers today plus the six preceding local calendar days;
- each saved meal belongs to exactly one local date and meal slot;
- today's records are counted once;
- a daily calculation and a prior-days adjustment must not add today twice;
- the recommendation receipt must name the exact dates and record count used;
- daylight-saving and timezone behavior must be deterministic.

Time-of-day context must have explicit half-open boundaries and tests at every
edge, including 15:00 and 17:00. Do not call 15:00–17:00 “late” unless a
documented product rule intentionally defines and displays it that way.

## 3. Pattern calculations

Calculate only supported signals. Potential components include:

- vegetable and fruit pattern;
- whole-grain and refined-grain pattern;
- protein-source variety;
- seafood and plant-protein presence;
- sodium, added-sugar, saturated-fat, or fiber signals when quantity and source
  coverage support them;
- repeated meal formats and practical variety as product signals.

Rules:

- report record coverage for each component;
- unknown meals do not count as zero or adequate;
- quantity ranges propagate to pattern ranges;
- low-confidence data cannot produce a high-confidence weekly statement;
- today's recommendation may use prior calendar days as context, but the
  receipt must disclose whether today is excluded from that adjustment.

## 4. HEI boundary

Do not display a formal HEI score unless all of the following are independently
verified:

- total-diet records are sufficiently complete;
- food and nutrient quantities are available;
- FNDDS and FPED releases are compatible;
- the official HEI algorithm is implemented and reference-tested;
- the chosen individual-level method is appropriate for the available number
  of records;
- the version relationship to the current DGA is disclosed.

Otherwise use wording such as `HEI-2020-aligned pattern signal` only for
components genuinely derived from that framework.

Seven days may still support useful descriptive feedback, but not usual-intake
or clinical claims.

## 5. Data sufficiency and display

Define evidence-based display states:

- insufficient data;
- early pattern;
- usable descriptive pattern;
- limited by unknown quantity or source coverage.

Do not choose minimum-day or percentage thresholds merely for a visually
pleasing UI. Document each threshold as a measurement/display policy and test
behavior immediately below and above it.

The default screen should remain easy to scan:

- what pattern was observed;
- how it affected the next recommendation;
- how much data supported it;
- where uncertainty remains.

Detailed dates, records, formulas, and provenance should remain available on
demand.

## 6. Required tests

Add tests for:

- rolling seven-day date membership;
- today counted exactly once;
- daily/prior-week separation;
- empty and partially filled weeks;
- duplicate meal-slot prevention;
- local midnight boundaries;
- daylight-saving transitions;
- 15:00 and 17:00 boundaries;
- amount, range, and confidence propagation;
- unknown not becoming zero;
- pattern monotonicity;
- trace and receipt agreement;
- local persistence migration and backward compatibility;
- no network or AI requirement for history calculations.

## 7. Verification gate

Run all targeted history/time tests plus:

```text
npm run build
npm run verify
npm run audit:reachability
npm run audit:drinks
```

Verify representative desktop and mobile flows across multiple dates, refresh,
record editing, and a recommendation generated before and after a boundary.

## 8. Exit criteria

- Seven-day membership and no-double-count behavior are proven.
- Pattern signals use evidence-aware quantities and confidence.
- Data sufficiency and uncertainty are visible.
- No formal HEI, usual-intake, adequacy, or medical claim appears without its
  stricter gate.
- The receipt discloses the exact history basis used.
- Existing persistence, safety, BYOK, and no-store behavior remain intact.

## 9. Required handoff

Report:

- branch, base, and commits;
- canonical date/time semantics;
- pattern components and coverage requirements;
- boundary test table;
- representative trace and receipt;
- persistence migration results;
- full verification;
- remaining individual-intake limitations.

Do not begin Phase 5 until the longitudinal behavior is accepted.

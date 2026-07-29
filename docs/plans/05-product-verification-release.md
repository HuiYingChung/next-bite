# Phase 5 — Product verification and release readiness

Status: blocked
Entry gate: Phases 1–4 accepted and merged

## 1. Objective

Verify the complete nutrition-evidence story as one product and determine
whether it is ready for a release PR. This phase fixes verification-discovered
defects within scope but does not add new nutrition features.

Deployment is not authorized by this plan.

## 2. Verification matrix

### Safety

- structured hard avoids for `contains`, `mayContain`, and `unknown`;
- no string-guess hard filtering;
- alcohol and energy-drink opt-in;
- no fairness, preference, or rotation override of eligibility;
- zero eligible-candidate fallback is safe and truthful.

### Nutrition calculation

- source and release provenance;
- unit and serving conversion;
- ranges and confidence;
- unknown propagation;
- component and ranking monotonicity;
- nutrition dominance;
- no component-count adequacy claim;
- no unsupported formal HEI or medical claim.

### Selection and receipt

- deterministic replay;
- perspective/context adjustment;
- practical-fit effects;
- fairness;
- near-tie set and rotation;
- exact winner;
- UI receipt equality with the stored calculation trace.

### Catalog

- 100-meal coverage;
- drink coverage;
- evidence-confidence distribution;
- source-release compatibility;
- outliers and impossible values;
- useful reachability and diversity.

### Seven-day history

- correct rolling window;
- today not duplicated;
- boundary and timezone behavior;
- persistence and editing;
- data-completeness disclosure;
- descriptive rather than clinical language.

### Privacy and security

- provider key remains ephemeral and client-local only as designed;
- same-origin relay and server-side provider request;
- `store: false`;
- no-store request and response behavior;
- input limits and structured validation;
- error redaction;
- no credential in fixtures, logs, build, source maps, or repository;
- no new third-party runtime nutrition request.

## 3. Required automated evidence

Run:

```text
npm run build
npm run verify:product
npm run verify:engine
npm run verify:api
npm run verify
npm run audit:reachability
npm run audit:drinks
```

Run every added evidence, source, distribution, hard-avoid, drink-safety,
time-boundary, monotonicity, and trace suite.

Tests that require live official sources must be separate from deterministic CI
and must not be presented as a replacement for pinned-fixture verification.

## 4. Product verification

Verify at least:

- manual input without AI;
- AI structured parsing with an authorized test key, if available;
- correction of parsed amount, portion, and confidence;
- hard-avoid conflict;
- alcohol and energy-drink opt-in transitions;
- incomplete and complete evidence cases;
- practical-fit tie;
- near-tie rotation;
- a full rolling seven-day history;
- insufficient weekly data;
- mobile and desktop receipt disclosure;
- refresh and local persistence.

Record what was verified locally, what used a live API, and what remains
unverified. Never expose a key or store user test content.

## 5. Claim and source audit

Review all user-facing nutrition and product claims against:

- the evidence policy;
- current dataset releases;
- rule versions;
- actual test coverage;
- known limitations.

Remove or narrow any claim that exceeds the implementation. Check source links,
record IDs, retrieval dates, license notes, and update policy.

## 6. Release gate

A ready PR may be proposed only when:

- all required local verification passes;
- CI on the exact head passes where available;
- no high-severity safety, provenance, trace, privacy, or claim defect remains;
- medium limitations are documented and do not make the core recommendation
  misleading;
- the worktree and PR scope contain only NextBite changes;
- the final evidence and limitation summary is accurate.

Do not merge or deploy without the user's explicit instruction.

## 7. Required release handoff

Report:

- exact base, branch, and head;
- commits and PR scope;
- automated test counts and results;
- product/API verification evidence;
- source releases and refresh dates;
- catalog coverage and confidence;
- representative safety and trace evidence;
- no-store/BYOK/security confirmation;
- unresolved limitations by severity;
- clear recommendation: ready, not ready, or ready with named limitations.

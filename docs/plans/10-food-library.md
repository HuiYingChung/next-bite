# Food and drink recognition and composition library

Status: review
Authorized: 2026-11-04, user chose “直接實作到網站” after requesting broad
ingredient/drink recognition and nutrient, energy and preference scoring.
Branch: `codex/nutrition-pilot`, base `edf903c` plus existing approved changes.

This authorization expands the earlier 12-recipe data scope. It does not
authorize deployment, accounts, paid live APIs, invented food composition,
or replacement of standardized meal recipes with individual ingredients.

## Implementation

- Pin official TFDA, USDA SR Legacy and FNDDS releases; keep source IDs,
  original preparation descriptions, units, missing values and source licenses.
- Search the local catalog on demand; recognize reviewed bilingual concepts
  without silently treating generic names as exact nutrient records.
- Calculate UK NPM 2018 only when required inputs and compatible fiber basis
  are supported. Show missing inputs otherwise; alcoholic drinks are excluded.
- Show numeric nutrient, energy, product preference and total components,
  with one energy contribution, source details and assumptions expandable.
- Persist explicit source selection separately from the existing recipe IDs;
  validate selections against the local catalog before using their values.
- Keep the existing 100 meal ideas accessible and the 12 standardized recipe
  recommendation path intact. A food composition score is not a meal ranking.

## Exit checks

- Offline snapshot checks, importer parity and data provenance checks.
- Known/ambiguous/unknown names, exact source selection and missing-value tests.
- Published-model arithmetic, alcohol scope, preference bounds and source
  unit checks; existing application verification.
- Browser checks: English/Chinese, search, details, source selection, saved
  record reload, mobile overflow. Preserve the user's separate local origin.

## Handoff

Implemented with 15,438 source records, 309 reviewed concepts and 2,425 reviewed
source identities. Complete/incomplete/alcohol counts: 2,314 / 12,960 / 164.
`npm run verify` passed all build, product, engine, API, storage, presentation,
dashboard, recipe nutrition and food-library gates. New assessment checks cover
54 boundary cases. Source hashes and generated artifacts match offline inputs.
Browser checks cover the eight requested Chinese foods, explicit source
selection, quoted source-name roundtrip, save/reload, name edits, source details,
score availability filters and mobile overflow. See the
[source and maintenance record](../nutrition/food-library.md).

Existing authorized changes were preserved. No commit, push or deployment was
performed. Review does not mean merge, publication or user acceptance.

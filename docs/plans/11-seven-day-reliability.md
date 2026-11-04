# Seven-day record reliability and recommendation evidence

Status: review
Authorized: 2026-11-04. User accepted the six audit corrections: reliable
multi-tab saves, midnight validation, shared food recognition, seven-day
exact-tie variety, actual explanation evidence, and live-path verification.
Branch: `codex/nutrition-pilot`, base `edf903c` plus prior approved changes.

## Scope

- Migrate existing browser records once to IndexedDB, without accounts or a
  server. Serialize comparison and writes in one transaction. Merge changes by
  dated meal slot, profile field, or planned item; reject conflicting edits.
- Preserve editor drafts and original baselines across remote updates. Show
  success only after commit. Check the real calendar date at submission and
  inside the persistence transaction; expired dates require reselection.
- Keep the published-model and preference arithmetic unchanged. Recipes still
  take the actual highest three totals. Today and the previous six local dates
  only separate exact-total ties; meal ideas use history after preference tiers.
- Deduplicate aliases within each recorded meal. Compare recognized protein
  and staple repeat counts, then recency; unknowns do not establish absence.
- Show actual record scope and dated evidence from the ranking trace, collapsed
  by default. Describe recorded occurrences in weekly summaries without claims
  of nutrient adequacy or intake quantities; separate frying and stir-frying.
- Reuse reviewed identities for bilingual source names. Correct the verified
  TFDA draught beer classification so it remains outside nutrition scoring.

## Verification and handoff

Required: full `npm run verify`; real IndexedDB concurrency, failure, migration,
clear and midnight checks; App multi-tab different-slot and same-slot conflict
flows, historical edit/delete, both languages, desktop/mobile inspection.

Verified 2026-11-04:

- `npm run verify` passed all existing gates plus `verify:records`,
  `verify:history-ranking` and `verify:weekly-summary`; `git diff --check` passed.
- 24 persistence assertions and 10 actual browser IndexedDB tests passed,
  covering migration races, concurrent slots, same-slot conflict, aborted
  writes, expired dates, newly rolled dates, stale clear and backup resurrection.
- Live ranking tests passed historical edit/delete, unchanged nutrition and
  totals, aliases/source IDs/languages, today counted once, unknown neutrality,
  exact top-three totals across 24 scenarios and 16 calendar/DST cases.
- 12 actual bilingual history-panel cases and 603 bilingual source-name
  summary checks passed. Source assessment checks now cover 56 cases.
- App browser checks at the isolated localhost origin: different-slot writes
  survive reload; same-slot stale edits preserve drafts and expose latest
  content; explicitly reconfirmed drafts save successfully. Backfilling two
  previous-day soy meals switches tied 20-point recipes; removing one restores
  their order. English ideas and summaries, Chinese recipe receipts and a
  390px mobile view were checked; no page or evidence-row overflow or console
  errors was observed. Default viewport restored and QA tabs closed.
- Screenshots: `output/playwright/seven-day-recommendation-zh.png`,
  `output/playwright/seven-day-mobile-en.png`, and
  `.audit-tmp/record-store-browser.png` (ignored QA artifacts).
- TFDA draught beer is now excluded from model scoring: 2,314 complete,
  12,959 incomplete and 165 outside scope. The source identity index has 5,674
  exact name/group entries, retaining 2,425 reviewed protein/staple identities.

The production build still reports a large JavaScript chunk (approximately
229 kB gzip). No deployment transfer/performance claim is made. Cross-device
sync, cloud backup, and a seven-day nutrient intake assessment remain absent.

No commit, push or deployment is part of this correction. Optional new history
preference points are deferred; no new health or seven-day nutrition score.

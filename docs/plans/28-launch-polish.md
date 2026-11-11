# Launch polish

Status: review — implemented and verified locally; committed on the branch, not pushed
Authorized: 2026-11-10. After a launch-readiness review the user asked for the
noticed problems to be fixed on a new branch, approved the listed scope and
excluded enlarging recipe images.
Branch: `claude/launch-polish`, from `main` at `849fa6d` (PR #16 merge).

## Scope

- Repair the date-dependent launch-state check. `saveLaunchState` pruned the
  seven-day window with the real clock while its test fixed "now" at
  2026-11-03, so the unchanged suite began failing on 2026-11-10. The function
  takes an optional `now` (default: the real clock) and the test passes its
  fixed time to every save.
- Show recipe names without the stored "— standard recipe / （標準配方）"
  marker in the recommendation, alternatives, library, recipe drawer, saved
  plans, sources heading, history explanation and recipe-card tab title. One
  shared helper, `src/recipe-name.ts`, replaces the recipe card's local copy.
  Authored labels, versions, stored plans and the "STANDARD RECIPE" tag are
  unchanged; a meal recorded from a plan now takes the shorter display name.
- At 720px and below on the Next meal view: hide the "Find a meal" shortcut
  (the decision is already first), the description that repeats the subtitle
  and the "NEXT MEAL" eyebrow that repeats the selected tab, and trim two gaps.
  Other views and wider screens keep every control.
- Recapture launch assets from this build: four gallery screenshots, the demo
  recording and a 240 × 240 listing thumbnail rendered from the site icon. The
  capture script uses the project's own Playwright and accepts a relative
  package path. Update the Product Hunt draft (243-character description,
  recipe card, AI-illustration disclosure) and the launch README.
- Update the sitemap date.
- Positioning (user decision, 2026-11-10): public copy describes a bilingual
  meal picker with transparent nutrition. The collection has no soy sauce or
  tofu and uses olive oil in 97 of 108 recipes, so "for Chinese adults in North
  America" is kept only as the stated design origin in the README. Page
  metadata, the method text, the Product Hunt draft, the launch README and the
  study's recruitment line are updated; no recipe or rule changes.

Not included, by decision: larger hero or library images; renaming recipes as
dish names; the default ranking; per-recipe share previews (needs a server
function); legacy IDs in recipe-card links; JavaScript chunk splitting; the
GitHub repository description. No nutrition data, ranking rule, storage
format, dependency or deployment change.

## Verification

- `npm run verify` passed after the changes, including `verify:launch`, which
  had failed on the unchanged code earlier the same day.
- `scripts/verify-recipe-library-ui.mjs` passed against the local development
  server: 108 recipes, both languages, 216 detail views, widths 320/390/768/
  1280 px, save/reload and zero page errors.
- In-app browser at 375 × 812: the primary action ends at 789 px in English
  and 742 px in Traditional Chinese (previously 885 px on the live site), with
  no horizontal overflow. At desktop width the recommendation, alternatives,
  Plans, Library, recipe drawer and Chinese recipe-card title show no marker,
  and "Find a meal" remains. No console errors.
- All four screenshots and the thumbnail were opened and inspected.

Not verified: a physical phone (browser toolbars reduce the visible height
below the emulated 812 px), native print/PDF output, the real AI provider,
and the Product Hunt editor's current field limits. No push, merge or
deployment was performed. The usability study has not been run.

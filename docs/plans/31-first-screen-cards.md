# First screen: three options side by side

Status: review — implemented and verified locally; committed, not pushed
Authorized: 2026-11-10. Round three of the recommendations from the
product-logic review. The user reviewed a static mockup first, chose the
image-top card layout for wide screens and approved the scope below.
Branch: `claude/first-screen-cards`, from `claude/main-protein-preference`
(`27af750`).

## Problem

- The first screen showed one recipe in full and two small alternatives, so
  comparing meant scrolling. On a 375 × 812 phone the main action ended at
  789 px, and below the screen once a preference was selected.
- Five selects sat beside the suggestion; the two people use most (staple and
  main protein) were no easier to reach than the rest.
- The heading repeated the tab ("Find a meal") and each card repeated
  "STANDARD RECIPE"; ordering and scope notes sat between the controls and the
  options.

## Scope

1. Staple and main protein are one-tap choices in two rows. On narrow screens
   the rows scroll sideways and use shorter labels. Style, hunger, portion,
   preparation, temperature, ingredient readiness and time limit move into
   "More conditions", which states how many are set while closed.
2. The three options of the current group are shown together: image-top cards
   on wide screens, compact rows up to 860 px. Each card states time, style,
   name, actual matched preferences, and energy, protein and (wide screens)
   fiber for the shown portion. Wide screens offer "Choose this meal" and
   "Details" on every card; on narrow screens the selected row shows them, the
   first row is selected by default, and tapping another row selects it.
3. Details (match count, unmatched selections, recipe card link, calculation
   receipt, nutrition and preparation) open for one recipe at a time: under
   the three cards on wide screens, inside the row on narrow ones.
4. The heading no longer carries actions on this view. Recording is a row
   under the options that lists today's records once there are any. Other
   views keep "Record a meal" in the heading.
5. One line above the options states the position in the order, that these are
   standard recipes and that options take turns each meal. The scope note for
   this meal's conditions moved into "More conditions"; the ordering rule is
   in "Data & method", where it already was.
6. Changing a condition no longer shows a banner above the options, which
   moved them under the pointer; the change is still announced to assistive
   technology. Paging is announced by the position line.

Unchanged: the engine, ranking policy, nutrition levels, rotation, exclusions,
recipe data, stored state, and the Records, Plans and Library views.

Also fixed: `.sr-only` was used in three components but never defined, so
"(opens a new tab)" and two screen-reader labels were visible. It is now
defined once.

Removed with the old layout: its style rules (355 lines), the `hero` image
size and the "Adjust this meal / See updated options" jump links.

Rejected: a fixed action bar at the bottom of the phone screen (covers content
and competes with the browser toolbar); putting staple in a select to save a
row; horizontal rows on wide screens (the mockup's layout B, which keeps
images at 200 px; the user chose A).

## Measurements

English, no preferences, local development server, 2026-11-10.

| Viewport | Before | After |
| --- | --- | --- |
| 375 × 812, main action bottom | 789 px | 501 px |
| 375 × 812, options visible without scrolling | 1 | 3 (third ends at 760 px) |
| 1280 × 900, options with image visible | 1 large, 2 thumbnails | 3, each 390 px wide |
| 1280 × 900, main action bottom | within the first screen | 888 px |

On wide screens the images now take the first screen: on a window shorter
than about 890 px the "Choose this meal" buttons are below it, although the
whole card opens details. This follows the chosen layout and is open for a
decision (see below).

## Verification

- `npm run verify` passed.
- `scripts/verify-recipe-library-ui.mjs` passed against the local development
  server in both languages at 320, 390, 768 and 1280 px: three options with
  images, position stated once, no reasons without preferences, details
  closed by default and operable by keyboard, one action set on narrow screens
  and three on wide, row selection, main-protein and staple choices matching
  the engine's order, the set-conditions count, no banner on condition
  changes, paging, receipt, saved plan after reload, zero page errors.
- `verify-dashboard.mjs` now checks the card facts component: actual matches
  only, energy and protein equal to the calculation, unknown values omitted.
- In-app browser: 1280 × 900, 768 × 900, 375 × 812 and 320 × 800 in English
  and Traditional Chinese; "More conditions" open and closed; example mode
  with a record today; no horizontal overflow; console clean.

Not verified: a physical phone or touch scrolling of the choice rows; screen
readers; whether people notice that the rows scroll sideways.

## Open for the user

- Wide screens shorter than about 890 px: keep 4:3 images, or crop them
  shorter there so the buttons stay on the first screen.
- Wording of the new heading ("Three for dinner" / "晚餐的三道選擇"), the short
  labels on narrow screens and whether cards should state energy and protein.

# Launch fixes after the first-screen change

Status: review — implemented and verified locally; committed, not pushed
Authorized: 2026-11-10, after a second launch-readiness review of the merged
build (`9b4cbbb`). The user approved three small fixes.
Branch: `claude/launch-fixes`, from `main`.

## Problems and fixes

1. **The heading named a meal the options did not fit.** Round three added a
   heading by meal window. On the live site at 08:00 it read "Three for
   breakfast" above a lentil noodle box, because recipes are not sorted by
   meal type. The heading is now "Three for your next meal" / "下一餐的三道選擇"
   at every hour. Sorting by meal type would need a reviewed tag on all 108
   recipes and is not part of this change.
2. **The options jumped on every load.** "Loading your saved records…" was
   shown above the view until the browser store answered, then removed.
   Measured before the fix, three runs each: the first option moved from 405
   to 335 px at 390 × 844 (layout shift 0.064) and from 490 to 426 px at
   1280 × 900 (0.034). On the next-meal view the loading state now appears in
   the records row under the options, where the records will show, and is
   still announced to assistive technology. Other views keep the banner.
   After the fix both sizes measure 0 in three runs each.
3. **The GitHub repository description** still said "based on your habits,
   preferences, and balance", the opposite of the public positioning. Changed
   on GitHub with the user's approval; it is not a file in this repository.

Unchanged: the engine, ranking, recipes, stored state and every other view.

## Verification

- `npm run verify` passed.
- `scripts/verify-recipe-library-ui.mjs --flows-only` passed against the local
  development server; it now checks the heading text in both languages and
  that no banner sits above the options.
- Layout shift measured with the browser's `layout-shift` entries and the
  first option's position on every frame, before and after, as above.
- In-app browser: heading in English and Traditional Chinese, records row
  text after loading, console clean.
- Launch screenshots and the demo video recaptured for the new heading.

Not verified: a slow or blocked browser store, where the loading text would
stay visible in the records row for longer.

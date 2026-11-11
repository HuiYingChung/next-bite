# Button fixes

Status: review — implemented and verified locally; committed, not pushed
Authorized: 2026-11-11. The user asked for every button's logic to be checked.
Each kind of button, quick choice, disclosure and link was clicked in a real
browser against the merged build (`069d2e8`) and compared with what it should
do: 96 controls, 93 as expected, no page errors. The user approved fixing the
three that were wrong.
Branch: `claude/button-fixes`, from `main`.

## Problems and fixes

1. **The thirteenth plan removed the wrong one.** Plans are capped at 12 and
   the oldest should make room. `savePlan` put the new plan first and cut the
   list from the end, while the record store keeps new plans at the end. Once
   a list had been stored and reloaded, the cut removed the most recently
   saved plan and kept the oldest. Measured with a real clock: after thirteen
   choices the first was still saved and the twelfth was gone. Nothing on
   screen said a plan had been removed.
   `savePlan` now removes the plan with the earliest creation time, wherever
   it sits in the list, and appends the new one as the store does. The
   confirmation names the plan that was removed, on the next-meal view and in
   the recipe drawer.
2. **An empty slot in Records opened as an edit.** The draft targets that day
   and meal, and the heading and button were chosen from "has a target". They
   read "Edit your meal" and "Save changes" for a record that did not exist.
   They now read "What have you eaten?" and "Save this record"; an existing
   record still reads "Edit your meal" and "Save changes". Where the record is
   saved was already correct.
3. **Clearing data from Traditional Chinese answered in English.** The handler
   reset the page to English and its confirmation was an English literal. The
   page now stays in the language in use and the confirmation is in both
   languages. The stored language choice is still removed, as the dialog says;
   the dialog now adds that the page keeps its language until it is left.

Unchanged: the limit of 12 plans, where records are stored, what "Clear all"
removes from browser storage, the engine and recipes.

Rejected: keeping the stored language choice after clearing (the dialog
promises to remove it); silently raising the plan limit.

## Verification

- `npm run verify` passed. `verify-launch-state.mjs` now saves a thirteenth
  plan into lists ordered oldest first, newest first and shuffled, and checks
  that the oldest is removed, the most recent earlier plan is kept and the
  same twelve survive normalization.
- `scripts/verify-recipe-library-ui.mjs --flows-only` passed against the local
  development server, with a new path in both languages: thirteen choices,
  the notice naming the removed plan, the twelve kept; an empty and a recorded
  slot in Records; clearing data, the page language and the removed stored
  choice.
- The button audit scripts were rerun: the three controls now behave as
  expected.

Not covered by the audit: retry buttons that appear only when data fails to
load; the notice button for a staple absent from the collection, which cannot
occur with the current recipes; the native print dialog (only that `print()`
is called once); a real AI request; widths other than 1280 and 390 px.

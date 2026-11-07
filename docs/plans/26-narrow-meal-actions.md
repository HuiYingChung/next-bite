# Narrow-screen meal actions

Status: review — implemented and verified locally
Authorized: 2026-11-06. User reported the description and two collection
actions breaking into an uneven layout on a narrow screen.
Branch: `codex/narrow-meal-actions`, from PR #15 merge `239c9cc`.

The toolbar had three grid children but only two mobile columns. Group the
two buttons, keep description/actions side by side on desktop, and place the
description above a left-aligned wrapping action row at 720px and below.
Use the full available width, reduce the row gap, and retain 44px button
targets and existing navigation/focus behavior. No recommendation rules change.

Verification:

- Production build and `git diff --check` passed.
- Actual browser at 478px: English and Traditional Chinese action labels
  share a row with equal 44px heights; no horizontal document overflow.
- Browse opens the full recipe library; Adjust focuses the meal conditions.
- No browser console errors observed. Other viewport widths were not
  exercised in this iteration; an independent CSS review found no blocker.
- Screenshots: `output/playwright/narrow-meal-actions/en.png` and `zh.png`.

On 2026-11-07 the user authorized releasing this follow-up with plan 27's
printable recipe cards. The preceding recipe/copy version was committed,
pushed and merged separately in PR #15; its PR/main CI and Vercel deployment
status passed.

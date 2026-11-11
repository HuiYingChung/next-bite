# MealHatch launch preparation

Status: draft materials; no Product Hunt publication or user study is claimed.
Prepared for the 2026-11-05 launch-experience iteration; copy and assets updated
on 2026-11-10 for the build with recipe images, concise cards and printable
recipe cards.

MealHatch's proposed launch message is a small, complete meal-choice workflow:
compare a few options with current preferences first, understand why they
appeared and save one for later. The public message is a bilingual meal picker
with transparent nutrition. The design began from Chinese adults in North
America, but the recipe collection does not yet carry familiar home dishes, so
that audience is no longer a launch claim.
The meal library offers 130 defined recipes with portion estimates, preparation
steps and inspectable numeric ranking. Food/drink source lookup is separate.

- [Product Hunt copy, four gallery captions and short demo storyboard](./product-hunt-draft.md)
- [Five-person usability protocol and empty results template](./usability-study.md)
- [Implementation scope and actual verification status](../plans/28-launch-polish.md)

## Captured review assets

The gallery screenshots, video and thumbnail below were captured from a local
preview of the `claude/launch-fixes` branch on 2026-11-10. They show the
three option cards with one-tap staple and protein choices, one option's
calculation details and the printable recipe card. Recapture if the interface changes again, and recheck
all assets against the final live build before publication; none is evidence
of published launch results:

- [Choose a meal](./assets/01-choose-a-meal.png) — 1270 × 760, the unscrolled first screen; card images are cropped at this height.
- [Pick noodles](./assets/02-match-your-preference.png) — 1270 × 760, scrolled past the site header because the reason line makes the cards taller.
- [Inspect the recipe scoring basis](./assets/03-inspect-the-basis.png) — 1270 × 760, scrolled detail.
- [Print the recipe](./assets/04-print-the-recipe.png) — 1270 × 760, recipe card preview.
- [Listing thumbnail](./assets/thumbnail-240.png) — 240 × 240, rendered from the site icon.
- [Silent first-use demo](./assets/mealhatch-demo.webm) — paced first-use recording; ends on the saved plan.
- [Social preview](../../public/social-preview.png) — 1200 × 630, used by the page's OG/Twitter metadata.
- [Capture notes](./assets/capture-notes.md).

The video is paced for readability, with no claims about user completion time.
Captions in the copy draft are editorial suggestions and are not burned into
the recording. A video host/upload is a later publishing step.

To regenerate from a running local preview, use this project's pinned
Playwright development dependency (authoring tools only, not shipped in the app):

```text
node scripts/capture-launch-assets.mjs ./package.json http://localhost:5174/
node scripts/render-social-preview.mjs
```

The capture script refuses non-local origins and uses a fresh isolated context,
blocking analytics and all non-local requests. The social preview source is
[`assets/social-preview.html`](./assets/social-preview.html).

## Before publication

Use a fresh empty workspace or the explicitly labeled example for public
screenshots and recordings. Never include personal meal records, API keys or
participant details. Describe estimates for the stated recipes and portions.
Public copy must not imply that similarly named restaurant meals have the same
values, that a score measures individual health, or that a saved plan means a
meal was eaten.

Before publishing, inspect the final assets and live version, run the manual
study and address any confusing first-use behavior. If optional AI is part of
the launch demonstration, first verify it against the real provider using a
session key outside screenshots or recordings. Mock success is insufficient
for that claim.

Use the current Product Hunt editor for upload and scheduling requirements.
This pack intentionally does not freeze image limits or submission rules.
The official [featuring guidelines](https://help.producthunt.com/en/articles/9883485-product-hunt-featuring-guidelines)
describe editorial selection; a working launch or a vote count does not
guarantee a feature. Invite people to try the product and share feedback,
consistent with Product Hunt's
[community voting guidance](https://help.producthunt.com/en/articles/484935-can-i-ask-my-community-friends-family-to-upvote-a-product).

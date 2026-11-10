# Product Hunt draft

Draft for review, not submitted. Recheck wording against the final live build
and the current Product Hunt editor before publication.

## Product name

MealHatch

## Tagline

Your next meal, with your preferences first

## Description

MealHatch is a bilingual meal picker with transparent nutrition. What sounds
good comes first, with sourced nutrition as a reference. Compare 108 recipes,
print a recipe card and save a plan. English and Traditional Chinese. No
account needed.

243 characters as one line, drafted to fit a 260-character field. Confirm
the limit in the current Product Hunt editor before submitting.

## Maker comment

I built MealHatch around a familiar moment: being ready to eat but still
scrolling through possibilities. It is bilingual, in English and Traditional
Chinese, for people who prepare their own meals. The recipes are simple,
sourced formulations; familiar home dishes are not covered yet.

You can start with a few suggestions, change what sounds good, inspect the
reason for a suggestion and save a plan. One meal library brings together 108
defined recipes with stated portions, preparation steps, source links and
numeric comparisons. Current-meal preferences take priority over saved
preferences, then composition. Every calculation remains inspectable, with
details closed until you need them. It is about choosing the next meal, without
grading your habits or setting weight-loss goals. Each recipe opens as a
one-page card with weighed ingredients and steps to print or save. A separate
food and drink lookup helps with recording. Food images are AI-generated
illustrations of the stated recipes, not photographs.

The core workflow runs without an account or AI key. Optional AI organizes a
meal description for review; deterministic rules select the recommendations.
Records stay in your browser, and a saved plan is separate from what you ate.

I would love feedback on the first minute: can you find an option you would
actually choose, and does its explanation help? If something feels confusing
or an expected preference is missing, please tell me where you got stuck.

## Four gallery views

Use actual screenshots from the reviewed build, in the order below. A fresh
visit starts with empty personal records; if using the optional example instead,
keep its label visible. Captions explain the task rather than promise a health
outcome. Source files and any export dimensions belong with the assets.

| View | Capture | Caption | Alt text |
| --- | --- | --- | --- |
| 1. Choose | Default view scrolled so the three options and their save actions are visible | Three options. One next meal. | MealHatch shows one-tap staple and protein choices above three recipe cards, each with a photo-style image, time, energy, protein and an action to choose the meal. |
| 2. Adjust | Noodles selected and the actual matching options | What sounds good comes first. | With noodles selected, three noodle recipes appear; each card states the preference it matches. |
| 3. Understand | One option's details opened to the calculation's input table | Details when you want them. | A recipe shows its current and saved preference calculations, composition reference, model inputs, thresholds and sources. |
| 4. Make it | The printable recipe card opened from the recommendation | A recipe you can follow. | A one-page recipe card shows the dish, portion, nutrition estimate, weighed ingredients and numbered steps, with print and paper-size controls. |

Captured files: `assets/01-choose-a-meal.png` to `assets/04-print-the-recipe.png`,
1270 × 760 each. Listing thumbnail: `assets/thumbnail-240.png`, 240 × 240.

Do not show a preference match unless the actual displayed option matches it.
With several current preferences, matched groups are compared together. Other
conditions can remove matches. Show the actual fit and any compromise; do not
stage a stronger claim or imply that an avoid was relaxed.
If copy overlays are used, preserve the legibility of the underlying interface.

## Short demo storyboard

Target about 25 seconds; keep enough time to read the meal names. Record the
actual interface in a fresh isolated browser with empty records and no API key.
This is an editorial draft, not a claim about observed user completion time.

| Time | Action | On-screen caption |
| --- | --- | --- |
| 0–5 s | Open the fresh default view and pause on the three options. | What sounds good for your next meal? |
| 5–11 s | Tap Noodles. Pause on the updated options. | One tap. Three new options. |
| 11–17 s | Open one option's details and its calculation briefly. | See why an option appeared. |
| 17–22 s | Save the meal, then open Plans. | Save a plan for later. |
| 22–27 s | Pause on the saved plan with the MealHatch name. | Try MealHatch. No account needed. |

Leave the detailed-recipe scoring demonstration to the third gallery image so this
short video has one complete task. If a recording requires cuts, preserve the
order and actual outcomes; do not speed it up to imply measured usability.

## Claims to keep out of launch copy

- A featured placement, rank, user count or successful study that has not happened.
- Individual calorie targets, nutrient adequacy, predicted fullness or medical advice.
- Complete scores for every food-library record, or estimates for unspecified restaurant meals.
- AI choosing the winner, or live-provider reliability inferred from mocks.
- A proven reduction in decision time before observing and comparing sessions.
- Food images presented as photographs of real cooked meals.
- A fit for a specific cuisine or community that the recipe collection does not yet show.

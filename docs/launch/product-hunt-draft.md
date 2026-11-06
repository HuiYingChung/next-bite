# Product Hunt draft

Draft for review, not submitted. Recheck wording against the final live build
and the current Product Hunt editor before publication.

## Product name

MealHatch

## Tagline

Your next meal, with your preferences first

## Description

MealHatch helps Chinese adults in North America choose their next meal.
What sounds good comes first, with sourced nutrition as a reference. Compare
108 recipes, check what preparation they need and save a plan. Every scoring
step is available when you want it. English and Traditional Chinese. No account
or AI key needed for the core workflow.

## Maker comment

I built MealHatch around a familiar moment: being ready to eat but still
scrolling through possibilities. The design focuses on Chinese adults in North
America who use English or Traditional Chinese and prepare their own meals.

You can start with a few suggestions, change what sounds good, inspect the
reason for a suggestion and save a plan. One meal library brings together 108
defined recipes with stated portions, preparation steps, source links and
numeric comparisons. Current-meal preferences take priority over saved
preferences, then composition. Every calculation remains inspectable, with
details closed until you need them. It is about choosing the next meal, without
grading your habits or setting weight-loss goals. A separate food and drink
lookup helps with recording.

The core workflow runs without an account or AI key. Optional AI organizes a
meal description for review; deterministic rules select the recommendations.
Records stay in your browser, and a saved plan is separate from what you ate.

I would love feedback on the first minute: can you find an option you would
actually choose, and does its explanation help? If something feels confusing
or an expected preference is missing, please tell me where you got stuck.

## Three gallery views

Use actual screenshots from the reviewed build, in the order below. A fresh
visit starts with empty personal records; if using the optional example instead,
keep its label visible. Captions explain the task rather than promise a health
outcome. Source files and any export dimensions belong with the assets.

| View | Capture | Caption | Alt text |
| --- | --- | --- | --- |
| 1. Choose | Default recipe view, main meal and save action visible | A few options. One next meal. | MealHatch shows preference controls, a defined recipe, its portion estimates and an action to save the meal. |
| 2. Adjust | A selected noodle preference and actual matching options | What sounds good comes first. | The noodle preference changes the suggestions; actual fit reasons appear beside each option. |
| 3. Understand | The initially collapsed calculation opened to its input table | Details when you want them. | A recipe shows its current and saved preference calculations, composition reference, model inputs, thresholds and sources. |

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
| 0–5 s | Open the fresh default view and pause on the main suggestion. | What sounds good for your next meal? |
| 5–11 s | Open meal preferences and choose noodles. Pause on the updated options. | Adjust a preference. Compare a few options. |
| 11–17 s | Open the recommendation basis briefly. | See why an option appeared. |
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

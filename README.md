# MealHatch

Live site: [mealhatch.vercel.app](https://mealhatch.vercel.app/).

MealHatch was previously named NextBite. The previous public address is retired.
Browser records do not transfer automatically between addresses; the app
currently supports JSON export, without an import flow. Storage keys, export
format identifiers, evidence IDs and API headers retain their existing names
for compatibility.

**Less deciding. More eating.**

MealHatch is a bilingual meal picker with transparent nutrition. It helps you
choose your next meal, with what you want to eat taking priority and sourced
nutrition as a reference. Compare a few options, inspect why they appeared, and
save a meal plan or record what you actually ate. It does not grade eating
habits or set weight-loss goals.

The design began from the everyday meals of Chinese adults in North America.
The current recipes are simple sourced formulations that do not yet cover
familiar home dishes or their seasonings, so that audience is a starting point
for future work, not a description of the present collection.

The beta supports **English and Traditional Chinese**, with no account required.
The main workflow runs in the browser with deterministic recommendation rules.
Optional AI helps organize a meal description before you review it.

All 108 recipes have AI-generated food illustrations, disclosed once in the
shared footer. These static local images are tied to the matching recipe
version and load as needed. Images do not determine nutrition, portion amounts
or ranking. Older plans without a matching recipe version remain text-only.
See [image provenance and preparation](docs/recipe-images/README.md).

## What you can do

1. Start with **108 defined recipes**, compare three options side by side and save a plan. A fresh
   visit starts with your own empty records; no meal logging is required first.
   An explicitly labeled example remains available to explore separately.
2. Pick a staple or main protein with one tap, set further conditions under
   **More conditions**, and open **Details** on any option for stated portions,
   nutrient estimates and numeric ranking details. Set whether ingredients are
   ready; assembly estimates are not full cooking times. Availability is shown
   when preferences cannot be matched. Browse every
   detailed recipe in **Meal library → Recipes**, including options outside the
   top three; current exclusions still apply when choosing a meal.
3. Open a **Recipe card** from a recommendation, library recipe or saved plan.
   Print it or save a PDF with the selected portion's ingredients, complete
   steps, nutrient estimates and sources. Or record what you actually ate: add foods manually,
   recognize familiar names and optionally select an exact nutrition source.
   Revisit plans and edit records in the rolling seven-day view.

The meal collection and the source lookup serve different tasks:

| Collection | Current scope | What it provides |
| --- | --- | --- |
| Meal library (default) | 108 defined recipes | Ingredient weights, preparation steps, portion estimates, source links and numeric ranking components; searchable details and eligible plan selection. |
| Food and drink library | 15,438 source records and 309 reviewed bilingual concepts | Searchable composition records, name recognition, and scores where the required evidence is complete. |

Source records include different preparations and datasets; they are not a
count of unique ingredients. Broad names such as “fish” do not automatically
select a specific nutrient record. Unknown foods can still be recorded.

The detailed collection includes rice, noodles, bread, potato and grain/legume
meals. Each is a specified preparation, not an estimate for every restaurant
or packaged version with a similar name. New ingredients use a separate pinned
USDA snapshot; no live nutrition service or account is needed. Current meal
names and avoidance metadata follow the actual recipes. Older saved meal ideas
retain their original descriptions; four unsupported dumpling concepts are
available only through existing plans, without invented nutrition estimates.

## How recommendations work

The recommender first applies ingredient avoids, strict meal conditions and
evidence completeness. It compares eligible recipes in this explicit order:

```text
1. Current-meal preference points (higher first)
2. Saved preference points (higher first)
3. Nutrition level of the nutrition reference (higher first):
   18 or more, 14 to 17, 13 or less
   Nutrition reference = nutrient component + energy component
                       = 10 - raw UK NPM 2018 score
4. Recent-record variety, then a different staple (or main protein) among
   options offered together
5. Rotation by date and meal window, then stable recipe ID
```

Each preference group contributes 0 or 2 product points. Current-meal groups
are staple, main protein, style and preparation. A stronger current-meal
match takes priority over saved preferences and composition; nutrition cannot
cancel that preference by adding more points. These are product priorities, not
scientific percentage weights. Unmatched soft preferences remain visible and do
not bypass hard exclusions. No selected preferences means composition leads.

Composition is compared per **100 g of edible recipe weight**, with energy
counted once within the unchanged published model. It is not a percentage,
official health grade or estimate of individual needs. All input values,
thresholds, component formulas, preference calculations and sources remain
available in the collapsed **Match & nutrition details**.

The first three eligible recipes in that order are shown, or fewer when
exclusions leave fewer candidates; **Show three more** continues through the
same order. Recipes are compared by nutrition level because single points are
too fine to order mixed meals by; the levels are product rules and the exact
reference stays in the details. **Recipes tied on all three preceding values
use seven-day history**: recognized protein-source and staple repetitions, then
recency. Options offered together then differ in staple where possible, and
the remaining ties take turns by date and meal window, so suggestions change
through the day and week without randomness. The explanation shows record
coverage, the dates and foods actually used, and the date and meal window of
the rotation. The same inputs, records, date and meal window, recipe/source
versions and ranking-policy version reproduce the same result.

Times describe assembly using prepared ingredients. If ingredients still need
preparation, full cooking time is unknown. Setting a time limit in that state
cannot produce a confirmed timed option; removing the limit allows browsing
with this qualification. The app does not invent cooking times.

The original 12 recipes include bilingual cooking steps, edible-weight guidance,
safe cooking endpoints and linked preparation references in **Make it happen**.
Reference times apply to individual ingredients; complete meal durations have
not been kitchen-tested. Cards use compact assembly labels, with full timing
explanations available on demand. Saved plans retain the recipe and preparation
details in a collapsed section.

**Recipe card** opens a separate reading view with a Letter/A4 paper preview.
The compact print layout keeps complete ingredients, steps and source links,
with 9.5pt main text. Use 100% scale and turn off browser headers and footers
when printing or saving a PDF. Page fit is checked in the preview; if future
content is too long, it continues onto another page rather than being cropped.

Changing portion size changes the whole-portion estimates, while the per-100-g
composition score stays the same. Hunger suggests an editable recipe portion.
Recorded amounts are retained but do not calculate daily nutrient intake or
calorie needs. The current scope is everyday meal selection for general healthy
adults; missing records do not establish a nutrient deficit.

See the [scoring policy](docs/nutrition/decision-policy.md) and
[model-input provenance](docs/nutrition/model-input-provenance.md) for the formulas,
thresholds, assumptions and limits.

## Records and privacy

- Records cover today and the previous six local calendar dates. Older entries
  leave the window; export a JSON copy from **Data & method** to keep a copy.
- Records, plans and saved preferences use **IndexedDB** in the current browser.
  Older local snapshots migrate automatically. Language is stored in localStorage.
  There is no account, cloud backup or cross-device synchronization.
- Changes to different meal slots can be saved from separate tabs. Conflicting
  edits to the same slot preserve the draft and require review of the latest
  record. Dates are checked again at save time, including across midnight.
- Weekly summaries count recorded occurrences and recognized foods. They keep
  unknowns visible and distinguish stir-frying from frying.
- Example records and plans stay separate from personal data. Exports exclude
  example data and API keys. Printable recipe cards contain only public recipe
  content and the selected portion/language, without personal records or preferences.
- Vercel Web Analytics records basic visit statistics. The app strips query
  strings and fragments from analytics URLs and does not attach meal records,
  descriptions or API keys to events. No custom task-completion events are
  configured, so visit counts do not establish whether people chose a meal.
  See [Vercel's analytics privacy information](https://vercel.com/docs/analytics/privacy-policy).

Optional AI sends the entered description and session API key through the
same-origin `/api/parse-meal` route to OpenAI. The key stays in page memory and
is excluded from saved records and exports. Requests use `store: false` and
no-store caching; provider retention policies still apply. AI prepares editable
input; deterministic code calculates scores and selects recommendations.

## Run locally

Use Node.js 24, the version configured in this repository's CI, and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Manual recording, recommendations and the
food library require no API key or environment variables.

The development server also runs `/api/parse-meal` using the same handler as
production. To test optional AI, open **Record what you ate → Optional AI**, enter
your session OpenAI key, describe one meal, and choose **Organize & review**.
Review the editable result before saving. Keys are kept in page memory; do not
put them in source files or environment files. Restart an older development
server after updating the Vite configuration.

```sh
npm run build
npm run preview
```

The production frontend is written to `dist/`. Both local development and
preview servers include the AI route. A deployed site still needs a host that
executes [the API handler](api/parse-meal.mjs) at `/api/parse-meal`; uploading
`dist/` to static hosting alone does not provide that route.

## Verify changes

```sh
npm run verify
```

This runs the build and checks for product rules, deterministic ranking, API
validation, persistence, bilingual presentation, dashboard receipts, nutrition
calculations and source-data consistency. Focused checks include:

| Command | Coverage |
| --- | --- |
| `npm run verify:api` | Provider/client mocks, amount validation, cancellation and safe errors. No real key or provider request. |
| `npm run verify:ai-ui` | Actual editor handlers: harmless interactions, stale results and localized errors. |
| `npm run verify:local-api` | Development and preview routes with a mocked provider, including success and invalid requests. |
| `npm run verify:records` | Transaction merge rules, conflicts, expiry and storage failures. Also generates an isolated browser harness for actual IndexedDB checks. |
| `npm run verify:history-ranking` | Current recipe ranking, legacy compatibility, historical edits/deletions, exact ties and calendar boundaries. |
| `npm run verify:weekly-summary` | Recorded-slot counts, aliases, source identities and bilingual summaries. |
| `npm run verify:food-library` | Pinned source hashes, generated data, recognition and scoring availability. |
| `npm run verify:recipe-card` | All recipe/portion/language links, source-derived nutrient amounts, complete rendered ingredients and steps, and private-data exclusion. |

Iteration-specific verification and remaining checks are recorded in the
[printable recipe card plan](docs/plans/27-printable-recipe-cards.md),
[recipe imagery plan](docs/plans/24-recipe-imagery.md),
[preference-first plan](docs/plans/23-preference-first.md),
[catalog consolidation plan](docs/plans/22-catalog-unification.md),
[launch-experience plan](docs/plans/13-launch-experience.md),
[AI reliability handoff](docs/plans/12-ai-reliability.md) and
[seven-day reliability handoff](docs/plans/11-seven-day-reliability.md).
The generated IndexedDB browser harness requires a separate browser run;
`npm run verify` does not itself automate the app's browser interactions.
Browser verification uses this project's pinned Playwright development
dependency. Install Chromium with `npx playwright install chromium --only-shell`;
the existing UI verifier can use the local package without another checkout:

```sh
node scripts/verify-recipe-library-ui.mjs --flows-only
```

Mocked AI checks do not verify real account/model access, extraction quality,
latency or long-description behavior. Those still require a real-provider test.

The [launch preparation pack](docs/launch/README.md) includes draft public copy,
gallery captions, a short demo storyboard and a five-person usability protocol.
These materials are preparation, not evidence of a Product Hunt launch or
completed user research.

## Data and project structure

Food data comes from pinned USDA SR Legacy, USDA FNDDS and Taiwan FDA releases.
The site loads its static catalog on demand from its own host, with no live
nutrition API dependency. Source updates require reviewed imports and verification.
See [data sources, attribution and limitations](docs/nutrition/food-library.md)
for release details, licensing and score availability.

| Location | Responsibility |
| --- | --- |
| `src/App.tsx` | Dashboard, meal editor, preferences and plans. |
| `src/RecipeCard.tsx`, `src/recipe-card-route.ts` | Public recipe preview, print layout and version-checked recipe links. |
| `src/nutrition.ts`, `src/nutrient-profile.ts` | Recipe calculations and published-model scoring. |
| `src/recipe-catalog.ts`, `src/data.ts` | Current recipe-backed meal catalog and retained legacy idea data. |
| `src/logic.ts`, `src/history-variety.ts` | Shared meal rules, legacy selection diagnostics and seven-day variation. |
| `src/record-store.ts`, `src/use-record-state.ts` | Transactional persistence and cross-tab updates. |
| `src/weekly-summary.ts`, `src/food-identity.ts` | Recorded-food summaries and identity matching. |
| `data/`, `public/food-library/` | Source snapshots, reviewed definitions and generated catalog. |
| `scripts/` | Importers and verification tools. |
| `api/`, `shared/` | Optional meal-text parsing and shared input validation. |

Implementation plans and handoffs are indexed in [docs/README.md](docs/README.md).
Start with the [current roadmap](docs/plans/00-program-roadmap.md) before changing
the product's rules or data scope. This README describes the current checkout;
local verification does not imply a production deployment.

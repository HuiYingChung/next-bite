# NextBite

**Less deciding. More eating.**

NextBite helps you choose your next meal from your preferences, current plans,
and recent food records. Compare a few options, inspect why they appeared, and
save a meal plan or record what you actually ate.

The beta supports **English and Traditional Chinese**, with no account required.
The main workflow runs in the browser with deterministic recommendation rules.
Optional AI helps organize a meal description before you review it.

## What you can do

1. Explore the example or start your own records. Add foods manually, recognize
   familiar names, and optionally select an exact nutrition source.
2. Set ingredient avoids, meal preferences, preparation constraints and a recipe
   portion. Compare the recommended options and expand their calculation details.
3. Save a plan, download a meal card, or review and record what you ate. Revisit
   and edit entries in the rolling seven-day view.

There are three distinct collections:

| Collection | Current scope | What it provides |
| --- | --- | --- |
| Standard recipes | 12 defined recipes | Ingredient weights, portion estimates, source links and numeric ranking components. |
| Meal ideas | 100 curated ideas | Suggestions organized by preferences and variety; no calculated nutrient totals. |
| Food and drink library | 15,438 source records and 309 reviewed bilingual concepts | Searchable composition records, name recognition, and scores where the required evidence is complete. |

Source records include different preparations and datasets; they are not a
count of unique ingredients. Broad names such as “fish” do not automatically
select a specific nutrient record. Unknown foods can still be recorded.

## How recommendations work

The recipe path first applies ingredient avoids and strict meal conditions,
then ranks eligible recipes with complete inputs by:

```text
NextBite total = nutrient component + energy component + preference component
              = 10 - raw UK NPM 2018 score + product preference bonuses
```

Composition is compared per **100 g of edible recipe weight**. Energy contributes
once to the total; recipe preference bonuses are capped at 10. The combined
total is NextBite's product ranking, with the published model result and custom
rules separately inspectable. It is not a percentage or an official health grade.

The highest three eligible totals are shown, or fewer when exclusions leave
fewer candidates. **Only exact-total ties use seven-day history**: recognized
protein-source and staple repetitions, then recency, variation among the
offered options, and a stable ID. The explanation shows record coverage and
the dates and foods actually used. The meal-idea path uses history after its
preference priorities, without assigning nutrition scores.

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
  example data and API keys; downloadable meal cards exclude personal records.

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

```sh
npm run build
npm run preview
```

The production frontend is written to `dist/`. Vite's development and preview
servers serve the frontend only. Optional AI additionally needs a host that
executes [the API handler](api/parse-meal.mjs) at `/api/parse-meal`; static hosting
alone does not provide that route.

## Verify changes

```sh
npm run verify
```

This runs the build and checks for product rules, deterministic ranking, API
validation, persistence, bilingual presentation, dashboard receipts, nutrition
calculations and source-data consistency. Focused checks include:

| Command | Coverage |
| --- | --- |
| `npm run verify:records` | Transaction merge rules, conflicts, expiry and storage failures. Also generates an isolated browser harness for actual IndexedDB checks. |
| `npm run verify:history-ranking` | Both live recommendation paths, historical edits/deletions, exact ties and calendar boundaries. |
| `npm run verify:weekly-summary` | Recorded-slot counts, aliases, source identities and bilingual summaries. |
| `npm run verify:food-library` | Pinned source hashes, generated data, recognition and scoring availability. |

The latest local verification and browser evidence are recorded in the
[seven-day reliability handoff](docs/plans/11-seven-day-reliability.md).
The generated IndexedDB browser harness requires a separate browser run;
`npm run verify` does not itself automate the app's browser interactions.

## Data and project structure

Food data comes from pinned USDA SR Legacy, USDA FNDDS and Taiwan FDA releases.
The site loads its static catalog on demand from its own host, with no live
nutrition API dependency. Source updates require reviewed imports and verification.
See [data sources, attribution and limitations](docs/nutrition/food-library.md)
for release details, licensing and score availability.

| Location | Responsibility |
| --- | --- |
| `src/App.tsx` | Dashboard, meal editor, preferences and plans. |
| `src/nutrition.ts`, `src/nutrient-profile.ts` | Recipe calculations and published-model scoring. |
| `src/logic.ts`, `src/history-variety.ts` | Meal-idea selection and seven-day variation. |
| `src/record-store.ts`, `src/use-record-state.ts` | Transactional persistence and cross-tab updates. |
| `src/weekly-summary.ts`, `src/food-identity.ts` | Recorded-food summaries and identity matching. |
| `data/`, `public/food-library/` | Source snapshots, reviewed definitions and generated catalog. |
| `scripts/` | Importers and verification tools. |
| `api/`, `shared/` | Optional meal-text parsing and shared input validation. |

Implementation plans and handoffs are indexed in [docs/README.md](docs/README.md).
Start with the [current roadmap](docs/plans/00-program-roadmap.md) before changing
the product's rules or data scope. This README describes the current checkout;
local verification does not imply a production deployment.

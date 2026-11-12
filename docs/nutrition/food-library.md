# Food and drink library — pinned release 2026-11-04

The library adds **15,438 source records** and **309 reviewed bilingual food
concepts** (1,239 distinct aliases). Records are not unique ingredients: cuts,
preparation states and datasets remain separate. This is broad documented
coverage, not a claim to recognize every food or brand worldwide.

## Sources and attribution

| Provider / release | Records | License |
| --- | ---: | --- |
| USDA Agricultural Research Service, FoodData Central SR Legacy, April 2018 | 7,793 | CC0 1.0 |
| USDA Agricultural Research Service, FNDDS 2021–2023, October 2024 publication | 5,432 | CC0 1.0 |
| Taiwan Ministry of Health and Welfare, Food and Drug Administration, 食品營養成分資料庫, retrieved November 4, 2026 | 2,213 | 政府資料開放授權條款第 1 版 |

USDA's [download page](https://fdc.nal.usda.gov/download-datasets/) identifies
the releases; its [API guide](https://fdc.nal.usda.gov/api-guide/) states CC0
terms. TFDA's [official dataset page](https://data.gov.tw/dataset/8543) lists
the data fields and [government open data license](https://data.gov.tw/license).
The original ZIP and extracted JSON hashes, projected snapshot hashes and
retrieval date are in `data/food-library/manifest.json`. TFDA metadata was
updated October 5, 2026; this is not the measurement date of every sample.

Nutrition values are source values for **100 g edible food**, not 100 ml and
not the user's portion. Missing fields stay null. Source kJ values are retained;
where absent, kJ is explicitly derived as source kcal × 4.184. Sodium in mg is
converted to salt equivalent in g as sodium × 2.5 / 1000. Total sugar, added
sugar and free sugar remain distinct. The importer checks source units.

The snapshots project the model's required composition fields and their source
metadata. They are not complete copies of every vitamin/mineral field. This
model does not rank vitamins or minerals by physiological importance. Source
sample descriptions, source IDs and links remain inspectable. TFDA English
labels may omit preparation details; original Chinese descriptions are shown.
The source-reported 100.3 g fat for TFDA M9900201 is retained rather than silently
clamped; out-of-range required model inputs cannot produce a complete score.

## Scoring and limits

The calculation uses the published [UK NPM 2018 technical guidance](https://www.gov.uk/government/publications/nutrient-profiling-model-2018/nutrient-profiling-model-2018-technical-guidance)
and [FVNS definitions](https://www.gov.uk/government/publications/nutrient-profiling-model-2018/nutrient-profiling-model-2018-fruit-vegetables-nuts-and-seeds-definitions).
Its raw score S = A − credited C is separate from MealHatch's display combination:

- Nutrient component = credited C − saturated-fat A − free-sugar A − salt A.
- Energy component = 10 − energy A. The common 10 is a display offset.
- Ingredient preference = +2 for a confirmed selected staple; +2 at most for
  an explicitly requested protein/plant direction supported by that record.
  Maximum ingredient preference is 4; it is an authored product rule, not a
  published nutrient threshold recommendation. The 143 complete recipes
  use a separate [preference-first selection policy](./decision-policy.md).
- Total = nutrient + energy + preference = 10 − S + preference.
  Energy enters once, including the published full-A protein-credit gate.

This source-food total is a composition lookup aid, not the recipe-ranking
formula. It does not reorder source search results or add foods to the next-meal
recommendation pool. Recipe recommendations compare current preferences, saved
preferences and composition separately, in that order.

No total is assigned without all model inputs. Energy can remain available
independently. Alcoholic beverages are outside the model; infant and unresolved
reconstitution records remain unavailable for scoring in this adult product.

Free-sugar and FVNS derivations for plainly specified SR foods are explicit
versioned product interpretations of the official rules, **not USDA-supplied
model scores**. Each source detail describes the assumption. Unsupported mixed
foods remain unknown. The [USDA fiber-method paper](https://www.ars.usda.gov/ARSUSERFILES/80400535/DATA/PUBLICATIONS/FNR/IMPLICATIONS%20OF%20TWO%20DIRRERENT%20METHODS%20FOR%20ANALYZING%20TOTAL%20DIETARY%20FIBER.PDF)
supports the SR database's AOAC basis; it does not establish an individual assay
for every record. This import has not verified TFDA/FNDDS release-level fiber
method compatibility, so it does not assign complete scores to those records.

Verified release: **2,314 complete**, **12,959 incomplete**, **165 alcoholic
records outside scope**. These are source-record counts, not food categories.
A score compares composition and does not establish nutrient adequacy, personal
health, fullness, allergen suitability or the appropriateness of a complete meal.
The library is not used to rank water or individual ingredients as meal choices.
The 143 standardized recipes form the single meal recommendation collection;
this food/drink source lookup remains separate. Older unversioned meal ideas
are retained only for saved-plan compatibility.

## Recognition and persistence

Reviewed concepts recognize generic names such as 牛肉、干貝、蝦子、魚、豬肉、
羊肉、螺肉、鹿肉. Generic names never select an arbitrary nutrient record.
Search links are suggestions; source selection requires an explicit click.
The exact source name and food group replace the entry only on that click.
Source names with commas are quoted when returning to manual input.

The separate `foodLibraryId` persists through local save/export/reload. It is
syntax checked on storage and checked against the exact catalog name/group
before showing source nutrition. Editing the name or group clears the link.
The synchronous lookup contains 5,674 exact source-name/group entries, including
2,425 reviewed protein/staple identities. Recorded food variety and source-name
summary recognition do not depend on a network request completing. Group-only
entries can support occurrence counts but do not invent distinct food identities.
This identity lookup contains no nutrient values. Unknown names can still be
saved; they are not assigned invented composition. AI output cannot grant a
source identity. Quantities remain stored without estimating daily intake.

Seven-day record saves use IndexedDB transactions and original-value conflict
guards. Existing browser snapshots migrate once; ordinary updates merge only
changed meal slots, profile fields and plan items. A stale editor cannot
silently overwrite another tab's different value. Save failures retain the
draft, and an expired date must be reselected. The browser remains the only
storage location; there is no cloud synchronization.

## Maintenance and verification

The website fetches one same-origin static catalog on demand and caches the
promise for the page session. No runtime USDA/TFDA requests, API key, account or
server database is required. The catalog is approximately 23 MB before HTTP
compression (about 1.1 MB with local gzip). Deployment compression and actual
transfer sizes have not been verified. The application build emits a bundle
size advisory; no build or functional verification failure remains.

To refresh deliberately:

1. Download the three official archives at the manifest URLs. Preserve the
   `usda-sr.zip`, `usda-fndds.zip`, `tfda.zip` names and extract each into its
   matching folder under an ignored working directory.
2. Review release changes and update the retrieval/release metadata in
   `scripts/snapshot-food-library.mjs`. Run it with the extracted folder path.
   This generates small, compressed source projections and new source hashes.
3. Review `data/food-library/reviewed-concepts.json` and
   `scripts/food-library-assessment.mjs`; review changed source descriptions
   before expanding any scoring assumptions.
4. Run `node scripts/import-food-library.mjs`, then `npm run verify`.
   Verification is offline, checks snapshot hashes and generated parity, and
   tests published arithmetic, source units, ambiguity, alcohol/powder scope,
   missing values, source persistence, identity and language compatibility.
5. Inspect the browser before publication. A changed source release is a
   reviewable update, not an automatic background mutation.

Current browser checks used a separate localhost origin: eight requested food
names, explicit source selection, quoted-name input roundtrip, save/reload,
edited-name invalidation, English/Chinese, score filters and mobile layout.
No deployment or publication was performed.

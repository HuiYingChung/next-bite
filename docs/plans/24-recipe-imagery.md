# Recipe illustrations

Status: review
Authorized: 2026-11-06. User requested complete image coverage, with generation
and integration performed in batches.
Branch: `codex/recipe-imagery`, based on `8186310`.

## Scope

- Give all 108 current recipes an individual realistic food illustration,
  generated against current ingredient lists, preparation states and steps.
  Retain the five existing images and add the remaining 103 in batches.
  Historical meal IDs do not determine the food depicted.
- Show images in the primary recommendation, alternative options, recipe
  library/details and matching saved plans. Earlier unversioned plans do not
  inherit an image from a current recipe with the same legacy ID.
- Use local 480/960 WebP assets, bilingual descriptive alt text, one shared
  footer disclosure and lazy secondary images. Preserve the full 4:3 frame,
  including meals with separate rice or soup; cap the mobile hero at 240 px.
- Failed images remove their frame. Unmatched recipe versions remain text-only.
- Keep complete default-collapsed calculations, source data, portion estimates,
  exclusions and ranking unchanged. No new image-generation request at runtime.
- Keep original generated PNGs in the project, excluded from Git; retain
  production assets and prompt/source provenance. The user subsequently
  authorized commit, push and merge of the completed version.
- Install Playwright as this project's pinned development dependency so
  browser checks and image preparation no longer borrow another project.

## Completed verification for all 108 recipes

- `npm run verify:recipe-images` passed: 108 current recipe mappings, 108
  unique images, 216 responsive assets, actual WebP dimensions, source/output
  hashes, bilingual alt text and stale-version fallback. This check is part
  of `npm run verify` and does not require original PNGs or an API key.
- Production build (including TypeScript), bilingual presentation,
  launch/storage compatibility and diff checks passed. Build output contains
  all 216 WebPs, totaling 13,518,618 bytes. The existing large-JavaScript-chunk
  build warning remains. Nutrition data and ranking logic are unchanged.
- In the user's active browser at `http://127.0.0.1:5178/`, scrolled through
  all 108 library entries in three batches. All 108 images loaded, with 108
  different image URLs. Evidence:
  `output/playwright/recipe-imagery/all-recipes-library-verification.json`.
- Visually inspected new library thumbnails and an enlarged recipe detail.
  Confirmed the current main image and both alternatives load, the mobile
  hero is 240 × 180, and thumbnails are 88 × 66. The detail retains its 4:3
  frame. These final browser checks used the active narrow viewport; they
  are not a new full responsive-width matrix.
- Verified 108 Chinese library images, localized alt text, and exactly one
  shared disclosure in each active language. Match/nutrition details remain
  collapsed by default. Browser error log was empty. Restored English after
  checking both languages; no personal records were created or changed.
- Independent review found no remaining image mapping, version, provenance
  or responsive-loading defects. All selected sources were visually reviewed;
  ambiguous ingredients or unintended garnish were regenerated where needed.
- Screenshots: `output/playwright/recipe-imagery/all-recipes-library.png`,
  `new-recipe-detail.png`, `all-recipes-recommendation.png` and
  `all-recipes-alternatives.png` in the same directory.
- Release authorization covers commit, push and merge from
  `codex/recipe-imagery`. The CI workflow now checks image coverage explicitly.
  Use Git/PR history and deployment checks for the final release state.

## Earlier integration checks

Before the complete collection was generated, the shared image component was
checked in both languages at 320, 390, 740, 768, 1024 and 1280 px, including
versioned saved plans after reload, older text-only plans, image-load failure
and recovery, default-collapsed calculations and a 2×-density image request.
Migration/preference browser flows also passed. These earlier checks cover the
component behavior; the 108-image coverage evidence is listed separately above.

## Asset evidence

See [`../recipe-images/README.md`](../recipe-images/README.md) and its manifest
for prompts, source and output hashes, recipe IDs and image dimensions.

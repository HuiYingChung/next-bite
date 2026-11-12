# Recipe illustrations

All 143 current recipes have individual AI-generated illustrations, included as static WebP assets in `public/images/recipes`. The first 108 were generated with the built-in image tool on 2026-11-06; the 22 added on 2026-11-10 and the 13 added on 2026-11-11 were generated with Figma AI image generation (model gpt-image-2.5-flare) from prompts in the same wording, and each of those records its tool in its review note. All were reviewed against the current ingredient lists, preparation states and instructions. They illustrate the named recipe; they do not document a cooked or weighed serving. Ingredient quantities and nutrition remain defined by the recipe data, not the image.

The shared site footer discloses the image origin once. Individual images use descriptive alt text without repeating a visible generation caption.

`manifest.json` retains generation prompts, pinned recipe versions, bilingual alt text, visual review notes, source recipe references, disclosure text, source PNG hashes, and each delivered WebP's dimensions, size, and hash. This documentation is not copied into the public assets directory. The generated client metadata contains only image paths, versions and alt text.

The `miso-tofu-spinach-bowl` recipe uses `white-bean-spinach-leek-sesame` images: the meal ID is historical; the actual recipe and image contain white beans, spinach, leeks, and sesame, not miso or tofu.

Images appear for their matching recipe in recommendations, other options, the library, recipe details and versioned saved plans. Older plans without a matching recipe version remain text-only. Ranking never favors a recipe because it has an image. Individual thumbnails load lazily; opening the library does not request all 130 images at once.

## Rebuild the assets

Keep the selected original PNGs and `generation-manifest.json` in `output/imagegen/mealhatch-food-v1`, then run:

```sh
node scripts/prepare-recipe-images.mjs
```

The script uses this project's installed Playwright and Chromium. Install its browser with `npx playwright install chromium` if needed. It processes only the manifest's selected source files, retains their full 4:3 composition, and writes 480 × 360 and 960 × 720 WebP variants at quality 0.84. Matching source/output hashes preserve already-prepared variants. It also generates `src/recipe-images.generated.ts`, so image mappings and prepared assets come from the same manifest. Original PNGs remain unchanged. This conversion is a local maintenance task; the website does not run image generation or require a key.

Run `npm run verify:recipe-images` to check every current recipe has a unique image, both responsive files match their recorded hashes, bilingual alt text exists, and older recipe versions do not inherit current images. This check is included in `npm run verify`. When a recipe changes, review the image and explicitly update its pinned version only if the illustration still matches.

An installed Chromium-based browser can also be selected with `PLAYWRIGHT_CHANNEL`; for example, set `$env:PLAYWRIGHT_CHANNEL='msedge'` in PowerShell before running the script. The manifest records each variant's actual encoder channel and version, including when a later run reuses that file.

The source PNGs under `output/` are local originals, excluded from Git and not runtime dependencies. Keep a local backup if future re-encoding is needed. The production WebPs and generated metadata are sufficient to build and deploy the website from a fresh checkout. The 260 WebPs total 16,036,848 bytes; the browser loads only the appropriate variant as each image is needed.

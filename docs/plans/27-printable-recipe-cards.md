# Printable recipe cards

Status: review — implemented and verified locally; native PDF output pending
Authorized: 2026-11-06. User approved a usable recipe instead of the sparse
downloadable meal card, then requested printing on one page.
Branch: `codex/narrow-meal-actions`, preserving plan 26's local toolbar fix.

## Scope

- Replace the title-only PNG with a public recipe preview and browser Print /
  Save PDF. Entry points: main recommendation, library detail and saved plan.
- Show the exact recipe/version, selected portion, edible ingredient weights
  and raw/cooked/ready-to-eat states, complete numbered steps, whole-portion
  nutrient estimates and source references. Retain unknowns as unknown.
- Keep the distinction between the original twelve cooking guides and the
  remaining assembly recipes. Assembly time is not total cooking time.
- Use current recipe photographs/illustrations and one disclosure per recipe
  page. Missing images leave the complete text recipe usable.
- Compact Letter/A4 print layout, prioritizing readable text and one page.
  Never crop ingredients or instructions to force a page count.
- Public links carry only recipe identity/version, portion and language.
  They do not load records, preferences or API keys. Invalid recipe versions
  show an unavailable page instead of silently switching formulations.
- No new service, PDF backend, nutrition data or recommendation-rule changes.

## Verification

- Production build, dashboard/collection checks, presentation checks and
  `verify:recipe-card` passed. The latter covers 648 recipe/portion/language
  routes, 5,832 independent nutrient checks, 23 invalid links and 232 real
  React renders containing 1,488 ingredient rows and 1,006 complete steps.
- Optional `npm run verify:recipe-card -- --layout-fixture` creates the real
  component's static QA page under the ignored `output/playwright/recipe-card/`.
  Actual browser measurements checked all 432 standard-portion combinations:
  108 recipes × EN/ZH × Letter/A4. All complete content fits the preview's page
  bounds, with no horizontal content overflow. The tightest case, English
  shrimp on Letter, retains 21 CSS px of spare content height. Main text stays
  9.5pt; nothing is clipped or removed to fit. Results: `layout-results.json`.
- Actual interactive preview checks cover the main recommendation link,
  library link with smaller congee amounts (90 g rice, 180 g water), A4
  switching, larger Chinese shrimp amounts, and invalid-version fallback.
  Narrow preview at 478px has no document overflow; desktop preview was also
  visually inspected at 1272px, including the final step and complete source
  footer. No console errors or warnings were observed in that final preview.
  Screenshot: `output/playwright/recipe-card/letter-zh-preview.png`.
  Existing records were not changed. `git diff --check` passed.
- Independent integration review found no actionable portion/version/privacy
  defects. Old saved recipes remain gated on matching formulation versions.
- Print preparation waits for fonts/image with bounded waits, supports text
  output if the image fails, and resets the loading label before calling print.
  The native print call blocks the embedded browser's JavaScript and exposes
  no operable print dialog through the available browser tools. The temporary
  test tab was closed and a fresh preview opened. No PDF was produced; actual
  printer pagination and PDF rendering remain a manual check. Screen page-fit
  measurements must not be described as verified PDF output.

On 2026-11-07 the user authorized commit, push and merge of this iteration,
including plan 26's narrow-screen toolbar fix. Git history and the pull
request record track the resulting release; CI, merge and deployment are
separate checks. Native PDF output remains a manual verification item.

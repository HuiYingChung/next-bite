# MealHatch product roadmap

## Active iteration — 143 detailed recipes

Status: review — implemented and verified locally; committed, not pushed
Authorized: 2026-11-11, after a launch-readiness check found the first three
options dominated by one protein group. Read
[`36-recipes-143.md`](./36-recipes-143.md). Branch: `claude/recipes-143`.
Adds 13 recipes at the higher nutrition level, with egg, dairy, beef or pork
and fish as the main protein, and their illustrations. Without preferences,
beans fall from 52% to 35% of the first three options and egg and dairy each
reach 10%. The ordering rule is unchanged; varying the main protein within a
group is measured in the plan and left for the user to decide.

## Previous iteration — button fixes

Status: merged in PR 20
Authorized: 2026-11-11, after every button was clicked in a real browser and
compared with its intended result. Read
[`35-button-fixes.md`](./35-button-fixes.md). Branch: `claude/button-fixes`.
The thirteenth plan replaces the oldest instead of the newest and says so; a
new record for an empty past slot is no longer labelled an edit; clearing
data answers in the language in use.

## Previous iteration — 130 detailed recipes

Status: review — implemented and verified locally; committed, not pushed
Authorized: 2026-11-10. Read [`34-recipes-130.md`](./34-recipes-130.md).
Branch: `claude/menu-134`, from `claude/filter-fixes`. Adds 22 recipes with
illustrations for staple and main-protein pairs that had none or one, using
only source foods already used by scored recipes. The earlier 108 recipes,
the model and the ranking are unchanged.

## Previous iteration — filter fixes

Status: review — implemented and verified locally; committed, not pushed
Authorized: 2026-11-10, after an audit of every filter against the 108
recipes. Read [`33-filter-fixes.md`](./33-filter-fixes.md).
Branch: `claude/filter-fixes`. Main protein means the largest protein
contributor; a staple and protein with no recipe in common say so; hunger
respects "Large portions"; only effective time limits are offered; the
position line counts matching recipes.

## Previous iteration — launch fixes

Status: review — implemented and verified locally; committed, not pushed
Authorized: 2026-11-10, after a second launch-readiness review. Read
[`32-launch-fixes.md`](./32-launch-fixes.md). Branch: `claude/launch-fixes`.
A heading that names no meal type, no jump of the options while records load,
and a corrected repository description.

## Previous iteration — first screen: three options side by side

Status: review — implemented and verified locally; committed, not pushed
Authorized: 2026-11-10. Round three of the reviewed recommendations, after a
mockup review. Read [`31-first-screen-cards.md`](./31-first-screen-cards.md).
Branch: `claude/first-screen-cards`, from `claude/main-protein-preference`.
Shows the three current options together, makes staple and main protein
one-tap choices and moves recording below the options. The engine, ranking,
data and stored state are unchanged.

## Previous iteration — main-protein preference

Status: review — implemented and verified locally; committed, not pushed
Authorized: 2026-11-10. Round two of the reviewed recommendations. Read
[`30-main-protein-preference.md`](./30-main-protein-preference.md).
Branch: `claude/main-protein-preference`, from `claude/rotating-recommendations`.
Adds a current-meal main-protein group and stops offering four saved
preferences that duplicate per-meal controls. Model arithmetic, nutrition
levels, rotation, exclusions, data and stored preferences are unchanged.

## Previous iteration — rotating recommendations

Status: review — implemented and verified locally; committed, not pushed
Authorized: 2026-11-10. After a product-logic review the user approved working
through its recommendations one round at a time, starting with this one. Read
[`29-rotating-recommendations.md`](./29-rotating-recommendations.md).
Branch: `claude/rotating-recommendations`, from `claude/launch-polish`.
Nutrition reference is compared by level; equal recipes take turns by date and
meal window; "Show three more" pages through the full order. Model arithmetic,
preference points, exclusions and data are unchanged. This supersedes program
invariant 6 only in defining "meaningfully better" as a higher nutrition level.

## Previous iteration — launch polish

Status: review — implemented and verified locally; uncommitted
Authorized: 2026-11-10. User asked for the problems found in a launch-readiness
review to be fixed on a new branch, excluding larger recipe images. Read
[`28-launch-polish.md`](./28-launch-polish.md).
Branch: `claude/launch-polish`, from `main` at `849fa6d`.
Repairs a date-dependent check, shortens displayed recipe names, tightens the
narrow first screen and recaptures launch assets. No data or ranking changes.

## Previous iteration — printable recipe cards

Status: review — implemented and verified locally; native PDF output pending
Authorized: 2026-11-06. User approved replacing the sparse meal card with a
usable recipe and requested single-page printing. Read
[`27-printable-recipe-cards.md`](./27-printable-recipe-cards.md).
Continue `codex/narrow-meal-actions`; preserve its verified mobile toolbar fix.
Use complete public recipe data, selected-portion weights and existing images.
Do not include personal records, matching scores, preferences or credentials.

## Previous local iteration — narrow-screen meal actions

Status: review — implemented and verified locally
Authorized: 2026-11-06. User reported uneven mobile collection actions.
Read [`26-narrow-meal-actions.md`](./26-narrow-meal-actions.md).
Branch: `codex/narrow-meal-actions`, from merge `239c9cc`.
Group the two actions below the description on narrow screens; preserve
navigation, keyboard focus and touch target sizes.

## Previous iteration — recipe preparation and concise copy

Status: merged — PR #15, merge commit `239c9cc`; PR/main CI and Vercel passed
Authorized: 2026-11-06. User requested concise recommendation cards and
approved complete, usable cooking guidance for the original twelve recipes.
Read [`25-recipe-preparation-and-copy.md`](./25-recipe-preparation-and-copy.md).
Branch: `codex/concise-recommendation-copy`, from imagery merge `3b393b1`.
Keep detailed scoring and timing qualifications available when expanded;
preserve source-matched formulations and independently verify any changes.

## Previous iteration — recipe illustrations

Status: merged
Authorized: 2026-11-06. User requested realistic illustrations for all 108
current recipes. Read [`24-recipe-imagery.md`](./24-recipe-imagery.md).
Branch: `codex/recipe-imagery`, based on merged `main` at `8186310`.
Use static, responsive assets with one shared bilingual generation disclosure;
leave unmatched historical recipe versions as text. Keep imagery separate from
recommendation ranking, nutrition estimates and historical recipe identities.
Implementation, asset preparation, build and bilingual browser checks are
complete; see plan 24. The user authorized commit, push and merge of this
version. PR #14 merged as `3b393b1`; PR and main CI passed. The production
Vercel deployment for that merge commit also passed.

## Previous iteration — preference-first next-meal decisions

Status: review
Authorized: 2026-11-06. User accepted the product-positioning recommendations
and required all calculation details to remain available, collapsed by default.
Read [`23-preference-first.md`](./23-preference-first.md).
Branch: `codex/preference-first`, based on committed catalog version `f21411e`.
Current-meal preferences precede saved preferences, then the unchanged nutrition
model, then recent variety. Ingredient-readiness/time handling, complete
collapsed calculations and compact bilingual explanations are implemented.
Repository and isolated browser checks passed; see the active plan for evidence.
On 2026-11-06 the user authorized commit, push and merge of this version,
including its committed catalog dependency. Use Git history and remote checks
for actual release results; deployment status is separate.

## Previous iteration — one recipe-backed meal library

Status: review
Authorized: 2026-11-06. User approved catalog completion and consolidation.
Read [`22-catalog-unification.md`](./22-catalog-unification.md).
Use the 108 defined recipes as the single current collection, aligning names,
ingredients and avoidance metadata. Preserve old saved plans and recipe versions.
The four unresolved dumpling concepts are retained only for historical plans;
available evidence does not support complete formulation/model inputs.
No new nutrient values or model rules are introduced. Current UI/copy, source
preservation, full repository checks and bilingual browser/compatibility checks
are complete; see the active plan for evidence. The user authorized committing
and pushing this version on 2026-11-06. Merge and deployment remain separate.

## Previous iteration — 108 detailed recipes

Status: review
Authorized: 2026-11-06. User requested twelve additional detailed recipes.
Continue `codex/recipes-24`, preserving the completed, uncommitted 96-recipe
collection. Read [`21-recipes-108.md`](./21-recipes-108.md).
Scope: twelve distinct sourced formulations and matching new catalog entries,
yielding 108 detailed recipes and 112 meal ideas. Preserve the old catalog,
data, rules and exclusions; verify both paths and current public counts.
Implementation, preservation of the original 100 ideas and 96 recipes, the full repository suite and
bilingual browser verification are complete. Evidence is in the active plan.
No commit, push, merge or deployment was performed.

## Previous iteration — 96 detailed recipes

Status: review
Authorized: 2026-11-06. User requested twelve additional detailed recipes.
Continue `codex/recipes-24`, preserving the completed, uncommitted 84-recipe
collection. Read [`20-recipes-96.md`](./20-recipes-96.md).
Scope: twelve distinct source-matched formulations, complete portion/model
inputs, bilingual preparation and full-collection verification. Preserve
existing data, model rules, ranking, history and conservative exclusions.
Implementation, prior-84 preservation, the full repository suite and bilingual
browser verification are complete. Evidence is in the active plan. No commit,
push, merge or deployment was performed.

## Previous iteration — 84 detailed recipes

Status: review
Authorized: 2026-11-06. User requested twelve additional detailed recipes.
Continue `codex/recipes-24`, preserving the completed, uncommitted 72-recipe
collection. Read [`19-recipes-84.md`](./19-recipes-84.md).
Scope: twelve distinct source-matched formulations, bilingual preparation,
nutrition/model checks and complete collection verification. Preserve existing
formulations, scoring, processing rules, history and conservative exclusions.
Implementation, source/model checks, prior-72 preservation, full repository
verification and bilingual browser checks are complete; evidence is in the
active plan. No commit, push, merge or deployment was performed.

## Previous iteration — 72 detailed recipes

Status: review
Authorized: 2026-11-06. User requested twelve additional detailed recipes.
Continue `codex/recipes-24` and preserve the completed, uncommitted 60-recipe
collection. Read [`18-recipes-72.md`](./18-recipes-72.md).
Scope: twelve additional source-matched formulations, including explicit
recipe-level preparation evidence where required by the published model.
Preserve prior data, thresholds, ranking, history and conservative exclusions.
Implementation, source/model checks, prior-60 preservation, full repository
verification and bilingual browser checks are complete; evidence is recorded
in the active plan. No commit, push, merge or deployment was performed.

## Previous iteration — 60 detailed recipes

Status: review
Authorized: 2026-11-06. User requested twelve additional detailed recipes.
Continue `codex/recipes-24`, preserving the completed, uncommitted 48-recipe
collection. Read [`17-recipes-60.md`](./17-recipes-60.md).
Scope: twelve additional source-matched formulations, bilingual preparation,
nutrition and scoring checks, and full-collection browser verification.
Keep ranking, existing exclusions and the prior formulations unchanged.
Implementation, source/model checks, baseline preservation, full repository
verification and bilingual browser checks are complete; evidence is in the
active plan. No commit, push, merge or deployment was performed.

## Previous iteration — 48 detailed recipes

Status: review
Authorized: 2026-11-06. User requested twelve additional detailed recipes.
Continue `codex/recipes-24`, preserving the completed, uncommitted 36-recipe
collection. Read [`16-recipes-48.md`](./16-recipes-48.md).
Scope: twelve distinct source-matched formulations, bilingual preparation and
full-collection verification. Keep ranking and existing exclusions unchanged.
Implementation, baseline preservation, source/model checks, full repository
verification and bilingual browser checks are complete; evidence is in the
active plan. No commit, push, merge or deployment was performed.

## Previous iteration — 36 detailed recipes

Status: review
Authorized: 2026-11-05. User requested twelve further detailed recipes after
reviewing the completed 24-recipe implementation. Continue `codex/recipes-24`
and preserve that iteration's uncommitted work. Read
[`15-recipes-36.md`](./15-recipes-36.md).
Scope: additional source-matched formulations, complete model inputs and
verification of the entire 36-recipe collection. No push or deployment.
Implementation, source preservation, full repository checks and bilingual
browser checks are complete. Evidence and the retained conservative exclusion
limitation are recorded in the active plan.

## Previous iteration — 24 detailed recipes

Status: review
Authorized: 2026-11-05. User accepted the 24-recipe proposal and requested a new
branch. Read [`14-recipes-24.md`](./14-recipes-24.md).
Branch: `codex/recipes-24`, based on `09471f1`.
Scope: twelve additional sourced formulations, complete calculation inputs,
and a browsable detailed-recipe collection with existing exclusions intact.
This authorization supersedes historical twelve-recipe scope restrictions.
Implementation and local verification are complete; evidence is recorded in
the active plan. No commit, push, merge or deployment is implied.

## Previous iteration — launch experience

Status: review
Authorized: 2026-11-05. User requested a new branch implementing the latest
launch assessment. Read [`13-launch-experience.md`](./13-launch-experience.md).
Branch: `codex/launch-experience`, based on
`199137c374da4ff9ba2707d70943e9cfbbe6ee6b`.
Scope: first-use meal selection, compact mobile actions, honest collection
availability, share/launch assets and a manual usability study kit.
This iteration does not add analytics events, a backend or nutrition data.
Real-provider AI verification and observation of actual users remain separate.
Local implementation, full verification, browser checks and draft launch assets
are recorded in the active plan; no publication or deployment is implied.

The entries below preserve their historical handoffs. Their old branch names,
release restrictions and `review` statuses describe those sessions; this active
user-authorized iteration governs current work. Its status does not imply a
commit, merge, production deployment or Product Hunt publication.

## Previous iteration — AI reliability

Status: review
Authorized: 2026-11-04. User requested fixes from the code-only AI audit before
testing with their own key. Read [`12-ai-reliability.md`](./12-ai-reliability.md).
Branch: `codex/ai-reliability`, based on `dcb93df`.
Mock verification is complete; real provider behavior remains unverified.

## Previous iteration — seven-day reliability

Status: review
Authorized: 2026-11-04. User accepted the seven-day audit correction proposal.
Read [`11-seven-day-reliability.md`](./11-seven-day-reliability.md).
Continue the current branch and preserve prior approved food-library changes.
No push or deployment is authorized.

## Previous iteration — food and drink library

Status: review
Authorized: 2026-11-04. User explicitly chose direct implementation of broad
food recognition and composition scores. Read [`10-food-library.md`](./10-food-library.md).
This expands the 12-recipe data scope with a sourced ingredient/drink catalog;
meal recommendations remain based on their existing documented paths.
No push or deployment is authorized.

## Previous iteration — published-model scoring

Status: review
Authorized: 2026-11-04. The user chose complete source data and a published
nutrition model for three components and a total-ranked top three.
Branch: `codex/nutrition-pilot`, based on `edf903c` plus approved working changes.

Read [`09-published-model-scoring.md`](./09-published-model-scoring.md) first.
The authorization supersedes the previous pilot's no-score selection policy.
The scope remains twelve defined recipes; no deployment or push is authorized.

## Previous iteration — sourced recipe and meal-context pilot

Status: review
Authorized: 2026-11-04, user accepted the research-based implementation and
requested compact numeric receipts in place of contribution charts.
Branch: `codex/nutrition-pilot`, based on `e0946af`.

Read [`08-nutrition-pilot.md`](./08-nutrition-pilot.md) before continuing.
The latest authorized scope includes correcting confirmed matching defects,
12 source-mapped recipes, portion calculations and this-meal context. The old
nutrition phases remain background design documents; their narrower Phase 1
UI/ranking restrictions do not override this explicit user-approved pilot.
All-100 migration, personalized diet prescriptions and specialized populations
remain deferred. No push or deployment is authorized.

## Previous iteration — dashboard

Status: review
Authorized: 2026-11-03–2026-11-04, user approved the dashboard iteration with
「好，改改看」 after reviewing its scope and design tradeoffs.
Branch: `codex/launch-beta`
Base: `730b5632222d5b303a72785c7be5b4dd25348cb7`

Read [`07-dashboard.md`](./07-dashboard.md) before continuing this iteration.
The work reorganizes the existing product around Today, Records, Plans and
Library; adds native drawers and descriptive record/rule views; and simplifies
the visual system. Existing recommendation rules, local records, plans,
credential handling and export boundaries remain in force. No new dependency
or deployment is authorized by this iteration.

Final current-tree verification and the dashboard handoff are recorded in
`07-dashboard.md`. Both the dashboard and the underlying launch beta remain in
`review`; neither status means user acceptance, merge, push or deployment.
Nutrition research remains deferred.

## Underlying release — low-maintenance launch beta

Status: review
Authorized: 2026-11-03, user requested a new branch and implementation of steps 1–12 from the agreed launch iteration list.
Branch: `codex/launch-beta`
Verified base: `1e5306a95501ed767d32c878b115caae1fdc8f0b` (local and remote `main`).

The current release is an everyday bilingual meal-choice tool with curated
templates and transparent product rules. It does not implement the nutrition
evidence program below. The user's accepted release scope supersedes that
program's execution gates for this branch. Read
[`06-launch-beta.md`](./06-launch-beta.md) before continuing release work.

The nutrition program is deferred research. Its phase statuses below record
the previous plan, not authorization to start or claim completion of that work.
Do not import nutrition datasets, add accounts, hosted AI allowances, payments,
restaurant integrations, analytics, or deploy as part of this release.

---

# Deferred nutrition reliability program

Status: deferred
Program written: 2026-07-29
Original planning baseline: `main` at `bbff438`

## 1. Program outcome

Turn MealHatch from a deterministic but mainly editorial recommendation system
into an auditable, guideline-informed everyday food decision product.

The target is not clinical validation. The target is:

- record-level food and nutrient provenance;
- explicit quantities, ranges, confidence, and unknowns;
- deterministic safety, calculation, ranking, and receipt generation;
- nutrition-facing rules tied to official data or published guidance;
- product heuristics clearly separated from nutrition evidence;
- a rolling seven-day pattern view that is useful without claiming individual
  nutrient adequacy or usual intake.

## 2. Canonical execution order

| Order | Plan | Status | Entry gate |
| --- | --- | --- | --- |
| 1 | [`01-evidence-foundation.md`](./01-evidence-foundation.md) | `ready` | Latest merged `main` verified |
| 2 | [`02-deterministic-nutrition-kernel.md`](./02-deterministic-nutrition-kernel.md) | `blocked` | Phase 1 pilot accepted |
| 3 | [`03-catalog-evidence-migration.md`](./03-catalog-evidence-migration.md) | `blocked` | Phase 2 kernel accepted |
| 4 | [`04-seven-day-pattern-signals.md`](./04-seven-day-pattern-signals.md) | `blocked` | Phase 3 catalog coverage accepted |
| 5 | [`05-product-verification-release.md`](./05-product-verification-release.md) | `blocked` | Phases 1–4 merged |

Allowed status values:

- `blocked`: an earlier gate has not passed.
- `ready`: authorized as the next implementation phase.
- `in-progress`: work exists on an identified branch.
- `review`: implementation is complete but exit evidence has not been accepted.
- `complete`: merged and all required evidence is recorded.

Only one phase may be `ready` or `in-progress` at a time. A future session must
not change a later plan to `ready` unless the preceding exit gate has actually
passed.

## 3. Program invariants

Every phase must preserve these boundaries:

1. AI structures user input; deterministic code owns the final decision.
2. Structured hard avoids and beverage opt-ins are eligibility constraints,
   never score adjustments.
3. Missing quantity or nutrition data remains unknown.
4. No generic source list may impersonate meal-level evidence.
5. Nutrition evidence, practical fit, and fairness are separate decision
   concepts.
6. Fairness or rotation cannot overturn a meaningfully better supported
   nutrition candidate.
7. The visible receipt must be generated from the same trace used to select the
   winner.
8. No runtime dependency on a third-party nutrition API.
9. No client-side external data key.
10. Preserve BYOK, same-origin relay, `store: false`, no-store caching, input
    limits, error redaction, and existing safety controls.
11. No medical diagnosis, treatment, personalized adequacy, calorie target, or
    weight-loss claim.
12. No production deployment or configuration change without explicit user
    authorization.

## 4. Per-session protocol

At the beginning of an implementation session:

1. Read this roadmap and the entire active phase plan.
2. Inspect `git status`, current branch, remote refs, merged PRs, and latest
   `main`.
3. Preserve unrelated user changes; do not stash, reset, clean, or broadly
   reformat them.
4. Create a new `codex/` branch from the verified base unless continuing the
   same phase branch.
5. Re-inspect the merged code and tests instead of treating plan file paths or
   prior findings as current truth.
6. Record the exact base commit.

During implementation:

1. Work only inside the active phase.
2. Use version-pinned local fixtures for deterministic tests.
3. Keep live source retrieval separate from offline verification.
4. Stop at the phase's explicit stop conditions.
5. Run targeted tests during development and the full phase gate before
   handoff.

At handoff:

1. Record branch, commits, changed files, commands, results, and limitations.
2. State whether each exit criterion passed.
3. Update the active plan status to `review`; do not mark it `complete` before
   merge and evidence acceptance.
4. Do not start the next phase in the same change set.

## 5. Source hierarchy

The program begins with these official sources:

- USDA FoodData Central FNDDS for prepared and mixed foods;
- USDA Foundation Foods for basic ingredients;
- USDA Branded Foods for specifically identified packaged products;
- Taiwan FDA Nutrition Information Database for defensible Taiwanese food and
  ingredient matches;
- USDA FPED only with a compatible FNDDS release;
- NCI/USDA HEI as a dietary-pattern framework with its version and individual
  use limitations disclosed;
- the current Dietary Guidelines for Americans as guideline context, stored
  separately from the HEI version.

The active phase must recheck source availability, release compatibility, and
license terms before importing data. Academic papers may support a rule, but
they do not replace food-record provenance.

## 6. Program-level success criteria

The program is ready for release review only when:

- every meal and drink has an evidence status;
- every known nutrition value has traceable provenance;
- unknowns and ranges survive through calculation and display;
- all nutrition rules have an evidence class and version;
- selection is reproducible from the recorded trace;
- safety always dominates scoring;
- nutrition dominance is protected from practical fit and rotation;
- seven-day output discloses record coverage and does not claim usual intake;
- source, data-distribution, monotonicity, time-boundary, trace, and safety
  tests pass;
- build, product verification, engine verification, API verification, and
  applicable audits pass;
- BYOK and no-store behavior have not weakened;
- the public limitations match what the implementation actually proves.

## 7. Known program limits

Even after all phases:

- generic and restaurant meals will retain recipe and portion uncertainty;
- self-reported meal records contain omission and quantity error;
- seven days do not establish usual individual intake;
- an evidence-backed general recommendation is not clinical nutrition advice;
- medical conditions, pregnancy, eating disorders, renal disease, diabetes,
  and other specialized needs remain outside the product's validated scope;
- official datasets and guidelines require versioned maintenance.

# Launch experience

Status: review
Authorized: 2026-11-05, following the user's request to implement the latest
launch assessment on a new branch.
Branch: `codex/launch-experience`
Base: `199137c374da4ff9ba2707d70943e9cfbbe6ee6b`

## Decision and hypothesis

Make the first session about choosing a meal. Start with the broader 100-idea
collection and keep the 12 standard recipes available for people who want
portion estimates and transparent numeric comparisons. Put the selected meal,
its useful reason and its save action before optional detail on mobile.

This is a product hypothesis, not an observed improvement: new visitors should
understand the offer and save a suitable plan with less searching. The
[five-person study](../launch/usability-study.md) is prepared to test that
hypothesis. No participant results are claimed by this implementation.

## Authorized scope

- Default to 100 meal ideas and the visitor's own empty records, with clear
  access to the 12 standard recipes. Keep the example as an explicit opt-in,
  so a first saved plan belongs to the persistent personal workspace.
- Align the entry action and mobile hierarchy with choosing/saving a meal;
  the primary header action finds a meal and recording what was eaten remains
  available as a separate action. Keep collection switching near the result.
- Explain when a selected staple is unavailable in the active collection and
  offer an explicit route to the broader collection. Do not silently clear a
  preference or relax ingredient avoids and strict conditions.
- Keep score components numeric and detailed reasoning expandable. Keep the
  distinction between unscored ideas and scored recipes visible.
- Make the downloadable public meal card consistent with the website and add
  a branded social preview. Personal records and keys stay out of these images.
- Prepare three gallery views, a short recorded-flow draft and accompanying
  copy. Use actual interface states in an isolated workspace, without invented
  results or personal data.
- Document a small manual study and existing analytics privacy behavior.

## Boundaries

No changes to nutrition thresholds, ranking weights, food datasets, the
seven-day history window or persistence schemas are part of this iteration.
No new backend, accounts, payments, task analytics or recurring AI service is
needed. Optional AI continues to organize editable input; deterministic code
selects recommendations. A saved plan is not an eaten-meal record.

The launch assets and copy are drafts for review. Creating them does not
publish a Product Hunt listing, solicit votes or claim featuring. Feature
selection and exposure remain separate from observed product usefulness.
Real-provider AI behavior is still unverified by these checks; no real key is
needed for this iteration's deterministic workflow validation.

## Verification and handoff

Implementation and local verification completed on 2026-11-05:

| Check | Result / evidence |
| --- | --- |
| Full repository verification | `npm run verify` passed, including 19 mocked AI UI cases, local API routes, numeric nutrition checks, seven-day history and the new collection-availability checks. Final `npm run build` passed after copy/layout polish. |
| Fresh English and Traditional Chinese first-use flow | Isolated Chromium starts with personal empty records and 100 ideas; the example is opt-in. Header action focuses the result. |
| Mobile meal/action hierarchy and no horizontal overflow | English/Chinese × ideas/recipes × 320/390 px passed. English/Chinese at 768/1024/1440 px also passed. At 390×844, the default choose action is visible without scrolling. The 320 px language button remains on one line. |
| Preference availability and explicit collection switching | Noodles/bread correctly report absent recipe coverage. Tests distinguish absent coverage from excluded candidates and include eligible matches outside the top three. Switching retains selected bread and Dairy exclusion. |
| Save/revisit plan and manual recording regression | A first plan persists after reload without marking food eaten; opt-in example/exit preserves the personal plan. Manual Chicken/Broccoli/Rice review, save and reload passed. |
| Numeric recipe score and expandable source/rule detail | Choose action precedes numeric scores. Existing 88 actual score-panel comparisons and ingredient-source checks passed. No formula or ranking change. |
| Downloaded meal card and social preview visual review | Actual EN/ZH recipe PNGs downloaded at 1200×900; inspected alongside 1200×630 OG preview. Public-copy-only boundary retained. Long-title layout checked against all 100 ideas in both languages. |
| Gallery and recorded-flow draft inspection | Three 1270×760 actual screenshots and a 26.84-second silent WebM. Still images and extracted video frames inspected; recording ends on the saved plan. See [assets](../launch/README.md). |
| `git diff --check` and scope review | Passed. Independent React/hooks/state/accessibility review found no blocking issue. No runtime dependency added. |

Checks use isolated example or synthetic data. Browser evidence demonstrates
the tested interface behavior, not comprehension, ease of use or a real-user
success rate. The study results template remains blank until sessions occur.

Browser screenshots and QA reports are in the ignored
`output/playwright/launch-experience/` directory. The committed-source candidates
for launch media live in `docs/launch/assets/`; reproducible capture and social
preview scripts reuse an installed Playwright package without adding it to the
product dependencies. Analytics and AI requests were blocked in isolated browser
checks. No provider key was used.

Remaining limits: real participants, physical devices and Firefox/WebKit have
not been tested in this iteration. Live-provider AI behavior remains unverified
by this work. Vite still reports the existing large main-bundle advisory; build
and verification pass, and code splitting is outside this focused iteration.

The user authorized commit and push on 2026-11-05 after this implementation
handoff. Record the actual commit, remote CI, merge and deployment separately;
the verification results above do not assert merge or production deployment.

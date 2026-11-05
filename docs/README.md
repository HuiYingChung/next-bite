# MealHatch documentation

For the product overview, local setup and verification commands, start with the
[project README](../README.md).

The canonical implementation plans live in [`plans/`](./plans/).

Future implementation sessions must begin with
[`plans/00-program-roadmap.md`](./plans/00-program-roadmap.md), identify the
active user-authorized release track, and read that entire plan before changing
code. Deferred research phases are not automatic next steps.

Do not begin a later phase merely because its file exists. Each phase has an
entry gate, exit gate, stop conditions, and required handoff. Update the plan
status and evidence only after the corresponding work has actually been
verified.

Current authorized iteration:

- [`Launch experience`](./plans/13-launch-experience.md) — `review`, on
  `codex/launch-experience`, covering first-use selection, mobile hierarchy,
  collection availability and share/launch materials. The
  [launch pack](./launch/README.md) includes a manual usability protocol;
  participant observations and live-provider AI checks remain pending.

Previous iterations (historical handoffs):

- [`AI reliability`](./plans/12-ai-reliability.md) — `review`, on
  `codex/ai-reliability`, covering cancellation, error messages, amount validation
  and local API routing. Verification uses mocks; live key testing is pending.

- [`Seven-day reliability`](./plans/11-seven-day-reliability.md) — `review`,
  transactional browser saves and seven-day exact-tie recommendation evidence.

- [`Food and drink library`](./plans/10-food-library.md) — `review`, on
  `codex/nutrition-pilot`, with broad recognition and source composition lookup.
  See [sources, scoring limits and maintenance](./nutrition/food-library.md).

- [`Published-model scoring`](./plans/09-published-model-scoring.md) —
  `review`, on `codex/nutrition-pilot`, based on `edf903c` and the existing
  approved working changes. This supersedes the prior pilot's no-score policy.

- [`Sourced recipe and meal-context pilot`](./plans/08-nutrition-pilot.md) —
  `review`, on `codex/nutrition-pilot`, based on `e0946af`.

- [`Dashboard iteration`](./plans/07-dashboard.md) — `review`, on
  `codex/launch-beta`, based on the implemented launch beta at `730b563`.

Underlying release:

- [`Low-maintenance launch beta — steps 1–12`](./plans/06-launch-beta.md) —
  `review`; this dashboard iteration preserves its product, storage and safety
  boundaries. Review does not imply user acceptance, merge or deployment.

The broader nutrition evidence phases remain deferred. The current food
library does not claim completion of that program. See the
[source provenance](./nutrition/README.md) and
[evidence versus product rules](./nutrition/decision-policy.md).

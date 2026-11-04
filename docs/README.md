# NextBite documentation

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

- [`Sourced recipe and meal-context pilot`](./plans/08-nutrition-pilot.md) —
  `review`, on `codex/nutrition-pilot`, based on `e0946af`.

Previous iteration:

- [`Dashboard iteration`](./plans/07-dashboard.md) — `review`, on
  `codex/launch-beta`, based on the implemented launch beta at `730b563`.

Underlying release:

- [`Low-maintenance launch beta — steps 1–12`](./plans/06-launch-beta.md) —
  `review`; this dashboard iteration preserves its product, storage and safety
  boundaries. Review does not imply user acceptance, merge or deployment.

The broader nutrition evidence phases remain deferred. The current bounded
pilot does not claim completion of that program. See the
[source provenance](./nutrition/README.md) and
[evidence versus product rules](./nutrition/decision-policy.md).

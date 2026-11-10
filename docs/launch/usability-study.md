# First-use usability study

Status: protocol ready; no sessions conducted or results recorded in this file.
Study version: 2026-11-06 preference-first draft; no sessions conducted.

## Question

Can a new visitor understand MealHatch, choose and save a plausible next meal,
and explain why it appeared without being guided through the interface?

The working hypothesis is that one recipe-backed meal library and a visible save
action make that journey clearer. Five sessions can reveal specific problems;
they do not establish market demand, nutritional validity or a population-wide
success rate. Product Hunt exposure is a separate measure.

## Participants and setup

- Recruit five adults who read English or Traditional Chinese, sometimes
  prepare their own meals and have not used this version. Aim for three phone sessions
  and two desktop sessions; include
  both supported languages when participants naturally use them.
- Run one participant at a time for about 15 minutes. Use a fresh isolated
  browser profile on their normal device where practical. Begin with empty
  personal records and the default recipe recommendations, without opting into the
  separate example workspace.
- Record the tested build/commit, date, language, viewport and device. Do not
  overwrite the maker's personal records or use a real API key.
- Ask permission before screen/audio recording. Use participant IDs P1–P5 and
  keep identifiable consent/contact information outside this repository.
- If separately testing the opt-in example, tell participants it is an example.
  Never treat those records as information about the participant's diet or
  substitute that session for the fresh-visit persistence task.

Opening script: “We are testing the product, not you. Please say what you are
looking for and what you expect to happen. You can stop at any time. I will
watch first and help if you get stuck. Please use hypothetical foods; no personal
health details or API key are needed.”

## Tasks and observable completion

Read the scenario, not the control names. Start a timer at each task prompt.
Stop at completion, abandonment or three minutes; record any assistance.

| Task | Participant prompt | Completion evidence |
| --- | --- | --- |
| 1. Choose | “You want an idea for your next meal. Find one you would consider and keep it for later.” | Chooses a plausible option and saves a plan without being told which control to use. |
| 2. Adjust | “Now you feel like noodles. Find an option that fits.” | Selects noodles, recognizes matching choices or understands a disclosed compromise when conditions leave no complete match. |
| 3. Explain | “Why do you think this option appeared? Find information that helps you explain it.” | Finds the scoring basis and describes an actual composition, preference or tie-break reason without inventing a health or nutrient-deficit claim. |
| 4. Revisit | “Leave this view, then find the meal you kept. Has the app recorded that you ate it?” | Finds the saved plan and understands that recording an eaten meal is a separate action. Reload the fresh-visit workspace and confirm the first saved plan persists. |
| 5. Browse recipes | “Find a different noodle recipe, inspect its ingredients and portion, and keep it for later if it suits you.” | Finds an eligible recipe in the full meal library, inspects its stated ingredients/portion and saves it. Understands that exclusions can prevent selection even when details remain browsable. |

After task 5 ask: “What do the numbers mean here? Would you expect a restaurant
meal with the same name to have the same numbers?” Accept “a comparison for these defined recipes”
without requiring knowledge of the scoring formula. Record misconceptions
verbatim. Do not teach the intended answer before recording the response.

Then ask: “You have uncooked ingredients and 15 minutes. Can you tell whether
this meal fits?” Observe whether the participant distinguishes assembly time
from unknown full cooking time and can adjust the condition. Ask which food or
ingredient they expected but could not find, and where they normally buy it;
record their words rather than assuming one set of Chinese food preferences.

If a participant asks for help, first ask “What would you try?” Then provide
only the minimum needed. Mark the task **assisted**; do not count it as unaided
completion. A rejected meal is useful preference feedback, not automatically a
usability failure; record the reason and whether another option was available.

## Working decision criteria

These are product targets selected before the study, not published usability
benchmarks or statistical estimates:

- At least four of five participants save an option unaided within 90 seconds.
- At least four of five change the staple and find the recommendation basis
  unaided, and can revisit the plan.
- No participant leaves believing a saved plan is an eaten-meal record or that
  an unspecified restaurant meal has the same estimated nutrition. Any such misunderstanding
  gets a concrete copy/layout fix and a fresh check before launch.
- Fix a repeatable blocker even if only one participant encounters it. Prioritize
  repeated confusion over cosmetic preferences, and keep contrary observations.

If targets are missed, document the observed problem, change one relevant
interaction or explanation, and retest the affected tasks with fresh people.
Do not silently replace unsuccessful sessions in the original results.

## Session observations

Leave cells blank until observed. Use **unaided**, **assisted**, **abandoned** or
**not attempted** plus elapsed seconds. Use quotations only for actual words.

Tested build/commit: ______  Live/local URL: ______  Session dates: ______

| ID | Device / viewport | Language | T1 choose + seconds | T2 adjust | T3 explain | T4 revisit | T5 browse | Misunderstanding / actual quote |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | | | | | | | | |
| P2 | | | | | | | | |
| P3 | | | | | | | | |
| P4 | | | | | | | | |
| P5 | | | | | | | | |

## Findings and iteration log

No findings recorded yet. Do not fill this from automated browser checks.

| Observed issue | Participant/task evidence | Severity and reason | Proposed change | Retest evidence |
| --- | --- | --- | --- | --- |
| | | | | |

Report the number who attempted each task and actual outcomes, including
assistance and device differences. Keep measured time separate from perceived
ease and meal appeal. The implementation branch, screenshots, automated checks
and this study can support a design case study only with their distinct
evidence boundaries intact.

## Launch decision record

Unaided first-choice completions: ___ / ___ attempted

Unresolved blockers or misunderstandings: ______

Changes and retest dates: ______

Launch decision and rationale: ______

Product Hunt results, if later published, belong in a separate dated record.
Do not substitute visits, votes or a feature for the task observations above.

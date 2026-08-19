# F002-compile-contract-parity · Compile accepts what the schemas advertise, never silently drops

[2026-08-19] [🟢] [STATUS] [COORDINATOR] PROVEN · F002-compile-contract-parity

## Outcome

Any spec that satisfies a kind's published slot schema compiles with all its content preserved. Nothing is silently sliced away. Today `railSteps` advertises `minItems: 4, maxItems: 6` but compile does `.slice(0, 4)` (`src/kinds.ts`), so an agent sending six schema-valid steps silently loses two. Similar min/max drift exists on other kinds (compile accepts ≥2 where schemas say ≥3–4; `metrics` slices to 6 where the catalog says max 5; `cards` slices to 5 vs catalog max 4; `checklist` slices to 8 vs catalog max 6).

## Scope

- Audit every kind across three surfaces: `src/kinds.ts` compile + `slotsSchema`, and `src/kernel/artifactModules.ts` catalog. Make one of them the single source of truth and derive or assert the others.
- Replace silent `.slice()` truncation with either acceptance up to the schema max, or a named refusal (e.g. `STEPS_TOO_MANY`) — never a silent drop.
- Reconcile the lenient compile minimums (≥2) with the advertised minimums; pick one and state it in both places.
- Test that walks all kinds and asserts schema-valid input round-trips with item counts intact.

## Out of scope

- New kinds or new slots.
- String-length caps (F006).

## Acceptance

- For every kind: a spec at the schema's `maxItems` compiles with all items present in the output spec.
- A spec over the max is refused with a named code, not sliced.
- `press schema <kind>` output agrees with what compile actually enforces.

## Notes

Silent mutation is the reliability breach here: the agent's mental model diverges from the printed plate with no signal. Refusing over-limit input is acceptable; dropping content is not.

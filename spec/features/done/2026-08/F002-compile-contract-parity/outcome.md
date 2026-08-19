# Outcome

## Result

`src/kernel/slotContract.ts` is the single source of truth for item min/max. Compile, `press schema`, and the plate-plan JSON schema derive from it. Silent `.slice()` drops are gone; over-max input is a named refusal (`STEPS_TOO_MANY`, `METRICS_TOO_MANY`, …). A spec at the advertised max compiles with every item present.

## Date

2026-08-19

## References

- `src/kernel/slotContract.ts`, `src/kinds.ts`, `src/kernel/artifactModules.ts`
- `src/kernel/compileParity.test.ts`

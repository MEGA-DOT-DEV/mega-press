# Outcome

## Result

`evaluateSpec` / `proveArtifact` run `compileSpec` → `buildPlate` → `validate` in Node against the baked table. `press check` and `press render` both prove before writing. Warnings travel in human and `--json` output. A fixture that used to pass structural check and die at mount now fails check with the same named code.

## Date

2026-08-19

## References

- `src/evaluate.js`, `bin/press.mjs`
- `src/evaluate.test.ts`, `src/cli.test.ts`

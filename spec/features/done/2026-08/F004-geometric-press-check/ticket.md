# F004-geometric-press-check · `press check` runs the full pipeline, headless

[2026-08-19] [🟢] [STATUS] [COORDINATOR] PROVEN · F004-geometric-press-check

## Outcome

`press check` exit `0` genuinely means "this plate locks": it runs parse → compile → structural lock → pedagogy → **solve → validate**, so geometric refusals (`TEXT_OVERFLOW`, `CONTENT_OVERFLOW`, `OUTSIDE_SAFE_AREA`) surface at check time with named codes instead of at mount/PNG time. Today check stops at the structural lock (`bin/press.mjs` → `buildArtifact`), which is the biggest gap between the promise in `AGENTS.md` and actual behavior.

## Scope

- Make `buildPlate` + `validate` runnable in Node (no DOM), consuming the F003 metrics table.
- `press check` and `press render` both run the full pipeline before writing anything; identical error output shape.
- Report validator warnings (non-blocking) in check output, human and `--json`.

## Out of scope

- New validation rules.
- The accommodation ladder (F005) — check first tells the truth, then we widen what locks.

## Acceptance

- A fixture that today passes `check` but dies at mount with `TEXT_OVERFLOW` now fails `press check` with exit `1` and the same code.
- Property test over all fixtures: `check` ok ⇒ `render --format png` produces a PNG with no geometry error.
- `check` runtime stays interactive (< ~1s per spec).

## Notes

Depends on F003. Together with F001 this closes the loop: check tells the truth early, render reports honestly late.

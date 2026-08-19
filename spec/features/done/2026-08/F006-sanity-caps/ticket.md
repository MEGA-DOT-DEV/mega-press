# F006-sanity-caps · Generous string-length sanity bounds with named refusals

[2026-08-19] [🟢] [STATUS] [COORDINATOR] PROVEN · F006-sanity-caps

## Outcome

Garbage-length strings get a fast, named, actionable refusal at the structural lock (`TITLE_TOO_LONG`, `DETAIL_TOO_LONG`, …) instead of a downstream pixel-denominated geometry error. Caps are deliberately generous — they guard against nonsense, they are **not** the arbiter of fit. Geometry (F004) decides fit; a character count is a proxy that would be simultaneously too strict (refusing narrow titles that fit) and too loose (passing wide ones that don't).

## Scope

- Add `maxLength` to slot schemas (`src/kinds.ts`, `src/kernel/artifactModules.ts`) and checks in `src/kernel/lock.ts`: title ≈ 140, lead ≈ 200, step/card/layer detail ≈ 250, table cell ≈ 120 — exact numbers set from what portrait-frame geometry can ever accept, with margin.
- Named error codes stating the limit and the observed length.
- Document in the schemas that these are sanity bounds, so agents don't treat them as fit guarantees.

## Out of scope

- Any cap tight enough to guarantee geometric fit.
- Truncation — over-limit input is refused, never cut.

## Acceptance

- A 300-char title fails `press check` with `TITLE_TOO_LONG` naming the cap.
- A ~90-char title passes the lock (geometry decides its fate).
- No fixture that locked before is refused by the new caps.

## Notes

Deliberately last in the sequence: after F004 these are UX (better error placement), not safety. Sized against the *portrait* frame so the caps never fight the F005 escalation ladder.

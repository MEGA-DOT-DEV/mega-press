# F001-render-refusal-reporting · Render path reports geometry refusals as refusals

[2026-08-19] [🟢] [STATUS] [COORDINATOR] PROVEN · F001-render-refusal-reporting

## Outcome

A plate that fails geometrically (e.g. `TEXT_OVERFLOW`) during `press render --format png|html` exits `1` with the named error codes, exactly like a structural refusal. Today it can exit `2` ("tool broke") or, worse, exit `0` with a PNG of a blank page: `cli/host.ts` never sets `data-pressReady` when `mountArtifact` rejects, and `chromeShot` in `bin/press.mjs` gates only on the screenshot file existing, not on readiness.

## Scope

- `src/mount.ts`: surface build/validate errors on the `ready` promise in a structured form (named codes + messages), not just a thrown string.
- `cli/host.ts`: catch mount failure, write `data-pressError` plus the report JSON into the DOM.
- `bin/press.mjs`: gate the screenshot on `pressReady` / `pressError`; on `pressError`, exit `1` printing the named codes (same shape as `press check` failures). A real timeout stays exit `2`.

## Out of scope

- Making `press check` geometric (F004).
- Any change to what validate refuses.

## Acceptance

- A fixture spec that overflows geometry: `press render --format png` exits `1`, prints the named code(s), writes no PNG.
- A valid fixture renders unchanged, exit `0`.
- Killing Chrome mid-run still exits `2`.

## Notes

Found 2026-08-19 while auditing the reliability of the check→render loop. This is a correctness bug, not an enhancement: a refusal masquerading as tool failure (or as success) breaks the agent contract that exit codes are trustworthy.

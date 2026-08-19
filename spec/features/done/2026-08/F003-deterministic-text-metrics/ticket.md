# F003-deterministic-text-metrics · Text measurement is pure arithmetic, identical everywhere

[2026-08-19] [🟢] [STATUS] [COORDINATOR] PROVEN · F003-deterministic-text-metrics

## Outcome

`measure()` returns the same number in Node and in every browser, with no canvas, no DOM, and no `fonts.ready` race. This is the enabling move for a geometric `press check` (F004): the press faces (Argent Pixel, Geist Pixel, Geist Sans) have quantized advances, so a per-glyph advance table baked into the package can replace live canvas measurement as the production path.

## Scope

- A generation script that extracts per-glyph advances (including the letter-spacing and segmentation rules `src/text.js` already applies) from the vendored WOFFs, checked-in output.
- `src/text.js`: measure from the table in both Node and browser; keep the canvas/DOM path as a verification mode only.
- Parity test: table vs live canvas measurement within ε over a text corpus (titles, kickers, table cells, mixed scripts the fonts cover), run in CI against headless Chrome.
- Regeneration is deterministic: rerunning the script on unchanged fonts produces a byte-identical table.

## Out of scope

- Changing any type role, size, or spacing value.
- Fallback behavior for glyphs outside the faces' coverage beyond a defined default advance + warning.

## Acceptance

- The same spec solves to byte-identical geometry in Node and in Chrome.
- Parity test green in CI; a doctored font file makes it fail.
- `ensurePressFonts` is no longer load-bearing for correct measurement (still needed for painting).

## Notes

The current comment in `src/mount.ts` ("Wrong widths until these have loaded") names the race this feature deletes. Removing an entire failure class beats guarding it.

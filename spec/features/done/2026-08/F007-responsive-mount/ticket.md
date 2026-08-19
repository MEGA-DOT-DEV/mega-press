# F007-responsive-mount · Mounted plates track their container; legibility never degrades

[2026-08-19] [🟢] [STATUS] [COORDINATOR] PROVEN · F007-responsive-mount

## Outcome

A mounted plate stays correctly scaled as its container resizes (rotation, window drag, layout shifts), with the contract "never illegible, never reflowed": the fixed 1600px artboard scales uniformly, and below the legibility floor it stops shrinking rather than becoming unreadable. Today `src/mount.ts` computes the scale once at mount and never again, and falls back to `520px`/`55vh` height heuristics.

## Scope

- `ResizeObserver` on the host that recomputes only the CSS transform and host box — no re-measure, no re-solve, no rebuild (geometry is fixed by design).
- Host sizing via `width: 100%` + `aspect-ratio: frameW / frameH`, so CSS owns the width and the height heuristics go away; scale becomes `hostW / frameW`.
- `min-width` clamp derived from the existing `MIN_PHONE_PX` arithmetic (~340px effective width); below it the host scrolls instead of shrinking the plate further.
- Optional: re-raster canvas layers (field/vector) when the effective scale crosses a threshold, to keep dithered grounds crisp.

## Out of scope

- Reflow, media queries, or viewport-relative units inside the plate — the outer transform is the only responsive mechanism.
- Automatic frame switching by container size. Choosing `portrait`/`square` per context is the host's call (and F005 output makes the variants real).

## Acceptance

- Resizing the example page container rescales the plate with no rebuild (verify no re-mount in the example app).
- A 200px-wide container shows a scrollable plate at the clamp size, never smaller.
- `pnpm example` demonstrates both, and existing consumers need no API change (`MountArtifactOpts` unchanged or additively extended).

## Notes

Independent of the F003→F004→F005 chain; can land any time. The principle mirrors the validator's: reliability is a kept promise (legibility floor), strictness avoided by degrading predictably instead of refusing small containers.

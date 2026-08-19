# Outcome

## Result

`mountArtifact` sizes the host with `width: 100%` + `aspect-ratio` and a 340px `min-width` clamp. A `ResizeObserver` updates only the CSS scale — no re-solve, no rebuild. Below the floor the parent scrolls. `pnpm example` shows a resizable host and a 200px narrow scroller. `MountArtifactOpts` is unchanged.

## Date

2026-08-19

## References

- `src/mount.ts` (`LEGIBILITY_MIN_WIDTH`)
- `example/index.html`, `example/main.ts`

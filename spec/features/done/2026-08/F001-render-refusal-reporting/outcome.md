# Outcome

## Result

`mountArtifact` rejects `ready` with `MountRefusal` (named codes). The host writes `data-pressError` and POSTs `/__press__/status`. `press render` runs prove before writing; a geometry refusal exits `1` with the codes and writes no PNG. Chrome death or timeout still exits `2`. Screenshot is taken over CDP only after `pressReady`.

## Date

2026-08-19

## References

- `src/mount.ts`, `cli/host.ts`, `bin/press.mjs`
- `src/cli.test.ts` (overflow render writes no png)

# Outcome

## Result

`scripts/bake-metrics.mjs` extracts per-glyph advances from the vendored WOFF2s into `src/metrics/advances.js`. Production `measure()` and pretext layout use the table via a fake canvas context. Canvas/DOM is `useLiveMetrics(true)` verification only. Regeneration on unchanged fonts is byte-identical. `ensurePressFonts` is paint-only.

## Date

2026-08-19

## References

- `src/metrics/table.js`, `src/metrics/advances.js`, `src/text.js`
- `vendor/pretext/measurement.js` (`setMeasureContext`)
- `src/metrics/parity.test.ts`

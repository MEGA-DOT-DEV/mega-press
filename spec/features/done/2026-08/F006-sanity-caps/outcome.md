# Outcome

## Result

`STRING_CAPS` (title 140, lead 200, detail 250, cell 120) live on the slot contract and fire in `lockPlate` as `TITLE_TOO_LONG` / `LEAD_TOO_LONG` / `DETAIL_TOO_LONG` / `CELL_TOO_LONG`, naming the bound and the observed length. Schemas document them as garbage guards, not fit guarantees. Sized against portrait so they do not fight F005.

## Date

2026-08-19

## References

- `src/kernel/slotContract.ts`, `src/kernel/lock.ts`
- `src/evaluate.test.ts`, `src/cli.test.ts`

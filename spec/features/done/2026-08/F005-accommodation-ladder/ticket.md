# F005-accommodation-ladder · Bounded elasticity before refusal

[2026-08-19] [🟢] [STATUS] [COORDINATOR] PROVEN · F005-accommodation-ladder

## Outcome

Long-but-good content locks instead of being refused, without any off-scale value, silent drop, or truncation. The system tries a short ladder of legal, enumerable accommodations — each one fully re-validated — and only then refuses, in the author's currency rather than the renderer's.

The ladder: wrap (exists) → role step-down with floor (exists, `fit()`) → **frame escalation** (new: landscape → square → portrait when content overflows; `src/kinds.ts` currently hardcodes landscape) → refuse with actionable numbers.

## Scope

- Build/compile retries taller frames on geometric overflow; result records the accommodation (e.g. `steppedFrom: "landscape"`) so nothing is silent.
- Translate `TEXT_OVERFLOW` / `CONTENT_OVERFLOW` messages into author currency: px ÷ line-height ≈ lines, ≈ "shorten the title by ~N characters" / "remove one information unit" — alongside, not instead of, the exact pixels.
- Proximity warnings, non-blocking: `NEAR_OVERFLOW` (content within one line-height of the safe bottom) and `TITLE_STEPPED`, emitted through the existing `Report` warning channel and shown by `press check` (F004).

## Out of scope

- Truncation or ellipsis anywhere. Font sizes off the role scale. Arbitrary frame heights. Reflow.
- Consumer-side frame selection UX (hosts already receive `spec.frame`).

## Acceptance

- A fixture that refuses on landscape locks on portrait, with the escalation reported in `--json` output and exit `0`.
- A fixture too long for every frame refuses with a message stating roughly how many characters or units to remove.
- Warnings appear on near-limit fixtures with exit `0`; nothing previously locking is newly refused.

## Notes

This is the "not too strict" half of the reliability/strictness pair. The guardrail: every rung is a named, enumerable state that `validate()` re-checks — never a continuous knob. Depends on F004 for check-time visibility; frame escalation itself only needs F002/F003.

# Verification record

2026-09-07 · local working tree · research, not release approval.

## Executable checks

Run from `mega-press/`:

| Command | Observed result |
| --- | --- |
| `pnpm test` | 172 tests passed across 15 files, including the pre-existing accessBoundary work |
| `pnpm typecheck` | Passed |
| `pnpm build` | Passed |
| `pnpm framework:test` | 35 tests passed: the original 12 model-contract + 5 fixture/domain tests, plus 18 showcase tests |
| `pnpm framework:build` | Passed; isolated output in ignored `dist/framework-lab` |
| `node --check lab/framework/app.js` | Passed |
| `git diff --check` | Passed |

The lab model tests cover strict shape/IDs/counts, source-preserving detached freezing, named presentation choices and raw-style refusal, event ordering/source/instance identity, no-op/invalid suppression, observer failure isolation, reentrant-dispatch refusal, unsubscribe/disposal, explicit-progress determinism and reduced motion.

The lab's schema evaluator implements only the descriptor's small keyword subset. These tests do not establish full JSON Schema conformance. Its model is not a package export.

## Existing guarantees that still fail

```sh
pnpm build
node lab/framework/probe-legacy.mjs
```

All three observations reproduced:

| Guarantee | Actual output |
| --- | --- |
| Preserve code literal `2019–2024` | Current compiler changes it to `2019,2024` |
| Preserve bars' advertised `unit: "days"` | Current compiler emits `share` |
| Build success implies geometric publication success | Overflow fixture passes build and fails proof with `CONTENT_OVERFLOW` |

The script reports observations, not a successful publication gate and not tests requiring these bugs to remain. **This research did not repair production source.** Green existing tests are not evidence against the reproductions.

## Browser checks

Built the lab, served only `dist/framework-lab` on `http://127.0.0.1:4281`, and inspected it through Chrome DevTools MCP in a separate browser context. The actual legacy renderer is bundled into the comparison; no substitute screenshot stands in for it.

### Final presentation matrix

Three fixtures × three backgrounds × two frame treatments × three viewport widths: **54 combinations passed**.

| Viewport | Reading figure width | Reading body | Page overflow | Legacy control |
| --- | --- | --- | --- | --- |
| 360px | 328px | 16px | None | 340px minimum produces contained local scrolling |
| 390px | 358px | 16px | None | Fits the available baseline wrapper |
| 1440px | 930px | 16px | None | Fixed-artboard control, max 390px host |

For each combination, checked exact title/step title/detail DOM equality, unchanged source steps after presentation edits, no text-box overflow, and correspondence between declared choices and the view. Tall reading layouts scroll vertically; they are not forced into a fixed video aspect.

For all 18 field combinations, inspected the actual canvas alpha: **zero ink pixels inside the sampled content rectangles**, with nonzero decorative ink elsewhere. This caught an integration mistake during development: field geometry needs the existing `Rect` anchors, and its halo is expressed in artboard units, not raw reading CSS pixels. The lab now uses that existing geometry type and maps measured boxes into the field's coordinate space. Opaque title/label/body surfaces remain an additional safeguard.

Screenshots were viewed inline at desktop and phone sizes. Direct MCP screenshot persistence was denied by its workspace-root policy, so no local screenshot receipt files are claimed. Stored Mega-Content reference PNGs were read separately; they are not new output from this lab.

### Interaction and lifecycle samples

- Native pointer click selected `request`, producing sequence 1 with source `pointer`.
- Native Enter selected `call`, producing sequence 2 with source `keyboard`; repeating Enter emitted no additional event.
- Seeking to 25% produced emphasis weights 0.75/0.25 without a semantic event.
- Enabling the lab's reduced-motion control settled to 100% without another semantic event. The continuously updated pose output has `aria-live="off"`.
- A background authoring change preserved the steps, incremented the revision, cleared the old event view, and emitted no reader event. The next real state action used a distinct instance ID and restarted sequence at 1.
- Changing fixture during active emphasis playback left the new view settled, with no old events.
- The accessibility snapshot exposed named native controls and selected state through `aria-pressed`; the selected target also has a visible structural mark.
- Observed lab resource requests were confined to `127.0.0.1:4281`. No analytics transport is implemented.
- No application errors were observed. Repeated QA-only pixel readback generated Chrome's `willReadFrequently` performance advisory; this is not an application rendering failure.

These browser checks were performed interactively through MCP, **not added to CI**. Reproduce them using the [lab's manual experiment steps](../../lab/framework/README.md), real viewport emulation, document/DOM comparisons, and pixel inspection for the field. A viewport dropdown alone is not a mobile-device test.

## Later seven-frame gallery / separate evidence

`showcase.html` uses the existing exact-frame `evaluateSpec → mount` path. Seven default renders and both title states pass geometry checks; tests also preserve authored labels/prose/units/values, all garden focus states and two isolated controller instances. Two default square compositions retain `PLATE_SPARSE` warnings; those are visible in their reports rather than hidden or filled with invented copy.

A separate temporary-profile headless Chrome/CDP check confirmed all seven real renders at 1440px, both title states, no measured text-box clipping, and all seven detail pages at 390px. Detail pages keep an 800px locally pannable artboard with no page-level overflow; the overview also fits 390px. Pointer selection emitted sequence 1, native Enter sequence 2, and repeated Enter/title visibility emitted no further reader event. Only `127.0.0.1:4281` resource hosts and no runtime exceptions were observed.

A late read-only review found that geometry success was recorded before mounting and that the existing font helper could resolve after a load failure. Gallery-local fixes now stage painting off-tree, catch preparation/paint failures, distinguish `geometryValid` from `presentationMounted`, update readiness after every attempt and require the actual registered font faces to be loaded. Production helpers remain unchanged.

Browser fault injection confirmed: a canvas failure after valid geometry reports `PRESENTATION_FAILED`, clears the stale visual and sets readiness false; a semantic selection still commits and is reported even if painting fails; restoring paint recovers without another interaction event. Injecting failed font-face status refuses before any frame mounts. These are injected failure-state checks, not a claim of exhaustive font/network failure coverage or new CI tests. All 35 lab tests and the build were rerun successfully after the fix.

Receipts from this one-off check are `/tmp/press-showcase-qa.json` and `/tmp/press-showcase-*.png`. The initial overview screenshot was directly inspected. Capture of the remaining PNGs is not claimed as a full manual visual review. The temporary CDP script is not CI coverage. MCP was unavailable because its browser profile was already in use; a separate owned Chrome profile was used and closed without stopping the existing browser or preview server.

**The author found the gallery too simple for the actual technical-content requirement.** Its successful checks do not establish compound graphs, field ports, linked legends/annotations, interactive SVG, dense reading layouts or author acceptance. The [new technical study](technical-composition.md) is a proposal, not implemented or tested support for those capabilities.

## Reference research

- Mega-Dev: read token and lab implementation sources; viewed public `/labs/dither` and `/labs/static` in Chrome. Public pages are not asserted to match the local commit exactly.
- Mega-Content: read-only agent investigation, direct coordinator inspection of five stored PNGs and representative composition/interaction source. No reference-project tests or fresh render suite were rerun.
- Figma: supplied nodes still not inspected; the five earlier JPEGs were export-disabled notices.
- Nine later author PNGs: all directly inspected as actual technical reference artwork. Full register and interpretation limits are in [technical composition](technical-composition.md).

Exact paths, provenance and conclusions: [design-alignment.md](design-alignment.md), [references.md](references.md).

## What remains unproved

- General composition/graph/chart support through the proposed unified authoring contract.
- Production-responsive solved geometry, complete font/asset readiness, and cross-browser image parity.
- Manual assistive-technology usability, forced-colour/zoom coverage, and accessible chart alternatives.
- Existing interaction-prototype promotion, validated restoration, general transition geometry, deterministic video export, and real host event integration.
- Author preference and explanatory quality on real technical/nontechnical content.

No consumer source/vendor pins, production `src` files, or existing dirty extension work were changed by this research. No commits, pushes, installs, deployments, or production-data mutations were performed. Producer package scripts and research documentation/lab files are the intentional changes. Author review remains open under F009.

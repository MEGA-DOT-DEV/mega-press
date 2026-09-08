# Design alignment / reuse before invention

Research update, 2026-09-07. The author identified two usable reference projects and explicitly asked for simplicity: **the best part is no part**. This changes the implementation emphasis, not the source-preservation requirement.

## What was actually inspected

### Mega-Dev / visual vocabulary

Local checkout: `bc1de1a10982411fcc5255b2110da60b36a7f134` (working tree has unrelated changes). Read the token contract and relevant lab implementations. Also inspected the public `/labs/dither` and `/labs/static` pages in Chrome. Those live pages are visual evidence, **not an exact-commit verification of the local checkout**. No local Next server, credentials, database, or consumer changes were required.

| Source under `mega-dev/` | Useful evidence |
| --- | --- |
| `packages/ui/src/base.css`, `theme.css` | Argent Pixel headings; Geist Sans body; Geist Mono labels; pixel face is an accent, not default reading copy. Body ramp starts at 16px; short labels at 12px. Tokens also own spacing, motion, and theme-aware ink. |
| `apps/web/src/app/labs/dither/page.module.css` | Quiet blue blueprint grid, generous black space, thin rectangular rules, opposite-corner registration marks, a strong heading/lede hierarchy. |
| `apps/web/src/app/labs/dither/dither-playground.tsx` | Useful designer calibration controls. Eleven numeric shader controls are **not** automatically an appropriate model-facing authoring API. |
| `apps/web/src/app/labs/static/static-lab.tsx`, `static-field.tsx` | Named texture variants, origin presets, controlled density, decorative canvases, and still output under reduced motion. Composition can vary without changing the visual vocabulary. |
| `apps/web/src/app/labs/swirls/signal-ribbon.tsx` | Motion has lifecycle costs: visibility, reduced motion, degraded performance, readiness, and resource cleanup. A decorative shader is not a reason to add those costs to every article figure. |
| `apps/web/src/app/labs/deck/page.module.css` | Frames and accents communicate named states. Its card thumbnail clipping/tiny text are **not** reading-profile precedents to copy. |

Public references: [field](https://mega.dev/labs/dither), [static](https://mega.dev/labs/static). Direct Figma access remains unavailable. The old brief's `docs/context/concept-art/` location is absent in this checkout; it was not treated as inspected evidence.

The token files are the Mega-Dev styling authority; lab implementations are examples, not proof that every experimental declaration follows current policy. In particular, the live gallery and local token contract can differ. Do not copy a second `--mega-*` palette into a consumer or add a sibling-checkout runtime dependency to Press.

### Mega-Content / expressive composition

Local checkout: `cdfa22cdd044d8727064f1be2c3b59d454efff99` (unrelated course work is dirty and untouched). A research agent read the lab's authoring/implementation contracts. The coordinator inspected these five stored PNGs directly and read the first four matching source files, plus `31-encoding-morph.js` and `src/spec.js`:

| Specimen under `mega-content/lab/plates/` | What to retain |
| --- | --- |
| `19-split-chart.js` / `png/19-split-chart.png` | A claim and commentary in one column, chart evidence in the attachment. The same attachment accepts a screenshot or a chart—no special template for each pairing. |
| `22-portrait-brief.js` / `png/22-portrait-brief.png` | A text-heavy sequence with a band derived from the body. Portrait adds capacity; it does not make horizontally scaled text larger. |
| `23-square-claim.js` / `png/23-square-claim.png` | A centred claim and quotation, with a field that clears around content. Background choice is declarative, not a hand-placed image. |
| `24-fanin.js` / `png/24-fanin.png` | Three sources converge on a hub, then an output. Authors describe nodes, edges and ranks; the engine derives ports and routes. Never flatten this into a linear sequence just because that template is easier. |
| `png/34-radar-comparison.png` | Exact values, common scale, and a stable legend alongside visual comparison. The stored PNG is a visual reference, not proof of accessible data or current paint correctness. |
| `31-encoding-morph.js` | Four encodings share the same series and fixed legend. Animation explains a relationship without changing the quantities. Source inspected; motion not replayed in this research. |

These are existing reference images, not freshly generated proof. Their numerical claims were not independently researched. The lab's historical instructions to cut content to fit and prohibit dashes do **not** override the new preservation contract.

The important architectural evidence is `mega-content/lab/src/spec.js`: JSON calls the same component functions as authored JavaScript, with named layouts, an optional attachment, and declarative backgrounds. Much of the proposed composition capability already has a concrete form. Its accepted fields and current friendly authoring entry points still need reconciliation; copying this older compiler wholesale would reintroduce its validation gaps.

## Revised smallest useful shape

```text
existing content/components + named presentation choices
                    ↓
     one validation/preparation path
                    ↓
      existing mount / transition seam
                    └─ optional semantic onEvent callback to host
```

This is a **contract sketch**, not newly shipped exports. Keep the existing component functions, solver, screen, frames, and mount where they satisfy the promise. Consolidate duplicate definitions rather than introducing a second descriptor framework beside them. Before introducing a new runtime, try semantic notifications at the existing interaction transition point and prove its lifecycle and accessibility. The isolated controller is a contract experiment, not a commitment to replace that runtime.

No plugin loader, universal scene DSL, provider framework, analytics transport, authoring repair server, mandatory timeline, or three-way package split is required for this next step. Logical boundaries can remain functions in the existing package. New modules need a demonstrated responsibility, not an architectural diagram box.

## The freedom boundary

| Author/model may choose | Framework/host must retain |
| --- | --- |
| Content, semantic relationships, exact values and labels | No invented text, changed units, clipped facts, or silent topology changes |
| Existing components and permitted compositions/attachments | Geometry, connector routing, nesting/count budgets, valid combinations |
| Named background and frame treatments; supported aspect preferences | Palette/type scales, protective clearing, delivery constraints and final legibility proof |
| Which semantic state/target to emphasize | Stable identity, valid transitions, keyboard access and reduced motion |
| An author-approved revision | No renderer repair of the source; revision-aware events and publication |

The host owns the actual delivery size/profile and can restrict expensive or unsuitable treatments. The model is **not** limited to filling text slots; nor does it need access to every raw color, coordinate, shader uniform, or CSS property to be creative. Prefer a small number of composable, meaningful decisions over a larger list of decorative switches.

Background/frame authoring changes are not reader interaction events. A new authored revision gets its own instance/event context. Scrubbing or rendering a decorative field is also not evidence that a reader selected or understood something.

## What changed in the working experiment

- Removed the original hand-drawn flow SVG and generic dot lattice.
- Added named `quiet`, `blueprint`, and `field` backgrounds, plus `registered`/`plain` frame treatments, in the **same recipe schema**. Dropdown choices derive from it; no second option registry.
- These optional choices are stored in the document and preserved verbatim. Raw styling/clearing overrides are refused. A control change explicitly creates a new revision; it does not mutate the previous document.
- Reused `src/screen.js` and `src/field.js` for the field. Press already carries the same Bayer matrix as Mega-Dev. No new shader, rendering loop, texture dependency, or copied external asset was added.
- The HTML reading experiment supplies measured boxes to existing protective clearing; production continues using solved rectangles. Opaque text surfaces remain. This is not a new proof of responsive production geometry.
- Raised the lab's remaining 10–11px microcopy to at least 12px; diagnostic code is 13px, reading body remains 16px. The unchanged legacy control retains its current scaling.

## Next experiment should remove uncertainty, not add machinery

Run a genuine split or graph through the existing composition path with these source-preservation and presentation restrictions. Check whether the friendly model-facing schema can expose that power without duplicating the underlying component definitions. Then prove one existing interactive specimen with a small semantic callback, two isolated mounts, keyboard/reduced-motion parity, and teardown. Only add an abstraction when that experiment shows why the existing function boundary is insufficient.

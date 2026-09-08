# Reference and evidence register

## Human-provided visual references

The author supplied these Figma nodes:

- [Selected frame, 2016:29252](https://www.figma.com/design/o0P1B1CVWLJ18aS7VvEOst/mega.dev--Copy-?node-id=2016-29252)
- [Broader selection/page, 24:1863](https://www.figma.com/design/o0P1B1CVWLJ18aS7VvEOst/mega.dev--Copy-?node-id=24-1863)

The local Figma MCP responded to initialization but refused both design requests. The author then asked to ignore Figma MCP and continue. No Figma design pixels, layers, variables, or motion tracks were obtained. Do not describe the lab as Figma-derived or imply either node has been audited.

Five JPEGs were read directly:

| Clipboard file | Visible content |
| --- | --- |
| `clipboard-2026-09-07-171008-067BC3C4.jpeg` | Figma's “Export disabled” dialog |
| `clipboard-2026-09-07-171014-50DB20F1.jpeg` | Same export-disabled dialog |
| `clipboard-2026-09-07-171021-D9F615C0.jpeg` | Same export-disabled dialog |
| `clipboard-2026-09-07-171026-6C99F1B0.jpeg` | Same export-disabled dialog |
| `clipboard-2026-09-07-171030-2CA8708F.jpeg` | Same export-disabled dialog |

These are evidence of an access/export limitation, **not background design references**. They are not copied into the repository. Do not bypass the file's export restrictions. Request permission-enabled exports or author-provided screenshots/SVGs when available; the architecture research need not block on them.

## Nine later technical PNGs / usable artwork

All nine author-supplied PNGs named `clipboard-2026-09-07-190128-40375041.png` through the explicitly listed `190201-6C6D025B.png` were directly viewed. They contain real technical diagrams, not access dialogs. The complete filename/content/capability register is in [technical composition](technical-composition.md#1-what-was-actually-inspected).

They establish the stronger technical-content requirement and the author's rejection of the simple gallery as sufficient evidence. They are not proof of current Press support, and their provider/transcription/model/count claims have not been fact-checked. They remain at their supplied local paths; no PNG was uploaded or published. The Figma limitation above does not apply to these supplied screenshots.

## Newly supplied usable reference projects

The author subsequently pointed to Mega-Dev's `/labs` and `mega-content/lab`. These are now inspected sources, unlike the unavailable Figma nodes. See [design-alignment.md](design-alignment.md) for exact paths, checkout provenance, the five viewed Mega-Content PNGs, and the distinction between local code, stored renders, and public Mega-Dev browser observations.

The original three-ground sketch is superseded: the current lab reuses Press's existing Bayer field, adds the Mega-Dev blueprint vocabulary, and stores named background/frame choices in the document. No sibling project is a runtime dependency.

## Actual visual baseline

- `src/tokens.js`: near-black cabinet, Argent Pixel headings, Geist faces, red structural accent, quiet rules, controlled spacing/strokes/grounds.
- `src/fonts.css`: the shipped font assets used by the lab; no external font CDN.
- `example/exemplars/`: established plate vocabulary.
- `src/mount.ts`: actual scaled artboard behaviour used as the lab's control.
- `components/access-boundary.js` and related dirty files: an existing uncommitted semantic extension, preserved by this work.

The initial quiet/lattice/flow grounds were original token-based sketches. After the reference follow-up, the generic lattice and drawn flow SVG were removed in favour of quiet/blueprint/field treatments grounded in inspected prior art. None is claimed to reproduce the still-unseen Figma nodes.

## Current-code observations driving the proposal

| Observation | Source / reproducibility | Implication |
| --- | --- | --- |
| Normalization rewrites dashes recursively, including literal code strings | `src/kernel/normalize.ts`, `stripDashes`; `lab/framework/probe-legacy.mjs` | Preserve author bytes; editorial policy must not mutate meaning |
| Bars catalogue asks for `unit`; compiler reads `barUnit` and defaults to `share` | `src/kernel/artifactModules.ts`, `src/kinds.ts`; diagnostic above | Generate validation/discovery from one authority |
| Code drawing helpers expand tabs and trim outer blank lines; code tokens are canvas paint, not semantic DOM | `components/code.js:52–193`, directly inspected during the technical-reference follow-up | Do not treat painted syntax classes as a source-preserving annotation interface; retain exact source and explicit anchors |
| Structural build success can precede geometric refusal | `src/build.ts`, `src/evaluate.js`; existing overflow fixture | Explicit stages and one authoritative preparation gate |
| Outline converter slices steps, inserts generic detail, and lacks cases for several advertised kinds | `src/kernel/outlineToPlan.ts` | Outline support must be declared and fail closed |
| Public mount returns only `ready`/`unmount`; interaction prototype is a separate path | `src/mount.ts`, `src/interact.js`, `src/spec.js` | Define state, lifecycle, and event contract before promoting motion |
| Fixed geometry scales to phone width; nominal floor is 5.5px | `src/tokens.js`, `src/mount.ts` | Test an output-size reading profile, not only containment |
| Canvas-only labels/data lack a general semantic equivalent | `src/render.js`, `components/chart.js`; fresh gallery accessibility snapshot | Meaning must be available outside pixels |
| Line chart config disables both axis titles | `components/chart.js` | Label preservation belongs in semantic/presentation acceptance |
| Fonts can fail without rejecting readiness; image paint is asynchronous | `src/mount.ts`, `src/render.js` | Separate usable-asset readiness from DOM insertion |

Run the diagnostic with:

```sh
pnpm build
node lab/framework/probe-legacy.mjs
```

It records failures as observations rather than making tests that require bugs to remain. Re-run it after repairs and update evidence. A future fix must not be removed merely because this historical register described the old behaviour.

## Technical media follow-up

The read-only source audit, with direct coordinator checks, found reusable normal-image mounting, solved prose, code highlighting and chart legends—but not a supported cross-medium annotation/category/SVG-region contract. In particular, images are withheld from writer vocabulary, icon `Path2D` support is not general SVG support, chart-local legend keys are not persistent domain categories, and morph selection does not verify matching source/destination datasets. Current capabilities, precise source pointers and proposed extension boundaries are recorded in [technical composition](technical-composition.md#current-source-check--media-text-and-interaction). Production source was not changed by this audit.

## Scope limits

This is based on local checkouts, not an audit of deployed applications. Consumer pins can advance independently. The Press working tree was already dirty; none of its existing engine changes or generated art were replaced or committed. Real reference artwork is now available. Visual/style decisions remain provisional pending author review and successful demanding-corpus experiments; inspecting a reference does not prove the engine can reproduce its semantics.

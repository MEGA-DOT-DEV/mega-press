# Framework lab

**Current interactive delivery:** [Press Studio](../../spec/framework/studio.md)
at `/studio.html` uses canonical compositions, project skins, background presets
and the package lesson controller. Run `pnpm studio` for port 4282. The experiments
described below retain their historical scope and limitations.

A disposable proof for the [framework direction](../../spec/framework/README.md), not a public `@mega/press` API or a replacement renderer.

```sh
pnpm framework:test
pnpm framework:lab       # http://127.0.0.1:4281
pnpm framework:build     # dist/framework-lab, ignored by git
```

## Three views, and the limit of the evidence

- `/` is the original reading/sequence experiment described below.
- `/showcase.html` contains seven actual fixed-artboard renders: four compositions from the earlier Mega-Content lab and three new combinations of existing parts. Open a frame to inspect it, toggle its title, or select a step in the portrait garden example. `showcase-fixtures.mjs` holds the immutable component specs; `showcase.test.mjs` adds 18 tests.
- `/technical.html` now has two rendered rich-content prototypes: **database schema** with four named field relationships, and **annotated media** with linked text/legend/SVG selection, multilingual strings, code/table views and a real screenshot attachment. These use a new shared experimental DOM composition module, reusing Press fonts, surfaces, syntax tokenization and `routeAround`; **they do not pass through the canonical component compiler/solver/renderer**. This is visual/interaction evidence, not proof that the production engine already supports these compositions. Provider-flow and execution-trace frames are not delivered yet. Eight technical-model tests bring the current lab total to 43.

The gallery uses canonical `evaluateSpec → mount`, not a parallel HTML drawing stack. It requests exact landscape/square/portrait frames, bypassing the smallest-fit ladder deliberately. Its component specs are a trusted lab surface, not a promoted authoring API. Two square examples retain sparse-layout warnings; reports expose the actual preparation result. Fixed frames scale rather than reflow, with contained panning in the detail view on narrow screens.

**The author judged this gallery too simple to establish technical expressiveness.** The [nine-reference technical study](../../spec/framework/technical-composition.md) is the new requirement: compound graphs, typed fields/ports, shared legends/annotations, mixed statistics/traces, media/SVG and long reading layouts. Those capabilities are not implemented by these seven examples.

The two technical frames were captured and visually inspected at 1318px wide (content heights 1968px and 2237px). The local browser receipt checks obstacle/label clearance, authored text slots, actual font/image readiness, pointer field selection, native keyboard SVG activation, linked highlighting, no-op/title-event suppression, and 390px local frame panning. It is not a complete accessibility audit, a generic SVG sanitizer, quantitative waveform, canonical geometry proof or motion proof. The SVG is an owned local asset, not a whole diagram pasted as an opaque image. Source content is immutable; selection and title visibility are view state. No production files or consumers are changed by this prototype.

## Scope of the original reading experiment

- One strict, schema-described `sequence` recipe, exercised by technical, nontechnical, and verbatim-content fixtures.
- Detached immutable documents; stable authored step IDs; no editorial rewriting.
- An instance-scoped state controller with semantic events, no transport, deterministic sequence numbers, disposal, and no-op suppression.
- An emphasis-only transition sampler with a disposable browser driver and a seeking control. Reduced motion settles immediately.
- A responsive reading-profile **HTML prototype**, using existing Press inks/fonts. All text stays present and keyboard controls are native buttons.
- A real production `parseArtifact → buildArtifact → mountArtifact` baseline inside a phone-width host. It has not been modified for the experiment.
- Optional document-level background (`quiet`/`blueprint`/`field`) and frame-treatment (`registered`/`plain`) choices. Controls derive from the recipe schema; raw styling is refused. The field reuses existing Press screen/clearing code, without a new shader or animation loop. See the inspected [design references](../../spec/framework/design-alignment.md).

## What is not implemented

No production recipe registry migration, general scene language, public bounded-composition authoring contract, compound graph/field-port API, linked annotation/legend system, interactive SVG contract, geometry interpolation, real video export, image readiness contract, generalized accessibility renderer, validated responsive solver, server publishing API, or consumer upgrade. The seven-frame gallery only exercises existing simple component/graph composition. The technical DOM prototypes explore some missing capabilities separately; they are not public implementations of the proposed contracts. The descriptor validator covers only the schema subset used by this experiment; it is not a complete JSON Schema engine.

The reading layout is intentionally separate from production paint. It is a **hypothesis to measure**, not a consumer-ready parallel visual stack. It is excluded from package exports and the published file list. Do not import it in either consumer.

## Manual experiments

1. Change subjects. The same recipe should cover the tool loop and the simplified catchment sequence without subject-specific code.
2. Change background or frame treatment and inspect the document. This is an explicit authoring edit with a new revision/instance, not a reader event; all source wording stays intact. Then select the integrity fixture. The new document preserves the en dash, Unicode, and literal code. The current renderer control demonstrates its existing normalization problem.
3. Set reading width to 390px. Compare its body text with the actual scaled legacy frame below.
4. Focus a step with keyboard and pointer. Inspect semantic IDs, instance identity, source, previous/next state, and monotonically increasing event sequence. Mounting and no-op selection produce no events.
5. Seek a transition, replay it, and enable reduced motion. The semantic state is committed independently of animation progress; seeking emits no semantic interaction event.
6. Switch subjects during playback. The old controller, subscription, and RAF are disposed. Events are not sent anywhere.
7. Clear the event view. This clears the UI only, not the controller's sequence. The view explicitly caps its displayed event history at six.

## Reading the comparison honestly

A is a consolidated fixed-template strategy; the control represents its current layout behaviour, not a completed consolidation. B is the proposed bounded-recipe strategy, demonstrated with one recipe only. C, the general scene model, is a documented alternative, **not a third implemented engine**.

Frame treatment means registration decoration, not an aspect-ratio selector. Backgrounds remain still while emphasis plays; the field uses existing protective clearing with measured HTML boxes, not certified responsive solver geometry.

The viewport selector constrains the figure container. For genuine browser/mobile layout checks, also use device emulation at 390px or 360px. The old mount enforces a 340px minimum; its scrollable baseline wrapper deliberately contains any resulting overflow rather than hiding the control's limitation.

# Framework contract candidate

Status: **proposed architecture**, not the current `@mega/press` API. The isolated lab tests a small subset. No consumer may import the lab as a shortcut.

## Implementation bias / fewer parts

The [reference follow-up](design-alignment.md) found existing composition, field, frame, and interaction machinery. Start by consolidating and exposing that machinery safely, not implementing every box below as a new subsystem. The author's [nine dense technical references](technical-composition.md) show that presentation choices and a semantic callback alone are insufficient: compound nodes, semantic relations, linked legends/annotations, measured assets and long mixed-content layouts must be tested. Reuse remains the implementation bias, not an excuse to constrain the corpus to simple examples. Logical stages and version boundaries can remain functions in one package.

## 1. Separate meaning from its presentation

```text
Author or agent
  │ document: recipe + authored content + stable semantic IDs
  ▼
Decode → semantic validation → editorial report
  │ immutable, versioned document; no silent repair
  ▼
Recipe + output profile + immutable cabinet + resolved assets
  ▼
Compose → solve → validate visual and semantic outputs
  │ prepared artifact, diagnostics, provenance
  ├─ static browser/image adapter
  ├─ interaction controller → browser presentation
  └─ deterministic transition evaluation → future export adapter
```

The engine is deterministic; authoring assistance is outside it. An agent may propose a shorter title, a split, or a new recipe. Only an accepted authoring change modifies the document. The compiler never improvises a source, substitutes a unit, strips punctuation, drops a relation, or fills missing detail.

Separate three names that are currently easy to confuse:

1. **Decoded/valid document:** content shape and semantic references are admissible.
2. **Prepared artifact:** a specified output profile has solved, validated geometry and usable assets.
3. **Mounted/settled presentation:** the prepared artifact is displayed, with a distinct signal when a transition finishes.

A structural `ok` must not be advertised as permission to publish. `parseArtifact`, `buildArtifact`, the CLI, authoring routes, and the browser currently make different subsets of these checks. Converge them on one preparation service, with the cheaper intermediate stages explicitly named and typed.

## 2. One definition per registered building block

A registered component or composite recipe has one authority for its input shape, stable identity, semantic checks, available presentations, examples, and capability declarations. Prefer enriching/consolidating the existing component definition over introducing a new registry beside it. Recipes are optional convenient compositions, not a required implementation step for every new arrangement. “Definition” describes a responsibility, not a mandatory plugin interface. Derive catalogue entries, discovery schemas, and type/schema parity tests from this authority.

A candidate production definition contains:

| Part | Role |
| --- | --- |
| `id`, `version`, `purpose`, `pickWhen` | Discovery grounded in the relation being explained |
| `contentSchema` | Strict authoring shape; one source for count/field constraints |
| `validateMeaning` | References, unique IDs, units, domain-specific invariants |
| `compose` | Lower meaning into approved components and layout policies |
| `profiles` | Explicitly supported outputs; unsupported means refusal |
| `interaction` | Named states/actions and semantic targets, if supported |
| `describe` | Accessible reading order, relationships, chart data, alternatives |
| `examples` | Valid, refused, narrow, dense, and nontechnical fixtures |

The lab uses one `sequence` descriptor only. It does not prove all these hooks or introduce a plugin loader. Use an established schema/type tool for production when the contract settles; the lab's subset validator is not that choice.

Outline input is an optional adapter, not a second hidden compiler. Discovery must declare whether a recipe supports it. Unsupported input returns a named refusal. Every advertised outline example must round-trip without truncation or invented words.

## 3. Three extension levels, bounded at each level

1. **Fill a known recipe when it fits.** Authors describe a sequence, comparison, boundary, hierarchy, or quantity, not a pile of rectangles. This is a shortcut, not the required route for most technical explanations.
2. **Compose approved structures as an ordinary author/model capability.** Use named arrangements and nested content: schema/code/table bodies inside graph nodes; statistics, legend and trace on one surface; an architecture with a resource attachment. Do not require another trusted recipe implementation for every arrangement. Node/field ports, semantic relations and shared category/annotation references must be explicit rather than inferred from appearance.
3. **Implement a genuinely new primitive or convenience recipe.** This is the reviewed extension boundary. Require a semantic contract, source-preserving lowering, profile support, accessible output, and reference fixtures before discovery exposes it.

Do not promise a universal scene/constraint DSL. A sequence and a quantitative chart need not share their domain schema to share a composition. Keep resource/depth/routing caps explicit, but distinguish them from editorial density advice: a nineteen-card grouped explanation is not automatically incorrect. Compound/conditional/return graphs, field ports and cross-view legend identity are requirements to prove, not current capabilities established by the fan-in gallery.

`accessBoundary` is useful evidence for a new semantic recipe, not proof that all diagrams should become boundary diagrams. Its current dirty implementation remains separate work.

## 4. Correctness, editorial policy, and output profiles

**Hard errors:** malformed fields, unknown versions, dangling references, lost labels/units, unsupported semantic combinations, unaccounted-for clipping, invalid contrast, inaccessible essential data, missing required assets, unsupported output profile.

**Editorial findings:** sparse content, weak distinction, long prose, optional titles, standalone quotations, recommended maximum units. Findings carry code, path, severity, and a suggested author action; they do not edit content. Hosts may choose a stricter named publication policy.

**Profile-specific guarantees:**

- **Reading:** named layouts at narrow/wide widths; essential body text meets a usable output-size floor. The lab proposes 16px, not a universal typography decree. All content remains available in reading order. Density can increase height, change a permitted composition, or ask for a split. It cannot silently remove words.
- **Frame:** declared aspect and delivery size for slides, images, or video. If content cannot fit at the profile's legibility floor, refuse. A required 16:9 frame must not silently turn into portrait.
- **Compact:** only supported when meaning survives a compact composition. Otherwise offer an explicit expand-to-read representation or refuse that profile.

Dense technical references also require content-driven height and explicit pan/zoom/reading alternatives where narrow reflow would change topology. The three fixed artboards are not a complete reading-profile strategy. See [technical composition](technical-composition.md#7-frame-and-density-policy-must-stop-hiding-the-content-problem).

The host owns delivery constraints and the effective cabinet. Within them, authors/models may choose named backgrounds, frame treatments, supported aspect preferences, and permitted compositions. These are meaningful authoring choices, not raw coordinates or a shader-control panel. Distinguish host chrome from content: hiding a title requires an equivalent surrounding heading/accessible label. Revalidate with the effective cabinet and assets, not with defaults that are replaced at paint time.

The current renderer scales fixed 1600px artboards, allows a 5.5px phone floor, and uses process-global theme tokens. The HTML reading lab is not yet connected to the geometry solver. Before promoting it, choose and test whether named reflow layouts lower into the existing solver or require a distinct layout adapter under the same preparation contract.

## 5. Backgrounds are presentation, not evidence

A ground comes from a curated vocabulary, independent of subject text. Keep a quiet default. Decorative fields must not impersonate axes, imply unsupported causality, or add motion with no explanatory purpose.

Use explicit exclusion/quiet zones behind text and data; mark decoration `aria-hidden`; ensure its maximum possible contrast is accounted for. Patterned/image grounds cannot simply bypass the contrast guarantee. Never fetch arbitrary author-provided URLs during a supposedly pure compile.

Screenshots and SVG are also **content**, not merely backgrounds. They need measured bounds/fit, provenance, asset readiness and semantic alternatives. Interactive SVG requires a strict safe subset, instance-scoped IDs/references and host-owned region-to-action bindings, not embedded scripts. Reject unsupported features rather than silently changing their meaning. Local vector geometry is an asset boundary, not author control over document coordinates. The detailed proposed [media contract](technical-composition.md#6-screenshots-and-svg-are-real-layout-participants) is unimplemented; removing an earlier decorative SVG study did not establish or forbid this content capability.

The lab now offers quiet/blueprint/field backgrounds and registered/plain frame treatments as optional document fields. It reuses Press's existing screen and content-clearing implementation; the original free-drawn flow study was removed after inspecting the references. Opaque content surfaces protect text in addition to clearing. The HTML prototype measures boxes; this does not certify its layout through the production solver. See [design-alignment.md](design-alignment.md) and [references.md](references.md).

## 6. Runtime: semantic state first, motion second

```text
validated document + committed state + action
          ↓
   pure state transition
          ↓
next committed state + semantic event
          ↓
presentation transition sampled at explicit progress/time
```

The same action is reachable by keyboard, pointer, and host commands. Stable authored target IDs are different from geometry node counters. Dense references also distinguish semantic identity from visual occurrence: the same actor/state may appear in multiple rounds or nodes. Legends, annotations, graph relations and SVG regions need shared semantic references, with occurrence context where needed. A title/detail selection controller alone does not prove those bindings. An artifact ID identifies authored content; an instance ID identifies one mounted copy. A content revision prevents old analytics from being confused with rewritten content.

Potential controller responsibilities: read state, dispatch an action, subscribe/unsubscribe, serialize/restore validated state, seek a presentation where supported, and dispose idempotently. This is a capability checklist, not a requirement to ship all these methods or a second runtime now. First try extending the existing interaction transition point with a small semantic callback and the necessary lifecycle fixes. Restoration is checked against document/revision; unknown targets cannot silently select something else. Restoration and serialization are **not implemented by the lab**.

The lab emits this family of envelopes on actual state change:

```json
{
  "eventVersion": 1,
  "schemaVersion": "press-lab/1",
  "artifactId": "checked-tool-call",
  "revision": 1,
  "instanceId": "article-figure-2",
  "sequence": 1,
  "type": "focus.select",
  "targetId": "observe",
  "source": "keyboard",
  "previous": { "selectedId": null },
  "next": { "selectedId": "observe" }
}
```

Do not emit semantic interaction events for mounting, a no-op, an invalid action, or export-frame seeking. Playback/host actions have distinct sources. If visibility or dwell signals are later useful, define them separately; a rendered frame is not an interaction and interaction is not understanding.

Press owns no analytics transport, cookies, user ID, analytics vendor, or consent UI. The host adds permitted contextual identity/time and routes events under its own consent policy. Default event payloads contain no author prose or free-text reader input. Observer failures must not corrupt the committed state or prevent other observers from receiving it. Reentrant dispatch must be queued or explicitly refused, never silently reorder events.

**State committed** and **animation settled** are distinct. Keep completion lifecycle separate from user-action analytics. Reduced motion jumps to the endpoint; a preference change during playback cancels active motion. Unmount/disposal cancels subscriptions, timers, observers, and RAFs and removes only the mounted instance's owned DOM.

## 7. Deterministic motion and future video

Start with emphasis, reveal, and stepping through a relationship. Do not begin by exposing every morph prototype.

A transition evaluator accepts explicit endpoints and progress/time. It cannot consult the DOM, the wall clock, random state, or an analytics collector. A browser driver supplies live progress; a future export driver supplies exact frame times. Stable chart identity and domains prevent a transition from changing what the data means.

The lab samples **emphasis only**. It is not a full frame/geometry evaluator. Legal endpoint geometry, intermediate collisions, data identity, transition interruption, and exact output-frame capture still need proof before motion is a production feature. No MP4/WebM export is claimed.

Preparation/readiness must include required fonts and images, not merely an appended canvas. The current font error handling and asynchronous image paint are not an adequate export-ready signal.

## 8. Version and package boundaries

Keep independent versions for document schema, recipe, preparation/renderer implementation, and event envelope. A package version alone does not explain the content stored in a published article. Include the effective profile/cabinet/assets in any render-cache key.

Possible future import boundaries, **not a package-splitting plan or a prerequisite**:

- `@mega/press/core`: document/schema, semantic validation, catalogue, preparation and accessible description; no browser globals at import time.
- `@mega/press/browser`: mounting, browser input, font/image asset readiness, lifecycle.
- `@mega/press/export`: explicit-time export adapters when they exist.

Keep these as ordinary internal functions unless environment isolation or real consumer needs justify entry points. These are candidates, **not exports added by this work**. Existing `parse/build/mount`, deep import paths, and consumer overlays remain unchanged. The lab is outside `src`, exports, and package `files`.

Do not replace pins with live links as part of the redesign. Mega-Dev and Mega-Experience advance separately from reviewed producer commits. See [rollout.md](rollout.md).

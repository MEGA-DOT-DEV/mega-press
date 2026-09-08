# Technical composition: the real requirement

**2026-09-07 · author-supplied reference study · proposed contract, not implemented capabilities.**

The author rejected the seven-example gallery as too simple to establish the framework's expressive range. That feedback changes the acceptance corpus. The gallery remains a useful demonstration of existing rendering and simple composition, but it is **not evidence that the proposed framework handles demanding technical content**.

The objective is not nine more templates, nor nine illustrations hidden inside opaque SVGs. It is a small reusable composition vocabulary that can express these structures while preserving their meaning, reading order, identities and interactions.

## 1. What was actually inspected

All nine supplied PNGs were directly viewed. Unlike the earlier Figma-dialog JPEGs, these contain usable artwork. Paths below are basenames under `/var/folders/_2/zg9lhmwx3c53w15w_vp606340000gn/T/`. They remain user-supplied reference images, not freshly generated Press results. No image was uploaded or published.

| Reference | Visible structure | Capability it demands |
| --- | --- | --- |
| `clipboard-2026-09-07-190128-40375041.png` · schema flexibility | Two unequal-height schema cards; sectioned field/type rows, key/reference markers, nullable/variant types, tags and paired conclusions | Structured node bodies, field identity, semantic emphasis and comparison without equal-height filler |
| `clipboard-2026-09-07-190132-39F080CA.png` · DAG scheduler | Branching task states with labelled conditions, waiting/blocked recovery, retry limit, then a separate numbered round loop | Conditional and return relations; multiple visual occurrences of a state; graph + structured procedure on one reading surface |
| `clipboard-2026-09-07-190136-C7CB414E.png` · execution trace | Summary counts; actor legend; rounds with sequence ranges, code-like actions, outcome columns and memory notes | Statistics + ordered trace + legend; nested rows; exact inline text; shared actor/state identity |
| `clipboard-2026-09-07-190139-1F87C7C9.png` · provider API architecture | Request code; router table; three mapping cards; provider endpoints; a reconverged normalized response | Compound graph nodes containing code and tables; fan-out/fan-in; field mappings; long content-driven composition |
| `clipboard-2026-09-07-190143-C0513AB1.png` · behavior-shaping components | Five labelled layers containing 19 unequal groups of explanatory cards | Recursive grouping; category identity; local density checks instead of a blanket eight-item ceiling |
| `clipboard-2026-09-07-190147-3457A817.png` · field of operation | Scope enclosure with resources and nested decisions, followed by an exact table and two comparison panels | Boundaries, groups, tables and comparisons composed as sections, not competing artifact kinds |
| `clipboard-2026-09-07-190151-3532532B.png` · situational awareness | Actor legend; compound decision flow; nested delegated work; workspace sidebar; labelled branch outcomes | Conditional topology, nested node content, legend binding, side attachments and content-driven height |
| `clipboard-2026-09-07-190158-1DBA373D.png` · transcription examples | Two waveform regions, labelled spans, verbatim input/output, multicolour inline annotations and a concluding note | Measured custom vector regions, annotated text, shared categories, input/output correspondence and legends |
| `clipboard-2026-09-07-190201-6C6D025B.png` · autonomous triggers | Repeated description → payload/code → result rows; the last row branches through a condition | Reusable heterogeneous row composition; code/icon content; a conditional subgraph inside the larger comparison |

These images establish visual/semantic requirements, **not the truth of their technical claims**. Provider mappings, model names, counts and explanations of transcription behaviour have not been independently verified. Preserve authored claims when reproducing a reference; do not silently strengthen them or manufacture measurements. A schematic waveform is not measured audio.

The author additionally requires actual screenshots, quantitative charts, database relationships, mixed statistics/timeline views, transformations, annotated walls of prose and architecture legends. Those needs are part of the corpus even where no supplied image demonstrates them completely.

### Current source check / media, text and interaction

A read-only audit was checked against the actual implementation. Existing exports must not be confused with a supported end-to-end authoring contract.

| Area | Reusable implementation | Limit relevant to this corpus |
| --- | --- | --- |
| Screenshots/images | `components/media.js:24` and `src/render.js:474`: ordinary DOM images with alt/caption, a declared ratio and fit | `image` defaults to `cover`; intrinsic-size/decode readiness and region binding are absent. Images are explicitly withheld from writer vocabulary in `src/kernel/vocabulary.ts:9`. Do not build another image renderer; safely expose/prepare this one. |
| Prose and code | Selectable solved prose lines in `src/render.js:492`; canvas syntax runs and line emphasis in `components/code.js:52–193` | No source-addressed inline annotation/legend contract. Code helpers expand tabs and remove outer blank lines before painting, so painted code is not an exact source representation or selectable semantic token interface. Preserve the original source separately and repair the relevant fidelity path. |
| Charts and chart legends | Numeric charts; `encodingLegend` derives marks from the same series (`components/morph.js:512`) | The encoding legend uses index-based keys; line-chart legends are canvas paint and the temporary Chart.js instance is destroyed (`components/chart.js:918–952`). This is not persistent cross-component category identity or linked legend interaction. |
| Custom vector content | Vendored icon path data painted through `Path2D` (`components/icon.js:41–79`) | No general SVG parsing/sanitization, intrinsic SVG preparation or semantic region adapter is established by that icon support. |
| Interaction and morphs | Finite states, scale checks, controls, hit rectangles, text FLIP and encoding morphs in `src/interact.js` | Not the supported static mount contract. `morphBetween` chooses the first encoding nodes without checking matching datasets (`:684`); the returned handle has no disposal method (`:949`). Explicit correspondence and owned teardown remain necessary. |
| Asset readiness | The existing font loader and DOM/image mounting seams | Production font errors can be swallowed and image decode is not part of readiness. The showcase's later font/paint refusal fixes are lab-local, not production repairs. |

These checks strengthen the reuse strategy, but weaken any claim that syntax colouring, an icon renderer or a chart-local legend already provides the requested annotation/SVG/semantic-legend system. Glyph coverage and multilingual wrapping must also be tested rather than inferred from a loaded font.

## 2. The important change: templates are conveniences, not boundaries

A writer should not have to choose between a chart, a graph and a code block when the explanation genuinely contains all three.

Use the existing recursive component-composition direction. A recipe can be a useful preset, but composing approved components must become an ordinary **author/model capability**, not require implementing and registering another trusted recipe for each arrangement.

The model may choose content, grouping, semantic relations, named layouts and supported presentations. Press owns geometry, typography, palette allocation, routing, quiet zones, resource budgets and semantic validation. An imported SVG may contain local vector coordinates; that is not permission for the author to position the surrounding document by pixels.

A useful minimum has these responsibilities, **not necessarily these API names or new modules**:

| Responsibility | What must be expressible |
| --- | --- |
| **Content** | Exact prose and inline runs; literal code; typed field rows; tags/icons; tables; metrics/charts; image or vector assets |
| **Composition** | Stack, row, grid, split/attachment, labelled section and nested group; content inside a node is itself a composition |
| **Relations** | Stable endpoints, named field/region ports, direction, labels, conditions, cardinality where relevant, branching, convergence and return paths |
| **Shared meaning** | Stable entities/occurrences, categories, relation kinds, annotations, data identities and transformations |
| **Presentation** | Named arrangements and frame/read profiles; optional title/chrome; controlled category encodings and legend placement |
| **Interaction** | Select, inspect, emphasize a category/path, step through a trace, or switch an explicit view; state and semantic events remain independent of paint |

Do not add six registries. Extend/reconcile existing definitions, the component compiler, solved references and the current transition seam. A semantic schema-card recipe may earn a place; a new drawing primitive for every topic does not.

### Example: architecture is a composition, not a special screenshot

```text
Artifact
├─ optional heading
├─ summary metrics
├─ legend → shared actor/relation definitions
└─ split
   ├─ graph
   │  ├─ request node → code
   │  ├─ router node → field table
   │  ├─ provider group → three mapping nodes
   │  └─ response node → code + explanatory note
   │     connections → named node/field ports
   └─ attachment → resource groups / reference tables
```

This is explanatory pseudostructure, **not a published JSON schema**. The aim is to evolve the existing `body`/component path, not invent a parallel document language in a design note.

## 3. Nodes must hold real content; relations must carry meaning

A title/detail rectangle is insufficient for an entity schema or provider mapping. A graph node must be able to contain approved content such as field rows, code, metrics or a nested group. Its dimensions come from measuring that content at the output profile's type scale, before routing its connections.

Named ports belong to semantic locations: the `conversation_id` field, an input/output region, a group's boundary. The author names the target, not its final `x/y`. Optional relations can state `one-to-many`, `reads`, `writes`, `normalizes`, a condition or a payload; Press must not infer these from proximity or colour.

Required constraints:

- Unknown/dangling node, group, field or port IDs refuse with source paths.
- Labels, cardinalities, conditions and direction survive layout/profile changes.
- Routes avoid unrelated node bodies and keep edge labels readable.
- Return paths and cycles are not silently flattened into a DAG.
- A group enclosure is semantic when it represents ownership/scope; merely decorative framing must not manufacture that relation.
- A state can occur twice visually without becoming two different domain states. Keep **semantic identity** distinct from a **visual occurrence ID**. This matters for the two `waiting` occurrences in the scheduler and repeated actors in the trace.
- A legend/category selection can address all matching occurrences. Clicking one occurrence can retain that occurrence in the event context without replacing the semantic identity with a geometry counter.

Keep relational layout in a bounded graph domain. The need for compound nodes does not by itself justify arbitrary CSS constraints or spatial connections between every element in the whole document. If real cases repeatedly require those cross-domain constraints, reassess option C honestly rather than rebuilding a scene graph invisibly inside option B.

## 4. Legends and annotations share definitions with the visual

A legend must not be a second independently authored list of swatches that can disagree with the graph.

Define category/relation IDs once, with human-readable labels. Text spans, graph nodes, connections, trace rows, chart series and registered SVG regions refer to those definitions. Press assigns approved, contrast-checked encodings; the model does not choose arbitrary colours. Existing chart/category machinery is a reuse candidate, not evidence that cross-component legend binding already works.

Keep distinct encodings distinct: actor identity, task status, and selected state are different facts. Do not use one accent flag to stand for all three. Labels, line styles, glyphs or structure must supplement colour. A selected legend entry becomes a named semantic action, not an SVG script.

For annotated prose/code:

- Preserve the exact source, including spaces, punctuation and Unicode. Styling must not reconstruct or normalize the text.
- Give marked runs/ranges stable identity and bind marks to legend categories or related targets.
- Decide one exact anchoring convention before implementation. Stable authored runs are a small starting point; an offset-based model must define its indexing and validate boundaries, overlapping marks and surrogate/grapheme safety. Never guess which occurrence of a repeated phrase was intended.
- Wrapping changes geometry, not the marked text. Preparation must retain the mapping from source runs/ranges to wrapped line fragments; do not rediscover anchors by searching the displayed phrase afterward. A legend selection can emphasize all matching spans without deleting the unselected text.
- Provide a semantic reading representation, including annotation meaning, for keyboard and assistive technology. A wall of coloured text alone is not the contract.

## 5. Mixed data views and transformations

**Statistics + timeline:** compose both. When counts are derived, they must use a declared scope and source; a three-agent count must not silently count an observer role from a four-entry legend as a fourth agent. The host can prepare derived values; this does not require an arbitrary query/expression engine inside Press.

Distinguish an **ordered trace** from a **quantitative time axis**. Equal-spaced events do not communicate elapsed time. Duration, timestamps, units, domains and aggregation rules must be explicit where the graphic encodes them. An interval, chart series or timeline must retain its data and scale under selection/view changes unless the changed domain is explicit to the reader.

**Transformation** has two separate meanings:

1. Explain input → operation → output, including one-to-many/many-to-one mappings and losses. Existing before/after arrangements can help, but a transformation also needs explicit correspondence or labelled relations.
2. Animate between presentations. Stable correspondence and compatible units/domains are prerequisites; otherwise use an honest discrete switch/crossfade with explanation instead of implying a meaningful geometric morph.

Selecting a mapped field can emphasize its source, destinations and explanation. It does not run the code, issue the HTTP request, schedule the cron job or execute any other operation shown in the diagram. Motion remains explicitly sampled, interruptible and reduced-motion safe; deterministic video output is still unimplemented.

## 6. Screenshots and SVG are real layout participants

A screenshot must remain usable as evidence: preserve its appearance, fit it predictably, and crop only explicitly. Dithering is an optional presentation, not a universal requirement that destroys UI labels. A caption/annotation does not justify silently clipping essential content.

An SVG extension needs a **measured and constrained asset boundary**, not raw `innerHTML` or a separate interactive application:

- Positive finite intrinsic dimensions, or a `viewBox` with finite origin and positive finite width/height; a defined fit policy and an explicit distinction between asset-local geometry and document layout.
- Declared accessible text/description and, for interactive vectors, stable named regions. Transform regions/ports into the solved rectangle using the viewBox origin, `preserveAspectRatio`/fit, internal transforms and visible stroke bounds. Resolve this during preparation, not repeatedly inside pointer handlers; do not discover targets through arbitrary document-wide selectors.
- A strict supported SVG subset. Reject scripts, event-handler attributes, `foreignObject`, external loads/imports, unsafe URL schemes, DTD/entity expansion and unowned animation. Audit `href`, `xlink:href`, CSS/paint/filter references and nested resources, not only `<script>`.
- Bounded complexity: dimensions, depth, path/element/filter costs and decoded resources. A locally supplied asset can still exhaust preparation/rendering resources.
- DOM IDs scoped to the mounted instance **and each concurrently mounted occurrence/state layer**. Rewrite retained local href/xlink, CSS/definition URLs, clip/mask/filter/marker/gradient and ARIA references; reject unresolved references and keep retained styling scoped. Shared semantic IDs must not become colliding DOM IDs during a transition or across mounts. Shadow DOM alone is not sanitization.
- Rejection or explicit author-approved conversion when unsupported features affect meaning; silently stripping them is not source-preserving validation.
- Asset preparation/readiness before claiming measured/ready/exportable output. Resolving arbitrary SVG geometry identically in browser and headless preparation is an unproved engineering question, not a current promise.
- Host-owned action bindings map region activation to the same semantic transition/event path as native controls. No SVG-authored JavaScript or network transport. Keyboard equivalents, visible focus, reading alternatives and teardown are required.

Generated vector marks can inherit the cabinet and keep labels as engine text. Supplied screenshots/reference artwork should remain explicit media, not be invisibly recoloured to imitate native diagram content. Either path must state its accessibility and profile limitations.

Custom SVG earns its place for a waveform or unfamiliar visual mark. It must **not** become a loophole that draws the entire database/graph/text/legend as an opaque image and calls the framework expressive.

## 7. Frame and density policy must stop hiding the content problem

Several references are long structured documents, not 4:5 posters. Three fixed aspect choices are not enough for this requirement.

- **Reading output:** bounded width with content-driven height where the composition supports it; preserve sections, annotation anchors, legend meaning and order.
- **Dense graph output:** an explicit pan/zoom/expand representation plus an equivalent readable structure can be preferable to shrinking labels or changing topology. Do not promise automatic phone reflow for every graph.
- **Fixed output:** preserve the required aspect. Refuse an unreadable composition, or propose author-approved sectioning/pagination with explicit continuation semantics; never truncate to fit.
- **Density:** correctness/resource caps stay hard. Sparse layout and local reading density are editorial diagnostics. A five-section, nineteen-card explanation is not inherently invalid because an older plate budget allowed eight units.
- **Chrome:** title, kicker, lead, footer and legend placement are independent concerns. Hiding a title does not delete its meaning; the surrounding document/accessible heading must supply it.

A successful fixed-frame solve is not evidence for a content-height solver. The gallery uses `evaluateSpec` for exact artboards; the first reading lab is still an HTML experiment. Neither proves these dense responsive layouts.

## 8. Required proving examples, before another template expansion

Prioritize three difficult, reusable proofs, then cover the remaining corpus explicitly. These are **next experiments**, not completed work or a cap on scope.

| Proof | Must establish | Failure that matters |
| --- | --- | --- |
| **Schema/architecture graph** | Compound schema/code/table nodes, field ports, labelled relations, return path or conditional branch, shared legend, optional sidebar | Flattened field identity, lost cardinality/condition, pasted full-diagram SVG, or a new bespoke renderer for the example |
| **Execution trace with statistics** | Tall grouped rounds, inline code/state annotations, actor legend, summary values with explicit scope, native stepping/inspection | A fake time scale, mismatched counts, illegible labels, truncation, or one new recipe for every row shape |
| **Annotated transformation with media** | Exact multilingual text, linked legend, measured waveform SVG regions, real screenshot attachment, input/output correspondence and keyboard-equivalent region selection | Changed source text, asset script execution, drifting annotations, cropped evidence, missing accessible meaning or cross-mount ID leakage |

Each proof needs two isolated mounts, no-op/event checks, exact source comparison, asset/geometry diagnostics and real browser inspection. Test a refusal as well as a successful composition. The first graph proof must include a case the simple fan-in gallery cannot represent faithfully.

Then apply the same vocabulary to all nine references and the additional screenshot/chart/temporal requirements. Record every exception, unsupported profile and new primitive. The corpus must be author-reviewed; do not reduce a reference until it fits and then report success.

## Decision

Rework the **authoring/composition contract**, not automatically the entire renderer. Reuse existing components, composition functions, geometry, category/chart logic and transition machinery where their actual contracts fit. The stronger version of option B is now a hypothesis about **composable technical documents**, not merely a catalogue of semantic presets. If its implementation requires a hidden general scene language, revisit C rather than defending B by renaming the complexity.

The existing fidelity/preparation bugs still need their own producer repairs. This study makes no production source change, introduces no public SVG/annotation/compound-graph API and migrates neither consumer. Author review under F009 remains open, now with a materially harder requirement.

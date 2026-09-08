# Press framework direction

**Latest implementation:** [Press Studio](studio.md) resumes interactive work at
the author's request, with canonical project skins, a portable lesson controller
and MEGA background treatments. The research checkpoint below predates that work.

**Research / 2026-09-07 / author review open.** Keep the shared engine; make its promises more reliable and its visual vocabulary easier to extend. No new public API or consumer migration is approved by this document.

The [vision](../vision.md) records the author's intent. This folder records technical proposals and evidence, not additional human requirements.

## Start here

```sh
pnpm framework:test
pnpm framework:lab       # http://127.0.0.1:4281
```

The [working lab](../../lab/framework/README.md) puts a responsive HTML reading study beside the **real existing Press renderer**. Change the subject, width, ground, selected step, and transition progress. Inspect the preserved document and local semantic events. Technical and nontechnical examples use the same sequence recipe.

The lab is deliberately outside the production package. It is not a second renderer for either consumer, not a general composition engine, and not a video exporter.

**Author feedback changes the next proof:** the later [seven-frame gallery](../../lab/framework/showcase.html) demonstrates simple existing compositions, but the author correctly found it insufficient for technical content. All nine new reference PNGs were inspected. [Technical composition](technical-composition.md) records their decomposition and the stronger requirement: compound graphs, linked legends/annotations, mixed data/trace views, media/SVG and content-driven height. These capabilities are not implemented by that gallery.

## Three approaches

| | A / Consolidate fixed kinds | B / Semantic recipes and bounded composition | C / General scene/constraint language |
| --- | --- | --- | --- |
| Main gain | One trustworthy definition per existing template | Content and approved presentations can evolve separately | Broad expressive range for novel spatial relationships |
| Extension cost | Low within a kind; each new arrangement adds implementation | Moderate if shared structures actually remain reusable | Large foundation and validation cost before authoring becomes easier |
| Meaning | Explicit slots, but ideas can be forced into the wrong form | Semantic contracts can protect wording, values, and relationships | Geometry alone provides no semantic guarantee |
| Reading/frame outputs | Repeated per-kind variants | Named meaning-preserving presentations per recipe | Flexible constraints; harder reading-order and solution guarantees |
| Motion | Small prescribed effects | Stable semantic identity plus explicit state/progress | Broad transitions; much harder identity and intermediate-state proof |
| Author/agent experience | Simple discovery; wrong-kind dead ends | Intent-oriented discovery and actionable refusals | Larger search space encourages fragile constraint/coordinate reasoning |
| Migration | Lowest | Incremental, if lowering and versioning stay explicit | Highest; authoring and layout foundations change together |

**Working hypothesis: B, with A as necessary foundation work.** Preserve the existing solver and cabinet where they fit. Do not turn routine authoring into a drawing application. The author's explicit simplicity rule applies: the best part is no part. A descriptor, adapter, controller, or package split must earn its existence through a demonstrated need; these are not all mandatory new layers. The lab demonstrates only a small subset of B; A's control is today's renderer, and C remains a paper alternative.

### Reasons B might be wrong

- Recipes may just rename kinds, while composition creates more combinations to maintain.
- A universal semantic vocabulary could force narrative, ambiguity, or atmosphere into technical diagrams.
- Layout/runtime adapters might reconstruct a hidden general scene graph to maintain identity, eliminating B's claimed simplicity.
- If authors overwhelmingly reuse familiar forms, A may deliver the benefit at lower cost.
- If real artifacts repeatedly require cross-composition constraints or topology-changing interaction, C deserves reconsideration.

Use a broader real-content corpus and a second genuinely different recipe before choosing a production abstraction. Three short sequence fixtures are not enough evidence. See the [next comparison protocol](experiments.md#next-comparison--challenge-the-abstraction).

## Contract direction

1. **Preserve meaning.** Valid source strings, code, values, units, and relationships survive unchanged. Suggestions require author acceptance; the compiler never fills a gap with invented prose.
2. **Name the guarantees.** Decoded document, semantically valid document, geometrically prepared artifact, mounted view, and settled animation are different states—not one ambiguous `ok`.
3. **Define once.** One authority per registered component/recipe drives discovery, schemas, semantic checks, supported presentations, examples, and capability reporting. Recipes are conveniences, not mandatory new implementations for every arrangement.
4. **Extend in levels.** Fill a known recipe → compose approved structures as a normal author/model capability → review a genuinely new primitive/recipe. Document layout stays engine-owned; SVG-local geometry has a separate measured, safe asset boundary.
5. **Deliver readable content.** Reading, fixed-frame, and compact outputs make distinct promises. The prototype's proposed 16px body floor is an experiment, not a new package-wide rule.
6. **Model actions before effects.** State and stable semantic targets belong to Press; identity, consent, storage, and analytics vendors belong to hosts. Motion samples explicit progress independently of semantic event delivery.
7. **Keep one producer.** Mega-Dev and Mega-Experience retain separately pinned vendors and reviewed adoption paths. Neither imports the lab.

## Reading map

- [Technical composition / stronger requirement](technical-composition.md): all nine new author references, compound content/relations, legends/annotations, screenshots/SVG, mixed temporal/data views and the next hard proofs.
- [Design alignment and simplification](design-alignment.md): inspected Mega-Dev/Mega-Content references, reusable existing pieces, and the author/model freedom boundary.
- [Architecture candidate](architecture.md): content, composition, preparation, profiles, assets, events, lifecycle, and possible package boundaries.
- [Experiments](experiments.md): what the lab tests, what would refute the approach, and production promotion gates.
- [Verification](verification.md): commands, browser observations, and limits of those checks.
- [References](references.md): what was actually inspected; the supplied JPEGs show export-disabled dialogs, not artwork.
- [Rollout](rollout.md): small producer stages followed by deliberate, independent consumer upgrades.
- [F009 ticket](../features/active/F009-framework-foundation/ticket.md): research scope and pending author review.

## Next decision, not the next rewrite

The first reference follow-up supports reuse; the new [technical corpus](technical-composition.md) challenges expressive sufficiency. Prove compound schema/architecture nodes with field connections and a shared legend, a tall statistics-plus-trace view, and annotated text linked to measured media/SVG. Do not reduce the references to fit the current small kinds or draw them wholesale as opaque SVG. Keep fidelity repairs separate, record every unsupported profile/exception, and reconsider the architecture if reusable composition becomes a hidden general scene language. No public API promotion or consumer sync follows merely from the simple gallery working.

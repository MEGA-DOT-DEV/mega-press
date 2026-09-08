# F009-framework-foundation · Design the next Press contract

[2026-09-07] [🟠] [STATUS] [COORDINATOR] ACTIVE · F009-framework-foundation

## Outcome

The author supplies an article and receives consistent, source-faithful static frames from the canonical Press engine, with editable JSON, HTML/PNG exports and visible review. Interaction and animation are on hold. The earlier research established direction; current work integrates the approved visual language without replacing the engine or migrating consumers.

## Scope

- Capture the human-provided vision separately from proposed technical policy.
- Compare consolidated templates, bounded semantic recipes, and a general scene model.
- Document authoring/preparation/runtime/event/profile boundaries and staged consumer adoption.
- Build an isolated, runnable one-recipe lab with a real legacy-renderer control, reading-width and ground experiments, and local semantic events.
- Record fidelity diagnostics and test the experimental contract.
- Ground the direction in Mega-Dev's design lab and Mega-Content's graph/frame/background experiments; follow the author's simplicity rule and reuse existing machinery.
- Incorporate the nine newly supplied technical PNGs and the author's rejection of the simple gallery as sufficient evidence. Generalize compound content, semantic relations, shared legends/annotations, media/SVG and long mixed-content layouts without multiplying templates.

## Out of scope

- Replacing unrelated dirty accessBoundary work, consumer vendor updates, publication or deployment. The author subsequently authorized changes within the existing producer engine; the initial research-only `src` restriction no longer describes current scope.
- Interactive/animated runtime work while the static article workflow is the priority.
- Figma export/access bypass; unseen designs must not be represented as reviewed references.
- Full scene DSL, general layout engine, video export, persistent analytics, or deployed changes.

## Acceptance

- Alternatives and the reason for a provisional choice are reviewable in `spec/framework`.
- Lab is runnable locally and clearly marked experimental; it is not exported by `@mega/press`.
- At least one technical, one nontechnical, and one verbatim-content fixture use the same strict recipe.
- Runtime/controller contract has executable tests for content preservation, instance identity, event order, no-ops, reduced motion, and disposal.
- Existing producer tests/typecheck/build still pass; browser checks cover a narrow viewport and keyboard/pointer actions.
- Source reference limitations and unimplemented guarantees are explicit.
- The nine technical references and additional requested forms have a capability/gap map and meaningful hard proving cases; the simple gallery is not counted as coverage of them.
- The author approved the corrected canonical database frame as the visual baseline, not the complete framework. Other arrangements must be inspected as actual outputs.
- An article can be mapped to proposed figures, authored with existing composition blocks, checked and exported without a new renderer. Preserve its source facts and report missing capabilities early.
- First real-article delivery remains pending the author's draft/path; no overall completion or consumer-readiness claim.

## Current article-production checkpoint

The canonical `press-composition/1` route now has compound schema bodies, field ports,
measured relation labels, shared MEGA colours, and content-height static figures.
The reviewed source lives at `example/compositions/database.json`; authoring
instructions are in `ARTICLE_GUIDE.md`. `AGENTS.md` now directs new article work
to this route rather than the legacy gallery. Earlier interaction receipts do
not establish an interactive canonical renderer. No consumer was updated.

Latest checks: 239 producer tests and 43 lab tests pass; typecheck/build and
`git diff --check` pass. Article-route regressions cover component discovery,
unchanged JSON, HTML transport of literal code, styling refusal, and full-height
PNG export. The database export was inspected at 1600×3048. The five current
composition fixtures pass geometry checks; this does not give the other four
visual approval or constitute a real-article delivery.

## Notes

F008 is already allocated on the locally cached upstream branch to deterministic consumer vendoring; F009 does not reuse its number. No branch reconciliation, commit, push, or consumer sync is part of this research.

## Research readout / 2026-09-07

- Alternatives and candidate contracts recorded; the reference follow-up narrows the next production step to existing components/compositions and a semantic callback at the existing transition seam.
- Working lab includes one strict recipe, named document-level background/frame choices, reused Bayer/clearing code, and local semantic events. No new shader or consumer dependency.
- 172 producer tests and 17 lab tests pass; typecheck/build pass. Browser checks cover 54 fixture/background/treatment/viewport combinations and pointer/keyboard/reduced-motion/revision behaviour.
- Existing code/unit/preparation fidelity gaps remain reproduced and unfixed by this research.
- Author review is still open; this is not marked proven or promoted to production.

## Author feedback / technical composition

Seven further lab examples reuse four earlier frames and introduce three simple combinations through the existing exact-frame compiler/solver/renderer. The author found them too simple for the actual technical-content requirement. All nine supplied PNGs were directly inspected; [technical composition](../../../framework/technical-composition.md) now defines the harder corpus and revised design direction. Templates must be conveniences; ordinary author/model composition must handle nested structured content and shared semantic references. New SVG, annotations, compound-node ports and dense reading geometry are proposed capabilities, not implemented by the gallery.

Entry point: [framework direction](../../../framework/README.md). Receipts and limits: [verification](../../../framework/verification.md).

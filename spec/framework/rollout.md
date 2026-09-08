# Adoption without splitting the engine

Status: proposed sequence. The framework lab is not approved production code. Consumer upgrades, commits, pushes, and deployments are outside this research change.

## Stage 0 / Make the choice testable

Deliver the vision, alternatives, contract candidate, isolated lab, honest reference register, and repeatable diagnostics. Compare a real fixed-artboard baseline with a reading-profile experiment. Review the result with the author before investing in a general engine rewrite.

**Exit evidence:** author can inspect the lab; proposed and shipped capabilities are distinguished; meaningful trade-offs and failure criteria are explicit. Actual visual references remain a separate review input, not fabricated evidence.

## Stage 1 / Close fidelity and preparation gaps

Small producer changes, each with a regression case:

- Preserve verbatim code, units, wording, IDs, and relationships; no generic fill or silent `.slice()` in authoring adapters.
- Reconcile bars/segments and other catalogue/schema field mismatches. Add positive and negative round-trip tests for every advertised example.
- Give unsupported outline forms named diagnostics.
- Expose the difference between document validation and fully prepared geometry; publication uses the latter in CLI and consumers.
- Make essential chart labels/data available visually and semantically; validate the actual effective theme/assets.

Do not fix everything by weakening existing assertions. Preserve refusals for missing/contradictory meaning. Change editorial findings into a separately selected policy where appropriate.

**Exit evidence:** fidelity fixtures pass byte/value comparisons; CLI and publication preparation agree for the same document/profile; every exposed kind has one working example and meaningful refusal cases.

## Stage 2 / Consolidate definitions incrementally

Reconcile `sequence/railSteps` and one genuinely different kind (a chart or boundary) around a single existing definition authority while keeping current public inputs through explicit adapters. Exercise the existing composition/attachment functions before introducing new ones; do not build a descriptor system beside the old registries. Do not rename stored content automatically. Preserve old documents and route by schema/recipe version.

**Exit evidence:** discovery, runtime shape checks, type/schema generation, and examples agree; both kinds pass existing golden geometry; extension checklist no longer requires manual edits to unrelated registries. A second recipe must use the same bounded mechanism without an explosion of per-kind exceptions.

## Stage 3 / Prove output profiles and host lifecycle

Promote a named reading profile only after its actual layout/render path is validated. Keep exact-frame profiles distinct from auto-accommodating article layouts. Specify text floors in delivered CSS pixels and test at 360px, 390px, article width, and video/frame dimensions. Maintain accessible reading order and data alternatives, not only pixel contrast.

Replace global theme/renderer state with appropriately scoped immutable context where necessary. Mount two differently configured instances together; dispose/remount in the same host; check fonts and image failures, iframes, reduced motion, and cancellation during readiness.

**Exit evidence:** no hidden/clipped content, preserved semantics, correct focus/read order, assets are settled or explicitly refused, no observer/DOM/RAF leaks, deterministic preparation per profile/cabinet/assets.

## Stage 4 / One interactive artifact in each host

Ship a small finite-state interaction with semantic target IDs and a local event callback. Start at the existing interaction transition seam; introduce a separate controller only if its lifecycle/identity contract cannot be made adequate with a smaller change. Start with focus/step/reveal. Host code owns analytics and consent. Do not enable background collection as part of installation.

**Exit evidence:** pointer/keyboard/host action parity, no events on no-op/mount, distinct instance IDs, validated state restoration, deterministic event order, observer failure isolation, idempotent disposal, and stable content when motion is disabled. A malicious/free-text payload cannot become executable code or an unbounded telemetry field.

## Stage 5 / Explicit-time motion and export

Use the proven state model with a deterministic transition evaluator. Add exact aspect/duration, seeking, asset readiness, frame sampling, and an export adapter. Do not treat the lab's emphasis sampler as a complete video pipeline.

**Exit evidence:** repeatable frame output at the same input/time, stable chart domains/identity, collision/legibility checks across legal motion, cancellation and reduced-motion policies, no event uploads during export.

## Consumer responsibilities

| Consumer | Current integration evidence | Required migration seam |
| --- | --- | --- |
| Mega-Dev | `packages/press` workspace vendor; browser `@mega/press/mount`; API `@mega/press/validate` overlay | Keep server-safe imports and pinned runtime files. Upgrade publication checks deliberately; add an instance-owned controller in the React drop mount, not a second renderer. |
| Mega-Experience | `packages/press` workspace vendor; author validation/API catalogue; reader loads Press at `/lab/*` | Preserve stored plate schemas and the in-repo static serving boundary. Upgrade authoring and reader contracts together; no sibling checkout requirement. |

Inspect each consumer's **current** manifest, `UPSTREAM.json`/vendoring record, import profile, and build scripts before an upgrade. Do not assume the two use the same SHA or that a local checkout matches the latest remote branch. Their different packaging overlays do not justify different semantic engines.

## Reviewed release sequence

1. Build/test producer changes, including old content and the new profile/interaction matrix.
2. Commit and push the reviewed producer version only when authorized. Record an exact upstream SHA.
3. In one consumer at a time, use its actual deterministic vendor-sync/check mechanism. If the checkout predates it, reconcile that separately rather than inventing a copy command in this research.
4. Review the imported files and preserved overlay. Run that host's server build, browser bundle, static-serving checks, and realistic content smoke tests.
5. Commit the consumer update separately, retain the previous pin, and observe a narrow rollout before advancing the other consumer.
6. Roll back the consumer pin without making newly stored documents unreadable. Additive versioned readers precede writing a new document version; destructive migrations require a separate decision.

Neither consumer imports `lab/framework`. Neither fetches private Press code during install. Published content is not automatically re-rendered against an unreviewed local edit.

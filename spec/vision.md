# Vision

> Human-owned durable intent and conversation handoff. Updated at the author's request. Keep this file at or below 1000 lines; move detailed research, implementation receipts and historical experiments to feature notes. Distinguish agreed direction, current implementation and unproven assumptions. Do not turn a proposal into a human requirement.

## 1. What Mega-Press is for

Mega-Press is a shared visual framework for an author creating articles, videos and related content for technical and nontechnical audiences. It turns meaningful content and relationships into consistent, readable artifacts—not just attractive boxes.

The immediate use is **figures within articles**: an author supplies an article, and the assistant identifies appropriate parts to explain visually. Those figures may be reviewed independently, exported as assets, or eventually embedded in Mega-Dev and Mega-Experience. Press is not the article editor, an automatic summarization service, or a replacement for the host application's page layout.

Both human and model authoring are first-class. The framework must give authors useful compositional freedom while owning the visual and geometric constraints. Consistency must not force unfamiliar subjects into unsuitable forms.

**The best part is no part.** Reuse working components, measurement, solving, routing and rendering. A new abstraction, adapter, registry or runtime layer must earn its existence through a demonstrated need.

## 2. Agreed priority and scope

- **Static article production comes first. Interaction and animation are on hold.** Do not make the article workflow wait for them, and do not spend the next milestone implementing them by default.
- Show real output early. A short frame plan and a rendered first frame are more useful than a long implementation batch in an unreviewed visual direction.
- New article figures use the **current canonical framework**, with the reviewed MEGA design. Reopening the old gallery or showing a separate DOM prototype is not evidence that this route works.
- Canonical producer changes were subsequently authorized and implemented. The initial research-only/no-`src` restriction is historical, not the current scope.
- Producer integration does not authorize consumer migration, publication, deployment or unrelated changes.
- No actual article draft/path has yet been supplied in this work. This blocks the first real-article delivery, not the creation and review of representative demos.

The long-term direction still includes animation, meaningful reader interaction and host-facing semantic events. Deferral is a priority decision, not a rejection of those goals.

## 3. Templates are conveniences, not the framework's boundary

The practical direction is **bounded composition through the existing engine**, rather than either an ever-growing list of mandatory templates or a general-purpose scene-engine rewrite.

An author/model should normally:

1. Reuse a suitable existing composition when helpful.
2. Combine approved components into a new component tree when the subject needs a different arrangement.
3. Propose a genuinely new primitive only when existing parts cannot express the required meaning faithfully.

Do not implement a new renderer or mandatory recipe for each arrangement. Discovery and accepted component parameters should have one authority, not competing catalogues that describe different capabilities.

Models choose content, grouping, approved roles, shared categories and explicit relationships. The engine owns typography, palette, spacing steps, layout, measuring and routing. Authored documents do **not** contain arbitrary document coordinates, fonts, raw colours or ad hoc styles.

The required breadth goes beyond simple standalone diagrams:

- Procedures, ordered events, timelines and parallel work on a shared clock.
- Architecture, conditional paths, branching, convergence and logic/data flows.
- Unequal compound schema cards, typed fields, primary/foreign keys, nullability and field-level relationships.
- Code/text comparisons, payloads, transformations and explanation alongside literal source.
- Metrics, tables, bars, charts and combinations of quantitative and explanatory content.
- Screenshots and media within a composition—not a whole diagram pasted as an opaque image to hide a missing layout capability.
- Dense mixed-content explanations, highlighted prose and explanatory legends.

Rich SVG and linked media/annotation interaction remain desired capabilities with unresolved implementation boundaries. Their presence in a reference or prototype is not proof of general canonical support.

## 4. Article authoring and in-app use

The operational guide is [ARTICLE_GUIDE.md](../ARTICLE_GUIDE.md). The intended loop is:

1. **Read the supplied article without modifying it unless asked.** Identify claims, structures, quantities and relationships that genuinely benefit from a figure. Not every section needs one.
2. **Write a short frame plan.** Record source headings/lines, the point of each figure, a proposed composition and missing information. Use `<article-name>.frames/frames.md` or the author's chosen folder.
3. **Render one real frame early.** Use the approved design and get feedback before generating a large set.
4. **Compose the remaining frames through the same engine.** A new article should primarily require new content and component trees, not subject-specific rendering code.
5. **Check and inspect every complete export.** Geometry, source fidelity, fonts, images, labels, axes, connectors and export bounds all matter.
6. **Deliver editable JSON, preview HTML, PNG, captions/readable alternatives and source/placement notes.** Do not silently upload, publish, insert outputs into the article or rewrite its prose.

This is an **assistant-guided authoring workflow**, not a newly implemented automatic article parser or summarization API. The assistant must make editorial choices explicit instead of claiming the framework discovered the article's meaning on its own.

For in-app use, keep the boundaries clear:

- Press owns the figure's content contract, preparation and visual language; the host owns article layout, surrounding navigation, placement and application concerns.
- A standalone figure and an embedded figure can use the same source. If the host already presents the title, hiding duplicate visible chrome must not delete that title from the authored document.
- Local article assets can be produced without changing either application's pinned runtime.
- A static figure must be meaningful without controls. Do not invite readers to select fields or legends when no such interaction exists.
- Scaling is not reflow. A constrained artboard with local horizontal panning is not a general responsive composition solver.

## 5. Source fidelity is not negotiable

Layout must serve the source, not quietly change it to fit.

- Preserve authored wording, quotations, code, identifiers, IDs, values, units, relationships and topology.
- Do not invent missing steps, unsupported conclusions, filler prose, statistics, provider contracts or source citations.
- Do not silently truncate, substitute, normalize or “repair” content. If something cannot be represented faithfully, refuse clearly or ask for an explicit authoring decision.
- Do not remove content to make a fixed frame pass. Change the composition or choose another frame deliberately; split only at meaningful source boundaries.
- Keep code and identifiers readable. Tracking or wrapping must not turn a field name into disconnected fragments or obscure logical source boundaries.
- Relation direction and attachment points carry meaning. A foreign-key relationship belongs to its field, not just to an anonymous card. Labels must remain readable and clear of unrelated routes.
- Shared categories bind meaning consistently across fields, edges, prose, legends and data. Keep textual labels and structural markers so colour is never the only encoding.
- Stable semantic identity differs from a particular visual occurrence. Do not rediscover annotated occurrences by searching for matching prose.

Examples may be invented **only as clearly labelled illustrations**, not presented as facts from an article or verified documentation. The current cache policy, editorial dates, payload shapes and repair prices are illustrative.

Quantitative honesty is equally important:

- Values need explicit units, scope, domains and aggregation where relevant.
- Ordered events, sequence ranges and round numbers are not timestamps or elapsed time.
- A cumulative item count is not execution speed or production telemetry.
- A temporal chart may encode durations only when it has actual declared time data and a shared temporal scale. In the current time-flow demo, the dates are illustrative but their spacing and durations are proportional.
- Concurrent work durations cannot simply be added to infer elapsed project time.
- Schematic signals and example statistics must not be represented as measurements.

## 6. MEGA-Dev theming and the approved visual baseline

**Use Mega-Dev's actual design sources, not an independently invented “MEGA-like” palette.** The inspected sibling-repository references are:

- `mega-dev/packages/ui/src/base.css`
- `mega-dev/packages/ui/src/theme.css`
- `mega-dev/apps/web/src/drops/shiki.ts`

Mega-Dev's labs inform its visual vocabulary. `mega-content/lab` supplies useful earlier graph, frame, slide and background compositions to learn from—not a renderer to duplicate. Supplied technical PNGs are usable visual references. Inaccessible Figma resources are not a prerequisite and must not be described as inspected artwork.

The first integrated database render was rejected for invented pastel colours, split identifiers and connectors crossing labels. The corrected canonical database was accepted by the author: **“Ok, and this is much better.”** That correction establishes the visual baseline.

The author subsequently supplied `megapresshandoff` and requested a styling refinement. Its rules, tokens and rendered states now inform the current preset; this is an authorized refinement, not a claim of renewed visual approval. See [the style handoff](framework/style-handoff.md) for the implementation and deliberate differences from the older kind catalogue.

The current canonical preset lives in [`src/theme.js`](../src/theme.js), with one shared cabinet in [`src/tokens.js`](../src/tokens.js). Its allocation includes:

| Role | Current allocation |
| --- | --- |
| Figure ground | Black `#000000` |
| Code/panel surfaces | `#050505` and `#0b0b0b`; square borders |
| Primary text | `#fafafa` |
| Muted text | `#a1a1a1` |
| Red accent | `#ff0000` |
| Readable blue text/relations | `#7a7aff` |
| Neutral category | `#a1a1a1` |
| Code syntax | Existing MEGA allocation: red keywords, blue strings/numbers, muted comments |

These are **engine-owned theme tokens**, not permission to paste raw colours into artifact JSON. The supplied handoff extends named categories to red, cyan, yellow, magenta, green, blue and orange, with violet as a blue alternative and neutral retained. Red/orange and blue/violet cannot share a composition. Each hue has a paired dark ground; blue separates readable `#7a7aff` ink from `#0000f5` fill, with a readable swatch outline. These are identities, not a reason to add many competing focal accents.

The earlier accepted baseline used Geist Sans headings. The handoff refinement now uses **Argent Pixel headings, Geist Sans prose and Geist Mono code/identifiers**. Body/source faces deliberately retain the current readable composition profile. Project skins can still override measured font families. Code/identifier roles are untracked; tracked utility labels are a different role.

Emphasis must describe meaning: `activeTo` is cumulative progress; `accentAt` is focus, with the arriving segment highlighted by default. Markers follow that rail, names stay neutral, and ordinal timelines emphasize a stop rather than inventing a duration. Panels, code and labels share square furniture; badges wrap whole rather than being squeezed or truncated.

Consistency means a shared visual language, not forcing every figure into the database's arrangement. A simple bar comparison, a timeline and a compound graph should look related while retaining forms appropriate to their content.

**Approval is bounded:** the author approved the corrected database's appearance, not every new composition, the entire framework, full accessibility, or consumer readiness.

## 7. Current canonical route and representative demos

New article figures use **`schemaVersion: "press-composition/1"`**. They pass through the existing compiler, solver, validator and renderer. Compound `body`/`children` trees, panels, schemas, field ports, code, shared categories and measured relation labels are integrated into that route; they are not drawn by a parallel DOM layout engine.

Use `node bin/press.mjs components --json` to discover the actual accepted surface. Do not infer support from a legacy kind, a deep import, an old proposal or an experimental page. The legacy `kind` interface remains for compatibility, not as a fallback to bypass composition refusals.

Frame choices are explicit:

- `landscape`: 1600×1000.
- `square`: 1600×1600.
- `portrait`: 1600×2000.
- `reading`: 1600px wide, height measured from the content, within resource limits.

A fixed composition does not silently change aspect ratio. Reading height is not pagination or responsive reflow. Small claims should not be stretched into tall figures merely to occupy space.

The author requested 3–5 representative templates/compositions built with the **current version of the framework**. Four new examples were selected alongside the approved database:

| Source under `example/compositions/` | Demonstration |
| --- | --- |
| `branching-flow.json` | Cache/origin alternatives merging into one response contract; compound bodies and labelled connections |
| `time-flow.json` | Parallel editorial work on one UTC date axis, with metrics and the underlying date table |
| `contract-comparison.json` | Before/after code panels; the same message inside an explicit event envelope; handling steps |
| `cost-comparison.json` | Earlier repair comparison rebuilt in the current design; 18 / 26 / 40 / 140 EUR retained on one scale |
| `database.json` | Reviewed visual baseline; unequal typed schema cards and named field relationships |

These are editable examples, **not a closed menu of five supported templates**. The four new compositions remain previews for author review.

The current browser host is [`lab/framework/frames.html`](../lab/framework/frames.html); its small navigation layer mounts those JSON sources through the canonical API. The session-local URL is `http://127.0.0.1:4281/frames.html`. It is not a deployment. PNG exports are generated separately through the CLI, and `framework:build` clears its output directory; regenerate exports after rebuilding.

Additional provider-flow, execution-trace, numerical-progression and simple-step fixtures exist in `lab/framework/composition-fixtures.mjs`. Do not confuse them with the four newly selected demo sources or claim their geometry receipts establish visual approval.

The original sequence experiment, seven-frame gallery and technical DOM prototypes remain **historical experiments**. Their interaction, responsive-layout or fault-injection receipts do not automatically transfer to the current canonical composition route.

## 8. Verification: name the promise being made

Keep these states separate:

1. The input is structurally and semantically valid.
2. The canonical geometry solves and passes its checks.
3. Required font faces and images are actually ready.
4. The view mounted successfully and the complete intended export was captured.
5. Someone inspected the actual output for readable, faithful presentation.
6. The author approved the visual result.
7. If motion is later introduced, it reached the intended settled state.

One `ok`, a test count, a successful browser `open`, or the existence of a PNG does not prove every state above.

Inspect complete images, not just thumbnails or the first screenful of a tall figure. Check connectors and labels, identifiers, code wrapping, glyphs, axis titles, units, image bounds and exported artboard dimensions. Retain warnings such as density or near-overflow; do not silently suppress them to make a report look clean.

Current readiness work checks required Geist faces and image decoding. That is not proof of complete multilingual glyph coverage. Code remains canvas-painted, not a fully selectable semantic code renderer. Exact code currently accepts LF and spaces; tabs/CR refuse instead of being rewritten.

Legacy source-normalization, catalogue/unit and outline-authoring trust gaps remain separate concerns. The new composition route avoiding a legacy transformation does not establish that the legacy bug itself was repaired.

## 9. Consumer ownership and adoption

`mega-press` is the **canonical producer** shared by Mega-Dev and Mega-Experience. Both applications currently consume separately pinned vendor copies, not live sibling links. Neither has adopted this working-tree composition work.

Adoption must be deliberate and separately reviewed for each consumer:

- Work from an appropriate pushed full commit, not copied dirty working-tree bytes.
- Use each consumer's documented vendor sync/check flow.
- Preserve its required entry points, build surfaces and overlays, including Mega-Dev's Node-safe validation boundary.
- Verify both consumers' actual use cases; producer tests alone do not prove consumer compatibility.
- Do not silently bundle adoption, publication or deployment into article authoring or a demo request.

Preserve unrelated dirty work in all repositories, including the producer's existing accessBoundary work. Inspect the working tree before editing; do not reset, rebase, overwrite or clean unrelated changes to simplify this task.

## 10. Deferred work and limits—not delivered guarantees

The following must not be presented as complete:

- Canonical selection, linked focus, semantic interaction events and animation.
- General arbitrary SVG import, sanitization, region geometry and instance-safe reference rewriting.
- General responsive reflow, pagination or deterministic video export.
- Arbitrarily dense routing and every possible component combination.
- Full multilingual/font coverage, comprehensive accessibility and selectable semantic code.
- Complete mount/concurrent-instance lifecycle guarantees or a full public-declaration/catalogue reconciliation.
- Consumer adoption or a released production framework.

If interaction resumes, preserve stable semantic targets and keep host concerns—identity, consent, storage and analytics transport—outside the figure's rendering contract. Reader effects must not alter authored content. Exact event/runtime designs remain technical proposals until separately implemented and verified.

Existing composition is the chosen practical direction, not a claim that every future requirement is already solved. Reconsider a boundary when real source material exposes a concrete gap; do not pre-emptively build a general scene engine or multiply templates. Proposed corpus sizes and experimental coverage thresholds are not agreed human acceptance gates.

## 11. Handoff: what to do next

1. Review the four new current-framework demos with the author; keep the approved database as the visual reference, not a mandatory layout.
2. Obtain the first real article, make a short source-linked frame plan and render one useful figure early.
3. Produce the remaining checked JSON/HTML/PNG outputs only after that direction is reviewed. Include captions, readable alternatives and placement/source notes.
4. Fix actual fidelity, layout or presentation defects with focused changes and regression coverage. Report missing capabilities instead of hiding them in screenshots or unsupported substitutions.
5. Keep interaction, animation and consumer migration deferred unless the author changes the priority.

F009 remains active. This work has established a usable local authoring route and a reviewed baseline, not overall completion.

### Reading order for the next assistant

- **This file:** durable human intent, agreed decisions and handoff boundaries.
- [ARTICLE_GUIDE.md](../ARTICLE_GUIDE.md): the practical article-to-frame workflow.
- [AGENTS.md](../AGENTS.md): repository authoring instructions; distinguish composition from legacy kinds.
- [F009 ticket](features/active/F009-framework-foundation/ticket.md): active work and checkpoint history.
- [Framework notes](framework/README.md): alternatives, technical proposals, references and experiments. Earlier research-only or “not implemented” statements describe their historical checkpoint; do not let them override later explicit authorization or treat their proposals as delivered capabilities.
- `example/compositions/`, `lab/framework/frames.*`, and the current component catalogue: concrete editable examples and actual current output, rather than assumptions from the old gallery.

# Press Studio

Implemented for the author's request to explore a portable educational framework,
including meaningful interaction, observation, video-oriented sequencing and 3D.
The follow-up asks for backgrounds that feel more like MEGA. This resumes the
interactive work previously deferred in the vision; it does not change consumer
pins or migrate either application.

## Run and author

```sh
pnpm studio
# http://127.0.0.1:4282/studio.html
pnpm typecheck
pnpm test
pnpm framework:test
pnpm build
pnpm framework:build
```

Three compositions in `example/compositions/` and companion documents in
`example/lessons/` have matching filenames:

- `from-prompt-to-proof.json`: a simplified intent, action and evidence loop.
- `context-is-a-budget.json`: an explicitly invented 100-unit allocation.
- `relationships-have-addresses.json`: field-level foreign-key references.

Edit ordinary JSON. `lab/framework/studio-fixtures.mjs` is navigation metadata.
The normal `press check` and `press render` commands can consume each composition
without a lesson. Lesson descriptions are readable independently of the figure.

The [visual library](library.md) adds ten standalone composition examples at
`library.html`, with full figures and PNG/JSON export in `frames.html`. These
figures can be paired with separately authored lessons using the same runtime.

## Project skins belong to the host

```ts
import { evaluateSpec, mountArtifact, PRESS_THEMES } from '@mega/press';

const theme = PRESS_THEMES.paper;
const result = evaluateSpec(composition, { theme });
if (!result.ok) throw new Error(JSON.stringify(result.errors));
const mounted = mountArtifact(element, composition, { theme });
await mounted.ready;
// On host teardown:
mounted.unmount();
```

MEGA remains the composition default. Paper changes palette and heading font.
`configurePress` can set project defaults; a per-call theme takes precedence.
Preparation captures a skin for later paint, so interleaved instances do not
inherit one another's colors. Categories, graphs, tables, code, text, fields and
picture grounds read that effective skin. Invalid configuration rolls back.

Font swapping supports the bundled, measured Geist Sans, Geist Mono, Geist Pixel
and Argent Pixel families, listed in `SUPPORTED_PRESS_FONTS`. A CSS font swap
without matching metrics would invalidate layout. Unsupported first families
refuse with `THEME_FONT_UNMEASURED`. Arbitrary project fonts still need a measured
font integration.

## Meaningful interaction

```ts
import { createLessonController, sampleLesson } from '@mega/press';

const controller = createLessonController(lesson, {
  instanceId: 'article-17:figure-2',
  onEvent(event) {
    // Forward to the host analytics boundary if desired.
    console.log(event);
  },
});
controller.select('observe', 'keyboard');

// Pure seek: no event and no timer.
const sample = sampleLesson(controller.lesson, 12_000);
// A playback host may separately commit that visible step:
controller.select(sample.stepId, 'playback');
controller.dispose();
```

The lesson is a bounded sequence of 1–12 immutable steps. Each has a stable ID,
description, explicit positive duration and semantic target addresses. Step and
document IDs use slugs. Targets support compound field addresses such as
`tasks.task-owner`. The studio requires each target to resolve uniquely to a
solved rectangle. It never locates a target by matching displayed prose.

Successful step changes emit immutable `step.select` events with document ID,
revision, instance ID, sequence number, input source, previous state and next
state. Mounting, theme/background changes, no-ops and pure sampling produce no
learning events. Observer failures do not roll back state or block other
observers. Reentrant dispatch and use after disposal return named refusals.

The studio shows the four most recent events and retains at most 500 in memory.
The downloaded envelope names that retention limit and the local session. Events
are never transmitted. Host code adds timestamps; the portable controller does
not read a clock, store data or invent a learner identity. Identity, consent,
storage and analytics transport remain host responsibilities.

## Backgrounds and spatial presentation

`studio-backgrounds.mjs` describes four presets using existing canonical grounds:

| Ground | Behavior |
| --- | --- |
| Quiet | Leaves the page open. |
| Lattice | Sparse ordered dots, cleared around solved content. |
| Signal | A directional dither field in unoccupied space. |
| Band | A raised surface derived from the measured body rectangle. |

Presets contain no colors or fonts. Choosing a background authors a presentation
variant; downloaded frame JSON includes that ground. Content, geometry and
lesson identity remain unchanged. There is no separate blueprint-grid renderer.
Text interiors stay clear even under dense field ramps.

Drawing layers reuses `explodeLayers`: it separates the actual ground, vector
canvas and DOM type. It demonstrates figure construction rather than simulating
subject-specific 3D data. Native controls adjust separation; reduced motion makes
transitions immediate. Explore restores the same solved frame.

## Current delivery and limits

- Every studio lesson and every theme/background combination passes canonical
  geometry checks. Existing near-overflow review notes stay visible.
- Guided buttons and measured-region buttons share a controller and support
  pointer and keyboard input. Step descriptions also form an ordinary transcript.
- Playback and seeking use explicit lesson time. Motion changes emphasis and
  camera presentation, not authored data or computed values.
- Narrow screens use local panning; selecting a step pans to its region.
  Supporting lesson copy stays at normal reading size.
- PNG capture uses mounted canvases and DOM type with embedded fonts at 2×
  artboard dimensions. It omits controls, focus overlays and spatial transforms.
  The static composition retains the selected skin and ground.
- Frame JSON, lesson JSON and local events download independently.

The fixed figures scale and pan; they do not generally reflow for a phone. There
is no MP4/WebM exporter, general 3D scene language, arbitrary-font loader or
consumer migration. Timeline sampling is groundwork for video, not video export.
Region overlays, spatial UI and DOM-based PNG capture remain studio host code;
project theming and the pure lesson controller are package APIs.

## Verification

Unit coverage includes lesson validation, deterministic time, state/event
lifecycle, target resolution, theme isolation, font readiness, atomic rollback,
field clearing and unchanged content across presentations. The existing static
frame suite remains in the verification run.

Local Chrome checks cover three lessons in both skins, backgrounds, native
pointer/keyboard selection, no-op events, playback/seek, spatial transforms,
mobile containment and downloaded PNG/JSON. Exported output and screenshots are
visually inspected. These are local development receipts, not author approval
or a full accessibility audit.

Latest local receipt: 327 package tests and 56 framework tests pass; TypeScript,
package build and the complete lab build pass. Browser checks prepared all 24
study/skin/ground combinations, downloaded seven PNGs and checked 390px page
containment with 16px lesson copy. The PNGs were inspected at their complete
export bounds. Review warnings remain visible in the studio.

## Inspected design sources

- `mega-dev/VISION.md`: product ownership and observation as a core principle.
- `mega-dev/packages/ui/src/base.css` and `theme.css`: implemented design values.
- Mega-Dev labs: bounded tilt and dithered visual experiments.
- `mega-content/lab/DESIGN-SYSTEM.md`, `PRINCIPLES.md`, `src/interact.js`,
  representative frames and the rendered contact sheet.
- Mega-Press's composition engine, reviewed database and framework research.

Mega-Dev's `spec/vision.md` and Limen styleguide are scaffolds; the substantive
sources are uppercase `VISION.md` and the implemented UI tokens.

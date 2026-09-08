# Author-supplied styling handoff

The author supplied `/Users/overment/Downloads/megapresshandoff` and requested a
styling refinement. `README.md`, all of `RULES.md`, `TOKENS.md`, and the three
example-folder READMEs were read. Representative PNG/JSON pairs were inspected,
including rail reach comparisons, rich step content, wrapping flow badges and
an accented ordinal timeline. This is not a claim that every supplied state was
reproduced or that the handoff's Figma variables were independently inspected.

## Applied to the existing renderer

- **Editorial hierarchy:** Argent Pixel headings; retain Geist Sans body and
  Geist Mono literal code/identifiers. The latter stay untracked. This deliberately
  keeps the current composition's reading/source faces rather than copying the
  legacy examples' pixelized body text.
- **One cabinet:** black page, `#050505` panels, `#0b0b0b` raised surfaces and
  `#fafafa` text. Composition defaults reference the shared tokens instead of
  maintaining another almost-identical palette. Project overrides still work.
- **Square furniture:** panels, code and connector labels use the same square
  painter. The composition-only 6px rounding branch is gone.
- **Category palette:** red, cyan, yellow, magenta, green, blue and orange; violet
  is an alternative to blue. Neutral remains available. Definitions live in
  `src/tokens.js`, with shared ink/fill/dark-ground entries.
- **Distinguishability:** red/orange and blue/violet pairs refuse with
  `CATEGORY_CONFLICT`. The automatic series list omits the conflicting
  alternatives. No category is silently renamed or recoloured to fix a conflict.
- **Blue ink versus fill:** `#7a7aff` carries words/relations; `#0000f5` can fill
  a swatch, with a readable ink outline so its edge remains visible.
- **Grounds:** category-bearing panels and highlights share the corresponding
  dark wash. Negative examples reuse a category rather than inventing an alarm
  hue. On Paper/custom skins a restrained tint is checked against category and
  prose inks; it is reduced when necessary for 4.5:1 contrast.
- **Progress versus focus:** `railSteps.activeTo` lights the cumulative path.
  `accentAt` selects one focal step; default `accentReach: "approach"` lights
  its arriving segment and both endpoints. `none` and `full` are explicit
  overrides. Markers/numbers derive their ink from that segment; names remain
  neutral. Competing focus/progress inputs refuse.
- **Ordinal timelines:** focus stays on the stop label, marker and title; the
  rail stays neutral because an evenly spaced sequence cannot claim duration.
  Composition timelines refuse multiple focus events on one rail or focus
  mixed with cumulative progress. A two-column contrast can have one per side.
- **Shared step contents:** steps reuse existing code and chip painters. Code,
  details and badges align under the step name, not its number. Badge wrapping
  is determined by the same layout used for measurement and paint; an individually
  oversized badge refuses with `CHIP_TOO_WIDE`. Composition slots retain exact
  strings/outer blank lines and refuse tabs/CR rather than using legacy cleanup.

Category identity, syntax colour and focal emphasis are different channels.
“One accent” is not a ban on multiple categories or on the coordinated markers,
code border and badge that describe one focus. There is no new global accent
counter pretending to infer a compound figure's editorial meaning.

## What was deliberately not copied

The handoff describes another checkpoint of the legacy kind catalogue. Its
minimum event counts, closed template slots, `fit` spelling, forced source
shortening and phone-scale readability claims are not new composition policy.
Use the actual current component catalogue. The composition `reading` frame
provides measured height; code uses the canonical logical-line resource bound
and geometry, not newly imposed recipe density limits. Literal wraps remain
available through an explicit nested `code` component.

The five-step rail maximum is not imposed on arbitrary composition trees. No
source is cut to meet it. The handoff contains both a five-value spacing scale
and special 8/24/64px examples; this refinement retains current measured spacing
and alignment rather than introducing raw per-artifact offsets to imitate them.

Static frames, the opt-in studio/lessons, project-theme overrides and consumer
boundaries remain intact. No new renderer, scene system, application migration
or publishing operation was added for this work.

## Current-engine evidence

Editable sources in `example/compositions/`:

| File | Supplied source / purpose |
| --- | --- |
| `handoff-step-focus.json` | `examples/railSteps/21-slot-wszystko.json` |
| `handoff-timeline-focus.json` | `examples/timeline/05-akcent.json` |
| `handoff-flow-comparison.json` | `examples/compareFlows/09-pigulki.json` |
| `handoff-palette.json` | A clearly labelled demonstration of compatible tokens |

The first three keep the source wording, code, badges and event order. The
adaptation maps `fit` to `reading`, `at` to `date`, and contrasted sides to
ordinary `grid`/`stack`/`timelineVertical` trees. Artifact IDs identify these
adapted documents; this is not input normalization in the compiler.

Browse them in `frames.html` under the **Handoff /** entries, using the existing
MEGA/Paper and background controls. PNG and JSON downloads use the normal host
and canonical content. Existing database/branching examples are additional
regression views, not permission to assume all arrangements look correct.

`src/handoff-style.test.ts` covers source preservation, both skins, exact
palette grounds/contrast, conflicting pairs, project restoration, rail scope,
name/detail alignment, ordinal focus, exact code, whole-badge wrapping and actual
square/outlined-swatch raster pixels. Existing style and project-skin tests
retain their fidelity/geometry checks with updated token expectations.

Run `pnpm test`, `pnpm framework:test`, `pnpm typecheck`, `pnpm build` and
`pnpm framework:build`. Inspect full browser/PNG output separately: tests are
not author approval. Regenerate library thumbnails with `pnpm library:previews`
when changing the shared default style.

### Verification checkpoint

- 469 producer tests, 56 lab tests; typecheck, both builds and diff checks pass.
- Owned isolated Chrome mounted all 23 current views in both MEGA and Paper
  (46 cases). Checked source downloads, mounted bounds, horizontal DOM-text
  clipping and 390px page-overflow containment. No browser exceptions; localhost
  only. This is not a responsive-reflow or comprehensive accessibility claim.
- All four handoff views produced full-size PNG blobs through the actual browser
  export button in both skins (8 exports). Download dimensions matched the solved
  frame at scale 2. Focused-link Enter was checked, not a full Tab traversal.
- Full CLI PNGs were directly inspected for all four handoff figures plus the
  existing database and branching flow; the mounted step screenshot was also
  viewed. All 14 library thumbnails were regenerated, not individually certified
  by a visual review.
- Direct comparisons against the three supplied JSON files confirmed identical
  titles, contents, event order, code, badges and focal targets after the stated
  structural mapping. The original handoff directory was not changed.

Browser receipt: `/tmp/press-handoff-browser-qa.json`; captures:
`/tmp/press-handoff-final/` and `/tmp/press-handoff-browser.png`. These local
receipts are working-tree evidence, not released assets or author approval.

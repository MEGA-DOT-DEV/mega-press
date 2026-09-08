# From an article to Press frames

**Current priority: static article figures. Interaction and animation are on hold.**

The author supplies an article path or draft. The assistant reads it, chooses useful
visual explanations, writes composition JSON, and uses the existing Press CLI to
check and export it. There is no separate article renderer or automatic summary
service. Templates are optional; ordinary component trees compose the figures.

## Working loop

1. **Read the actual article.** Do not modify it unless asked. Identify claims,
   comparisons, quantities, structures and relationships that benefit from a
   figure. Not every section needs one.
2. **Make a short frame plan.** Record the source heading/lines, the precise point
   of each frame, its proposed composition, and any missing information. Keep
   this in `<article-name>.frames/frames.md`, or the author's chosen output folder.
3. **Render a real first frame early.** Reuse the approved MEGA design. Do not
   spend a large batch on an unreviewed visual direction or return the old gallery
   as evidence that a new article has been handled.
4. **Generate the remaining frames through the same engine.** A new arrangement
   normally means a different component tree, not another renderer or template.
5. **Check and visually inspect every export.** Check the complete image, labels,
   connectors, glyphs, code, axes and units. A successful geometry check alone is
   not visual approval. Retain and explain warnings.
6. **Deliver editable JSON, preview HTML, PNG, and the frame plan.** Include a
   caption and readable alternative for each figure in `frames.md`. Record the
   source section and suggested placement. Do not silently publish, upload, or
   insert files into the article.

Use the article as the source of truth. Keep authored quotations, code,
identifiers, values, units and relationships intact. Do not invent data, sources,
missing steps or conclusions. If a relationship is unclear, ask rather than
turning a plausible interpretation into a fact. Any illustrative material must
be explicitly labelled. Do not solve overflow by deleting content.

## Authoring surface

For new article figures, use **`press-composition/1`**, not the legacy `kind`
route. Both routes use the canonical engine, but composition is the route with
the approved technical design and compound bodies.

```sh
node bin/press.mjs components --json
node bin/press.mjs check example/compositions/database.json --json
node bin/press.mjs render example/compositions/database.json --format html --out /tmp/database.html
node bin/press.mjs render example/compositions/database.json --format png --out /tmp/database.png
```

[`example/compositions/database.json`](example/compositions/database.json) is the
editable, standalone source of the reviewed database frame. It is a reference
composition, not a requirement to make every article a database diagram.

The envelope is `{ "schemaVersion": "press-composition/1", "id", "frame", "body" }`.
`title`, `lead`, and a shared `categories` array are optional. The component
catalogue describes the actual node parameters. Models do not supply document
coordinates, raw colours, fonts, or arbitrary styles.

| Source material | Existing composition to try |
| --- | --- |
| Short sequence or procedure | `railSteps`, `railFlow`, or `timelineVertical` |
| A comparison | `grid` of `panel` bodies containing text, code or tables |
| Architecture, branching, convergence | `graph` with ranked nodes and nested `body` trees; explicit labelled edges |
| Database relationships | `graph` containing `schema` bodies; `fromPort` / `toPort` name field IDs |
| Counts and comparisons | `metrics`, `bars`, `table`; retain explicit scope and units |
| Quantitative progression | `lineChart` with numeric axes, units and domains |
| Explanatory prose with code | `panel` / `stack` / `grid` combining `text` and `code` |

Use `landscape` (1600×1000), `square` (1600×1600), or `portrait` (1600×2000)
for focused frames. `reading` measures height from content at 1600px wide. It is
not pagination or responsive reflow. Split a long figure only at meaningful,
authored boundaries; don't stretch a small claim into a huge canvas.

Categories are defined once with `{id, label, tone}` and referenced by ID. The
handoff palette names `red`, `cyan`, `yellow`, `magenta`, `green`, `blue`, and
`orange`, with `violet` as a blue alternative and `neutral` retained. Red/orange
and blue/violet pairs refuse rather than being silently remapped. These are
engine tokens: readable blue carries text/relations; darker blue fills an
outlined swatch. See `spec/framework/style-handoff.md`.
Keep labels and key/nullability markers so colour is never the only encoding.
Ordered events are not a measured timeline. No duration or speed can be inferred
without explicit time data.

## Checks and limitations

- `check` tests geometry and constraints. `render --format html` writes a preview;
  inspect it after readiness. PNG rendering waits for browser presentation and
  is the export check. Exits: 0 success, 1 refusal, 2 tool failure.
- Fixed composition frames do not silently escalate to another aspect ratio.
  Failures require a deliberate composition change, not source repair.
- Exact canvas code currently accepts LF line breaks and spaces; tabs/CR refuse
  rather than being rewritten. Literal `text` runs are a separate source-aware
  text option, not a claim that every code/font case is supported.
- Very dense routing, arbitrary SVG, full multilingual glyph coverage,
  pagination, animation and general responsive reflow are not established.
  Flag a needed capability early instead of hiding the gap in an opaque image.
- The approved database frame is the visual baseline. Other arrangements still
  require their own real output inspection. Tests do not replace this step.
- Mega-Dev and Mega-Experience have not adopted this working-tree composition
  work. Article assets can be produced locally without changing either consumer.

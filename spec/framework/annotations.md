# Source annotations and legends

Open `http://127.0.0.1:4282/library.html?family=Annotations` after `pnpm studio`.
The four cards demonstrate JavaScript anatomy, a JSON contract, prose claims,
and a code change. Their editable sources are in `example/compositions/library-*.json`.

## Define meaning once

A document category owns a mark, its label, and an optional explanation:

```json
{
  "categories": [
    {
      "id": "guard",
      "label": "Empty-input guard",
      "tone": "blue",
      "treatment": "highlight",
      "description": "Returns null when there are no values to average."
    }
  ]
}
```

The treatment is `ink`, `highlight`, `underline`, or `outline`. Omission keeps the
existing colored-ink behavior. Named tones (`red`, `blue`, `neutral`) come from the
project palette. Marks contain no authored colors, CSS, font sizes, or coordinates.
Highlight fills derive from the active panel and category ink; foreground contrast
is checked. Changing treatment does not change source text or its measured advances.

Use a local legend beside or below the annotated card:

```json
{"type":"legend","layout":"stack","ids":["guard"]}
```

The legend renders the category's actual mark, label, and description. `layout`
also accepts `row`; omitting `ids` includes every declared category. The original
compact dot legend stays available for categories without treatments or descriptions.

## Annotate exact source code or JSON

```json
{
  "type": "code",
  "label": "mean.js",
  "lang": "none",
  "code": "function mean(values) {\n  if (values.length === 0) return null;\n  return values.reduce((sum, value) => sum + value, 0) / values.length;\n}",
  "annotations": [
    {
      "id": "empty-input",
      "text": "if (values.length === 0) return null;",
      "category": "guard"
    }
  ]
}
```

`text` selects an exact substring. A missing match refuses preparation. If the
substring appears more than once, explicitly supply `occurrence: 1`, `2`, etc.,
counting left to right. Selections must cover complete Unicode graphemes.
Overlapping selections, unknown categories, invalid
occurrences, and duplicate occurrence/component IDs refuse. Do not combine
`annotations` with `accentLines` in one code component.

The component resolves source ranges before layout. Multi-line selections and
visual wrapping retain the same source and category. Set `wrap: false` to refuse
a logical line that is too wide. Composition code preserves LF line endings,
spaces, blank lines, and indentation; unsupported tabs/CR refuse explicitly.
`lang: "none"` is useful when the legend explains semantic marks. `js` or `json`
can retain syntax colors outside selected spans.

## Annotate prose

```json
{
  "type": "text",
  "role": "body",
  "runs": [
    {"text":"An empty list reaches "},
    {"id":"guard-reference","text":"the early return","category":"guard"},
    {"text":" before the average is computed."}
  ]
}
```

Runs concatenate exactly, including spaces and punctuation. A run boundary must
keep each Unicode grapheme intact. A selected run can
span multiple visual lines; each fragment keeps its occurrence ID, category, and
source offsets. The DOM text stays selectable. Use distinct occurrence IDs when
several passages refer to the same category.

These marks and legends are static parts of the composition and its PNG export.
They do not emit tracking events. A host may use stable occurrence/category
metadata for an additional interaction layer; the Studio lesson controller
remains a separate API.

## Verify and refresh

```sh
node bin/press.mjs check example/compositions/library-code-anatomy.json --json
pnpm library:previews library-code-anatomy
pnpm exec vitest run src/annotation.test.ts src/code-annotations.test.ts src/library-templates.test.ts
```

Inspect each complete frame under the intended project skin, including its
export, whenever source selections or layout change.

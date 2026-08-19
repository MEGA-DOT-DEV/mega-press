# Making a plate

You are writing a figure for MEGA. You write JSON, not code, and you never
write a coordinate, a font size, or a colour.

The system refuses anything it cannot guarantee is correct. Spend your
attention on **what the frame says**. The lock handles where things go.

## The loop

```bash
press kinds                 # what you can build. Read this first, every time.
press schema <kind>         # slot shape for one kind
press check slide.json      # parse → lock → solve → validate. writes nothing
press render slide.json --format json
press render slide.json --format html --out slide.html
press render slide.json --format png --out slide.png
```

A spec is a JSON file, or `-` for stdin. Add `--json` to any command for
machine-readable output.

Exit codes: `0` the plate locked, `1` it was refused, `2` the tool failed.

## The shape

```json
{
  "id": "my-slide",
  "kind": "railSteps",
  "title": "One claim per frame.",
  "steps": [
    { "name": "First", "detail": "A full clause the reader can actually do." },
    { "name": "Second", "detail": "Another clause, not a title echo." }
  ]
}
```

`title` is optional. `kicker`, `number`, and `footnote` are optional chase chrome — omit them. Do not invent a source line or SPECIMEN. The host decides whether a title paints; you may still write one as the claim.

Start with `press kinds`. Then `press schema` for the two or three kinds that
fit. Then write JSON and `press check`. Do not invent a kind. Do not fill
missing slots with demo copy — the lock will refuse, and that is the point.

Unknown kinds and thin slots fail closed with a named code. There is no
fallback figure.

# Making a plate

You are writing a figure for MEGA. You write JSON, not code, and you never
write a coordinate, a font size, or a colour.

The system refuses anything it cannot guarantee is correct. Spend your
attention on **what the frame says**. The lock handles where things go.

## The loop

```bash
press kinds                 # what you can build, and when to pick each. Read this first, every time.
press schema <kind>         # slot shape, density rules, and bans for one kind
press check slide.json      # parse → lock → solve → validate. writes nothing
press render slide.json --format json
press render slide.json --format html --out slide.html
press render slide.json --format png --out slide.png
```

A spec is a JSON file, or `-` for stdin. Add `--json` to any command for
machine-readable output; on `kinds` and `schema` the JSON form also carries
each kind's outline hint and a worked outline example.

Exit codes: `0` the plate locked, `1` it was refused, `2` the tool failed.

## Choosing a kind

The CLI is the catalog. `press kinds` lists every kind with a `pick when:`
line; `press schema <kind>` adds the density rules and the bans — the bans
name the sibling kind to use instead when yours does not fit. Read the two
or three candidates before writing any JSON. Do not invent a kind.

## The shape

```json
{
  "id": "my-slide",
  "kind": "railSteps",
  "title": "One claim per frame.",
  "steps": [
    { "name": "Sense", "detail": "Read only the state needed for the next decision." },
    { "name": "Think", "detail": "Choose one action and name the expected result." },
    { "name": "Act", "detail": "Call one permitted tool with bounded arguments." },
    { "name": "Observe", "detail": "Compare the tool result to the goal, not to fluency." }
  ]
}
```

`title` is optional. `kicker`, `number`, and `footnote` are optional chase
chrome — omit them. Do not invent a source line or SPECIMEN. The host decides
whether a title paints; you may still write one as the claim.

Write the JSON, then `press check`. Do not fill missing slots with demo
copy — the lock will refuse, and that is the point.

Unknown kinds and thin slots fail closed with a named code. There is no
fallback figure.

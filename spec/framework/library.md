# The visual library

Fourteen editable examples show how the existing Press components can explain
different kinds of ideas. Each is an ordinary `press-composition/1` document,
with its source in `example/compositions/`. Copy a useful arrangement, change
the content, or combine its components into another arrangement.

## Browse and export

```sh
pnpm studio
# http://127.0.0.1:4282/library.html
# http://127.0.0.1:4282/frames.html?frame=library-uncertainty
```

`library.html` provides previews and a family filter. `frames.html` opens the
full figure, editable source, and preparation report. The same pages are
available on port 4281 when running `pnpm framework:lab`.

Choose MEGA or Paper, then keep the template's ground or select Quiet, Lattice,
Signal, or Band. **PNG** exports the displayed skin and ground. **Source JSON**
downloads the composition with the selected ground; the project skin remains a
host setting. The original example file stays unchanged.

## Choose an example

| Example | Use it to explain | Editable source |
| --- | --- | --- |
| Decision map | Two dimensions that determine which action fits. | [library-decision-map.json](../../example/compositions/library-decision-map.json) |
| Parallel work | Overlapping workstreams on a shared date scale. | [library-parallel-work.json](../../example/compositions/library-parallel-work.json) |
| Branch and merge | Independent contributions meeting at one result. | [library-branch-and-merge.json](../../example/compositions/library-branch-and-merge.json) |
| System layers | Containment, ownership, and peer responsibilities. | [library-system-layers.json](../../example/compositions/library-system-layers.json) |
| State transitions | States joined by events and explicit conditions. | [library-state-transitions.json](../../example/compositions/library-state-transitions.json) |
| Estimate & interval | An estimate alongside its range of possibilities. | [library-uncertainty.json](../../example/compositions/library-uncertainty.json) |
| Parts & whole | Shares and magnitudes using exactly the same values. | [library-parts-and-whole.json](../../example/compositions/library-parts-and-whole.json) |
| Input → output | A transformation, its source, result, and checks. | [library-input-output.json](../../example/compositions/library-input-output.json) |
| Evidence matrix | What observations establish and what remains open. | [library-evidence-matrix.json](../../example/compositions/library-evidence-matrix.json) |
| Learning path | Concrete activities for understanding and using an idea. | [library-learning-path.json](../../example/compositions/library-learning-path.json) |

Four annotation cards extend the collection with source-linked marks and descriptive legends:

| Example | Use it to explain | Editable source |
| --- | --- | --- |
| Code anatomy | Inputs, guards and returned values in a function. | [library-code-anatomy.json](../../example/compositions/library-code-anatomy.json) |
| JSON contract | The meaning of fields in a structured payload. | [library-json-contract.json](../../example/compositions/library-json-contract.json) |
| Annotated passage | Observation, interpretation and a proposed next action. | [library-annotated-passage.json](../../example/compositions/library-annotated-passage.json) |
| Code change | A new guard and its effect on an empty input. | [library-code-change.json](../../example/compositions/library-code-change.json) |

Open `library.html?family=Annotations` for just these cards. See
[annotation authoring](annotations.md) for the shared mark and legend vocabulary.

The original five references remain available in the library and detail view:
`branching-flow.json`, `time-flow.json`, `contract-comparison.json`,
`cost-comparison.json`, and the reviewed `database.json`.

## Author through the canonical engine

```sh
node bin/press.mjs components --json
cp example/compositions/library-uncertainty.json /tmp/my-composition.json
# Edit the copied JSON, including its document ID and illustrative content.
node bin/press.mjs check /tmp/my-composition.json --json
node bin/press.mjs render /tmp/my-composition.json --format html --out /tmp/my-composition.html
node bin/press.mjs render /tmp/my-composition.json --format png --out /tmp/my-composition.png
```

Use the catalog's approved components, named type roles, spacing steps, and
categories. Author the real values, units, wording, and relationships; let the
solver derive placement. The `reading` profile measures the document's required
height. Inspect the rendered output as well as its geometry report. Review
warnings remain visible even when preparation succeeds.

The library uses `evaluateSpec` and `mountArtifact`, just like the other
composition examples. `lab/framework/library-templates.mjs` combines discovery
metadata from the structures and evidence lists. Adding a composition does not
require a renderer or a new public component.

## Presentation and optional lessons

Project colors and measured fonts belong to the host through `PRESS_THEMES`,
`configurePress`, or per-call theme options. The detail host selects a background
by applying an existing ground recipe to a copy of the composition. Ground
recipes use theme inks, so the same source works across project palettes.
See [Press Studio's project-skin guidance](studio.md#project-skins-belong-to-the-host)
for supported fonts and integration examples.

These examples are static educational figures. They do not include authored
lesson companions or automatic interaction tracking. A host can add a separate
lesson document whose steps target stable component IDs, then use
`createLessonController` for selection and meaningful events. The existing three
[Studio lessons](studio.md#run-and-author) demonstrate that optional layer.

`src/library-templates.test.ts` checks all fourteen canonical sources, discovery
metadata, default MEGA and explicit Paper preparation, stable target resolution,
and preservation of source JSON and active project settings.

## Refresh the previews

After editing an example, regenerate its canonical library thumbnail:

```sh
pnpm library:previews library-system-layers
pnpm library:previews # regenerate all library examples
```

The script reads the library manifest and runs the existing Press CLI at scale
`0.6875`, writing 1100px-wide PNGs to `lab/framework/previews/{id}.png`. It uses
the default MEGA skin and each source's ground. Unknown IDs and failed renders
exit with an error. Inspect the refreshed image before sharing the library.

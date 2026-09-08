# @mega/press

Produces MEGA article figures from authored JSON through the canonical compiler, solver, validator and renderer.

**Static article frames and an opt-in educational studio.** See [the article-to-frame guide](ARTICLE_GUIDE.md) and the reviewed [database composition](example/compositions/database.json). New article figures use `press-composition/1`; the `kind` interface below remains for compatibility. The latest author request resumes interactive exploration through [Press Studio](spec/framework/studio.md), with project skins and a portable lesson controller.

```
parseArtifact(json) → buildArtifact(plan) → mountArtifact(el, spec)
```

Unknown kinds and thin/missing slots fail closed with named error codes. The package never invents demo-subject filler.

## Consumers

This repository is the canonical development source for Press. `mega-experience` and `mega-dev` consume reviewed, committed vendored snapshots pinned to exact pushed commits; they do not depend on permanent sibling links or fetch Press during install.

See [`CONSUMERS.md`](CONSUMERS.md) for the deterministic sync/check contract and the human release runbook. This package remains private and is not published to npm. Local article assets can be generated here without modifying either consumer. Neither consumer has adopted the working-tree composition changes; adoption requires a deliberate, separately reviewed vendor update from a pushed commit.

## CLI

After `pnpm install && pnpm build`:

```sh
# New article figures — composable, approved technical design
node bin/press.mjs components --json
node bin/press.mjs check example/compositions/database.json --json
node bin/press.mjs render example/compositions/database.json --format png --out /tmp/database.png

# Legacy kind interface
node bin/press.mjs kinds
node bin/press.mjs schema railSteps
node bin/press.mjs check example/fixtures/rail.json
node bin/press.mjs render example/fixtures/rail.json --format json
node bin/press.mjs render example/fixtures/rail.json --format html --out rail.html
node bin/press.mjs render example/fixtures/rail.json --format png --out rail.png
```

`--json` on any command. Exit `0` lock / `1` refuse / `2` tool-broke. `press check` runs geometry validation. Legacy kinds may escalate landscape → square → portrait; composition frames remain explicit. HTML/PNG presentation and visual inspection are separate checks. Agents start at `AGENTS.md`.

## Scripts

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm example   # local fixtures via mountArtifact — no /lab/*
```

## Framework research

### Press Studio

```sh
pnpm studio             # http://127.0.0.1:4282/studio.html
```

Three editable JSON lessons use the canonical composition engine. Explore measured regions, play or seek the lesson, switch between MEGA and paper skins, try four background treatments, inspect actual drawing layers in 3D, and export frame JSON, lesson JSON, PNG or local interaction events. See [the integration guide and verification limits](spec/framework/studio.md).

The [visual library](spec/framework/library.md) includes fourteen editable educational compositions, including code, JSON and prose annotation cards, with previews, project skins, background choices, and PNG/JSON export at `library.html` on the same server.

Project skins and `createLessonController` / `sampleLesson` are package APIs. The studio's UI, region overlays, PNG capture and spatial controls remain a local reference host. Deterministic video export and a general 3D scene engine are not implemented.

The next framework direction is being explored in [`spec/framework/`](spec/framework/README.md), with a runnable comparison in [`lab/framework/`](lab/framework/README.md).

```sh
pnpm framework:lab    # local design study, http://127.0.0.1:4281
pnpm framework:test
pnpm framework:build
```

The earlier reading, gallery and technical DOM views remain experiments. The reviewed static database frame now uses composition support in the canonical engine, not that DOM prototype. This working-tree integration is not a consumer upgrade or a finished interactive runtime. See the article guide and verification limits before publication.

## Public API

`src/index.ts` is the contract: `ARTIFACT_KINDS`, `parseArtifact`, `buildArtifact`, `mountArtifact`, `outlineToArtifact`, and the agent catalog (`listArtifactModules`, `getArtifactModuleSchema`, `artifactCatalogPromptBlock`).

Host theme (not artifact JSON): `configurePress({ chrome, color, fonts })` or `mountArtifact(el, spec, { theme: PRESS_THEMES.paper })`. `evaluateSpec(spec, { theme })` prepares the same skin headlessly. `embed` keeps a title on the spec and does not paint it — use that when the figure sits under an article heading. Font changes use the four bundled measured families; unknown families refuse until their metrics are supplied to the engine.

Plate geometry, fonts, and CSS live in this package. Do not fork a second visual stack in a consumer. Colour overrides must still clear the contrast lock.

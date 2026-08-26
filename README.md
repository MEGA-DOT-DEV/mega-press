# @mega/press

Turns artifact JSON (`{ kind, title, slots… }`) into the same validated, responsive plate UI mega-experience uses.

```
parseArtifact(json) → buildArtifact(plan) → mountArtifact(el, spec)
```

Unknown kinds and thin/missing slots fail closed with named error codes. The package never invents demo-subject filler.

## Consumers

This repository is the canonical development source for Press. `mega-experience` and `mega-dev` consume reviewed, committed vendored snapshots pinned to exact pushed commits; they do not depend on permanent sibling links or fetch Press during install.

See [`CONSUMERS.md`](CONSUMERS.md) for the deterministic sync/check contract and the human release runbook. This package remains private and is not published to npm.

## CLI

After `pnpm install && pnpm build`:

```sh
node bin/press.mjs kinds
node bin/press.mjs schema railSteps
node bin/press.mjs check example/fixtures/rail.json
node bin/press.mjs render example/fixtures/rail.json --format json
node bin/press.mjs render example/fixtures/rail.json --format html --out rail.html
node bin/press.mjs render example/fixtures/rail.json --format png --out rail.png
```

`--json` on any command. Exit `0` lock / `1` refuse / `2` tool-broke. `press check` runs the full pipeline (structural lock, then solve + validate) and may escalate landscape → square → portrait before refusing. Agents start at `AGENTS.md`.

## Scripts

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm example   # local fixtures via mountArtifact — no /lab/*
```

## Public API

`src/index.ts` is the contract: `ARTIFACT_KINDS`, `parseArtifact`, `buildArtifact`, `mountArtifact`, `outlineToArtifact`, and the agent catalog (`listArtifactModules`, `getArtifactModuleSchema`, `artifactCatalogPromptBlock`).

Host theme (not artifact JSON): `configurePress({ chrome, color, fonts })` and `mountArtifact(el, spec, { chrome: "embed" })`. `embed` keeps a title on the spec and does not paint it — use that when the figure sits under an article heading.

Plate geometry, fonts, and CSS live in this package. Do not fork a second visual stack in a consumer. Colour overrides must still clear the contrast lock.

# @mega/press

Turns artifact JSON (`{ kind, title, slots… }`) into the same validated, responsive plate UI mega-experience uses.

```
parseArtifact(json) → buildArtifact(plan) → mountArtifact(el, spec)
```

Unknown kinds and thin/missing slots fail closed with named error codes. The package never invents demo-subject filler.

## Sibling layout

This repo lives at `~/mega/mega-press`. Consumers (starting with mega-experience) take it as a local dependency:

```json
"@mega/press": "file:../mega-press"
```

Both repos must be siblings under `~/mega`. This package is private and is not published to npm.

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

Plate geometry, fonts, and CSS live in this package. Do not fork a second visual stack in a consumer.

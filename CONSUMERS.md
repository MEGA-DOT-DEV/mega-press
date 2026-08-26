# Consumer snapshots

`mega-press` is the canonical development repository for Press. `mega-experience` and `mega-dev` consume reviewed, committed vendored snapshots; they do not use permanent sibling links, fetch Press during install, or update automatically at runtime.

## Advance a consumer

1. In `~/mega/mega-press`, make the Press change, run its tests and build, commit it, and push the commit.
2. Capture the pushed commit's full 40-character SHA. A branch name, tag, abbreviated SHA, or unpushed commit is not an import pin.
3. In each consumer that should advance, run its deterministic sync command:

   ```sh
   pnpm press:vendor:sync -- <sha>
   ```

   Run it from `~/mega/mega-experience` and/or `~/mega/mega-dev`. Each consumer owns its import profile and overlay, so their vendored trees need not have identical layouts or host-specific files.
4. Review the vendored diff and pin, run `pnpm press:vendor:check` plus that consumer's normal check/build commands, then commit the consumer update separately from the canonical Press commit.
5. Advance consumers only when ready. `mega-experience` and `mega-dev` may intentionally remain on different reviewed SHAs and update on different schedules.

Current pins:

- `mega-experience`: `1c07620dd51b97621a6ca0d29ff4640703e02a25`
- `mega-dev`: `7962f599caf117b4149a61cdec5e8c408fb5dd76`

## Why snapshots stay committed

Committed snapshots let local development, CI, builds, and Vercel run without access to private GitHub and without a `mega-press` sibling checkout. The pin makes provenance reviewable, while each consumer's offline `press:vendor:check` detects drift from its committed snapshot, import profile, and overlay.

Sync resolves the exact pushed SHA and reads that commit's archive bytes. It never copies working-tree bytes, so uncommitted or ignored files in a Press checkout cannot leak into a consumer snapshot.

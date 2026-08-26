# F008-deterministic-consumer-vendoring · Consumers import reviewed, committed Press snapshots

[2026-08-26] [🟠] [STATUS] [COORDINATOR] ACTIVE · F008-deterministic-consumer-vendoring

## Outcome

`mega-press` is the canonical development repository for Press. `mega-experience` and `mega-dev` consume reviewed, committed vendored snapshots through deterministic, consumer-owned sync and drift-check commands, without permanent sibling links or automatic runtime updates.

## Scope

- Document the producer-to-consumer release runbook and the boundary between canonical Press source and consumer snapshots.
- Define exact pushed commit SHAs as the only import inputs; sync reads that commit's archive bytes, never a checkout's working-tree bytes.
- Let each consumer own an explicit import profile and overlay for its destination layout and host-specific files rather than requiring identical vendored trees.
- Add deterministic `press:vendor:sync` and offline `press:vendor:check` commands independently in `mega-experience` and `mega-dev`.
- Keep the imported Press files and source pin committed in each consumer so review, CI, builds, and Vercel do not depend on private GitHub access or a sibling checkout.

## Out of scope

- GitHub Packages or npm publishing.
- Automatic update bots or automatic runtime updates.
- Git submodules.
- Direct runtime Git dependencies.

## Acceptance

- The root runbook identifies `mega-press` as canonical development source and requires change, test, commit, push, then import by the exact full pushed SHA.
- `mega-experience` can run `pnpm press:vendor:sync -- <sha>` with its own import profile/overlay, producing a committed vendored snapshot and pin; its current starting pin is `1c07620dd51b97621a6ca0d29ff4640703e02a25`.
- `mega-dev` can run `pnpm press:vendor:sync -- <sha>` with its own import profile/overlay, producing a committed vendored snapshot and pin; its current starting pin is `7962f599caf117b4149a61cdec5e8c408fb5dd76`.
- In each consumer, `pnpm press:vendor:check` verifies drift offline from committed snapshot, pin, profile, and overlay data; it does not require GitHub access or a `mega-press` sibling checkout.
- Sync imports committed archive bytes for the requested SHA and cannot read uncommitted or ignored files from a local Press working tree.
- Proof is recorded in both consumers: sync the pinned SHA, show a clean offline `press:vendor:check`, run that consumer's build/check suite, and commit the reviewed snapshot/pin separately from the canonical Press change.
- The two consumers may intentionally remain on different reviewed Press SHAs and advance on different schedules.

## Notes

Consumer scripts land in their own repositories and branches. This ticket establishes the shared contract and producer-side runbook; it does not modify Press runtime code.

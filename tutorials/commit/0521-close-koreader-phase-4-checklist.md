# 0521: Close The KOReader Phase-4 Checklist

## Why this commit exists

`P2-4` accumulated a long chain of adjacent KOReader slices:

- substrate mapping
- exchange workflow
- official KOSync progress push/pull
- remote progress semantic fixes
- reader-side XCFI conversion
- persisted KOReader progress locators
- persisted KOReader annotation metadata
- protocol-boundary correction for official KOSync

By this point, the code was in a reasonable shape, but the checklist still had a maintenance problem:

- several rows still said `Done commit: this commit`
- the service-security gate still used temporary placeholders
- there was no explicit closeout note saying what `P2-4` actually includes and excludes

That makes merge review worse, because reviewers have to reconstruct the whole phase from git history instead of reading the checked-in plan.

This commit fixes the planning artifact.

## What changed

### 1. Replaced temporary commit placeholders with real commit hashes

[`READEST-ALIGNMENT-CHECKLIST.md`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.planning/READEST-ALIGNMENT-CHECKLIST.md) now points each `P2-4.x` row at its actual commit:

- `P2-4.1` → `5d7f1bf`
- `P2-4.2` → `ea2ad10`
- `P2-4.3` → `affd7a2`
- `P2-4.4` → `2e104d1`
- `P2-4.5` → `50f8f10`
- `P2-4.6` → `183e574`
- `P2-4.7` → `924cb06`
- `P2-4.8` → `121d6f8`

That sounds small, but it turns the checklist back into a usable audit ledger.

### 2. Added a phase closeout summary

The checklist now includes a `P2-4 Closeout` section that states:

- what the phase now includes
- what it explicitly does **not** include
- why it is now in a merge-reviewable state

That closeout text matters because the phase ended with a deliberate protocol-boundary correction: official KOSync remains progress-only, and bookmark/annotation transfer currently belongs to the KOReader exchange flow.

### 3. Cleaned up security-gate provenance

The service-security gate rows now point to the real commits that introduced or tightened the relevant remote-sync boundaries.

That avoids a common planning failure mode where the “security” part of the checklist quietly becomes less precise than the feature rows.

## Why this is worth a commit

For this repo, the checklist is not decorative.

It is the working execution ledger for a long multi-slice parity program. If the ledger keeps temporary placeholders after a phase is effectively done, the repo loses one of the main benefits of the staged workflow:

- reviewers cannot quickly see lineage
- future agents cannot confidently decide whether a phase is really closed
- merge timing becomes a memory problem instead of a repository fact

This commit turns `P2-4` from “finished in practice” into “closed in the repo”.

## Files to study

- [`READEST-ALIGNMENT-CHECKLIST.md`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.planning/READEST-ALIGNMENT-CHECKLIST.md)

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`

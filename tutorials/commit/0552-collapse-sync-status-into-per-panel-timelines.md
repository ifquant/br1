# 0552 Collapse Sync Status Into Per-Panel Timelines

## Why this change exists

By `0551`, the reader sync workspace had become much clearer, but it still had one structural problem: each panel exposed readiness in one place, recent activity in another, and last-result detail in yet another card below the actions.

That was correct, but still too fragmented.

Users read the workspace in two scopes:

- **current book**
- **whole library**

Inside each scope, they should be able to answer one question quickly:

> "What is the current state of this sync lane, and what just happened here?"

This slice reorganizes the same information into compact per-panel timelines so each lane reads as one coherent state surface.

## What changed

### 1. The detached result cards are gone

[`src/lib/components/reader/ReaderSyncWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSyncWorkspace.svelte) no longer renders separate global cards for:

- latest current-book export result
- latest exchange import result
- latest remote sync result

Those details now live inside the relevant panel instead of at the bottom of the whole workspace.

### 2. Each panel now owns a compact status timeline

The component now builds two derived timeline lanes:

- `currentBookTimeline`
- `libraryTimeline`

Each timeline entry includes:

- action label
- status
- summary message
- optional timestamp
- structured detail lines

This keeps the state grouped by the same scope the user is already reading.

### 3. Current-book export details now enrich the current-book lane

If the user has a recent current-book export, the timeline shows:

- the latest export action
- export file name when present
- export book count

That means the current-book lane now fully explains both readiness and the last export outcome without sending the user to a second results zone.

### 4. Exchange-import and remote details now enrich the library lane

The whole-library timeline now folds in:

- exchange import applied/skipped counts
- import conflict summary
- remote operation type and status
- push/pull/skip counts
- remote status explanation

This makes the whole-library lane read like a single operational story instead of separate activity and result fragments.

### 5. State ownership did not change

This is a presentation refactor only.

The route still owns:

- readiness signals
- last activity state
- last import result
- last remote result

The sync workspace just turns them into a tighter shape.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- new sync commands or new protocols
- persistence of timeline history beyond the current reader session
- changes to trust-boundary ownership between renderer and Tauri

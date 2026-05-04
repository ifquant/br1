# 0564 Add Recent Assistance History To The AI Workspace

## Why this commit exists

`P5-1.2` gave `br1` a visible AI workspace, but it still behaved like a single transient result panel: each new lookup or translation replaced the previous state, and the notebook gave the reader no way to review or replay the recent requests made for the current book.

Readest’s assistant surface feels more notebook-like because requests accumulate into a visible working context. This commit narrows that gap without reopening provider or network behavior. The goal is simple: keep a small per-book recent-assistance lane inside the existing workspace, and let the reader replay a recent request from there.

## What changed

### 1. Add a small assistance-history model

In [`src/lib/reader/assistance.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/assistance.ts) this commit adds:

- `ReaderAssistanceHistoryEntry`
- `ReaderAssistanceHistoryStatus`
- helpers to create, update, and upsert history entries
- shared reader-facing labels for assistance providers and request subjects

This keeps the history contract explicit instead of burying it as ad hoc route state.

### 2. Record assistance activity in the reader route

In [`src/routes/reader/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/reader/+page.svelte):

- lookup and translation requests now create a history entry as soon as the request starts
- completion/error/empty outcomes update that same entry instead of replacing it
- history resets when the active `readerBookKey` changes, so the lane stays scoped to the current book

This means the notebook keeps recent AI activity for the active book only.

### 3. Show recent assistance activity in the shared workspace

In [`src/lib/components/reader/ReaderAssistWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderAssistWorkspace.svelte):

- the workspace now renders a `最近求助` / `最近翻译` lane above the result panel
- each item shows subject, provider, outcome, and time
- each item exposes `再次发起`, which reuses the saved request and reruns it through the existing callbacks

Because this component is shared, both the notebook AI tab and the old sidebar assist entry automatically inherit the same recent-activity behavior.

### 4. Wire the shared prop through notebook and sidebar surfaces

The new `history` prop is threaded through:

- [`src/lib/components/reader/ReaderNotebook.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderNotebook.svelte)
- [`src/lib/components/reader/ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte)

That keeps one assistance-history source of truth instead of creating notebook-only state.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-assistance-tests --noEmit false && perl -0pi -e "s#from './assistance';#from './assistance.js';#g" ./.tmp-assistance-tests/src/lib/reader/assistance.test.js && node --test ./.tmp-assistance-tests/src/lib/reader/assistance.test.js` (PASS)
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open the ai workspace inside the notebook shell"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- no new provider types, prompt logic, or conversation backends
- no persistence of assistance history across reloads
- no cross-book assistant threads or global notebook archive

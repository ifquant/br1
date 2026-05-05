# 0569 Make current-book AI history clears write through

## Why this change exists

`0568` added mode-scoped clear actions for the current book's AI history, but the first-run Playwright smoke still exposed a gap: the notebook lane could clear in memory before the route-level persistence path rewrote local storage. That left the UI looking correct while the stored history occasionally remained stale until a later reactive pass.

This follow-up makes the user action itself own the write-through. When the reader clears the current book's lookup or translation lane, the route now persists both the filtered history and the cleared selection immediately.

## What changed

- kept the existing route-owned `clearAssistanceHistory(...)` boundary
- after filtering `assistanceHistory` and clearing the mode-scoped archived selection, the handler now calls the existing persistence helpers immediately
- left the broader reactive persistence wiring in place so other history/selection changes still serialize normally

## Why this shape

The clear action is an intentional destructive action. It should not depend on later reactive scheduling to become durable. Writing through inside the action keeps the state owner and the durability boundary aligned:

- the workspace still asks the route to clear
- the route still owns the history/selection state
- the route now also owns the synchronous durability step for that explicit action

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-assistance-tests --noEmit false && perl -0pi -e "s#from './assistance';#from './assistance.js';#g" ./.tmp-assistance-tests/src/lib/reader/assistance.test.js && node --test ./.tmp-assistance-tests/src/lib/reader/assistance.test.js`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can clear current-book ai history in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no cross-book clear or archive controls
- no backend/provider persistence changes
- no general redesign of the AI notebook history structure

# 0565 Let The AI Workspace Review Archived Records

## Why this commit exists

`0564` gave the AI workspace a recent-assistance lane, but it still had one important notebook gap: old requests could be replayed, yet their previous result could not be reviewed directly. That meant the reader still had to rerun an old lookup or translation just to recover the result body.

This commit closes that gap without touching providers or backend behavior. The AI workspace should be able to inspect a current-book assistance record as a notebook artifact, not only as a trigger for another request.

## What changed

### 1. Add a shared request-context label helper

In [`src/lib/reader/assistance.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/assistance.ts) this commit adds `getReaderAssistanceRequestContextLabel(...)`.

That helper gives each saved assistance request a stable reader-facing context label such as:

- `第一章 · 维基百科`
- `第二章 · 译为 ZH`

The workspace can now describe where the record came from without inventing ad hoc strings in the Svelte component.

### 2. Let the workspace explicitly select a saved record

In [`src/lib/components/reader/ReaderAssistWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderAssistWorkspace.svelte):

- recent history items now expose `查看记录` as well as `再次发起`
- the workspace tracks the currently selected archived record
- translation history and lookup history can each be reviewed in place

This means the reader can browse old assistance artifacts without immediately issuing a new request.

### 3. Render archived records in the main result area

When a saved record is selected:

- translation mode shows that archived request’s original text and result/error state
- lookup mode shows the archived title/body/error state in the same result panel
- the result area clearly labels the content as a historical record

The workspace therefore behaves more like a notebook review surface and less like a single “latest network response” slot.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `cd /Users/dev/workspace2/hc_apps/br1 && pnpm exec svelte-kit sync && pnpm exec tsc -p tsconfig.json --outDir .tmp-assistance-tests --noEmit false && perl -0pi -e "s#from './assistance';#from './assistance.js';#g" ./.tmp-assistance-tests/src/lib/reader/assistance.test.js && node --test ./.tmp-assistance-tests/src/lib/reader/assistance.test.js` (PASS)
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open the ai workspace inside the notebook shell"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- no cross-book assistant archive
- no persisted conversation threads across reloads
- no provider/backend changes beyond reusing the already-saved request/result state

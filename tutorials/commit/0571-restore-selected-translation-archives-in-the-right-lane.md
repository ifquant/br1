# 0571 Restore selected translation archives in the right lane

## Why this change exists

The AI workspace already persisted the archived record the reader was reviewing, but that restore path was only really correct for lookup history. If the saved archived record belonged to the translation lane, the notebook still reopened in lookup mode and hid the selected translation result behind the wrong lane.

This slice fixes that mismatch. A persisted translation selection now restores the AI workspace into the translation lane, so the notebook comes back in the same context the reader left.

## What changed

- when the reader selects an archived lookup or translation record, the route now clears the other lane's archived selection so the notebook carries one active archived context at a time
- the shared assistant workspace derives a restored lane from the active archived selection and uses it to reopen the correct lane when the component remounts
- a focused smoke now seeds a translation-only archived selection and verifies that the notebook reopens straight into `最近翻译`

## Why this shape

This keeps the current storage contract intact. There is still no cross-book thread model and no new backend conversation state. The change only makes the existing per-book archived-selection model coherent:

- one active archived record
- one matching active lane
- one restored notebook context after reload

## How it was verified

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check`
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader restores the selected translation ai history record for the current book in web mode"`
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check`

## What is still not included

- no cross-book AI archive browser
- no new persistence model beyond the current per-book archived selection
- no provider/network behavior changes

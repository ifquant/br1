# 0550 Productize Current-Book Sync Readiness States

## Why this change exists

After `0549`, the reader sync workspace already separated current-book activity from whole-library activity. But the current-book panel still had one product weakness: it told users too little about *why* the current book was or was not ready for KOReader exchange export.

One sentence about the current locator was not enough. A user still had to infer several different conditions:

- is this book even a managed-library record?
- does the managed-library file still exist?
- do we already have a KOReader-compatible locator?
- is there only a local reopen locator?
- is there still a source-file association behind this book?

Those are different states with different consequences. This slice makes them visible.

## What changed

### 1. The current-book panel now has a dedicated readiness card

[`src/lib/components/reader/ReaderSyncWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSyncWorkspace.svelte) now renders a `同步就绪状态` card under the current-book summary.

That card explains whether the current book is basically export-ready or blocked, instead of leaving the user with only the action button state and a short locator sentence.

### 2. Readiness is split into four explicit sub-states

The readiness card now covers four different checks:

- **managed-library identity**
- **managed-library replica availability**
- **locator quality**
- **source-file association**

This matters because “not ready” is not one problem:

- a non-managed asset is different from a missing managed copy
- a local-only reopen locator is different from a KOReader-compatible locator
- a missing source file is different from having no source association at all

The UI now exposes those distinctions directly.

### 3. The summary now matches the real export boundary

The card also shows one top-level readiness sentence based on the existing behavior:

- desktop runtime available or not
- current book managed or not
- managed-library replica present or not

This does not add any new sync capability. It just makes the existing boundary legible.

### 4. The focused smoke now locks the new readiness surface

[`tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts) now checks that web mode exposes the readiness card and states clearly that desktop execution is unavailable there.

That keeps this slice inside the same reader-sync smoke instead of inventing a new broader test surface.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- new KOReader export or remote sync behavior
- source-file repair actions from inside the reader
- persisted sync readiness history
- any new trust-boundary changes between renderer and Tauri

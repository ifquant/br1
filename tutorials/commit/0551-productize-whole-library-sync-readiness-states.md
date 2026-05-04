# 0551 Productize Whole-Library Sync Readiness States

## Why this change exists

After `0550`, the current-book side of the reader sync workspace had a proper readiness card, but the whole-library side still depended too much on the *last result* to explain whether the next action was likely to work.

That left an avoidable gap. Users still had to infer several distinct conditions:

- whether they were even in a desktop runtime
- whether KOReader exchange import was available
- whether KOReader remote config had ever been confirmed
- whether the last known remote problem was connectivity or configuration
- whether the protocol boundary was still progress-only

Those are action-preconditions, not just past results. This slice makes them visible before the next button press.

## What changed

### 1. The whole-library panel now has its own readiness card

[`src/lib/components/reader/ReaderSyncWorkspace.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSyncWorkspace.svelte) now renders a `同步就绪状态` card inside the `整库远端动作` panel.

This keeps the current-book and whole-library halves of the sync workspace at the same product maturity level.

### 2. Readiness is split into explicit whole-library checks

The new card now exposes:

- desktop runtime availability
- KOReader exchange import availability
- last-known KOReader remote configuration state
- last-known KOReader remote connectivity state
- the fixed progress-only protocol boundary

That matters because `missing-config`, `auth-failure`, `offline`, and `retryable-failure` are not the same kind of problem. The card now shows them as different readiness dimensions instead of flattening them into one generic error interpretation.

### 3. The card uses only existing signals

This slice does **not** add a new remote preflight or probe command.

Instead, it productizes the signals the reader already has:

- `desktopAvailable`
- the last known `remoteSyncResult.status`
- the fixed KOSync product boundary

If there has not been a remote action yet, the card now says that the state is still `尚未探测`, rather than pretending readiness is known.

### 4. Web mode explicitly shows the whole-library boundary

The focused sync smoke now checks that web mode shows the whole-library readiness explanation:

- no desktop execution
- no exchange import execution
- no remote progress execution

That keeps the renderer-vs-desktop boundary visible even before any action is attempted.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "reader can open sync workspace inside the notebook shell"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- new KOReader sync commands
- remote config probing before the user runs a sync action
- annotation remote sync
- persistence of remote readiness history beyond the current reader session

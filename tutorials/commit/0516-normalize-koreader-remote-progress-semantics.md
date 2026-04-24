# 0516: Normalize KOReader Remote Progress Semantics

## Why this commit exists

The first KOReader server-backed progress slice made the transport work, but it still had a semantic mismatch: it could push `br1` display strings like `10%` as if they were KOReader protocol progress values.

That is not a cosmetic issue. KOReader remote progress is not a generic “progress label” field:

- for reflowable books it is typically a locator value
- for paginated cases it can be a page-oriented value

If we leak UI text into that contract, the sync path looks implemented while silently drifting away from Readest and KOReader behavior.

This commit corrects that boundary.

## What changed

### 1. Push now projects protocol-shaped progress values

In [`src/lib/services/koreaderSync.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/koreaderSync.ts), KOReader remote progress export now derives a transport value from the persisted reading state instead of blindly copying `book.progress`.

The new rule is:

- if local `progressLocation` already looks like a KOReader-compatible locator, push that
- if the stored progress is a page tuple or raw page value, push that
- if the local position is only a `br1`-specific pseudo-location like `txt:...`, skip it

That means unsupported local-only positions no longer pretend to be valid KOReader remote progress.

### 2. Pull now restores `br1` reading-state semantics cleanly

Remote pull also needed a semantic split:

- the KOReader payload belongs in `progressLocation` when it is a locator
- the user-facing `progress` field in `br1` should stay a display label
- `progressFraction` should follow the remote percentage when present

So the merge path now rebuilds reading state in two steps:

1. use KOReader semantics to resolve the remote locator/page value
2. normalize the final `br1` reading-state payload so the app keeps its own display model

Without that split, a pulled locator could end up showing directly in the UI as the progress text.

### 3. Desktop notices now distinguish “nothing valid to sync”

The library coordinator now short-circuits when the current snapshot has no KOReader-compatible progress values to push or match against on pull.

That is better than pretending success on a zero-entry sync round.

## Why this matters

This is a classic trust-and-contract cleanup:

- the previous slice fixed the network boundary
- this slice fixes the data boundary

Both are required for real parity. A safe desktop-owned sync path is not enough if the payload itself is semantically wrong.

## Files to study

- [`src/lib/services/koreaderSync.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/koreaderSync.ts)
- [`src/lib/services/koreaderSync.test.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/services/koreaderSync.test.ts)
- [`src/lib/library/desktopPage.ts`](/Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/src/lib/library/desktopPage.ts)

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec check`
- `pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec exec svelte-kit sync && pnpm -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec exec tsc -p tsconfig.json --outDir .tmp-sync-tests --noEmit false && node --test /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/services/koreaderSync.test.js /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec/.tmp-sync-tests/src/lib/sync/koreader.test.js`
- `git -C /Users/dev/workspace2/hc_apps/br1-readest-alignment-exec diff --check`

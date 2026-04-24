# 0545 Add The First Catalog Manager And Browser Surface

## Why this change exists

`br1` already had a real Tauri-owned catalog substrate: it could list saved OPDS and Calibre-compatible sources, browse allowlisted fixture pages, search safe pages, and convert an entry into a catalog import intent. What it still lacked was a product surface. Those capabilities were trapped behind service functions, so from a user perspective `br1` still had no actual catalog manager.

This slice exposes that substrate as a real `/catalogs` route and makes it reachable from both the app shell and the library header. The goal is not to fake a full downloader. The goal is to make the existing safe catalog capabilities visible without weakening the trust boundary.

## What changed

### 1. Add a real `/catalogs` route

[`src/routes/catalogs/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/catalogs/+page.svelte) is now the first productized catalog workspace.

It does four concrete jobs:

- show connector status and explain the desktop-owned boundary
- list bundled and user-configured catalog sources
- let the user browse and search the current safe catalog page
- turn a selected entry into an import intent summary

That makes catalog work visible without pretending that renderer code is allowed to fetch arbitrary OPDS feeds or download acquisition files directly.

### 2. Expose source management, not just browsing

The route does not stop at page rendering. It also lets the user:

- start a new user source draft
- edit saved source metadata
- save normalized source settings
- remove user-configured sources

This matters because `P7-1.1` was specifically about a catalog *manager* surface, not just a browser.

### 3. Wire catalog entry points into the app shell

Two navigation affordances were added:

- [`src/routes/+layout.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/+layout.svelte) now includes `/catalogs` in the main nav
- [`src/lib/components/library/LibraryHeader.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte) now exposes a visible `书源目录` action

That means catalog management is now part of the product navigation model instead of a hidden capability.

### 4. Lock the current boundary in tests

Two focused tests were added or expanded:

- [`src/lib/services/catalogs.test.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/services/catalogs.test.ts) checks source-input normalization and import-intent conversion semantics
- [`tests/e2e/library-smoke.spec.ts`](/Users/dev/workspace2/hc_apps/br1/tests/e2e/library-smoke.spec.ts) checks the web-mode `/catalogs` route copy and confirms it explains the desktop-owned boundary instead of implying live renderer-side fetching

The smoke test is important because this route exists partly to express product semantics clearly, not only to render data.

## Why the route stops at import intent

The current catalog substrate can safely produce a `CatalogImportIntent`, but it still does not have a bounded desktop-side execution path that turns a ready acquisition link into a real managed-library import.

That is why the new route explicitly says it only generates a safe handoff and does not directly download acquisition links. This is intentional. It avoids smuggling an unsafe renderer-driven downloader into the system under the label of “catalog parity”.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `cd /Users/dev/workspace2/hc_apps/br1 && pnpm dlx tsx --test ./src/lib/services/catalogs.test.ts` (PASS)
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "catalog route explains the desktop-owned boundary in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- live OPDS network fetching for arbitrary user URLs
- desktop-side acquisition download and managed-library import execution
- credential entry or secret persistence in renderer state

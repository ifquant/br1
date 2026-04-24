# 0546 Execute Safe Catalog Imports Inside Tauri

## Why this change exists

After `0545`, `br1` finally had a real catalog route, but the route still stopped at `导入意图`. That meant users could browse safe OPDS and Calibre fixture pages, inspect acquisition metadata, and then hit a wall. The route explained the trust boundary correctly, but it still was not a complete product flow.

This slice closes that gap without reopening the two boundaries that already mattered:

- the renderer must not become an arbitrary network proxy
- the renderer must not turn catalog acquisition metadata into arbitrary local file reads

So the execution path is deliberately desktop-owned. The page still asks for an import, but Tauri re-resolves the request, materializes only allowlisted fixture acquisitions, trusts the staged file on the Rust side, and then reuses the existing library import pipeline.

## What changed

### 1. Catalog import execution now lives in Tauri

[`src-tauri/src/commands/catalogs.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/catalogs.rs) now has a new `import_catalog_entry_to_library` command.

The important detail is that it does **not** trust renderer-supplied `acquisitionHref`. Instead it:

1. re-runs the same `sourceId + entryId + pageHref` resolution path used by `create_catalog_import_intent`
2. rebuilds the importable entry from the desktop-owned safe page snapshot
3. checks that the resulting acquisition href is in the current allowlist
4. writes the bundled fixture payload into a desktop-owned `catalog-acquisitions` cache
5. registers that staged file as a trusted import source
6. calls the existing library import pipeline

That keeps catalog import execution aligned with the same trust model as the rest of the library.

### 2. Library import logic is reused, not copied

The new command does not reimplement bookshelf import rules. It stages a trusted file and then calls the same `import_library_books(...)` flow the desktop picker already uses.

That matters because it keeps:

- metadata extraction
- library file copy rules
- repair/replacement behavior
- record persistence

all in one place instead of creating a second “catalog import only” branch that would drift later.

### 3. The catalog route now has a real import execution loop

[`src/routes/catalogs/+page.svelte`](/Users/dev/workspace2/hc_apps/br1/src/routes/catalogs/+page.svelte) is no longer only an intent viewer.

It now:

- shows per-entry importability before the click
- disables entries that only have browse links
- lets the user execute a ready import directly from the intent panel
- shows product-level import results
- exposes `打开书库` and `直接打开首本图书` follow-up actions after a successful import

This turns the route into a real browse/search/import workflow while keeping execution desktop-side.

### 4. Unsupported and auth-required states are more actionable

The route now gives more intentional product guidance for catalog states that already existed in the backend:

- `authRequired`: configure credentials in the desktop environment first
- `unsupported`: metadata can be saved, but the current build still will not live-fetch that source
- `invalidSource`: fix the saved source metadata in the settings panel

This is small, but it makes the route behave more like a product surface and less like a raw error dump.

## Why the implementation is still intentionally narrow

This slice does **not** claim full Readest-style live catalog parity.

The import executor only supports the currently allowlisted fixture acquisitions:

- `fixture://opds/files/fixture-one.epub`
- `fixture://opds/files/fixture-three.pdf`
- `fixture://calibre/files/calibre-fixture.epub`
- `fixture://calibre/files/calibre-fixture.pdf`

That is deliberate. The current substrate still marks arbitrary `http/https` OPDS sources as unsupported for live browse/fetch, so it would be incoherent and unsafe to let import execution suddenly become a hidden downloader for those URLs.

## Verification

- `pnpm -C /Users/dev/workspace2/hc_apps/br1 check` (PASS)
- `cargo test --manifest-path /Users/dev/workspace2/hc_apps/br1/src-tauri/Cargo.toml catalogs` (PASS)
- `cd /Users/dev/workspace2/hc_apps/br1 && pnpm dlx tsx --test ./src/lib/services/catalogs.test.ts` (PASS)
- `CI=1 pnpm -C /Users/dev/workspace2/hc_apps/br1 test:e2e tests/e2e/library-smoke.spec.ts --grep "catalog route explains the desktop-owned boundary in web mode"` (PASS)
- `git -C /Users/dev/workspace2/hc_apps/br1 diff --check` (PASS)

## Not included

- live OPDS fetching for arbitrary user-configured URLs
- renderer-side credential entry
- remote or browser-owned acquisition download
- claims that catalog parity is “done” beyond the current fixture-backed desktop flow

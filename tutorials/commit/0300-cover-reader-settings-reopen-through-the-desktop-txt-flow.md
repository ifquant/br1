# 0300. Cover Reader Settings Reopen Through The Desktop TXT Flow

This slice closes a plain-text reader gap in the Readest-parity settings work.
Before this change, the settings model could persist `flowMode`, typography, and
layout choices, but the desktop TXT regression did not prove that those choices
actually drove the plain-text surface before and after a true reader-window
reopen.

The implementation also found a runtime bug: the stored settings changed, but
the plain-text CSS variables stayed on their default values. The viewport style
was produced by calling `getReaderViewportVars()` directly from markup, which did
not give Svelte an explicit reactive dependency on the current settings. The fix
stores those CSS variables in `readerViewportVars` and recomputes them whenever
`settings` or window mode changes.

## What Changed

- The desktop TXT reader regression now applies:
  - `滚动` flow mode
  - `无衬线` font family
  - `大` font scale
  - `舒展` line height
  - `宽` page margins
- The regression asserts the footer reports `SCROLL` and the plain-text surface
  receives the expected CSS-derived layout values before closing the reader.
- The same assertions run again after reopening the TXT reader from the library.
- The TXT test refreshes the library record by source path before each reopen so
  it follows the current copied-library file path rather than a stale import
  record.
- The Readest parity audit now records TXT/plain-text as covered for scroll mode
  and persisted font/layout evidence.

## Why The Runtime Fix Matters

Reader settings are not just shell state. They must affect the real reading
surface. In this case localStorage already contained the selected values, but the
TXT reader still rendered with default typography and margins. That would make
the feature look completed in state inspection while failing the actual reading
experience.

Making the viewport CSS variable string explicitly reactive keeps the plain-text
surface aligned with the same settings contract used by the foliate-backed
reader surfaces.

## Verification

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'persists txt highlights and notes separately through the desktop reader store' --mochaOpts.timeout 240000"
```

Result: PASS, 1 focused desktop TXT regression passing.

This does not add new user-facing settings controls. It only makes the existing
settings contract apply live to the TXT/plain-text reader and proves reopen
behavior through the desktop flow.

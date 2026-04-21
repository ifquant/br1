# 0305. Add A Main-Shelf Metadata Review Panel

This slice moves `Library Management` closer to a complete work surface. The
repair queue already had a detailed review panel, but ordinary shelf items did
not have a comparable metadata review entry point. Users could open a book, but
could not inspect the library record without going through recovery flows.

## What Changed

- Main shelf cards now expose a `详情` button outside the reader link.
- The expanded metadata panel shows:
  - title
  - author
  - format
  - status
  - progress
  - language
  - publisher
  - source
  - availability
  - compatibility information
  - restore locator
  - original file path
  - imported time
  - recent reading time
- `BookshelfPreviewBook` now carries the metadata fields needed by the panel.
- Web smoke covers the sample shelf panel for `A Theory of Justice`.
- Desktop webdriver covers the real library shelf and verifies that a metadata
  panel is available for at least one openable book.

## Why This Matters

Library management should not only be an opening workflow. Before editable
metadata or collection management, the safe first step is a read-only record
review surface. This gives users a stable way to inspect what br1 knows about a
book without risking accidental edits or duplicate repair actions.

## Verification

```bash
pnpm exec playwright test tests/e2e/library-smoke.spec.ts -g "library renders the reading-first shell in web mode"
```

Result: PASS, 1 focused web library smoke regression passing.

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'shows the bookshelf with at least one openable book' --mochaOpts.timeout 120000"
```

Result: PASS, 1 focused desktop library shelf regression passing.

This does not add editable metadata, collections, or online catalog lookup.

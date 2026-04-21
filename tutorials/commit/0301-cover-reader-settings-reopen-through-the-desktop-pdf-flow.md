# 0301. Cover Reader Settings Reopen Through The Desktop PDF Flow

This slice adds the missing PDF evidence for the reader settings matrix.
Earlier settings regressions covered reflowable books and plain text, but the
audit still had an explicit gap for PDF / fixed-layout style reading.

The point is not to make PDF behave like EPUB typography. PDF remains a
page-labeled surface. The regression now proves that the same settings contract
can still be applied and restored around PDF without losing the page restore
semantics.

## What Changed

- The existing desktop PDF restore regression now applies reader settings after
  confirming a PDF reopens with stored progress.
- It chooses:
  - `滚动` flow mode
  - `无衬线` font family
  - `大` font scale
  - `舒展` line height
  - `宽` page margins
  - `宽阔` view width
- The regression asserts the PDF still reports `PDF` and a `Page ...` location
  while the renderer flow, host width mode, viewport CSS variables, and persisted
  settings all reflect the selected values.
- It then closes the reader, reopens the same PDF from the library, and repeats
  the same checks.
- The parity audit now records PDF as covered by the scroll/settings reopen
  matrix while still not claiming full typography reflow for PDF.

## Why This Is The Right Contract

PDF is not a reflowable text format in the same way as EPUB, FB2, MOBI, AZW3, or
TXT. A good reader should not pretend that font family and line height can
reshape the underlying PDF document. What should be stable is:

- the user setting is accepted and persisted
- the reader shell and viewport honor the shared settings contract
- scroll mode can be selected and restored
- the page-based PDF restore state remains visible after reopen

This keeps the settings model honest across format classes.

## Verification

```bash
bash scripts/automation/test-tauri-webdriver.sh "pnpm exec wdio run wdio.conf.ts --mochaOpts.grep 'reopens a library-file pdf with restored progress inside the reader stage' --mochaOpts.timeout 240000"
```

Result: PASS, 1 focused desktop PDF regression passing.

The run confirmed that PDF reports `SCROLL` after selecting scroll mode while
retaining `PDF` format metadata and `Page ...` location labels.

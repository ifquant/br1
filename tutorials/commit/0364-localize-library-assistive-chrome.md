# 0364 Localize Library Assistive Chrome

This design slice removes the remaining English product chrome from the library surface.

## Problem

The visible library page was mostly Chinese, but the import card still showed a `SYSTEM` badge in list mode. Several interactive surfaces also kept English assistive labels:

- opening a book used `Open ... in reader`
- metadata panels used `Library metadata ...`
- filter controls used `Filter by ...`
- search, view mode, sort, and active-filter labels used English aria text

These labels are not always visible, but they are still part of the product surface for keyboard and screen-reader users. The visible `SYSTEM` badge also made the import tile feel like an admin fixture.

## Change

The import tile now uses `本机导入` instead of `SYSTEM`.

Library assistive labels now use Chinese product language across:

- book open links
- metadata panels and edit fields
- format/status/collection/tag filter buttons
- continue-reading rows and detail panels
- library search, view mode, sort menu, filter rows, summaries, and clear-filter actions

## Why this is better

Readest-style polish should include the paths that are easy to miss: list-mode import cards, keyboard navigation, and screen-reader labels. This keeps the reader-first tone consistent without changing the library data model or visible book layout.

## Verification

Ran:

```bash
pnpm check
git diff --check
```

Captured a list-mode library screenshot in the gstack design report directory:

```text
screenshots/finding-013-after-library-assistive-chrome.png
```

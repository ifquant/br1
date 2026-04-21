# 0308. Add Main-Shelf Original File Action

The reading workflow rows already exposed an `原文件` action when an imported
book still had a valid source path. The main shelf metadata panel showed the
path as read-only text, but did not offer the same direct action. This slice
aligns the normal shelf with the rest of the library management surface.

## What Changed

- `BookshelfPreview` now accepts an optional `onOpenSourcePath` callback.
- The expanded main-shelf metadata panel shows `打开原文件` when:
  - a source path is available
  - the record is not marked as having a missing original file
  - the caller provides an opener callback
- The desktop library route wires the existing `handleOpenSourcePath` callback
  into the main shelf.
- The existing safe-remove desktop regression now also checks that the metadata
  panel exposes both `打开原文件` and `从书库移除`.

## Why This Matters

Library management should make the original file contract visible and actionable.
Users should not need to move a book into `继续阅读` before opening the original
source file. Keeping the action inside the metadata panel avoids crowding the
cover grid while still making source management available from the normal shelf.

## Verification

```bash
pnpm check
```

Result: PASS, 0 Svelte diagnostics.

```bash
bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "removes an imported shelf book"
```

Result: PASS, 2 focused desktop library management regressions passing.

```bash
git diff --check
```

Result: PASS.

This does not add editable source paths, replacement preflight, or bulk
management actions.

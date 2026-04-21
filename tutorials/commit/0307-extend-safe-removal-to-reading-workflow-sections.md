# 0307. Extend Safe Removal To Reading Workflow Sections

The previous slice added safe removal from the main shelf metadata panel. This
slice carries the same lifecycle action into the reading workflow sections so a
book does not become harder to manage just because it has progress and moved out
of the ordinary shelf.

## What Changed

- `ContinueReadingShelf` now accepts an optional `onRemoveBook` callback.
- Its detail panel shows `从书库移除` alongside repair actions when persistence
  is available.
- The desktop library route wires the existing safe removal handler into:
  - `待修复书籍`
  - `继续阅读`
  - `最近阅读`
- The remove action still goes through the same confirmation and Tauri command,
  so it removes only br1's managed copy and record.
- Desktop webdriver now covers a temporary TXT book that is moved into
  `继续阅读`, removed from that section's detail panel, and then verified on
  disk.

## Why This Matters

The library surface is partitioned into workflow sections. Lifecycle management
must follow those partitions; otherwise the most active books become less
manageable than untouched shelf books. Keeping removal inside the detail panel
preserves the reading-first row layout while still making the management action
available where users inspect the record.

## Verification

```bash
pnpm check
```

Result: PASS, 0 Svelte diagnostics.

```bash
bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "removes a continue-reading book"
```

Result: PASS, 2 focused desktop removal regressions passing.

```bash
git diff --check
```

Result: PASS.

This does not add bulk removal, undo, editable metadata, or collections.

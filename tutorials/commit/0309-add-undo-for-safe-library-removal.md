# 0309. Add Undo For Safe Library Removal

Safe removal already avoided deleting the user's original source file. This
slice adds a recovery buffer: when the original source path is still available,
the removal notice offers `撤销移除` and restores the previous library record
from that source file.

## What Changed

- Added a Tauri `restore_removed_library_book` command.
- The command accepts the removed record snapshot, verifies the stored copy path
  is inside br1's library root, verifies the original source file still exists,
  copies that source file back to the br1-managed path, and restores the record.
- Added a frontend `restoreRemovedLibraryBook()` service wrapper.
- Library notices can now carry one optional action button.
- Removing a book now shows `撤销移除` when the previous record has an available
  source path.
- The undo path restores the record and preserves the previous reading state.
- The desktop removal regression now covers:
  - remove from the shelf
  - verify the record and br1 copy are gone
  - click `撤销移除`
  - verify the record and br1 copy are restored
  - clean up through the same Tauri remove command

## Why This Matters

Library removal is intentionally destructive for br1-owned data. Even with a
confirmation dialog, a one-click undo makes the lifecycle action safer and more
product-grade. The restore path keeps the ownership rule intact: it only writes
inside br1's library root and only reads from the recorded original source file.

## Verification

```bash
pnpm check
```

Result: PASS, 0 Svelte diagnostics.

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

Result: PASS.

```bash
bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "removes an imported shelf book"
```

Result: PASS, 2 focused desktop library management regressions passing.

```bash
git diff --check
```

Result: PASS.

This does not add a persistent trash bin, multi-step undo history, bulk
removal, or restore support when the original source file is missing.

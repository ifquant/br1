# 0351 Secure Library Import And Repair Paths

This slice closes the remaining Tauri trust-boundary gaps around library import, repair preview, and undo-restore.

## Why this matters

The renderer is not a trusted source of local filesystem paths. Even when a path appears to come from a file picker, a compromised renderer can invoke exposed Tauri commands directly with arbitrary strings.

Before this change, three flows still accepted renderer-controlled filesystem authority:

- `import_library_books` read every supplied path before proving it came from a trusted picker flow.
- `preview_library_repair_candidate` canonicalized, statted, and hashed the supplied path and also trusted the renderer's expected source path.
- `restore_removed_library_book` accepted a whole `LibraryBookRecord` from the renderer, including `source_path` and `file_path`.

The important rule is simple: the renderer can identify intent, but Tauri must own filesystem authority.

## What changed

Book selection moved behind backend commands:

- `select_library_book_paths`
- `select_single_library_book_path`

These commands open the native dialog from Tauri, canonicalize selected book files, validate supported extensions, and register the resulting canonical paths in `TrustedLibraryImportPaths`.

`import_library_books` now accepts only paths that match one of these backend-owned trust sources:

- a path selected by the new Tauri picker commands
- a normalized associated-open path already registered by Tauri
- an existing `source_path` from persisted library state, used for automatic repair of known records

The check intentionally verifies the renderer-supplied string against trusted keys before touching the filesystem. That avoids turning import into a general file existence probe.

## Repair preview

`preview_library_repair_candidate` now takes a `record_id` instead of renderer-supplied expected title, author, format, and source path.

Tauri loads the current library record itself, derives the expected values from persisted state, and only previews a candidate file if that candidate was selected through the trusted picker path set.

This preserves the UI behavior while removing the renderer's ability to make Tauri hash arbitrary local files.

## Restore

Undo-restore no longer accepts a renderer-supplied `LibraryBookRecord`.

When `remove_library_book` removes a record, Tauri saves a short-lived in-memory tombstone in `RemovedLibraryBookRecords`. `restore_removed_library_book` now accepts only a record id, resolves the record from that backend-owned tombstone or persisted state, then validates:

- the source path is an existing supported book file
- the destination is a normalized absolute path under the canonical br1 library root
- existing destination symlinks or escaped paths cannot redirect the restore outside the library root

This keeps the "撤销移除" product behavior without allowing the renderer to launder arbitrary files into the trusted library directory.

## Pattern to reuse

For Tauri commands that touch local files:

1. Treat renderer path strings as identifiers, not authority.
2. Register trusted paths only from backend-owned sources such as native picker results, OS open events, or persisted server-side state.
3. Validate extension and canonical location after trust is established.
4. Resolve records by id on the backend instead of accepting record objects from the renderer.


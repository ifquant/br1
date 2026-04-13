# br1 Architecture

## Summary

`br1` is organized as a split frontend/host desktop application:

- Svelte routes compose the product surfaces
- domain controllers and services keep reader logic out of route files
- Tauri commands provide persistence, local file import, and desktop-only capabilities

The codebase is structured around two user-facing surfaces:

- library
- reader

## High-Level Layers

### 1. Route Composition Layer

Top-level route files act as orchestration and page assembly:

- `src/routes/library/+page.svelte`
- `src/routes/reader/+page.svelte`
- `src/routes/+layout.svelte`

Responsibilities here include:

- URL/query parsing
- composing components
- wiring controller outputs into components
- choosing desktop-only vs web fallback flows

### 2. UI Component Layer

Reusable presentational and interaction-heavy components live in:

- `src/lib/components/library/`
- `src/lib/components/reader/`

Important reader components:

- `ReaderSidebar.svelte`
- `ReaderStage.svelte`
- `ReaderHeaderBar.svelte`
- `ReaderFooterBar.svelte`
- `ReaderViewport.svelte`

### 3. Reader Domain Layer

Reader-specific state orchestration lives in `src/lib/reader/`.

Current controller split:

- `searchController.ts`
- `notesController.ts`
- `bookmarksController.ts`
- `sidebarController.ts`

This layer owns state transitions, persistence handoff, and UI-facing domain objects rather than raw route-local state.

### 4. Service Layer

Bridge functions between UI/controllers and environment-specific capabilities live in `src/lib/services/`.

Examples:

- `platform.ts` centralizes Tauri environment checks/invoke calls
- `libraryPersistence.ts` handles library CRUD and reader href construction
- `readerSearchCache.ts`, `readerNotes.ts`, `readerBookmarks.ts` handle host persistence APIs
- `readerWindow.ts` handles separate Tauri reader windows

### 5. Host Persistence Layer

Rust commands in `src-tauri/src/commands/` expose the desktop-only persistence and file operations.

Modules:

- `library.rs`
- `search_cache.rs`
- `notes.rs`
- `bookmarks.rs`

Shared structs and utilities are split into:

- `src-tauri/src/models.rs`
- `src-tauri/src/util.rs`

## Main Data Flows

## Library Flow

1. `src/routes/library/+page.svelte` loads persisted records through `loadPersistedLibraryBooks()`
2. Records are mapped into `LibraryShelfBook` view models
3. User opens a book through reader hrefs built by `toReaderAssetHref()` / `toReaderStartHref()`
4. Desktop path may open a dedicated Tauri reader window through `openReaderTarget()`

## Reader Open Flow

1. `src/routes/reader/+page.svelte` parses `source`, `path`, `url`, `fraction`, `location`
2. Route emits a `ReaderControlRequest`
3. `ReaderStage.svelte` passes the request into `ReaderViewport.svelte`
4. `ReaderViewport.svelte` resolves file/asset source, loads foliate book documents, and opens the reading surface
5. Preview state, TOC, selection, notes, and search updates are emitted back upward as component events

## Reader Persistence Flow

Reader route composes multiple domain controllers:

- search controller for search state/history/cache actions
- notes controller for note CRUD and hydration
- bookmarks controller for bookmark CRUD and hydration
- sidebar controller for sidebar visibility/pin/width/tab preferences

Desktop persistence uses Rust commands; web fallback often uses `localStorage`.

## Search Flow

1. Search request originates in `ReaderSidebar.svelte`
2. Route forwards through `searchController`
3. `ReaderViewport.svelte` executes the actual search against the reading engine
4. Results may be loaded/saved to host disk via `readerSearchCache.ts`

## Notes / Bookmark Flow

1. Reader selection or preview state changes in `ReaderViewport.svelte`
2. Route syncs these into notes/bookmarks controllers
3. Sidebar renders derived workspace views
4. Persistence writes go through service wrappers into host commands when available

## Desktop Window Architecture

The app has two desktop operating modes:

- main library window
- separate reader window (`mode=window`)

Reader-window-specific behavior is handled in:

- `src/lib/services/readerWindow.ts`
- `src/lib/components/reader/ReaderStage.svelte`
- `src/routes/reader/+page.svelte`

The reader window uses overlay-style chrome, hover-based header/footer behavior, and its own sidebar pin/resize logic.

## Important Architectural Boundaries

- Route files are composition layers, not the main business-logic sink
- Reader controllers hide mutable workflow state from components
- Services isolate environment decisions (`web` vs `Tauri`)
- Rust commands own durable storage and filesystem access

## Architectural Direction

The codebase is in an active alignment phase toward Readest:

- UI shell and interaction model are being ported incrementally
- architecture is already more structured than an initial prototype
- some legacy placeholders still remain, but the main direction is clear: a desktop-first reader with stronger library, restore, notes, bookmarks, and search workflows

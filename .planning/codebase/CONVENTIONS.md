# br1 Conventions

## Summary

The codebase is converging on a few clear conventions: route-level composition, controller-based reader state, service-based environment boundaries, and small incremental commits/tutorials for every feature slice.

## Architectural Conventions

### Route Files Are Composition Layers

Current route files are expected to compose controllers and components rather than accumulate all business logic inline.

Examples:

- `src/routes/library/+page.svelte`
- `src/routes/reader/+page.svelte`

The reader route still orchestrates a lot, but stateful subsystems have already been pushed into dedicated controllers.

### Reader State Lives in Controllers

Reader state is not supposed to live as random `let` state everywhere.

Current controller split:

- `src/lib/reader/searchController.ts`
- `src/lib/reader/notesController.ts`
- `src/lib/reader/bookmarksController.ts`
- `src/lib/reader/sidebarController.ts`

Convention:

- controllers own state transitions
- route files wire them together
- presentational components consume snapshots and callbacks

### Services Fence Off Environment-Specific Work

Anything that needs Tauri, host filesystem access, or desktop runtime checks should flow through `src/lib/services/`.

Shared boundary:

- `src/lib/services/platform.ts`

This keeps `import('@tauri-apps/api/*')` and desktop detection from being duplicated throughout the app.

## UI / Component Conventions

- Shared component exports go through `src/lib/components/index.ts`
- Reader components are split by surface responsibility:
  - header
  - footer
  - sidebar
  - stage
  - viewport
- Library types are centralized in `src/lib/library/types.ts`
- Reader shared types are centralized in `src/lib/reader/types.ts`

## Styling Conventions

Global tokens are declared in `src/routes/+layout.svelte`, including:

- `--font-chrome`
- `--font-reading`
- `--border-light`
- `--border-medium`
- surface and text palette variables

Observed styling patterns:

- reading chrome uses `var(--font-chrome)`
- body/background defaults use the reading-oriented serif stack
- many components use `color-mix(...)` over a small token palette
- rounded panel/pill surfaces are the default visual language

## Data / Persistence Conventions

- Desktop persistence is preferred when `isTauriDesktop()` is true
- Web fallback often uses `localStorage`
- Search cache, notes, bookmarks, and sidebar prefs all use explicit keys rather than hidden global stores
- Rust persistence models are `serde` structs in `src-tauri/src/models.rs`

## Naming Conventions

- Svelte components use `PascalCase.svelte`
- controllers and services use `camelCase.ts`
- Rust command modules use snake_case filenames and `#[tauri::command]` functions
- storage keys are explicit and namespaced, e.g.:
  - `br1.reader.search.config`
  - `br1.reader.sidebar`
  - `br1.reader.notes:*`

## Error Handling Conventions

- Browser-side failures often log with `console.warn` / `console.error` and keep the app usable where possible
- Service helpers generally return early or throw descriptive errors when desktop-only features are accessed on the web
- Rust command functions return `Result<_, String>` and stringify IO/serde errors instead of introducing a richer error type

## Testing / Verification Conventions

- Type safety baseline: `pnpm check`
- Desktop behavior baseline: `bash scripts/automation/test-tauri-webdriver.sh ...`
- Web smoke baseline: Playwright

The repo also uses a strong documentation convention:

- every meaningful slice gets a tutorial under `tutorials/commit/`
- commit messages are expected to state purpose, changes, verification, and exclusions

## Language / Product Writing Conventions

- Product-facing UI increasingly uses Chinese labels
- some historical/internal labels remain in English, especially in tests or legacy code paths
- Readest alignment is a recurring product convention: new UI work often moves toward a known upstream interaction target instead of inventing a totally different shell

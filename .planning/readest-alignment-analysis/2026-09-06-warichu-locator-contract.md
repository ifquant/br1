# S2-R04C13A: Warichu Locator Compatibility Evidence

## Decision

This is a test/audit-only prerequisite, not enabled Warichu layout. Starting
points: br1 `75d24cc8da115db98d4ddd9ee3ba1a54fc34970b` and sibling foliate-js
`37edf61c6e94bd737812f6ae3e6184c57e992cbe`.

Keep the production sanitizer, renderer, persistence and stored locators
unchanged. Neither retaining a previously unwrapped element nor copying the
upstream chunk builder is safe before historical locator compatibility is
defined. The existing `partial` classification of `ebbbf104b` is not upgraded
by this evidence slice.

## Exact Upstream Commit

Readest `ebbbf104b28bbcab470669e8506ff2fe5f026e38` changes six host files
(+985/-1), with no `packages/foliate-js` gitlink move:

- The transformer recognizes `span.warichu`, `span.warichuu` and `<warichu>`,
  extracts outer punctuation and sanitizes nested markup into pending spans.
- The runtime measures available line capacity and the first segment's
  position, then creates paired two-character chunks. It rebuilds them after
  stabilization when its cached column size/stride changes.
- Styles use half-size inline annotation chunks; tests cover HTML slicing,
  preserving open tags and treating entities as single visible characters.

Implementation details are not local requirements. In particular, the string
regex transformer, hand-written HTML slicing and dimension-only cache are not
approved for wholesale adoption. Native DOM/Range facilities should be used
where they satisfy the eventual frozen contract.

## Local Ownership Conflict

`src/lib/reader/foliate.ts` sanitizes rendered HTML/XHTML at the shared resource
transform boundary. Its current allowlist does not retain `<warichu>`, though
ordinary `span` class markers survive. In sibling `epub.js`, section
`createDocument()` uses `loadDocument()` to parse the original resource, not
that transformed render tree. `view.js` generates CFIs directly from the
supplied Range and resolves them against whichever document is supplied.

Adding `warichu` to `ADD_TAGS` would preserve more source structure, but also
change the old render tree's element/text indices. A previously saved CFI can
still parse and resolve while targeting another node. Equal text is not proof
of target identity when passages repeat. Conversely, a new raw-source round
trip does not establish that historical render-tree CFIs remain valid.

The upstream runtime introduces a second problem: paired chunks interleave
pieces from two logical lines in DOM order, then replace those nodes on
relayout. Br1 must preserve source-order copy/TTS/search and exact annotation
provenance, not merely make the columns look right.

## Initial Locator Owner Inventory

This is a starting inventory for C13B, not an exhaustive migration audit:

| Surface | Existing owner / contract |
|---|---|
| Notes and highlights | `ReaderNote.cfi`, `notesController.ts`, `services/readerNotes.ts`, Rust `ReaderNoteRecord` |
| Bookmarks | `ReaderBookmark.locator/targetHref`, `bookmarksController.ts`, `services/readerBookmarks.ts`, Rust `ReaderBookmarkRecord` |
| Reading progress / resume | `currentBookPersistence.ts`, `LibraryBookRecord.progress_location`, library commands |
| Imported and synchronized state | Readest library import and `commands/sync_snapshot.rs`; existing container schema versions are not DOM-locator versions |
| Search and popup mapping | Native section `createDocument()` search; C8 pristine Range/CFI and reverse-map checks |
| Portable highlight selections | `ReaderHighlightSelectionSetExport` stores CFIs with export schema version 1, not a render-tree identity |

The inspected note/bookmark records do not identify the DOM model used to
create their locator. Do not treat an absent version as a known raw-source
version, or infer it by whichever of two candidate trees happens to resolve.

## Executable Sequence

### C13A: Compatibility Evidence

Use a real EPUB and native Foliate CFI APIs to characterize the current
sanitized/pristine divergence and the danger of a retained-tag candidate.
Keep candidate DOM changes inside tests. Include selections inside, across,
and after the marker, plus a duplicate-text counterexample. Ordinary spans
provide the control. Passing characterization tests mean the hazard is
reproducible, not that production parity is fixed.

### C13B: Historical Locator Contract

Inventory every persisted/imported locator writer and reader. Freeze a
distinguishable old/new DOM identity and compatibility policy before changing
production markup. Preserve original records on ambiguous or unverifiable
targets. Define failure reporting and test legacy progress, bookmarks, notes,
imports, duplicate text and reopening. Do not silently rewrite old records.

### C13C: Measured Layout and Lifecycle

Only after C13B passes, implement the smallest measured two-line layout at the
agreed owner. Verify columns, partial first segments, nested markup, entities,
Unicode, punctuation, font/viewport changes, stable logical selection/CFI,
search/TTS and stale-document teardown. C13 remains open until these product
behaviors pass; C14 is not the next executable task yet.

## Verification

C13A is complete as test/audit evidence only:

- `pnpm exec playwright test tests/e2e/warichu-compat.spec.ts --project=chromium --workers=1 --retries=0 --max-failures=1`: 2/2 PASS. Historical rendered-tree CFIs round-trip on the old tree; retaining markers produces null inside/cross ranges and a same-text, wrong-node following range.
- `pnpm exec playwright test tests/e2e/ruby-selection-compat.spec.ts tests/e2e/footnote-mapping.spec.ts --project=chromium --workers=1 --retries=0 --max-failures=1`: 11/11 PASS. Total: 13 unique browser cases.
- Strict standalone TypeScript check of the new spec: PASS. The initial syntax diagnostics and then browser-URL import diagnostics were corrected before any browser execution.
- `pnpm check`: PASS, zero errors/warnings; `pnpm test:reader-helpers`: 99/99 PASS; direct `pnpm exec vite build`: PASS, without PDF vendor regeneration.
- `git diff --check` and ledger recount: PASS. Totals remain 678 unique commits, 61 covered / 405 partial / 77 gap / 135 not-applicable, with 54 remaining primary task IDs.
- Fresh Terra high task re-review and Astra high whole-change static review: PASS. Neither review is a substitute for the browser runs above.

Luna executed browser checks with `BR1_PLAYWRIGHT_CHANNEL=chrome`, outputs under
`/tmp/br1-c13a-focused-results` and `/tmp/br1-c13a-final2-regressions-results`.
The standalone compile command was:

```sh
pnpm exec tsc --noEmit --strict --skipLibCheck --target ES2022 \
  --module ESNext --moduleResolution Bundler --lib ES2023,DOM,DOM.Iterable \
  --typeRoots node_modules/.pnpm/@types+node@20.19.37/node_modules/@types \
  tests/e2e/warichu-compat.spec.ts
```

Logs are `/tmp/br1-c13a-focused.log` and
`/tmp/br1-c13a-final2-{compile,regressions,check,helpers,vite-build}.log`.
The focused runner's outer shell returned 1 after using a reserved zsh variable;
the underlying Playwright log records 2/2 PASS and was not rerun. The final spec
SHA-256 stayed `47f11b30e7b1e778c3dd37b40f9dae2efff4d492953c3259923a09fd9cee5d52`
through execution. Production source, manifests, locks and sibling Foliate are
unchanged; the task-created build directory was removed and port 4173 is free.
Existing `.svelte-kit/` and repository-root `test-results/` were preserved.

This proves resource-DOM and native CFI compatibility hazards, not packaged
Tauri/WebKit behavior, historical-record migration, or measured layout.
Next: C13B. No production fix is claimed and parent coverage is unchanged.

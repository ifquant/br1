# S2-R04C13B: Historical Locator Compatibility

## Baseline and Scope

Starting br1 revision: `10a7eb391c80d0cf693eda2ff43a5a1d87d46d81`.
Foliate remains `37edf61c6e94bd737812f6ae3e6184c57e992cbe`.
The [C13A evidence](./2026-09-06-warichu-locator-contract.md) proves that keeping
a previously unwrapped marker can invalidate a CFI or retarget equal text.
Neither successful resolution nor matching text identifies the original DOM.

No Warichu retention or measured layout is authorized by this inventory.
Parent `ebbbf104b` remains partial. C13C must not start until the historical
locator contract and its production prerequisites are verified.

## Persisted and Imported Owners

This inventory describes the starting revision above. Completed production
changes and their proof limits are recorded in the execution sections below;
in particular B1 now transports note provenance.

| Surface | Writer and transport | Reader and preservation boundary |
|---|---|---|
| Notes/highlights | `notesController.ts` stores selection segment CFIs. `services/readerNotes.ts` delegates to `commands/notes.rs`; web mode uses per-book JSON arrays. | Controller hydration normalizes kind, not CFI provenance. Legacy local storage moves to native storage only after save succeeds. `ReaderNoteRecord.cfi` has no DOM identity. |
| Bookmarks | `bookmarksController.ts` derives `locator` and `targetHref` from preview progress, with href/label fallback. `services/readerBookmarks.ts` and `commands/bookmarks.rs` persist typed records. | A bookmark's deduplication key and navigation target are separate fields. They can be CFI, href or synthetic label keys; not every locator is an EPUB CFI. |
| Library progress | Reader route debounce and leave/pagehide flush call `updateLibraryReadingState`; `commands/library.rs::update_library_reading_state` replaces progress fields. | `libraryPersistence.ts` selects supported KOReader progress before local progress and emits a route restore target. A future rejected restore must not be overwritten by an automatic fallback preview/flush. |
| Readest import | `commands/library.rs::import_readest_library` copies `load_readest_config(...).location` into `LibraryBookRecord.progress_location`. | Producer application does not establish which transformed DOM produced the CFI. Imported records must not be relabeled as local render-tree locators. PDF progress normalization is a separate existing contract. |
| Local snapshots and remote sync | `services/syncSnapshot.ts` and `sync/model.ts` assemble/restore library, bookmark, note and highlight-workspace records. Rust `commands/sync_snapshot.rs` applies typed records. | Container/schema versions describe transport shape, not locator DOM identity. Any future origin metadata must follow the exact locator selected by merges, not merely the winning outer record. |
| KOReader exchange | `services/koreaderSync.ts` and Rust `commands/sync_snapshot.rs` merge external annotations with local records, sometimes retaining an existing CFI/target. Official remote sync is progress-only. | XPointer and CFI are different schemes. Retaining a local CFI while taking external note metadata must not silently give that CFI the imported origin. |
| Search cache | `services/readerSearchCache.ts` delegates result arrays to desktop storage; `ReaderSearchCacheResult.cfi` is stored with cache schema/expiry metadata. | Cached CFIs are disposable but still require invalidation if their document model changes. A file fingerprint alone does not describe sanitizer/renderer DOM changes. |
| Saved highlight sets | `sidebarHighlightSelections.ts` exports CFIs under schema version 1; `sidebarHighlightsWorkspace.ts` retains imported snapshots. | Imported set membership can match existing highlights by ID, CFI/text/chapter or text/anchor. This is not an exact locator migration proof and must not be reused as one. |
| Assistance history | `assistance.ts` normalizes optional request/source CFI; `currentBookPersistence.ts` persists per-book assistance history. | Source references retained in reading assets also need an explicit policy if later used to navigate or create annotations. They are not proof of DOM origin. |
| Pinned and translated TTS | `tts.ts` and `currentBookPersistence.ts` retain progress location, fraction and chapter href; the route can navigate to speech progress. | Pinned speech text and a navigation locator are distinct. A future compatibility failure must not erase the pinned reading asset. |
| Focused reading resume | `readingMode.ts` serializes source text and progress location; `currentBookPersistence.ts` restores the per-book state. | Its resume snapshot is independent of library progress. Updating one owner does not migrate this snapshot. |

The inventory covers the known active persisted/imported locator families in
this checkout. It is not a statement that every legacy data path is safe today.
Runtime consumer gates and executable scope are recorded below.

## Frozen Execution Sequence

### C13B1: New EPUB Note Provenance

Record the DOM source at the exact creation point of a new EPUB note/highlight
CFI: rendered body Range versus validated pristine-section popup Range. Carry
that source with its CFI through native/web persistence, snapshot copies,
portable highlight exports and KOReader record reassembly. Missing historical
source remains unknown; loading or editing a note must not relabel it.

Frozen additive field: `cfiOrigin?: string` in persisted TypeScript records and
`Option<String>` with default/omit-None serialization in Rust. New EPUB
generation uses `br1-epub-rendered-v1` or `br1-epub-pristine-v1`. Absent/null is
unknown and is never backfilled; unrecognized strings survive transport but
cannot authorize a future source-specific resolver. Other types are invalid
at import/persistence boundaries. Existing container schema versions stay as
they are: they do not describe the DOM model.

When a merge retains an old CFI it also retains that CFI's origin, including
absence. Replacing it with an external CFI of unproved origin clears the origin.
An origin label describes the creation DOM, not a book fingerprint, exact
target-identity proof, migration proof, or security credential.

Highlight toggling compares `(origin, cfi)`, not CFI alone. The same CFI can name
different positions in different DOM models; a new rendered highlight must not
remove an unknown historical highlight or a pristine-source highlight.

If exact EPUB selection CFI generation throws or returns empty, preserve the
selected text for copy/lookup/translation/TTS, but do not substitute the current
reading position and do not save an anchored record. The shared notes admission
guard also covers notebook commands and requires every nonempty text segment
to have an anchor. This is creation safety, not historical replay compatibility.

### C13B2: Remaining Writers and Provenance Transport

Complete provenance for bookmarks, reading progress/resume and the remaining
persisted/imported families above. Freeze how absent and unrecognized origins
are represented, transported and surfaced without fabricating origin from a
successful CFI lookup or repeated text. Invalidate disposable caches when the
DOM contract changes. Keep schemes such as TXT progress and KOReader XPointer
distinct from EPUB DOM CFIs.

#### C13B2a: Bookmark Provenance

Starting revision: `7a19a9957954e8659b0998ea9af069e84e7b8d43`.
The frozen slice covers bookmarks, not the remaining B2 families.

- Preview `progressLocationOrigin` is emitted only for an EPUB relocation Range
  belonging to the current rendered document. Restore input is not provenance.
- `locatorOrigin` belongs to the bookmark identity field `locator`;
  `targetHrefOrigin` belongs to the independently selected navigation target.
  Both are optional strings. Missing/null stays unknown, future strings survive,
  and non-string metadata is rejected at persistence/import boundaries.
- Creation copies origin only alongside the actual EPUB CFI progress value.
  Href, synthetic label, TXT and KOReader XPointer fallbacks gain no DOM label.
- CFI toggle and active display compare origin plus locator. Non-CFI identity
  retains its existing behavior. Target provenance does not change identity.
- Bookmark loading blocks mutations until the current request validates the
  full list. A failed load remains blocked, exposes an error in the existing
  sidebar and can retry; stale completion cannot release the block. An invalid
  record must not turn the stored list into an empty list that a later toggle
  overwrites. This is bookmark load safety, not B3 progress-restore policy.
- TS and Rust KOReader merges select each field and its origin together. A
  retained unknown source stays unknown. Falling back from an empty imported
  target to its locator copies that locator's origin, not the empty target's.
- No schema bump, historical backfill, navigation acceptance/rejection,
  sanitizer change or Warichu layout is part of this slice.

Next executable slice **C13B2b** covers library progress provenance through
native/web persistence, Readest import, snapshot/KOReader transport and restore
target selection. It must not change rejection behavior ahead of B3 protection.
Search-cache invalidation and the assistance/TTS/focused-reading resume families
remain B2 follow-ups; their concrete write sets must be frozen before editing.

### C13B3: Compatibility Consumers and Restore Write Protection

Wire origin-aware navigation, annotation replay and source/render mapping only
after their writers and transport are covered. Retain original records when
identity is ambiguous or unsupported, and expose a recoverable failure.

Any restore rejection must ship in the same slice as automatic-write protection:

- Protect the record before restoration starts, not only after failure.
- Cover debounced writes, pagehide/leave flush, rechecks after awaited work and
  callbacks from a replaced book/session.
- A navigation timeout does not cancel its operation. Late relocation events
  must not release protection or overwrite the historical locator.
- Replacing the old location requires an explicit acceptance of the new one;
  falling back to a fraction is not a locator migration.

`ReaderViewport.svelte::applyInitialNavigation` currently waits for a Promise;
that is not exact target-identity validation. The route's
`persistLibraryReadingState` currently writes preview progress after debounce
or flush without a restore outcome gate. C13B1 changes neither behavior.

## Completion Boundary

C13B1 and C13B2a are complete within their new-note and bookmark provenance
contracts. C13B as a whole remains open until the remaining B2 writers and B3
pass. No C13C layout, historical record migration, progress rewrite policy or
replay guarantee is included in these slices.

## B1 Verification (Historical)

- `pnpm check`: PASS, zero errors/warnings. Strict standalone TypeScript check of `ruby-selection-compat.spec.ts`: PASS.
- `pnpm test:reader-helpers`: 104/104 PASS. Separately compiled `services/koreaderSync.test.ts`: 9/9 PASS; 113 helper tests total.
- Chrome Playwright, one worker, zero retries: ruby selection (5), Warichu evidence (2), footnote mapping (7), plus authored-text/footnote/TXT regressions (47): 61 unique cases PASS.
- `pnpm exec vite build`: PASS, without PDF vendor regeneration.
- `cargo test --manifest-path src-tauri/Cargo.toml --lib`: 59/59 PASS, including legacy/null/future origin serialization, invalid-type rejection and retained-CFI merge provenance.
- Fresh Terra high task review and test-fix re-review: PASS. Astra high whole-change static review: PASS. Reviews did not execute tests.
- `git diff --check` and 678-row ledger recount: PASS; parent coverage remains 61 covered / 405 partial / 77 gap / 135 not-applicable, with 54 primary tasks.

Browser suite inputs used with `BR1_PLAYWRIGHT_CHANNEL=chrome pnpm exec playwright test`
and `--project=chromium --workers=1 --retries=0 --max-failures=1`:

- Focused: `tests/e2e/ruby-selection-compat.spec.ts tests/e2e/warichu-compat.spec.ts tests/e2e/footnote-mapping.spec.ts`.
- Broader: `tests/e2e/footnote-compat.spec.ts tests/e2e/authored-text-compat.spec.ts tests/e2e/txt-chapters.spec.ts`.

The additional KOReader helper run used:

```sh
pnpm exec svelte-kit sync
pnpm exec tsc -p tsconfig.json --outDir /tmp/br1-c13b1-final-koreader-tests --noEmit false
node --test /tmp/br1-c13b1-final-koreader-tests/src/lib/services/koreaderSync.test.js
```

The first browser run stopped with nine passing cases and a premature popup
persistence assertion: its label selector matched the always-present inspector
button while the action still displayed its pending status. The test now waits
for the actual save-completion status before checking the same CFI/origin.
No production change or weaker persistence assertion was used to resolve it.
The final browser run passed 14/14, followed by 47/47 broader cases.

Luna executed diagnostics. Logs and the before/final 14-file source/test hash
manifests are `/tmp/br1-c13b1-final2-*`; unchanged 104-helper and 9-KOReader
evidence is in `/tmp/br1-c13b1-final-{reader-helpers,koreader-sync}.log`.
The final code/test hashes remained fixed throughout the final run. The
task-created `build/` was removed; existing `.svelte-kit/`, `test-results/` and
Rust caches were retained, and port 4173 was released. Foliate is unchanged.

These checks do not prove packaged Tauri/WebKit behavior, OS clipboard delivery,
historical locator replay or migration. At B1 close, the next slice was C13B2.

## B2a Verification

Final3, after the bookmark load-protection repair:

- `pnpm check`: PASS, zero errors/warnings. Strict standalone TypeScript check
  of `tests/e2e/bookmark-origin.spec.ts`: PASS with the installed Node type root.
- `pnpm exec tsc -p tsconfig.json --outDir /tmp/br1-c13b2a-tests --noEmit false`
  followed by `node --test` on the 13 helper files listed in
  `test:reader-helpers`: 126/126 PASS, including 10 bookmark and 12 KOReader cases.
- Chrome Playwright, one worker, zero retries: 17 focused cases (bookmark origin,
  ruby selection, Warichu evidence and footnote mapping), 47 broader cases
  (footnote/authored-text/TXT), and the existing library bookmark smoke: 65/65 PASS.
- `pnpm exec vite build`: PASS without PDF vendor regeneration.
- `cargo test --manifest-path src-tauri/Cargo.toml --lib`: 61/61 PASS.
- Terra high task/fix reviews and Astra high whole-change static review: PASS.
  Static review caught both origin validation after field selection and the
  failed-load overwrite path; both were repaired before this final run.
- `git diff --check`, independent 16-file source/test/config hash verification
  and ledger recount: PASS. The 678 unique rows remain 61 covered / 405 partial /
  77 gap / 135 not-applicable, with 54 primary tasks. Parent `ebbbf104b` is partial.

The initial helper run could not resolve Svelte from the temporary output tree.
The harness now links the existing dependencies; two runtime imports use explicit
`.js` extensions. The first standalone spec check lacked Node type discovery and
was rerun with the existing installed type root. No dependency was added and no
assertion was weakened. Earlier 121-helper evidence predates the load guard and
is superseded by Final3, not counted again.

Luna ran the checks. Logs and before/after hashes are
`/tmp/br1-c13b2a-*final3*`; all 16 code/test/config hashes stayed fixed during the
final run and were independently rechecked afterward. The task-created `build/`
was removed, port 4173 was released, and existing caches were retained. Foliate
remains unchanged and clean at the revision above.

Native callback helpers and Rust unit tests are not packaged Tauri/WebKit
acceptance. No historical migration/replay, library progress provenance or
Warichu layout is claimed. Next executable slice: **S2-R04C13B2b**.

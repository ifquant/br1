# S2-R04C12: Ruby Selection and Copy

## Source and Ownership

Approved next slice after the pending-load teardown follow-up. Starting points:
br1 `6f31195a890a297ca1eab6af3e3779b00d3354b3` and sibling foliate-js
`37edf61c6e94bd737812f6ae3e6184c57e992cbe`.

Readest `9a05935cafe70b332e35b8b601c85d8eec4aaf37` changes two host files:
all-language annotation text excludes `rt`, native selection excludes `rt`,
and `rp` is hidden. It deliberately preserves ruby DOM instead of using the
earlier transformer/pseudo-element approach. There is no Foliate gitlink move.

br1 owns this change at its existing reader styles and Range-to-action-text
boundary. No dependency, EPUB resource transform, PDF vendor, or sibling
Foliate changes are required.

## Frozen Contract

- Ruby remains rendered and present in the original DOM. Base-only action
  text excludes `rt` and hidden `rp`, regardless of book language.
- Original Range boundaries and source text still determine CFIs and popup
  provenance. Filtered string lengths must never become source offsets.
- Partial ranges, including ranges wholly inside annotations, use the same
  extraction rule. Plain text, PDF extraction and TXT remain unchanged.
- Footnote previews preserve safe ruby structure through the existing
  attribute-stripping whitelist; raw correspondence checks remain exact.
- Selection-driven TTS retains its previous raw-text input. Chapter TTS and
  search continue to see the unchanged source DOM.
- Any native copy interception is synchronous and restricted to an owned,
  noneditable ruby selection. Mock clipboard events do not prove OS clipboard
  or packaged WebView acceptance.

## Verification

Initial `pnpm check` passed with zero errors/warnings; standalone test TypeScript
also passed. The first browser run stopped in the test fixture: a detached
`createHTMLDocument` has no native Selection. One case failed and two were not
run. This is not product RED evidence. The fixture was changed to connected
page nodes before the next run.

Terra high source review found a real copy-event gap: events targeted at the
document body or focused button do not bubble down into the popup's content
element. The existing document listener now receives copy and validates that
the live range belongs wholly to its own preview. The review also removed a
redundant partial-range extraction algorithm: native `cloneContents` already
preserves partially contained ruby ancestors. Source fix re-review passed;
final test and whole-change review gates were still pending at that checkpoint.

Candidate 2 passed the extraction case, then failed the actual EPUB copy click:
the toolbar was outside the viewport (one failed, one passed, one not run).
The existing bottom-center placement used the full stage bottom even when the
embedded stage extended below the window. Its shared positioning function now
clamps that bottom to the visible window. The regression keeps the 1280x720
viewport and normal clicks; no forced click or enlarged-window bypass is used.
Log: `/tmp/br1-c12-focused2.log`.

Candidate 3 focused browser verification: **4/4 PASS**, Chrome, one worker,
zero retries. It covers the Range matrix and guarded copy; real EPUB action
text, exact raw CFI and selection TTS; body-targeted popup copy and pristine
mapping; and native PDF copy pass-through. The PDF guard is challenged with
inert test-owned ruby added to a real PDF document, not claimed as authored PDF
ruby support. Log: `/tmp/br1-c12-focused3.log`.

The 1280x720 screenshot was inspected: furigana remains above the selected
base text and the action toolbar is inside the visible window. The test also
asserts its bounds and clicks normally. Terra source and test reviews pass.
Broader regressions, final static/build checks and Astra review subsequently
passed on the same candidate; see final acceptance below.

## Final Acceptance

| Gate | Result |
|---|---|
| New ruby selection / EPUB / popup / PDF cases | 4/4 PASS |
| Existing authored text / directional flow | 6/6 and 5/5 PASS |
| Existing resource lifetime and three C11 suites | 23/23 and 11/11 PASS |
| Existing footnote behavior / provenance mapping / TXT | 34/34, 7/7 and 7/7 PASS |
| Unique browser cases | 97/97 PASS, Chrome, one worker, zero retries |
| `pnpm test:reader-helpers` | 99/99 PASS |
| `pnpm check` | PASS, zero errors/warnings |
| `pnpm exec tsc --noEmit --strict` | PASS |
| Standalone new-spec strict TypeScript | PASS, existing Node 20 type roots |
| `pnpm exec vite build` | PASS, no vendor regeneration |
| Independent review | Terra task-level and Astra whole-change source review PASS |

Browser invocation used `BR1_PLAYWRIGHT_CHANNEL=chrome pnpm exec playwright test`
with `--workers=1 --retries=0 --max-failures=1`. Focused results are in
`/tmp/br1-c12-focused3.log`; the nine existing suites are in
`/tmp/br1-c12-broad.log`. Static, helper and build logs share `/tmp/br1-c12-`.
The standalone spec check uses the already-installed
`node_modules/.pnpm/@types+node@20.19.37/node_modules/@types`, not a dependency
installation. No sibling ZIP test or packaged desktop build is claimed for C12.

All eight source files and the new test remained unchanged during final
verification. The before/final comparison in `/tmp/br1-c12-final-source.sha256`
matches these SHA-256 values:

| File | SHA-256 |
|---|---|
| `src/lib/reader/selectionText.ts` | `e77004d58ff15e24dab30792c872319f00ec9a55aed113f22734f5a557678712` |
| `src/lib/reader/foliate.ts` | `5b7cf6c379894cd9765df363a00cfd456badd3d99993c873249398277aade5f7` |
| `src/lib/reader/types.ts` | `9743b6bf125dce42a58423300b54c02f3e272a3e58fdbeb7acd84d4d2d486879` |
| `src/lib/reader/footnoteExcerpt.ts` | `2ccad3037dddc694df35f1958a070be166b5d7986527762a0e95ad2a1316670d` |
| `src/lib/components/reader/ReaderViewport.svelte` | `fdfafea8badbeb8f248425d49c8ca46c03d378fa9189787350ea448e21fb6fad` |
| `src/lib/components/reader/ReaderStage.svelte` | `2957431ded3dc0ca0e1f69219d072ac8a991730825104da98b1c3af8cf8a99ac` |
| `src/lib/components/reader/ReaderFootnotePopup.svelte` | `53a7ffece616e4c7e637890c13aa2309adfc0c663954cb05d226a617e9ea8f09` |
| `src/routes/reader/+page.svelte` | `6e34c53aca989491d7eb4f623423c2f829a75ee14108baefc7e7e77d587eaed2` |
| `tests/e2e/ruby-selection-compat.spec.ts` | `49b4b28c67440ceaee39a167f3f71af6676082ac930ac84db0868a5a53ab4e02` |

The unchanged existing suites retain their original assertions. Task-created
build output was removed and port 4173 is free; existing `.svelte-kit` and
`test-results` were preserved. The ledger was recounted: **678 unique commits,
61 covered, 405 partial, 77 gap, 135 not-applicable; 54 remaining primary task
IDs**. Only `9a05935ca` changes classification. Next is **S2-R04C13**, not started.

## Not Included

Warichu/Gezhu measured layout belongs to C13. Packaged Tauri, Safari/WebKit,
screen-reader output and operating-system clipboard acceptance are not implied
by browser DOM and mocked clipboard checks.

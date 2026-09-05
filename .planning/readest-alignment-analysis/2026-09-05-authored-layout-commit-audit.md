# S2-R04C Authored-Layout Commit Audit

Date: 2026-09-05

## Scope and evidence boundary

This is a read-only upstream audit of the Readest commits mapped to S2-R04C in
[`2026-09-02-readest-high-priority-audit.md`](./2026-09-02-readest-high-priority-audit.md).
Each entry below was resolved with `git show --stat` plus the relevant patch in
`/Users/dev/workspace2/hc_apps/readest`. Every `packages/foliate-js` gitlink move
was then expanded as an old-to-new range inside Readest's nested foliate checkout.

The original task summary listed 31 commits, while its decision table assigned
**34** commits to S2-R04C. The central summary now also includes `458ad7510`,
`9dc41e7ad`, and `07371ccce`. The upstream evidence below is source-audited;
local implementation and verification are recorded separately for C1-C5.

## Frozen and provisional slices

| Slice | Ownership and bounded outcome | Commits | Audit disposition |
|---|---|---|---|
| **S2-R04C1** | Code literal rendering plus Persian/Arabic BiDi sanitization | `69599e2bc`, `44953f568`, `2f9262e02`; decisions for `6626db967`, `86493e801` | Complete: first three covered, two skip-link fixes not-applicable because br1 injects no equivalent skip link. |
| **S2-R04C2** | Russian short-word non-breaking spaces | `370a51662` | Complete: metadata-gated prose rule, valid XHTML output, and representative EPUB/CFI regression. |
| **S2-R04C3** | Footnote recognition and guarded extraction | `87f0240b0`, `b223ccaee`, `54aa20d4f` | Complete at the native host owner, with real-reader regressions and explicit inactive-library boundaries. |
| **S2-R04C4** | Footnote popup visual integrity | `1d8ed3fc9`, `d6e981e56` | Native background-isolation proof; the exact custom-font/namespace ordering bug is not-applicable. No new popup renderer or source-aside hiding policy. |
| **S2-R04C5** | Footnote popup sizing and stale-load lifecycle | `7c0419961` | Native text-scope equivalent with cleaned-empty navigation fallback. Popup images and late-image sizing are excluded, not claimed as full rich-media parity. |
| **S2-R04C6** | Visual cue for in-page footnote landings | `dbe0dae0a` | Provisional standalone navigation-feedback slice. |
| **S2-R04C7** | Jump from popup to the visible book target | `aab58241d` | Provisional standalone popup-navigation slice. |
| **S2-R04C8** | Footnote-popup selection, CFI mapping, and annotation tools | `631cd6454` | Provisional standalone cross-document selection slice. |
| **S2-R04C9** | Shared EPUB resource lifetime across reader and popup views | `a193cbc35` | Provisional renderer-lifetime slice; requires the exact foliate refcount behavior. |
| **S2-R04C10** | Reflowable vertical/RTL detection, navigation, and restore | `caa0d719c`, `23d5f3363`, `676e14234` | Provisional directional-flow slice. Ignore unrelated locale and submodule churn in the Readest commits. |
| **S2-R04C11** | Horizontal page-turn presentation for vertical-rl books | `c5304cd46` | Provisional standalone paginator/input slice; large behavior surface. |
| **S2-R04C12** | Ruby/furigana selection and copy semantics | `9a05935ca` | Provisional small CJK selection slice. |
| **S2-R04C13** | Warichu/Gezhu transformation and measured column layout | `ebbbf104b` | Provisional standalone CJK layout slice; do not merge with the smaller ruby work. |
| **S2-R04C14** | Fixed-layout spread seam, zoom-out visibility, and text autosizing | `17e60f1e4`, `42c7a2cb0` | Provisional FXL rendering slice. |
| **S2-R04C15** | Fixed-layout vertical-pan gesture ownership | `6807664e9`; evidence-only `db1d63cdc` | Provisional. `db1d63cdc` changes only test timing and has no product behavior to port. |
| **S2-R04C16** | Fixed-layout RTL spread order and PDF direction | `a6e6691c8` | Provisional product/renderer contract slice. |
| **S2-R04C17** | IDPF EPUB 3 compatibility bundle | `07371ccce` | Provisional umbrella only; execute as C17a inline MathML, C17b `epub:switch`, C17c headless SVG font guard, and C17d bitmap-spine viewport sizing. |
| **S2-R04C18** | Final Duokan fullscreen-cover behavior | `cf44e8518`, `a9526377a`, `6469cbb5b` | Provisional. Implement the final `6469cbb5b` semantics, not the superseded stretch decision. |
| **S2-R04C19** | Wide EPUB table overflow and input ownership | `458ad7510` | Provisional standalone table slice. |
| **S2-R04C20** | EPUB reference page labels and manual fallback | `9dc41e7ad` | Provisional page-list/product slice. |
| **S2-R04C21** | Script-created media URL resolution and lifetime | `5aae8d6c5` | Provisional dynamic-resource slice; only applies when book scripting is allowed. |

## Commit-to-subtask map

| Commit | Subtask | Status note |
|---|---|---|
| `69599e2bc` | C1 | Covered: computed styles and unchanged text/range copy. |
| `44953f568` | C1 | Covered: literal and entity direction marks preserved; no local invisible-paragraph classifier. |
| `2f9262e02` | C1 | Covered: contextual prose RLM runs become equal-length ZWNJ; literal-content boundaries preserved. |
| `6626db967` | C1 | Frozen N/A decision: end skip link does not exist locally. |
| `86493e801` | C1 | Frozen N/A decision: reading-position skip link does not exist locally. |
| `370a51662` | C2 | Covered: exact word rule with metadata-only language gating, literal exclusions, and valid numeric XHTML entities. |
| `87f0240b0`, `b223ccaee`, `54aa20d4f` | C3 | Covered at the native host owner: inert vendor text, validated numeric targets, and numeric-list rejection. |
| `1d8ed3fc9`, `d6e981e56` | C4 | Popup visual integrity. |
| `7c0419961` | C5 | Popup sizing/lifecycle. |
| `dbe0dae0a` | C6 | In-page target flash. |
| `aab58241d` | C7 | Popup-to-book jump. |
| `631cd6454` | C8 | Popup selection/CFI mapping. |
| `a193cbc35` | C9 | Shared loader refcount. |
| `caa0d719c`, `23d5f3363`, `676e14234` | C10 | Reflowable vertical/RTL flow. |
| `c5304cd46` | C11 | Vertical-rl horizontal turns. |
| `9a05935ca` | C12 | Ruby/furigana. |
| `ebbbf104b` | C13 | Warichu/Gezhu. |
| `17e60f1e4`, `42c7a2cb0` | C14 | FXL rendering. |
| `6807664e9`, `db1d63cdc` | C15 | FXL input boundary; second commit is evidence-only. |
| `a6e6691c8` | C16 | FXL RTL page order. |
| `07371ccce` | C17a-d | Four independently executable IDPF behaviors. |
| `cf44e8518`, `a9526377a`, `6469cbb5b` | C18 | Duokan chain; middle decision superseded. |
| `458ad7510` | C19 | Wide tables. |
| `9dc41e7ad` | C20 | Reference pages. |
| `5aae8d6c5` | C21 | Dynamic resources. |

## Per-commit evidence

### C1 and C2: frozen first-six findings

| Commit | Readest stat | Exact upstream behavior | Relationship / gitlink |
|---|---:|---|---|
| `6626db967` | 2 files, +71/-1 | Changes the end-of-section accessibility node from `<div>` to `<span>`. The node is nested in the last content element; `<span>` remains inside the paragraph override selector's inline-tag allowlist, so a paragraph-like final `<div>` keeps line spacing, word/letter spacing, indent, and hyphenation. | No foliate move. Distinct from `86493e801`; frozen N/A locally. |
| `370a51662` | 4 files, +265 | For normalized language `ru`, changes U+0020 to U+00A0 after any one/two-character Cyrillic word or a configured longer function word, only when followed by Cyrillic or a Unicode number. It processes raw text between tags, skips complete `style`/`script` blocks, repeats until stable, and preserves UTF-16 length. It runs after whitespace normalization and `simplecc`, before proofread/warichu. | No foliate move. Covered in C2 using the existing sanitized DOM traversal, not a second raw-markup parser. |
| `69599e2bc` | 1 file, +1 | Adds `font-variant-ligatures: none` to `pre, code, kbd`; glyph shaping changes while source, selection, and copied text remain unchanged. | No foliate move. Active C1. |
| `44953f568` | 2 files, +12/-2 | After whole-document sanitization/XML serialization, restores hex/decimal LRM entities to literal U+200E and RLM entities to literal U+200F. It also extends paragraph emptiness filtering through U+200F so direction marks are not meaningful content. | No foliate move. Required before `2f9262e02`; not superseded. |
| `2f9262e02` | 2 files, +59 | Replaces each U+200F in an RLM run with one U+200C only when the run is between characters in the exact broad ranges `0600-065F`, `066A-06EF`, `06FA-06FF`, `FB50-FDFF`, or `FE70-FEFC`. Arabic/Persian digit ranges are excluded; Latin-adjacent and boundary RLMs remain. Length is preserved. The class is broader than Unicode letters and includes some marks/punctuation. | No foliate move. Cumulative follow-on to `44953f568`. |
| `86493e801` | 1 file, +8/-1 | Changes the reading-position skip link from `left: 0` to `left: auto`. The absolute 1x1 node then stays at its static first-column position instead of extending an RTL section's Range measurement across the expanded iframe and leaving phantom pages after relayout. | No foliate move. Distinct from `6626db967`; frozen N/A locally. |

Russian configured words in `370a51662` are:

`без`, `для`, `близ`, `под`, `над`, `про`, `при`, `ради`, `сквозь`, `среди`,
`через`, `около`, `перед`, `после`, `между`, `кроме`, `вокруг`, `против`,
`вместо`, `внутри`, `возле`, `или`, `либо`, `ибо`, `если`, `едва`, `дабы`,
`чтобы`, `чтоб`, `хотя`, `пока`, `зато`, `тоже`, `также`, `итак`, `как`,
`что`, `чем`, `так`, `даже`, `лишь`, `ведь`, `вот`, `вон`, `уже`, `хоть`,
`разве`, `только`, `именно`, `неужели`.

### C3-C9: footnotes

| Commit | Readest stat | Exact upstream behavior | Relationship / gitlink |
|---|---:|---|---|
| `87f0240b0` | 8 files, +6/-84 | Adds the first descendant image's `alt` to the no-navigation vendor-marker path, not href target extraction. Priority is `data-wr-footernote`, `zy-footnote`, descendant image `alt`, marker `alt`, clicked element `alt`. The four vendor classes include a no-href Duokan anchor; Readest renders the string via `textContent`. Unrelated continuous-scroll removal is not part of C3. | No foliate move. |
| `b223ccaee` | 2 files, +4/-1 | Marks anchors matching `^.{0,2}\d+$` as deferred `check` candidates. Nested Foliate accepts `maybe() || check`; after inline-ancestor extraction it accepts semantic note/list/definition branches. Only the generic descendant-link branch requires at most three direct element children; a generic no-link target is rejected. Missing/malformed targets fall back to ordinary navigation. This is a structural heuristic, not a content-size security limit. | `7657c78bd..2bf0cecfc`: one nested commit, deferred validation in `footnotes.js`. |
| `54aa20d4f` | 3 files, +119/-1 | Replaces the bare numeric test with `shouldCheckAsFootnote`. It rejects a candidate when any of the first three ancestor containers contains at least two *other* short-numeric links, preventing numeric chapter/verse lists from opening as footnotes. | No foliate move. Refines `b223ccaee`; both rules are needed for the final detector. |
| `1d8ed3fc9` | 2 files, +2/-1 | Sets `no-background` on the popup renderer. Foliate observes that attribute and skips document background-image sizing/replacement, so an authored background is not treated as popup content. | `f860916a2..af4f384b7`: adds the paginator `no-background` contract and changes scrolled horizontal page-margin variables. Background proof is C4; the remaining margin obligation keeps this parent partial under S2-U01B. |
| `d6e981e56` | 2 files, +25/-7 | Moves `@namespace epub` to the first line of the assembled reader stylesheet, before custom `@font-face` rules. This keeps `aside[epub|type~=footnote]` valid and hidden when custom fonts are loaded. | No foliate move. |
| `7c0419961` | 2 files, +272/-32 | Uses a `ResizeObserver` to keep popup height fitted after content settles; seeds alt-text popup size without a later 88px overwrite; disconnects stale observers and ignores superseded loads; shows image/element-only popups from measured content even when foliate emits no relocate event. | No foliate move. Standalone lifecycle behavior. |
| `dbe0dae0a` | 5 files, +176/-58 | Generalizes the transient search marker into an href/range highlighter and flashes the target after default in-page navigation, failed popup extraction fallback, and links followed inside a popup. Timers are cleared on replacement/unmount. | No foliate move. |
| `aab58241d` | 4 files, +442/-23 | Adds popup-to-book navigation and flashes the destination. It offers the jump only when the target is not hidden by reader footnote styles (ancestor computed-style walk); the final revision floats controls over text with pointer-transparent chrome rather than reserving blank padding. | No foliate move. |
| `631cd6454` | 10 files, +914/-68 | Maps selections from the extracted popup DOM back to pristine-section CFIs, enables applicable selection/annotation tools, redraws popup highlights/notes, validates CFI before save, rejects cross-section notes early, normalizes element boundaries, and guards async selection state with an epoch. Synthetic alt/data text has no CFI, so anchoring actions and TTS remain disabled there. | `9fde61a10..57c9358ad`: foliate exports CFI serialization/range building and emits section index plus extraction mapping. |
| `a193cbc35` | 2 files, +167/-1 | Fixes top-level EPUB loader references so opening/dismissing a second view cannot decrement a still-live reader section to zero and revoke its image/blob URLs. `loadItemXHTMLContent` reuses the caller's held section reference to avoid leaking an unmatched count. | `57c9358ad..c1f0c3c55`: exact loader refcount fix; Readest adds focused shared-view lifetime tests. |

### C10-C13: directional flow and CJK

| Commit | Readest stat | Exact upstream behavior | Relationship / gitlink |
|---|---:|---|---|
| `caa0d719c` | 34 files, +916/-36 | Both host and paginator direction detection fall back from a horizontal/empty body writing mode to the first direct body child not marked `cfi-inert`, accepting only `vertical-rl` or `vertical-lr`. The large stat includes unrelated locale updates. | `68f454a6e..9a0c1c6f5`: one nested `paginator.js` commit with the same child fallback. |
| `23d5f3363` | 6 files, +28/-63 | Stops swapping semantic previous/next handlers in RTL; buttons keep semantic actions while only icons mirror. Direct footer paging calls renderer `prev()`/`next()`, and input pagination uses `viewSettings.rtl` instead of only `book.dir`. Foliate removes `row-reverse` from the RTL container. | `ec7e16aa4..183f296aa`: one nested RTL layout commit. The gstack gitlink change is unrelated. |
| `676e14234` | 1 file, +1/-1 | Readest only advances foliate. The nested paginator mirrors a rect inside the target iframe/view width, not total loaded-view width, so adjacent-section preload cannot shift an RTL restore and overwrite progress. | `cc8668852..70d77aa74`: one nested rect-mapper commit. |
| `c5304cd46` | 3 files, +283/-1 | Presents vertical-rl pagination as horizontal RTL input: drag tracking, threshold/flick commit or settle, two-phase horizontal animation, instant e-ink/nonanimated path, mirrored keys/taps/wheel, stale-animation generation guard, and positive vertical scroll coordinates. Legacy predominantly vertical swipes remain. | `0f8570712..cecaef95b`: one large nested `paginator.js` implementation; Readest adds browser fixtures/tests. |
| `9a05935ca` | 2 files, +13/-2 | Adds `rt { user-select: none }` and hides `rp`; extracted annotation/translation/copy text always excludes `rt`. Furigana stays in the DOM for TTS, search, and accessibility. | No foliate move. Final commit deliberately drops an earlier DOM-rewriting transformer approach. |
| `ebbbf104b` | 6 files, +985/-1 | Transforms `span.warichu`/`span.warichuu` and `<warichu>` into pending placeholders, sanitizes layout-affecting nested markup, measures column position, and splits annotations into two-character inline-block chunks so vertical columns can break without large gaps. Relayout runs after stabilization and resize; helper fixes preserve open tags and treat entities as one visible character. | No foliate move. Standalone, high-complexity behavior; not a small CSS-only fix. |

### C14-C17: fixed layout and IDPF compatibility

| Commit | Readest stat | Exact upstream behavior | Relationship / gitlink |
|---|---:|---|---|
| `17e60f1e4` | 2 files, +56/-1 | Overlaps the right page of a real two-page spread by one device pixel (`-1 / devicePixelRatio`) to hide compositor seams, excluding centred/portrait/blank-padded cases. Below 100% zoom, only PDF pages use flex centering; non-PDF fixed-layout iframes stay in block flow so their transformed content remains visible. | `0fa407c4c..0f8570712`: one nested `fixed-layout.js` commit; Readest adds helper tests. |
| `42c7a2cb0` | 2 files, +12 | Injects both `-webkit-text-size-adjust: none` and `text-size-adjust: none` into fixed-layout document styles, preventing Android Blink text autosizing from shifting absolutely positioned text. | No foliate move. |
| `6807664e9` | 3 files, +83/-2 | Replaces the `zoomLevel <= 100` menu-toggle proxy with the renderer's actual vertical-overflow test. A vertical swipe toggles bars only when the fixed-layout page cannot pan vertically. | No foliate move. |
| `db1d63cdc` | 1 file, +15/-6 | Changes only a wheel regression test: compares `scrollTop` synchronously around event dispatch so asynchronous page-gap re-anchoring cannot cause a false CI failure. | No foliate move and no product delta. Evidence-only, not an implementation gap. |
| `a6e6691c8` | 44 files, +365/-38 | Adds a per-book fixed-layout "Right-to-Left Pages" control backed by the existing writing-mode setting, repairs the settings shortcut's active-book key, derives renderer RTL from document direction, and detects PDF `/ViewerPreferences /Direction /R2L`. The large stat includes translations and test configuration. | `68d54b1bd..2691386dc`: one nested `pdf.js` commit exposing R2L as `book.dir`. |
| `07371ccce` | 12 files, +291/-14 | Four behaviors: keep sole-child MathML inline through inline wrappers and remove `math` from `white-space: pre-wrap`; resolve EPUB 3 `epub:switch` to the first natively supported XHTML/SVG/MathML case or default before sanitization; skip custom/additional font mounting when an SVG document has no head; reject nonnumeric synthetic image viewport metadata and fall back to book/natural bitmap dimensions. | `c09f06da4..79191075d`: one nested bitmap-spine viewport commit. Split local execution into C17a-d. |

### C18-C21: Duokan, tables, page list, and dynamic resources

| Commit | Readest stat | Exact upstream behavior | Relationship / gitlink |
|---|---:|---|---|
| `cf44e8518` | 4 files, +9/-3 | Initially changes fullscreen images to `object-fit: contain` and SVG to `preserveAspectRatio=meet`; also adds Duokan gallery-cell sizing and removes the mobile bottom-margin override. | `554b4bf2b..4460d75ae`: one nested contain/meet commit. The cover-fit decision is later revised; auxiliary app changes are not shown as reverted here. |
| `a9526377a` | 2 files, +20/-1 | Reverses paginated Duokan fullscreen covers to `object-fit: fill` and SVG `preserveAspectRatio=none`, intentionally distorting them edge-to-edge. | `18d304bd6..828d6132e`: one nested stretch commit. **Superseded by `6469cbb5b`.** |
| `6469cbb5b` | 3 files, +40/-8 | Final behavior restores aspect-preserving `contain`, paints the image box black for letterboxing, forces intermediate wrappers to `position: static` so the pinned image does not collapse, clears those temporary styles in scrolled mode, and seeds scroll bounds for rect-less/zero-content cover anchors so the first swipe works after restore. | `df623dbe6..f6bce4ce8`: two nested commits, `4088d28` (letterbox/wrapper) and `f6bce4c` (rect-less anchor bounds). This is the controlling cover decision. |
| `458ad7510` | 6 files, +479/-115 | Replaces transform scaling with an overflow wrapper. Genuinely wide tables scroll horizontally; fitting/layout tables clip only <=4px slop after ResizeObserver measurement. Capture-phase touch/wheel routing gives a scrollable table ownership of horizontal gestures, including wheel momentum at an edge, and uses cross-realm-safe `closest` lookup. | No foliate move. Requires real iframe input and fitting/wide fixtures; not covered by generic reader smoke. |
| `9dc41e7ad` | 43 files, +340/-38 | Adds reference-page progress. With `pageList`, it displays the current `pageItem.label` and uses the maximum all-digit label as total; without a page list it maps reading fraction with `ceil` to a per-book manual count, clamped to 1..total; otherwise it falls back to percentage. | No foliate move. Foliate parsing already existed; the Readest delta consumes and persists it. |
| `5aae8d6c5` | 5 files, +393/-1 | When scripting is allowed, observes post-load `src`, `poster`, and inline `url()` references, temporarily parks failing sources, resolves each reference once relative to the section, and ignores stale async results if script changed the source. The resource is loaded as a section child and released with it. | `2b6ea0a25..c09f06da4`: one nested `epub.js` commit exposing `section.loadHref(href)` through the loader. |

## Nested foliate gitlink ranges

The following are the only S2-R04C commits in this 34-row set that move
`packages/foliate-js`. A blank entry is therefore not a hidden generic bump.

| Readest commit | Gitlink range | Nested commit(s) | Exact renderer behavior |
|---|---|---|---|
| `caa0d719c` | `68f454a6e..9a0c1c6f5` | `9a0c1c6` | Detect vertical writing mode on the first non-CFI-inert body child. |
| `23d5f3363` | `ec7e16aa4..183f296aa` | `183f296` | Remove RTL `row-reverse` from paginator container layout. |
| `b223ccaee` | `7657c78bd..2bf0cecfc` | `2bf0cec` | Accept deferred footnote validation and reject implausible checked extraction targets. |
| `1d8ed3fc9` | `f860916a2..af4f384b7` | `af4f384` | Add `no-background` getter/observed attribute and guards for image sizing/background replacement. Also change scrolled horizontal `--page-margin-left/right` to half margin plus half gap; that outstanding obligation is assigned to S2-U01B. Paginated formula extraction is equivalent. |
| `cf44e8518` | `554b4bf2b..4460d75ae` | `4460d75` | Set fullscreen image/SVG fitting to contain/meet. |
| `676e14234` | `cc8668852..70d77aa74` | `70d77aa` | Mirror RTL rects in the target view's local width during restore. |
| `a9526377a` | `18d304bd6..828d6132e` | `828d613` | Stretch paginated Duokan covers with fill/none; later superseded. |
| `17e60f1e4` | `0fa407c4c..0f8570712` | `0f85707` | One-device-pixel spread overlap and non-PDF zoom-out block flow. |
| `c5304cd46` | `0f8570712..cecaef95b` | `cecaef9` | Horizontal drag/animation/input semantics for vertical paginated books. |
| `6469cbb5b` | `df623dbe6..f6bce4ce8` | `4088d28`, `f6bce4c` | Final Duokan letterbox/wrapper behavior plus rect-less anchor scroll-bound seeding. |
| `a6e6691c8` | `68d54b1bd..2691386dc` | `2691386` | Surface PDF ViewerPreferences R2L as `book.dir`. |
| `631cd6454` | `9fde61a10..57c9358ad` | `57c9358` | Emit popup extraction mapping and export CFI range helpers. |
| `a193cbc35` | `57c9358ad..c1f0c3c55` | `c1f0c3c` | Count top-level section references and reuse held content-load references. |
| `5aae8d6c5` | `2b6ea0a25..c09f06da4` | `c09f06d` | Expose section-relative `loadHref` with section-owned lifetime. |
| `07371ccce` | `c09f06da4..79191075d` | `7919107` | Ignore synthetic nonnumeric image viewport metadata; use natural/book dimensions. |

## Superseded, cumulative, and evidence-only decisions

- `a9526377a`'s stretch-to-fill decision is superseded by `6469cbb5b`'s
  aspect-preserving black letterbox. Do not reproduce the intermediate state.
- `cf44e8518`'s contain decision aligns with the final fit mode, but its later
  controlling behavior comes from `6469cbb5b`; its gallery sizing and mobile
  margin change are separate residual changes and need local ownership review.
- `44953f568` and `2f9262e02` are cumulative, not duplicates: the former
  restores literal direction marks; the latter contextually rewrites only
  misused RLM runs.
- `6626db967` and `86493e801` fix different skip links and different failures,
  but both are N/A under the frozen C1 decision because the base feature is absent.
- `b223ccaee` and `54aa20d4f` are cumulative detector changes: the second
  narrows false positives introduced by the first.
- `db1d63cdc` is test hardening only. It proves no new runtime capability and
  should not create an implementation placeholder.

## Execution and acceptance

Continue with **S2-R04C6**. Each slice starts by checking current local callers
and reproducing its concrete failure. Port the final upstream behavior at the
existing host or foliate owner, then run focused browser tests, `pnpm check`,
`pnpm build`, and `git diff --check`. A source-only applicability decision needs
an explicit owner explanation rather than a manufactured runtime test.

| Slice | Minimum behavior to prove before closure |
|---|---|
| C2 | Russian-only short/function-word NBSP, consecutive matches, number successors, literal-content exclusions, and stable text length. |
| C3 | No-href vendor image-alt markers render inert text; checked `li`/`aside`/`dt`/enclosing-`li`/`.note` targets remain accepted, including over three children. Generic link-bearing targets accept at most three direct children; no-link/missing targets navigate normally. Numeric chapter/verse lists suppress only provisional checks. Cross-section resolution must not reuse a current-document ID. |
| C4 | Native popup content excludes authored backgrounds and layout attributes without changing preview size. The original namespace/custom-font criterion is not-applicable: br1 assembles neither custom font faces nor namespace-dependent hide selectors. This does not establish source-aside border suppression or custom-font parity. |
| C5 | Native-scope acceptance: long alt/rich-text excerpts remain scrollable through their final text; replacement and close do not revive superseded reads. Sanitized empty/image-only content uses existing explicit fallback or checked-link navigation. br1 intentionally excludes popup images; upstream image resizing/observer APIs are not ported, and full rich-media parity is not claimed. |
| C6 | In-page target cue appears and is cleared on replacement, close, or navigation. |
| C7 | Visible targets support popup-to-book jumps; hidden footnote targets do not offer misleading jumps. |
| C8 | Real popup selections map to original section CFIs; synthetic alt text cannot create anchored notes. |
| C9 | Repeated popup open/close preserves reader images and releases final blob references once all views close. |
| C10 | Body-child vertical detection, semantic RTL next/previous, and restore with adjacent preloaded sections. |
| C11 | Vertical-rl drag, wheel and keyboard page turns; cancelled/replaced animations cannot move a later book. |
| C12 | Ruby stays visible and accessible while selected/copied base text excludes furigana. |
| C13 | Measured warichu remains in two-line chunks across columns and font/viewport relayout. |
| C14 | Real two-page spread seam and zoom-out stay visible; fixed text does not autosize. |
| C15 | Overflowing fixed pages pan vertically without toggling bars; wheel tests observe synchronous ownership. |
| C16 | EPUB/PDF RTL page order, per-book direction persistence, and PDF R2L metadata agree. |
| C17a-d | Verify inline MathML, switch selection, headless SVG fonts, and bitmap natural dimensions independently. |
| C18 | Final contain/black-letterbox behavior preserves aspect ratio, restores first swipe, and clears styles in scrolled mode. |
| C19 | Wide tables pan horizontally without page turns; fitting tables do not consume normal pagination input. |
| C20 | EPUB page-list labels, all-digit totals, manual-count fallback, and reopen persistence. |
| C21 | First adjudicate applicability: br1 currently removes book scripts. Do not enable scripting merely to copy this feature. If supported later, prove relative dynamic resources and stale-result/lifetime guards. |

## Verification boundary

The upstream audit itself proves commit contents and 15 gitlink ranges, not
local runtime behavior. C1 separately passed three focused browser regressions,
three existing sanitizer/TXT regressions, `pnpm check` (0 errors/warnings),
`pnpm build`, and `git diff --check`, with independent Terra high and Astra high
reviews. No packaged Tauri/mobile, native clipboard, or font-pixel acceptance was
run. C6-C21 remain pending; their table entries are executable specifications,
not completion claims.

### C2 implementation boundary

The host reuses C1's sanitized text-node walker and literal-content exclusions.
It uses `pickText`'s first nonblank metadata language, trims it, and compares the
lowercase hyphen-primary code with `ru`. The upstream transform's 50-word list
and Unicode regex are retained, but Readest's broader primary-language alias
and user-override system is not imported: `rus`, `ru_RU`, missing metadata, and
`['en', 'ru']` do not activate C2. Document language attributes are not inference
inputs. Existing TXT/PDF paths and words split across elements remain untouched.

Only decoded U+0020 becomes U+00A0, leaving node structure and UTF-16 offsets
unchanged. XHTML emits `&#160;` because named `&nbsp;` in a DTD-less XML blob
causes a parser error. The same named entity remains valid in HTML, whose
serialization is unchanged. Source EPUB bytes are not rewritten.

C2 passed the six-case authored-text browser file (three C1 cases plus three
C2 cases), three selected existing sanitizer/TXT regressions, `pnpm check`
(0 errors/warnings), `pnpm build`, and `git diff --check`. The real EPUB fixture
loads its XHTML blob without parser errors, keeps source archive bytes unchanged,
and resolves a representative raw-document CFI in the transformed document.
Independent Terra high task review and Astra high final review passed.
At C2 closure, the ledger reconciled to 678 commits: 48 covered, 419 partial, 77 gap, and 134
not-applicable, with 64 remaining task IDs. No full annotation-persistence,
native clipboard, font-pixel, packaged Tauri, or mobile acceptance is claimed.

### C3 native behavior and nested dependency boundary

`ReaderViewport` remains the only footnote extraction owner. Ordinary anchors
use Foliate's resolved `link` event; unloaded destinations use the existing book
`resolveHref` and section `createDocument`, never a second popup view or a
current-document ID collision. Clones, including their roots, pass through the
existing tag/attribute allowlist. Vendor text uses Svelte's escaped text path.
The sanitizer retains `zy-footnote` only as inert metadata for that path.

The nested `2bf0cecfc` behavior is implemented here rather than patched into
the unused sibling `FootnoteHandler`. `li`/`aside`/`dt` and enclosing `li` before
`.note` bypass the child limit; the generic branch requires a descendant link
and at most three direct children, with the upstream trailing-range boundary.
Rejected or unresolved provisional targets use normal reader navigation.
Explicit local note classification remains stronger than the numeric heuristic;
general superscript-only inference is not introduced.

Six footnote cases, six authored-text regressions, and four existing reader
regressions passed (16/16), as did `pnpm check` (0 errors/warnings), `pnpm build`,
and `git diff --check`. The delayed-read fixture must use a destination beyond
the renderer's initial five-view window, then prove uncached/entered/completed
states. It also holds `next` while releasing an older numeric read and checks
that no stale popup or fallback `goTo` occurs. The added no-next-block range case
passed the six-case footnote rerun; a final `.note` fixture rename to avoid the
legacy ID heuristic passed its focused rerun. Production source was unchanged
by those fixture-only edits. Independent Terra high task review and Astra
high final review passed. At C3 closure, totals were 678 commits: 51 covered,
416 partial, 77 gap, 134 not-applicable, and 63 remaining task IDs.

C4-C9's visual, media, selection and resource-lifetime obligations remain
separate. No packaged Tauri/mobile or full concurrency stress is claimed.

### C4 native popup applicability

Readest `1d8ed3fc9` enables `no-background` on its separate Foliate popup.
br1 instead clones the selected excerpt in `ReaderViewport`, strips authored
styles, images and attributes, and presents only allowed markup in the native
`ReaderFootnotePopup`. The popup's own background and scroll limits remain
intentional. No paginator attribute or second popup renderer is needed here.

The nested range `f860916a2..af4f384b7` contains one commit, touching
`paginator.js` (+18/-9). Besides the background contract, its scrolled layout
changes both horizontal `--page-margin-left/right` variables from full margin
plus half gap to half margin plus half gap. The paginated hunk extracts
equivalent formulas into variables. br1's sibling still has the older scrolled
formula. Keep parent `1d8ed3fc9` partial under existing S2-U01B for this separate
spacing obligation; do not infer coverage from nearby `a43845b4c`.

Readest `d6e981e56` changes the order of rules in its host-assembled stylesheet;
it does not move the Foliate gitlink. br1's `getReaderViewStyles` has no injected
custom `@font-face`, `@namespace`, or namespace-dependent aside selector, and
its current settings select only serif/sans families. The exact ordering bug
is therefore not-applicable, not a claim that font support is complete.

Source-aside border suppression remains unimplemented. Adding `display: none`
would introduce a separate visibility policy: a descriptive link or a rejected
numeric marker may use normal navigation rather than a popup. Hiding its target
without a reveal contract could make the content inaccessible. Track that
decision separately; do not hide source content merely to emulate the repair.

The final browser run passed 13/13 (seven footnote tests and six authored-text
regressions). C4 compares same/cross-chapter previews at 1280px and 640px widths,
checks that embedded artwork loads and source styling is present, preserves the
source DOM, and verifies clean markup, stage containment and equal styled/plain
dimensions. Initial desktop-only width and absolute-viewport assertions were
corrected: C4 does not prove full reader layout inside a short-height viewport.
`pnpm check` passed with 0 errors/warnings, `pnpm build` passed (before later
test-only corrections), and `git diff --check` plus the ledger recount passed.
Fresh Terra high task review and Astra high final review passed.

At C4 closure: 678 commits, 51 covered, 415 partial, 77 gap, 135 not-applicable,
and 62 remaining task IDs. C4 is closed at its native owner; parent `1d8ed3fc9`
remains partial for the separate S2-U01B obligation. No packaged Tauri/mobile,
custom-font assembly, rich popup media, or source-aside hiding is claimed.

### C5 native sizing and empty-preview boundary

Readest `7c0419961` changes its popup and a focused sizing test, with no Foliate
gitlink movement. Its observer, animation frame, first-relocate measurement and
88px seed belong to a separate popup view that br1 does not create. The native
popup uses intrinsic CSS layout with `max-height: min(38vh, 260px)` and
`overflow: auto`; no second sizing state or observer is needed.

The applicable local defect is an empty preview after unsupported media is
removed. A nonempty string such as `<p><span></span></p>` previously suppressed
the jump fallback despite containing no text. The existing sanitizer now
derives HTML and normalized text from the same cleaned clone, and returns both
empty when no text remains. Explicit noterefs retain the existing jump action;
checked numeric links use existing ordinary navigation. Original source DOM
and images remain available in the reader.

The C4 text-and-allowed-markup boundary is retained. Image previews themselves
and late image sizing are not implemented, so the revised C5 criterion proves
native-scope equivalents, not full rich-media parity. The generation guard
already introduced in C3 remains the request owner; no new Stage cancellation
or observer infrastructure is introduced without a user-reachable failure.

Pre-fix regression reproduced the empty-body failure. Final footnote and
authored-text tests passed 15/15, and four existing footnote/sanitizer/TXT checks
passed. The first post-fix run exposed a too-short plaintext fixture (248px,
no overflow); extending that fixture retained the real wheel-to-scroll-bottom
assertion. Tests also preserve C3's replacement proof, add closing the fresh
popup before releasing an older read, and verify actual source-image navigation
for explicit and structurally accepted numeric links.

`pnpm check` passed with 0 errors/warnings; `pnpm build` passed before later
fixture-only changes. `git diff --check` and the 678-row recount passed. Fresh
Terra high task review and Astra high final review passed.

Current totals: 52 covered, 414 partial, 77 gap, 135 not-applicable, and
61 remaining task IDs. C5 is covered within the documented native text scope;
this does not add rich-media popup capability or change the separate nested
margin obligation under S2-U01B. Next: C6 in-page target feedback.

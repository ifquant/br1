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
local implementation and verification are recorded separately for C1-C7, C8A-C8D, C9, C10 and C11A.

## Frozen and provisional slices

| Slice | Ownership and bounded outcome | Commits | Audit disposition |
|---|---|---|---|
| **S2-R04C1** | Code literal rendering plus Persian/Arabic BiDi sanitization | `69599e2bc`, `44953f568`, `2f9262e02`; decisions for `6626db967`, `86493e801` | Complete: first three covered, two skip-link fixes not-applicable because br1 injects no equivalent skip link. |
| **S2-R04C2** | Russian short-word non-breaking spaces | `370a51662` | Complete: metadata-gated prose rule, valid XHTML output, and representative EPUB/CFI regression. |
| **S2-R04C3** | Footnote recognition and guarded extraction | `87f0240b0`, `b223ccaee`, `54aa20d4f` | Complete at the native host owner, with real-reader regressions and explicit inactive-library boundaries. |
| **S2-R04C4** | Footnote popup visual integrity | `1d8ed3fc9`, `d6e981e56` | Native background-isolation proof; the exact custom-font/namespace ordering bug is not-applicable. No new popup renderer or source-aside hiding policy. |
| **S2-R04C5** | Footnote popup sizing and stale-load lifecycle | `7c0419961` | Native text-scope equivalent with cleaned-empty navigation fallback. Popup images and late-image sizing are excluded, not claimed as full rich-media parity. |
| **S2-R04C6** | Visual cue for in-page footnote landings | `dbe0dae0a` | Shared native navigation completion with a four-second visual-only target cue; popup-internal links remain absent. |
| **S2-R04C7** | Jump from popup to the book target unless known hidden | `aab58241d` | Native preview action with original-target ancestor styles and upstream unknown-default-allow policy; not pre-rendered visibility proof. |
| **S2-R04C8** | Footnote-popup selection, CFI mapping, and annotation tools | `631cd6454` | Complete within the frozen native contract: C8A provenance, C8B validated selection, C8C scoped actions/persistence and C8D reverse mapping/record interactions. |
| **S2-R04C9** | Shared EPUB resource lifetime across reader and popup views | `a193cbc35` | Complete: exact Loader count/content-read fix plus native paginator single-release ownership, proved through shared-view and actual br1 resource lifetimes. |
| **S2-R04C10** | Reflowable vertical/RTL detection, navigation, and restore | `caa0d719c`, `23d5f3363`, `676e14234` | Complete within the frozen same-direction reflowable contract: native detection, semantic controls and visible CFI restoration after real preload/reopen. Mixed-direction lifecycle and C11 gestures remain separate. |
| **S2-R04C11** | Horizontal page-turn presentation for vertical-rl books | `c5304cd46` | C11A default instant input/coordinates complete; next C11B drag/animation lifecycle. Parent remains partial until both contracts pass. |
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
| `aab58241d` | 4 files, +442/-23 | Adds popup-to-book navigation and flashes the destination. It rejects rendered targets whose ancestor computed styles have `display:none` or `visibility:hidden`; unrendered, unresolved and inspection-error cases deliberately retain navigation. The final revision floats controls over text with pointer-transparent chrome rather than reserving blank padding. | No foliate move; `79191075dfc513f563fd8e8acc56e50470fd9f4c` on both sides. |
| `631cd6454` | 10 files, +914/-68 | Maps selections from the extracted popup DOM back to pristine-section CFIs, enables applicable selection/annotation tools, redraws popup highlights/notes, checks that CFI is nonempty before save (not an actual resolve-and-text round trip), rejects cross-section notes early, normalizes element boundaries, and guards async selection state with an epoch. Synthetic alt/data text has no CFI, so anchoring actions remain disabled; TTS is disabled for all popup selections. The selection epoch does not establish safety for late popup-view completion; see the C8B gates below. | `9fde61a10..57c9358ad`: foliate exports CFI serialization/range building and emits section index plus extraction mapping for the second popup view; this is not a required native br1 dependency. |
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

Continue with **S2-R04C11B**. Each slice starts by checking current local callers
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
| C7 | Rendered targets/ancestors hidden by display or visibility suppress popup jumps; unknown targets retain the upstream fallback policy without visibility claims. |
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
run. C8-C10 and C11A are complete within their documented native contracts below. C11B-C21 remain
pending; their table entries are executable specifications, not completion claims.

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

At C5 closure: 52 covered, 414 partial, 77 gap, 135 not-applicable, and
61 remaining task IDs. C5 is covered within the documented native text scope;
this does not add rich-media popup capability or change the separate nested
margin obligation under S2-U01B. Next: C6 in-page target feedback.

### C6 native navigation target cue

Readest `dbe0dae0a` changes five host/test files (+176/-58), with no Foliate
gitlink change. It extends the existing transient search marker to href
destinations, promotes element anchors to nearby blocks, and removes the cue
after 4000ms. Its bounded render polling belongs to its existing helper;
br1 instead consumes the destination returned by the completed native `goTo`.

`ReaderViewport.navigateAndFlash` is the shared host entry for ordinary internal
links, checked-footnote extraction fallback and the existing popup jump control.
Ordinary links are cancelled synchronously before awaiting, preventing Foliate
from scheduling a second default navigation. The cue uses the resolved section
and anchor, not an ID lookup in the originating iframe. Hidden, missing and
off-surface targets do not get a fabricated marker. Empty-element promotion
stops before body/html to avoid highlighting an entire chapter for an image note.

The existing Overlayer drawing function supplies a temporary SVG group, appended
without registering an annotation. It cannot enter Foliate's manual hit-test
map, change its cursor policy, or become a persistent note/search result.
Safari CSS-zoom coordinate normalization follows `Overlayer.add`; packaged
WebKit/Safari zoom rendering is still not runtime-verified.

A separate navigation intent epoch guards pending completions. New link/control
intents, book changes and teardown invalidate it. Native renderer relocate
reasons distinguish navigation/anchor completion from page/scroll/selection
changes; the host event alone does not expose that reason. Relocation and
configuration clear drawn geometry; replaced renderer listeners are removed.
The duplicate host relocate handlers are consolidated, retaining the scrolled
PDF selection exception. Drawing failure is isolated from navigation success.

Popup-internal navigation is not-applicable because native preview anchors are
stripped. Search sentence expansion, rich popup media, TXT/PDF cue coverage,
packaged/mobile and exhaustive native-gesture concurrency are not claimed.
Verification: C6 focused tests 3/3 PASS; footnote plus authored-text suites
18/18 PASS; legacy footnote/sanitizer/TXT selection 4/4 PASS (22 unique cases).
`pnpm check`: 0 errors, 0 warnings. `pnpm build` and `git diff --check`: PASS.
Fresh Terra high task review and Astra high final static review: PASS.
The source-DOM assertion starts after Foliate's own focus mutations; cue
geometry checks individual SVG shapes against the actual destination content.
Controlled held-return supersession is not native-gesture stress acceptance.

At C6 closure: 53 covered, 413 partial, 77 gap, 135 not-applicable, and
60 remaining task IDs. Next: C7 popup-to-book navigation audit.

### C7 popup-to-book navigation policy

Exact source: `aab58241d492c336b682962e6302d69e7c1004dc`, parent
`39580e75457b05afbdbcc459777d68792f9eabb1`. Four app/test files change;
there is no nested Foliate update to port. The upstream helper deliberately
allows unknown destinations. It is a known-hidden filter, not proof that any
unloaded chapter will be visible after navigation.

br1 keeps that compatibility policy and its existing fallback behavior.
The Viewport checks the original resolved element and ancestors in the actual
rendered chapter, rejecting computed `display:none` or `visibility:hidden`.
It does not test current viewport intersection, opacity or rectangle size.
Detached `createDocument()` results have no browsing context; their unknown
styles, missing anchors and inspection errors do not disable the jump.
No temporary renderer, CSS parser, pre-navigation or chapter preloader is added.

The existing `fallbackNavigationTarget` carries the accepted href, or an empty
string for a known-hidden destination. The native popup offers that action for
readable previews as well as empty previews, and no longer promises a jump for
a hidden empty note. Stage already dismisses before issuing one href control;
C6 owns the navigation and temporary landing cue. Existing numeric-link fallback
navigation and source content remain unchanged.

The real unloaded-short-chapter regression exposed a C6 lifecycle defect:
Foliate can emit another internal `anchor` relocation after `goTo` returns,
immediately clearing the newly drawn cue. The host now lets that native reason
redraw the captured destination with fresh geometry and the original timer.
It does not navigate again or restart the four-second lifetime. Other native
relocations clear the callback; expiry, layout changes and teardown cannot
leave a callback that revives a dismissed cue. The reason-less host relocate
event no longer independently clears the same visual resource.

Native text previews strip internal anchors and use a separate action row.
Upstream popup-internal history and floating renderer chrome are not applicable
to this surface. Href-less metadata popups still cannot jump. No source-aside
hiding policy, rich-media renderer, selection/CFI tools, packaged/mobile or
Safari runtime acceptance is included. Unknown-target navigation can still land
on hidden content; this is the retained upstream policy, not a solved edge.

Verification: C7 focused 4/4 PASS; footnote plus authored-text 22/22 PASS;
legacy footnote/sanitizer/TXT selection 4/4 PASS (26 unique cases).
`pnpm check`: 0 errors, 0 warnings. `pnpm build` on the final production source
and `git diff --check`: PASS. Fresh Terra high production/test reviews: PASS.
Final Astra high whole-change review: PASS.

The short-chapter regression initially failed because an internal relocation
removed the cue immediately. Final tests keep that real navigation assertion,
replay complete native relocation details for controlled deadline/cancellation
checks, and reject browser page errors. Selection uses the real iframe Selection
API; a held navigation result released after actual viewport resize cannot paint
a stale cue. These are focused lifecycle checks, not full native-gesture stress
or packaged-platform acceptance.

At C7 closure: 54 covered, 412 partial, 77 gap, 135 not-applicable, and
59 remaining task IDs. Next: C8 footnote selection and annotation mapping,
including its own nested Foliate commit audit.

### C8A foundation boundary and C8B mandatory gates

Independent Sol source audit: Readest `631cd6454fe38721e56fad7cd3ecf60e750d3f29`
(parent `b463f014b3f23690c7a68ec4bb7597bf5b87e32e`) checks a nonempty CFI,
but does not prove an actual pristine-document
resolve-and-text round trip. Nested `57c9358ad` provides extraction mapping and
exports for the second popup view; br1's native popup does not require that
renderer path. The upstream popup-view late-completion race must not be copied
as an accepted lifecycle contract. The nested range
`9fde61a10f598575f979ec3a136b93f5d324f9b6..57c9358ad83076ebe99c127f82125103319d170e`
contains one commit. Its extraction mapping is recorded before mutating the
second view's document; exported CFI serialization/building helpers serve that
architecture. Neither it nor a second renderer is added to br1. The upstream
eleven mapping tests and both source diffs were inspected; upstream test execution
was unavailable because its installed Vitest links point to an absent store.

C8A replaces the private Viewport extraction/sanitizer with `footnoteExcerpt.ts`.
The live path still consumes only HTML/text; a private ordered mapping associates
sanitized text with original Text nodes and offsets before any removal/unwrap.
It uses raw UTF-16 positions, accounting for top-level whitespace trimmed from
serialized HTML. Range mapping checks root text, containment, source scope,
source text and order, and rejects gaps caused by removed script/style text.
Excerpts containing CDATA retain their output but reject mapping: CDATA affects
full-text offsets without participating in the ordinary Text-node segments.
Equal strings are an integrity check, never source lookup or popup identity.
No CFI generation, annotation writes or persistent mapping metadata is added.
Module mapping tests are separate from real reader snippet regressions; C8A
does not yet connect a live popup Selection to the mapper.

| Native slice | Closure requirement |
|---|---|
| C8A | Existing excerpt production uses source-preserving extraction; restricted Range mapping has browser DOM proof. |
| C8B | Bind real popup selections to the exact current payload and validate pristine-section CFIs by resolution, text and boundaries. |
| C8C | Enable applicable actions only after B, retain unanchored synthetic restrictions, validate before writes and prove annotation merge/toggle/persistence. |
| C8D | Map stored annotations back to the native popup, prove redraw/update/delete and complete popup replacement/teardown integration. |

Verification: final C8A mapping suite 5/5 PASS, including duplicate CDATA;
footnote/authored-text suites 22/22 PASS; selected legacy footnote/sanitizer/TXT/
fenced-code cases 4/4 PASS (31 unique runtime cases). `pnpm check` reports zero
errors/warnings; `pnpm build`, `git diff --check` and the 678-row ledger recount
PASS. Fresh Terra high task review and CDATA re-review PASS; Astra high final
whole-change re-review PASS. Its initial CDATA finding was corrected by disabling mapping
for unsupported CDATA while preserving excerpt output. Parent `631cd6454`
remains `partial`; totals stay 54/412/77/135 and 59 remaining primary task IDs.
Next: C8B. C8C/C8D remain dependent steps within the same parent obligation.

C8B must satisfy these gates before exposing anchored actions:

- Generate the locator from the mapped target section's pristine document,
  then actually resolve that CFI against that document and compare the resolved
  range text with the intended mapped source selection. Require the expected
  section and valid range boundaries; a nonempty or parseable CFI is not proof.
  Duplicate-string tests must also verify the intended source boundaries, not
  merely equal text. Never substitute the current location or current TOC;
  any reuse of `getSelectionStateFromRange` must explicitly disable
  `allowLocationFallback` and still meet the pristine validation gate.
- Bind the displayed preview root, mapping, selection, and every asynchronous
  result to the current book/view and exact popup payload/request identity.
  Equal preview text is an integrity check, not identity. Preserve the existing
  Viewport request epoch and extend invalidation through the native UI owner
  for close, replacement, navigation, book/view replacement, and teardown.
  Recheck identity after asynchronous work and before publishing selection,
  enabling an action, or committing a write; late completion must not restore
  a dismissed popup or apply an older payload to a newer one.
- Keep synthetic alt/data text unanchored and reject failed or stale mappings.
  Prove held-completion-after-close/replacement/navigation/book-change cases,
  including identical text in distinct payloads, alongside real pristine-CFI
  round-trip and wrong-section rejection cases. No fake CFI or developer-only
  UI hook may stand in for these proofs.

Popup selection/UI integration and these gates belong to C8B, not the historical
C8A integration. Annotation controls/writes, redraw, and full lifecycle closure
remain deferred until their own implementation and verification are complete.

### C8 completion contract

The final Sol commit audit confirms that a Stage-owned ephemeral selection lease
passed to a route action callback is equivalent to a dedicated route selection
event. Do not add a second selection store or replace the body's selection.
The following frozen obligations are satisfied by the C8C and C8D evidence below.

| Slice | Required behavior | Evidence in Readest `631cd6454` |
| --- | --- | --- |
| C8C | Validated source selections support copy, search, dictionary, wiki, translation, share, highlight and note. Synthetic alt/data text supports only the six unanchored tools. TTS is rejected for all popup selections. | `Annotator.tsx`, added selection epoch and action hunks around lines 372, 1305, 1439, 1505 and 1990. |
| C8C | Bind actions to exact request/book/view/root/selection revision; check after asynchronous work and prompts and immediately before mutation. Keep original source CFI and section metadata. | `FootnotePopup.tsx`, selection hunk `@@ -144,0 +181,91`; `Notebook.tsx`, `@@ -210 +210,5`. |
| C8C | Reuse primary notes ownership; preserve highlight toggle and distinct note IDs at the same CFI. Prove save/reopen, cancellation, failures and held-save ordering. | Notebook CFI source changes, not a new annotation merge policy; br1 baseline `notesController.ts`. |
| C8D | Resolve pristine-section annotations, reject wrong sections before loading, then reverse-map through retained DOM provenance. Reject malformed, unresolved, stale and disjoint ranges; never search for equal text. A boundary-crossing annotation may draw only its verified excerpt intersection. | `footnoteCfi.ts:108-149`, plus the native mapping safety requirement. |
| C8D | Draw and interact by record ID, including multiple IDs at one CFI. Open/reopen, create, edit, toggle and delete refresh the corresponding records. A sibling deletion must not erase remaining IDs. | `FootnotePopup.tsx:510-556`. |
| C8D | Clicking highlights opens applicable record actions; clicking notes opens the existing primary note record without an unintended navigation. Keep controls above the popup and redraw/hit-test accurately after scroll or resize. | `FootnotePopup.tsx:238-271`; existing native Overlayer contract. |
| C8D | Invalidate reverse batches, geometry, callbacks, observers and listeners on close/replacement/navigation/modal/book/view change/teardown. Equal text in another payload must not inherit records. | `FootnotePopup.tsx:59-82,298-303,433-457`, extended native lifecycle checks. |

True architecture N/A: popup-local Foliate view and CFI arithmetic,
`getExtractMapping`/new CFI exports from nested `57c9358ad`, independent popup
persistence, and secondary parallel-stage annotations (the established Stage is
reference-only with `notes={[]}`). Readest-only copy-link, proofread,
copy-to-notebook preference and richer highlight-style/range-edit controls are
outside the frozen native action contract. C9 shared-loader refcount is a
separate commit, not evidence of C8 completion. Packaged Tauri, Safari and native
mobile gesture proof remain unverified, not N/A.

C8D implementation boundary (Astra high): popup record inspection may display
the existing primary `ReaderNote` by ID inside the popup, with only an ephemeral
active ID and route-owned edit/delete callbacks. This is equivalent to opening
the notebook record; navigation or a second record store is not required. All
mapped same-CFI IDs must remain accessible through native chooser buttons.

Body note reconciliation must use the loaded renderer's existing synchronous
Overlayer API, not a tagged asynchronous `view.addAnnotation()` call. The latter
awaits navigation resolution and then accesses the current renderer, including
an unguardable removal branch. Coalesce host updates in a microtask (native
`create-overlay` fires before attachment completes), capture current
book/view/renderer/document membership, resolve CFIs synchronously, and reconcile
only ID-keyed host notes with no await before mutation. Keep search decorations
untouched. Extend only host Overlayer typings as needed; no Foliate source change.

### C8B native selection and pristine-location validation

The actual Popup listens to native document selection changes and passes a
contained Range to Stage. Stage emits only `footnoteselectionchange`, never the
generic route selection channel that exposes annotation actions. Keyed popup
roots, exact payload identity, a selection revision and live browser boundary
checks prevent queued or asynchronous results from surviving dismissal or a
replacement. The Viewport also checks the captured book/view and active payload.

The original C8A mapping must succeed first. The resolver loads the intended
section with native `createDocument()`, re-extracts the captured href's target,
and maps the same preview selection into that pristine document. Native
`getCFI`/`resolveCFI` must return the expected section and identical start/end
nodes, offsets and raw text. No current-location/TOC fallback, transformed-DOM
CFI, duplicate-text search, secondary renderer or persistent map is introduced.
The original displayed excerpt remains unchanged; transformed text that cannot
map exactly to the pristine excerpt is rejected, not guessed.

The reopen regression exposed a preexisting host lifecycle defect: native
Foliate `open()` appends a renderer without closing its predecessor. Old iframe
links could therefore remain interactive while the same view identified a new
book. Astra approved the minimum root correction within the same production
allowlist: call native `close()` after invalidating requests/gestures, before
asynchronous source loading and the TXT/Foliate split, and during teardown.
This removes the old renderer instead of hiding it in tests. It does not cancel
a pending native `open()` or add `book.destroy()` ownership.

Verification: final C8B focused 8/8 PASS, full footnote/authored-text 30/30 PASS,
mapping 5/5 PASS, selected legacy footnote/sanitizer/TXT/fenced-code 4/4 PASS,
and real PDF metadata smoke 1/1 PASS (40 unique runtime cases). `pnpm check`
reports zero errors/warnings; production build (`pnpm exec vite build`),
`git diff --check` and the 678-row ledger recount PASS. Fresh Terra high task
review and Astra high final whole-change static review PASS. Browser proof uses
native DOM Selection/Range, real Foliate CFI methods and a mounted production
Stage's scoped events, plus a real `/reader` route trace. This is not full
mouse/touch gesture or packaged-platform acceptance.

Parent `631cd6454` remains partial: 54 covered, 412 partial, 77 gap and 135
not-applicable, with 59 remaining primary task IDs. Next: C8C action applicability
and persistence, then C8D annotation reverse mapping/redraw. C8B does not expose
new action buttons, write annotations, anchor synthetic/CDATA text or claim
packaged Tauri/mobile/Safari acceptance.

### C8C scoped actions and persistence

The primary Stage now owns an ephemeral popup selection lease and passes it to
the existing route action owners. Source selections expose highlight/note plus
copy/search/dictionary/wiki/translate/share; synthetic text retains only the six
unanchored tools. All popup TTS is rejected. The route revalidates source CFI
after notes hydration and the controller checks the lease again after prompts.
Generic body selection is never swapped with popup selection. Toolbar/status
space is reserved before dragging, so action admission does not shift text.

The existing notes controller retains distinct IDs at one CFI and highlight
toggle semantics. Native snapshots are serialized; per-key pending writes form
read barriers for A -> B -> A. Failed hydration rejects `ready()` and blocks
mutation; explicit refresh retries a failed restore or retained failed snapshot.
Errors reach the existing reader notice and scoped popup status. Scoped lookup
and translation use explicit book/section/optional-CFI provenance; pending
requests are not persisted as loading history, and stale completions cannot
publish history or open the notebook.

Verification: type check 0 errors/warnings and reader helpers 99/99 PASS;
C8C 6/6 and full footnote/authored/mapping 41/41 PASS (includes C8C).
Extended notes/selection/PDF regressions 10/10 PASS without skips in Chrome
152.0.7977.77: 51 unique browser cases. Production build and diff check PASS.
Fresh Terra high production/controller and static test review PASS. The native
interface test double now models library/bookmark and Tauri event contracts and
fails unknown commands; browser page errors fail these tests instead of silently
leaving the reader in an incomplete startup state.

At C8C closure, C8D reverse mapping, ID-keyed redraw and record interactions
remained open. No
Foliate source/dependency changes or second reader. Native service mocks are
browser proof, not packaged Tauri acceptance; Safari/native mobile are unverified.

### C8D annotation reverse mapping and record interaction

Implementation and product regressions are complete. Parent `631cd6454` is
covered within the frozen native contract; final whole-C8 review is recorded below.

| Completion obligation | Native implementation and executable check |
| --- | --- |
| Pristine reverse mapping, early section rejection, explicit clipping | `ReaderViewport.resolveAnnotations` filters native CFI section indices before one pristine read; `footnoteExcerpt.resolvePreviewRange` intersects retained UTF-16 source segments and round-trips canonical endpoints. Mapping regressions cover duplicate text, clipping, hidden gaps, mutation, CDATA and foreign documents. |
| Equivalent XML and rendered HTML | Compare detached HTML-serialized clones without namespace declarations or framework comments; keep displayed markup unchanged. An XHTML-pristine/HTML-preview regression checks namespace and empty-element serialization while rejecting a changed element structure. |
| Record identity and persistent actions | Popup and body Overlayers use record IDs, not CFI keys. Popup inspection reads the current primary record by ID; the existing controller edits/deletes it after guarded remapping. Product regression exercises two notes plus a highlight at one CFI, sibling deletion, toggle and reload. |
| Geometry, mouse and keyboard | The popup SVG is outside the mapped text root. Native Overlayer retains viewport hit rectangles while drawing coordinates account for scroll and borders. Product regression uses a real mouse click and keyboard chooser, then checks desktop/mobile-sized scroll and resize geometry. |
| Lifetime and body ownership | Reverse batches and record operations retain request/root/book/view identity. Cleanup retires listeners, observer and scheduled redraw. Body reconciliation uses the admitted source owner, hydrated snapshot and captured renderer/document/layer membership with synchronous mutations. Held-read regression covers close, replacement, navigation, book replacement, modal and teardown. |

The ordinary body annotation event still opens the notebook through the existing
CFI navigation flow; only popup record inspection avoids navigation. Range
validation uses the rendered document's own constructor because iframe objects
do not belong to the parent JavaScript realm.

Persisted note admission requires Foliate's complete `isCFI` envelope before
native resolution. This rejects truncated/bare values without replacing its
parser or requiring one canonical string representation for equivalent CFIs.
The pristine range and DOM provenance checks remain the semantic authority.

Final-review corrections distinguish native `anchor` relayout from navigation
and remove the Stage's unconditional dismissal on display-state refresh.
Inspector and popup are siblings in one fixed wrapper projected into the owning
Stage's visible viewport intersection on both axes. Side-by-side and stacked
parallel previews remain independent. Excerpt space shrinks and native scrolling
keeps controls reachable when chrome needs extra room; short excerpts retain
their natural height rather than acquiring the long-note minimum.
Opaque theme backing prevents underlying book text from bleeding through.
Neither resize nor record inspection replaces the mapped root or its Overlayer.

Final execution: Chrome C8D 4/4 and full footnote/authored/mapping 47/47 PASS;
selected notes/selection/PDF regressions 10/10 PASS, no skips (57 unique browser
cases). Reader helpers 99/99 PASS, type check zero errors/warnings, production
build (`pnpm exec vite build`) and diff check PASS. Five screenshots cover
1280x720, 390x740, 900x500, parallel 1600x1000 and stacked 900x900 layouts.
Mouse proof uses an integer interior point within every clipping ancestor,
not a subpixel edge or direct action invocation. Independent menu-open and
direct keyboard-modal tests each reject held reverse completions.

Fresh Terra high task-level review and final acceptance PASS. Final Astra high
whole-C8 source, evidence and scope review PASS, with all five screenshots
independently inspected and no remaining blockers in the frozen native contract.
At C8 closure the ledger contains 678 commits: 55 covered, 411 partial, 77 gap,
135 not-applicable, and 58 remaining primary task IDs. Next: S2-R04C9.

No Foliate dependency change, second popup renderer or independent notes store.
C9 and full pending source-open cancellation remain separate obligations.
Packaged Tauri, Safari and native mobile gestures remain unverified.

### C9 resource-reference completion contract

Target: Readest `a193cbc35e0bba954e6610b1d0170c3548a37d80`, including
`57c9358ad..c1f0c3c55`. The following runtime gates have passed.
Independent Sol high audit resolves the parent to
`9213c6af105a65b6156039d90eece90b3b20df04` and the sole nested range to
`57c9358ad83076ebe99c127f82125103319d170e..c1f0c3c558cc919db89a1380edea836d6e846835`.
The Readest parent adds 166 test lines plus the gitlink (`+167/-1`); the nested
commit changes only `epub.js` (`+18/-1`). Its two inseparable behaviors are
top-level acquisition on every cached section load and borrowing the cached URL
for the subsequent XHTML content read. Both are missing at sibling
`758f218f2f6964b7c595906732520fc788c55f23`.

The nested paginator blob is unchanged across that range
(`8ecc8de8188514c4c135771d70caafbc4b8d4cef`); the Readest test blob is
`a88bd180f8a233088704c813cccb250e900d3e70`. Its two tests exercise Loader calls,
not actual views or settled navigation. The local runtime gates below extend
that evidence through br1's actual owners rather than copying its test boundary.

Astra high freezes the existing EPUB loader as the reference-count owner.
Each successful top-level section load acquires one reference; the owning
renderer releases it once. A following content read borrows that held reference.
Parent-to-child resource deduplication remains separate from top-level owners.
br1's sanitized text popup reads a loaded/pristine document without acquiring a
second renderer reference. Independently opened parallel books remain independent.

| Required gate | Evidence needed before closure |
| --- | --- |
| Both upstream accounting defects | Repeated section load/unload retains surviving owners; repeated held content reads do not leak an extra reference; cold content reads retain their existing releasable-load behavior. |
| Shared children | Repeated dependencies within one parent do not overcount; two section parents keep a shared CSS/image resource alive until its last parent closes. |
| Real shared-book renderers | Two actual native views use one book. Three temporary open/init/close cycles leave the held reader image freshly fetchable and decodable. Final close releases chapter and child URLs before any test cleanup calls book destruction. |
| Settled navigation balance | A navigating view cannot release the other view's section reference. Exercise paginated and scrolled paginator paths, including adjacent section acquisition. |
| Rejected destination | When another view's destination load rejects before acquiring resources, the original holder retains fetchable/decodable resources through that view's close. Final holder close still releases them. |
| Actual br1 popup and teardown | Three real popup cycles preserve the original reader image URL. Normal settled source replacement and SPA reader teardown release old section resources while the replacement reader stays usable. |
| Closure | Focused red/green evidence, compatibility regressions, checks/build, fresh task review, final whole-change review, and a reconciled commit ledger. |

The caller audit identifies a second release in the paginator's navigation
completion callback after its existing view-removal owner already unloads the
old section. A demonstrated settled-navigation imbalance belongs to C9 and must
not be deferred as pending-open cancellation.

An already-decoded image can remain painted after its URL is revoked. The
resource gates therefore require a fresh fetch and image decode, not merely a
screenshot or the existing image's natural dimensions. br1 has no popup image
viewer, and C5 deliberately excludes images from its text excerpt; C9 does not
introduce either surface to manufacture parity.

Full in-flight open cancellation and broader book disposal remain separate.
The fixed-layout renderer has loads without corresponding section unload calls;
its cache/disposal ownership needs a separate fixed-layout audit and cannot be
claimed covered by paginator proof. C9 is not an all-format leak-free claim.

Scope adjudication (Astra high): retaining the navigating view's prior display
after destination failure is an independent, pre-existing navigation defect.
C9 still requires survivor validity and final release on that rejected-load path;
it does not require a transactional display/history rewrite. Failed navigation
does not emit a successful-load/fill completion, so its negative test must await
the attempted public navigation's settlement rather than a success event.

### C9 implementation and evidence

Sibling implementation: `foliate-js@4b6ecb21116cf2f5a8da07b50c97ce1d3440b2c6` (branch `performance`).

The sibling EPUB loader now separates top-level holder references from the
existing parent/child dependency deduplication and borrows cached URLs for
content reads, retaining local performance instrumentation. The paginator's
view-removal path owns the release; its navigation completion callback no
longer releases an already-retired section a second time. No br1 production
adapter, public interface, dependency lock or vendor asset changes are needed.

Red evidence: original content reads left all three tracked resources unreleased;
the transient-holder test also failed to fetch its held resource. After only the
Loader port, its three tests and the br1 route passed, but the actual paginator
reported `unexpected target revoke at paginated: temporary navigation 1` after
three successful plain-close cycles. Removing the duplicate release turns this
native regression green. Initial iframe-address harness errors were corrected
to track real XHTML blobs; they are not counted as product failure evidence.

Final C9 browser matrix: 5/5 PASS, including three plain-close cycles, three
far-navigation cycles and one rejected destination per paginated/scrolled mode.
Native background preload completion is awaited through the existing timing
hook's actual fill promise, not a sleep or an extra resource acquisition.
Resource checks assert no premature revoke, freshly fetch and decode the bytes,
then prove exactly one final revoke and failed fresh fetch before cleanup.
The actual br1 route proves three popup cycles, independent parallel closure,
settled source replacement and SPA teardown without browser-page disposal.

Existing footnote/authored/mapping/EPUB/MOBI/CBZ regressions: 55/55 PASS; 60 unique
browser cases with C9, no skips. Reader helpers 99/99, check zero errors/warnings,
final strict TypeScript, production build, sibling syntax checks, ZIP loader
tests 6/6 and both diff checks PASS. Fresh Terra high task acceptance and fresh
Astra high whole-C9 source/evidence/scope review PASS, with no remaining blockers.

At C9 closure: 678 commits, 56 covered, 410 partial, 77 gap, 135 not-applicable,
and 57 remaining primary task IDs. Next: S2-R04C10. The independent fixed-layout,
navigation rollback and pending-open obligations above remain open. Browser
automation is not packaged Tauri, Safari, native mobile or manual demo acceptance.

### C10 directional-flow completion contract

Astra high independently checked the following Git objects before implementation.
Each nested range contains exactly one commit, changing only `paginator.js`:

| Readest parent -> commit | Nested Foliate old -> new | Required behavior |
|---|---|---|
| `45bd355981e8fe2dcaf0588dbaa3522151116ed9` -> `caa0d719c5042b757123e0bad1786e9b7fe113e1` | `68f454a6ed097e09eba3c930091c2dd7cdd8d38e` -> `9a0c1c6f5bcb3a16b659d4ee4c4ceb437170fda9` | Body writing mode takes precedence; empty/horizontal body falls back only to its first direct non-`cfi-inert` child. |
| `c6daf72da961c39d7740f8dcc1b1df7c2b8cdd30` -> `23d5f3363dfb7631e47a91a8cdabb0cd5f6ffd71` | `ec7e16aa483429701c7f4f19ab909ecae79dfd58` -> `183f296aaf1484e143edd6c3eb55fb77673df3de` | Remove double reversal of the RTL flex container; preserve semantic previous/next while mirroring physical input and icons. |
| `1eaf16ffc26c9fec148cbfcb731873b37db42d40` -> `676e14234bede91e0ec89631290a2b9faa88773e` | `cc86688523f06308159b25e91649fde436788f25` -> `70d77aa747d3d6f12dc566f2fa6fa01afe464a84` | Mirror iframe-local RTL rectangles using the explicit target view, otherwise primary view, not all loaded views together. |

The host already routes footer previous/next directly to native renderer actions.
Keep that chain and semantic mouse back/forward intact. Derive ephemeral RTL from
the rendered document matching `lastLocation.section.current`; do not select the
first preloaded document, infer RTL from vertical writing, or persist a new setting.
Use neutral direction while no current document is available and for TXT/FXL/PDF.
Only physical left/right keys and footer icons mirror; keyboard help must agree.
The renderer owns vertical detection; no second host vertical layout implementation
or new Foliate export is needed.

Acceptance requires actual same-direction reflowable EPUBs, including metadata
that disagrees with body direction: detection positives and negatives, semantic
navigation across sections, non-first-section/non-first-screen restore after
adjacent fill, stable saved position and repeated reopen. Host current-document
selection, source reset and independent panes need separate evidence. Preserve
LTR, scrolled behavior and C9 resource ownership. No skipped tests count as proof.

Mixed-direction chapter lifecycle is independently deferred in both `TODOS.md`
files: adjacent loading calls shared `#beforeRender`, replacing `#rtl/#vertical`
and layout state. Host selection proof does not establish mixed-direction renderer
support. Detection of `vertical-lr` is not complete layout support. C11 gestures,
fixed-layout/PDF direction, navigation rollback and unfinished-open cancellation
remain separate. Unrelated locale, BooksGrid/Hardcover and gstack changes are not
ported. Browser automation does not establish packaged or native-platform acceptance.

#### C10 local RTL coordinate adaptation

The literal upstream target-wrapper measurement is insufficient for this sibling's
existing `View.expand()` layout: the content-box wrapper adds before/after blank-page
padding, while the iframe contains only content. `#scrollToRect` already adds the
before-padding offset, and `#getVisibleRange` subtracts it. Mirroring with the padded
wrapper double-counted one page on a real non-first-section reopen: the small target
was initially visible, but the iframe shifted exactly 700 CSS pixels after restore.
Equal reported CFIs did not prove a correct display.

Astra high approved the narrow local adaptation: in paginated RTL only, measure
`targetView.document.defaultView.frameElement.getBoundingClientRect()[sideProp]`.
Do not reconstruct a size from page counts and live paginator dimensions, which can
refer to different layout generations during resize. Keep explicit-target/primary
selection, the no-target fallback and both callers' padding conversion unchanged.
Scrolled and non-RTL mappings are untouched. This remains C10, not a new layout API.

#### C10 runtime evidence

Final frozen browser specification: `foliate-directional-flow.spec.ts`, 5/5 PASS,
no skips. Detection covers body precedence, both direct-child vertical modes,
inert-child exclusion and horizontal/sideways/deeper/later-child negatives. Native
RTL tests preserve semantic turns and restore actual visible text with unequal
adjacent sections and with no preload plus both blank-page pads.

The host test follows the current section rather than a controlled unrelated
document in the preload collection, verifies mirrored arrows and physical keys,
unchanged mouse-back semantics and LTR source reset. UI turns await the actual
forwarded native Promise, not the earlier relocate event or a test sleep.

Managed-file proof uses real EPUB bytes with mocked desktop file/save calls. It
navigates to a non-first-screen anchor in section 1, checks tiny-range XY geometry,
unmounts through `/library` twice and reconstructs distinct native views. A forwarding
test-only public `open`/`perfTracker` observer waits for each instance's actual
`renderer:display:fillVisibleArea` Promise. Section 2 is confirmed preloaded before
reopen geometry and persistence checks. The saved range and target remain visible,
the first-screen marker remains hidden, and every new save after the recorded
boundary retains the original CFI. This proves host IPC routing, not disk persistence.

The parallel case opens a real second LTR book through the production loader and
the mounted secondary view's public API, while the primary remains RTL. This is
direction-preview isolation, not a new secondary-route or annotation-owner contract.

After the iframe-padding fix, existing six-file regressions pass 60/60 and selected
keyboard/TXT/layout regressions pass 4/4: 69 unique browser cases including C10.
Reader helpers 99/99, direct TTS units 15/15, sibling ZIP units 6/6, paginator syntax,
check (zero errors/warnings), strict TypeScript, Vite build and both diff checks PASS.
The additional legacy keyboard test needed its stale PDF sample-total assertion
updated from 4 to the fixture's actual 5 pages. A required neutral RTL fixture field
and existing ESM import suffix were corrected in the direct TTS test only.

Evidence logs: `/tmp/br1-c10-final-freeze-e2e.log`,
`/tmp/br1-c10-final-old60.log`, `/tmp/br1-c10-final-library4.log`,
`/tmp/br1-c10-reader-helpers.log`, `/tmp/br1-c10-final-tts-direct.log`,
`/tmp/br1-c10-final-freeze-check.log`, `/tmp/br1-c10-final-freeze-tsc.log`,
`/tmp/br1-c10-final-vite-build-last.log` and `/tmp/br1-c10-sibling-zip6.log`.
Earlier import, iframe-attribute, realm and mock-shape harness failures are not
product RED evidence. All verification processes and task-owned compiler outputs
were stopped/removed. No vendor generation or packaging was performed.

Terra high independent task-level source, fixture and evidence review PASS,
including the final real-fill persistence proof. Fresh Astra high whole-change
source, ownership, evidence and ledger review PASS with no remaining blockers.
The final reviewer independently reran strict TypeScript, paginator syntax and
both diff checks, and recounted all ledger statuses and remaining task IDs.

At C10 task closure: 678 commits, 59 covered, 407 partial, 77 gap,
135 not-applicable, and 56 remaining primary task IDs. Authored-layout's 34 rows
are 15 covered, 14 partial, 2 gap and 3 not-applicable. Next: S2-R04C11.

### C11 execution contract

Fresh Astra high planning audit resolved Readest parent
`fd8fbb178c58826a14dafc7a7dc1d78fa902dde0` to
`c5304cd46ccead0b52037ebcd6a5e59464a69b71`. The exact Foliate range is
`0f85707129f61f42ee7a9313b7bd58a2afd0432d` to
`cecaef95be787cfb135b3d9a68325d62676c8f58`: one commit, only `paginator.js`,
273 additions and 28 deletions. The Readest host already inferred RTL from
effective vertical-rl writing mode in the parent; the outer commit adds nine
browser tests, an EPUB fixture and the gitlink. Its tests do not establish
host keyboard/wheel, vertical-lr or book-replacement cancellation behavior.

#### C11A: default instant page turns

- Preserve private native direction detection. Resolve effective body/first
  non-CFI-inert direct-child writing mode, then treat vertical-rl as RTL in
  addition to the existing explicit direction rules. Do not promote vertical-lr,
  sideways, deeper or later fragments to RTL merely because they are vertical.
- Mirror the same rule only in the existing host current-document preview.
  Keep semantic footer/mouse actions, physical arrow/help mapping and transient
  state ownership. No public export, new direction preference or storage field.
- Paginated vertical keeps positive scrollTop. Apply negative coordinates only
  to horizontal RTL in host dir, bounds and page offsets; map vertical rects
  before considering horizontal RTL. Preserve C10's measured iframe width and
  the existing caller-owned blank-page padding conversion.
- Add horizontal swipes only for paginated vertical with animation off or eink:
  rightward next for vertical-rl, opposite for ordinary vertical-lr. Retain
  upward next/downward previous. Existing animated vertical swipes remain on
  their legacy axis, with a positive block-axis sign independent of RTL.
- Keep local sentinel-page and adjacent-section ownership, rather than copying
  upstream's different out-of-range tests. Missing initial bounds return safely.
- Production allowlist: sibling `paginator.js` and host `ReaderViewport.svelte`.
  Tests live in `tests/e2e/foliate-vertical-page-turn.spec.ts`, using real EPUBs.
  Check directions, touch/snap, real visible CFI restoration, book/section edges,
  preload/no-preload, host controls and horizontal/scrolled/animated regressions.

#### C11B: drag and animation lifecycle

- Follow horizontal drags, commit distance/flick or settle, and reject stale
  release velocity. Animate exit, swap at off-screen midpoint, then enter using
  only X transforms. Reuse local animationDuration and background ownership;
  do not import unrelated GPU/RAF/background-cache infrastructure.
- Generation guards alone are insufficient: cancel timers, touch-end rAF and
  navigation/event completion tails on supersession, touchcancel, layout/flow
  invalidation, destroy and actual source replacement. Settle old promises and
  prevent old callbacks from writing coordinates, styles, locks or events into
  a newer operation. Before swap retain old position; after swap retain the
  committed position. This is not transactional navigation rollback.
- Add real phase/geometry samples and cancellation/replacement proofs. The only
  planned production owner is the same native paginator; changed ownership
  requires a new planning decision before implementation.

br1 currently does not enable animated pagination and has no EPUB wheel or tap
zone paging handlers. Neither slice adds these host features or changes demo-only
`View.goLeft/goRight`. Mixed-direction preload ownership, complete vertical-lr
scrolled layout, FXL/PDF, pending-open cancellation and packaged/native acceptance
remain separate. C11A completion leaves parent `c5304cd46` partial for C11B.

#### C11A baseline evidence

The first four-case browser run against unchanged C10 production had one pass
and three failures (`/tmp/br1-c11a-baseline.log`). Instant vertical rightward
turns, vertical-lr leftward turns and missing-bounds admission failed. The initial
direction test incorrectly expected the paginated renderer's host dir to become
RTL; this contradicts the positive-scrollTop contract and is not product RED.
The initial host fixture mixed horizontal and vertical chapters, which enters
the separately deferred preload-ownership gap; its failure is not standalone
evidence for this same-direction contract. Corrected fixtures establish host
direction independently using a direct-child vertical-rl chapter. Animated
gesture checks now wait for the requested page, not an unrelated early event.

#### C11A implementation and verification

Production changes are confined to native `paginator.js` and the existing host
`emitReaderState`. Effective vertical-rl determines reading direction while
vertical pagination keeps positive scrollTop; instant/eink horizontal swipes
respect that direction and legacy animated vertical input keeps its prior axis.
The private/native and current-document host ownership remain unchanged.

Final focused browser suite: 4/4 PASS, covering body/direct-child direction and
negative modes, visible non-first-screen native CFI restoration, preloaded and
no-preload cross-section text landings, missing bounds, first/last book edges,
instant/eink bidirectional swipes, legacy animated and horizontal/scrolled paths,
and real host footer, physical-arrow, help and mouse behavior with source reset.
Touch events are dispatched in Chrome; this is not physical touch-device proof.

The host proof waits for initial native fill before navigating to a cached
middle anchor and checks actual page, positive position and CFI changes. It does
not assume one page turn equals one chapter transition. A late-attached timing
hook was invalid because cached navigation bypasses the display timing entrypoint;
the final hook observes each host instance before open, as in C10. Keyboard
checks explicitly focus the existing host stage after native anchor navigation;
cross-iframe key forwarding is unchanged and not claimed.

Seven existing browser suites pass 65/65; selected keyboard/TXT/layout checks
pass 4/4. Total: 73 unique browser cases, no skips. Reader helpers 99/99 and
sibling ZIP units 6/6 PASS. Svelte check reports zero errors/warnings; strict
TypeScript, paginator syntax, Vite build and both diff checks PASS. An initial
helper compilation stopped on a nullable test document; it did not execute
tests. The corrected final helper run passes. No vendor generation or packaged
build was run. All test processes and task-owned compiler outputs were removed.

Final logs: `/tmp/br1-c11a-final2-focused.log`,
`/tmp/br1-c11a-regressions.log`, `/tmp/br1-c11a-library4.log`,
`/tmp/br1-c11a-final2-helpers.log`, `/tmp/br1-c11a-final2-check.log`,
`/tmp/br1-c11a-final2-strict-ts.log`, `/tmp/br1-c11a-final2-vite-build.log`,
`/tmp/br1-c11a-paginator-syntax.log` and `/tmp/br1-c11a-zip6.log`.

Fresh Terra high production, corrected test and final evidence review PASS.
Astra high final source, composition, evidence and ledger review PASS with no
remaining blockers. The final reviewer independently reran strict TypeScript,
paginator syntax and diff checks and recounted the ledger.
Parent `c5304cd46` stays partial under C11B. Counts remain 678 unique commits,
59 covered, 407 partial, 77 gap, 135 not-applicable, and 56 remaining primary
task IDs; authored-layout remains 15 covered, 14 partial, 2 gap, 3 not-applicable.

# Readest Two-Step Alignment Plan

Last updated: 2026-09-05

## Scope

This document plans the next br1-to-Readest alignment pass from two concrete Readest anchors.

- Step 1 target: `e0cf7e8d9f0c61e2cd859dd9cc0d026351eef3b6` (the Readest state before the user's pull)
- Step 2 target: `6df90139dc7b72246572ab33b12d485b281ca6e6` (the Readest state after the user's pull)
- Pull delta analyzed here: `e0cf7e8d9f0c61e2cd859dd9cc0d026351eef3b6..6df90139dc7b72246572ab33b12d485b281ca6e6`
- Commit count in delta: 1189

This is intentionally commit-led. The full Readest diff is too broad to reason about as one blob, so every commit in the pull range is listed below with an initial br1 action. The initial classification is based primarily on commit subject and scope, with touched paths used only when the subject is too generic; the next pass should validate high-priority items against the actual diff before implementation.

## Current br1 Baseline

br1 already has a large local-reader parity line: local library import/reopen, multi-format reader entry, notes/highlights/bookmarks, progress persistence, search, reader assistance, translation/TTS scaffolding, parallel reading, catalog/import surfaces, and KOReader-oriented sync groundwork. The existing source of truth is `.planning/READEST-ALIGNMENT-CHECKLIST.md`.

The important constraint is that br1 is a Tauri + Svelte + Rust rewrite, not a React/Next code import. Port behavior and boundaries, not Readest implementation shape.

## Delta Summary

| Area | Commits | Default br1 posture |
| --- | ---: | --- |
| reader core | 328 | review for parity |
| external sync/integration | 159 | defer/skip unless br1 adopts this surface |
| platform | 133 | defer/skip unless br1 adopts this surface |
| library | 109 | review for parity |
| tts/audio | 67 | review for parity |
| catalog/import | 63 | review for parity |
| tooling/deps/ci | 58 | defer/skip unless br1 adopts this surface |
| account/payments | 52 | defer/skip unless br1 adopts this surface |
| misc | 50 | defer/skip unless br1 adopts this surface |
| ai/assist/dictionary | 47 | review for parity |
| release/store | 40 | defer/skip unless br1 adopts this surface |
| reading modes/controls | 36 | review for parity |
| security | 28 | review for parity |
| i18n | 19 | defer/skip unless br1 adopts this surface |

## Two-Step Plan

### Step 1: Align br1 to Readest `e0cf7e8d9`

Goal: close the old baseline before absorbing the pull delta. Do not chase every Readest platform or cloud integration feature yet.

1. Refresh the old alignment checklist against current br1 and Readest `e0cf7e8d9`: reader route, library, import, EPUB/PDF/TXT, annotations, progress, settings, search, TTS, translation, and parallel reading.
2. Convert remaining baseline gaps into small br1 slices. The likely first slices are reading-mode follow semantics, TTS reading-mode behavior, annotation/search edge cases, and reader layout correctness.
3. For each slice, inspect the exact Readest commit(s) that introduced or fixed the behavior, then implement the br1-native version with focused tests or a smoke check.
4. Skip Readest-only distribution, mobile, account, payments, and cloud surfaces unless the same local-reader behavior exists in br1.

Exit criteria for Step 1:

- `.planning/READEST-ALIGNMENT-CHECKLIST.md` has no stale baseline claims.
- Reader-mode behavior has explicit source-follow/lock/resume rules.
- Local library and reader state flows have current smoke evidence.
- Known non-goals are documented instead of being left as ambiguous gaps.

### Step 2: Align br1 to Readest `6df90139d`

Goal: absorb the user-visible and correctness-relevant commits from the pull delta after Step 1 is stable.

1. Process the high-priority delta areas first: reader core, reading modes/controls, TTS/audio, AI-assist/dictionary, security, library, and catalog/import.
2. Treat each Readest commit as a behavior prompt, not a patch source. For each relevant commit, decide one of: already covered, port simplified behavior, create br1-specific follow-up, or skip with reason. When the outer commit changes `packages/foliate-js`, resolve the old/new gitlink SHAs and audit the nested foliate-js commits before making that decision.
3. Batch low-risk fixes by surface only when they share the same br1 files; keep state-machine, persistence, parser, and trust-boundary changes one slice at a time.
4. Defer platform-only, paid account, store, and large external-sync surfaces until br1 chooses those product commitments.

Exit criteria for Step 2:

- Every high-priority commit in the appendix has a final status.
- Security and parser fixes have explicit br1 decisions.
- Reader and library smoke tests cover the newly imported behavior.
- Deferred areas have clear product reasons, not missing analysis.

## First Slice Recommendation

Completed in [`2026-09-02-readest-high-priority-audit.md`](./2026-09-02-readest-high-priority-audit.md): all 678 high-priority pull-delta commits now have a final `covered`, `gap`, `partial`, or `not-applicable` decision and map to 58 remaining br1-native task IDs after closing archive loading, TXT chapter indexing, authored-text slices C1-C2, native footnote recognition/extraction C3, native popup background/applicability C4, native text sizing/empty-preview navigation C5, transient navigation target cues C6, native popup-to-book navigation C7, and scoped footnote selection/tools/annotations C8. The earlier task-count increase reflected finer authored-layout decomposition; no upstream commits were added. `S1-R01` through `S1-R03` are verified br1 baselines, while `S2-S01` through `S2-S04`, `S2-R03A` through `S2-R03E`, `S2-R04A1` through `S2-R04A3`, `S2-R04B`, and `S2-R04C1` through `S2-R04C8` are closed slices. C5 retains the native text-preview boundary, not full rich-media popup parity. C6 covers native internal-link destinations, not popup-internal links, PDF/TXT cues or packaged-platform acceptance. C7 rejects known-hidden rendered targets but preserves upstream navigation for unknown targets; it does not measure unrendered chapter styles. C8 retains primary annotation ownership and does not add a second popup renderer or Foliate dependency. The nested TTS obligation in `1d4b7eed8` remains partial under `S2-T03`; the nested scrolled-margin obligation in `1d8ed3fc9` remains partial under `S2-U01B`, independently of C4's background proof. [Authored-layout commit audit and acceptance map](./2026-09-05-authored-layout-commit-audit.md) records all 34 parent commits and 15 nested foliate ranges; C17 includes four independently executable IDPF substeps.

Step 1, `S2-S01` through `S2-S04`, `S2-R03A` through `S2-R03E`, `S2-R04A1` through `S2-R04A3`, `S2-R04B`, and `S2-R04C1` through `S2-R04C8` are complete within their documented native scope. C8A preserves excerpt provenance, C8B validates pristine-section CFIs, C8C connects scoped actions and guarded persistence, and C8D reverse-maps records for ID-keyed redraw and edit/delete through existing primary owners. Final C8 verification includes 99 helper tests and 57 unique browser regressions (47 full + 10 selected, no skips), type check and production build. The parent `631cd6454` is covered within its frozen native contract; packaged Tauri, Safari and native-mobile acceptance remain unverified. Continue with `S2-R04C9 - Audit shared EPUB resource lifetime`, including its exact nested Foliate change. The ledger now has 55 covered, 411 partial, 77 gap and 135 not-applicable commits, with 58 remaining primary task IDs; each slice needs its own implementation and verification commit.

## High-Priority Commit Queue

These 678 commits are the initial candidates for br1 review. They are ordered exactly as Readest history.

| # | Commit | Area | Readest subject | Initial br1 action |
| ---: | --- | --- | --- | --- |
| 1 | `193613659` | reader core | fix: resolve various tracked exceptions in ph (#3584) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 2 | `290550601` | reader core | fix(layout): fixed total scrollable width in vertical scrolled mode, closes #3583 (#3586) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 3 | `87f0240b0` | reader core | compat(footnote): support footnote text in alt attribute of the image, closes #3576 (#3587) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 4 | `5a072e7d1` | reader core | fix(pdf): apply theme colors for PDFs, closes #3593 (#3626) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 5 | `f31030583` | library | fix(library): mixed sorting for group and ungroupped books, closes #3596 (#3627) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 6 | `52df478f2` | reader core | fix: show proper background images in continuous scrolled mode, closes #3638 (#3645) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 7 | `5f897f648` | tts/audio | feat(tts): add shortcuts to navigate and play/pause in TTS mode, closes #3620 (#3651) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 8 | `3d4d1482a` | reading modes/controls | feat: add keyboard shortcuts help dialog (#3653) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 9 | `966f5e2ac` | catalog/import | fix(opds): fixed image download from ODPS server on the web, closes #3649 (#3658) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 10 | `c4e331564` | reader core | feat(scroll): add single section scroll option, closes #3663 (#3668) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 11 | `b3333c384` | reader core | chore(fdroid): get rid of wasm binaries in fdroid build (#3677) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 12 | `c68861288` | reader core | chore(fdroid): build qcms wasm for fdroid (#3680) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 13 | `8e6451863` | library | css: add css selector for status badge, closes #3678 (#3684) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 14 | `8ed929065` | reader core | layout: don't truncate remaining progress info without status info, closes #3678 (#3685) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 15 | `797fe9c60` | reader core | fix(layout): fixed infinite expand calls and freeze in the paginator, closes #3683 (#3690) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 16 | `b87286813` | reader core | fix(layout): fixed infinite expand calls and freeze in the paginator, closes #3683 (#3692) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 17 | `ec26ef4f2` | reading modes/controls | fix(shortcuts): change bookmark shortcut from Ctrl+D to Ctrl+B (#3691) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 18 | `e9c5ebb69` | reader core | fix(fonts): fix Adobe font deobfuscation and CSS var fallbacks, closes #3662 (#3696) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 19 | `e68dedd10` | reader core | fix(layout): fix primary view detection on fractional DPR devices, closes #3681 (#3701) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 20 | `f67930feb` | catalog/import | fix(opds): fix Copyparty books showing as "Untitled" in mixed feeds, closes #3667 (#3705) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 21 | `94843902a` | library | fix(annotations): fix all annotations grouped under last chapter for fragment-href TOCs, closes #3688 (#3706) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 22 | `b71b24660` | tts/audio | feat(settings): add TTS settings tab and highlight opacity, closes #3661 (#3712) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 23 | `0e516f6e5` | security | chore(test): add unit tests and enforce dash-case naming for test files (#3715) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 24 | `29df8522f` | ai/assist/dictionary | chore(bump): bump Tauri to the latest version (#3716) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 25 | `74401fc1b` | library | fix(library): always sort series books by index ascending, closes #3709 (#3717) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 26 | `9ecb9b24d` | reading modes/controls | feat: make reading ruler selection and step navigation coherent (#3722) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 27 | `c9647276b` | reading modes/controls | feat(rsvp): progress bar per chapter, speed selector dropdown, and UX improvements (#3723) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 28 | `62df631dd` | tts/audio | feat(theme): add atmosphere easter egg with video overlay and ambient audio (#3727) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 29 | `05afaab5f` | reader core | fix(layout): fixed static image size and layout shift on window resize, closes #3634 (#3729) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 30 | `888f4afde` | reader core | fix: preserve paragraph mode reading layouts and other UI/UX fixes (#3730) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 31 | `6a44f609b` | reader core | fix(paginator): fixed paginator section preloading, closes #3600 and closes #3601 (#3734) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 32 | `45bd35598` | catalog/import | feat(opds): support custom catalog headers with web proxy consent (#3740) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 33 | `caa0d719c` | reader core | compat(vertical): check writing mode also for child element of body, closes #3583 (#3743) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 34 | `21795e5cd` | tts/audio | fix(tts): avoid race condition in preloadNextSSML causing wrong highlights (#3748) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 35 | `70b94d898` | reader core | fix(layout): fixed layout of progress bar in vertical mode (#3749) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 36 | `d53f3b42e` | reading modes/controls | feat(rsvp): split words option, faster countdown, and skip pages RSVP cant open (#3755) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 37 | `a2d17e6a7` | reader core | fix: clear highlight overlay when deleting annotation from sidebar, closes #3756 (#3758) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 38 | `8b10e7fb1` | reader core | fix(layout): use mobile footer bar in portrait mode without regressing phone panel animation, closes #3742 (#3759) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 39 | `b9a2b10fa` | reading modes/controls | fix(a11y): fixed keyboard activation of dropdown menu (#3762) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 40 | `b679817fc` | tts/audio | fix(tts): prevent double playback on rapid TTS icon clicks (#3764) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 41 | `298d4872a` | ai/assist/dictionary | fix(translate): disable yandex provider while upstream relay is down (#3765) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 42 | `ae2c42193` | reader core | fix(ui): restore highlight options layout and clean up color name editing (#3776) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 43 | `16adf1125` | library | fix(library): align grid hover highlight corner radius (#3774) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 44 | `017a9338b` | ai/assist/dictionary | fix(dictionary): add Chinese dictionary lookup with pinyin support (#3784) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 45 | `db35a4e20` | reader core | fix(style): clamp oversized hardcoded pixel widths and fix browser test flakiness (#3785) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 46 | `82deb85c6` | security | docs: add threat model and incident response plan to SECURITY.md (#3788) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 47 | `184de9210` | security | fix(security): prevent SSRF in kosync proxy (CWE-918) (#3793) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 48 | `932c82aa4` | security | chore(security): update CodeQL workflow to remove languages (#3794) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 49 | `799db4076` | reader core | fix(pdf): add an option to apply theme colors to PDF, closes #3778 (#3799) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 50 | `bfbe92f35` | reader core | refactor(sidebar): replace react-window and OverlayScrollbars with react-virtuoso and CSS scrollbars (#3798) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 51 | `13ff96db8` | security | security: potential fix for code scanning alert no. 19: DOM text reinterpreted as HTML (#3802) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 52 | `6072b0dcb` | security | security: fix for code scanning alert no. 12: Use of externally-controlled format string (#3803) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 53 | `dc788283a` | security | security: fix for code scanning alert no. 11: Incomplete multi-character sanitization (#3804) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 54 | `e43e533ac` | security | security: fix complete multi-character sanitization for HTML comments in txt.ts (#3806) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 55 | `d7fd06ca8` | security | chore: add explicit permissions to GitHub Actions workflows (#3807) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 56 | `4abbc17f6` | reader core | fix(annotator): fixed instant annotation in scrolled mode, closes #3769 (#3808) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 57 | `1e259e87b` | reader core | refactor(reader): introduce priority-based touch interceptor for gesture handling (#3809) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 58 | `41d014914` | catalog/import | fix(opds): handle spaces and quotes in Content-Disposition filename parsing (#3812) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 59 | `ed7cfc31f` | reader core | fix(layout): fix off-by-one page count on fractional DPR devices, closes #3787 (#3813) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 60 | `a5690e9a8` | tts/audio | fix(tts): skip br elements in PDF text layer to prevent TTS interruptions at line breaks, closes #3771 (#3811) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 61 | `bd866cb04` | catalog/import | fix(opds): harden Content-Disposition filename parsing for complex names and encoding (#3816) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 62 | `c6daf72da` | catalog/import | feat(opds): allow editing of registered catalogs (#3814) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 63 | `23d5f3363` | reader core | fix(rtl): fix page navigation for Arabic books (#3817) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 64 | `07e324878` | reader core | fix: apply disable click to paginate also for non-iframe clicks (#3818) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 65 | `3df75a67f` | tts/audio | feat(tts): support edge tts on cloudflare worker (#3819) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 66 | `de11511c3` | reader core | fix(layout): fixed bleed layout of images (#3823) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 67 | `7bf4822b2` | library | fix(library): restore breadcrumb 'All' navigation by bypassing next-view-transitions, closes #3782 (#3829) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 68 | `030a7c082` | library | perf: optimize library operations for large collections (#3827) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 69 | `2a49e93cf` | library | fix(library): fixed the All button in groups breadcrumbs navigation bar, closes #3782 (#3832) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 70 | `f86bbbcc2` | library | perf(library): virtualize grid and list of book items when rendering library page (#3835) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 71 | `95ff52614` | security | fix(deps): bump dependencies to resolve 13 Dependabot security alerts (#3840) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 72 | `ef97a8ed0` | library | fix(ux): optimize scrolling UX for the bookshelf and sidebar content (#3849) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 73 | `41b5e9256` | reader core | feat(annotator): support instant copy operation for selected text, closes #3828 (#3854) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 74 | `96678d85e` | reader core | refactor(settings): persist the apply-globally toggle per book (#3856) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 75 | `ec3261453` | reader core | fix(settings): fixed color picker for custom highlight colors, closes #3796 (#3857) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 76 | `e9d71b293` | reader core | feat(settings): add an option to avoid overriding paragraph layout, closes #3824 (#3858) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 77 | `73d30c103` | reader core | fix(toc): fix page number of some TOC items from section fragments (#3867) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 78 | `b0cc5461a` | reader core | refactor(toc): cache navigable structure per book (#3869) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 79 | `3e292af99` | reader core | refactor(nav): refactor book nav service with TOC enrichment (#3874) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 80 | `802212c42` | library | refactor: fixed typo in module name (#3881) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 81 | `976bbcc15` | library | fix(library): fixed opening shared books from other apps (#3884) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 82 | `31e44d2e4` | reader core | fix(a11y): fixed saving reading progress with screen readers, closes #3864 (#3891) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 83 | `b223ccaee` | reader core | feat(footnotes): detect more formats of footnote (#3894) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 84 | `e1dad98e5` | reader core | fix(toc): prevent auto-scroll snap-back on sidebar open (#3900) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 85 | `ff94dc76c` | reader core | fix: fixed crash on app start when there is no main window but a reader window running, closes #3897 (#3902) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 86 | `c58153e94` | reader core | compat(css): remove no-op css that might break column layout, closes #3895 (#3903) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 87 | `09b19bd3c` | reading modes/controls | perf(rsvp): fixed performance issue when the context window is large, closes #3877 (#3904) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 88 | `9c273d79f` | tts/audio | fix(tts): fixed race condition on pause/resume, closes #3825 (#3905) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 89 | `3bbc2071c` | reader core | fix(pdf): fixed annotations not displayed properly in two-page spread for PDFs, closes #3862 (#3906) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 90 | `a2244e28b` | reader core | fix(pdf): don't apply theme colors where canvas filter is unsupported, closes #3912 (#3915) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 91 | `3f531d904` | reader core | fix(theme): fixed texture background in scrolled mode, closes #3913 (#3918) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 92 | `957b7d5f3` | reader core | fix(layout): properly display full screen page, closes #3914 (#3930) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 93 | `528a13e36` | reader core | fix(layout): don't dismiss notebook on navigate to annotations when notebook is pinned, closes #3923 (#3948) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 94 | `38d7ba80f` | catalog/import | feat(opds): support auto-download books from OPDS feeds (#3844) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 95 | `1527dd9b3` | reader core | fix: exponential wheel zoom for images and tables, closes #3956 (#3957) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 96 | `aa60123d3` | reading modes/controls | fix(rsvp): unicode-aware ORP calculation for non-Latin scripts, closes #3958 (#3964) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 97 | `ebbbf104b` | reader core | feat(cjk): support inline annotation(warichu, Gezhu) layout (#3934) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 98 | `6d798542f` | library | fix: restore main library window when going to library from reader, closes #3969 (#3973) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 99 | `e18bfd681` | reader core | fix(reader): smooth out mouse wheel scrolling in scroll mode, closes #3966 (#3974) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 100 | `17f2a17ad` | reading modes/controls | fix(toc): fix auto scroll on book open with pinned sidebar, closes #3945 (#3975) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 101 | `63b0b8702` | reader core | fix(layout): fixed dropdown menu layout for the delete button in details, closes #3940 (#3976) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 102 | `6fcda66b6` | reader core | fix(reader): close stuck reader window on book load failure, closes #3932 (#3980) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 103 | `6d5e59c79` | reading modes/controls | fix(rsvp): resume at stop word, prevent section replay, restore full context (#3960) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 104 | `ca8f0fe9f` | catalog/import | feat(opds): add OPDS-PSE streaming support and custom OPDS 2.0 parser (#3951) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 105 | `6fbf9ef68` | catalog/import | fix(layout): fixed layout for catalog title (#3982) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 106 | `3b03b2c8d` | reader core | fix(txt): more robust txt parsing, closes #3970 (#3983) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 107 | `4b0720a3e` | reading modes/controls | perf(rsvp): windowed context, extraction caching and lazy CFI for sections with thousands of words, closes #3953 (#3984) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 108 | `920627ae5` | reading modes/controls | feat(rsvp): use jieba tokenizer to segment words for Chinese books (#3985) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 109 | `34f19fd14` | reader core | fix(annotation): preserve line breaks in selected text across <br> elements, closes #3981 (#3986) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 110 | `dab92c8a4` | reader core | fix(pdf): prevent continuous scroll kickback (#3990) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 111 | `234ecc311` | ai/assist/dictionary | fix(epub): fall back to case-insensitive zip lookups (#3991) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 112 | `d609de58f` | reader core | fix(reader): preserve position when toggling scrolled mode, closes #3987 (#3996) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 113 | `1d8ed3fc9` | reader core | fix(footnote): ignore background image in footnotes (#3998) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 114 | `a43845b4c` | reader core | fix(layout): symmetric margins and gap in 2-column layout, closes #3909 (#4002) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 115 | `5a0a70a30` | ai/assist/dictionary | feat(reader): custom dictionaries (StarDict + MDict) (#4012) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 116 | `486659a1c` | reader core | feat(annotations): deep links for highlight exports (#4018) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 117 | `fb37406b3` | reader core | feat(annotations): preview mode for deep-link landings (#4019) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 118 | `293d5b5f5` | reading modes/controls | fix(rsvp): cross-device resume seeding + mobile slider drag (#4004) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 119 | `eadb35539` | reader core | fix(txt): recognize 番外/外传 chapter prefixes, closes #4016 (#4025) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 120 | `579e95075` | reading modes/controls | fix(rsvp): split em-dash and en-dash compound words (#4026) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 121 | `176e5df77` | reader core | refactor(settings): move Keep Screen Awake to Behavior > Device (#4027) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 122 | `d1e7b4902` | library | feat(share): time-limited share links with cfi-aware imports (#4037) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 123 | `19f3e65b6` | reader core | fix(share): make /s landing build under Next 16 layout-prop validation (#4040) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 124 | `19f2414f4` | reader core | fix(share): hide download link on share landing page (#4041) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 125 | `f5657fb3a` | library | fix(share): correct recipient import flow and assorted UI polish (#4043) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 126 | `8e7b2192d` | reader core | fix(reader): dismiss annotation popup on section info / progress bar tap (#4047) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 127 | `7bb113370` | ai/assist/dictionary | feat(dictionaries): add DICT/Slob formats and Web Search providers (#4048) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 128 | `cead0f42e` | reader core | compat(css): fixed table layout and style in dark mode (#4055) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 129 | `d66fedcab` | ai/assist/dictionary | feat(reader): manage rules shortcut in proofread popup (#4062) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 130 | `06aec0b59` | reader core | fix(reader): revert footer to default visibility when tap-to-toggle is disabled (#4065) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 131 | `9b0072173` | catalog/import | feat(metadata): parse Calibre series info from PDF and CBZ (#4066) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 132 | `c27245e98` | reader core | feat(reader): support deeplink and web link in annotation export (#4067) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 133 | `5dc252845` | library | fix(library): support dropping directories to import books (#4068) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 134 | `e7f370453` | reader core | fix(layout): resolve layout issues with mixed writing modes in adjacent sections (#4069) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 135 | `a272ba892` | ai/assist/dictionary | feat(reader): replace dictionary tabs with stacked result cards (#4071) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 136 | `30dee7b90` | ai/assist/dictionary | feat(dict): improve MDict rendering and dictionary management (#4072) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 137 | `2d5590ec1` | library | feat(applock): 4-digit PIN gate at app launch (#4093) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 138 | `c30a59a9e` | reader core | fix(epub): accept EPUBs with malformed first ZIP local file header (#4103) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 139 | `295a58898` | reader core | feat(share): route annotation exports through the system share sheet (#4107) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 140 | `f6f446e8a` | reader core | feat(applock): blinking PIN cursor + misc UI polish (#4110) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 141 | `772bb73b4` | reader core | ui/ux: codify design system and migrate settings to shared primitives (#4116) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 142 | `d326e1c73` | reader core | fix: hide popup triangle when inside popup + EPUB image-only paragraph rendering (#4121) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 143 | `598eb7723` | library | feat(library): redesign empty-library onboarding (#4122) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 144 | `9a05935ca` | reader core | feat(reader): improve Japanese selection UX by disabling furigana selection (#4137) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 145 | `fed8ab7b6` | tts/audio | fix(tts): restore cross-section auto-page-turn during TTS playback (#4148) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 146 | `54aa20d4f` | reader core | fix(footnote): don't treat in-book numeric chapter/verse links as footnotes (#4152) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 147 | `244b3fd99` | reader core | fix(dev): rewrite HMR WebSocket URL in Tauri mobile dev, closes #4150 (#4160) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 148 | `708e06a46` | catalog/import | fix(opds): show summary as book description, closes #4156 (#4162) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 149 | `7716f189c` | reader core | fix(layout): keep header/footer transparent and fixed in scrolled mode, closes #4157 (#4168) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 150 | `4cd5d56b4` | tts/audio | fix(tts): retry Edge TTS preload up to 3 times on failure, closes #4147 (#4171) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 151 | `f5e729a17` | reader core | fix(reader): revert smooth mouse-wheel scrolling in scroll mode, closes #4130 (#4172) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 152 | `787bbf210` | reader core | feat(reader): custom hardware-button page turning (#4177) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 153 | `1a3d393e7` | reader core | feat(reader): add "Clear Annotations" entry to the book menu (#4175) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 154 | `2acd08202` | reader core | fix(a11y): use position absolute for skip-next-section link to prevent blank page (#4182) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 155 | `411d3ad68` | reader core | fix: export annotations even without TOC, closes #4186 (#4188) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 156 | `40b7c2c15` | reader core | refactor(reader): harden saveConfig updatedAt refresh (#4189) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 157 | `d2ff47029` | catalog/import | fix(opds): detect XML feeds with leading whitespace, closes #4181 (#4190) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 158 | `2d30868d2` | library | fix(fonts): hydrate custom fonts on library page, closes #4178 (#4191) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 159 | `8dfc0e945` | ai/assist/dictionary | fix(dictionary): normalize lookup query with trim + case fallback (#4192) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 160 | `f4483643f` | tts/audio | fix(tts): skip hidden footnotes in TTS, closes #4135 (#4193) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 161 | `ad1c2d6bb` | reader core | fix(reader): filter Magic Mouse wheel events to stop accidental page turns (#4195) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 162 | `3620c6103` | library | feat(reader): import annotations from Moon+ Reader (.mrexpt) (#4174) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 163 | `ba6e5899e` | reading modes/controls | feat(reader): RSVP CJK character mode and whole-word highlight (#4199) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 164 | `1d4b7eed8` | reader core | fix(txt): merge scene-break sections into the preceding chapter (#4063) (#4207) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 165 | `0fba5b705` | reader core | feat(config): version book config schema (#4208) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 166 | `52f963481` | reader core | feat(backup): include global settings in backup zip (#4211) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 167 | `28a7785e5` | reader core | test(e2e): add a Playwright web e2e lane (reading & annotation flows) (#4214) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 168 | `d35d2002c` | security | chore(security): add Scorecard workflow for supply-chain security (#4221) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 169 | `d25c41ee8` | security | chore(security): address code scanning findings (#4224) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 170 | `0b18de058` | catalog/import | feat(send): Send to Readest — multi-channel capture into your library (#4230) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 171 | `a30efe49c` | catalog/import | fix(send): make recent-activity status labels translatable (#4236) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 172 | `d943a1c14` | library | fix(library): clear nested-folder groups when deleting from bookshelf (#4226) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 173 | `ff4c03919` | reader core | refactor(alert): stack title above actions row to fix narrow-width layout (#4239) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 174 | `ded64159b` | catalog/import | fix(send): library-clobber + perf: lazy-load conversion deps (#4238) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 175 | `5ac8564e4` | library | feat(library): add Import from Folder dialog with format/size filters (#4229) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 176 | `17749f7cc` | catalog/import | feat(send): mobile URL clipping via native-bridge plugin (#4252) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 177 | `ae81cd015` | reader core | feat(annotator): support global highlights that fan out across all matching positions (#4257) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 178 | `f6dfd09d8` | catalog/import | feat(send): browser extension that clips pages into Readest as EPUBs (#4266) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 179 | `60203a8dc` | reader core | docs: add architecture and code-layout guides (#4265) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 180 | `81bd5ee6b` | catalog/import | fix(send): address extension review findings (#4271) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 181 | `f4de55e8f` | catalog/import | feat(send): twitter/x site rule + meta-tag fallback for stale rules (#4270) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 182 | `8a19c686c` | security | ci: address code scanning scorecard alerts (#4275) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 183 | `b78daed56` | catalog/import | feat(send): gate email-in to Plus, Pro, and Lifetime plans (#4280) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 184 | `49b171f5e` | reader core | fix(reader): restore right-column clicks and selection in dual-page mode (#4283) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 185 | `336a719e0` | library | fix(library): seed custom texture store at boot so saved texture renders on first paint (#4284) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 186 | `6bc4a96b9` | reader core | feat(reedy): Phase 1B — wire Reedy into the chat, settings, and Sources UI (#4296) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 187 | `5c71ccb90` | reader core | feat(reedy): Appendix A · Phase 2.4 — built-in tools (non-memory families) (#4299) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 188 | `a86b09dba` | reader core | feat(reedy): Appendix A · Phase 2.5 — PromptContextBuilder + layers + tokenBudget (#4300) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 189 | `e0ce6c8c2` | reader core | feat(reedy): Appendix A · Phase 4 — custom thread UI on AgentRuntime (#4308) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 190 | `4c539e6be` | catalog/import | fix(opds): show 'Open & Read' for publications already in the library (#4313) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 191 | `5a092f16f` | security | feat(ios): folder import with security-scoped bookmark persistence (#4314) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 192 | `ff605e000` | library | feat(library): in-place import from registered external folders (#4315) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 193 | `1f5481c0e` | tts/audio | fix(fxl): align TTS highlight overlay with scaled iframe coords (#4324) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 194 | `315d144d8` | library | fix(library): suppress loading-dots flicker on reader→library return (#4325) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 195 | `cf44e8518` | library | fix(reader): fit duokan-page-fullscreen cover image without cropping (#4328) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 196 | `a1cb228d0` | library | fix(library): wrap select-mode action bar on small screens (#4329) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 197 | `4e01e13ee` | library | fix(library): make bookitem-main shrink to match cover in fit mode (#4331) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 198 | `93abca896` | ai/assist/dictionary | feat(dict): faster MDict/StarDict import + lazy lookup; raw .dict; UX (#4334) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 199 | `648c35b33` | reader core | feat(reader): add disableSwipe option to disable swipe-to-paginate (#4335) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 200 | `48d52ea89` | ai/assist/dictionary | feat(telemetry): opt-out by default for new users; consent prompt for 10% (#4340) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 201 | `3c134380b` | library | feat: add empty state hints and loading indicators for annotations, bookmarks, notes, font import, and Moon+ Reader import (#4338) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 202 | `ce0ab5cc6` | library | feat(library): add secondary "Then by" sort with smart defaults (#4347) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 203 | `3c14d5a4b` | reader core | fix(reader): scrolled-mode prev-section preloading and nav drift (#4112) (#4349) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 204 | `2f5e58365` | library | feat(annotations): configurable export link type + dedicated Import Annotations modal (#4350) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 205 | `c5a1a3afe` | catalog/import | feat(opds): add facet navigation and quick catalog registration in header (#4348) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 206 | `6405ba31c` | reader core | fix(reader): keep TOC scrolled to the current chapter on refresh (#4353) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 207 | `a848c142c` | reader core | test(reader): de-flake scrolled-mode backward-preload precondition (#4112) (#4354) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 208 | `7bdd3ecde` | reader core | perf(sidebar): virtualize BooknoteView and memoize derivations (#4352) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 209 | `89723b421` | reading modes/controls | test(rsvp): stop RSVPController tests leaking real timers into teardown (#4355) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 210 | `36e11de33` | reader core | feat(reader): swipe-to-adjust brightness gesture on mobile (#3021) (#4356) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 211 | `789d03122` | reading modes/controls | feat(reader): line-aware reading ruler (#4358) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 212 | `bed31e818` | library | feat(library): add Manage Cache to advanced settings (#4359) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 213 | `f1ae05076` | reader core | fix(ui): refine reader side panels and their empty states (#4361) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 214 | `6605ae824` | ai/assist/dictionary | feat(dictionary): import companion MDD files that share the MDX prefix (#4363) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 215 | `aa318904b` | reader core | fix(reader): show full bookmark ribbon in scrolled mode header (#4365) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 216 | `11666be5e` | reader core | fix(reader): collapse TOC to the current chapter's path by default (#4366) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 217 | `ef603852b` | tts/audio | feat(tts): hotkey to highlight the currently-spoken sentence (#4085) (#4368) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 218 | `de3e4b6d3` | library | fix(reader): show Duokan fullscreen cover in scrolled mode (#4379) (#4381) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 219 | `9b4db4449` | reader core | fix(pdf): ship jbig2.wasm so scanned PDFs render in packaged builds (#4382) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 220 | `e8675fb7e` | reader core | fix(reader): inline custom @font-face rules in iframe stylesheet (#4383) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 221 | `97191a57c` | reading modes/controls | fix(reader): stop reading ruler creeping down on scroll (#4386) (#4388) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 222 | `45ef5f751` | reader core | fix(metainfo): declare desktop and mobile device support (#4395) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 223 | `bc9fe67ab` | security | fix(desktop): sanitize invalid .window-state.json before restore (#4401) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 224 | `458ad7510` | reader core | fix(reader): scroll wide EPUB tables horizontally (#4391) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 225 | `176b950c9` | reader core | fix(reader): replace light callout backgrounds in dark mode (#4392) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 226 | `3a81e0991` | reader core | fix(reader): scroll oversized blocks in-place instead of turning the page (#4400) (#4415) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 227 | `fe7fe2548` | reader core | fix(reader): show background texture in paginated mode (#4399) (#4417) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 228 | `4abbc0254` | reading modes/controls | fix(reader): stop footer progress info painting a stray focus ring (#4397) (#4418) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 229 | `fe853554a` | catalog/import | feat(library): send book file from bookshelf selection popup (#4402) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 230 | `f9ddddb6a` | library | fix(library): use ghost cancel buttons in migrate-data dialog for e-ink (#4396) (#4422) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 231 | `963bab0f0` | library | fix(library): stop bookshelf context menu shuffling its order (#4389) (#4421) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 232 | `e4bb9fc4b` | reader core | refactor(share): make saveFile content nullable for path-based shares (#4424) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 233 | `9d8062ae2` | reader core | fix(reader): keep table background matching the page in dark mode (#4419) (#4426) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 234 | `578b7ba14` | reader core | fix(reader): restore annotation list auto-scroll to the nearest item (#4428) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 235 | `c2bbb6119` | reader core | fix(reader): keep paginated page background inside its column (#4394) (#4429) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 236 | `4d1205fdf` | reader core | fix(reader): stop zoomed image pan from flickering on desktop, closes #4451 (#4465) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 237 | `1eaf16ffc` | catalog/import | fix(opds): tolerate junk after document element in feeds (#4479) (#4506) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 238 | `676e14234` | reader core | fix(reader): correct RTL reading position restore on book reopen (#4505) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 239 | `ad23fbba9` | reader core | fix(reader): dismiss annotation popup when selection clears (#4483) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 240 | `8425d0b91` | catalog/import | fix(opds): render HTML in publication descriptions (#4510) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 241 | `d12e1ad08` | catalog/import | fix(opds): enable search for OPDS 2.0 JSON catalogs, closes #4502 (#4509) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 242 | `88d8aa285` | library | feat(metadata): show file path for in-place imported books (#4508) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 243 | `7e5c74f5e` | catalog/import | chore(memory): record OPDS HTML description and JSON search notes (#4516) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 244 | `11d796361` | library | perf(import+open): native Rust EPUB/MOBI parser, OPF prefetch, parallel TOC enrichment (#4369) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 245 | `607e646bc` | security | chore(deps): bump shell-quote to 1.8.4 and qs to 6.15.2 for security (#4523) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 246 | `2ade76995` | reader core | feat(toc): show current reading page under the active item (#4513) (#4525) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 247 | `31176e5d4` | reader core | fix(paginator): bump foliate-js submodule for scrollBounds guard (#4526) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 248 | `1e26c5d76` | catalog/import | fix(nav): bound section-scan concurrency to keep zip.js writers from ERRORED-ing (#4528) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 249 | `d165e8df2` | reader core | fix(reader): turn automatically when highlighting across pages (#4487) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 250 | `6dc42222e` | reader core | fix(reader): keep double-click-and-drag from turning the page (#4524) (#4536) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 251 | `cf41e7d50` | reading modes/controls | feat(rsvp): apply reader font face/family settings to the RSVP word (#4519) (#4537) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 252 | `64350ca63` | reader core | fix(reader): keep scrolled-mode scrollbar visible after opening a book (#4470) (#4538) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 253 | `755bee1ee` | reader core | fix(reader): prevent accidental paragraph-mode exit and center its bar (#4474) (#4539) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 254 | `d6e981e56` | reader core | fix(reader): hide footnote aside border again when custom fonts are loaded (#4438) (#4540) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 255 | `390c71107` | ai/assist/dictionary | feat(rsvp): configurable start delay, word stepping, context dictionary lookup, and keyboard shortcut (#4541) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 256 | `ceddee379` | library | feat(library): search a book on Goodreads from the library and reader (#4543) (#4548) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 257 | `9dc41e7ad` | reader core | feat(reader): reference page numbers from EPUB page-list with manual page count fallback (#4549) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 258 | `5cab1fa94` | reader core | feat(css): override document layout also apply to hyphenation, closes #4529 (#4546) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 259 | `da6f45f69` | reader core | ci: single, workspace-aware rust-cache for build_tauri_app (#4550) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 260 | `12ac7ae6c` | reader core | fix(reader): draw annotation highlights over bullet lists (#4552) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 261 | `1ce79d9ab` | reader core | perf(reader): reduce open-book TBT by batching layout-thrashing reads/writes and deferring annotation page back-fill (#4554) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 262 | `1c392de0f` | library | perf(reader): throttle library.json writes and cache known dirs to cut IPC (#4556) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 263 | `59d4f0aa3` | reader core | perf(reader): split progress into its own store to cut React commit storm (#4557) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 264 | `ee01fcd12` | reader core | fix(reader): texture the scrolled-mode top inset mask, closes #4486 (#4563) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 265 | `7cba22ab3` | reader core | perf(reader): coalesce relocate events and memoize BookCell to stop per-swipe storm (#4562) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 266 | `7f57af8f9` | reader core | perf(cfi): bucket booknotes per chapter and batch-collapse location matcher (#4561) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 267 | `852d0ae3e` | reader core | fix(reader): keep dark-mode page body transparent so the bg texture shows, closes #4446 (#4564) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 268 | `c72afe269` | tts/audio | fix(tts): keep voice list stable across region variants of a language, closes #4033 (#4565) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 269 | `a56cc6c61` | tts/audio | feat(tts): word-by-word highlighting for Edge TTS, closes #4017 (#4566) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 270 | `b6937f43f` | tts/audio | chore(agent): stage memories (#4569) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 271 | `67c22c770` | reader core | feat(reader): Share intent + customizable annotation toolbar (#4014) (#4570) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 272 | `4b0bbc77b` | reader core | fix(reader): open TXT files shared via "Open with" (#4571) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 273 | `5a8f0873f` | library | fix(library): refresh book cover after editing metadata (#4572) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 274 | `cc618b873` | tts/audio | test(tts): add browser e2e for auto-advance across a chapter boundary (#4573) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 275 | `0f0b4279a` | reader core | perf(reader): memoize global-annotation fan-out per section (#4575) (#4579) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 276 | `aab721b21` | ai/assist/dictionary | feat(dictionary): lemmatize inflected words before lookup (#4574) (#4582) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 277 | `b76e3a371` | reader core | fix(nightly): publish latest.json via directory rclone copy (#4588) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 278 | `51fede1a0` | tts/audio | fix(rsvp): keep the audio toggle from overlapping transport on mobile (#4585) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 279 | `490824504` | reader core | feat(reader): Word Wise inline vocabulary hints (#4589) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 280 | `79496f88d` | reader core | feat(settings): move update & telemetry controls into Settings → Behavior (#4592) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 281 | `675ee78bc` | library | perf(library): in-place re-import is a no-op on the same file path (#4597) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 282 | `e145eb835` | reader core | feat(reader): open image gallery & table zoom on single tap (#4600) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 283 | `f950685f2` | tts/audio | chore(agent): update agent memories (#4610) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 284 | `a30a310a1` | catalog/import | fix(opds): handle entries with no downloadable format (#4599) (#4611) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 285 | `757ed8066` | library | feat(library): show series and number in list view (#4593) (#4612) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 286 | `d202d7a61` | library | feat(library): add Clear Pending action to transfer queue (#4617) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 287 | `d6e59cedd` | security | chore(deps): bump esbuild to 0.28.1 and vitest to 4.1.x for security advisories (#4618) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 288 | `f6fbbf59f` | security | chore(deps): bump transitive deps for security advisories (batch) (#4620) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 289 | `5e217544f` | security | chore(config): add disableIncrementalCache to skip populating remote R2 incremental cache (#4623) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 290 | `d5c02e625` | library | feat(library): add Purge Data and fold detail actions into a More menu (#4615) (#4626) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 291 | `fa120081a` | library | fix(library): never let a routine save shrink library.json (cold-start "Open with" wipe) (#4627) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 292 | `5e5564ef3` | reader core | fix(search): show context for matches in italicized text (#4594) (#4631) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 293 | `c2ac20794` | ai/assist/dictionary | refactor(wordlens): rename "Word Wise" to "Word Lens" (#4633) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 294 | `8bcb9f9b2` | ai/assist/dictionary | feat(wordlens): trim hints to first sense + suppress known derivations (#4635) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 295 | `1ea607829` | library | fix(share): load cover under COEP, keep share links out of the clipper, fix in-app import (#4636) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 296 | `495783d04` | security | fix(security): harden OPDS proxy SSRF, storage key validation, Stripe check (#4638) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 297 | `4025c4d7b` | security | fix(security): scope Tauri download_file/upload_file to fs_scope (#4639) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 298 | `403be32d5` | library | fix(epub): import books whose OPF has an unescaped ampersand (#4640) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 299 | `bcd9ed724` | reader core | fix(reader): paginate inline-block-wrapped chapters instead of clipping them (#4641) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 300 | `6626db967` | reader core | fix(reader): keep last paragraph's line spacing by making the section skip link a <span> (#4642) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 301 | `ff96c6d3f` | reader core | feat(annotations): unify highlights and annotations into one record (#3870, #4511) (#4647) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 302 | `be17654fc` | reading modes/controls | fix(rsvp): render RTL words whole so Arabic shapes correctly (#4630) (#4648) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 303 | `af587b1a4` | library | fix(metadata): parse FB2 series from title-info sequence (#4646) (#4649) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 304 | `446c2c72d` | security | fix(security): unblock app-dir downloads broken by transfer_file fs-scope guard (#4651) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 305 | `be5862f08` | library | fix(library): group secondary series sort by series name then index (#4652) (#4653) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 306 | `e00a1e4f0` | reader core | fix(settings): tidy Word Lens data pack and level rows on mobile (#4655) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 307 | `e327d0c99` | tts/audio | feat(tts): reuse the speaking session across paragraph & RSVP modes (#4657) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 308 | `1faa931a0` | library | fix(txt): stop detecting measure-word prose as chapters in TXT import (#4658) (#4660) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 309 | `4cb608be2` | catalog/import | chore(send-to-readest): v0.2.1, zip packaging script, store submission doc (#4661) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 310 | `6caa376f8` | reader core | feat(reader): Webtoon Mode seamless continuous scroll for image books (#3647) (#4662) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 311 | `b7585ac46` | catalog/import | chore(send-to-readest): add Chrome Web Store screenshot generator (#4664) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 312 | `dd53e5245` | reader core | chore: only show the current position item in TOC and update agent memories (#4665) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 313 | `d5c640996` | catalog/import | fix(opds): show Add Catalog dialog above Settings on mobile (#4669) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 314 | `23d1ef6f1` | reading modes/controls | fix(rsvp): restore in-flow control bar layout reverted by #4589 (#4671) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 315 | `b9a3ee725` | catalog/import | fix(opds): make saved catalog card hover distinct from dialog background (#4673) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 316 | `0ab8f6042` | library | fix(reader): keep cover background-image visible under a texture (#4675) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 317 | `a9526377a` | library | fix(reader): stretch Duokan fullscreen cover to fill the page (#4679) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 318 | `7185dca1a` | reader core | feat(reader): add save/share button to image gallery toolbar (#4680) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 319 | `353d38142` | security | fix(deps): bump undici and dompurify overrides for security advisories (#4684) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 320 | `2153f7cc0` | reader core | fix(reader): reset scroll to top on paginated fit-width page turn (#4683) (#4695) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 321 | `ab935f851` | library | fix(library): preserve original files when deleting "read in place" books (#4696) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 322 | `799fc0e0a` | library | feat(library): add opt-in "purge reading data" toggle to delete confirm (#4698) (#4705) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 323 | `c781aedda` | reader core | feat(reader): add sticky progress bar with chapter ticks (#4707) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 324 | `15f183878` | tts/audio | chore(agent): update agent memories (#4709) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 325 | `a9c0f3d46` | reader core | fix(reader): remove 1px white seam in PDF spread at fractional DPI (#4587) (#4713) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 326 | `b87c735c1` | tts/audio | fix(tts): keep native System TTS reading past unspeakable chunks offline (#4613, #4408) (#4716) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 327 | `a6d28ffcd` | ai/assist/dictionary | fix(reader): add Alt+P proofread shortcut and let Shift+P exit paragraph mode (#4717) (#4723) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 328 | `f4bb11126` | ai/assist/dictionary | feat(translator): add Urdu as a Translate Text target language (#4721) (#4726) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 329 | `942095bcd` | reader core | fix(reader): make Shift+P toggle, exit, and resume paragraph mode reliably (#4717) (#4725) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 330 | `acf2b165f` | library | fix(library): keep in-place book paths absolute so uploads stay in fs scope (#4720) (#4730) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 331 | `1b44b95d3` | reader core | fix(reader): smooth single-notch wheel scroll over PDF pages in scrolled mode (#4727) (#4732) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 332 | `140b71ee3` | ai/assist/dictionary | feat(dictionary): add adjustable dictionary popup font size (#4443) (#4734) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 333 | `bc9b8b23e` | reader core | fix(reader): stop per-chapter listener leak that degrades paragraph mode (#4735) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 334 | `787641b5b` | tts/audio | chore(agent): update agent memories (#4737) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 335 | `e982af172` | reader core | feat(reader): adjust text selection with Shift/Ctrl/Opt+Arrow keys (#4728) (#4738) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 336 | `428168ac9` | reader core | fix(reader): show the centred section's chapter title in scrolled mode (#4739) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 337 | `b1346bf16` | ai/assist/dictionary | feat(wordlens): en-en glosses, styling, derivation lemmas, display-time cap (#4744) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 338 | `acd4a67dc` | reader core | fix(reader): require a still-hold before instant-highlight on touch (#4745) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 339 | `6301c620a` | library | fix(library): import books opened via "Open with" by default on mobile (#4746) (#4747) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 340 | `8810aa6db` | reader core | fix(reader): stop trackpad pinch-zoom flicker on image viewer (#4742) (#4748) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 341 | `e2f65278e` | catalog/import | fix(opds): dereference publication self link for full metadata (#4749) (#4753) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 342 | `7d1a60b9e` | library | feat(library): separate background texture for library and reader (#4754) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 343 | `ac6249cbc` | catalog/import | feat(opds): show groups as horizontal carousels when 2+ groups (#4750) (#4755) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 344 | `7da5f8321` | reader core | fix(reader): make annotation toolbar customization apply to all books (#4760) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 345 | `005aa2d61` | security | fix(security): iframe srcdoc atrribute can lead to arbitrary code execution (#4762) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 346 | `f7124cbee` | reader core | fix(css): multiply mix blend for images in dark override color mode (#4763) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 347 | `163487b5e` | reader core | feat(reader): add regex and nearby-words search modes (#4560) (#4764) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 348 | `d963b911c` | reader core | fix(reader): zoom linked images on single tap (#4757) (#4766) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 349 | `44a6900da` | reader core | feat(reader): extend selections and highlights across pages (#4741) (#4767) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 350 | `0589cb4f4` | reader core | fix(reader): stop a quick-deleted highlight from being re-drawn (#4773) (#4779) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 351 | `fb943987e` | catalog/import | fix(opds): hide popular catalog after adding it to My Catalogs (#4782) (#4787) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 352 | `370a51662` | reader core | feat(reader): glue non-breaking spaces after short Russian words (#4769) (#4798) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 353 | `0b4993407` | reader core | feat(reader): add contrast option to PDF/CBZ view menu (#4800) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 354 | `4ba78490a` | library | fix(library): prevent series and description overlap in list view (#4796) (#4799) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 355 | `7544835fb` | catalog/import | chore(agent): update agent memories (#4802) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 356 | `01a54238a` | reader core | fix(annotator): clean up empty highlight on annotation cancel (#4791) (#4804) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 357 | `dced42912` | reader core | feat(reader): filter exported annotations by color and style (#4801) (#4806) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 358 | `4874eb9ae` | tts/audio | feat(reader): add TTS highlight granularity setting (word or sentence) (#4807) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 359 | `97868f048` | reader core | fix(reader): keep negative table margins from clipping wrapped layout tables (#4439) (#4808) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 360 | `a0227f98e` | reader core | perf(reader): stop per-frame background reflow on swipe page turns (#4785) (#4814) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 361 | `580c5e5de` | reader core | fix(reader): eliminate PDF scrolled-mode rendering lag on mobile (#4795) (#4813) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 362 | `24370ca51` | reader core | feat(reader): render Markdown (.md) files at runtime (#774) (#4816) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 363 | `348c85f64` | reader core | fix(reader): cap auto page-turn corner zone size (#4812) (#4820) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 364 | `f8916e128` | reader core | fix(reader): smooth pinch-zoom and pan for scrolled-mode PDF (#4817) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 365 | `324bb8a36` | reader core | feat(reader): add e-ink screen refresh page-turner action (#4687) (#4822) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 366 | `4d08b01b4` | library | feat(library): add recently read shelf to the library (#3797) (#4829) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 367 | `69599e2bc` | reader core | fix(reader): render code operators literally instead of as ligatures (#4832) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 368 | `ae03be96d` | tts/audio | chore(agent): update agent memories (#4833) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 369 | `7da41a65a` | reader core | feat(widget): add mobile home-screen reading widgets (#1602) (#4842) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 370 | `eaf307e71` | ai/assist/dictionary | fix(translate): align RTL translated text to the start (#4844) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 371 | `70bad93eb` | reader core | feat(reader): select word on double-click and run instant action or toolbar (#4846) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 372 | `a23427ccc` | library | fix(widget): avoid recycling aliased source bitmap for 2:3 covers (#4850) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 373 | `3ac1a1a45` | reader core | fix(reader): remember last read position for markdown files (#4871) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 374 | `17e60f1e4` | reader core | fix(reader): fix fixed-layout spread spine seam and zoomed-out blank page (#4857) (#4873) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 375 | `49391124c` | reading modes/controls | fix(reader): correct reading ruler direction for vertical-rl books (#4865) (#4879) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 376 | `5bc8eda50` | ai/assist/dictionary | feat(proofread): editable Find pattern and per-rule enable/disable toggle (#4859) (#4888) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 377 | `4d645befd` | library | feat(library): add "Progress Read" sort option (#4427) (#4893) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 378 | `fd8fbb178` | reader core | fix(reader): apply page margin changes live on all platforms (#4898) (#4900) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 379 | `c5304cd46` | reader core | fix(reader): turn pages horizontally for vertical-rl books (#624) (#4899) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 380 | `c8e2c9533` | library | feat(library): auto-import new books from watched folders (#3889) (#4902) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 381 | `8c91ad411` | reader core | fix(reader): open annotation deep link when a different book is open (#4887) (#4910) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 382 | `2b524439b` | reader core | fix(reader): keep running header/footer readable over light PDFs in dark mode (#4901) (#4911) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 383 | `745f28f34` | reader core | fix(reader): distinguish two-finger scroll from pinch-zoom on touchscreens (#4858) (#4912) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 384 | `6391bfe78` | reader core | feat(settings): redesign theme mode toggle as a segmented control (#4831) (#4913) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 385 | `6b403d019` | catalog/import | feat(calibre): add Readest calibre plugin to push books and metadata (#4918) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 386 | `42f9b8fe3` | tts/audio | feat(tts): gapless Web Audio playback engine for Edge TTS with chapter timeline and seek (#4931) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 387 | `843ab3448` | tts/audio | feat(tts): keep TTS playing when the book is closed (#4941) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 388 | `ec45a080f` | catalog/import | feat(metadata): surface calibre custom columns from EPUB metadata (#4939) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 389 | `920286484` | library | fix: real fix for library-save storage-permission crash + narrowed view-transition filter (#4943) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 390 | `e7f0b53bd` | catalog/import | fix(opds): crawl subdirectories when auto-downloading directory-style catalogs (#4948) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 391 | `75f1fafe9` | reader core | feat(reader): slide and page curl turn animations (#555) (#4940) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 392 | `52be6fa06` | reader core | fix(reader): open books without a View Transition to avoid timeout (#4949) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 393 | `6f3b401c2` | reader core | feat(reader): middle mouse button autoscroll in scrolled mode (#4955) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 394 | `4527aa277` | tts/audio | feat(reader): add TTS speak button to dictionary popup (#4876) (#4957) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 395 | `f7f85330a` | library | chore(agent): update agent memories (#4958) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 396 | `2a837cb50` | reader core | fix(reader): fix PDF text selection misplaced by OS font scaling (#49) (#4960) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 397 | `a02b236e9` | reader core | fix: more production crashes (View Transition noise, book-dir race, stats transaction) (#4962) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 398 | `db1d63cdc` | reader core | test(reader): harden fixed-layout wheel double-scroll test against CI flake (#4978) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 399 | `600d69fa5` | reader core | fix(reader): gate route View Transitions on API support (READEST-9) (#4989) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 400 | `3ce5a5c8e` | reader core | fix(reader): center the lone PDF page in portrait auto-spread (#4984) (#4992) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 401 | `17de9357d` | tts/audio | feat(reader): redesign the TTS control as a mini player with an expandable player sheet (#4996) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 402 | `f8ad47a41` | reading modes/controls | feat(reader): Auto Scroll reading mode for scrolled flow (#4998) (#4999) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 403 | `a8d341120` | reader core | fix(reader): gate captured slide/curl turn on scrollLocked like push (#5000) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 404 | `0c24aad60` | reader core | fix(reader): let page margins shrink into the safe-area inset (#4761) (#5001) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 405 | `5b8ab3db2` | reader core | docs: move source build instructions to CONTRIBUTING.md (#5017) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 406 | `ec6781fe7` | tts/audio | fix: media-session teardown race + page_stat view migration idempotency (#5019) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 407 | `a9fb86ddc` | reader core | fix(reader): guard foliate paginator null-document crashes (#5020) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 408 | `fdd13a5a6` | reader core | fix(reader): guard applyMarginAndGap against a torn-down view (#5022) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 409 | `9c4f9550b` | reader core | fix(layout): show progress info on top of the page in scrolled mode (#5029) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 410 | `0e125b156` | reader core | chore(style): unified info bar font style (#5045) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 411 | `f726ebf82` | catalog/import | fix(opds): fix logic for temporary destination filename (#5024) (#5058) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 412 | `fe1060845` | reader core | refactor: rename ColorPanel to ThemePanel (#5042) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 413 | `4fcc8d10f` | tts/audio | feat(tts): make inter-sentence and inter-paragraph gaps configurable (#5057) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 414 | `eacb517de` | reader core | feat(settings): Increase margin upper bounds (#5071) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 415 | `cc7a3938a` | reader core | fix: only open last book if book is not marked as finished (#5072) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 416 | `45466bc6b` | ai/assist/dictionary | fix(dictionary): let a web search entry lead the popup when it is first in the configured order (#5086) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 417 | `9c6081402` | reader core | feat(markdown): render footnotes in .md books (#5074) (#5095) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 418 | `c81547cd5` | library | feat(sorting): add toggle to filter by time remaining (#5079) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 419 | `a97e44bbd` | reader core | fix(epub): load chapters whose zip entry name needs percent-encoding (#5100) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 420 | `d2668d167` | reader core | fix(reader): remove long-press to zoom images and tables (#5108) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 421 | `d185bd92b` | library | fix(library): keep demo books out of the cloud book channel (#5049) (#5110) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 422 | `9fb50880e` | reader core | fix(settings): keep the screen awake only while reading (#5104) (#5113) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 423 | `213f8ac76` | tts/audio | fix(tts): use more intuitive icons in tts player (#5117) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 424 | `fcdc6567e` | catalog/import | fix(opds): normalize XML MIME types (#5120) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 425 | `48d8a25d3` | catalog/import | fix(opds): escape malformed XML in proxy (#5121) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 426 | `c8a3f85a8` | tts/audio | feat(tts): persistent per-book audio cache with offline downloads (#5126) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 427 | `2170da04f` | tts/audio | chore: update agent memories (#5130) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 428 | `82dd9b8bb` | reader core | fix(deploy): restore webpack build so the Cloudflare worker fits 64 MiB (#5136) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 429 | `dbd7d2ac3` | ai/assist/dictionary | fix: change dictionary icon (#5135) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 430 | `b6c994413` | tts/audio | fix(tts): show mini player immediately and keep it above bottom bar and footer (#5144) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 431 | `e7af44379` | tts/audio | test(tts): stop detached speak loops so no state dispatch escapes teardown (#5151) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 432 | `7f01d2b4f` | reader core | feat: redesign custom theme creation menu (#5152) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 433 | `6fd1fc42e` | ai/assist/dictionary | chore: gate rust_lint on src-tauri changes and drop redundant btn-primary in WordLens (#5156) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 434 | `114396b84` | reader core | fix(reader): resolve footer items overlapping on narrow screens (#5158) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 435 | `db38e2a7b` | tts/audio | feat(tts): add 0.8x and 0.85x tts speech speed presets (#5157) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 436 | `2e90d3719` | reader core | fix(reader): return the turn promise from the captured view.next/prev wrappers (#5159) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 437 | `6807664e9` | reader core | fix(reader): do not toggle bars on vertical pan swipes over fixed-layout pages (#5160) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 438 | `d440df50e` | tts/audio | feat(tts): refine the TTS player sheet and redesign the mini player (#5162) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 439 | `01dabc69d` | tts/audio | feat(tts): add mini player Player Style (full/minimal); keep Tauri off the edge proxy (#5170) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 440 | `9ec7b3df9` | reader core | feat(annotator): copy a highlight or note with its deep link (#5171) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 441 | `bca21afeb` | library | fix(transfer): stop bulk cloud uploads from freezing the library (#5047) (#5172) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 442 | `5f0105259` | library | fix(library): anchor the native context menu popup at the pointer position (#5182) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 443 | `6764498cd` | reader core | refactor: create primitive `Toggle` component (#5173) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 444 | `bc5e6640b` | reader core | fix(reader): stop vertical swipes from turning or flashing the layered slide (#5185) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 445 | `278055b87` | reader core | perf(test): reduce unit test runtime (#5190) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 446 | `2c6729962` | catalog/import | fix(opds): keep re-added catalogs from vanishing after app restart (#5191) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 447 | `c39c85c32` | tts/audio | test: remove redundant cases and silence passing logs (#5192) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 448 | `bd63d72e0` | reader core | feat: use shorter quote in theme preview (#5197) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 449 | `54ad2e916` | reader core | fix(reader): keep the side panel resize handle from sticking over PDF pages (#5198) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 450 | `09548d998` | library | fix(library): keep the select-mode action bar from hiding the last book (#5200) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 451 | `fd3224353` | reader core | feat: improve accuracy of time remaining calculation (#5194) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 452 | `1edc4bb32` | library | fix(library): show only currently-reading books on recent shelf and widget (#5201) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 453 | `56e4faa5d` | reader core | fix(reader): preserve paragraph breaks when copying text (#5202) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 454 | `086498326` | ai/assist/dictionary | fix(reader): support offline dictionary pronunciation (#5205) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 455 | `8ba9cf277` | reading modes/controls | feat(reader): add right-edge swipe to adjust auto scroll speed (#5206) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 456 | `7b12f1906` | reader core | fix(reader): draw the theme background on the curl back face (#5208) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 457 | `5191b327d` | library | chore: update agent memories (#5209) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 458 | `4512f3985` | reader core | fix(reader): gate concurrent programmatic captured page turns (#5211) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 459 | `633ac5ac8` | reader core | fix(reader): make the custom theme editor readable on mobile (#5212) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 460 | `f3930b814` | tts/audio | fix(reader): keep TTS media session and volume control with volume-key paging (#5218) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 461 | `2aa044d27` | reader core | fix(reader): keep captured turns aligned with the finger (#5217) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 462 | `a32646545` | reader core | Fix high-priority reader runtime errors (#5236) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 463 | `7d05581ee` | library | feat: add setting to enable skeuomorphic book covers (#5245) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 464 | `5e2836b08` | reader core | feat(theme): unify theme selector and bg texture selector styling (#5305) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 465 | `79b75e17d` | reader core | fix(reader): invalidate stale nav cache for encoded TOC hrefs (#5308) (#5311) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 466 | `46947af4b` | reader core | feat(settings): rename "Column Gap" to "Additional Margin" (#5315) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 467 | `136aebed3` | library | fix(library): disable skeuomorphic book covers by default (#5316) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 468 | `6b44a6227` | reader core | feat(reader): add collapsible chapter sections to search results (#5282) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 469 | `ea30bbae7` | catalog/import | Load OPDS catalogs when opening the Integrations panel (#5283) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 470 | `ecd9fce65` | reader core | perf(reader): improve Slide/Curl gesture responsiveness (#5291) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 471 | `e1ed88bea` | catalog/import | fix(opds): keep same-host links on https when the feed is https (#5300) (#5324) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 472 | `cf4414f09` | catalog/import | fix(calibre): verify the cloud blob exists before a row-only push (#5325) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 473 | `20a073391` | catalog/import | feat(calibre): Check Readest status action, with faster cloud lookups (#5332) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 474 | `0935e02a2` | reader core | fix(reader): keep system brightness on after swipe (#5292) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 475 | `33600cf30` | tts/audio | feat: calculate TTS gap based on rate (#5326) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 476 | `a8aa982c8` | library | feat(library): show import options from the bookshelf add button (#5247) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 477 | `3c154a609` | library | fix(library): stop re-importing duplicate files from watched folders (#5337) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 478 | `d1ab15c0f` | tts/audio | fix(reader): align paragraph mode chrome with the TTS player (#5275) (#5338) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 479 | `d40bf5ba7` | library | feat(markdown): parse YAML frontmatter into book metadata (#5279) (#5344) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 480 | `27d7a45d9` | ai/assist/dictionary | fix(reader): keep book fonts when proofread rules change (#5277) (#5345) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 481 | `0e4272e4c` | library | fix(epub): fall back to cover-named zip entries (#5273) (#5339) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 482 | `7786400b3` | reader core | fix(reader): keep the PDF footer readable in scrolled mode (#5342) (#5347) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 483 | `3ca5d5879` | reader core | fix(pdf): keep desktop PDF text sharp (#5251) (#5348) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 484 | `368284d17` | security | chore: update agent memories (#5358) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 485 | `8c212e5b8` | ai/assist/dictionary | fix(translate): restore Yandex Translate provider (#5256) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 486 | `46e75586f` | reader core | feat(markdown): support full heading depth in the TOC (#5357) (#5363) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 487 | `3a0b9cac8` | reader core | fix(reader): report image zoom against the image resolution, closes #5362 (#5365) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 488 | `44953f568` | reader core | fix: preserve U+200F/U+200E BiDi marks in Persian/Arabic ebooks (#5216) (#5361) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 489 | `201868e26` | tts/audio | feat(tts): add End of Chapter option to sleep timer (#5355) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 490 | `b99bea307` | tts/audio | fix(translate): restore Yandex auto-detection and translated TTS (#5374) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 491 | `f246fade9` | reader core | feat(clip): capture login-walled articles with an in-app sign-in (#5377) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 492 | `b18a2cee4` | catalog/import | feat(library): import web novels from a URL (#5294) (#5381) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 493 | `21e1ed5df` | reader core | chore: update agent memories (#5384) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 494 | `f598c9ed6` | reader core | feat(reader): add font size setting and honor custom fonts in paragraph mode, closes #5246 (#5403) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 495 | `6a3caabeb` | reader core | feat(reader): auto-hide the mouse cursor while reading (#5178) (#5404) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 496 | `0995ce782` | reader core | fix(layout): keep dropdown menus within viewport (#5392) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 497 | `15b3d289e` | library | fix(library): do not dedupe distinct PDFs with identical metadata, closes #5411 (#5412) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 498 | `682b4ffc2` | reader core | fix(reader): exclude trailing whitespace from double-click selection (#5413) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 499 | `fa2e9cdc5` | tts/audio | fix(tts): read TTS section documents through the display transform pipeline (#5406) (#5416) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 500 | `2acb9fad0` | tts/audio | chore: update agent memories (#5418) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 501 | `a6a3e1499` | library | feat(library): add scoped full text search with fuzzy and nearby modes (#5389) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 502 | `4c523f75e` | ai/assist/dictionary | fix(proofread): match Unicode punctuation next to letters (#5421) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 503 | `5a2be9abe` | ai/assist/dictionary | feat(dictionaries): add Babylon BGL dictionary format (#5428) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 504 | `ca2c1298b` | reader core | fix(reader): normalize body text size in reflowable books (#5422) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 505 | `b17f06186` | reader core | fix(reader): let long press reach the first line on mobile (#5429) (#5432) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 506 | `b1ec4f5e9` | reader core | fix(search): keep search options on one line at any text scale (#5434) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 507 | `8e009cd61` | reader core | fix(reader): give the toolbar controls a 44px touch target, closes #5401 (#5437) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 508 | `8a259d332` | library | fix(library): keep subfolder groups for auto-imported books (#5423) (#5436) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 509 | `55691602b` | library | feat(annotations): export and import annotations as JSON, closes #5400 (#5440) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 510 | `47cd7b401` | library | feat(settings): add library/reader scope switcher to background image picker (#5443) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 511 | `fbeb29093` | library | feat(library): add bulk Download to the select-mode action bar (#5244) (#5445) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 512 | `4f44b79ec` | tts/audio | feat(tts): fine-tune the mini player time info and transport (#5310) (#5446) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 513 | `9700e59cd` | reader core | fix(reader): lift the header into the notch on negative top margins (#5447) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 514 | `e05b7d5bb` | reader core | feat(popup): restyle popups (#5351) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 515 | `be5f07ef8` | reader core | feat(reader): centralize notes and highlights in the annotations hub, closes #5398, #3870 (#5448) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 516 | `c1b0a4ecd` | tts/audio | feat(stats): count TTS listening as reading time (#5450) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 517 | `fbfd95181` | reader core | chore: update agent memories (#5449) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 518 | `eb95677dc` | reader core | fix(popup): center the marker glyph and compact the highlight style buttons (#5451) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 519 | `e562d2b98` | tts/audio | chore: update agent memories (#5458) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 520 | `790e8b9e8` | reader core | feat(about): copy the version label to the clipboard on click, closes #5285 (#5461) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 521 | `8ad906bc4` | reader core | fix(epub): parse OPF items and meta written with explicit closing tags (#5463) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 522 | `a5da9291f` | reader core | feat(annotator): add an opt-in Copy Link tool to the selection toolbar (#5464) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 523 | `1da69c917` | reader core | feat(reader): tap the footer to show and dismiss the progress bar (#5466) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 524 | `162f49f93` | reader core | fix(settings): drop the "Show" prefix from the footer widget labels (#5287) (#5469) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 525 | `11ae9e135` | catalog/import | fix(opds): use the cover advertised by the feed entry (#5471) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 526 | `59284086c` | reader core | feat(reader): show the image description in the image viewer (#5472) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 527 | `47f0a52b3` | library | feat(library): give the "Then by" sort its own order, closes #5119 (#5474) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 528 | `ffdcfca0a` | catalog/import | fix(opds): apply the metadata advertised by the feed entry (#5477) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 529 | `da86aba6b` | library | fix(reader): stop the header hover strip from covering the page text (#5478) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 530 | `6469cbb5b` | library | fix(reader): fix duokan fullscreen cover rendering and swipe (#5263) (#5473) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 531 | `35450e965` | tts/audio | feat(tts): play a book's own recorded narration (EPUB 3 Media Overlays) (#5480) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 532 | `69985e5e5` | reader core | feat(reader): horizontal scrolling mode for fixed layout books (#5485) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 533 | `aa08ce95f` | library | fix(library): select books in the recently read shelf and pull it with the grid (#5486) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 534 | `b92153f19` | library | fix(library): make search history chips translucent like the search input (#5488) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 535 | `1173d98b6` | reader core | chore: update agent memories (#5489) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 536 | `c1a3b2b92` | reading modes/controls | fix(reader): correct reading ruler transitions and line bounds (#5490) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 537 | `fde3df92c` | reader core | feat(reader): support adding bookmarks with a pull-down gesture (#1359) (#5493) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 538 | `dd6ad542d` | catalog/import | fix(opds): invalidate cached covers when the entry's updated value changes (#5495) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 539 | `f8d7e2638` | reader core | fix(build): strip dangling sourceMappingURL comments from Tauri builds (#5498) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 540 | `76b2d83b1` | reader core | fix(reader): style annotation toolbar customizer and flatten popup chrome (#5496) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 541 | `63341d45f` | catalog/import | fix(opds): substitute percent-encoded {searchTerms} in OpenSearch templates (#5500) (#5504) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 542 | `67f850e5c` | reader core | fix(reader): render fixed layout documents edge to edge in scrolled mode (#5503) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 543 | `311f7209d` | catalog/import | feat(send): clip locally opened html and xhtml pages with the browser extension (#5512) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 544 | `e9ee43e88` | security | chore(deps): bump transitive dependencies for security advisories (#5518) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 545 | `08f373152` | library | fix(library): stop watched-folder scans from blocking the main thread (#5494) (#5517) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 546 | `d0867d729` | reading modes/controls | fix(reader): keep the reading ruler anchored to its text across repagination (#5491) (#5519) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 547 | `420f65fc9` | ai/assist/dictionary | test(reader): deflake DictionarySheet expand/collapse toggle test (#5521) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 548 | `d7ad9fe56` | library | feat(library): show the page count in book details (#5516) (#5523) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 549 | `e5cff97ca` | reader core | feat(reader): jump to an entered page number from the progress label (#5524) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 550 | `c3d4c5be6` | security | chore: update agent memories (#5525) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 551 | `d8abda158` | ai/assist/dictionary | fix(annotator): return to the selection toolbar after closing a lookup popup (#5213) (#5526) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 552 | `256685bc3` | ai/assist/dictionary | fix(annotator): fall back to the selection toolbar when the dictionary quick action gets a multi-word selection (#5213) (#5529) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 553 | `c5d596d89` | reader core | fix(reader): discard booknotes without a CFI to prevent an app crash (#5533) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 554 | `a7b8deb9f` | tts/audio | fix(tts): settle Edge TTS synthesis when the Tauri WebSocket dies before turn.end (#5230) (#5534) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 555 | `30ee02a33` | reader core | fix(window): avoid unavailable title-bar APIs on mobile (#5536) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 556 | `0254e13a4` | reader core | fix(annotator): re-anchor the note bubble when a highlight is resized (#5538) (#5541) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 557 | `45d3b1f49` | reader core | chore: update agent memories (#5543) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 558 | `22308485f` | tts/audio | feat(tts): speak Japanese ruby readings instead of the base kanji (#5546) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 559 | `d1749feee` | reader core | feat(a11y): name the open book in the window title (#5547) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 560 | `66ade3809` | reading modes/controls | fix(rsvp): respect safe area insets in landscape (#5548) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 561 | `326df8402` | reader core | fix(layout): keep code block indentation when overriding book layout (#5549) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 562 | `5ecb835c3` | ai/assist/dictionary | fix(reader): scrolled-mode toggle fallout, proofread and footer chrome (#5552) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 563 | `0fb889710` | ai/assist/dictionary | fix(translate): restore Azure Translator, keep paragraph layout, preserve inline formatting (#5555) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 564 | `b1bafcaf4` | reader core | fix(reader): keep the cursor visible while text is selected (#5557) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 565 | `2b719600c` | ai/assist/dictionary | feat(translate): preserve inline formatting with Google too (#5556) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 566 | `f77b56c85` | reader core | fix(annotator): draw the highlight color check in the content color (#5564) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 567 | `dbcae8b22` | reader core | feat(reader): render math in annotation notes (#5571) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 568 | `ada70fc2f` | reader core | feat(reader): summarize annotation counts in the sidebar toolbar (#5576) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 569 | `70465cb6c` | tts/audio | docs: update screenshots, closes #5368 (#5577) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 570 | `cf413b2b9` | tts/audio | chore: update agent memories (#5579) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 571 | `14de49724` | library | fix: fix occasional stuck when dismissing bookshelf menu (#5580) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 572 | `df2989e43` | catalog/import | fix(opds): make the title bar draggable in the online library view (#5592) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 573 | `6d5a89cee` | catalog/import | fix(opds): filter incompatible download formats and offer one-click EPUB (#5593) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 574 | `4bcfcddf2` | library | fix(library): checkpoint, serialize, and pool folder imports (#5615) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 575 | `28687314b` | ai/assist/dictionary | fix(translation): gate Enable Translation on book availability (#5600) (#5617) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 576 | `552777e09` | catalog/import | fix(translate): send Bing language codes in the azure provider (#5620) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 577 | `d843df6b6` | library | fix(library): stop a long press from selecting and then deselecting a book (#5621) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 578 | `614427e82` | reader core | fix(popup): stop mounting the filtered pointer triangle at rest (#5628) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 579 | `ab055169c` | reader core | fix(ci): gate build_tauri_app on tauri paths and give webdriver its own timeout (#5644) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 580 | `10bf99158` | reader core | fix(reader): commit settled image zoom into the layout size, closes #5633 (#5639) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 581 | `4f1850563` | catalog/import | fix(novel): retry transient fetch failures and backfill work metadata (#5650) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 582 | `05d289a4e` | library | fix(markdown): title imported books after the file, not the first heading (#5653) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 583 | `2f9262e02` | security | fix(sanitizer): render Persian/Arabic half-space by converting misused RLM to ZWNJ (#5651) | Must review; port equivalent trust-boundary fix if br1 has same surface. |
| 584 | `dbe0dae0a` | reader core | feat(reader): flash the target of in-page footnote jumps, closes #5647 (#5655) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 585 | `42c7a2cb0` | reader core | fix(reader): disable text autosizing in fixed-layout books, closes #5641 (#5659) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 586 | `34922b172` | catalog/import | fix(opds): stop auto-downloaded books from vanishing on restart (#5665) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 587 | `561356628` | reader core | fix(ui): size the alert surface off its container, not its content (#5662) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 588 | `1cbab73f9` | reading modes/controls | feat(reader): jump to the start or end of the book with Home/End, closes #5660 (#5673) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 589 | `124655e3a` | reading modes/controls | fix(reader): update progress during Auto Scroll and put slider overlay values on top (#5676) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 590 | `c0b953db7` | reading modes/controls | feat(reader): scroll Auto Scroll smoothly at low speeds (#5679) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 591 | `b07baf52b` | reader core | chore: update agent memories (#5682) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 592 | `130813a07` | library | fix(library): allow unchecking Read books in place for registered folders, closes #5680 (#5685) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 593 | `181ac99a8` | reader core | fix(reader): keep table label columns from collapsing, closes #5681 (#5686) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 594 | `786230a93` | tts/audio | fix(tts): scroll to the current chapter when opening Offline Audio (#5684) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 595 | `98c68d6b4` | ai/assist/dictionary | fix(dictionary): recover after empty StarDict lookup (#5705) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 596 | `9c103d426` | tts/audio | feat(tts): symmetric minimal mini-player with centered play button (#5707) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 597 | `fb684ab60` | reader core | fix(reader): remove header controls duplicated by the mobile footer bar (#5708) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 598 | `be6845371` | reading modes/controls | feat(reader): resume Auto Scroll when reopening a book, closes #5631 (#5710) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 599 | `522e504b6` | reading modes/controls | fix(reader): support page turner key combinations (#5709) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 600 | `a6e6691c8` | reader core | feat(reader): right-to-left page order for fixed-layout books (#5712) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 601 | `6f67be703` | reader core | fix(reader): restore scrolled PDF highlights (#5719) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 602 | `7e998d384` | reader core | fix(reader): highlight search results visible across chapter boundary (#5725) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 603 | `8226c5545` | reader core | fix(reader): drop the 500-result cap from in-book search, closes #5724 (#5728) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 604 | `07306093e` | ai/assist/dictionary | fix(annotator): drop the selection when the instant dictionary opens, closes #5585 (#5730) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 605 | `13e027286` | reader core | fix(reader): neutralize fixed backgrounds and drop negative margins (#5729) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 606 | `ac757777d` | library | fix(library): optimize bookshelf covers in background, closes #5632 (#5731) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 607 | `1ee7ca22d` | ai/assist/dictionary | feat(wordlens): add the en-hu gloss pack (#5738) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 608 | `0306e3470` | ai/assist/dictionary | fix(wordlens): key the manifest diff on pack routing fields too (#5739) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 609 | `0e2882c26` | reader core | chore: update agent memories (#5740) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 610 | `4549a026d` | library | feat(library): add hide-covers privacy option for the bookshelf (#5733) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 611 | `7fa3daa19` | tts/audio | feat(tts): queue chapter downloads with per-book persistence (#5690) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 612 | `b463f014b` | library | feat(library): show download progress overlay on book covers (#5736) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 613 | `631cd6454` | reader core | feat(annotator): support text selection tools in footnote popups (#5744) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 614 | `9dedaf804` | tts/audio | feat(reader): pair local audiobooks with ebooks (#5754) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 615 | `9213c6af1` | tts/audio | fix(tts): make sentence and paragraph pauses consistent (#5753) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 616 | `a193cbc35` | reader core | fix(reader): keep chapter images openable after repeated footnote popups (#5756) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 617 | `f7f8a830d` | catalog/import | feat(opds): confirm auto-download toggles and allow catalog reordering (#5746) (#5760) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 618 | `89821136f` | library | fix(cbz): order split chapter folders base-first (#5762) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 619 | `771b152e5` | ai/assist/dictionary | feat(dictionaries): add bundled plugin and Yomitan support (#5764) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 620 | `9fb8266bf` | tts/audio | fix(reader): translate iframe text without duplicating TTS (#5772) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 621 | `b50ff9374` | tts/audio | fix(tts): allow chapters sharing sentences with earlier packs to download (#5768) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 622 | `4171f45bd` | library | fix(library): recover from a failed startup instead of rendering a blank window (#5789) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 623 | `21e589fc7` | reader core | fix(reader): extend pull-to-bookmark to fixed layout and yield to late selection (#5802) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 624 | `841b3639b` | reader core | fix(reader): render markdown in the note bubble popup, closes #5785 (#5805) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 625 | `e83fec7f2` | reader core | feat(reader): add inline note editing (#5780) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 626 | `01e2b6ba9` | reader core | feat(reader): expose book title and series as data attributes for custom UI CSS, closes #5776 (#5806) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 627 | `3e9aacba1` | reader core | feat(reader): show PDF page labels as reference pages, closes #5822 (#5824) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 628 | `e659976cc` | reading modes/controls | feat(rsvp): add exact WPM entry and 10 WPM nudge to the speed dropdown, closes #5820 (#5825) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 629 | `a4358d22e` | ai/assist/dictionary | fix(translate): follow Bing regional host and show why a translation failed, closes #5823 (#5826) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 630 | `a2f123ff9` | reader core | feat(reader): join PDF line wraps into paragraphs when copying, closes #5814 (#5828) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 631 | `69872d372` | ai/assist/dictionary | fix(annotator): hide the range editor handles while a lookup popup is open, closes #5815 (#5829) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 632 | `279698832` | library | feat(reader): show the book cover full screen from the sidebar and book details, closes #5813 (#5827) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 633 | `4df8b37b7` | reader core | feat(reader): select text across PDF pages as one selection, closes #5809 (#5831) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 634 | `9b33b52a4` | reader core | feat(stats): tier stat_pages history into R2 segments behind a 7-day hot window (#5835) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 635 | `9045b43d1` | reader core | chore: update agent memories (#5840) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 636 | `6834ee42e` | reader core | fix(stats): survive PostgREST's row cap when building archive segments (#5844) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 637 | `ded443512` | library | fix(backup): export only live library books and reclaim orphaned book files (#5851) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 638 | `231cbf529` | reader core | fix(reader): keep the reading position across screen rotations (#5855) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 639 | `6ccdf8fb7` | reader core | feat(toc): wrap long headings onto multiple lines instead of truncating (#5858) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 640 | `8d44c6b66` | ai/assist/dictionary | fix(wordlens): build kaikki packs from the raw wiktextract dump (#5861) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 641 | `c6a1901a5` | tts/audio | fix(reader): move a paired audiobook by audio and decode WebP covers (#5863) (#5865) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 642 | `5aae8d6c5` | reader core | fix(reader): resolve media that book scripts add after the section loads, closes #1812 (#5868) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 643 | `f45036556` | catalog/import | feat(library): add From Web Browser import with an in-app browser (#5775) (#5870) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 644 | `07371ccce` | reader core | fix(reader): render the IDPF EPUB 3 samples correctly (#480) (#5872) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 645 | `bc4b253b6` | library | fix(library): rubber-band the bookshelf at both edges and keep the reader from overscrolling (#5867) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 646 | `2fd8b3bc9` | reader core | chore: update agent memories (#5875) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 647 | `aa619f8f8` | library | fix(library): save the new data location when migrating an empty library (#5878) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 648 | `aab58241d` | reader core | feat(reader): jump from a footnote popup to the location in the book (#5889) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 649 | `8f9028579` | catalog/import | feat(library): select chapters when importing web novels (#5892) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 650 | `800af00f3` | reader core | fix(ui): size toasts to their message and fade dialogs out whole (#5894) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 651 | `e8f7a4875` | library | fix(library): refresh PDF metadata on re-import (#5895) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 652 | `7c0419961` | reader core | fix(reader): do not truncate footnote popups (#5887) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 653 | `a91b503e5` | reader core | fix(reader): make cross-page selection actually work (#5888) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 654 | `b1a62c059` | tts/audio | fix: folder import of Markdown, widget opens, comic zoom, selection handle and TTS word highlight (#5903) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 655 | `fabbcc640` | tts/audio | feat(tts): lyric-style sentence view in the Read Aloud player (#5755) (#5908) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 656 | `c04ba5a80` | tts/audio | fix(tts): queue a lyric reload requested during an in-flight fetch (#5909) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 657 | `d27d324e1` | reading modes/controls | feat(shortcuts): add customizable keyboard and mouse bindings (#5907) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 658 | `e782af530` | ai/assist/dictionary | fix(translate): Chinese targets, provider rate limits, and translator popup layout (#5913) | Compare against br1 AI assistant/translation/dictionary; port UX and trust-boundary fixes. |
| 659 | `7e8abebcd` | reader core | fix(mobi): keep AZW3 text and TOC intact when section loads overlap (#5920) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 660 | `0fcbd16f7` | reader core | fix(ui): search cloud storage files on demand instead of while typing (#5923) (#5925) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 661 | `86493e801` | reader core | fix(reader): stop the a11y skip link from padding RTL sections with blank pages (#5924) (#5926) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 662 | `76e81d604` | reading modes/controls | fix(ui): align the keyboard shortcuts header with its group titles (#5927) | High-priority parity candidate for Step 1/2 reader-mode work. |
| 663 | `7a7ab7642` | reader core | feat(reader): Notebook as a linked writing workspace (#5928) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 664 | `5755f25d7` | reader core | feat(settings): show which scope the Settings dialog writes (#5933) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 665 | `ad9e5c1b8` | library | feat(ui): separate theme mode and color for the library and the reader (#5948) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 666 | `2b9962a2c` | reader core | fix(reader): stop a mid-touch text selection from hijacking the brightness swipe (#5939) (#5958) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 667 | `0f913bfa6` | reader core | feat(reader): customizable header and footer style (#5938) (#5960) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 668 | `12af2050d` | reader core | fix(reader): contain Notebook text while typing (#5962) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 669 | `053aba67f` | library | fix(library): update the existing book when an updated EPUB is re-imported (#5959) (#5961) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 670 | `82658d8ed` | library | feat(grouping): Adding existing status as Grouping (#5935) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 671 | `341119e5e` | tts/audio | fix(reader): track the paused TTS chapter (#5968) | Compare against br1 TTS model; port state/race fixes before provider expansion. |
| 672 | `9e1f72ae7` | reader core | fix(reader): correct PDF reference totals and slider endpoint (#5951) (#5969) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 673 | `5ae894735` | reader core | fix(reader): stabilize nested book menu sizing (#5978) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 674 | `1fa25f7ae` | reader core | fix(markdown): support tab-indented footnotes (#5975) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 675 | `d49fd8ba5` | library | chore: update agent memories and tidy library styles (#5985) | Review against br1 library checklist; port only missing user-visible behavior or data-safety fixes. |
| 676 | `59cb6a776` | reader core | fix(reader): stop the note popup growing scrollbars of its own (#6006) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |
| 677 | `076556bd3` | catalog/import | fix(opds): import the publication date, not the calibre added-date (#6008) | Map to br1 catalog/import backlog; port small import safety fixes first. |
| 678 | `6df90139d` | reader core | fix(reader): write a new note on the selection, not in the sidebar (#6013) | High-priority parity candidate; inspect diff before deciding port/simplify/skip. |

## Deferred Commit Queue

These 511 commits are still listed for completeness, but the default is to skip or defer unless a later product decision makes the surface relevant.

| # | Commit | Area | Readest subject | Initial br1 action |
| ---: | --- | --- | --- | --- |
| 1 | `c11f79e84` | release/store | release: version 0.10.1 (#3588) | Skip unless br1 adopts that distribution surface. |
| 2 | `1ebf5e7b5` | release/store | fix(release): skip architecture check for 32-bit ARM (#3589) | Skip unless br1 adopts that distribution surface. |
| 3 | `a92c35798` | release/store | chore(release): disable linux-arm build for now as turso can't work on it for now (#3590) | Skip unless br1 adopts that distribution surface. |
| 4 | `1e942a23b` | release/store | chore(release): generate changelog from release notes for google play (#3591) | Skip unless br1 adopts that distribution surface. |
| 5 | `64675820f` | external sync/integration | fix(koplugin): fixed koreader crash on logout, closes #3598 (#3603) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 6 | `e2faa9ad7` | platform | compat(android): disable native long-click on the WebView to prevent the system image context menu, closes #3629 (#3630) | Skip mobile-only behavior for now. |
| 7 | `bb82ab6c8` | tooling/deps/ci | chore(deps): bump android-actions/setup-android (#3631) | Skip unless br1 adopts that distribution surface. |
| 8 | `c7e82825f` | external sync/integration | fix(koplugin): avoid resurrecting deleted annotations on pull (#3639) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 9 | `97555a7e8` | tooling/deps/ci | chore: bump next.js, opennextjs and wrangler to the latest versions (#3642) | Skip unless br1 adopts that distribution surface. |
| 10 | `af9cf3393` | platform | fix(android): never try to fight with the navigation bar on Android ever, closes #3618 (#3646) | Skip mobile-only behavior for now. |
| 11 | `26fec924f` | tooling/deps/ci | chore: bump turso to the latest version (#3650) | Skip unless br1 adopts that distribution surface. |
| 12 | `45e5f0fa6` | platform | fix(eink): disable range editor loupe for annotations on Eink devices, closes #3655 (#3656) | Skip mobile-only behavior for now. |
| 13 | `bbfc82e50` | platform | feat(android): add foss flavor build without gms services (#3666) | Skip mobile-only behavior for now. |
| 14 | `84349ab12` | release/store | chore(release): exclude turso wasm in app builds (#3674) | Skip unless br1 adopts that distribution surface. |
| 15 | `b4207bd74` | tooling/deps/ci | chore(deps): bump vulnerable dependencies to address Dependabot alerts (#3693) | Skip unless br1 adopts that distribution surface. |
| 16 | `956c71cd7` | tooling/deps/ci | chore: migrate from ESLint to Biome for linting (#3694) | Skip unless br1 adopts that distribution surface. |
| 17 | `d22b8bec1` | i18n | i18n: update translations for aria label (#3697) | Skip unless br1 adopts that distribution surface. |
| 18 | `5e048ddab` | platform | fix(iOS): use correct system theme mode in auto mode on iOS, closes #3698 (#3704) | Skip mobile-only behavior for now. |
| 19 | `9f958a44e` | i18n | feat(i18n): add Romanian (ro) translation (#3708) | Skip unless br1 adopts that distribution surface. |
| 20 | `b8ddb5475` | external sync/integration | feat(sync): add full sync option for annotations in koplugin, closes #3710 (#3718) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 21 | `f1a08565e` | misc | fix(storage): paginate stats query and align file size formatting (#3720) | Triage manually if touched files overlap br1. |
| 22 | `f0ab05bbd` | misc | chore(agent): update agent skills and memories (#3721) | Triage manually if touched files overlap br1. |
| 23 | `ff962a1f0` | platform | fix(android): auto-shutdown native TTS engine after 30 min idle to save battery (#3728) | Skip mobile-only behavior for now. |
| 24 | `80cab8e56` | external sync/integration | feat: Hardcover.app Sync (#3724) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 25 | `ca5c86059` | external sync/integration | fix(kosync): don't normalize xpointer for more accurate progress sync, closes #3672 and closes #3616 (#3733) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 26 | `52ac74bba` | platform | fix: fixed status info layout in vertical mode, fixed Android build (#3735) | Skip mobile-only behavior for now. |
| 27 | `9595aa56e` | platform | fix(android): get rid of the outline on the header and footer bar when using remote control to turn page (#3744) | Skip mobile-only behavior for now. |
| 28 | `f361698e0` | platform | feat(android): add D-pad navigation for Android TV remote controller (#3745) | Skip mobile-only behavior for now. |
| 29 | `52242d688` | platform | fix(android): use mobile footer bar in portrait mode on Android, closes #3742 (#3746) | Skip mobile-only behavior for now. |
| 30 | `531dbe5f1` | release/store | release: version 0.10.2 (#3750) | Skip unless br1 adopts that distribution surface. |
| 31 | `fbfd7fd6c` | external sync/integration | fix(hardcover): use Tauri HTTP plugin to bypass CORS and coerce search result IDs to numbers, closes #3751 (#3752) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 32 | `b3fe33221` | i18n | feat(i18n): add Hungarian translation and translate new keys across all locales (#3753) | Skip unless br1 adopts that distribution surface. |
| 33 | `d682fcbb4` | external sync/integration | feat: add named highlight colors with sync and picker ux fixes (#3741) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 34 | `7e62516b5` | tooling/deps/ci | chore(deps): bump Next.js to version 16.2.2 (#3757) | Skip unless br1 adopts that distribution surface. |
| 35 | `09d1e0c04` | external sync/integration | fix(sync): show last push time as the last sync time (#3760) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 36 | `a9e33ca50` | misc | fix(style): let background texture take precedence over overridden background color (#3761) | Triage manually if touched files overlap br1. |
| 37 | `3174e341a` | release/store | release: version 0.10.4 (#3767) | Skip unless br1 adopts that distribution surface. |
| 38 | `cf21a752c` | external sync/integration | Updating Hardcover progress sync logic (Issue #3775) (#3777) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 39 | `637b7462c` | external sync/integration | fix(kosync): use Fragment keys to prevent form field issues (#3791) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 40 | `50a2957e3` | account/payments | feat(kosync): support HTTP Basic auth for CWA KOSync servers (#3792) | Skip unless br1 adopts that distribution surface. |
| 41 | `373420bb0` | tooling/deps/ci | chore(deps): bump actions/checkout in the github-actions group (#3805) | Skip unless br1 adopts that distribution surface. |
| 42 | `baee85e7c` | external sync/integration | feat(rsvp): sync reading position to cloud via book_configs (#3801) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 43 | `a07bf23e1` | misc | chore(docs): add worktree management for isolated PR review and feature work (#3810) | Triage manually if touched files overlap br1. |
| 44 | `ab7da981d` | platform | fix(eink): remove scroll animation in eink mode and optimize eink detection (#3822) | Skip mobile-only behavior for now. |
| 45 | `20940105f` | platform | feat(library): navigate to previous group with the Back button on Android, closes #2675 (#3833) | Skip mobile-only behavior for now. |
| 46 | `cc780712b` | tooling/deps/ci | fix(deps): add pnpm override for qs >=6.14.2 (Dependabot #71) (#3841) | Skip unless br1 adopts that distribution surface. |
| 47 | `7b60b1bb0` | platform | fix(ios): reduce GPU memory pressure to prevent WebKit GPU process crash (#3842) | Skip mobile-only behavior for now. |
| 48 | `4e1464ef1` | platform | fix(macOS): don't show window button when traffic lights are on the header, closes #3831 (#3843) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 49 | `f0e23a150` | platform | fix(linux): update package installation for Linux-x64 (#3845) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 50 | `8df8bc8b4` | misc | chore(agent): use claude in chrome for web based qa (#3847) | Triage manually if touched files overlap br1. |
| 51 | `011ad18a0` | platform | fix(android): use stable safe area insets to avoid unnecessary layout shift, closes #3670 (#3859) | Skip mobile-only behavior for now. |
| 52 | `1088af023` | release/store | release: version 0.10.6 (#3861) | Skip unless br1 adopts that distribution surface. |
| 53 | `8cdf378b4` | i18n | fix(i18n): fix translations in RU (#3866) | Skip unless br1 adopts that distribution surface. |
| 54 | `7d852518a` | platform | feat(windows): use overlay scrollbar (#3868) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 55 | `e858f9b23` | tooling/deps/ci | chore(deps): bump the github-actions group with 2 updates (#3880) | Skip unless br1 adopts that distribution surface. |
| 56 | `5c97b2e9d` | external sync/integration | feat(kosync): defer push after resume (#3892) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 57 | `e8f6db96e` | account/payments | fix(kosync): CWA sometimes sends 400 for auth failure (#3893) | Skip unless br1 adopts that distribution surface. |
| 58 | `293cc545d` | external sync/integration | fix(kosync): send valid progress to kosync server when closing book, closes #3899 (#3901) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 59 | `5190bbcaf` | platform | fix(macos): don't quit app on Cmd+W, only on Cmd+Q, closes #3927 (#3928) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 60 | `82ece3332` | tooling/deps/ci | chore(deps): bump mozilla-actions/sccache-action (#3937) | Skip unless br1 adopts that distribution surface. |
| 61 | `be8b94668` | tooling/deps/ci | chore: update Dependabot dependencies (#3938) | Skip unless br1 adopts that distribution surface. |
| 62 | `71371130e` | platform | fix(android): avoid rsproperties panic on startup, closes #3922 (#3942) | Skip mobile-only behavior for now. |
| 63 | `d488f6544` | misc | fix(seo): fixed the title and description of the user page (#3952) | Triage manually if touched files overlap br1. |
| 64 | `8a8fcb261` | release/store | chore: add VCS browser URL to appdata.xml (#3962) | Skip unless br1 adopts that distribution surface. |
| 65 | `b251e537d` | tooling/deps/ci | chore(deps): update stripe (#3941) | Skip unless br1 adopts that distribution surface. |
| 66 | `fa61f4026` | tooling/deps/ci | chore: bump opennext and wrangler to the latest versions (#3971) | Skip unless br1 adopts that distribution surface. |
| 67 | `4f55920b7` | external sync/integration | feat(kosync): add metadata hash info dialog to diagnose sync failures (#3978) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 68 | `94ede10f6` | platform | fix(annotator): defer Android quick action until touchend, closes #3935 (#3979) | Skip mobile-only behavior for now. |
| 69 | `ad55375f8` | platform | fix(tts): preserve state on AbortError to keep rate changes effective on iOS, closes #3949 (#3988) | Skip mobile-only behavior for now. |
| 70 | `f9a711725` | external sync/integration | fix(sync): defers updateLibrary until libraryLoaded to avoid occasional losing books (#3995) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 71 | `a9684ab35` | tooling/deps/ci | chore(deps): bump amondnet/vercel-action in the github-actions group (#4008) | Skip unless br1 adopts that distribution surface. |
| 72 | `8ba052dc8` | platform | fix(reader): pure black/white footer in eink mode (#3873) (#4024) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 73 | `e0fa6230a` | external sync/integration | feat(koplugin): support deletePluginSettings hook (#4045) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 74 | `e7564ffc2` | tooling/deps/ci | fix(docker): correct Kong gateway port for client build arg (#4046) | Skip unless br1 adopts that distribution surface. |
| 75 | `c59097b0a` | i18n | feat(koplugin): add i18n catalog and sync info dialog (#4050) | Skip unless br1 adopts that distribution surface. |
| 76 | `ed8956e9e` | external sync/integration | feat(koplugin): Readest Library view in KOReader (#4056) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 77 | `6d2981455` | i18n | chore(koplugin): refresh i18n catalogs (#4058) | Skip unless br1 adopts that distribution surface. |
| 78 | `43f72720f` | i18n | feat(i18n): add Uzbek and Brazilian Portuguese translations (#4061) | Skip unless br1 adopts that distribution surface. |
| 79 | `15c0a7a2f` | external sync/integration | fix(koplugin): render group cover previews in Library (#4064) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 80 | `dd0ff6ae9` | misc | chore(agent): bump gstack (#4073) | Triage manually if touched files overlap br1. |
| 81 | `3b348c8f3` | external sync/integration | feat(sync): CRDT replica sync foundation (#4075) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 82 | `cbdc3b8f5` | external sync/integration | feat(sync): wire dictionary store through replica sync (follow-up to #4075) (#4076) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 83 | `981579c25` | external sync/integration | feat(sync): cross-device custom font sync (#4077) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 84 | `ca674bb5e` | misc | chore(agent): update project memory (#4078) | Triage manually if touched files overlap br1. |
| 85 | `de6529523` | external sync/integration | feat(sync): cross-device background texture sync (#4079) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 86 | `53936ad17` | i18n | chore(i18n): translate replica-sync File-toast strings (#4080) | Skip unless br1 adopts that distribution surface. |
| 87 | `77a85cee0` | account/payments | feat(account): show daily reset countdown under translation quota bar (#4082) | Skip unless br1 adopts that distribution surface. |
| 88 | `4625e47a6` | external sync/integration | refactor(sync): extract shared adapter / pull-deps / legacy-migration primitives (#4081) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 89 | `cb3071683` | external sync/integration | refactor(hardcover): move note mappings to SQLite on web and native (#4083) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 90 | `35227ecd6` | external sync/integration | feat(sync): wire crypto session for encrypted-field sync (#4084) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 91 | `aea3fda08` | tooling/deps/ci | chore: bump turso to the latest version (#4086) | Skip unless br1 adopts that distribution surface. |
| 92 | `6bfeb295d` | external sync/integration | feat(sync): add opds_catalog replica kind (plaintext fields) (#4087) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 93 | `712d564e9` | external sync/integration | feat(sync): encrypted OPDS credentials + Tauri keychain (PR 4c + 4d) (#4090) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 94 | `dc58d985e` | platform | fix(layout): center fixed modals above the on-screen keyboard on Android (#4091) | Skip mobile-only behavior for now. |
| 95 | `6e7c9d139` | external sync/integration | feat(sync): bundled `settings` replica kind for cross-device prefs and credentials (#4094) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 96 | `51a553dd8` | external sync/integration | feat(sync): bundle dictionary settings into the `settings` replica kind (#4096) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 97 | `cc8f917cd` | platform | fix(layout): silence viewport meta warning on non-Android browsers (#4097) | Skip mobile-only behavior for now. |
| 98 | `302363a9f` | external sync/integration | feat(sync): per-category sync gates + Manage Sync UI (#4099) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 99 | `ae42dcb53` | account/payments | fix(txt): parse author from txt filename and use edited metadata on fallback cover (#4095) (#4102) | Skip unless br1 adopts that distribution surface. |
| 100 | `e0b3a6fb0` | i18n | fix(i18n): localize quota reset countdown time units (#4104) | Skip unless br1 adopts that distribution surface. |
| 101 | `411091101` | external sync/integration | fix(sync): keep dictionarySettings consistent across devices (#4105) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 102 | `1eae2af23` | external sync/integration | feat(sync): batch replica sync into one /api/sync/replicas request (#4109) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 103 | `5774e00c0` | external sync/integration | feat(sync): opt-in Credentials toggle + keyring v4 migration (#4111) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 104 | `952e43651` | i18n | i18n: update translations (#4118) | Skip unless br1 adopts that distribution surface. |
| 105 | `1705006b6` | platform | fix(mobile): iOS PIN keyboard UX + Safari font line-height in EPUBs (#4120) | Skip mobile-only behavior for now. |
| 106 | `56d6aceb0` | release/store | release: version 0.11.1 (#4123) | Skip unless br1 adopts that distribution surface. |
| 107 | `615dc82c1` | platform | fix(android): fixed .mdx/.mdd files not shown in file chooser on Android, closes #4124 (#4125) | Skip mobile-only behavior for now. |
| 108 | `058d58b4f` | external sync/integration | fix(kosync): populate chapter field on synced annotations (#4134) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 109 | `fc71ca985` | platform | feat(android): upgrade in-process WebView on devices stuck on old system WebView (#4142) | Skip mobile-only behavior for now. |
| 110 | `e8df651d5` | tooling/deps/ci | chore(deps): bump Next.js to version 16.2.6 (#4143) | Skip unless br1 adopts that distribution surface. |
| 111 | `11469d1e9` | tooling/deps/ci | chore(deps): bump vulnerable Rust dependencies (#4144) | Skip unless br1 adopts that distribution surface. |
| 112 | `7d3065d9a` | platform | feat(android): also upgrade webview from beta, dev and canary channels when the stable channel isn't updatable (#4149) | Skip mobile-only behavior for now. |
| 113 | `041af6859` | external sync/integration | fix(sync): publish custom css settings after applying css, closes #4146 (#4151) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 114 | `f6b628116` | external sync/integration | fix(kosync): add namespace to koreader plugin modules to avoid collision (#4153) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 115 | `16ffc1750` | external sync/integration | fix(eink): fixed sync toggle styles in eink mode, closes #4155 (#4163) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 116 | `cea25ef46` | external sync/integration | fix(koplugin): omit empty note field when syncing annotations (#4161) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 117 | `ab2def32d` | external sync/integration | fix(koplugin): stop sync from wiping cloud book fields + Library polish (#4166) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 118 | `e0cb43355` | external sync/integration | fix(koplugin): harden cover-download subprocess against Adreno exit crash (#4169) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 119 | `d0464c103` | i18n | i18n(ios): add more localized languages in plist (#4187) | Skip unless br1 adopts that distribution surface. |
| 120 | `f2a2d9693` | external sync/integration | fix(koplugin): honor remote annotation deletions, closes #4119 (#4194) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 121 | `a20f68fc1` | external sync/integration | feat(readwise): allow overriding the Readwise sync base URL (#4196) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 122 | `9f0aa2f55` | misc | fix(tests): materialize zip.js blob before wrapping in File for case-mismatch fixture (#4203) | Triage manually if touched files overlap br1. |
| 123 | `c8fabd331` | external sync/integration | fix(reader): resolve KOReader sync conflict against non-KOReader servers (#4205) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 124 | `83607d14e` | account/payments | fix(opds): send Basic auth preemptively for optional-auth servers (#4206) | Skip unless br1 adopts that distribution surface. |
| 125 | `952304a95` | external sync/integration | fix(sync): push books row alongside in-reader progress auto-sync (#4209) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 126 | `689537fd7` | platform | fix(ios): refresh appearance on system light/dark change, closes #4057 (#4210) | Skip mobile-only behavior for now. |
| 127 | `568868701` | tooling/deps/ci | perf(ci): cache Playwright browsers and apt packages in PR checks (#4215) | Skip unless br1 adopts that distribution surface. |
| 128 | `05da6bdf4` | platform | feat(dictionary): add system dictionary provider for macOS, iOS, and Android (#4219) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 129 | `fe41c42ec` | tooling/deps/ci | chore: switch code formatter from Prettier to Biome (#4223) | Skip unless br1 adopts that distribution surface. |
| 130 | `088f690c3` | release/store | ci(release): use cargo tauri CLI for Linux bundler (#4225) | Skip unless br1 adopts that distribution surface. |
| 131 | `97221b8d2` | platform | fix(ios): suppress native text-selection menu over annotation tools (#4231) | Skip mobile-only behavior for now. |
| 132 | `723098128` | account/payments | feat(send): auto-seed the allowlist with the user's account email (#4237) | Skip unless br1 adopts that distribution surface. |
| 133 | `3825f355a` | misc | fix(sel): clamp declared fontSize when it disagrees with rendered height (#4244) | Triage manually if touched files overlap br1. |
| 134 | `a1279a65c` | platform | feat(send): clip web URLs into self-contained EPUBs via Tauri webview (#4241) | Skip mobile-only behavior for now. |
| 135 | `b493cf790` | tooling/deps/ci | chore(deps): bump the github-actions group with 4 updates (#4249) | Skip unless br1 adopts that distribution surface. |
| 136 | `1a2e43e65` | platform | chore(worktree): copy src-tauri/gen/apple per-worktree so iOS builds the worktree (#4251) | Skip mobile-only behavior for now. |
| 137 | `dabdcdcc5` | platform | fix(macos): fix traffic lights position on macOS 26 (#4247) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 138 | `62b5ed813` | platform | feat(send): handle shared URLs from system share sheets (iOS + Android) (#4256) | Skip mobile-only behavior for now. |
| 139 | `9ad43aa8b` | tooling/deps/ci | feat(docker): add GHCR and Docker Hub image publishing  (#4250) | Skip unless br1 adopts that distribution surface. |
| 140 | `912e97cb8` | platform | feat(send): iOS share-extension picker + App Group queue + reliable host launch (#4267) | Skip mobile-only behavior for now. |
| 141 | `9fa7cb266` | misc | fix(migration): skip migrate20251029 silently on fresh installs (#4268) | Triage manually if touched files overlap br1. |
| 142 | `0e9720690` | tooling/deps/ci | ci: optimize build time for Docker and CI workflows (#4263) | Skip unless br1 adopts that distribution surface. |
| 143 | `5c82351ab` | external sync/integration | feat(integrations): add WebDAV sync to Reading Sync settings (#4204) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 144 | `0564b4dd4` | platform | fix(eink): restore [data-eink='true'] button rule grouping (#4273) | Skip mobile-only behavior for now. |
| 145 | `66c198e57` | platform | chore: bump tauri-plugin-webview-upgrade to c7c04ab (#4276) | Skip mobile-only behavior for now. |
| 146 | `b8d986cbd` | release/store | fix(docker): fix Docker image `latest` tag and production runtime errors; add dev compose file, Codespace support, and semver release tagging (#7) (#4277) | Skip unless br1 adopts that distribution surface. |
| 147 | `db1c474e7` | platform | fix(layout): use 100vh fallback for .full-height to unbreak old Chromium WebView (#4278) | Skip mobile-only behavior for now. |
| 148 | `5e366018d` | i18n | fix(cbz): ComicInfo metadata + CBZ page count + WebDAV i18n (#4282) | Skip unless br1 adopts that distribution surface. |
| 149 | `ca17131f2` | platform | fix(reader): keep New Chat button visible above Android nav bar and force theme contrast (#4287) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 150 | `c5384b2a6` | platform | fix: respect Android Back / Esc inside Settings sub-pages and Import-from-Folder dialog (#4286) | Skip mobile-only behavior for now. |
| 151 | `7324b2b2b` | platform | fix(ios): don't crash app init when Storefront region code is unavailable (#4291) | Skip mobile-only behavior for now. |
| 152 | `98049282e` | misc | feat(ai): add OpenRouter provider and unify provider HTTP transport (#4289) | Triage manually if touched files overlap br1. |
| 153 | `2d819b476` | tooling/deps/ci | fix(db): forward DatabaseOpts to tauri-plugin-turso (#4292) | Skip unless br1 adopts that distribution surface. |
| 154 | `a1046f568` | misc | feat(reedy): Phase 1A — MVP retrieval primitives (#4293) | Triage manually if touched files overlap br1. |
| 155 | `7bd3386c2` | platform | fix(perf): avoid Layerize storm caused by huge `<pre>` blocks on Android (#4295) | Skip mobile-only behavior for now. |
| 156 | `4d96c0d54` | misc | feat(reedy): Appendix A · Phase 2.1–2.3 — agent runtime foundation (#4298) | Triage manually if touched files overlap br1. |
| 157 | `df2698fa0` | misc | feat(reedy): Appendix A · Phase 2.6 — AgentRuntime + abort helper (#4301) | Triage manually if touched files overlap br1. |
| 158 | `568b8c0a8` | misc | feat(reedy): Appendix A · Phase 3.1 — Memory services + memory tools (#4302) | Triage manually if touched files overlap br1. |
| 159 | `49664ecb7` | misc | feat(reedy): Appendix A · Phase 3.2 — MemoryConsolidator (#4304) | Triage manually if touched files overlap br1. |
| 160 | `4aaf416c4` | misc | feat(reedy): Appendix A · Phase 5.1 — SkillRegistry + 3 seed skills (#4306) | Triage manually if touched files overlap br1. |
| 161 | `6be7606da` | misc | feat(reedy): wire Phase 5 skills + Phase 3 memory tools into the agent runtime (#4309) | Triage manually if touched files overlap br1. |
| 162 | `64492d655` | misc | feat(reedy): wire MemoryConsolidator + live memory providers into ReedyAssistant (#4310) | Triage manually if touched files overlap br1. |
| 163 | `29c88c021` | platform | fix(opds): make Android Back / Reader→Back behave correctly inside the OPDS browser (#4311) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 164 | `4a5674ef4` | tooling/deps/ci | chore: bump turso to version 0.6.1 (#4312) | Skip unless br1 adopts that distribution surface. |
| 165 | `58791e517` | misc | agent: support cross-agent workspace, now it should work with claude and codex (#4318) | Triage manually if touched files overlap br1. |
| 166 | `647343eab` | misc | agent: update implementation scope (#4319) | Triage manually if touched files overlap br1. |
| 167 | `b5d898a48` | misc | fix(document): accept zips whose magic bytes are mangled but have valid EOCD (#4321) | Triage manually if touched files overlap br1. |
| 168 | `1294ace9c` | platform | fix(file-picker): unblock .mrexpt and other custom extensions on Android (#4323) | Skip mobile-only behavior for now. |
| 169 | `d7b633d8f` | i18n | i18n: translate new strings for OpenAI-compatible LLM settings and in-place library (#4326) | Skip unless br1 adopts that distribution surface. |
| 170 | `64651a65e` | account/payments | fix(sync): skip replica upload when not authenticated (#4327) | Skip unless br1 adopts that distribution surface. |
| 171 | `381eed21c` | misc | fix(tauri): skip runtime-config.js injection in static export (#4332) | Triage manually if touched files overlap br1. |
| 172 | `462adc500` | tooling/deps/ci | chore(deps): bump the github-actions group with 6 updates (#4333) | Skip unless br1 adopts that distribution surface. |
| 173 | `744d5b3a0` | external sync/integration | fix(dict): restore MDD eager init; CSP-safe audio handler; gate binary uploads on sync category (#4337) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 174 | `e29331bea` | external sync/integration | fix(sync): prevent cross-device progress overwrite; retry first pull on flaky networks (#4341) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 175 | `bb81d6270` | platform | fix(reader): keep Android paginated text selection from jumping back to first rendered section (#4342) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 176 | `18c2115cc` | platform | feat(library): import-failure modal + group sort + Android callout fix (#4345) | Skip mobile-only behavior for now. |
| 177 | `10a223b0e` | platform | fix(export): export uses save dialog on Windows to avoid share UI freeze (#4343) (#4346) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 178 | `4988a53cb` | i18n | i18n: translate Import Annotations + OPDS catalog strings across locales (#4351) | Skip unless br1 adopts that distribution surface. |
| 179 | `78794499a` | platform | fix(dictionary): correct System Dictionary platform gating on web and iPad (#4362) | Skip mobile-only behavior for now. |
| 180 | `92b3c9db4` | external sync/integration | fix(kosync): resolve progress CFI via its own spine section (#4364) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 181 | `c23c21d37` | external sync/integration | fix(kosync): reflowable conflict comparison via local CFI; scrolled-mode + library fixes (#4367) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 182 | `d0071a6bc` | external sync/integration | fix(sync,reader): discard malformed sync CFIs; fix swipe background flash (#4370) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 183 | `97e2aa279` | release/store | release: version 0.11.2 (#4371) | Skip unless br1 adopts that distribution surface. |
| 184 | `99e551cbc` | release/store | chore: fix release workflow (#4372) | Skip unless br1 adopts that distribution surface. |
| 185 | `f8d88cca5` | misc | chore: bump tauri plugins (#4373) | Triage manually if touched files overlap br1. |
| 186 | `53fe8c268` | release/store | fix(release): don't clobber latest.json with a 404 "Not Found" body (#4376) | Skip unless br1 adopts that distribution surface. |
| 187 | `a92fe0ce2` | external sync/integration | fix(koplugin): upload local book cover so synced books show a cover (#4374) (#4385) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 188 | `274afb067` | external sync/integration | fix(sync): mint reincarnation token on re-import of custom fonts/textures (#4410) (#4416) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 189 | `5ff18b8f3` | misc | fix(readwise): use Tauri HTTP transport in desktop app (#4413) | Triage manually if touched files overlap br1. |
| 190 | `726f53a64` | platform | fix(reader): use Tauri clipboard plugin for copy on Android (#4409) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 191 | `7283a8ac2` | platform | fix(android): open book directly when launched via 'Open with' (#4407) | Skip mobile-only behavior for now. |
| 192 | `df66c63a0` | account/payments | fix(txt): recover author for 【】-titled web-novel TXT imports, closes #4390 (#4423) | Skip unless br1 adopts that distribution surface. |
| 193 | `7128e8964` | platform | fix(reader): suppress Android image callout freezing the image viewer (#4425) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 194 | `27fa9ab22` | i18n | chore(i18n): translate new strings; commit pending agent memory notes (#4430) | Skip unless br1 adopts that distribution surface. |
| 195 | `35eb7f2e1` | release/store | release: version 0.11.4 (#4431) | Skip unless br1 adopts that distribution surface. |
| 196 | `719e9c754` | platform | fix(eink): keep dropdown-toggle label legible under e-ink (#4435) (#4441) | Skip mobile-only behavior for now. |
| 197 | `93b3c4373` | tooling/deps/ci | chore(deps): bump the github-actions group with 2 updates (#4450) | Skip unless br1 adopts that distribution surface. |
| 198 | `d8fbf5fe0` | external sync/integration | fix(reader): show KOReader progress-synced as a top-right hint (#4461) (#4463) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 199 | `4eeed74cd` | external sync/integration | fix(webdav): always sync book covers, not just when syncBooks is on (#4445) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 200 | `b07c9eb63` | platform | fix(eink): make Custom Fonts panel readable in e-ink mode (#4454) (#4464) | Skip mobile-only behavior for now. |
| 201 | `c15e85025` | platform | fix(reader): shrink hidden page-nav buttons on Android so they don't eat long-press (#4501) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 202 | `75dc2e4e8` | misc | fix(updater): disable in-app updater inside Flatpak sandbox, closes #4440 (#4507) | Triage manually if touched files overlap br1. |
| 203 | `553c2b639` | platform | fix(linux): update tauri submodule for resize cursor fix (#4512) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 204 | `31ebf4b58` | account/payments | feat(opds): make subject and author links clickable in the book detail view (#4515) | Skip unless br1 adopts that distribution surface. |
| 205 | `9180767ba` | platform | fix(android): deliver Open-with intents reliably on cold start and re-mount (#4527) | Skip mobile-only behavior for now. |
| 206 | `82bd90afc` | platform | feat(reader): random-access file reads on Android via rangefile scheme (#4534) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 207 | `715967dbe` | tooling/deps/ci | chore(deps): bump github/codeql-action in the github-actions group (#4533) | Skip unless br1 adopts that distribution surface. |
| 208 | `1a85f251c` | external sync/integration | fix(sync): flush pending Readest cloud push when the reader closes (#4535) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 209 | `cfe2bb911` | platform | fix(reader): Android text selection breaks on the first word of hyphenated paragraphs (#4545) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 210 | `4ff96800d` | platform | ci: pin android-emulator-runner by SHA + shard the slow PR test job (#4547) | Skip mobile-only behavior for now. |
| 211 | `28767fecd` | platform | docs(readme): add a Documentation section linking to readest.com/docs (#4551) | Skip mobile-only behavior for now. |
| 212 | `61d804a54` | platform | fix(dict): resolve Android content-URI filenames via native basename (#4553) | Skip mobile-only behavior for now. |
| 213 | `763b579c8` | platform | fix(android): launch installed dictionary for system lookup, closes #4559 (#4568) | Skip mobile-only behavior for now. |
| 214 | `bfb85c2f6` | external sync/integration | feat(reader): sync paragraph mode & speed reader with TTS read-along (#3235) (#4576) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 215 | `57501cc52` | platform | feat(updater): nightly update channel (Android/Windows/macOS/Linux) (#4577) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 216 | `131f83e15` | platform | fix(ci): correct nightly Linux AppImage collect path (#4581) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 217 | `bdfb59595` | misc | docs(readme): point donations to the unified donate.readest.com hub (#4601) | Triage manually if touched files overlap br1. |
| 218 | `f3c92f80d` | release/store | docs(readme): remove the Sponsors / TestMu AI section (#4604) | Skip unless br1 adopts that distribution surface. |
| 219 | `359e406e5` | release/store | docs(readme): make license badge static and modernize release badge (#4603) | Skip unless br1 adopts that distribution surface. |
| 220 | `35b02c4ef` | external sync/integration | feat(statistics): KOReader-compatible reading stats with cross-device sync (#4606) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 221 | `480ab5b71` | external sync/integration | feat(hardcover): automatically sync progress and notes (#4614) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 222 | `6514d4aa5` | tooling/deps/ci | build(web): standalone Docker image + drop Turbopack build cache (#4619) | Skip unless br1 adopts that distribution surface. |
| 223 | `5861aead4` | platform | fix(android): move plugin @Command I/O off the main thread; fix WebView leak & #3297 blank screen (#4628) | Skip mobile-only behavior for now. |
| 224 | `b31699d05` | account/payments | fix(library): restore back button from series/author folders (#4437) (#4629) | Skip unless br1 adopts that distribution surface. |
| 225 | `9d0c5dc52` | external sync/integration | fix(koplugin): sync note deletions to Readest via tombstones (#4632) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 226 | `2f810a70b` | tooling/deps/ci | chore(deps): bump the github-actions group with 3 updates (#4637) | Skip unless br1 adopts that distribution surface. |
| 227 | `38a6d3d9b` | platform | fix(dict): stop iOS instant system dictionary popping multiple times (#4644) | Skip mobile-only behavior for now. |
| 228 | `6c7c86f34` | tooling/deps/ci | feat(applock): biometric unlock (fingerprint / Face ID) at startup on mobile (#4650) | Skip unless br1 adopts that distribution surface. |
| 229 | `451f0ccd9` | external sync/integration | fix(library): count only uploaded, non-deleted books in synced toast (#4654) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 230 | `72233e1c6` | external sync/integration | feat: sync reading status across devices and with KOReader (#4634) (#4656) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 231 | `86f550272` | external sync/integration | fix: bot-review robustness fixes (TTS sync, updater, nightly, a11y) (#4659) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 232 | `590c44f97` | i18n | fix(send-to-readest): rephrase popup copy and remove em dashes from i18n strings (#4663) | Skip unless br1 adopts that distribution surface. |
| 233 | `781098141` | external sync/integration | fix(koplugin): repair reading-stats sync push/pull (#4666) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 234 | `d8953353c` | release/store | release: version 0.11.10 (#4667) | Skip unless br1 adopts that distribution surface. |
| 235 | `6e9faaa87` | platform | fix(pdf): throttle PDF range reads to fix large-file OOM on Android/iOS (#3470) (#4670) | Skip mobile-only behavior for now. |
| 236 | `5f561504e` | external sync/integration | fix(sync): keep view settings device-local and exclude them from sync (#4672) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 237 | `f7e1bddda` | external sync/integration | fix(sync): stop re-pinning statusless books to the top of the library after every sync (#4677) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 238 | `54d54791b` | release/store | release: version 0.11.12 (#4682) | Skip unless br1 adopts that distribution surface. |
| 239 | `89f98979e` | release/store | chore(release): fastlane for iOS and macOS release (#4685) | Skip unless br1 adopts that distribution surface. |
| 240 | `9e163fe74` | account/payments | fix(payment): reflect highest active plan across overlapping Stripe subscriptions (#4694) | Skip unless br1 adopts that distribution surface. |
| 241 | `96d65d996` | platform | feat(tts): add native local iOS TTS (AVSpeechSynthesizer) (#4697) | Skip mobile-only behavior for now. |
| 242 | `359fdddcf` | account/payments | feat(payment): handle App Store and Google Play subscription webhooks (#4701) | Skip unless br1 adopts that distribution surface. |
| 243 | `4fa7f76bc` | account/payments | feat(payment): observability for store subscription webhooks (#4704) | Skip unless br1 adopts that distribution surface. |
| 244 | `febb0d9a6` | platform | fix(backup): normalize Windows backslash paths in backup zip entries (#4706) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 245 | `9735f497d` | external sync/integration | feat(reader): proofread rule sync, regex, reorder, and dialog refresh (#4700) (#4708) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 246 | `316ca3c94` | external sync/integration | fix(kosync): reject non-KOReader-Sync server URLs on connect (#4692) (#4711) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 247 | `30727d353` | release/store | fix(reader): release volume-key page-flip while TTS is playing (#4691) (#4710) | Skip unless br1 adopts that distribution surface. |
| 248 | `9155ae627` | external sync/integration | feat(sync): decouple the incremental-pull cursor from updated_at via server synced_at (#4678) (#4712) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 249 | `082edc204` | external sync/integration | fix(sync): sync updated book covers across devices (#4544) (#4731) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 250 | `664b6125a` | platform | feat(android): add monochrome themed launcher icon (#4733) (#4736) | Skip mobile-only behavior for now. |
| 251 | `e0b537bc1` | external sync/integration | feat(koplugin): bulk download all cloud books from Library view (#4751) (#4765) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 252 | `0c7ffa979` | platform | fix(reader): stop iOS page-turn animation stutter (#4768) (#4772) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 253 | `e80ab1762` | external sync/integration | refactor(settings): polish sync and integration panels (#4774) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 254 | `cd3a53f50` | external sync/integration | fix(sync): WebDAV Sync now pulls latest book metadata and merges config (#4756) (#4776) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 255 | `cecb1c531` | tooling/deps/ci | chore(deps): bump the github-actions group with 2 updates (#4775) | Skip unless br1 adopts that distribution surface. |
| 256 | `79ae8a48b` | external sync/integration | feat(reader): sync per-book proofread rules across devices (#4781) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 257 | `99b9adfe8` | external sync/integration | refactor(sync): provider-agnostic file-sync engine with incremental WebDAV sync (#4784) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 258 | `13e0fb814` | external sync/integration | feat(webdav): sort and filter the WebDAV browser (#4724) (#4786) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 259 | `58f84d18c` | external sync/integration | fix(sync): keep WebDAV connection after restart when a pull overlaps it (#4793) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 260 | `4c39d769e` | external sync/integration | fix(hardcover): never send a book id as edition_id (#4792) (#4794) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 261 | `155807839` | external sync/integration | fix(settings): keep global settings in sync across windows (#4580) (#4803) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 262 | `9e9344533` | external sync/integration | fix(sync): sync WebDAV credentials across devices (#4810) (#4818) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 263 | `9496de301` | misc | fix(node-app-service): ensure correct cross-platform path resolution in NodeAppService (#4819) | Triage manually if touched files overlap br1. |
| 264 | `7e78f80e1` | external sync/integration | feat(sync): Google Drive cloud sync + premium Third-party Cloud Sync section (desktop) (#4821) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 265 | `531f0b58a` | external sync/integration | feat(sync): stream Google Drive book uploads/downloads from disk (#4824) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 266 | `ae9fb05f2` | account/payments | feat(sync): Google Drive sign-in on Android + iOS (mobile OAuth) (#4823) | Skip unless br1 adopts that distribution surface. |
| 267 | `c6f2a83d9` | external sync/integration | fix(sync): retry thrown transport errors in Google Drive sync (#4827) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 268 | `d932444b7` | external sync/integration | fix(sync): cloud-sync settings polish + temporary premium ungate (#4828) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 269 | `5f44c9559` | external sync/integration | feat(sync): library-scoped auto-sync for third-party cloud (WebDAV / Drive) (#4835) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 270 | `7972de190` | platform | fix(eink): render Customize Toolbar preview as bordered surface, not black bar (#4839) (#4841) | Skip mobile-only behavior for now. |
| 271 | `b87cbfa21` | account/payments | feat(sync): Google Drive on web via full-page redirect OAuth (#4843) | Skip unless br1 adopts that distribution surface. |
| 272 | `ea9910667` | external sync/integration | fix(sync): silence third-party cloud-sync error toasts (#4845) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 273 | `5358d85c0` | release/store | release: version 0.11.16 (#4847) | Skip unless br1 adopts that distribution surface. |
| 274 | `781a29799` | release/store | ci(release): attest release and nightly build artifacts (#4851) | Skip unless br1 adopts that distribution surface. |
| 275 | `01bc01598` | release/store | release: version 0.11.17 (hotfix for an Android crash) (#4852) | Skip unless br1 adopts that distribution surface. |
| 276 | `4d0be496b` | account/payments | fix(layout): respect author vertical-align on inline images (#4866) (#4878) | Skip unless br1 adopts that distribution surface. |
| 277 | `8cd3cacbe` | tooling/deps/ci | chore(deps): bump the github-actions group with 5 updates (#4884) | Skip unless br1 adopts that distribution surface. |
| 278 | `7a8354d63` | platform | fix(android): avoid black screen when external cache dir is unavailable (#4889) | Skip mobile-only behavior for now. |
| 279 | `a3609731c` | platform | fix(macos): minimize instead of hide on macOS 26 to avoid black window (#4890) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 280 | `81802a7c7` | account/payments | fix(ios): keep App Group entitlement on widget/share extensions in App Store builds (#4891) | Skip unless br1 adopts that distribution surface. |
| 281 | `df34de1c3` | external sync/integration | fix(sync): WebDAV upload-after-enable and deletion propagation (#4856, #4860) (#4892) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 282 | `9f65e3d41` | account/payments | fix(auth): surface OAuth callback errors on desktop deeplink (#4881) (#4894) | Skip unless br1 adopts that distribution surface. |
| 283 | `849f15116` | release/store | fix(ios): release screen brightness on background so auto-brightness resumes (#4885) (#4896) | Skip unless br1 adopts that distribution surface. |
| 284 | `bd415a850` | external sync/integration | fix(koplugin): fold duplicate stats book rows so synced time shows in KOReader (#4895) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 285 | `77ea87c34` | platform | fix(updater): disable in-app updater on non-AppImage Linux (#4874) (#4897) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 286 | `84c5a9dae` | platform | fix(window): enter fullscreen from maximized windows (#4034) (#4903) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 287 | `4b2c5f93a` | platform | fix(window): keep Linux window opaque so it can't turn invisible (#3682) (#4904) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 288 | `71cb3ace9` | platform | feat(android): Android Auto media support for TTS playback (#3919) (#4907) | Skip mobile-only behavior for now. |
| 289 | `2680614c1` | tooling/deps/ci | ci(nightly): fix nightly update detection broken by AppImage bundling hang (#4909) | Skip unless br1 adopts that distribution surface. |
| 290 | `967a7833c` | account/payments | feat(sentry): add crash reporting for Android, iOS, desktop, and web (#4914) | Skip unless br1 adopts that distribution surface. |
| 291 | `1d3dfd395` | platform | fix(ios): stop share extension hijacking shared .txt files (#4917) | Skip mobile-only behavior for now. |
| 292 | `c86decc2c` | platform | fix(test): make Android double-tap e2e pass on default-config CI devices (#4921) | Skip mobile-only behavior for now. |
| 293 | `395a1e67a` | tooling/deps/ci | fix(nix): get nix devshell working (#4883) | Skip unless br1 adopts that distribution surface. |
| 294 | `6013341cb` | tooling/deps/ci | fix(turso): bump plugin submodule to serialize connection operations (#4927) | Skip unless br1 adopts that distribution surface. |
| 295 | `5301020a0` | external sync/integration | feat(koplugin): pull sync on device wake with book open (#4928) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 296 | `4dbe9cc9f` | release/store | fix: Sentry production hardening (release/OS tags, unhandled-rejection & render-loop guards) (#4929) | Skip unless br1 adopts that distribution surface. |
| 297 | `727f6150a` | tooling/deps/ci | fix: change formatter to nixpkgs-fmt (#4932) | Skip unless br1 adopts that distribution surface. |
| 298 | `0b180da6a` | external sync/integration | fix(koplugin): key library pull cursor on synced_at to stop stale library (#4934) (#4944) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 299 | `2963e75bd` | external sync/integration | fix(sync): propagate group membership for already-synced books (#4946) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 300 | `3f4d4b864` | misc | fix(transfer): persist queue when clearing completed/failed/all (#4947) | Triage manually if touched files overlap br1. |
| 301 | `9321c2cd3` | platform | fix(widget): round iOS cover thumbnail size to whole pixels (#4950) | Skip mobile-only behavior for now. |
| 302 | `da00a94f6` | account/payments | feat(sentry): tag events with the WebView engine and version (#4952) | Skip unless br1 adopts that distribution surface. |
| 303 | `942c062d3` | account/payments | fix(sync): decouple Readest Cloud storage quota from third-party cloud sync (#4959) (#4971) | Skip unless br1 adopts that distribution surface. |
| 304 | `a72f53534` | external sync/integration | feat(sync): propagate tags and reading status through third-party file sync (#4973) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 305 | `f80547709` | external sync/integration | perf(koplugin): defer and cache Library group covers (#4954) (#4974) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 306 | `e08622b41` | external sync/integration | feat(sync): route library sync exclusively to the selected cloud provider (#4380) (#4975) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 307 | `57868a138` | external sync/integration | feat(settings): unified Cloud Sync chooser with Readest Cloud as a first-class provider (#4976) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 308 | `3503b0234` | account/payments | fix(sync): abort the file-sync run on auth failure instead of marching the library (#4981) | Skip unless br1 adopts that distribution surface. |
| 309 | `bcd27b704` | i18n | chore(i18n): translate the cloud sync provider-selection strings (#4980) | Skip unless br1 adopts that distribution surface. |
| 310 | `ccb937015` | external sync/integration | feat(sync): incremental file sync and per-book transfers for the active provider (#4982) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 311 | `56abcb4a6` | external sync/integration | feat(sync): S3-compatible cloud sync provider (#4990) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 312 | `ab628fe25` | platform | fix(android): background TTS media controls + lock-screen scrubber/seek + Edge click fix (#4994) | Skip mobile-only behavior for now. |
| 313 | `883dae36a` | account/payments | fix(opds): auth negotiation and auto-download fixes for self-hosted catalogs (#5002) | Skip unless br1 adopts that distribution surface. |
| 314 | `4af203755` | release/store | release: version 0.11.18 (#5003) | Skip unless br1 adopts that distribution surface. |
| 315 | `93048acda` | account/payments | fix: Sentry high-priority crash batch (autoscroll, TTS, MOBI, book-open, PDF links) (#5012) | Skip unless br1 adopts that distribution surface. |
| 316 | `fd82e5c2e` | account/payments | fix(sentry): repair open-with crash-reporter arg and drop benign noise (#5014) | Skip unless br1 adopts that distribution surface. |
| 317 | `a46043dab` | misc | fix(transfer): coalesce progress updates to stop the render storm (#5015) | Triage manually if touched files overlap br1. |
| 318 | `02e972f65` | misc | chore: add zed-editor support (#5026) | Triage manually if touched files overlap br1. |
| 319 | `f4b572e2c` | tooling/deps/ci | chore(deps): bump the github-actions group with 9 updates (#5031) | Skip unless br1 adopts that distribution surface. |
| 320 | `15cca2377` | misc | fix(updater): never throw from an auto update check (#5028) | Triage manually if touched files overlap br1. |
| 321 | `870a62e0e` | account/payments | feat(sentry): upload browser source maps for symbolicated JS crashes (#5027) | Skip unless br1 adopts that distribution surface. |
| 322 | `21ebf1048` | platform | fix(android): remove Android Auto opt-in from manifest to unblock Play review (#5038) | Skip mobile-only behavior for now. |
| 323 | `e82fb9170` | external sync/integration | feat(reader): subscribe to RSS/Atom/JSON feeds as periodical feed books (#5039) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 324 | `2a97c8d2b` | misc | fix: add backticks to docstring for proper formatting (#5040) | Triage manually if touched files overlap br1. |
| 325 | `59669a9bf` | external sync/integration | feat(sync): add OneDrive as a cloud sync provider (#5007) (#5048) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 326 | `36ea007e1` | external sync/integration | feat(sync): sync S3 config + credentials cross-device, exclude device-local fields from backup (#5051) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 327 | `dfa384a01` | misc | docs: fix malformed code block (#5059) | Triage manually if touched files overlap br1. |
| 328 | `e3cb5f2ae` | misc | feat: add nicer issue templates (#5060) | Triage manually if touched files overlap br1. |
| 329 | `ee727b0cb` | platform | fix(android): reliable Android Auto media controls (#5066) | Skip mobile-only behavior for now. |
| 330 | `58d4661b7` | platform | feat(ios): CarPlay support and native TTS playout with Now Playing integration (#5085) | Skip mobile-only behavior for now. |
| 331 | `5834bbccf` | external sync/integration | fix(sync): keep the cloud copy when deleting a book from the device only (#5084) (#5087) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 332 | `3a763a5c8` | platform | fix(android): stop 32-bit ARM builds aborting at launch (#5070) (#5089) | Skip mobile-only behavior for now. |
| 333 | `b6355b42f` | external sync/integration | fix(kosync): accept pulled progress from servers that omit document (#5090) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 334 | `a956f3042` | platform | fix(macos): skip the minidump handler in sandboxed App Store builds (#5091) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 335 | `765d9d2ca` | external sync/integration | fix(sync): carry reading progress onto the shelf row in file sync (#5096) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 336 | `aed3cbfff` | misc | chore: enable setting to let vstls report on the entire codebase (#5098) | Triage manually if touched files overlap br1. |
| 337 | `b4df8bc09` | i18n | fix(i18n): merge the split cloud provider tip into one key (#5102) | Skip unless br1 adopts that distribution surface. |
| 338 | `696464b4f` | external sync/integration | feat(koplugin): bind full annotation sync to a gesture, upload the open book (#5106) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 339 | `ce2eabbbc` | account/payments | fix(sentry): stop the crash reporter booting a second copy of the app (#5052) (#5107) | Skip unless br1 adopts that distribution surface. |
| 340 | `521c83123` | platform | fix(android): give each gallery image its own name and report insert failures (#5109) | Skip mobile-only behavior for now. |
| 341 | `c37d7eb2b` | account/payments | fix(sentry): drop the minidump crash reporter, it re-execs our own binary (#5112) | Skip unless br1 adopts that distribution surface. |
| 342 | `d45ff07ca` | external sync/integration | fix(sync): verify the sync passphrase and make a wrong one recoverable (#5115) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 343 | `a435d8550` | external sync/integration | fix(kosync): resolve element-offset XPointers and isolate percentage drift anchor to KOReader (#5111) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 344 | `da39d145d` | external sync/integration | feat(sync): allow syncing to multiple providers at once (#5062) (#5122) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 345 | `5bbc326bf` | external sync/integration | perf(sync): drop redundant deleted_at OR from stats pull cursor (#5127) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 346 | `99931a9a3` | platform | fix(pdf): prevent iOS WebContent OOM crash on PDF page turn and zoom (#5118) (#5129) | Skip mobile-only behavior for now. |
| 347 | `17d8e13b4` | tooling/deps/ci | chore(deps): bump actions/setup-node in the github-actions group (#5138) | Skip unless br1 adopts that distribution surface. |
| 348 | `27aca2b93` | misc | fix: fix param name typo (#5145) | Triage manually if touched files overlap br1. |
| 349 | `5e09837ac` | platform | fix(tts): keep Android system TTS reading with the screen locked (#4408) (#5146) | Skip mobile-only behavior for now. |
| 350 | `5a0328556` | external sync/integration | fix(sync): create Google Drive files atomically to stop stranding "Untitled" files in the Drive root (#5147) (#5150) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 351 | `1097a84e5` | external sync/integration | fix(sync): sync WebDAV server URL for configured-but-disabled providers (#5141) (#5149) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 352 | `56191a7b1` | misc | docs(design): default primary buttons to btn-contrast, reserve btn-primary for CTAs (#5155) | Triage manually if touched files overlap br1. |
| 353 | `e8abc6344` | misc | chore: replace outdated `react-color` package with `react-colorful` (#5128) | Triage manually if touched files overlap br1. |
| 354 | `ccd69e7f2` | account/payments | fix(payment): stop Google Play RTDN fallback from downgrading paying subscribers (#5163) | Skip unless br1 adopts that distribution surface. |
| 355 | `19a89c434` | platform | fix(reader): stabilize iOS text selection with instant highlight and captured page turns (#5184) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 356 | `de8c60992` | external sync/integration | fix(koplugin): fix auto-sync push crash and UI-thread block on book open/close (#5006) (#5186) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 357 | `2f26b0407` | platform | fix(ios): keep the App Group on the widget and share extensions in App Store builds (#5188) | Skip mobile-only behavior for now. |
| 358 | `e9618076d` | account/payments | fix(opds): restore Calibre pipe-escaped commas in author names and join authors with & (#5189) | Skip unless br1 adopts that distribution surface. |
| 359 | `0719d58ec` | release/store | feat(updater): show original text for auto-translated release notes (#5203) | Skip unless br1 adopts that distribution surface. |
| 360 | `1680e53b1` | external sync/integration | fix(reader): synchronize toolbar with layered page turns (#5179) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 361 | `d7e7a6ad6` | release/store | ci(release): publish Send to Readest extension zip (#5204) | Skip unless br1 adopts that distribution surface. |
| 362 | `bf47da338` | tooling/deps/ci | fix(applock): hide PIN entry while the biometric sheet is on screen (#5207) | Skip unless br1 adopts that distribution surface. |
| 363 | `3605c9ef5` | platform | fix(ios): re-attach App Group to widget/share extensions in App Store builds (#5219) | Skip mobile-only behavior for now. |
| 364 | `1df1505fc` | release/store | release: version 0.11.20 (#5220) | Skip unless br1 adopts that distribution surface. |
| 365 | `81db8ea86` | account/payments | fix(reader): resolve high-priority Sentry crashes (#5231) | Skip unless br1 adopts that distribution surface. |
| 366 | `ba9fca847` | account/payments | fix(android): drop the Sentry NDK integration that destabilizes the WebView (#5227) (#5234) | Skip unless br1 adopts that distribution surface. |
| 367 | `955f02f34` | platform | fix(android): withdraw Android Auto opt-in to pass Play review (#5235) | Skip mobile-only behavior for now. |
| 368 | `3506a96ed` | account/payments | fix: contain updater and native auth rejections (#5237) | Skip unless br1 adopts that distribution surface. |
| 369 | `76c3baedf` | external sync/integration | refactor: remove the auto upload books option in the main menu in favor of the settings in Readest manage sync settings (#5243) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 370 | `fd0d41edd` | misc | feat: style checked toggle (#5242) | Triage manually if touched files overlap br1. |
| 371 | `4c2d80223` | misc | fix: fix unstyled tauri content (#5248) | Triage manually if touched files overlap br1. |
| 372 | `5d0b7ab50` | tooling/deps/ci | chore: migrate away from numtide devshell (#5131) | Skip unless br1 adopts that distribution surface. |
| 373 | `c6a48bd6f` | tooling/deps/ci | chore(deps): bump the github-actions group with 5 updates (#5276) | Skip unless br1 adopts that distribution surface. |
| 374 | `45084e61b` | misc | docs: fix typo in README (#5298) | Triage manually if touched files overlap br1. |
| 375 | `28e7b9297` | platform | fix(windows): remove serve.mjs shebang, fix test path separators (#5302) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 376 | `a3ceb6bad` | account/payments | fix(rss): sync feed subscriptions across devices (#5307) (#5314) | Skip unless br1 adopts that distribution surface. |
| 377 | `394ecd398` | platform | fix(macos): restore close-to-hide on Tahoe (#5240) (#5333) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 378 | `a9e50e284` | tooling/deps/ci | chore(deps): bump dependencies for open Dependabot advisories (#5335) | Skip unless br1 adopts that distribution surface. |
| 379 | `65d22f32a` | account/payments | fix(auth): move ProviderLogin out of the auth page module (#5336) | Skip unless br1 adopts that distribution surface. |
| 380 | `dc59adecb` | platform | fix(metadata): make "Change cover image" work on iOS (#5346) | Skip mobile-only behavior for now. |
| 381 | `78bb5df6f` | external sync/integration | fix(sync): pull the books delta in bounded pages for large libraries (#5364) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 382 | `e222af713` | misc | fix: disable hardcoded debug flag in AI logger (#5370) | Triage manually if touched files overlap br1. |
| 383 | `c922e7be2` | external sync/integration | fix(sync): stop a local-only delete from wiping the Drive copy (#5265) (#5376) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 384 | `872e9b54d` | platform | fix(android): keep All Files Access on the Play build (#5372) (#2862) (#5378) | Skip mobile-only behavior for now. |
| 385 | `96f6d97c1` | platform | fix(ios): unbreak the share extension build after the clip capture change (#5379) | Skip mobile-only behavior for now. |
| 386 | `dc764e62a` | platform | fix(window): cover the taskbar when entering fullscreen while maximized on Windows (#5295) (#5380) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 387 | `4edc39014` | release/store | fix(discord): keep the rich presence cover URL stable, closes #5352 (#5382) | Skip unless br1 adopts that distribution surface. |
| 388 | `0d15758a5` | misc | fix(css): keep image invert effective in dark mode with color override (#5250) (#5383) | Triage manually if touched files overlap br1. |
| 389 | `8ec150fa4` | tooling/deps/ci | chore(deps): bump the github-actions group with 3 updates (#5396) | Skip unless br1 adopts that distribution surface. |
| 390 | `a21d4a43b` | platform | fix(ios): declare NSPhotoLibraryAddUsageDescription so saving images works (#5397) (#5405) | Skip mobile-only behavior for now. |
| 391 | `bbad27adf` | platform | feat(theme): add Ambient Mode on Android (#5394) | Skip mobile-only behavior for now. |
| 392 | `7d95e8856` | platform | fix(ios): declare txt and md in fileAssociations so Files offers Readest again (#5415) | Skip mobile-only behavior for now. |
| 393 | `480d1bebb` | platform | fix(tts): cut Edge trailing silence on iOS playout so sentence pauses are honored (#5414) (#5417) | Skip mobile-only behavior for now. |
| 394 | `816c6b9b5` | platform | fix(reader): suppress the Android system selection menu natively (#5427) (#5430) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 395 | `4f7c3a209` | platform | fix(reader): measure popup height as border box for the eink triangle (#5431) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 396 | `33d9a4cd3` | platform | fix(ci): pin the AppImage tauri-cli fork to a known-good rev (#5433) | Skip mobile-only behavior for now. |
| 397 | `69ae39c26` | external sync/integration | feat(reader): include book cover in annotation exports and Readwise sync (#5424) (#5435) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 398 | `ea73b081a` | release/store | fix(library): release parsed book documents after import, closes #5387 (#5439) | Skip unless br1 adopts that distribution surface. |
| 399 | `165e3192a` | external sync/integration | fix(sync): merge book metadata on its own clock so page turns cannot clobber edits (#5438) (#5442) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 400 | `c181e6f5e` | account/payments | fix(web): make CORS preflight responses cacheable for authenticated requests (#5444) | Skip unless br1 adopts that distribution surface. |
| 401 | `37fc1fe30` | platform | fix(android): stabilize the nightly e2e lane and the top-inset touch overlays (#5453) | Skip mobile-only behavior for now. |
| 402 | `61b248e44` | tooling/deps/ci | fix: install playwright browsers in nix flake (#5454) | Skip unless br1 adopts that distribution surface. |
| 403 | `81dee0362` | platform | fix(library): render the book context menu in-app on Linux desktop (#5467) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 404 | `1fcaa506b` | external sync/integration | fix(sync): gate dictionary preferences on the Dictionaries toggle, closes #5465 (#5470) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 405 | `ba6e1fcb3` | platform | fix(linux): explain the missing file picker in SteamOS Gaming Mode (#5475) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 406 | `f0b856fab` | account/payments | fix(sync): handle OneDrive OAuth callbacks (#5479) | Skip unless br1 adopts that distribution surface. |
| 407 | `65240c541` | platform | fix(android): correct the package name in the native-tts unit test (#5484) | Skip mobile-only behavior for now. |
| 408 | `9bce2192d` | external sync/integration | feat(bookorbit): add BookOrbit integration with annotations, bookmarks, stats, and status sync (#5487) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 409 | `a6cbefd15` | misc | fix(db): close only the target connection when closing a native database (#5497) | Triage manually if touched files overlap br1. |
| 410 | `3b54b0969` | account/payments | fix(auth): make the password sign-in form work with Android password managers (#5505) | Skip unless br1 adopts that distribution surface. |
| 411 | `1a88833b0` | external sync/integration | fix(koplugin): keep book metadata hash consistent with Readest (#5508) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 412 | `6e4867c86` | external sync/integration | fix(koplugin): guard nil response on login/OTP failure (#5507) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 413 | `c2e8fe978` | platform | feat(reader): support Apple Pencil double tap and squeeze as page turners (#5511) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 414 | `6fbcbada4` | external sync/integration | fix(kosync): stop re-prompting resolved sync conflicts on window re-activation (#5527) (#5528) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 415 | `5b3f3e888` | platform | fix(android): deliver file picker results via replayable plugin event (#1217) (#5531) | Skip mobile-only behavior for now. |
| 416 | `d4b9abb51` | tooling/deps/ci | chore(deps): bump the github-actions group with 5 updates (#5530) | Skip unless br1 adopts that distribution surface. |
| 417 | `79dfc83f6` | external sync/integration | feat(sync): support iCloud as a cloud sync provider on iOS and macOS (#5532) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 418 | `0e0470611` | platform | fix(ios): restore Open With file associations (#5535) | Skip mobile-only behavior for now. |
| 419 | `0e518d1f6` | external sync/integration | feat(macos): enable icloud sync in direct-distribution builds (#5537) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 420 | `63e10a868` | account/payments | feat(user): add a Danger Zone with Delete All Books (#5542) | Skip unless br1 adopts that distribution surface. |
| 421 | `d92513220` | account/payments | fix(iap): consume google play one-time purchases so storage add-ons can be repurchased (#5545) | Skip unless br1 adopts that distribution surface. |
| 422 | `73e933eb3` | tooling/deps/ci | fix(docker): apply db migrations on first boot and let the font CDN be overridden (#5550) (#5551) | Skip unless br1 adopts that distribution surface. |
| 423 | `629ab2919` | platform | fix(tts): keep the WebView alive while paused so Bluetooth Play resumes (#5561) (#5567) | Skip mobile-only behavior for now. |
| 424 | `00098cad1` | release/store | chore(store): rebuild store listings and manage them from fastlane (#5573) | Skip unless br1 adopts that distribution surface. |
| 425 | `58e234bda` | misc | chore(store): replace Play listing images instead of appending (#5574) | Triage manually if touched files overlap br1. |
| 426 | `eaadf5443` | external sync/integration | Add support for Custom HTTP Headers in Kosync/BookOrbit integrations  (#5570) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 427 | `9b50ceeb9` | platform | fix(tts): play Media Overlay narration via native AVPlayer on iOS (#5562) | Skip mobile-only behavior for now. |
| 428 | `7e07e1b40` | account/payments | fix: highlight swatch colors, window set-title ACL, and debug-build Sentry DSN (#5578) | Skip unless br1 adopts that distribution surface. |
| 429 | `f3e1df7e0` | release/store | release: version 0.12.1 (#5581) | Skip unless br1 adopts that distribution surface. |
| 430 | `675678272` | platform | fix(ios): App Review launch crash, CarPlay crash on connect, and main thread hangs (#5590) | Skip mobile-only behavior for now. |
| 431 | `35e6a1601` | account/payments | fix(sync): drop the Origin header from OAuth token requests (#5604) | Skip unless br1 adopts that distribution surface. |
| 432 | `05047bd00` | platform | fix(android): stop claiming APKs and other downloads as openable books (#5610) | Skip mobile-only behavior for now. |
| 433 | `27615797e` | external sync/integration | feat(localsend): send and receive books over the local network (#5611) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 434 | `dae1783ac` | release/store | fix(library): release TXT sources and chapter HTML during import (#5607) | Skip unless br1 adopts that distribution surface. |
| 435 | `0d02e11a5` | release/store | docs(readme): revert the Sponsors / TestMu AI section | Skip unless br1 adopts that distribution surface. |
| 436 | `ca5acd039` | external sync/integration | fix(ci): stop cargo pulling the flutter SDK for the localsend dep (#5622) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 437 | `9f7daf813` | platform | fix(reader): isolate the book cell to drop the Linux black corner (#5618) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 438 | `c5a2c7bc1` | external sync/integration | fix(localsend): let Readest devices discover each other (#5626) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 439 | `474403e8f` | external sync/integration | fix(sync): recover KOReader progress when a chapter is not well-formed XML (#5630) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 440 | `2c52ed470` | release/store | Added new step to release workflow to send release notes to a Discord channel (#5637) | Skip unless br1 adopts that distribution surface. |
| 441 | `709a39ff3` | platform | fix(reader): stop iOS 16 WebContent crash when opening a book (#5654) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 442 | `2dbd265d7` | external sync/integration | fix(koplugin): extract self-update with ffi/archiver on KOReader 2026.07+ (#5656) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 443 | `437bcf9fd` | account/payments | fix(reader): render fixed-layout pages as authored in dark mode, closes #5649 (#5657) | Skip unless br1 adopts that distribution surface. |
| 444 | `72dcdc350` | release/store | ci: raise nightly and release build timeouts to 90 minutes (#5664) | Skip unless br1 adopts that distribution surface. |
| 445 | `ed3ecca6d` | account/payments | fix(iap): re-verify restored iOS one-time purchases with the server (#5669) | Skip unless br1 adopts that distribution surface. |
| 446 | `f0b11bfa5` | tooling/deps/ci | chore(deps): bump the github-actions group with 6 updates (#5668) | Skip unless br1 adopts that distribution surface. |
| 447 | `b25a2a88c` | external sync/integration | fix(koplugin): push reading stats in bounded chunks, closes #5666 (#5670) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 448 | `f91843fd4` | external sync/integration | fix(sync): never show a future Last Synced time from a clock-skewed peer (#5674) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 449 | `4d15efbe4` | platform | fix(reader): reach the last page of the book on iOS, closes #5663 (#5678) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 450 | `15b446dc7` | external sync/integration | feat(koplugin): LocalSend receive and send for KOReader devices (#5687) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 451 | `56186b2c3` | external sync/integration | fix(sync): create the replica bundle dir before downloading, closes #5675 (#5700) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 452 | `b3626c2a1` | external sync/integration | chore(koplugin): build nightly plugin zip and default to device targets (#5699) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 453 | `85deb8d35` | external sync/integration | feat(sync): add cloud shelves and safe provider deletion (#5701) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 454 | `bd2d719d4` | platform | fix(android): gate gamepad polling on controller connection (#5702) | Skip mobile-only behavior for now. |
| 455 | `a56e5cbcc` | external sync/integration | feat(sync): optional document metadata on KOSync progress uploads (#5704) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 456 | `4b3550ebd` | account/payments | fix(reader): avoid wide word gaps from authored text-wrap pretty, closes #5582 (#5718) | Skip unless br1 adopts that distribution surface. |
| 457 | `a0a152ae5` | external sync/integration | fix(sync): remove the mixed-fleet info toast, closes #5720 (#5726) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 458 | `1716d2724` | external sync/integration | fix(sync): sync the reference page count and stop import wiping configs, closes #5716 (#5727) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 459 | `c42be6bc1` | platform | fix(eink): make e-ink highlights and chips visible, closes #5667 (#5735) | Skip mobile-only behavior for now. |
| 460 | `dcf6d5407` | external sync/integration | feat(wordlens): add the en-vi gloss pack, sync incrementally (#5737) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 461 | `ab36bdac7` | misc | docs: add contributor code of conduct (#5758) | Triage manually if touched files overlap br1. |
| 462 | `fb3748003` | external sync/integration | fix(opds): honor the Manage Sync Books toggle for automatic cloud uploads (#5759) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 463 | `10eb91882` | i18n | feat(i18n): add Georgian translations (#5763) | Skip unless br1 adopts that distribution surface. |
| 464 | `8fa928051` | platform | fix(opds): drop the webview Origin header on native requests (#5765) | Skip mobile-only behavior for now. |
| 465 | `d4bf089ac` | tooling/deps/ci | feat: package for nix (#5605) | Skip unless br1 adopts that distribution surface. |
| 466 | `3e6cb2bca` | tooling/deps/ci | fix(deps): resolve open Dependabot alerts (#5778) | Skip unless br1 adopts that distribution surface. |
| 467 | `d5f7a042c` | tooling/deps/ci | fix(nix): update pnpmDeps hash and verify dep hashes on PRs (#5779) | Skip unless br1 adopts that distribution surface. |
| 468 | `4cbb2a25e` | tooling/deps/ci | chore(deps): bump the github-actions group with 7 updates (#5796) | Skip unless br1 adopts that distribution surface. |
| 469 | `081a3ddbd` | misc | docs: use git input instead of github input (#5791) | Triage manually if touched files overlap br1. |
| 470 | `c303dfafc` | external sync/integration | feat: Audiobookshelf integration with audiobook streaming and podcasts (#5801) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 471 | `46073d324` | platform | feat(reader): expose data-eink on the book document for per-device custom CSS (#5803) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 472 | `aca1fa111` | platform | fix(android): keep the reader alive when a Bluetooth controller connects (#5799) (#5804) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 473 | `71b07b44f` | external sync/integration | perf(sync): merge stat_pages pushes in one upsert_stat_pages RPC (#5832) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 474 | `558ed2afb` | external sync/integration | fix(koplugin): pull reading stats in bounded pages (#5833) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 475 | `39275c986` | account/payments | fix(audiobookshelf): hide ABS books without a server row and backfill covers unauthenticated (#5841) | Skip unless br1 adopts that distribution surface. |
| 476 | `8f10d6928` | misc | chore(stats): enable the archive compaction cron (#5845) | Triage manually if touched files overlap br1. |
| 477 | `e6d29358c` | external sync/integration | fix(sync): send S3 object keys in SigV4 canonical form (#5839) (#5849) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 478 | `90f5fdd35` | tooling/deps/ci | fix(nix): match the Android AVD ABI to the host architecture (#5732) (#5850) | Skip unless br1 adopts that distribution surface. |
| 479 | `3ba968540` | external sync/integration | fix(koplugin): stop auto sync from prompting for Wi-Fi on book open and wake (#5848) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 480 | `e6bb03f05` | external sync/integration | fix(sync): sync highlight deletions from KOReader to Readest (#5853) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 481 | `a6c61c736` | external sync/integration | feat(reader): pair an Audiobookshelf audiobook and read along (#5807) (#5856) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 482 | `fc25b6206` | external sync/integration | feat(reader): let users pick the Hardcover book a file syncs to, closes #5846 (#5857) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 483 | `c07e75916` | external sync/integration | fix(bookorbit): list the open book under Unmatched KOReader Books for manual linking (#5860) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 484 | `c00705ec5` | external sync/integration | fix(sync): stop OPDS re-downloads from losing reading progress (#5859) (#5866) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 485 | `9046b39fa` | external sync/integration | fix(sync): re-run the library auto-sync for changes that land during an in-flight sync (#5869) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 486 | `d213af033` | platform | fix(windows): match the main window's scroll bar style in clip and browser windows (#5873) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 487 | `79b4c2e7c` | platform | fix(android): stop the launch crash on covers that decode 1px tall (#5874) | Skip mobile-only behavior for now. |
| 488 | `8ef527af7` | tooling/deps/ci | feat(ui): migrate to daisyUI 5 and Tailwind CSS 4 (#5884) | Skip unless br1 adopts that distribution surface. |
| 489 | `39580e754` | external sync/integration | fix(sync): apply pulled file-sync progress to the live reader (#5886) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 490 | `09ce80872` | tooling/deps/ci | chore(deps): upgrade to TypeScript 7 (#5893) | Skip unless br1 adopts that distribution surface. |
| 491 | `13dceccde` | tooling/deps/ci | chore(deps): bump the github-actions group with 6 updates (#5902) | Skip unless br1 adopts that distribution surface. |
| 492 | `a913fb1d2` | account/payments | fix(android): migrate Google Play Billing to v9 (#5896) | Skip unless br1 adopts that distribution surface. |
| 493 | `9131dc946` | tooling/deps/ci | fix(ui): restore the daisyUI 4 loading dots animation (#5906) | Skip unless br1 adopts that distribution surface. |
| 494 | `fda5a364a` | external sync/integration | fix(sync): converge multi-device file sync (#5900) (#5905) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 495 | `eee1a1e84` | platform | fix(android): avoid full PDF parsing during import (#5914) | Skip mobile-only behavior for now. |
| 496 | `a03b5144d` | external sync/integration | feat(localsend): brand the LAN transfer feature as Nearby BookDrop (#5915) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 497 | `f8a3e3d2d` | tooling/deps/ci | fix(ui): paint modal boxes that sit outside an open daisyUI modal (#5916) | Skip unless br1 adopts that distribution surface. |
| 498 | `8aaf2759f` | external sync/integration | fix(sync): report third-party sync status in the reader menu (#5910) (#5922) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 499 | `80f196a9b` | external sync/integration | fix(sync): resolve book groups and metadata on their own clock (#5911, #5912) (#5921) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 500 | `f6146c217` | release/store | release: version 0.12.6 (#5929) | Skip unless br1 adopts that distribution surface. |
| 501 | `8d24f5925` | platform | fix(ios): stop web-browser downloads from deadlocking the main thread (#5947) | Skip mobile-only behavior for now. |
| 502 | `295d6e79f` | external sync/integration | feat(notion): sync notes and highlights to Notion (#5949) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 503 | `4c8e6d875` | platform | fix(reader): shrink hidden Android navigation controls (#5966) (#5974) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 504 | `f92f1a9c2` | account/payments | feat(payments): yearly subscription plans and a modernized store front (#5989) | Skip unless br1 adopts that distribution surface. |
| 505 | `24e5cc938` | account/payments | feat(payments): record Apple one-time purchases from ONE_TIME_CHARGE (#5993) | Skip unless br1 adopts that distribution surface. |
| 506 | `270c32acc` | account/payments | fix(payments): acknowledge Apple notifications that carry no transaction (#5994) | Skip unless br1 adopts that distribution surface. |
| 507 | `b80d83534` | account/payments | feat(payments): separate storage and customization entitlements, unlock all when self-hosted (#5996) | Skip unless br1 adopts that distribution surface. |
| 508 | `06af71038` | account/payments | fix(payments): align the plan panels and stop the header eating clicks (#6000) | Skip unless br1 adopts that distribution surface. |
| 509 | `cd4a76fef` | platform | fix(reader): shrink hidden Android navigation controls to 8px (#6001) | Review for Tauri desktop relevance; port only visible desktop behavior. |
| 510 | `79c3c235c` | external sync/integration | fix(bookorbit): cap page-stat uploads at server limits (#6002) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |
| 511 | `c81bd0bee` | external sync/integration | fix(kosync): resolve KOReader XPointers in their own DocFragment (#6014) | Defer unless it touches local reader state integrity; br1 already scopes sync narrowly. |

## Verification

Generated from local git history with:

```sh
git -C /Users/dev/workspace2/hc_apps/readest log --reverse --format=%H%x00%s e0cf7e8d9f0c61e2cd859dd9cc0d026351eef3b6..6df90139dc7b72246572ab33b12d485b281ca6e6
git -C /Users/dev/workspace2/hc_apps/readest show --pretty=format: --name-only <commit>
```

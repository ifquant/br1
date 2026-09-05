# Readest High-Priority Commit Audit

Last updated: 2026-09-05

This document finalizes the 678 high-priority decisions from `e0cf7e8d9f0c61e2cd859dd9cc0d026351eef3b6..6df90139dc7b72246572ab33b12d485b281ca6e6` against current br1 source. It complements the two-step plan; it does not replace the 1,189-commit history ledger.

## Decision Rules

- `covered`: br1 source or an existing regression proves equivalent behavior.
- `partial`: the capability exists, but this commit adds an unproved edge or missing part.
- `gap`: the behavior fits br1 but no equivalent implementation was found.
- `not-applicable`: Readest-only platform, cloud/account, build, dependency, distribution, or implementation detail.
- A `packages/foliate-js` gitlink change is not a generic dependency bump: resolve its old and new SHAs, inspect the nested foliate-js commits, and classify their reader behavior before deciding br1 coverage.

Every upstream commit and its touched-path list was resolved locally. Decisions are deliberately conservative: when the exact Readest bug is not already proved by a br1 regression, the row stays `partial` and its task begins with local reproduction. The task column points to the smallest br1-native follow-up; Readest implementation shape is not a porting requirement.

## Summary

| Status | Commits |
| --- | ---: |
| `covered` | 54 |
| `partial` | 412 |
| `gap` | 77 |
| `not-applicable` | 135 |

| Area | Covered | Partial | Gap | Not applicable |
| --- | ---: | ---: | ---: | ---: |
| reader core | 35 | 222 | 22 | 55 |
| library | 9 | 58 | 17 | 20 |
| tts/audio | 0 | 41 | 7 | 19 |
| reading modes/controls | 4 | 31 | 0 | 1 |
| catalog/import | 0 | 36 | 11 | 16 |
| security | 5 | 1 | 0 | 21 |
| ai/assist/dictionary | 1 | 23 | 20 | 3 |

## Commit Decisions

| # | Commit | Area | Readest subject | Status | Task | Decision basis |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `193613659` | reader core | fix: resolve various tracked exceptions in ph (#3584) | `partial` | S2-R07 | Relevant failure class; reproduce locally before changing code. |
| 2 | `290550601` | reader core | fix(layout): fixed total scrollable width in vertical scrolled mode, closes #3583 (#3586) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 3 | `87f0240b0` | reader core | compat(footnote): support footnote text in alt attribute of the image, closes #3576 (#3587) | `covered` | S2-R04C3 | Native no-href vendor markers preserve metadata/image-alt priority and render inert plaintext, including nested Duokan superscript clicks. Unrelated continuous-scroll removal is not ported. |
| 4 | `5a072e7d1` | reader core | fix(pdf): apply theme colors for PDFs, closes #3593 (#3626) | `covered` | S2-R03A | The PDF renderer receives the active br1 theme palette through `pageColors`, with a focused browser regression. |
| 5 | `f31030583` | library | fix(library): mixed sorting for group and ungroupped books, closes #3596 (#3627) | `covered` | S1-R03 | P0-4.1/P0-4.2 and library smoke tests. |
| 6 | `52df478f2` | reader core | fix: show proper background images in continuous scrolled mode, closes #3638 (#3645) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 7 | `5f897f648` | tts/audio | feat(tts): add shortcuts to navigate and play/pause in TTS mode, closes #3620 (#3651) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 8 | `3d4d1482a` | reading modes/controls | feat: add keyboard shortcuts help dialog (#3653) | `covered` | S1-R02 | A modal help surface renders directly from the conflict-checked reader binding map. |
| 9 | `966f5e2ac` | catalog/import | fix(opds): fixed image download from ODPS server on the web, closes #3649 (#3658) | `partial` | S2-O01 | catalogs.rs and catalog tests; fixture browsing exists, live fetch is incomplete. |
| 10 | `c4e331564` | reader core | feat(scroll): add single section scroll option, closes #3663 (#3668) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 11 | `b3333c384` | reader core | chore(fdroid): get rid of wasm binaries in fdroid build (#3677) | `not-applicable` | — | Readest build, dependency, CI, or distribution detail. |
| 12 | `c68861288` | reader core | chore(fdroid): build qcms wasm for fdroid (#3680) | `not-applicable` | — | Readest build, dependency, CI, or distribution detail. |
| 13 | `8e6451863` | library | css: add css selector for status badge, closes #3678 (#3684) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 14 | `8ed929065` | reader core | layout: don't truncate remaining progress info without status info, closes #3678 (#3685) | `partial` | S2-R01C | P0-2/P0-3 and reader smoke tests; exact responsive/metric edge is unproved. |
| 15 | `797fe9c60` | reader core | fix(layout): fixed infinite expand calls and freeze in the paginator, closes #3683 (#3690) | `partial` | S2-R01B | P0-2/P0-3 and reader smoke tests; exact paginator boundary is unproved. |
| 16 | `b87286813` | reader core | fix(layout): fixed infinite expand calls and freeze in the paginator, closes #3683 (#3692) | `partial` | S2-R01B | P0-2/P0-3 and reader smoke tests; exact paginator boundary is unproved. |
| 17 | `ec26ef4f2` | reading modes/controls | fix(shortcuts): change bookmark shortcut from Ctrl+D to Ctrl+B (#3691) | `covered` | S1-R02 | Ctrl/Cmd+B toggles the current bookmark through the centralized reader dispatcher. |
| 18 | `e9c5ebb69` | reader core | fix(fonts): fix Adobe font deobfuscation and CSS var fallbacks, closes #3662 (#3696) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 19 | `e68dedd10` | reader core | fix(layout): fix primary view detection on fractional DPR devices, closes #3681 (#3701) | `partial` | S2-R01C | P0-2/P0-3 and reader smoke tests; exact responsive/metric edge is unproved. |
| 20 | `f67930feb` | catalog/import | fix(opds): fix Copyparty books showing as "Untitled" in mixed feeds, closes #3667 (#3705) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed fixture is missing. |
| 21 | `94843902a` | library | fix(annotations): fix all annotations grouped under last chapter for fragment-href TOCs, closes #3688 (#3706) | `partial` | S2-A01A | P0-2/P0-3 and reader smoke tests; this anchor/grouping edge is unproved. |
| 22 | `b71b24660` | tts/audio | feat(settings): add TTS settings tab and highlight opacity, closes #3661 (#3712) | `gap` | S2-T02 | tts.ts, ttsRuntime.ts, and TTS tests; spoken-range highlighting is absent. |
| 23 | `0e516f6e5` | security | chore(test): add unit tests and enforce dash-case naming for test files (#3715) | `not-applicable` | — | No portable user-visible behavior remains. |
| 24 | `29df8522f` | ai/assist/dictionary | chore(bump): bump Tauri to the latest version (#3716) | `not-applicable` | — | Readest runtime/build metadata with no behavior port. |
| 25 | `74401fc1b` | library | fix(library): always sort series books by index ascending, closes #3709 (#3717) | `partial` | S2-L03 | P0-4.1/P0-4.2 and library smoke tests; exact metadata/provenance is missing. |
| 26 | `9ecb9b24d` | reading modes/controls | feat: make reading ruler selection and step navigation coherent (#3722) | `partial` | S2-F04 | Focused reading exists; the line-aware ruler and its step/anchor semantics are not implemented. |
| 27 | `c9647276b` | reading modes/controls | feat(rsvp): progress bar per chapter, speed selector dropdown, and UX improvements (#3723) | `partial` | S2-F03 | readingMode.ts and focused-reading e2e; RSVP-lite lacks this complete control. |
| 28 | `62df631dd` | tts/audio | feat(theme): add atmosphere easter egg with video overlay and ambient audio (#3727) | `not-applicable` | — | Optional product surface outside current br1 scope. |
| 29 | `05afaab5f` | reader core | fix(layout): fixed static image size and layout shift on window resize, closes #3634 (#3729) | `partial` | S2-R01C | P0-2/P0-3 and reader smoke tests; exact responsive/metric edge is unproved. |
| 30 | `888f4afde` | reader core | fix: preserve paragraph mode reading layouts and other UI/UX fixes (#3730) | `partial` | S2-F05 | Paragraph focus exists; authored layout preservation remains unproved. |
| 31 | `6a44f609b` | reader core | fix(paginator): fixed paginator section preloading, closes #3600 and closes #3601 (#3734) | `partial` | S2-R01B | P0-2/P0-3 and reader smoke tests; exact paginator boundary is unproved. |
| 32 | `45bd35598` | catalog/import | feat(opds): support custom catalog headers with web proxy consent (#3740) | `partial` | S2-O01 | catalogs.rs and catalog tests; fixture browsing exists, live fetch is incomplete. |
| 33 | `caa0d719c` | reader core | compat(vertical): check writing mode also for child element of body, closes #3583 (#3743) | `partial` | S2-R04C10 | P0-2/P0-3 and reader smoke tests; authored-content compatibility is unproved. |
| 34 | `21795e5cd` | tts/audio | fix(tts): avoid race condition in preloadNextSSML causing wrong highlights (#3748) | `partial` | S2-T01 | tts.ts, ttsRuntime.ts, and TTS tests; upstream race needs a local regression. |
| 35 | `70b94d898` | reader core | fix(layout): fixed layout of progress bar in vertical mode (#3749) | `partial` | S2-R01C | P0-2/P0-3 and reader smoke tests; exact responsive/metric edge is unproved. |
| 36 | `d53f3b42e` | reading modes/controls | feat(rsvp): split words option, faster countdown, and skip pages RSVP cant open (#3755) | `partial` | S2-F03 | readingMode.ts and focused-reading e2e; RSVP-lite lacks this complete control. |
| 37 | `a2d17e6a7` | reader core | fix: clear highlight overlay when deleting annotation from sidebar, closes #3756 (#3758) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 38 | `8b10e7fb1` | reader core | fix(layout): use mobile footer bar in portrait mode without regressing phone panel animation, closes #3742 (#3759) | `not-applicable` | — | Mobile/device-only behavior is outside the desktop target. |
| 39 | `b9a2b10fa` | reading modes/controls | fix(a11y): fixed keyboard activation of dropdown menu (#3762) | `covered` | S1-R02 | Native menu buttons open the shortcuts dialog through keyboard activation in browser regression coverage. |
| 40 | `b679817fc` | tts/audio | fix(tts): prevent double playback on rapid TTS icon clicks (#3764) | `partial` | S2-T01 | tts.ts, ttsRuntime.ts, and TTS tests; upstream race needs a local regression. |
| 41 | `298d4872a` | ai/assist/dictionary | fix(translate): disable yandex provider while upstream relay is down (#3765) | `partial` | S2-A05 | assistance.ts and readerAssistance tests; exact provider/layout/error behavior is incomplete. |
| 42 | `ae2c42193` | reader core | fix(ui): restore highlight options layout and clean up color name editing (#3776) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 43 | `16adf1125` | library | fix(library): align grid hover highlight corner radius (#3774) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact interaction/layout state is unproved. |
| 44 | `017a9338b` | ai/assist/dictionary | fix(dictionary): add Chinese dictionary lookup with pinyin support (#3784) | `partial` | S2-A03 | assistance.ts and readerAssistance tests; exact language/normalization behavior is missing. |
| 45 | `db35a4e20` | reader core | fix(style): clamp oversized hardcoded pixel widths and fix browser test flakiness (#3785) | `partial` | S2-R01C | P0-2/P0-3 and reader smoke tests; exact responsive/metric edge is unproved. |
| 46 | `82deb85c6` | security | docs: add threat model and incident response plan to SECURITY.md (#3788) | `covered` | S2-S04 | Root SECURITY.md records br1 assets, trust boundaries, implemented controls, known gaps, reporting, severity, and incident response without importing Readest-only account claims. |
| 47 | `184de9210` | security | fix(security): prevent SSRF in kosync proxy (CWE-918) (#3793) | `not-applicable` | — | br1 has no Readest KOSync proxy endpoint. |
| 48 | `932c82aa4` | security | chore(security): update CodeQL workflow to remove languages (#3794) | `not-applicable` | — | Readest build, dependency, CI, or distribution detail. |
| 49 | `799db4076` | reader core | fix(pdf): add an option to apply theme colors to PDF, closes #3778 (#3799) | `covered` | S2-R03A | PDF theme colors are opt-in, default off, exposed in the PDF menu, and persisted through reload. |
| 50 | `bfbe92f35` | reader core | refactor(sidebar): replace react-window and OverlayScrollbars with react-virtuoso and CSS scrollbars (#3798) | `not-applicable` | — | Readest implementation refactor, test maintenance, or project docs. |
| 51 | `13ff96db8` | security | security: potential fix for code scanning alert no. 19: DOM text reinterpreted as HTML (#3802) | `covered` | S2-S01 | TXT source is escaped before HTML assembly, and highlighting emits text nodes instead of reinterpreting book text as markup. |
| 52 | `6072b0dcb` | security | security: fix for code scanning alert no. 12: Use of externally-controlled format string (#3803) | `not-applicable` | — | This changes Readest cloud-download logging; br1 has no corresponding cloud storage download logger. |
| 53 | `dc788283a` | security | security: fix for code scanning alert no. 11: Incomplete multi-character sanitization (#3804) | `covered` | S2-S01 | br1 never parses TXT comments as markup; repeated comment syntax remains escaped literal text in the reader surface. |
| 54 | `e43e533ac` | security | security: fix complete multi-character sanitization for HTML comments in txt.ts (#3806) | `covered` | S2-S01 | The literal TXT path covers the relevant comment edge; br1 has no Google Books description-provider surface. |
| 55 | `d7fd06ca8` | security | chore: add explicit permissions to GitHub Actions workflows (#3807) | `not-applicable` | — | Readest build, dependency, CI, or distribution detail. |
| 56 | `4abbc17f6` | reader core | fix(annotator): fixed instant annotation in scrolled mode, closes #3769 (#3808) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 57 | `1e259e87b` | reader core | refactor(reader): introduce priority-based touch interceptor for gesture handling (#3809) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 58 | `41d014914` | catalog/import | fix(opds): handle spaces and quotes in Content-Disposition filename parsing (#3812) | `partial` | S2-O02B | catalogs.rs and catalog tests; exact filename fixture is missing. |
| 59 | `ed7cfc31f` | reader core | fix(layout): fix off-by-one page count on fractional DPR devices, closes #3787 (#3813) | `partial` | S2-R01B | P0-2/P0-3 and reader smoke tests; exact paginator boundary is unproved. |
| 60 | `a5690e9a8` | tts/audio | fix(tts): skip br elements in PDF text layer to prevent TTS interruptions at line breaks, closes #3771 (#3811) | `partial` | S2-T03 | tts.ts, ttsRuntime.ts, and TTS tests; extraction/section parity is incomplete. |
| 61 | `bd866cb04` | catalog/import | fix(opds): harden Content-Disposition filename parsing for complex names and encoding (#3816) | `partial` | S2-O02B | catalogs.rs and catalog tests; exact filename fixture is missing. |
| 62 | `c6daf72da` | catalog/import | feat(opds): allow editing of registered catalogs (#3814) | `gap` | S2-O03 | catalogs.rs and catalog tests; edit/request configuration is absent. |
| 63 | `23d5f3363` | reader core | fix(rtl): fix page navigation for Arabic books (#3817) | `partial` | S2-R04C10 | Core reading exists; this authored-layout/script edge is unverified. |
| 64 | `07e324878` | reader core | fix: apply disable click to paginate also for non-iframe clicks (#3818) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 65 | `3df75a67f` | tts/audio | feat(tts): support edge tts on cloudflare worker (#3819) | `not-applicable` | — | Cloud TTS provider expansion is outside the Web Speech scope. |
| 66 | `de11511c3` | reader core | fix(layout): fixed bleed layout of images (#3823) | `partial` | S2-R01C | P0-2/P0-3 and reader smoke tests; exact responsive/metric edge is unproved. |
| 67 | `7bf4822b2` | library | fix(library): restore breadcrumb 'All' navigation by bypassing next-view-transitions, closes #3782 (#3829) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact interaction/layout state is unproved. |
| 68 | `030a7c082` | library | perf: optimize library operations for large collections (#3827) | `partial` | S2-L02 | P0-4.1/P0-4.2 and library smoke tests; no measured large-library threshold. |
| 69 | `2a49e93cf` | library | fix(library): fixed the All button in groups breadcrumbs navigation bar, closes #3782 (#3832) | `partial` | S2-L06 | P0-4.1/P0-4.2 and library smoke tests; exact projection/order is missing. |
| 70 | `f86bbbcc2` | library | perf(library): virtualize grid and list of book items when rendering library page (#3835) | `partial` | S2-L02 | P0-4.1/P0-4.2 and library smoke tests; no measured large-library threshold. |
| 71 | `95ff52614` | security | fix(deps): bump dependencies to resolve 13 Dependabot security alerts (#3840) | `not-applicable` | — | Readest build, dependency, CI, or distribution detail. |
| 72 | `ef97a8ed0` | library | fix(ux): optimize scrolling UX for the bookshelf and sidebar content (#3849) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 73 | `41b5e9256` | reader core | feat(annotator): support instant copy operation for selected text, closes #3828 (#3854) | `partial` | S2-A01B | P0-2/P0-3 and reader smoke tests; this selection/popup edge is unproved. |
| 74 | `96678d85e` | reader core | refactor(settings): persist the apply-globally toggle per book (#3856) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; exact theme setting/scope is incomplete. |
| 75 | `ec3261453` | reader core | fix(settings): fixed color picker for custom highlight colors, closes #3796 (#3857) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 76 | `e9d71b293` | reader core | feat(settings): add an option to avoid overriding paragraph layout, closes #3824 (#3858) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 77 | `73d30c103` | reader core | fix(toc): fix page number of some TOC items from section fragments (#3867) | `partial` | S2-R02 | P0-2/P0-3 and reader smoke tests; exact navigation behavior lacks proof. |
| 78 | `b0cc5461a` | reader core | refactor(toc): cache navigable structure per book (#3869) | `partial` | S2-R02 | P0-2/P0-3 and reader smoke tests; exact navigation behavior lacks proof. |
| 79 | `3e292af99` | reader core | refactor(nav): refactor book nav service with TOC enrichment (#3874) | `partial` | S2-R02 | P0-2/P0-3 and reader smoke tests; exact navigation behavior lacks proof. |
| 80 | `802212c42` | library | refactor: fixed typo in module name (#3881) | `not-applicable` | — | Readest implementation refactor, test maintenance, or project docs. |
| 81 | `976bbcc15` | library | fix(library): fixed opening shared books from other apps (#3884) | `covered` | S1-R03 | P0-4.1/P0-4.2 and library smoke tests. |
| 82 | `31e44d2e4` | reader core | fix(a11y): fixed saving reading progress with screen readers, closes #3864 (#3891) | `partial` | S2-R05 | P0-2/P0-3 and reader smoke tests; baseline a11y exists, exact case needs proof. |
| 83 | `b223ccaee` | reader core | feat(footnotes): detect more formats of footnote (#3894) | `covered` | S2-R04C3 | Provisional numeric links use native target extraction with the nested 2bf0cecfc branch matrix, correct cross-section resolution, and ordinary navigation on rejection. The inactive Foliate popup API is not adopted or changed. |
| 84 | `e1dad98e5` | reader core | fix(toc): prevent auto-scroll snap-back on sidebar open (#3900) | `partial` | S2-R02 | P0-2/P0-3 and reader smoke tests; exact navigation behavior lacks proof. |
| 85 | `ff94dc76c` | reader core | fix: fixed crash on app start when there is no main window but a reader window running, closes #3897 (#3902) | `partial` | S2-R07 | Relevant failure class; reproduce locally before changing code. |
| 86 | `c58153e94` | reader core | compat(css): remove no-op css that might break column layout, closes #3895 (#3903) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 87 | `09b19bd3c` | reading modes/controls | perf(rsvp): fixed performance issue when the context window is large, closes #3877 (#3904) | `partial` | S2-F02 | readingMode.ts and focused-reading e2e; chapter/window resume is incomplete. |
| 88 | `9c273d79f` | tts/audio | fix(tts): fixed race condition on pause/resume, closes #3825 (#3905) | `partial` | S2-T01 | tts.ts, ttsRuntime.ts, and TTS tests; upstream race needs a local regression. |
| 89 | `3bbc2071c` | reader core | fix(pdf): fixed annotations not displayed properly in two-page spread for PDFs, closes #3862 (#3906) | `covered` | S2-R03B1 | PDF annotations use stable CFIs, visible PDF overlayers are rebuilt after text-layer rerenders, and a two-page browser regression proves the highlight is restored. |
| 90 | `a2244e28b` | reader core | fix(pdf): don't apply theme colors where canvas filter is unsupported, closes #3912 (#3915) | `covered` | S2-R03A | The menu and renderer share a Canvas filter capability gate that excludes Safari and unsupported native WebViews. |
| 91 | `3f531d904` | reader core | fix(theme): fixed texture background in scrolled mode, closes #3913 (#3918) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 92 | `957b7d5f3` | reader core | fix(layout): properly display full screen page, closes #3914 (#3930) | `partial` | S2-R01C | P0-2/P0-3 and reader smoke tests; exact responsive/metric edge is unproved. |
| 93 | `528a13e36` | reader core | fix(layout): don't dismiss notebook on navigate to annotations when notebook is pinned, closes #3923 (#3948) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 94 | `38d7ba80f` | catalog/import | feat(opds): support auto-download books from OPDS feeds (#3844) | `gap` | S2-O04 | catalogs.rs and catalog tests; advanced protocol/navigation is absent. |
| 95 | `1527dd9b3` | reader core | fix: exponential wheel zoom for images and tables, closes #3956 (#3957) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 96 | `aa60123d3` | reading modes/controls | fix(rsvp): unicode-aware ORP calculation for non-Latin scripts, closes #3958 (#3964) | `partial` | S2-F01 | readingMode.ts and focused-reading e2e; whitespace tokenization is not Unicode-complete. |
| 97 | `ebbbf104b` | reader core | feat(cjk): support inline annotation(warichu, Gezhu) layout (#3934) | `partial` | S2-R04C13 | Core reading exists; this authored-layout/script edge is unverified. |
| 98 | `6d798542f` | library | fix: restore main library window when going to library from reader, closes #3969 (#3973) | `covered` | S1-R03 | P0-4.1/P0-4.2 and library smoke tests. |
| 99 | `e18bfd681` | reader core | fix(reader): smooth out mouse wheel scrolling in scroll mode, closes #3966 (#3974) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 100 | `17f2a17ad` | reading modes/controls | fix(toc): fix auto scroll on book open with pinned sidebar, closes #3945 (#3975) | `partial` | S2-R02 | P0-2/P0-3 and reader smoke tests; exact navigation behavior lacks proof. |
| 101 | `63b0b8702` | reader core | fix(layout): fixed dropdown menu layout for the delete button in details, closes #3940 (#3976) | `partial` | S2-R01C | P0-2/P0-3 and reader smoke tests; exact responsive/metric edge is unproved. |
| 102 | `6fcda66b6` | reader core | fix(reader): close stuck reader window on book load failure, closes #3932 (#3980) | `partial` | S2-R07 | Relevant failure class; reproduce locally before changing code. |
| 103 | `6d5e59c79` | reading modes/controls | fix(rsvp): resume at stop word, prevent section replay, restore full context (#3960) | `partial` | S2-F02 | readingMode.ts and focused-reading e2e; chapter/window resume is incomplete. |
| 104 | `ca8f0fe9f` | catalog/import | feat(opds): add OPDS-PSE streaming support and custom OPDS 2.0 parser (#3951) | `gap` | S2-O04 | catalogs.rs and catalog tests; advanced protocol/navigation is absent. |
| 105 | `6fbf9ef68` | catalog/import | fix(layout): fixed layout for catalog title (#3982) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 106 | `3b03b2c8d` | reader core | fix(txt): more robust txt parsing, closes #3970 (#3983) | `covered` | S2-R04B | Native TXT chapter indexing accepts 36-character titles with boundary fixtures; Readest's cover/hash conversion guard has no equivalent owner here. |
| 107 | `4b0720a3e` | reading modes/controls | perf(rsvp): windowed context, extraction caching and lazy CFI for sections with thousands of words, closes #3953 (#3984) | `partial` | S2-F02 | readingMode.ts and focused-reading e2e; chapter/window resume is incomplete. |
| 108 | `920627ae5` | reading modes/controls | feat(rsvp): use jieba tokenizer to segment words for Chinese books (#3985) | `partial` | S2-F01 | readingMode.ts and focused-reading e2e; whitespace tokenization is not Unicode-complete. |
| 109 | `34f19fd14` | reader core | fix(annotation): preserve line breaks in selected text across <br> elements, closes #3981 (#3986) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 110 | `dab92c8a4` | reader core | fix(pdf): prevent continuous scroll kickback (#3990) | `covered` | S2-R03B2 | The nested foliate-js change `2204a28..9f12ba9` is matched by page-index plus intra-page-fraction anchoring around scroll-page resize, with a repeated real-PDF browser regression. |
| 111 | `234ecc311` | ai/assist/dictionary | fix(epub): fall back to case-insensitive zip lookups (#3991) | `covered` | S2-R04A1 | foliate now prefers exact ZIP paths, falls back only to unique case-folded paths, and rejects ambiguous collisions in a focused real-ZIP regression. |
| 112 | `d609de58f` | reader core | fix(reader): preserve position when toggling scrolled mode, closes #3987 (#3996) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 113 | `1d8ed3fc9` | reader core | fix(footnote): ignore background image in footnotes (#3998) | `partial` | S2-U01B | C4 covers native popup background isolation without a second paginator. Nested `af4f384b7` also changes scrolled horizontal page-margin variables; that separate spacing behavior remains unproved under S2-U01B. |
| 114 | `a43845b4c` | reader core | fix(layout): symmetric margins and gap in 2-column layout, closes #3909 (#4002) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 115 | `5a0a70a30` | ai/assist/dictionary | feat(reader): custom dictionaries (StarDict + MDict) (#4012) | `gap` | S2-A04 | assistance.ts and readerAssistance tests; local dictionary formats are absent. |
| 116 | `486659a1c` | reader core | feat(annotations): deep links for highlight exports (#4018) | `gap` | S2-A02 | P0-2/P0-3 and reader smoke tests; portable exchange/deep links are absent. |
| 117 | `fb37406b3` | reader core | feat(annotations): preview mode for deep-link landings (#4019) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 118 | `293d5b5f5` | reading modes/controls | fix(rsvp): cross-device resume seeding + mobile slider drag (#4004) | `not-applicable` | — | Mobile/device-only behavior is outside the desktop target. |
| 119 | `eadb35539` | reader core | fix(txt): recognize 番外/外传 chapter prefixes, closes #4016 (#4025) | `covered` | S2-R04B | Native chapter index and reader TOC recognize bonus/side-story prefixes without splitting fenced code. |
| 120 | `579e95075` | reading modes/controls | fix(rsvp): split em-dash and en-dash compound words (#4026) | `partial` | S2-F01 | readingMode.ts and focused-reading e2e; whitespace tokenization is not Unicode-complete. |
| 121 | `176e5df77` | reader core | refactor(settings): move Keep Screen Awake to Behavior > Device (#4027) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; exact theme setting/scope is incomplete. |
| 122 | `d1e7b4902` | library | feat(share): time-limited share links with cfi-aware imports (#4037) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 123 | `19f3e65b6` | reader core | fix(share): make /s landing build under Next 16 layout-prop validation (#4040) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 124 | `19f2414f4` | reader core | fix(share): hide download link on share landing page (#4041) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 125 | `f5657fb3a` | library | fix(share): correct recipient import flow and assorted UI polish (#4043) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 126 | `8e7b2192d` | reader core | fix(reader): dismiss annotation popup on section info / progress bar tap (#4047) | `partial` | S2-A01B | P0-2/P0-3 and reader smoke tests; this selection/popup edge is unproved. |
| 127 | `7bb113370` | ai/assist/dictionary | feat(dictionaries): add DICT/Slob formats and Web Search providers (#4048) | `gap` | S2-A04 | assistance.ts and readerAssistance tests; local dictionary formats are absent. |
| 128 | `cead0f42e` | reader core | compat(css): fixed table layout and style in dark mode (#4055) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 129 | `d66fedcab` | ai/assist/dictionary | feat(reader): manage rules shortcut in proofread popup (#4062) | `gap` | S2-A07 | No equivalent AI transformation/proofreading action. |
| 130 | `06aec0b59` | reader core | fix(reader): revert footer to default visibility when tap-to-toggle is disabled (#4065) | `partial` | S2-R05 | P0-2/P0-3 and reader smoke tests; exact chrome interaction/layout is unproved. |
| 131 | `9b0072173` | catalog/import | feat(metadata): parse Calibre series info from PDF and CBZ (#4066) | `gap` | S2-L03 | foliate and br1 do not yet parse, persist, and display PDF XMP or CBZ ComicInfo series metadata. |
| 132 | `c27245e98` | reader core | feat(reader): support deeplink and web link in annotation export (#4067) | `gap` | S2-A02 | P0-2/P0-3 and reader smoke tests; portable exchange/deep links are absent. |
| 133 | `5dc252845` | library | fix(library): support dropping directories to import books (#4068) | `gap` | S2-L01 | P0-4.1/P0-4.2 and library smoke tests; bounded directory import is absent. |
| 134 | `e7f370453` | reader core | fix(layout): resolve layout issues with mixed writing modes in adjacent sections (#4069) | `partial` | S2-R01C | P0-2/P0-3 and reader smoke tests; exact responsive/metric edge is unproved. |
| 135 | `a272ba892` | ai/assist/dictionary | feat(reader): replace dictionary tabs with stacked result cards (#4071) | `partial` | S2-A03 | assistance.ts and readerAssistance tests; exact language/normalization behavior is missing. |
| 136 | `30dee7b90` | ai/assist/dictionary | feat(dict): improve MDict rendering and dictionary management (#4072) | `gap` | S2-A04 | assistance.ts and readerAssistance tests; local dictionary formats are absent. |
| 137 | `2d5590ec1` | library | feat(applock): 4-digit PIN gate at app launch (#4093) | `not-applicable` | — | Optional product surface outside current br1 scope. |
| 138 | `c30a59a9e` | reader core | fix(epub): accept EPUBs with malformed first ZIP local file header (#4103) | `covered` | S2-R04A1 | ZIP routing accepts the stable `PK\x03` prefix and leaves full validation to ZipReader; a corrupted fourth-byte fixture opens while ordinary non-ZIP input remains rejected. |
| 139 | `295a58898` | reader core | feat(share): route annotation exports through the system share sheet (#4107) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 140 | `f6f446e8a` | reader core | feat(applock): blinking PIN cursor + misc UI polish (#4110) | `not-applicable` | — | Optional product surface outside current br1 scope. |
| 141 | `772bb73b4` | reader core | ui/ux: codify design system and migrate settings to shared primitives (#4116) | `not-applicable` | — | Readest implementation refactor, test maintenance, or project docs. |
| 142 | `d326e1c73` | reader core | fix: hide popup triangle when inside popup + EPUB image-only paragraph rendering (#4121) | `covered` | S2-R04A3 | Existing br1 coverage preserves image-only EPUB paragraphs, and foliate now rewrites the observed MOBI6 self-closing non-void tags before HTML parsing. |
| 143 | `598eb7723` | library | feat(library): redesign empty-library onboarding (#4122) | `covered` | S1-R03 | P0-4.1/P0-4.2 and library smoke tests. |
| 144 | `9a05935ca` | reader core | feat(reader): improve Japanese selection UX by disabling furigana selection (#4137) | `partial` | S2-R04C12 | Core reading exists; this authored-layout/script edge is unverified. |
| 145 | `fed8ab7b6` | tts/audio | fix(tts): restore cross-section auto-page-turn during TTS playback (#4148) | `partial` | S2-T03 | tts.ts, ttsRuntime.ts, and TTS tests; extraction/section parity is incomplete. |
| 146 | `54aa20d4f` | reader core | fix(footnote): don't treat in-book numeric chapter/verse links as footnotes (#4152) | `covered` | S2-R04C3 | Numeric candidate checks reject two other numeric anchors within any of three ancestors; small sets still preview, and explicit noterefs keep their stronger classification. |
| 147 | `244b3fd99` | reader core | fix(dev): rewrite HMR WebSocket URL in Tauri mobile dev, closes #4150 (#4160) | `not-applicable` | — | Readest runtime/build metadata with no behavior port. |
| 148 | `708e06a46` | catalog/import | fix(opds): show summary as book description, closes #4156 (#4162) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed fixture is missing. |
| 149 | `7716f189c` | reader core | fix(layout): keep header/footer transparent and fixed in scrolled mode, closes #4157 (#4168) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 150 | `4cd5d56b4` | tts/audio | fix(tts): retry Edge TTS preload up to 3 times on failure, closes #4147 (#4171) | `partial` | S2-T01 | tts.ts, ttsRuntime.ts, and TTS tests; upstream race needs a local regression. |
| 151 | `f5e729a17` | reader core | fix(reader): revert smooth mouse-wheel scrolling in scroll mode, closes #4130 (#4172) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 152 | `787bbf210` | reader core | feat(reader): custom hardware-button page turning (#4177) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 153 | `1a3d393e7` | reader core | feat(reader): add "Clear Annotations" entry to the book menu (#4175) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 154 | `2acd08202` | reader core | fix(a11y): use position absolute for skip-next-section link to prevent blank page (#4182) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 155 | `411d3ad68` | reader core | fix: export annotations even without TOC, closes #4186 (#4188) | `gap` | S2-A02 | P0-2/P0-3 and reader smoke tests; portable exchange/deep links are absent. |
| 156 | `40b7c2c15` | reader core | refactor(reader): harden saveConfig updatedAt refresh (#4189) | `partial` | S2-D01 | Settings persist, but schema migration/version behavior is unproved. |
| 157 | `d2ff47029` | catalog/import | fix(opds): detect XML feeds with leading whitespace, closes #4181 (#4190) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed fixture is missing. |
| 158 | `2d30868d2` | library | fix(fonts): hydrate custom fonts on library page, closes #4178 (#4191) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact library interaction needs a regression. |
| 159 | `8dfc0e945` | ai/assist/dictionary | fix(dictionary): normalize lookup query with trim + case fallback (#4192) | `partial` | S2-A03 | assistance.ts and readerAssistance tests; exact language/normalization behavior is missing. |
| 160 | `f4483643f` | tts/audio | fix(tts): skip hidden footnotes in TTS, closes #4135 (#4193) | `partial` | S2-T03 | tts.ts, ttsRuntime.ts, and TTS tests; extraction/section parity is incomplete. |
| 161 | `ad1c2d6bb` | reader core | fix(reader): filter Magic Mouse wheel events to stop accidental page turns (#4195) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 162 | `3620c6103` | library | feat(reader): import annotations from Moon+ Reader (.mrexpt) (#4174) | `gap` | S2-A02 | P0-2/P0-3 and reader smoke tests; portable exchange/deep links are absent. |
| 163 | `ba6e5899e` | reading modes/controls | feat(reader): RSVP CJK character mode and whole-word highlight (#4199) | `partial` | S2-F03 | readingMode.ts and focused-reading e2e; RSVP-lite lacks this complete control. |
| 164 | `1d4b7eed8` | reader core | fix(txt): merge scene-break sections into the preceding chapter (#4063) (#4207) | `partial` | S2-T03 | TXT scene-break behavior is covered by S2-R04B. Nested foliate 3c597a6dc TTS rejected-block filtering remains an extraction obligation. |
| 165 | `0fba5b705` | reader core | feat(config): version book config schema (#4208) | `partial` | S2-D01 | Settings persist, but schema migration/version behavior is unproved. |
| 166 | `52f963481` | reader core | feat(backup): include global settings in backup zip (#4211) | `gap` | S2-L04 | No complete versioned backup/restore workflow. |
| 167 | `28a7785e5` | reader core | test(e2e): add a Playwright web e2e lane (reading & annotation flows) (#4214) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 168 | `d35d2002c` | security | chore(security): add Scorecard workflow for supply-chain security (#4221) | `not-applicable` | — | Readest build, dependency, CI, or distribution detail. |
| 169 | `d25c41ee8` | security | chore(security): address code scanning findings (#4224) | `not-applicable` | — | No portable user-visible behavior remains. |
| 170 | `0b18de058` | catalog/import | feat(send): Send to Readest — multi-channel capture into your library (#4230) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 171 | `a30efe49c` | catalog/import | fix(send): make recent-activity status labels translatable (#4236) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 172 | `d943a1c14` | library | fix(library): clear nested-folder groups when deleting from bookshelf (#4226) | `gap` | S2-L01 | P0-4.1/P0-4.2 and library smoke tests; bounded directory import is absent. |
| 173 | `ff4c03919` | reader core | refactor(alert): stack title above actions row to fix narrow-width layout (#4239) | `partial` | S2-R01C | P0-2/P0-3 and reader smoke tests; exact responsive/metric edge is unproved. |
| 174 | `ded64159b` | catalog/import | fix(send): library-clobber + perf: lazy-load conversion deps (#4238) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 175 | `5ac8564e4` | library | feat(library): add Import from Folder dialog with format/size filters (#4229) | `gap` | S2-L01 | P0-4.1/P0-4.2 and library smoke tests; bounded directory import is absent. |
| 176 | `17749f7cc` | catalog/import | feat(send): mobile URL clipping via native-bridge plugin (#4252) | `not-applicable` | — | Mobile/device-only behavior is outside the desktop target. |
| 177 | `ae81cd015` | reader core | feat(annotator): support global highlights that fan out across all matching positions (#4257) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 178 | `f6dfd09d8` | catalog/import | feat(send): browser extension that clips pages into Readest as EPUBs (#4266) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 179 | `60203a8dc` | reader core | docs: add architecture and code-layout guides (#4265) | `not-applicable` | — | Readest implementation refactor, test maintenance, or project docs. |
| 180 | `81bd5ee6b` | catalog/import | fix(send): address extension review findings (#4271) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 181 | `f4de55e8f` | catalog/import | feat(send): twitter/x site rule + meta-tag fallback for stale rules (#4270) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 182 | `8a19c686c` | security | ci: address code scanning scorecard alerts (#4275) | `partial` | S2-R05 | P0-2/P0-3 and reader smoke tests; exact responsive/interaction state is unverified. |
| 183 | `b78daed56` | catalog/import | feat(send): gate email-in to Plus, Pro, and Lifetime plans (#4280) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 184 | `49b171f5e` | reader core | fix(reader): restore right-column clicks and selection in dual-page mode (#4283) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 185 | `336a719e0` | library | fix(library): seed custom texture store at boot so saved texture renders on first paint (#4284) | `partial` | S2-L05 | P0-4.1/P0-4.2 and library smoke tests; exact persistence/recovery case is unproved. |
| 186 | `6bc4a96b9` | reader core | feat(reedy): Phase 1B — wire Reedy into the chat, settings, and Sources UI (#4296) | `gap` | S2-A06 | Notebook structure exists, but no live model conversation runtime. |
| 187 | `5c71ccb90` | reader core | feat(reedy): Appendix A · Phase 2.4 — built-in tools (non-memory families) (#4299) | `gap` | S2-A06 | Notebook structure exists, but no live model conversation runtime. |
| 188 | `a86b09dba` | reader core | feat(reedy): Appendix A · Phase 2.5 — PromptContextBuilder + layers + tokenBudget (#4300) | `gap` | S2-A06 | Notebook structure exists, but no live model conversation runtime. |
| 189 | `e0ce6c8c2` | reader core | feat(reedy): Appendix A · Phase 4 — custom thread UI on AgentRuntime (#4308) | `gap` | S2-A06 | Notebook structure exists, but no live model conversation runtime. |
| 190 | `4c539e6be` | catalog/import | fix(opds): show 'Open & Read' for publications already in the library (#4313) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed fixture is missing. |
| 191 | `5a092f16f` | security | feat(ios): folder import with security-scoped bookmark persistence (#4314) | `not-applicable` | — | Mobile/device-only behavior is outside the desktop target. |
| 192 | `ff605e000` | library | feat(library): in-place import from registered external folders (#4315) | `gap` | S2-L01 | P0-4.1/P0-4.2 and library smoke tests; bounded directory import is absent. |
| 193 | `1f5481c0e` | tts/audio | fix(fxl): align TTS highlight overlay with scaled iframe coords (#4324) | `gap` | S2-T02 | tts.ts, ttsRuntime.ts, and TTS tests; spoken-range highlighting is absent. |
| 194 | `315d144d8` | library | fix(library): suppress loading-dots flicker on reader→library return (#4325) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact interaction/layout state is unproved. |
| 195 | `cf44e8518` | reader core | fix(reader): fit duokan-page-fullscreen cover image without cropping (#4328) | `partial` | S2-R04C18 | br1 recognizes the Duokan fullscreen marker, but its exact contain/letterbox behavior is unproved. |
| 196 | `a1cb228d0` | library | fix(library): wrap select-mode action bar on small screens (#4329) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact interaction/layout state is unproved. |
| 197 | `4e01e13ee` | library | fix(library): make bookitem-main shrink to match cover in fit mode (#4331) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact interaction/layout state is unproved. |
| 198 | `93abca896` | ai/assist/dictionary | feat(dict): faster MDict/StarDict import + lazy lookup; raw .dict; UX (#4334) | `gap` | S2-A04 | assistance.ts and readerAssistance tests; local dictionary formats are absent. |
| 199 | `648c35b33` | reader core | feat(reader): add disableSwipe option to disable swipe-to-paginate (#4335) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 200 | `48d52ea89` | ai/assist/dictionary | feat(telemetry): opt-out by default for new users; consent prompt for 10% (#4340) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 201 | `3c134380b` | library | feat: add empty state hints and loading indicators for annotations, bookmarks, notes, font import, and Moon+ Reader import (#4338) | `gap` | S2-A02 | P0-2/P0-3 and reader smoke tests; portable exchange/deep links are absent. |
| 202 | `ce0ab5cc6` | library | feat(library): add secondary "Then by" sort with smart defaults (#4347) | `partial` | S2-L06 | P0-4.1/P0-4.2 and library smoke tests; exact projection/order is missing. |
| 203 | `3c14d5a4b` | reader core | fix(reader): scrolled-mode prev-section preloading and nav drift (#4112) (#4349) | `partial` | S2-R02 | P0-2/P0-3 and reader smoke tests; exact navigation behavior lacks proof. |
| 204 | `2f5e58365` | library | feat(annotations): configurable export link type + dedicated Import Annotations modal (#4350) | `gap` | S2-A02 | P0-2/P0-3 and reader smoke tests; portable exchange/deep links are absent. |
| 205 | `c5a1a3afe` | catalog/import | feat(opds): add facet navigation and quick catalog registration in header (#4348) | `gap` | S2-O04 | catalogs.rs and catalog tests; advanced protocol/navigation is absent. |
| 206 | `6405ba31c` | reader core | fix(reader): keep TOC scrolled to the current chapter on refresh (#4353) | `partial` | S2-R02 | P0-2/P0-3 and reader smoke tests; exact navigation behavior lacks proof. |
| 207 | `a848c142c` | reader core | test(reader): de-flake scrolled-mode backward-preload precondition (#4112) (#4354) | `partial` | S2-R01B | P0-2/P0-3 and reader smoke tests; exact paginator boundary is unproved. |
| 208 | `7bdd3ecde` | reader core | perf(sidebar): virtualize BooknoteView and memoize derivations (#4352) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 209 | `89723b421` | reading modes/controls | test(rsvp): stop RSVPController tests leaking real timers into teardown (#4355) | `partial` | S2-F03 | readingMode.ts and focused-reading e2e; RSVP-lite lacks this complete control. |
| 210 | `36e11de33` | reader core | feat(reader): swipe-to-adjust brightness gesture on mobile (#3021) (#4356) | `not-applicable` | — | Mobile/device-only behavior is outside the desktop target. |
| 211 | `789d03122` | reading modes/controls | feat(reader): line-aware reading ruler (#4358) | `partial` | S2-F04 | Focused reading exists; a line-aware ruler is not implemented. |
| 212 | `bed31e818` | library | feat(library): add Manage Cache to advanced settings (#4359) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact library interaction needs a regression. |
| 213 | `f1ae05076` | reader core | fix(ui): refine reader side panels and their empty states (#4361) | `partial` | S2-R05 | P0-2/P0-3 and reader smoke tests; exact responsive/interaction state is unverified. |
| 214 | `6605ae824` | ai/assist/dictionary | feat(dictionary): import companion MDD files that share the MDX prefix (#4363) | `gap` | S2-A04 | assistance.ts and readerAssistance tests; local dictionary formats are absent. |
| 215 | `aa318904b` | reader core | fix(reader): show full bookmark ribbon in scrolled mode header (#4365) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 216 | `11666be5e` | reader core | fix(reader): collapse TOC to the current chapter's path by default (#4366) | `partial` | S2-R02 | P0-2/P0-3 and reader smoke tests; exact navigation behavior lacks proof. |
| 217 | `ef603852b` | tts/audio | feat(tts): hotkey to highlight the currently-spoken sentence (#4085) (#4368) | `gap` | S2-T02 | tts.ts, ttsRuntime.ts, and TTS tests; spoken-range highlighting is absent. |
| 218 | `de3e4b6d3` | library | fix(reader): show Duokan fullscreen cover in scrolled mode (#4379) (#4381) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 219 | `9b4db4449` | reader core | fix(pdf): ship jbig2.wasm so scanned PDFs render in packaged builds (#4382) | `covered` | S2-R03C | Production builds refresh the complete PDF.js WASM directory; an actual debug macOS app bundle opens a JBIG2 fixture and renders non-white canvas pixels. |
| 220 | `e8675fb7e` | reader core | fix(reader): inline custom @font-face rules in iframe stylesheet (#4383) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 221 | `97191a57c` | reading modes/controls | fix(reader): stop reading ruler creeping down on scroll (#4386) (#4388) | `partial` | S2-F04 | Focused reading exists; ruler scroll anchoring remains unimplemented. |
| 222 | `45ef5f751` | reader core | fix(metainfo): declare desktop and mobile device support (#4395) | `not-applicable` | — | Readest runtime/build metadata with no behavior port. |
| 223 | `bc9fe67ab` | security | fix(desktop): sanitize invalid .window-state.json before restore (#4401) | `not-applicable` | — | br1 neither installs a window-state plugin nor persists/restores native window geometry; its main and reader windows start from static configuration or explicit fresh geometry. |
| 224 | `458ad7510` | reader core | fix(reader): scroll wide EPUB tables horizontally (#4391) | `gap` | S2-R04C19 | Wide authored tables still need a fixture proving horizontal access without accidental pagination. |
| 225 | `176b950c9` | reader core | fix(reader): replace light callout backgrounds in dark mode (#4392) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 226 | `3a81e0991` | reader core | fix(reader): scroll oversized blocks in-place instead of turning the page (#4400) (#4415) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 227 | `fe7fe2548` | reader core | fix(reader): show background texture in paginated mode (#4399) (#4417) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 228 | `4abbc0254` | reading modes/controls | fix(reader): stop footer progress info painting a stray focus ring (#4397) (#4418) | `partial` | S2-R05 | P0-2/P0-3 and reader smoke tests; exact chrome interaction/layout is unproved. |
| 229 | `fe853554a` | catalog/import | feat(library): send book file from bookshelf selection popup (#4402) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 230 | `f9ddddb6a` | library | fix(library): use ghost cancel buttons in migrate-data dialog for e-ink (#4396) (#4422) | `partial` | S2-L05 | P0-4.1/P0-4.2 and library smoke tests; exact persistence/recovery case is unproved. |
| 231 | `963bab0f0` | library | fix(library): stop bookshelf context menu shuffling its order (#4389) (#4421) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact interaction/layout state is unproved. |
| 232 | `e4bb9fc4b` | reader core | refactor(share): make saveFile content nullable for path-based shares (#4424) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 233 | `9d8062ae2` | reader core | fix(reader): keep table background matching the page in dark mode (#4419) (#4426) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 234 | `578b7ba14` | reader core | fix(reader): restore annotation list auto-scroll to the nearest item (#4428) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 235 | `c2bbb6119` | reader core | fix(reader): keep paginated page background inside its column (#4394) (#4429) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 236 | `4d1205fdf` | reader core | fix(reader): stop zoomed image pan from flickering on desktop, closes #4451 (#4465) | `partial` | S2-R09 | P0-2/P0-3 and reader smoke tests; exact media-viewer behavior is incomplete. |
| 237 | `1eaf16ffc` | catalog/import | fix(opds): tolerate junk after document element in feeds (#4479) (#4506) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 238 | `676e14234` | reader core | fix(reader): correct RTL reading position restore on book reopen (#4505) | `partial` | S2-R04C10 | Core reading exists; this authored-layout/script edge is unverified. |
| 239 | `ad23fbba9` | reader core | fix(reader): dismiss annotation popup when selection clears (#4483) | `partial` | S2-A01B | P0-2/P0-3 and reader smoke tests; this selection/popup edge is unproved. |
| 240 | `8425d0b91` | catalog/import | fix(opds): render HTML in publication descriptions (#4510) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed fixture is missing. |
| 241 | `d12e1ad08` | catalog/import | fix(opds): enable search for OPDS 2.0 JSON catalogs, closes #4502 (#4509) | `gap` | S2-O04 | catalogs.rs and catalog tests; advanced protocol/navigation is absent. |
| 242 | `88d8aa285` | library | feat(metadata): show file path for in-place imported books (#4508) | `partial` | S2-L03 | P0-4.1/P0-4.2 and library smoke tests; exact metadata/provenance is missing. |
| 243 | `7e5c74f5e` | catalog/import | chore(memory): record OPDS HTML description and JSON search notes (#4516) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 244 | `11d796361` | library | perf(import+open): native Rust EPUB/MOBI parser, OPF prefetch, parallel TOC enrichment (#4369) | `not-applicable` | — | br1 opens these formats directly through foliate; duplicating that parser in Rust would add a second source of truth without a measured need. |
| 245 | `607e646bc` | security | chore(deps): bump shell-quote to 1.8.4 and qs to 6.15.2 for security (#4523) | `not-applicable` | — | No portable user-visible behavior remains. |
| 246 | `2ade76995` | reader core | feat(toc): show current reading page under the active item (#4513) (#4525) | `partial` | S2-R02 | P0-2/P0-3 and reader smoke tests; exact navigation behavior lacks proof. |
| 247 | `31176e5d4` | reader core | fix(paginator): bump foliate-js submodule for scrollBounds guard (#4526) | `partial` | S2-R01B | P0-2/P0-3 and reader smoke tests; exact paginator boundary is unproved. |
| 248 | `1e26c5d76` | catalog/import | fix(nav): bound section-scan concurrency to keep zip.js writers from ERRORED-ing (#4528) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 249 | `d165e8df2` | reader core | fix(reader): turn automatically when highlighting across pages (#4487) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 250 | `6dc42222e` | reader core | fix(reader): keep double-click-and-drag from turning the page (#4524) (#4536) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 251 | `cf41e7d50` | reading modes/controls | feat(rsvp): apply reader font face/family settings to the RSVP word (#4519) (#4537) | `partial` | S2-F03 | readingMode.ts and focused-reading e2e; RSVP-lite lacks this complete control. |
| 252 | `64350ca63` | reader core | fix(reader): keep scrolled-mode scrollbar visible after opening a book (#4470) (#4538) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 253 | `755bee1ee` | reader core | fix(reader): prevent accidental paragraph-mode exit and center its bar (#4474) (#4539) | `partial` | S2-F05 | Paragraph focus exists; exit arbitration and bar placement need focused proof. |
| 254 | `d6e981e56` | reader core | fix(reader): hide footnote aside border again when custom fonts are loaded (#4438) (#4540) | `not-applicable` | S2-R04C4 | br1 assembles neither custom font faces nor namespace-dependent aside selectors. The exact ordering regression is absent; source-aside hiding remains unsupported and tracked separately in TODOS.md. |
| 255 | `390c71107` | ai/assist/dictionary | feat(rsvp): configurable start delay, word stepping, context dictionary lookup, and keyboard shortcut (#4541) | `partial` | S2-A03 | assistance.ts and readerAssistance tests; exact language/normalization behavior is missing. |
| 256 | `ceddee379` | library | feat(library): search a book on Goodreads from the library and reader (#4543) (#4548) | `not-applicable` | — | Unadopted external/transfer surface or Readest implementation optimization. |
| 257 | `9dc41e7ad` | reader core | feat(reader): reference page numbers from EPUB page-list with manual page count fallback (#4549) | `partial` | S2-R04C20 | foliate exposes EPUB page-list data, but br1 lacks focused proof for labels and the missing-page-list fallback. |
| 258 | `5cab1fa94` | reader core | feat(css): override document layout also apply to hyphenation, closes #4529 (#4546) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 259 | `da6f45f69` | reader core | ci: single, workspace-aware rust-cache for build_tauri_app (#4550) | `not-applicable` | — | Readest build, dependency, CI, or distribution detail. |
| 260 | `12ac7ae6c` | reader core | fix(reader): draw annotation highlights over bullet lists (#4552) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 261 | `1ce79d9ab` | reader core | perf(reader): reduce open-book TBT by batching layout-thrashing reads/writes and deferring annotation page back-fill (#4554) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 262 | `1c392de0f` | library | perf(reader): throttle library.json writes and cache known dirs to cut IPC (#4556) | `partial` | S2-L05 | P0-4.1/P0-4.2 and library smoke tests; exact persistence/recovery case is unproved. |
| 263 | `59d4f0aa3` | reader core | perf(reader): split progress into its own store to cut React commit storm (#4557) | `not-applicable` | — | Unadopted external/transfer surface or Readest implementation optimization. |
| 264 | `ee01fcd12` | reader core | fix(reader): texture the scrolled-mode top inset mask, closes #4486 (#4563) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 265 | `7cba22ab3` | reader core | perf(reader): coalesce relocate events and memoize BookCell to stop per-swipe storm (#4562) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 266 | `7f57af8f9` | reader core | perf(cfi): bucket booknotes per chapter and batch-collapse location matcher (#4561) | `partial` | S2-A01A | P0-2/P0-3 and reader smoke tests; this anchor/grouping edge is unproved. |
| 267 | `852d0ae3e` | reader core | fix(reader): keep dark-mode page body transparent so the bg texture shows, closes #4446 (#4564) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 268 | `c72afe269` | tts/audio | fix(tts): keep voice list stable across region variants of a language, closes #4033 (#4565) | `partial` | S2-T04A | tts.ts, ttsRuntime.ts, and TTS tests; voice/timing parity is incomplete. |
| 269 | `a56cc6c61` | tts/audio | feat(tts): word-by-word highlighting for Edge TTS, closes #4017 (#4566) | `gap` | S2-T02 | tts.ts, ttsRuntime.ts, and TTS tests; spoken-range highlighting is absent. |
| 270 | `b6937f43f` | tts/audio | chore(agent): stage memories (#4569) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 271 | `67c22c770` | reader core | feat(reader): Share intent + customizable annotation toolbar (#4014) (#4570) | `partial` | S2-A01B | P0-2/P0-3 and reader smoke tests; this selection/popup edge is unproved. |
| 272 | `4b0bbc77b` | reader core | fix(reader): open TXT files shared via "Open with" (#4571) | `not-applicable` | — | Android raw-TXT-to-EPUB fallback is outside the desktop scope; br1 already routes supported TXT files to its native plain-text surface. No Android delivery claim. |
| 273 | `5a8f0873f` | library | fix(library): refresh book cover after editing metadata (#4572) | `partial` | S2-L03 | P0-4.1/P0-4.2 and library smoke tests; exact metadata/provenance is missing. |
| 274 | `cc618b873` | tts/audio | test(tts): add browser e2e for auto-advance across a chapter boundary (#4573) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 275 | `0f0b4279a` | reader core | perf(reader): memoize global-annotation fan-out per section (#4575) (#4579) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 276 | `aab721b21` | ai/assist/dictionary | feat(dictionary): lemmatize inflected words before lookup (#4574) (#4582) | `partial` | S2-A03 | assistance.ts and readerAssistance tests; exact language/normalization behavior is missing. |
| 277 | `b76e3a371` | reader core | fix(nightly): publish latest.json via directory rclone copy (#4588) | `not-applicable` | — | Readest build, dependency, CI, or distribution detail. |
| 278 | `51fede1a0` | tts/audio | fix(rsvp): keep the audio toggle from overlapping transport on mobile (#4585) | `not-applicable` | — | Mobile/device-only behavior is outside the desktop target. |
| 279 | `490824504` | reader core | feat(reader): Word Wise inline vocabulary hints (#4589) | `gap` | S2-A07 | No equivalent AI transformation/proofreading action. |
| 280 | `79496f88d` | reader core | feat(settings): move update & telemetry controls into Settings → Behavior (#4592) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 281 | `675ee78bc` | library | perf(library): in-place re-import is a no-op on the same file path (#4597) | `partial` | S2-L03 | P0-4.1/P0-4.2 and library smoke tests; exact metadata/provenance is missing. |
| 282 | `e145eb835` | reader core | feat(reader): open image gallery & table zoom on single tap (#4600) | `partial` | S2-R09 | P0-2/P0-3 and reader smoke tests; exact media-viewer behavior is incomplete. |
| 283 | `f950685f2` | tts/audio | chore(agent): update agent memories (#4610) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 284 | `a30a310a1` | catalog/import | fix(opds): handle entries with no downloadable format (#4599) (#4611) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 285 | `757ed8066` | library | feat(library): show series and number in list view (#4593) (#4612) | `partial` | S2-L03 | P0-4.1/P0-4.2 and library smoke tests; exact metadata/provenance is missing. |
| 286 | `d202d7a61` | library | feat(library): add Clear Pending action to transfer queue (#4617) | `not-applicable` | — | Unadopted external/transfer surface or Readest implementation optimization. |
| 287 | `d6e59cedd` | security | chore(deps): bump esbuild to 0.28.1 and vitest to 4.1.x for security advisories (#4618) | `not-applicable` | — | Readest build, dependency, CI, or distribution detail. |
| 288 | `f6fbbf59f` | security | chore(deps): bump transitive deps for security advisories (batch) (#4620) | `not-applicable` | — | Readest build, dependency, CI, or distribution detail. |
| 289 | `5e217544f` | security | chore(config): add disableIncrementalCache to skip populating remote R2 incremental cache (#4623) | `not-applicable` | — | No portable user-visible behavior remains. |
| 290 | `d5c02e625` | library | feat(library): add Purge Data and fold detail actions into a More menu (#4615) (#4626) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact library interaction needs a regression. |
| 291 | `fa120081a` | library | fix(library): never let a routine save shrink library.json (cold-start "Open with" wipe) (#4627) | `partial` | S2-L05 | P0-4.1/P0-4.2 and library smoke tests; exact persistence/recovery case is unproved. |
| 292 | `5e5564ef3` | reader core | fix(search): show context for matches in italicized text (#4594) (#4631) | `partial` | S2-R06 | P0-2/P0-3 and reader smoke tests; exact search behavior is incomplete. |
| 293 | `c2ac20794` | ai/assist/dictionary | refactor(wordlens): rename "Word Wise" to "Word Lens" (#4633) | `not-applicable` | — | Word Lens implementation maintenance without portable behavior. |
| 294 | `8bcb9f9b2` | ai/assist/dictionary | feat(wordlens): trim hints to first sense + suppress known derivations (#4635) | `gap` | S2-A07 | No equivalent AI transformation/proofreading action. |
| 295 | `1ea607829` | library | fix(share): load cover under COEP, keep share links out of the clipper, fix in-app import (#4636) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 296 | `495783d04` | security | fix(security): harden OPDS proxy SSRF, storage key validation, Stripe check (#4638) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 297 | `4025c4d7b` | security | fix(security): scope Tauri download_file/upload_file to fs_scope (#4639) | `not-applicable` | — | br1 exposes no generic renderer-directed download/upload command or arbitrary filesystem destination. |
| 298 | `403be32d5` | library | fix(epub): import books whose OPF has an unescaped ampersand (#4640) | `covered` | S2-R04A2 | foliate escapes stray bare ampersands while preserving valid named and numeric XML entities; a real EPUB fixture proves metadata and chapter loading. |
| 299 | `bcd9ed724` | reader core | fix(reader): paginate inline-block-wrapped chapters instead of clipping them (#4641) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 300 | `6626db967` | reader core | fix(reader): keep last paragraph's line spacing by making the section skip link a <span> (#4642) | `not-applicable` | — | br1 has no injected section skip-link element, so this Readest-specific last-div layout regression has no local owner. |
| 301 | `ff96c6d3f` | reader core | feat(annotations): unify highlights and annotations into one record (#3870, #4511) (#4647) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 302 | `be17654fc` | reading modes/controls | fix(rsvp): render RTL words whole so Arabic shapes correctly (#4630) (#4648) | `partial` | S2-F03 | readingMode.ts and focused-reading e2e; RSVP-lite lacks this complete control. |
| 303 | `af587b1a4` | library | fix(metadata): parse FB2 series from title-info sequence (#4646) (#4649) | `partial` | S2-L03 | P0-4.1/P0-4.2 and library smoke tests; exact metadata/provenance is missing. |
| 304 | `446c2c72d` | security | fix(security): unblock app-dir downloads broken by transfer_file fs-scope guard (#4651) | `not-applicable` | — | br1 has no transfer-file fs-scope fallback; app storage is resolved from `AppHandle.path()` and external files come from native dialogs or trusted records. |
| 305 | `be5862f08` | library | fix(library): group secondary series sort by series name then index (#4652) (#4653) | `partial` | S2-L03 | P0-4.1/P0-4.2 and library smoke tests; exact metadata/provenance is missing. |
| 306 | `e00a1e4f0` | reader core | fix(settings): tidy Word Lens data pack and level rows on mobile (#4655) | `not-applicable` | — | Mobile/device-only behavior is outside the desktop target. |
| 307 | `e327d0c99` | tts/audio | feat(tts): reuse the speaking session across paragraph & RSVP modes (#4657) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 308 | `1faa931a0` | library | fix(txt): stop detecting measure-word prose as chapters in TXT import (#4658) (#4660) | `covered` | S2-R04B | Chapter units accept attached titles; volume/measure units require a separator. Regression cases keep measure-word and date prose out of TOC. |
| 309 | `4cb608be2` | catalog/import | chore(send-to-readest): v0.2.1, zip packaging script, store submission doc (#4661) | `not-applicable` | — | Readest build, dependency, CI, or distribution detail. |
| 310 | `6caa376f8` | reader core | feat(reader): Webtoon Mode seamless continuous scroll for image books (#3647) (#4662) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 311 | `b7585ac46` | catalog/import | chore(send-to-readest): add Chrome Web Store screenshot generator (#4664) | `not-applicable` | — | Readest build, dependency, CI, or distribution detail. |
| 312 | `dd53e5245` | reader core | chore: only show the current position item in TOC and update agent memories (#4665) | `partial` | S2-R02 | P0-2/P0-3 and reader smoke tests; exact navigation behavior lacks proof. |
| 313 | `d5c640996` | catalog/import | fix(opds): show Add Catalog dialog above Settings on mobile (#4669) | `not-applicable` | — | Mobile/device-only behavior is outside the desktop target. |
| 314 | `23d1ef6f1` | reading modes/controls | fix(rsvp): restore in-flow control bar layout reverted by #4589 (#4671) | `partial` | S2-F03 | readingMode.ts and focused-reading e2e; RSVP-lite lacks this complete control. |
| 315 | `b9a3ee725` | catalog/import | fix(opds): make saved catalog card hover distinct from dialog background (#4673) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 316 | `0ab8f6042` | library | fix(reader): keep cover background-image visible under a texture (#4675) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 317 | `a9526377a` | reader core | fix(reader): stretch Duokan fullscreen cover to fill the page (#4679) | `partial` | S2-R04C18 | This superseded Duokan cover decision belongs with authored-layout compatibility, not library behavior. |
| 318 | `7185dca1a` | reader core | feat(reader): add save/share button to image gallery toolbar (#4680) | `partial` | S2-R09 | P0-2/P0-3 and reader smoke tests; exact media-viewer behavior is incomplete. |
| 319 | `353d38142` | security | fix(deps): bump undici and dompurify overrides for security advisories (#4684) | `not-applicable` | — | Readest build, dependency, CI, or distribution detail. |
| 320 | `2153f7cc0` | reader core | fix(reader): reset scroll to top on paginated fit-width page turn (#4683) (#4695) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 321 | `ab935f851` | library | fix(library): preserve original files when deleting "read in place" books (#4696) | `partial` | S2-L05 | P0-4.1/P0-4.2 and library smoke tests; exact persistence/recovery case is unproved. |
| 322 | `799fc0e0a` | library | feat(library): add opt-in "purge reading data" toggle to delete confirm (#4698) (#4705) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact library interaction needs a regression. |
| 323 | `c781aedda` | reader core | feat(reader): add sticky progress bar with chapter ticks (#4707) | `partial` | S2-R01C | P0-2/P0-3 and reader smoke tests; exact responsive/metric edge is unproved. |
| 324 | `15f183878` | tts/audio | chore(agent): update agent memories (#4709) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 325 | `a9c0f3d46` | reader core | fix(reader): remove 1px white seam in PDF spread at fractional DPI (#4587) (#4713) | `covered` | S2-R03B3 | The nested foliate-js change `981298cf4..24d9a0c0e` is matched by explicit untruncated canvas CSS dimensions, with a repeated DPR 1.5 real-PDF spread regression. |
| 326 | `b87c735c1` | tts/audio | fix(tts): keep native System TTS reading past unspeakable chunks offline (#4613, #4408) (#4716) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 327 | `a6d28ffcd` | ai/assist/dictionary | fix(reader): add Alt+P proofread shortcut and let Shift+P exit paragraph mode (#4717) (#4723) | `gap` | S2-A07 | No equivalent AI transformation/proofreading action. |
| 328 | `f4bb11126` | ai/assist/dictionary | feat(translator): add Urdu as a Translate Text target language (#4721) (#4726) | `partial` | S2-A05 | assistance.ts and readerAssistance tests; exact provider/layout/error behavior is incomplete. |
| 329 | `942095bcd` | reader core | fix(reader): make Shift+P toggle, exit, and resume paragraph mode reliably (#4717) (#4725) | `partial` | S2-F05 | Basic keyboard launch and hidden resume pass; complete toggle/exit interaction remains unproved. |
| 330 | `acf2b165f` | library | fix(library): keep in-place book paths absolute so uploads stay in fs scope (#4720) (#4730) | `partial` | S2-L05 | P0-4.1/P0-4.2 and library smoke tests; exact persistence/recovery case is unproved. |
| 331 | `1b44b95d3` | reader core | fix(reader): smooth single-notch wheel scroll over PDF pages in scrolled mode (#4727) (#4732) | `covered` | S2-R03B4 | The nested foliate-js change `24d9a0c0e..e366bdb79` is matched by removing the redundant iframe-to-host `scrollBy`, with a repeated real-PDF browser regression. |
| 332 | `140b71ee3` | ai/assist/dictionary | feat(dictionary): add adjustable dictionary popup font size (#4443) (#4734) | `partial` | S2-A03 | assistance.ts and readerAssistance tests; exact language/normalization behavior is missing. |
| 333 | `bc9b8b23e` | reader core | fix(reader): stop per-chapter listener leak that degrades paragraph mode (#4735) | `partial` | S2-F05 | Paragraph focus exists; repeated chapter attachment lacks a listener-lifecycle regression. |
| 334 | `787641b5b` | tts/audio | chore(agent): update agent memories (#4737) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 335 | `e982af172` | reader core | feat(reader): adjust text selection with Shift/Ctrl/Opt+Arrow keys (#4728) (#4738) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 336 | `428168ac9` | reader core | fix(reader): show the centred section's chapter title in scrolled mode (#4739) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 337 | `b1346bf16` | ai/assist/dictionary | feat(wordlens): en-en glosses, styling, derivation lemmas, display-time cap (#4744) | `gap` | S2-A07 | No equivalent AI transformation/proofreading action. |
| 338 | `acd4a67dc` | reader core | fix(reader): require a still-hold before instant-highlight on touch (#4745) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 339 | `6301c620a` | library | fix(library): import books opened via "Open with" by default on mobile (#4746) (#4747) | `not-applicable` | — | Mobile/device-only behavior is outside the desktop target. |
| 340 | `8810aa6db` | reader core | fix(reader): stop trackpad pinch-zoom flicker on image viewer (#4742) (#4748) | `partial` | S2-R09 | P0-2/P0-3 and reader smoke tests; exact media-viewer behavior is incomplete. |
| 341 | `e2f65278e` | catalog/import | fix(opds): dereference publication self link for full metadata (#4749) (#4753) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 342 | `7d1a60b9e` | library | feat(library): separate background texture for library and reader (#4754) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact library interaction needs a regression. |
| 343 | `ac6249cbc` | catalog/import | feat(opds): show groups as horizontal carousels when 2+ groups (#4750) (#4755) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 344 | `7da5f8321` | reader core | fix(reader): make annotation toolbar customization apply to all books (#4760) | `partial` | S2-A01B | P0-2/P0-3 and reader smoke tests; this selection/popup edge is unproved. |
| 345 | `005aa2d61` | security | fix(security): iframe srcdoc atrribute can lead to arbitrary code execution (#4762) | `covered` | S2-S01 | The shared Foliate transform guard removes executable elements, `srcdoc`, event handlers, and unsafe URIs before iframe loading. |
| 346 | `f7124cbee` | reader core | fix(css): multiply mix blend for images in dark override color mode (#4763) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 347 | `163487b5e` | reader core | feat(reader): add regex and nearby-words search modes (#4560) (#4764) | `partial` | S2-R06 | P0-2/P0-3 and reader smoke tests; exact search behavior is incomplete. |
| 348 | `d963b911c` | reader core | fix(reader): zoom linked images on single tap (#4757) (#4766) | `partial` | S2-R09 | P0-2/P0-3 and reader smoke tests; exact media-viewer behavior is incomplete. |
| 349 | `44a6900da` | reader core | feat(reader): extend selections and highlights across pages (#4741) (#4767) | `partial` | S2-A01B | P0-2/P0-3 and reader smoke tests; this selection/popup edge is unproved. |
| 350 | `0589cb4f4` | reader core | fix(reader): stop a quick-deleted highlight from being re-drawn (#4773) (#4779) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 351 | `fb943987e` | catalog/import | fix(opds): hide popular catalog after adding it to My Catalogs (#4782) (#4787) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 352 | `370a51662` | reader core | feat(reader): glue non-breaking spaces after short Russian words (#4769) (#4798) | `covered` | S2-R04C2 | The guarded prose walker applies the exact Russian short/function-word NBSP rule using book metadata; literal nodes and decoded UTF-16 offsets stay intact. XHTML emits numeric NBSP entities. No foliate gitlink change. |
| 353 | `0b4993407` | reader core | feat(reader): add contrast option to PDF/CBZ view menu (#4800) | `partial` | S2-U01A | Theme controls exist, but PDF/CBZ contrast adjustment, reset, and persistence are not implemented. |
| 354 | `4ba78490a` | library | fix(library): prevent series and description overlap in list view (#4796) (#4799) | `partial` | S2-L03 | P0-4.1/P0-4.2 and library smoke tests; exact metadata/provenance is missing. |
| 355 | `7544835fb` | catalog/import | chore(agent): update agent memories (#4802) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 356 | `01a54238a` | reader core | fix(annotator): clean up empty highlight on annotation cancel (#4791) (#4804) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 357 | `dced42912` | reader core | feat(reader): filter exported annotations by color and style (#4801) (#4806) | `gap` | S2-A02 | P0-2/P0-3 and reader smoke tests; portable exchange/deep links are absent. |
| 358 | `4874eb9ae` | tts/audio | feat(reader): add TTS highlight granularity setting (word or sentence) (#4807) | `gap` | S2-T02 | tts.ts, ttsRuntime.ts, and TTS tests; spoken-range highlighting is absent. |
| 359 | `97868f048` | reader core | fix(reader): keep negative table margins from clipping wrapped layout tables (#4439) (#4808) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 360 | `a0227f98e` | reader core | perf(reader): stop per-frame background reflow on swipe page turns (#4785) (#4814) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 361 | `580c5e5de` | reader core | fix(reader): eliminate PDF scrolled-mode rendering lag on mobile (#4795) (#4813) | `not-applicable` | — | Mobile/device-only behavior is outside the desktop target. |
| 362 | `24370ca51` | reader core | feat(reader): render Markdown (.md) files at runtime (#774) (#4816) | `gap` | S2-M01 | Markdown is absent from the managed format list. |
| 363 | `348c85f64` | reader core | fix(reader): cap auto page-turn corner zone size (#4812) (#4820) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 364 | `f8916e128` | reader core | fix(reader): smooth pinch-zoom and pan for scrolled-mode PDF (#4817) | `covered` | S2-R03B5 | The nested foliate-js changes `6f1a19018..0fa407c4c` are matched by live centered pinch, anchored commit, horizontal overflow, idle iframe interaction, and a br1 touch bridge, with a repeated real-PDF regression. |
| 365 | `324bb8a36` | reader core | feat(reader): add e-ink screen refresh page-turner action (#4687) (#4822) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 366 | `4d08b01b4` | library | feat(library): add recently read shelf to the library (#3797) (#4829) | `partial` | S2-L06 | P0-4.1/P0-4.2 and library smoke tests; exact projection/order is missing. |
| 367 | `69599e2bc` | reader core | fix(reader): render code operators literally instead of as ligatures (#4832) | `covered` | S2-R04C1 | Reader code styles disable ligatures for EPUB pre/code/kbd and TXT fences; computed-style and unchanged source/range text regressions cover the contract. |
| 368 | `ae03be96d` | tts/audio | chore(agent): update agent memories (#4833) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 369 | `7da41a65a` | reader core | feat(widget): add mobile home-screen reading widgets (#1602) (#4842) | `not-applicable` | — | Mobile/device-only behavior is outside the desktop target. |
| 370 | `eaf307e71` | ai/assist/dictionary | fix(translate): align RTL translated text to the start (#4844) | `partial` | S2-A05 | assistance.ts and readerAssistance tests; exact provider/layout/error behavior is incomplete. |
| 371 | `70bad93eb` | reader core | feat(reader): select word on double-click and run instant action or toolbar (#4846) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 372 | `a23427ccc` | library | fix(widget): avoid recycling aliased source bitmap for 2:3 covers (#4850) | `not-applicable` | — | Unadopted external/transfer surface or Readest implementation optimization. |
| 373 | `3ac1a1a45` | reader core | fix(reader): remember last read position for markdown files (#4871) | `gap` | S2-M01 | Markdown is absent from the managed format list. |
| 374 | `17e60f1e4` | reader core | fix(reader): fix fixed-layout spread spine seam and zoomed-out blank page (#4857) (#4873) | `partial` | S2-R04C14 | Core reading exists; this authored-layout/script edge is unverified. |
| 375 | `49391124c` | reading modes/controls | fix(reader): correct reading ruler direction for vertical-rl books (#4865) (#4879) | `partial` | S2-F04 | Focused reading exists; vertical-writing ruler direction is not implemented. |
| 376 | `5bc8eda50` | ai/assist/dictionary | feat(proofread): editable Find pattern and per-rule enable/disable toggle (#4859) (#4888) | `gap` | S2-A07 | No equivalent AI transformation/proofreading action. |
| 377 | `4d645befd` | library | feat(library): add "Progress Read" sort option (#4427) (#4893) | `partial` | S2-L06 | P0-4.1/P0-4.2 and library smoke tests; exact projection/order is missing. |
| 378 | `fd8fbb178` | reader core | fix(reader): apply page margin changes live on all platforms (#4898) (#4900) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 379 | `c5304cd46` | reader core | fix(reader): turn pages horizontally for vertical-rl books (#624) (#4899) | `partial` | S2-R04C11 | P0-2/P0-3 and reader smoke tests; authored-content compatibility is unproved. |
| 380 | `c8e2c9533` | library | feat(library): auto-import new books from watched folders (#3889) (#4902) | `gap` | S2-L01 | P0-4.1/P0-4.2 and library smoke tests; bounded directory import is absent. |
| 381 | `8c91ad411` | reader core | fix(reader): open annotation deep link when a different book is open (#4887) (#4910) | `gap` | S2-A02 | P0-2/P0-3 and reader smoke tests; portable exchange/deep links are absent. |
| 382 | `2b524439b` | reader core | fix(reader): keep running header/footer readable over light PDFs in dark mode (#4901) (#4911) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 383 | `745f28f34` | reader core | fix(reader): distinguish two-finger scroll from pinch-zoom on touchscreens (#4858) (#4912) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 384 | `6391bfe78` | reader core | feat(settings): redesign theme mode toggle as a segmented control (#4831) (#4913) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 385 | `6b403d019` | catalog/import | feat(calibre): add Readest calibre plugin to push books and metadata (#4918) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 386 | `42f9b8fe3` | tts/audio | feat(tts): gapless Web Audio playback engine for Edge TTS with chapter timeline and seek (#4931) | `partial` | S2-T04A | tts.ts, ttsRuntime.ts, and TTS tests; voice/timing parity is incomplete. |
| 387 | `843ab3448` | tts/audio | feat(tts): keep TTS playing when the book is closed (#4941) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 388 | `ec45a080f` | catalog/import | feat(metadata): surface calibre custom columns from EPUB metadata (#4939) | `gap` | S2-L03 | foliate and br1 do not parse, persist, or display Calibre custom columns from OPF2/OPF3 metadata. |
| 389 | `920286484` | library | fix: real fix for library-save storage-permission crash + narrowed view-transition filter (#4943) | `partial` | S2-L05 | P0-4.1/P0-4.2 and library smoke tests; exact persistence/recovery case is unproved. |
| 390 | `e7f0b53bd` | catalog/import | fix(opds): crawl subdirectories when auto-downloading directory-style catalogs (#4948) | `gap` | S2-O04 | catalogs.rs and catalog tests; advanced protocol/navigation is absent. |
| 391 | `75f1fafe9` | reader core | feat(reader): slide and page curl turn animations (#555) (#4940) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 392 | `52be6fa06` | reader core | fix(reader): open books without a View Transition to avoid timeout (#4949) | `not-applicable` | — | Readest-specific transition or optional desktop behavior. |
| 393 | `6f3b401c2` | reader core | feat(reader): middle mouse button autoscroll in scrolled mode (#4955) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 394 | `4527aa277` | tts/audio | feat(reader): add TTS speak button to dictionary popup (#4876) (#4957) | `partial` | S2-A03 | assistance.ts and readerAssistance tests; exact language/normalization behavior is missing. |
| 395 | `f7f85330a` | library | chore(agent): update agent memories (#4958) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 396 | `2a837cb50` | reader core | fix(reader): fix PDF text selection misplaced by OS font scaling (#49) (#4960) | `covered` | foliate-js measures WebView font enlargement and divides it out of the text-layer glyph scale after each render; deterministic browser coverage verifies the 1.25 and 1.0 paths. |
| 397 | `a02b236e9` | reader core | fix: more production crashes (View Transition noise, book-dir race, stats transaction) (#4962) | `not-applicable` | — | Readest-specific transition or optional desktop behavior. |
| 398 | `db1d63cdc` | reader core | test(reader): harden fixed-layout wheel double-scroll test against CI flake (#4978) | `partial` | S2-R04C15 | Core reading exists; this authored-layout/script edge is unverified. |
| 399 | `600d69fa5` | reader core | fix(reader): gate route View Transitions on API support (READEST-9) (#4989) | `not-applicable` | — | Readest-specific transition or optional desktop behavior. |
| 400 | `3ce5a5c8e` | reader core | fix(reader): center the lone PDF page in portrait auto-spread (#4984) (#4992) | `covered` | S2-R03B6 | The nested foliate-js change `f6dced2aa` is matched by symmetric portrait margins, explicit landscape margin reset, and a repeated real-PDF left/right/rotation regression. |
| 401 | `17de9357d` | tts/audio | feat(reader): redesign the TTS control as a mini player with an expandable player sheet (#4996) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 402 | `f8ad47a41` | reading modes/controls | feat(reader): Auto Scroll reading mode for scrolled flow (#4998) (#4999) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 403 | `a8d341120` | reader core | fix(reader): gate captured slide/curl turn on scrollLocked like push (#5000) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 404 | `0c24aad60` | reader core | fix(reader): let page margins shrink into the safe-area inset (#4761) (#5001) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 405 | `5b8ab3db2` | reader core | docs: move source build instructions to CONTRIBUTING.md (#5017) | `not-applicable` | — | Readest implementation refactor, test maintenance, or project docs. |
| 406 | `ec6781fe7` | tts/audio | fix: media-session teardown race + page_stat view migration idempotency (#5019) | `not-applicable` | — | No matching br1 product surface identified. |
| 407 | `a9fb86ddc` | reader core | fix(reader): guard foliate paginator null-document crashes (#5020) | `partial` | S2-R01B | P0-2/P0-3 and reader smoke tests; exact paginator boundary is unproved. |
| 408 | `fdd13a5a6` | reader core | fix(reader): guard applyMarginAndGap against a torn-down view (#5022) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 409 | `9c4f9550b` | reader core | fix(layout): show progress info on top of the page in scrolled mode (#5029) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 410 | `0e125b156` | reader core | chore(style): unified info bar font style (#5045) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 411 | `f726ebf82` | catalog/import | fix(opds): fix logic for temporary destination filename (#5024) (#5058) | `partial` | S2-O02B | catalogs.rs and catalog tests; exact filename fixture is missing. |
| 412 | `fe1060845` | reader core | refactor: rename ColorPanel to ThemePanel (#5042) | `not-applicable` | — | Readest implementation refactor, test maintenance, or project docs. |
| 413 | `4fcc8d10f` | tts/audio | feat(tts): make inter-sentence and inter-paragraph gaps configurable (#5057) | `partial` | S2-T04A | tts.ts, ttsRuntime.ts, and TTS tests; voice/timing parity is incomplete. |
| 414 | `eacb517de` | reader core | feat(settings): Increase margin upper bounds (#5071) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 415 | `cc7a3938a` | reader core | fix: only open last book if book is not marked as finished (#5072) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; reopen policy needs an explicit regression. |
| 416 | `45466bc6b` | ai/assist/dictionary | fix(dictionary): let a web search entry lead the popup when it is first in the configured order (#5086) | `partial` | S2-A03 | assistance.ts and readerAssistance tests; exact language/normalization behavior is missing. |
| 417 | `9c6081402` | reader core | feat(markdown): render footnotes in .md books (#5074) (#5095) | `gap` | S2-M01 | Markdown is absent from the managed format list. |
| 418 | `c81547cd5` | library | feat(sorting): add toggle to filter by time remaining (#5079) | `partial` | S2-R01C | P0-2/P0-3 and reader smoke tests; exact responsive/metric edge is unproved. |
| 419 | `a97e44bbd` | reader core | fix(epub): load chapters whose zip entry name needs percent-encoding (#5100) | `covered` | S2-R04A2 | EPUB URL resolution decodes ordinary encoded entry characters while preserving `%2F` and `%23`; decoy entries prove separators and fragments are not corrupted. |
| 420 | `d2668d167` | reader core | fix(reader): remove long-press to zoom images and tables (#5108) | `partial` | S2-R09 | P0-2/P0-3 and reader smoke tests; exact media-viewer behavior is incomplete. |
| 421 | `d185bd92b` | library | fix(library): keep demo books out of the cloud book channel (#5049) (#5110) | `not-applicable` | — | Unadopted external/transfer surface or Readest implementation optimization. |
| 422 | `9fb50880e` | reader core | fix(settings): keep the screen awake only while reading (#5104) (#5113) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; exact theme setting/scope is incomplete. |
| 423 | `213f8ac76` | tts/audio | fix(tts): use more intuitive icons in tts player (#5117) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 424 | `fcdc6567e` | catalog/import | fix(opds): normalize XML MIME types (#5120) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 425 | `48d8a25d3` | catalog/import | fix(opds): escape malformed XML in proxy (#5121) | `partial` | S2-O01 | catalogs.rs and catalog tests; fixture browsing exists, live fetch is incomplete. |
| 426 | `c8a3f85a8` | tts/audio | feat(tts): persistent per-book audio cache with offline downloads (#5126) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 427 | `2170da04f` | tts/audio | chore: update agent memories (#5130) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 428 | `82dd9b8bb` | reader core | fix(deploy): restore webpack build so the Cloudflare worker fits 64 MiB (#5136) | `not-applicable` | — | Readest build, dependency, CI, or distribution detail. |
| 429 | `dbd7d2ac3` | ai/assist/dictionary | fix: change dictionary icon (#5135) | `partial` | S2-A03 | assistance.ts and readerAssistance tests; exact language/normalization behavior is missing. |
| 430 | `b6c994413` | tts/audio | fix(tts): show mini player immediately and keep it above bottom bar and footer (#5144) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 431 | `e7af44379` | tts/audio | test(tts): stop detached speak loops so no state dispatch escapes teardown (#5151) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 432 | `7f01d2b4f` | reader core | feat: redesign custom theme creation menu (#5152) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 433 | `6fd1fc42e` | ai/assist/dictionary | chore: gate rust_lint on src-tauri changes and drop redundant btn-primary in WordLens (#5156) | `gap` | S2-A07 | No equivalent AI transformation/proofreading action. |
| 434 | `114396b84` | reader core | fix(reader): resolve footer items overlapping on narrow screens (#5158) | `partial` | S2-R05 | P0-2/P0-3 and reader smoke tests; exact chrome interaction/layout is unproved. |
| 435 | `db38e2a7b` | tts/audio | feat(tts): add 0.8x and 0.85x tts speech speed presets (#5157) | `partial` | S2-T04A | tts.ts, ttsRuntime.ts, and TTS tests; voice/timing parity is incomplete. |
| 436 | `2e90d3719` | reader core | fix(reader): return the turn promise from the captured view.next/prev wrappers (#5159) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 437 | `6807664e9` | reader core | fix(reader): do not toggle bars on vertical pan swipes over fixed-layout pages (#5160) | `partial` | S2-R04C15 | Core reading exists; this authored-layout/script edge is unverified. |
| 438 | `d440df50e` | tts/audio | feat(tts): refine the TTS player sheet and redesign the mini player (#5162) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 439 | `01dabc69d` | tts/audio | feat(tts): add mini player Player Style (full/minimal); keep Tauri off the edge proxy (#5170) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 440 | `9ec7b3df9` | reader core | feat(annotator): copy a highlight or note with its deep link (#5171) | `gap` | S2-A02 | P0-2/P0-3 and reader smoke tests; portable exchange/deep links are absent. |
| 441 | `bca21afeb` | library | fix(transfer): stop bulk cloud uploads from freezing the library (#5047) (#5172) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 442 | `5f0105259` | library | fix(library): anchor the native context menu popup at the pointer position (#5182) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact interaction/layout state is unproved. |
| 443 | `6764498cd` | reader core | refactor: create primitive `Toggle` component (#5173) | `not-applicable` | — | Readest implementation refactor, test maintenance, or project docs. |
| 444 | `bc5e6640b` | reader core | fix(reader): stop vertical swipes from turning or flashing the layered slide (#5185) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 445 | `278055b87` | reader core | perf(test): reduce unit test runtime (#5190) | `not-applicable` | — | Readest implementation refactor, test maintenance, or project docs. |
| 446 | `2c6729962` | catalog/import | fix(opds): keep re-added catalogs from vanishing after app restart (#5191) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 447 | `c39c85c32` | tts/audio | test: remove redundant cases and silence passing logs (#5192) | `not-applicable` | — | Readest implementation refactor, test maintenance, or project docs. |
| 448 | `bd63d72e0` | reader core | feat: use shorter quote in theme preview (#5197) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 449 | `54ad2e916` | reader core | fix(reader): keep the side panel resize handle from sticking over PDF pages (#5198) | `covered` | S2-R03E | A topmost drag shield keeps resize events above PDF iframes and is removed on mouseup, blur, or route teardown. |
| 450 | `09548d998` | library | fix(library): keep the select-mode action bar from hiding the last book (#5200) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact interaction/layout state is unproved. |
| 451 | `fd3224353` | reader core | feat: improve accuracy of time remaining calculation (#5194) | `partial` | S2-R01C | P0-2/P0-3 and reader smoke tests; exact responsive/metric edge is unproved. |
| 452 | `1edc4bb32` | library | fix(library): show only currently-reading books on recent shelf and widget (#5201) | `not-applicable` | — | Unadopted external/transfer surface or Readest implementation optimization. |
| 453 | `56e4faa5d` | reader core | fix(reader): preserve paragraph breaks when copying text (#5202) | `partial` | S2-A01B | P0-2/P0-3 and reader smoke tests; exact selection lifecycle is unproved. |
| 454 | `086498326` | ai/assist/dictionary | fix(reader): support offline dictionary pronunciation (#5205) | `partial` | S2-A03 | assistance.ts and readerAssistance tests; exact language/normalization behavior is missing. |
| 455 | `8ba9cf277` | reading modes/controls | feat(reader): add right-edge swipe to adjust auto scroll speed (#5206) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 456 | `7b12f1906` | reader core | fix(reader): draw the theme background on the curl back face (#5208) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 457 | `5191b327d` | library | chore: update agent memories (#5209) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 458 | `4512f3985` | reader core | fix(reader): gate concurrent programmatic captured page turns (#5211) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 459 | `633ac5ac8` | reader core | fix(reader): make the custom theme editor readable on mobile (#5212) | `not-applicable` | — | Mobile/device-only behavior is outside the desktop target. |
| 460 | `f3930b814` | tts/audio | fix(reader): keep TTS media session and volume control with volume-key paging (#5218) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 461 | `2aa044d27` | reader core | fix(reader): keep captured turns aligned with the finger (#5217) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 462 | `a32646545` | reader core | Fix high-priority reader runtime errors (#5236) | `partial` | S2-R07 | Relevant failure class; reproduce locally before changing code. |
| 463 | `7d05581ee` | library | feat: add setting to enable skeuomorphic book covers (#5245) | `not-applicable` | — | Optional product surface outside current br1 scope. |
| 464 | `5e2836b08` | reader core | feat(theme): unify theme selector and bg texture selector styling (#5305) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 465 | `79b75e17d` | reader core | fix(reader): invalidate stale nav cache for encoded TOC hrefs (#5308) (#5311) | `partial` | S2-R02 | P0-2/P0-3 and reader smoke tests; exact navigation behavior lacks proof. |
| 466 | `46947af4b` | reader core | feat(settings): rename "Column Gap" to "Additional Margin" (#5315) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 467 | `136aebed3` | library | fix(library): disable skeuomorphic book covers by default (#5316) | `not-applicable` | — | Optional product surface outside current br1 scope. |
| 468 | `6b44a6227` | reader core | feat(reader): add collapsible chapter sections to search results (#5282) | `partial` | S2-R06 | P0-2/P0-3 and reader smoke tests; base search exists, this edge is unproved. |
| 469 | `ea30bbae7` | catalog/import | Load OPDS catalogs when opening the Integrations panel (#5283) | `gap` | S2-O03 | catalogs.rs and catalog tests; edit/request configuration is absent. |
| 470 | `ecd9fce65` | reader core | perf(reader): improve Slide/Curl gesture responsiveness (#5291) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 471 | `e1ed88bea` | catalog/import | fix(opds): keep same-host links on https when the feed is https (#5300) (#5324) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 472 | `cf4414f09` | catalog/import | fix(calibre): verify the cloud blob exists before a row-only push (#5325) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 473 | `20a073391` | catalog/import | feat(calibre): Check Readest status action, with faster cloud lookups (#5332) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 474 | `0935e02a2` | reader core | fix(reader): keep system brightness on after swipe (#5292) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 475 | `33600cf30` | tts/audio | feat: calculate TTS gap based on rate (#5326) | `partial` | S2-T04A | tts.ts, ttsRuntime.ts, and TTS tests; voice/timing parity is incomplete. |
| 476 | `a8aa982c8` | library | feat(library): show import options from the bookshelf add button (#5247) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact interaction/layout state is unproved. |
| 477 | `3c154a609` | library | fix(library): stop re-importing duplicate files from watched folders (#5337) | `gap` | S2-L01 | P0-4.1/P0-4.2 and library smoke tests; bounded directory import is absent. |
| 478 | `d1ab15c0f` | tts/audio | fix(reader): align paragraph mode chrome with the TTS player (#5275) (#5338) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 479 | `d40bf5ba7` | library | feat(markdown): parse YAML frontmatter into book metadata (#5279) (#5344) | `gap` | S2-M01 | Markdown is absent from the managed format list. |
| 480 | `27d7a45d9` | ai/assist/dictionary | fix(reader): keep book fonts when proofread rules change (#5277) (#5345) | `gap` | S2-A07 | No equivalent AI transformation/proofreading action. |
| 481 | `0e4272e4c` | library | fix(epub): fall back to cover-named zip entries (#5273) (#5339) | `covered` | S2-R04A2 | When the manifest omits a cover, foliate selects the first conventional cover/couv ZIP entry in archive order and returns the correct SVG media type. |
| 482 | `7786400b3` | reader core | fix(reader): keep the PDF footer readable in scrolled mode (#5342) (#5347) | `not-applicable` | — | br1 has no Readest mix-blend footer path; its opaque unblended footer is covered by a scrolled-PDF regression. |
| 483 | `3ca5d5879` | reader core | fix(pdf): keep desktop PDF text sharp (#5251) (#5348) | `covered` | The local branch never imported the mobile canvas cap: desktop rendering still uses full devicePixelRatio, with a browser regression above the upstream mobile pixel budget. |
| 484 | `368284d17` | security | chore: update agent memories (#5358) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 485 | `8c212e5b8` | ai/assist/dictionary | fix(translate): restore Yandex Translate provider (#5256) | `partial` | S2-A05 | assistance.ts and readerAssistance tests; exact provider/layout/error behavior is incomplete. |
| 486 | `46e75586f` | reader core | feat(markdown): support full heading depth in the TOC (#5357) (#5363) | `gap` | S2-M01 | Markdown is absent from the managed format list. |
| 487 | `3a0b9cac8` | reader core | fix(reader): report image zoom against the image resolution, closes #5362 (#5365) | `partial` | S2-R09 | P0-2/P0-3 and reader smoke tests; exact media-viewer behavior is incomplete. |
| 488 | `44953f568` | reader core | fix: preserve U+200F/U+200E BiDi marks in Persian/Arabic ebooks (#5216) (#5361) | `covered` | S2-R04C1 | DOM sanitization preserves literal and decimal/hex LRM/RLM controls; br1 does not have Readest's invisible-paragraph style classifier. |
| 489 | `201868e26` | tts/audio | feat(tts): add End of Chapter option to sleep timer (#5355) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 490 | `b99bea307` | tts/audio | fix(translate): restore Yandex auto-detection and translated TTS (#5374) | `partial` | S2-A05 | assistance.ts and readerAssistance tests; exact provider/layout/error behavior is incomplete. |
| 491 | `f246fade9` | reader core | feat(clip): capture login-walled articles with an in-app sign-in (#5377) | `not-applicable` | — | Unadopted external/transfer surface or Readest implementation optimization. |
| 492 | `b18a2cee4` | catalog/import | feat(library): import web novels from a URL (#5294) (#5381) | `partial` | S2-O01 | catalogs.rs and catalog tests; fixture browsing exists, live fetch is incomplete. |
| 493 | `21e1ed5df` | reader core | chore: update agent memories (#5384) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 494 | `f598c9ed6` | reader core | feat(reader): add font size setting and honor custom fonts in paragraph mode, closes #5246 (#5403) | `partial` | S2-F05 | Paragraph focus exists; paragraph typography settings and authored fonts remain incomplete. |
| 495 | `6a3caabeb` | reader core | feat(reader): auto-hide the mouse cursor while reading (#5178) (#5404) | `not-applicable` | — | Readest-specific transition or optional desktop behavior. |
| 496 | `0995ce782` | reader core | fix(layout): keep dropdown menus within viewport (#5392) | `partial` | S2-R01C | P0-2/P0-3 and reader smoke tests; exact responsive/metric edge is unproved. |
| 497 | `15b3d289e` | library | fix(library): do not dedupe distinct PDFs with identical metadata, closes #5411 (#5412) | `partial` | S2-L03 | P0-4.1/P0-4.2 and library smoke tests; exact metadata/provenance is missing. |
| 498 | `682b4ffc2` | reader core | fix(reader): exclude trailing whitespace from double-click selection (#5413) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 499 | `fa2e9cdc5` | tts/audio | fix(tts): read TTS section documents through the display transform pipeline (#5406) (#5416) | `partial` | S2-T03 | tts.ts, ttsRuntime.ts, and TTS tests; extraction/section parity is incomplete. |
| 500 | `2acb9fad0` | tts/audio | chore: update agent memories (#5418) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 501 | `a6a3e1499` | library | feat(library): add scoped full text search with fuzzy and nearby modes (#5389) | `partial` | S2-L08 | P0-4.1/P0-4.2 and library smoke tests; search/detail behavior is incomplete. |
| 502 | `4c523f75e` | ai/assist/dictionary | fix(proofread): match Unicode punctuation next to letters (#5421) | `gap` | S2-A07 | No equivalent AI transformation/proofreading action. |
| 503 | `5a2be9abe` | ai/assist/dictionary | feat(dictionaries): add Babylon BGL dictionary format (#5428) | `gap` | S2-A04 | assistance.ts and readerAssistance tests; local dictionary formats are absent. |
| 504 | `ca2c1298b` | reader core | fix(reader): normalize body text size in reflowable books (#5422) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 505 | `b17f06186` | reader core | fix(reader): let long press reach the first line on mobile (#5429) (#5432) | `not-applicable` | — | Mobile/device-only behavior is outside the desktop target. |
| 506 | `b1ec4f5e9` | reader core | fix(search): keep search options on one line at any text scale (#5434) | `partial` | S2-R06 | P0-2/P0-3 and reader smoke tests; base search exists, this edge is unproved. |
| 507 | `8e009cd61` | reader core | fix(reader): give the toolbar controls a 44px touch target, closes #5401 (#5437) | `partial` | S2-R05 | P0-2/P0-3 and reader smoke tests; exact chrome interaction/layout is unproved. |
| 508 | `8a259d332` | library | fix(library): keep subfolder groups for auto-imported books (#5423) (#5436) | `gap` | S2-L01 | P0-4.1/P0-4.2 and library smoke tests; bounded directory import is absent. |
| 509 | `55691602b` | library | feat(annotations): export and import annotations as JSON, closes #5400 (#5440) | `gap` | S2-A02 | P0-2/P0-3 and reader smoke tests; portable exchange/deep links are absent. |
| 510 | `47cd7b401` | library | feat(settings): add library/reader scope switcher to background image picker (#5443) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact library interaction needs a regression. |
| 511 | `fbeb29093` | library | feat(library): add bulk Download to the select-mode action bar (#5244) (#5445) | `not-applicable` | — | Unadopted external/transfer surface or Readest implementation optimization. |
| 512 | `4f44b79ec` | tts/audio | feat(tts): fine-tune the mini player time info and transport (#5310) (#5446) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 513 | `9700e59cd` | reader core | fix(reader): lift the header into the notch on negative top margins (#5447) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 514 | `e05b7d5bb` | reader core | feat(popup): restyle popups (#5351) | `partial` | S2-R05 | P0-2/P0-3 and reader smoke tests; exact responsive/interaction state is unverified. |
| 515 | `be5f07ef8` | reader core | feat(reader): centralize notes and highlights in the annotations hub, closes #5398, #3870 (#5448) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 516 | `c1b0a4ecd` | tts/audio | feat(stats): count TTS listening as reading time (#5450) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 517 | `fbfd95181` | reader core | chore: update agent memories (#5449) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 518 | `eb95677dc` | reader core | fix(popup): center the marker glyph and compact the highlight style buttons (#5451) | `partial` | S2-A01B | P0-2/P0-3 and reader smoke tests; this selection/popup edge is unproved. |
| 519 | `e562d2b98` | tts/audio | chore: update agent memories (#5458) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 520 | `790e8b9e8` | reader core | feat(about): copy the version label to the clipboard on click, closes #5285 (#5461) | `not-applicable` | — | Optional product surface outside current br1 scope. |
| 521 | `8ad906bc4` | reader core | fix(epub): parse OPF items and meta written with explicit closing tags (#5463) | `covered` | S2-R04A | br1 uses foliate's DOMParser path, which already accepts explicit closing tags for OPF item and meta elements; the Readest fix targeted its separate native parser. |
| 522 | `a5da9291f` | reader core | feat(annotator): add an opt-in Copy Link tool to the selection toolbar (#5464) | `gap` | S2-A02 | P0-2/P0-3 and reader smoke tests; portable exchange/deep links are absent. |
| 523 | `1da69c917` | reader core | feat(reader): tap the footer to show and dismiss the progress bar (#5466) | `partial` | S2-R01C | P0-2/P0-3 and reader smoke tests; exact responsive/metric edge is unproved. |
| 524 | `162f49f93` | reader core | fix(settings): drop the "Show" prefix from the footer widget labels (#5287) (#5469) | `not-applicable` | — | Unadopted external/transfer surface or Readest implementation optimization. |
| 525 | `11ae9e135` | catalog/import | fix(opds): use the cover advertised by the feed entry (#5471) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 526 | `59284086c` | reader core | feat(reader): show the image description in the image viewer (#5472) | `partial` | S2-R09 | P0-2/P0-3 and reader smoke tests; exact media-viewer behavior is incomplete. |
| 527 | `47f0a52b3` | library | feat(library): give the "Then by" sort its own order, closes #5119 (#5474) | `partial` | S2-L06 | P0-4.1/P0-4.2 and library smoke tests; exact projection/order is missing. |
| 528 | `ffdcfca0a` | catalog/import | fix(opds): apply the metadata advertised by the feed entry (#5477) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 529 | `da86aba6b` | reader core | fix(reader): stop the header hover strip from covering the page text (#5478) | `partial` | S2-R05 | br1 has hover chrome, but this exact first-line occlusion boundary lacks focused proof. |
| 530 | `6469cbb5b` | reader core | fix(reader): fix duokan fullscreen cover rendering and swipe (#5263) (#5473) | `partial` | S2-R04C18 | The final Duokan cover and post-restore swipe behavior remains an authored-layout fixture task. |
| 531 | `35450e965` | tts/audio | feat(tts): play a book's own recorded narration (EPUB 3 Media Overlays) (#5480) | `not-applicable` | — | Optional product surface outside current br1 scope. |
| 532 | `69985e5e5` | reader core | feat(reader): horizontal scrolling mode for fixed layout books (#5485) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 533 | `aa08ce95f` | library | fix(library): select books in the recently read shelf and pull it with the grid (#5486) | `partial` | S2-L06 | P0-4.1/P0-4.2 and library smoke tests; exact projection/order is missing. |
| 534 | `b92153f19` | library | fix(library): make search history chips translucent like the search input (#5488) | `partial` | S2-L08 | P0-4.1/P0-4.2 and library smoke tests; search/detail behavior is incomplete. |
| 535 | `1173d98b6` | reader core | chore: update agent memories (#5489) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 536 | `c1a3b2b92` | reading modes/controls | fix(reader): correct reading ruler transitions and line bounds (#5490) | `partial` | S2-F04 | Focused reading exists; ruler transition and line-bound behavior is not implemented. |
| 537 | `fde3df92c` | reader core | feat(reader): support adding bookmarks with a pull-down gesture (#1359) (#5493) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 538 | `dd6ad542d` | catalog/import | fix(opds): invalidate cached covers when the entry's updated value changes (#5495) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 539 | `f8d7e2638` | reader core | fix(build): strip dangling sourceMappingURL comments from Tauri builds (#5498) | `not-applicable` | — | Readest build, dependency, CI, or distribution detail. |
| 540 | `76b2d83b1` | reader core | fix(reader): style annotation toolbar customizer and flatten popup chrome (#5496) | `partial` | S2-A01B | P0-2/P0-3 and reader smoke tests; this selection/popup edge is unproved. |
| 541 | `63341d45f` | catalog/import | fix(opds): substitute percent-encoded {searchTerms} in OpenSearch templates (#5500) (#5504) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 542 | `67f850e5c` | reader core | fix(reader): render fixed layout documents edge to edge in scrolled mode (#5503) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 543 | `311f7209d` | catalog/import | feat(send): clip locally opened html and xhtml pages with the browser extension (#5512) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 544 | `e9ee43e88` | security | chore(deps): bump transitive dependencies for security advisories (#5518) | `not-applicable` | — | Readest build, dependency, CI, or distribution detail. |
| 545 | `08f373152` | library | fix(library): stop watched-folder scans from blocking the main thread (#5494) (#5517) | `gap` | S2-L01 | P0-4.1/P0-4.2 and library smoke tests; bounded directory import is absent. |
| 546 | `d0867d729` | reading modes/controls | fix(reader): keep the reading ruler anchored to its text across repagination (#5491) (#5519) | `partial` | S2-F04 | Focused reading exists; ruler anchoring across repagination is not implemented. |
| 547 | `420f65fc9` | ai/assist/dictionary | test(reader): deflake DictionarySheet expand/collapse toggle test (#5521) | `partial` | S2-A03 | assistance.ts and readerAssistance tests; exact language/normalization behavior is missing. |
| 548 | `d7ad9fe56` | library | feat(library): show the page count in book details (#5516) (#5523) | `partial` | S2-L08 | P0-4.1/P0-4.2 and library smoke tests; search/detail behavior is incomplete. |
| 549 | `e5cff97ca` | reader core | feat(reader): jump to an entered page number from the progress label (#5524) | `partial` | S2-R02 | P0-2/P0-3 and reader smoke tests; direct page navigation is missing. |
| 550 | `c3d4c5be6` | security | chore: update agent memories (#5525) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 551 | `d8abda158` | ai/assist/dictionary | fix(annotator): return to the selection toolbar after closing a lookup popup (#5213) (#5526) | `partial` | S2-A01B | P0-2/P0-3 and reader smoke tests; this selection/popup edge is unproved. |
| 552 | `256685bc3` | ai/assist/dictionary | fix(annotator): fall back to the selection toolbar when the dictionary quick action gets a multi-word selection (#5213) (#5529) | `partial` | S2-A03 | assistance.ts and readerAssistance tests; exact language/normalization behavior is missing. |
| 553 | `c5d596d89` | reader core | fix(reader): discard booknotes without a CFI to prevent an app crash (#5533) | `partial` | S2-A01A | P0-2/P0-3 and reader smoke tests; this anchor/grouping edge is unproved. |
| 554 | `a7b8deb9f` | tts/audio | fix(tts): settle Edge TTS synthesis when the Tauri WebSocket dies before turn.end (#5230) (#5534) | `partial` | S2-T01 | tts.ts, ttsRuntime.ts, and TTS tests; upstream race needs a local regression. |
| 555 | `30ee02a33` | reader core | fix(window): avoid unavailable title-bar APIs on mobile (#5536) | `not-applicable` | — | Mobile/device-only behavior is outside the desktop target. |
| 556 | `0254e13a4` | reader core | fix(annotator): re-anchor the note bubble when a highlight is resized (#5538) (#5541) | `partial` | S2-A01A | P0-2/P0-3 and reader smoke tests; this anchor/grouping edge is unproved. |
| 557 | `45d3b1f49` | reader core | chore: update agent memories (#5543) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 558 | `22308485f` | tts/audio | feat(tts): speak Japanese ruby readings instead of the base kanji (#5546) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 559 | `d1749feee` | reader core | feat(a11y): name the open book in the window title (#5547) | `partial` | S2-R05 | P0-2/P0-3 and reader smoke tests; baseline a11y exists, exact case needs proof. |
| 560 | `66ade3809` | reading modes/controls | fix(rsvp): respect safe area insets in landscape (#5548) | `partial` | S2-F03 | readingMode.ts and focused-reading e2e; RSVP-lite lacks this complete control. |
| 561 | `326df8402` | reader core | fix(layout): keep code block indentation when overriding book layout (#5549) | `partial` | S2-R01C | P0-2/P0-3 and reader smoke tests; exact responsive/metric edge is unproved. |
| 562 | `5ecb835c3` | ai/assist/dictionary | fix(reader): scrolled-mode toggle fallout, proofread and footer chrome (#5552) | `gap` | S2-A07 | No equivalent AI transformation/proofreading action. |
| 563 | `0fb889710` | ai/assist/dictionary | fix(translate): restore Azure Translator, keep paragraph layout, preserve inline formatting (#5555) | `partial` | S2-A05 | assistance.ts and readerAssistance tests; exact provider/layout/error behavior is incomplete. |
| 564 | `b1bafcaf4` | reader core | fix(reader): keep the cursor visible while text is selected (#5557) | `partial` | S2-A01B | P0-2/P0-3 and reader smoke tests; selection cursor behavior is unproved. |
| 565 | `2b719600c` | ai/assist/dictionary | feat(translate): preserve inline formatting with Google too (#5556) | `partial` | S2-A05 | assistance.ts and readerAssistance tests; exact provider/layout/error behavior is incomplete. |
| 566 | `f77b56c85` | reader core | fix(annotator): draw the highlight color check in the content color (#5564) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 567 | `dbcae8b22` | reader core | feat(reader): render math in annotation notes (#5571) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; this note/highlight lifecycle edge is unproved. |
| 568 | `ada70fc2f` | reader core | feat(reader): summarize annotation counts in the sidebar toolbar (#5576) | `partial` | S2-A01B | P0-2/P0-3 and reader smoke tests; this selection/popup edge is unproved. |
| 569 | `70465cb6c` | tts/audio | docs: update screenshots, closes #5368 (#5577) | `not-applicable` | — | Readest implementation refactor, test maintenance, or project docs. |
| 570 | `cf413b2b9` | tts/audio | chore: update agent memories (#5579) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 571 | `14de49724` | library | fix: fix occasional stuck when dismissing bookshelf menu (#5580) | `not-applicable` | — | br1 uses a DOM menu and has no cached native Tauri popup/menu resource that can deadlock on close. |
| 572 | `df2989e43` | catalog/import | fix(opds): make the title bar draggable in the online library view (#5592) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 573 | `6d5a89cee` | catalog/import | fix(opds): filter incompatible download formats and offer one-click EPUB (#5593) | `partial` | S2-O02A | This is OPDS acquisition selection, not local archive parsing; mixed-format feed behavior still lacks focused proof. |
| 574 | `4bcfcddf2` | library | fix(library): checkpoint, serialize, and pool folder imports (#5615) | `gap` | S2-L01 | P0-4.1/P0-4.2 and library smoke tests; bounded directory import is absent. |
| 575 | `28687314b` | ai/assist/dictionary | fix(translation): gate Enable Translation on book availability (#5600) (#5617) | `partial` | S2-A05 | assistance.ts and readerAssistance tests; exact provider/layout/error behavior is incomplete. |
| 576 | `552777e09` | catalog/import | fix(translate): send Bing language codes in the azure provider (#5620) | `partial` | S2-A05 | assistance.ts and readerAssistance tests; exact provider/layout/error behavior is incomplete. |
| 577 | `d843df6b6` | library | fix(library): stop a long press from selecting and then deselecting a book (#5621) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact interaction/layout state is unproved. |
| 578 | `614427e82` | reader core | fix(popup): stop mounting the filtered pointer triangle at rest (#5628) | `partial` | S2-R05 | P0-2/P0-3 and reader smoke tests; exact responsive/interaction state is unverified. |
| 579 | `ab055169c` | reader core | fix(ci): gate build_tauri_app on tauri paths and give webdriver its own timeout (#5644) | `not-applicable` | — | Readest build, dependency, CI, or distribution detail. |
| 580 | `10bf99158` | reader core | fix(reader): commit settled image zoom into the layout size, closes #5633 (#5639) | `partial` | S2-R01C | P0-2/P0-3 and reader smoke tests; exact responsive/metric edge is unproved. |
| 581 | `4f1850563` | catalog/import | fix(novel): retry transient fetch failures and backfill work metadata (#5650) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 582 | `05d289a4e` | library | fix(markdown): title imported books after the file, not the first heading (#5653) | `gap` | S2-M01 | Markdown is absent from the managed format list. |
| 583 | `2f9262e02` | reader core | fix(sanitizer): render Persian/Arabic half-space by converting misused RLM to ZWNJ (#5651) | `covered` | S2-R04C1 | Decoded prose text converts contextual RLM runs to equal-length ZWNJ using upstream Arabic ranges; code/style/attributes/SVG and direction/digit boundaries are preserved. |
| 584 | `dbe0dae0a` | reader core | feat(reader): flash the target of in-page footnote jumps, closes #5647 (#5655) | `covered` | S2-R04C6 | Shared host completion flashes the resolved target after ordinary links and both native footnote fallback paths. A temporary SVG group stays outside annotation hit-testing; intent guards and cleanup reject obsolete cues. Popup-internal links are absent in the native sanitized preview. |
| 585 | `42c7a2cb0` | reader core | fix(reader): disable text autosizing in fixed-layout books, closes #5641 (#5659) | `partial` | S2-R04C14 | Core reading exists; this authored-layout/script edge is unverified. |
| 586 | `34922b172` | catalog/import | fix(opds): stop auto-downloaded books from vanishing on restart (#5665) | `gap` | S2-O04 | catalogs.rs and catalog tests; advanced protocol/navigation is absent. |
| 587 | `561356628` | reader core | fix(ui): size the alert surface off its container, not its content (#5662) | `partial` | S2-R05 | P0-2/P0-3 and reader smoke tests; exact responsive/interaction state is unverified. |
| 588 | `1cbab73f9` | reading modes/controls | feat(reader): jump to the start or end of the book with Home/End, closes #5660 (#5673) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 589 | `124655e3a` | reading modes/controls | fix(reader): update progress during Auto Scroll and put slider overlay values on top (#5676) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 590 | `c0b953db7` | reading modes/controls | feat(reader): scroll Auto Scroll smoothly at low speeds (#5679) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 591 | `b07baf52b` | reader core | chore: update agent memories (#5682) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 592 | `130813a07` | library | fix(library): allow unchecking Read books in place for registered folders, closes #5680 (#5685) | `gap` | S2-L01 | P0-4.1/P0-4.2 and library smoke tests; bounded directory import is absent. |
| 593 | `181ac99a8` | reader core | fix(reader): keep table label columns from collapsing, closes #5681 (#5686) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 594 | `786230a93` | tts/audio | fix(tts): scroll to the current chapter when opening Offline Audio (#5684) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 595 | `98c68d6b4` | ai/assist/dictionary | fix(dictionary): recover after empty StarDict lookup (#5705) | `gap` | S2-A04 | assistance.ts and readerAssistance tests; local dictionary formats are absent. |
| 596 | `9c103d426` | tts/audio | feat(tts): symmetric minimal mini-player with centered play button (#5707) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 597 | `fb684ab60` | reader core | fix(reader): remove header controls duplicated by the mobile footer bar (#5708) | `not-applicable` | — | Mobile/device-only behavior is outside the desktop target. |
| 598 | `be6845371` | reading modes/controls | feat(reader): resume Auto Scroll when reopening a book, closes #5631 (#5710) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 599 | `522e504b6` | reading modes/controls | fix(reader): support page turner key combinations (#5709) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 600 | `a6e6691c8` | reader core | feat(reader): right-to-left page order for fixed-layout books (#5712) | `partial` | S2-R04C16 | Core reading exists; this authored-layout/script edge is unverified. |
| 601 | `6f67be703` | reader core | fix(reader): restore scrolled PDF highlights (#5719) | `covered` | S2-R03B7 | The nested foliate-js change `9fde61a10` is matched by refreshing the scrolled page overlayer after async PDF text-layer rendering, with a repeated real-highlight replacement regression. |
| 602 | `7e998d384` | reader core | fix(reader): highlight search results visible across chapter boundary (#5725) | `partial` | S2-A01A | P0-2/P0-3 and reader smoke tests; this anchor/grouping edge is unproved. |
| 603 | `8226c5545` | reader core | fix(reader): drop the 500-result cap from in-book search, closes #5724 (#5728) | `partial` | S2-R06 | P0-2/P0-3 and reader smoke tests; exact search behavior is incomplete. |
| 604 | `07306093e` | ai/assist/dictionary | fix(annotator): drop the selection when the instant dictionary opens, closes #5585 (#5730) | `partial` | S2-A03 | assistance.ts and readerAssistance tests; exact language/normalization behavior is missing. |
| 605 | `13e027286` | reader core | fix(reader): neutralize fixed backgrounds and drop negative margins (#5729) | `partial` | S2-U01B | P0-2/P0-3 and reader smoke tests; exact typography behavior differs. |
| 606 | `ac757777d` | library | fix(library): optimize bookshelf covers in background, closes #5632 (#5731) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact interaction/layout state is unproved. |
| 607 | `1ee7ca22d` | ai/assist/dictionary | feat(wordlens): add the en-hu gloss pack (#5738) | `gap` | S2-A07 | No equivalent AI transformation/proofreading action. |
| 608 | `0306e3470` | ai/assist/dictionary | fix(wordlens): key the manifest diff on pack routing fields too (#5739) | `gap` | S2-A07 | No equivalent AI transformation/proofreading action. |
| 609 | `0e2882c26` | reader core | chore: update agent memories (#5740) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 610 | `4549a026d` | library | feat(library): add hide-covers privacy option for the bookshelf (#5733) | `partial` | S2-L08 | P0-4.1/P0-4.2 and library smoke tests; search/detail behavior is incomplete. |
| 611 | `7fa3daa19` | tts/audio | feat(tts): queue chapter downloads with per-book persistence (#5690) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 612 | `b463f014b` | library | feat(library): show download progress overlay on book covers (#5736) | `not-applicable` | — | Unadopted external/transfer surface or Readest implementation optimization. |
| 613 | `631cd6454` | reader core | feat(annotator): support text selection tools in footnote popups (#5744) | `partial` | S2-R04C8 | Core reading exists; this authored-layout/script edge is unverified. |
| 614 | `9dedaf804` | tts/audio | feat(reader): pair local audiobooks with ebooks (#5754) | `not-applicable` | — | Optional product surface outside current br1 scope. |
| 615 | `9213c6af1` | tts/audio | fix(tts): make sentence and paragraph pauses consistent (#5753) | `partial` | S2-T04A | tts.ts, ttsRuntime.ts, and TTS tests; voice/timing parity is incomplete. |
| 616 | `a193cbc35` | reader core | fix(reader): keep chapter images openable after repeated footnote popups (#5756) | `partial` | S2-R04C9 | Core reading exists; this authored-layout/script edge is unverified. |
| 617 | `f7f8a830d` | catalog/import | feat(opds): confirm auto-download toggles and allow catalog reordering (#5746) (#5760) | `gap` | S2-O04 | catalogs.rs and catalog tests; advanced protocol/navigation is absent. |
| 618 | `89821136f` | library | fix(cbz): order split chapter folders base-first (#5762) | `covered` | S2-R04A3 | CBZ page paths are compared segment by segment with numeric collation; browser coverage proves base, `(2)`, `(3)`, `(10)` and numeric page order. |
| 619 | `771b152e5` | ai/assist/dictionary | feat(dictionaries): add bundled plugin and Yomitan support (#5764) | `gap` | S2-A04 | assistance.ts and readerAssistance tests; local dictionary formats are absent. |
| 620 | `9fb8266bf` | tts/audio | fix(reader): translate iframe text without duplicating TTS (#5772) | `partial` | S2-A05 | assistance.ts and readerAssistance tests; exact provider/layout/error behavior is incomplete. |
| 621 | `b50ff9374` | tts/audio | fix(tts): allow chapters sharing sentences with earlier packs to download (#5768) | `gap` | S2-T02 | tts.ts, ttsRuntime.ts, and TTS tests; spoken-range highlighting is absent. |
| 622 | `4171f45bd` | library | fix(library): recover from a failed startup instead of rendering a blank window (#5789) | `partial` | S2-L05 | P0-4.1/P0-4.2 and library smoke tests; exact persistence/recovery case is unproved. |
| 623 | `21e589fc7` | reader core | fix(reader): extend pull-to-bookmark to fixed layout and yield to late selection (#5802) | `partial` | S2-R01C | P0-2/P0-3 and reader smoke tests; exact responsive/metric edge is unproved. |
| 624 | `841b3639b` | reader core | fix(reader): render markdown in the note bubble popup, closes #5785 (#5805) | `gap` | S2-M01 | Markdown is absent from the managed format list. |
| 625 | `e83fec7f2` | reader core | feat(reader): add inline note editing (#5780) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; exact note lifecycle is unproved. |
| 626 | `01e2b6ba9` | reader core | feat(reader): expose book title and series as data attributes for custom UI CSS, closes #5776 (#5806) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; settings exist, exact theme behavior differs. |
| 627 | `3e9aacba1` | reader core | feat(reader): show PDF page labels as reference pages, closes #5822 (#5824) | `covered` | S2-R03D | foliate exposes meaningful document labels through an indexed page list; br1 shows the label with the physical page total. |
| 628 | `e659976cc` | reading modes/controls | feat(rsvp): add exact WPM entry and 10 WPM nudge to the speed dropdown, closes #5820 (#5825) | `partial` | S2-F03 | readingMode.ts and focused-reading e2e; RSVP-lite lacks this complete control. |
| 629 | `a4358d22e` | ai/assist/dictionary | fix(translate): follow Bing regional host and show why a translation failed, closes #5823 (#5826) | `partial` | S2-A05 | assistance.ts and readerAssistance tests; exact provider/layout/error behavior is incomplete. |
| 630 | `a2f123ff9` | reader core | feat(reader): join PDF line wraps into paragraphs when copying, closes #5814 (#5828) | `covered` | S2-R03D | PDF copy reconstructs ordinary wraps, paragraph gaps, CJK joins, hyphen continuation, and partial DOM ranges. |
| 631 | `69872d372` | ai/assist/dictionary | fix(annotator): hide the range editor handles while a lookup popup is open, closes #5815 (#5829) | `partial` | S2-A01B | P0-2/P0-3 and reader smoke tests; this selection/popup edge is unproved. |
| 632 | `279698832` | reader core | feat(reader): show the book cover full screen from the sidebar and book details, closes #5813 (#5827) | `gap` | S2-R09 | br1 shows cover thumbnails but has no full-screen reader media viewer. |
| 633 | `4df8b37b7` | reader core | feat(reader): select text across PDF pages as one selection, closes #5809 (#5831) | `covered` | S2-R03D | Desktop scrolled PDF supports one logical selection across contiguous loaded pages and persists one exact CFI per page. |
| 634 | `9b33b52a4` | reader core | feat(stats): tier stat_pages history into R2 segments behind a 7-day hot window (#5835) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 635 | `9045b43d1` | reader core | chore: update agent memories (#5840) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 636 | `6834ee42e` | reader core | fix(stats): survive PostgREST's row cap when building archive segments (#5844) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 637 | `ded443512` | library | fix(backup): export only live library books and reclaim orphaned book files (#5851) | `gap` | S2-L04 | P0-4.1/P0-4.2 and library smoke tests; no complete backup round trip. |
| 638 | `231cbf529` | reader core | fix(reader): keep the reading position across screen rotations (#5855) | `partial` | S2-R01A | P0-2/P0-3 and reader smoke tests; exact scroll/position edge is unproved. |
| 639 | `6ccdf8fb7` | reader core | feat(toc): wrap long headings onto multiple lines instead of truncating (#5858) | `partial` | S2-R02 | P0-2/P0-3 and reader smoke tests; exact navigation behavior lacks proof. |
| 640 | `8d44c6b66` | ai/assist/dictionary | fix(wordlens): build kaikki packs from the raw wiktextract dump (#5861) | `gap` | S2-A07 | No equivalent AI transformation/proofreading action. |
| 641 | `c6a1901a5` | tts/audio | fix(reader): move a paired audiobook by audio and decode WebP covers (#5863) (#5865) | `not-applicable` | — | Optional product surface outside current br1 scope. |
| 642 | `5aae8d6c5` | reader core | fix(reader): resolve media that book scripts add after the section loads, closes #1812 (#5868) | `partial` | S2-R04C21 | P0-2/P0-3 and reader smoke tests; authored-content compatibility is unproved. |
| 643 | `f45036556` | catalog/import | feat(library): add From Web Browser import with an in-app browser (#5775) (#5870) | `partial` | S2-O01 | catalogs.rs and catalog tests; fixture browsing exists, live fetch is incomplete. |
| 644 | `07371ccce` | reader core | fix(reader): render the IDPF EPUB 3 samples correctly (#480) (#5872) | `gap` | S2-R04C17 | Fixed-layout bitmap spines still need to fall back from synthetic device-width metadata to the image's natural dimensions. |
| 645 | `bc4b253b6` | library | fix(library): rubber-band the bookshelf at both edges and keep the reader from overscrolling (#5867) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact library interaction needs a regression. |
| 646 | `2fd8b3bc9` | reader core | chore: update agent memories (#5875) | `not-applicable` | — | Readest agent-memory bookkeeping. |
| 647 | `aa619f8f8` | library | fix(library): save the new data location when migrating an empty library (#5878) | `partial` | S2-L05 | P0-4.1/P0-4.2 and library smoke tests; exact persistence/recovery case is unproved. |
| 648 | `aab58241d` | reader core | feat(reader): jump from a footnote popup to the location in the book (#5889) | `covered` | S2-R04C7 | Native preview-to-book action reuses Stage/C6; original rendered target/ancestor styles reject known-hidden destinations. Unknown targets retain upstream default-allow policy, not measured visibility. Popup-internal links/history are absent. |
| 649 | `8f9028579` | catalog/import | feat(library): select chapters when importing web novels (#5892) | `partial` | S2-O01 | catalogs.rs and catalog tests; fixture browsing exists, live fetch is incomplete. |
| 650 | `800af00f3` | reader core | fix(ui): size toasts to their message and fade dialogs out whole (#5894) | `partial` | S2-R05 | P0-2/P0-3 and reader smoke tests; exact responsive/interaction state is unverified. |
| 651 | `e8f7a4875` | library | fix(library): refresh PDF metadata on re-import (#5895) | `covered` | S2-R03E | Re-import refreshes file-derived PDF metadata without replacing curated fields, verifies the parsed byte hash before write, and reuses exact-content identity and managed paths. |
| 652 | `7c0419961` | reader core | fix(reader): do not truncate footnote popups (#5887) | `covered` | S2-R04C5 | Native text-scope equivalent: intrinsic scrolling retains long excerpts, superseded reads stay invalid, and sanitized empty/image-only notes preserve existing navigation. No popup image rendering/late-image sizing parity is claimed; Readest observer/seed machinery has no local owner. |
| 653 | `a91b503e5` | reader core | fix(reader): make cross-page selection actually work (#5888) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 654 | `b1a62c059` | tts/audio | fix: folder import of Markdown, widget opens, comic zoom, selection handle and TTS word highlight (#5903) | `not-applicable` | — | Unadopted external/transfer surface or Readest implementation optimization. |
| 655 | `fabbcc640` | tts/audio | feat(tts): lyric-style sentence view in the Read Aloud player (#5755) (#5908) | `gap` | S2-T02 | tts.ts, ttsRuntime.ts, and TTS tests; spoken-range highlighting is absent. |
| 656 | `c04ba5a80` | tts/audio | fix(tts): queue a lyric reload requested during an in-flight fetch (#5909) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 657 | `d27d324e1` | reading modes/controls | feat(shortcuts): add customizable keyboard and mouse bindings (#5907) | `partial` | S2-R08 | A centralized keyboard/mouse map and conflict check exist; user customization and persistence remain absent. |
| 658 | `e782af530` | ai/assist/dictionary | fix(translate): Chinese targets, provider rate limits, and translator popup layout (#5913) | `partial` | S2-A05 | assistance.ts and readerAssistance tests; exact provider/layout/error behavior is incomplete. |
| 659 | `7e8abebcd` | reader core | fix(mobi): keep AZW3 text and TOC intact when section loads overlap (#5920) | `covered` | S2-R04A3 | KF8 serializes shared raw accumulation; the exact #5918 fixture returns identical text for serial and seeded out-of-order overlapping section loads. |
| 660 | `0fcbd16f7` | reader core | fix(ui): search cloud storage files on demand instead of while typing (#5923) (#5925) | `not-applicable` | — | Unadopted Readest cloud/account/capture surface. |
| 661 | `86493e801` | reader core | fix(reader): stop the a11y skip link from padding RTL sections with blank pages (#5924) (#5926) | `not-applicable` | — | br1 injects no positioned section skip link, so Readest's left:0 RTL phantom-page trigger does not exist. |
| 662 | `76e81d604` | reading modes/controls | fix(ui): align the keyboard shortcuts header with its group titles (#5927) | `covered` | S1-R02 | The shortcuts header and group titles share one aligned dialog column. |
| 663 | `7a7ab7642` | reader core | feat(reader): Notebook as a linked writing workspace (#5928) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; exact note lifecycle is unproved. |
| 664 | `5755f25d7` | reader core | feat(settings): show which scope the Settings dialog writes (#5933) | `partial` | S2-U01A | P0-2/P0-3 and reader smoke tests; exact theme setting/scope is incomplete. |
| 665 | `ad9e5c1b8` | library | feat(ui): separate theme mode and color for the library and the reader (#5948) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact library interaction needs a regression. |
| 666 | `2b9962a2c` | reader core | fix(reader): stop a mid-touch text selection from hijacking the brightness swipe (#5939) (#5958) | `partial` | S2-R08 | P0-2/P0-3 and reader smoke tests; exact input arbitration is unproved. |
| 667 | `0f913bfa6` | reader core | feat(reader): customizable header and footer style (#5938) (#5960) | `partial` | S2-R05 | P0-2/P0-3 and reader smoke tests; exact chrome interaction/layout is unproved. |
| 668 | `12af2050d` | reader core | fix(reader): contain Notebook text while typing (#5962) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; exact note lifecycle is unproved. |
| 669 | `053aba67f` | library | fix(library): update the existing book when an updated EPUB is re-imported (#5959) (#5961) | `partial` | S2-L03 | Same-source imports reuse a record, but updated EPUB identity and reading-state preservation across renamed copies and changed package UUIDs remain unproved. |
| 670 | `82658d8ed` | library | feat(grouping): Adding existing status as Grouping (#5935) | `partial` | S2-L06 | P0-4.1/P0-4.2 and library smoke tests; exact projection/order is missing. |
| 671 | `341119e5e` | tts/audio | fix(reader): track the paused TTS chapter (#5968) | `partial` | S2-T04B | tts.ts, ttsRuntime.ts, and TTS tests; basic playback exists, complete player parity does not. |
| 672 | `9e1f72ae7` | reader core | fix(reader): correct PDF reference totals and slider endpoint (#5951) (#5969) | `covered` | S2-R03D | The footer keeps physical totals beside reference labels and forwards exact native 0/100 progress endpoints. |
| 673 | `5ae894735` | reader core | fix(reader): stabilize nested book menu sizing (#5978) | `partial` | S2-R05 | P0-2/P0-3 and reader smoke tests; exact chrome interaction/layout is unproved. |
| 674 | `1fa25f7ae` | reader core | fix(markdown): support tab-indented footnotes (#5975) | `gap` | S2-M01 | Markdown is absent from the managed format list. |
| 675 | `d49fd8ba5` | library | chore: update agent memories and tidy library styles (#5985) | `partial` | S2-L07 | P0-4.1/P0-4.2 and library smoke tests; exact library interaction needs a regression. |
| 676 | `59cb6a776` | reader core | fix(reader): stop the note popup growing scrollbars of its own (#6006) | `partial` | S2-A01B | P0-2/P0-3 and reader smoke tests; this selection/popup edge is unproved. |
| 677 | `076556bd3` | catalog/import | fix(opds): import the publication date, not the calibre added-date (#6008) | `partial` | S2-O02A | catalogs.rs and catalog tests; exact feed behavior is not covered. |
| 678 | `6df90139d` | reader core | fix(reader): write a new note on the selection, not in the sidebar (#6013) | `partial` | S2-A01C | P0-2/P0-3 and reader smoke tests; exact note lifecycle is unproved. |

## Recommended Execution Order

1. Baseline closure: `S1-R01` through `S1-R03` verified complete on 2026-09-02.
2. Trust and format floor: `S2-R04A` through `S2-R04C`, `S2-D01` (`S2-S01` through `S2-S04` and `S2-R03A` through `S2-R03E` reviewed and closed by 2026-09-04).
3. Reader mechanics: `S2-R01A` through `S2-R02`, `S2-R05` through `S2-R09`.
4. AI-native core: `S2-A06`, `S2-A07`, `S2-A03`, `S2-A05`, then annotation and local-dictionary tasks.
5. Focus and speech: `S2-F01` through `S2-F05`, then `S2-T01` through `S2-T04B`.
6. Library and catalogs: `S2-L01` through `S2-L08`, then `S2-O01` through `S2-O04`.
7. Optional format and appearance: `S2-M01`, `S2-U01A`, `S2-U01B`.

Each task is a separate implementation/verification commit. Do not batch tasks merely because they cite adjacent Readest commits.

## Executable Tasks

Only `gap` and `partial` commits create work. `covered` rows remain regression evidence; `not-applicable` rows stay closed unless br1 product scope changes.

### Completed Baseline: S1-R01 - Close mode follow, lock, and resume semantics

- Phase: Step 1
- Result: `covered` by br1-native book-scoped translation/TTS follow-pin-restore state, focused-reading same-excerpt mode switching, and hidden same-book resume.
- Evidence: `pnpm check` (PASS); `pnpm test:reader-helpers` (PASS, 67/67); `CI=1 pnpm test:e2e --retries=0` (PASS, 76/76).
- Audit correction: the 11 Readest commits previously grouped here concern reading-ruler or paragraph-mode behavior, not ownership. They remain `partial` under `S2-F04` and `S2-F05`.

### Completed Baseline: S1-R02 - Centralize reader input bindings

- Phase: Step 1
- Result: `covered` by one conflict-checked keyboard/mouse map, a modal shortcuts dialog, native keyboard menu activation, Ctrl/Cmd+B bookmarks, and editable-field suppression.
- Evidence: `pnpm check` (PASS); `pnpm test:reader-helpers` (PASS, 71/71); targeted keyboard e2e (PASS, 1/1); full browser e2e (PASS, 76/76); desktop and 390x844 dialog visual checks (PASS, no horizontal overflow).
- Remaining boundary: user-customizable bindings and persistence from `d27d324e1` remain `partial` under `S2-R08`; static br1 bindings are complete for this baseline.
- Commits: `3d4d1482a`, `ec26ef4f2`, `b9a2b10fa`, `d27d324e1`, `76e81d604`

### Completed Baseline: S1-R03 - Certify baseline library behavior

- Phase: Step 1
- Result: `covered` by sorting, grouping/filter projections, trusted open-with, remove/restore, progress restore, reader return, and search/filter empty-state regressions.
- Repair: desktop coordination now reads live Svelte state instead of initialization snapshots; desktop smoke helpers follow the current footer and menu DOM contracts.
- Evidence: `pnpm check` (PASS); targeted browser library smoke (PASS, 1/1); targeted desktop library regressions (PASS, 4/4).
- Audit correction: the six Readest commits previously grouped here do not describe baseline library behavior. Four remain `partial` under `S2-R04C`/`S2-R05`, full-screen cover viewing is a `gap` under `S2-R09`, and the native cached-menu deadlock is `not-applicable`.

### S2-R01A - Stabilize scroll and position transitions

- Phase: Step 2
- Upstream decisions: 29 commits (0 gap, 29 partial)
- Outcome: Preserve reading position when switching flow, resizing, or using continuous scroll.
- Touches: foliate adapter, reader settings, focused scroll tests
- Verify: `pnpm check`; `scroll-position smoke`; `desktop resize smoke`
- Commits: `290550601`, `c4e331564`, `ef97a8ed0`, `1527dd9b3`, `e18bfd681`, `d609de58f`, `7716f189c`, `f5e729a17`, `2acd08202`, `ad1c2d6bb`, `aa318904b`, `de3e4b6d3`, `3a81e0991`, `64350ca63`, `6caa376f8`, `2153f7cc0`, `428168ac9`, `745f28f34`, `6f3b401c2`, `f8ad47a41`, `a8d341120`, `9c4f9550b`, `8ba9cf277`, `69985e5e5`, `67f850e5c`, `124655e3a`, `c0b953db7`, `be6845371`, `231cbf529`

### S2-R01B - Stabilize paginator boundaries

- Phase: Step 2
- Upstream decisions: 7 commits (0 gap, 7 partial)
- Outcome: Prevent preload, page-count, captured-turn, and last-page regressions.
- Touches: foliate paginator adapter and focused tests
- Verify: `pnpm check`; `pagination smoke`; `git diff --check`
- Commits: `797fe9c60`, `b87286813`, `6a44f609b`, `ed7cfc31f`, `a848c142c`, `31176e5d4`, `a9fb86ddc`

### S2-R01C - Normalize reader metrics and responsive layout

- Phase: Step 2
- Upstream decisions: 18 commits (0 gap, 18 partial)
- Outcome: Keep progress, remaining time, width, and reader chrome stable across window sizes.
- Touches: reader chrome/layout tokens and focused tests
- Verify: `pnpm check`; `responsive reader smoke`; `visual desktop check`
- Commits: `8ed929065`, `e68dedd10`, `05afaab5f`, `70b94d898`, `db35a4e20`, `de11511c3`, `957b7d5f3`, `63b0b8702`, `e7f370453`, `ff4c03919`, `c781aedda`, `c81547cd5`, `fd3224353`, `0995ce782`, `1da69c917`, `326df8402`, `10bf99158`, `21e589fc7`

### S2-R02 - Harden TOC and navigation state

- Phase: Step 2
- Upstream decisions: 13 commits (0 gap, 13 partial)
- Outcome: Keep active TOC, chapter/page labels, sidebar scroll, and section navigation coherent.
- Touches: sidebar controller, foliate navigation adapter, focused tests
- Verify: `pnpm check`; `TOC/navigation smoke`; `git diff --check`
- Commits: `73d30c103`, `b0cc5461a`, `3e292af99`, `e1dad98e5`, `17f2a17ad`, `3c14d5a4b`, `6405ba31c`, `11666be5e`, `2ade76995`, `dd53e5245`, `79b75e17d`, `e5cff97ca`, `6ccdf8fb7`

### Completed Task: S2-R03A - Add optional PDF theme colors

- Phase: Step 2
- Upstream decisions: 3 commits (3 covered)
- Result: PDF theme colors are opt-in, persisted, applied through Foliate `pageColors`, and hidden where Canvas 2D filters are unsupported.
- Evidence: `pnpm check` (PASS); `pnpm test:reader-helpers` (PASS, 71/71); sync model tests (PASS, 5/5); focused PDF-theme browser tests (PASS, 3/3); PDF reopen browser smoke (PASS, 1/1); macOS Tauri PDF restore and unsupported-menu smoke (PASS, 1/1).
- Commits: `5a072e7d1`, `799db4076`, `a2244e28b`

### Completed Task: S2-R03B1 - Restore two-page PDF annotations after rerender

- Phase: Step 2
- Upstream decisions: 1 commit (1 covered)
- Result: PDF uses the shared annotation flow, and visible fixed-layout overlayers are rebuilt after PDF text-layer rerenders so two-page highlights re-anchor to live DOM ranges.
- Evidence: `node --check fixed-layout.js` (PASS); `pnpm check` (PASS); `pnpm test:reader-helpers` (PASS, 71/71); PDF annotation/theme browser regressions (PASS, 4/4); `pnpm build` (PASS).
- Commit: `3bbc2071c`

### Completed Task: S2-R03B2 - Preserve continuous-scroll PDF position after rerender

- Phase: Step 2
- Upstream decisions: 1 commit (1 covered)
- Result: The fixed-layout engine preserves the current page and its intra-page fraction while actual PDF dimensions land or the scrolled layout resizes, instead of snapping the page to its top edge.
- Evidence: `node --check fixed-layout.js` (PASS); `pnpm check` (PASS); `pnpm test:reader-helpers` (PASS, 71/71); B1/B2 PDF regressions (PASS, 2/2); continuous-scroll load/resize regression (PASS, 3/3 repeated runs); `pnpm build` (PASS).
- Commit: `dab92c8a4`

### Completed Task: S2-R03B3 - Remove fractional-DPI PDF spread seams

- Phase: Step 2
- Upstream decisions: 1 commit (1 covered)
- Result: PDF canvases keep the fractional device-pixel viewport as their CSS size while retaining integer bitmap dimensions, so the existing inverse-DPR transform fills each logical page box without exposing a spread seam.
- Evidence: `node --check pdf.js` (PASS); DPR 1.5 real-PDF spread regression (PASS, 3/3 repeated runs); B1-B3 PDF regressions (PASS, 3/3); `pnpm check` (PASS); `pnpm test:reader-helpers` (PASS, 71/71); `pnpm build` (PASS); `git diff --check` (PASS).
- Commit: `a9c0f3d46`

### Completed Task: S2-R03B4 - Stabilize scrolled PDF wheel input

- Phase: Step 2
- Upstream decisions: 1 commit (1 covered)
- Result: A wheel tick over an interactive scrolled-PDF iframe now relies on native scroll chaining instead of adding a second programmatic host scroll; the handler only disables iframe interaction for subsequent ticks.
- Evidence: `node --check fixed-layout.js` (PASS); real-PDF wheel regression (PASS, 3/3 repeated runs); B1-B4 PDF regressions (PASS, 4/4); `pnpm check` (PASS); `pnpm test:reader-helpers` (PASS, 71/71); `pnpm build` (PASS); `git diff --check` (PASS).
- Commit: `1b44b95d3`

### Completed Task: S2-R03B5 - Stabilize scrolled PDF pinch and pan

- Phase: Step 2
- Upstream decisions: 1 commit (1 covered)
- Result: Scrolled PDFs now preview a two-finger pinch live around the viewport center, commit the new local scale without moving the center page, remain horizontally pannable when enlarged, and keep page iframes interactive while idle.
- Evidence: `node --check fixed-layout.js` (PASS); real-PDF pinch regression (PASS, 3/3 repeated runs); B1-B5 PDF regressions (PASS, 5/5); `pnpm check` (PASS); `pnpm test:reader-helpers` (PASS, 71/71); `pnpm build` (PASS); `git diff --check` (PASS).
- Commit: `f8916e128`

### Completed Task: S2-R03B6 - Center lone portrait PDF pages

- Phase: Step 2
- Upstream decisions: 1 commit (1 covered)
- Result: Portrait auto-spread now centers either lone visible PDF page with symmetric inline margins, while landscape explicitly restores the two one-sided margins that keep both pages against the spine.
- Evidence: `node --check fixed-layout.js` (PASS); real-PDF portrait spread regression (PASS, 3/3 repeated runs); B1-B6 PDF regressions (PASS, 6/6); `pnpm check` (PASS); `pnpm test:reader-helpers` (PASS, 71/71); `pnpm build` (PASS); `git diff --check` (PASS).
- Commit: `3ce5a5c8e`

### Completed Task: S2-R03B7 - Restore scrolled PDF highlights

- Phase: Step 2
- Upstream decisions: 1 commit (1 covered)
- Result: Continuous-scroll PDF pages now replace stale annotation overlayers after asynchronous text-layer rerenders, reconnecting saved highlights to fresh DOM ranges.
- Evidence: `node --check fixed-layout.js` (PASS); real-PDF scrolled highlight regression (PASS, 10/10 repeated runs); B1-B7 PDF regressions (PASS, 7/7); `pnpm check` (PASS); `pnpm test:reader-helpers` (PASS, 71/71); `pnpm build` (PASS); `git diff --check` (PASS).
- Commit: `6f67be703`

### Completed Task: S2-R03C - Verify packaged PDF runtime and text sharpness

- Phase: Step 2
- Upstream decisions: 3 commits (3 covered)
- Result: Production builds refresh every PDF.js WASM runtime, the host preflights the worker foliate actually loads, OS font enlargement is divided out of the transparent text layer, and desktop canvases retain full device-pixel-ratio resolution.
- Evidence: debug macOS `.app` JBIG2 runtime smoke (PASS, 1/1); built-frontend vendor/runtime checks (PASS, 3/3); focused font-scale and desktop-DPR browser regressions (PASS, 2/2); foliate font-scale tests (PASS, 2/2); `pnpm check` (PASS, 0 errors and 0 warnings); reader helpers (PASS, 71/71); E2E TypeScript and both repositories' `git diff --check` (PASS); fresh Terra high review (PASS, no findings).
- Evidence boundary: The 1.25 font-scale path is deterministic browser simulation, not a physical WebView with an altered system accessibility setting; device-level selection alignment remains a manual acceptance check.
- Commits: `9b4db4449`, `2a837cb50`, `3ca5d5879`

### Completed Task: S2-R03D - Align PDF labels, copy, and cross-page selection

- Phase: Step 2
- Upstream decisions: 4 commits (4 covered)
- Result: Meaningful PDF reference labels now use an indexed foliate page list while the footer preserves the physical total and exact slider endpoints. Copy reconstructs PDF line wraps from text-layer geometry, and desktop scrolled PDFs support one logical selection across contiguous loaded pages with one persisted CFI per page. Repeating a composite highlight removes all parts only when every part already exists; otherwise it adds only missing pages.
- Evidence: foliate page-label tests (PASS, 2/2); reader helper tests (PASS, 76/76); focused PDF labels, slider, DOM-range copy, scrolled cross-page selection, and paginated negative browser regressions (PASS, 5/5, with the Chromium 148 native case skipped on bundled Chromium 145); deterministic scrolled cross-page regression (PASS, 5/5); real cross-iframe `page.mouse` drag on Chrome 152 (PASS, 5/5); `pnpm check` (PASS, 0 errors and 0 warnings); `pnpm build` (PASS); both repositories' `git diff --check` (PASS); fresh Terra high fix re-review (PASS, no findings).
- Evidence boundary: Cross-page selection is intentionally desktop-only and limited to contiguous loaded fixed-layout pages in scrolled mode. Real Chrome 152 mouse input and the deterministic origin-iframe path are covered; physical packaged Tauri WebView drag acceptance and mobile selection handles are not claimed.
- Commits: `3e9aacba1`, `a2f123ff9`, `4df8b37b7`, `9e1f72ae7`

### Completed Task: S2-R03E - Close PDF metadata and chrome edges

- Phase: Step 2
- Upstream decisions: 3 commits (2 covered, 1 not-applicable)
- Result: A full-window shield keeps sidebar resize events above PDF iframes and is cleaned up on mouseup, blur, or route teardown. PDF metadata is parsed through the existing foliate/PDF.js path, merged without replacing curated fields, bound to the exact source bytes by SHA-256, and saved through the existing Rust import. Exact-content imports reuse only canonical br1-managed PDF records and preserve their ID, managed path, progress, organization fields, and path-keyed reader state. Readest's footer blend fix is not applicable because br1 uses an opaque, unblended footer.
- Evidence: `pnpm test:reader-helpers` (PASS, 88/88); `cargo test --manifest-path src-tauri/Cargo.toml --lib` (PASS, 57/57); focused sidebar shield, PDF author, and scrolled footer Playwright regressions (PASS, 5/5); `pnpm check` (PASS, 0 errors and 0 warnings); `pnpm build` (PASS); task-touched Rust files `rustfmt --check` (PASS); `git diff --check` (PASS); fresh Terra high fix re-review (PASS, no findings).
- Evidence boundary: The drag shield and import contracts are covered in unit and browser tests, not by a packaged Tauri import/reopen fixture with existing notes, bookmarks, highlights, and search cache. An adversarial filesystem mutation between canonicalization/hash and write is not simulated. Full-repository `cargo fmt --check` remains blocked by pre-existing formatting differences in untouched Rust files.
- Commits: `54ad2e916`, `7786400b3`, `e8f7a4875`

### S2-R04A - Harden EPUB-family archive loading

- Phase: Step 2
- Upstream decisions: 8 commits (8 covered)
- Outcome: Cover malformed EPUB entries, overlapping MOBI/AZW3 loads, and CBZ ordering without adding a second parser.
- Touches: EPUB/MOBI/CBZ fixtures and parser guards
- Verify: `pnpm check`; `archive fixture smoke`; `git diff --check`
- Commits: `234ecc311`, `c30a59a9e`, `d326e1c73`, `403be32d5`, `a97e44bbd`, `0e4272e4c`, `89821136f`, `7e8abebcd`

#### Completed Task: S2-R04A1 - Tolerate malformed ZIP headers and entry casing

- Result: foliate accepts ZIP archives with a recoverable fourth local-header byte, keeps exact-case entries authoritative, falls back only to unique case-insensitive matches, and rejects ambiguous folded collisions.
- Evidence: focused real-ZIP tests (PASS, 6/6, including entry read after local-header repair); real minimal-EPUB Chromium regression through `makeBook` and `createDocument` (PASS, 1/1); `pnpm check` (PASS, 0 errors and 0 warnings); `pnpm build` (PASS); both repositories' `git diff --check` (PASS).
- Evidence boundary: The browser fixture combines a malformed first local header with a uniquely case-mismatched chapter, but it is not a packaged Tauri/WebView acceptance run. OPF repair is covered by A2; MOBI/AZW3 concurrency and CBZ sorting are covered by A3.
- Commits: `b53bdd271` (foliate-js), `9ace5482d` (br1 integration proof)

#### Completed Task: S2-R04A2 - Repair EPUB package references

- Scope: `403be32d5`, `a97e44bbd`, `0e4272e4c`
- Result: foliate preserves valid XML entities while escaping bare ampersands, decodes ordinary percent-encoded entry characters without turning `%2F` or `%23` into structural separators, filters manifest items without `href` at the shared resource boundary, and discovers conventional undeclared cover files in archive order with SVG MIME support.
- Evidence: focused missing-href Loader regression (PASS, 1/1); full real-EPUB Chromium compatibility file (PASS, 5/5); foliate ZIP loader tests (PASS, 6/6); `pnpm check` (PASS, 0 errors and 0 warnings); `pnpm build` (PASS); both repositories' `git diff --check` (PASS); fresh Terra high fix re-review and Sol high architecture review (PASS, no findings).
- Evidence boundary: The browser fixtures exercise actual ZIPs through `makeBook`, `section.load()`, resource replacement, `createDocument()`, and `getCover()`, but not a packaged Tauri/WebView manual import. The independent foliate `npm run build` remains blocked by the existing dependency installation state; br1's production build directly bundles the changed sibling source and passes.
- Commits: `540f1544d` (foliate-js), `42f0caf40` (br1 integration proof)

#### Completed Task: S2-R04A3 - Stabilize MOBI/AZW3 and CBZ archive reads

- Scope: `d326e1c73`, `89821136f`, `7e8abebcd`
- Result: foliate rewrites the observed MOBI6 self-closing non-void tags before parsing, compares CBZ paths segment by segment with numeric collation, and serializes KF8 shared raw-byte accumulation so adjacent section preloads cannot reorder records.
- Evidence: focused Chromium compatibility tests (PASS, 3/3); exact 84,908-byte Readest #5918 AZW3 fixture SHA-256 verification; serial and seeded out-of-order overlapping KF8 section text match; foliate ZIP loader tests (PASS, 6/6); `pnpm check` (PASS, 0 errors and 0 warnings); `pnpm build` (PASS); both repositories' syntax/diff checks (PASS); task-level and architecture ownership reviews (PASS, no findings).
- Evidence boundary: KF8 runs through the real parser with a jittered File, not packaged Tauri I/O. MOBI6 uses a production pure-helper regression plus static `createDocument()` call-chain proof rather than a binary fixture. CBZ covers representative ASCII split folders and numeric pages, not every locale collation. Readest's separate `RemoteFile.fetchRange` inclusive-end fix is not applicable because br1 materializes complete native `File` objects and has no remote range cache.
- Commits: `758f218f2` (foliate-js), `780964127` (br1 integration proof)

### Completed Task: S2-R04B - Harden TXT chapter parsing

- Phase: Step 2
- Upstream decisions: 5 commits (3 covered, 1 not-applicable, 1 partial with its remaining TTS obligation moved to S2-T03)
- Outcome: Cover encoding, scene breaks, chapter prefixes, and prose false positives.
- Touches: TXT parser fixtures and focused tests
- Verify: `pnpm check`; `TXT fixture smoke`; `git diff --check`
- Commits: `3b03b2c8d`, `eadb35539`, `1d4b7eed8`, `4b0bbc77b`, `1faa931a0`

- Result: Source-offset chapter indexing drives the existing TXT surface, TOC navigation, and chapter context without converting books to EPUB. Chapter/preface titles support 36 characters; bonus prefixes are recognized; scene dividers, fenced code, measure-word prose, and date-led prose do not create chapters. Raw File and fetched bytes share native UTF decoding with a bounded GB18030 fallback; persisted `txt:` fractions retain their meaning.
- Evidence: focused TXT Chromium regressions including short-book navigation and selection ownership (PASS, 7/7); existing code-highlighting, literal-markup, and visible-excerpt TTS regressions (PASS, 3/3); `pnpm check` (PASS, 0 errors / 0 warnings); `pnpm build` (PASS); `git diff --check` (PASS); independent Terra high task review and Astra high final review, including fix re-reviews (PASS).
- Evidence boundary: The resume test mocks desktop IPC to supply a raw File and explicit stored fraction/location inputs; it does not prove disk-library persistence, asset-reload persistence, or packaged Tauri/mobile behavior. Encoding has no general Shift-JIS/Big5 or damaged-file detection claim. Headingless text remains intact without Readest's artificial 100-paragraph chapters. The sole nested foliate update in these five commits (`4361f29b5..3c597a6dc`) changes TTS block filtering, not TXT; sibling code still lacks it, so the outer commit remains partial under S2-T03.

### S2-R04C - Harden authored-layout compatibility

- Phase: Step 2
- Upstream decisions: 34 commits (10 covered, 19 partial, 2 gap, 3 not-applicable); the remaining nested margin obligation in `1d8ed3fc9` is assigned to S2-U01B.
- Audit correction: the old 31-commit summary omitted wide tables `458ad7510`, EPUB page-list `9dc41e7ad`, and bitmap spine layout `07371ccce`, which already belonged here in the per-commit table.
- Execution map: [34-commit evidence, 15 nested foliate ranges, and C1-C21 acceptance slices](./2026-09-05-authored-layout-commit-audit.md). Remaining rows now reference their individual slice IDs; the larger task count reflects finer decomposition, not new upstream commits.
- Outcome: Cover footnotes, fixed layout, vertical/RTL/CJK text, code, and dynamic book media.
- Touches: foliate compatibility fixtures and focused guards
- Verify: `pnpm check`; `authored-layout smoke`; `git diff --check`
- Commits: `87f0240b0`, `caa0d719c`, `23d5f3363`, `b223ccaee`, `ebbbf104b`, `1d8ed3fc9`, `9a05935ca`, `54aa20d4f`, `676e14234`, `d6e981e56`, `6626db967`, `370a51662`, `69599e2bc`, `17e60f1e4`, `c5304cd46`, `db1d63cdc`, `6807664e9`, `44953f568`, `dbe0dae0a`, `42c7a2cb0`, `a6e6691c8`, `631cd6454`, `a193cbc35`, `5aae8d6c5`, `aab58241d`, `7c0419961`, `86493e801`, `cf44e8518`, `a9526377a`, `6469cbb5b`, `2f9262e02`, `458ad7510`, `9dc41e7ad`, `07371ccce`

#### Completed Task: S2-R04C1 - Preserve authored text shaping

- Scope: `69599e2bc`, `44953f568`, `2f9262e02`; classify skip-link fixes `6626db967` and `86493e801` as not-applicable.
- Result: Code ligatures are disabled without changing copy text. Prose-only contextual RLM runs become equal-length ZWNJ runs after safe entity decoding, while other direction marks and literal content remain intact. None of these five commits changes the foliate-js gitlink.
- Evidence: focused authored-text browser regressions (PASS, 3/3); existing sanitizer, literal TXT, and fenced-code regressions (PASS, 3/3); `pnpm check` (PASS, 0 errors and 0 warnings); `pnpm build` (PASS); `git diff --check` (PASS); independent Terra high task review and Astra high final review (PASS).
- Evidence boundary: Transform-hook DOM tests and computed styles do not prove packaged Tauri/mobile rendering or every font's glyph output. The skip-link decisions do not claim complete accessibility parity. Russian typography and the remaining authored-layout surfaces are separate tasks.

#### Completed Task: S2-R04C2 - Keep Russian short words with their successors

- Scope: `370a51662`.
- Outcome: The existing sanitized prose walker applies the exact 50-word list and short-Cyrillic-word rule. XHTML serialization uses numeric NBSP references so DTD-less chapters remain valid XML; HTML keeps its existing output.
- Verification: `authored-text-compat.spec.ts --workers=1` (PASS, 6/6 including 3 C1 regressions); selected existing sanitizer/literal-TXT/fenced-code checks (PASS, 3/3); `pnpm check` (PASS, 0 errors/warnings); `pnpm build` (PASS); `git diff --check` (PASS). The EPUB fixture loads a real XHTML blob, preserves archive bytes, and resolves a representative raw-document CFI to the transformed range. Independent Terra high task review and Astra high final review passed.
- Evidence boundary: The primary metadata value is chosen by existing `pickText`, trimmed, lowercased, and split at the hyphen. Only `ru` enables the rule; no `rus` alias, HTML-language inference, user language override, or cross-node joining is introduced. Existing non-guarded TXT/PDF paths are unchanged. Serialized HTML length is not a CFI invariant; decoded node offsets are. No packaged Tauri/mobile, native clipboard, or full annotation-persistence acceptance is claimed.

#### Completed Task: S2-R04C3 - Recognize and safely extract footnotes

- Scope: `87f0240b0`, `b223ccaee`, `54aa20d4f`, including nested foliate `7657c78bd..2bf0cecfc`.
- Outcome: Reuse the native footnote owner for no-href vendor image-alt text and structurally validated numeric links, without turning chapter/verse indexes into popups. Resolve cross-section paths through the book, not a current-document ID lookup.
- Evidence: six real-reader footnote browser tests, six authored-text regressions, and four existing footnote/sanitizer/TXT regressions passed (16/16). After adding the no-next-block case, the footnote suite passed again (6/6); the final `.note` fixture correction passed its focused rerun (1/1). `pnpm check` (PASS, 0 errors/warnings); `pnpm build` (PASS, production source unchanged by later fixture-only edits); `git diff --check` (PASS). Independent Terra high task review and Astra high final review passed.
- Boundary: Structural validation is not a size/security limit. br1 ports the nested behavior at its active host owner without a second view; the unused sibling `FootnoteHandler` API remains unchanged. Delayed-read tests instrument the real book's `createDocument` and hold the real `next` entrypoint, not the whole renderer. Superscript-only inference, rich popup media/layout, selection anchoring, packaged Tauri/mobile, and full lifecycle stress remain unclaimed.

#### Completed Task: S2-R04C4 - Preserve footnote popup visual integrity

- Scope: `1d8ed3fc9`, `d6e981e56`, including nested foliate `f860916a2..af4f384b7`.
- Outcome: Existing native sanitization excludes authored background images, borders, and layout attributes. No production change or popup paginator is needed. `d6e981e56`'s exact custom-font/namespace ordering bug is not-applicable; source-aside hiding is not claimed.
- Nested boundary: `af4f384b7` observes `no-background`, exposes its getter, and guards background sizing/replacement. It also changes scrolled horizontal `--page-margin-left/right` from full margin plus half gap to half margin plus half gap. That unproved spacing delta keeps the parent commit partial under S2-U01B; paginated formula extraction does not prove scrolled parity.
- Verification: `pnpm exec playwright test tests/e2e/footnote-compat.spec.ts tests/e2e/authored-text-compat.spec.ts --workers=1` (PASS, 13/13 after correcting overbroad geometry assertions); `pnpm check` (PASS, 0 errors/warnings); `pnpm build` (PASS, production source unchanged by later test edits); `git diff --check` and 678-row ledger recount (PASS). Fresh Terra high task review and Astra high final review passed.
- Boundary: No rich popup media, custom-font infrastructure, source-aside hide/reveal policy, complete short-height viewport layout, packaged Tauri, or mobile acceptance. The native-popup proof covers 1280px and 640px browser widths, same/cross-chapter excerpts, stage containment, equal styled/plain sizes, and intact source DOM.

#### Completed Task: S2-R04C5 - Audit popup sizing and stale-load lifecycle

- Scope: `7c0419961`, two host/test files with no Foliate gitlink change. Retain C4's text-and-allowed-markup native popup boundary; do not import a second renderer or observer lifecycle.
- Outcome: HTML and text come from the same cleaned clone. Empty structure no longer counts as a preview or leaks removed style text through the text fallback. Explicit links keep the jump action; checked links navigate normally. CSS owns long-text sizing, and the C3 request generation guard remains unchanged.
- Verification: pre-fix browser run reproduced the empty `.footnote-body` failure. Final footnote/authored-text regressions passed 15/15 after lengthening the plaintext fixture to actually overflow; four existing footnote/sanitizer/TXT regressions also passed. `pnpm check` (PASS, 0 errors/warnings); `pnpm build` (PASS, production source unchanged by later fixture edits); `git diff --check` and 678-row recount (PASS). Fresh Terra high task review and Astra high final review passed.
- Boundary: `covered` is scoped to native text-preview equivalents. Rich image previews and late-image resizing remain unimplemented; this is not full rich-media parity. No complete short-height viewport, packaged Tauri, or mobile acceptance.

#### Completed Task: S2-R04C6 - Add a visual cue for in-page footnote landings

- Scope: `dbe0dae0a`, five host/test files with no Foliate gitlink movement.
- Outcome: One host helper consumes the actual `goTo` result for default internal links, checked-empty fallback and the popup jump action. It draws a four-second cue using the existing Overlayer drawing function, outside the annotation map. New intents invalidate pending completions; relocation, layout changes and teardown clear visual resources without modifying book content or selection.
- Verification: C6 focused tests 3/3 PASS; footnote/authored-text suites 18/18 PASS; legacy footnote/sanitizer/TXT selection 4/4 PASS (22 unique regression cases). `pnpm check` reports 0 errors and 0 warnings; `pnpm build` and `git diff --check` PASS. Fresh Terra high task review and Astra high final static review PASS. Tests cover actual navigation/geometry, post-native-navigation DOM baselines, cross-chapter ownership and held-return supersession.
- Boundary: Native popup links are stripped, so its internal-link branch is not-applicable. No search sentence-expansion, TXT/PDF cue, packaged/mobile, exhaustive native-gesture concurrency or Safari runtime zoom acceptance is claimed. Safari normalization matches the existing vendor source contract.

#### Completed Task: S2-R04C7 - Enable popup-to-book navigation

- Scope: `aab58241d492c336b682962e6302d69e7c1004dc`, four app/test files, no Foliate gitlink movement.
- Outcome: Readable native previews now expose the existing jump action. The Viewport suppresses it for original rendered targets/ancestors with computed `display:none` or `visibility:hidden`; unknown destinations keep the upstream and existing fallback policy. Stage still dismisses before issuing one href control, with C6 landing feedback. Hidden empty notes no longer promise a jump.
- Verification: C7 focused 4/4 PASS; footnote/authored-text 22/22 PASS; legacy footnote/sanitizer/TXT 4/4 PASS (26 unique cases). The initially failing short-chapter cue case passes with native anchor refresh; deadline, selection and held-return layout invalidation regressions PASS. `pnpm check` (0 errors/warnings), `pnpm build` (final production source) and `git diff --check` PASS. Fresh Terra high production/test reviews and Astra high final whole-change review PASS.
- Boundary: Unknown/unrendered/missing/error cases remain navigable, not proven visible. No preloading, alternate renderer, source-aside hiding, popup-internal links/history, rich media, selection mapping or packaged/mobile/Safari runtime acceptance.

#### Next Task: S2-R04C8 - Audit footnote selection and annotation mapping

- Scope: `631cd6454` and nested Foliate range `9fde61a10..57c9358ad`. Adjudicate native popup-to-source mapping before introducing selection or annotation controls.
- Remaining C8-C21 slices, owners, gitlink evidence, and acceptance cases are defined in the execution map above. C17's four independent IDPF cases must be implemented separately.

### S2-R05 - Polish interaction and accessibility boundaries

- Phase: Step 2
- Upstream decisions: 15 commits (0 gap, 15 partial)
- Outcome: Keep popups, click-to-paginate, keyboard activation, progress, focus, and window title behavior consistent.
- Touches: reader stage/chrome/popup components, accessibility smoke
- Verify: `pnpm check`; `keyboard/accessibility smoke`; `git diff --check`
- Commits: `31e44d2e4`, `06aec0b59`, `8a19c686c`, `f1ae05076`, `4abbc0254`, `114396b84`, `8e009cd61`, `e05b7d5bb`, `d1749feee`, `614427e82`, `561356628`, `800af00f3`, `0f913bfa6`, `5ae894735`, `da86aba6b`

### S2-R06 - Close search context and layout gaps

- Phase: Step 2
- Upstream decisions: 5 commits (0 gap, 5 partial)
- Outcome: Keep result context, options, empty/error states, and navigation stable across formats and text scale.
- Touches: search controller/sidebar search, focused tests
- Verify: `pnpm check`; `search smoke`; `git diff --check`
- Commits: `5e5564ef3`, `163487b5e`, `6b44a6227`, `b1ec4f5e9`, `8226c5545`

### S2-R07 - Triage generic reader runtime failures

- Phase: Step 2
- Upstream decisions: 4 commits (0 gap, 4 partial)
- Outcome: Reproduce retained upstream failure classes and add only the shared local guard each reproduction proves.
- Touches: runtime boundary selected by reproduction, one regression per cause
- Verify: `pnpm check`; `targeted regression`; `packaged desktop smoke`
- Commits: `193613659`, `ff94dc76c`, `6fcda66b6`, `a32646545`

### S2-R08 - Normalize page-turn and selection input

- Phase: Step 2
- Upstream decisions: 24 commits (0 gap, 24 partial)
- Outcome: Route click, wheel, swipe, drag, key combinations, and text selection through one conflict-ordered input path.
- Touches: reader stage input handling, foliate adapter, focused tests
- Verify: `pnpm check`; `pointer/keyboard smoke`; `git diff --check`
- Commits: `1e259e87b`, `07e324878`, `787bbf210`, `648c35b33`, `6dc42222e`, `7cba22ab3`, `bcd9ed724`, `e982af172`, `348c85f64`, `324bb8a36`, `70bad93eb`, `75f1fafe9`, `2e90d3719`, `bc5e6640b`, `4512f3985`, `2aa044d27`, `ecd9fce65`, `0935e02a2`, `682b4ffc2`, `fde3df92c`, `1cbab73f9`, `522e504b6`, `a91b503e5`, `2b9962a2c`

### S2-R09 - Harden image and table viewing

- Phase: Step 2
- Upstream decisions: 9 commits (1 gap, 8 partial)
- Outcome: Keep zoom, pan, gallery, descriptions, and full-page media stable without stealing page-turn gestures.
- Touches: reader media viewer and foliate media hooks, focused tests
- Verify: `pnpm check`; `image/table fixture smoke`; `desktop visual check`
- Commits: `4d1205fdf`, `e145eb835`, `7185dca1a`, `8810aa6db`, `d963b911c`, `d2668d167`, `3a0b9cac8`, `59284086c`, `279698832`

### S2-D01 - Version persisted reader configuration

- Phase: Step 2
- Upstream decisions: 2 commits (0 gap, 2 partial)
- Outcome: Add one schema version and migration path for book settings before adding more persisted fields.
- Touches: reader settings persistence and one migration test
- Verify: `pnpm check`; `settings migration test`; `reopen smoke`
- Commits: `40b7c2c15`, `0fba5b705`

### S2-F01 - Make RSVP tokenization Unicode-aware

- Phase: Step 2
- Upstream decisions: 3 commits (0 gap, 3 partial)
- Outcome: Segment CJK and punctuation correctly and calculate a stable focal position for non-Latin words.
- Touches: readingMode.ts tokenizer and tests
- Verify: `pnpm test -- readingMode`; `pnpm check`; `RSVP smoke`
- Commits: `aa60123d3`, `920627ae5`, `579e95075`

### S2-F02 - Add chapter-aware RSVP extraction and resume

- Phase: Step 2
- Upstream decisions: 3 commits (0 gap, 3 partial)
- Outcome: Window long chapters, cache extraction, retain stop position, and avoid section replay.
- Touches: readingMode.ts persisted state and tests
- Verify: `pnpm test -- readingMode`; `RSVP e2e`; `git diff --check`
- Commits: `09b19bd3c`, `6d5e59c79`, `4b0720a3e`

### S2-F03 - Finish RSVP controls and context actions

- Phase: Step 2
- Upstream decisions: 9 commits (0 gap, 9 partial)
- Outcome: Add start delay, word stepping, split-word policy, chapter progress, and dictionary lookup.
- Touches: focused-reading overlay, readingMode.ts, tests
- Verify: `pnpm check`; `RSVP keyboard smoke`; `git diff --check`
- Commits: `c9647276b`, `d53f3b42e`, `ba6e5899e`, `89723b421`, `cf41e7d50`, `be17654fc`, `23d1ef6f1`, `66ade3809`, `e659976cc`

### S2-F04 - Add a line-aware reading ruler

- Phase: Step 2
- Upstream decisions: 6 commits (0 gap, 6 partial)
- Outcome: Add line-aware selection and stepping that stays anchored while scrolling or repaginating and follows vertical writing direction.
- Touches: focused-reading overlay, foliate layout bridge, reading-mode tests
- Verify: `pnpm check`; `reading-ruler e2e`; `vertical-writing fixture smoke`
- Commits: `9ecb9b24d`, `789d03122`, `97191a57c`, `49391124c`, `c1a3b2b92`, `d0867d729`

### S2-F05 - Harden paragraph focus lifecycle and presentation

- Phase: Step 2
- Upstream decisions: 5 commits (0 gap, 5 partial)
- Outcome: Preserve authored paragraph layout and fonts while making toggle, exit, resume, and listener cleanup deterministic.
- Touches: focused-reading overlay, readingMode.ts, reader lifecycle tests
- Verify: `pnpm check`; `paragraph-mode e2e`; `repeated chapter-switch smoke`
- Commits: `888f4afde`, `755bee1ee`, `942095bcd`, `bc9b8b23e`, `f598c9ed6`

### S2-T01 - Make TTS transitions race-safe

- Phase: Step 2
- Upstream decisions: 5 commits (0 gap, 5 partial)
- Outcome: Serialize rapid actions and ignore stale preload/runtime callbacks.
- Touches: tts.ts, ttsRuntime.ts, ownership helpers, tests
- Verify: `pnpm test -- tts`; `pnpm check`; `rapid-action smoke`
- Commits: `21795e5cd`, `b679817fc`, `9c273d79f`, `4cd5d56b4`, `a7b8deb9f`

### S2-T02 - Add spoken-range highlighting

- Phase: Step 2
- Upstream decisions: 7 commits (7 gap, 0 partial)
- Outcome: Track sentence/word ranges and clear stale overlays on stop or retarget.
- Touches: TTS runtime event contract, reader overlay, tests
- Verify: `pnpm test -- tts`; `pnpm check`; `browser speech smoke`
- Commits: `b71b24660`, `1f5481c0e`, `ef603852b`, `a56cc6c61`, `4874eb9ae`, `b50ff9374`, `fabbcc640`

### S2-T03 - Align TTS extraction and section movement

- Phase: Step 2
- Upstream decisions: 5 commits (0 gap, 5 partial)
- Outcome: Skip hidden/PDF line-break artifacts, turn sections safely, and retain playback location.
- Touches: text extraction, TTS target builder, EPUB/PDF fixtures
- Verify: `pnpm check`; `EPUB/PDF TTS smoke`; `git diff --check`
- Commits: `a5690e9a8`, `fed8ab7b6`, `f4483643f`, `fa2e9cdc5`, `1d4b7eed8`
- Nested obligation from S2-R04B: audit/port foliate `3c597a6dc` rejected-block filtering when aligning the TTS extraction owner; prove background footnote subtrees cannot leak into adjacent speech blocks. The TXT scene-break part of the outer commit is already covered.

### S2-T04A - Stabilize TTS voice and timing

- Phase: Step 2
- Upstream decisions: 6 commits (0 gap, 6 partial)
- Outcome: Keep voice lists, rate, sentence/paragraph gaps, and pause timing deterministic.
- Touches: TTS runtime/settings and focused tests
- Verify: `pnpm test -- tts`; `pnpm check`; `manual voice smoke`
- Commits: `c72afe269`, `42f9b8fe3`, `4fcc8d10f`, `db38e2a7b`, `33600cf30`, `9213c6af1`

### S2-T04B - Finish TTS player controls

- Phase: Step 2
- Upstream decisions: 23 commits (0 gap, 23 partial)
- Outcome: Complete shortcut navigation, compact player state, and persisted playback settings.
- Touches: playback panel, TTS settings, focused tests
- Verify: `pnpm test -- tts`; `pnpm check`; `player smoke`
- Commits: `5f897f648`, `cc618b873`, `e327d0c99`, `b87c735c1`, `843ab3448`, `17de9357d`, `213f8ac76`, `c8a3f85a8`, `b6c994413`, `e7af44379`, `d440df50e`, `01dabc69d`, `f3930b814`, `d1ab15c0f`, `201868e26`, `4f44b79ec`, `c1b0a4ecd`, `22308485f`, `786230a93`, `9c103d426`, `7fa3daa19`, `c04ba5a80`, `341119e5e`

### S2-A01A - Harden annotation anchors and grouping

- Phase: Step 2
- Upstream decisions: 5 commits (0 gap, 5 partial)
- Outcome: Resolve chapter grouping, CFI/location mapping, and reopen anchors consistently.
- Touches: annotation sidebar/controller, foliate anchors, tests
- Verify: `pnpm check`; `annotation-anchor smoke`; `git diff --check`
- Commits: `94843902a`, `7f57af8f9`, `c5d596d89`, `0254e13a4`, `7e998d384`

### S2-A01B - Harden selection and annotation popups

- Phase: Step 2
- Upstream decisions: 14 commits (0 gap, 14 partial)
- Outcome: Keep selection text, toolbar actions, popup re-entry, and copy behavior coherent.
- Touches: selection popup/controller and focused tests
- Verify: `pnpm check`; `selection-popup smoke`; `git diff --check`
- Commits: `41b5e9256`, `8e7b2192d`, `ad23fbba9`, `67c22c770`, `7da5f8321`, `44a6900da`, `56e4faa5d`, `eb95677dc`, `76b2d83b1`, `d8abda158`, `b1bafcaf4`, `ada70fc2f`, `69872d372`, `59cb6a776`

### S2-A01C - Harden note and highlight lifecycle

- Phase: Step 2
- Upstream decisions: 27 commits (0 gap, 27 partial)
- Outcome: Clear stale overlays and handle create, edit, resize, cancel, and delete deterministically.
- Touches: note/highlight controllers and focused tests
- Verify: `pnpm check`; `note/highlight smoke`; `git diff --check`
- Commits: `a2d17e6a7`, `ae2c42193`, `4abbc17f6`, `ec3261453`, `528a13e36`, `34f19fd14`, `fb37406b3`, `1a3d393e7`, `28a7785e5`, `ae81cd015`, `7bdd3ecde`, `578b7ba14`, `d165e8df2`, `12ac7ae6c`, `1ce79d9ab`, `0f0b4279a`, `ff96c6d3f`, `acd4a67dc`, `0589cb4f4`, `01a54238a`, `be5f07ef8`, `f77b56c85`, `dbcae8b22`, `e83fec7f2`, `7a7ab7642`, `12af2050d`, `6df90139d`

### S2-A02 - Add annotation exchange and deep links

- Phase: Step 2
- Upstream decisions: 11 commits (11 gap, 0 partial)
- Outcome: Export/import versioned local JSON and resolve optional book-location links without cloud sharing.
- Touches: annotation services, import/export UI, anchor tests
- Verify: `pnpm check`; `round-trip test`; `malformed-input test`
- Commits: `486659a1c`, `c27245e98`, `411d3ad68`, `3620c6103`, `3c134380b`, `2f5e58365`, `dced42912`, `8c91ad411`, `9ec7b3df9`, `55691602b`, `a5da9291f`

### S2-A03 - Improve built-in dictionary lookup

- Phase: Step 2
- Upstream decisions: 13 commits (0 gap, 13 partial)
- Outcome: Normalize queries, add Chinese/pinyin and lemma fallback, and recover after empty results.
- Touches: assistance domain/service, result UI, tests
- Verify: `pnpm check`; `assistance tests`; `mocked lookup smoke`
- Commits: `017a9338b`, `a272ba892`, `8dfc0e945`, `390c71107`, `aab721b21`, `140b71ee3`, `4527aa277`, `45466bc6b`, `dbd7d2ac3`, `086498326`, `420f65fc9`, `256685bc3`, `07306093e`

### S2-A04 - Add one local dictionary format

- Phase: Step 2
- Upstream decisions: 8 commits (8 gap, 0 partial)
- Outcome: Import one local dictionary format through the shared lookup contract before adding more formats.
- Touches: Tauri dictionary parser/storage, assistance facade, import UI
- Verify: `cargo test dictionary`; `pnpm check`; `local lookup smoke`
- Commits: `5a0a70a30`, `7bb113370`, `30dee7b90`, `93abca896`, `6605ae824`, `5a2be9abe`, `98c68d6b4`, `771b152e5`

### S2-A05 - Preserve structure and errors in translation

- Phase: Step 2
- Upstream decisions: 12 commits (0 gap, 12 partial)
- Outcome: Keep inline formatting/direction, map provider languages, and show actionable failures.
- Touches: translation bridge, inlineTranslation.ts, assist UI, tests
- Verify: `pnpm check`; `translation tests`; `mocked provider smoke`
- Commits: `298d4872a`, `f4bb11126`, `eaf307e71`, `8c212e5b8`, `b99bea307`, `0fb889710`, `2b719600c`, `28687314b`, `552777e09`, `9fb8266bf`, `a4358d22e`, `e782af530`

### S2-A06 - Ship one real AI reading conversation

- Phase: Step 2
- Upstream decisions: 4 commits (4 gap, 0 partial)
- Outcome: Connect the notebook ownership model to one configured LLM and current-book context with citations.
- Touches: Tauri model config, assistant service, ReaderNotebook, tests
- Verify: `pnpm check`; `Rust boundary tests`; `mocked conversation smoke`
- Commits: `6bc4a96b9`, `5c71ccb90`, `a86b09dba`, `e0ce6c8c2`

### S2-A07 - Add one AI transformation action

- Phase: Step 2
- Upstream decisions: 13 commits (13 gap, 0 partial)
- Outcome: Implement one inspectable transfer or adversarial-debate action over selected text.
- Touches: assistant prompt/action model, notebook UI, contract test
- Verify: `pnpm check`; `prompt contract test`; `mocked notebook smoke`
- Commits: `d66fedcab`, `490824504`, `8bcb9f9b2`, `a6d28ffcd`, `b1346bf16`, `5bc8eda50`, `6fd1fc42e`, `27d7a45d9`, `4c523f75e`, `5ecb835c3`, `1ee7ca22d`, `0306e3470`, `8d44c6b66`

### S2-L01 - Add bounded folder import

- Phase: Step 2
- Upstream decisions: 10 commits (10 gap, 0 partial)
- Outcome: Preview supported files, enforce format/size limits, and reuse trusted single-file import.
- Touches: Tauri library commands, import UI, fixtures
- Verify: `cargo test library import`; `pnpm check`; `folder-import smoke`
- Commits: `5dc252845`, `d943a1c14`, `5ac8564e4`, `ff605e000`, `c8e2c9533`, `3c154a609`, `8a259d332`, `08f373152`, `4bcfcddf2`, `130813a07`

### S2-L02 - Keep large libraries responsive

- Phase: Step 2
- Upstream decisions: 2 commits (0 gap, 2 partial)
- Outcome: Measure current behavior and virtualize the repeated book surface only if the threshold fails.
- Touches: library browse body, generated large-library fixture
- Verify: `pnpm check`; `large-library timing check`; `git diff --check`
- Commits: `030a7c082`, `f86bbbcc2`

### S2-L03 - Expand series and file metadata

- Phase: Step 2
- Upstream decisions: 9 commits (0 gap, 9 partial)
- Outcome: Normalize series metadata and provenance for EPUB/PDF/CBZ/FB2.
- Touches: Tauri metadata parser/model, library projection, fixtures
- Verify: `cargo test library metadata`; `pnpm check`; `metadata smoke`
- Commits: `74401fc1b`, `88d8aa285`, `5a8f0873f`, `675ee78bc`, `757ed8066`, `af587b1a4`, `be5862f08`, `4ba78490a`, `15b3d289e`

### S2-L04 - Add versioned local backup

- Phase: Step 2
- Upstream decisions: 2 commits (2 gap, 0 partial)
- Outcome: Archive live metadata, settings, notes, highlights, and bookmarks with dry-run restore.
- Touches: Tauri export/import commands, settings UI, fixtures
- Verify: `cargo test backup`; `pnpm check`; `malformed archive rejection`
- Commits: `52f963481`, `ded443512`

### S2-L05 - Harden library persistence and migration

- Phase: Step 2
- Upstream decisions: 9 commits (0 gap, 9 partial)
- Outcome: Prevent partial saves, preserve external files, normalize managed paths, and recover startup/migration state safely.
- Touches: libraryPersistence.ts, Tauri library commands, focused recovery tests
- Verify: `pnpm check`; `cargo test library`; `recovery smoke`
- Commits: `336a719e0`, `f9ddddb6a`, `1c392de0f`, `fa120081a`, `ab935f851`, `acf2b165f`, `920286484`, `4171f45bd`, `aa619f8f8`

### S2-L06 - Finish library sort and shelf projections

- Phase: Step 2
- Upstream decisions: 7 commits (0 gap, 7 partial)
- Outcome: Add secondary sort, status/progress grouping, recent shelf rules, and stable derived ordering.
- Touches: library controller/projection and focused tests
- Verify: `pnpm check`; `library projection tests`; `browser smoke`
- Commits: `2a49e93cf`, `ce0ab5cc6`, `4d08b01b4`, `4d645befd`, `47f0a52b3`, `aa08ce95f`, `82658d8ed`

### S2-L07 - Polish library selection and menu behavior

- Phase: Step 2
- Upstream decisions: 21 commits (0 gap, 21 partial)
- Outcome: Keep context menus, select-mode bars, long press, cover fit, breadcrumbs, and return transitions stable.
- Touches: library browse components and focused interaction tests
- Verify: `pnpm check`; `library interaction smoke`; `visual desktop check`
- Commits: `16adf1125`, `7bf4822b2`, `2d30868d2`, `315d144d8`, `a1cb228d0`, `4e01e13ee`, `bed31e818`, `963bab0f0`, `d5c02e625`, `799fc0e0a`, `7d1a60b9e`, `cc7a3938a`, `5f0105259`, `09548d998`, `a8aa982c8`, `47cd7b401`, `d843df6b6`, `ac757777d`, `bc4b253b6`, `ad9e5c1b8`, `d49fd8ba5`

### S2-L08 - Expand library search and book details

- Phase: Step 2
- Upstream decisions: 4 commits (0 gap, 4 partial)
- Outcome: Add scoped full-text search and the smallest useful detail fields without introducing cloud transfer controls.
- Touches: library search/projection and details surface, tests
- Verify: `pnpm check`; `library search smoke`; `git diff --check`
- Commits: `a6a3e1499`, `b92153f19`, `d7ad9fe56`, `4549a026d`

### S2-O01 - Add allowlisted live OPDS fetching

- Phase: Step 2
- Upstream decisions: 6 commits (0 gap, 6 partial)
- Outcome: Move requests into Tauri, validate redirects/DNS, bound responses, and reject private-network SSRF.
- Touches: Tauri catalog client, renderer facade, mocked tests
- Verify: `cargo test catalogs`; `pnpm check`; `SSRF rejection tests`
- Commits: `966f5e2ac`, `45bd35598`, `48d8a25d3`, `b18a2cee4`, `f45036556`, `8f9028579`

### S2-O02A - Harden OPDS feed parsing

- Phase: Step 2
- Upstream decisions: 25 commits (0 gap, 25 partial)
- Outcome: Cover mixed feeds, leading whitespace, descriptions, imported state, and search metadata.
- Touches: catalog parser and feed fixtures
- Verify: `cargo test catalogs`; `pnpm check`; `feed fixture matrix`
- Commits: `f67930feb`, `6fbf9ef68`, `708e06a46`, `d2ff47029`, `4c539e6be`, `fe853554a`, `1eaf16ffc`, `8425d0b91`, `1e26c5d76`, `a30a310a1`, `b9a3ee725`, `e2f65278e`, `ac6249cbc`, `fb943987e`, `fcdc6567e`, `2c6729962`, `e1ed88bea`, `20a073391`, `11ae9e135`, `ffdcfca0a`, `dd6ad542d`, `63341d45f`, `df2989e43`, `4f1850563`, `076556bd3`

### S2-O02B - Harden catalog download filenames

- Phase: Step 2
- Upstream decisions: 3 commits (0 gap, 3 partial)
- Outcome: Parse quoted/encoded Content-Disposition values and preserve safe local names.
- Touches: catalog download parser and filename fixtures
- Verify: `cargo test catalogs`; `pnpm check`; `filename fixture matrix`
- Commits: `41d014914`, `bd866cb04`, `f726ebf82`

### S2-O03 - Finish catalog editing and headers

- Phase: Step 2
- Upstream decisions: 2 commits (2 gap, 0 partial)
- Outcome: Edit sources and store redacted custom headers only in Tauri-owned records.
- Touches: catalog model/commands, manager UI, tests
- Verify: `cargo test catalogs`; `pnpm check`; `catalog edit smoke`
- Commits: `c6daf72da`, `ea30bbae7`

### S2-O04 - Add advanced OPDS navigation

- Phase: Step 2
- Upstream decisions: 7 commits (7 gap, 0 partial)
- Outcome: Implement facets and OPDS 2 first; defer streaming/auto-download until a source requires them.
- Touches: catalog parser/navigation, fixtures
- Verify: `cargo test catalogs`; `pnpm check`; `facet smoke`
- Commits: `38d7ba80f`, `ca8f0fe9f`, `c5a1a3afe`, `d12e1ad08`, `e7f0b53bd`, `34922b172`, `f7f8a830d`

### S2-M01 - Add Markdown as a managed format

- Phase: Step 2
- Upstream decisions: 8 commits (8 gap, 0 partial)
- Outcome: Parse frontmatter, headings, and footnotes without rendering raw HTML.
- Touches: format route, import metadata, text renderer, fixtures
- Verify: `cargo test markdown`; `pnpm check`; `Markdown smoke`
- Commits: `24370ca51`, `3ac1a1a45`, `9c6081402`, `d40bf5ba7`, `46e75586f`, `05d289a4e`, `841b3639b`, `1fa25f7ae`

### Completed Task: S2-S01 - Audit HTML and TXT sanitization

- Phase: Step 2
- Result: `covered` by a literal, escaped TXT renderer and one shared DOMPurify guard before Foliate turns EPUB-family HTML/SVG resources into iframe content.
- Evidence: `pnpm check` (PASS); `pnpm test:reader-helpers` (PASS, 71/71); full browser e2e with one worker, including malicious TXT/Foliate fixtures and format/footnote compatibility (PASS, 78/78).
- Audit correction: the cloud-download logging fix `6072b0dcb` is `not-applicable`; Persian/Arabic RLM-to-ZWNJ shaping `2f9262e02` remains `partial` under `S2-R04C`.
- Commits: `13ff96db8`, `6072b0dcb`, `dc788283a`, `e43e533ac`, `005aa2d61`, `2f9262e02`

### Completed Task: S2-S02 - Audit Tauri command scopes

- Phase: Step 2
- Result: both upstream decisions are `not-applicable` because br1 has no generic renderer-directed `download_file`/`upload_file` surface.
- Filesystem audit: persistence keys are hashed into `AppHandle.path()` roots; library reads require canonical managed/trusted paths; imports require a native-dialog or persisted-record grant; snapshot paths come only from native file dialogs.
- Catalog audit: executable acquisitions are fixed bundled fixtures, filenames are sanitized and prefixed with a hashed acquisition key under app data, and configured live URLs are not proxied or downloaded.
- Capability audit: the production capability grants native open-dialog access but no generic filesystem plugin permission.
- Evidence: `cargo test --manifest-path src-tauri/Cargo.toml --lib` (PASS, 47/47); `cargo check --manifest-path src-tauri/Cargo.toml` (PASS); targeted desktop untrusted-path and associated-open boundary regressions (PASS, 2/2); fresh command/capability review (PASS, no findings).
- Commits: `4025c4d7b`, `446c2c72d`

### Completed Task: S2-S03 - Audit persisted window state

- Phase: Step 2
- Result: `not-applicable` because br1 has no persisted native window geometry to sanitize before startup.
- Dependency evidence: neither the Rust nor frontend manifests/locks include `tauri-plugin-window-state`, and the Tauri bootstrap registers no equivalent plugin.
- Runtime evidence: the main window uses the static `800x600` Tauri configuration; reader windows are constructed with explicit fresh `1480x920` dimensions and centering rather than restored coordinates.
- Evidence: `cargo test --manifest-path src-tauri/Cargo.toml --lib` (PASS, 47/47); `cargo check --manifest-path src-tauri/Cargo.toml` (PASS); `pnpm check` (PASS, 0 errors and 0 warnings); `bash scripts/automation/test-tauri-webdriver.sh pnpm exec wdio run wdio.conf.ts --mochaOpts.grep "shows the library route by default|can execute JavaScript inside the desktop webview"` (PASS, 2/2 normal-startup checks, not geometry-state evidence); fresh applicability review (PASS after wording corrections).
- Deferred boundary: if br1 later adopts native window geometry persistence, invalid/sentinel coordinates and zero-size state must be rejected before restore.
- Commits: `bc9fe67ab`

### Completed Task: S2-S04 - Document the br1 trust model

- Phase: Step 2
- Result: `covered` by a root security policy grounded in br1's current local-first Tauri architecture rather than Readest's account and cloud assumptions.
- Boundaries: documents protected assets, trusted components, untrusted books/snapshots/provider data, native filesystem grants, renderer-to-Rust commands, persistence, third-party data flows, and supply-chain limits.
- Honest gaps: records the null CSP, Foliate iframe and authored-resource egress limits, plaintext local state, non-enforced HTTPS for operator sync URLs, missing parser/resource hardening, and incomplete release-security policy.
- Evidence: source audit of Tauri capabilities and command registration, path validation, book sanitization, persistence locations, restore rollback, provider credentials/endpoints, and lockfiles (PASS); `cargo test --manifest-path src-tauri/Cargo.toml --lib` (PASS, 47/47); `cargo check --manifest-path src-tauri/Cargo.toml` (PASS); `pnpm check` (PASS, 0 errors and 0 warnings); GitHub private-report URL check (PASS, HTTP 200); `git diff --check` (PASS); fresh security-boundary review (4 accuracy findings corrected; fix re-review PASS, no remaining substantive findings).
- Commits: `82deb85c6`

### S2-U01A - Consolidate theme and background settings

- Phase: Step 2
- Upstream decisions: 23 commits (0 gap, 23 partial)
- Outcome: Keep reader/library scope, PDF opt-in, textures, colors, and persistence coherent.
- Touches: theme/background settings and persistence tests
- Verify: `pnpm check`; `theme persistence smoke`; `visual desktop check`
- Commits: `52df478f2`, `8e6451863`, `96678d85e`, `3f531d904`, `176e5df77`, `cead0f42e`, `176b950c9`, `fe7fe2548`, `9d8062ae2`, `ee01fcd12`, `852d0ae3e`, `0ab8f6042`, `f7124cbee`, `a0227f98e`, `2b524439b`, `6391bfe78`, `9fb50880e`, `7f01d2b4f`, `bd63d72e0`, `7b12f1906`, `5e2836b08`, `01e2b6ba9`, `5755f25d7`

### S2-U01B - Consolidate typography and spacing settings

- Phase: Step 2
- Upstream decisions: 20 commits (0 gap, 20 partial), including the remaining nested margin obligation from `1d8ed3fc9`.
- Outcome: Keep fonts, authored paragraph overrides, margins, columns, and readable limits coherent.
- Touches: typography/layout settings and persistence tests
- Verify: `pnpm check`; `typography smoke`; `visual desktop check`
- Commits: `e9c5ebb69`, `e9d71b293`, `c58153e94`, `1d8ed3fc9`, `a43845b4c`, `49b171f5e`, `e8675fb7e`, `c2bbb6119`, `5cab1fa94`, `97868f048`, `fd8fbb178`, `0c24aad60`, `fdd13a5a6`, `0e125b156`, `eacb517de`, `46947af4b`, `ca2c1298b`, `9700e59cd`, `181ac99a8`, `13e027286`
- Nested follow-up: Reproduce scrolled horizontal `--page-margin-left/right` consumers for `af4f384b7` before porting its half-margin formula. Audit beside `a43845b4c`, without assuming the latter supersedes or covers it. C4's popup-background proof is independent.

## Verification

- Queue source: 678 rows parsed from the two-step plan.
- Commit evidence: each short hash resolved to one commit and its touched paths in the local Readest range.
- Invariant: all 678 rows have one valid status; all non-covered task references resolve to a task above.

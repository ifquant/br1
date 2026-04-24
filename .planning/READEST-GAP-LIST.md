# Readest Gap List

Date: 2026-04-25

## Audit Method

This audit was produced by source-reading the local `br1` and `readest` repos side by side.

Compared `readest` surfaces:

- library page and library components
- reader page, shell, sidebar, notebook, AI assistant, translation, TTS, and sync hooks
- OPDS browser and catalog manager

Compared `br1` surfaces:

- library route, header, shelf, and desktop page wiring
- reader route, header, footer, sidebar, viewport, assistance, TTS, and KOReader sync wiring
- Tauri catalog, snapshot, and remote-sync command surfaces

This document is intentionally product-surface focused. It does not reopen already-closed trust-boundary work unless the remaining gap is blocked on productization.

## Confirmed Strengths

- `br1` has already closed the first large Readest alignment line for trusted local-library ingest, desktop reader flow, reading-state persistence, and multi-format support.
- `br1` library homepage parity is materially stronger now: top toolbar, shelf hierarchy, filter sections, continue/recent rules, and Readest-migration summary semantics are no longer the main missing frontier.
- `br1` already has meaningful substrate for translation, KOReader exchange/progress sync, local/remote snapshot sync, and OPDS/Calibre catalog commands, so several remaining gaps are productization gaps rather than missing backend foundations.

## Gaps By Category

### Library

| Priority | Gap | Readest evidence | br1 evidence | Impact | Recommended slice |
|---|---|---|---|---|---|
| P1 | Library operations are still not productized as one desktop control surface | [`page.tsx`](/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/library/page.tsx), [`SettingsMenu.tsx`](/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/library/components/SettingsMenu.tsx), [`BackupWindow.tsx`](/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/library/components/BackupWindow.tsx), and [`MigrateDataWindow.tsx`](/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/library/components/MigrateDataWindow.tsx) expose backup/restore, root-dir migration, metadata refresh, fullscreen, always-on-top, and related desktop operations from the library shell itself. | [`LibraryHeader.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library/LibraryHeader.svelte) exposes import, sort/filter, snapshot sync, KOReader exchange, and remote sync, but there is no equivalent product surface for backup/restore, data-root migration, metadata refresh, or broader desktop-library operations. | `br1` library now reads like a strong bookshelf, but not yet like a full desktop reading hub with the same operational depth as Readest. | Add a `library operations` wave that unifies backup/restore, library-root migration, metadata refresh, and desktop toggles behind one intentional library menu/dialog system. |
| P2 | Transfer queue is missing as a first-class library support surface | [`TransferQueuePanel.tsx`](/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/library/components/TransferQueuePanel.tsx) is a dedicated visible product surface in the library shell. | There is no corresponding `transfer queue` UI under [`src/lib/components/library`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/library); current library surface does not expose a comparable queue/workflow panel. | Desktop import/download/sync work remains less inspectable and less recoverable for users handling many books. | Add a focused desktop queue slice instead of hiding transfer-like work inside notices or one-shot actions. |
| P2 | Catalog browsing exists as substrate, not as a real library product area | Readest ships a dedicated OPDS browser and catalog manager through [`page.tsx`](/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/opds/page.tsx) and [`CatelogManager.tsx`](/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/opds/components/CatelogManager.tsx). | `br1` has typed catalog models and Tauri commands in [`catalogs.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/services/catalogs.ts) and [`catalogs.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/catalogs.rs), but no equivalent Svelte route or catalog-management UI under [`src`](/Users/dev/workspace2/hc_apps/br1/src). | This leaves a visible parity hole: Readest users can browse/manage catalogs as a product feature, while `br1` still only has the lower layer. | Build a dedicated catalog browser/manager flow on top of the existing Tauri-owned catalog substrate. |

### Reader

| Priority | Gap | Readest evidence | br1 evidence | Impact | Recommended slice |
|---|---|---|---|---|---|
| P1 | Reader lacks a notebook-grade secondary workspace | Readest has a distinct notebook workspace in [`Notebook.tsx`](/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/components/notebook/Notebook.tsx) with tabs, search, note editing, pinning, resizing, and overlay behavior separate from the ordinary sidebar. | `br1` centralizes notes/bookmarks/highlights inside [`ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte), but does not expose a separate notebook/workbench surface. | The current `br1` reader still feels like one growing sidebar, while Readest feels like a multi-workspace reading product. | Add a notebook/workbench phase before doing more cosmetic chrome work. |
| P1 | AI reading assistant is still much shallower than Readest’s notebook-integrated assistant | Readest’s [`AIAssistant.tsx`](/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/components/notebook/AIAssistant.tsx) is a real conversational workspace with thread/history/indexing semantics. | `br1` has assistance domain/types in [`assistance.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/assistance.ts) and an `assist` tab in [`ReaderSidebar.svelte`](/Users/dev/workspace2/hc_apps/br1/src/lib/components/reader/ReaderSidebar.svelte), but it remains provider-request/result UI, not a notebook-grade AI workspace. | This is now a structural parity gap, not a polish gap. The user-facing shape of the reading assistant is materially different. | Treat AI assistant parity as a separate reader-workspace wave, likely after notebook infrastructure exists. |
| P1 | Translation is request-based, not a full reading-surface translation mode | Readest’s [`useTextTranslation.ts`](/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/hooks/useTextTranslation.ts) translates visible text blocks inline inside the reader surface and manages translation visibility/observation state. | `br1` supports translation providers and assistance requests through [`assistance.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/assistance.ts) and the sidebar, but it does not expose an equivalent inline translated-reading mode. | Readest supports “translated reading” as a mode of reading. `br1` currently supports “translation lookup” as a side action. | Add a dedicated reader translation-mode slice instead of extending the assist tab further. |
| P2 | TTS runtime and follow behavior are still much lighter than Readest | Readest’s [`useTTSControl.ts`](/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/hooks/useTTSControl.ts) manages media session, highlight following, back-to-current-location state, timeout handling, and translation-aware TTS behavior. | `br1` TTS in [`tts.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/reader/tts.ts) gives a solid session model and Web Speech runtime, but it remains a smaller control surface with less follow/relocation/media-session depth. | TTS parity is now less about “has speech” and more about whether it behaves like a full reading mode. | Add a `reader TTS productization` slice focused on follow mode, relocation, media session, and translated/source reading semantics. |
| P2 | Reader-side sync control surfaces are still incomplete | Readest has explicit user-facing hooks/surfaces for Readwise sync and KOReader sync settings in [`useReadwiseSync.ts`](/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/hooks/useReadwiseSync.ts) and [`KOSyncSettings.tsx`](/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/reader/components/KOSyncSettings.tsx). | `br1` has substantial sync substrate and KOReader exchange/progress actions, but there is no equivalent reader-facing settings/control surface for Readwise-style highlight sync or rich KOReader sync configuration. | Sync exists in `br1`, but it is still closer to infrastructure plus library actions than to an integrated reader product feature. | Add a `reader sync controls` slice after notebook/TTS/translation priorities are settled. |

### Ecosystem / Desktop

| Priority | Gap | Readest evidence | br1 evidence | Impact | Recommended slice |
|---|---|---|---|---|---|
| P1 | OPDS/ecosystem browsing is a shipped product in Readest but not yet in br1 | Readest’s [`page.tsx`](/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/opds/page.tsx) and [`CatelogManager.tsx`](/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/opds/components/CatelogManager.tsx) provide saved catalogs, popular catalogs, browse history, search, acquisition handling, and dedicated navigation. | `br1` exposes the safe catalog substrate through [`catalogs.rs`](/Users/dev/workspace2/hc_apps/br1/src-tauri/src/commands/catalogs.rs) and [`catalogs.ts`](/Users/dev/workspace2/hc_apps/br1/src/lib/services/catalogs.ts), but there is no desktop-visible catalog browser route or manager UI. | This is the clearest “substrate exists but product surface is missing” gap outside the reader itself. | Plan a dedicated `catalog browser` phase that uses the existing Tauri trust boundary instead of inventing new transport. |
| P2 | Readest’s desktop support story is broader than br1’s current visible desktop affordances | Readest library-level settings/menu surfaces combine updater, profile, queue, backup, migration, fullscreen, always-on-top, telemetry, and storage-related operations through [`SettingsMenu.tsx`](/Users/dev/workspace2/hc_apps/readest/apps/readest-app/src/app/library/components/SettingsMenu.tsx). | `br1` has many of the lower-level desktop abilities scattered across Tauri commands or not yet surfaced, but the visible product shell does not offer the same breadth of desktop management affordances. | The parity gap is now less about correctness and more about “does the desktop app feel complete.” | Fold desktop affordances into a deliberate `desktop support surfaces` phase instead of leaving them as hidden capabilities or deferred utilities. |

## Recommended Next Planning Inputs

The next execution plan should not restart from generic “Readest parity.” It should assume:

- library homepage parity is substantially closed
- trust-boundary and sync hardening are no longer the main visible frontier
- the highest-value remaining work is productization of reader workspaces and desktop support surfaces

Recommended planning order:

1. `P5 Reader Workspace Parity`
   - notebook workspace
   - AI assistant workspace
   - translation as a reading mode
   - TTS productization

2. `P6 Library Operations And Desktop Support`
   - library operations menu/dialog system
   - backup/restore and data-root migration surfacing
   - transfer queue surface
   - desktop support affordances

3. `P7 Catalog And Ecosystem Productization`
   - OPDS/catalog manager route
   - catalog browsing/search/import UX on top of the existing Tauri substrate
   - only after that, reconsider additional ecosystem providers

## Explicitly Out Of Scope

- Reopening already-closed file trust-boundary work without a new concrete regression.
- Replacing the current checklist with a second status ledger.
- Claiming protocol parity for unsupported Readest integrations that `br1` has not productized yet.

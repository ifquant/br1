<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { page } from '$app/stores';
  import { ReaderSidebar, ReaderStage } from '$lib/components';
  import type {
    ReaderControlRequest,
    ReaderPreviewState,
    ReaderSidebarCallbacks,
    ReaderSearchResult,
    ReaderTocItem
  } from '$lib/reader';
  import {
    createReaderNotesController,
    createReaderSearchController,
    createReaderSidebarController
  } from '$lib/reader';
  import { startCurrentWindowDrag, updateLibraryReadingState } from '$lib/services';
  import { canPersistReaderNotes, clearReaderSearchCache, loadReaderNotes, saveReaderNotes } from '$lib/services';

  let toc: ReaderTocItem[] = [];
  let activeHref = '';
  let controlRequest: ReaderControlRequest | null = null;
  let controlNonce = 0;
  let lastAutoKey = '';
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  $: source = $page.url.searchParams.get('source') ?? '';
  $: sourceUrl = $page.url.searchParams.get('url') ?? '';
  $: sourcePath = $page.url.searchParams.get('path') ?? '';
  $: sourceLabel = $page.url.searchParams.get('label') ?? '';
  $: sourceFraction = Number($page.url.searchParams.get('fraction') ?? '');
  $: sourceLocation = $page.url.searchParams.get('location') ?? '';
  $: isWindowMode = $page.url.searchParams.get('mode') === 'window';
  $: autoOpenPicker = source === 'picker';
  $: autoOpenAsset = source === 'asset' && !!sourceUrl;
  $: autoOpenLibraryFile = source === 'library-file' && !!sourcePath;
  $: readerBookKey = sourcePath || sourceUrl || sourceLabel || 'default';
  $: notesStorageKey = `br1.reader.notes:${readerBookKey}`;

  $: autoOpenKey = autoOpenLibraryFile
    ? `${source}:${sourcePath}:${sourceLabel}:${sourceLocation}:${Number.isFinite(sourceFraction) ? sourceFraction : ''}`
    : autoOpenAsset
      ? `${source}:${sourceUrl}:${sourceLabel}`
      : source;

  $: if (autoOpenAsset && autoOpenKey !== lastAutoKey) {
    controlNonce += 1;
    controlRequest = {
      type: 'asset',
      nonce: controlNonce,
      url: sourceUrl,
      label: sourceLabel || 'imported book'
    };
    lastAutoKey = autoOpenKey;
  }

  $: if (autoOpenLibraryFile && autoOpenKey !== lastAutoKey) {
    controlNonce += 1;
    controlRequest = {
      type: 'library-file',
      nonce: controlNonce,
      path: sourcePath,
      label: sourceLabel || 'imported book',
      restoreFraction: Number.isFinite(sourceFraction) ? sourceFraction : undefined,
      restoreLocation: sourceLocation || undefined
    };
    lastAutoKey = autoOpenKey;
  }

  $: if (!autoOpenAsset && !autoOpenLibraryFile) {
    lastAutoKey = '';
  }

  const issueHrefControl = (href: string) => {
    controlNonce += 1;
    controlRequest = { type: 'href', href, nonce: controlNonce };
  };

  const searchController = createReaderSearchController({
    getStorage: () => (typeof localStorage === 'undefined' ? undefined : localStorage),
    getHistoryKey: () => {
      const bookKey = sourcePath || sourceUrl || sourceLabel || 'default';
      return `br1.reader.search.history:${bookKey}`;
    },
    dispatchSearch: (query, config) => {
      controlNonce += 1;
      controlRequest = { type: 'search', nonce: controlNonce, query, config };
    },
    dispatchSearchResult: (cfi) => {
      controlNonce += 1;
      controlRequest = { type: 'href', href: cfi, nonce: controlNonce };
    },
    dispatchClearSearchCache: () => {
      controlNonce += 1;
      controlRequest = { type: 'clear-search-cache', nonce: controlNonce };
    }
  });
  const searchState = searchController.state;
  const sidebarController = createReaderSidebarController({
    getStorage: () => (typeof localStorage === 'undefined' ? undefined : localStorage),
    isWindowMode: () => isWindowMode
  });
  const sidebarState = sidebarController.state;
  const notesController = createReaderNotesController({
    getStorage: () => (typeof localStorage === 'undefined' ? undefined : localStorage),
    getStorageKey: () => notesStorageKey,
    canPersistNotes: canPersistReaderNotes,
    loadPersistedNotes: loadReaderNotes,
    savePersistedNotes: saveReaderNotes,
    promptNoteDraft: (message, initialValue = '') => window.prompt(message, initialValue),
    confirmDelete: (message) => window.confirm(message)
  });
  const notesState = notesController.state;

  const addNoteFromSelection = () => {
    const added = notesController.addFromSelection();
    if (!added) return;
    sidebarController.openTab('notes');
  };

  const openNote = (cfi: string) => {
    notesController.open(cfi);
    sidebarController.openTab('notes');
    searchController.clearRecentResultCfi();
    issueHrefControl(cfi);
  };

  const editNote = (id: string) => {
    notesController.edit(id);
  };

  const deleteNote = (id: string) => {
    notesController.remove(id);
  };

  onMount(() => {
    if (typeof localStorage === 'undefined') return;
    searchController.restoreConfig();
    searchController.enablePersistence();
    sidebarController.restore();
  });

  $: {
    readerBookKey;
    searchController.refreshHistory();
  }
  $: searchController.persist($searchState);
  $: sidebarController.persist($sidebarState);
  $: {
    notesStorageKey;
    notesController.refresh();
  }

  const queueLibraryReadingStatePersist = (preview: ReaderPreviewState) => {
    if (!autoOpenLibraryFile || !sourcePath) return;

    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      void updateLibraryReadingState({
        filePath: sourcePath,
        title: preview.title,
        author: preview.author,
        chapterLabel: preview.chapterLabel,
        progressLabel: preview.progressLabel,
        progressFraction: preview.progressFraction,
        progressLocation: preview.progressLocation
      });
    }, 500);
  };

  onDestroy(() => {
    if (persistTimer) clearTimeout(persistTimer);
    searchController.destroy();
  });

  $: sidebarCallbacks = {
    onNavigate: issueHrefControl,
    onClose: isWindowMode ? sidebarController.toggleVisible : null,
    onToggleSidebar: sidebarController.toggleVisible,
    onTogglePin: isWindowMode ? sidebarController.togglePinned : null,
    onTabChange: sidebarController.openTab,
    onAddNote: addNoteFromSelection,
    onOpenNote: openNote,
    onEditNote: editNote,
    onDeleteNote: deleteNote,
    onSearch: searchController.issueSearch,
    onSearchResult: searchController.issueSearchResult,
    onSearchConfigChange: searchController.updateConfig,
    onSearchHistory: searchController.issueSearch,
    onClearSearchHistory: searchController.clearHistory,
    onClearSearchCache: searchController.clearCurrentBookCache
  } satisfies ReaderSidebarCallbacks;
</script>

<section class:window-mode={isWindowMode} class="reader-shell">
  {#if isWindowMode}
    <header
      class="window-chrome"
      role="banner"
      data-tauri-drag-region
      aria-label="reader window chrome"
    >
      <div
        role="presentation"
        class="window-drag-strip"
        data-tauri-drag-region
        on:mousedown={startCurrentWindowDrag}
      ></div>
      <div class="traffic-light-gutter" aria-hidden="true"></div>
    </header>
  {/if}

  <div
    class:window-mode={isWindowMode}
    class:sidebar-hidden={isWindowMode && !$sidebarState.visible}
    class:sidebar-overlay={isWindowMode && $sidebarState.visible && !$sidebarState.pinned}
    class="workspace"
    style={isWindowMode && $sidebarState.visible && $sidebarState.pinned ? `--reader-sidebar-width:${$sidebarState.width}px;` : undefined}
  >
    {#if !isWindowMode || $sidebarState.visible}
      <ReaderSidebar
        {toc}
        {activeHref}
        {isWindowMode}
        isPinned={$sidebarState.pinned}
        activeTab={$sidebarState.tab}
        search={$searchState}
        notesState={$notesState}
        callbacks={sidebarCallbacks}
      />
    {/if}
    {#if isWindowMode && $sidebarState.visible && $sidebarState.pinned}
      <button
        type="button"
        class="sidebar-resize-handle"
        aria-label="Resize sidebar"
        on:mousedown={sidebarController.beginResize}
      ></button>
    {/if}
    <ReaderStage
      {controlRequest}
      {autoOpenPicker}
      {isWindowMode}
      sidebarVisible={$sidebarState.visible}
      notes={$notesState.notes}
      activeSidebarTab={$sidebarState.tab}
      on:togglesidebar={sidebarController.toggleVisible}
      on:switchsidebartab={({ detail }) => {
        sidebarController.toggleTab(detail);
      }}
      on:controlrequest={({ detail }: CustomEvent<ReaderControlRequest>) => {
        controlRequest = detail;
      }}
      on:readerstate={({ detail }: CustomEvent<ReaderPreviewState>) => {
        activeHref = detail.chapterHref;
        searchController.setActiveResultCfi(detail.progressLocation);
        queueLibraryReadingStatePersist(detail);
      }}
      on:notefocus={({ detail }: CustomEvent<string>) => {
        notesController.setActiveCfi(detail);
        sidebarController.openTab('notes');
      }}
      on:selectionchange={({ detail }) => {
        notesController.setSelection(detail);
      }}
      on:searchchange={({ detail }) => {
        searchController.handleSearchChange(detail);
      }}
      on:searchcachekeychange={({ detail }) => {
        searchController.setCacheKey(detail);
      }}
      on:tocchange={({ detail }: CustomEvent<ReaderTocItem[]>) => {
        toc = detail;
      }}
    />

    {#if !isWindowMode}
      <aside class="bridge-placeholder" aria-label="bridge panel placeholder">
        <header class="bridge-head">
          <span class="label">Bridge</span>
          <button type="button" aria-label="bridge options">⋯</button>
        </header>

        <div class="bridge-card">
          <strong>解释这段</strong>
          <p>这里保留 `br1` 的桥梁层挂载位。先把它作为右侧 contextual surface 摆正，不提前接 AI 行为。</p>
        </div>

        <div class="bridge-card secondary">
          <strong>为什么重要</strong>
          <p>后续 bridge 可以从当前位置、章节关系和高亮沉淀里给出解释，而不是挤进正文主舞台。</p>
        </div>
      </aside>
    {/if}
  </div>
</section>

<style>
  .reader-shell {
    min-height: 100%;
    padding: 0;
    width: 100%;
  }

  .reader-shell.window-mode {
    min-height: 100vh;
    padding-top: 0;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-page) 95%, white 5%);
  }

  .window-chrome {
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr);
    align-items: start;
    position: relative;
    min-height: 26px;
    padding: 8px 18px 0;
    background: transparent;
    user-select: none;
    pointer-events: none;
  }

  .window-drag-strip {
    position: absolute;
    inset: 0;
  }

  .traffic-light-gutter {
    position: relative;
    z-index: 1;
    min-height: 20px;
  }

  .workspace {
    display: grid;
    grid-template-columns: 248px minmax(0, 1fr) 276px;
    gap: 14px;
    min-height: calc(100vh - 32px);
    width: 100%;
  }

  .workspace.window-mode {
    position: relative;
    gap: 0;
    min-height: calc(100vh - 26px);
    grid-template-columns: minmax(208px, var(--reader-sidebar-width, 224px)) minmax(0, 1fr);
  }

  .workspace.window-mode.sidebar-hidden {
    grid-template-columns: minmax(0, 1fr);
  }

  .workspace.window-mode.sidebar-overlay {
    grid-template-columns: minmax(0, 1fr);
  }

  .sidebar-resize-handle {
    width: 4px;
    cursor: col-resize;
    position: absolute;
    left: calc(var(--reader-sidebar-width, 224px) - 2px);
    top: 0;
    bottom: 0;
    z-index: 21;
    border: 0;
    padding: 0;
    background: transparent;
  }

  .sidebar-resize-handle::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 1px;
    width: 1px;
    background: var(--border-light);
  }

  .bridge-placeholder {
    display: grid;
    align-content: start;
    gap: 10px;
    padding: 12px;
    border: 1px solid rgba(64, 47, 24, 0.1);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 92%, white 8%);
  }

  .label {
    color: var(--text-muted);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: var(--font-chrome);
  }

  .bridge-head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
    padding: 2px 2px 8px;
  }

  .bridge-head button {
    width: 26px;
    height: 26px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
    font: inherit;
  }

  .bridge-card {
    display: grid;
    gap: 6px;
    padding: 14px 14px 12px;
    border: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--surface-reader) 76%, white 24%);
  }

  .bridge-card.secondary {
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
  }

  .bridge-card strong {
    font-family: var(--font-chrome);
    font-size: 13px;
    line-height: 1.3;
  }

  .bridge-card p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.65;
    font-size: 13px;
  }

  @media (max-width: 1120px) {
    .workspace {
      grid-template-columns: 236px minmax(0, 1fr);
    }

    .workspace.window-mode {
      grid-template-columns: 208px minmax(0, 1fr);
    }

    .bridge-placeholder {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 960px) {
    .workspace {
      grid-template-columns: 1fr;
    }

    .window-chrome {
      grid-template-columns: 56px minmax(0, 1fr);
      padding-inline: 10px;
    }
  }
</style>

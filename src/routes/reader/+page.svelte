<script lang="ts">
  import { goto } from '$app/navigation';
  import { onDestroy, onMount } from 'svelte';
  import { page } from '$app/stores';
  import { ReaderSidebar, ReaderStage } from '$lib/components';
  import type {
    ReaderControlRequest,
    ReaderPreviewState,
    ReaderLookupProvider,
    ReaderRouteOpenState,
    ReaderSidebarCallbacks,
    ReaderSearchHistoryEntry,
    ReaderSearchResult,
    ReaderTocItem
  } from '$lib/reader';
  import {
    createEmptyReaderPreviewState,
    createEmptyReaderAssistanceState,
    createEmptyReaderAssistanceResultState,
    createErrorReaderAssistanceState,
    createLoadingReaderAssistanceState,
    createReaderBookmarksController,
    createReaderNotesController,
    createReaderSearchController,
    createReaderSidebarController,
    createReaderTtsController,
    READER_EMPTY_TITLE,
    READER_NOT_OPENED_LOCATION_LABEL,
    READER_OPENING_LOCATION_LABEL,
    parseReaderRouteOpenState,
    canRequestAssistanceForText,
    type ReaderTtsSpeechTarget,
    normalizeAssistanceTerm,
    toReaderOpenControlRequest
  } from '$lib/reader';
  import { supportsTextAnnotationsForFormat } from '$lib/reader/formats';
  import {
    canPersistReaderBookmarks,
    canPersistReaderNotes,
    clearReaderSearchCache,
    goToLibrarySurface,
    loadPersistedLibraryBooks,
    notifyLibrarySurfaceReadingStateChanged,
    loadReaderBookmarks,
    loadReaderNotes,
    openLibraryBookPath,
    saveReaderBookmarks,
    saveReaderNotes,
    startCurrentWindowDrag,
    requestReaderAssistance,
    toLibraryCoverUrl,
    updateLibraryReadingState
  } from '$lib/services';

  let toc: ReaderTocItem[] = [];
  let activeHref = '';
  let controlRequest: ReaderControlRequest | null = null;
  let controlNonce = 0;
  let lastAutoKey = '';
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let persistSequence = 0;
  let lastPersistPromise: Promise<void> = Promise.resolve();
  let currentCoverUrl = '';
  let bridgePanelOpen = false;
  let currentPreview: ReaderPreviewState = createEmptyReaderPreviewState();
  let assistanceState = createEmptyReaderAssistanceState();
  let assistanceRequestNonce = 0;
  let lastAssistanceBookKey = '';
  const ttsController = createReaderTtsController();
  const ttsState = ttsController.state;

  $: routeOpenState = parseReaderRouteOpenState($page.url) satisfies ReaderRouteOpenState;
  $: isWindowMode = routeOpenState.isWindowMode;
  $: autoOpenPicker = routeOpenState.pickerRequested;
  $: autoOpenTarget = routeOpenState.target;
  $: autoOpenAsset = autoOpenTarget?.kind === 'asset';
  $: autoOpenLibraryFile = autoOpenTarget?.kind === 'library-file';
  $: sourceUrl = autoOpenTarget?.kind === 'asset' ? autoOpenTarget.url : '';
  $: sourcePath = autoOpenTarget?.kind === 'library-file' ? autoOpenTarget.path : '';
  $: sourceLabel = autoOpenTarget?.label ?? '';
  $: readerBookKey = routeOpenState.bookKey;
  $: notesStorageKey = `br1.reader.notes:${readerBookKey}`;
  $: bookmarksStorageKey = `br1.reader.bookmarks:${readerBookKey}`;

  $: if (autoOpenTarget && routeOpenState.autoOpenKey !== lastAutoKey) {
    controlNonce += 1;
    controlRequest = toReaderOpenControlRequest(autoOpenTarget, controlNonce);
    lastAutoKey = routeOpenState.autoOpenKey;
  }

  $: if (!autoOpenTarget) {
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
  const bookmarksController = createReaderBookmarksController({
    getStorage: () => (typeof localStorage === 'undefined' ? undefined : localStorage),
    getStorageKey: () => bookmarksStorageKey,
    canPersistBookmarks: canPersistReaderBookmarks,
    loadPersistedBookmarks: loadReaderBookmarks,
    savePersistedBookmarks: saveReaderBookmarks,
    confirmDelete: (message) => window.confirm(message)
  });
  const bookmarksState = bookmarksController.state;

  const addNoteFromSelection = () => {
    const added = notesController.addFromSelection();
    if (!added) return;
    sidebarController.openTab('notes');
  };

  const addHighlightFromSelection = () => {
    const added = notesController.addHighlightFromSelection();
    if (!added) return;
    sidebarController.openTab('notes');
  };

  const openNote = (cfi: string) => {
    notesController.open(cfi);
    sidebarController.openTab('notes');
    searchController.clearRecentResultCfi();
    issueHrefControl(cfi);
  };

  const rerunSearchHistoryEntry = (entry: ReaderSearchHistoryEntry) => {
    searchController.issueSearchHistory(entry);
  };

  const editNote = (id: string) => {
    notesController.edit(id);
  };

  const deleteNote = (id: string) => {
    notesController.remove(id);
  };

  const deleteNotes = (ids: string[]) => {
    notesController.removeMany(ids);
  };

  function resolveReaderTtsSpeechTarget(): ReaderTtsSpeechTarget | null {
    const selectedText = $notesState.selection?.text.trim();
    if (selectedText) {
      return {
        text: selectedText,
        label: '选中文本'
      };
    }

    const chapterLabel = currentPreview.chapterLabel.trim();
    if (
      chapterLabel &&
      chapterLabel !== READER_NOT_OPENED_LOCATION_LABEL &&
      chapterLabel !== READER_OPENING_LOCATION_LABEL &&
      chapterLabel !== '等待打开书籍'
    ) {
      return {
        text: chapterLabel,
        label: '安全回退：章节标题'
      };
    }

    const title = currentPreview.title.trim();
    if (title && title !== READER_EMPTY_TITLE) {
      return {
        text: title,
        label: '安全回退：书名'
      };
    }

    return null;
  }

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
  $: if (readerBookKey !== lastAssistanceBookKey) {
    assistanceState = createEmptyReaderAssistanceState();
    lastAssistanceBookKey = readerBookKey;
  }
  $: if ($ttsState.status !== 'speaking' && $ttsState.status !== 'paused') {
    ttsController.setSpeechTarget(resolveReaderTtsSpeechTarget());
  }
  $: searchController.persist($searchState);
  $: sidebarController.persist($sidebarState);
  $: {
    notesStorageKey;
    notesController.refresh();
  }
  $: {
    bookmarksStorageKey;
    void bookmarksController.refresh();
  }

  $: if (!supportsTextAnnotationsForFormat(currentPreview.formatLabel)) {
    notesController.setSelection(null);
  }
  $: {
    sourcePath;
    void (async () => {
      if (!sourcePath || !autoOpenLibraryFile) {
        currentCoverUrl = '';
        return;
      }

      try {
        const records = await loadPersistedLibraryBooks();
        const match = records.find((record) => record.filePath === sourcePath);
        currentCoverUrl = match ? await toLibraryCoverUrl(match) : '';
      } catch (error) {
        console.warn('Failed to resolve reader cover for sidebar book card', error);
        currentCoverUrl = '';
      }
    })();
  }

  const persistLibraryReadingState = (preview: ReaderPreviewState) => {
    if (!autoOpenLibraryFile || !sourcePath) return Promise.resolve();

    const normalizedProgressLocation =
      preview.formatLabel === 'PDF'
        ? preview.locationLabel &&
          preview.locationLabel !== READER_OPENING_LOCATION_LABEL &&
          preview.locationLabel !== READER_NOT_OPENED_LOCATION_LABEL
          ? preview.locationLabel
          : ''
        : preview.progressLocation;

    const sequence = ++persistSequence;
    const persistPromise = updateLibraryReadingState({
      filePath: sourcePath,
      title: preview.title,
      author: preview.author,
      chapterLabel: preview.chapterLabel,
      progressLabel: preview.progressLabel,
      progressFraction: preview.progressFraction,
      progressLocation: normalizedProgressLocation
    }).catch((error) => {
      console.error('Failed to persist library reading state', error);
    });

    lastPersistPromise = persistPromise.finally(() => {
      if (persistSequence === sequence) {
        lastPersistPromise = Promise.resolve();
      }
    });

    return persistPromise;
  };

  const queueLibraryReadingStatePersist = (preview: ReaderPreviewState) => {
    if (!autoOpenLibraryFile || !sourcePath) return;

    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      void persistLibraryReadingState(preview);
    }, 500);
  };

  const flushLibraryReadingStatePersist = async (preview: ReaderPreviewState = currentPreview) => {
    if (!autoOpenLibraryFile || !sourcePath) return;

    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }

    await lastPersistPromise;
    await persistLibraryReadingState(preview);
  };

  onMount(() => {
    const handlePageHide = () => {
      flushLibraryReadingStatePersist();
    };

    window.addEventListener('pagehide', handlePageHide);
    ttsController.refreshAvailability();
    ttsController.setSpeechTarget(resolveReaderTtsSpeechTarget());

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
    };
  });

  onDestroy(() => {
    flushLibraryReadingStatePersist();
    ttsController.stop();
    searchController.destroy();
  });

  const handleGoToLibrary = async () => {
    await flushLibraryReadingStatePersist();
    await notifyLibrarySurfaceReadingStateChanged();
    const handledByDesktopWindowing = await goToLibrarySurface();
    if (handledByDesktopWindowing) return;
    await goto('/library');
  };

  const handleToggleBookmark = () => {
    const changed = bookmarksController.toggleCurrent(currentPreview);
    if (changed) {
      sidebarController.openTab('bookmarks');
    }
  };

  const handleTtsStart = () => {
    ttsController.start(resolveReaderTtsSpeechTarget());
  };

  const handleTtsPause = () => {
    ttsController.pause();
  };

  const handleTtsResume = () => {
    ttsController.resume();
  };

  const handleTtsStop = () => {
    ttsController.stop();
  };

  const openBookmark = (href: string) => {
    if (!href) return;
    sidebarController.openTab('bookmarks');
    searchController.clearRecentResultCfi();
    issueHrefControl(href);
  };

  const deleteBookmark = (id: string) => {
    const removed = bookmarksController.remove(id);
    if (removed) {
      sidebarController.openTab('bookmarks');
    }
  };

  const openCurrentSourcePath = async () => {
    if (!autoOpenLibraryFile || !sourcePath) return;
    try {
      await openLibraryBookPath(sourcePath);
    } catch (error) {
      console.error('Failed to open the original book path', error);
    }
  };

  const getAssistanceLookupLanguage = (provider: ReaderLookupProvider) =>
    provider === 'dictionary'
      ? 'en'
      : typeof navigator !== 'undefined'
        ? navigator.language
        : 'en';

  const requestAssistanceLookup = async (provider: ReaderLookupProvider, term: string) => {
    const normalizedTerm = normalizeAssistanceTerm(term);
    const request = {
      kind: 'lookup' as const,
      provider,
      term: normalizedTerm,
      language: getAssistanceLookupLanguage(provider),
      bookKey: readerBookKey,
      cfi: $notesState.selection?.cfi,
      chapterLabel: currentPreview.chapterLabel
    };

    if (!canRequestAssistanceForText(normalizedTerm)) {
      assistanceState = createEmptyReaderAssistanceResultState(request);
      sidebarController.openTab('assist');
      return;
    }

    const token = ++assistanceRequestNonce;
    assistanceState = createLoadingReaderAssistanceState(request);
    sidebarController.openTab('assist');

    try {
      const nextState = await requestReaderAssistance(request);
      if (token !== assistanceRequestNonce) return;
      assistanceState = nextState;
    } catch (error) {
      if (token !== assistanceRequestNonce) return;
      assistanceState = createErrorReaderAssistanceState(
        request,
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  $: sidebarCallbacks = {
    onNavigate: issueHrefControl,
    onToggleCurrentBookmark: handleToggleBookmark,
    onOpenBookmark: openBookmark,
    onDeleteBookmark: deleteBookmark,
    onGoToLibrary: handleGoToLibrary,
    onOpenSourcePath: autoOpenLibraryFile && sourcePath ? openCurrentSourcePath : null,
    onClose: isWindowMode ? sidebarController.toggleVisible : null,
    onToggleSidebar: sidebarController.toggleVisible,
    onTogglePin: isWindowMode ? sidebarController.togglePinned : null,
    onTabChange: sidebarController.openTab,
    onAddHighlight: addHighlightFromSelection,
    onAddNote: addNoteFromSelection,
    onOpenNote: openNote,
    onEditNote: editNote,
    onDeleteNote: deleteNote,
    onDeleteNotes: deleteNotes,
    onSearch: searchController.issueSearch,
    onSearchResult: searchController.issueSearchResult,
    onSearchConfigChange: searchController.updateConfig,
    onSearchHistory: rerunSearchHistoryEntry,
    onClearSearchHistory: searchController.clearHistory,
    onDeleteSearchHistoryEntry: searchController.deleteHistoryEntry,
    onClearSearchCache: searchController.clearCurrentBookCache,
    onRequestLookup: requestAssistanceLookup
  } satisfies ReaderSidebarCallbacks;
</script>

<section class:window-mode={isWindowMode} class="reader-shell">
  {#if isWindowMode}
    <header
      class="window-chrome"
      role="banner"
      data-tauri-drag-region
      aria-label="阅读窗口栏"
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
    class:bridge-open={!isWindowMode && bridgePanelOpen}
    class:bridge-collapsed={!isWindowMode && !bridgePanelOpen}
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
        bookKey={readerBookKey}
        coverUrl={currentCoverUrl}
        preview={currentPreview}
        isPinned={$sidebarState.pinned}
        activeTab={$sidebarState.tab}
        search={$searchState}
        bookmarksState={$bookmarksState}
        notesState={$notesState}
        assistance={assistanceState}
        callbacks={sidebarCallbacks}
      />
    {/if}
    {#if isWindowMode && $sidebarState.visible && $sidebarState.pinned}
      <button
        type="button"
        class="sidebar-resize-handle"
        aria-label="调整侧栏宽度"
        on:mousedown={sidebarController.beginResize}
      ></button>
    {/if}
    <ReaderStage
      {controlRequest}
      {autoOpenPicker}
      {isWindowMode}
      sidebarVisible={$sidebarState.visible}
      isCurrentLocationBookmarked={$bookmarksState.bookmarks.some(
        (bookmark) => bookmark.locator === $bookmarksState.activeLocator
      )}
      ttsSession={$ttsState}
      notes={$notesState.notes}
      activeSidebarTab={$sidebarState.tab}
      on:gotolibrary={handleGoToLibrary}
      on:togglebookmark={handleToggleBookmark}
      on:togglesidebar={sidebarController.toggleVisible}
      on:togglepin={sidebarController.togglePinned}
      on:switchsidebartab={({ detail }) => {
        sidebarController.toggleTab(detail);
      }}
      on:controlrequest={({ detail }: CustomEvent<ReaderControlRequest>) => {
        controlRequest = detail;
      }}
      on:readerstate={({ detail }: CustomEvent<ReaderPreviewState>) => {
        currentPreview = detail;
        activeHref = detail.chapterHref;
        searchController.setActiveResultCfi(detail.progressLocation);
        bookmarksController.syncPreview(detail);
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
      onTtsStart={handleTtsStart}
      onTtsPause={handleTtsPause}
      onTtsResume={handleTtsResume}
      onTtsStop={handleTtsStop}
    />

    {#if !isWindowMode}
      {#if bridgePanelOpen}
        <aside class="bridge-placeholder" aria-label="桥梁面板">
          <header class="bridge-head">
            <span class="label">桥</span>
            <button type="button" aria-label="收起桥梁面板" on:click={() => (bridgePanelOpen = false)}>
              ×
            </button>
          </header>

          <div class="bridge-card">
            <strong>解释这段</strong>
            <p>这里保留 `br1` 的桥梁层挂载位。先把它作为右侧上下文面板摆正，不提前接入智能行为。</p>
          </div>

          <div class="bridge-card secondary">
            <strong>为什么重要</strong>
            <p>后续桥梁层可以从当前位置、章节关系和高亮沉淀里给出解释，而不是挤进正文主舞台。</p>
          </div>
        </aside>
      {:else}
        <aside class="bridge-tab" aria-label="桥梁面板已收起">
          <button type="button" aria-label="打开桥梁面板" on:click={() => (bridgePanelOpen = true)}>
            <span>桥</span>
          </button>
        </aside>
      {/if}
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
    --reader-window-frame-width: 1080px;
    --reader-window-frame-width-focus: 920px;
    --reader-window-frame-width-wide: 1320px;
    --reader-window-edge-x: 18px;
    --reader-window-edge-y-top: 8px;
    --reader-window-edge-y-bottom: 12px;
    --reader-window-sidebar-gap: 18px;
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
    padding: var(--reader-window-edge-y-top, 8px) var(--reader-window-edge-x, 18px) 0;
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

  .workspace.bridge-collapsed {
    grid-template-columns: 248px minmax(0, 1fr) 48px;
  }

  .workspace.bridge-open {
    grid-template-columns: 248px minmax(0, 1fr) 276px;
  }

  .workspace.window-mode {
    position: relative;
    align-items: stretch;
    gap: var(--reader-window-sidebar-gap, 18px);
    min-height: calc(100vh - 26px);
    padding:
      var(--reader-window-edge-y-top, 8px)
      var(--reader-window-edge-x, 18px)
      var(--reader-window-edge-y-bottom, 12px);
    box-sizing: border-box;
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
    left: calc(
      var(--reader-window-edge-x, 18px) + var(--reader-sidebar-width, 224px) +
        (var(--reader-window-sidebar-gap, 18px) / 2) - 2px
    );
    top: var(--reader-window-edge-y-top, 8px);
    bottom: var(--reader-window-edge-y-bottom, 12px);
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

  .bridge-tab {
    display: grid;
    align-content: start;
    justify-items: center;
    padding: 8px 4px;
    border-left: 1px solid rgba(64, 47, 24, 0.1);
    background: color-mix(in srgb, var(--surface-panel) 86%, white 14%);
  }

  .bridge-tab button {
    width: 32px;
    min-height: 84px;
    border: 1px solid var(--border-light);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 76%, white 24%);
    color: var(--text-muted);
    font: 700 10px/1 var(--font-chrome);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    writing-mode: vertical-rl;
    box-shadow: 0 8px 18px rgba(42, 30, 15, 0.05);
  }

  .bridge-tab button:hover {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--surface-reader) 88%, white 12%);
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

    .workspace.bridge-collapsed {
      grid-template-columns: 236px minmax(0, 1fr) 44px;
    }

    .workspace.bridge-open {
      grid-template-columns: 236px minmax(0, 1fr);
    }

    .workspace.window-mode {
      --reader-window-edge-x: 14px;
      --reader-window-edge-y-top: 8px;
      --reader-window-edge-y-bottom: 10px;
      --reader-window-sidebar-gap: 14px;
      grid-template-columns: 208px minmax(0, 1fr);
    }

    .bridge-placeholder {
      grid-column: 1 / -1;
    }

    .bridge-tab {
      grid-column: auto;
      padding-inline: 2px;
    }
  }

  @media (max-width: 960px) {
    .workspace,
    .workspace.bridge-collapsed,
    .workspace.bridge-open {
      grid-template-columns: 1fr;
    }

    .workspace :global(.reader-stage) {
      order: 1;
    }

    .workspace :global(.reader-sidebar) {
      order: 2;
    }

    .bridge-placeholder,
    .bridge-tab {
      order: 3;
    }

    .bridge-tab {
      justify-items: stretch;
      padding: 8px 14px 12px;
      border-left: 0;
      border-top: 1px solid rgba(64, 47, 24, 0.1);
    }

    .bridge-tab button {
      width: 100%;
      min-height: 38px;
      writing-mode: horizontal-tb;
    }

    .window-chrome {
      grid-template-columns: 56px minmax(0, 1fr);
      padding-inline: var(--reader-window-edge-x, 10px);
    }

    .workspace.window-mode {
      --reader-window-edge-x: 10px;
      --reader-window-edge-y-bottom: 10px;
      --reader-window-sidebar-gap: 10px;
    }
  }
</style>

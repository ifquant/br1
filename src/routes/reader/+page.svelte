<script lang="ts">
  import { goto } from '$app/navigation';
  import { onDestroy, onMount } from 'svelte';
  import { page } from '$app/stores';
  import { ReaderSidebar, ReaderStage } from '$lib/components';
  import type {
    ReaderControlRequest,
    ReaderLookupProvider,
    ReaderPreviewState,
    ReaderRouteOpenState,
    ReaderSidebarCallbacks,
    ReaderSearchHistoryEntry,
    ReaderSearchResult,
    ReaderTranslationProvider,
    ReaderTranslationProviderStatus,
    ReaderTocItem
  } from '$lib/reader';
  import {
    createEmptyReaderPreviewState,
    createEmptyReaderAssistanceState,
    createEmptyReaderAssistanceResultState,
    createErrorReaderAssistanceState,
    createLoadingReaderAssistanceState,
    createReaderBookmarksController,
    createReaderParallelSessionFromRoute,
    createReaderNotesController,
    createReaderSearchController,
    createReaderSidebarController,
    createReaderTtsController,
    activateReaderParallelPane,
    closeReaderParallelSecondaryPane,
    READER_EMPTY_TITLE,
    READER_NOT_OPENED_LOCATION_LABEL,
    READER_OPENING_LOCATION_LABEL,
    canRequestAssistanceForText,
    normalizeAssistanceText,
    normalizeAssistanceTerm,
    openReaderParallelSecondaryPaneFromPrimary,
    parseReaderRouteOpenState,
    updateReaderParallelPaneControlRequest,
    updateReaderParallelPanePreview,
    type ReaderTtsSpeechTarget,
    toReaderOpenControlRequest
  } from '$lib/reader';
  import { supportsTextAnnotationsForFormat } from '$lib/reader/formats';
  import {
    createDefaultReaderTranslationProviderStatuses,
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
    loadReaderTranslationProviderStatuses,
    startCurrentWindowDrag,
    requestReaderAssistance,
    toLibraryCoverUrl,
    updateLibraryReadingState
  } from '$lib/services';

  let toc: ReaderTocItem[] = [];
  let activeHref = '';
  let controlNonce = 0;
  let lastAutoKey = '';
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let persistSequence = 0;
  let lastPersistPromise: Promise<void> = Promise.resolve();
  let currentCoverUrl = '';
  let bridgePanelOpen = false;
  let parallelSession = createReaderParallelSessionFromRoute(
    parseReaderRouteOpenState($page.url)
  );
  let parallelEnabled = false;
  let currentPreview: ReaderPreviewState = createEmptyReaderPreviewState();
  let assistanceState = createEmptyReaderAssistanceState();
  let assistanceRequestNonce = 0;
  let lastAssistanceBookKey = '';
  let translationProviderStatuses: ReaderTranslationProviderStatus[] =
    createDefaultReaderTranslationProviderStatuses();
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
  $: if (routeOpenState.autoOpenKey !== parallelSession.panes.primary.source.sourceKey) {
    parallelSession = createReaderParallelSessionFromRoute(routeOpenState);
  }
  $: parallelEnabled = parallelSession.panes.secondary.openTarget !== null;
  $: canOpenParallelSurface = parallelEnabled || parallelSession.panes.primary.openTarget !== null;
  $: notesStorageKey = `br1.reader.notes:${readerBookKey}`;
  $: bookmarksStorageKey = `br1.reader.bookmarks:${readerBookKey}`;

  $: if (autoOpenTarget && routeOpenState.autoOpenKey !== lastAutoKey) {
    controlNonce += 1;
    parallelSession = updateReaderParallelPaneControlRequest(
      parallelSession,
      'primary',
      toReaderOpenControlRequest(autoOpenTarget, controlNonce)
    );
    parallelSession = activateReaderParallelPane(parallelSession, 'primary');
    lastAutoKey = routeOpenState.autoOpenKey;
  }

  $: if (!autoOpenTarget) {
    lastAutoKey = '';
    parallelSession = createReaderParallelSessionFromRoute(routeOpenState);
  }

  const issueHrefControl = (href: string) => {
    controlNonce += 1;
    parallelSession = updateReaderParallelPaneControlRequest(
      parallelSession,
      'primary',
      { type: 'href', href, nonce: controlNonce }
    );
    parallelSession = activateReaderParallelPane(parallelSession, 'primary');
  };

  const issuePrimaryControlRequest = (request: ReaderControlRequest) => {
    parallelSession = updateReaderParallelPaneControlRequest(parallelSession, 'primary', request);
    parallelSession = activateReaderParallelPane(parallelSession, 'primary');
  };

  const issueSecondaryControlRequest = (request: ReaderControlRequest) => {
    parallelSession = updateReaderParallelPaneControlRequest(parallelSession, 'secondary', request);
    parallelSession = activateReaderParallelPane(parallelSession, 'secondary');
  };

  const toggleParallelSurface = () => {
    if (parallelEnabled) {
      parallelSession = closeReaderParallelSecondaryPane(parallelSession);
      return;
    }

    if (!canOpenParallelSurface) return;

    controlNonce += 1;
    parallelSession = openReaderParallelSecondaryPaneFromPrimary(parallelSession, controlNonce);
    parallelSession = activateReaderParallelPane(parallelSession, 'secondary');
  };

  const searchController = createReaderSearchController({
    getStorage: () => (typeof localStorage === 'undefined' ? undefined : localStorage),
    getHistoryKey: () => {
      const bookKey = sourcePath || sourceUrl || sourceLabel || 'default';
      return `br1.reader.search.history:${bookKey}`;
    },
    dispatchSearch: (query, config) => {
      controlNonce += 1;
      issuePrimaryControlRequest({ type: 'search', nonce: controlNonce, query, config });
    },
    dispatchSearchResult: (cfi) => {
      controlNonce += 1;
      issuePrimaryControlRequest({ type: 'href', href: cfi, nonce: controlNonce });
    },
    dispatchClearSearchCache: () => {
      controlNonce += 1;
      issuePrimaryControlRequest({ type: 'clear-search-cache', nonce: controlNonce });
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
    void (async () => {
      translationProviderStatuses = await loadReaderTranslationProviderStatuses();
    })();

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
      progressLocation: normalizedProgressLocation,
      koreaderProgressLocation: preview.koreaderProgressLocation || undefined
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

  const resolveReaderTranslationFallback = () => {
    const selectedText = normalizeAssistanceText($notesState.selection?.text || '');
    if (selectedText) {
      return {
        text: selectedText,
        chapterLabel: $notesState.selection?.chapterLabel || currentPreview.chapterLabel
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
        chapterLabel
      };
    }

    const title = currentPreview.title.trim();
    if (title && title !== READER_EMPTY_TITLE) {
      return {
        text: title,
        chapterLabel: currentPreview.chapterLabel
      };
    }

    return {
      text: '',
      chapterLabel: currentPreview.chapterLabel
    };
  };

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

  const requestAssistanceTranslation = async (
    provider: ReaderTranslationProvider,
    text: string,
    targetLanguage: string
  ) => {
    const fallback = resolveReaderTranslationFallback();
    const normalizedText = normalizeAssistanceText(text || fallback.text);
    const request = {
      kind: 'translation' as const,
      provider,
      text: normalizedText,
      sourceLanguage: undefined,
      targetLanguage: targetLanguage.trim() || 'zh',
      bookKey: readerBookKey,
      cfi: $notesState.selection?.cfi,
      chapterLabel: fallback.chapterLabel
    };

    if (!normalizedText) {
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
    onRequestLookup: requestAssistanceLookup,
    onRequestTranslation: requestAssistanceTranslation
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
        translationProviderStatuses={translationProviderStatuses}
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
    <div class="reader-surface">
      <div class="parallel-surface-toolbar" aria-label="并行阅读控制">
        <button
          type="button"
          class="parallel-toggle"
          aria-pressed={parallelEnabled}
          aria-label={parallelEnabled ? '关闭并行阅读' : '开启并行阅读'}
          disabled={!canOpenParallelSurface}
          on:click={toggleParallelSurface}
        >
          {parallelEnabled ? '关闭并行阅读' : '并行阅读'}
        </button>
      </div>

      <div class:parallel-enabled={parallelEnabled} class="reader-stage-stack">
        <ReaderStage
          controlRequest={parallelSession.panes.primary.controlRequest}
          landmarkRole={parallelEnabled ? 'region' : 'main'}
          landmarkLabel={parallelEnabled ? '主阅读窗格' : 'reader stage'}
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
            issuePrimaryControlRequest(detail);
          }}
          on:readerstate={({ detail }: CustomEvent<ReaderPreviewState>) => {
            currentPreview = detail;
            activeHref = detail.chapterHref;
            searchController.setActiveResultCfi(detail.progressLocation);
            bookmarksController.syncPreview(detail);
            queueLibraryReadingStatePersist(detail);
            parallelSession = updateReaderParallelPanePreview(parallelSession, 'primary', detail);
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

        {#if parallelEnabled}
          <ReaderStage
            controlRequest={parallelSession.panes.secondary.controlRequest}
            landmarkRole="region"
            landmarkLabel="并行阅读窗格"
            autoOpenPicker={false}
            {isWindowMode}
            sidebarVisible={$sidebarState.visible}
            isCurrentLocationBookmarked={false}
            ttsSession={$ttsState}
            notes={[]}
            activeSidebarTab={$sidebarState.tab}
            on:controlrequest={({ detail }: CustomEvent<ReaderControlRequest>) => {
              issueSecondaryControlRequest(detail);
            }}
            on:readerstate={({ detail }: CustomEvent<ReaderPreviewState>) => {
              parallelSession = updateReaderParallelPanePreview(parallelSession, 'secondary', detail);
            }}
          />
        {/if}
      </div>
    </div>

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

  .sidebar-resize-handle:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent-warm, #8c6a3b) 72%, white 28%);
    outline-offset: 3px;
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

  .bridge-placeholder button:focus-visible,
  .bridge-tab button:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent-warm, #8c6a3b) 72%, white 28%);
    outline-offset: 3px;
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

  .reader-surface {
    display: grid;
    gap: 12px;
    min-width: 0;
  }

  .parallel-surface-toolbar {
    display: flex;
    justify-content: flex-end;
    min-width: 0;
  }

  .parallel-toggle {
    min-height: 32px;
    padding: 0 12px;
    border: 1px solid var(--border-light);
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
    color: var(--text-secondary);
    font: 700 12px/1 var(--font-chrome);
    letter-spacing: 0.04em;
    cursor: pointer;
  }

  .parallel-toggle:hover {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--surface-reader) 96%, white 4%);
  }

  .parallel-toggle:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent-warm, #8c6a3b) 72%, white 28%);
    outline-offset: 3px;
  }

  .reader-stage-stack {
    display: grid;
    gap: 14px;
    min-width: 0;
  }

  .reader-stage-stack.parallel-enabled {
    grid-template-columns: minmax(0, 1fr);
  }

  @media (min-width: 1180px) {
    .reader-stage-stack.parallel-enabled {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
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

    .parallel-surface-toolbar {
      justify-content: stretch;
    }

    .parallel-toggle {
      width: 100%;
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

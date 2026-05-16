<script lang="ts">
  // Ownership: this route hosts the product-level state for its surface.
  // It composes child components and services, but it must remain the visible
  // boundary where navigation, persistence, and privileged actions are coordinated.
  import { goto } from '$app/navigation';
  import { onDestroy, onMount } from 'svelte';
  import { page } from '$app/stores';
  import { ReaderSidebar, ReaderStage } from '$lib/components';
  import ReaderNotebook from '$lib/components/reader/ReaderNotebook.svelte';
  import type {
    ReaderAssistanceHistoryEntry,
    ReaderAssistanceWorkspaceSelection,
    ReaderControlRequest,
    ReaderFocusedReadingState,
    ReaderInlineTranslationState,
    ReaderInlineTranslationTargetLanguage,
    ReaderLookupProvider,
    ReaderNotebookWorkspaceTab,
    ReaderPlaybackQueueState,
    ReaderPreviewState,
    ReaderRouteOpenState,
    ReaderRouteWorkspaceMode,
    ReaderSidebarCallbacks,
    ReaderSearchHistoryEntry,
    ReaderSearchResult,
    ReaderSelectionState,
    ReaderTtsReadAloudTextMode,
    ReaderLiveTranslationPanelResult,
    ReaderTranslationLiveSnapshot,
    ReaderTranslationProvider,
    ReaderTranslationProviderStatus,
    ReaderTranslationSource,
    ReaderTocItem,
    ReaderWorkspaceModeRouteRequest
  } from '$lib/reader';
  import type {
    Br1KoReaderRemoteSyncResult,
    KoReaderSyncExchangeExportDialogResult,
    PersistedLibraryBook,
    RestoreKoReaderSyncExchangeDialogResult
  } from '$lib/services';
  // Route composition and controller helpers remain grouped separately from the
  // extracted ownership families below.
  import {
    READER_EMPTY_TITLE,
    READER_NOT_OPENED_LOCATION_LABEL,
    READER_OPENING_LOCATION_LABEL,
    activateReaderParallelPane,
    canRequestAssistanceForText,
    closeReaderParallelSecondaryPane,
    createEmptyReaderAssistanceResultState,
    createEmptyReaderAssistanceState,
    createEmptyReaderAssistanceWorkspaceSelection,
    createEmptyReaderPreviewState,
    createEmptyReaderInlineTranslationState,
    createErrorReaderAssistanceState,
    createLoadingReaderAssistanceState,
    createReaderAssistanceHistoryEntry,
    createReaderBookmarksController,
    createReaderFocusedReadingState,
    createReaderNotesController,
    createReaderParallelSessionFromRoute,
    createReaderPlaybackQueue,
    createReaderSearchController,
    createReaderSidebarController,
    createReaderTtsController,
    getReaderLocationDisplayLabel,
    getReaderInlineTranslationSummary,
    getReaderPlaybackQueueSummary,
    getReaderFocusedReadingSummary,
    getReaderTtsPrimaryActionLabel,
    getReaderTtsReadableTargetLabel,
    getReaderTtsSessionStatusLabel,
    isReaderTtsPlaybackLocationDrifted,
    moveReaderPlaybackQueueNext,
    moveReaderPlaybackQueuePrevious,
    normalizeAssistanceTerm,
    normalizeAssistanceText,
    openReaderParallelSecondaryPaneFromPrimary,
    parseReaderRouteOpenState,
    planReaderTtsRetargetAction,
    setReaderPlaybackRate,
    setReaderPlaybackTimeout,
    startReaderParagraphFocus,
    startReaderRsvpLite,
    toReaderOpenControlRequest,
    toReaderWorkspaceModeHref,
    updateReaderAssistanceHistoryEntry,
    updateReaderParallelPaneControlRequest,
    updateReaderParallelPanePreview,
    advanceReaderRsvpWord,
    exitReaderFocusedReading,
    toggleReaderInlineTranslationVisibility,
    upsertReaderInlineTranslationCandidate,
    upsertReaderAssistanceHistoryEntry,
    type ReaderTtsSpeechTarget
  } from '$lib/reader';
  import {
    resolveReaderAnnotationPopupSelectionForBookChange,
    resolveReaderMaturityRouteTranslationConfig,
    resolveReaderPlaybackQueueForEffectiveTtsTarget
  } from '$lib/reader/route';
  // Current-book persistence owns storage keys plus typed localStorage payloads.
  import {
    getReaderCurrentBookPersistenceKeys,
    persistReaderCurrentBookAssistanceHistory,
    persistReaderCurrentBookAssistanceSelection,
    persistReaderCurrentBookTranslationLiveSnapshot,
    persistReaderCurrentBookTranslationModeConfig,
    persistReaderTranslationOwnership,
    restoreReaderCurrentBookAssistanceHistory,
    restoreReaderCurrentBookAssistanceSelection,
    restoreReaderCurrentBookTranslationLiveSnapshot,
    restoreReaderCurrentBookTranslationModeConfig,
    restoreReaderTranslationOwnership
  } from '$lib/reader';
  // Translation ownership owns follow-vs-pinned source and live result restore.
  import {
    createPinnedReaderTranslationSource,
    normalizeReaderTranslationSource,
    resolveReaderEffectiveTranslationSource,
    resolveReaderLiveTranslationPanelResult,
    resolveReaderNextTranslationLiveSnapshot,
    resolveReaderTranslationLiveSnapshotState,
    resolveReaderTranslationModeConfigRestore
  } from '$lib/reader';
  // TTS ownership owns source-vs-translated playback and translated snapshots.
  import {
    persistReaderTtsOwnershipState,
    resolveReaderEffectiveTtsTarget,
    resolveReaderLiveTranslatedTtsResult,
    resolveReaderRouteTranslatedTtsOwner,
    resolveReaderTranslatedTtsLiveSnapshotState,
    resolveReaderTranslatedTtsOwnerFallback,
    resolveReaderTranslatedTtsSourceState,
    resolveReaderTtsMiniBarContextSummary,
    resolveReaderTtsMiniBarLocationSummary,
    resolveReaderTtsMiniBarVisible,
    resolveReaderTtsSpeechTarget,
    resolveReaderTtsTranslatedWaitingTargetLabel,
    restoreReaderTtsOwnershipState
  } from '$lib/reader';
  // Workspace mode owns the URL-to-notebook tab contract for dedicated modes.
  import {
    resolveReaderNotebookShellState,
    resolveReaderNotebookTabRouteRequest,
    resolveReaderRouteTtsReadAloudTextMode,
    resolveReaderRouteWorkspaceApplication,
    resolveReaderTranslatedTtsWorkspaceRequest,
    resolveReaderWorkspaceModeRouteRequest
  } from '$lib/reader';
  import { loadReaderSettings } from '$lib/reader';
  import { supportsTextAnnotationsForFormat } from '$lib/reader/formats';
  import {
    createDefaultReaderTranslationProviderStatuses,
    canPersistReaderBookmarks,
    canPersistLibrary,
    canPersistReaderNotes,
    clearReaderSearchCache,
    createKoReaderSyncExchangeFromSnapshot,
    createLocalSyncSnapshot,
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
    restoreKoReaderSyncExchangeDialog,
    runKoReaderRemoteSync,
    saveKoReaderSyncExchangeDialog,
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
  let notebookVisible = false;
  let notebookPinned = false;
  let notebookTab: ReaderNotebookWorkspaceTab = 'notes';
  let lastAppliedRouteWorkspaceMode: ReaderRouteWorkspaceMode | null = null;
  let ttsFollowsCurrentLocation = true;
  let pinnedTtsTarget: ReaderTtsSpeechTarget | null = null;
  let resolvedTtsTarget: ReaderTtsSpeechTarget | null = null;
  let effectiveTtsTarget: ReaderTtsSpeechTarget | null = null;
  let ttsReadAloudTextMode: ReaderTtsReadAloudTextMode = 'source';
  let translationFollowsCurrentSource = true;
  let translationTargetLanguage = 'zh';
  let translationProvider: ReaderTranslationProvider = 'deepl';
  let inlineTranslationState: ReaderInlineTranslationState =
    createEmptyReaderInlineTranslationState();
  let inlineTranslationSummary = getReaderInlineTranslationSummary(inlineTranslationState);
  let inlineTranslationStatusMessage = '等待可翻译正文。';
  let inlineTranslationCapabilityMessage = '正文内译文会等待阅读视窗提供安全正文候选。';
  let latestInlineTranslationCandidates: ReaderInlineTranslationCandidatesEvent | null = null;
  let pinnedTranslationSource: ReaderTranslationSource | null = null;
  let resolvedTranslationSource: ReaderTranslationSource = {
    text: '',
    label: '',
    chapterLabel: ''
  };
  let effectiveTranslationSource: ReaderTranslationSource = {
    text: '',
    label: '',
    chapterLabel: ''
  };
  let translatedTtsSourceKind: 'none' | 'live-translation' | 'archived-translation' = 'none';
  let translatedTtsSourceContextLabel = '';
  let translatedTtsSourceText = '';
  let ttsPlaybackQueueState: ReaderPlaybackQueueState = createReaderPlaybackQueue([]);
  let ttsPlaybackQueueSummary = getReaderPlaybackQueueSummary(ttsPlaybackQueueState);
  let ttsPlaybackTarget: ReaderTtsSpeechTarget | null = null;
  let ttsPlaybackSupportsSegmentNavigation = false;
  let ttsPlaybackCanGoToPreviousSegment = false;
  let ttsPlaybackCanGoToNextSegment = false;
  let lastPlaybackQueueTargetKey = '';
  let ttsPlaybackNow = Date.now();
  let playbackTimeoutTicker: ReturnType<typeof setInterval> | null = null;
  let ttsPlaybackVoiceCapabilityLabel = '浏览器语音列表仍由当前运行时按能力暴露。';
  let ttsPlaybackSelectedVoiceLabel = '';
  let currentManagedBook: PersistedLibraryBook | null = null;
  let readerSyncBusyAction: 'export-current' | 'import-exchange' | 'push-remote' | 'pull-remote' | null =
    null;
  let readerSyncNotice: { kind: 'info' | 'error'; message: string } | null = null;
  let readerKoReaderExchangeExportResult: KoReaderSyncExchangeExportDialogResult | null = null;
  let readerKoReaderExchangeImportResult: RestoreKoReaderSyncExchangeDialogResult | null = null;
  let readerKoReaderRemoteSyncResult: Br1KoReaderRemoteSyncResult | null = null;
  let readerSyncRetryAction: (() => void) | null = null;
  let currentBookSyncActivity:
    | {
        actionLabel: string;
        status: 'success' | 'error' | 'cancelled';
        message: string;
        recordedAt: number;
      }
    | null = null;
  let librarySyncActivity:
    | {
        actionLabel: string;
        status: 'success' | 'error' | 'cancelled';
        message: string;
        recordedAt: number;
      }
    | null = null;
  let annotationPopupSelectionSummary = '';
  let annotationPopupSelectionDetail = '';
  let annotationPopupSupportMessage = '';
  let currentFormatSupportsTextAnnotations = false;
  let annotationPopupSupportsActions = false;
  let parallelSession = createReaderParallelSessionFromRoute(
    parseReaderRouteOpenState($page.url)
  );
  let parallelEnabled = false;
  let notesStorageKey = '';
  let bookmarksStorageKey = '';
  let assistanceHistoryStorageKey = '';
  let assistanceSelectionStorageKey = '';
  let translationOwnershipStorageKey = '';
  let translationModeConfigStorageKey = '';
  let translationLiveSnapshotStorageKey = '';
  let ttsOwnershipStorageKey = '';
  let ttsReadAloudModeStorageKey = '';
  let translatedTtsOwnerStorageKey = '';
  let translatedTtsLiveSnapshotStorageKey = '';
  let currentPreview: ReaderPreviewState = createEmptyReaderPreviewState();
  let currentReaderSelection: ReaderSelectionState | null = null;
  let focusedReadingState: ReaderFocusedReadingState = createReaderFocusedReadingState();
  let focusedReadingSummary = getReaderFocusedReadingSummary(focusedReadingState);
  let assistanceState = createEmptyReaderAssistanceState();
  let assistanceHistory: ReaderAssistanceHistoryEntry[] = [];
  let assistanceSelection: ReaderAssistanceWorkspaceSelection =
    createEmptyReaderAssistanceWorkspaceSelection();
  let assistanceRequestNonce = 0;
  let lastAssistanceBookKey = '';
  let lastRestoredTranslationModeConfigBookKey = '';
  let lastRestoredTranslationLiveSnapshotBookKey = '';
  let lastRestoredTtsOwnershipBookKey = '';
  let lastRestoredTtsReadAloudModeBookKey = '';
  let lastRestoredTranslatedTtsOwnerBookKey = '';
  let lastRestoredTranslatedTtsLiveSnapshotBookKey = '';
  let translatedTtsOwner: 'live' | 'archive' = 'live';
  let translationLiveSnapshot: ReaderTranslationLiveSnapshot | null = null;
  let liveTranslationPanelResult: ReaderLiveTranslationPanelResult | null = null;
  let translatedTtsLiveSnapshot:
    | {
        sourceText: string;
        translatedText: string;
        targetLanguage: string;
        providerLabel: string;
        chapterLabel: string;
        locationLabel: string;
        progressLabel: string;
        progressLocation: string;
        progressFraction: number | null;
        chapterHref: string;
      }
    | null = null;
  let nextTranslationLiveSnapshot: ReaderTranslationLiveSnapshot | null = null;
  let translationProviderStatuses: ReaderTranslationProviderStatus[] =
    createDefaultReaderTranslationProviderStatuses();

  type ReaderInlineTranslationCandidatesEvent = {
    candidates: Array<{
      id: string;
      sourceText: string;
      sourceLabel: string;
    }>;
    status: 'ready' | 'waiting' | 'unsupported';
    message: string;
    formatLabel: string;
  };
  const ttsController = createReaderTtsController();
  const ttsState = ttsController.state;
  const READER_PLAYBACK_TIMEOUT_PRESET_MS = 15 * 60 * 1000;

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
  $: ({
    notesStorageKey,
    bookmarksStorageKey,
    assistanceHistoryStorageKey,
    assistanceSelectionStorageKey,
    translationOwnershipStorageKey,
    translationModeConfigStorageKey,
    translationLiveSnapshotStorageKey,
    ttsOwnershipStorageKey,
    ttsReadAloudModeStorageKey,
    translatedTtsOwnerStorageKey,
    translatedTtsLiveSnapshotStorageKey
  } = getReaderCurrentBookPersistenceKeys(readerBookKey));

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
    void openNotebookWorkspaceTab('notes');
    sidebarController.openTab('notes');
  };

  const addHighlightFromSelection = () => {
    const added = notesController.addHighlightFromSelection();
    if (!added) return;
    void openNotebookWorkspaceTab('highlights');
    sidebarController.openTab('notes');
  };

  const openNote = (cfi: string) => {
    notesController.open(cfi);
    void openNotebookWorkspaceTab('notes');
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

  const NOTEBOOK_STORAGE_KEY = 'br1.reader.notebook-shell';

  const persistNotebookShell = () => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(
      NOTEBOOK_STORAGE_KEY,
      JSON.stringify({
        pinned: notebookPinned,
        activeTab: notebookTab
      })
    );
  };

  const getReaderStorage = () => (typeof localStorage === 'undefined' ? undefined : localStorage);

  const persistCurrentBookTtsOwnershipState = () => {
    persistReaderTtsOwnershipState({
      storage: getReaderStorage(),
      keys: {
        ttsOwnershipStorageKey,
        ttsReadAloudModeStorageKey,
        translatedTtsOwnerStorageKey,
        translatedTtsLiveSnapshotStorageKey
      },
      ownership: {
        followsCurrentLocation: ttsFollowsCurrentLocation,
        pinnedTarget: pinnedTtsTarget
      },
      readAloudTextMode: ttsReadAloudTextMode,
      translatedOwner: translatedTtsOwner,
      translatedLiveSnapshot: translatedTtsLiveSnapshot
    });
  };

  const restoreCurrentBookTtsOwnershipState = () => {
    const storage = getReaderStorage();
    return restoreReaderTtsOwnershipState({
      storage,
      keys: {
        ttsOwnershipStorageKey,
        ttsReadAloudModeStorageKey,
        translatedTtsOwnerStorageKey,
        translatedTtsLiveSnapshotStorageKey
      },
      defaultReadAloudTextMode: storage ? loadReaderSettings(storage).ttsReadAloudText : 'source',
      fallbackTranslatedOwner: resolveReaderTranslatedTtsOwnerFallback({
        routeOpenState,
        assistanceSelection
      })
    });
  };

  const resolveCurrentLiveTranslatedTtsResult = () =>
    resolveReaderLiveTranslatedTtsResult({
      normalizedTranslationSourceText: normalizeAssistanceText(effectiveTranslationSource.text),
      chapterLabel: currentPreview.chapterLabel.trim(),
      locationLabel: getReaderLocationDisplayLabel(currentPreview.locationLabel).trim(),
      progressLabel: currentPreview.progressLabel.trim(),
      progressLocation: currentPreview.progressLocation,
      progressFraction: currentPreview.progressFraction,
      chapterHref: currentPreview.chapterHref,
      effectiveTranslationSource,
      assistanceState,
      assistanceHistory,
      translatedLiveSnapshot: translatedTtsLiveSnapshot
    });

  const resolveCurrentReaderTtsSpeechTarget = () =>
    resolveReaderTtsSpeechTarget({
      readAloudTextMode: ttsReadAloudTextMode,
      selectedText: $notesState.selection?.text,
      preview: currentPreview,
      getLocationDisplayLabel: getReaderLocationDisplayLabel,
      effectiveTranslationSource,
      assistanceSelection,
      assistanceHistory,
      assistanceState,
      translatedOwner: translatedTtsOwner,
      translatedLiveSnapshot: translatedTtsLiveSnapshot
    });

  const syncReaderWorkspaceModeToRoute = async (
    request: ReaderWorkspaceModeRouteRequest
  ) => {
    const nextHref = toReaderWorkspaceModeHref(
      $page.url,
      request.workspaceMode,
      request.ttsReadAloudTextMode,
      request.translationTargetLanguage,
      request.translationProvider,
      request.translationHistoryEntryId
    );
    const currentHref = `${$page.url.pathname}${$page.url.search}`;
    if (nextHref === currentHref) return;
    await goto(nextHref, {
      replaceState: true,
      noScroll: true,
      keepFocus: true
    });
  };

  const openNotebookWorkspaceTab = async (tab: ReaderNotebookWorkspaceTab) => {
    notebookVisible = true;
    notebookTab = tab;
    await syncReaderWorkspaceModeToRoute(
      resolveReaderNotebookTabRouteRequest({
        tab,
        currentTtsReadAloudTextMode: ttsReadAloudTextMode,
        currentTranslationTargetLanguage: translationTargetLanguage,
        currentTranslationProvider: translationProvider,
        currentTranslationHistoryEntryId: assistanceSelection.translationHistoryEntryId
      })
    );
  };

  const closeNotebookWorkspace = async () => {
    notebookVisible = false;
    await syncReaderWorkspaceModeToRoute(
      resolveReaderWorkspaceModeRouteRequest({
        workspaceMode: null,
        ttsReadAloudTextMode: null,
        translationTargetLanguage: null,
        translationProvider: null,
        translationHistoryEntryId: null
      })
    );
  };

  onMount(() => {
    void (async () => {
      translationProviderStatuses = await loadReaderTranslationProviderStatuses();
    })();

    if (typeof localStorage === 'undefined') return;
    // Route-owned override ordering matters here: explicit URL state wins over
    // restored local state, which in turn wins over global defaults.
    ttsReadAloudTextMode = loadReaderSettings(localStorage).ttsReadAloudText;
    ttsReadAloudTextMode = resolveReaderRouteTtsReadAloudTextMode({
      routeOpenState,
      currentMode: ttsReadAloudTextMode
    });
    if (routeOpenState.translationHistoryEntryId) {
      assistanceSelection = {
        ...assistanceSelection,
        lookupHistoryEntryId: '',
        translationHistoryEntryId: routeOpenState.translationHistoryEntryId
      };
    }
    const rawNotebookShell = localStorage.getItem(NOTEBOOK_STORAGE_KEY);
    if (rawNotebookShell) {
      try {
        const restoredNotebookShell = resolveReaderNotebookShellState({
          persisted: JSON.parse(rawNotebookShell) as { pinned?: unknown; activeTab?: unknown },
          routeOpenState
        });
        notebookPinned = restoredNotebookShell.pinned;
        notebookVisible = restoredNotebookShell.visible;
        notebookTab = restoredNotebookShell.activeTab;
      } catch (error) {
        console.warn('Failed to restore reader notebook shell state', error);
      }
    } else if (routeOpenState.workspaceMode) {
      const restoredNotebookShell = resolveReaderNotebookShellState({
        persisted: null,
        routeOpenState
      });
      notebookPinned = restoredNotebookShell.pinned;
      notebookVisible = restoredNotebookShell.visible;
      notebookTab = restoredNotebookShell.activeTab;
    }
    searchController.restoreConfig();
    searchController.enablePersistence();
    sidebarController.restore();
  });

  $: {
    readerBookKey;
    searchController.refreshHistory();
  }
  $: if (readerBookKey !== lastAssistanceBookKey) {
    // Book switches are a route boundary: restore persisted per-book workspace
    // state first, then let route-owned overrides below clamp any shared shell UI.
    assistanceState = createEmptyReaderAssistanceState();
    assistanceHistory = restoreReaderCurrentBookAssistanceHistory(
      getReaderStorage(),
      assistanceHistoryStorageKey
    );
    assistanceSelection = restoreReaderCurrentBookAssistanceSelection(
      getReaderStorage(),
      assistanceSelectionStorageKey
    );
    if ($ttsState.status === 'speaking' || $ttsState.status === 'paused') {
      ttsController.stop();
    }
    const restoredTtsState = restoreCurrentBookTtsOwnershipState();
    ttsReadAloudTextMode = restoredTtsState.readAloudTextMode;
    lastRestoredTtsReadAloudModeBookKey = readerBookKey;
    translatedTtsOwner = restoredTtsState.translatedOwner;
    lastRestoredTranslatedTtsOwnerBookKey = readerBookKey;
    translatedTtsLiveSnapshot = restoredTtsState.translatedLiveSnapshot;
    lastRestoredTranslatedTtsLiveSnapshotBookKey = readerBookKey;
    ttsFollowsCurrentLocation = restoredTtsState.ownership.followsCurrentLocation;
    pinnedTtsTarget = restoredTtsState.ownership.pinnedTarget;
    lastRestoredTtsOwnershipBookKey = readerBookKey;
    const restoredTranslationOwnership = restoreReaderTranslationOwnership(
      getReaderStorage(),
      translationOwnershipStorageKey
    );
    translationFollowsCurrentSource = restoredTranslationOwnership.followsCurrentSource;
    pinnedTranslationSource = restoredTranslationOwnership.pinnedSource;
    const restoredTranslationModeConfig = restoreReaderCurrentBookTranslationModeConfig(
      getReaderStorage(),
      translationModeConfigStorageKey
    );
    const restoredTranslationConfig = resolveReaderTranslationModeConfigRestore({
      restoredConfig: restoredTranslationModeConfig,
      assistanceHistory,
      assistanceSelection,
      routeOpenState
    });
    translationTargetLanguage = restoredTranslationConfig.targetLanguage;
    translationProvider = restoredTranslationConfig.provider;
    lastRestoredTranslationModeConfigBookKey = readerBookKey;
    translationLiveSnapshot = restoreReaderCurrentBookTranslationLiveSnapshot(
      getReaderStorage(),
      translationLiveSnapshotStorageKey
    );
    lastRestoredTranslationLiveSnapshotBookKey = readerBookKey;
    inlineTranslationState = createEmptyReaderInlineTranslationState({
      provider: translationProvider,
      targetLanguage: translationTargetLanguage.trim().toLowerCase() === 'en' ? 'en' : 'zh'
    });
    inlineTranslationStatusMessage = '等待可翻译正文。';
    inlineTranslationCapabilityMessage = '正文内译文会等待阅读视窗提供安全正文候选。';
    latestInlineTranslationCandidates = null;
    // Annotation popup visibility is derived from the active selection, so a
    // new book source must clear the old selection before the next renderer
    // event arrives.
    currentReaderSelection = resolveReaderAnnotationPopupSelectionForBookChange({
      currentSelection: currentReaderSelection,
      previousBookKey: lastAssistanceBookKey,
      nextBookKey: readerBookKey
    });
    focusedReadingState = createReaderFocusedReadingState();
    lastAssistanceBookKey = readerBookKey;
  }
  $: {
    const routeWorkspaceApplication = resolveReaderRouteWorkspaceApplication({
      routeOpenState,
      lastAppliedRouteWorkspaceMode
    });
    if (routeWorkspaceApplication.kind === 'open') {
      lastAppliedRouteWorkspaceMode = routeWorkspaceApplication.lastAppliedRouteWorkspaceMode;
      notebookVisible = routeWorkspaceApplication.notebookVisible;
      notebookTab = routeWorkspaceApplication.notebookTab;
    } else if (routeWorkspaceApplication.kind === 'clear') {
      lastAppliedRouteWorkspaceMode = routeWorkspaceApplication.lastAppliedRouteWorkspaceMode;
    }
  }
  $: {
    const routeTtsReadAloudTextMode = resolveReaderRouteTtsReadAloudTextMode({
      routeOpenState,
      currentMode: ttsReadAloudTextMode
    });
    if (routeTtsReadAloudTextMode !== ttsReadAloudTextMode) {
      ttsReadAloudTextMode = routeTtsReadAloudTextMode;
    }
  }
  $: {
    // Only dedicated translation routes are allowed to retune the shared
    // translation config. Inline translation reuses that config, but it must
    // not become a second route owner.
    const routeTranslationConfig = resolveReaderMaturityRouteTranslationConfig({
      currentConfig: {
        targetLanguage: translationTargetLanguage,
        provider: translationProvider
      },
      assistanceHistory,
      routeOpenState
    });
    if (routeTranslationConfig.targetLanguage !== translationTargetLanguage) {
      translationTargetLanguage = routeTranslationConfig.targetLanguage;
    }
    if (routeTranslationConfig.provider !== translationProvider) {
      translationProvider = routeTranslationConfig.provider;
    }
  }
  $: {
    const nextInlineTargetLanguage = (
      translationTargetLanguage.trim().toLowerCase() === 'en' ? 'en' : 'zh'
    ) satisfies ReaderInlineTranslationTargetLanguage;
    if (
      inlineTranslationState.targetLanguage !== nextInlineTargetLanguage ||
      inlineTranslationState.provider !== translationProvider
    ) {
      inlineTranslationState = {
        ...inlineTranslationState,
        targetLanguage: nextInlineTargetLanguage,
        provider: translationProvider
      };
    }
  }
  $: inlineTranslationSummary = getReaderInlineTranslationSummary(inlineTranslationState);
  $: focusedReadingSummary = getReaderFocusedReadingSummary(focusedReadingState);
  $: if (
    routeOpenState.translationHistoryEntryId &&
    routeOpenState.translationHistoryEntryId !== assistanceSelection.translationHistoryEntryId
  ) {
    assistanceSelection = {
      ...assistanceSelection,
      lookupHistoryEntryId: '',
      translationHistoryEntryId: routeOpenState.translationHistoryEntryId
    };
  }
  $: if (routeOpenState.workspaceMode === 'translation' || routeOpenState.workspaceMode === 'tts') {
    const nextTranslatedTtsOwner = resolveReaderRouteTranslatedTtsOwner({
      currentOwner: translatedTtsOwner,
      routeOpenState
    });
    if (translatedTtsOwner !== nextTranslatedTtsOwner) {
      translatedTtsOwner = nextTranslatedTtsOwner;
    }
  }
  $: {
    currentPreview;
    assistanceSelection;
    assistanceHistory;
    assistanceState;
    ttsReadAloudTextMode;
    effectiveTranslationSource;
    translatedTtsOwner;
    $notesState.selection;
    resolvedTtsTarget = resolveCurrentReaderTtsSpeechTarget();
  }
  $: effectiveTtsTarget = resolveReaderEffectiveTtsTarget({
    followsCurrentLocation: ttsFollowsCurrentLocation,
    pinnedTarget: pinnedTtsTarget,
    resolvedTarget: resolvedTtsTarget
  });
  // Route-local playback panel state stays separate from persisted TTS
  // ownership. Rebuilding from the current effective target keeps Task 4's pure
  // queue helper as the single source of queue/rate/timeout semantics.
  $: {
    effectiveTtsTarget;
    const playbackQueueRetarget = resolveReaderPlaybackQueueForEffectiveTtsTarget({
      effectiveTtsTarget,
      currentState: ttsPlaybackQueueState,
      lastTargetKey: lastPlaybackQueueTargetKey
    });
    if (playbackQueueRetarget.didReset) {
      ttsPlaybackQueueState = playbackQueueRetarget.state;
      lastPlaybackQueueTargetKey = playbackQueueRetarget.targetKey;
    }
  }
  $: ttsPlaybackQueueSummary = getReaderPlaybackQueueSummary(ttsPlaybackQueueState, ttsPlaybackNow);
  $: ttsPlaybackTarget = ttsPlaybackQueueSummary.currentSegment?.target ?? effectiveTtsTarget;
  $: ttsPlaybackSupportsSegmentNavigation = ttsPlaybackQueueState.segments.length > 1;
  $: ttsPlaybackCanGoToPreviousSegment =
    ttsPlaybackQueueState.segments.length > 1 && ttsPlaybackQueueState.activeIndex > 0;
  $: ttsPlaybackCanGoToNextSegment =
    ttsPlaybackQueueState.segments.length > 1 &&
    ttsPlaybackQueueState.activeIndex < ttsPlaybackQueueState.segments.length - 1;
  $: {
    const timeoutAt = ttsPlaybackQueueState.timeoutAt;
    if (playbackTimeoutTicker) {
      clearInterval(playbackTimeoutTicker);
      playbackTimeoutTicker = null;
    }

    if (typeof timeoutAt !== 'number' || timeoutAt <= Date.now()) {
      ttsPlaybackNow = Date.now();
    } else {
      ttsPlaybackNow = Date.now();
      playbackTimeoutTicker = setInterval(() => {
        const now = Date.now();
        ttsPlaybackNow = now;
        if (typeof ttsPlaybackQueueState.timeoutAt === 'number' && ttsPlaybackQueueState.timeoutAt <= now) {
          ttsPlaybackQueueState = setReaderPlaybackTimeout(ttsPlaybackQueueState, {
            durationMs: null,
            now
          });
          if ($ttsState.status === 'speaking' || $ttsState.status === 'paused') {
            ttsController.stop();
          }
        }
      }, 1000);
    }
  }
  $: {
    currentPreview;
    $notesState.selection;
    resolvedTranslationSource = resolveReaderTranslationModeSource();
  }
  $: effectiveTranslationSource = resolveReaderEffectiveTranslationSource(
    {
      followsCurrentSource: translationFollowsCurrentSource,
      pinnedSource: pinnedTranslationSource
    },
    resolvedTranslationSource
  );
  $: {
    nextTranslationLiveSnapshot = resolveReaderNextTranslationLiveSnapshot({
      source: effectiveTranslationSource,
      assistanceState,
      assistanceHistory
    });
  }
  $: {
    liveTranslationPanelResult = resolveReaderLiveTranslationPanelResult({
      source: effectiveTranslationSource,
      assistanceState,
      assistanceHistory,
      liveSnapshot: translationLiveSnapshot
    });
  }
  $: {
    translationLiveSnapshotStorageKey;
    readerBookKey;
    lastRestoredTranslationLiveSnapshotBookKey;
    translationLiveSnapshot;
    if (
      typeof localStorage !== 'undefined' &&
      readerBookKey &&
      readerBookKey === lastRestoredTranslationLiveSnapshotBookKey
    ) {
      persistReaderCurrentBookTranslationLiveSnapshot(
        getReaderStorage(),
        translationLiveSnapshotStorageKey,
        translationLiveSnapshot
      );
    }
  }
  $: {
    nextTranslationLiveSnapshot;
    const resolvedTranslationLiveSnapshot = resolveReaderTranslationLiveSnapshotState({
      source: effectiveTranslationSource,
      currentSnapshot: translationLiveSnapshot,
      nextSnapshot: nextTranslationLiveSnapshot
    });
    if (resolvedTranslationLiveSnapshot !== translationLiveSnapshot) {
      translationLiveSnapshot = resolvedTranslationLiveSnapshot;
    }
  }
  $: {
    const translatedSourceState = resolveReaderTranslatedTtsSourceState({
      owner: translatedTtsOwner,
      assistanceSelection,
      assistanceHistory,
      effectiveTranslationSource,
      translationFollowsCurrentSource
    });
    translatedTtsSourceKind = translatedSourceState.kind;
    translatedTtsSourceContextLabel = translatedSourceState.contextLabel;
    translatedTtsSourceText = translatedSourceState.text;
  }
  $: if ($ttsState.status !== 'speaking' && $ttsState.status !== 'paused') {
    ttsController.setSpeechTarget(ttsPlaybackTarget);
  }
  $: activeTtsProgressLocation = $ttsState.speechProgressLocation.trim();
  $: currentPreviewProgressLocation = currentPreview.progressLocation.trim();
  $: canJumpToCurrentTtsLocation =
    !!activeTtsProgressLocation &&
    !!currentPreviewProgressLocation &&
    isReaderTtsPlaybackLocationDrifted($ttsState, currentPreview);
  $: ttsMiniBarLocationSummary = resolveReaderTtsMiniBarLocationSummary({
    state: $ttsState,
    target: effectiveTtsTarget,
    readAloudTextMode: ttsReadAloudTextMode,
    preview: currentPreview,
    getLocationDisplayLabel: getReaderLocationDisplayLabel
  });
  $: ttsMiniBarTranslatedWaitingTargetLabel = resolveReaderTtsTranslatedWaitingTargetLabel({
    state: $ttsState,
    target: effectiveTtsTarget,
    readAloudTextMode: ttsReadAloudTextMode,
    translatedSourceKind: translatedTtsSourceKind,
    translatedSourceContextLabel: translatedTtsSourceContextLabel
  });
  $: ttsMiniBarVisible = resolveReaderTtsMiniBarVisible({
    state: $ttsState,
    target: effectiveTtsTarget,
    translatedWaitingTargetLabel: ttsMiniBarTranslatedWaitingTargetLabel
  });
  $: ttsMiniBarStatusLabel = getReaderTtsSessionStatusLabel($ttsState);
  $: ttsMiniBarContextSummary = resolveReaderTtsMiniBarContextSummary({
    state: $ttsState,
    readAloudTextMode: ttsReadAloudTextMode,
    translatedSourceKind: translatedTtsSourceKind,
    translatedSourceContextLabel: translatedTtsSourceContextLabel
  });
  $: ttsMiniBarTargetLabel =
    getReaderTtsReadableTargetLabel($ttsState) ||
    effectiveTtsTarget?.targetLabel?.trim() ||
    effectiveTtsTarget?.label?.trim() ||
    ttsMiniBarTranslatedWaitingTargetLabel;
  $: ttsMiniBarPrimaryActionLabel = getReaderTtsPrimaryActionLabel($ttsState);
  $: ttsMiniBarCanStop = $ttsState.status === 'speaking' || $ttsState.status === 'paused';
  $: ttsMiniBarCanRunPrimaryAction =
    (!!effectiveTtsTarget?.text.trim() && $ttsState.status !== 'unavailable') ||
    ($ttsState.status === 'paused' && !!getReaderTtsReadableTargetLabel($ttsState));
  $: ttsMiniBarCanOpenTranslationMode =
    !notebookVisible &&
    ttsReadAloudTextMode === 'translated' &&
    (!!translatedTtsSourceText.trim() ||
      translatedTtsSourceKind !== 'none' ||
      !!translatedTtsSourceContextLabel.trim());
  $: ttsMiniBarCanResumeFollowingCurrent = !notebookVisible && !ttsFollowsCurrentLocation;
  $: ttsMiniBarCanPinCurrentTarget =
    !notebookVisible && ttsFollowsCurrentLocation && !!effectiveTtsTarget?.text.trim();
  $: ttsMiniBarCanSwitchMode =
    !notebookVisible &&
    (ttsReadAloudTextMode === 'source'
      ? (!!translatedTtsSourceText.trim() ||
          translatedTtsSourceKind !== 'none' ||
          !!translatedTtsSourceContextLabel.trim())
      : true);
  $: ttsMiniBarModeSwitchLabel =
    ttsReadAloudTextMode === 'translated' ? '切换到朗读原文' : '切换到朗读译文';
  $: if (typeof localStorage !== 'undefined') {
    persistNotebookShell();
  }
  $: {
    assistanceHistory;
    assistanceHistoryStorageKey;
    if (typeof localStorage !== 'undefined') {
      persistReaderCurrentBookAssistanceHistory(
        getReaderStorage(),
        assistanceHistoryStorageKey,
        assistanceHistory
      );
    }
  }
  $: {
    assistanceSelection;
    assistanceSelectionStorageKey;
    if (typeof localStorage !== 'undefined') {
      persistReaderCurrentBookAssistanceSelection(
        getReaderStorage(),
        assistanceSelectionStorageKey,
        assistanceSelection
      );
    }
  }
  $: {
    readerBookKey;
    translationModeConfigStorageKey;
    translationTargetLanguage;
    translationProvider;
    if (
      typeof localStorage !== 'undefined' &&
      readerBookKey &&
      readerBookKey === lastRestoredTranslationModeConfigBookKey
    ) {
      persistReaderCurrentBookTranslationModeConfig(
        getReaderStorage(),
        translationModeConfigStorageKey,
        {
          targetLanguage: translationTargetLanguage.trim().toLowerCase() || 'zh',
          provider: translationProvider
        }
      );
    }
  }
  $: {
    currentPreview;
    assistanceState;
    assistanceHistory;
    effectiveTranslationSource;
    translatedTtsOwner;
    const nextTranslatedTtsLiveSnapshot = resolveReaderTranslatedTtsLiveSnapshotState({
      translatedOwner: translatedTtsOwner,
      currentSnapshot: translatedTtsLiveSnapshot,
      sourceText: effectiveTranslationSource.text,
      liveTranslationResult: resolveCurrentLiveTranslatedTtsResult()
    });
    if (nextTranslatedTtsLiveSnapshot !== translatedTtsLiveSnapshot) {
      translatedTtsLiveSnapshot = nextTranslatedTtsLiveSnapshot;
    }
  }
  $: {
    readerBookKey;
    ttsOwnershipStorageKey;
    ttsReadAloudModeStorageKey;
    translatedTtsOwnerStorageKey;
    translatedTtsLiveSnapshotStorageKey;
    ttsFollowsCurrentLocation;
    pinnedTtsTarget;
    ttsReadAloudTextMode;
    translatedTtsOwner;
    translatedTtsLiveSnapshot;
    if (
      typeof localStorage !== 'undefined' &&
      readerBookKey &&
      readerBookKey === lastRestoredTtsOwnershipBookKey &&
      readerBookKey === lastRestoredTtsReadAloudModeBookKey &&
      readerBookKey === lastRestoredTranslatedTtsOwnerBookKey &&
      readerBookKey === lastRestoredTranslatedTtsLiveSnapshotBookKey
    ) {
      persistCurrentBookTtsOwnershipState();
    }
  }
  $: {
    translationOwnershipStorageKey;
    translationFollowsCurrentSource;
    pinnedTranslationSource;
    if (typeof localStorage !== 'undefined') {
      persistReaderTranslationOwnership(getReaderStorage(), translationOwnershipStorageKey, {
        followsCurrentSource: translationFollowsCurrentSource,
        pinnedSource: pinnedTranslationSource
      });
    }
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

  $: if (!currentFormatSupportsTextAnnotations) {
    notesController.setSelection(null);
  }
  // The popup can still mirror a PDF/CBZ selection for copy, but route-owned
  // note/highlight state should stay off until the format has a trustworthy
  // annotation locator instead of a presentation-only text selection.
  $: currentFormatSupportsTextAnnotations =
    supportsTextAnnotationsForFormat(currentPreview.formatLabel) &&
    currentPreview.formatLabel !== 'PDF' &&
    currentPreview.formatLabel !== 'CBZ';
  $: annotationPopupSupportsActions = currentFormatSupportsTextAnnotations;
  $: {
    const normalizedSelectionText = normalizeAssistanceText(currentReaderSelection?.text || '');
    annotationPopupSelectionSummary = normalizedSelectionText
      ? normalizedSelectionText.length > 72
        ? `${normalizedSelectionText.slice(0, 69).trimEnd()}...`
        : normalizedSelectionText
      : '';
    annotationPopupSelectionDetail = normalizedSelectionText
      ? [
          currentReaderSelection?.chapterLabel?.trim() || '',
          `${normalizedSelectionText.length} 个字符`
        ]
          .filter(Boolean)
          .join(' · ')
      : '';
  }
  $: annotationPopupSupportMessage =
    currentPreview.formatLabel === 'PDF' || currentPreview.formatLabel === 'CBZ'
      ? `${currentPreview.formatLabel} 选区暂时只保留复制，避免把还不稳定的正文选区伪装成可写标注。`
      : '当前格式暂时只保留复制。';
  const refreshCurrentManagedBookState = async () => {
    if (!sourcePath || !autoOpenLibraryFile) {
      currentManagedBook = null;
      currentCoverUrl = '';
      return;
    }

    try {
      const records = await loadPersistedLibraryBooks();
      const match = records.find((record) => record.filePath === sourcePath);
      currentManagedBook = match ?? null;
      currentCoverUrl = match ? await toLibraryCoverUrl(match) : '';
    } catch (error) {
      console.warn('Failed to resolve reader cover for sidebar book card', error);
      currentManagedBook = null;
      currentCoverUrl = '';
    }
  };

  $: {
    sourcePath;
    void refreshCurrentManagedBookState();
  }
  $: if (!sourcePath || !autoOpenLibraryFile) {
    currentManagedBook = null;
  }

  const setReaderSyncNotice = (kind: 'info' | 'error', message: string) => {
    readerSyncNotice = { kind, message };
  };

  const clearReaderSyncRetryAction = () => {
    readerSyncRetryAction = null;
  };

  const recordSyncActivity = (
    scope: 'current-book' | 'library',
    actionLabel: string,
    status: 'success' | 'error' | 'cancelled',
    message: string
  ) => {
    const activity = {
      actionLabel,
      status,
      message,
      recordedAt: Date.now()
    };

    if (scope === 'current-book') {
      currentBookSyncActivity = activity;
      return;
    }

    librarySyncActivity = activity;
  };

  const exportCurrentBookKoReaderExchange = async () => {
    if (!currentManagedBook) {
      setReaderSyncNotice('error', '只有从 br1 受管书库打开的图书，才可以直接导出当前图书的 KOReader 交换文件。');
      return;
    }

    readerSyncBusyAction = 'export-current';
    readerSyncNotice = null;
    clearReaderSyncRetryAction();
    try {
      const snapshot = createLocalSyncSnapshot({
        libraryBooks: [currentManagedBook],
        bookmarkStates: [{ bookKey: currentManagedBook.filePath, bookmarks: $bookmarksState.bookmarks }],
        noteStates: [{ bookKey: currentManagedBook.filePath, notes: $notesState.notes }],
        highlightsWorkspaceStates: []
      });
      const document = createKoReaderSyncExchangeFromSnapshot(snapshot);
      const result = await saveKoReaderSyncExchangeDialog(document);
      readerKoReaderExchangeExportResult = result;
      if (result.cancelled) {
        recordSyncActivity('current-book', '导出当前图书交换文件', 'cancelled', '已取消当前图书 KOReader 交换文件导出。');
        setReaderSyncNotice('info', '已取消当前图书 KOReader 交换文件导出。');
        return;
      }

      recordSyncActivity(
        'current-book',
        '导出当前图书交换文件',
        'success',
        `已导出当前图书 KOReader 交换文件${result.fileName ? `：${result.fileName}` : ''}。`
      );
      setReaderSyncNotice(
        'info',
        `已导出当前图书 KOReader 交换文件${result.fileName ? `：${result.fileName}` : ''}。`
      );
    } catch (error) {
      console.error('Failed to export current-book KOReader exchange', error);
      readerSyncRetryAction = exportCurrentBookKoReaderExchange;
      recordSyncActivity(
        'current-book',
        '导出当前图书交换文件',
        'error',
        '导出当前图书 KOReader 交换文件失败，请确认桌面权限和当前图书状态后重试。'
      );
      setReaderSyncNotice('error', '导出当前图书 KOReader 交换文件失败，请确认桌面权限和当前图书状态后重试。');
    } finally {
      readerSyncBusyAction = null;
    }
  };

  const importKoReaderExchangeFromReader = async () => {
    readerSyncBusyAction = 'import-exchange';
    readerSyncNotice = null;
    clearReaderSyncRetryAction();
    try {
      const imported = await restoreKoReaderSyncExchangeDialog();
      readerKoReaderExchangeImportResult = imported;
      if (imported.cancelled) {
        recordSyncActivity('library', '导入交换文件', 'cancelled', '已取消 KOReader 交换文件导入。');
        setReaderSyncNotice('info', '已取消 KOReader 交换文件导入。');
        return;
      }
      if (!imported.applyResult) {
        recordSyncActivity(
          'library',
          '导入交换文件',
          'error',
          `KOReader 交换文件恢复未返回应用结果${imported.fileName ? `：${imported.fileName}` : ''}。`
        );
        setReaderSyncNotice(
          'error',
          `KOReader 交换文件恢复未返回应用结果${imported.fileName ? `：${imported.fileName}` : ''}。`
        );
        return;
      }
      if (imported.applyResult.appliedBookCount <= 0) {
        recordSyncActivity('library', '导入交换文件', 'error', 'KOReader 导入没有应用任何图书。');
        setReaderSyncNotice('error', 'KOReader 导入没有应用任何图书。');
        return;
      }
      await refreshCurrentManagedBookState();
      recordSyncActivity(
        'library',
        '导入交换文件',
        'success',
        `已导入 KOReader 交换文件${imported.fileName ? `：${imported.fileName}` : ''}，应用 ${imported.applyResult.appliedBookCount} 本，跳过 ${imported.applyResult.skippedBookCount} 本。`
      );
      setReaderSyncNotice(
        'info',
        `已导入 KOReader 交换文件${imported.fileName ? `：${imported.fileName}` : ''}，应用 ${imported.applyResult.appliedBookCount} 本，跳过 ${imported.applyResult.skippedBookCount} 本。`
      );
    } catch (error) {
      console.error('Failed to import KOReader exchange from reader workspace', error);
      const detail = error instanceof Error ? error.message : '请检查交换文件是否完整有效。';
      readerSyncRetryAction = importKoReaderExchangeFromReader;
      recordSyncActivity('library', '导入交换文件', 'error', `导入 KOReader 交换文件失败：${detail}`);
      setReaderSyncNotice('error', `导入 KOReader 交换文件失败：${detail}`);
    } finally {
      readerSyncBusyAction = null;
    }
  };

  const pushKoReaderRemoteSyncFromReader = async () => {
    readerSyncBusyAction = 'push-remote';
    readerSyncNotice = null;
    clearReaderSyncRetryAction();
    try {
      const result = await runKoReaderRemoteSync({ operation: 'push' });
      readerKoReaderRemoteSyncResult = result;
      recordSyncActivity(
        'library',
        '推送远端阅读进度',
        result.status === 'success' || result.status === 'empty' ? 'success' : 'error',
        result.message
      );
      setReaderSyncNotice(
        result.status === 'success' || result.status === 'empty' ? 'info' : 'error',
        result.status === 'success' || result.status === 'empty'
          ? `${result.message} 书签和批注不会通过官方 KOSync 远端同步。`
          : result.message
      );
    } catch (error) {
      console.error('Failed to push KOReader remote progress from reader workspace', error);
      readerSyncRetryAction = pushKoReaderRemoteSyncFromReader;
      recordSyncActivity('library', '推送远端阅读进度', 'error', '推送 KOReader 阅读进度失败，请稍后重试。');
      setReaderSyncNotice('error', '推送 KOReader 阅读进度失败，请稍后重试。');
    } finally {
      readerSyncBusyAction = null;
    }
  };

  const pullKoReaderRemoteSyncFromReader = async () => {
    readerSyncBusyAction = 'pull-remote';
    readerSyncNotice = null;
    clearReaderSyncRetryAction();
    try {
      const result = await runKoReaderRemoteSync({ operation: 'pull' });
      readerKoReaderRemoteSyncResult = result;
      if (result.status === 'success' || result.status === 'empty') {
        await refreshCurrentManagedBookState();
      }
      recordSyncActivity(
        'library',
        '拉取远端阅读进度',
        result.status === 'success' || result.status === 'empty' ? 'success' : 'error',
        result.message
      );
      setReaderSyncNotice(
        result.status === 'success' || result.status === 'empty' ? 'info' : 'error',
        result.status === 'success'
          ? `${result.message} 书签和批注不会通过官方 KOSync 回填。`
          : result.message
      );
    } catch (error) {
      console.error('Failed to pull KOReader remote progress from reader workspace', error);
      readerSyncRetryAction = pullKoReaderRemoteSyncFromReader;
      recordSyncActivity('library', '拉取远端阅读进度', 'error', '拉取 KOReader 阅读进度失败，请稍后重试。');
      setReaderSyncNotice('error', '拉取 KOReader 阅读进度失败，请稍后重试。');
    } finally {
      readerSyncBusyAction = null;
    }
  };

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
    ttsController.setSpeechTarget(resolveCurrentReaderTtsSpeechTarget());

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
    };
  });

  onDestroy(() => {
    if (playbackTimeoutTicker) {
      clearInterval(playbackTimeoutTicker);
      playbackTimeoutTicker = null;
    }
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
    ttsController.start(ttsPlaybackTarget);
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

  const copyCurrentSelection = async () => {
    const selectionText = normalizeAssistanceText(currentReaderSelection?.text || '');
    if (!selectionText || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;

    try {
      await navigator.clipboard.writeText(selectionText);
    } catch (error) {
      console.warn('Failed to copy the current reader selection', error);
    }
  };

  const lookupCurrentSelection = () => {
    const selectionText = normalizeAssistanceTerm(currentReaderSelection?.text || '');
    if (!selectionText) return;
    void requestAssistanceLookup('wikipedia', selectionText);
  };

  const translateCurrentSelection = () => {
    const selectionText = normalizeAssistanceText(currentReaderSelection?.text || '');
    if (!selectionText) return;
    void requestAssistanceTranslation(translationProvider, selectionText, translationTargetLanguage);
  };

  const readCurrentSelectionAloud = () => {
    handleTtsStart();
    void openNotebookWorkspaceTab('tts');
  };

  const jumpToCurrentTtsLocation = () => {
    const progressLocation = $ttsState.speechProgressLocation.trim();
    if (!progressLocation) return;
    controlNonce += 1;
    issuePrimaryControlRequest({
      type: 'href',
      href: progressLocation,
      nonce: controlNonce
    });
  };

  const applyTtsRetarget = (nextTarget: ReaderTtsSpeechTarget | null) => {
    const action = planReaderTtsRetargetAction($ttsState.status);

    if (action === 'restart-session') {
      ttsController.start(nextTarget);
      return;
    }

    if (action === 'stop-and-arm-target') {
      ttsController.stop();
      ttsController.setSpeechTarget(nextTarget);
      return;
    }

    ttsController.setSpeechTarget(nextTarget);
  };

  const retargetPlaybackQueue = (nextState: ReaderPlaybackQueueState) => {
    ttsPlaybackQueueState = nextState;
    applyTtsRetarget(getReaderPlaybackQueueSummary(nextState).currentSegment?.target ?? null);
  };

  const goToPreviousPlaybackSegment = () => {
    if (!ttsPlaybackCanGoToPreviousSegment) return;
    retargetPlaybackQueue(moveReaderPlaybackQueuePrevious(ttsPlaybackQueueState));
  };

  const goToNextPlaybackSegment = () => {
    if (!ttsPlaybackCanGoToNextSegment) return;
    retargetPlaybackQueue(moveReaderPlaybackQueueNext(ttsPlaybackQueueState));
  };

  const setPlaybackRateForRoute = (rate: number) => {
    ttsPlaybackQueueState = setReaderPlaybackRate(ttsPlaybackQueueState, rate);
  };

  const togglePlaybackTimeoutForRoute = () => {
    ttsPlaybackQueueState = setReaderPlaybackTimeout(ttsPlaybackQueueState, {
      durationMs: ttsPlaybackQueueState.timeoutAt ? null : READER_PLAYBACK_TIMEOUT_PRESET_MS,
      now: Date.now()
    });
  };

  const pinCurrentTtsTarget = () => {
    pinnedTtsTarget = resolvedTtsTarget
      ? {
          ...resolvedTtsTarget,
          followsCurrent: false
        }
      : null;
    ttsFollowsCurrentLocation = false;
    persistCurrentBookTtsOwnershipState();
    applyTtsRetarget(pinnedTtsTarget);
  };

  const resumeFollowingCurrentTtsTarget = () => {
    ttsFollowsCurrentLocation = true;
    pinnedTtsTarget = null;
    persistCurrentBookTtsOwnershipState();
    applyTtsRetarget(resolvedTtsTarget);
  };

  const setTranslatedTtsOwner = (owner: 'live' | 'archive') => {
    if (translatedTtsOwner === owner) return;
    translatedTtsOwner = owner;
    persistCurrentBookTtsOwnershipState();
  };

  const setTtsReadAloudTextMode = (mode: ReaderTtsReadAloudTextMode) => {
    if (ttsReadAloudTextMode === mode) return;
    ttsReadAloudTextMode = mode;
    persistCurrentBookTtsOwnershipState();
    if (!ttsFollowsCurrentLocation) {
      pinnedTtsTarget = null;
      ttsFollowsCurrentLocation = true;
    }
    applyTtsRetarget(resolveCurrentReaderTtsSpeechTarget());
    if (routeOpenState.workspaceMode === 'tts' || (notebookVisible && notebookTab === 'tts')) {
      void syncReaderWorkspaceModeToRoute(
        resolveReaderWorkspaceModeRouteRequest({
          workspaceMode: 'tts',
          ttsReadAloudTextMode: mode,
          translationTargetLanguage,
          translationProvider,
          translationHistoryEntryId: assistanceSelection.translationHistoryEntryId
        })
      );
    }
  };

  const openTtsWorkspace = () => {
    void openNotebookWorkspaceTab('tts');
  };

  const openTranslatedTtsWorkspace = () => {
    const translatedTtsWorkspaceRequest = resolveReaderTranslatedTtsWorkspaceRequest({
      routeOpenState,
      translatedTtsSourceKind,
      selectedTranslationHistoryEntryId: assistanceSelection.translationHistoryEntryId,
      currentTranslationTargetLanguage: translationTargetLanguage,
      currentTranslationProvider: translationProvider
    });
    setTranslatedTtsOwner(translatedTtsWorkspaceRequest.translatedOwner);
    if (ttsReadAloudTextMode !== 'translated') {
      ttsReadAloudTextMode = 'translated';
      persistCurrentBookTtsOwnershipState();
      if (!ttsFollowsCurrentLocation) {
        pinnedTtsTarget = null;
        ttsFollowsCurrentLocation = true;
      }
      applyTtsRetarget(resolveCurrentReaderTtsSpeechTarget());
    }
    notebookVisible = true;
    notebookTab = 'tts';
    void syncReaderWorkspaceModeToRoute(translatedTtsWorkspaceRequest.routeRequest);
  };

  const openTranslationMode = () => {
    void openNotebookWorkspaceTab('translation');
  };

  const applyInlineTranslationCandidates = (detail: ReaderInlineTranslationCandidatesEvent) => {
    if (!detail.candidates.length) {
      inlineTranslationStatusMessage = detail.message || '等待可翻译正文。';
      return;
    }

    inlineTranslationState = detail.candidates.reduce(
      (state, candidate) =>
        upsertReaderInlineTranslationCandidate(state, {
          id: candidate.id,
          sourceText: candidate.sourceText,
          sourceLabel: candidate.sourceLabel
        }),
      inlineTranslationState
    );
    inlineTranslationStatusMessage = `等待可翻译正文；已接收 ${detail.candidates.length} 段正文候选，等待 provider 工作流翻译。`;
  };

  const toggleInlineTranslationEnabled = () => {
    const nextEnabled = !inlineTranslationState.enabled;
    inlineTranslationState = {
      ...inlineTranslationState,
      enabled: nextEnabled
    };
    inlineTranslationStatusMessage = nextEnabled ? '等待可翻译正文。' : '正文内译文已关闭。';
    inlineTranslationCapabilityMessage = nextEnabled
      ? '候选只来自当前视窗已暴露给 reader 的安全正文摘录。'
      : '正文内译文会等待阅读视窗提供安全正文候选。';
    if (nextEnabled && latestInlineTranslationCandidates) {
      // Enabling happens after the viewport may already have emitted its current
      // reader-state event, so replay the last safe candidate instead of waiting
      // for the user to scroll or turn the page.
      applyInlineTranslationCandidates(latestInlineTranslationCandidates);
    }
  };

  const handleInlineTranslationCandidates = (detail: ReaderInlineTranslationCandidatesEvent) => {
    latestInlineTranslationCandidates = detail;
    inlineTranslationCapabilityMessage = detail.message || '等待可翻译正文。';
    if (!inlineTranslationState.enabled) {
      return;
    }

    applyInlineTranslationCandidates(detail);
  };

  // Focused reading is route-owned on purpose: the overlay should reuse the
  // same preview/selection contract as translation and TTS instead of letting a
  // canvas-local component infer extra reader state from DOM.
  const getFocusedReadingInput = () => ({
    preview: currentPreview,
    selection: currentReaderSelection
  });

  const startParagraphFocusMode = () => {
    focusedReadingState = startReaderParagraphFocus(focusedReadingState, getFocusedReadingInput());
  };

  const startRsvpLiteMode = () => {
    focusedReadingState = startReaderRsvpLite(focusedReadingState, getFocusedReadingInput());
  };

  const exitFocusedReadingMode = () => {
    focusedReadingState = exitReaderFocusedReading(focusedReadingState);
  };

  const moveFocusedReadingWord = (delta: number) => {
    focusedReadingState = advanceReaderRsvpWord(focusedReadingState, delta);
  };

  const toggleInlineTranslationSourceVisibility = () => {
    inlineTranslationState = toggleReaderInlineTranslationVisibility(inlineTranslationState, {
      showSource: !inlineTranslationState.showSource
    });
  };

  const toggleInlineTranslationTranslationVisibility = () => {
    inlineTranslationState = toggleReaderInlineTranslationVisibility(inlineTranslationState, {
      showTranslation: !inlineTranslationState.showTranslation
    });
  };

  const setTranslationTargetLanguage = (language: string) => {
    const normalizedLanguage = language.trim().toLowerCase() || 'zh';
    if (translationTargetLanguage === normalizedLanguage) return;
    translationTargetLanguage = normalizedLanguage;
    if (routeOpenState.workspaceMode === 'translation' || notebookTab === 'translation') {
      void syncReaderWorkspaceModeToRoute(
        resolveReaderWorkspaceModeRouteRequest({
          workspaceMode: 'translation',
          ttsReadAloudTextMode: null,
          translationTargetLanguage: normalizedLanguage,
          translationProvider,
          translationHistoryEntryId: assistanceSelection.translationHistoryEntryId
        })
      );
    }
  };

  const setTranslationProvider = (provider: ReaderTranslationProvider) => {
    if (translationProvider === provider) return;
    translationProvider = provider;
    if (routeOpenState.workspaceMode === 'translation' || notebookTab === 'translation') {
      void syncReaderWorkspaceModeToRoute(
        resolveReaderWorkspaceModeRouteRequest({
          workspaceMode: 'translation',
          ttsReadAloudTextMode: null,
          translationTargetLanguage,
          translationProvider: provider,
          translationHistoryEntryId: assistanceSelection.translationHistoryEntryId
        })
      );
    }
  };

  const pinCurrentTranslationSource = (source?: { text: string; label: string }) => {
    pinnedTranslationSource = createPinnedReaderTranslationSource(
      {
        text: source?.text || effectiveTranslationSource.text,
        label: source?.label || effectiveTranslationSource.label,
        chapterLabel: effectiveTranslationSource.chapterLabel
      },
      effectiveTranslationSource
    );
    translationFollowsCurrentSource = false;
    setTranslatedTtsOwner('live');
  };

  const resumeFollowingCurrentTranslationSource = () => {
    translationFollowsCurrentSource = true;
    pinnedTranslationSource = null;
    setTranslatedTtsOwner('live');
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
        label: $notesState.selection?.chapterLabel?.trim() ? '正文选区' : '当前选区',
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
        label: '当前章节',
        chapterLabel
      };
    }

    const title = currentPreview.title.trim();
    if (title && title !== READER_EMPTY_TITLE) {
      return {
        text: title,
        label: '当前书名',
        chapterLabel: currentPreview.chapterLabel
      };
    }

    return {
      text: '',
      label: '',
      chapterLabel: currentPreview.chapterLabel
    };
  };

  const resolveReaderTranslationModeSource = () => {
    const fallback = resolveReaderTranslationFallback();

    return (
      normalizeReaderTranslationSource(
        {
          text: fallback.text,
          label: fallback.label,
          chapterLabel: fallback.chapterLabel
        },
        fallback.label
      ) ?? {
        text: '',
        label: '',
        chapterLabel: fallback.chapterLabel
      }
    );
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
    const historyEntry = createReaderAssistanceHistoryEntry(request, {
      id: `assist-${Date.now()}-${assistanceRequestNonce + 1}`
    });

    if (!canRequestAssistanceForText(normalizedTerm)) {
      assistanceState = createEmptyReaderAssistanceResultState(request);
      assistanceHistory = upsertReaderAssistanceHistoryEntry(
        assistanceHistory,
        updateReaderAssistanceHistoryEntry(historyEntry, {
          status: 'empty'
        })
      );
      void openNotebookWorkspaceTab('assistant');
      return;
    }

    const token = ++assistanceRequestNonce;
    assistanceState = createLoadingReaderAssistanceState(request);
    assistanceHistory = upsertReaderAssistanceHistoryEntry(assistanceHistory, historyEntry);
    void openNotebookWorkspaceTab('assistant');

    try {
      const nextState = await requestReaderAssistance(request);
      if (token !== assistanceRequestNonce) return;
      assistanceState = nextState;
      assistanceHistory = upsertReaderAssistanceHistoryEntry(
        assistanceHistory,
        updateReaderAssistanceHistoryEntry(historyEntry, {
          status: resolveAssistanceHistoryStatus(nextState.status),
          result: nextState.result,
          error: nextState.error
        })
      );
    } catch (error) {
      if (token !== assistanceRequestNonce) return;
      assistanceState = createErrorReaderAssistanceState(
        request,
        error instanceof Error ? error.message : String(error)
      );
      assistanceHistory = upsertReaderAssistanceHistoryEntry(
        assistanceHistory,
        updateReaderAssistanceHistoryEntry(historyEntry, {
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        })
      );
    }
  };

  const resolveAssistanceHistoryStatus = (
    status: typeof assistanceState.status
  ): 'loading' | 'ready' | 'empty' | 'offline' | 'error' =>
    status === 'idle' ? 'empty' : status;

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
    const historyEntry = createReaderAssistanceHistoryEntry(request, {
      id: `assist-${Date.now()}-${assistanceRequestNonce + 1}`
    });

    if (!normalizedText) {
      assistanceState = createEmptyReaderAssistanceResultState(request);
      assistanceHistory = upsertReaderAssistanceHistoryEntry(
        assistanceHistory,
        updateReaderAssistanceHistoryEntry(historyEntry, {
          status: 'empty'
        })
      );
      void openNotebookWorkspaceTab('translation');
      return;
    }

    const token = ++assistanceRequestNonce;
    assistanceState = createLoadingReaderAssistanceState(request);
    assistanceHistory = upsertReaderAssistanceHistoryEntry(assistanceHistory, historyEntry);
    void openNotebookWorkspaceTab('translation');

    try {
      const nextState = await requestReaderAssistance(request);
      if (token !== assistanceRequestNonce) return;
      assistanceState = nextState;
      assistanceHistory = upsertReaderAssistanceHistoryEntry(
        assistanceHistory,
        updateReaderAssistanceHistoryEntry(historyEntry, {
          status: resolveAssistanceHistoryStatus(nextState.status),
          result: nextState.result,
          error: nextState.error
        })
      );
    } catch (error) {
      if (token !== assistanceRequestNonce) return;
      assistanceState = createErrorReaderAssistanceState(
        request,
        error instanceof Error ? error.message : String(error)
      );
      assistanceHistory = upsertReaderAssistanceHistoryEntry(
        assistanceHistory,
        updateReaderAssistanceHistoryEntry(historyEntry, {
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        })
      );
    }
  };

  const selectAssistanceHistoryEntry = (mode: 'lookup' | 'translation', entryId: string) => {
    const normalizedEntryId = entryId.trim();
    assistanceSelection =
      mode === 'translation'
        ? {
            ...assistanceSelection,
            lookupHistoryEntryId: '',
            translationHistoryEntryId: normalizedEntryId
          }
        : {
            ...assistanceSelection,
            translationHistoryEntryId: '',
            lookupHistoryEntryId: normalizedEntryId
          };

    if (mode !== 'translation') return;
    setTranslatedTtsOwner('archive');

    if (routeOpenState.workspaceMode === 'translation' || notebookTab === 'translation') {
      void syncReaderWorkspaceModeToRoute(
        resolveReaderWorkspaceModeRouteRequest({
          workspaceMode: 'translation',
          ttsReadAloudTextMode: null,
          translationTargetLanguage,
          translationProvider,
          translationHistoryEntryId: normalizedEntryId
        })
      );
      return;
    }

    if (
      (routeOpenState.workspaceMode === 'tts' || notebookTab === 'tts') &&
      ttsReadAloudTextMode === 'translated'
    ) {
      void syncReaderWorkspaceModeToRoute(
        resolveReaderWorkspaceModeRouteRequest({
          workspaceMode: 'tts',
          ttsReadAloudTextMode: 'translated',
          translationTargetLanguage,
          translationProvider,
          translationHistoryEntryId: normalizedEntryId
        })
      );
    }
  };

  const clearAssistanceHistory = (mode: 'lookup' | 'translation') => {
    assistanceHistory = assistanceHistory.filter((entry) => entry.request.kind !== mode);
    assistanceSelection =
      mode === 'translation'
        ? {
            ...assistanceSelection,
            translationHistoryEntryId: ''
          }
        : {
            ...assistanceSelection,
            lookupHistoryEntryId: ''
          };
    if (typeof localStorage !== 'undefined') {
      persistReaderCurrentBookAssistanceHistory(
        getReaderStorage(),
        assistanceHistoryStorageKey,
        assistanceHistory
      );
      persistReaderCurrentBookAssistanceSelection(
        getReaderStorage(),
        assistanceSelectionStorageKey,
        assistanceSelection
      );
    }

    if (mode !== 'translation') return;
    translationLiveSnapshot = null;
    setTranslatedTtsOwner('live');

    if (routeOpenState.workspaceMode === 'translation' || notebookTab === 'translation') {
      void syncReaderWorkspaceModeToRoute(
        resolveReaderWorkspaceModeRouteRequest({
          workspaceMode: 'translation',
          ttsReadAloudTextMode: null,
          translationTargetLanguage,
          translationProvider,
          translationHistoryEntryId: null
        })
      );
      return;
    }

    if (
      (routeOpenState.workspaceMode === 'tts' || notebookTab === 'tts') &&
      ttsReadAloudTextMode === 'translated'
    ) {
      void syncReaderWorkspaceModeToRoute(
        resolveReaderWorkspaceModeRouteRequest({
          workspaceMode: 'tts',
          ttsReadAloudTextMode: 'translated',
          translationTargetLanguage,
          translationProvider,
          translationHistoryEntryId: null
        })
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
    class:notebook-open={notebookVisible}
    class:notebook-collapsed={!notebookVisible}
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
        {assistanceHistory}
        selectedLookupHistoryEntryId={assistanceSelection.lookupHistoryEntryId}
        selectedTranslationHistoryEntryId={assistanceSelection.translationHistoryEntryId}
        translationProviderStatuses={translationProviderStatuses}
        callbacks={sidebarCallbacks}
        onSelectAssistanceHistoryEntry={selectAssistanceHistoryEntry}
        onClearAssistanceHistory={clearAssistanceHistory}
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
      <div class="parallel-surface-toolbar" aria-label="阅读工作区控制">
        <div class="surface-toolbar-row primary" aria-label="阅读布局控制">
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
          <button
            type="button"
            class="parallel-toggle notebook-toggle"
            aria-pressed={notebookVisible}
            aria-label={notebookVisible ? '收起笔记工作台' : '切换笔记工作台'}
            on:click={() => {
              if (notebookVisible) {
                void closeNotebookWorkspace();
                return;
              }
              void openNotebookWorkspaceTab(notebookTab === 'highlights' ? 'highlights' : 'notes');
            }}
          >
            {notebookVisible ? '关闭工作台' : '打开工作台'}
          </button>
        </div>
        <div class="surface-toolbar-row workspace-modes" aria-label="工作台模式切换">
          <span class="workspace-mode-label">工作台模式</span>
          <div class="workspace-mode-buttons">
            <button
              type="button"
              class="parallel-toggle notebook-toggle mode-toggle"
              aria-pressed={notebookVisible && notebookTab === 'notes'}
              aria-label="打开笔记工作台"
              on:click={() => {
                void openNotebookWorkspaceTab('notes');
              }}
            >
              笔记
            </button>
            <button
              type="button"
              class="parallel-toggle notebook-toggle mode-toggle"
              aria-pressed={notebookVisible && notebookTab === 'assistant'}
              aria-label="打开 AI 工作台"
              on:click={() => {
                void openNotebookWorkspaceTab('assistant');
              }}
            >
              AI
            </button>
            <button
              type="button"
              class="parallel-toggle notebook-toggle mode-toggle"
              aria-pressed={notebookVisible && notebookTab === 'translation'}
              aria-label="打开翻译模式"
              on:click={() => {
                void openNotebookWorkspaceTab('translation');
              }}
            >
              翻译
            </button>
            <button
              type="button"
              class="parallel-toggle notebook-toggle mode-toggle"
              aria-pressed={notebookVisible && notebookTab === 'tts'}
              aria-label="打开朗读模式"
              on:click={() => {
                void openNotebookWorkspaceTab('tts');
              }}
            >
              朗读
            </button>
            <button
              type="button"
              class="parallel-toggle notebook-toggle mode-toggle"
              aria-pressed={notebookVisible && notebookTab === 'sync'}
              aria-label="打开同步工作台"
              on:click={() => {
                void openNotebookWorkspaceTab('sync');
              }}
            >
              同步
            </button>
          </div>
        </div>
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
            currentReaderSelection = detail;
            notesController.setSelection(currentFormatSupportsTextAnnotations ? detail : null);
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
          ttsMiniBarVisible={ttsMiniBarVisible}
          ttsMiniBarStatusLabel={ttsMiniBarStatusLabel}
          ttsMiniBarContextSummary={ttsMiniBarContextSummary}
          ttsMiniBarTargetLabel={ttsMiniBarTargetLabel}
          ttsMiniBarLocationSummary={ttsMiniBarLocationSummary}
          ttsMiniBarPrimaryActionLabel={ttsMiniBarPrimaryActionLabel}
          ttsMiniBarCanRunPrimaryAction={ttsMiniBarCanRunPrimaryAction}
          ttsMiniBarCanStop={ttsMiniBarCanStop}
          ttsMiniBarCanJumpToPlaybackLocation={canJumpToCurrentTtsLocation}
          ttsMiniBarCanOpenTranslationMode={ttsMiniBarCanOpenTranslationMode}
          ttsMiniBarCanResumeFollowingCurrent={ttsMiniBarCanResumeFollowingCurrent}
          ttsMiniBarCanPinCurrentTarget={ttsMiniBarCanPinCurrentTarget}
          ttsMiniBarModeSwitchLabel={ttsMiniBarModeSwitchLabel}
          ttsMiniBarCanSwitchMode={ttsMiniBarCanSwitchMode}
          {focusedReadingState}
          {focusedReadingSummary}
          inlineTranslationVisible={notebookVisible && notebookTab === 'translation'}
          inlineTranslationState={inlineTranslationState}
          inlineTranslationSummary={inlineTranslationSummary}
          inlineTranslationStatusMessage={inlineTranslationStatusMessage}
          inlineTranslationCapabilityMessage={inlineTranslationCapabilityMessage}
          annotationSelection={currentReaderSelection}
          annotationSelectionSummary={annotationPopupSelectionSummary}
          annotationSelectionDetail={annotationPopupSelectionDetail}
          annotationSupportsActions={annotationPopupSupportsActions}
          annotationSupportMessage={annotationPopupSupportMessage}
          onOpenTtsWorkspace={openTtsWorkspace}
          onJumpToTtsPlaybackLocation={jumpToCurrentTtsLocation}
          onOpenTranslationModeFromMiniBar={openTranslationMode}
          onResumeFollowingCurrentTtsTargetFromMiniBar={resumeFollowingCurrentTtsTarget}
          onPinCurrentTtsTargetFromMiniBar={pinCurrentTtsTarget}
          onStartParagraphFocus={startParagraphFocusMode}
          onStartRsvpLite={startRsvpLiteMode}
          onExitFocusedReading={exitFocusedReadingMode}
          onFocusedReadingPreviousWord={() => moveFocusedReadingWord(-1)}
          onFocusedReadingNextWord={() => moveFocusedReadingWord(1)}
          onToggleInlineTranslationEnabled={toggleInlineTranslationEnabled}
          onToggleInlineTranslationSourceVisibility={toggleInlineTranslationSourceVisibility}
          onToggleInlineTranslationTranslationVisibility={toggleInlineTranslationTranslationVisibility}
          onAddHighlightFromSelection={addHighlightFromSelection}
          onAddNoteFromSelection={addNoteFromSelection}
          onLookupSelection={lookupCurrentSelection}
          onTranslateSelection={translateCurrentSelection}
          onReadAloudSelection={readCurrentSelectionAloud}
          onCopySelection={() => {
            void copyCurrentSelection();
          }}
          onSwitchTtsModeFromMiniBar={() =>
            setTtsReadAloudTextMode(ttsReadAloudTextMode === 'translated' ? 'source' : 'translated')}
          on:inlinetranslationcandidates={({ detail }) => {
            handleInlineTranslationCandidates(detail);
          }}
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

    {#if notebookVisible}
      <ReaderNotebook
        visible={notebookVisible}
        pinned={notebookPinned}
        activeTab={notebookTab}
        preview={currentPreview}
        notesState={$notesState}
        supportsTextAnnotations={currentFormatSupportsTextAnnotations}
        textAnnotationSupportMessage="当前格式暂不支持正文批注。"
        assistance={assistanceState}
        {assistanceHistory}
        selectedLookupHistoryEntryId={assistanceSelection.lookupHistoryEntryId}
        selectedTranslationHistoryEntryId={assistanceSelection.translationHistoryEntryId}
        {liveTranslationPanelResult}
        ttsSession={$ttsState}
        ttsTarget={ttsPlaybackTarget}
        ttsFollowsCurrentLocation={ttsFollowsCurrentLocation}
        ttsReadAloudTextMode={ttsReadAloudTextMode}
        ttsPlaybackSummary={ttsPlaybackQueueSummary}
        ttsPlaybackSupportsSegmentNavigation={ttsPlaybackSupportsSegmentNavigation}
        ttsCanGoToPreviousPlaybackSegment={ttsPlaybackCanGoToPreviousSegment}
        ttsCanGoToNextPlaybackSegment={ttsPlaybackCanGoToNextSegment}
        ttsPlaybackVoiceCapabilityLabel={ttsPlaybackVoiceCapabilityLabel}
        ttsPlaybackSelectedVoiceLabel={ttsPlaybackSelectedVoiceLabel}
        {canJumpToCurrentTtsLocation}
        {translatedTtsSourceKind}
        translatedTtsSourceContextLabel={translatedTtsSourceContextLabel}
        translatedTtsSourceText={translatedTtsSourceText}
        translationModeSourceText={effectiveTranslationSource.text}
        translationModeSourceLabel={effectiveTranslationSource.label}
        translationModeFollowsCurrentSource={translationFollowsCurrentSource}
        {translationTargetLanguage}
        {translationProvider}
        translationProviderStatuses={translationProviderStatuses}
        desktopSyncAvailable={canPersistLibrary()}
        {currentManagedBook}
        bookmarkCount={$bookmarksState.bookmarks.length}
        syncBusyAction={readerSyncBusyAction}
        syncExchangeExportResult={readerKoReaderExchangeExportResult}
        syncExchangeImportResult={readerKoReaderExchangeImportResult}
        syncRemoteResult={readerKoReaderRemoteSyncResult}
        syncNotice={readerSyncNotice}
        {currentBookSyncActivity}
        {librarySyncActivity}
        callbacks={{
          onAddHighlight: sidebarCallbacks.onAddHighlight,
          onAddNote: sidebarCallbacks.onAddNote,
          onOpenNote: sidebarCallbacks.onOpenNote,
          onEditNote: sidebarCallbacks.onEditNote,
          onDeleteNote: sidebarCallbacks.onDeleteNote,
          onRequestLookup: sidebarCallbacks.onRequestLookup,
          onRequestTranslation: sidebarCallbacks.onRequestTranslation,
          onTtsStart: handleTtsStart,
          onTtsPause: handleTtsPause,
          onTtsResume: handleTtsResume,
          onTtsStop: handleTtsStop,
          onExportCurrentBookSync: exportCurrentBookKoReaderExchange,
          onImportKoReaderSync: importKoReaderExchangeFromReader,
          onPushKoReaderRemoteSync: pushKoReaderRemoteSyncFromReader,
          onPullKoReaderRemoteSync: pullKoReaderRemoteSyncFromReader
        }}
        onRetrySyncAction={readerSyncRetryAction}
        onPinCurrentTtsTarget={pinCurrentTtsTarget}
        onResumeFollowingCurrentTtsTarget={resumeFollowingCurrentTtsTarget}
        onJumpToCurrentTtsLocation={jumpToCurrentTtsLocation}
        onGoToPreviousPlaybackSegment={goToPreviousPlaybackSegment}
        onGoToNextPlaybackSegment={goToNextPlaybackSegment}
        onSetPlaybackRate={setPlaybackRateForRoute}
        onTogglePlaybackTimeout={togglePlaybackTimeoutForRoute}
        onSetTtsReadAloudTextMode={setTtsReadAloudTextMode}
        onOpenTranslatedTtsMode={openTranslatedTtsWorkspace}
        onOpenTranslationMode={openTranslationMode}
        onPinCurrentTranslationSource={pinCurrentTranslationSource}
        onResumeFollowingCurrentTranslationSource={resumeFollowingCurrentTranslationSource}
        onSetTranslationTargetLanguage={setTranslationTargetLanguage}
        onSetTranslationProvider={setTranslationProvider}
        onSelectAssistanceHistoryEntry={selectAssistanceHistoryEntry}
        onClearAssistanceHistory={clearAssistanceHistory}
        onClose={() => {
          void closeNotebookWorkspace();
        }}
        onTogglePin={() => {
          notebookPinned = !notebookPinned;
          if (notebookPinned) notebookVisible = true;
        }}
        onTabChange={(tab) => {
          void openNotebookWorkspaceTab(tab);
        }}
      />
    {:else}
      <aside class="notebook-tab" aria-label="笔记工作台已收起">
        <button
          type="button"
          aria-label="打开笔记工作台"
          on:click={() => {
            void openNotebookWorkspaceTab(notebookTab);
          }}
        >
          <span>记</span>
        </button>
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

  .workspace.notebook-collapsed {
    grid-template-columns: 248px minmax(0, 1fr) 48px;
  }

  .workspace.notebook-open {
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
    grid-template-columns: minmax(208px, var(--reader-sidebar-width, 224px)) minmax(0, 1fr) 304px;
  }

  .workspace.window-mode.sidebar-hidden {
    grid-template-columns: minmax(0, 1fr) 304px;
  }

  .workspace.window-mode.sidebar-overlay {
    grid-template-columns: minmax(0, 1fr) 304px;
  }

  .workspace.window-mode.notebook-collapsed {
    grid-template-columns: minmax(208px, var(--reader-sidebar-width, 224px)) minmax(0, 1fr) 44px;
  }

  .workspace.window-mode.sidebar-hidden.notebook-collapsed,
  .workspace.window-mode.sidebar-overlay.notebook-collapsed {
    grid-template-columns: minmax(0, 1fr) 44px;
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

  .notebook-tab {
    display: grid;
    align-content: start;
    justify-items: center;
    padding: 8px 4px;
    border-left: 1px solid rgba(64, 47, 24, 0.1);
    background: color-mix(in srgb, var(--surface-panel) 86%, white 14%);
  }

  .notebook-tab button {
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

  .notebook-tab button:hover {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--surface-reader) 88%, white 12%);
  }

  .notebook-tab button:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent-warm, #8c6a3b) 72%, white 28%);
    outline-offset: 3px;
  }

  .reader-surface {
    display: grid;
    gap: 12px;
    min-width: 0;
  }

  .parallel-surface-toolbar {
    display: grid;
    gap: 8px;
    justify-items: end;
    min-width: 0;
  }

  .surface-toolbar-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .surface-toolbar-row.primary {
    justify-content: flex-end;
  }

  .surface-toolbar-row.workspace-modes {
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .workspace-mode-label {
    color: var(--text-muted);
    font: 700 11px/1 var(--font-chrome);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .workspace-mode-buttons {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, max-content));
    gap: 8px;
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

  .mode-toggle {
    min-width: 68px;
    justify-content: center;
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

    .workspace.notebook-collapsed {
      grid-template-columns: 236px minmax(0, 1fr) 44px;
    }

    .workspace.notebook-open {
      grid-template-columns: 236px minmax(0, 1fr);
    }

    .workspace.window-mode {
      --reader-window-edge-x: 14px;
      --reader-window-edge-y-top: 8px;
      --reader-window-edge-y-bottom: 10px;
      --reader-window-sidebar-gap: 14px;
      grid-template-columns: 208px minmax(0, 1fr) 288px;
    }

    :global(.reader-notebook) {
      grid-column: 1 / -1;
    }

    .notebook-tab {
      grid-column: auto;
      padding-inline: 2px;
    }
  }

  @media (max-width: 960px) {
    .workspace,
    .workspace.notebook-collapsed,
    .workspace.notebook-open {
      grid-template-columns: 1fr;
    }

    .workspace :global(.reader-stage) {
      order: 1;
    }

    .workspace :global(.reader-sidebar) {
      order: 2;
    }

    :global(.reader-notebook),
    .notebook-tab {
      order: 3;
    }

    .notebook-tab {
      justify-items: stretch;
      padding: 8px 14px 12px;
      border-left: 0;
      border-top: 1px solid rgba(64, 47, 24, 0.1);
    }

    .notebook-tab button {
      width: 100%;
      min-height: 38px;
      writing-mode: horizontal-tb;
    }

    .parallel-surface-toolbar {
      justify-items: stretch;
    }

    .surface-toolbar-row,
    .surface-toolbar-row.primary,
    .surface-toolbar-row.workspace-modes {
      justify-content: stretch;
    }

    .surface-toolbar-row.workspace-modes {
      display: grid;
      gap: 8px;
    }

    .workspace-mode-buttons {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .parallel-toggle,
    .mode-toggle {
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

  @media (max-width: 620px) {
    .workspace-mode-buttons {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>

<script lang="ts">
  import { goto } from '$app/navigation';
  import { onDestroy, onMount } from 'svelte';
  import { page } from '$app/stores';
  import { ReaderSidebar, ReaderStage } from '$lib/components';
  import ReaderNotebook from '$lib/components/reader/ReaderNotebook.svelte';
  import type {
    ReaderAssistanceHistoryEntry,
    ReaderAssistanceWorkspaceSelection,
    ReaderControlRequest,
    ReaderLookupProvider,
    ReaderPreviewState,
    ReaderRouteOpenState,
    ReaderRouteWorkspaceMode,
    ReaderSidebarCallbacks,
    ReaderSearchHistoryEntry,
    ReaderSearchResult,
    ReaderTtsReadAloudTextMode,
    ReaderTranslationProvider,
    ReaderTranslationProviderStatus,
    ReaderTocItem
  } from '$lib/reader';
  import type {
    Br1KoReaderRemoteSyncResult,
    KoReaderSyncExchangeExportDialogResult,
    PersistedLibraryBook,
    RestoreKoReaderSyncExchangeDialogResult
  } from '$lib/services';
  import {
    createEmptyReaderPreviewState,
    createEmptyReaderAssistanceWorkspaceSelection,
    createEmptyReaderAssistanceState,
    createEmptyReaderAssistanceResultState,
    createErrorReaderAssistanceState,
    createLoadingReaderAssistanceState,
    createReaderAssistanceHistoryEntry,
    parseReaderAssistanceHistory,
    parseReaderAssistanceWorkspaceSelection,
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
    getReaderAssistanceRequestContextLabel,
    getReaderLocationDisplayLabel,
    getReaderTtsCompactPlaybackLocationSummary,
    isReaderTtsPlaybackLocationDrifted,
    getReaderTtsMiniBarContextSummary,
    getReaderTtsPrimaryActionLabel,
    getReaderTtsReadableTargetLabel,
    getReaderTtsSessionStatusLabel,
    getReaderTtsTranslatedWaitingTargetLabel,
    normalizeAssistanceText,
    normalizeReaderTtsSpeechTarget,
    normalizeAssistanceTerm,
    getReaderTranslationProviderDisplayLabel,
    openReaderParallelSecondaryPaneFromPrimary,
    parseReaderRouteOpenState,
    planReaderTtsRetargetAction,
    loadReaderSettings,
    serializeReaderAssistanceHistory,
    serializeReaderAssistanceWorkspaceSelection,
    shouldShowReaderTtsMiniBar,
    resolveReaderTtsSpeechTargetForMode,
    updateReaderAssistanceHistoryEntry,
    updateReaderParallelPaneControlRequest,
    updateReaderParallelPanePreview,
    upsertReaderAssistanceHistoryEntry,
    type ReaderTtsSpeechTarget,
    toReaderOpenControlRequest,
    toReaderWorkspaceModeHref
  } from '$lib/reader';
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
  let notebookTab: 'notes' | 'highlights' | 'assistant' | 'translation' | 'tts' | 'sync' = 'notes';
  let lastAppliedRouteWorkspaceMode: ReaderRouteWorkspaceMode | null = null;
  let ttsFollowsCurrentLocation = true;
  let pinnedTtsTarget: ReaderTtsSpeechTarget | null = null;
  let resolvedTtsTarget: ReaderTtsSpeechTarget | null = null;
  let effectiveTtsTarget: ReaderTtsSpeechTarget | null = null;
  let ttsReadAloudTextMode: ReaderTtsReadAloudTextMode = 'source';
  let translationFollowsCurrentSource = true;
  let translationTargetLanguage = 'zh';
  let translationProvider: ReaderTranslationProvider = 'deepl';
  let pinnedTranslationSource: {
    text: string;
    label: string;
    chapterLabel: string;
  } | null = null;
  let resolvedTranslationSource = {
    text: '',
    label: '',
    chapterLabel: ''
  };
  let effectiveTranslationSource = {
    text: '',
    label: '',
    chapterLabel: ''
  };
  let translatedTtsSourceKind: 'none' | 'live-translation' | 'archived-translation' = 'none';
  let translatedTtsSourceContextLabel = '';
  let translatedTtsSourceText = '';
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
  let parallelSession = createReaderParallelSessionFromRoute(
    parseReaderRouteOpenState($page.url)
  );
  let parallelEnabled = false;
  let currentPreview: ReaderPreviewState = createEmptyReaderPreviewState();
  let assistanceState = createEmptyReaderAssistanceState();
  let assistanceHistory: ReaderAssistanceHistoryEntry[] = [];
  let assistanceSelection: ReaderAssistanceWorkspaceSelection =
    createEmptyReaderAssistanceWorkspaceSelection();
  let assistanceRequestNonce = 0;
  let lastAssistanceBookKey = '';
  let lastRestoredTtsOwnershipBookKey = '';
  let lastRestoredTtsReadAloudModeBookKey = '';
  let lastRestoredTranslatedTtsOwnerBookKey = '';
  let lastRestoredTranslatedTtsLiveSnapshotBookKey = '';
  let translatedTtsOwner: 'live' | 'archive' = 'live';
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
  $: assistanceHistoryStorageKey = `br1.reader.assistance.history:${readerBookKey}`;
  $: assistanceSelectionStorageKey = `br1.reader.assistance.selection:${readerBookKey}`;
  $: translationOwnershipStorageKey = `br1.reader.translation.ownership:${readerBookKey}`;
  $: ttsOwnershipStorageKey = `br1.reader.tts.ownership:${readerBookKey}`;
  $: ttsReadAloudModeStorageKey = `br1.reader.tts.mode:${readerBookKey}`;
  $: translatedTtsOwnerStorageKey = `br1.reader.tts.translated-owner:${readerBookKey}`;
  $: translatedTtsLiveSnapshotStorageKey = `br1.reader.tts.translated-live:${readerBookKey}`;

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

  const persistAssistanceHistory = () => {
    if (typeof localStorage === 'undefined') return;
    if (!assistanceHistoryStorageKey) return;
    localStorage.setItem(
      assistanceHistoryStorageKey,
      serializeReaderAssistanceHistory(assistanceHistory)
    );
  };

  const restoreAssistanceHistory = () => {
    if (typeof localStorage === 'undefined') return [];
    if (!assistanceHistoryStorageKey) return [];
    const rawHistory = localStorage.getItem(assistanceHistoryStorageKey);
    if (!rawHistory) return [];

    try {
      return parseReaderAssistanceHistory(rawHistory);
    } catch (error) {
      console.warn('Failed to restore reader assistance history', error);
      localStorage.removeItem(assistanceHistoryStorageKey);
      return [];
    }
  };

  const persistAssistanceSelection = () => {
    if (typeof localStorage === 'undefined') return;
    if (!assistanceSelectionStorageKey) return;
    localStorage.setItem(
      assistanceSelectionStorageKey,
      serializeReaderAssistanceWorkspaceSelection(assistanceSelection)
    );
  };

  const restoreAssistanceSelection = () => {
    if (typeof localStorage === 'undefined') {
      return createEmptyReaderAssistanceWorkspaceSelection();
    }
    if (!assistanceSelectionStorageKey) {
      return createEmptyReaderAssistanceWorkspaceSelection();
    }
    const rawSelection = localStorage.getItem(assistanceSelectionStorageKey);
    if (!rawSelection) {
      return createEmptyReaderAssistanceWorkspaceSelection();
    }

    try {
      return parseReaderAssistanceWorkspaceSelection(rawSelection);
    } catch (error) {
      console.warn('Failed to restore reader assistance selection', error);
      localStorage.removeItem(assistanceSelectionStorageKey);
      return createEmptyReaderAssistanceWorkspaceSelection();
    }
  };

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

  const persistTranslationOwnership = () => {
    if (typeof localStorage === 'undefined') return;
    if (!translationOwnershipStorageKey) return;
    localStorage.setItem(
      translationOwnershipStorageKey,
      JSON.stringify({
        followsCurrentSource: translationFollowsCurrentSource,
        pinnedSource: pinnedTranslationSource
          ? {
              text: normalizeAssistanceText(pinnedTranslationSource.text),
              label: pinnedTranslationSource.label.trim(),
              chapterLabel: pinnedTranslationSource.chapterLabel.trim()
            }
          : null
      })
    );
  };

  const restoreTranslationOwnership = () => {
    if (typeof localStorage === 'undefined') {
      return {
        followsCurrentSource: true,
        pinnedSource: null as typeof pinnedTranslationSource
      };
    }
    if (!translationOwnershipStorageKey) {
      return {
        followsCurrentSource: true,
        pinnedSource: null as typeof pinnedTranslationSource
      };
    }
    const rawOwnership = localStorage.getItem(translationOwnershipStorageKey);
    if (!rawOwnership) {
      return {
        followsCurrentSource: true,
        pinnedSource: null as typeof pinnedTranslationSource
      };
    }

    try {
      const parsed = JSON.parse(rawOwnership) as {
        followsCurrentSource?: unknown;
        pinnedSource?: {
          text?: unknown;
          label?: unknown;
          chapterLabel?: unknown;
        } | null;
      };
      const normalizedPinnedText =
        typeof parsed.pinnedSource?.text === 'string'
          ? normalizeAssistanceText(parsed.pinnedSource.text)
          : '';
      const normalizedPinnedLabel =
        typeof parsed.pinnedSource?.label === 'string' ? parsed.pinnedSource.label.trim() : '';
      const normalizedPinnedChapterLabel =
        typeof parsed.pinnedSource?.chapterLabel === 'string'
          ? parsed.pinnedSource.chapterLabel.trim()
          : '';
      const pinnedSource = normalizedPinnedText
        ? {
            text: normalizedPinnedText,
            label: normalizedPinnedLabel || '当前翻译目标',
            chapterLabel: normalizedPinnedChapterLabel
          }
        : null;

      return {
        followsCurrentSource:
          typeof parsed.followsCurrentSource === 'boolean'
            ? parsed.followsCurrentSource
            : !pinnedSource,
        pinnedSource
      };
    } catch (error) {
      console.warn('Failed to restore reader translation ownership', error);
      localStorage.removeItem(translationOwnershipStorageKey);
      return {
        followsCurrentSource: true,
        pinnedSource: null as typeof pinnedTranslationSource
      };
    }
  };

  const persistTtsOwnership = () => {
    if (typeof localStorage === 'undefined') return;
    if (!ttsOwnershipStorageKey) return;
    localStorage.setItem(
      ttsOwnershipStorageKey,
      JSON.stringify({
        followsCurrentLocation: ttsFollowsCurrentLocation,
        pinnedTarget: normalizeReaderTtsSpeechTarget(pinnedTtsTarget)
      })
    );
  };

  const restoreTtsOwnership = () => {
    if (typeof localStorage === 'undefined') {
      return {
        followsCurrentLocation: true,
        pinnedTarget: null as ReaderTtsSpeechTarget | null
      };
    }
    if (!ttsOwnershipStorageKey) {
      return {
        followsCurrentLocation: true,
        pinnedTarget: null as ReaderTtsSpeechTarget | null
      };
    }
    const rawOwnership = localStorage.getItem(ttsOwnershipStorageKey);
    if (!rawOwnership) {
      return {
        followsCurrentLocation: true,
        pinnedTarget: null as ReaderTtsSpeechTarget | null
      };
    }

    try {
      const parsed = JSON.parse(rawOwnership) as {
        followsCurrentLocation?: unknown;
        pinnedTarget?: ReaderTtsSpeechTarget | null;
      };
      const normalizedPinnedTarget = normalizeReaderTtsSpeechTarget(parsed.pinnedTarget ?? null);
      if (parsed.followsCurrentLocation === false && !normalizedPinnedTarget) {
        localStorage.removeItem(ttsOwnershipStorageKey);
        return {
          followsCurrentLocation: true,
          pinnedTarget: null as ReaderTtsSpeechTarget | null
        };
      }
      return {
        followsCurrentLocation:
          typeof parsed.followsCurrentLocation === 'boolean'
            ? parsed.followsCurrentLocation
            : !normalizedPinnedTarget,
        pinnedTarget: normalizedPinnedTarget
      };
    } catch (error) {
      console.warn('Failed to restore reader TTS ownership', error);
      localStorage.removeItem(ttsOwnershipStorageKey);
      return {
        followsCurrentLocation: true,
        pinnedTarget: null as ReaderTtsSpeechTarget | null
      };
    }
  };

  const persistCurrentBookTtsReadAloudMode = () => {
    if (typeof localStorage === 'undefined') return;
    if (!ttsReadAloudModeStorageKey) return;
    localStorage.setItem(ttsReadAloudModeStorageKey, ttsReadAloudTextMode);
  };

  const restoreCurrentBookTtsReadAloudMode = () => {
    const defaultMode =
      typeof localStorage === 'undefined'
        ? 'source'
        : loadReaderSettings(localStorage).ttsReadAloudText;
    if (typeof localStorage === 'undefined') {
      return defaultMode;
    }
    if (!ttsReadAloudModeStorageKey) {
      return defaultMode;
    }
    const rawMode = localStorage.getItem(ttsReadAloudModeStorageKey)?.trim() ?? '';
    if (rawMode === 'source' || rawMode === 'translated') {
      return rawMode satisfies ReaderTtsReadAloudTextMode;
    }
    if (rawMode) {
      localStorage.removeItem(ttsReadAloudModeStorageKey);
    }
    return defaultMode;
  };

  const persistCurrentBookTranslatedTtsOwner = () => {
    if (typeof localStorage === 'undefined') return;
    if (!translatedTtsOwnerStorageKey) return;
    localStorage.setItem(translatedTtsOwnerStorageKey, translatedTtsOwner);
  };

  const restoreCurrentBookTranslatedTtsOwner = () => {
    const routeOwnsArchivedTranslation =
      routeOpenState.workspaceMode === 'tts' &&
      routeOpenState.ttsReadAloudTextMode === 'translated' &&
      !!routeOpenState.translationHistoryEntryId?.trim();
    const currentBookHasSelectedArchive = !!assistanceSelection.translationHistoryEntryId.trim();
    const rawOwner =
      typeof localStorage === 'undefined' || !translatedTtsOwnerStorageKey
        ? ''
        : localStorage.getItem(translatedTtsOwnerStorageKey)?.trim() ?? '';

    if (rawOwner === 'live' || rawOwner === 'archive') {
      return rawOwner;
    }
    if (rawOwner && typeof localStorage !== 'undefined') {
      localStorage.removeItem(translatedTtsOwnerStorageKey);
    }
    return routeOwnsArchivedTranslation || currentBookHasSelectedArchive ? 'archive' : 'live';
  };

  const persistCurrentBookTranslatedTtsLiveSnapshot = () => {
    if (typeof localStorage === 'undefined') return;
    if (!translatedTtsLiveSnapshotStorageKey) return;
    if (!translatedTtsLiveSnapshot) {
      localStorage.removeItem(translatedTtsLiveSnapshotStorageKey);
      return;
    }
    localStorage.setItem(
      translatedTtsLiveSnapshotStorageKey,
      JSON.stringify(translatedTtsLiveSnapshot)
    );
  };

  const restoreCurrentBookTranslatedTtsLiveSnapshot = () => {
    if (typeof localStorage === 'undefined' || !translatedTtsLiveSnapshotStorageKey) {
      return null as typeof translatedTtsLiveSnapshot;
    }
    const rawSnapshot = localStorage.getItem(translatedTtsLiveSnapshotStorageKey);
    if (!rawSnapshot) {
      return null as typeof translatedTtsLiveSnapshot;
    }

    try {
      const parsed = JSON.parse(rawSnapshot) as typeof translatedTtsLiveSnapshot;
      const normalizedSourceText = normalizeAssistanceText(parsed?.sourceText || '');
      const normalizedTranslatedText = normalizeAssistanceText(parsed?.translatedText || '');
      if (!normalizedSourceText || !normalizedTranslatedText) {
        localStorage.removeItem(translatedTtsLiveSnapshotStorageKey);
        return null as typeof translatedTtsLiveSnapshot;
      }

      return {
        sourceText: normalizedSourceText,
        translatedText: normalizedTranslatedText,
        targetLanguage: (parsed?.targetLanguage || '').trim(),
        providerLabel: (parsed?.providerLabel || '').trim(),
        chapterLabel: (parsed?.chapterLabel || '').trim(),
        locationLabel: (parsed?.locationLabel || '').trim(),
        progressLabel: (parsed?.progressLabel || '').trim(),
        progressLocation: (parsed?.progressLocation || '').trim(),
        progressFraction:
          typeof parsed?.progressFraction === 'number' && Number.isFinite(parsed.progressFraction)
            ? parsed.progressFraction
            : null,
        chapterHref: (parsed?.chapterHref || '').trim()
      };
    } catch (error) {
      console.warn('Failed to restore reader translated TTS live snapshot', error);
      localStorage.removeItem(translatedTtsLiveSnapshotStorageKey);
      return null as typeof translatedTtsLiveSnapshot;
    }
  };

  const resolveLiveTranslatedTtsResult = (
    normalizedTranslationSourceText: string,
    chapterLabel: string,
    locationLabel: string,
    progressLabel: string
  ) => {
    if (!normalizedTranslationSourceText) {
      return null;
    }

    if (
      assistanceState.status === 'ready' &&
      assistanceState.activeRequest?.kind === 'translation' &&
      assistanceState.result
    ) {
      return {
        translatedText: normalizeAssistanceText(assistanceState.result.body),
        targetLanguage: assistanceState.activeRequest.targetLanguage,
        providerLabel:
          `当前译文 · ${
            assistanceState.result.sourceLabel ||
            getReaderTranslationProviderDisplayLabel(assistanceState.activeRequest.provider)
          }`,
        chapterLabel: assistanceState.activeRequest.chapterLabel || chapterLabel,
        locationLabel,
        progressLabel,
        progressLocation: assistanceState.activeRequest.cfi || currentPreview.progressLocation,
        progressFraction: currentPreview.progressFraction,
        chapterHref: currentPreview.chapterHref
      };
    }

    const matchingLiveTranslationHistoryEntry = assistanceHistory.find(
      (entry) =>
        entry.request.kind === 'translation' &&
        entry.status === 'ready' &&
        !!entry.result &&
        normalizeAssistanceText(entry.request.text) === normalizedTranslationSourceText
    );

    if (
      matchingLiveTranslationHistoryEntry?.request.kind === 'translation' &&
      matchingLiveTranslationHistoryEntry.result
    ) {
      return {
        translatedText: normalizeAssistanceText(matchingLiveTranslationHistoryEntry.result.body),
        targetLanguage: matchingLiveTranslationHistoryEntry.request.targetLanguage,
        providerLabel:
          `当前译文 · ${
            matchingLiveTranslationHistoryEntry.result.sourceLabel ||
            getReaderTranslationProviderDisplayLabel(
              matchingLiveTranslationHistoryEntry.request.provider
            )
          }`,
        chapterLabel:
          effectiveTranslationSource.chapterLabel ||
          matchingLiveTranslationHistoryEntry.request.chapterLabel ||
          chapterLabel,
        locationLabel,
        progressLabel,
        progressLocation:
          currentPreview.progressLocation || matchingLiveTranslationHistoryEntry.request.cfi,
        progressFraction: currentPreview.progressFraction,
        chapterHref: currentPreview.chapterHref
      };
    }

    if (
      translatedTtsLiveSnapshot &&
      translatedTtsLiveSnapshot.sourceText === normalizedTranslationSourceText
    ) {
      return {
        translatedText: translatedTtsLiveSnapshot.translatedText,
        targetLanguage: translatedTtsLiveSnapshot.targetLanguage,
        providerLabel: translatedTtsLiveSnapshot.providerLabel,
        chapterLabel:
          translatedTtsLiveSnapshot.chapterLabel ||
          effectiveTranslationSource.chapterLabel ||
          chapterLabel,
        locationLabel: translatedTtsLiveSnapshot.locationLabel || locationLabel,
        progressLabel: translatedTtsLiveSnapshot.progressLabel || progressLabel,
        progressLocation:
          translatedTtsLiveSnapshot.progressLocation || currentPreview.progressLocation,
        progressFraction:
          translatedTtsLiveSnapshot.progressFraction ?? currentPreview.progressFraction,
        chapterHref: translatedTtsLiveSnapshot.chapterHref || currentPreview.chapterHref
      };
    }

    return null;
  };

  function resolveReaderTtsSpeechTarget(): ReaderTtsSpeechTarget | null {
    const chapterLabel = currentPreview.chapterLabel.trim();
    const title = currentPreview.title.trim();
    const locationLabel =
      currentPreview.locationLabel === READER_NOT_OPENED_LOCATION_LABEL ||
      currentPreview.locationLabel === READER_OPENING_LOCATION_LABEL
        ? ''
        : getReaderLocationDisplayLabel(currentPreview.locationLabel).trim();
    const progressLabel = currentPreview.progressLabel.trim();
    const normalizedEffectiveTranslationSourceText = normalizeAssistanceText(
      effectiveTranslationSource.text
    );
    const selectedTranslationHistoryEntryId = assistanceSelection.translationHistoryEntryId.trim();
    const selectedTranslationHistoryEntry = selectedTranslationHistoryEntryId
      ? assistanceHistory.find(
          (entry) =>
            entry.id === selectedTranslationHistoryEntryId && entry.request.kind === 'translation'
        ) || null
      : null;
    const selectedTranslationResult =
      selectedTranslationHistoryEntry?.status === 'ready' &&
      selectedTranslationHistoryEntry.result &&
      selectedTranslationHistoryEntry.request.kind === 'translation'
        ? {
            translatedText: normalizeAssistanceText(selectedTranslationHistoryEntry.result.body),
            targetLanguage: selectedTranslationHistoryEntry.request.targetLanguage,
            providerLabel:
              `历史译文 · ${
                selectedTranslationHistoryEntry.result.sourceLabel ||
                getReaderTranslationProviderDisplayLabel(selectedTranslationHistoryEntry.request.provider)
              }`,
            chapterLabel: selectedTranslationHistoryEntry.request.chapterLabel,
            progressLocation: selectedTranslationHistoryEntry.request.cfi,
            chapterHref: ''
          }
        : null;
    const liveTranslationResult = resolveLiveTranslatedTtsResult(
      normalizedEffectiveTranslationSourceText,
      chapterLabel,
      locationLabel,
      progressLabel
    );

    const preferredTranslatedResult =
      translatedTtsOwner === 'archive'
        ? selectedTranslationResult || liveTranslationResult
        : liveTranslationResult;

    return resolveReaderTtsSpeechTargetForMode({
      mode: ttsReadAloudTextMode,
      source: {
        selectedText: $notesState.selection?.text,
        excerptText: currentPreview.ttsSourceText,
        excerptSourceLabel: currentPreview.ttsSourceLabel,
        sourceLanguage: currentPreview.ttsSourceLanguage,
        locationLabel,
        progressLabel,
        progressLocation: currentPreview.progressLocation,
        progressFraction: currentPreview.progressFraction,
        chapterHref: currentPreview.chapterHref,
        chapterLabel:
          chapterLabel &&
          chapterLabel !== READER_NOT_OPENED_LOCATION_LABEL &&
          chapterLabel !== READER_OPENING_LOCATION_LABEL &&
          chapterLabel !== '等待打开书籍'
            ? chapterLabel
            : '',
        title: title && title !== READER_EMPTY_TITLE ? title : ''
      },
      translated: preferredTranslatedResult
    });
  }

  const syncReaderWorkspaceModeToRoute = async (
    workspaceMode: ReaderRouteWorkspaceMode | null,
    nextTtsReadAloudTextMode: ReaderTtsReadAloudTextMode | null = ttsReadAloudTextMode,
    nextTranslationTargetLanguage: string | null = translationTargetLanguage,
    nextTranslationProvider: ReaderTranslationProvider | null = translationProvider,
    nextTranslationHistoryEntryId: string | null = assistanceSelection.translationHistoryEntryId
  ) => {
    const normalizedTranslationHistoryEntryId = nextTranslationHistoryEntryId?.trim() || null;
    const nextHref = toReaderWorkspaceModeHref(
      $page.url,
      workspaceMode,
      nextTtsReadAloudTextMode,
      nextTranslationTargetLanguage,
      nextTranslationProvider,
      (workspaceMode === 'translation' ||
        (workspaceMode === 'tts' && nextTtsReadAloudTextMode === 'translated'))
        ? normalizedTranslationHistoryEntryId
        : null
    );
    const currentHref = `${$page.url.pathname}${$page.url.search}`;
    if (nextHref === currentHref) return;
    await goto(nextHref, {
      replaceState: true,
      noScroll: true,
      keepFocus: true
    });
  };

  const openNotebookWorkspaceTab = async (
    tab: 'notes' | 'highlights' | 'assistant' | 'translation' | 'tts' | 'sync'
  ) => {
    notebookVisible = true;
    notebookTab = tab;
    await syncReaderWorkspaceModeToRoute(
      tab === 'translation' || tab === 'tts' ? tab : null,
      tab === 'tts' ? ttsReadAloudTextMode : null,
      tab === 'translation' ? translationTargetLanguage : null,
      tab === 'translation' ? translationProvider : null
    );
  };

  const closeNotebookWorkspace = async () => {
    notebookVisible = false;
    await syncReaderWorkspaceModeToRoute(null);
  };

  onMount(() => {
    void (async () => {
      translationProviderStatuses = await loadReaderTranslationProviderStatuses();
    })();

    if (typeof localStorage === 'undefined') return;
    ttsReadAloudTextMode = loadReaderSettings(localStorage).ttsReadAloudText;
    if (routeOpenState.workspaceMode === 'tts' && routeOpenState.ttsReadAloudTextMode) {
      ttsReadAloudTextMode = routeOpenState.ttsReadAloudTextMode;
    }
    if (routeOpenState.workspaceMode === 'translation' && routeOpenState.translationTargetLanguage) {
      translationTargetLanguage = routeOpenState.translationTargetLanguage;
    }
    if (routeOpenState.workspaceMode === 'translation' && routeOpenState.translationProvider) {
      translationProvider = routeOpenState.translationProvider;
    }
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
        const persisted = JSON.parse(rawNotebookShell) as {
          pinned?: boolean;
          activeTab?: 'notes' | 'highlights' | 'assistant' | 'translation' | 'tts' | 'sync';
        };
        notebookPinned = !!persisted.pinned;
        notebookVisible = !!persisted.pinned;
        notebookTab =
          persisted.activeTab === 'highlights'
            ? 'highlights'
            : persisted.activeTab === 'translation'
              ? 'translation'
              : persisted.activeTab === 'tts'
                ? 'tts'
                : persisted.activeTab === 'sync'
                  ? 'sync'
                : persisted.activeTab === 'assistant'
                  ? 'assistant'
                  : 'notes';
        if (routeOpenState.workspaceMode) {
          notebookVisible = true;
          notebookTab = routeOpenState.workspaceMode;
        }
      } catch (error) {
        console.warn('Failed to restore reader notebook shell state', error);
      }
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
    assistanceState = createEmptyReaderAssistanceState();
    assistanceHistory = restoreAssistanceHistory();
    assistanceSelection = restoreAssistanceSelection();
    if ($ttsState.status === 'speaking' || $ttsState.status === 'paused') {
      ttsController.stop();
    }
    ttsReadAloudTextMode = restoreCurrentBookTtsReadAloudMode();
    lastRestoredTtsReadAloudModeBookKey = readerBookKey;
    translatedTtsOwner = restoreCurrentBookTranslatedTtsOwner();
    lastRestoredTranslatedTtsOwnerBookKey = readerBookKey;
    translatedTtsLiveSnapshot = restoreCurrentBookTranslatedTtsLiveSnapshot();
    lastRestoredTranslatedTtsLiveSnapshotBookKey = readerBookKey;
    const restoredTtsOwnership = restoreTtsOwnership();
    ttsFollowsCurrentLocation = restoredTtsOwnership.followsCurrentLocation;
    pinnedTtsTarget = restoredTtsOwnership.pinnedTarget;
    lastRestoredTtsOwnershipBookKey = readerBookKey;
    const restoredTranslationOwnership = restoreTranslationOwnership();
    translationFollowsCurrentSource = restoredTranslationOwnership.followsCurrentSource;
    pinnedTranslationSource = restoredTranslationOwnership.pinnedSource;
    lastAssistanceBookKey = readerBookKey;
  }
  $: if (
    routeOpenState.workspaceMode &&
    routeOpenState.workspaceMode !== lastAppliedRouteWorkspaceMode
  ) {
    lastAppliedRouteWorkspaceMode = routeOpenState.workspaceMode;
    notebookVisible = true;
    notebookTab = routeOpenState.workspaceMode;
  }
  $: if (
    routeOpenState.workspaceMode === 'tts' &&
    routeOpenState.ttsReadAloudTextMode &&
    routeOpenState.ttsReadAloudTextMode !== ttsReadAloudTextMode
  ) {
    ttsReadAloudTextMode = routeOpenState.ttsReadAloudTextMode;
  }
  $: if (
    routeOpenState.workspaceMode === 'translation' &&
    routeOpenState.translationTargetLanguage &&
    routeOpenState.translationTargetLanguage !== translationTargetLanguage
  ) {
    translationTargetLanguage = routeOpenState.translationTargetLanguage;
  }
  $: if (
    routeOpenState.workspaceMode === 'translation' &&
    routeOpenState.translationProvider &&
    routeOpenState.translationProvider !== translationProvider
  ) {
    translationProvider = routeOpenState.translationProvider;
  }
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
  $: if (routeOpenState.workspaceMode === 'translation') {
    const nextTranslatedTtsOwner = routeOpenState.translationHistoryEntryId?.trim()
      ? 'archive'
      : 'live';
    if (translatedTtsOwner !== nextTranslatedTtsOwner) {
      translatedTtsOwner = nextTranslatedTtsOwner;
    }
  }
  $: if (
    routeOpenState.workspaceMode === 'tts' &&
    routeOpenState.ttsReadAloudTextMode === 'translated' &&
    routeOpenState.translationHistoryEntryId &&
    translatedTtsOwner !== 'archive'
  ) {
    translatedTtsOwner = 'archive';
  }
  $: if (
    routeOpenState.workspaceMode === 'translation' &&
    routeOpenState.translationHistoryEntryId
  ) {
    const routeOwnedTranslationEntry = assistanceHistory.find(
      (entry) =>
        entry.id === routeOpenState.translationHistoryEntryId && entry.request.kind === 'translation'
    );
    if (routeOwnedTranslationEntry?.request.kind === 'translation') {
      if (
        !routeOpenState.translationTargetLanguage &&
        translationTargetLanguage !== routeOwnedTranslationEntry.request.targetLanguage
      ) {
        translationTargetLanguage = routeOwnedTranslationEntry.request.targetLanguage;
      }
      if (
        !routeOpenState.translationProvider &&
        translationProvider !== routeOwnedTranslationEntry.request.provider
      ) {
        translationProvider = routeOwnedTranslationEntry.request.provider;
      }
    }
  }
  $: if (!routeOpenState.workspaceMode && lastAppliedRouteWorkspaceMode) {
    lastAppliedRouteWorkspaceMode = null;
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
    resolvedTtsTarget = resolveReaderTtsSpeechTarget();
  }
  $: effectiveTtsTarget = ttsFollowsCurrentLocation
    ? resolvedTtsTarget
    : pinnedTtsTarget || resolvedTtsTarget;
  $: {
    currentPreview;
    $notesState.selection;
    resolvedTranslationSource = resolveReaderTranslationModeSource();
  }
  $: effectiveTranslationSource = translationFollowsCurrentSource
    ? resolvedTranslationSource
    : pinnedTranslationSource || resolvedTranslationSource;
  $: {
    const selectedTranslationHistoryEntryId = assistanceSelection.translationHistoryEntryId.trim();
    const selectedTranslationHistoryEntry = selectedTranslationHistoryEntryId
      ? assistanceHistory.find(
          (entry) =>
            entry.id === selectedTranslationHistoryEntryId && entry.request.kind === 'translation'
        ) || null
      : null;
    const selectedTranslationRequest =
      selectedTranslationHistoryEntry?.request.kind === 'translation'
        ? selectedTranslationHistoryEntry.request
        : null;
    const prefersArchivedTranslation = translatedTtsOwner === 'archive';
    const hasArchivedTranslation = !!selectedTranslationRequest;
    const normalizedLiveTranslationSourceText = normalizeAssistanceText(effectiveTranslationSource.text);

    if (prefersArchivedTranslation && hasArchivedTranslation) {
      translatedTtsSourceKind = 'archived-translation';
      translatedTtsSourceContextLabel = `历史记录 · ${getReaderAssistanceRequestContextLabel(
        selectedTranslationRequest
      )}`;
      translatedTtsSourceText = normalizeAssistanceText(selectedTranslationRequest.text);
    } else if (normalizedLiveTranslationSourceText) {
      translatedTtsSourceKind = 'live-translation';
      translatedTtsSourceContextLabel = translationFollowsCurrentSource
        ? `正在跟随${effectiveTranslationSource.label || '当前阅读位置'}`
        : `已锁定${effectiveTranslationSource.label || '当前翻译目标'}`;
      translatedTtsSourceText = normalizedLiveTranslationSourceText;
    } else if (hasArchivedTranslation) {
      translatedTtsSourceKind = 'archived-translation';
      translatedTtsSourceContextLabel = `历史记录 · ${getReaderAssistanceRequestContextLabel(
        selectedTranslationRequest
      )}`;
      translatedTtsSourceText = normalizeAssistanceText(selectedTranslationRequest.text);
    } else {
      translatedTtsSourceKind = 'none';
      translatedTtsSourceContextLabel = '';
      translatedTtsSourceText = '';
    }
  }
  $: if ($ttsState.status !== 'speaking' && $ttsState.status !== 'paused') {
    ttsController.setSpeechTarget(effectiveTtsTarget);
  }
  $: activeTtsProgressLocation = $ttsState.speechProgressLocation.trim();
  $: currentPreviewProgressLocation = currentPreview.progressLocation.trim();
  $: canJumpToCurrentTtsLocation =
    !!activeTtsProgressLocation &&
    !!currentPreviewProgressLocation &&
    isReaderTtsPlaybackLocationDrifted($ttsState, currentPreview);
  $: previewPlaybackLocationSummary = [
    currentPreview.chapterLabel.trim() && currentPreview.chapterLabel.trim() !== '等待打开书籍'
      ? currentPreview.chapterLabel.trim()
      : '',
    currentPreview.locationLabel.trim() &&
    currentPreview.locationLabel.trim() !== READER_OPENING_LOCATION_LABEL &&
    currentPreview.locationLabel.trim() !== READER_NOT_OPENED_LOCATION_LABEL
      ? getReaderLocationDisplayLabel(currentPreview.locationLabel).trim()
      : '',
    currentPreview.progressLabel.trim()
  ]
    .filter(Boolean)
    .join(' · ');
  $: ttsMiniBarLocationSummary =
    getReaderTtsCompactPlaybackLocationSummary($ttsState, effectiveTtsTarget) ||
    (ttsReadAloudTextMode === 'translated' ? previewPlaybackLocationSummary : '');
  $: ttsMiniBarTranslatedWaitingTargetLabel =
    ttsReadAloudTextMode === 'translated' &&
    !getReaderTtsReadableTargetLabel($ttsState) &&
    !effectiveTtsTarget?.text.trim() &&
    translatedTtsSourceKind !== 'none'
      ? getReaderTtsTranslatedWaitingTargetLabel(translatedTtsSourceContextLabel)
      : '';
  $: ttsMiniBarVisible = shouldShowReaderTtsMiniBar(
    $ttsState,
    effectiveTtsTarget,
    ttsMiniBarTranslatedWaitingTargetLabel
  );
  $: ttsMiniBarStatusLabel = getReaderTtsSessionStatusLabel($ttsState);
  $: ttsMiniBarContextSummary = getReaderTtsMiniBarContextSummary({
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
      persistAssistanceHistory();
    }
  }
  $: {
    assistanceSelection;
    assistanceSelectionStorageKey;
    if (typeof localStorage !== 'undefined') {
      persistAssistanceSelection();
    }
  }
  $: {
    readerBookKey;
    ttsReadAloudModeStorageKey;
    ttsReadAloudTextMode;
    if (
      typeof localStorage !== 'undefined' &&
      readerBookKey &&
      readerBookKey === lastRestoredTtsReadAloudModeBookKey
    ) {
      persistCurrentBookTtsReadAloudMode();
    }
  }
  $: {
    readerBookKey;
    translatedTtsOwnerStorageKey;
    translatedTtsOwner;
    if (
      typeof localStorage !== 'undefined' &&
      readerBookKey &&
      readerBookKey === lastRestoredTranslatedTtsOwnerBookKey
    ) {
      persistCurrentBookTranslatedTtsOwner();
    }
  }
  $: {
    currentPreview;
    assistanceState;
    assistanceHistory;
    effectiveTranslationSource;
    translatedTtsOwner;
    if (translatedTtsOwner === 'archive') {
      translatedTtsLiveSnapshot = null;
    } else {
      const normalizedTranslationSourceText = normalizeAssistanceText(effectiveTranslationSource.text);
      const nextSnapshot = resolveLiveTranslatedTtsResult(
        normalizedTranslationSourceText,
        currentPreview.chapterLabel.trim(),
        getReaderLocationDisplayLabel(currentPreview.locationLabel).trim(),
        currentPreview.progressLabel.trim()
      );

      if (
        nextSnapshot &&
        normalizedTranslationSourceText &&
        nextSnapshot.translatedText &&
        nextSnapshot.providerLabel
      ) {
        const normalizedSnapshot = {
          sourceText: normalizedTranslationSourceText,
          translatedText: nextSnapshot.translatedText,
          targetLanguage: nextSnapshot.targetLanguage,
          providerLabel: nextSnapshot.providerLabel,
          chapterLabel: nextSnapshot.chapterLabel || '',
          locationLabel: nextSnapshot.locationLabel || '',
          progressLabel: nextSnapshot.progressLabel || '',
          progressLocation: nextSnapshot.progressLocation || '',
          progressFraction: nextSnapshot.progressFraction ?? null,
          chapterHref: nextSnapshot.chapterHref || ''
        };
        const snapshotChanged =
          !translatedTtsLiveSnapshot ||
          translatedTtsLiveSnapshot.sourceText !== normalizedSnapshot.sourceText ||
          translatedTtsLiveSnapshot.translatedText !== normalizedSnapshot.translatedText ||
          translatedTtsLiveSnapshot.targetLanguage !== normalizedSnapshot.targetLanguage ||
          translatedTtsLiveSnapshot.providerLabel !== normalizedSnapshot.providerLabel ||
          translatedTtsLiveSnapshot.chapterLabel !== normalizedSnapshot.chapterLabel ||
          translatedTtsLiveSnapshot.locationLabel !== normalizedSnapshot.locationLabel ||
          translatedTtsLiveSnapshot.progressLabel !== normalizedSnapshot.progressLabel ||
          translatedTtsLiveSnapshot.progressLocation !== normalizedSnapshot.progressLocation ||
          translatedTtsLiveSnapshot.progressFraction !== normalizedSnapshot.progressFraction ||
          translatedTtsLiveSnapshot.chapterHref !== normalizedSnapshot.chapterHref;
        if (snapshotChanged) {
          translatedTtsLiveSnapshot = normalizedSnapshot;
        }
      }
    }
  }
  $: {
    readerBookKey;
    translatedTtsLiveSnapshotStorageKey;
    translatedTtsLiveSnapshot;
    if (
      typeof localStorage !== 'undefined' &&
      readerBookKey &&
      readerBookKey === lastRestoredTranslatedTtsLiveSnapshotBookKey
    ) {
      persistCurrentBookTranslatedTtsLiveSnapshot();
    }
  }
  $: {
    readerBookKey;
    ttsOwnershipStorageKey;
    ttsFollowsCurrentLocation;
    pinnedTtsTarget;
    if (
      typeof localStorage !== 'undefined' &&
      readerBookKey &&
      readerBookKey === lastRestoredTtsOwnershipBookKey
    ) {
      persistTtsOwnership();
    }
  }
  $: {
    translationOwnershipStorageKey;
    translationFollowsCurrentSource;
    pinnedTranslationSource;
    if (typeof localStorage !== 'undefined') {
      persistTranslationOwnership();
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

  $: if (!supportsTextAnnotationsForFormat(currentPreview.formatLabel)) {
    notesController.setSelection(null);
  }
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
    ttsController.start(effectiveTtsTarget);
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

  const pinCurrentTtsTarget = () => {
    pinnedTtsTarget = resolvedTtsTarget
      ? {
          ...resolvedTtsTarget,
          followsCurrent: false
        }
      : null;
    ttsFollowsCurrentLocation = false;
    persistTtsOwnership();
    applyTtsRetarget(pinnedTtsTarget);
  };

  const resumeFollowingCurrentTtsTarget = () => {
    ttsFollowsCurrentLocation = true;
    pinnedTtsTarget = null;
    persistTtsOwnership();
    applyTtsRetarget(resolvedTtsTarget);
  };

  const setTranslatedTtsOwner = (owner: 'live' | 'archive') => {
    if (translatedTtsOwner === owner) return;
    translatedTtsOwner = owner;
    persistCurrentBookTranslatedTtsOwner();
  };

  const setTtsReadAloudTextMode = (mode: ReaderTtsReadAloudTextMode) => {
    if (ttsReadAloudTextMode === mode) return;
    ttsReadAloudTextMode = mode;
    persistCurrentBookTtsReadAloudMode();
    if (!ttsFollowsCurrentLocation) {
      pinnedTtsTarget = null;
      ttsFollowsCurrentLocation = true;
    }
    applyTtsRetarget(resolveReaderTtsSpeechTarget());
    if (routeOpenState.workspaceMode === 'tts' || (notebookVisible && notebookTab === 'tts')) {
      void syncReaderWorkspaceModeToRoute('tts', mode);
    }
  };

  const openTtsWorkspace = () => {
    void openNotebookWorkspaceTab('tts');
  };

  const openTranslatedTtsWorkspace = () => {
    const selectedTranslationHistoryEntryId = assistanceSelection.translationHistoryEntryId.trim();
    const prefersArchivedTranslation =
      routeOpenState.workspaceMode === 'translation'
        ? !!routeOpenState.translationHistoryEntryId?.trim()
        : translatedTtsSourceKind === 'archived-translation' && !!selectedTranslationHistoryEntryId;
    setTranslatedTtsOwner(prefersArchivedTranslation ? 'archive' : 'live');
    if (ttsReadAloudTextMode !== 'translated') {
      ttsReadAloudTextMode = 'translated';
      persistCurrentBookTtsReadAloudMode();
      if (!ttsFollowsCurrentLocation) {
        pinnedTtsTarget = null;
        ttsFollowsCurrentLocation = true;
      }
      applyTtsRetarget(resolveReaderTtsSpeechTarget());
    }
    notebookVisible = true;
    notebookTab = 'tts';
    void syncReaderWorkspaceModeToRoute(
      'tts',
      'translated',
      translationTargetLanguage,
      translationProvider,
      prefersArchivedTranslation ? selectedTranslationHistoryEntryId : ''
    );
  };

  const openTranslationMode = () => {
    void openNotebookWorkspaceTab('translation');
  };

  const setTranslationTargetLanguage = (language: string) => {
    const normalizedLanguage = language.trim().toLowerCase() || 'zh';
    if (translationTargetLanguage === normalizedLanguage) return;
    translationTargetLanguage = normalizedLanguage;
    if (routeOpenState.workspaceMode === 'translation' || notebookTab === 'translation') {
      void syncReaderWorkspaceModeToRoute('translation', null, normalizedLanguage, translationProvider);
    }
  };

  const setTranslationProvider = (provider: ReaderTranslationProvider) => {
    if (translationProvider === provider) return;
    translationProvider = provider;
    if (routeOpenState.workspaceMode === 'translation' || notebookTab === 'translation') {
      void syncReaderWorkspaceModeToRoute('translation', null, translationTargetLanguage, provider);
    }
  };

  const pinCurrentTranslationSource = (source?: { text: string; label: string }) => {
    const normalizedPinnedText = normalizeAssistanceText(source?.text || effectiveTranslationSource.text);
    pinnedTranslationSource = normalizedPinnedText
      ? {
          text: normalizedPinnedText,
          label: source?.label || effectiveTranslationSource.label || '当前翻译目标',
          chapterLabel: effectiveTranslationSource.chapterLabel
        }
      : null;
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

    return {
      text: fallback.text,
      label: fallback.label,
      chapterLabel: fallback.chapterLabel
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
        'translation',
        null,
        translationTargetLanguage,
        translationProvider,
        normalizedEntryId
      );
      return;
    }

    if (
      (routeOpenState.workspaceMode === 'tts' || notebookTab === 'tts') &&
      ttsReadAloudTextMode === 'translated'
    ) {
      void syncReaderWorkspaceModeToRoute(
        'tts',
        'translated',
        translationTargetLanguage,
        translationProvider,
        normalizedEntryId
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
      persistAssistanceHistory();
      persistAssistanceSelection();
    }

    if (mode !== 'translation') return;
    setTranslatedTtsOwner('live');

    if (routeOpenState.workspaceMode === 'translation' || notebookTab === 'translation') {
      void syncReaderWorkspaceModeToRoute(
        'translation',
        null,
        translationTargetLanguage,
        translationProvider,
        ''
      );
      return;
    }

    if (
      (routeOpenState.workspaceMode === 'tts' || notebookTab === 'tts') &&
      ttsReadAloudTextMode === 'translated'
    ) {
      void syncReaderWorkspaceModeToRoute(
        'tts',
        'translated',
        translationTargetLanguage,
        translationProvider,
        ''
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
          onOpenTtsWorkspace={openTtsWorkspace}
          onJumpToTtsPlaybackLocation={jumpToCurrentTtsLocation}
          onOpenTranslationModeFromMiniBar={openTranslationMode}
          onResumeFollowingCurrentTtsTargetFromMiniBar={resumeFollowingCurrentTtsTarget}
          onPinCurrentTtsTargetFromMiniBar={pinCurrentTtsTarget}
          onSwitchTtsModeFromMiniBar={() =>
            setTtsReadAloudTextMode(ttsReadAloudTextMode === 'translated' ? 'source' : 'translated')}
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
        supportsTextAnnotations={supportsTextAnnotationsForFormat(currentPreview.formatLabel)}
        textAnnotationSupportMessage="当前格式暂不支持正文批注。"
        assistance={assistanceState}
        {assistanceHistory}
        selectedLookupHistoryEntryId={assistanceSelection.lookupHistoryEntryId}
        selectedTranslationHistoryEntryId={assistanceSelection.translationHistoryEntryId}
        ttsSession={$ttsState}
        ttsTarget={effectiveTtsTarget}
        ttsFollowsCurrentLocation={ttsFollowsCurrentLocation}
        ttsReadAloudTextMode={ttsReadAloudTextMode}
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

<!-- Ownership: this reader surface explains one part of the reading workflow
 to the user. It may render state from the route or helper modules, but it should
 not silently become a second owner of persistence or route semantics. -->
<script lang="ts">
  import './readerSidebarPanel.css';
  import { tick } from 'svelte';
  import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
  import ReaderSidebarAssist from './ReaderSidebarAssist.svelte';
  import ReaderSidebarAnnotations from './ReaderSidebarAnnotations.svelte';
  import ReaderSidebarChrome from './ReaderSidebarChrome.svelte';
  import ReaderSidebarHighlightSelections from './ReaderSidebarHighlightSelections.svelte';
  import ReaderSidebarOverview from './ReaderSidebarOverview.svelte';
  import ReaderSidebarSearch from './ReaderSidebarSearch.svelte';
  import type {
    ReaderAssistanceHistoryEntry,
    ReaderAssistanceState,
    ReaderHighlightSelectionSet,
    ReaderHighlightSelectionSetExport,
    ReaderHighlightSelectionSetExportHighlight,
    ReaderHighlightSelectionSetSort,
    ReaderHighlightsFilter,
    ReaderHighlightsSort,
    ReaderBookmarksState,
    ReaderPreviewState,
    ReaderSearchConfig,
    ReaderSearchHistoryEntry,
    ReaderSidebarCallbacks,
    ReaderSidebarNotesState,
    ReaderSidebarSearchState,
    ReaderTranslationProviderStatus,
    ReaderTocItem,
    SidebarTab
  } from '$lib/reader';
  import {
    createEmptyReaderAssistanceState,
    createEmptyReaderPreviewState
  } from '$lib/reader';
  import {
    addReaderSidebarHighlightGroupSelection,
    clearReaderSidebarHighlightSelection,
    collapseReaderSidebarGroups,
    dedupeReaderSidebarSavedHighlightSelections,
    deriveReaderSidebarAnnotationState,
    expandReaderSidebarGroups,
    getReaderSidebarAnnotationKindLabel,
    invertReaderSidebarHighlightSelection,
    isReaderSidebarGroupCollapsed,
    isReaderSidebarHighlightGroupFullySelected,
    isReaderSidebarHighlightGroupPartiallySelected,
    openReaderSidebarActiveAnnotationGroups,
    pruneReaderSidebarHighlightSelectionState,
    removeReaderSidebarHighlightGroupSelection,
    selectAllReaderSidebarHighlights,
    toggleReaderSidebarGroupCollapsed,
    toggleReaderSidebarHighlightSelection,
    type ReaderSidebarAnnotationNote
  } from '$lib/reader/sidebarAnnotations';
  import {
    getSearchSupportMessage,
    getTextAnnotationSupportMessage,
    READER_UNSUPPORTED_SEARCH_TITLE,
    supportsSearchForFormat,
    supportsTextAnnotationsForFormat
  } from '$lib/reader/formats';
  import {
    canPersistReaderHighlightsWorkspaceState,
    loadReaderHighlightsWorkspaceState,
    saveReaderHighlightsWorkspaceState
  } from '$lib/services';
  import type {
    ReaderHighlightSelectionsImportPreview,
    ReaderHighlightSelectionsRefreshFilter,
    ReaderHighlightSelectionsRefreshSummary
  } from '$lib/reader/sidebarHighlightSelections';
  import {
    createReaderHighlightSelectionImportPreview,
    createReaderHighlightSelectionImportSource,
    createReaderImportedSelectionSetName,
    findExistingReaderCrossBookImportedSelection,
    getReaderHighlightSelectionRefreshDetail,
    getReaderHighlightSelectionRefreshLabel,
    getReaderHighlightSelectionRefreshOutcome,
    getReaderHighlightSelectionUnmatchedTexts,
    parseReaderHighlightSelectionSetExportPayload,
    refreshAllReaderCrossBookImportedSelections,
    refreshReaderCrossBookImportedSelection,
    resolveReaderImportedHighlightIds
  } from '$lib/reader/sidebarHighlightSelections';
  import {
    createDefaultReaderSidebarHighlightsWorkspaceState,
    normalizeReaderSidebarHighlightsWorkspaceState,
    toReaderHighlightsWorkspacePersistenceState,
    type ReaderSidebarHighlightsWorkspaceModel
  } from '$lib/reader/sidebarHighlightsWorkspace';

  export let toc: ReaderTocItem[] = [];
  export let activeHref = '';
  export let isWindowMode = false;
  export let isPinned = true;
  export let activeTab: SidebarTab = 'toc';
  export let bookKey = '';
  export let coverUrl = '';
  export let preview: ReaderPreviewState = createEmptyReaderPreviewState();
  export let assistance: ReaderAssistanceState = createEmptyReaderAssistanceState();
  export let assistanceHistory: ReaderAssistanceHistoryEntry[] = [];
  export let selectedLookupHistoryEntryId = '';
  export let selectedTranslationHistoryEntryId = '';
  export let translationProviderStatuses: ReaderTranslationProviderStatus[] = [];
  export let onSelectAssistanceHistoryEntry:
    | ((mode: 'lookup' | 'translation', entryId: string) => void)
    | null = null;
  export let onClearAssistanceHistory:
    | ((mode: 'lookup' | 'translation') => void)
    | null = null;
  export let search: ReaderSidebarSearchState = {
    term: '',
    status: 'idle',
    results: [],
    error: '',
    progress: 0,
    history: [],
    config: {
      scope: 'book',
      matchCase: false,
      matchWholeWords: false,
      matchDiacritics: false
    },
    cacheKey: '',
    notice: null,
    activeResultCfi: '',
    recentResultCfi: ''
  };
  export let notesState: ReaderSidebarNotesState = {
    activeCfi: '',
    selection: null,
    notes: []
  };
  export let bookmarksState: ReaderBookmarksState = {
    activeLocator: '',
    bookmarks: []
  };
  export let callbacks: ReaderSidebarCallbacks = {
    onNavigate: null,
    onToggleCurrentBookmark: null,
    onOpenBookmark: null,
    onDeleteBookmark: null,
    onGoToLibrary: null,
    onOpenSourcePath: null,
    onClose: null,
    onToggleSidebar: null,
    onTogglePin: null,
    onTabChange: null,
    onSearch: null,
    onSearchResult: null,
    onSearchConfigChange: null,
    onSearchHistory: null,
    onClearSearchHistory: null,
    onDeleteSearchHistoryEntry: null,
    onClearSearchCache: null,
    onRequestLookup: null,
    onRequestTranslation: null,
    onAddHighlight: null,
    onAddNote: null,
    onOpenNote: null,
    onEditNote: null,
    onDeleteNote: null,
    onDeleteNotes: null
  };
  let lastScrolledHref = '';
  let lastScrolledNoteCfi = '';
  let lastScrolledHighlightCfi = '';
  let lastScrolledBookmarkLocator = '';
  let searchHistoryFilter: 'all' | 'results' | 'empty' = 'all';
  let notesFilter: 'all' | 'chapter' = 'all';
  let notesKindFilter: 'all' | 'highlight' | 'note' = 'all';
  let highlightsFilter: ReaderHighlightsFilter = 'all';
  let highlightsSort: ReaderHighlightsSort = 'recent';
  let savedHighlightSelectionsSort: ReaderHighlightSelectionSetSort = 'recent';
  let savedHighlightSelectionsRefreshFilter: ReaderHighlightSelectionsRefreshFilter = 'all';
  let selectedHighlightIds = new Set<string>();
  let savedHighlightSelections: ReaderHighlightSelectionSet[] = [];
  let exportedHighlightSelection: ReaderHighlightSelectionSetExport | null = null;
  let exportHighlightSelectionNotice = '';
  let savedHighlightSelectionImportNotice = '';
  let savedHighlightSelectionRefreshSummary: ReaderHighlightSelectionsRefreshSummary | null = null;
  let savedHighlightSelectionImportPreview: ReaderHighlightSelectionsImportPreview | null = null;
  let bookmarksFilter: 'all' | 'chapter' = 'all';
  let bookmarksSort: 'recent' | 'chapter' = 'recent';
  let collapsedBookmarkGroups = new Set<string>();
  let collapsedNoteGroups = new Set<string>();
  let collapsedHighlightGroups = new Set<string>();
  let highlightsWorkspaceHydratedKey = '';
  let highlightsWorkspaceLoadToken = 0;
  // The sidebar is not a generic tab shell. Notes, bookmarks, highlights, and
  // search each carry different reading semantics, so refactors must preserve that
  // meaning instead of flattening them into one interchangeable workspace list.
  $: supportsTextAnnotations = supportsTextAnnotationsForFormat(preview.formatLabel);
  $: textAnnotationSupportMessage = getTextAnnotationSupportMessage(preview.formatLabel);
  $: highlightsWorkspaceStorageKey = bookKey ? `br1.reader.highlights.workspace:${bookKey}` : '';

  const applyDefaultHighlightsWorkspaceState = () => {
    applyHighlightsWorkspaceState(createDefaultReaderSidebarHighlightsWorkspaceState());
  };

  const applyHighlightsWorkspaceState = (state: ReaderSidebarHighlightsWorkspaceModel) => {
    highlightsFilter = state.highlightsFilter;
    highlightsSort = state.highlightsSort;
    savedHighlightSelectionsSort = state.savedHighlightSelectionsSort;
    savedHighlightSelectionsRefreshFilter = state.savedHighlightSelectionsRefreshFilter;
    selectedHighlightIds = state.selectedHighlightIds;
    savedHighlightSelections = state.savedHighlightSelections;
  };

  const applyPersistedHighlightsWorkspaceState = (state: unknown) => {
    applyHighlightsWorkspaceState(normalizeReaderSidebarHighlightsWorkspaceState(state, Date.now()));
  };

  $: if (!highlightsWorkspaceStorageKey) {
    highlightsWorkspaceHydratedKey = '';
  } else if (highlightsWorkspaceHydratedKey !== highlightsWorkspaceStorageKey) {
    const token = ++highlightsWorkspaceLoadToken;
    void (async () => {
      try {
        if (canPersistReaderHighlightsWorkspaceState()) {
          const persisted = await loadReaderHighlightsWorkspaceState(bookKey);
          if (token !== highlightsWorkspaceLoadToken) return;
          applyPersistedHighlightsWorkspaceState(persisted);
        } else if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(highlightsWorkspaceStorageKey);
          if (token !== highlightsWorkspaceLoadToken) return;
          applyPersistedHighlightsWorkspaceState(raw ? JSON.parse(raw) : null);
        } else {
          if (token !== highlightsWorkspaceLoadToken) return;
          applyDefaultHighlightsWorkspaceState();
        }
      } catch (error) {
        console.warn('Failed to restore highlights workspace state', error);
        if (token !== highlightsWorkspaceLoadToken) return;
        applyDefaultHighlightsWorkspaceState();
      }

      highlightsWorkspaceHydratedKey = highlightsWorkspaceStorageKey;
    })();
  }

  $: if (highlightsWorkspaceStorageKey && highlightsWorkspaceHydratedKey === highlightsWorkspaceStorageKey) {
    const state = toReaderHighlightsWorkspacePersistenceState({
      highlightsFilter,
      highlightsSort,
      savedHighlightSelectionsSort,
      savedHighlightSelectionsRefreshFilter,
      selectedHighlightIds,
      savedHighlightSelections
    });

    if (canPersistReaderHighlightsWorkspaceState()) {
      void saveReaderHighlightsWorkspaceState(bookKey, state).catch((error) => {
        console.warn('Failed to persist highlights workspace state', error);
      });
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(highlightsWorkspaceStorageKey, JSON.stringify(state));
    }
  }

  const scrollActiveIntoView = async () => {
    if (activeTab !== 'toc') return;
    if (!activeHref || activeHref === lastScrolledHref) return;
    await tick();

    const target = document.querySelector<HTMLButtonElement>(`.toc button[data-href="${CSS.escape(activeHref)}"]`);
    target?.scrollIntoView({ block: 'nearest' });
    lastScrolledHref = activeHref;
  };

  $: void scrollActiveIntoView();

  const scrollActiveNoteIntoView = async () => {
    if (activeTab !== 'notes') return;
    if (!notesState.activeCfi || notesState.activeCfi === lastScrolledNoteCfi) return;
    await tick();

    const target = document.querySelector<HTMLElement>(
      `.note-card[data-note-cfi="${CSS.escape(notesState.activeCfi)}"]`
    );
    target?.scrollIntoView({ block: 'nearest' });
    lastScrolledNoteCfi = notesState.activeCfi;
  };

  $: void scrollActiveNoteIntoView();

  const scrollActiveHighlightIntoView = async () => {
    if (activeTab !== 'highlights') return;
    if (!notesState.activeCfi || notesState.activeCfi === lastScrolledHighlightCfi) return;
    await tick();

    const target = document.querySelector<HTMLElement>(
      `.highlight-card[data-note-cfi="${CSS.escape(notesState.activeCfi)}"]`
    );
    target?.scrollIntoView({ block: 'nearest' });
    lastScrolledHighlightCfi = notesState.activeCfi;
  };

  $: void scrollActiveHighlightIntoView();

  const scrollActiveBookmarkIntoView = async () => {
    if (activeTab !== 'bookmarks') return;
    if (!bookmarksState.activeLocator || bookmarksState.activeLocator === lastScrolledBookmarkLocator) return;
    await tick();

    const target = document.querySelector<HTMLElement>(
      `.bookmark-card[data-bookmark-locator="${CSS.escape(bookmarksState.activeLocator)}"]`
    );
    target?.scrollIntoView({ block: 'nearest' });
    lastScrolledBookmarkLocator = bookmarksState.activeLocator;
  };

  $: void scrollActiveBookmarkIntoView();

  const formatTimestamp = (value: number) =>
    new Date(value).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const formatSearchConfigLabel = (config: ReaderSearchConfig) => {
    const labels = [config.scope === 'section' ? '本章' : '全书'];
    if (config.matchCase) labels.push('区分大小写');
    if (config.matchWholeWords) labels.push('整词');
    if (config.matchDiacritics) labels.push('保留重音');
    return labels.join(' · ');
  };

  const formatSearchHistoryAge = (value: number) => {
    if (!value) return '较早';

    const diff = Date.now() - value;
    if (diff < 60_000) return '刚刚';
    if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))} 分钟前`;
    if (diff < 86_400_000) return `${Math.max(1, Math.round(diff / 3_600_000))} 小时前`;
    return formatTimestamp(value);
  };

  const getSearchSummaryModel = (search: ReaderSidebarSearchState, formatLabel: string) => {
    if (search.status === 'searching') {
      return {
        title: '正在搜索',
        detail:
          search.progress > 0
            ? `已扫描 ${Math.round(search.progress * 100)}%`
            : '正在扫描当前书的正文内容。'
      };
    }

    if (search.status === 'error') {
      if (!supportsSearchForFormat(formatLabel)) {
        return {
          title: READER_UNSUPPORTED_SEARCH_TITLE,
          detail: getSearchSupportMessage(formatLabel)
        };
      }

      return {
        title: '正文搜索暂时不可用',
        detail: search.error || '正文搜索失败。'
      };
    }

    if (search.results.length) {
      return {
        title: `${search.results.length}`,
        detail: '正文命中结果'
      };
    }

    if (search.term.trim() && search.status === 'done') {
      return {
        title: '0',
        detail: '当前关键词没有命中正文内容'
      };
    }

    return {
      title: '正文搜索',
      detail: '输入关键词后会在正文里搜索，而不只是过滤目录。'
    };
  };

  const setActiveTab = (tab: SidebarTab) => {
    callbacks.onTabChange?.(tab);
  };

  const updateSearchConfig = <K extends keyof ReaderSearchConfig>(key: K, value: ReaderSearchConfig[K]) => {
    callbacks.onSearchConfigChange?.({
      ...search.config,
      [key]: value
    });
  };

  $: successfulSearchHistoryCount = search.history.filter((entry) => entry.resultCount > 0).length;
  $: emptySearchHistoryCount = search.history.filter((entry) => entry.resultCount === 0).length;
  $: visibleSearchHistory =
    searchHistoryFilter === 'results'
      ? search.history.filter((entry) => entry.resultCount > 0)
      : searchHistoryFilter === 'empty'
        ? search.history.filter((entry) => entry.resultCount === 0)
        : search.history;
  $: cachedSearchHistoryEntries = search.history.filter((entry) => entry.resultCount > 0);
  $: searchCacheDisplayKey =
    search.cacheKey.length > 52
      ? `${search.cacheKey.slice(0, 24)}…${search.cacheKey.slice(-20)}`
      : search.cacheKey;
  $: rawAllHighlights = notesState.notes.filter((note) => note.kind === 'highlight');
  $: recentSearchResultIndex = search.results.findIndex((item) => item.cfi === search.recentResultCfi);
  $: activeSearchResultIndex = search.results.findIndex((item) => item.cfi === search.activeResultCfi);
  $: currentSearchResultIndex = Math.max(
    0,
    recentSearchResultIndex >= 0 ? recentSearchResultIndex : activeSearchResultIndex
  );
  $: searchSummaryModel = getSearchSummaryModel(search, preview.formatLabel);
  // Current-book annotation derivation lives in a pure helper so the sidebar
  // can keep owning persistence and routing without also owning every grouping
  // and selection rule inline.
  $: annotationState = deriveReaderSidebarAnnotationState({
    activeHref,
    supportsTextAnnotations,
    textAnnotationSupportMessage,
    notesState,
    allHighlights: rawAllHighlights,
    bookmarksState,
    notesFilter,
    notesKindFilter,
    highlightsFilter,
    highlightsSort,
    bookmarksFilter,
    bookmarksSort,
    selectedHighlightIds,
    savedHighlightSelections,
    collapsedBookmarkGroups,
    collapsedNoteGroups,
    collapsedHighlightGroups
  });
  $: isCurrentLocationBookmarked = annotationState.isCurrentLocationBookmarked;
  $: notesPanelSummary = annotationState.notesPanelSummary;
  $: bookmarksPanelSummary = annotationState.bookmarksPanelSummary;
  $: highlightsPanelSummary = annotationState.highlightsPanelSummary;
  $: sortedBookmarks = annotationState.sortedBookmarks;
  $: groupedBookmarks = annotationState.groupedBookmarks;
  $: collapsibleBookmarkGroupKeys = annotationState.collapsibleBookmarkGroupKeys;
  $: areAllBookmarkGroupsExpanded = annotationState.areAllBookmarkGroupsExpanded;
  $: areAllBookmarkGroupsCollapsed = annotationState.areAllBookmarkGroupsCollapsed;
  $: notesByScope = annotationState.notesByScope;
  $: allHighlights = annotationState.allHighlights;
  $: highlightsByScope = annotationState.highlightsByScope;
  $: sortedHighlights = annotationState.sortedHighlights;
  $: orderedSavedHighlightSelections =
    savedHighlightSelectionsSort === 'oldest'
      ? [...savedHighlightSelections].sort((left, right) => left.createdAt - right.createdAt)
      : [...savedHighlightSelections].sort((left, right) => right.createdAt - left.createdAt);
  $: importedSavedHighlightSelections = savedHighlightSelections.filter((selectionSet) => !!selectionSet.importSource);
  $: savedHighlightSelectionsRefreshCounts = importedSavedHighlightSelections.reduce(
    (counts, selectionSet) => {
      const outcome = getReaderHighlightSelectionRefreshOutcome(selectionSet);
      if (outcome !== 'manual') {
        counts[outcome] += 1;
      }
      return counts;
    },
    {
      full: 0,
      partial: 0,
      missed: 0
    }
  );
  $: filteredSavedHighlightSelections =
    savedHighlightSelectionsRefreshFilter === 'all'
      ? orderedSavedHighlightSelections
      : orderedSavedHighlightSelections.filter(
          (selectionSet) =>
            selectionSet.importSource &&
            getReaderHighlightSelectionRefreshOutcome(selectionSet) === savedHighlightSelectionsRefreshFilter
        );
  $: selectedVisibleHighlights = annotationState.selectedVisibleHighlights;
  $: areAllVisibleHighlightsSelected = annotationState.areAllVisibleHighlightsSelected;
  $: filteredNotes = annotationState.filteredNotes;
  $: groupedNotes = annotationState.groupedNotes;
  $: groupedHighlights = annotationState.groupedHighlights;
  $: collapsibleGroupKeys = annotationState.collapsibleNoteGroupKeys;
  $: collapsibleHighlightGroupKeys = annotationState.collapsibleHighlightGroupKeys;
  $: areAllNoteGroupsExpanded = annotationState.areAllNoteGroupsExpanded;
  $: areAllNoteGroupsCollapsed = annotationState.areAllNoteGroupsCollapsed;
  $: areAllHighlightGroupsExpanded = annotationState.areAllHighlightGroupsExpanded;
  $: areAllHighlightGroupsCollapsed = annotationState.areAllHighlightGroupsCollapsed;
  $: {
    const openedGroups = openReaderSidebarActiveAnnotationGroups({
      notesState,
      bookmarksState,
      allHighlights: rawAllHighlights,
      collapsedBookmarkGroups,
      collapsedNoteGroups,
      collapsedHighlightGroups
    });
    if (openedGroups.collapsedBookmarkGroups.size !== collapsedBookmarkGroups.size) {
      collapsedBookmarkGroups = openedGroups.collapsedBookmarkGroups;
    }
    if (openedGroups.collapsedNoteGroups.size !== collapsedNoteGroups.size) {
      collapsedNoteGroups = openedGroups.collapsedNoteGroups;
    }
    if (openedGroups.collapsedHighlightGroups.size !== collapsedHighlightGroups.size) {
      collapsedHighlightGroups = openedGroups.collapsedHighlightGroups;
    }
  }
  $: {
    const pruned = pruneReaderSidebarHighlightSelectionState({
      allHighlights: rawAllHighlights,
      selectedHighlightIds,
      savedHighlightSelections
    });
    if (pruned.selectedHighlightIds.size !== selectedHighlightIds.size) {
      selectedHighlightIds = pruned.selectedHighlightIds;
    }
    if (JSON.stringify(pruned.savedHighlightSelections) !== JSON.stringify(savedHighlightSelections)) {
      savedHighlightSelections = pruned.savedHighlightSelections;
    }
  }
  $: {
    const dedupedSavedSelections = dedupeReaderSidebarSavedHighlightSelections(savedHighlightSelections);
    if (JSON.stringify(dedupedSavedSelections) !== JSON.stringify(savedHighlightSelections)) {
      savedHighlightSelections = dedupedSavedSelections;
    }
  }

  const isNoteGroupCollapsed = (chapterHref: string) =>
    isReaderSidebarGroupCollapsed(collapsedNoteGroups, chapterHref);

  const isHighlightGroupCollapsed = (chapterHref: string) =>
    isReaderSidebarGroupCollapsed(collapsedHighlightGroups, chapterHref);

  const toggleNoteGroup = (chapterHref: string) => {
    collapsedNoteGroups = toggleReaderSidebarGroupCollapsed(collapsedNoteGroups, chapterHref);
  };

  const expandAllNoteGroups = () => {
    collapsedNoteGroups = expandReaderSidebarGroups();
  };

  const collapseAllNoteGroups = () => {
    collapsedNoteGroups = collapseReaderSidebarGroups(collapsibleGroupKeys);
  };

  const getAnnotationKindLabel = getReaderSidebarAnnotationKindLabel;

  const deleteVisibleNotes = () => {
    if (!filteredNotes.length) return;
    const scopeLabel = notesFilter === 'chapter' ? '当前章节' : '当前视图';
    const kindLabel =
      notesKindFilter === 'highlight' ? '高亮' : notesKindFilter === 'note' ? '笔记' : '标注';
    if (!window.confirm(`删除${scopeLabel}中的全部${kindLabel}？`)) return;
    callbacks.onDeleteNotes?.(filteredNotes.map((note) => note.id));
  };

  const deleteNoteGroup = (notes: typeof filteredNotes, chapterLabel: string) => {
    if (!notes.length) return;
    const kindLabel = getAnnotationKindLabel(notes);
    const confirmLabel =
      notes.length === 1
        ? `删除“${chapterLabel}”里的这条${kindLabel}？`
        : `删除“${chapterLabel}”里的 ${notes.length} 条${kindLabel}？`;
    if (!window.confirm(confirmLabel)) return;
    callbacks.onDeleteNotes?.(notes.map((note) => note.id));
  };

  const toggleHighlightGroup = (chapterHref: string) => {
    collapsedHighlightGroups = toggleReaderSidebarGroupCollapsed(collapsedHighlightGroups, chapterHref);
  };

  const expandAllHighlightGroups = () => {
    collapsedHighlightGroups = expandReaderSidebarGroups();
  };

  const collapseAllHighlightGroups = () => {
    collapsedHighlightGroups = collapseReaderSidebarGroups(collapsibleHighlightGroupKeys);
  };

  const deleteVisibleHighlights = () => {
    if (!highlightsByScope.length) return;
    const confirmLabel =
      highlightsFilter === 'chapter'
        ? '删除当前章节中的全部高亮？'
        : highlightsFilter === 'selected'
          ? '删除当前已选高亮视图中的全部高亮？'
          : '删除当前视图中的全部高亮？';
    if (!window.confirm(confirmLabel)) return;
    callbacks.onDeleteNotes?.(highlightsByScope.map((note) => note.id));
    selectedHighlightIds = clearReaderSidebarHighlightSelection();
  };

  const toggleHighlightSelection = (id: string) => {
    selectedHighlightIds = toggleReaderSidebarHighlightSelection(selectedHighlightIds, id);
  };

  const selectAllVisibleHighlights = () => {
    selectedHighlightIds = selectAllReaderSidebarHighlights(sortedHighlights);
  };

  const clearSelectedHighlights = () => {
    selectedHighlightIds = clearReaderSidebarHighlightSelection();
  };

  const saveCurrentHighlightSelection = () => {
    if (!selectedHighlightIds.size) return;
    const rawName = window.prompt('为当前高亮选择集命名', `高亮集 ${savedHighlightSelections.length + 1}`);
    const name = rawName?.trim();
    if (!name) return;
    savedHighlightSelections = [
      {
        id: `selection-${Date.now()}`,
        name,
        selectedIds: Array.from(selectedHighlightIds),
        createdAt: Date.now()
      },
      ...savedHighlightSelections
    ];
    savedHighlightSelectionImportNotice = '';
  };

  const buildSavedHighlightSelectionExport = (
    selectionSet: ReaderHighlightSelectionSet
  ): ReaderHighlightSelectionSetExport => ({
    schemaVersion: 1,
    bookKey,
    bookTitle: preview.title,
    bookAuthor: preview.author,
    formatLabel: preview.formatLabel,
    exportedAt: Date.now(),
    selectionSet: {
      ...selectionSet,
      selectedIds: [...selectionSet.selectedIds]
    },
    highlights: allHighlights
      .filter((note) => selectionSet.selectedIds.includes(note.id))
      .map(
        (note): ReaderHighlightSelectionSetExportHighlight => ({
          id: note.id,
          cfi: note.cfi,
          text: note.text,
          chapterLabel: note.chapterLabel,
          chapterHref: note.chapterHref,
          createdAt: note.createdAt
        })
      )
  });

  const applySavedHighlightSelection = (selectionSet: ReaderHighlightSelectionSet) => {
    selectedHighlightIds = new Set(selectionSet.selectedIds);
    highlightsFilter = 'selected';
  };

  const renameSavedHighlightSelection = (selectionId: string) => {
    const selectionSet = savedHighlightSelections.find((set) => set.id === selectionId);
    if (!selectionSet) return;
    const rawName = window.prompt('重命名保存的高亮选择集', selectionSet.name);
    const name = rawName?.trim();
    if (!name || name === selectionSet.name) return;
    savedHighlightSelections = savedHighlightSelections.map((set) =>
      set.id === selectionId
        ? {
            ...set,
            name
          }
        : set
    );
    savedHighlightSelectionImportNotice = '';
  };

  const deleteSavedHighlightSelection = (selectionId: string) => {
    const selectionSet = savedHighlightSelections.find((set) => set.id === selectionId);
    if (!selectionSet) return;
    if (!window.confirm(`删除保存的高亮选择集“${selectionSet.name}”？`)) return;
    savedHighlightSelections = savedHighlightSelections.filter((set) => set.id !== selectionId);
    if (exportedHighlightSelection?.selectionSet.id === selectionId) {
      exportedHighlightSelection = null;
      exportHighlightSelectionNotice = '';
    }
  };

  const exportSavedHighlightSelection = (selectionSet: ReaderHighlightSelectionSet) => {
    exportedHighlightSelection = buildSavedHighlightSelectionExport(selectionSet);
    exportHighlightSelectionNotice = '';
  };

  const closeExportedHighlightSelection = () => {
    exportedHighlightSelection = null;
    exportHighlightSelectionNotice = '';
  };

  const copyExportedHighlightSelection = async () => {
    if (!exportedHighlightSelection) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportedHighlightSelection, null, 2));
      exportHighlightSelectionNotice = '已复制导出内容';
    } catch (error) {
      console.warn('Failed to copy saved highlight selection export', error);
      exportHighlightSelectionNotice = '复制失败，请手动复制导出内容';
    }
  };

  const getSavedHighlightSelectionRefreshDetail = getReaderHighlightSelectionRefreshDetail;
  const getSavedHighlightSelectionRefreshOutcome = getReaderHighlightSelectionRefreshOutcome;
  const getSavedHighlightSelectionRefreshLabel = getReaderHighlightSelectionRefreshLabel;
  const getSavedHighlightSelectionUnmatchedTexts = (selectionSet: ReaderHighlightSelectionSet) =>
    getReaderHighlightSelectionUnmatchedTexts(selectionSet, allHighlights);

  const importSavedHighlightSelection = () => {
    savedHighlightSelectionRefreshSummary = null;
    const rawPayload = window.prompt('粘贴导出的高亮选择集 JSON');
    const payload = rawPayload?.trim();
    if (!payload) return;

    const parsedPayload = parseReaderHighlightSelectionSetExportPayload(payload);
    if (!parsedPayload.ok && parsedPayload.reason === 'json') {
      savedHighlightSelectionImportNotice = '导入失败：JSON 解析错误';
      return;
    }

    if (!parsedPayload.ok) {
      savedHighlightSelectionImportNotice = '导入失败：导出对象结构不正确';
      savedHighlightSelectionImportPreview = null;
      return;
    }

    const parsed = parsedPayload.value;
    const resolution = resolveReaderImportedHighlightIds(parsed, allHighlights);
    if (parsed.bookKey !== bookKey) {
      savedHighlightSelectionImportPreview =
        createReaderHighlightSelectionImportPreview(parsed, resolution);
      savedHighlightSelectionImportNotice = `跨书预检：可映射 ${resolution.importedIds.length}/${parsed.highlights.length} 条高亮，当前还不能直接导入`;
      return;
    }

    const importedIds = resolution.importedIds;
    if (!importedIds.length) {
      savedHighlightSelectionImportNotice = '导入失败：当前书里找不到这组高亮';
      savedHighlightSelectionImportPreview = null;
      return;
    }

    const importedName = createReaderImportedSelectionSetName(
      parsed.selectionSet.name,
      savedHighlightSelections
    );
    savedHighlightSelections = [
      {
        id: `selection-import-${Date.now()}`,
        name: importedName,
        selectedIds: importedIds,
        createdAt: parsed.selectionSet.createdAt,
        ...(parsed.selectionSet.importSource ? { importSource: parsed.selectionSet.importSource } : {})
      },
      ...savedHighlightSelections
    ];
    savedHighlightSelectionImportNotice = `已导入选择集：${importedName}`;
    savedHighlightSelectionImportPreview = null;
  };

  const importMatchedHighlightsFromPreview = () => {
    savedHighlightSelectionRefreshSummary = null;
    const preview = savedHighlightSelectionImportPreview;
    if (!preview?.importedIds.length) return;

    const existingSelection = findExistingReaderCrossBookImportedSelection(
      savedHighlightSelections,
      preview.sourceBookKey,
      preview.selectionName
    );
    const importSource = createReaderHighlightSelectionImportSource(preview, Date.now());

    if (existingSelection) {
      savedHighlightSelections = savedHighlightSelections.map((selectionSet) =>
        selectionSet.id === existingSelection.id
          ? {
              ...selectionSet,
              selectedIds: [...preview.importedIds],
              importSource
            }
          : selectionSet
      );
      savedHighlightSelectionImportNotice = `已更新跨书选择集：${existingSelection.name}（${preview.matchedCount}/${preview.totalCount}）`;
    } else {
      const importedName = createReaderImportedSelectionSetName(
        preview.selectionName,
        savedHighlightSelections
      );
      savedHighlightSelections = [
        {
          id: `selection-import-cross-book-${Date.now()}`,
          name: importedName,
          selectedIds: [...preview.importedIds],
          createdAt: preview.selectionCreatedAt,
          importSource
        },
        ...savedHighlightSelections
      ];
      savedHighlightSelectionImportNotice = `已导入跨书选择集：${importedName}（${preview.matchedCount}/${preview.totalCount}）`;
    }
    savedHighlightSelectionImportPreview = null;
  };

  const refreshCrossBookImportedSelection = (selectionSet: ReaderHighlightSelectionSet) => {
    const importSource = selectionSet.importSource;
    if (!importSource) return;

    const refreshed = refreshReaderCrossBookImportedSelection(selectionSet, allHighlights, Date.now());
    if (!refreshed) return;
    savedHighlightSelections = savedHighlightSelections.map((candidate) =>
      candidate.id === selectionSet.id
        ? refreshed.selectionSet
        : candidate
    );
    savedHighlightSelectionImportNotice = `已刷新跨书选择集：${selectionSet.name}（${refreshed.resolution.importedIds.length}/${importSource.totalCount}）`;
    savedHighlightSelectionRefreshSummary = refreshed.summary;
  };

  const refreshAllCrossBookImportedSelections = () => {
    if (!importedSavedHighlightSelections.length) return;

    const refreshed = refreshAllReaderCrossBookImportedSelections(
      savedHighlightSelections,
      allHighlights,
      Date.now()
    );
    savedHighlightSelections = refreshed.selectionSets;

    savedHighlightSelectionImportNotice =
      refreshed.summary.refreshedCount === 1
        ? '已刷新 1 组跨书选择集'
        : `已刷新 ${refreshed.summary.refreshedCount} 组跨书选择集`;
    savedHighlightSelectionRefreshSummary = refreshed.summary;
  };

  const invertVisibleHighlightsSelection = () => {
    selectedHighlightIds = invertReaderSidebarHighlightSelection(selectedHighlightIds, sortedHighlights);
  };

  const selectHighlightGroup = (notes: ReaderSidebarAnnotationNote[]) => {
    selectedHighlightIds = addReaderSidebarHighlightGroupSelection(selectedHighlightIds, notes);
  };

  const clearHighlightGroupSelection = (notes: ReaderSidebarAnnotationNote[]) => {
    selectedHighlightIds = removeReaderSidebarHighlightGroupSelection(selectedHighlightIds, notes);
  };

  const invertHighlightGroupSelection = (notes: ReaderSidebarAnnotationNote[]) => {
    selectedHighlightIds = invertReaderSidebarHighlightSelection(selectedHighlightIds, notes);
  };

  const deleteHighlightGroup = (notes: ReaderSidebarAnnotationNote[], chapterLabel: string) => {
    if (!notes.length) return;
    const confirmLabel =
      notes.length === 1
        ? `删除“${chapterLabel}”里的这条高亮？`
        : `删除“${chapterLabel}”里的 ${notes.length} 条高亮？`;
    if (!window.confirm(confirmLabel)) return;
    callbacks.onDeleteNotes?.(notes.map((note) => note.id));

    selectedHighlightIds = removeReaderSidebarHighlightGroupSelection(selectedHighlightIds, notes);
  };

  const isHighlightGroupFullySelected = (notes: ReaderSidebarAnnotationNote[]) =>
    isReaderSidebarHighlightGroupFullySelected(selectedHighlightIds, notes);

  const isHighlightGroupPartiallySelected = (notes: ReaderSidebarAnnotationNote[]) =>
    isReaderSidebarHighlightGroupPartiallySelected(selectedHighlightIds, notes);

  const deleteSelectedHighlights = () => {
    if (!selectedVisibleHighlights.length) return;
    const confirmLabel =
      selectedVisibleHighlights.length === 1
        ? '删除选中的这条高亮？'
        : `删除选中的 ${selectedVisibleHighlights.length} 条高亮？`;
    if (!window.confirm(confirmLabel)) return;
    callbacks.onDeleteNotes?.(selectedVisibleHighlights.map((note) => note.id));
    selectedHighlightIds = clearReaderSidebarHighlightSelection();
  };

  const isBookmarkGroupCollapsed = (chapterHref: string) =>
    isReaderSidebarGroupCollapsed(collapsedBookmarkGroups, chapterHref);

  const toggleBookmarkGroup = (chapterHref: string) => {
    collapsedBookmarkGroups = toggleReaderSidebarGroupCollapsed(collapsedBookmarkGroups, chapterHref);
  };

  const expandAllBookmarkGroups = () => {
    collapsedBookmarkGroups = expandReaderSidebarGroups();
  };

  const collapseAllBookmarkGroups = () => {
    collapsedBookmarkGroups = collapseReaderSidebarGroups(collapsibleBookmarkGroupKeys);
  };

  const runSearchHistory = (entry: ReaderSearchHistoryEntry) => {
    callbacks.onSearchHistory?.(entry);
  };

  const navigateSearchResult = (direction: -1 | 1) => {
    if (search.results.length <= 1) return;
    const nextIndex = Math.min(
      search.results.length - 1,
      Math.max(0, currentSearchResultIndex + direction)
    );
    const target = search.results[nextIndex];
    if (!target) return;
    callbacks.onSearchResult?.(target.cfi);
  };
</script>

<aside
  class:window-mode={isWindowMode}
  class:overlay-mode={isWindowMode && !isPinned}
  class="reader-sidebar"
  aria-label="阅读导航"
>
  <ReaderSidebarChrome
    {activeTab}
    {isWindowMode}
    {isPinned}
    onToggleSidebar={callbacks.onToggleSidebar}
    onTogglePin={callbacks.onTogglePin}
    onClose={callbacks.onClose}
    onSelectTab={setActiveTab}
  />

  <OverlayScrollbarsComponent
    defer
    element="div"
    class="sidebar-scroll"
    options={{ scrollbars: { autoHide: 'scroll', theme: 'os-theme-readest' } }}
  >
    <div class="sidebar-content">
      {#if activeTab === 'toc'}
        <ReaderSidebarOverview
          {coverUrl}
          {preview}
          {toc}
          {activeHref}
          bookmarkCount={bookmarksState.bookmarks.length}
          highlightCount={allHighlights.length}
          noteCount={notesState.notes.filter((note) => note.kind !== 'highlight').length}
          onGoToLibrary={callbacks.onGoToLibrary}
          onOpenSourcePath={callbacks.onOpenSourcePath}
          onNavigate={callbacks.onNavigate}
        />
      {:else if activeTab === 'search'}
        <!-- Search keeps route/controller ownership in the parent, but the
         rendered workspace can move into a child because it only consumes the
         derived search model and emits explicit callbacks. -->
        <ReaderSidebarSearch
          {search}
          {searchHistoryFilter}
          {successfulSearchHistoryCount}
          {emptySearchHistoryCount}
          {visibleSearchHistory}
          {cachedSearchHistoryEntries}
          {searchCacheDisplayKey}
          {currentSearchResultIndex}
          {searchSummaryModel}
          {formatSearchConfigLabel}
          {formatSearchHistoryAge}
          onIssueSearch={callbacks.onSearch}
          onUpdateSearchConfig={updateSearchConfig}
          onRunSearchHistory={runSearchHistory}
          onSetSearchHistoryFilter={(value) => {
            searchHistoryFilter = value;
          }}
          onClearSearchHistory={callbacks.onClearSearchHistory}
          onDeleteSearchHistoryEntry={callbacks.onDeleteSearchHistoryEntry}
          onClearSearchCache={callbacks.onClearSearchCache}
          onNavigateSearchResult={navigateSearchResult}
          onOpenSearchResult={callbacks.onSearchResult}
        />
      {:else if activeTab === 'assist'}
        <!-- The assist tab still belongs to the sidebar router. This child only
         presents the shared workspace host so the parent keeps route and
         history ownership aligned with the notebook surface. -->
        <ReaderSidebarAssist
          {preview}
          {notesState}
          {assistance}
          {assistanceHistory}
          {selectedLookupHistoryEntryId}
          {selectedTranslationHistoryEntryId}
          {translationProviderStatuses}
          callbacks={{
            onRequestLookup: callbacks.onRequestLookup,
            onRequestTranslation: callbacks.onRequestTranslation
          }}
          {onSelectAssistanceHistoryEntry}
          {onClearAssistanceHistory}
        />
      {:else}
        <ReaderSidebarAnnotations
          {activeTab}
          {activeHref}
          {supportsTextAnnotations}
          {textAnnotationSupportMessage}
          {notesPanelSummary}
          {bookmarksPanelSummary}
          {highlightsPanelSummary}
          {notesState}
          {bookmarksState}
          {callbacks}
          {formatTimestamp}
          {isCurrentLocationBookmarked}
          {bookmarksFilter}
          {bookmarksSort}
          {sortedBookmarks}
          {groupedBookmarks}
          {areAllBookmarkGroupsExpanded}
          {areAllBookmarkGroupsCollapsed}
          {allHighlights}
          hasSavedHighlightSelections={savedHighlightSelections.length > 0}
          {highlightsFilter}
          {highlightsSort}
          {groupedHighlights}
          {sortedHighlights}
          {selectedHighlightIds}
          {selectedVisibleHighlights}
          {areAllVisibleHighlightsSelected}
          {areAllHighlightGroupsExpanded}
          {areAllHighlightGroupsCollapsed}
          {notesFilter}
          {notesKindFilter}
          {notesByScope}
          {filteredNotes}
          {groupedNotes}
          {areAllNoteGroupsExpanded}
          {areAllNoteGroupsCollapsed}
          isBookmarkGroupCollapsed={isBookmarkGroupCollapsed}
          onSetBookmarksFilter={(value) => {
            bookmarksFilter = value;
          }}
          onSetBookmarksSort={(value) => {
            bookmarksSort = value;
          }}
          onToggleBookmarkGroup={toggleBookmarkGroup}
          onExpandAllBookmarkGroups={expandAllBookmarkGroups}
          onCollapseAllBookmarkGroups={collapseAllBookmarkGroups}
          isHighlightGroupCollapsed={isHighlightGroupCollapsed}
          isHighlightGroupFullySelected={isHighlightGroupFullySelected}
          isHighlightGroupPartiallySelected={isHighlightGroupPartiallySelected}
          onSetHighlightsFilter={(value) => {
            highlightsFilter = value;
          }}
          onSetHighlightsSort={(value) => {
            highlightsSort = value;
          }}
          onToggleHighlightGroup={toggleHighlightGroup}
          onExpandAllHighlightGroups={expandAllHighlightGroups}
          onCollapseAllHighlightGroups={collapseAllHighlightGroups}
          onSelectAllVisibleHighlights={selectAllVisibleHighlights}
          onClearSelectedHighlights={clearSelectedHighlights}
          onInvertVisibleHighlightsSelection={invertVisibleHighlightsSelection}
          onDeleteVisibleHighlights={deleteVisibleHighlights}
          onDeleteSelectedHighlights={deleteSelectedHighlights}
          onSaveCurrentHighlightSelection={saveCurrentHighlightSelection}
          onToggleHighlightSelection={toggleHighlightSelection}
          onSelectHighlightGroup={selectHighlightGroup}
          onClearHighlightGroupSelection={clearHighlightGroupSelection}
          onInvertHighlightGroupSelection={invertHighlightGroupSelection}
          onDeleteHighlightGroup={deleteHighlightGroup}
          isNoteGroupCollapsed={isNoteGroupCollapsed}
          getAnnotationKindLabel={getAnnotationKindLabel}
          onSetNotesFilter={(value) => {
            notesFilter = value;
          }}
          onSetNotesKindFilter={(value) => {
            notesKindFilter = value;
          }}
          onExpandAllNoteGroups={expandAllNoteGroups}
          onCollapseAllNoteGroups={collapseAllNoteGroups}
          onToggleNoteGroup={toggleNoteGroup}
          onDeleteVisibleNotes={deleteVisibleNotes}
          onDeleteNoteGroup={deleteNoteGroup}
        >
          <svelte:fragment slot="highlights-extra">
            <ReaderSidebarHighlightSelections
              {savedHighlightSelections}
              {importedSavedHighlightSelections}
              {savedHighlightSelectionsSort}
              {savedHighlightSelectionsRefreshFilter}
              {savedHighlightSelectionsRefreshCounts}
              {filteredSavedHighlightSelections}
              {orderedSavedHighlightSelections}
              {savedHighlightSelectionImportNotice}
              {savedHighlightSelectionRefreshSummary}
              {savedHighlightSelectionImportPreview}
              {exportedHighlightSelection}
              {exportHighlightSelectionNotice}
              {formatTimestamp}
              {getSavedHighlightSelectionRefreshDetail}
              {getSavedHighlightSelectionUnmatchedTexts}
              {getSavedHighlightSelectionRefreshOutcome}
              {getSavedHighlightSelectionRefreshLabel}
              onImportSavedHighlightSelection={importSavedHighlightSelection}
              onRefreshAllCrossBookImportedSelections={refreshAllCrossBookImportedSelections}
              onSetSavedHighlightSelectionsSort={(value) => {
                savedHighlightSelectionsSort = value;
              }}
              onSetSavedHighlightSelectionsRefreshFilter={(value) => {
                savedHighlightSelectionsRefreshFilter = value;
              }}
              onImportMatchedHighlightsFromPreview={importMatchedHighlightsFromPreview}
              onApplySavedHighlightSelection={applySavedHighlightSelection}
              onExportSavedHighlightSelection={exportSavedHighlightSelection}
              onRefreshCrossBookImportedSelection={refreshCrossBookImportedSelection}
              onRenameSavedHighlightSelection={renameSavedHighlightSelection}
              onDeleteSavedHighlightSelection={deleteSavedHighlightSelection}
              onCopyExportedHighlightSelection={copyExportedHighlightSelection}
              onCloseExportedHighlightSelection={closeExportedHighlightSelection}
            />
          </svelte:fragment>
        </ReaderSidebarAnnotations>
      {/if}
    </div>
  </OverlayScrollbarsComponent>
</aside>

<style>
  .reader-sidebar {
    --sidebar-content-inset: 14px;
    display: grid;
    align-content: start;
    gap: 0;
    min-height: 0;
    height: 100%;
    overflow: hidden;
    padding: 0;
    border: 1px solid var(--border-light);
    border-radius: 18px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 96%, white 4%);
  }

  .reader-sidebar.window-mode {
    border: 1px solid color-mix(in srgb, var(--border-light) 84%, transparent 16%);
    border-radius: 24px;
    margin: 0;
    box-shadow:
      0 18px 38px rgba(50, 35, 18, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.28);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 96%, white 4%);
  }

  .reader-sidebar.overlay-mode {
    position: absolute;
    top: var(--reader-window-edge-y-top, 8px);
    left: var(--reader-window-edge-x, 18px);
    bottom: var(--reader-window-edge-y-bottom, 12px);
    width: min(336px, 42vw);
    z-index: 20;
    margin: 0;
    box-shadow:
      0 26px 54px rgba(32, 23, 10, 0.14),
      0 6px 18px rgba(32, 23, 10, 0.08);
  }

  .sidebar-content {
    display: grid;
    gap: 12px;
    padding: 12px var(--sidebar-content-inset) 18px;
  }

  :global(.sidebar-scroll) {
    min-height: 0;
    height: 100%;
    overscroll-behavior: contain;
  }

  :global(.sidebar-scroll .os-scrollbar.os-theme-readest) {
    --os-size: 8px;
    --os-padding-perpendicular: 1px;
    --os-padding-axis: 1px;
    --os-track-bg: transparent;
    --os-handle-border-radius: 999px;
    --os-handle-bg: rgba(95, 85, 72, 0.12);
    --os-handle-bg-hover: rgba(95, 85, 72, 0.18);
    --os-handle-bg-active: rgba(95, 85, 72, 0.22);
  }

</style>

<!-- Ownership: this reader surface explains one part of the reading workflow
 to the user. It may render state from the route or helper modules, but it should
 not silently become a second owner of persistence or route semantics. -->
<script lang="ts">
  import { tick } from 'svelte';
  import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
  import ReaderAssistWorkspace from './ReaderAssistWorkspace.svelte';
  import ReaderSidebarAnnotations from './ReaderSidebarAnnotations.svelte';
  import type {
    ReaderAssistanceHistoryEntry,
    ReaderAssistanceState,
    ReaderHighlightSelectionSet,
    ReaderHighlightSelectionSetExport,
    ReaderHighlightSelectionSetExportHighlight,
    ReaderHighlightSelectionSetSort,
    ReaderHighlightsFilter,
    ReaderHighlightsSort,
    ReaderHighlightsWorkspaceState,
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
    READER_EMPTY_TITLE,
    createEmptyReaderAssistanceState,
    createEmptyReaderPreviewState,
    getReaderFormatDisplayLabel,
    getReaderLayoutDisplayLabel,
    getReaderLocationDisplayLabel
  } from '$lib/reader';
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
  let bookMenuOpen = false;
  let searchHistoryFilter: 'all' | 'results' | 'empty' = 'all';
  let notesFilter: 'all' | 'chapter' = 'all';
  let notesKindFilter: 'all' | 'highlight' | 'note' = 'all';
  let highlightsFilter: ReaderHighlightsFilter = 'all';
  let highlightsSort: ReaderHighlightsSort = 'recent';
  let savedHighlightSelectionsSort: ReaderHighlightSelectionSetSort = 'recent';
  let savedHighlightSelectionsRefreshFilter: 'all' | 'full' | 'partial' | 'missed' = 'all';
  let selectedHighlightIds = new Set<string>();
  let savedHighlightSelections: ReaderHighlightSelectionSet[] = [];
  let exportedHighlightSelection: ReaderHighlightSelectionSetExport | null = null;
  let exportHighlightSelectionNotice = '';
  let savedHighlightSelectionImportNotice = '';
  let savedHighlightSelectionRefreshSummary:
    | {
        refreshedCount: number;
        fullMatches: string[];
        partialMatches: Array<{ name: string; matchedCount: number; totalCount: number }>;
        missedMatches: Array<{ name: string; totalCount: number }>;
      }
    | null = null;
  let savedHighlightSelectionImportPreview:
    | {
        selectionName: string;
        selectionCreatedAt: number;
        sourceBookKey: string;
        sourceBookTitle: string;
        sourceFormatLabel: string;
      matchedCount: number;
      totalCount: number;
      importedIds: string[];
      unmatchedTexts: string[];
      sourceHighlights: ReaderHighlightSelectionSetExportHighlight[];
    }
    | null = null;
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
  $: notesPanelSummary = (() => {
    if (!supportsTextAnnotations) return textAnnotationSupportMessage;
    if (notesState.selection) return '已选中一段正文，可以直接记笔记或高亮。';
    if (notesState.notes.length) return '这里会一起显示当前书的笔记和高亮，可按章节或类型收窄。';
    return '先在正文里选中一段文本，再把它存成当前书的笔记或高亮。';
  })();
  $: bookmarksPanelSummary = (() => {
    if (bookmarksState.bookmarks.length) {
      if (isCurrentLocationBookmarked) {
        return `已保存 ${bookmarksState.bookmarks.length} 个阅读位置，当前页已经在书签里。`;
      }
      return `已保存 ${bookmarksState.bookmarks.length} 个阅读位置，可把当前页和已存位置来回切换。`;
    }
    if (bookmarksState.activeLocator) {
      return '还没有保存的阅读位置，可以先把当前页存成书签。';
    }
    return '等正文定位稳定后，可以把当前页存成书签。';
  })();
  $: highlightsPanelSummary = (() => {
    if (!supportsTextAnnotations) return textAnnotationSupportMessage;
    if (allHighlights.length) {
      if (savedHighlightSelections.length) {
        return `当前书已保存 ${allHighlights.length} 条高亮，跨书高亮选择集也会在这里继续管理。`;
      }
      return `当前书已保存 ${allHighlights.length} 条高亮，可继续筛选、选中或整理成跨书选择集。`;
    }
    if (savedHighlightSelections.length) {
      return '当前书还没有高亮，但已保存的跨书高亮选择集仍然可以在这里继续整理。';
    }
    return '先选中一段正文创建高亮；如果要跨书复用，再把当前选择存成选择集。';
  })();
  $: highlightsWorkspaceStorageKey = bookKey ? `br1.reader.highlights.workspace:${bookKey}` : '';

  const applyDefaultHighlightsWorkspaceState = () => {
    highlightsFilter = 'all';
    highlightsSort = 'recent';
    savedHighlightSelectionsSort = 'recent';
    savedHighlightSelectionsRefreshFilter = 'all';
    selectedHighlightIds = new Set();
    savedHighlightSelections = [];
  };

  const buildRefreshOutcome = (name: string, matchedCount: number, totalCount: number) => ({
    name,
    matchedCount,
    totalCount
  });

  const getSavedHighlightSelectionRefreshOutcome = (
    selectionSet: ReaderHighlightSelectionSet
  ): 'manual' | 'full' | 'partial' | 'missed' => {
    if (!selectionSet.importSource) return 'manual';
    if (selectionSet.importSource.matchedCount <= 0) return 'missed';
    if (selectionSet.importSource.matchedCount >= selectionSet.importSource.totalCount) return 'full';
    return 'partial';
  };

  const getSavedHighlightSelectionRefreshLabel = (outcome: 'full' | 'partial' | 'missed') => {
    if (outcome === 'full') return '完全匹配';
    if (outcome === 'partial') return '部分匹配';
    return '未匹配';
  };

  const getSavedHighlightSelectionRefreshDetail = (selectionSet: ReaderHighlightSelectionSet) => {
    const importSource = selectionSet.importSource;
    if (!importSource) return '';

    if (importSource.unmatchedCount <= 0) {
      return `已全部映射 ${importSource.matchedCount}/${importSource.totalCount}`;
    }

    return `未命中 ${importSource.unmatchedCount} 条，可刷新映射`;
  };

  const getSavedHighlightSelectionUnmatchedTexts = (selectionSet: ReaderHighlightSelectionSet) => {
    const importSource = selectionSet.importSource;
    if (!importSource || importSource.unmatchedCount <= 0) return [];

    const resolution = resolveImportedHighlightIds({
      schemaVersion: 1,
      bookKey: importSource.bookKey,
      bookTitle: importSource.bookTitle,
      bookAuthor: '',
      formatLabel: importSource.formatLabel,
      exportedAt: importSource.importedAt,
      selectionSet: {
        id: selectionSet.id,
        name: selectionSet.name,
        selectedIds: importSource.highlights.map((highlight) => highlight.id),
        createdAt: selectionSet.createdAt
      },
      highlights: importSource.highlights
    });

    return resolution.unmatchedTexts.slice(0, 3);
  };

  const applyPersistedHighlightsWorkspaceState = (state: ReaderHighlightsWorkspaceState | null) => {
    if (!state) {
      applyDefaultHighlightsWorkspaceState();
      return;
    }

    highlightsFilter = state.filter === 'chapter' || state.filter === 'selected' ? state.filter : 'all';
    highlightsSort = state.sort === 'oldest' ? 'oldest' : 'recent';
    savedHighlightSelectionsSort = state.savedSelectionsSort === 'oldest' ? 'oldest' : 'recent';
    savedHighlightSelectionsRefreshFilter =
      state.savedSelectionsRefreshFilter === 'full' ||
      state.savedSelectionsRefreshFilter === 'partial' ||
      state.savedSelectionsRefreshFilter === 'missed'
        ? state.savedSelectionsRefreshFilter
        : 'all';
    selectedHighlightIds = new Set(
      Array.isArray(state.selectedIds)
        ? state.selectedIds.filter((id: unknown): id is string => typeof id === 'string')
        : []
    );
    savedHighlightSelections = Array.isArray(state.savedSelections)
      ? state.savedSelections
          .map((set: unknown): ReaderHighlightSelectionSet | null => {
            if (!set || typeof set !== 'object') return null;
            const candidate = set as Partial<ReaderHighlightSelectionSet>;
            if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') return null;
            const importSource =
              candidate.importSource &&
              typeof candidate.importSource === 'object' &&
              typeof (candidate.importSource as { bookKey?: unknown }).bookKey === 'string' &&
              typeof (candidate.importSource as { bookTitle?: unknown }).bookTitle === 'string' &&
              typeof (candidate.importSource as { formatLabel?: unknown }).formatLabel === 'string' &&
              typeof (candidate.importSource as { selectionName?: unknown }).selectionName === 'string' &&
              typeof (candidate.importSource as { matchedCount?: unknown }).matchedCount === 'number' &&
              typeof (candidate.importSource as { totalCount?: unknown }).totalCount === 'number' &&
              typeof (candidate.importSource as { unmatchedCount?: unknown }).unmatchedCount === 'number' &&
              typeof (candidate.importSource as { importedAt?: unknown }).importedAt === 'number' &&
              Array.isArray((candidate.importSource as { highlights?: unknown }).highlights) &&
              (candidate.importSource as { highlights: unknown[] }).highlights.every(
                (highlight) =>
                  !!highlight &&
                  typeof highlight === 'object' &&
                  typeof (highlight as { id?: unknown }).id === 'string' &&
                  typeof (highlight as { cfi?: unknown }).cfi === 'string' &&
                  typeof (highlight as { text?: unknown }).text === 'string' &&
                  typeof (highlight as { chapterLabel?: unknown }).chapterLabel === 'string' &&
                  typeof (highlight as { chapterHref?: unknown }).chapterHref === 'string' &&
                  typeof (highlight as { createdAt?: unknown }).createdAt === 'number'
              )
                ? {
                    bookKey: (candidate.importSource as { bookKey: string }).bookKey,
                    bookTitle: (candidate.importSource as { bookTitle: string }).bookTitle,
                    formatLabel: (candidate.importSource as { formatLabel: string }).formatLabel,
                    selectionName: (candidate.importSource as { selectionName: string }).selectionName,
                    matchedCount: (candidate.importSource as { matchedCount: number }).matchedCount,
                    totalCount: (candidate.importSource as { totalCount: number }).totalCount,
                    unmatchedCount: (candidate.importSource as { unmatchedCount: number }).unmatchedCount,
                    importedAt: (candidate.importSource as { importedAt: number }).importedAt,
                    highlights: (candidate.importSource as { highlights: ReaderHighlightSelectionSetExportHighlight[] }).highlights
                  }
                : null;
            return {
              id: candidate.id,
              name: candidate.name,
              selectedIds: Array.isArray(candidate.selectedIds)
                ? candidate.selectedIds.filter((id: unknown): id is string => typeof id === 'string')
                : [],
              createdAt:
                typeof candidate.createdAt === 'number' && Number.isFinite(candidate.createdAt)
                  ? candidate.createdAt
                  : Date.now(),
              ...(importSource ? { importSource } : {})
            };
          })
          .filter((set): set is ReaderHighlightSelectionSet => !!set)
      : [];
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
          applyPersistedHighlightsWorkspaceState(
            raw ? (JSON.parse(raw) as ReaderHighlightsWorkspaceState) : null
          );
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
    const state: ReaderHighlightsWorkspaceState = {
      filter: highlightsFilter,
      sort: highlightsSort,
      savedSelectionsSort: savedHighlightSelectionsSort,
      savedSelectionsRefreshFilter: savedHighlightSelectionsRefreshFilter,
      selectedIds: Array.from(selectedHighlightIds),
      savedSelections: savedHighlightSelections
    };

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

  const handleSidebarToggle = () => {
    callbacks.onToggleSidebar?.();
  };

  const handlePinToggle = () => {
    callbacks.onTogglePin?.();
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

  const toggleBookMenu = () => {
    bookMenuOpen = !bookMenuOpen;
  };

  const closeBookMenu = () => {
    bookMenuOpen = false;
  };

  const runBookMenuAction = (action: (() => void) | null | undefined) => {
    closeBookMenu();
    action?.();
  };

  const handleWindowPointerDown = (event: MouseEvent) => {
    if (!bookMenuOpen) return;
    const target = event.target;
    if (target instanceof Element && target.closest('.book-menu-anchor')) return;
    closeBookMenu();
  };

  const handleWindowKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeBookMenu();
    }
  };

  $: hasOpenedBook = !!preview.progressLocation || preview.title !== READER_EMPTY_TITLE;
  $: previewFormatDisplayLabel = getReaderFormatDisplayLabel(preview.formatLabel);
  $: previewLayoutDisplayLabel = getReaderLayoutDisplayLabel(preview.layoutLabel);
  $: previewLocationDisplayLabel = getReaderLocationDisplayLabel(preview.locationLabel);
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
  $: recentSearchResultIndex = search.results.findIndex((item) => item.cfi === search.recentResultCfi);
  $: activeSearchResultIndex = search.results.findIndex((item) => item.cfi === search.activeResultCfi);
  $: currentSearchResultIndex = Math.max(
    0,
    recentSearchResultIndex >= 0 ? recentSearchResultIndex : activeSearchResultIndex
  );
  $: searchSummaryModel = getSearchSummaryModel(search, preview.formatLabel);
  $: isCurrentLocationBookmarked =
    !!bookmarksState.activeLocator &&
    bookmarksState.bookmarks.some((bookmark) => bookmark.locator === bookmarksState.activeLocator);
  $: filteredBookmarks =
    bookmarksFilter === 'chapter' && activeHref
      ? bookmarksState.bookmarks.filter((bookmark) => bookmark.chapterHref === activeHref)
      : bookmarksState.bookmarks;
  $: sortedBookmarks =
    bookmarksSort === 'chapter'
      ? [...filteredBookmarks].sort((left, right) => {
          const chapterCompare = (left.chapterLabel || '').localeCompare(right.chapterLabel || '', 'zh-CN');
          if (chapterCompare !== 0) return chapterCompare;
          return right.createdAt - left.createdAt;
        })
      : filteredBookmarks;
  $: groupedBookmarks = sortedBookmarks.reduce<
    Array<{ chapterHref: string; chapterLabel: string; bookmarks: typeof sortedBookmarks }>
  >((groups, bookmark) => {
    const chapterHref = bookmark.chapterHref || '__unknown__';
    const chapterLabel = bookmark.chapterLabel || '未命名章节';
    const existingGroup = groups.find((group) => group.chapterHref === chapterHref);
    if (existingGroup) {
      existingGroup.bookmarks.push(bookmark);
      return groups;
    }

    groups.push({
      chapterHref,
      chapterLabel,
      bookmarks: [bookmark]
    });
    return groups;
  }, []);
  $: collapsibleBookmarkGroupKeys = groupedBookmarks
    .map((group) => group.chapterHref)
    .filter((chapterHref) => chapterHref && chapterHref !== '__unknown__');
  $: areAllBookmarkGroupsExpanded =
    collapsibleBookmarkGroupKeys.length > 0 &&
    collapsibleBookmarkGroupKeys.every((chapterHref) => !collapsedBookmarkGroups.has(chapterHref));
  $: areAllBookmarkGroupsCollapsed =
    collapsibleBookmarkGroupKeys.length > 0 &&
    collapsibleBookmarkGroupKeys.every((chapterHref) => collapsedBookmarkGroups.has(chapterHref));
  $: {
    const activeBookmark = bookmarksState.bookmarks.find((bookmark) => bookmark.locator === bookmarksState.activeLocator);
    if (activeBookmark?.chapterHref) {
      collapsedBookmarkGroups.delete(activeBookmark.chapterHref);
      collapsedBookmarkGroups = new Set(collapsedBookmarkGroups);
    }
  }
  $: notesByScope =
    notesFilter === 'chapter' && activeHref
      ? notesState.notes.filter((note) => note.chapterHref === activeHref)
      : notesState.notes;
  $: allHighlights = notesState.notes.filter((note) => note.kind === 'highlight');
  $: highlightsByScope =
    highlightsFilter === 'chapter' && activeHref
      ? allHighlights.filter((note) => note.chapterHref === activeHref)
      : highlightsFilter === 'selected'
        ? allHighlights.filter((note) => selectedHighlightIds.has(note.id))
        : allHighlights;
  $: sortedHighlights =
    highlightsSort === 'oldest'
      ? [...highlightsByScope].sort((left, right) => left.createdAt - right.createdAt)
      : [...highlightsByScope].sort((left, right) => right.createdAt - left.createdAt);
  $: orderedSavedHighlightSelections =
    savedHighlightSelectionsSort === 'oldest'
      ? [...savedHighlightSelections].sort((left, right) => left.createdAt - right.createdAt)
      : [...savedHighlightSelections].sort((left, right) => right.createdAt - left.createdAt);
  $: importedSavedHighlightSelections = savedHighlightSelections.filter((selectionSet) => !!selectionSet.importSource);
  $: savedHighlightSelectionsRefreshCounts = importedSavedHighlightSelections.reduce(
    (counts, selectionSet) => {
      const outcome = getSavedHighlightSelectionRefreshOutcome(selectionSet);
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
            getSavedHighlightSelectionRefreshOutcome(selectionSet) === savedHighlightSelectionsRefreshFilter
        );
  $: selectedVisibleHighlights = sortedHighlights.filter((note) => selectedHighlightIds.has(note.id));
  $: savedHighlightSelections = savedHighlightSelections.filter(
    (set, index, allSets) =>
      set.selectedIds.length > 0 &&
      allSets.findIndex((candidate) => candidate.id === set.id) === index
  );
  $: areAllVisibleHighlightsSelected =
    sortedHighlights.length > 0 && selectedVisibleHighlights.length === sortedHighlights.length;
  $: filteredNotes =
    notesKindFilter === 'highlight'
      ? notesByScope.filter((note) => note.kind === 'highlight')
      : notesKindFilter === 'note'
        ? notesByScope.filter((note) => note.kind !== 'highlight')
        : notesByScope;
  $: groupedNotes = filteredNotes.reduce<Array<{ chapterHref: string; chapterLabel: string; notes: typeof filteredNotes }>>(
    (groups, note) => {
      const chapterHref = note.chapterHref || '__unknown__';
      const chapterLabel = note.chapterLabel || '未命名章节';
      const existingGroup = groups.find((group) => group.chapterHref === chapterHref);
      if (existingGroup) {
        existingGroup.notes.push(note);
        return groups;
      }

      groups.push({
        chapterHref,
        chapterLabel,
        notes: [note]
      });
      return groups;
    },
    []
  );
  $: groupedHighlights = sortedHighlights.reduce<
    Array<{ chapterHref: string; chapterLabel: string; notes: typeof sortedHighlights }>
  >((groups, note) => {
    const chapterHref = note.chapterHref || '__unknown__';
    const chapterLabel = note.chapterLabel || '未命名章节';
    const existingGroup = groups.find((group) => group.chapterHref === chapterHref);
    if (existingGroup) {
      existingGroup.notes.push(note);
      return groups;
    }

    groups.push({
      chapterHref,
      chapterLabel,
      notes: [note]
    });
    return groups;
  }, []);
  $: collapsibleGroupKeys = groupedNotes
    .map((group) => group.chapterHref)
    .filter((chapterHref) => chapterHref && chapterHref !== '__unknown__');
  $: collapsibleHighlightGroupKeys = groupedHighlights
    .map((group) => group.chapterHref)
    .filter((chapterHref) => chapterHref && chapterHref !== '__unknown__');
  $: areAllNoteGroupsExpanded =
    collapsibleGroupKeys.length > 0 &&
    collapsibleGroupKeys.every((chapterHref) => !collapsedNoteGroups.has(chapterHref));
  $: areAllNoteGroupsCollapsed =
    collapsibleGroupKeys.length > 0 &&
    collapsibleGroupKeys.every((chapterHref) => collapsedNoteGroups.has(chapterHref));
  $: {
    const activeNote = notesState.notes.find((note) => note.cfi === notesState.activeCfi);
    if (activeNote?.chapterHref) {
      collapsedNoteGroups.delete(activeNote.chapterHref);
      collapsedNoteGroups = new Set(collapsedNoteGroups);
    }
  }
  $: {
    const activeHighlight = allHighlights.find((note) => note.cfi === notesState.activeCfi);
    if (activeHighlight?.chapterHref) {
      collapsedHighlightGroups.delete(activeHighlight.chapterHref);
      collapsedHighlightGroups = new Set(collapsedHighlightGroups);
    }
  }
  $: {
    if (allHighlights.length > 0) {
      const visibleHighlightIds = new Set(allHighlights.map((note) => note.id));
      const nextSelection = new Set(Array.from(selectedHighlightIds).filter((id) => visibleHighlightIds.has(id)));
      if (nextSelection.size !== selectedHighlightIds.size) {
        selectedHighlightIds = nextSelection;
      }

      const nextSavedSelections = savedHighlightSelections
        .map((set) => ({
          ...set,
          selectedIds: set.selectedIds.filter((id) => visibleHighlightIds.has(id))
        }))
        .filter((set) => set.selectedIds.length > 0);
      if (JSON.stringify(nextSavedSelections) !== JSON.stringify(savedHighlightSelections)) {
        savedHighlightSelections = nextSavedSelections;
      }
    }
  }
  $: areAllHighlightGroupsExpanded =
    collapsibleHighlightGroupKeys.length > 0 &&
    collapsibleHighlightGroupKeys.every((chapterHref) => !collapsedHighlightGroups.has(chapterHref));
  $: areAllHighlightGroupsCollapsed =
    collapsibleHighlightGroupKeys.length > 0 &&
    collapsibleHighlightGroupKeys.every((chapterHref) => collapsedHighlightGroups.has(chapterHref));

  const isNoteGroupCollapsed = (chapterHref: string) => collapsedNoteGroups.has(chapterHref);

  const isHighlightGroupCollapsed = (chapterHref: string) => collapsedHighlightGroups.has(chapterHref);

  const toggleNoteGroup = (chapterHref: string) => {
    if (!chapterHref || chapterHref === '__unknown__') return;
    if (collapsedNoteGroups.has(chapterHref)) {
      collapsedNoteGroups.delete(chapterHref);
    } else {
      collapsedNoteGroups.add(chapterHref);
    }
    collapsedNoteGroups = new Set(collapsedNoteGroups);
  };

  const expandAllNoteGroups = () => {
    collapsedNoteGroups = new Set();
  };

  const collapseAllNoteGroups = () => {
    collapsedNoteGroups = new Set(collapsibleGroupKeys);
  };

  const getAnnotationKindLabel = (notes: ReaderSidebarNotesState['notes']) => {
    const highlightCount = notes.filter((note) => note.kind === 'highlight').length;
    if (highlightCount === notes.length) return '高亮';
    if (highlightCount === 0) return '笔记';
    return '标注';
  };

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
    if (!chapterHref || chapterHref === '__unknown__') return;
    if (collapsedHighlightGroups.has(chapterHref)) {
      collapsedHighlightGroups.delete(chapterHref);
    } else {
      collapsedHighlightGroups.add(chapterHref);
    }
    collapsedHighlightGroups = new Set(collapsedHighlightGroups);
  };

  const expandAllHighlightGroups = () => {
    collapsedHighlightGroups = new Set();
  };

  const collapseAllHighlightGroups = () => {
    collapsedHighlightGroups = new Set(collapsibleHighlightGroupKeys);
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
    selectedHighlightIds = new Set();
  };

  const toggleHighlightSelection = (id: string) => {
    const nextSelection = new Set(selectedHighlightIds);
    if (nextSelection.has(id)) {
      nextSelection.delete(id);
    } else {
      nextSelection.add(id);
    }
    selectedHighlightIds = nextSelection;
  };

  const selectAllVisibleHighlights = () => {
    selectedHighlightIds = new Set(sortedHighlights.map((note) => note.id));
  };

  const clearSelectedHighlights = () => {
    selectedHighlightIds = new Set();
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

  const isReaderHighlightSelectionImportSource = (
    value: unknown
  ): value is NonNullable<ReaderHighlightSelectionSet['importSource']> =>
    !!value &&
    typeof value === 'object' &&
    typeof (value as { bookKey?: unknown }).bookKey === 'string' &&
    typeof (value as { bookTitle?: unknown }).bookTitle === 'string' &&
    typeof (value as { formatLabel?: unknown }).formatLabel === 'string' &&
    typeof (value as { selectionName?: unknown }).selectionName === 'string' &&
    typeof (value as { matchedCount?: unknown }).matchedCount === 'number' &&
    typeof (value as { totalCount?: unknown }).totalCount === 'number' &&
    typeof (value as { unmatchedCount?: unknown }).unmatchedCount === 'number' &&
    typeof (value as { importedAt?: unknown }).importedAt === 'number' &&
    Array.isArray((value as { highlights?: unknown }).highlights) &&
    (value as { highlights: unknown[] }).highlights.every(
      (highlight) =>
        !!highlight &&
        typeof highlight === 'object' &&
        typeof (highlight as { id?: unknown }).id === 'string' &&
        typeof (highlight as { cfi?: unknown }).cfi === 'string' &&
        typeof (highlight as { text?: unknown }).text === 'string' &&
        typeof (highlight as { chapterLabel?: unknown }).chapterLabel === 'string' &&
        typeof (highlight as { chapterHref?: unknown }).chapterHref === 'string' &&
        typeof (highlight as { createdAt?: unknown }).createdAt === 'number'
    );

  const isReaderHighlightSelectionSet = (
    value: unknown
  ): value is ReaderHighlightSelectionSetExport => {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<ReaderHighlightSelectionSetExport>;
    const selectionSet = candidate.selectionSet as Partial<ReaderHighlightSelectionSet> | undefined;
    const highlights = candidate.highlights as Partial<ReaderHighlightSelectionSetExportHighlight>[] | undefined;

    return (
      candidate.schemaVersion === 1 &&
      typeof candidate.bookKey === 'string' &&
      typeof candidate.bookTitle === 'string' &&
      typeof candidate.bookAuthor === 'string' &&
      typeof candidate.formatLabel === 'string' &&
      typeof candidate.exportedAt === 'number' &&
      !!selectionSet &&
      typeof selectionSet.id === 'string' &&
      typeof selectionSet.name === 'string' &&
      typeof selectionSet.createdAt === 'number' &&
      (selectionSet.importSource === undefined || isReaderHighlightSelectionImportSource(selectionSet.importSource)) &&
      Array.isArray(selectionSet.selectedIds) &&
      selectionSet.selectedIds.every((id) => typeof id === 'string') &&
      Array.isArray(highlights) &&
      highlights.every(
        (highlight) =>
          !!highlight &&
          typeof highlight.id === 'string' &&
          typeof highlight.cfi === 'string' &&
          typeof highlight.text === 'string' &&
          typeof highlight.chapterLabel === 'string' &&
          typeof highlight.chapterHref === 'string' &&
          typeof highlight.createdAt === 'number'
      )
    );
  };

  const createImportedSelectionSetName = (name: string) => {
    if (!savedHighlightSelections.some((selectionSet) => selectionSet.name === name)) {
      return name;
    }

    let suffix = 2;
    while (savedHighlightSelections.some((selectionSet) => selectionSet.name === `${name} (${suffix})`)) {
      suffix += 1;
    }
    return `${name} (${suffix})`;
  };

  const findExistingCrossBookImportedSelection = (sourceBookKey: string, sourceSelectionName: string) =>
    savedHighlightSelections.find(
      (selectionSet) =>
        selectionSet.importSource?.bookKey === sourceBookKey &&
        selectionSet.importSource?.selectionName === sourceSelectionName
    );

  const normalizeImportedHighlightText = (text: string) => text.replace(/\s+/g, ' ').trim();

  const resolveImportedHighlightIds = (payload: ReaderHighlightSelectionSetExport) => {
    const validHighlightIds = new Set(allHighlights.map((note) => note.id));
    const importedIdSet = new Set(payload.selectionSet.selectedIds.filter((id) => validHighlightIds.has(id)));
    const unmatchedTexts: string[] = [];

    if (importedIdSet.size < payload.selectionSet.selectedIds.length) {
      for (const exportedHighlight of payload.highlights) {
        if (Array.from(importedIdSet).some((id) => id === exportedHighlight.id)) continue;

        const matchedHighlight = allHighlights.find(
          (note) =>
            note.cfi === exportedHighlight.cfi &&
            note.text === exportedHighlight.text &&
            note.chapterHref === exportedHighlight.chapterHref
        );
        if (matchedHighlight) {
          importedIdSet.add(matchedHighlight.id);
          continue;
        }

        const matchedByTextAnchor = allHighlights.find((note) => {
          const normalizedCurrentText = normalizeImportedHighlightText(note.text);
          const normalizedExportedText = normalizeImportedHighlightText(exportedHighlight.text);
          return (
            normalizedCurrentText === normalizedExportedText &&
            (note.chapterHref === exportedHighlight.chapterHref ||
              note.chapterLabel === exportedHighlight.chapterLabel)
          );
        });
        if (matchedByTextAnchor) {
          importedIdSet.add(matchedByTextAnchor.id);
          continue;
        }

        unmatchedTexts.push(exportedHighlight.text);
      }
    }

    return {
      importedIds: Array.from(importedIdSet),
      unmatchedTexts
    };
  };

  const importSavedHighlightSelection = () => {
    savedHighlightSelectionRefreshSummary = null;
    const rawPayload = window.prompt('粘贴导出的高亮选择集 JSON');
    const payload = rawPayload?.trim();
    if (!payload) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch (error) {
      console.warn('Failed to parse saved highlight selection import payload', error);
      savedHighlightSelectionImportNotice = '导入失败：JSON 解析错误';
      return;
    }

    if (!isReaderHighlightSelectionSet(parsed)) {
      savedHighlightSelectionImportNotice = '导入失败：导出对象结构不正确';
      savedHighlightSelectionImportPreview = null;
      return;
    }

    const resolution = resolveImportedHighlightIds(parsed);
    if (parsed.bookKey !== bookKey) {
      savedHighlightSelectionImportPreview = {
        selectionName: parsed.selectionSet.name,
        selectionCreatedAt: parsed.selectionSet.createdAt,
        sourceBookKey: parsed.bookKey,
        sourceBookTitle: parsed.bookTitle,
        sourceFormatLabel: parsed.formatLabel,
        matchedCount: resolution.importedIds.length,
        totalCount: parsed.highlights.length,
        importedIds: resolution.importedIds,
        unmatchedTexts: resolution.unmatchedTexts.slice(0, 3),
        sourceHighlights: parsed.highlights.map((highlight) => ({ ...highlight }))
      };
      savedHighlightSelectionImportNotice = `跨书预检：可映射 ${resolution.importedIds.length}/${parsed.highlights.length} 条高亮，当前还不能直接导入`;
      return;
    }

    const importedIds = resolution.importedIds;
    if (!importedIds.length) {
      savedHighlightSelectionImportNotice = '导入失败：当前书里找不到这组高亮';
      savedHighlightSelectionImportPreview = null;
      return;
    }

    const importedName = createImportedSelectionSetName(parsed.selectionSet.name);
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

    const existingSelection = findExistingCrossBookImportedSelection(
      preview.sourceBookKey,
      preview.selectionName
    );
    const importSource = {
      bookKey: preview.sourceBookKey,
      bookTitle: preview.sourceBookTitle,
      formatLabel: preview.sourceFormatLabel,
      selectionName: preview.selectionName,
      matchedCount: preview.matchedCount,
      totalCount: preview.totalCount,
      unmatchedCount: preview.totalCount - preview.matchedCount,
      importedAt: Date.now(),
      highlights: preview.sourceHighlights.map((highlight) => ({ ...highlight }))
    } satisfies NonNullable<ReaderHighlightSelectionSet['importSource']>;

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
      const importedName = createImportedSelectionSetName(preview.selectionName);
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

    const resolution = resolveImportedHighlightIds({
      schemaVersion: 1,
      bookKey: importSource.bookKey,
      bookTitle: importSource.bookTitle,
      bookAuthor: '',
      formatLabel: importSource.formatLabel,
      exportedAt: importSource.importedAt,
      selectionSet: {
        id: selectionSet.id,
        name: selectionSet.name,
        selectedIds: importSource.highlights.map((highlight) => highlight.id),
        createdAt: selectionSet.createdAt
      },
      highlights: importSource.highlights
    });

    const nextImportSource = {
      ...importSource,
      matchedCount: resolution.importedIds.length,
      unmatchedCount: importSource.totalCount - resolution.importedIds.length,
      importedAt: Date.now()
    } satisfies NonNullable<ReaderHighlightSelectionSet['importSource']>;

    savedHighlightSelections = savedHighlightSelections.map((candidate) =>
      candidate.id === selectionSet.id
        ? {
            ...candidate,
            selectedIds: resolution.importedIds,
            importSource: nextImportSource
          }
        : candidate
    );
    savedHighlightSelectionImportNotice = `已刷新跨书选择集：${selectionSet.name}（${resolution.importedIds.length}/${importSource.totalCount}）`;
    savedHighlightSelectionRefreshSummary = {
      refreshedCount: 1,
      fullMatches: resolution.importedIds.length === importSource.totalCount ? [selectionSet.name] : [],
      partialMatches:
        resolution.importedIds.length > 0 && resolution.importedIds.length < importSource.totalCount
          ? [buildRefreshOutcome(selectionSet.name, resolution.importedIds.length, importSource.totalCount)]
          : [],
      missedMatches:
        resolution.importedIds.length === 0 ? [{ name: selectionSet.name, totalCount: importSource.totalCount }] : []
    };
  };

  const refreshAllCrossBookImportedSelections = () => {
    if (!importedSavedHighlightSelections.length) return;

    let refreshedCount = 0;
    const fullMatches: string[] = [];
    const partialMatches: Array<{ name: string; matchedCount: number; totalCount: number }> = [];
    const missedMatches: Array<{ name: string; totalCount: number }> = [];
    savedHighlightSelections = savedHighlightSelections.map((selectionSet) => {
      const importSource = selectionSet.importSource;
      if (!importSource) return selectionSet;

      const resolution = resolveImportedHighlightIds({
        schemaVersion: 1,
        bookKey: importSource.bookKey,
        bookTitle: importSource.bookTitle,
        bookAuthor: '',
        formatLabel: importSource.formatLabel,
        exportedAt: importSource.importedAt,
        selectionSet: {
          id: selectionSet.id,
          name: selectionSet.name,
          selectedIds: importSource.highlights.map((highlight) => highlight.id),
          createdAt: selectionSet.createdAt
        },
        highlights: importSource.highlights
      });

      refreshedCount += 1;
      if (resolution.importedIds.length === importSource.totalCount) {
        fullMatches.push(selectionSet.name);
      } else if (resolution.importedIds.length === 0) {
        missedMatches.push({ name: selectionSet.name, totalCount: importSource.totalCount });
      } else {
        partialMatches.push(buildRefreshOutcome(selectionSet.name, resolution.importedIds.length, importSource.totalCount));
      }
      return {
        ...selectionSet,
        selectedIds: resolution.importedIds,
        importSource: {
          ...importSource,
          matchedCount: resolution.importedIds.length,
          unmatchedCount: importSource.totalCount - resolution.importedIds.length,
          importedAt: Date.now()
        }
      };
    });

    savedHighlightSelectionImportNotice =
      refreshedCount === 1 ? '已刷新 1 组跨书选择集' : `已刷新 ${refreshedCount} 组跨书选择集`;
    savedHighlightSelectionRefreshSummary = {
      refreshedCount,
      fullMatches,
      partialMatches,
      missedMatches
    };
  };

  const invertVisibleHighlightsSelection = () => {
    const nextSelection = new Set(selectedHighlightIds);
    for (const note of sortedHighlights) {
      if (nextSelection.has(note.id)) {
        nextSelection.delete(note.id);
      } else {
        nextSelection.add(note.id);
      }
    }
    selectedHighlightIds = nextSelection;
  };

  const selectHighlightGroup = (notes: typeof sortedHighlights) => {
    const nextSelection = new Set(selectedHighlightIds);
    for (const note of notes) {
      nextSelection.add(note.id);
    }
    selectedHighlightIds = nextSelection;
  };

  const clearHighlightGroupSelection = (notes: typeof sortedHighlights) => {
    const nextSelection = new Set(selectedHighlightIds);
    for (const note of notes) {
      nextSelection.delete(note.id);
    }
    selectedHighlightIds = nextSelection;
  };

  const invertHighlightGroupSelection = (notes: typeof sortedHighlights) => {
    const nextSelection = new Set(selectedHighlightIds);
    for (const note of notes) {
      if (nextSelection.has(note.id)) {
        nextSelection.delete(note.id);
      } else {
        nextSelection.add(note.id);
      }
    }
    selectedHighlightIds = nextSelection;
  };

  const deleteHighlightGroup = (notes: typeof sortedHighlights, chapterLabel: string) => {
    if (!notes.length) return;
    const confirmLabel =
      notes.length === 1
        ? `删除“${chapterLabel}”里的这条高亮？`
        : `删除“${chapterLabel}”里的 ${notes.length} 条高亮？`;
    if (!window.confirm(confirmLabel)) return;
    callbacks.onDeleteNotes?.(notes.map((note) => note.id));

    const nextSelection = new Set(selectedHighlightIds);
    for (const note of notes) {
      nextSelection.delete(note.id);
    }
    selectedHighlightIds = nextSelection;
  };

  const isHighlightGroupFullySelected = (notes: typeof sortedHighlights) =>
    notes.length > 0 && notes.every((note) => selectedHighlightIds.has(note.id));

  const isHighlightGroupPartiallySelected = (notes: typeof sortedHighlights) =>
    notes.some((note) => selectedHighlightIds.has(note.id));

  const deleteSelectedHighlights = () => {
    if (!selectedVisibleHighlights.length) return;
    const confirmLabel =
      selectedVisibleHighlights.length === 1
        ? '删除选中的这条高亮？'
        : `删除选中的 ${selectedVisibleHighlights.length} 条高亮？`;
    if (!window.confirm(confirmLabel)) return;
    callbacks.onDeleteNotes?.(selectedVisibleHighlights.map((note) => note.id));
    selectedHighlightIds = new Set();
  };

  const isBookmarkGroupCollapsed = (chapterHref: string) => collapsedBookmarkGroups.has(chapterHref);

  const toggleBookmarkGroup = (chapterHref: string) => {
    if (!chapterHref || chapterHref === '__unknown__') return;
    if (collapsedBookmarkGroups.has(chapterHref)) {
      collapsedBookmarkGroups.delete(chapterHref);
    } else {
      collapsedBookmarkGroups.add(chapterHref);
    }
    collapsedBookmarkGroups = new Set(collapsedBookmarkGroups);
  };

  const expandAllBookmarkGroups = () => {
    collapsedBookmarkGroups = new Set();
  };

  const collapseAllBookmarkGroups = () => {
    collapsedBookmarkGroups = new Set(collapsibleBookmarkGroupKeys);
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

<svelte:window on:mousedown={handleWindowPointerDown} on:keydown={handleWindowKeydown} />

<aside
  class:window-mode={isWindowMode}
  class:overlay-mode={isWindowMode && !isPinned}
  class="reader-sidebar"
  aria-label="阅读导航"
>
  <header class="sidebar-head">
    <div class="sidebar-tools">
      <button
        type="button"
        class="ghost-button"
        aria-label="切换侧栏"
        title="切换侧栏"
        on:click={handleSidebarToggle}
      >
        ☰
      </button>
      <div class="sidebar-labels">
        <span class="eyebrow">导航</span>
        <strong>目录</strong>
      </div>
      <div class="sidebar-actions">
        {#if isWindowMode}
          <button
            type="button"
            class:active={isPinned}
            class="ghost-button pin-button"
            aria-label={isPinned ? '取消固定侧栏' : '固定侧栏'}
            title={isPinned ? '取消固定侧栏' : '固定侧栏'}
            on:click={handlePinToggle}
          >
            {isPinned ? '📌' : '⌖'}
          </button>
        {/if}
        <button
          type="button"
          class="ghost-button"
          aria-label="隐藏侧栏"
          title="隐藏侧栏"
          on:click={() => callbacks.onClose?.()}
        >
          ×
        </button>
      </div>
    </div>
  </header>

  <div class="tabs" role="tablist" aria-label="阅读侧栏标签">
    <button
      type="button"
      role="tab"
      class:active={activeTab === 'toc'}
      class="tab"
      aria-selected={activeTab === 'toc'}
      on:click={() => setActiveTab('toc')}
    >
      目录
    </button>
    <button
      type="button"
      role="tab"
      class:active={activeTab === 'search'}
      class="tab"
      aria-selected={activeTab === 'search'}
      on:click={() => setActiveTab('search')}
    >
      搜索
    </button>
    <button
      type="button"
      role="tab"
      class:active={activeTab === 'assist'}
      class="tab"
      aria-selected={activeTab === 'assist'}
      on:click={() => setActiveTab('assist')}
    >
      查找
    </button>
    <button
      type="button"
      role="tab"
      class:active={activeTab === 'bookmarks'}
      class="tab"
      aria-selected={activeTab === 'bookmarks'}
      on:click={() => setActiveTab('bookmarks')}
    >
      书签
    </button>
    <button
      type="button"
      role="tab"
      class:active={activeTab === 'highlights'}
      class="tab"
      aria-selected={activeTab === 'highlights'}
      on:click={() => setActiveTab('highlights')}
    >
      高亮
    </button>
    <button
      type="button"
      role="tab"
      class:active={activeTab === 'notes'}
      class="tab"
      aria-selected={activeTab === 'notes'}
      on:click={() => setActiveTab('notes')}
    >
      笔记
    </button>
  </div>

  <OverlayScrollbarsComponent
    defer
    element="div"
    class="sidebar-scroll"
    options={{ scrollbars: { autoHide: 'scroll', theme: 'os-theme-readest' } }}
  >
    <div class="sidebar-content">
      <div class="book-chip">
        <div class="book-visual" aria-hidden="true">
          {#if coverUrl}
            <img class="book-cover-image" src={coverUrl} alt="" loading="lazy" />
          {:else}
            <div class="book-spine"></div>
          {/if}
        </div>
        <div class="book-copy">
          <span class="book-kicker">{previewFormatDisplayLabel} · {previewLayoutDisplayLabel}</span>
          <strong>{preview.title}</strong>
          <span>{preview.author}</span>
          <span>{preview.chapterLabel}</span>
          <div class="book-stats">
            <span>{preview.progressLabel}</span>
            <span>{previewLocationDisplayLabel}</span>
          </div>
          <div class="book-meta-row">
            <span>{toc.length} 章节</span>
            <span>{bookmarksState.bookmarks.length} 书签</span>
            <span>{allHighlights.length} 高亮</span>
            <span>{notesState.notes.filter((note) => note.kind !== 'highlight').length} 笔记</span>
          </div>
          <div class="book-actions-row">
            <button type="button" class="book-action-chip primary" on:click={() => callbacks.onGoToLibrary?.()}>
              回到书库
            </button>
            <div class="book-menu-anchor">
              <button
                type="button"
                class:active={bookMenuOpen}
                class="book-action-chip menu-trigger"
                aria-label="更多书籍操作"
                aria-expanded={bookMenuOpen}
                on:click={toggleBookMenu}
              >
                ⋯
              </button>

              {#if bookMenuOpen}
                <div class="book-action-menu" role="menu" aria-label="书籍更多操作">
                  <button type="button" role="menuitem" on:click={() => runBookMenuAction(callbacks.onGoToLibrary)}>
                    回到书库
                  </button>
                  {#if callbacks.onOpenSourcePath}
                    <button type="button" role="menuitem" on:click={() => runBookMenuAction(callbacks.onOpenSourcePath)}>
                      打开原文件
                    </button>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
          {#if !hasOpenedBook}
            <p class="book-empty">打开一本书后，这里会显示更完整的书籍信息。</p>
          {/if}
        </div>
      </div>

      {#if activeTab === 'toc'}
        <nav class="toc" aria-label="目录预览">
          {#if toc.length}
            {#each toc as item}
              <button
                type="button"
                class:active={item.href === activeHref}
                data-href={item.href}
                style={`--toc-level:${item.level};`}
                on:click={() => callbacks.onNavigate?.(item.href)}
              >
                {item.label}
              </button>
            {/each}
          {:else}
            <p class="empty">打开书后，这里会显示最小章节列表。</p>
          {/if}
        </nav>
      {:else if activeTab === 'search'}
        <section class="sidebar-panel" aria-label="正文搜索面板">
        <label class="search-field">
          <span class="sr-only">搜索正文内容</span>
          <input
            type="search"
            placeholder="搜索正文内容"
            value={search.term}
            on:input={(event) => callbacks.onSearch?.((event.currentTarget as HTMLInputElement).value)}
          />
        </label>

        <div class="search-options" aria-label="搜索选项">
          <button
            type="button"
            class:active={search.config.scope === 'book'}
            class="option-chip"
            on:click={() => updateSearchConfig('scope', 'book')}
          >
            全书
          </button>
          <button
            type="button"
            class:active={search.config.scope === 'section'}
            class="option-chip"
            on:click={() => updateSearchConfig('scope', 'section')}
          >
            本章
          </button>
          <button
            type="button"
            class:active={search.config.matchCase}
            class="option-chip"
            on:click={() => updateSearchConfig('matchCase', !search.config.matchCase)}
          >
            区分大小写
          </button>
          <button
            type="button"
            class:active={search.config.matchWholeWords}
            class="option-chip"
            on:click={() => updateSearchConfig('matchWholeWords', !search.config.matchWholeWords)}
          >
            整词
          </button>
          <button
            type="button"
            class:active={search.config.matchDiacritics}
            class="option-chip"
            on:click={() => updateSearchConfig('matchDiacritics', !search.config.matchDiacritics)}
          >
            保留重音
          </button>
        </div>

        {#if search.cacheKey && !search.term.trim()}
          <section class="search-cache-status" aria-label="搜索缓存状态">
            <div>
              <strong>当前书搜索缓存已启用</strong>
              <span>
                {search.history.length} 条历史 · {successfulSearchHistoryCount} 条有命中 · {emptySearchHistoryCount} 条无命中
              </span>
              <small title={search.cacheKey}>缓存标识：{searchCacheDisplayKey}</small>
            </div>
            <button type="button" class="history-clear" on:click={() => callbacks.onClearSearchCache?.()}>
              清空缓存
            </button>
            {#if cachedSearchHistoryEntries.length}
              <ul aria-label="搜索缓存查询记录">
                {#each cachedSearchHistoryEntries as entry}
                  <li>
                    <button type="button" on:click={() => runSearchHistory(entry)}>
                      <strong>{entry.query}</strong>
                      <span>{entry.resultCount} 条 · {entry.config.scope === 'section' ? '当前章节' : '全书'}</span>
                    </button>
                  </li>
                {/each}
              </ul>
            {/if}
          </section>
        {/if}

        {#if search.history.length > 0 && !search.term.trim()}
          <div class="search-history">
            <div class="search-history-head">
              <strong>最近搜索</strong>
              <div class="history-actions">
                <button type="button" class="history-clear" on:click={() => callbacks.onClearSearchHistory?.()}>
                  清空历史
                </button>
              </div>
            </div>
            <div class="search-history-filters" aria-label="搜索历史筛选">
              <button
                type="button"
                class:active={searchHistoryFilter === 'all'}
                class="history-filter-chip"
                on:click={() => {
                  searchHistoryFilter = 'all';
                }}
              >
                全部 {search.history.length}
              </button>
              <button
                type="button"
                class:active={searchHistoryFilter === 'results'}
                class="history-filter-chip"
                disabled={successfulSearchHistoryCount === 0}
                on:click={() => {
                  searchHistoryFilter = 'results';
                }}
              >
                有命中 {successfulSearchHistoryCount}
              </button>
              <button
                type="button"
                class:active={searchHistoryFilter === 'empty'}
                class="history-filter-chip"
                disabled={emptySearchHistoryCount === 0}
                on:click={() => {
                  searchHistoryFilter = 'empty';
                }}
              >
                无命中 {emptySearchHistoryCount}
              </button>
            </div>
            <div class="history-list">
              {#if visibleSearchHistory.length}
                {#each visibleSearchHistory as entry}
                  <div class="history-chip-row">
                    <button type="button" class="history-chip" on:click={() => runSearchHistory(entry)}>
                      <strong>{entry.query}</strong>
                      <span>
                        {entry.resultCount > 0 ? `${entry.resultCount} 条命中` : '0 条命中'} · {formatSearchConfigLabel(entry.config)}
                      </span>
                      <time>{formatSearchHistoryAge(entry.createdAt)}</time>
                    </button>
                    <button
                      type="button"
                      class="history-delete"
                      aria-label={`删除搜索记录 ${entry.query}`}
                      on:click={() => callbacks.onDeleteSearchHistoryEntry?.(entry.id)}
                    >
                      ×
                    </button>
                  </div>
                {/each}
              {:else}
                <p class="empty">当前筛选下还没有搜索记录。</p>
              {/if}
            </div>
          </div>
        {/if}

        <div class="search-summary">
          <strong>{searchSummaryModel.title}</strong>
          <span>{searchSummaryModel.detail}</span>
        </div>

        {#if search.results.length}
          <div class="search-result-nav" aria-label="搜索结果导航">
            <button
              type="button"
              class="history-filter-chip"
              disabled={search.results.length <= 1 || currentSearchResultIndex === 0}
              on:click={() => navigateSearchResult(-1)}
            >
              上一条
            </button>
            <span>{currentSearchResultIndex + 1} / {search.results.length}</span>
            <button
              type="button"
              class="history-filter-chip"
              disabled={search.results.length <= 1 || currentSearchResultIndex >= search.results.length - 1}
              on:click={() => navigateSearchResult(1)}
            >
              下一条
            </button>
          </div>
        {/if}

        {#if search.notice}
          <div class:error={search.notice.kind === 'error'} class="search-notice" role="status">
            {search.notice.message}
          </div>
        {/if}

        <div class="search-results" aria-label="搜索结果">
          {#if search.status === 'error'}
            <p class="empty">{search.error || '正文搜索失败。'}</p>
          {:else if search.status === 'searching' && !search.results.length}
            <p class="empty">正在整理命中的正文段落和所在章节。</p>
          {:else if search.results.length}
            {#each search.results as item}
              <button
                type="button"
                class:active-result={item.cfi === search.activeResultCfi}
                class:recent-result={item.cfi === search.recentResultCfi}
                class="search-result"
                on:click={() => {
                  callbacks.onSearchResult?.(item.cfi);
                }}
              >
                <strong>{item.label || '搜索结果'}</strong>
                <span>
                  {item.excerpt.pre}<mark>{item.excerpt.match}</mark>{item.excerpt.post}
                </span>
              </button>
            {/each}
          {:else if search.term.trim() && search.status === 'done'}
            <p class="empty">没有命中正文内容。</p>
          {:else}
            <p class="empty">输入关键词后，这里会显示命中的正文段落和所在章节。</p>
          {/if}
        </div>
        </section>
      {:else if activeTab === 'assist'}
        <section class="sidebar-panel" aria-label="查找面板">
          <ReaderAssistWorkspace
            title="AI 阅读助手"
            summary="保留原有 assist 入口，但内部改成和 notebook 共用的助手工作台。"
            {preview}
            {notesState}
            {assistance}
            history={assistanceHistory}
            {selectedLookupHistoryEntryId}
            {selectedTranslationHistoryEntryId}
            {translationProviderStatuses}
            callbacks={{
              onRequestLookup: callbacks.onRequestLookup,
              onRequestTranslation: callbacks.onRequestTranslation
            }}
            onSelectHistoryEntry={onSelectAssistanceHistoryEntry}
            onClearHistory={onClearAssistanceHistory}
          />
        </section>
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
            <!-- Cross-book selection sets stay in the parent because they own
             import/export state, refresh summaries, and persisted workspace data. -->
            <section class="saved-highlight-selections" aria-label="已保存高亮选择集">
              <div class="saved-highlight-selections-head">
                <div class="saved-highlight-selections-summary">
                  <strong>跨书高亮选择集</strong>
                  <span>{savedHighlightSelections.length} 组</span>
                  <span>按书保留跨书映射结果</span>
                </div>
                <div class="saved-highlight-selections-toolbar">
                  <button type="button" class="notes-filter-chip" on:click={() => importSavedHighlightSelection()}>
                    导入
                  </button>
                  <button
                    type="button"
                    class="notes-filter-chip"
                    disabled={!importedSavedHighlightSelections.length}
                    on:click={() => refreshAllCrossBookImportedSelections()}
                  >
                    刷新全部跨书映射
                  </button>
                  <div class="saved-highlight-selections-sort" aria-label="选择集排序控制">
                    <button
                      type="button"
                      class:active={savedHighlightSelectionsSort === 'recent'}
                      class="notes-filter-chip"
                      on:click={() => {
                        savedHighlightSelectionsSort = 'recent';
                      }}
                    >
                      最近保存
                    </button>
                    <button
                      type="button"
                      class:active={savedHighlightSelectionsSort === 'oldest'}
                      class="notes-filter-chip"
                      on:click={() => {
                        savedHighlightSelectionsSort = 'oldest';
                      }}
                    >
                      最早保存
                    </button>
                  </div>
                </div>
              </div>
              {#if savedHighlightSelectionImportNotice}
                <p class="saved-highlight-selection-import-notice">{savedHighlightSelectionImportNotice}</p>
              {/if}
              {#if savedHighlightSelectionRefreshSummary}
                <section class="saved-highlight-selection-refresh-summary" aria-label="高亮选择集刷新摘要">
                  <strong>刷新结果</strong>
                  <span>共处理 {savedHighlightSelectionRefreshSummary.refreshedCount} 组跨书选择集</span>
                  <span>刷新结果筛选会按书保留</span>
                  {#if savedHighlightSelectionRefreshSummary.fullMatches.length}
                    <span>完全匹配：{savedHighlightSelectionRefreshSummary.fullMatches.join('、')}</span>
                  {/if}
                  {#if savedHighlightSelectionRefreshSummary.partialMatches.length}
                    <span>
                      部分匹配：
                      {savedHighlightSelectionRefreshSummary.partialMatches
                        .map((item) => `${item.name}（${item.matchedCount}/${item.totalCount}）`)
                        .join('、')}
                    </span>
                  {/if}
                  {#if savedHighlightSelectionRefreshSummary.missedMatches.length}
                    <span>
                      未匹配：
                      {savedHighlightSelectionRefreshSummary.missedMatches
                        .map((item) => `${item.name}（0/${item.totalCount}）`)
                        .join('、')}
                    </span>
                  {/if}
                  <div class="saved-highlight-selection-refresh-filters" aria-label="高亮选择集刷新结果筛选">
                    <button
                      type="button"
                      class="notes-filter-chip"
                      class:active={savedHighlightSelectionsRefreshFilter === 'all'}
                      on:click={() => {
                        savedHighlightSelectionsRefreshFilter = 'all';
                      }}
                    >
                      全部选择集
                    </button>
                    <button
                      type="button"
                      class="notes-filter-chip"
                      class:active={savedHighlightSelectionsRefreshFilter === 'full'}
                      disabled={!savedHighlightSelectionsRefreshCounts.full}
                      on:click={() => {
                        savedHighlightSelectionsRefreshFilter = 'full';
                      }}
                    >
                      完全匹配 {savedHighlightSelectionsRefreshCounts.full}
                    </button>
                    <button
                      type="button"
                      class="notes-filter-chip"
                      class:active={savedHighlightSelectionsRefreshFilter === 'partial'}
                      disabled={!savedHighlightSelectionsRefreshCounts.partial}
                      on:click={() => {
                        savedHighlightSelectionsRefreshFilter = 'partial';
                      }}
                    >
                      部分匹配 {savedHighlightSelectionsRefreshCounts.partial}
                    </button>
                    <button
                      type="button"
                      class="notes-filter-chip"
                      class:active={savedHighlightSelectionsRefreshFilter === 'missed'}
                      disabled={!savedHighlightSelectionsRefreshCounts.missed}
                      on:click={() => {
                        savedHighlightSelectionsRefreshFilter = 'missed';
                      }}
                    >
                      未匹配 {savedHighlightSelectionsRefreshCounts.missed}
                    </button>
                  </div>
                </section>
              {:else if importedSavedHighlightSelections.length}
                <section class="saved-highlight-selection-refresh-summary" aria-label="高亮选择集刷新摘要">
                  <strong>跨书映射视图</strong>
                  <span>按当前映射结果筛选已保存的跨书选择集。</span>
                  <div class="saved-highlight-selection-refresh-filters" aria-label="高亮选择集刷新结果筛选">
                    <button
                      type="button"
                      class="notes-filter-chip"
                      class:active={savedHighlightSelectionsRefreshFilter === 'all'}
                      on:click={() => {
                        savedHighlightSelectionsRefreshFilter = 'all';
                      }}
                    >
                      全部选择集
                    </button>
                    <button
                      type="button"
                      class="notes-filter-chip"
                      class:active={savedHighlightSelectionsRefreshFilter === 'full'}
                      disabled={!savedHighlightSelectionsRefreshCounts.full}
                      on:click={() => {
                        savedHighlightSelectionsRefreshFilter = 'full';
                      }}
                    >
                      完全匹配 {savedHighlightSelectionsRefreshCounts.full}
                    </button>
                    <button
                      type="button"
                      class="notes-filter-chip"
                      class:active={savedHighlightSelectionsRefreshFilter === 'partial'}
                      disabled={!savedHighlightSelectionsRefreshCounts.partial}
                      on:click={() => {
                        savedHighlightSelectionsRefreshFilter = 'partial';
                      }}
                    >
                      部分匹配 {savedHighlightSelectionsRefreshCounts.partial}
                    </button>
                    <button
                      type="button"
                      class="notes-filter-chip"
                      class:active={savedHighlightSelectionsRefreshFilter === 'missed'}
                      disabled={!savedHighlightSelectionsRefreshCounts.missed}
                      on:click={() => {
                        savedHighlightSelectionsRefreshFilter = 'missed';
                      }}
                    >
                      未匹配 {savedHighlightSelectionsRefreshCounts.missed}
                    </button>
                  </div>
                </section>
              {/if}
              {#if savedHighlightSelectionImportPreview}
                <section class="saved-highlight-selection-import-preview" aria-label="高亮选择集导入预检">
                  <div class="saved-highlight-selection-import-preview-head">
                    <div class="saved-highlight-selection-import-preview-copy">
                      <strong>跨书兼容预检</strong>
                      <span>
                        来源：{savedHighlightSelectionImportPreview.sourceBookTitle} · {savedHighlightSelectionImportPreview.sourceFormatLabel}
                      </span>
                      <span>来源选择集：{savedHighlightSelectionImportPreview.selectionName}</span>
                      <span>
                        当前书可映射 {savedHighlightSelectionImportPreview.matchedCount} / {savedHighlightSelectionImportPreview.totalCount} 条高亮
                      </span>
                    </div>
                    {#if savedHighlightSelectionImportPreview.importedIds.length}
                      <div class="saved-highlight-selection-import-preview-actions">
                        <button type="button" class="notes-filter-chip" on:click={() => importMatchedHighlightsFromPreview()}>
                          导入已匹配高亮
                        </button>
                      </div>
                    {/if}
                  </div>
                  {#if savedHighlightSelectionImportPreview.unmatchedTexts.length}
                    <ul class="saved-highlight-selection-import-preview-list">
                      {#each savedHighlightSelectionImportPreview.unmatchedTexts as unmatchedText}
                        <li>{unmatchedText}</li>
                      {/each}
                    </ul>
                  {/if}
                </section>
              {/if}
              <div class="saved-highlight-selections-list">
                {#if filteredSavedHighlightSelections.length}
                  {#each filteredSavedHighlightSelections as selectionSet}
                    <article class="saved-highlight-selection-card">
                      <div class="saved-highlight-selection-copy">
                        <strong>{selectionSet.name}</strong>
                        <span>{selectionSet.selectedIds.length} 条高亮</span>
                        {#if selectionSet.importSource}
                          <span class="saved-highlight-selection-origin">
                            跨书导入 · {selectionSet.importSource.bookTitle} / {selectionSet.importSource.selectionName} · {selectionSet.importSource.matchedCount}/{selectionSet.importSource.totalCount}
                          </span>
                          <span class="saved-highlight-selection-detail">
                            {getSavedHighlightSelectionRefreshDetail(selectionSet)}
                          </span>
                          {@const unmatchedTexts = getSavedHighlightSelectionUnmatchedTexts(selectionSet)}
                          {#if unmatchedTexts.length}
                            <div class="saved-highlight-selection-unmatched" aria-label={`${selectionSet.name} 未映射高亮`}>
                              <span>未映射片段</span>
                              <ul>
                                {#each unmatchedTexts as unmatchedText}
                                  <li>{unmatchedText}</li>
                                {/each}
                              </ul>
                            </div>
                          {/if}
                          {@const refreshOutcome = getSavedHighlightSelectionRefreshOutcome(selectionSet)}
                          {@const displayOutcome =
                            refreshOutcome === 'full' ? 'full' : refreshOutcome === 'missed' ? 'missed' : 'partial'}
                          <span
                            class="saved-highlight-selection-status"
                            class:saved-highlight-selection-status-full={displayOutcome === 'full'}
                            class:saved-highlight-selection-status-missed={displayOutcome === 'missed'}
                          >
                            {getSavedHighlightSelectionRefreshLabel(displayOutcome)}
                          </span>
                        {/if}
                        <time>{formatTimestamp(selectionSet.createdAt)}</time>
                      </div>
                      <div class="saved-highlight-selection-actions">
                        <button type="button" class="notes-filter-chip" on:click={() => applySavedHighlightSelection(selectionSet)}>
                          套用
                        </button>
                        <button type="button" class="notes-filter-chip" on:click={() => exportSavedHighlightSelection(selectionSet)}>
                          导出
                        </button>
                        {#if selectionSet.importSource}
                          <button
                            type="button"
                            class="notes-filter-chip"
                            on:click={() => refreshCrossBookImportedSelection(selectionSet)}
                          >
                            刷新映射
                          </button>
                        {/if}
                        <button type="button" class="notes-filter-chip" on:click={() => renameSavedHighlightSelection(selectionSet.id)}>
                          重命名
                        </button>
                        <button
                          type="button"
                          class="notes-filter-chip danger-action"
                          on:click={() => deleteSavedHighlightSelection(selectionSet.id)}
                        >
                          删除
                        </button>
                      </div>
                    </article>
                  {/each}
                {:else if orderedSavedHighlightSelections.length}
                  <p class="saved-highlight-selection-empty">
                    当前筛选下没有
                    {savedHighlightSelectionsRefreshFilter === 'full'
                      ? '完全匹配'
                      : savedHighlightSelectionsRefreshFilter === 'partial'
                        ? '部分匹配'
                        : '未匹配'}
                    的跨书选择集。
                  </p>
                {:else}
                  <p class="saved-highlight-selection-empty">还没有保存的高亮选择集，可以先导入一组或从当前选中高亮创建。</p>
                {/if}
              </div>

              {#if exportedHighlightSelection}
                <section class="saved-highlight-selection-export" aria-label="高亮选择集导出预览">
                  <div class="saved-highlight-selection-export-head">
                    <div class="saved-highlight-selection-export-copy">
                      <strong>导出预览</strong>
                      <span>{exportedHighlightSelection.selectionSet.name}</span>
                    </div>
                    <div class="saved-highlight-selection-export-actions">
                      <button type="button" class="notes-filter-chip" on:click={() => copyExportedHighlightSelection()}>
                        复制导出内容
                      </button>
                      <button type="button" class="notes-filter-chip" on:click={() => closeExportedHighlightSelection()}>
                        关闭
                      </button>
                    </div>
                  </div>
                  {#if exportHighlightSelectionNotice}
                    <p class="saved-highlight-selection-export-notice">{exportHighlightSelectionNotice}</p>
                  {/if}
                  <textarea
                    class="saved-highlight-selection-export-payload"
                    readonly
                    value={JSON.stringify(exportedHighlightSelection, null, 2)}
                  ></textarea>
                </section>
              {/if}
            </section>
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

  .sidebar-head {
    display: grid;
    gap: 8px;
    padding: 16px var(--sidebar-content-inset) 10px;
    border-bottom: 1px solid color-mix(in srgb, var(--border-light) 72%, transparent 28%);
  }

  .sidebar-tools {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
  }

  .sidebar-actions {
    display: inline-flex;
    gap: 4px;
    align-items: center;
  }

  .ghost-button {
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
    font: inherit;
    line-height: 1;
  }

  .ghost-button:hover {
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
    color: var(--text-primary);
  }

  .pin-button.active {
    background: color-mix(in srgb, var(--surface-reader) 86%, white 14%);
    color: var(--text-primary);
    box-shadow: inset 0 0 0 1px var(--border-light);
  }

  .sidebar-labels {
    display: grid;
    gap: 1px;
    min-width: 0;
  }

  .eyebrow {
    color: var(--text-muted);
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-family: var(--font-chrome);
  }

  .sidebar-labels strong {
    font-family: var(--font-chrome);
    font-size: 13px;
    line-height: 1.2;
  }

  .tabs {
    display: flex;
    gap: 0;
    margin: 10px var(--sidebar-content-inset) 0;
    padding: 1px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    font-family: var(--font-chrome);
  }

  .tab {
    flex: 1 1 0;
    padding: 5px 8px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--text-muted);
    text-align: center;
    font-size: 10px;
    letter-spacing: 0.03em;
    font: inherit;
  }

  .tab.active {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--surface-panel) 66%, white 34%);
    box-shadow:
      inset 0 0 0 1px var(--border-light),
      0 1px 2px rgba(35, 25, 13, 0.05);
  }

  .tab:hover {
    color: var(--text-primary);
  }

  .toc {
    display: grid;
    gap: 3px;
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

  .book-chip {
    display: grid;
    grid-template-columns: 56px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    padding: 12px;
    border: 1px solid color-mix(in srgb, var(--border-light) 88%, transparent 12%);
    border-radius: 18px;
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
  }

  .book-visual {
    display: grid;
    width: 56px;
    min-height: 76px;
  }

  .book-cover-image,
  .book-spine {
    width: 56px;
    min-height: 76px;
    border-radius: 10px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      0 0 0 1px rgba(84, 62, 34, 0.08);
  }

  .book-cover-image {
    object-fit: cover;
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
  }

  .book-spine {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0)),
      linear-gradient(180deg, #c8a878, #a98350);
  }

  .book-copy {
    display: grid;
    gap: 3px;
    min-width: 0;
    font-family: var(--font-chrome);
  }

  .book-copy strong {
    font-size: 12px;
    line-height: 1.3;
  }

  .book-copy span {
    color: var(--text-muted);
    font-size: 11px;
    line-height: 1.45;
  }

  .book-kicker {
    color: var(--text-secondary);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .book-stats,
  .book-meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .book-meta-row span {
    padding: 3px 6px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 88%, white 12%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    color: var(--text-secondary);
    font-size: 10px;
    line-height: 1;
  }

  .book-actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .book-action-chip {
    position: relative;
    min-height: 26px;
    padding: 0 10px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-panel) 84%, white 16%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    color: var(--text-primary);
    font: inherit;
    font-size: 11px;
    line-height: 1;
  }

  .book-action-chip:hover {
    background: color-mix(in srgb, var(--surface-panel) 76%, white 24%);
  }

  .book-action-chip.primary {
    background: color-mix(in srgb, var(--surface-panel) 78%, white 22%);
  }

  .book-action-chip.menu-trigger {
    min-width: 30px;
    padding: 0 9px;
  }

  .book-action-chip.menu-trigger.active {
    background: color-mix(in srgb, var(--surface-panel) 74%, white 26%);
  }

  .book-menu-anchor {
    position: relative;
  }

  .book-action-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    display: grid;
    min-width: 132px;
    padding: 6px;
    border: 1px solid var(--border-light);
    border-radius: 14px;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 242, 231, 0.98));
    box-shadow:
      0 18px 40px rgba(56, 40, 18, 0.12),
      0 3px 12px rgba(56, 40, 18, 0.08);
    z-index: 4;
  }

  .book-action-menu button {
    justify-content: flex-start;
    width: 100%;
    min-width: 0;
    min-height: 30px;
    padding: 7px 10px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
    font-size: 12px;
    text-align: left;
  }

  .book-action-menu button:hover {
    background: color-mix(in srgb, var(--surface-panel) 80%, white 20%);
  }

  .book-empty {
    margin: 0;
    color: var(--text-muted);
    font-size: 11px;
    line-height: 1.45;
  }

  .toc button {
    width: 100%;
    padding: 8px 10px;
    padding-left: calc(10px + var(--toc-level, 0) * 10px);
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    border-radius: 6px;
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.4;
    text-align: left;
  }

  .toc button.active {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--surface-reader) 82%, white 18%);
    box-shadow: inset 2px 0 0 #b18952;
  }

  .empty {
    margin: 0;
    padding: 2px 2px 0;
    color: var(--text-muted);
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.5;
  }

  .sidebar-panel {
    display: grid;
    gap: 10px;
  }

  .search-field input {
    width: 100%;
    height: 34px;
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    color: var(--text-primary);
    font: inherit;
    font-size: 13px;
  }

  .search-options {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .option-chip,
  .history-filter-chip,
  .history-clear,
  .history-delete {
    border: 0;
    font: inherit;
  }

  .option-chip,
  .history-filter-chip {
    padding: 6px 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    color: var(--text-secondary);
    font-size: 11px;
    line-height: 1;
  }

  .option-chip.active {
    background: color-mix(in srgb, var(--surface-panel) 80%, white 20%);
    color: var(--text-primary);
  }

  .history-filter-chip.active {
    background: color-mix(in srgb, var(--surface-panel) 80%, white 20%);
    color: var(--text-primary);
  }

  .history-filter-chip:disabled {
    opacity: 0.55;
  }

  .search-history {
    display: grid;
    gap: 8px;
  }

  .search-cache-status {
    display: grid;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
    box-shadow: inset 0 0 0 1px var(--border-light);
  }

  .search-cache-status div {
    display: grid;
    gap: 3px;
  }

  .search-cache-status strong {
    color: var(--text-primary);
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.3;
  }

  .search-cache-status span {
    color: var(--text-muted);
    font-size: 11px;
    line-height: 1.4;
  }

  .search-cache-status small {
    color: var(--text-muted);
    display: block;
    font-family: "IBM Plex Mono", "SFMono-Regular", monospace;
    font-size: 11px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .search-cache-status > .history-clear {
    justify-self: start;
  }

  .search-cache-status ul {
    display: grid;
    gap: 6px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .search-cache-status li button {
    align-items: center;
    background: rgba(255, 255, 255, 0.56);
    border: 1px solid var(--border-light);
    border-radius: 12px;
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    gap: 8px;
    justify-content: space-between;
    padding: 7px 9px;
    text-align: left;
    width: 100%;
  }

  .search-cache-status li strong {
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.3;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .search-cache-status li span {
    flex: none;
  }

  .search-result-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: inset 0 0 0 1px var(--border-light);
  }

  .search-result-nav span {
    color: var(--text-secondary);
    font-family: var(--font-chrome);
    font-size: 11px;
    line-height: 1;
  }

  .search-history-head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
  }

  .search-history-head strong {
    font-size: 12px;
    line-height: 1.3;
    font-family: var(--font-chrome);
  }

  .history-actions {
    display: inline-flex;
    gap: 8px;
    align-items: center;
  }

  .search-history-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .history-clear {
    background: transparent;
    color: var(--text-muted);
    font-size: 11px;
  }

  .history-list {
    display: grid;
    gap: 6px;
  }

  .history-chip-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 6px;
    align-items: stretch;
  }

  .history-chip {
    display: grid;
    gap: 3px;
    align-items: start;
    justify-items: start;
    min-width: 0;
    padding: 9px 11px;
    border: 0;
    border-radius: 14px;
    background: color-mix(in srgb, var(--surface-reader) 92%, white 8%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    color: var(--text-secondary);
    font: inherit;
    text-align: left;
  }

  .history-chip strong {
    color: var(--text-primary);
    font-size: 12px;
    line-height: 1.35;
  }

  .history-chip span,
  .history-chip time {
    color: var(--text-muted);
    font-family: var(--font-chrome);
    font-size: 11px;
    line-height: 1.35;
  }

  .history-delete {
    width: 28px;
    min-width: 28px;
    border-radius: 12px;
    background: transparent;
    color: var(--text-muted);
    font-size: 16px;
    line-height: 1;
  }

  .history-delete:hover,
  .history-chip:hover {
    background: color-mix(in srgb, var(--surface-panel) 80%, white 20%);
  }

  .search-summary {
    display: grid;
    gap: 2px;
    padding: 0 2px;
  }

  .search-summary strong {
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.3;
  }

  .search-summary span {
    color: var(--text-muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .search-results {
    display: grid;
    gap: 8px;
  }


  .search-notice {
    padding: 8px 10px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--surface-reader) 90%, white 10%);
    box-shadow: inset 0 0 0 1px var(--border-light);
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.4;
  }

  .search-notice.error {
    background: color-mix(in srgb, #f4d8d3 72%, white 28%);
    color: #7b3a31;
    box-shadow: inset 0 0 0 1px rgba(123, 58, 49, 0.12);
  }

  .search-result {
    display: grid;
    gap: 3px;
    padding: 10px 12px;
    border: 0;
    border-radius: 14px;
    background: color-mix(in srgb, var(--surface-reader) 93%, white 7%);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--border-light) 88%, transparent 12%);
    text-align: left;
  }

  .search-result strong {
    font-family: var(--font-chrome);
    font-size: 12px;
    line-height: 1.35;
  }

  .search-result span {
    margin: 0;
    color: var(--text-muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .search-result mark {
    background: color-mix(in srgb, #f4df9d 72%, white 28%);
    color: var(--text-primary);
  }

  .search-result:hover {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--surface-panel) 74%, white 26%);
  }

  .search-result.active-result {
    background: color-mix(in srgb, var(--surface-panel) 76%, white 24%);
    box-shadow:
      inset 2px 0 0 #b18952,
      inset 0 0 0 1px var(--border-light);
    color: var(--text-primary);
  }

  .search-result.recent-result {
    box-shadow:
      inset 0 0 0 1px rgba(177, 137, 82, 0.22),
      0 0 0 1px rgba(177, 137, 82, 0.08);
  }

  .reader-sidebar :is(button, input):focus-visible {
    outline: 2px solid color-mix(in srgb, var(--reader-shell-accent, #8c6a3b) 72%, white 28%);
    outline-offset: 2px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>

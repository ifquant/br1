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
    createEmptyReaderAssistanceState,
    createEmptyReaderPreviewState
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
  import type {
    ReaderHighlightSelectionsImportPreview,
    ReaderHighlightSelectionsRefreshFilter,
    ReaderHighlightSelectionsRefreshSummary
  } from '$lib/reader/sidebarHighlightSelections';

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

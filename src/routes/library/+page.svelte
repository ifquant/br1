<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-svelte';
  import type {
    LibraryActiveFilterChip,
    LibraryBrowseState,
    LibraryFilterControlsState,
    LibraryNoticeState,
    LibraryPageSurfaceModel,
    LibraryPageActions,
    LibraryBrowseAction,
    ContinueReadingBook,
    LibraryGroupBy,
    LibraryGroupSegment,
    LibraryShelfBook
  } from '$lib/library/types';
  import {
    applyLibraryFilterControlsState as applySharedLibraryFilterControlsState,
    buildCurrentLibraryBrowseState,
    buildLibraryFilterControlsState,
    buildLibraryPageActions,
    buildLibraryPageActionSet,
    getAppliedLibraryBrowseState
  } from '$lib/library/controller';
  import { buildDesktopLibraryPageCoordinator } from '$lib/library/desktopPage';
  import {
    createEmptyLibraryPageSurfaceModel,
    buildLibraryPageSurfaceSet
  } from '$lib/library/surface';
  import {
    buildLibraryScrollContextKey as buildSharedLibraryScrollContextKey,
    installLibrarySurfaceRuntime,
    saveLibraryViewportScrollPosition,
    syncLibraryBrowseLocation as syncSharedLibraryBrowseLocation,
    syncLibraryViewportScrollContext
  } from '$lib/library/runtime';
  import {
    buildLibraryPageBrowseState,
    buildLibraryPageFilterProjectionState,
    buildLibraryPageFilterStateSet,
    getLibraryEmptyFilterTitle,
    normalizeLibrarySearchText,
    type DesktopLibraryBrowseDerivations,
    type LibraryBrowseDerivations,
    type LibraryFilter,
    type LibraryActiveFilterState,
    type LibraryFilterState
  } from '$lib/library/page';
  import {
    buildLibraryBrowseHref,
    getLibraryBrowseStateFromUrl,
    getLibraryEnterFromTrailExplanation,
    getLibraryEnterGroupExplanation,
    getNormalizedLibraryBrowseState,
    isSameLibraryBrowseStateShape,
    getLibrarySiblingExplanation
  } from '$lib/library/navigation';
  import {
    LibraryPageHost
  } from '$lib/components';
  import { selectSingleSystemBookPath } from '$lib/services/libraryPersistence';
  import { READER_FILE_INPUT_ACCEPT } from '$lib/reader';
  import type { PersistedLibraryBook } from '$lib/services/libraryPersistence';
  import {
    canPersistLibrary,
    detectReadestLibrary,
    importBooksFromDesktopPicker,
    importLibraryBooks,
    importBooksFromReadest,
    LIBRARY_SURFACE_RELOAD_EVENT,
    loadPersistedLibraryBooks,
    openLibraryBookPath,
    openReaderTarget,
    previewLibraryRepairCandidate,
    removeLibraryBook,
    restoreRemovedLibraryBook,
    updateLibraryBookMetadata,
    toAssetReaderHref,
    toAssetReaderTarget,
    toLibraryReaderTarget
  } from '$lib/services';

  const sampleNow = Date.parse('2026-04-14T10:00:00+08:00');
  const starterLibraryBooks: LibraryShelfBook[] = [
    {
      title: '政治秩序与政治衰败',
      author: 'Francis Fukuyama',
      format: 'EPUB',
      status: '继续阅读 · 第 3 章',
      progress: '上次读到 34%',
      progressFraction: 0.34,
      progressPercentLabel: '34%',
      readingStatusLabel: '在读',
      collection: '政治与制度',
      tags: ['制度', '现代国家'],
      sourceLabel: '样例书库',
      availabilityLabel: '本地可读',
      lastOpenedAt: sampleNow - 45 * 60 * 1000,
      lastOpenedLabel: '45 分钟前阅读',
      importedAt: sampleNow - 12 * 24 * 60 * 60 * 1000,
      coverUrl: '/covers/political-order.svg',
      readerHref: toAssetReaderTarget('/samples/sample-book.epub', '政治秩序与政治衰败').href
    },
    {
      title: '置身事内',
      author: '兰小欢',
      format: 'EPUB',
      status: '继续阅读 · 第 1 章',
      progress: '上次读到 12%',
      progressFraction: 0.12,
      progressPercentLabel: '12%',
      readingStatusLabel: '在读',
      collection: '政治与制度',
      tags: ['中国', '经济'],
      sourceLabel: '样例书库',
      availabilityLabel: '本地可读',
      lastOpenedAt: sampleNow - 6 * 60 * 60 * 1000,
      lastOpenedLabel: '6 小时前阅读',
      importedAt: sampleNow - 9 * 24 * 60 * 60 * 1000,
      coverUrl: '/covers/inside-china.svg',
      readerHref: toAssetReaderTarget('/samples/sample-book.epub', '置身事内').href
    },
    {
      title: '胡雪岩',
      author: '高阳',
      format: 'EPUB',
      status: '上次停在尾声',
      progress: '上次读到 100%',
      progressFraction: 1,
      progressPercentLabel: '100%',
      readingStatusLabel: '已读完',
      collection: '历史人物',
      tags: ['历史小说'],
      sourceLabel: '样例书库',
      availabilityLabel: '本地可读',
      lastOpenedAt: sampleNow - 24 * 60 * 60 * 1000,
      lastOpenedLabel: '1 天前阅读',
      importedAt: sampleNow - 30 * 24 * 60 * 60 * 1000,
      coverUrl: '/covers/soulstealers.svg',
      readerHref: toAssetReaderTarget('/samples/sample-book.epub', '胡雪岩').href
    },
    {
      title: 'A Theory of Justice',
      author: 'John Rawls',
      format: 'EPUB',
      status: '英文原版 · 建议启用导读',
      progress: '可作为 bridge 验证样本',
      progressFraction: 0,
      progressPercentLabel: '0%',
      readingStatusLabel: '未开始',
      collection: '政治哲学',
      tags: ['正义论', '政治哲学'],
      sourceLabel: '样例书库',
      availabilityLabel: '本地可读',
      importedAt: sampleNow - 3 * 24 * 60 * 60 * 1000,
      coverUrl: '/covers/theory-of-justice.svg',
      readerHref: toAssetReaderTarget('/samples/sample-book.epub', 'A Theory of Justice').href
    },
    {
      title: '论法的精神',
      author: 'Montesquieu',
      format: 'PDF',
      status: '新导入',
      progress: '等待元数据整理',
      progressFraction: 0,
      progressPercentLabel: '0%',
      readingStatusLabel: '未开始',
      collection: '政治哲学',
      tags: ['法学', '政治哲学'],
      sourceLabel: '样例书库',
      availabilityLabel: '本地可读',
      importedAt: sampleNow - 2 * 24 * 60 * 60 * 1000,
      coverUrl: '/covers/spirit-of-law.svg',
      readerHref: toAssetReaderTarget('/samples/sample-outline.pdf', '论法的精神').href
    }
  ];

  let importedBooks: LibraryShelfBook[] = [];
  let importInput: HTMLInputElement | null = null;
  let libraryScrollRef: OverlayScrollbarsComponentRef<'div'> | null = null;
  let readestLibraryCount = 0;
  let readestCompatibleCount = 0;
  let showReadestMigration = false;
  let migrationBusy = false;
  let desktopLibraryMode = false;
  let bulkRepairBusy = false;
  let bulkRepairSummary = '';
  let libraryViewMode: 'grid' | 'list' = 'grid';
  let librarySortBy: 'recent' | 'added' | 'title' | 'author' | 'format' = 'recent';
  let libraryGroupBy: 'none' | 'author' | 'collection' | 'format' = 'none';
  let libraryGroupScope = '';
  let libraryBrowseTrail: LibraryGroupSegment[] = [];
  let libraryFilterBy: LibraryFilter = 'all';
  let libraryFormatFilter = 'all';
  let libraryCollectionFilter = 'all';
  let libraryTagFilter = 'all';
  let libraryQuery = '';
  let librarySearchActive = false;
  let persistedLibraryRecords: PersistedLibraryBook[] = [];
  let recoveryQueueBooks: LibraryShelfBook[] = [];
  let continueReadingBooks: LibraryShelfBook[] = [];
  let recentReadingBooks: LibraryShelfBook[] = [];
  let libraryShelfBooks: LibraryShelfBook[] = [];
  let starterContinueReadingBooks: LibraryShelfBook[] = [];
  let starterRecentReadingBooks: LibraryShelfBook[] = [];
  let starterShelfBooks: LibraryShelfBook[] = [];
  let recoveryQueueReviewBooks: ContinueReadingBook[] = [];
  let filteredContinueReadingBooks: LibraryShelfBook[] = [];
  let filteredRecentReadingBooks: LibraryShelfBook[] = [];
  let filteredRecoveryQueueBooks: LibraryShelfBook[] = [];
  let bulkRepairEligibleQueueBooks: LibraryShelfBook[] = [];
  let filteredLibraryBrowseBooks: LibraryShelfBook[] = [];
  let filteredLibraryShelfBooks: LibraryShelfBook[] = [];
  let filteredStarterContinueReadingBooks: LibraryShelfBook[] = [];
  let filteredStarterRecentReadingBooks: LibraryShelfBook[] = [];
  let filteredStarterBrowseBooks: LibraryShelfBook[] = [];
  let filteredStarterShelfBooks: LibraryShelfBook[] = [];
  let visibleLibraryBooksCount = 0;
  let visibleStarterLibraryBooksCount = 0;
  let librarySummaryBooks: LibraryShelfBook[] = [];
  let libraryFilterState: LibraryFilterState = {
    summaryBooks: [],
    statusOptionCounts: {
      all: 0,
      reading: 0,
      unstarted: 0,
      finished: 0
    },
    formatOptions: [],
    collectionOptions: [],
    tagOptions: [],
    formatOptionCounts: {},
    collectionOptionCounts: {},
    tagOptionCounts: {},
    formatSummary: '',
    collectionSummary: '',
    tagSummary: '',
    coverSummary: '',
  };
  let libraryActiveFilterState: LibraryActiveFilterState = {
    activeFilterDetail: '',
    activeFilterChips: []
  };
  let libraryStatusOptionCounts: Record<LibraryFilter, number> = {
    all: 0,
    reading: 0,
    unstarted: 0,
    finished: 0
  };
  let libraryFormatOptions: string[] = [];
  let libraryCollectionOptions: string[] = [];
  let libraryTagOptions: string[] = [];
  let libraryFormatOptionCounts: Record<string, number> = {};
  let libraryCollectionOptionCounts: Record<string, number> = {};
  let libraryTagOptionCounts: Record<string, number> = {};
  let libraryFormatSummary = '';
  let libraryCollectionSummary = '';
  let libraryTagSummary = '';
  let libraryActiveFilterDetail = '';
  let libraryActiveFilterChips: LibraryActiveFilterChip[] = [];
  let libraryFilterSummary = '';
  let libraryCoverSummary = '';
  let readingWorkflowNotice = null;
  let desktopLibraryBrowse: DesktopLibraryBrowseDerivations = {
    searchActive: false,
    groupedBrowseMode: false,
    recoveryQueueBooks: [],
    filteredRecoveryQueueBooks: [],
    continueReadingBooks: [],
    recentReadingBooks: [],
    shelfBooks: [],
    filteredContinueReadingBooks: [],
    filteredRecentReadingBooks: [],
    filteredBrowseBooks: [],
    filteredShelfBooks: [],
    visibleBooksCount: 0,
    workflowNotice: null
  };
  let libraryScrollContextKey = '';
  let libraryNotice: LibraryNoticeState | null = null;
  let starterReadingWorkflowNotice = null;
  let starterLibraryBrowse: LibraryBrowseDerivations = {
    searchActive: false,
    groupedBrowseMode: false,
    continueReadingBooks: [],
    recentReadingBooks: [],
    shelfBooks: [],
    filteredContinueReadingBooks: [],
    filteredRecentReadingBooks: [],
    filteredBrowseBooks: [],
    filteredShelfBooks: [],
    visibleBooksCount: 0,
    workflowNotice: null
  };
  let currentLibraryBrowseState: LibraryBrowseState = {
    groupBy: 'none',
    groupScope: '',
    trail: []
  };
  let activeLibraryPageActions: LibraryPageActions;
  let desktopLibraryPageSurfaceModel: LibraryPageSurfaceModel = createEmptyLibraryPageSurfaceModel(true);
  let starterLibraryPageSurfaceModel: LibraryPageSurfaceModel = createEmptyLibraryPageSurfaceModel(false);
  let activeLibraryPageSurfaceModel: LibraryPageSurfaceModel = createEmptyLibraryPageSurfaceModel(false);

  const syncLibraryBrowseLocation = async (options: {
    groupBy?: 'none' | 'author' | 'collection' | 'format';
    groupScope?: string;
    trail?: LibraryGroupSegment[];
  }) => {
    await syncSharedLibraryBrowseLocation({
      currentUrl: $page.url,
      state: {
        groupBy: options.groupBy ?? libraryGroupBy,
        groupScope: options.groupScope ?? libraryGroupScope,
        trail: options.trail ?? libraryBrowseTrail
      },
      goto
    });
  };

  const getLibraryViewport = () => libraryScrollRef?.osInstance()?.elements().viewport ?? null;

  const buildLibraryScrollContextKey = () =>
    buildSharedLibraryScrollContextKey({
      desktopLibraryMode,
      viewMode: libraryViewMode,
      sortBy: librarySortBy,
      groupBy: libraryGroupBy,
      groupScope: libraryGroupScope,
      trail: libraryBrowseTrail,
      filterBy: libraryFilterBy,
      formatFilter: libraryFormatFilter,
      collectionFilter: libraryCollectionFilter,
      tagFilter: libraryTagFilter,
      normalizedQuery: normalizeLibrarySearchText(libraryQuery),
      searchActive: librarySearchActive
    });

  const desktopLibraryPageCoordinator = buildDesktopLibraryPageCoordinator({
    getLibraryNoticeState: () => libraryNotice,
    setLibraryNoticeState: (notice) => {
      libraryNotice = notice;
    },
    setPersistedLibraryRecords: (records) => {
      persistedLibraryRecords = records;
    },
    setReadestCompatibleCount: (count) => {
      readestCompatibleCount = count;
    },
    setImportedBooks: (books) => {
      importedBooks = books;
    },
    canPersistLibrary,
    getPersistedLibraryRecords: () => persistedLibraryRecords,
    getBulkRepairBusy: () => bulkRepairBusy,
    setBulkRepairBusy: (busy) => {
      bulkRepairBusy = busy;
    },
    setBulkRepairSummary: (summary) => {
      bulkRepairSummary = summary;
    },
    getBulkRepairEligibleQueueBooks: () => bulkRepairEligibleQueueBooks,
    getMigrationBusy: () => migrationBusy,
    setMigrationBusy: (busy) => {
      migrationBusy = busy;
    },
    setDesktopLibraryMode: (value) => {
      desktopLibraryMode = value;
    },
    setReadestLibraryCount: (count) => {
      readestLibraryCount = count;
    },
    setShowReadestMigration: (value) => {
      showReadestMigration = value;
    },
    getImportInput: () => importInput,
    toAssetReaderTarget: (url, label) => toAssetReaderTarget(url, label ?? ''),
    openReaderTarget,
    openLibraryBookPath,
    importBooksFromDesktopPicker,
    loadPersistedLibraryBooks,
    detectReadestLibrary,
    importBooksFromReadest,
    importLibraryBooks,
    previewLibraryRepairCandidate,
    selectSingleSystemBookPath,
    removeLibraryBook,
    restoreRemovedLibraryBook,
    updateLibraryBookMetadata,
    confirmReplacement: (message) =>
      typeof window === 'undefined' || window.confirm(message),
    confirmRemoval: (message) =>
      typeof window === 'undefined' || window.confirm(message),
    createObjectUrl: (file) => URL.createObjectURL(file),
    setImportInputValue: (value) => {
      if (importInput) importInput.value = value;
    }
  });

  onMount(() => {
    return installLibrarySurfaceRuntime({
      win: window,
      doc: document,
      canPersistLibrary: canPersistLibrary(),
      reloadEventName: LIBRARY_SURFACE_RELOAD_EVENT,
      getViewport: getLibraryViewport,
      onRefreshLibrary: () => {
        void desktopLibraryPageCoordinator.loadLibrary();
      },
      onSaveScrollPosition: (contextKey) => {
        if (typeof window === 'undefined') return;
        saveLibraryViewportScrollPosition({
          storage: window.sessionStorage,
          contextKey,
          getViewport: getLibraryViewport
        });
      },
      getScrollContextKey: () => libraryScrollContextKey
    });
  });

  $: librarySearchActive = normalizeLibrarySearchText(libraryQuery).length > 0;
  $: ({
    summaryBooks: librarySummaryBooks,
    filterState: libraryFilterState
  } = buildLibraryPageFilterStateSet({
    importedBooks,
    starterLibraryBooks
  }));
  $: ({
    searchActive: librarySearchActive,
    activeFilterState: libraryActiveFilterState,
    desktopBrowse: desktopLibraryBrowse,
    starterBrowse: starterLibraryBrowse,
    filterSummary: libraryFilterSummary,
    recoveryQueueBooks,
    continueReadingBooks,
    recentReadingBooks,
    libraryShelfBooks,
    filteredRecoveryQueueBooks,
    recoveryQueueReviewBooks,
    bulkRepairEligibleQueueBooks,
    manualRepairQueueCount,
    recoveryQueueSummaryText,
    libraryStatusSummary,
    filteredContinueReadingBooks,
    filteredRecentReadingBooks,
    filteredLibraryBrowseBooks,
    filteredLibraryShelfBooks,
    libraryGroupedBrowseMode,
    visibleLibraryBooksCount,
    readingWorkflowNotice,
    starterContinueReadingBooks,
    starterRecentReadingBooks,
    starterShelfBooks,
    filteredStarterContinueReadingBooks,
    filteredStarterRecentReadingBooks,
    filteredStarterBrowseBooks,
    filteredStarterShelfBooks,
    visibleStarterLibraryBooksCount,
    starterReadingWorkflowNotice
  } = buildLibraryPageBrowseState({
    importedBooks,
    starterLibraryBooks,
    query: libraryQuery,
    sortBy: librarySortBy,
    filterBy: libraryFilterBy,
    formatFilter: libraryFormatFilter,
    collectionFilter: libraryCollectionFilter,
    tagFilter: libraryTagFilter,
    groupBy: libraryGroupBy,
    groupScope: libraryGroupScope,
    persistedLibraryRecords,
    desktopLibraryMode
  }));
  $: ({ groupBy: libraryGroupBy, groupScope: libraryGroupScope, trail: libraryBrowseTrail } =
    getLibraryBrowseStateFromUrl($page.url));
  $: if (libraryFormatFilter !== 'all' && !libraryFormatOptions.includes(libraryFormatFilter)) {
    libraryFormatFilter = 'all';
  }
  $: if (
    libraryCollectionFilter !== 'all' &&
    !libraryCollectionOptions.includes(libraryCollectionFilter)
  ) {
    libraryCollectionFilter = 'all';
  }
  $: if (libraryTagFilter !== 'all' && !libraryTagOptions.includes(libraryTagFilter)) {
    libraryTagFilter = 'all';
  }
  $: {
    const normalizedBrowseState = getNormalizedLibraryBrowseState(
      {
        groupBy: libraryGroupBy,
        groupScope: libraryGroupScope,
        trail: libraryBrowseTrail
      },
      libraryShelfBooks,
      starterShelfBooks
    );
    if (
      !isSameLibraryBrowseStateShape(normalizedBrowseState, {
        groupBy: libraryGroupBy,
        groupScope: libraryGroupScope,
        trail: libraryBrowseTrail
      })
    ) {
      void syncLibraryBrowseLocation(normalizedBrowseState);
    }
  }
  $: ({
    statusOptionCounts: libraryStatusOptionCounts,
    formatOptions: libraryFormatOptions,
    collectionOptions: libraryCollectionOptions,
    tagOptions: libraryTagOptions,
    formatOptionCounts: libraryFormatOptionCounts,
    collectionOptionCounts: libraryCollectionOptionCounts,
    tagOptionCounts: libraryTagOptionCounts,
    formatSummary: libraryFormatSummary,
    collectionSummary: libraryCollectionSummary,
    tagSummary: libraryTagSummary,
    coverSummary: libraryCoverSummary
  } = buildLibraryPageFilterProjectionState({
    filterState: libraryFilterState
  }));
  $: libraryActiveFilterDetail = libraryActiveFilterState.activeFilterDetail;
  $: libraryActiveFilterChips = libraryActiveFilterState.activeFilterChips;
  $: currentLibraryBrowseState = buildCurrentLibraryBrowseState({
    groupBy: libraryGroupBy,
    groupScope: libraryGroupScope,
    trail: libraryBrowseTrail
  });
  $: ({ desktop: desktopLibraryPageSurfaceModel, starter: starterLibraryPageSurfaceModel, active: activeLibraryPageSurfaceModel } =
    buildLibraryPageSurfaceSet({
      chrome: {
        totalBooks: importedBooks.length || starterLibraryBooks.length,
        query: libraryQuery,
        viewMode: libraryViewMode,
        sortBy: librarySortBy,
        groupBy: libraryGroupBy,
        browseState: currentLibraryBrowseState,
        activeGroupVisibleCount: filteredLibraryShelfBooks.length || filteredStarterShelfBooks.length,
        activeFilter: libraryFilterBy,
        statusOptionCounts: libraryStatusOptionCounts,
        activeFormatFilter: libraryFormatFilter,
        formatOptions: libraryFormatOptions,
        formatOptionCounts: libraryFormatOptionCounts,
        activeCollectionFilter: libraryCollectionFilter,
        collectionOptions: libraryCollectionOptions,
        collectionOptionCounts: libraryCollectionOptionCounts,
        activeTagFilter: libraryTagFilter,
        tagOptions: libraryTagOptions,
        tagOptionCounts: libraryTagOptionCounts,
        statusSummary: libraryStatusSummary,
        activeFilterDetail: libraryActiveFilterDetail,
        activeFilterChips: libraryActiveFilterChips,
        formatSummary: libraryFormatSummary,
        collectionSummary: libraryCollectionSummary,
        tagSummary: libraryTagSummary,
        coverSummary: libraryCoverSummary,
        filterSummary: libraryFilterSummary,
        importDisabled: migrationBusy,
        notice: libraryNotice
          ? {
              kind: libraryNotice.kind,
              message: libraryNotice.message,
              actionLabel: libraryNotice.actionLabel
            }
          : null,
        showReadestMigration,
        readestLibraryCount,
        readestCompatibleCount,
        migrationBusy
      },
      desktopBody: {
        browseState: currentLibraryBrowseState,
        groupedBrowseMode: libraryGroupedBrowseMode,
        browseBooks: filteredLibraryBrowseBooks,
        viewMode: libraryViewMode,
        shelfBooks: filteredLibraryShelfBooks,
        searchActive: librarySearchActive,
        groupBy: libraryGroupBy,
        workflowNotice: readingWorkflowNotice,
        recoveryQueueSummaryText,
        recoveryQueueReviewBooks,
        bulkRepairEligibleCount: bulkRepairEligibleQueueBooks.length,
        bulkRepairBusy,
        bulkRepairSummary,
        filteredContinueReadingBooks,
        filteredRecentReadingBooks,
        importedBooksCount: importedBooks.length,
        readestLibraryCount,
        migrationBusy,
        libraryQuery,
        visibleLibraryBooksCount,
        activeFilterDetail: libraryActiveFilterDetail,
        activeFilterChips: libraryActiveFilterChips,
        onOpenSourcePath: desktopLibraryPageCoordinator.handleOpenSourcePath,
        onImportBooks: desktopLibraryPageCoordinator.triggerImportPicker,
        onRepairBook: desktopLibraryPageCoordinator.handleRepairLibraryBook,
        onRemoveBook: desktopLibraryPageCoordinator.handleRemoveLibraryBook,
        onBulkRepairBooks: desktopLibraryPageCoordinator.handleBulkRepairLibraryBooks,
        onReadestMigration: desktopLibraryPageCoordinator.handleReadestMigrationClick,
        onClearFilterById: activeLibraryPageActions.onClearFilterChip!,
        onClearFilters: activeLibraryPageActions.onClearFilters!,
        getEmptyFilterTitle: getLibraryEmptyFilterTitle
      },
      starterBody: {
        browseState: currentLibraryBrowseState,
        groupedBrowseMode: libraryGroupedBrowseMode,
        browseBooks: filteredStarterBrowseBooks,
        viewMode: libraryViewMode,
        shelfBooks: filteredStarterShelfBooks,
        searchActive: librarySearchActive,
        groupBy: libraryGroupBy,
        workflowNotice: starterReadingWorkflowNotice,
        filteredContinueReadingBooks: filteredStarterContinueReadingBooks,
        filteredRecentReadingBooks: filteredStarterRecentReadingBooks,
        libraryQuery,
        visibleStarterLibraryBooksCount,
        activeFilterDetail: libraryActiveFilterDetail,
        activeFilterChips: libraryActiveFilterChips,
        onClearFilterById: activeLibraryPageActions.onClearFilterChip!,
        onClearFilters: activeLibraryPageActions.onClearFilters!,
        getEmptyFilterTitle: getLibraryEmptyFilterTitle
      },
      desktopLibraryMode
    }));
  $: nextLibraryScrollContextKey = buildLibraryScrollContextKey();
  $: if (typeof window !== 'undefined' && nextLibraryScrollContextKey !== libraryScrollContextKey) {
    const previousKey = libraryScrollContextKey;
    libraryScrollContextKey = nextLibraryScrollContextKey;
    void syncLibraryViewportScrollContext({
      previousKey,
      nextKey: libraryScrollContextKey,
      storage: window.sessionStorage,
      getViewport: getLibraryViewport
    });
  }

  $: activeLibraryPageActions = buildLibraryPageActionSet({
      onImportChange: desktopLibraryPageCoordinator.handleImportChange,
      onRunNoticeAction: desktopLibraryPageCoordinator.runLibraryNoticeAction,
      onClearNotice: desktopLibraryPageCoordinator.clearLibraryNotice,
      onReadestMigration: desktopLibraryPageCoordinator.handleReadestMigrationClick,
      onOpenLink: desktopLibraryPageCoordinator.handleOpenReaderTarget,
      onImportBooks: desktopLibraryPageCoordinator.triggerImportPicker,
      onOpenSourcePath: desktopLibraryPageCoordinator.handleOpenSourcePath,
      onUpdateBookMetadata: desktopLibraryPageCoordinator.handleUpdateLibraryBookMetadata,
      onRemoveBook: desktopLibraryPageCoordinator.handleRemoveLibraryBook,
      getCurrentFilterControlsState: () =>
        buildLibraryFilterControlsState({
          query: libraryQuery,
          filterBy: libraryFilterBy,
          formatFilter: libraryFormatFilter,
          collectionFilter: libraryCollectionFilter,
          tagFilter: libraryTagFilter
        }),
      applyFilterControlsState: (next) =>
        applySharedLibraryFilterControlsState({
          next,
          setQuery: (query) => {
            libraryQuery = query;
          },
          setFilterBy: (filterBy) => {
            libraryFilterBy = filterBy;
          },
          setFormatFilter: (formatFilter) => {
            libraryFormatFilter = formatFilter;
          },
          setCollectionFilter: (collectionFilter) => {
            libraryCollectionFilter = collectionFilter;
          },
          setTagFilter: (tagFilter) => {
            libraryTagFilter = tagFilter;
          }
        }),
      getCurrentBrowseState: () => currentLibraryBrowseState,
      syncBrowseState: (state) => syncLibraryBrowseLocation(state),
      setSortBy: (sortBy) => {
        librarySortBy = sortBy;
      },
      setViewMode: (viewMode) => {
        libraryViewMode = viewMode;
      }
    });

</script>

<section class="library-page">
  <LibraryPageHost
    model={activeLibraryPageSurfaceModel}
    actions={activeLibraryPageActions}
    bind:fileInput={importInput}
    bind:scrollRef={libraryScrollRef}
    fileAccept={READER_FILE_INPUT_ACCEPT}
  />
</section>

<style>
  .library-page {
    min-height: 100%;
    display: grid;
  }
</style>

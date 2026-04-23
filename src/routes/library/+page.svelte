<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount, tick } from 'svelte';
  import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-svelte';
  import type {
    LibraryActiveFilterChip,
    LibraryBrowseState,
    LibraryFilterControlsState,
    LibraryNoticeState,
    LibraryPageSurfaceModel,
    LibraryBrowseAction,
    ContinueReadingBook,
    LibraryGroupBy,
    LibraryGroupSegment,
    LibraryShelfBook,
    ManualRelinkReview
  } from '$lib/library/types';
  import {
    createLibraryNotice,
    getAppliedLibraryBrowseState,
    getNextLibraryFilterControlsState,
    runLibraryNoticeAction as runSharedLibraryNoticeAction
  } from '$lib/library/controller';
  import {
    importDesktopLibraryBooks,
    loadDesktopLibrarySurface,
    migrateDesktopReadestLibrary
  } from '$lib/library/desktopIngress';
  import {
    bulkRepairDesktopLibraryBooks,
    removeLibraryBookFromDesktop,
    repairDesktopLibraryBook,
    restoreRemovedLibraryRecord as restoreRemovedLibraryRecordFromDesktop,
    updateDesktopLibraryBookMetadata
  } from '$lib/library/desktopMaintenance';
  import {
    createEmptyLibraryPageSurfaceModel,
    buildDesktopLibraryPageSurfaceModel,
    buildStarterLibraryPageSurfaceModel
  } from '$lib/library/surface';
  import {
    buildLibraryScrollContextKey as buildSharedLibraryScrollContextKey,
    installLibrarySurfaceRuntime,
    restoreLibraryScrollPosition as restoreSharedLibraryScrollPosition,
    saveLibraryScrollPosition as saveSharedLibraryScrollPosition,
    syncLibraryBrowseLocation as syncSharedLibraryBrowseLocation
  } from '$lib/library/runtime';
  import {
    buildLibraryActiveFilterState,
    buildDesktopLibraryBrowseDerivations,
    buildLibraryFilterState,
    buildStarterLibraryBrowseDerivations,
    filterBooksForLibraryView,
    getLibraryEmptyFilterTitle,
    isLibraryViewFiltered,
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
    getLibraryGroupLabel,
    getLibrarySiblingExplanation
  } from '$lib/library/navigation';
  import {
    LibraryPageHost
  } from '$lib/components';
  import { selectSingleSystemBookPath } from '$lib/services/libraryPersistence';
  import { READER_FILE_INPUT_ACCEPT } from '$lib/reader';
  import type {
    LibraryReaderTarget,
    PersistedLibraryBook
  } from '$lib/services/libraryPersistence';
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
    toLibraryCoverUrl,
    toLibraryReaderTarget,
    toReaderAssetHref,
    toReaderStartHref
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

  const readerValidationRank = (record: PersistedLibraryBook) => {
    const normalized = record.format.trim().toUpperCase();
    if (normalized === 'PDF') return 0;
    if (normalized === 'EPUB') return 1;
    if (normalized === 'FB2' || normalized === 'MOBI' || normalized === 'AZW3') return 2;
    return 3;
  };

  const sortRecordsForLibraryShelf = (records: PersistedLibraryBook[]) =>
    [...records].sort((left, right) => {
      const leftOpenedAt = left.lastOpenedAt ?? 0;
      const rightOpenedAt = right.lastOpenedAt ?? 0;
      const byRecency = rightOpenedAt - leftOpenedAt;
      if (byRecency !== 0) return byRecency;

      const byFormat = readerValidationRank(left) - readerValidationRank(right);
      if (byFormat !== 0) return byFormat;
      return right.importedAt - left.importedAt;
    });

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
  let desktopLibraryPageSurfaceModel: LibraryPageSurfaceModel = createEmptyLibraryPageSurfaceModel(true);
  let starterLibraryPageSurfaceModel: LibraryPageSurfaceModel = createEmptyLibraryPageSurfaceModel(false);
  let activeLibraryPageSurfaceModel: LibraryPageSurfaceModel = createEmptyLibraryPageSurfaceModel(false);

  const getCurrentLibraryFilterControlsState = (): LibraryFilterControlsState => ({
    query: libraryQuery,
    filterBy: libraryFilterBy,
    formatFilter: libraryFormatFilter,
    collectionFilter: libraryCollectionFilter,
    tagFilter: libraryTagFilter
  });

  const applyLibraryFilterControlsState = (next: LibraryFilterControlsState) => {
    libraryQuery = next.query;
    libraryFilterBy = next.filterBy;
    libraryFormatFilter = next.formatFilter;
    libraryCollectionFilter = next.collectionFilter;
    libraryTagFilter = next.tagFilter;
  };

  const formatLastOpenedLabel = (timestamp: number | null | undefined) => {
    if (typeof timestamp !== 'number' || timestamp <= 0) return '';

    const deltaMs = Date.now() - timestamp;
    const deltaMinutes = Math.max(1, Math.round(deltaMs / 60000));

    if (deltaMinutes < 60) return `${deltaMinutes} 分钟前阅读`;
    if (deltaMinutes < 60 * 24) return `${Math.round(deltaMinutes / 60)} 小时前阅读`;
    return `${Math.round(deltaMinutes / (60 * 24))} 天前阅读`;
  };

  const formatImportedAtLabel = (timestamp: number | null | undefined) => {
    if (typeof timestamp !== 'number' || timestamp <= 0) return '';

    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(timestamp));
  };

  const formatProgressPercentLabel = (fraction: number | null) => {
    if (fraction === null) return '';
    const normalized = Math.max(0, Math.min(1, fraction));
    if (normalized <= 0) return '0%';
    return `${Math.max(1, Math.min(100, Math.round(normalized * 100)))}%`;
  };

  const mapLibraryRecord = async (record: PersistedLibraryBook): Promise<LibraryShelfBook> => {
    const isReadestCompatible = record.id.startsWith('readest-');
    const hasLibraryFileCopy = record.libraryFileExists !== false;
    const hasOriginalSource = !record.sourcePath || record.sourceFileExists !== false;
    const progressFraction =
      typeof record.progressFraction === 'number'
        ? Math.max(0, Math.min(1, record.progressFraction))
        : null;

    const readingStatusLabel =
      progressFraction === null
        ? ''
        : progressFraction >= 1
          ? '已读完'
          : progressFraction > 0
            ? '在读'
            : '未开始';

    const sourceLabel = isReadestCompatible
      ? 'Readest 兼容'
      : record.sourcePath
        ? '本机导入'
        : '书库';

    const availabilityLabel = !hasLibraryFileCopy
      ? record.sourcePath && !hasOriginalSource
        ? '书库副本缺失，且原文件路径已失效'
        : record.sourcePath
          ? '书库副本缺失，可从原文件重建'
          : '书库副本缺失，需要手动重新关联'
      : record.sourcePath && !hasOriginalSource
        ? '原文件缺失，可继续使用书库副本'
        : isReadestCompatible
          ? '兼容 Readest 本地藏书'
          : '本地可读';

    const compatibilitySignals = [
      record.coverPath ? '封面' : '',
      record.description ? '简介' : '',
      record.language ? '语言' : '',
      record.publisher ? '出版者' : '',
      record.collection ? '书架归类' : '',
      record.tags?.length ? '标签' : '',
      record.progressLocation ? '恢复定位' : '',
      record.progressLocation ? '' : progressFraction !== null ? '阅读进度' : ''
    ].filter(Boolean);

    const compatibilityLabel = !hasLibraryFileCopy
      ? isReadestCompatible
        ? '兼容记录仍在，但书库副本已经缺失；请重新同步 Readest 或重新导入文件。'
        : record.sourcePath && !hasOriginalSource
          ? '这本书无法批量修复；请先逐本复核，再选择替换文件重新关联到原有记录。'
          : record.sourcePath
            ? '书库副本已经缺失；可以直接从当前原文件重建，不会额外创建重复条目。'
            : '缺少可复用的原文件路径；请逐本复核后再选择替换文件重新关联。'
      : record.sourcePath && !hasOriginalSource
        ? '原文件路径已失效；继续阅读仍可用，如需恢复“原文件”入口请重新导入。'
        : isReadestCompatible
          ? compatibilitySignals.length > 0
            ? `保留 ${compatibilitySignals.join(' / ')}`
            : '兼容 Readest 本地藏书'
          : '';

    return {
      title: record.title,
      author: record.author,
      format: record.format,
      description: record.description || '',
      language: record.language || '',
      publisher: record.publisher || '',
      collection: record.collection || '',
      tags: record.tags ?? [],
      progressLocation: record.progressLocation || '',
      status: record.status,
      progress: record.progress,
      progressFraction,
      progressPercentLabel:
        formatProgressPercentLabel(progressFraction),
      readingStatusLabel,
      sourceLabel,
      availabilityLabel,
      compatibilityLabel,
      sourcePath: record.sourcePath || record.filePath,
      coverUrl: await toLibraryCoverUrl(record),
      readerHref: hasLibraryFileCopy ? toReaderAssetHref(record) : '',
      restartHref: hasLibraryFileCopy ? toReaderStartHref(record) : '',
      lastOpenedAt: record.lastOpenedAt,
      lastOpenedLabel: formatLastOpenedLabel(record.lastOpenedAt),
      importedAt: record.importedAt,
      importedAtLabel: formatImportedAtLabel(record.importedAt)
    };
  };

  const getPersistedLibraryLookupKey = (book: {
    title: string;
    author: string;
    format: string;
    sourcePath?: string;
  }) => `${book.format}::${book.title}::${book.author}::${book.sourcePath ?? ''}`;

  const lookupPersistedRecordForBook = (book: LibraryShelfBook) => {
    const lookupKey = getPersistedLibraryLookupKey(book);
    return (
      persistedLibraryRecords.find((record) => {
        return (
          getPersistedLibraryLookupKey({
            title: record.title,
            author: record.author,
            format: record.format,
            sourcePath: record.sourcePath || record.filePath
          }) === lookupKey
        );
      }) ?? null
    );
  };

  const normalizeLibraryMatchText = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '');

  const getPersistedLibraryMatchKey = (record: {
    title: string;
    author: string;
    format: string;
  }) =>
    [record.title, record.author, record.format]
      .map((value) => normalizeLibraryMatchText(value))
      .join('::');

  const buildManualRelinkReview = (book: LibraryShelfBook): ManualRelinkReview | undefined => {
    const persistedRecord = lookupPersistedRecordForBook(book);
    if (!persistedRecord || !isPersistedRecordManualRepairOnly(persistedRecord)) return undefined;
    const preflightLabel = '替换文件预检';
    const preflightDetail =
      '选择文件后会先检查文件是否存在、格式、标题、作者、原路径和 SHA-256 指纹；明显不匹配时会再次确认。';
    const repairContractLabel = '修复契约';
    const repairContractDetail =
      persistedRecord.progressLocation || typeof persistedRecord.progressFraction === 'number'
        ? '选中的文件会原位重关联到当前记录，保留阅读状态、百分比进度和恢复定位；不会新建重复书目。'
        : '选中的文件会原位重关联到当前记录，保留阅读状态；不会新建重复书目。';

    const currentMatchKey = getPersistedLibraryMatchKey(persistedRecord);
    const conflictingMatchCount = persistedLibraryRecords.filter((record) => {
      if (record.id === persistedRecord.id) return false;
      if (record.id.startsWith('readest-')) return false;
      if (!isPersistedRecordBroken(record)) return false;
      return getPersistedLibraryMatchKey(record) === currentMatchKey;
    }).length;
    const conflictingSourceCount = persistedRecord.sourcePath
      ? persistedLibraryRecords
          .filter((record) => record.id !== persistedRecord.id)
          .filter((record) => !record.id.startsWith('readest-'))
          .filter((record) => record.sourcePath && record.sourcePath === persistedRecord.sourcePath)
          .length
      : 0;

    if (conflictingMatchCount > 0) {
      return {
        note: '先核对当前条目的标题、格式、来源和进度，再打开文件选择器。选中的文件会原位重关联当前记录，不会新建重复条目。',
        repairContractLabel,
        repairContractDetail,
        conflictLabel: `检测到 ${conflictingMatchCount + 1} 条同题名/作者/格式的待修复记录`,
        conflictDetail:
          '系统会按现有记录顺序匹配修复目标；如果这里还有别的同类破损记录，先确认你正在处理的是当前这一条，再继续选择替换文件。',
        preflightLabel,
        preflightDetail,
        actionLabel: '确认后选择替换文件'
      };
    }

    if (conflictingSourceCount > 0) {
      return {
        note: '先核对当前条目的标题、格式、来源和进度，再打开文件选择器。选中的文件会原位重关联当前记录，不会新建重复条目。',
        repairContractLabel,
        repairContractDetail,
        conflictLabel: '检测到相同原文件路径的其他记录',
        conflictDetail:
          '如果书库里还有别的条目共享这一原文件路径，选文件前先确认当前条目的标题和格式，避免把重关联落到另一条记录上。',
        preflightLabel,
        preflightDetail,
        actionLabel: '确认后选择替换文件'
      };
    }

    return {
      note: '先核对当前条目的标题、格式、来源和进度，再打开文件选择器。选中的文件会原位重关联当前记录，不会新建重复条目。',
      repairContractLabel,
      repairContractDetail,
      conflictLabel: '当前没有检测到同类冲突',
      conflictDetail:
        '这条记录可以直接按原位修复处理；只要你选到的是同一本书，修复后会保留现有进度和阅读状态。',
      preflightLabel,
      preflightDetail,
      actionLabel: '确认后选择替换文件'
    };
  };

  const isPersistedRecordBroken = (record: PersistedLibraryBook) =>
    record.libraryFileExists === false ||
    (!!record.sourcePath && record.sourceFileExists === false);

  const isPersistedRecordBulkRepairEligible = (record: PersistedLibraryBook) =>
    record.libraryFileExists === false &&
    !!record.sourcePath &&
    record.sourceFileExists !== false;

  const isPersistedRecordManualRepairOnly = (record: PersistedLibraryBook) =>
    isPersistedRecordBroken(record) && !isPersistedRecordBulkRepairEligible(record);

  const getRecoveryQueuePersistedRecords = (records: PersistedLibraryBook[]) =>
    sortRecordsForLibraryShelf(records).filter(isPersistedRecordBroken).slice(0, 6);

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

  const saveLibraryScrollPosition = (contextKey: string) => {
    if (typeof window === 'undefined' || !contextKey) return;
    const viewport = getLibraryViewport();
    if (!viewport) return;
    saveSharedLibraryScrollPosition({
      storage: window.sessionStorage,
      contextKey,
      scrollTop: viewport.scrollTop
    });
  };

  const restoreLibraryScrollPosition = async (contextKey: string) => {
    if (typeof window === 'undefined' || !contextKey) return;
    await tick();
    const viewport = getLibraryViewport();
    if (!viewport) return;
    viewport.scrollTop = restoreSharedLibraryScrollPosition({
      storage: window.sessionStorage,
      contextKey
    });
  };

  const syncLibraryScrollContext = async (previousKey: string, nextKey: string) => {
    if (previousKey) saveLibraryScrollPosition(previousKey);
    await restoreLibraryScrollPosition(nextKey);
  };

  const countReadestCompatibleRecords = (records: PersistedLibraryBook[]) =>
    records.filter((record) => record.id.startsWith('readest-')).length;

  const applyPersistedLibraryRecords = async (records: PersistedLibraryBook[]) => {
    persistedLibraryRecords = records;
    readestCompatibleCount = countReadestCompatibleRecords(records);
    importedBooks = await Promise.all(sortRecordsForLibraryShelf(records).map(mapLibraryRecord));
  };

  const loadLibrary = async () => {
    if (!canPersistLibrary()) return;
    await loadDesktopLibrarySurface({
      detectReadestLibrary,
      loadPersistedLibraryBooks,
      applyPersistedLibraryRecords,
      triggerReadestMigration,
      setDesktopLibraryMode: (value) => {
        desktopLibraryMode = value;
      },
      setReadestLibraryCount: (count) => {
        readestLibraryCount = count;
      },
      setShowReadestMigration: (value) => {
        showReadestMigration = value;
      }
    });
  };

  onMount(() => {
    return installLibrarySurfaceRuntime({
      win: window,
      doc: document,
      canPersistLibrary: canPersistLibrary(),
      reloadEventName: LIBRARY_SURFACE_RELOAD_EVENT,
      getViewport: getLibraryViewport,
      onRefreshLibrary: () => {
        void loadLibrary();
      },
      onSaveScrollPosition: saveLibraryScrollPosition,
      getScrollContextKey: () => libraryScrollContextKey
    });
  });

  $: librarySearchActive = normalizeLibrarySearchText(libraryQuery).length > 0;
  $: desktopLibraryBrowse = buildDesktopLibraryBrowseDerivations({
    books: importedBooks,
    query: libraryQuery,
    sortBy: librarySortBy,
    filterBy: libraryFilterBy,
    formatFilter: libraryFormatFilter,
    collectionFilter: libraryCollectionFilter,
    tagFilter: libraryTagFilter,
    groupBy: libraryGroupBy,
    groupScope: libraryGroupScope
  });
  $: recoveryQueueBooks = desktopLibraryBrowse.recoveryQueueBooks;
  $: continueReadingBooks = desktopLibraryBrowse.continueReadingBooks;
  $: recentReadingBooks = desktopLibraryBrowse.recentReadingBooks;
  $: libraryShelfBooks = desktopLibraryBrowse.shelfBooks;
  $: librarySummaryBooks = importedBooks.length ? importedBooks : starterLibraryBooks;
  $: libraryFilterState = buildLibraryFilterState({
    summaryBooks: librarySummaryBooks
  });
  $: libraryActiveFilterState = buildLibraryActiveFilterState({
    searchActive: librarySearchActive,
    query: libraryQuery,
    filterBy: libraryFilterBy,
    formatFilter: libraryFormatFilter,
    collectionFilter: libraryCollectionFilter,
    tagFilter: libraryTagFilter
  });
  $: libraryStatusOptionCounts = libraryFilterState.statusOptionCounts;
  $: libraryFormatOptions = libraryFilterState.formatOptions;
  $: libraryCollectionOptions = libraryFilterState.collectionOptions;
  $: libraryTagOptions = libraryFilterState.tagOptions;
  $: libraryFormatOptionCounts = libraryFilterState.formatOptionCounts;
  $: libraryCollectionOptionCounts = libraryFilterState.collectionOptionCounts;
  $: libraryTagOptionCounts = libraryFilterState.tagOptionCounts;
  $: libraryFormatSummary = libraryFilterState.formatSummary;
  $: libraryCollectionSummary = libraryFilterState.collectionSummary;
  $: libraryTagSummary = libraryFilterState.tagSummary;
  $: libraryCoverSummary = libraryFilterState.coverSummary;
  $: ({ groupBy: libraryGroupBy, groupScope: libraryGroupScope, trail: libraryBrowseTrail } =
    getLibraryBrowseStateFromUrl($page.url));
  $: libraryActiveFilterDetail = libraryActiveFilterState.activeFilterDetail;
  $: libraryActiveFilterChips = libraryActiveFilterState.activeFilterChips;
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
  $: if (libraryGroupBy === 'none' && libraryGroupScope) {
    void syncLibraryBrowseLocation({ groupBy: 'none', groupScope: '', trail: [] });
  }
  $: if (!libraryGroupScope && libraryBrowseTrail.length > 0) {
    void syncLibraryBrowseLocation({ groupBy: libraryGroupBy, groupScope: '', trail: [] });
  }
  $: if (
    libraryGroupBy !== 'none' &&
    libraryGroupScope &&
    !libraryShelfBooks.some((book) => getLibraryGroupLabel(book, libraryGroupBy) === libraryGroupScope) &&
    !starterShelfBooks.some((book) => getLibraryGroupLabel(book, libraryGroupBy) === libraryGroupScope)
  ) {
    void syncLibraryBrowseLocation({ groupBy: libraryGroupBy, groupScope: '', trail: [] });
  }
  $: filteredRecoveryQueueBooks = desktopLibraryBrowse.filteredRecoveryQueueBooks;
  $: recoveryQueueReviewBooks = filteredRecoveryQueueBooks.map(
    (book): ContinueReadingBook => ({
      ...book,
      manualRelinkReview: buildManualRelinkReview(book)
    })
  );
  $: bulkRepairEligibleQueueBooks = filteredRecoveryQueueBooks.filter((book) => {
    const persistedRecord = lookupPersistedRecordForBook(book);
    return !!persistedRecord && isPersistedRecordBulkRepairEligible(persistedRecord);
  });
  $: manualRepairQueueCount = Math.max(
    0,
    filteredRecoveryQueueBooks.length - bulkRepairEligibleQueueBooks.length
  );
  $: recoveryQueueSummaryText =
    filteredRecoveryQueueBooks.length > 0
      ? `共 ${filteredRecoveryQueueBooks.length} 本待处理；${bulkRepairEligibleQueueBooks.length} 本可批量修复副本，${manualRepairQueueCount} 本需逐本复核重关联。`
      : '这些书的原文件路径或书库副本已经失效。优先逐本修复，避免后续继续扩散为重复条目。';
  $: libraryStatusSummary =
    desktopLibraryMode && filteredRecoveryQueueBooks.length > 0
      ? `待修复 ${filteredRecoveryQueueBooks.length} · 可批量 ${bulkRepairEligibleQueueBooks.length} · 需复核 ${manualRepairQueueCount}`
      : '';
  $: filteredContinueReadingBooks = desktopLibraryBrowse.filteredContinueReadingBooks;
  $: filteredRecentReadingBooks = desktopLibraryBrowse.filteredRecentReadingBooks;
  $: filteredLibraryBrowseBooks = desktopLibraryBrowse.filteredBrowseBooks;
  $: filteredLibraryShelfBooks = desktopLibraryBrowse.filteredShelfBooks;
  $: libraryGroupedBrowseMode = desktopLibraryBrowse.groupedBrowseMode;
  $: visibleLibraryBooksCount = desktopLibraryBrowse.visibleBooksCount;
  $: readingWorkflowNotice = desktopLibraryBrowse.workflowNotice;
  $: starterLibraryBrowse = buildStarterLibraryBrowseDerivations({
    books: starterLibraryBooks,
    query: libraryQuery,
    sortBy: librarySortBy,
    filterBy: libraryFilterBy,
    formatFilter: libraryFormatFilter,
    collectionFilter: libraryCollectionFilter,
    tagFilter: libraryTagFilter,
    groupBy: libraryGroupBy,
    groupScope: libraryGroupScope
  });
  $: starterContinueReadingBooks = starterLibraryBrowse.continueReadingBooks;
  $: starterRecentReadingBooks = starterLibraryBrowse.recentReadingBooks;
  $: starterShelfBooks = starterLibraryBrowse.shelfBooks;
  $: filteredStarterContinueReadingBooks = starterLibraryBrowse.filteredContinueReadingBooks;
  $: filteredStarterRecentReadingBooks = starterLibraryBrowse.filteredRecentReadingBooks;
  $: filteredStarterBrowseBooks = starterLibraryBrowse.filteredBrowseBooks;
  $: filteredStarterShelfBooks = starterLibraryBrowse.filteredShelfBooks;
  $: visibleStarterLibraryBooksCount = starterLibraryBrowse.visibleBooksCount;
  $: libraryFilterSummary = isLibraryViewFiltered({
    searchActive: librarySearchActive,
    filterBy: libraryFilterBy,
    formatFilter: libraryFormatFilter,
    collectionFilter: libraryCollectionFilter,
    tagFilter: libraryTagFilter
  })
    ? `筛选命中 ${
        desktopLibraryMode ? visibleLibraryBooksCount : visibleStarterLibraryBooksCount
      } / ${importedBooks.length || starterLibraryBooks.length} 本`
    : '';
  $: starterReadingWorkflowNotice = starterLibraryBrowse.workflowNotice;
  $: currentLibraryBrowseState = getCurrentLibraryBrowseState();
  $: desktopLibraryPageSurfaceModel = buildDesktopLibraryPageSurfaceModel({
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
    body: {
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
      onOpenSourcePath: handleOpenSourcePath,
      onImportBooks: triggerImportPicker,
      onRepairBook: handleRepairLibraryBook,
      onRemoveBook: handleRemoveLibraryBook,
      onBulkRepairBooks: handleBulkRepairLibraryBooks,
      onReadestMigration: handleReadestMigrationClick,
      onClearFilterById: clearLibraryFilterById,
      onClearFilters: handleClearLibraryFilters,
      getEmptyFilterTitle: getLibraryEmptyFilterTitle
    }
  });
  $: starterLibraryPageSurfaceModel = buildStarterLibraryPageSurfaceModel({
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
    body: {
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
      onClearFilterById: clearLibraryFilterById,
      onClearFilters: handleClearLibraryFilters,
      getEmptyFilterTitle: getLibraryEmptyFilterTitle
    }
  });
  $: activeLibraryPageSurfaceModel = desktopLibraryMode
    ? desktopLibraryPageSurfaceModel
    : starterLibraryPageSurfaceModel;
  $: nextLibraryScrollContextKey = buildLibraryScrollContextKey();
  $: if (typeof window !== 'undefined' && nextLibraryScrollContextKey !== libraryScrollContextKey) {
    const previousKey = libraryScrollContextKey;
    libraryScrollContextKey = nextLibraryScrollContextKey;
    void syncLibraryScrollContext(previousKey, libraryScrollContextKey);
  }

  const clearLibraryNotice = () => {
    libraryNotice = null;
  };

  const setLibraryNotice = (
    kind: 'error' | 'info',
    message: string,
    action?: { label: string; run: () => void | Promise<void> }
  ) => {
    libraryNotice = createLibraryNotice(kind, message, action);
  };

  const runLibraryNoticeAction = () => {
    runSharedLibraryNoticeAction(libraryNotice);
  };

  const handleOpenReaderTarget = async (target: string | LibraryReaderTarget) => {
    clearLibraryNotice();
    const href = typeof target === 'string' ? target : target.href;
    const opened = await openReaderTarget(target);
    if (!opened && typeof window !== 'undefined') {
      window.location.href = href;
    }
  };

  const handleOpenSourcePath = async (filePath: string) => {
    try {
      clearLibraryNotice();
      await openLibraryBookPath(filePath);
    } catch (error) {
      console.error('Failed to open the original book path', error);
      setLibraryNotice('error', '无法打开原文件，请确认当前运行在桌面环境且文件路径仍然有效。');
    }
  };

  const triggerImportPicker = async () => {
    if (canPersistLibrary()) {
      await importDesktopLibraryBooks({
        clearLibraryNotice,
        setLibraryNotice,
        importBooksFromDesktopPicker,
        reloadLibrary: loadLibrary,
        setShowReadestMigration: (value) => {
          showReadestMigration = value;
        },
        onOpenReaderTarget: handleOpenReaderTarget
      });
      return;
    }

    if (!importInput) return;
    if (typeof importInput.showPicker === 'function') {
      try {
        await importInput.showPicker();
        return;
      } catch (error) {
        console.warn('showPicker() failed in library import flow, falling back to click()', error);
      }
    }
    importInput.click();
  };

  const handleImportChange = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const [file] = input.files ?? [];
    if (!file) return;

    clearLibraryNotice();
    const objectUrl = URL.createObjectURL(file);
    await handleOpenReaderTarget(toAssetReaderTarget(objectUrl, file.name));

    input.value = '';
  };

  const triggerReadestMigration = async ({
    autoOpenFirstBook = true,
    reloadAfterImport = true
  }: {
    autoOpenFirstBook?: boolean;
    reloadAfterImport?: boolean;
  } = {}) => {
    if (!canPersistLibrary() || migrationBusy) return;

    await migrateDesktopReadestLibrary({
      migrationBusy,
      setMigrationBusy: (value) => {
        migrationBusy = value;
      },
      clearLibraryNotice,
      setLibraryNotice,
      importBooksFromReadest,
      reloadLibrary: loadLibrary,
      loadPersistedLibraryBooks,
      applyPersistedLibraryRecords,
      setShowReadestMigration: (value) => {
        showReadestMigration = value;
      },
      onOpenReaderTarget: handleOpenReaderTarget,
      autoOpenFirstBook,
      reloadAfterImport
    });
  };

  const handleReadestMigrationClick = () => {
    void triggerReadestMigration();
  };

  const reloadLibraryAfterRepair = async () => {
    const currentRecords = await loadPersistedLibraryBooks();
    await applyPersistedLibraryRecords(currentRecords);
  };

  const restoreRemovedLibraryRecord = async (record: PersistedLibraryBook) => {
    await restoreRemovedLibraryRecordFromDesktop({
      record,
      clearLibraryNotice,
      setLibraryNotice,
      restoreRemovedLibraryBook,
      applyPersistedLibraryRecords
    });
  };

  const handleRemoveLibraryBook = async (book: LibraryShelfBook) => {
    if (!canPersistLibrary()) return;

    await removeLibraryBookFromDesktop({
      book,
      persistedRecord: lookupPersistedRecordForBook(book),
      clearLibraryNotice,
      setLibraryNotice,
      confirmRemoval: (message) =>
        typeof window === 'undefined' || window.confirm(message),
      removeLibraryBook,
      applyPersistedLibraryRecords,
      onRestoreRemovedRecord: restoreRemovedLibraryRecord
    });
  };

  const handleUpdateLibraryBookMetadata = async (
    book: LibraryShelfBook,
    metadata: {
      title: string;
      author: string;
      description?: string;
      language?: string;
      publisher?: string;
      collection?: string;
      tags?: string[];
    }
  ) => {
    if (!canPersistLibrary()) return;

    await updateDesktopLibraryBookMetadata({
      book,
      persistedRecord: lookupPersistedRecordForBook(book),
      metadata,
      clearLibraryNotice,
      setLibraryNotice,
      updateLibraryBookMetadata,
      applyPersistedLibraryRecords
    });
  };

  const handleRepairLibraryBook = async (book: LibraryShelfBook) => {
    if (!canPersistLibrary()) return;

    await repairDesktopLibraryBook({
      book,
      persistedRecord: lookupPersistedRecordForBook(book),
      clearLibraryNotice,
      setLibraryNotice,
      importLibraryBooks,
      selectSingleSystemBookPath,
      previewLibraryRepairCandidate,
      confirmReplacement: (message) =>
        typeof window === 'undefined' || window.confirm(message),
      reloadLibraryAfterRepair
    });
  };

  const handleBulkRepairLibraryBooks = async () => {
    if (!canPersistLibrary() || bulkRepairBusy) return;

    const eligibleRecords = bulkRepairEligibleQueueBooks
      .map((book) => lookupPersistedRecordForBook(book))
      .filter((record): record is PersistedLibraryBook => !!record && !!record.sourcePath);

    await bulkRepairDesktopLibraryBooks({
      eligibleRecords,
      bulkRepairBusy,
      setBulkRepairBusy: (busy) => {
        bulkRepairBusy = busy;
      },
      setBulkRepairSummary: (summary) => {
        bulkRepairSummary = summary;
      },
      clearLibraryNotice,
      setLibraryNotice,
      importLibraryBooks,
      loadPersistedLibraryBooks,
      applyPersistedLibraryRecords,
      getManualRepairCount: (records) =>
        getRecoveryQueuePersistedRecords(records).filter(isPersistedRecordManualRepairOnly).length
    });
  };

  const getCurrentLibraryBrowseState = () => ({
    groupBy: libraryGroupBy,
    groupScope: libraryGroupScope,
    trail: libraryBrowseTrail
  });

  const dispatchLibraryBrowseAction = async (action: LibraryBrowseAction) => {
    const nextState = getAppliedLibraryBrowseState(currentLibraryBrowseState, action);
    if (!nextState) return;
    await syncLibraryBrowseLocation(nextState);
  };

  const handleFilterByShelfStatus = (status: LibraryFilter) => {
    if (status === 'all') return;
    applyLibraryFilterControlsState(
      getNextLibraryFilterControlsState(getCurrentLibraryFilterControlsState(), {
        type: 'apply-shelf-status',
        filterBy: status
      })
    );
  };

  const handleFilterByShelfCollection = (collection: string) => {
    applyLibraryFilterControlsState(
      getNextLibraryFilterControlsState(getCurrentLibraryFilterControlsState(), {
        type: 'apply-shelf-collection',
        collection
      })
    );
  };

  const handleFilterByShelfFormat = (format: string) => {
    applyLibraryFilterControlsState(
      getNextLibraryFilterControlsState(getCurrentLibraryFilterControlsState(), {
        type: 'apply-shelf-format',
        format
      })
    );
  };

  const handleFilterByShelfTag = (tag: string) => {
    applyLibraryFilterControlsState(
      getNextLibraryFilterControlsState(getCurrentLibraryFilterControlsState(), {
        type: 'apply-shelf-tag',
        tag
      })
    );
  };

  const handleClearLibraryFilters = () => {
    applyLibraryFilterControlsState(
      getNextLibraryFilterControlsState(getCurrentLibraryFilterControlsState(), {
        type: 'reset-all'
      })
    );
  };

  const clearLibraryFilterById = (id: LibraryActiveFilterChip['id']) => {
    applyLibraryFilterControlsState(
      getNextLibraryFilterControlsState(getCurrentLibraryFilterControlsState(), {
        type: 'clear-chip',
        id
      })
    );
  };

</script>

<section class="library-page">
  <LibraryPageHost
    model={activeLibraryPageSurfaceModel}
    bind:fileInput={importInput}
    bind:scrollRef={libraryScrollRef}
    fileAccept={READER_FILE_INPUT_ACCEPT}
    onImportChange={handleImportChange}
    onDispatchBrowseAction={dispatchLibraryBrowseAction}
    onRunNoticeAction={runLibraryNoticeAction}
    onClearNotice={clearLibraryNotice}
    onReadestMigration={handleReadestMigrationClick}
    onQueryChange={(query) => {
      applyLibraryFilterControlsState(
        getNextLibraryFilterControlsState(getCurrentLibraryFilterControlsState(), {
          type: 'set-query',
          query
        })
      );
    }}
    onImportBooks={triggerImportPicker}
    onFilterChange={(filterBy) => {
      applyLibraryFilterControlsState(
        getNextLibraryFilterControlsState(getCurrentLibraryFilterControlsState(), {
          type: 'set-status',
          filterBy
        })
      );
    }}
    onFormatFilterChange={(format) => {
      applyLibraryFilterControlsState(
        getNextLibraryFilterControlsState(getCurrentLibraryFilterControlsState(), {
          type: 'set-format',
          format
        })
      );
    }}
    onCollectionFilterChange={(collection) => {
      applyLibraryFilterControlsState(
        getNextLibraryFilterControlsState(getCurrentLibraryFilterControlsState(), {
          type: 'set-collection',
          collection
        })
      );
    }}
    onTagFilterChange={(tag) => {
      applyLibraryFilterControlsState(
        getNextLibraryFilterControlsState(getCurrentLibraryFilterControlsState(), {
          type: 'set-tag',
          tag
        })
      );
    }}
    onClearFilterChip={clearLibraryFilterById}
    onClearFilters={handleClearLibraryFilters}
    onJumpTrail={(index) => {
      void dispatchLibraryBrowseAction({
        type: 'jump-trail',
        index
      });
    }}
    onSortChange={(sortBy) => {
      librarySortBy = sortBy;
    }}
    onViewModeChange={(viewMode) => {
      libraryViewMode = viewMode;
    }}
    onOpenLink={handleOpenReaderTarget}
    onOpenSourcePath={handleOpenSourcePath}
    onUpdateBookMetadata={handleUpdateLibraryBookMetadata}
    onRemoveBook={handleRemoveLibraryBook}
    onFilterStatus={handleFilterByShelfStatus}
    onFilterFormat={handleFilterByShelfFormat}
    onFilterCollection={handleFilterByShelfCollection}
    onFilterTag={handleFilterByShelfTag}
  />
</section>

<style>
  .library-page {
    min-height: 100%;
    display: grid;
  }
</style>

<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
  import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-svelte';
  import type { ContinueReadingBook, LibraryShelfBook, ManualRelinkReview } from '$lib/library/types';
  import { BookshelfPreview, ContinueReadingShelf, LibraryHeader } from '$lib/components';
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
  type LibraryFilter = 'all' | 'reading' | 'unstarted' | 'finished';

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
  let libraryFilterBy: LibraryFilter = 'all';
  let libraryQuery = '';
  let librarySearchActive = false;
  let persistedLibraryRecords: PersistedLibraryBook[] = [];
  let searchedLibraryBooks: LibraryShelfBook[] = [];
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
  let filteredLibraryShelfBooks: LibraryShelfBook[] = [];
  let filteredStarterContinueReadingBooks: LibraryShelfBook[] = [];
  let filteredStarterRecentReadingBooks: LibraryShelfBook[] = [];
  let filteredStarterShelfBooks: LibraryShelfBook[] = [];
  let visibleLibraryBooksCount = 0;
  let readingWorkflowNotice:
    | {
        title: string;
        message: string;
      }
    | null = null;
  let libraryScrollContextKey = '';
  let libraryNotice:
    | {
        kind: 'error' | 'info';
        message: string;
        actionLabel?: string;
        action?: () => void | Promise<void>;
      }
    | null = null;
  let starterReadingWorkflowNotice:
    | {
        title: string;
        message: string;
      }
    | null = null;

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

  const getLibraryBookKey = (book: LibraryShelfBook) => book.readerHref || `${book.title}::${book.author}`;

  const isBrokenLibraryBook = (book: LibraryShelfBook) =>
    book.availabilityLabel?.includes('缺失') ?? false;

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

  const getBookProgressFraction = (book: LibraryShelfBook) => {
    if (typeof book.progressFraction === 'number') {
      return Math.max(0, Math.min(1, book.progressFraction));
    }
    if (!book.progressPercentLabel) return null;

    const parsedPercent = Number(book.progressPercentLabel.replace('%', ''));
    if (!Number.isFinite(parsedPercent)) return null;
    return Math.max(0, Math.min(1, parsedPercent / 100));
  };

  const hasBookBeenOpened = (book: LibraryShelfBook) =>
    typeof book.lastOpenedAt === 'number' && book.lastOpenedAt > 0;

  const isBookFinished = (book: LibraryShelfBook) => {
    const progressFraction = getBookProgressFraction(book);
    return progressFraction !== null && progressFraction >= 1;
  };

  const isBookInProgress = (book: LibraryShelfBook) => {
    if (!hasBookBeenOpened(book)) return false;
    const progressFraction = getBookProgressFraction(book);
    return progressFraction !== null && progressFraction > 0 && progressFraction < 1;
  };

  const isBookUnstarted = (book: LibraryShelfBook) => {
    const progressFraction = getBookProgressFraction(book);
    if (progressFraction !== null) return progressFraction <= 0;
    return !hasBookBeenOpened(book);
  };

  const getContinueReadingBooks = (books: LibraryShelfBook[]) =>
    books.filter((book) => isBookInProgress(book)).slice(0, 3);

  const getRecoveryQueueBooks = (books: LibraryShelfBook[]) =>
    books.filter((book) => isBrokenLibraryBook(book)).slice(0, 6);

  const getRecentReadingBooks = (
    books: LibraryShelfBook[],
    continueReading: LibraryShelfBook[]
  ) => {
    const continueKeys = new Set(continueReading.map(getLibraryBookKey));

    return books
      .filter((book) => hasBookBeenOpened(book))
      .filter((book) => {
        return !continueKeys.has(getLibraryBookKey(book));
      })
      .slice(0, 6);
  };

  const sortBooksForDisplay = (
    books: LibraryShelfBook[],
    sortBy: 'recent' | 'added' | 'title' | 'author' | 'format'
  ) =>
    [...books].sort((left, right) => {
      if (sortBy === 'title') {
        return left.title.localeCompare(right.title, 'zh-Hans-CN');
      }
      if (sortBy === 'author') {
        return left.author.localeCompare(right.author, 'zh-Hans-CN');
      }
      if (sortBy === 'format') {
        return left.format.localeCompare(right.format, 'en');
      }
      if (sortBy === 'added') {
        const leftAdded = left.importedAt ?? 0;
        const rightAdded = right.importedAt ?? 0;
        if (leftAdded !== rightAdded) return rightAdded - leftAdded;
        return left.title.localeCompare(right.title, 'zh-Hans-CN');
      }

      const leftRecent = left.lastOpenedAt ?? 0;
      const rightRecent = right.lastOpenedAt ?? 0;
      if (leftRecent !== rightRecent) return rightRecent - leftRecent;
      return left.title.localeCompare(right.title, 'zh-Hans-CN');
    });

  const normalizeLibrarySearchText = (value: string) => value.trim().toLowerCase();

  const matchesLibraryQuery = (book: LibraryShelfBook, query: string) => {
    if (!query) return true;

    const haystack = [
      book.title,
      book.author,
      book.status,
      book.progress,
      book.description,
      book.language,
      book.publisher,
      book.sourceLabel,
      book.availabilityLabel,
      book.format
    ]
      .filter((value): value is string => !!value)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  };

  const getLibraryShelfBooks = (
    books: LibraryShelfBook[],
    continueReading: LibraryShelfBook[]
  ) => {
    const continueKeys = new Set(continueReading.map(getLibraryBookKey));

    return books.filter((book) => {
      return !continueKeys.has(getLibraryBookKey(book));
    });
  };

  const getFilteredBooks = (books: LibraryShelfBook[], query: string) => {
    const normalizedQuery = normalizeLibrarySearchText(query);
    if (!normalizedQuery) return books;
    return books.filter((book) => matchesLibraryQuery(book, normalizedQuery));
  };

  const matchesLibraryFilter = (book: LibraryShelfBook, filterBy: LibraryFilter) => {
    if (filterBy === 'all') return true;
    if (filterBy === 'reading') return isBookInProgress(book);
    if (filterBy === 'finished') return isBookFinished(book);
    return isBookUnstarted(book);
  };

  const filterBooksByLibraryFilter = (books: LibraryShelfBook[], filterBy: LibraryFilter) =>
    books.filter((book) => matchesLibraryFilter(book, filterBy));

  const getLibraryFilterLabel = (filterBy: LibraryFilter) => {
    if (filterBy === 'reading') return '在读';
    if (filterBy === 'unstarted') return '未开始';
    if (filterBy === 'finished') return '已读完';
    return '全部';
  };

  const getLibraryViewport = () => libraryScrollRef?.osInstance()?.elements().viewport ?? null;

  const buildLibraryScrollContextKey = () =>
    [
      'br1-library-scroll',
      desktopLibraryMode ? 'desktop' : 'web',
      libraryViewMode,
      librarySortBy,
      libraryFilterBy,
      librarySearchActive ? normalizeLibrarySearchText(libraryQuery) : 'browse'
    ].join(':');

  const saveLibraryScrollPosition = (contextKey: string) => {
    if (typeof window === 'undefined' || !contextKey) return;
    const viewport = getLibraryViewport();
    if (!viewport) return;
    window.sessionStorage.setItem(contextKey, String(viewport.scrollTop));
  };

  const restoreLibraryScrollPosition = async (contextKey: string) => {
    if (typeof window === 'undefined' || !contextKey) return;
    await tick();
    const viewport = getLibraryViewport();
    if (!viewport) return;
    const savedPosition = window.sessionStorage.getItem(contextKey);
    viewport.scrollTop = savedPosition ? Number(savedPosition) || 0 : 0;
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
    desktopLibraryMode = true;

    const records = await loadPersistedLibraryBooks();
    const readestSummary = await detectReadestLibrary();
    readestLibraryCount = readestSummary.count;

    if (records.length === 0 && readestSummary.available) {
      await triggerReadestMigration({ autoOpenFirstBook: false, reloadAfterImport: false });
      const migratedRecords = await loadPersistedLibraryBooks();
      await applyPersistedLibraryRecords(migratedRecords);
      showReadestMigration = readestSummary.available;
      return;
    }

    await applyPersistedLibraryRecords(records);
    showReadestMigration = readestSummary.available;
  };

  onMount(() => {
    void loadLibrary();

    const handleBeforeUnload = () => {
      saveLibraryScrollPosition(libraryScrollContextKey);
    };

    const handleWindowFocus = () => {
      void loadLibrary();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      void loadLibrary();
    };

    const attachViewportListener = () => {
      const viewport = getLibraryViewport();
      if (!viewport) return () => {};
      const handleScroll = () => {
        saveLibraryScrollPosition(libraryScrollContextKey);
      };
      viewport.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        viewport.removeEventListener('scroll', handleScroll);
      };
    };

    let detachViewportListener = attachViewportListener();
    const refreshViewportListener = window.setInterval(() => {
      const viewport = getLibraryViewport();
      if (!viewport) return;
      detachViewportListener();
      detachViewportListener = attachViewportListener();
      window.clearInterval(refreshViewportListener);
    }, 120);

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let detachLibraryReloadListener = () => {};
    if (canPersistLibrary()) {
      void (async () => {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          detachLibraryReloadListener = await getCurrentWindow().listen(
            LIBRARY_SURFACE_RELOAD_EVENT,
            () => {
              void loadLibrary();
            }
          );
        } catch (error) {
          console.warn('Failed to attach the library surface reload listener', error);
        }
      })();
    }

    return () => {
      window.clearInterval(refreshViewportListener);
      detachViewportListener();
      detachLibraryReloadListener();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      saveLibraryScrollPosition(libraryScrollContextKey);
    };
  });

  $: librarySearchActive = normalizeLibrarySearchText(libraryQuery).length > 0;
  $: searchedLibraryBooks = getFilteredBooks(
    sortBooksForDisplay(importedBooks, librarySortBy),
    libraryQuery
  );
  $: recoveryQueueBooks = librarySearchActive
    ? []
    : getRecoveryQueueBooks(sortBooksForDisplay(importedBooks, 'recent'));
  $: continueReadingBooks = librarySearchActive ? [] : getContinueReadingBooks(importedBooks);
  $: recentReadingBooks = librarySearchActive
    ? []
    : getRecentReadingBooks(sortBooksForDisplay(importedBooks, 'recent'), continueReadingBooks);
  $: libraryShelfBooks = librarySearchActive
    ? searchedLibraryBooks
    : getLibraryShelfBooks(
        sortBooksForDisplay(importedBooks, librarySortBy),
        [...continueReadingBooks, ...recentReadingBooks]
      );
  $: filteredRecoveryQueueBooks = filterBooksByLibraryFilter(recoveryQueueBooks, libraryFilterBy);
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
  $: filteredContinueReadingBooks = filterBooksByLibraryFilter(continueReadingBooks, libraryFilterBy);
  $: filteredRecentReadingBooks = filterBooksByLibraryFilter(recentReadingBooks, libraryFilterBy);
  $: filteredLibraryShelfBooks = filterBooksByLibraryFilter(libraryShelfBooks, libraryFilterBy);
  $: visibleLibraryBooksCount =
    filteredRecoveryQueueBooks.length +
    filteredContinueReadingBooks.length +
    filteredRecentReadingBooks.length +
    filteredLibraryShelfBooks.length;
  $: readingWorkflowNotice = !librarySearchActive && libraryFilterBy === 'all'
    ? (() => {
        const hasReadingHistory = importedBooks.some(
          (book) => hasBookBeenOpened(book)
        );
        const hasFinishedBooks = importedBooks.some((book) => isBookFinished(book));
        const hasUnstartedBooks = importedBooks.some((book) => isBookUnstarted(book));

        if (filteredContinueReadingBooks.length > 0) return null;
        if (filteredRecentReadingBooks.length > 0) {
          return {
            title: '当前没有进行中的书',
            message: '最近阅读保留在下方；重新打开任意一本未读完的书后，它会重新回到继续阅读。'
          };
        }
        if (!hasReadingHistory && hasUnstartedBooks) {
          return {
            title: '继续阅读还没有建立',
            message: '先打开一本到 reader，书库会在下次回到这里时把它放进继续阅读。'
          };
        }
        if (hasFinishedBooks) {
          return {
            title: '最近没有在读书',
            message: '已读完的书仍保留在书库里；重新打开任意一本书后，继续阅读会重新出现。'
          };
        }
        return null;
      })()
    : null;
  $: starterContinueReadingBooks = librarySearchActive ? [] : getContinueReadingBooks(starterLibraryBooks);
  $: starterRecentReadingBooks = librarySearchActive
    ? []
    : getRecentReadingBooks(sortBooksForDisplay(starterLibraryBooks, 'recent'), starterContinueReadingBooks);
  $: starterShelfBooks = librarySearchActive
    ? getFilteredBooks(sortBooksForDisplay(starterLibraryBooks, librarySortBy), libraryQuery)
    : getLibraryShelfBooks(
        sortBooksForDisplay(starterLibraryBooks, librarySortBy),
        [...starterContinueReadingBooks, ...starterRecentReadingBooks]
      );
  $: filteredStarterContinueReadingBooks = filterBooksByLibraryFilter(
    starterContinueReadingBooks,
    libraryFilterBy
  );
  $: filteredStarterRecentReadingBooks = filterBooksByLibraryFilter(
    starterRecentReadingBooks,
    libraryFilterBy
  );
  $: filteredStarterShelfBooks = filterBooksByLibraryFilter(starterShelfBooks, libraryFilterBy);
  $: starterReadingWorkflowNotice = !librarySearchActive && libraryFilterBy === 'all'
    ? (() => {
        if (filteredStarterContinueReadingBooks.length > 0) return null;
        if (filteredStarterRecentReadingBooks.length > 0) {
          return {
            title: '样例书架当前没有进行中的书',
            message: '最近阅读保留在下方；重新打开任意一本未读完的样例书后，它会回到继续阅读。'
          };
        }
        return null;
      })()
    : null;
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
    libraryNotice = {
      kind,
      message,
      actionLabel: action?.label,
      action: action?.run
    };
  };

  const runLibraryNoticeAction = () => {
    if (!libraryNotice?.action) return;
    void libraryNotice.action();
  };

  const describeReadestMigrationResult = (result: Awaited<ReturnType<typeof importBooksFromReadest>>) => {
    const totalDetected = result.totalDetected ?? 0;
    const importedCount = result.importedCount ?? result.records.length;
    const replacedCount = result.replacedCount ?? 0;
    const skippedMissingFiles = result.skippedMissingFiles ?? 0;
    const syncedCount = importedCount;

    if (result.kind === 'empty') {
      if (totalDetected > 0 && skippedMissingFiles > 0) {
        return `发现 ${totalDetected} 本 Readest 藏书，但有 ${skippedMissingFiles} 本缺少本地文件，暂时无法兼容。`;
      }
      return '没有从 Readest 迁移到可用书籍，请确认本机 Readest 书库仍然完整。';
    }

    const messageParts = [`已同步 ${syncedCount} 本 Readest 藏书`];
    if (replacedCount > 0) {
      messageParts.push(`刷新了 ${replacedCount} 本已有兼容记录`);
    }
    if (skippedMissingFiles > 0) {
      messageParts.push(`跳过了 ${skippedMissingFiles} 本缺少本地文件的条目`);
    }

    return `${messageParts.join('，')}。`;
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
      try {
        clearLibraryNotice();
        const result = await importBooksFromDesktopPicker();
        if (result.kind === 'cancelled') return;
        if (result.kind === 'empty') {
          setLibraryNotice('info', '没有导入到可用书籍，请确认所选文件仍然存在且格式受支持。');
          return;
        }
        await loadLibrary();
        showReadestMigration = false;
        if (result.firstReaderTarget) {
          await handleOpenReaderTarget(result.firstReaderTarget);
        }
      } catch (error) {
        console.error('Failed to open the desktop import picker', error);
        setLibraryNotice('error', '无法完成桌面导入，请确认文件选择器和导入权限正常。');
      }
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

    migrationBusy = true;
    try {
      clearLibraryNotice();
      const result = await importBooksFromReadest();
      const migrationMessage = describeReadestMigrationResult(result);
      if (result.kind === 'empty') {
        showReadestMigration = true;
        setLibraryNotice('info', migrationMessage);
        return;
      }
      if (reloadAfterImport) {
        await loadLibrary();
      } else {
        const currentRecords = await loadPersistedLibraryBooks();
        await applyPersistedLibraryRecords(currentRecords);
      }
      showReadestMigration = true;

      if (autoOpenFirstBook && result.kind === 'imported') {
        if (result.firstReaderTarget) {
          await handleOpenReaderTarget(result.firstReaderTarget);
        }
      }
      setLibraryNotice('info', migrationMessage);
    } catch (error) {
      console.error('Failed to import books from Readest', error);
      setLibraryNotice('error', '从 Readest 导入失败，请确认本机书库路径和权限可用。');
    } finally {
      migrationBusy = false;
    }
  };

  const handleReadestMigrationClick = () => {
    void triggerReadestMigration();
  };

  const reloadLibraryAfterRepair = async () => {
    const currentRecords = await loadPersistedLibraryBooks();
    await applyPersistedLibraryRecords(currentRecords);
  };

  const restoreRemovedLibraryRecord = async (record: PersistedLibraryBook) => {
    try {
      clearLibraryNotice();
      const restoredRecords = await restoreRemovedLibraryBook(record);
      await applyPersistedLibraryRecords(restoredRecords);
      setLibraryNotice('info', `已恢复“${record.title}”到书库，并保留原有阅读状态。`);
    } catch (error) {
      console.error('Failed to restore removed library book', error);
      setLibraryNotice('error', `无法恢复“${record.title}”；请确认原文件仍然存在后重新导入。`);
    }
  };

  const handleRemoveLibraryBook = async (book: LibraryShelfBook) => {
    if (!canPersistLibrary()) return;

    const persistedRecord = lookupPersistedRecordForBook(book);
    if (!persistedRecord) {
      setLibraryNotice('error', '没有找到这本书的持久化记录，请先刷新书库后重试。');
      return;
    }

    const confirmed =
      typeof window === 'undefined' ||
      window.confirm(
        `从书库移除“${book.title}”？这只会删除 br1 的书库副本和记录，不会删除原文件。`
      );
    if (!confirmed) return;

    try {
      clearLibraryNotice();
      const updatedRecords = await removeLibraryBook(persistedRecord.filePath);
      await applyPersistedLibraryRecords(updatedRecords);
      const canRestoreFromSource =
        !!persistedRecord.sourcePath && persistedRecord.sourceFileExists !== false;
      setLibraryNotice(
        'info',
        canRestoreFromSource
          ? `已从书库移除“${book.title}”；原文件不会被删除，可从原文件撤销恢复。`
          : `已从书库移除“${book.title}”；原文件不会被删除。`,
        canRestoreFromSource
          ? {
              label: '撤销移除',
              run: () => restoreRemovedLibraryRecord(persistedRecord)
            }
          : undefined
      );
    } catch (error) {
      console.error('Failed to remove library book', error);
      setLibraryNotice('error', '无法从书库移除这本书，请确认书库记录仍然有效后重试。');
    }
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
    }
  ) => {
    if (!canPersistLibrary()) return;

    const persistedRecord = lookupPersistedRecordForBook(book);
    if (!persistedRecord) {
      setLibraryNotice('error', '没有找到这本书的持久化记录，请先刷新书库后重试。');
      return;
    }

    const nextTitle = metadata.title.trim();
    const nextAuthor = metadata.author.trim();
    if (!nextTitle || !nextAuthor) {
      setLibraryNotice('error', '标题和作者不能为空。');
      return;
    }

    try {
      clearLibraryNotice();
      const updatedRecords = await updateLibraryBookMetadata({
        recordId: persistedRecord.id || persistedRecord.filePath,
        title: nextTitle,
        author: nextAuthor,
        description: metadata.description ?? '',
        language: metadata.language ?? '',
        publisher: metadata.publisher ?? '',
        collection: metadata.collection ?? ''
      });
      await applyPersistedLibraryRecords(updatedRecords);
      setLibraryNotice('info', `已更新“${nextTitle}”的书库元数据。`);
    } catch (error) {
      console.error('Failed to update library book metadata', error);
      setLibraryNotice('error', '无法更新这本书的元数据，请确认书库记录仍然有效后重试。');
    }
  };

  const handleRepairLibraryBook = async (book: LibraryShelfBook) => {
    if (!canPersistLibrary()) return;

    const persistedRecord = lookupPersistedRecordForBook(book);
    if (!persistedRecord) {
      setLibraryNotice('error', '没有找到这本书的持久化记录，请先刷新书库后重试。');
      return;
    }

    const libraryCopyMissing = persistedRecord.libraryFileExists === false;
    const sourcePathAvailable =
      !!persistedRecord.sourcePath && persistedRecord.sourceFileExists !== false;

    try {
      clearLibraryNotice();

      let result: Awaited<ReturnType<typeof importBooksFromDesktopPicker>> | null = null;

      if (libraryCopyMissing && sourcePathAvailable && persistedRecord.sourcePath) {
        result = {
          kind: 'imported',
          records: await importLibraryBooks([persistedRecord.sourcePath]),
          firstRecord: null,
          firstReaderTarget: null,
          firstReaderHref: ''
        };
      } else {
        const selectedPath = await selectSingleSystemBookPath();
        if (!selectedPath) return;
        const candidatePreview = await previewLibraryRepairCandidate({
          filePath: selectedPath,
          expectedFormat: persistedRecord.format,
          expectedTitle: persistedRecord.title,
          expectedAuthor: persistedRecord.author,
          expectedSourcePath: persistedRecord.sourcePath
        });
        if (!candidatePreview.fileExists) {
          setLibraryNotice('error', '所选文件当前不可读，请确认文件仍然存在后再重试。');
          return;
        }
        if (
          !candidatePreview.formatMatches &&
          typeof window !== 'undefined' &&
          !window.confirm(
            `所选文件格式是 ${candidatePreview.format}，当前记录格式是 ${persistedRecord.format}。仍要用“${candidatePreview.fileName}”重关联这条记录吗？`
          )
        ) {
          setLibraryNotice('info', '已取消重关联；请选择与当前记录格式一致的替换文件。');
          return;
        }
        if (
          candidatePreview.formatMatches &&
          (!candidatePreview.titleMatches || !candidatePreview.authorMatches) &&
          typeof window !== 'undefined' &&
          !window.confirm(
            `所选文件识别为“${candidatePreview.title} / ${candidatePreview.author}”，当前记录是“${persistedRecord.title} / ${persistedRecord.author}”。仍要重关联吗？`
          )
        ) {
          setLibraryNotice('info', '已取消重关联；请选择与当前记录标题和作者更匹配的替换文件。');
          return;
        }
        if (
          candidatePreview.sourcePathMatches &&
          !candidatePreview.sourceHashMatches &&
          typeof window !== 'undefined' &&
          !window.confirm(
            `所选文件路径与原记录一致，但文件内容指纹不同。仍要用“${candidatePreview.fileName}”重建这条记录吗？`
          )
        ) {
          setLibraryNotice('info', '已取消重关联；请确认替换文件内容与当前记录一致后再继续。');
          return;
        }
        result = {
          kind: 'imported',
          records: await importLibraryBooks([selectedPath]),
          firstRecord: null,
          firstReaderTarget: null,
          firstReaderHref: ''
        };
      }

      if (!result || result.records.length === 0) {
        setLibraryNotice('info', `没有修复到“${book.title}”的可用文件，请确认所选文件仍然存在且格式受支持。`);
        return;
      }

      await reloadLibraryAfterRepair();
      setLibraryNotice(
        'info',
        libraryCopyMissing && sourcePathAvailable
          ? `已从原文件重建“${book.title}”的书库副本，原有阅读进度已保留。`
          : `已将“${book.title}”按原位修复方式重新关联到新文件；如果它仍显示缺失，请确认选择的是同一本书。`
      );
    } catch (error) {
      console.error('Failed to repair the library book', error);
      setLibraryNotice(
        'error',
        `无法修复“${book.title}”，请确认当前运行在桌面环境且所选文件可访问。`
      );
    }
  };

  const handleBulkRepairLibraryBooks = async () => {
    if (!canPersistLibrary() || bulkRepairBusy) return;

    const eligibleRecords = bulkRepairEligibleQueueBooks
      .map((book) => lookupPersistedRecordForBook(book))
      .filter((record): record is PersistedLibraryBook => !!record && !!record.sourcePath);

    if (eligibleRecords.length === 0) {
      bulkRepairSummary = '当前没有可自动批量修复的书库副本；这些条目需要逐本复核。';
      setLibraryNotice('info', '当前没有可自动批量修复的书库副本；其余条目仍需手动重新关联或重新选择文件。');
      return;
    }

    bulkRepairBusy = true;
    bulkRepairSummary = '';
    clearLibraryNotice();

    let repairedCount = 0;
    let failedCount = 0;

    try {
      for (const record of eligibleRecords) {
        try {
          const repairedRecords = await importLibraryBooks([record.sourcePath!]);
          if (repairedRecords.length > 0) {
            repairedCount += 1;
          } else {
            failedCount += 1;
          }
        } catch (error) {
          failedCount += 1;
          console.error('Failed to bulk repair the library book', error);
        }
      }

      const currentRecords = await loadPersistedLibraryBooks();
      await applyPersistedLibraryRecords(currentRecords);

      const manualRepairCount = getRecoveryQueuePersistedRecords(currentRecords).filter(
        isPersistedRecordManualRepairOnly
      ).length;

      if (repairedCount === 0) {
        setLibraryNotice(
          failedCount > 0 ? 'error' : 'info',
          manualRepairCount > 0
            ? `没有自动修复成功；当前仍有 ${manualRepairCount} 本需要手动重新关联或重新选择文件。`
            : '没有自动修复成功，请刷新书库后重试。'
        );
        bulkRepairSummary =
          failedCount > 0
            ? `批量修复失败：${failedCount} 本未能自动修复，仍需复核当前待修复队列。`
            : '批量修复没有恢复任何书库副本；请复核当前待修复队列。';
        return;
      }

      const summaryParts = [`已批量重建 ${repairedCount} 本书的书库副本`];
      if (manualRepairCount > 0) {
        summaryParts.push(`仍有 ${manualRepairCount} 本需要手动重新关联或重新选择文件`);
      } else {
        summaryParts.push('当前待修复队列里没有必须手动处理的条目了');
      }
      if (failedCount > 0) {
        summaryParts.push(`${failedCount} 本未能自动修复`);
      }
      const summary = `${summaryParts.join('，')}。`;
      bulkRepairSummary = summary;
      setLibraryNotice('info', summary);
    } finally {
      bulkRepairBusy = false;
    }
  };

  const handleLibraryViewModeChange = (nextViewMode: 'grid' | 'list') => {
    libraryViewMode = nextViewMode;
  };

  const handleLibraryQueryChange = (event: CustomEvent<{ query: string }>) => {
    libraryQuery = event.detail.query;
  };

  const handleLibrarySortChange = (
    event: CustomEvent<{ sortBy: 'recent' | 'added' | 'title' | 'author' | 'format' }>
  ) => {
    librarySortBy = event.detail.sortBy;
  };

  const handleLibraryFilterChange = (
    event: CustomEvent<{ filterBy: 'all' | 'reading' | 'unstarted' | 'finished' }>
  ) => {
    libraryFilterBy = event.detail.filterBy;
  };
</script>

<section class="library-page">
  <div class="library-surface">
    <input
      bind:this={importInput}
      class="import-input"
      type="file"
      accept={READER_FILE_INPUT_ACCEPT}
      on:change={handleImportChange}
    />

    <LibraryHeader
      totalBooks={importedBooks.length || starterLibraryBooks.length}
      query={libraryQuery}
      viewMode={libraryViewMode}
      sortBy={librarySortBy}
      activeFilter={libraryFilterBy}
      statusSummary={libraryStatusSummary}
      importDisabled={migrationBusy}
      on:querychange={handleLibraryQueryChange}
      on:importbooks={triggerImportPicker}
      on:filterchange={handleLibraryFilterChange}
      on:sortchange={handleLibrarySortChange}
      on:viewmodechange={(event) => handleLibraryViewModeChange(event.detail.viewMode)}
    />

    {#if libraryNotice}
      <section
        class:error={libraryNotice.kind === 'error'}
        class="library-notice"
        aria-live="polite"
      >
        <span>{libraryNotice.message}</span>
        <div class="notice-actions">
          {#if libraryNotice.actionLabel}
            <button type="button" class="notice-dismiss primary" on:click={runLibraryNoticeAction}>
              {libraryNotice.actionLabel}
            </button>
          {/if}
          <button type="button" class="notice-dismiss" on:click={clearLibraryNotice}>知道了</button>
        </div>
      </section>
    {/if}

    {#if showReadestMigration}
      <section class="migration-banner" aria-label="readest migration">
        <div class="migration-copy">
          <strong>发现 Readest 书库</strong>
          <span>
            本机找到 {readestLibraryCount} 本 Readest 藏书；
            {#if readestCompatibleCount > 0}
              当前已有 {readestCompatibleCount} 本以兼容方式进入 br1，可继续同步补齐新增内容。
            {:else}
              还没有兼容进 br1，可开始同步本地元数据、封面和阅读位置。
            {/if}
          </span>
        </div>
        <button type="button" class="migration-button" on:click={handleReadestMigrationClick}>
          {migrationBusy ? '兼容中…' : `同步 Readest 藏书`}
        </button>
      </section>
    {/if}

    <OverlayScrollbarsComponent
      bind:this={libraryScrollRef}
      defer
      element="div"
      class="library-scroll"
      options={{ scrollbars: { autoHide: 'leave', theme: 'os-theme-readest' } }}
    >
      {#if importedBooks.length}
        {#if readingWorkflowNotice}
          <section class="reading-workflow-note" aria-label="reading workflow note">
            <strong>{readingWorkflowNotice.title}</strong>
            <span>{readingWorkflowNotice.message}</span>
          </section>
        {/if}

        {#if filteredRecoveryQueueBooks.length}
          <ContinueReadingShelf
            sectionTitle="待修复书籍"
            sectionDescription={recoveryQueueSummaryText}
            primaryActionLabel="修复"
            bulkActionLabel={
              bulkRepairEligibleQueueBooks.length > 0
                ? bulkRepairBusy
                  ? '批量修复中…'
                  : `批量修复副本（${bulkRepairEligibleQueueBooks.length}）`
                : ''
            }
            bulkActionDisabled={bulkRepairBusy}
            operationSummary={bulkRepairSummary}
            books={recoveryQueueReviewBooks}
            onOpenLink={handleOpenReaderTarget}
            onOpenSourcePath={handleOpenSourcePath}
            onImportBooks={triggerImportPicker}
            onBulkAction={handleBulkRepairLibraryBooks}
            onRepairBook={handleRepairLibraryBook}
            onRemoveBook={handleRemoveLibraryBook}
          />
        {/if}

        {#if filteredContinueReadingBooks.length}
          <ContinueReadingShelf
            sectionTitle="继续阅读"
            sectionDescription="回到当前正在读的书。"
            primaryActionLabel="继续"
            books={filteredContinueReadingBooks}
            onOpenLink={handleOpenReaderTarget}
            onOpenSourcePath={handleOpenSourcePath}
            onImportBooks={triggerImportPicker}
            onRepairBook={handleRepairLibraryBook}
            onRemoveBook={handleRemoveLibraryBook}
          />
        {/if}

        {#if filteredRecentReadingBooks.length}
          <ContinueReadingShelf
            sectionTitle="最近阅读"
            sectionDescription="重新打开你最近看过，但当前不在继续阅读队列中的书。"
            primaryActionLabel="重开"
            books={filteredRecentReadingBooks}
            onOpenLink={handleOpenReaderTarget}
            onOpenSourcePath={handleOpenSourcePath}
            onImportBooks={triggerImportPicker}
            onRepairBook={handleRepairLibraryBook}
            onRemoveBook={handleRemoveLibraryBook}
          />
        {/if}

        <BookshelfPreview
          sectionTitle={librarySearchActive ? '搜索结果' : '你的书库'}
          books={filteredLibraryShelfBooks}
          viewMode={libraryViewMode}
          showImportTile={true}
          onOpenLink={handleOpenReaderTarget}
          onImportBooks={triggerImportPicker}
          onOpenSourcePath={handleOpenSourcePath}
          onUpdateBookMetadata={handleUpdateLibraryBookMetadata}
          onRemoveBook={handleRemoveLibraryBook}
        />
      {/if}

      {#if desktopLibraryMode}
        {#if !importedBooks.length}
          <section class="empty-library" aria-label="empty library">
            <div class="empty-copy">
              <strong>你的书库还是空的</strong>
              <span>
                可以从本机导入新书，或者先把已有的 Readest 书库迁进来。
              </span>
            </div>
            <div class="empty-actions">
              <button type="button" class="empty-action" on:click={triggerImportPicker}>
                从本机导入
              </button>
              {#if readestLibraryCount > 0}
                <button
                  type="button"
                  class="empty-action secondary"
                  on:click={handleReadestMigrationClick}
                >
                  {migrationBusy ? '兼容中…' : `同步 Readest 的 ${readestLibraryCount} 本书`}
                </button>
              {/if}
            </div>
          </section>
        {:else if libraryQuery && visibleLibraryBooksCount === 0}
          <section class="empty-library" aria-label="empty search results">
            <div class="empty-copy">
              <strong>没有找到匹配的书籍</strong>
              <span>
                试试搜索标题、作者、格式，或者调整当前的“{getLibraryFilterLabel(libraryFilterBy)}”筛选。
              </span>
            </div>
          </section>
        {:else if visibleLibraryBooksCount === 0}
          <section class="empty-library" aria-label="empty filtered library">
            <div class="empty-copy">
              <strong>{getLibraryFilterLabel(libraryFilterBy)} 当前没有匹配的书</strong>
              <span>切回“全部”查看完整书库，或重新打开一本书来更新它的阅读状态。</span>
            </div>
          </section>
        {/if}
      {:else}
        {#if starterReadingWorkflowNotice}
          <section class="reading-workflow-note" aria-label="sample reading workflow note">
            <strong>{starterReadingWorkflowNotice.title}</strong>
            <span>{starterReadingWorkflowNotice.message}</span>
          </section>
        {/if}

        {#if filteredStarterContinueReadingBooks.length}
          <ContinueReadingShelf
            sectionTitle="继续阅读"
            sectionDescription="回到当前正在读的样例书。"
            primaryActionLabel="继续"
            books={filteredStarterContinueReadingBooks}
            onOpenLink={handleOpenReaderTarget}
          />
        {/if}

        {#if filteredStarterRecentReadingBooks.length}
          <ContinueReadingShelf
            sectionTitle="最近阅读"
            sectionDescription="重新打开你最近看过的样例书。"
            primaryActionLabel="重开"
            books={filteredStarterRecentReadingBooks}
            onOpenLink={handleOpenReaderTarget}
          />
        {/if}

        <BookshelfPreview
          sectionTitle={librarySearchActive ? '搜索结果' : '你的书库'}
          books={filteredStarterShelfBooks}
          viewMode={libraryViewMode}
          showImportTile={true}
          onOpenLink={handleOpenReaderTarget}
          onImportBooks={triggerImportPicker}
        />
      {/if}
    </OverlayScrollbarsComponent>
  </div>
</section>

<style>
  .library-page {
    min-height: 100%;
    display: grid;
  }

  .library-surface {
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    border: 1px solid var(--line-soft);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-reader) 88%, white 12%);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.18) inset,
      0 18px 44px rgba(42, 30, 15, 0.06);
    padding: 14px 18px 0;
  }

  .import-input {
    display: none;
  }

  .migration-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 10px 14px;
    margin-top: 10px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 82%, white 18%);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 90%, white 10%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.3),
      0 8px 24px rgba(42, 30, 15, 0.05);
  }

  .library-notice {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 10px 14px;
    margin-top: 10px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 82%, white 18%);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 88%, white 12%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.24),
      0 8px 24px rgba(42, 30, 15, 0.05);
  }

  .library-notice.error {
    border-color: color-mix(in srgb, #b04133 28%, var(--line-soft) 72%);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0)),
      color-mix(in srgb, #fff2ee 82%, var(--surface-panel) 18%);
  }

  .library-notice span {
    font-size: 12px;
    line-height: 1.4;
    color: var(--text-primary);
  }

  .notice-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .notice-dismiss {
    border: 0;
    border-radius: 999px;
    padding: 8px 12px;
    background: color-mix(in srgb, var(--surface-reader) 80%, white 20%);
    color: var(--text-primary);
    font-family: var(--font-chrome);
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    box-shadow:
      inset 0 0 0 1px var(--border-light),
      0 6px 14px rgba(42, 30, 15, 0.06);
  }

  .notice-dismiss.primary {
    background: color-mix(in srgb, #dbeed8 78%, white 22%);
    color: color-mix(in srgb, #456246 84%, black 16%);
  }

  .migration-copy {
    display: grid;
    gap: 3px;
  }

  .migration-copy strong {
    font-family: var(--font-chrome);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--text-primary);
  }

  .migration-copy span {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .migration-button {
    border: 0;
    border-radius: 999px;
    padding: 10px 14px;
    background: color-mix(in srgb, var(--text-primary) 94%, white 6%);
    color: white;
    font-family: var(--font-chrome);
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    box-shadow: 0 10px 20px rgba(42, 30, 15, 0.12);
  }

  .reading-workflow-note {
    display: grid;
    gap: 4px;
    padding: 12px 14px;
    border: 1px solid color-mix(in srgb, var(--line-soft) 84%, white 16%);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0)),
      color-mix(in srgb, var(--surface-panel) 86%, white 14%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      0 10px 24px rgba(42, 30, 15, 0.04);
  }

  .reading-workflow-note strong {
    font-family: var(--font-chrome);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--text-primary);
  }

  .reading-workflow-note span {
    font-size: 12px;
    line-height: 1.45;
    color: var(--text-secondary);
  }

  .empty-library {
    display: grid;
    gap: 14px;
    align-content: start;
    padding: 26px 18px;
    border: 1px dashed color-mix(in srgb, var(--line-soft) 88%, white 12%);
    background: color-mix(in srgb, var(--surface-panel) 78%, white 22%);
  }

  .empty-copy {
    display: grid;
    gap: 4px;
  }

  .empty-copy strong {
    font-family: var(--font-chrome);
    font-size: 15px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--text-primary);
  }

  .empty-copy span {
    max-width: 52ch;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .empty-action {
    justify-self: start;
    border: 0;
    border-radius: 999px;
    padding: 10px 14px;
    background: color-mix(in srgb, var(--surface-reader) 80%, white 20%);
    color: var(--text-primary);
    font-family: var(--font-chrome);
    font-size: 12px;
    font-weight: 600;
    line-height: 1;
    box-shadow:
      inset 0 0 0 1px var(--border-light),
      0 10px 20px rgba(42, 30, 15, 0.06);
  }

  .empty-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .empty-action.secondary {
    background: transparent;
    box-shadow: inset 0 0 0 1px rgba(76, 57, 34, 0.12);
  }

  :global(.library-scroll) {
    min-height: 0;
    overflow: hidden;
    display: grid;
    align-content: start;
    gap: 18px;
    padding: 10px 2px 18px;
    overscroll-behavior: contain;
  }

  :global(.library-scroll .os-scrollbar.os-theme-readest) {
    --os-size: 10px;
    --os-padding-perpendicular: 2px;
    --os-padding-axis: 2px;
    --os-track-bg: transparent;
    --os-track-bg-hover: transparent;
    --os-track-bg-active: transparent;
    --os-track-border: none;
    --os-track-border-hover: none;
    --os-track-border-active: none;
    --os-handle-border-radius: 999px;
    --os-handle-bg: rgba(95, 85, 72, 0.12);
    --os-handle-bg-hover: rgba(95, 85, 72, 0.18);
    --os-handle-bg-active: rgba(95, 85, 72, 0.22);
    --os-handle-min-size: 28px;
    --os-handle-interactive-area-offset: 1px;
  }

  :global(.library-scroll .os-scrollbar-vertical.os-theme-readest) {
    --os-size: 8px;
  }

  @media (max-width: 900px) {
    .library-surface {
      padding: 12px 14px 0;
      border-left: 0;
      border-right: 0;
      box-shadow: none;
    }

    :global(.library-scroll) {
      gap: 16px;
      padding-bottom: 16px;
    }

    :global(.library-scroll .os-scrollbar.os-theme-readest) {
      --os-size: 8px;
      --os-padding-perpendicular: 1px;
      --os-padding-axis: 1px;
    }

    .migration-banner {
      grid-template-columns: 1fr;
      align-items: start;
    }
  }
</style>

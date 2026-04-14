<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { OverlayScrollbarsComponent } from 'overlayscrollbars-svelte';
  import type { OverlayScrollbarsComponentRef } from 'overlayscrollbars-svelte';
  import type { LibraryShelfBook } from '$lib/library/types';
  import { BookshelfPreview, ContinueReadingShelf, LibraryHeader } from '$lib/components';
  import type {
    LibraryReaderTarget,
    PersistedLibraryBook
  } from '$lib/services/libraryPersistence';
  import {
    canPersistLibrary,
    detectReadestLibrary,
    importBooksFromDesktopPicker,
    importBooksFromReadest,
    LIBRARY_SURFACE_RELOAD_EVENT,
    loadPersistedLibraryBooks,
    openLibraryBookPath,
    openReaderTarget,
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
  let libraryViewMode: 'grid' | 'list' = 'grid';
  let librarySortBy: 'recent' | 'added' | 'title' | 'author' | 'format' = 'recent';
  let libraryQuery = '';
  let librarySearchActive = false;
  let searchedLibraryBooks: LibraryShelfBook[] = [];
  let continueReadingBooks: LibraryShelfBook[] = [];
  let recentReadingBooks: LibraryShelfBook[] = [];
  let libraryShelfBooks: LibraryShelfBook[] = [];
  let starterContinueReadingBooks: LibraryShelfBook[] = [];
  let starterRecentReadingBooks: LibraryShelfBook[] = [];
  let starterShelfBooks: LibraryShelfBook[] = [];
  let filteredContinueReadingBooks: LibraryShelfBook[] = [];
  let filteredRecentReadingBooks: LibraryShelfBook[] = [];
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

  const mapLibraryRecord = async (record: PersistedLibraryBook): Promise<LibraryShelfBook> => {
    const isReadestCompatible = record.id.startsWith('readest-');
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

    const compatibilitySignals = [
      record.coverPath ? '封面' : '',
      record.description ? '简介' : '',
      record.language || record.publisher ? '元数据' : '',
      record.progressLocation || progressFraction !== null ? '阅读位置' : ''
    ].filter(Boolean);

    const compatibilityLabel = isReadestCompatible
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
      status: record.status,
      progress: record.progress,
      progressFraction,
      progressPercentLabel:
        progressFraction !== null
          ? `${Math.max(0, Math.min(100, Math.round(progressFraction * 100)))}%`
          : '',
      readingStatusLabel,
      sourceLabel,
      availabilityLabel: isReadestCompatible ? '兼容 Readest 本地藏书' : '本地可读',
      compatibilityLabel,
      sourcePath: record.sourcePath || record.filePath,
      coverUrl: await toLibraryCoverUrl(record),
      readerHref: toReaderAssetHref(record),
      restartHref: toReaderStartHref(record),
      lastOpenedAt: record.lastOpenedAt,
      lastOpenedLabel: formatLastOpenedLabel(record.lastOpenedAt),
      importedAt: record.importedAt
    };
  };

  const getLibraryBookKey = (book: LibraryShelfBook) => book.readerHref || `${book.title}::${book.author}`;

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

  const getLibraryViewport = () => libraryScrollRef?.osInstance()?.elements().viewport ?? null;

  const buildLibraryScrollContextKey = () =>
    [
      'br1-library-scroll',
      desktopLibraryMode ? 'desktop' : 'web',
      libraryViewMode,
      librarySortBy,
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

  const loadLibrary = async () => {
    if (!canPersistLibrary()) return;
    desktopLibraryMode = true;

    const records = await loadPersistedLibraryBooks();
    const readestSummary = await detectReadestLibrary();
    readestLibraryCount = readestSummary.count;
    readestCompatibleCount = records.filter((record) => record.id.startsWith('readest-')).length;

    if (records.length === 0 && readestSummary.available) {
      await triggerReadestMigration({ autoOpenFirstBook: false, reloadAfterImport: false });
      const migratedRecords = await loadPersistedLibraryBooks();
      importedBooks = await Promise.all(
        sortRecordsForLibraryShelf(migratedRecords).map(mapLibraryRecord)
      );
      showReadestMigration = migratedRecords.length === 0;
      return;
    }

    importedBooks = await Promise.all(sortRecordsForLibraryShelf(records).map(mapLibraryRecord));
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
  $: filteredContinueReadingBooks = continueReadingBooks;
  $: filteredRecentReadingBooks = recentReadingBooks;
  $: filteredLibraryShelfBooks = libraryShelfBooks;
  $: visibleLibraryBooksCount =
    filteredContinueReadingBooks.length +
    filteredRecentReadingBooks.length +
    filteredLibraryShelfBooks.length;
  $: readingWorkflowNotice = !librarySearchActive
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
  $: filteredStarterContinueReadingBooks = starterContinueReadingBooks;
  $: filteredStarterRecentReadingBooks = starterRecentReadingBooks;
  $: filteredStarterShelfBooks = starterShelfBooks;
  $: starterReadingWorkflowNotice = !librarySearchActive
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

  const setLibraryNotice = (kind: 'error' | 'info', message: string) => {
    libraryNotice = { kind, message };
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

        const records = sortRecordsForLibraryShelf(result.records);
        const mappedRecords = await Promise.all(records.map(mapLibraryRecord));
        importedBooks = [...mappedRecords, ...importedBooks];
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
      if (result.kind === 'empty') {
        showReadestMigration = true;
        setLibraryNotice('info', '没有从 Readest 迁移到可用书籍，请确认本机 Readest 书库仍然完整。');
        return;
      }
      const records = sortRecordsForLibraryShelf(result.records);
      if (reloadAfterImport) {
        await loadLibrary();
      }
      showReadestMigration = true;

      if (autoOpenFirstBook && result.kind === 'imported') {
        if (result.firstReaderTarget) {
          await handleOpenReaderTarget(result.firstReaderTarget);
        }
      }
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
</script>

<section class="library-page">
  <div class="library-surface">
    <input
      bind:this={importInput}
      class="import-input"
      type="file"
      accept=".epub,.pdf,.mobi,.azw3,.fb2"
      on:change={handleImportChange}
    />

    <LibraryHeader
      totalBooks={importedBooks.length || starterLibraryBooks.length}
      query={libraryQuery}
      viewMode={libraryViewMode}
      sortBy={librarySortBy}
      importDisabled={migrationBusy}
      on:querychange={handleLibraryQueryChange}
      on:importbooks={triggerImportPicker}
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
        <button type="button" class="notice-dismiss" on:click={clearLibraryNotice}>知道了</button>
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

        {#if filteredContinueReadingBooks.length}
          <ContinueReadingShelf
            sectionTitle="继续阅读"
            sectionDescription="回到当前正在读的书。"
            primaryActionLabel="继续"
            books={filteredContinueReadingBooks}
            onOpenLink={handleOpenReaderTarget}
            onOpenSourcePath={handleOpenSourcePath}
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
          />
        {/if}

        <BookshelfPreview
          sectionTitle={librarySearchActive ? '搜索结果' : '你的书库'}
          books={filteredLibraryShelfBooks}
          viewMode={libraryViewMode}
          showImportTile={true}
          onOpenLink={handleOpenReaderTarget}
          onImportBooks={triggerImportPicker}
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
              <span>试试搜索标题、作者、格式或当前阅读状态。</span>
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

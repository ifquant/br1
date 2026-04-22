import { filterBooksByLibraryGroupScope } from './navigation';
import type {
  LibraryActiveFilterChip,
  LibraryShelfBook
} from './types';

export type LibraryFilter = 'all' | 'reading' | 'unstarted' | 'finished';

export const getLibraryBookKey = (book: LibraryShelfBook) =>
  book.readerHref || `${book.title}::${book.author}`;

export const getBookProgressFraction = (book: LibraryShelfBook) => {
  if (typeof book.progressFraction === 'number') {
    return Math.max(0, Math.min(1, book.progressFraction));
  }
  if (!book.progressPercentLabel) return null;

  const parsedPercent = Number(book.progressPercentLabel.replace('%', ''));
  if (!Number.isFinite(parsedPercent)) return null;
  return Math.max(0, Math.min(1, parsedPercent / 100));
};

export const hasBookBeenOpened = (book: LibraryShelfBook) =>
  typeof book.lastOpenedAt === 'number' && book.lastOpenedAt > 0;

export const isBookFinished = (book: LibraryShelfBook) => {
  const progressFraction = getBookProgressFraction(book);
  return progressFraction !== null && progressFraction >= 1;
};

export const isBookInProgress = (book: LibraryShelfBook) => {
  if (!hasBookBeenOpened(book)) return false;
  const progressFraction = getBookProgressFraction(book);
  return progressFraction !== null && progressFraction > 0 && progressFraction < 1;
};

export const isBookUnstarted = (book: LibraryShelfBook) => {
  const progressFraction = getBookProgressFraction(book);
  if (progressFraction !== null) return progressFraction <= 0;
  return !hasBookBeenOpened(book);
};

export const getContinueReadingBooks = (books: LibraryShelfBook[]) =>
  books.filter((book) => isBookInProgress(book)).slice(0, 3);

export const getRecoveryQueueBooks = (books: LibraryShelfBook[]) =>
  books.filter((book) => book.availabilityLabel?.includes('缺失') ?? false).slice(0, 6);

export const getRecentReadingBooks = (
  books: LibraryShelfBook[],
  continueReading: LibraryShelfBook[]
) => {
  const continueKeys = new Set(continueReading.map(getLibraryBookKey));

  return books
    .filter((book) => hasBookBeenOpened(book))
    .filter((book) => !continueKeys.has(getLibraryBookKey(book)))
    .slice(0, 6);
};

export const sortBooksForDisplay = (
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

export const normalizeLibrarySearchText = (value: string) => value.trim().toLowerCase();

export const matchesLibraryQuery = (book: LibraryShelfBook, query: string) => {
  if (!query) return true;

  const haystack = [
    book.title,
    book.author,
    book.status,
    book.progress,
    book.description,
    book.language,
    book.publisher,
    book.collection,
    ...(book.tags ?? []),
    book.sourceLabel,
    book.availabilityLabel,
    book.format
  ]
    .filter((value): value is string => !!value)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
};

export const getLibraryShelfBooks = (
  books: LibraryShelfBook[],
  continueReading: LibraryShelfBook[]
) => {
  const continueKeys = new Set(continueReading.map(getLibraryBookKey));

  return books.filter((book) => !continueKeys.has(getLibraryBookKey(book)));
};

export const getFilteredBooks = (books: LibraryShelfBook[], query: string) => {
  const normalizedQuery = normalizeLibrarySearchText(query);
  if (!normalizedQuery) return books;
  return books.filter((book) => matchesLibraryQuery(book, normalizedQuery));
};

export const matchesLibraryFilter = (book: LibraryShelfBook, filterBy: LibraryFilter) => {
  if (filterBy === 'all') return true;
  if (filterBy === 'reading') return isBookInProgress(book);
  if (filterBy === 'finished') return isBookFinished(book);
  return isBookUnstarted(book);
};

export const filterBooksByLibraryFilter = (books: LibraryShelfBook[], filterBy: LibraryFilter) =>
  books.filter((book) => matchesLibraryFilter(book, filterBy));

export const getLibraryStatusOptionCounts = (books: LibraryShelfBook[]) => ({
  all: books.length,
  reading: books.filter((book) => matchesLibraryFilter(book, 'reading')).length,
  unstarted: books.filter((book) => matchesLibraryFilter(book, 'unstarted')).length,
  finished: books.filter((book) => matchesLibraryFilter(book, 'finished')).length
});

export const normalizeCollectionFilterValue = (value: string | null | undefined) =>
  value?.trim() || '未归类';

export const getLibraryCollectionOptions = (books: LibraryShelfBook[]) =>
  Array.from(
    new Set(
      books
        .map((book) => normalizeCollectionFilterValue(book.collection))
        .filter((collection) => collection !== '未归类')
    )
  ).sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'));

export const getLibraryTagOptions = (books: LibraryShelfBook[]) =>
  Array.from(new Set(books.flatMap((book) => book.tags ?? []))).sort((left, right) =>
    left.localeCompare(right, 'zh-Hans-CN')
  );

export const normalizeFormatFilterValue = (value: string | null | undefined) =>
  value?.trim().toUpperCase() || 'UNKNOWN';

export const getLibraryFormatOptions = (books: LibraryShelfBook[]) =>
  Array.from(new Set(books.map((book) => normalizeFormatFilterValue(book.format)))).sort(
    (left, right) => left.localeCompare(right, 'en')
  );

const mapCountsToRecord = (counts: Map<string, number>) =>
  Object.fromEntries(counts.entries()) as Record<string, number>;

const countByLabel = (labels: string[]) =>
  labels.reduce((counts, label) => {
    const normalized = label.trim();
    if (!normalized) return counts;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());

const getTopCountEntry = (counts: Map<string, number>) =>
  Array.from(counts.entries()).sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1];
    return left[0].localeCompare(right[0], 'zh-Hans-CN');
  })[0] ?? null;

export const getLibraryCollectionOptionCounts = (books: LibraryShelfBook[]) =>
  mapCountsToRecord(
    countByLabel(
      books
        .map((book) => normalizeCollectionFilterValue(book.collection))
        .filter((collection) => collection !== '未归类')
    )
  );

export const getLibraryTagOptionCounts = (books: LibraryShelfBook[]) =>
  mapCountsToRecord(countByLabel(books.flatMap((book) => book.tags ?? [])));

export const getLibraryFormatOptionCounts = (books: LibraryShelfBook[]) =>
  mapCountsToRecord(countByLabel(books.map((book) => normalizeFormatFilterValue(book.format))));

export const getLibraryFormatSummary = (books: LibraryShelfBook[]) => {
  const counts = countByLabel(books.map((book) => normalizeFormatFilterValue(book.format)));
  if (counts.size === 0) return '';
  const topFormat = getTopCountEntry(counts);
  if (!topFormat) return '';
  return `格式 ${counts.size} 种 · 主 ${topFormat[0]} ${topFormat[1]} 本`;
};

export const getLibraryCollectionSummary = (books: LibraryShelfBook[]) => {
  const counts = countByLabel(
    books
      .map((book) => normalizeCollectionFilterValue(book.collection))
      .filter((collection) => collection !== '未归类')
  );
  if (counts.size === 0) return '';
  const topCollection = getTopCountEntry(counts);
  if (!topCollection) return '';
  return `归类 ${counts.size} 组 · 最大 ${topCollection[0]} ${topCollection[1]} 本`;
};

export const getLibraryTagSummary = (books: LibraryShelfBook[]) => {
  const counts = countByLabel(books.flatMap((book) => book.tags ?? []));
  if (counts.size === 0) return '';
  const topTag = getTopCountEntry(counts);
  if (!topTag) return '';
  return `标签 ${counts.size} 个 · 高频 ${topTag[0]} ${topTag[1]} 本`;
};

export const getLibraryCoverSummary = (books: LibraryShelfBook[]) => {
  if (books.length === 0) return '';
  const coveredCount = books.filter((book) => !!book.coverUrl).length;
  const missingCount = books.length - coveredCount;
  if (missingCount === 0) return `封面 ${coveredCount} / ${books.length} 已设置`;
  return `封面 ${coveredCount} / ${books.length} 已设置 · ${missingCount} 本使用标题封面`;
};

export const filterBooksByCollection = (books: LibraryShelfBook[], collection: string) => {
  if (collection === 'all') return books;
  return books.filter((book) => normalizeCollectionFilterValue(book.collection) === collection);
};

export const filterBooksByFormat = (books: LibraryShelfBook[], format: string) => {
  if (format === 'all') return books;
  return books.filter((book) => normalizeFormatFilterValue(book.format) === format);
};

export const filterBooksByTag = (books: LibraryShelfBook[], tag: string) => {
  if (tag === 'all') return books;
  return books.filter((book) => book.tags?.includes(tag));
};

export const filterBooksForLibraryView = (
  books: LibraryShelfBook[],
  filterBy: LibraryFilter,
  format: string,
  collection: string,
  tag: string,
  groupBy: 'none' | 'author' | 'collection' | 'format',
  groupScope: string
) =>
  filterBooksByLibraryGroupScope(
    filterBooksByTag(
      filterBooksByCollection(
        filterBooksByFormat(filterBooksByLibraryFilter(books, filterBy), format),
        collection
      ),
      tag
    ),
    groupBy,
    groupScope
  );

export const getLibraryFilterLabel = (filterBy: LibraryFilter) => {
  if (filterBy === 'reading') return '在读';
  if (filterBy === 'unstarted') return '未开始';
  if (filterBy === 'finished') return '已读完';
  return '全部';
};

export const getLibraryBrowseSectionTitle = (
  searchActive: boolean,
  groupBy: 'none' | 'author' | 'collection' | 'format'
) => {
  if (searchActive) return '搜索结果';
  if (groupBy === 'author') return '作者书架';
  if (groupBy === 'collection') return '归类书架';
  if (groupBy === 'format') return '格式书架';
  return '你的书库';
};

export const getLibraryActiveFilterDetail = (
  searchActive: boolean,
  query: string,
  filterBy: LibraryFilter,
  formatFilter: string,
  collectionFilter: string,
  tagFilter: string
) => {
  const activeParts = [
    searchActive ? `搜索 ${normalizeLibrarySearchText(query)}` : '',
    filterBy !== 'all' ? `状态 ${getLibraryFilterLabel(filterBy)}` : '',
    formatFilter !== 'all' ? `格式 ${formatFilter}` : '',
    collectionFilter !== 'all' ? `归类 ${collectionFilter}` : '',
    tagFilter !== 'all' ? `标签 ${tagFilter}` : ''
  ].filter(Boolean);
  return activeParts.length > 0 ? `当前筛选：${activeParts.join(' / ')}` : '';
};

export const getLibraryActiveFilterChips = (
  searchActive: boolean,
  query: string,
  filterBy: LibraryFilter,
  formatFilter: string,
  collectionFilter: string,
  tagFilter: string
): LibraryActiveFilterChip[] =>
  [
    searchActive
      ? { id: 'query' as const, label: `搜索 ${normalizeLibrarySearchText(query)}` }
      : null,
    filterBy !== 'all'
      ? { id: 'status' as const, label: `状态 ${getLibraryFilterLabel(filterBy)}` }
      : null,
    formatFilter !== 'all' ? { id: 'format' as const, label: `格式 ${formatFilter}` } : null,
    collectionFilter !== 'all'
      ? { id: 'collection' as const, label: `归类 ${collectionFilter}` }
      : null,
    tagFilter !== 'all' ? { id: 'tag' as const, label: `标签 ${tagFilter}` } : null
  ].filter((chip): chip is LibraryActiveFilterChip => chip !== null);

export const getLibraryEmptyFilterTitle = (activeFilterDetail: string) => {
  const detail = activeFilterDetail.replace(/^当前筛选：/, '').trim();
  return detail ? `${detail} 当前没有匹配的书` : '当前没有匹配的书';
};

export const isLibraryViewFiltered = ({
  searchActive,
  filterBy,
  formatFilter,
  collectionFilter,
  tagFilter
}: {
  searchActive: boolean;
  filterBy: LibraryFilter;
  formatFilter: string;
  collectionFilter: string;
  tagFilter: string;
}) =>
  searchActive ||
  filterBy !== 'all' ||
  formatFilter !== 'all' ||
  collectionFilter !== 'all' ||
  tagFilter !== 'all';

export const getReadingWorkflowNotice = ({
  groupedBrowseMode,
  searchActive,
  filterBy,
  collectionFilter,
  tagFilter,
  importedBooks,
  filteredContinueReadingBooks,
  filteredRecentReadingBooks
}: {
  groupedBrowseMode: boolean;
  searchActive: boolean;
  filterBy: LibraryFilter;
  collectionFilter: string;
  tagFilter: string;
  importedBooks: LibraryShelfBook[];
  filteredContinueReadingBooks: LibraryShelfBook[];
  filteredRecentReadingBooks: LibraryShelfBook[];
}) => {
  if (
    groupedBrowseMode ||
    searchActive ||
    filterBy !== 'all' ||
    collectionFilter !== 'all' ||
    tagFilter !== 'all'
  ) {
    return null;
  }

  const hasReadingHistory = importedBooks.some((book) => hasBookBeenOpened(book));
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
};

export const getStarterReadingWorkflowNotice = ({
  groupedBrowseMode,
  searchActive,
  filterBy,
  collectionFilter,
  tagFilter,
  filteredStarterContinueReadingBooks,
  filteredStarterRecentReadingBooks
}: {
  groupedBrowseMode: boolean;
  searchActive: boolean;
  filterBy: LibraryFilter;
  collectionFilter: string;
  tagFilter: string;
  filteredStarterContinueReadingBooks: LibraryShelfBook[];
  filteredStarterRecentReadingBooks: LibraryShelfBook[];
}) => {
  if (
    groupedBrowseMode ||
    searchActive ||
    filterBy !== 'all' ||
    collectionFilter !== 'all' ||
    tagFilter !== 'all'
  ) {
    return null;
  }

  if (filteredStarterContinueReadingBooks.length > 0) return null;
  if (filteredStarterRecentReadingBooks.length > 0) {
    return {
      title: '样例书架当前没有进行中的书',
      message: '最近阅读保留在下方；重新打开任意一本未读完的样例书后，它会回到继续阅读。'
    };
  }
  return null;
};

import type {
  LibraryActiveFilterChip,
  ContinueReadingBook,
  LibraryBrowseBodyModel,
  LibraryEmptyStateModel
} from './types';

type BuildFilterEmptyStateArgs = {
  ariaLabel: string;
  title: string;
  message: string;
  activeFilterChips: LibraryActiveFilterChip[];
  onClearFilterById: (id: LibraryActiveFilterChip['id']) => void | Promise<void>;
  onClearFilters: () => void | Promise<void>;
};

type BuildDesktopLibraryBrowseBodyModelArgs = {
  workflowNotice: LibraryBrowseBodyModel['workflowNotice'];
  recoveryQueueSummaryText: string;
  recoveryQueueReviewBooks: ContinueReadingBook[];
  bulkRepairEligibleCount: number;
  bulkRepairBusy: boolean;
  bulkRepairSummary: string;
  filteredContinueReadingBooks: ContinueReadingBook[];
  filteredRecentReadingBooks: ContinueReadingBook[];
  importedBooksCount: number;
  readestLibraryCount: number;
  migrationBusy: boolean;
  libraryQuery: string;
  visibleLibraryBooksCount: number;
  activeFilterDetail: string;
  activeFilterChips: LibraryActiveFilterChip[];
  onOpenSourcePath: (filePath: string) => void | Promise<void>;
  onImportBooks: () => void | Promise<void>;
  onRepairBook: (book: ContinueReadingBook) => void | Promise<void>;
  onRemoveBook: (book: ContinueReadingBook) => void | Promise<void>;
  onBulkRepairBooks: () => void | Promise<void>;
  onReadestMigration: () => void | Promise<void>;
  onClearFilterById: (id: LibraryActiveFilterChip['id']) => void | Promise<void>;
  onClearFilters: () => void | Promise<void>;
  getEmptyFilterTitle: (detail: string) => string;
};

type BuildStarterLibraryBrowseBodyModelArgs = {
  workflowNotice: LibraryBrowseBodyModel['workflowNotice'];
  filteredContinueReadingBooks: ContinueReadingBook[];
  filteredRecentReadingBooks: ContinueReadingBook[];
  libraryQuery: string;
  visibleStarterLibraryBooksCount: number;
  activeFilterDetail: string;
  activeFilterChips: LibraryActiveFilterChip[];
  onClearFilterById: (id: LibraryActiveFilterChip['id']) => void | Promise<void>;
  onClearFilters: () => void | Promise<void>;
  getEmptyFilterTitle: (detail: string) => string;
};

const buildFilterChips = (
  activeFilterChips: LibraryActiveFilterChip[],
  onClearFilterById: (id: LibraryActiveFilterChip['id']) => void | Promise<void>
) =>
  activeFilterChips.map((chip) => ({
    label: chip.label,
    onClick: () => onClearFilterById(chip.id)
  }));

export const buildLibraryFilterEmptyState = ({
  ariaLabel,
  title,
  message,
  activeFilterChips,
  onClearFilterById,
  onClearFilters
}: BuildFilterEmptyStateArgs): LibraryEmptyStateModel => ({
  ariaLabel,
  title,
  message,
  filterChips: buildFilterChips(activeFilterChips, onClearFilterById),
  actions: [
    {
      label: '清除筛选',
      onClick: onClearFilters
    }
  ]
});

export const buildDesktopLibraryBrowseBodyModel = ({
  workflowNotice,
  recoveryQueueSummaryText,
  recoveryQueueReviewBooks,
  bulkRepairEligibleCount,
  bulkRepairBusy,
  bulkRepairSummary,
  filteredContinueReadingBooks,
  filteredRecentReadingBooks,
  importedBooksCount,
  readestLibraryCount,
  migrationBusy,
  libraryQuery,
  visibleLibraryBooksCount,
  activeFilterDetail,
  activeFilterChips,
  onOpenSourcePath,
  onImportBooks,
  onRepairBook,
  onRemoveBook,
  onBulkRepairBooks,
  onReadestMigration,
  onClearFilterById,
  onClearFilters,
  getEmptyFilterTitle
}: BuildDesktopLibraryBrowseBodyModelArgs): LibraryBrowseBodyModel => ({
  workflowNotice,
  recoveryShelf: {
    sectionTitle: '待修复书籍',
    sectionDescription: recoveryQueueSummaryText,
    primaryActionLabel: '修复',
    books: recoveryQueueReviewBooks,
    onOpenSourcePath,
    onImportBooks,
    onRepairBook,
    onRemoveBook,
    bulkActionLabel:
      bulkRepairEligibleCount > 0
        ? bulkRepairBusy
          ? '批量修复中…'
          : `批量修复副本（${bulkRepairEligibleCount}）`
        : '',
    bulkActionDisabled: bulkRepairBusy,
    operationSummary: bulkRepairSummary,
    onBulkAction: onBulkRepairBooks
  },
  continueShelf: {
    sectionTitle: '继续阅读',
    sectionDescription: '回到当前正在读的书。',
    primaryActionLabel: '继续',
    books: filteredContinueReadingBooks,
    onOpenSourcePath,
    onImportBooks,
    onRepairBook,
    onRemoveBook
  },
  recentShelf: {
    sectionTitle: '最近阅读',
    sectionDescription: '重新打开你最近看过，但当前不在继续阅读队列中的书。',
    primaryActionLabel: '重开',
    books: filteredRecentReadingBooks,
    onOpenSourcePath,
    onImportBooks,
    onRepairBook,
    onRemoveBook
  },
  initialEmptyState:
    importedBooksCount === 0
      ? {
          ariaLabel: '空书库',
          title: '你的书库还是空的',
          message: '可以从本机导入新书，或者先把已有的 Readest 书库迁进来。',
          actions: [
            {
              label: '从本机导入',
              onClick: onImportBooks
            },
            ...(readestLibraryCount > 0
              ? [
                  {
                    label: migrationBusy ? '兼容中…' : `同步 Readest 的 ${readestLibraryCount} 本书`,
                    secondary: true,
                    onClick: onReadestMigration
                  }
                ]
              : [])
          ]
        }
      : null,
  afterPanelEmptyStates: [
    ...(libraryQuery && visibleLibraryBooksCount === 0
      ? [
          buildLibraryFilterEmptyState({
            ariaLabel: '搜索无结果',
            title: getEmptyFilterTitle(activeFilterDetail),
            message: '试试搜索标题、作者、格式、归类，或者移除搜索条件后再调整当前筛选。',
            activeFilterChips,
            onClearFilterById,
            onClearFilters
          })
        ]
      : !libraryQuery && visibleLibraryBooksCount === 0
        ? [
            buildLibraryFilterEmptyState({
              ariaLabel: '筛选无结果',
              title: getEmptyFilterTitle(activeFilterDetail),
              message: '切回“全部 / 全部格式 / 全部归类 / 全部标签”查看完整书库，或重新打开一本书来更新它的阅读状态。',
              activeFilterChips,
              onClearFilterById,
              onClearFilters
            })
          ]
        : [])
  ]
});

export const buildStarterLibraryBrowseBodyModel = ({
  workflowNotice,
  filteredContinueReadingBooks,
  filteredRecentReadingBooks,
  libraryQuery,
  visibleStarterLibraryBooksCount,
  activeFilterDetail,
  activeFilterChips,
  onClearFilterById,
  onClearFilters,
  getEmptyFilterTitle
}: BuildStarterLibraryBrowseBodyModelArgs): LibraryBrowseBodyModel => ({
  workflowNotice,
  continueShelf: {
    sectionTitle: '继续阅读',
    sectionDescription: '回到当前正在读的样例书。',
    primaryActionLabel: '继续',
    books: filteredContinueReadingBooks
  },
  recentShelf: {
    sectionTitle: '最近阅读',
    sectionDescription: '重新打开你最近看过的样例书。',
    primaryActionLabel: '重开',
    books: filteredRecentReadingBooks
  },
  beforePanelEmptyStates: [
    ...(libraryQuery && visibleStarterLibraryBooksCount === 0
      ? [
          buildLibraryFilterEmptyState({
            ariaLabel: '样例搜索无结果',
            title: getEmptyFilterTitle(activeFilterDetail),
            message: '试试搜索标题、作者、格式、归类，或者移除搜索条件后再调整当前筛选。',
            activeFilterChips,
            onClearFilterById,
            onClearFilters
          })
        ]
      : visibleStarterLibraryBooksCount === 0
        ? [
            buildLibraryFilterEmptyState({
              ariaLabel: '样例筛选无结果',
              title: getEmptyFilterTitle(activeFilterDetail),
              message: '切回“全部 / 全部格式 / 全部归类 / 全部标签”查看完整书库，或重新打开一本书来更新它的阅读状态。',
              activeFilterChips,
              onClearFilterById,
              onClearFilters
            })
          ]
        : [])
  ]
});

import type {
  LibraryActiveFilterChip,
  LibraryNoticeModel,
  LibraryPageChromeModel
} from './types';

type BuildLibraryPageChromeModelArgs = {
  totalBooks: number;
  query: string;
  viewMode: 'grid' | 'list';
  sortBy: 'recent' | 'added' | 'title' | 'author' | 'format';
  groupBy: 'none' | 'author' | 'collection' | 'format';
  browseState: LibraryPageChromeModel['header']['browseState'];
  activeGroupVisibleCount: number;
  activeFilter: 'all' | 'reading' | 'unstarted' | 'finished';
  statusOptionCounts: Record<'all' | 'reading' | 'unstarted' | 'finished', number>;
  activeFormatFilter: string;
  formatOptions: string[];
  formatOptionCounts: Record<string, number>;
  activeCollectionFilter: string;
  collectionOptions: string[];
  collectionOptionCounts: Record<string, number>;
  activeTagFilter: string;
  tagOptions: string[];
  tagOptionCounts: Record<string, number>;
  statusSummary: string;
  activeFilterDetail: string;
  activeFilterChips: LibraryActiveFilterChip[];
  formatSummary: string;
  collectionSummary: string;
  tagSummary: string;
  coverSummary: string;
  filterSummary: string;
  importDisabled: boolean;
  showSyncSnapshotActions: boolean;
  syncSnapshotBusy: boolean;
  showRemoteSyncActions: boolean;
  remoteSyncBusy: boolean;
  notice: LibraryNoticeModel | null;
  showReadestMigration: boolean;
  readestLibraryCount: number;
  readestCompatibleCount: number;
  migrationBusy: boolean;
};

export const buildLibraryPageChromeModel = ({
  totalBooks,
  query,
  viewMode,
  sortBy,
  groupBy,
  browseState,
  activeGroupVisibleCount,
  activeFilter,
  statusOptionCounts,
  activeFormatFilter,
  formatOptions,
  formatOptionCounts,
  activeCollectionFilter,
  collectionOptions,
  collectionOptionCounts,
  activeTagFilter,
  tagOptions,
  tagOptionCounts,
  statusSummary,
  activeFilterDetail,
  activeFilterChips,
  formatSummary,
  collectionSummary,
  tagSummary,
  coverSummary,
  filterSummary,
  importDisabled,
  showSyncSnapshotActions,
  syncSnapshotBusy,
  showRemoteSyncActions,
  remoteSyncBusy,
  notice,
  showReadestMigration,
  readestLibraryCount,
  readestCompatibleCount,
  migrationBusy
}: BuildLibraryPageChromeModelArgs): LibraryPageChromeModel => ({
  header: {
    totalBooks,
    query,
    viewMode,
    sortBy,
    groupBy,
    browseState,
    activeGroupVisibleCount,
    activeFilter,
    statusOptionCounts,
    activeFormatFilter,
    formatOptions,
    formatOptionCounts,
    activeCollectionFilter,
    collectionOptions,
    collectionOptionCounts,
    activeTagFilter,
    tagOptions,
    tagOptionCounts,
    importDisabled,
    showSyncSnapshotActions,
    syncSnapshotBusy,
    showRemoteSyncActions,
    remoteSyncBusy,
    statusSummary,
    activeFilterDetail,
    activeFilterChips,
    filterSummary,
    formatSummary,
    collectionSummary,
    tagSummary,
    coverSummary
  },
  notice,
  showReadestMigration,
  readestLibraryCount,
  readestCompatibleCount,
  migrationBusy
});

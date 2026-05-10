// Ownership: this library module assembles the final page surface models that Svelte renders.
// It depends on the pure chrome/body builders and page-state projections, while keeping the
// active desktop-versus-starter selection out of the component layer.
import { buildDesktopLibraryBrowseBodySurfaceModel, buildStarterLibraryBrowseBodySurfaceModel } from './body';
import { buildLibraryPageChromeModel } from './chrome';
import type { LibraryPageSurfaceModel } from './types';
import { getLibraryEmptyFilterTitle, type LibraryPageSurfaceProjectionState } from './page';

type BuildDesktopLibraryPageSurfaceModelArgs = {
  chrome: Parameters<typeof buildLibraryPageChromeModel>[0];
  body: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0];
};

type BuildStarterLibraryPageSurfaceModelArgs = {
  chrome: Parameters<typeof buildLibraryPageChromeModel>[0];
  body: Parameters<typeof buildStarterLibraryBrowseBodySurfaceModel>[0];
};

type BuildLibraryPageSurfaceSetArgs = {
  chrome: Parameters<typeof buildLibraryPageChromeModel>[0];
  desktopBody: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0];
  starterBody: Parameters<typeof buildStarterLibraryBrowseBodySurfaceModel>[0];
  desktopLibraryMode: boolean;
};

type LibraryPageSurfaceActionBindings = {
  onOpenSourcePath: Parameters<typeof buildLibraryPageSurfaceSetFromState>[0]['onOpenSourcePath'];
  onImportBooks: Parameters<typeof buildLibraryPageSurfaceSetFromState>[0]['onImportBooks'];
  onRepairBook: Parameters<typeof buildLibraryPageSurfaceSetFromState>[0]['onRepairBook'];
  onRemoveBook: Parameters<typeof buildLibraryPageSurfaceSetFromState>[0]['onRemoveBook'];
  onBulkRepairBooks: Parameters<typeof buildLibraryPageSurfaceSetFromState>[0]['onBulkRepairBooks'];
  onReadestMigration: Parameters<typeof buildLibraryPageSurfaceSetFromState>[0]['onReadestMigration'];
  onClearFilterById: Parameters<typeof buildLibraryPageSurfaceSetFromState>[0]['onClearFilterById'];
  onClearFilters: Parameters<typeof buildLibraryPageSurfaceSetFromState>[0]['onClearFilters'];
};

type BuildLibraryPageSurfaceSetFromStateArgs = {
  totalBooks: number;
  query: string;
  viewMode: 'grid' | 'list';
  sortBy: 'recent' | 'added' | 'title' | 'author' | 'format';
  groupBy: 'none' | 'author' | 'collection' | 'format';
  browseState: Parameters<typeof buildLibraryPageChromeModel>[0]['browseState'];
  activeGroupVisibleCount: number;
  activeFilter: Parameters<typeof buildLibraryPageChromeModel>[0]['activeFilter'];
  statusOptionCounts: Parameters<typeof buildLibraryPageChromeModel>[0]['statusOptionCounts'];
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
  activeFilterChips: Parameters<typeof buildLibraryPageChromeModel>[0]['activeFilterChips'];
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
  notice: Parameters<typeof buildLibraryPageChromeModel>[0]['notice'];
  showReadestMigration: boolean;
  readestLibraryCount: number;
  readestImportableCount: number;
  readestMissingFileCount: number;
  readestCompatibleCount: number;
  migrationBusy: boolean;
  groupedBrowseMode: boolean;
  desktopWorkflowSectionsVisible: boolean;
  desktopBrowseBooks: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0]['browseBooks'];
  desktopShelfBooks: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0]['shelfBooks'];
  desktopWorkflowNotice: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0]['workflowNotice'];
  recoveryQueueSummaryText: string;
  recoveryQueueReviewBooks: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0]['recoveryQueueReviewBooks'];
  bulkRepairEligibleCount: number;
  bulkRepairBusy: boolean;
  bulkRepairSummary: string;
  filteredContinueReadingBooks: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0]['filteredContinueReadingBooks'];
  filteredRecentReadingBooks: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0]['filteredRecentReadingBooks'];
  importedBooksCount: number;
  libraryQuery: string;
  visibleLibraryBooksCount: number;
  starterWorkflowSectionsVisible: boolean;
  onOpenSourcePath: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0]['onOpenSourcePath'];
  onImportBooks: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0]['onImportBooks'];
  onRepairBook: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0]['onRepairBook'];
  onRemoveBook: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0]['onRemoveBook'];
  onBulkRepairBooks: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0]['onBulkRepairBooks'];
  onReadestMigration: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0]['onReadestMigration'];
  onClearFilterById: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0]['onClearFilterById'];
  onClearFilters: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0]['onClearFilters'];
  getEmptyFilterTitle: Parameters<typeof buildDesktopLibraryBrowseBodySurfaceModel>[0]['getEmptyFilterTitle'];
  starterBrowseBooks: Parameters<typeof buildStarterLibraryBrowseBodySurfaceModel>[0]['browseBooks'];
  starterShelfBooks: Parameters<typeof buildStarterLibraryBrowseBodySurfaceModel>[0]['shelfBooks'];
  starterWorkflowNotice: Parameters<typeof buildStarterLibraryBrowseBodySurfaceModel>[0]['workflowNotice'];
  filteredStarterContinueReadingBooks: Parameters<typeof buildStarterLibraryBrowseBodySurfaceModel>[0]['filteredContinueReadingBooks'];
  filteredStarterRecentReadingBooks: Parameters<typeof buildStarterLibraryBrowseBodySurfaceModel>[0]['filteredRecentReadingBooks'];
  visibleStarterLibraryBooksCount: number;
  desktopLibraryMode: boolean;
};

export const createEmptyLibraryPageSurfaceModel = (
  supportsDesktopBookActions: boolean
): LibraryPageSurfaceModel => ({
  chrome: {
    header: {
      totalBooks: 0,
      query: '',
      viewMode: 'grid',
      sortBy: 'recent',
      groupBy: 'none',
      browseState: {
        groupBy: 'none',
        groupScope: '',
        trail: []
      },
      activeGroupVisibleCount: 0,
      activeFilter: 'all',
      statusOptionCounts: {
        all: 0,
        reading: 0,
        unstarted: 0,
        finished: 0
      },
      activeFormatFilter: 'all',
      formatOptions: [],
      formatOptionCounts: {},
      activeCollectionFilter: 'all',
      collectionOptions: [],
      collectionOptionCounts: {},
      activeTagFilter: 'all',
      tagOptions: [],
      tagOptionCounts: {},
      importDisabled: false,
      showSyncSnapshotActions: false,
      syncSnapshotBusy: false,
      showRemoteSyncActions: false,
      remoteSyncBusy: false,
      statusSummary: '',
      activeFilterDetail: '',
      activeFilterChips: [],
      filterSummary: '',
      formatSummary: '',
      collectionSummary: '',
      tagSummary: '',
      coverSummary: ''
    },
    notice: null,
    showReadestMigration: false,
    readestLibraryCount: 0,
    readestImportableCount: 0,
    readestMissingFileCount: 0,
    readestCompatibleCount: 0,
    migrationBusy: false
  },
  body: {
    body: {},
    groupedBrowseMode: false,
    browseState: {
      groupBy: 'none',
      groupScope: '',
      trail: []
    },
    browseBooks: [],
    viewMode: 'grid',
    shelfBooks: [],
    shelfSectionTitle: '书架'
  },
  supportsDesktopBookActions
});

export const buildDesktopLibraryPageSurfaceModel = ({
  chrome,
  body
}: BuildDesktopLibraryPageSurfaceModelArgs): LibraryPageSurfaceModel => ({
  chrome: buildLibraryPageChromeModel(chrome),
  body: buildDesktopLibraryBrowseBodySurfaceModel(body),
  supportsDesktopBookActions: true
});

export const buildStarterLibraryPageSurfaceModel = ({
  chrome,
  body
}: BuildStarterLibraryPageSurfaceModelArgs): LibraryPageSurfaceModel => ({
  chrome: buildLibraryPageChromeModel(chrome),
  body: buildStarterLibraryBrowseBodySurfaceModel(body),
  supportsDesktopBookActions: false
});

export const buildLibraryPageSurfaceSet = ({
  chrome,
  desktopBody,
  starterBody,
  desktopLibraryMode
}: BuildLibraryPageSurfaceSetArgs) => {
  // Boundary: the active surface switch happens here so components only render one already-
  // shaped model instead of branching over route mode and desktop capability details.
  const desktop = buildDesktopLibraryPageSurfaceModel({
    chrome,
    body: desktopBody
  });
  const starter = buildStarterLibraryPageSurfaceModel({
    chrome,
    body: starterBody
  });

  return {
    desktop,
    starter,
    active: desktopLibraryMode ? desktop : starter
  };
};

export const buildLibraryPageSurfaceSetFromState = ({
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
  readestImportableCount,
  readestMissingFileCount,
  readestCompatibleCount,
  migrationBusy,
  groupedBrowseMode,
  desktopWorkflowSectionsVisible,
  desktopBrowseBooks,
  desktopShelfBooks,
  desktopWorkflowNotice,
  recoveryQueueSummaryText,
  recoveryQueueReviewBooks,
  bulkRepairEligibleCount,
  bulkRepairBusy,
  bulkRepairSummary,
  filteredContinueReadingBooks,
  filteredRecentReadingBooks,
  importedBooksCount,
  libraryQuery,
  visibleLibraryBooksCount,
  starterWorkflowSectionsVisible,
  onOpenSourcePath,
  onImportBooks,
  onRepairBook,
  onRemoveBook,
  onBulkRepairBooks,
  onReadestMigration,
  onClearFilterById,
  onClearFilters,
  getEmptyFilterTitle,
  starterBrowseBooks,
  starterShelfBooks,
  starterWorkflowNotice,
  filteredStarterContinueReadingBooks,
  filteredStarterRecentReadingBooks,
  visibleStarterLibraryBooksCount,
  desktopLibraryMode
}: BuildLibraryPageSurfaceSetFromStateArgs) =>
  buildLibraryPageSurfaceSet({
    chrome: {
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
      readestImportableCount,
      readestMissingFileCount,
      readestCompatibleCount,
      migrationBusy
    },
    desktopBody: {
      browseState,
      groupedBrowseMode,
      workflowSectionsVisible: desktopWorkflowSectionsVisible,
      browseBooks: desktopBrowseBooks,
      viewMode,
      shelfBooks: desktopShelfBooks,
      searchActive: query.trim().length > 0,
      groupBy,
      workflowNotice: desktopWorkflowNotice,
      recoveryQueueSummaryText,
      recoveryQueueReviewBooks,
      bulkRepairEligibleCount,
      bulkRepairBusy,
      bulkRepairSummary,
      filteredContinueReadingBooks,
      filteredRecentReadingBooks,
      importedBooksCount,
      readestImportableCount,
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
    },
    starterBody: {
      browseState,
      groupedBrowseMode,
      workflowSectionsVisible: starterWorkflowSectionsVisible,
      browseBooks: starterBrowseBooks,
      viewMode,
      shelfBooks: starterShelfBooks,
      searchActive: query.trim().length > 0,
      groupBy,
      workflowNotice: starterWorkflowNotice,
      filteredContinueReadingBooks: filteredStarterContinueReadingBooks,
      filteredRecentReadingBooks: filteredStarterRecentReadingBooks,
      libraryQuery,
      visibleStarterLibraryBooksCount,
      activeFilterDetail,
      activeFilterChips,
      onClearFilterById,
      onClearFilters,
      getEmptyFilterTitle
    },
    desktopLibraryMode
  });

export const buildLibraryPageSurfaceSetFromProjectionState = ({
  projectionState,
  actions
}: {
  projectionState: LibraryPageSurfaceProjectionState;
  actions: LibraryPageSurfaceActionBindings;
}) =>
  buildLibraryPageSurfaceSetFromState({
    ...projectionState,
    ...actions,
    getEmptyFilterTitle: getLibraryEmptyFilterTitle
  });

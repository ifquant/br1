export type LibraryShelfBook = {
  title: string;
  author: string;
  status: string;
  progress: string;
  format: string;
  description?: string;
  language?: string;
  publisher?: string;
  collection?: string;
  tags?: string[];
  progressLocation?: string;
  progressFraction?: number | null;
  progressPercentLabel?: string;
  readingStatusLabel?: string;
  sourceLabel?: string;
  availabilityLabel?: string;
  compatibilityLabel?: string;
  sourcePath?: string;
  coverUrl?: string;
  readerHref?: string;
  restartHref?: string;
  lastOpenedAt?: number | null;
  lastOpenedLabel?: string;
  importedAt?: number | null;
  importedAtLabel?: string;
};

export type LibraryGroupBy = 'author' | 'collection' | 'format';

export type LibraryGroupSegment = {
  groupBy: LibraryGroupBy;
  label: string;
};

export type ActiveLibraryGroupOverview = {
  eyebrow: string;
  title: string;
  summary: string;
  metrics: LibraryGroupMetric[];
  pivots: LibraryGroupPivotSection[];
};

export type LibraryGroupMetric = {
  label: string;
  value: string;
};

export type LibraryGroupPivotItem = {
  label: string;
  value: string;
  groupBy: LibraryGroupBy;
};

export type LibraryGroupPivotSection = {
  title: string;
  items: LibraryGroupPivotItem[];
};

export type ActiveLibrarySubgroupShelf = {
  title: string;
  description: string;
  groupBy: LibraryGroupBy;
};

export type LibraryTrailLanding = {
  index: number;
  eyebrow: string;
  title: string;
  summary: string;
  metrics: LibraryGroupMetric[];
  scopedBooks: LibraryShelfBook[];
  subgroupShelves: ActiveLibrarySubgroupShelf[];
  siblingGroups: Array<{ label: string; count: number }>;
};

export type LibraryBrowseSurfaceModel = {
  overview: ActiveLibraryGroupOverview | null;
  trailLandings: LibraryTrailLanding[];
  siblingGroups: Array<{ label: string; count: number }>;
  subgroupShelves: LibraryBrowseSubgroupShelfSurface[];
  trailGuardExplanations: LibraryBrowseGuardExplanation[];
  siblingGuardExplanations: LibraryBrowseGuardExplanation[];
  pivotGuardExplanations: LibraryBrowseGuardExplanation[];
  shelfGroupCardExplanations: LibraryBrowseGuardExplanation[];
};

export type LibraryBrowseSubgroupShelfSurface = {
  shelf: ActiveLibrarySubgroupShelf;
  blockedGroupExplanations: LibraryBrowseGuardExplanation[];
};

export type LibraryBrowseState = {
  groupBy: 'none' | LibraryGroupBy;
  groupScope: string;
  trail: LibraryGroupSegment[];
};

export type LibraryBrowseAction =
  | {
      type: 'set-grouping';
      groupBy: 'none' | LibraryGroupBy;
    }
  | {
      type: 'enter-group';
      groupBy: LibraryGroupBy;
      label: string;
    }
  | {
      type: 'exit-group';
    }
  | {
      type: 'jump-trail';
      index: number;
    }
  | {
      type: 'enter-from-trail';
      trailIndex: number;
      groupBy: LibraryGroupBy;
      label: string;
    }
  | {
      type: 'switch-sibling';
      groupBy: LibraryGroupBy;
      label: string;
      trail: LibraryGroupSegment[];
    };

export type LibraryBrowseInvalidReason = 'missing-trail-segment';

export type LibraryBrowseGuardSurface =
  | 'path'
  | 'exit'
  | 'sibling'
  | 'pivot'
  | 'subgroup'
  | 'group-card';

export type LibraryBrowseGuardExplanation = {
  title: string;
  detail: string;
};

export type LibraryActiveFilterChip = {
  id: 'query' | 'status' | 'format' | 'collection' | 'tag';
  label: string;
};

export type LibraryEmptyStateModel = {
  ariaLabel: string;
  title: string;
  message: string;
  filterChips?: Array<{
    label: string;
    onClick: () => void | Promise<void>;
  }>;
  actions?: Array<{
    label: string;
    secondary?: boolean;
    onClick: () => void | Promise<void>;
  }>;
};

export type LibraryWorkflowNotice = {
  title: string;
  message: string;
};

export type LibraryWorkflowShelf = {
  sectionTitle: string;
  sectionDescription: string;
  primaryActionLabel: string;
  books: ContinueReadingBook[];
  onOpenSourcePath?: ((filePath: string) => void | Promise<void>) | null;
  onImportBooks?: (() => void | Promise<void>) | null;
  onRepairBook?: ((book: ContinueReadingBook) => void | Promise<void>) | null;
  onRemoveBook?: ((book: ContinueReadingBook) => void | Promise<void>) | null;
  bulkActionLabel?: string;
  bulkActionDisabled?: boolean;
  operationSummary?: string;
  onBulkAction?: (() => void | Promise<void>) | null;
};

export type LibraryBrowseBodyModel = {
  workflowNotice?: LibraryWorkflowNotice | null;
  recoveryShelf?: LibraryWorkflowShelf | null;
  continueShelf?: LibraryWorkflowShelf | null;
  recentShelf?: LibraryWorkflowShelf | null;
  initialEmptyState?: LibraryEmptyStateModel | null;
  beforePanelEmptyStates?: LibraryEmptyStateModel[];
  afterPanelEmptyStates?: LibraryEmptyStateModel[];
};

export type LibraryBrowseBodySurfaceModel = {
  body: LibraryBrowseBodyModel;
  groupedBrowseMode: boolean;
  browseState: LibraryBrowseState;
  browseBooks: LibraryShelfBook[];
  viewMode: 'grid' | 'list';
  shelfBooks: LibraryShelfBook[];
  shelfSectionTitle: string;
};

export type LibraryNoticeModel = {
  kind: 'info' | 'error';
  message: string;
  actionLabel?: string;
};

export type LibraryNoticeState = LibraryNoticeModel & {
  action?: () => void | Promise<void>;
};

export type LibraryFilterControlsState = {
  query: string;
  filterBy: 'all' | 'reading' | 'unstarted' | 'finished';
  formatFilter: string;
  collectionFilter: string;
  tagFilter: string;
};

export type LibraryBookMetadataUpdate = {
  title: string;
  author: string;
  description?: string;
  language?: string;
  publisher?: string;
  collection?: string;
  tags?: string[];
};

export type LibraryPageActions = {
  onImportChange?: ((event: Event) => void | Promise<void>) | null;
  onDispatchBrowseAction: (action: LibraryBrowseAction) => void | Promise<void>;
  onRunNoticeAction?: (() => void | Promise<void>) | null;
  onClearNotice?: (() => void | Promise<void>) | null;
  onReadestMigration?: (() => void | Promise<void>) | null;
  onExportSyncSnapshot?: (() => void | Promise<void>) | null;
  onImportSyncSnapshot?: (() => void | Promise<void>) | null;
  onExportKoReaderSync?: (() => void | Promise<void>) | null;
  onImportKoReaderSync?: (() => void | Promise<void>) | null;
  onPushRemoteSync?: (() => void | Promise<void>) | null;
  onPullRemoteSync?: (() => void | Promise<void>) | null;
  onOpenLink: (href: string) => void | Promise<void>;
  onImportBooks?: (() => void | Promise<void>) | null;
  onOpenSourcePath?: ((filePath: string) => void | Promise<void>) | null;
  onUpdateBookMetadata?:
    | ((book: LibraryShelfBook, metadata: LibraryBookMetadataUpdate) => void | Promise<void>)
    | null;
  onRemoveBook?: ((book: LibraryShelfBook) => void | Promise<void>) | null;
  onFilterStatus?:
    | ((status: 'reading' | 'unstarted' | 'finished') => void | Promise<void>)
    | null;
  onFilterFormat?: ((format: string) => void | Promise<void>) | null;
  onFilterCollection?: ((collection: string) => void | Promise<void>) | null;
  onFilterTag?: ((tag: string) => void | Promise<void>) | null;
  onQueryChange?: ((query: string) => void | Promise<void>) | null;
  onFilterChange?:
    | ((filterBy: 'all' | 'reading' | 'unstarted' | 'finished') => void | Promise<void>)
    | null;
  onFormatFilterChange?: ((format: string) => void | Promise<void>) | null;
  onCollectionFilterChange?: ((collection: string) => void | Promise<void>) | null;
  onTagFilterChange?: ((tag: string) => void | Promise<void>) | null;
  onClearFilterChip?: ((id: LibraryActiveFilterChip['id']) => void | Promise<void>) | null;
  onClearFilters?: (() => void | Promise<void>) | null;
  onJumpTrail?: ((index: number) => void | Promise<void>) | null;
  onSortChange?:
    | ((sortBy: 'recent' | 'added' | 'title' | 'author' | 'format') => void | Promise<void>)
    | null;
  onViewModeChange?: ((viewMode: 'grid' | 'list') => void | Promise<void>) | null;
};

export type LibraryHeaderModel = {
  totalBooks: number;
  query: string;
  viewMode: 'grid' | 'list';
  sortBy: 'recent' | 'added' | 'title' | 'author' | 'format';
  groupBy: 'none' | LibraryGroupBy;
  browseState: LibraryBrowseState;
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
  importDisabled: boolean;
  showSyncSnapshotActions: boolean;
  syncSnapshotBusy: boolean;
  showRemoteSyncActions: boolean;
  remoteSyncBusy: boolean;
  statusSummary: string;
  activeFilterDetail: string;
  activeFilterChips: LibraryActiveFilterChip[];
  filterSummary: string;
  formatSummary: string;
  collectionSummary: string;
  tagSummary: string;
  coverSummary: string;
};

export type LibraryPageChromeModel = {
  header: LibraryHeaderModel;
  notice?: LibraryNoticeModel | null;
  showReadestMigration: boolean;
  readestLibraryCount: number;
  readestCompatibleCount: number;
  migrationBusy: boolean;
};

export type LibraryPageSurfaceModel = {
  chrome: LibraryPageChromeModel;
  body: LibraryBrowseBodySurfaceModel;
  supportsDesktopBookActions: boolean;
};

export type LibraryBrowseActionGuardResult =
  | {
      kind: 'allowed';
    }
  | {
      kind: 'blocked';
      reason: LibraryBrowseInvalidReason;
    };

export type LibraryBrowseTransitionResult =
  | {
      kind: 'applied';
      state: LibraryBrowseState;
    }
  | {
      kind: 'noop';
      state: LibraryBrowseState;
    }
  | {
      kind: 'invalid';
      reason: LibraryBrowseInvalidReason;
      action: LibraryBrowseAction;
    };

export type ManualRelinkReview = {
  note: string;
  repairContractLabel: string;
  repairContractDetail: string;
  conflictLabel: string;
  conflictDetail: string;
  preflightLabel: string;
  preflightDetail: string;
  actionLabel: string;
};

export type BookshelfPreviewBook = Pick<
  LibraryShelfBook,
  | 'title'
  | 'author'
  | 'status'
  | 'progress'
  | 'format'
  | 'description'
  | 'language'
  | 'publisher'
  | 'collection'
  | 'tags'
  | 'progressLocation'
  | 'progressPercentLabel'
  | 'readingStatusLabel'
  | 'sourceLabel'
  | 'availabilityLabel'
  | 'compatibilityLabel'
  | 'sourcePath'
  | 'coverUrl'
  | 'readerHref'
  | 'lastOpenedLabel'
  | 'importedAtLabel'
>;

export type ContinueReadingBook = Pick<
  LibraryShelfBook,
  | 'title'
  | 'author'
  | 'format'
  | 'description'
  | 'language'
  | 'publisher'
  | 'collection'
  | 'tags'
  | 'progressLocation'
  | 'status'
  | 'progress'
  | 'progressPercentLabel'
  | 'readingStatusLabel'
  | 'sourceLabel'
  | 'availabilityLabel'
  | 'compatibilityLabel'
  | 'sourcePath'
  | 'coverUrl'
  | 'readerHref'
  | 'restartHref'
  | 'lastOpenedLabel'
  | 'importedAtLabel'
> & {
  manualRelinkReview?: ManualRelinkReview;
};

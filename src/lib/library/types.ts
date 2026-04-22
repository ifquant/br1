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

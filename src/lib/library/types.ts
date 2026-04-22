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
  metrics: Array<{ label: string; value: string }>;
  pivots: Array<{
    title: string;
    items: Array<{
      label: string;
      value: string;
      groupBy: LibraryGroupBy;
    }>;
  }>;
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
  metrics: Array<{ label: string; value: string }>;
  scopedBooks: LibraryShelfBook[];
  subgroupShelves: ActiveLibrarySubgroupShelf[];
  siblingGroups: Array<{ label: string; count: number }>;
};

export type LibraryBrowseState = {
  groupBy: 'none' | LibraryGroupBy;
  groupScope: string;
  trail: LibraryGroupSegment[];
};

export type LibraryBrowseAction =
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

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

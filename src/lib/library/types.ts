export type LibraryShelfBook = {
  title: string;
  author: string;
  status: string;
  progress: string;
  format: string;
  description?: string;
  language?: string;
  publisher?: string;
  progressPercentLabel?: string;
  readingStatusLabel?: string;
  sourceLabel?: string;
  availabilityLabel?: string;
  sourcePath?: string;
  coverUrl?: string;
  readerHref?: string;
  restartHref?: string;
  lastOpenedAt?: number | null;
  lastOpenedLabel?: string;
};

export type BookshelfPreviewBook = Pick<
  LibraryShelfBook,
  'title' | 'author' | 'status' | 'progress' | 'coverUrl' | 'readerHref'
>;

export type ContinueReadingBook = Pick<
  LibraryShelfBook,
  | 'title'
  | 'author'
  | 'format'
  | 'description'
  | 'language'
  | 'publisher'
  | 'status'
  | 'progress'
  | 'progressPercentLabel'
  | 'readingStatusLabel'
  | 'sourceLabel'
  | 'availabilityLabel'
  | 'sourcePath'
  | 'coverUrl'
  | 'readerHref'
  | 'restartHref'
  | 'lastOpenedLabel'
>;

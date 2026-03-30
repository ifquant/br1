export type ReaderEngineMountState = 'idle' | 'loading' | 'ready' | 'error';

export type ReaderMountBoundary = {
  hostRole: string;
  statusAttr: string;
  state: ReaderEngineMountState;
};

export type ReaderPreviewState = {
  title: string;
  author: string;
  chapterLabel: string;
  chapterHref: string;
  progressLabel: string;
  locationLabel: string;
  progressFraction: number;
  progressLocation: string;
};

export type ReaderTocItem = {
  label: string;
  href: string;
  level: number;
};

export type ReaderSearchExcerpt = {
  pre: string;
  match: string;
  post: string;
};

export type ReaderSearchResult = {
  cfi: string;
  label: string;
  excerpt: ReaderSearchExcerpt;
};

export type ReaderSearchState = {
  query: string;
  status: 'idle' | 'searching' | 'done' | 'error';
  results: ReaderSearchResult[];
  progress?: number;
  error?: string;
};

export type ReaderSearchConfig = {
  scope: 'book' | 'section';
  matchCase: boolean;
  matchWholeWords: boolean;
  matchDiacritics: boolean;
};

export type ReaderSelectionState = {
  cfi: string;
  text: string;
  chapterLabel: string;
  chapterHref: string;
};

export type ReaderNote = {
  id: string;
  cfi: string;
  text: string;
  note: string;
  chapterLabel: string;
  chapterHref: string;
  createdAt: number;
};

export type ReaderControlRequest =
  | {
      type: 'asset';
      nonce: number;
      url: string;
      label: string;
    }
  | {
      type: 'library-file';
      nonce: number;
      path: string;
      label: string;
      restoreFraction?: number;
      restoreLocation?: string;
    }
  | {
      type: 'prev' | 'next' | 'start';
      nonce: number;
    }
  | {
      type: 'fraction';
      nonce: number;
      fraction: number;
    }
  | {
      type: 'href';
      nonce: number;
      href: string;
    }
  | {
      type: 'search';
      nonce: number;
      query: string;
      config: ReaderSearchConfig;
    }
  | {
      type: 'clear-search-cache';
      nonce: number;
    }
  | {
      type: 'file';
      nonce: number;
      file: File;
    };

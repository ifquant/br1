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
  formatLabel: string;
  layoutLabel: string;
  progressFraction: number;
  progressLocation: string;
};

export type ReaderViewWidthMode = 'focus' | 'standard' | 'wide';
export type ReaderChromeMode = 'auto' | 'always';
export type ReaderAtmosphereMode = 'paper' | 'warm' | 'soft';
export type ReaderHighlightsFilter = 'all' | 'chapter' | 'selected';
export type ReaderHighlightsSort = 'recent' | 'oldest';
export type ReaderHighlightSelectionSetSort = 'recent' | 'oldest';

export type ReaderHighlightSelectionSet = {
  id: string;
  name: string;
  selectedIds: string[];
  createdAt: number;
};

export type ReaderHighlightsWorkspaceState = {
  filter: ReaderHighlightsFilter;
  sort: ReaderHighlightsSort;
  savedSelectionsSort: ReaderHighlightSelectionSetSort;
  selectedIds: string[];
  savedSelections: ReaderHighlightSelectionSet[];
};

export type SidebarTab = 'toc' | 'search' | 'bookmarks' | 'highlights' | 'notes';

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

export type ReaderAnnotationKind = 'note' | 'highlight';

export type ReaderNote = {
  id: string;
  kind: ReaderAnnotationKind;
  cfi: string;
  text: string;
  note: string;
  chapterLabel: string;
  chapterHref: string;
  createdAt: number;
};

export type ReaderBookmark = {
  id: string;
  locator: string;
  targetHref: string;
  chapterLabel: string;
  chapterHref: string;
  progressLabel: string;
  locationLabel: string;
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

export type ReaderSidebarSearchState = {
  term: string;
  status: 'idle' | 'searching' | 'done' | 'error';
  results: ReaderSearchResult[];
  error: string;
  progress: number;
  history: string[];
  config: ReaderSearchConfig;
  cacheKey: string;
  notice: { kind: 'success' | 'error'; message: string } | null;
  activeResultCfi: string;
  recentResultCfi: string;
};

export type ReaderSidebarNotesState = {
  activeCfi: string;
  selection: ReaderSelectionState | null;
  notes: ReaderNote[];
};

export type ReaderBookmarksState = {
  activeLocator: string;
  bookmarks: ReaderBookmark[];
};

export type ReaderSidebarCallbacks = {
  onNavigate: ((href: string) => void) | null;
  onToggleCurrentBookmark: (() => void) | null;
  onOpenBookmark: ((href: string) => void) | null;
  onDeleteBookmark: ((id: string) => void) | null;
  onGoToLibrary: (() => void) | null;
  onOpenSourcePath: (() => void) | null;
  onClose: (() => void) | null;
  onToggleSidebar: (() => void) | null;
  onTogglePin: (() => void) | null;
  onTabChange: ((tab: SidebarTab) => void) | null;
  onSearch: ((query: string) => void) | null;
  onSearchResult: ((cfi: string) => void) | null;
  onSearchConfigChange: ((config: ReaderSearchConfig) => void) | null;
  onSearchHistory: ((query: string) => void) | null;
  onClearSearchHistory: (() => void) | null;
  onClearSearchCache: (() => void) | null;
  onAddHighlight: (() => void) | null;
  onAddNote: (() => void) | null;
  onOpenNote: ((cfi: string) => void) | null;
  onEditNote: ((id: string) => void) | null;
  onDeleteNote: ((id: string) => void) | null;
  onDeleteNotes: ((ids: string[]) => void) | null;
};

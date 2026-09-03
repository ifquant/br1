// Ownership: this helper module defines one reader-domain contract that multiple
// UI surfaces depend on. Keep low-level normalization and invariants here so UI
// code can stay focused on reading semantics rather than format/runtime quirks.

import type { ReaderLookupProvider, ReaderTranslationProvider } from './assistance';
import type { ReaderTtsSpeechTarget } from './tts';

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
  koreaderProgressLocation: string;
  ttsSourceText: string;
  ttsSourceLabel: string;
  ttsSourceLanguage: string;
};

export const READER_EMPTY_TITLE = 'Bridge Reader';
export const READER_OPENING_LOCATION_LABEL = 'Opening book';
export const READER_NOT_OPENED_LOCATION_LABEL = 'Not opened';
export const READER_UNKNOWN_FORMAT_LABEL = 'BOOK';
export const READER_WAITING_LAYOUT_LABEL = 'WAITING';

export const createEmptyReaderPreviewState = (
  overrides: Partial<ReaderPreviewState> = {}
): ReaderPreviewState => ({
  // Boundary: this preview state is the neutral reader shell snapshot shared by
  // initial mount, restore gaps, and parallel-pane placeholders.
  title: READER_EMPTY_TITLE,
  author: '从书库选择一本书开始阅读',
  chapterLabel: '等待打开书籍',
  chapterHref: '',
  progressLabel: '0%',
  locationLabel: READER_NOT_OPENED_LOCATION_LABEL,
  formatLabel: READER_UNKNOWN_FORMAT_LABEL,
  layoutLabel: READER_WAITING_LAYOUT_LABEL,
  progressFraction: 0,
  progressLocation: '',
  koreaderProgressLocation: '',
  ttsSourceText: '',
  ttsSourceLabel: '',
  ttsSourceLanguage: '',
  ...overrides
});

export const getReaderFormatDisplayLabel = (formatLabel: string) => {
  if (formatLabel === READER_UNKNOWN_FORMAT_LABEL) return '书籍';
  return formatLabel;
};

export const getReaderLayoutDisplayLabel = (layoutLabel: string) => {
  if (layoutLabel === READER_WAITING_LAYOUT_LABEL) return '待打开';
  if (layoutLabel === 'PAGINATED') return '分页';
  if (layoutLabel === 'SCROLL') return '滚动';
  if (layoutLabel === 'FIXED') return '固定版式';
  return layoutLabel;
};

export const getReaderLocationDisplayLabel = (locationLabel: string) => {
  if (locationLabel === READER_NOT_OPENED_LOCATION_LABEL) return '未打开';
  if (locationLabel === READER_OPENING_LOCATION_LABEL) return '正在打开';
  return locationLabel;
};

export type ReaderViewWidthMode = 'focus' | 'standard' | 'wide';
export type ReaderChromeMode = 'auto' | 'always';
export type ReaderAtmosphereMode = 'paper' | 'warm' | 'soft';
export type ReaderFlowMode = 'paginated' | 'scrolled';
export type ReaderFontFamily = 'serif' | 'sans';
export type ReaderFontScale = 'sm' | 'md' | 'lg';
export type ReaderLineHeight = 'tight' | 'standard' | 'relaxed';
export type ReaderPageMargins = 'narrow' | 'standard' | 'wide';
export type ReaderThemePreset = ReaderAtmosphereMode;
export type ReaderReadingRulerMode = 'off' | 'on';
export type ReaderFocusAidMode = 'off' | 'line' | 'paragraph';
export type ReaderTtsReadAloudTextMode = 'source' | 'translated';
export type ReaderInlineTranslationTargetLanguage = 'zh' | 'en';
export type ReaderInlineTranslationBlockStatus = 'queued' | 'translating' | 'translated' | 'error';
export type ReaderInlineTranslationBlock = {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLabel: string;
  status: ReaderInlineTranslationBlockStatus;
  error: string;
  updatedAt: number;
};
export type ReaderInlineTranslationState = {
  enabled: boolean;
  showSource: boolean;
  showTranslation: boolean;
  targetLanguage: ReaderInlineTranslationTargetLanguage;
  provider: ReaderTranslationProvider;
  blocks: ReaderInlineTranslationBlock[];
};
export type ReaderPlaybackSegment = {
  id: string;
  target: ReaderTtsSpeechTarget;
};
export type ReaderPlaybackQueueState = {
  segments: ReaderPlaybackSegment[];
  activeIndex: number;
  playbackRate: number;
  timeoutAt: number | null;
};
export type ReaderPlaybackQueueSummary = {
  hasTarget: boolean;
  currentSegment: ReaderPlaybackSegment | null;
  currentLabel: string;
  currentSourceLabel: string;
  positionLabel: string;
  rate: number;
  rateLabel: string;
  timeoutAt: number | null;
  timeoutRemainingMs: number | null;
  timeoutLabel: string;
};
export type ReaderSettings = {
  flowMode: ReaderFlowMode;
  fontFamily: ReaderFontFamily;
  fontScale: ReaderFontScale;
  lineHeight: ReaderLineHeight;
  pageMargins: ReaderPageMargins;
  themePreset: ReaderThemePreset;
  applyThemeToPdf: boolean;
  viewWidthMode: ReaderViewWidthMode;
  chromeMode: ReaderChromeMode;
  readingRulerMode: ReaderReadingRulerMode;
  focusAidMode: ReaderFocusAidMode;
  ttsReadAloudText: ReaderTtsReadAloudTextMode;
};
export type ReaderHighlightsFilter = 'all' | 'chapter' | 'selected';
export type ReaderHighlightsSort = 'recent' | 'oldest';
export type ReaderHighlightSelectionSetSort = 'recent' | 'oldest';

export type ReaderHighlightSelectionSet = {
  id: string;
  name: string;
  selectedIds: string[];
  createdAt: number;
  importSource?: {
    bookKey: string;
    bookTitle: string;
    formatLabel: string;
    selectionName: string;
    matchedCount: number;
    totalCount: number;
    unmatchedCount: number;
    importedAt: number;
    highlights: ReaderHighlightSelectionSetExportHighlight[];
  };
};

export type ReaderHighlightSelectionSetExportHighlight = {
  id: string;
  cfi: string;
  text: string;
  chapterLabel: string;
  chapterHref: string;
  createdAt: number;
};

export type ReaderHighlightSelectionSetExport = {
  schemaVersion: 1;
  bookKey: string;
  bookTitle: string;
  bookAuthor: string;
  formatLabel: string;
  exportedAt: number;
  selectionSet: ReaderHighlightSelectionSet;
  highlights: ReaderHighlightSelectionSetExportHighlight[];
};

export type ReaderHighlightsWorkspaceState = {
  filter: ReaderHighlightsFilter;
  sort: ReaderHighlightsSort;
  savedSelectionsSort: ReaderHighlightSelectionSetSort;
  savedSelectionsRefreshFilter: 'all' | 'full' | 'partial' | 'missed';
  selectedIds: string[];
  savedSelections: ReaderHighlightSelectionSet[];
};

export type SidebarTab = 'toc' | 'search' | 'assist' | 'bookmarks' | 'highlights' | 'notes';

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

export type ReaderSearchHistoryEntry = {
  id: string;
  query: string;
  config: ReaderSearchConfig;
  resultCount: number;
  createdAt: number;
};

export type ReaderSelectionSegment = {
  index: number;
  cfi: string;
  text: string;
  chapterLabel: string;
  chapterHref: string;
  koreaderXPointer?: string;
};

export type ReaderSelectionState = Omit<ReaderSelectionSegment, 'index'> & {
  index?: number;
  /** One logical selection can contain one native Range per fixed-layout page. */
  segments?: ReaderSelectionSegment[];
};

export type ReaderAnnotationKind = 'note' | 'highlight';

export type ReaderKoReaderAnnotationMetadata = {
  bookHash?: string;
  metaHash?: string;
  xpointer0: string;
  xpointer1?: string | null;
  page?: number | null;
  style?: 'highlight' | 'underline' | 'squiggly' | null;
  color?: string | null;
  updatedAt?: number;
  deletedAt?: number | null;
};

export type ReaderKoReaderBookmarkMetadata = ReaderKoReaderAnnotationMetadata & {
  text?: string;
  note?: string;
};

export type ReaderNote = {
  id: string;
  kind: ReaderAnnotationKind;
  cfi: string;
  text: string;
  note: string;
  chapterLabel: string;
  chapterHref: string;
  createdAt: number;
  koreader?: ReaderKoReaderAnnotationMetadata;
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
  koreader?: ReaderKoReaderBookmarkMetadata;
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
  history: ReaderSearchHistoryEntry[];
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
  onSearchHistory: ((entry: ReaderSearchHistoryEntry) => void) | null;
  onClearSearchHistory: (() => void) | null;
  onDeleteSearchHistoryEntry: ((entryId: string) => void) | null;
  onClearSearchCache: (() => void) | null;
  onRequestLookup: ((provider: ReaderLookupProvider, term: string) => void) | null;
  onRequestTranslation: ((
    provider: ReaderTranslationProvider,
    text: string,
    targetLanguage: string
  ) => void) | null;
  onAddHighlight: (() => void) | null;
  onAddNote: (() => void) | null;
  onOpenNote: ((cfi: string) => void) | null;
  onEditNote: ((id: string) => void) | null;
  onDeleteNote: ((id: string) => void) | null;
  onDeleteNotes: ((ids: string[]) => void) | null;
};

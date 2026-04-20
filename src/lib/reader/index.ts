import type { ReaderEngineMountState, ReaderMountBoundary } from './types';

export type { ReaderEngineMountState, ReaderMountBoundary } from './types';
export {
  FOLIATE_VIEW_TAG,
  flattenToc,
  pickAuthor,
  pickText,
  ensureFoliateViewDefinition,
  createFoliateViewElement,
  getReaderViewStyles,
  installReaderBookTransformGuards,
  loadReaderBookDocument,
  wrapFoliateViewElement
} from './foliate';
export { createReaderSearchController } from './searchController';
export { createReaderNotesController } from './notesController';
export { createReaderBookmarksController } from './bookmarksController';
export { createReaderSidebarController } from './sidebarController';
export {
  createDefaultReaderSettings,
  getReaderThemePalette,
  hydrateReaderSettings,
  loadReaderSettings,
  normalizeReaderSettings,
  READER_SETTINGS_STORAGE_KEY,
  saveReaderSettings
} from './settings';
export type { ReaderThemePalette } from './settings';
export {
  getDesktopBookDialogExtensions,
  getReaderFormatSupportStatus,
  inferReaderFormatLabelFromName,
  isPlannedReaderFormatLabel,
  isSupportedReaderFormatLabel,
  READER_FILE_INPUT_ACCEPT
} from './formats';
export { parseReaderRouteOpenState, toReaderOpenControlRequest } from './route';
export type { FoliateViewElement, ReaderBookDocument } from './foliate';
export type { ReaderRouteOpenState, ReaderRouteOpenTarget } from './route';
export type {
  ReaderControlRequest,
  ReaderBookmark,
  ReaderBookmarksState,
  ReaderHighlightSelectionSet,
  ReaderHighlightSelectionSetExport,
  ReaderHighlightSelectionSetExportHighlight,
  ReaderHighlightSelectionSetSort,
  ReaderHighlightsFilter,
  ReaderHighlightsSort,
  ReaderHighlightsWorkspaceState,
  ReaderNote,
  ReaderSearchConfig,
  ReaderSelectionState,
  ReaderPreviewState,
  ReaderAtmosphereMode,
  ReaderFlowMode,
  ReaderFontFamily,
  ReaderFontScale,
  ReaderLineHeight,
  ReaderPageMargins,
  ReaderSettings,
  ReaderThemePreset,
  ReaderChromeMode,
  ReaderViewWidthMode,
  ReaderSearchExcerpt,
  ReaderSearchResult,
  ReaderSearchState,
  ReaderTocItem,
  ReaderSidebarCallbacks,
  ReaderSidebarNotesState,
  ReaderSidebarSearchState,
  SidebarTab
} from './types';

export const READER_ENGINE_HOST_ATTR = 'reader-engine-host';
export const READER_ENGINE_STATUS_ATTR = 'pending-adapter';

export const createReaderMountBoundary = (
  state: ReaderEngineMountState = 'idle'
): ReaderMountBoundary => ({
  hostRole: READER_ENGINE_HOST_ATTR,
  statusAttr: READER_ENGINE_STATUS_ATTR,
  state
});

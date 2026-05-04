import type { ReaderEngineMountState, ReaderMountBoundary } from './types';

export type { ReaderEngineMountState, ReaderMountBoundary } from './types';
export {
  canRequestAssistanceForText,
  createEmptyReaderAssistanceResultState,
  createReaderAssistanceHistoryEntry,
  createEmptyReaderAssistanceState,
  createErrorReaderAssistanceState,
  createLoadingReaderAssistanceState,
  createOfflineReaderAssistanceState,
  createReadyReaderAssistanceState,
  getReaderAssistanceProviderDisplayLabel,
  getReaderAssistanceRequestContextLabel,
  getReaderAssistanceRequestSubject,
  isLookupReaderAssistanceRequest,
  isTranslationReaderAssistanceRequest,
  getReaderTranslationProviderDisplayLabel,
  normalizeAssistanceTerm,
  normalizeAssistanceText,
  normalizeReaderAssistanceRequest,
  updateReaderAssistanceHistoryEntry,
  upsertReaderAssistanceHistoryEntry
} from './assistance';
export type {
  ReaderAssistanceHistoryEntry,
  ReaderAssistanceHistoryStatus,
  ReaderAssistanceProvider,
  ReaderAssistanceRequest,
  ReaderAssistanceResult,
  ReaderAssistanceState,
  ReaderAssistanceStatus,
  ReaderLookupProvider,
  ReaderLookupRequest,
  ReaderTranslationProvider,
  ReaderTranslationProviderStatus,
  ReaderTranslationProviderStatusKind,
  ReaderTranslationRequest
} from './assistance';
export {
  applyReaderCodeHighlightingToDocument,
  highlightReaderCode,
  parsePlainTextCodeBlocks,
  renderPlainTextBlocksHtml,
  renderReaderCodeHtml
} from './codeHighlighting';
export type {
  ReaderCodeLine,
  ReaderCodeToken,
  ReaderCodeTokenKind,
  ReaderPlainTextBlock
} from './codeHighlighting';
export {
  READER_EMPTY_TITLE,
  READER_NOT_OPENED_LOCATION_LABEL,
  READER_OPENING_LOCATION_LABEL,
  READER_UNKNOWN_FORMAT_LABEL,
  READER_WAITING_LAYOUT_LABEL,
  createEmptyReaderPreviewState,
  getReaderFormatDisplayLabel,
  getReaderLayoutDisplayLabel,
  getReaderLocationDisplayLabel
} from './types';
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
  XCFI,
  getCFIFromXPointer,
  getXPointerFromCFI,
  isKoReaderXPointer,
  normalizeProgressXPointer
} from './xcfi';
export type { ReaderXPointer } from './xcfi';
export {
  READER_PARALLEL_PRIMARY_PANE_ID,
  READER_PARALLEL_SECONDARY_PANE_ID,
  activateReaderParallelPane,
  closeReaderParallelSecondaryPane,
  createReaderParallelSessionFromRoute,
  openReaderParallelSecondaryPaneFromPrimary,
  updateReaderParallelPaneControlRequest,
  updateReaderParallelPanePreview
} from './parallel';
export type {
  ReaderParallelPaneId,
  ReaderParallelPaneProgressState,
  ReaderParallelPaneSourceState,
  ReaderParallelPaneState,
  ReaderParallelSessionState
} from './parallel';
export {
  READER_TTS_DEFAULT_SOURCE_LABEL,
  READER_TTS_DEFAULT_TARGET_LABEL,
  READER_TTS_FOLLOW_CURRENT_LABEL,
  READER_TTS_LOCKED_TARGET_LABEL,
  READER_TTS_UNAVAILABLE_REASON,
  createEmptyReaderTtsSessionState,
  createErrorReaderTtsSessionState,
  createIdleReaderTtsSessionState,
  createPausedReaderTtsSessionState,
  createReaderTtsController,
  createSpeakingReaderTtsSessionState,
  createUnavailableReaderTtsSessionState,
  getReaderTtsFollowCurrentLabel,
  getReaderTtsPrimaryActionLabel,
  getReaderTtsReadableSourceLabel,
  getReaderTtsReadableTargetLabel,
  getReaderTtsSessionStatusLabel,
  getReaderTtsStatusDetail,
  normalizeReaderTtsSpeechTarget,
  READER_TTS_NO_TEXT_REASON
} from './tts';
export type {
  ReaderTtsControllerOptions,
  ReaderTtsSessionAction,
  ReaderTtsSessionState,
  ReaderTtsSessionStatus,
  ReaderTtsSpeechTarget
} from './tts';
export {
  createDefaultReaderSettings,
  getReaderShellPalette,
  getReaderThemePalette,
  hydrateReaderSettings,
  loadReaderSettings,
  normalizeReaderSettings,
  READER_SETTINGS_STORAGE_KEY,
  saveReaderSettings
} from './settings';
export type { ReaderShellPalette, ReaderThemePalette } from './settings';
export {
  getDesktopBookDialogExtensions,
  getSearchSupportMessage,
  getReaderFormatSupportStatus,
  supportsSearchForFormat,
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
  ReaderSearchHistoryEntry,
  ReaderSelectionState,
  ReaderPreviewState,
  ReaderAtmosphereMode,
  ReaderFlowMode,
  ReaderFontFamily,
  ReaderFontScale,
  ReaderLineHeight,
  ReaderPageMargins,
  ReaderReadingRulerMode,
  ReaderSettings,
  ReaderThemePreset,
  ReaderChromeMode,
  ReaderViewWidthMode,
  ReaderFocusAidMode,
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

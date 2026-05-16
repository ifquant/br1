// Ownership: this helper module defines one reader-domain contract that multiple
// UI surfaces depend on. Keep low-level normalization and invariants here so UI
// code can stay focused on reading semantics rather than format/runtime quirks.

import type { ReaderEngineMountState, ReaderMountBoundary } from './types';

export type { ReaderEngineMountState, ReaderMountBoundary } from './types';
export {
  READER_ASSISTANCE_HISTORY_LIMIT,
  canRequestAssistanceForText,
  createEmptyReaderAssistanceResultState,
  createReaderAssistanceHistoryEntry,
  createEmptyReaderAssistanceWorkspaceSelection,
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
  parseReaderAssistanceHistory,
  parseReaderAssistanceWorkspaceSelection,
  serializeReaderAssistanceHistory,
  serializeReaderAssistanceWorkspaceSelection,
  updateReaderAssistanceHistoryEntry,
  upsertReaderAssistanceHistoryEntry
} from './assistance';
export type {
  ReaderAssistanceHistoryEntry,
  ReaderAssistanceHistoryStatus,
  ReaderAssistanceWorkspaceSelection,
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
  getReaderTtsCompactPlaybackLocationSummary,
  getReaderTtsFollowCurrentLabel,
  isReaderTtsPlaybackLocationDrifted,
  getReaderTtsMiniBarContextSummary,
  getReaderTtsPlaybackLocationSummary,
  getReaderTtsPrimaryActionLabel,
  getReaderTtsReadableSourceLabel,
  getReaderTtsReadableTargetLabel,
  getReaderTtsTranslatedWaitingTargetLabel,
  getReaderTtsSessionStatusLabel,
  getReaderTtsStatusDetail,
  normalizeReaderTtsLanguageTag,
  normalizeReaderTtsSpeechTarget,
  planReaderTtsRetargetAction,
  shouldShowReaderTtsMiniBar,
  resolveReaderTtsSpeechTargetForMode,
  READER_TTS_NO_TEXT_REASON
} from './tts';
export type {
  ReaderTtsControllerOptions,
  ReaderTtsRetargetAction,
  ReaderTtsSourceTargetInput,
  ReaderTtsSessionAction,
  ReaderTtsSessionState,
  ReaderTtsSessionStatus,
  ReaderTtsSpeechTarget,
  ReaderTtsTranslatedTargetInput
} from './tts';
export {
  getReaderTtsPreviewLocationLabel,
  getReaderTtsPreviewPlaybackLocationSummary,
  persistReaderTtsOwnershipState,
  resolveReaderEffectiveTtsTarget,
  resolveReaderLiveTranslatedTtsResult,
  resolveReaderRouteTranslatedTtsOwner,
  resolveReaderTranslatedTtsLiveSnapshotState,
  resolveReaderTranslatedTtsOwnerFallback,
  resolveReaderTranslatedTtsResult,
  resolveReaderTranslatedTtsSourceState,
  resolveReaderTranslationTtsDerivationState,
  resolveReaderTtsMiniBarContextSummary,
  resolveReaderTtsMiniBarLocationSummary,
  resolveReaderTtsMiniBarState,
  resolveReaderTtsMiniBarVisible,
  resolveReaderTtsSpeechTarget,
  resolveReaderTtsTranslatedWaitingTargetLabel,
  restoreReaderTtsOwnershipState
} from './ttsOwnership';
export type {
  ReaderTranslatedTtsResult,
  ReaderTranslatedTtsSourceKind,
  ReaderTranslatedTtsSourceState,
  ReaderTranslationTtsDerivationState,
  ReaderTtsMiniBarState,
  ReaderTtsOwnershipState
} from './ttsOwnership';
export type { ReaderTtsRuntime } from './ttsRuntime';
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
  canStartReaderFocusedReading,
  createReaderFocusedReadingState,
  advanceReaderRsvpWord,
  exitReaderFocusedReading,
  getReaderFocusedReadingSummary,
  startReaderParagraphFocus,
  startReaderRsvpLite
} from './readingMode';
export type {
  ReaderFocusedReadingMode,
  ReaderFocusedReadingState
} from './readingMode';
export {
  createReaderPlaybackQueue,
  getReaderPlaybackQueueSummary,
  moveReaderPlaybackQueueNext,
  moveReaderPlaybackQueuePrevious,
  setReaderPlaybackRate,
  setReaderPlaybackTimeout
} from './playbackQueue';
export type {
  ReaderPlaybackQueueState,
  ReaderPlaybackQueueSummary,
  ReaderPlaybackSegment
} from './types';
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
export {
  parseReaderRouteOpenState,
  toReaderOpenControlRequest,
  toReaderWorkspaceModeHref
} from './route';
export {
  getReaderDedicatedWorkspaceModeForNotebookTab,
  normalizeReaderNotebookWorkspaceTab,
  resolveReaderNotebookShellState,
  resolveReaderNotebookTabRouteRequest,
  resolveReaderRouteTtsReadAloudTextMode,
  resolveReaderRouteWorkspaceApplication,
  resolveReaderTranslatedTtsWorkspaceRequest,
  resolveReaderWorkspaceModeRouteRequest
} from './workspaceMode';
export {
  canPersistReaderCurrentBookTranslationLiveSnapshot,
  canPersistReaderCurrentBookTranslationModeConfig,
  canPersistReaderCurrentBookTtsOwnershipState,
  getReaderCurrentBookPersistenceKeys,
  persistReaderCurrentBookAssistanceHistory,
  restoreReaderCurrentBookAssistanceHistory,
  persistReaderCurrentBookAssistanceSelection,
  restoreReaderCurrentBookAssistanceSelection,
  persistReaderTranslationOwnership,
  restoreReaderTranslationOwnership,
  persistReaderCurrentBookTranslationLiveSnapshot,
  restoreReaderCurrentBookTranslationLiveSnapshot,
  persistReaderCurrentBookTranslationModeConfig,
  restoreReaderCurrentBookTranslationModeConfig,
  persistReaderTtsOwnership,
  restoreReaderTtsOwnership,
  persistReaderCurrentBookTtsReadAloudMode,
  restoreReaderCurrentBookTtsReadAloudMode,
  persistReaderCurrentBookTranslatedTtsOwner,
  restoreReaderCurrentBookTranslatedTtsOwner,
  persistReaderCurrentBookTranslatedTtsLiveSnapshot,
  restoreReaderCurrentBookTranslatedTtsLiveSnapshot
} from './currentBookPersistence';
export {
  createPinnedReaderTranslationSource,
  normalizeReaderTranslationSource,
  resolveReaderEffectiveTranslationSource,
  resolveReaderLiveTranslationPanelResult,
  resolveReaderNextTranslationLiveSnapshot,
  resolveReaderRouteTranslationModeConfig,
  resolveReaderTranslationLiveSnapshotState,
  resolveReaderTranslationModeConfigRestore
} from './translationOwnership';
export type { FoliateViewElement, ReaderBookDocument } from './foliate';
export type {
  ReaderRouteOpenState,
  ReaderRouteOpenTarget,
  ReaderRouteWorkspaceMode
} from './route';
export type {
  ReaderNotebookShellState,
  ReaderNotebookWorkspaceTab,
  ReaderRouteWorkspaceApplication,
  ReaderWorkspaceModeRouteRequest
} from './workspaceMode';
export type {
  ReaderCurrentBookPersistenceKeys,
  ReaderTranslatedTtsLiveSnapshot,
  ReaderTranslatedTtsOwner,
  ReaderTranslationLiveSnapshot,
  ReaderTranslationModeConfig,
  ReaderTranslationOwnership,
  ReaderTtsOwnership
} from './currentBookPersistence';
export type {
  ReaderLiveTranslationPanelResult,
  ReaderTranslationSource
} from './translationOwnership';
export {
  createEmptyReaderInlineTranslationState,
  getReaderInlineTranslationSummary,
  markReaderInlineTranslationError,
  markReaderInlineTranslationTranslated,
  markReaderInlineTranslationTranslating,
  toggleReaderInlineTranslationVisibility,
  upsertReaderInlineTranslationCandidate
} from './inlineTranslation';
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
  ReaderTtsReadAloudTextMode,
  ReaderSettings,
  ReaderThemePreset,
  ReaderChromeMode,
  ReaderViewWidthMode,
  ReaderFocusAidMode,
  ReaderInlineTranslationBlock,
  ReaderInlineTranslationBlockStatus,
  ReaderInlineTranslationState,
  ReaderInlineTranslationTargetLanguage,
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

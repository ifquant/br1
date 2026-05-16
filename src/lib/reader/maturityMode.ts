// Ownership: these helpers keep the route's newer maturity-mode coordination
// rules auditable. The Svelte route still owns navigation, persistence, and
// event handlers, but the precedence and reset decisions live here as pure
// functions so later slices do not re-encode them inline.

import type {
  ReaderAssistanceHistoryEntry,
  ReaderAssistanceWorkspaceSelection,
  ReaderTranslationProvider
} from './assistance.js';
import type {
  ReaderTranslatedTtsLiveSnapshot,
  ReaderTranslatedTtsOwner,
  ReaderTranslationLiveSnapshot,
  ReaderTranslationModeConfig,
  ReaderTranslationOwnership,
  ReaderTtsOwnership
} from './currentBookPersistence.js';
import { createEmptyReaderInlineTranslationState } from './inlineTranslation.js';
import { createReaderPlaybackQueue } from './playbackQueue.js';
import {
  createReaderFocusedReadingState,
  type ReaderFocusedReadingState
} from './readingMode.js';
import type { ReaderRouteOpenState } from './route.js';
import { resolveReaderTranslationModeConfigRestore } from './translationOwnership.js';
import type {
  ReaderInlineTranslationState,
  ReaderPlaybackQueueState,
  ReaderControlRequest,
  ReaderSelectionState,
  ReaderTtsReadAloudTextMode
} from './types.js';
import type { ReaderTtsSpeechTarget } from './tts.js';

type ReaderPlaybackQueueRetargetInput = {
  effectiveTtsTarget: ReaderTtsSpeechTarget | null;
  currentState: ReaderPlaybackQueueState;
  lastTargetKey: string;
  now?: number;
};

type ReaderPopupNonceResetInput<T> = {
  currentPopupState: T | null;
  controlNonce: number;
  handledControlNonce: number;
};

type ReaderSelectionBookChangeInput = {
  currentSelection: ReaderSelectionState | null;
  previousBookKey: string;
  nextBookKey: string;
};

type ReaderFocusedReadingLaunchSelectionInput = {
  launchMode: 'paragraph' | 'rsvp';
  formatLabel: string;
  currentSelection: ReaderSelectionState | null;
  currentSelectionGuard: ReaderFocusedReadingLaunchSelectionGuard | null;
};

type ReaderFocusedReadingLaunchSelectionGuardForSelectionChangeInput = {
  formatLabel: string;
  currentSelectionGuard: ReaderFocusedReadingLaunchSelectionGuard | null;
  previousSelection: ReaderSelectionState | null;
  nextSelection: ReaderSelectionState | null;
};

type ReaderFocusedReadingLaunchSelectionGuardForControlRequestInput = {
  currentSelectionGuard: ReaderFocusedReadingLaunchSelectionGuard | null;
  request: ReaderControlRequest;
};

type ReaderFocusedReadingLaunchSelectionGuardBoundaryForSelectionChangeInput = {
  formatLabel: string;
  currentSelectionGuard: ReaderFocusedReadingLaunchSelectionGuard | null;
  previousSelection: ReaderSelectionState | null;
  nextSelection: ReaderSelectionState | null;
  currentRearmSuppressed: boolean;
};

type ReaderFocusedReadingLaunchSelectionGuardBoundaryForControlRequestInput = {
  currentSelectionGuard: ReaderFocusedReadingLaunchSelectionGuard | null;
  currentRearmSuppressed: boolean;
  request: ReaderControlRequest;
};

type ReaderFocusedReadingLaunchSelectionGuardBookChangeInput = {
  currentSelectionGuard: ReaderFocusedReadingLaunchSelectionGuard | null;
  previousBookKey: string;
  nextBookKey: string;
};

type ReaderFocusedReadingLaunchSelectionGuardBoundaryForBookChangeInput = {
  currentSelectionGuard: ReaderFocusedReadingLaunchSelectionGuard | null;
  currentRearmSuppressed: boolean;
  previousBookKey: string;
  nextBookKey: string;
};

export type ReaderFocusedReadingLaunchSelectionGuard = {
  // This guard only exists for the narrow "selection just vanished before
  // paragraph-focus launch" boundary. `armed: false` means the route is merely
  // staging the latest live EPUB selection; `armed: true` means the live
  // selection has now cleared and the next launch may consume it once.
  armed: boolean;
  selection: ReaderSelectionState;
};

export type ReaderFocusedReadingLaunchSelectionResolution = {
  selection: ReaderSelectionState | null;
  nextSelectionGuard: ReaderFocusedReadingLaunchSelectionGuard | null;
};

export type ReaderFocusedReadingLaunchSelectionGuardBoundaryResolution = {
  nextSelectionGuard: ReaderFocusedReadingLaunchSelectionGuard | null;
  nextRearmSuppressed: boolean;
};

type ReaderMaturityBookRestoreTtsState = {
  ownership: ReaderTtsOwnership;
  readAloudTextMode: ReaderTtsReadAloudTextMode;
  translatedOwner: ReaderTranslatedTtsOwner;
  translatedLiveSnapshot: ReaderTranslatedTtsLiveSnapshot | null;
};

type ReaderMaturityBookRestoreInput = {
  readerBookKey: string;
  previousBookKey: string;
  currentSelection: ReaderSelectionState | null;
  restoredTtsState: ReaderMaturityBookRestoreTtsState;
  restoredTranslationOwnership: ReaderTranslationOwnership;
  restoredTranslationModeConfig: ReaderTranslationModeConfig;
  restoredTranslationLiveSnapshot: ReaderTranslationLiveSnapshot | null;
  assistanceHistory: ReaderAssistanceHistoryEntry[];
  assistanceSelection: ReaderAssistanceWorkspaceSelection;
  routeOpenState: Pick<
    ReaderRouteOpenState,
    'workspaceMode' | 'translationTargetLanguage' | 'translationProvider' | 'translationHistoryEntryId'
  >;
};

export type ReaderMaturityBookRestoreState = {
  restoredBookKey: string;
  ttsReadAloudTextMode: ReaderTtsReadAloudTextMode;
  translatedTtsOwner: ReaderTranslatedTtsOwner;
  translatedTtsLiveSnapshot: ReaderTranslatedTtsLiveSnapshot | null;
  ttsFollowsCurrentLocation: boolean;
  pinnedTtsTarget: ReaderTtsSpeechTarget | null;
  translationFollowsCurrentSource: boolean;
  pinnedTranslationSource: ReaderTranslationOwnership['pinnedSource'];
  translationTargetLanguage: string;
  translationProvider: ReaderTranslationProvider;
  translationLiveSnapshot: ReaderTranslationLiveSnapshot | null;
  inlineTranslationState: ReaderInlineTranslationState;
  inlineTranslationStatusMessage: string;
  inlineTranslationCapabilityMessage: string;
  latestInlineTranslationCandidates: null;
  currentReaderSelection: ReaderSelectionState | null;
  focusedReadingState: ReaderFocusedReadingState;
};

const getReaderPlaybackTargetKey = (target: ReaderTtsSpeechTarget | null): string =>
  JSON.stringify(target ?? null);

const getReaderPlaybackTimeoutRemainingMs = (
  state: ReaderPlaybackQueueState,
  now: number
): number | null =>
  typeof state.timeoutAt === 'number' && state.timeoutAt > now ? state.timeoutAt - now : null;

const findReaderRouteTranslationHistoryEntry = (
  history: ReaderAssistanceHistoryEntry[],
  entryId: string | null
): ReaderAssistanceHistoryEntry | null =>
  entryId?.trim()
    ? history.find(
        (entry) => entry.id === entryId && entry.request.kind === 'translation'
      ) ?? null
    : null;

const hasReaderSelectionText = (selection: ReaderSelectionState | null) =>
  Boolean(selection?.text.trim());

const isEpubReaderSelectionLatchFormat = (formatLabel: string) =>
  formatLabel.trim().toUpperCase() === 'EPUB';

const doesReaderControlRequestChangeReadingContext = (request: ReaderControlRequest) =>
  request.type === 'asset' ||
  request.type === 'library-file' ||
  request.type === 'file' ||
  request.type === 'prev' ||
  request.type === 'next' ||
  request.type === 'start' ||
  request.type === 'fraction' ||
  request.type === 'href';

export const resolveReaderMaturityRouteTranslationConfig = (input: {
  currentConfig: ReaderTranslationModeConfig;
  assistanceHistory: ReaderAssistanceHistoryEntry[];
  routeOpenState: Pick<
    ReaderRouteOpenState,
    'workspaceMode' | 'translationTargetLanguage' | 'translationProvider' | 'translationHistoryEntryId'
  >;
}): ReaderTranslationModeConfig => {
  if (input.routeOpenState.workspaceMode !== 'translation') {
    return input.currentConfig;
  }

  const routeTargetLanguage = input.routeOpenState.translationTargetLanguage?.trim() || '';
  const routeProvider = input.routeOpenState.translationProvider;
  const routeEntry = findReaderRouteTranslationHistoryEntry(
    input.assistanceHistory,
    input.routeOpenState.translationHistoryEntryId
  );
  const routeTranslationRequest =
    routeEntry?.request.kind === 'translation' ? routeEntry.request : null;

  return {
    targetLanguage:
      routeTargetLanguage ||
      routeTranslationRequest?.targetLanguage ||
      input.currentConfig.targetLanguage,
    provider: routeProvider || routeTranslationRequest?.provider || input.currentConfig.provider
  };
};

export const resolveReaderAnnotationPopupSelectionForBookChange = (
  input: ReaderSelectionBookChangeInput
): ReaderSelectionState | null =>
  input.previousBookKey !== input.nextBookKey ? null : input.currentSelection;

// Focused-reading launch can start from header chrome that temporarily steals
// focus from the EPUB iframe. The route therefore arms a one-shot guard only
// when an EPUB selection clears, then consumes that guard from the next shared
// focused-reading launch decision instead of caching the excerpt for the whole
// book session.
export const consumeReaderFocusedReadingLaunchSelection = (
  input: ReaderFocusedReadingLaunchSelectionInput
): ReaderFocusedReadingLaunchSelectionResolution => {
  if (hasReaderSelectionText(input.currentSelection)) {
    return {
      selection: input.currentSelection,
      nextSelectionGuard: null
    };
  }
  if (
    input.launchMode === 'paragraph' &&
    isEpubReaderSelectionLatchFormat(input.formatLabel) &&
    input.currentSelectionGuard?.armed &&
    hasReaderSelectionText(input.currentSelectionGuard.selection)
  ) {
    return {
      selection: input.currentSelectionGuard.selection,
      nextSelectionGuard: null
    };
  }
  return {
    selection: null,
    nextSelectionGuard: null
  };
};

// Only an EPUB selection-clear transition can arm this guard. A live
// selection keeps the staged excerpt fresh, while a clear transition flips the
// guard into one-shot armed mode. Non-EPUB renderers still clear the guard so
// this route-owned fallback never turns into a generic selection cache.
export const resolveReaderFocusedReadingLaunchSelectionGuardForSelectionChange = (
  input: ReaderFocusedReadingLaunchSelectionGuardForSelectionChangeInput
): ReaderFocusedReadingLaunchSelectionGuard | null => {
  if (!isEpubReaderSelectionLatchFormat(input.formatLabel)) {
    return null;
  }
  if (hasReaderSelectionText(input.nextSelection)) {
    return {
      armed: false,
      selection: input.nextSelection!
    };
  }
  const stagedSelection = hasReaderSelectionText(input.previousSelection)
    ? input.previousSelection
    : hasReaderSelectionText(input.currentSelectionGuard?.selection ?? null)
      ? input.currentSelectionGuard?.selection ?? null
      : null;
  if (stagedSelection) {
    return {
      armed: true,
      selection: stagedSelection
    };
  }
  return null;
};

// Explicit reader navigation ends the narrow "selection just vanished before
// launch" window. Clearing the guard here avoids keeping an old EPUB selection
// alive after the reader has intentionally moved to another page/chapter.
export const resolveReaderFocusedReadingLaunchSelectionGuardForControlRequest = (
  input: ReaderFocusedReadingLaunchSelectionGuardForControlRequestInput
): ReaderFocusedReadingLaunchSelectionGuard | null =>
  input.currentSelectionGuard && doesReaderControlRequestChangeReadingContext(input.request)
    ? null
    : input.currentSelectionGuard;

// The route owns one extra bit of state for the delayed Foliate clear race.
// Same-book navigation can intentionally clear the one-shot guard before the
// EPUB iframe reports `selectionchange(null)`. This boundary keeps that
// explicit sticky-clear suppression separate from the actual staged selection
// payload so a later null event cannot silently rebuild the guard.
export const resolveReaderFocusedReadingLaunchSelectionGuardBoundaryForSelectionChange = (
  input: ReaderFocusedReadingLaunchSelectionGuardBoundaryForSelectionChangeInput
): ReaderFocusedReadingLaunchSelectionGuardBoundaryResolution => {
  if (hasReaderSelectionText(input.nextSelection)) {
    return {
      nextSelectionGuard: resolveReaderFocusedReadingLaunchSelectionGuardForSelectionChange({
        formatLabel: input.formatLabel,
        currentSelectionGuard: input.currentSelectionGuard,
        previousSelection: input.previousSelection,
        nextSelection: input.nextSelection
      }),
      nextRearmSuppressed: false
    };
  }
  if (input.currentRearmSuppressed && isEpubReaderSelectionLatchFormat(input.formatLabel)) {
    return {
      nextSelectionGuard: null,
      nextRearmSuppressed: true
    };
  }
  return {
    nextSelectionGuard: resolveReaderFocusedReadingLaunchSelectionGuardForSelectionChange({
      formatLabel: input.formatLabel,
      currentSelectionGuard: input.currentSelectionGuard,
      previousSelection: input.previousSelection,
      nextSelection: input.nextSelection
    }),
    nextRearmSuppressed: false
  };
};

export const resolveReaderFocusedReadingLaunchSelectionGuardBoundaryForControlRequest = (
  input: ReaderFocusedReadingLaunchSelectionGuardBoundaryForControlRequestInput
): ReaderFocusedReadingLaunchSelectionGuardBoundaryResolution => ({
  nextSelectionGuard: resolveReaderFocusedReadingLaunchSelectionGuardForControlRequest({
    currentSelectionGuard: input.currentSelectionGuard,
    request: input.request
  }),
  nextRearmSuppressed: doesReaderControlRequestChangeReadingContext(input.request)
    ? true
    : input.currentRearmSuppressed
});

export const resolveReaderFocusedReadingLaunchSelectionGuardForBookChange = (
  input: ReaderFocusedReadingLaunchSelectionGuardBookChangeInput
): ReaderFocusedReadingLaunchSelectionGuard | null =>
  input.previousBookKey !== input.nextBookKey ? null : input.currentSelectionGuard;

export const resolveReaderFocusedReadingLaunchSelectionGuardBoundaryForBookChange = (
  input: ReaderFocusedReadingLaunchSelectionGuardBoundaryForBookChangeInput
): ReaderFocusedReadingLaunchSelectionGuardBoundaryResolution => ({
  nextSelectionGuard: resolveReaderFocusedReadingLaunchSelectionGuardForBookChange({
    currentSelectionGuard: input.currentSelectionGuard,
    previousBookKey: input.previousBookKey,
    nextBookKey: input.nextBookKey
  }),
  nextRearmSuppressed:
    input.previousBookKey !== input.nextBookKey ? false : input.currentRearmSuppressed
});

export const resolveReaderMaturityBookRestoreState = (
  input: ReaderMaturityBookRestoreInput
): ReaderMaturityBookRestoreState => {
  const restoredTranslationConfig = resolveReaderTranslationModeConfigRestore({
    restoredConfig: input.restoredTranslationModeConfig,
    assistanceHistory: input.assistanceHistory,
    assistanceSelection: input.assistanceSelection,
    routeOpenState: input.routeOpenState
  });
  const inlineTargetLanguage =
    restoredTranslationConfig.targetLanguage.trim().toLowerCase() === 'en' ? 'en' : 'zh';

  return {
    restoredBookKey: input.readerBookKey,
    ttsReadAloudTextMode: input.restoredTtsState.readAloudTextMode,
    translatedTtsOwner: input.restoredTtsState.translatedOwner,
    translatedTtsLiveSnapshot: input.restoredTtsState.translatedLiveSnapshot,
    ttsFollowsCurrentLocation: input.restoredTtsState.ownership.followsCurrentLocation,
    pinnedTtsTarget: input.restoredTtsState.ownership.pinnedTarget,
    translationFollowsCurrentSource:
      input.restoredTranslationOwnership.followsCurrentSource,
    pinnedTranslationSource: input.restoredTranslationOwnership.pinnedSource,
    translationTargetLanguage: restoredTranslationConfig.targetLanguage,
    translationProvider: restoredTranslationConfig.provider,
    translationLiveSnapshot: input.restoredTranslationLiveSnapshot,
    // Inline translation works against visible text candidates from the new
    // book. Resetting blocks and candidate cache here prevents stale translated
    // paragraphs from being shown under the next book's language/provider chips.
    inlineTranslationState: createEmptyReaderInlineTranslationState({
      provider: restoredTranslationConfig.provider,
      targetLanguage: inlineTargetLanguage
    }),
    inlineTranslationStatusMessage: '等待可翻译正文。',
    inlineTranslationCapabilityMessage: '正文内译文会等待阅读视窗提供安全正文候选。',
    latestInlineTranslationCandidates: null,
    currentReaderSelection: resolveReaderAnnotationPopupSelectionForBookChange({
      currentSelection: input.currentSelection,
      previousBookKey: input.previousBookKey,
      nextBookKey: input.readerBookKey
    }),
    // Focused reading is temporary UI over the current renderer text. A book
    // switch must close it even when the next book restores to the same CFI-like
    // progress label.
    focusedReadingState: createReaderFocusedReadingState()
  };
};

// A new reader control request can swap chapters, search results, or whole
// documents. Popup UI anchored to the previous document must therefore close
// before the next renderer state arrives.
export const resolveReaderPopupStateForControlNonce = <T>(
  input: ReaderPopupNonceResetInput<T>
): T | null =>
  input.controlNonce !== input.handledControlNonce ? null : input.currentPopupState;

export const resolveReaderPlaybackQueueForEffectiveTtsTarget = (
  input: ReaderPlaybackQueueRetargetInput
): {
  state: ReaderPlaybackQueueState;
  targetKey: string;
  didReset: boolean;
} => {
  const targetKey = getReaderPlaybackTargetKey(input.effectiveTtsTarget);
  if (targetKey === input.lastTargetKey) {
    return {
      state: input.currentState,
      targetKey,
      didReset: false
    };
  }

  const now = typeof input.now === 'number' && Number.isFinite(input.now) ? input.now : Date.now();

  return {
    state: createReaderPlaybackQueue([input.effectiveTtsTarget], {
      playbackRate: input.currentState.playbackRate,
      timeoutMs: getReaderPlaybackTimeoutRemainingMs(input.currentState, now),
      now
    }),
    targetKey,
    didReset: true
  };
};

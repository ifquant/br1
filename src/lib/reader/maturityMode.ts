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

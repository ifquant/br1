// Ownership: these helpers keep the route's newer maturity-mode coordination
// rules auditable. The Svelte route still owns navigation, persistence, and
// event handlers, but the precedence and reset decisions live here as pure
// functions so later slices do not re-encode them inline.

import type {
  ReaderAssistanceHistoryEntry,
  ReaderTranslationProvider
} from './assistance.js';
import { createReaderPlaybackQueue } from './playbackQueue.js';
import type { ReaderRouteOpenState } from './route.js';
import type { ReaderPlaybackQueueState, ReaderSelectionState } from './types.js';
import type { ReaderTtsSpeechTarget } from './tts.js';

type ReaderTranslationModeConfig = {
  targetLanguage: string;
  provider: ReaderTranslationProvider;
};

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

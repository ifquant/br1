// Ownership: TTS mode restore, translated-source choice, and mini-bar summaries
// are reader-domain decisions. Keeping them here lets the Svelte route coordinate
// stores and navigation without reimplementing the same precedence rules inline.

import {
  getReaderAssistanceRequestContextLabel,
  getReaderTranslationProviderDisplayLabel,
  normalizeAssistanceText,
  type ReaderAssistanceHistoryEntry,
  type ReaderAssistanceState,
  type ReaderAssistanceWorkspaceSelection
} from './assistance';
import {
  persistReaderCurrentBookTranslatedTtsLiveSnapshot,
  persistReaderCurrentBookTranslatedTtsOwner,
  persistReaderCurrentBookTtsReadAloudMode,
  persistReaderTtsOwnership,
  restoreReaderCurrentBookTranslatedTtsLiveSnapshot,
  restoreReaderCurrentBookTranslatedTtsOwner,
  restoreReaderCurrentBookTtsReadAloudMode,
  restoreReaderTtsOwnership,
  type ReaderCurrentBookPersistenceKeys,
  type ReaderTranslatedTtsLiveSnapshot,
  type ReaderTranslatedTtsOwner,
  type ReaderTtsOwnership
} from './currentBookPersistence';
import type { ReaderRouteOpenState } from './route';
import {
  READER_EMPTY_TITLE,
  READER_NOT_OPENED_LOCATION_LABEL,
  READER_OPENING_LOCATION_LABEL,
  type ReaderPreviewState,
  type ReaderTtsReadAloudTextMode
} from './types';
import {
  getReaderTtsCompactPlaybackLocationSummary,
  getReaderTtsMiniBarContextSummary,
  getReaderTtsReadableTargetLabel,
  getReaderTtsTranslatedWaitingTargetLabel,
  resolveReaderTtsSpeechTargetForMode,
  shouldShowReaderTtsMiniBar,
  type ReaderTtsSessionState,
  type ReaderTtsSpeechTarget
} from './tts';
import type { ReaderTranslationSource } from './translationOwnership';

export type ReaderTranslatedTtsSourceKind =
  | 'none'
  | 'live-translation'
  | 'archived-translation';

export type ReaderTranslatedTtsSourceState = {
  kind: ReaderTranslatedTtsSourceKind;
  contextLabel: string;
  text: string;
};

export type ReaderTranslatedTtsResult = {
  translatedText: string;
  targetLanguage: string;
  providerLabel: string;
  chapterLabel: string;
  locationLabel?: string;
  progressLabel?: string;
  progressLocation?: string;
  progressFraction?: number | null;
  chapterHref?: string;
};

export type ReaderTtsOwnershipState = {
  ownership: ReaderTtsOwnership;
  readAloudTextMode: ReaderTtsReadAloudTextMode;
  translatedOwner: ReaderTranslatedTtsOwner;
  translatedLiveSnapshot: ReaderTranslatedTtsLiveSnapshot | null;
};

type ReaderTtsStorageKeys = Pick<
  ReaderCurrentBookPersistenceKeys,
  | 'ttsOwnershipStorageKey'
  | 'ttsReadAloudModeStorageKey'
  | 'translatedTtsOwnerStorageKey'
  | 'translatedTtsLiveSnapshotStorageKey'
>;

const EMPTY_TRANSLATED_TTS_SOURCE_STATE: ReaderTranslatedTtsSourceState = {
  kind: 'none',
  contextLabel: '',
  text: ''
};

const getReaderPreviewChapterLabel = (preview: ReaderPreviewState): string => {
  const chapterLabel = preview.chapterLabel.trim();
  if (
    !chapterLabel ||
    chapterLabel === READER_NOT_OPENED_LOCATION_LABEL ||
    chapterLabel === READER_OPENING_LOCATION_LABEL ||
    chapterLabel === '等待打开书籍'
  ) {
    return '';
  }

  return chapterLabel;
};

export const getReaderTtsPreviewLocationLabel = (
  preview: ReaderPreviewState,
  getLocationDisplayLabel: (locationLabel: string) => string
): string =>
  preview.locationLabel === READER_NOT_OPENED_LOCATION_LABEL ||
  preview.locationLabel === READER_OPENING_LOCATION_LABEL
    ? ''
    : getLocationDisplayLabel(preview.locationLabel).trim();

export const resolveReaderTranslatedTtsOwnerFallback = (input: {
  routeOpenState: Pick<
    ReaderRouteOpenState,
    'workspaceMode' | 'ttsReadAloudTextMode' | 'translationHistoryEntryId'
  >;
  assistanceSelection: Pick<ReaderAssistanceWorkspaceSelection, 'translationHistoryEntryId'>;
}): ReaderTranslatedTtsOwner => {
  const routeOwnsArchivedTranslation =
    input.routeOpenState.workspaceMode === 'tts' &&
    input.routeOpenState.ttsReadAloudTextMode === 'translated' &&
    !!input.routeOpenState.translationHistoryEntryId?.trim();
  const currentBookHasSelectedArchive =
    !!input.assistanceSelection.translationHistoryEntryId.trim();

  return routeOwnsArchivedTranslation || currentBookHasSelectedArchive ? 'archive' : 'live';
};

export const resolveReaderRouteTranslatedTtsOwner = (input: {
  currentOwner: ReaderTranslatedTtsOwner;
  routeOpenState: Pick<
    ReaderRouteOpenState,
    'workspaceMode' | 'ttsReadAloudTextMode' | 'translationHistoryEntryId'
  >;
}): ReaderTranslatedTtsOwner => {
  if (input.routeOpenState.workspaceMode === 'translation') {
    return input.routeOpenState.translationHistoryEntryId?.trim() ? 'archive' : 'live';
  }

  if (
    input.routeOpenState.workspaceMode === 'tts' &&
    input.routeOpenState.ttsReadAloudTextMode === 'translated' &&
    input.routeOpenState.translationHistoryEntryId?.trim()
  ) {
    return 'archive';
  }

  return input.currentOwner;
};

export const restoreReaderTtsOwnershipState = (input: {
  storage: Storage | undefined;
  keys: ReaderTtsStorageKeys;
  defaultReadAloudTextMode: ReaderTtsReadAloudTextMode;
  fallbackTranslatedOwner: ReaderTranslatedTtsOwner;
}): ReaderTtsOwnershipState => ({
  ownership: restoreReaderTtsOwnership(input.storage, input.keys.ttsOwnershipStorageKey),
  readAloudTextMode: restoreReaderCurrentBookTtsReadAloudMode(
    input.storage,
    input.keys.ttsReadAloudModeStorageKey,
    input.defaultReadAloudTextMode
  ),
  translatedOwner: restoreReaderCurrentBookTranslatedTtsOwner(
    input.storage,
    input.keys.translatedTtsOwnerStorageKey,
    input.fallbackTranslatedOwner
  ),
  translatedLiveSnapshot: restoreReaderCurrentBookTranslatedTtsLiveSnapshot(
    input.storage,
    input.keys.translatedTtsLiveSnapshotStorageKey
  )
});

export const persistReaderTtsOwnershipState = (input: {
  storage: Storage | undefined;
  keys: ReaderTtsStorageKeys;
  ownership: ReaderTtsOwnership;
  readAloudTextMode: ReaderTtsReadAloudTextMode;
  translatedOwner: ReaderTranslatedTtsOwner;
  translatedLiveSnapshot: ReaderTranslatedTtsLiveSnapshot | null;
}) => {
  persistReaderTtsOwnership(input.storage, input.keys.ttsOwnershipStorageKey, input.ownership);
  persistReaderCurrentBookTtsReadAloudMode(
    input.storage,
    input.keys.ttsReadAloudModeStorageKey,
    input.readAloudTextMode
  );
  persistReaderCurrentBookTranslatedTtsOwner(
    input.storage,
    input.keys.translatedTtsOwnerStorageKey,
    input.translatedOwner
  );
  persistReaderCurrentBookTranslatedTtsLiveSnapshot(
    input.storage,
    input.keys.translatedTtsLiveSnapshotStorageKey,
    input.translatedLiveSnapshot
  );
};

export const resolveReaderEffectiveTtsTarget = (input: {
  followsCurrentLocation: boolean;
  resolvedTarget: ReaderTtsSpeechTarget | null;
  pinnedTarget: ReaderTtsSpeechTarget | null;
}): ReaderTtsSpeechTarget | null =>
  input.followsCurrentLocation ? input.resolvedTarget : input.pinnedTarget || input.resolvedTarget;

const findSelectedTranslationHistoryEntry = (
  assistanceHistory: ReaderAssistanceHistoryEntry[],
  entryId: string
): ReaderAssistanceHistoryEntry | null =>
  entryId
    ? assistanceHistory.find(
        (entry) => entry.id === entryId && entry.request.kind === 'translation'
      ) ?? null
    : null;

const resolveReaderSelectedTranslationTtsResult = (
  entry: ReaderAssistanceHistoryEntry | null
): ReaderTranslatedTtsResult | null => {
  if (
    entry?.status !== 'ready' ||
    !entry.result ||
    entry.request.kind !== 'translation'
  ) {
    return null;
  }

  return {
    translatedText: normalizeAssistanceText(entry.result.body),
    targetLanguage: entry.request.targetLanguage,
    providerLabel: `历史译文 · ${
      entry.result.sourceLabel || getReaderTranslationProviderDisplayLabel(entry.request.provider)
    }`,
    chapterLabel: entry.request.chapterLabel || '',
    progressLocation: entry.request.cfi || '',
    chapterHref: ''
  };
};

export const resolveReaderLiveTranslatedTtsResult = (input: {
  normalizedTranslationSourceText: string;
  chapterLabel: string;
  locationLabel: string;
  progressLabel: string;
  progressLocation: string;
  progressFraction: number;
  chapterHref: string;
  effectiveTranslationSource: ReaderTranslationSource;
  assistanceState: ReaderAssistanceState;
  assistanceHistory: ReaderAssistanceHistoryEntry[];
  translatedLiveSnapshot: ReaderTranslatedTtsLiveSnapshot | null;
}): ReaderTranslatedTtsResult | null => {
  const normalizedSourceText = normalizeAssistanceText(input.normalizedTranslationSourceText);
  if (!normalizedSourceText) return null;

  if (
    input.assistanceState.status === 'ready' &&
    input.assistanceState.activeRequest?.kind === 'translation' &&
    input.assistanceState.result
  ) {
    return {
      translatedText: normalizeAssistanceText(input.assistanceState.result.body),
      targetLanguage: input.assistanceState.activeRequest.targetLanguage,
      providerLabel: `当前译文 · ${
        input.assistanceState.result.sourceLabel ||
        getReaderTranslationProviderDisplayLabel(input.assistanceState.activeRequest.provider)
      }`,
      chapterLabel: input.assistanceState.activeRequest.chapterLabel || input.chapterLabel,
      locationLabel: input.locationLabel,
      progressLabel: input.progressLabel,
      progressLocation: input.assistanceState.activeRequest.cfi || input.progressLocation,
      progressFraction: input.progressFraction,
      chapterHref: input.chapterHref
    };
  }

  const matchingLiveTranslationHistoryEntry = input.assistanceHistory.find(
    (entry) =>
      entry.request.kind === 'translation' &&
      entry.status === 'ready' &&
      !!entry.result &&
      normalizeAssistanceText(entry.request.text) === normalizedSourceText
  );

  if (
    matchingLiveTranslationHistoryEntry?.request.kind === 'translation' &&
    matchingLiveTranslationHistoryEntry.result
  ) {
    return {
      translatedText: normalizeAssistanceText(matchingLiveTranslationHistoryEntry.result.body),
      targetLanguage: matchingLiveTranslationHistoryEntry.request.targetLanguage,
      providerLabel: `当前译文 · ${
        matchingLiveTranslationHistoryEntry.result.sourceLabel ||
        getReaderTranslationProviderDisplayLabel(
          matchingLiveTranslationHistoryEntry.request.provider
        )
      }`,
      chapterLabel:
        input.effectiveTranslationSource.chapterLabel ||
        matchingLiveTranslationHistoryEntry.request.chapterLabel ||
        input.chapterLabel,
      locationLabel: input.locationLabel,
      progressLabel: input.progressLabel,
      progressLocation:
        input.progressLocation || matchingLiveTranslationHistoryEntry.request.cfi || '',
      progressFraction: input.progressFraction,
      chapterHref: input.chapterHref
    };
  }

  // Persisted live snapshots are a cache of one exact source text. Reuse them
  // only while the active translation source still matches that original text.
  if (input.translatedLiveSnapshot?.sourceText === normalizedSourceText) {
    return {
      translatedText: input.translatedLiveSnapshot.translatedText,
      targetLanguage: input.translatedLiveSnapshot.targetLanguage,
      providerLabel: input.translatedLiveSnapshot.providerLabel,
      chapterLabel:
        input.translatedLiveSnapshot.chapterLabel ||
        input.effectiveTranslationSource.chapterLabel ||
        input.chapterLabel,
      locationLabel: input.translatedLiveSnapshot.locationLabel || input.locationLabel,
      progressLabel: input.translatedLiveSnapshot.progressLabel || input.progressLabel,
      progressLocation: input.translatedLiveSnapshot.progressLocation || input.progressLocation,
      progressFraction: input.translatedLiveSnapshot.progressFraction ?? input.progressFraction,
      chapterHref: input.translatedLiveSnapshot.chapterHref || input.chapterHref
    };
  }

  return null;
};

export const resolveReaderTranslatedTtsResult = (input: {
  owner: ReaderTranslatedTtsOwner;
  selectedTranslationHistoryEntry: ReaderAssistanceHistoryEntry | null;
  liveTranslationResult: ReaderTranslatedTtsResult | null;
}): ReaderTranslatedTtsResult | null => {
  const selectedTranslationResult = resolveReaderSelectedTranslationTtsResult(
    input.selectedTranslationHistoryEntry
  );

  return input.owner === 'archive'
    ? selectedTranslationResult || input.liveTranslationResult
    : input.liveTranslationResult;
};

export const resolveReaderTtsSpeechTarget = (input: {
  readAloudTextMode: ReaderTtsReadAloudTextMode;
  selectedText: string | null | undefined;
  preview: ReaderPreviewState;
  getLocationDisplayLabel: (locationLabel: string) => string;
  effectiveTranslationSource: ReaderTranslationSource;
  assistanceSelection: ReaderAssistanceWorkspaceSelection;
  assistanceHistory: ReaderAssistanceHistoryEntry[];
  assistanceState: ReaderAssistanceState;
  translatedOwner: ReaderTranslatedTtsOwner;
  translatedLiveSnapshot: ReaderTranslatedTtsLiveSnapshot | null;
}): ReaderTtsSpeechTarget | null => {
  const chapterLabel = input.preview.chapterLabel.trim();
  const title = input.preview.title.trim();
  const locationLabel = getReaderTtsPreviewLocationLabel(
    input.preview,
    input.getLocationDisplayLabel
  );
  const progressLabel = input.preview.progressLabel.trim();
  const normalizedTranslationSourceText = normalizeAssistanceText(
    input.effectiveTranslationSource.text
  );
  const selectedTranslationHistoryEntryId =
    input.assistanceSelection.translationHistoryEntryId.trim();
  const selectedTranslationHistoryEntry = findSelectedTranslationHistoryEntry(
    input.assistanceHistory,
    selectedTranslationHistoryEntryId
  );
  const liveTranslationResult = resolveReaderLiveTranslatedTtsResult({
    normalizedTranslationSourceText,
    chapterLabel,
    locationLabel,
    progressLabel,
    progressLocation: input.preview.progressLocation,
    progressFraction: input.preview.progressFraction,
    chapterHref: input.preview.chapterHref,
    effectiveTranslationSource: input.effectiveTranslationSource,
    assistanceState: input.assistanceState,
    assistanceHistory: input.assistanceHistory,
    translatedLiveSnapshot: input.translatedLiveSnapshot
  });
  const translated = resolveReaderTranslatedTtsResult({
    owner: input.translatedOwner,
    selectedTranslationHistoryEntry,
    liveTranslationResult
  });

  return resolveReaderTtsSpeechTargetForMode({
    mode: input.readAloudTextMode,
    source: {
      selectedText: input.selectedText,
      excerptText: input.preview.ttsSourceText,
      excerptSourceLabel: input.preview.ttsSourceLabel,
      sourceLanguage: input.preview.ttsSourceLanguage,
      locationLabel,
      progressLabel,
      progressLocation: input.preview.progressLocation,
      progressFraction: input.preview.progressFraction,
      chapterHref: input.preview.chapterHref,
      chapterLabel: getReaderPreviewChapterLabel(input.preview),
      title: title && title !== READER_EMPTY_TITLE ? title : ''
    },
    translated
  });
};

const normalizeTranslatedTtsSnapshot = (
  sourceText: string,
  result: ReaderTranslatedTtsResult | null
): ReaderTranslatedTtsLiveSnapshot | null => {
  const normalizedSourceText = normalizeAssistanceText(sourceText);
  const translatedText = normalizeAssistanceText(result?.translatedText || '');
  const providerLabel = result?.providerLabel.trim() || '';
  if (!normalizedSourceText || !translatedText || !providerLabel || !result) return null;

  return {
    sourceText: normalizedSourceText,
    translatedText,
    targetLanguage: result.targetLanguage,
    providerLabel,
    chapterLabel: result.chapterLabel || '',
    locationLabel: result.locationLabel || '',
    progressLabel: result.progressLabel || '',
    progressLocation: result.progressLocation || '',
    progressFraction: result.progressFraction ?? null,
    chapterHref: result.chapterHref || ''
  };
};

const hasSameTranslatedTtsSnapshot = (
  left: ReaderTranslatedTtsLiveSnapshot | null,
  right: ReaderTranslatedTtsLiveSnapshot | null
): boolean =>
  left?.sourceText === right?.sourceText &&
  left?.translatedText === right?.translatedText &&
  left?.targetLanguage === right?.targetLanguage &&
  left?.providerLabel === right?.providerLabel &&
  left?.chapterLabel === right?.chapterLabel &&
  left?.locationLabel === right?.locationLabel &&
  left?.progressLabel === right?.progressLabel &&
  left?.progressLocation === right?.progressLocation &&
  left?.progressFraction === right?.progressFraction &&
  left?.chapterHref === right?.chapterHref;

export const resolveReaderTranslatedTtsLiveSnapshotState = (input: {
  translatedOwner: ReaderTranslatedTtsOwner;
  currentSnapshot: ReaderTranslatedTtsLiveSnapshot | null;
  sourceText: string;
  liveTranslationResult: ReaderTranslatedTtsResult | null;
}): ReaderTranslatedTtsLiveSnapshot | null => {
  if (input.translatedOwner === 'archive') return null;

  const nextSnapshot = normalizeTranslatedTtsSnapshot(input.sourceText, input.liveTranslationResult);
  if (!nextSnapshot) return input.currentSnapshot;

  return hasSameTranslatedTtsSnapshot(input.currentSnapshot, nextSnapshot)
    ? input.currentSnapshot
    : nextSnapshot;
};

export const resolveReaderTranslatedTtsSourceState = (input: {
  owner: ReaderTranslatedTtsOwner;
  assistanceSelection: ReaderAssistanceWorkspaceSelection;
  assistanceHistory: ReaderAssistanceHistoryEntry[];
  effectiveTranslationSource: ReaderTranslationSource;
  translationFollowsCurrentSource: boolean;
}): ReaderTranslatedTtsSourceState => {
  const selectedTranslationHistoryEntryId =
    input.assistanceSelection.translationHistoryEntryId.trim();
  const selectedTranslationHistoryEntry = findSelectedTranslationHistoryEntry(
    input.assistanceHistory,
    selectedTranslationHistoryEntryId
  );
  const selectedTranslationRequest =
    selectedTranslationHistoryEntry?.request.kind === 'translation'
      ? selectedTranslationHistoryEntry.request
      : null;
  const hasArchivedTranslation = !!selectedTranslationRequest;
  const normalizedLiveTranslationSourceText = normalizeAssistanceText(
    input.effectiveTranslationSource.text
  );

  if (input.owner === 'archive' && hasArchivedTranslation) {
    return {
      kind: 'archived-translation',
      contextLabel: `历史记录 · ${getReaderAssistanceRequestContextLabel(
        selectedTranslationRequest
      )}`,
      text: normalizeAssistanceText(selectedTranslationRequest.text)
    };
  }

  if (normalizedLiveTranslationSourceText) {
    return {
      kind: 'live-translation',
      contextLabel: input.translationFollowsCurrentSource
        ? `正在跟随${input.effectiveTranslationSource.label || '当前阅读位置'}`
        : `已锁定${input.effectiveTranslationSource.label || '当前翻译目标'}`,
      text: normalizedLiveTranslationSourceText
    };
  }

  if (hasArchivedTranslation) {
    return {
      kind: 'archived-translation',
      contextLabel: `历史记录 · ${getReaderAssistanceRequestContextLabel(
        selectedTranslationRequest
      )}`,
      text: normalizeAssistanceText(selectedTranslationRequest.text)
    };
  }

  return EMPTY_TRANSLATED_TTS_SOURCE_STATE;
};

export const getReaderTtsPreviewPlaybackLocationSummary = (
  preview: ReaderPreviewState,
  getLocationDisplayLabel: (locationLabel: string) => string
): string =>
  [
    getReaderPreviewChapterLabel(preview),
    getReaderTtsPreviewLocationLabel(preview, getLocationDisplayLabel),
    preview.progressLabel.trim()
  ]
    .filter(Boolean)
    .join(' · ');

export const resolveReaderTtsMiniBarLocationSummary = (input: {
  state: ReaderTtsSessionState;
  target: ReaderTtsSpeechTarget | null;
  readAloudTextMode: ReaderTtsReadAloudTextMode;
  preview: ReaderPreviewState;
  getLocationDisplayLabel: (locationLabel: string) => string;
}): string =>
  getReaderTtsCompactPlaybackLocationSummary(input.state, input.target) ||
  (input.readAloudTextMode === 'translated'
    ? getReaderTtsPreviewPlaybackLocationSummary(input.preview, input.getLocationDisplayLabel)
    : '');

export const resolveReaderTtsTranslatedWaitingTargetLabel = (input: {
  state: ReaderTtsSessionState;
  target: ReaderTtsSpeechTarget | null;
  readAloudTextMode: ReaderTtsReadAloudTextMode;
  translatedSourceKind: ReaderTranslatedTtsSourceKind;
  translatedSourceContextLabel: string;
}): string =>
  input.readAloudTextMode === 'translated' &&
  !getReaderTtsReadableTargetLabel(input.state) &&
  !input.target?.text.trim() &&
  input.translatedSourceKind !== 'none'
    ? getReaderTtsTranslatedWaitingTargetLabel(input.translatedSourceContextLabel)
    : '';

export const resolveReaderTtsMiniBarContextSummary = (input: {
  state: ReaderTtsSessionState;
  readAloudTextMode: ReaderTtsReadAloudTextMode;
  translatedSourceKind: ReaderTranslatedTtsSourceKind;
  translatedSourceContextLabel: string;
}): string =>
  getReaderTtsMiniBarContextSummary({
    state: input.state,
    readAloudTextMode: input.readAloudTextMode,
    translatedSourceKind: input.translatedSourceKind,
    translatedSourceContextLabel: input.translatedSourceContextLabel
  });

export const resolveReaderTtsMiniBarVisible = (input: {
  state: ReaderTtsSessionState;
  target: ReaderTtsSpeechTarget | null;
  translatedWaitingTargetLabel: string;
}): boolean =>
  shouldShowReaderTtsMiniBar(
    input.state,
    input.target,
    input.translatedWaitingTargetLabel
  );

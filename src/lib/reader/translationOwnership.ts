// Ownership: translation mode combines route params, current-book restore, and
// live assistance state. Keep those precedence rules here so the reader route
// remains a coordinator instead of becoming the source of truth for every branch.

import {
  getReaderTranslationProviderDisplayLabel,
  normalizeAssistanceText,
  type ReaderAssistanceHistoryEntry,
  type ReaderAssistanceState,
  type ReaderAssistanceWorkspaceSelection,
  type ReaderTranslationProvider
} from './assistance';
import type {
  ReaderTranslationLiveSnapshot,
  ReaderTranslationModeConfig,
  ReaderTranslationOwnership
} from './currentBookPersistence';
import type { ReaderRouteOpenState } from './route';

export type ReaderTranslationSource = {
  text: string;
  label: string;
  chapterLabel: string;
};

export type ReaderLiveTranslationPanelResult = {
  translatedText: string;
  providerLabel: string;
};

type TranslationConfigRouteState = Pick<
  ReaderRouteOpenState,
  'workspaceMode' | 'translationTargetLanguage' | 'translationProvider' | 'translationHistoryEntryId'
>;

const DEFAULT_TRANSLATION_SOURCE_LABEL = '当前翻译目标';

const normalizeTranslationSourceLabel = (label: string, fallbackLabel: string): string =>
  label.trim() || fallbackLabel;

export const normalizeReaderTranslationSource = (
  source: Partial<ReaderTranslationSource> | null | undefined,
  fallbackLabel = DEFAULT_TRANSLATION_SOURCE_LABEL
): ReaderTranslationSource | null => {
  const text = normalizeAssistanceText(source?.text || '');
  if (!text) return null;

  return {
    text,
    label: normalizeTranslationSourceLabel(source?.label || '', fallbackLabel),
    chapterLabel: (source?.chapterLabel || '').trim()
  };
};

export const resolveReaderEffectiveTranslationSource = (
  ownership: ReaderTranslationOwnership,
  resolvedSource: ReaderTranslationSource
): ReaderTranslationSource => {
  const normalizedResolvedSource = normalizeReaderTranslationSource(resolvedSource, '') ?? {
    text: '',
    label: '',
    chapterLabel: (resolvedSource.chapterLabel || '').trim()
  };

  if (ownership.followsCurrentSource) {
    return normalizedResolvedSource;
  }

  return (
    normalizeReaderTranslationSource(ownership.pinnedSource, DEFAULT_TRANSLATION_SOURCE_LABEL) ??
    normalizedResolvedSource
  );
};

export const createPinnedReaderTranslationSource = (
  source: Partial<ReaderTranslationSource> | null | undefined,
  fallbackSource: ReaderTranslationSource
): ReaderTranslationSource | null => {
  const normalizedFallback = normalizeReaderTranslationSource(
    fallbackSource,
    DEFAULT_TRANSLATION_SOURCE_LABEL
  );
  const normalizedSource = normalizeReaderTranslationSource(
    {
      text: source?.text || normalizedFallback?.text || '',
      label: source?.label || normalizedFallback?.label || DEFAULT_TRANSLATION_SOURCE_LABEL,
      chapterLabel: source?.chapterLabel || normalizedFallback?.chapterLabel || ''
    },
    DEFAULT_TRANSLATION_SOURCE_LABEL
  );

  return normalizedSource;
};

const findReadyTranslationHistoryEntry = (
  assistanceHistory: ReaderAssistanceHistoryEntry[],
  normalizedSourceText: string
): ReaderAssistanceHistoryEntry | null =>
  assistanceHistory.find(
    (entry) =>
      entry.request.kind === 'translation' &&
      entry.status === 'ready' &&
      !!entry.result &&
      normalizeAssistanceText(entry.request.text) === normalizedSourceText
  ) ?? null;

const toTranslationPanelResult = (
  entry: ReaderAssistanceHistoryEntry
): ReaderLiveTranslationPanelResult | null => {
  if (entry.request.kind !== 'translation' || !entry.result) return null;

  return {
    translatedText: normalizeAssistanceText(entry.result.body),
    providerLabel:
      entry.result.sourceLabel || getReaderTranslationProviderDisplayLabel(entry.request.provider)
  };
};

const toTranslationLiveSnapshot = (
  sourceText: string,
  result: ReaderLiveTranslationPanelResult
): ReaderTranslationLiveSnapshot | null => {
  const translatedText = normalizeAssistanceText(result.translatedText);
  const providerLabel = result.providerLabel.trim();
  if (!sourceText || !translatedText || !providerLabel) return null;

  return {
    sourceText,
    translatedText,
    providerLabel
  };
};

export const resolveReaderNextTranslationLiveSnapshot = (input: {
  source: ReaderTranslationSource;
  assistanceState: ReaderAssistanceState;
  assistanceHistory: ReaderAssistanceHistoryEntry[];
}): ReaderTranslationLiveSnapshot | null => {
  const normalizedSourceText = normalizeAssistanceText(input.source.text);
  if (!normalizedSourceText) return null;

  if (
    input.assistanceState.status === 'ready' &&
    input.assistanceState.activeRequest?.kind === 'translation' &&
    input.assistanceState.result
  ) {
    return toTranslationLiveSnapshot(normalizedSourceText, {
      translatedText: normalizeAssistanceText(input.assistanceState.result.body),
      providerLabel:
        input.assistanceState.result.sourceLabel ||
        getReaderTranslationProviderDisplayLabel(input.assistanceState.activeRequest.provider)
    });
  }

  const matchingHistoryEntry = findReadyTranslationHistoryEntry(
    input.assistanceHistory,
    normalizedSourceText
  );
  if (!matchingHistoryEntry) return null;

  const result = toTranslationPanelResult(matchingHistoryEntry);
  return result ? toTranslationLiveSnapshot(normalizedSourceText, result) : null;
};

export const resolveReaderLiveTranslationPanelResult = (input: {
  source: ReaderTranslationSource;
  assistanceState: ReaderAssistanceState;
  assistanceHistory: ReaderAssistanceHistoryEntry[];
  liveSnapshot: ReaderTranslationLiveSnapshot | null;
}): ReaderLiveTranslationPanelResult | null => {
  const normalizedSourceText = normalizeAssistanceText(input.source.text);
  if (!normalizedSourceText) return null;

  const nextLiveSnapshot = resolveReaderNextTranslationLiveSnapshot({
    source: input.source,
    assistanceState: input.assistanceState,
    assistanceHistory: input.assistanceHistory
  });
  if (nextLiveSnapshot) {
    return {
      translatedText: nextLiveSnapshot.translatedText,
      providerLabel: nextLiveSnapshot.providerLabel
    };
  }

  // Persisted live snapshots are only safe while their original source text
  // still matches the active translation source. Otherwise an old translation
  // could silently appear under a new paragraph.
  if (input.liveSnapshot?.sourceText === normalizedSourceText) {
    return {
      translatedText: input.liveSnapshot.translatedText,
      providerLabel: input.liveSnapshot.providerLabel
    };
  }

  return null;
};

export const resolveReaderTranslationLiveSnapshotState = (input: {
  source: ReaderTranslationSource;
  currentSnapshot: ReaderTranslationLiveSnapshot | null;
  nextSnapshot: ReaderTranslationLiveSnapshot | null;
}): ReaderTranslationLiveSnapshot | null => {
  if (input.nextSnapshot) return input.nextSnapshot;
  if (!normalizeAssistanceText(input.source.text)) return null;
  return input.currentSnapshot;
};

const findTranslationHistoryEntryById = (
  assistanceHistory: ReaderAssistanceHistoryEntry[],
  entryId: string | null | undefined
): ReaderAssistanceHistoryEntry | null => {
  const normalizedEntryId = entryId?.trim() || '';
  if (!normalizedEntryId) return null;

  return (
    assistanceHistory.find(
      (entry) => entry.id === normalizedEntryId && entry.request.kind === 'translation'
    ) ?? null
  );
};

const applyTranslationEntryConfigFallback = (
  config: ReaderTranslationModeConfig,
  entry: ReaderAssistanceHistoryEntry | null,
  options: {
    canFallbackTargetLanguage: boolean;
    canFallbackProvider: boolean;
  }
): ReaderTranslationModeConfig => {
  if (entry?.request.kind !== 'translation') return config;

  return {
    targetLanguage: options.canFallbackTargetLanguage
      ? entry.request.targetLanguage
      : config.targetLanguage,
    provider: options.canFallbackProvider ? entry.request.provider : config.provider
  };
};

export const resolveReaderTranslationModeConfigRestore = (input: {
  restoredConfig: ReaderTranslationModeConfig;
  assistanceHistory: ReaderAssistanceHistoryEntry[];
  assistanceSelection: ReaderAssistanceWorkspaceSelection;
  routeOpenState: TranslationConfigRouteState;
}): ReaderTranslationModeConfig => {
  const routeOwnsTranslationMode = input.routeOpenState.workspaceMode === 'translation';
  const routeTargetLanguage = routeOwnsTranslationMode
    ? input.routeOpenState.translationTargetLanguage
    : null;
  const routeProvider = routeOwnsTranslationMode ? input.routeOpenState.translationProvider : null;
  const routeHistoryEntryId = routeOwnsTranslationMode
    ? input.routeOpenState.translationHistoryEntryId
    : null;

  let config: ReaderTranslationModeConfig = {
    targetLanguage: routeTargetLanguage || input.restoredConfig.targetLanguage,
    provider: routeProvider || input.restoredConfig.provider
  };

  const routeEntry = findTranslationHistoryEntryById(input.assistanceHistory, routeHistoryEntryId);
  if (routeEntry) {
    return applyTranslationEntryConfigFallback(config, routeEntry, {
      canFallbackTargetLanguage: !routeTargetLanguage,
      canFallbackProvider: !routeProvider
    });
  }

  // Ambient current-book selection is a restore fallback only. Any explicit
  // route translation setting or archive id means the URL owns the decision.
  if (
    routeTargetLanguage ||
    routeProvider ||
    input.routeOpenState.translationHistoryEntryId?.trim()
  ) {
    return config;
  }

  const ambientEntry = findTranslationHistoryEntryById(
    input.assistanceHistory,
    input.assistanceSelection.translationHistoryEntryId
  );
  config = applyTranslationEntryConfigFallback(config, ambientEntry, {
    canFallbackTargetLanguage: true,
    canFallbackProvider: true
  });

  return config;
};

export const resolveReaderRouteTranslationModeConfig = (input: {
  currentConfig: ReaderTranslationModeConfig;
  assistanceHistory: ReaderAssistanceHistoryEntry[];
  routeOpenState: TranslationConfigRouteState;
}): ReaderTranslationModeConfig => {
  if (input.routeOpenState.workspaceMode !== 'translation') {
    return input.currentConfig;
  }

  const routeTargetLanguage = input.routeOpenState.translationTargetLanguage;
  const routeProvider = input.routeOpenState.translationProvider;
  let config: ReaderTranslationModeConfig = {
    targetLanguage: routeTargetLanguage || input.currentConfig.targetLanguage,
    provider: routeProvider || input.currentConfig.provider
  };

  const routeEntry = findTranslationHistoryEntryById(
    input.assistanceHistory,
    input.routeOpenState.translationHistoryEntryId
  );
  config = applyTranslationEntryConfigFallback(config, routeEntry, {
    canFallbackTargetLanguage: !routeTargetLanguage,
    canFallbackProvider: !routeProvider
  });

  return config;
};

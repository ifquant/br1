// Ownership: keep current-book storage contracts and bad-payload cleanup in one
// pure module so the route can coordinate reader state without hand-writing each
// key family and JSON restore rule inline.

import {
  createEmptyReaderAssistanceWorkspaceSelection,
  normalizeAssistanceText,
  parseReaderAssistanceHistory,
  parseReaderAssistanceWorkspaceSelection,
  serializeReaderAssistanceHistory,
  serializeReaderAssistanceWorkspaceSelection,
  type ReaderAssistanceHistoryEntry,
  type ReaderAssistanceWorkspaceSelection,
  type ReaderTranslationProvider
} from './assistance.js';
import {
  createReaderFocusedReadingState,
  parseReaderFocusedReadingPersistedState,
  serializeReaderFocusedReadingState,
  type ReaderFocusedReadingState
} from './readingMode.js';
import { normalizeReaderTtsSpeechTarget, type ReaderTtsSpeechTarget } from './tts.js';
import type { ReaderTtsReadAloudTextMode } from './types.js';

export type ReaderTranslationOwnership = {
  followsCurrentSource: boolean;
  pinnedSource: {
    text: string;
    label: string;
    chapterLabel: string;
  } | null;
};

export type ReaderTranslationLiveSnapshot = {
  sourceText: string;
  translatedText: string;
  providerLabel: string;
};

export type ReaderTranslationModeConfig = {
  targetLanguage: string;
  provider: ReaderTranslationProvider;
};

export type ReaderTtsOwnership = {
  followsCurrentLocation: boolean;
  pinnedTarget: ReaderTtsSpeechTarget | null;
};

export type ReaderTranslatedTtsOwner = 'live' | 'archive';

export type ReaderTranslatedTtsLiveSnapshot = {
  sourceText: string;
  translatedText: string;
  targetLanguage: string;
  providerLabel: string;
  chapterLabel: string;
  locationLabel: string;
  progressLabel: string;
  progressLocation: string;
  progressFraction: number | null;
  chapterHref: string;
};

export type ReaderCurrentBookPersistenceKeys = {
  notesStorageKey: string;
  bookmarksStorageKey: string;
  assistanceHistoryStorageKey: string;
  assistanceSelectionStorageKey: string;
  translationOwnershipStorageKey: string;
  translationModeConfigStorageKey: string;
  translationLiveSnapshotStorageKey: string;
  ttsOwnershipStorageKey: string;
  ttsReadAloudModeStorageKey: string;
  translatedTtsOwnerStorageKey: string;
  translatedTtsLiveSnapshotStorageKey: string;
  focusedReadingStorageKey: string;
};

type ReaderCurrentBookRestoredPersistGateInput = {
  readerBookKey: string;
  lastRestoredBookKey: string;
};

type ReaderCurrentBookTtsPersistGateInput = {
  readerBookKey: string;
  lastRestoredTtsOwnershipBookKey: string;
  lastRestoredTtsReadAloudModeBookKey: string;
  lastRestoredTranslatedTtsOwnerBookKey: string;
  lastRestoredTranslatedTtsLiveSnapshotBookKey: string;
};

const DEFAULT_TRANSLATION_OWNERSHIP: ReaderTranslationOwnership = {
  followsCurrentSource: true,
  pinnedSource: null
};

const DEFAULT_TRANSLATION_MODE_CONFIG: ReaderTranslationModeConfig = {
  targetLanguage: 'zh',
  provider: 'deepl'
};

const DEFAULT_TTS_OWNERSHIP: ReaderTtsOwnership = {
  followsCurrentLocation: true,
  pinnedTarget: null
};

const trimStorageKey = (storageKey: string): string => storageKey.trim();

const removeStorageItem = (storage: Storage | undefined, storageKey: string) => {
  const normalizedKey = trimStorageKey(storageKey);
  if (!storage || !normalizedKey) return;
  storage.removeItem(normalizedKey);
};

const setJsonStorageItem = (
  storage: Storage | undefined,
  storageKey: string,
  value: unknown
) => {
  const normalizedKey = trimStorageKey(storageKey);
  if (!storage || !normalizedKey) return;
  storage.setItem(normalizedKey, JSON.stringify(value));
};

const getStorageItem = (storage: Storage | undefined, storageKey: string): string => {
  const normalizedKey = trimStorageKey(storageKey);
  if (!storage || !normalizedKey) return '';
  return storage.getItem(normalizedKey) ?? '';
};

const normalizeTranslatedTtsLiveSnapshot = (
  snapshot: ReaderTranslatedTtsLiveSnapshot | null | undefined
): ReaderTranslatedTtsLiveSnapshot | null => {
  if (!snapshot) return null;

  const normalizedSourceText = normalizeAssistanceText(snapshot.sourceText || '');
  const normalizedTranslatedText = normalizeAssistanceText(snapshot.translatedText || '');
  if (!normalizedSourceText || !normalizedTranslatedText) {
    return null;
  }

  return {
    sourceText: normalizedSourceText,
    translatedText: normalizedTranslatedText,
    targetLanguage: (snapshot.targetLanguage || '').trim(),
    providerLabel: (snapshot.providerLabel || '').trim(),
    chapterLabel: (snapshot.chapterLabel || '').trim(),
    locationLabel: (snapshot.locationLabel || '').trim(),
    progressLabel: (snapshot.progressLabel || '').trim(),
    progressLocation: (snapshot.progressLocation || '').trim(),
    progressFraction:
      typeof snapshot.progressFraction === 'number' && Number.isFinite(snapshot.progressFraction)
        ? snapshot.progressFraction
        : null,
    chapterHref: (snapshot.chapterHref || '').trim()
  };
};

export const getReaderCurrentBookPersistenceKeys = (
  readerBookKey: string
): ReaderCurrentBookPersistenceKeys => ({
  notesStorageKey: `br1.reader.notes:${readerBookKey}`,
  bookmarksStorageKey: `br1.reader.bookmarks:${readerBookKey}`,
  assistanceHistoryStorageKey: `br1.reader.assistance.history:${readerBookKey}`,
  assistanceSelectionStorageKey: `br1.reader.assistance.selection:${readerBookKey}`,
  translationOwnershipStorageKey: `br1.reader.translation.ownership:${readerBookKey}`,
  translationModeConfigStorageKey: `br1.reader.translation.mode:${readerBookKey}`,
  translationLiveSnapshotStorageKey: `br1.reader.translation.live-result:${readerBookKey}`,
  ttsOwnershipStorageKey: `br1.reader.tts.ownership:${readerBookKey}`,
  ttsReadAloudModeStorageKey: `br1.reader.tts.mode:${readerBookKey}`,
  translatedTtsOwnerStorageKey: `br1.reader.tts.translated-owner:${readerBookKey}`,
  translatedTtsLiveSnapshotStorageKey: `br1.reader.tts.translated-live:${readerBookKey}`,
  focusedReadingStorageKey: `br1.reader.focused-reading:${readerBookKey}`
});

const canPersistRestoredCurrentBookState = (
  input: ReaderCurrentBookRestoredPersistGateInput
): boolean =>
  !!input.readerBookKey && input.readerBookKey === input.lastRestoredBookKey;

// Current-book restore happens after the route first renders with default state.
// These gates stop those defaults from overwriting a book's persisted payload
// before that specific book has finished restoring.
export const canPersistReaderCurrentBookTranslationLiveSnapshot = (
  input: ReaderCurrentBookRestoredPersistGateInput
): boolean => canPersistRestoredCurrentBookState(input);

export const canPersistReaderCurrentBookTranslationModeConfig = (
  input: ReaderCurrentBookRestoredPersistGateInput
): boolean => canPersistRestoredCurrentBookState(input);

export const canPersistReaderCurrentBookTtsOwnershipState = (
  input: ReaderCurrentBookTtsPersistGateInput
): boolean =>
  !!input.readerBookKey &&
  input.readerBookKey === input.lastRestoredTtsOwnershipBookKey &&
  input.readerBookKey === input.lastRestoredTtsReadAloudModeBookKey &&
  input.readerBookKey === input.lastRestoredTranslatedTtsOwnerBookKey &&
  input.readerBookKey === input.lastRestoredTranslatedTtsLiveSnapshotBookKey;

export const canPersistReaderCurrentBookFocusedReadingState = (
  input: ReaderCurrentBookRestoredPersistGateInput
): boolean => canPersistRestoredCurrentBookState(input);

export const persistReaderCurrentBookAssistanceHistory = (
  storage: Storage | undefined,
  storageKey: string,
  history: ReaderAssistanceHistoryEntry[]
) => {
  const normalizedKey = trimStorageKey(storageKey);
  if (!storage || !normalizedKey) return;
  storage.setItem(normalizedKey, serializeReaderAssistanceHistory(history));
};

export const restoreReaderCurrentBookAssistanceHistory = (
  storage: Storage | undefined,
  storageKey: string
): ReaderAssistanceHistoryEntry[] => {
  const rawHistory = getStorageItem(storage, storageKey);
  if (!rawHistory) return [];

  try {
    return parseReaderAssistanceHistory(rawHistory);
  } catch {
    removeStorageItem(storage, storageKey);
    return [];
  }
};

export const persistReaderCurrentBookAssistanceSelection = (
  storage: Storage | undefined,
  storageKey: string,
  selection: ReaderAssistanceWorkspaceSelection
) => {
  const normalizedKey = trimStorageKey(storageKey);
  if (!storage || !normalizedKey) return;
  storage.setItem(normalizedKey, serializeReaderAssistanceWorkspaceSelection(selection));
};

export const restoreReaderCurrentBookAssistanceSelection = (
  storage: Storage | undefined,
  storageKey: string
): ReaderAssistanceWorkspaceSelection => {
  const rawSelection = getStorageItem(storage, storageKey);
  if (!rawSelection) {
    return createEmptyReaderAssistanceWorkspaceSelection();
  }

  try {
    return parseReaderAssistanceWorkspaceSelection(rawSelection);
  } catch {
    removeStorageItem(storage, storageKey);
    return createEmptyReaderAssistanceWorkspaceSelection();
  }
};

export const persistReaderTranslationOwnership = (
  storage: Storage | undefined,
  storageKey: string,
  ownership: ReaderTranslationOwnership
) => {
  setJsonStorageItem(storage, storageKey, {
    followsCurrentSource: ownership.followsCurrentSource,
    pinnedSource: ownership.pinnedSource
      ? {
          text: normalizeAssistanceText(ownership.pinnedSource.text),
          label: ownership.pinnedSource.label.trim(),
          chapterLabel: ownership.pinnedSource.chapterLabel.trim()
        }
      : null
  });
};

export const restoreReaderTranslationOwnership = (
  storage: Storage | undefined,
  storageKey: string
): ReaderTranslationOwnership => {
  const rawOwnership = getStorageItem(storage, storageKey);
  if (!rawOwnership) {
    return DEFAULT_TRANSLATION_OWNERSHIP;
  }

  try {
    const parsed = JSON.parse(rawOwnership) as {
      followsCurrentSource?: unknown;
      pinnedSource?: {
        text?: unknown;
        label?: unknown;
        chapterLabel?: unknown;
      } | null;
    };
    const normalizedPinnedText =
      typeof parsed.pinnedSource?.text === 'string'
        ? normalizeAssistanceText(parsed.pinnedSource.text)
        : '';
    const normalizedPinnedLabel =
      typeof parsed.pinnedSource?.label === 'string' ? parsed.pinnedSource.label.trim() : '';
    const normalizedPinnedChapterLabel =
      typeof parsed.pinnedSource?.chapterLabel === 'string'
        ? parsed.pinnedSource.chapterLabel.trim()
        : '';
    const pinnedSource = normalizedPinnedText
      ? {
          text: normalizedPinnedText,
          label: normalizedPinnedLabel || '当前翻译目标',
          chapterLabel: normalizedPinnedChapterLabel
        }
      : null;

    return {
      followsCurrentSource:
        typeof parsed.followsCurrentSource === 'boolean'
          ? parsed.followsCurrentSource
          : !pinnedSource,
      pinnedSource
    };
  } catch {
    removeStorageItem(storage, storageKey);
    return DEFAULT_TRANSLATION_OWNERSHIP;
  }
};

export const persistReaderCurrentBookTranslationLiveSnapshot = (
  storage: Storage | undefined,
  storageKey: string,
  snapshot: ReaderTranslationLiveSnapshot | null
) => {
  if (!snapshot) {
    removeStorageItem(storage, storageKey);
    return;
  }

  setJsonStorageItem(storage, storageKey, snapshot);
};

export const restoreReaderCurrentBookTranslationLiveSnapshot = (
  storage: Storage | undefined,
  storageKey: string
): ReaderTranslationLiveSnapshot | null => {
  const rawSnapshot = getStorageItem(storage, storageKey);
  if (!rawSnapshot) return null;

  try {
    const parsed = JSON.parse(rawSnapshot) as ReaderTranslationLiveSnapshot | null;
    const sourceText = normalizeAssistanceText(parsed?.sourceText || '');
    const translatedText = normalizeAssistanceText(parsed?.translatedText || '');
    const providerLabel = (parsed?.providerLabel || '').trim();
    if (!sourceText || !translatedText || !providerLabel) {
      removeStorageItem(storage, storageKey);
      return null;
    }
    return {
      sourceText,
      translatedText,
      providerLabel
    };
  } catch {
    removeStorageItem(storage, storageKey);
    return null;
  }
};

export const persistReaderCurrentBookTranslationModeConfig = (
  storage: Storage | undefined,
  storageKey: string,
  config: ReaderTranslationModeConfig
) => {
  setJsonStorageItem(storage, storageKey, {
    targetLanguage: config.targetLanguage.trim().toLowerCase() || 'zh',
    provider: config.provider
  });
};

export const restoreReaderCurrentBookTranslationModeConfig = (
  storage: Storage | undefined,
  storageKey: string
): ReaderTranslationModeConfig => {
  const rawConfig = getStorageItem(storage, storageKey);
  if (!rawConfig) {
    return DEFAULT_TRANSLATION_MODE_CONFIG;
  }

  try {
    const parsed = JSON.parse(rawConfig) as {
      targetLanguage?: unknown;
      provider?: unknown;
    };
    const targetLanguage =
      typeof parsed.targetLanguage === 'string' ? parsed.targetLanguage.trim().toLowerCase() : '';
    const provider = parsed.provider === 'yandex' ? 'yandex' : 'deepl';
    return {
      targetLanguage: targetLanguage || 'zh',
      provider
    };
  } catch {
    removeStorageItem(storage, storageKey);
    return DEFAULT_TRANSLATION_MODE_CONFIG;
  }
};

export const persistReaderTtsOwnership = (
  storage: Storage | undefined,
  storageKey: string,
  ownership: ReaderTtsOwnership
) => {
  setJsonStorageItem(storage, storageKey, {
    followsCurrentLocation: ownership.followsCurrentLocation,
    pinnedTarget: normalizeReaderTtsSpeechTarget(ownership.pinnedTarget)
  });
};

export const restoreReaderTtsOwnership = (
  storage: Storage | undefined,
  storageKey: string
): ReaderTtsOwnership => {
  const rawOwnership = getStorageItem(storage, storageKey);
  if (!rawOwnership) {
    return DEFAULT_TTS_OWNERSHIP;
  }

  try {
    const parsed = JSON.parse(rawOwnership) as {
      followsCurrentLocation?: unknown;
      pinnedTarget?: ReaderTtsSpeechTarget | null;
    };
    const normalizedPinnedTarget = normalizeReaderTtsSpeechTarget(parsed.pinnedTarget ?? null);
    if (parsed.followsCurrentLocation === false && !normalizedPinnedTarget) {
      removeStorageItem(storage, storageKey);
      return DEFAULT_TTS_OWNERSHIP;
    }
    return {
      followsCurrentLocation:
        typeof parsed.followsCurrentLocation === 'boolean'
          ? parsed.followsCurrentLocation
          : !normalizedPinnedTarget,
      pinnedTarget: normalizedPinnedTarget
    };
  } catch {
    removeStorageItem(storage, storageKey);
    return DEFAULT_TTS_OWNERSHIP;
  }
};

export const persistReaderCurrentBookTtsReadAloudMode = (
  storage: Storage | undefined,
  storageKey: string,
  mode: ReaderTtsReadAloudTextMode
) => {
  const normalizedKey = trimStorageKey(storageKey);
  if (!storage || !normalizedKey) return;
  storage.setItem(normalizedKey, mode);
};

export const restoreReaderCurrentBookTtsReadAloudMode = (
  storage: Storage | undefined,
  storageKey: string,
  defaultMode: ReaderTtsReadAloudTextMode
): ReaderTtsReadAloudTextMode => {
  const rawMode = getStorageItem(storage, storageKey).trim();
  if (rawMode === 'source' || rawMode === 'translated') {
    return rawMode;
  }
  if (rawMode) {
    removeStorageItem(storage, storageKey);
  }
  return defaultMode;
};

export const persistReaderCurrentBookTranslatedTtsOwner = (
  storage: Storage | undefined,
  storageKey: string,
  owner: ReaderTranslatedTtsOwner
) => {
  const normalizedKey = trimStorageKey(storageKey);
  if (!storage || !normalizedKey) return;
  storage.setItem(normalizedKey, owner);
};

export const restoreReaderCurrentBookTranslatedTtsOwner = (
  storage: Storage | undefined,
  storageKey: string,
  fallbackOwner: ReaderTranslatedTtsOwner
): ReaderTranslatedTtsOwner => {
  const rawOwner = getStorageItem(storage, storageKey).trim();
  if (rawOwner === 'live' || rawOwner === 'archive') {
    return rawOwner;
  }
  if (rawOwner) {
    removeStorageItem(storage, storageKey);
  }
  return fallbackOwner;
};

export const persistReaderCurrentBookTranslatedTtsLiveSnapshot = (
  storage: Storage | undefined,
  storageKey: string,
  snapshot: ReaderTranslatedTtsLiveSnapshot | null
) => {
  if (!snapshot) {
    removeStorageItem(storage, storageKey);
    return;
  }

  setJsonStorageItem(storage, storageKey, snapshot);
};

export const restoreReaderCurrentBookTranslatedTtsLiveSnapshot = (
  storage: Storage | undefined,
  storageKey: string
): ReaderTranslatedTtsLiveSnapshot | null => {
  const rawSnapshot = getStorageItem(storage, storageKey);
  if (!rawSnapshot) return null;

  try {
    const parsed = JSON.parse(rawSnapshot) as ReaderTranslatedTtsLiveSnapshot | null;
    const normalizedSnapshot = normalizeTranslatedTtsLiveSnapshot(parsed);
    if (!normalizedSnapshot) {
      removeStorageItem(storage, storageKey);
      return null;
    }
    return normalizedSnapshot;
  } catch {
    removeStorageItem(storage, storageKey);
    return null;
  }
};

export const persistReaderCurrentBookFocusedReadingState = (
  storage: Storage | undefined,
  storageKey: string,
  state: ReaderFocusedReadingState
) => {
  const persistedState = serializeReaderFocusedReadingState(state);
  if (!persistedState) {
    removeStorageItem(storage, storageKey);
    return;
  }

  setJsonStorageItem(storage, storageKey, persistedState);
};

export const restoreReaderCurrentBookFocusedReadingState = (
  storage: Storage | undefined,
  storageKey: string
): ReaderFocusedReadingState => {
  const rawState = getStorageItem(storage, storageKey);
  if (!rawState) {
    return createReaderFocusedReadingState();
  }

  try {
    const restoredState = parseReaderFocusedReadingPersistedState(JSON.parse(rawState));
    // `mode === off` can now mean "overlay hidden, but same-book resume still
    // exists for a supported text excerpt". Only purge payloads that restore to
    // the truly empty default shape.
    if (restoredState.mode === 'off' && !restoredState.sourceText) {
      removeStorageItem(storage, storageKey);
    }
    return restoredState;
  } catch {
    removeStorageItem(storage, storageKey);
    return createReaderFocusedReadingState();
  }
};

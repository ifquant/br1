// Ownership: these tests pin TTS restore and translated-source precedence before
// the route delegates those decisions to ttsOwnership.ts.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEmptyReaderAssistanceState,
  createReadyReaderAssistanceState,
  createReaderAssistanceHistoryEntry
} from './assistance.js';
import {
  getReaderCurrentBookPersistenceKeys,
  persistReaderCurrentBookTranslatedTtsLiveSnapshot,
  persistReaderCurrentBookTranslatedTtsOwner,
  persistReaderCurrentBookTtsReadAloudMode,
  persistReaderTtsOwnership
} from './currentBookPersistence.js';
import { createEmptyReaderPreviewState } from './types.js';
import { createEmptyReaderTtsSessionState } from './tts.js';
import {
  resolveReaderEffectiveTtsTarget,
  resolveReaderLiveTranslatedTtsResult,
  resolveReaderTranslatedTtsLiveSnapshotState,
  resolveReaderTranslatedTtsOwnerFallback,
  resolveReaderTranslatedTtsSourceState,
  resolveReaderTranslationTtsDerivationState,
  resolveReaderTtsMiniBarState,
  resolveReaderTtsMiniBarContextSummary,
  resolveReaderTtsMiniBarLocationSummary,
  resolveReaderTtsSpeechTarget,
  resolveReaderTtsTranslatedWaitingTargetLabel,
  restoreReaderTtsOwnershipState
} from './ttsOwnership.js';
import type { ReaderRouteOpenState } from './route.js';

const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, String(value));
    }
  };
};

const createRouteOpenState = (
  overrides: Partial<ReaderRouteOpenState> = {}
): ReaderRouteOpenState => ({
  isWindowMode: false,
  pickerRequested: false,
  autoOpenKey: '',
  bookKey: '/books/sample.epub',
  target: null,
  workspaceMode: null,
  ttsReadAloudTextMode: null,
  translationTargetLanguage: null,
  translationProvider: null,
  translationHistoryEntryId: null,
  ...overrides
});

const createReadyTranslationEntry = (input: {
  id: string;
  text: string;
  body: string;
  targetLanguage?: string;
  chapterLabel?: string;
}) =>
  createReaderAssistanceHistoryEntry(
    {
      kind: 'translation',
      provider: 'deepl',
      text: input.text,
      targetLanguage: input.targetLanguage || 'zh',
      bookKey: '/books/sample.epub',
      cfi: `cfi-${input.id}`,
      chapterLabel: input.chapterLabel || 'Chapter 1'
    },
    {
      id: input.id,
      status: 'ready',
      result: {
        id: `${input.id}-result`,
        provider: 'deepl',
        title: 'Translation',
        body: input.body,
        createdAt: 1
      },
      createdAt: 1,
      updatedAt: 1
    }
  );

test('tts ownership restore keeps follow-current and locked targets distinct', () => {
  const storage = createMemoryStorage();
  const keys = getReaderCurrentBookPersistenceKeys('/books/sample.epub');
  const currentTarget = {
    text: 'current paragraph',
    label: '当前段落',
    followsCurrent: true
  };
  const pinnedTarget = {
    text: 'pinned paragraph',
    label: '锁定段落',
    followsCurrent: false
  };

  let restored = restoreReaderTtsOwnershipState({
    storage,
    keys,
    defaultReadAloudTextMode: 'source',
    fallbackTranslatedOwner: 'live'
  });
  assert.deepEqual(restored.ownership, {
    followsCurrentLocation: true,
    pinnedTarget: null
  });
  assert.deepEqual(
    resolveReaderEffectiveTtsTarget({
      followsCurrentLocation: restored.ownership.followsCurrentLocation,
      pinnedTarget: restored.ownership.pinnedTarget,
      resolvedTarget: currentTarget
    }),
    currentTarget
  );

  persistReaderTtsOwnership(storage, keys.ttsOwnershipStorageKey, {
    followsCurrentLocation: false,
    pinnedTarget
  });
  restored = restoreReaderTtsOwnershipState({
    storage,
    keys,
    defaultReadAloudTextMode: 'source',
    fallbackTranslatedOwner: 'live'
  });

  assert.equal(restored.ownership.followsCurrentLocation, false);
  assert.equal(restored.ownership.pinnedTarget?.text, 'pinned paragraph');
  assert.deepEqual(
    resolveReaderEffectiveTtsTarget({
      followsCurrentLocation: restored.ownership.followsCurrentLocation,
      pinnedTarget: restored.ownership.pinnedTarget,
      resolvedTarget: currentTarget
    }),
    restored.ownership.pinnedTarget
  );
});

test('tts read-aloud mode restores per book instead of leaking across keys', () => {
  const storage = createMemoryStorage();
  const epubKeys = getReaderCurrentBookPersistenceKeys('/books/sample.epub');
  const txtKeys = getReaderCurrentBookPersistenceKeys('/books/sample.txt');

  persistReaderCurrentBookTtsReadAloudMode(storage, epubKeys.ttsReadAloudModeStorageKey, 'translated');

  assert.equal(
    restoreReaderTtsOwnershipState({
      storage,
      keys: epubKeys,
      defaultReadAloudTextMode: 'source',
      fallbackTranslatedOwner: 'live'
    }).readAloudTextMode,
    'translated'
  );
  assert.equal(
    restoreReaderTtsOwnershipState({
      storage,
      keys: txtKeys,
      defaultReadAloudTextMode: 'source',
      fallbackTranslatedOwner: 'live'
    }).readAloudTextMode,
    'source'
  );
});

test('translated owner restore can prefer live snapshots over ambient archive selection', () => {
  const storage = createMemoryStorage();
  const keys = getReaderCurrentBookPersistenceKeys('/books/sample.epub');
  const archivedEntry = createReadyTranslationEntry({
    id: 'archive-entry',
    text: 'archived paragraph',
    body: '历史译文'
  });

  persistReaderCurrentBookTranslatedTtsOwner(storage, keys.translatedTtsOwnerStorageKey, 'live');
  persistReaderCurrentBookTranslatedTtsLiveSnapshot(storage, keys.translatedTtsLiveSnapshotStorageKey, {
    sourceText: 'current paragraph',
    translatedText: '缓存实时译文',
    targetLanguage: 'zh',
    providerLabel: '当前译文 · DeepL',
    chapterLabel: 'Chapter 1',
    locationLabel: '第 1 页',
    progressLabel: '10%',
    progressLocation: 'cfi-live',
    progressFraction: 0.1,
    chapterHref: '#chapter-1'
  });

  const restored = restoreReaderTtsOwnershipState({
    storage,
    keys,
    defaultReadAloudTextMode: 'translated',
    fallbackTranslatedOwner: resolveReaderTranslatedTtsOwnerFallback({
      routeOpenState: createRouteOpenState(),
      assistanceSelection: {
        translationHistoryEntryId: 'archive-entry'
      }
    })
  });
  const target = resolveReaderTtsSpeechTarget({
    readAloudTextMode: 'translated',
    selectedText: '',
    preview: createEmptyReaderPreviewState({
      title: 'Sample',
      chapterLabel: 'Chapter 1',
      locationLabel: '第 1 页',
      progressLabel: '10%',
      progressLocation: 'cfi-live',
      progressFraction: 0.1,
      chapterHref: '#chapter-1'
    }),
    getLocationDisplayLabel: (label) => label,
    effectiveTranslationSource: {
      text: 'current paragraph',
      label: '当前阅读位置',
      chapterLabel: 'Chapter 1'
    },
    assistanceSelection: {
      lookupHistoryEntryId: '',
      translationHistoryEntryId: 'archive-entry'
    },
    assistanceHistory: [archivedEntry],
    assistanceState: createEmptyReaderAssistanceState(),
    translatedOwner: restored.translatedOwner,
    translatedLiveSnapshot: restored.translatedLiveSnapshot
  });

  assert.equal(restored.translatedOwner, 'live');
  assert.equal(target?.text, '缓存实时译文');
  assert.equal(target?.sourceLabel, '当前译文 · DeepL');
});

test('stale ready active translation is not used or persisted for translated tts', () => {
  const staleAssistanceState = createReadyReaderAssistanceState(
    {
      kind: 'translation',
      provider: 'deepl',
      text: 'old paragraph',
      targetLanguage: 'zh',
      bookKey: '/books/sample.epub',
      cfi: 'cfi-old',
      chapterLabel: 'Old Chapter'
    },
    {
      id: 'stale-result',
      provider: 'deepl',
      title: 'Translation',
      body: '旧段落译文',
      createdAt: 1
    }
  );
  const preview = createEmptyReaderPreviewState({
    title: 'Sample',
    chapterLabel: 'New Chapter',
    locationLabel: '第 2 页',
    progressLabel: '20%',
    progressLocation: 'cfi-new',
    progressFraction: 0.2,
    chapterHref: '#new'
  });
  const effectiveTranslationSource = {
    text: 'new paragraph',
    label: '当前阅读位置',
    chapterLabel: 'New Chapter'
  };

  const liveResult = resolveReaderLiveTranslatedTtsResult({
    normalizedTranslationSourceText: effectiveTranslationSource.text,
    chapterLabel: preview.chapterLabel,
    locationLabel: preview.locationLabel,
    progressLabel: preview.progressLabel,
    progressLocation: preview.progressLocation,
    progressFraction: preview.progressFraction,
    chapterHref: preview.chapterHref,
    effectiveTranslationSource,
    assistanceState: staleAssistanceState,
    assistanceHistory: [],
    translatedLiveSnapshot: null
  });
  const target = resolveReaderTtsSpeechTarget({
    readAloudTextMode: 'translated',
    selectedText: '',
    preview,
    getLocationDisplayLabel: (label) => label,
    effectiveTranslationSource,
    assistanceSelection: {
      lookupHistoryEntryId: '',
      translationHistoryEntryId: ''
    },
    assistanceHistory: [],
    assistanceState: staleAssistanceState,
    translatedOwner: 'live',
    translatedLiveSnapshot: null
  });
  const nextSnapshot = resolveReaderTranslatedTtsLiveSnapshotState({
    translatedOwner: 'live',
    currentSnapshot: null,
    sourceText: effectiveTranslationSource.text,
    liveTranslationResult: liveResult
  });

  assert.equal(liveResult, null);
  assert.equal(target, null);
  assert.equal(nextSnapshot, null);
});

test('archive translated owner continues to point at the selected translation archive', () => {
  const archivedEntry = createReadyTranslationEntry({
    id: 'archive-entry',
    text: 'archived paragraph',
    body: '历史译文',
    targetLanguage: 'en',
    chapterLabel: 'Archived Chapter'
  });
  const target = resolveReaderTtsSpeechTarget({
    readAloudTextMode: 'translated',
    selectedText: '',
    preview: createEmptyReaderPreviewState({
      title: 'Sample',
      chapterLabel: 'Current Chapter',
      locationLabel: '第 2 页',
      progressLabel: '20%'
    }),
    getLocationDisplayLabel: (label) => label,
    effectiveTranslationSource: {
      text: 'current paragraph',
      label: '当前阅读位置',
      chapterLabel: 'Current Chapter'
    },
    assistanceSelection: {
      lookupHistoryEntryId: '',
      translationHistoryEntryId: 'archive-entry'
    },
    assistanceHistory: [archivedEntry],
    assistanceState: createEmptyReaderAssistanceState(),
    translatedOwner: 'archive',
    translatedLiveSnapshot: {
      sourceText: 'current paragraph',
      translatedText: '实时译文缓存',
      targetLanguage: 'zh',
      providerLabel: '当前译文 · DeepL',
      chapterLabel: 'Current Chapter',
      locationLabel: '第 2 页',
      progressLabel: '20%',
      progressLocation: 'cfi-live',
      progressFraction: 0.2,
      chapterHref: '#current'
    }
  });
  const sourceState = resolveReaderTranslatedTtsSourceState({
    owner: 'archive',
    assistanceSelection: {
      lookupHistoryEntryId: '',
      translationHistoryEntryId: 'archive-entry'
    },
    assistanceHistory: [archivedEntry],
    effectiveTranslationSource: {
      text: 'current paragraph',
      label: '当前阅读位置',
      chapterLabel: 'Current Chapter'
    },
    translationFollowsCurrentSource: true
  });

  assert.equal(target?.text, '历史译文');
  assert.equal(target?.lang, 'en-US');
  assert.equal(target?.sourceLabel, '历史译文 · DeepL');
  assert.equal(sourceState.kind, 'archived-translation');
  assert.equal(sourceState.text, 'archived paragraph');
  assert.match(sourceState.contextLabel, /历史记录/);
});

test('translated waiting-state summaries remain stable when translated text is missing', () => {
  const session = createEmptyReaderTtsSessionState({ status: 'idle' });
  const preview = createEmptyReaderPreviewState({
    chapterLabel: 'Chapter 1',
    locationLabel: '第 3 页',
    progressLabel: '30%'
  });
  const waitingLabel = resolveReaderTtsTranslatedWaitingTargetLabel({
    state: session,
    target: null,
    readAloudTextMode: 'translated',
    translatedSourceKind: 'live-translation',
    translatedSourceContextLabel: '正在跟随当前阅读位置'
  });

  assert.equal(waitingLabel, '等待译文结果 · 正在跟随当前阅读位置');
  assert.equal(
    resolveReaderTtsMiniBarContextSummary({
      state: session,
      readAloudTextMode: 'translated',
      translatedSourceKind: 'live-translation',
      translatedSourceContextLabel: '正在跟随当前阅读位置'
    }),
    '译文朗读 · 正在跟随当前阅读位置'
  );
  assert.equal(
    resolveReaderTtsMiniBarLocationSummary({
      state: session,
      target: null,
      readAloudTextMode: 'translated',
      preview,
      getLocationDisplayLabel: (label) => label
    }),
    'Chapter 1 · 第 3 页 · 30%'
  );
});

test('translation tts derivation reuses and updates live translation snapshots', () => {
  const source = {
    text: 'current paragraph',
    label: '当前阅读位置',
    chapterLabel: 'Chapter 1'
  };
  const cachedSnapshot = {
    sourceText: 'current paragraph',
    translatedText: '缓存译文',
    providerLabel: 'DeepL'
  };
  const reused = resolveReaderTranslationTtsDerivationState({
    effectiveTranslationSource: source,
    assistanceState: createEmptyReaderAssistanceState(),
    assistanceHistory: [],
    assistanceSelection: {
      lookupHistoryEntryId: '',
      translationHistoryEntryId: ''
    },
    translationLiveSnapshot: cachedSnapshot,
    translatedTtsOwner: 'live',
    translatedTtsLiveSnapshot: null,
    translationFollowsCurrentSource: true,
    liveTranslatedTtsResult: null
  });

  assert.equal(reused.nextTranslationLiveSnapshot, null);
  assert.deepEqual(reused.liveTranslationPanelResult, {
    translatedText: '缓存译文',
    providerLabel: 'DeepL'
  });
  assert.equal(reused.resolvedTranslationLiveSnapshot, cachedSnapshot);

  const readyEntry = createReadyTranslationEntry({
    id: 'live-entry',
    text: 'current paragraph',
    body: '新的译文'
  });
  const updated = resolveReaderTranslationTtsDerivationState({
    effectiveTranslationSource: source,
    assistanceState: createEmptyReaderAssistanceState(),
    assistanceHistory: [readyEntry],
    assistanceSelection: {
      lookupHistoryEntryId: '',
      translationHistoryEntryId: ''
    },
    translationLiveSnapshot: cachedSnapshot,
    translatedTtsOwner: 'live',
    translatedTtsLiveSnapshot: null,
    translationFollowsCurrentSource: true,
    liveTranslatedTtsResult: {
      translatedText: '新的译文',
      targetLanguage: 'zh',
      providerLabel: '当前译文 · DeepL',
      chapterLabel: 'Chapter 1',
      locationLabel: '第 1 页',
      progressLabel: '10%',
      progressLocation: 'cfi-live',
      progressFraction: 0.1,
      chapterHref: '#chapter-1'
    }
  });

  assert.deepEqual(updated.nextTranslationLiveSnapshot, {
    sourceText: 'current paragraph',
    translatedText: '新的译文',
    providerLabel: 'DeepL'
  });
  assert.deepEqual(updated.resolvedTranslationLiveSnapshot, updated.nextTranslationLiveSnapshot);
  assert.equal(updated.nextTranslatedTtsLiveSnapshot?.translatedText, '新的译文');
  assert.equal(updated.nextTranslatedTtsLiveSnapshot?.progressLocation, 'cfi-live');
});

test('translation tts derivation keeps archived source state distinct from live cache', () => {
  const archivedEntry = createReadyTranslationEntry({
    id: 'archive-entry',
    text: 'archived paragraph',
    body: '历史译文',
    targetLanguage: 'en',
    chapterLabel: 'Archived Chapter'
  });
  const derived = resolveReaderTranslationTtsDerivationState({
    effectiveTranslationSource: {
      text: 'current paragraph',
      label: '当前阅读位置',
      chapterLabel: 'Current Chapter'
    },
    assistanceState: createEmptyReaderAssistanceState(),
    assistanceHistory: [archivedEntry],
    assistanceSelection: {
      lookupHistoryEntryId: '',
      translationHistoryEntryId: 'archive-entry'
    },
    translationLiveSnapshot: null,
    translatedTtsOwner: 'archive',
    translatedTtsLiveSnapshot: {
      sourceText: 'current paragraph',
      translatedText: '实时译文缓存',
      targetLanguage: 'zh',
      providerLabel: '当前译文 · DeepL',
      chapterLabel: 'Current Chapter',
      locationLabel: '第 2 页',
      progressLabel: '20%',
      progressLocation: 'cfi-live',
      progressFraction: 0.2,
      chapterHref: '#current'
    },
    translationFollowsCurrentSource: true,
    liveTranslatedTtsResult: {
      translatedText: '实时译文缓存',
      targetLanguage: 'zh',
      providerLabel: '当前译文 · DeepL',
      chapterLabel: 'Current Chapter'
    }
  });

  assert.equal(derived.translatedSourceState.kind, 'archived-translation');
  assert.equal(derived.translatedSourceState.text, 'archived paragraph');
  assert.match(derived.translatedSourceState.contextLabel, /历史记录/);
  assert.equal(derived.nextTranslatedTtsLiveSnapshot, null);
});

test('mini-bar state exposes translated waiting actions without runnable speech', () => {
  const miniBarState = resolveReaderTtsMiniBarState({
    state: createEmptyReaderTtsSessionState({ status: 'idle' }),
    target: null,
    readAloudTextMode: 'translated',
    preview: createEmptyReaderPreviewState({
      chapterLabel: 'Chapter 1',
      locationLabel: '第 3 页',
      progressLabel: '30%'
    }),
    getLocationDisplayLabel: (label) => label,
    translatedSourceKind: 'live-translation',
    translatedSourceContextLabel: '正在跟随当前阅读位置',
    translatedSourceText: 'source text waiting for translation',
    notebookVisible: false,
    ttsFollowsCurrentLocation: true
  });

  assert.equal(miniBarState.visible, true);
  assert.equal(miniBarState.statusLabel, '空闲');
  assert.equal(miniBarState.contextSummary, '译文朗读 · 正在跟随当前阅读位置');
  assert.equal(miniBarState.targetLabel, '等待译文结果 · 正在跟随当前阅读位置');
  assert.equal(miniBarState.locationSummary, 'Chapter 1 · 第 3 页 · 30%');
  assert.equal(miniBarState.canRunPrimaryAction, false);
  assert.equal(miniBarState.canOpenTranslationMode, true);
  assert.equal(miniBarState.canSwitchMode, true);
  assert.equal(miniBarState.modeSwitchLabel, '切换到朗读原文');
});

test('mini-bar state separates follow-current pinning from pinned-target resume', () => {
  const target = {
    text: 'current paragraph',
    label: '当前段落',
    targetLabel: '当前段落',
    sourceLabel: '当前阅读位置',
    chapterLabel: 'Chapter 2',
    locationLabel: '第 4 页',
    progressLabel: '40%',
    followsCurrent: true
  };

  const followingState = resolveReaderTtsMiniBarState({
    state: createEmptyReaderTtsSessionState({ status: 'idle' }),
    target,
    readAloudTextMode: 'source',
    preview: createEmptyReaderPreviewState(),
    getLocationDisplayLabel: (label) => label,
    translatedSourceKind: 'none',
    translatedSourceContextLabel: '',
    translatedSourceText: '',
    notebookVisible: false,
    ttsFollowsCurrentLocation: true
  });
  const pinnedState = resolveReaderTtsMiniBarState({
    state: createEmptyReaderTtsSessionState({ status: 'idle' }),
    target,
    readAloudTextMode: 'source',
    preview: createEmptyReaderPreviewState(),
    getLocationDisplayLabel: (label) => label,
    translatedSourceKind: 'none',
    translatedSourceContextLabel: '',
    translatedSourceText: '',
    notebookVisible: false,
    ttsFollowsCurrentLocation: false
  });

  assert.equal(followingState.canPinCurrentTarget, true);
  assert.equal(followingState.canResumeFollowingCurrent, false);
  assert.equal(followingState.canRunPrimaryAction, true);
  assert.equal(followingState.canSwitchMode, false);
  assert.equal(pinnedState.canPinCurrentTarget, false);
  assert.equal(pinnedState.canResumeFollowingCurrent, true);
});

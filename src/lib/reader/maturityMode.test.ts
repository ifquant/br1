// Ownership: these tests pin the route-coordination seams extracted from the
// reader maturity pass so future UI rewires do not silently change precedence
// or popup-reset rules.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEmptyReaderAssistanceWorkspaceSelection,
  createReaderAssistanceHistoryEntry
} from './assistance.js';
import {
  canPersistReaderCurrentBookTranslationLiveSnapshot,
  canPersistReaderCurrentBookTranslationModeConfig,
  canPersistReaderCurrentBookTtsOwnershipState
} from './currentBookPersistence.js';
import {
  resolveReaderAnnotationPopupSelectionForBookChange,
  resolveReaderMaturityBookRestoreState,
  resolveReaderMaturityRouteTranslationConfig,
  resolveReaderPlaybackQueueForEffectiveTtsTarget,
  resolveReaderPopupStateForControlNonce
} from './maturityMode.js';
import type { ReaderRouteOpenState } from './route.js';
import { createReaderPlaybackQueue } from './playbackQueue.js';
import type { ReaderTtsSpeechTarget } from './tts.js';

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

const createTranslationEntry = (input: {
  id: string;
  targetLanguage: string;
  provider: 'deepl' | 'yandex';
}) =>
  createReaderAssistanceHistoryEntry(
    {
      kind: 'translation',
      provider: input.provider,
      text: 'source text',
      targetLanguage: input.targetLanguage,
      bookKey: '/books/sample.epub'
    },
    {
      id: input.id,
      status: 'ready',
      result: {
        id: `${input.id}-result`,
        provider: input.provider,
        title: 'Translation',
        body: 'translated text',
        createdAt: 1
      },
      createdAt: 1,
      updatedAt: 1
    }
  );

const createTtsTarget = (label: string, text = `${label} body`): ReaderTtsSpeechTarget => ({
  text,
  label,
  targetLabel: label,
  sourceLabel: '当前阅读位置',
  progressLocation: `${label}-cfi`
});

test('inline translation route state never overrides non-dedicated translation state', () => {
  const routeTranslationEntry = createTranslationEntry({
    id: 'route-archive',
    targetLanguage: 'en',
    provider: 'yandex'
  });

  assert.deepEqual(
    resolveReaderMaturityRouteTranslationConfig({
      currentConfig: {
        targetLanguage: 'zh',
        provider: 'deepl'
      },
      assistanceHistory: [routeTranslationEntry],
      routeOpenState: createRouteOpenState({
        workspaceMode: null,
        translationTargetLanguage: 'en',
        translationProvider: 'yandex',
        translationHistoryEntryId: 'route-archive'
      })
    }),
    {
      targetLanguage: 'zh',
      provider: 'deepl'
    }
  );
});

test('annotation popup visibility clears when the book source changes', () => {
  assert.equal(
    resolveReaderAnnotationPopupSelectionForBookChange({
      currentSelection: {
        cfi: '/6/2!/4/2',
        text: 'selected paragraph',
        chapterLabel: 'Chapter 1',
        chapterHref: '#chapter-1'
      },
      previousBookKey: '/books/first.epub',
      nextBookKey: '/books/second.epub'
    }),
    null
  );
});

test('book restore state clears book-scoped transient maturity surfaces', () => {
  const pinnedTtsTarget = createTtsTarget('Pinned paragraph');
  const restored = resolveReaderMaturityBookRestoreState({
    readerBookKey: '/books/second.epub',
    previousBookKey: '/books/first.epub',
    currentSelection: {
      cfi: '/6/2!/4/2',
      text: 'old selected paragraph',
      chapterLabel: 'Old chapter',
      chapterHref: '#old'
    },
    restoredTtsState: {
      ownership: {
        followsCurrentLocation: false,
        pinnedTarget: pinnedTtsTarget
      },
      readAloudTextMode: 'translated',
      translatedOwner: 'archive',
      translatedLiveSnapshot: {
        sourceText: 'source',
        translatedText: 'translated',
        targetLanguage: 'zh',
        providerLabel: 'DeepL',
        chapterLabel: 'Chapter 1',
        locationLabel: '1%',
        progressLabel: '1%',
        progressLocation: '/6/2',
        progressFraction: 0.01,
        chapterHref: '#chapter-1'
      }
    },
    restoredTranslationOwnership: {
      followsCurrentSource: false,
      pinnedSource: {
        text: 'pinned source',
        label: 'Pinned source',
        chapterLabel: 'Pinned chapter'
      }
    },
    restoredTranslationModeConfig: {
      targetLanguage: 'en',
      provider: 'yandex'
    },
    restoredTranslationLiveSnapshot: {
      sourceText: 'source',
      translatedText: 'translated',
      providerLabel: 'Yandex'
    },
    assistanceHistory: [],
    assistanceSelection: createEmptyReaderAssistanceWorkspaceSelection(),
    routeOpenState: createRouteOpenState()
  });

  assert.equal(restored.restoredBookKey, '/books/second.epub');
  assert.equal(restored.currentReaderSelection, null);
  assert.equal(restored.focusedReadingState.mode, 'off');
  assert.equal(restored.inlineTranslationState.blocks.length, 0);
  assert.equal(restored.inlineTranslationState.targetLanguage, 'en');
  assert.equal(restored.inlineTranslationState.provider, 'yandex');
  assert.equal(restored.latestInlineTranslationCandidates, null);
  assert.equal(restored.ttsReadAloudTextMode, 'translated');
  assert.equal(restored.translatedTtsOwner, 'archive');
  assert.equal(restored.pinnedTtsTarget, pinnedTtsTarget);
  assert.equal(restored.translationFollowsCurrentSource, false);
  assert.equal(restored.pinnedTranslationSource?.text, 'pinned source');
  assert.equal(restored.translationLiveSnapshot?.providerLabel, 'Yandex');
});

test('book restore state lets dedicated translation route archive precedence win', () => {
  const routeTranslationEntry = createTranslationEntry({
    id: 'route-archive',
    targetLanguage: 'en',
    provider: 'yandex'
  });

  const restored = resolveReaderMaturityBookRestoreState({
    readerBookKey: '/books/sample.epub',
    previousBookKey: '/books/other.epub',
    currentSelection: null,
    restoredTtsState: {
      ownership: {
        followsCurrentLocation: true,
        pinnedTarget: null
      },
      readAloudTextMode: 'source',
      translatedOwner: 'live',
      translatedLiveSnapshot: null
    },
    restoredTranslationOwnership: {
      followsCurrentSource: true,
      pinnedSource: null
    },
    restoredTranslationModeConfig: {
      targetLanguage: 'zh',
      provider: 'deepl'
    },
    restoredTranslationLiveSnapshot: null,
    assistanceHistory: [routeTranslationEntry],
    assistanceSelection: createEmptyReaderAssistanceWorkspaceSelection({
      translationHistoryEntryId: 'ambient-archive'
    }),
    routeOpenState: createRouteOpenState({
      workspaceMode: 'translation',
      translationHistoryEntryId: 'route-archive'
    })
  });

  assert.equal(restored.translationTargetLanguage, 'en');
  assert.equal(restored.translationProvider, 'yandex');
  assert.equal(restored.inlineTranslationState.targetLanguage, 'en');
  assert.equal(restored.inlineTranslationState.provider, 'yandex');
});

test('current-book translation persist gates wait for same-book restore', () => {
  assert.equal(
    canPersistReaderCurrentBookTranslationLiveSnapshot({
      readerBookKey: '/books/sample.epub',
      lastRestoredBookKey: '/books/sample.epub'
    }),
    true
  );
  assert.equal(
    canPersistReaderCurrentBookTranslationModeConfig({
      readerBookKey: '/books/sample.epub',
      lastRestoredBookKey: '/books/other.epub'
    }),
    false
  );
  assert.equal(
    canPersistReaderCurrentBookTranslationModeConfig({
      readerBookKey: '',
      lastRestoredBookKey: ''
    }),
    false
  );
});

test('current-book tts persist gate requires every restored tts key family', () => {
  const readyGate = {
    readerBookKey: '/books/sample.epub',
    lastRestoredTtsOwnershipBookKey: '/books/sample.epub',
    lastRestoredTtsReadAloudModeBookKey: '/books/sample.epub',
    lastRestoredTranslatedTtsOwnerBookKey: '/books/sample.epub',
    lastRestoredTranslatedTtsLiveSnapshotBookKey: '/books/sample.epub'
  };

  assert.equal(canPersistReaderCurrentBookTtsOwnershipState(readyGate), true);
  assert.equal(
    canPersistReaderCurrentBookTtsOwnershipState({
      ...readyGate,
      lastRestoredTranslatedTtsOwnerBookKey: '/books/other.epub'
    }),
    false
  );
  assert.equal(
    canPersistReaderCurrentBookTtsOwnershipState({
      ...readyGate,
      lastRestoredTranslatedTtsLiveSnapshotBookKey: ''
    }),
    false
  );
});

test('footnote popup state clears when control nonce changes', () => {
  assert.equal(
    resolveReaderPopupStateForControlNonce({
      currentPopupState: {
        href: '#fn-1',
        label: '注释 1'
      },
      controlNonce: 7,
      handledControlNonce: 6
    }),
    null
  );
});

test('playback queue state resets when the effective TTS target changes', () => {
  const queue = createReaderPlaybackQueue([createTtsTarget('段落一')], {
    playbackRate: 1.5,
    timeoutMs: 30_000,
    now: 1_000
  });

  const retargeted = resolveReaderPlaybackQueueForEffectiveTtsTarget({
    effectiveTtsTarget: createTtsTarget('段落二'),
    currentState: queue,
    lastTargetKey: JSON.stringify(createTtsTarget('段落一')),
    now: 11_000
  });

  assert.equal(retargeted.didReset, true);
  assert.equal(retargeted.state.playbackRate, 1.5);
  assert.equal(retargeted.state.activeIndex, 0);
  assert.equal(retargeted.state.segments.length, 1);
  assert.equal(retargeted.state.segments[0]?.target.label, '段落二');
  assert.equal(retargeted.state.timeoutAt, 31_000);
});

// Ownership: these tests pin the route-coordination seams extracted from the
// reader maturity pass so future UI rewires do not silently change precedence
// or popup-reset rules.

import assert from 'node:assert/strict';
import test from 'node:test';

import { createReaderAssistanceHistoryEntry } from './assistance.js';
import {
  resolveReaderAnnotationPopupSelectionForBookChange,
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

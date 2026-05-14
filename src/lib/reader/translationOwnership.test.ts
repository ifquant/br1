// Ownership: these tests pin translation-mode precedence before the route is
// rewired to delegate source/result/restore decisions to translationOwnership.ts.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEmptyReaderAssistanceState,
  createReaderAssistanceHistoryEntry
} from './assistance';
import {
  resolveReaderEffectiveTranslationSource,
  resolveReaderLiveTranslationPanelResult,
  resolveReaderTranslationModeConfigRestore
} from './translationOwnership';
import type { ReaderRouteOpenState } from './route';

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
  targetLanguage: string;
  provider: 'deepl' | 'yandex';
  body?: string;
}) =>
  createReaderAssistanceHistoryEntry(
    {
      kind: 'translation',
      provider: input.provider,
      text: input.text,
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
        body: input.body || `${input.text} translated`,
        createdAt: 1
      },
      createdAt: 1,
      updatedAt: 1
    }
  );

test('translation source follows current text unless ownership pins a source', () => {
  const currentSource = {
    text: ' current paragraph ',
    label: ' 当前阅读位置 ',
    chapterLabel: ' Chapter 1 '
  };
  const pinnedSource = {
    text: ' pinned paragraph ',
    label: ' 锁定段落 ',
    chapterLabel: ' Chapter 2 '
  };

  assert.deepEqual(
    resolveReaderEffectiveTranslationSource(
      {
        followsCurrentSource: true,
        pinnedSource
      },
      currentSource
    ),
    {
      text: 'current paragraph',
      label: '当前阅读位置',
      chapterLabel: 'Chapter 1'
    }
  );

  assert.deepEqual(
    resolveReaderEffectiveTranslationSource(
      {
        followsCurrentSource: false,
        pinnedSource
      },
      currentSource
    ),
    {
      text: 'pinned paragraph',
      label: '锁定段落',
      chapterLabel: 'Chapter 2'
    }
  );
});

test('route-owned archive provenance beats ambient restore only when route archive id is explicit', () => {
  const ambientEntry = createReadyTranslationEntry({
    id: 'ambient-archive',
    text: 'ambient source',
    targetLanguage: 'zh',
    provider: 'yandex'
  });
  const routeEntry = createReadyTranslationEntry({
    id: 'route-archive',
    text: 'route source',
    targetLanguage: 'en',
    provider: 'deepl'
  });

  assert.deepEqual(
    resolveReaderTranslationModeConfigRestore({
      restoredConfig: {
        targetLanguage: 'zh',
        provider: 'deepl'
      },
      assistanceHistory: [ambientEntry, routeEntry],
      assistanceSelection: {
        lookupHistoryEntryId: '',
        translationHistoryEntryId: 'ambient-archive'
      },
      routeOpenState: createRouteOpenState({
        workspaceMode: 'translation',
        translationHistoryEntryId: 'route-archive'
      })
    }),
    {
      targetLanguage: 'en',
      provider: 'deepl'
    }
  );

  assert.deepEqual(
    resolveReaderTranslationModeConfigRestore({
      restoredConfig: {
        targetLanguage: 'zh',
        provider: 'deepl'
      },
      assistanceHistory: [ambientEntry, routeEntry],
      assistanceSelection: {
        lookupHistoryEntryId: '',
        translationHistoryEntryId: 'ambient-archive'
      },
      routeOpenState: createRouteOpenState()
    }),
    {
      targetLanguage: 'zh',
      provider: 'yandex'
    }
  );
});

test('live translation panel reuses persisted snapshot only while source text still matches', () => {
  const assistanceState = createEmptyReaderAssistanceState();

  assert.deepEqual(
    resolveReaderLiveTranslationPanelResult({
      source: {
        text: 'current paragraph',
        label: '当前阅读位置',
        chapterLabel: 'Chapter 1'
      },
      assistanceState,
      assistanceHistory: [],
      liveSnapshot: {
        sourceText: 'current paragraph',
        translatedText: '当前段落',
        providerLabel: 'DeepL'
      }
    }),
    {
      translatedText: '当前段落',
      providerLabel: 'DeepL'
    }
  );

  assert.equal(
    resolveReaderLiveTranslationPanelResult({
      source: {
        text: 'different paragraph',
        label: '当前阅读位置',
        chapterLabel: 'Chapter 1'
      },
      assistanceState,
      assistanceHistory: [],
      liveSnapshot: {
        sourceText: 'current paragraph',
        translatedText: '当前段落',
        providerLabel: 'DeepL'
      }
    }),
    null
  );
});

test('archived provenance restores provider and language when route does not specify them', () => {
  const archivedEntry = createReadyTranslationEntry({
    id: 'route-archive',
    text: 'source',
    targetLanguage: 'en',
    provider: 'yandex'
  });

  assert.deepEqual(
    resolveReaderTranslationModeConfigRestore({
      restoredConfig: {
        targetLanguage: 'zh',
        provider: 'deepl'
      },
      assistanceHistory: [archivedEntry],
      assistanceSelection: {
        lookupHistoryEntryId: '',
        translationHistoryEntryId: ''
      },
      routeOpenState: createRouteOpenState({
        workspaceMode: 'translation',
        translationHistoryEntryId: 'route-archive'
      })
    }),
    {
      targetLanguage: 'en',
      provider: 'yandex'
    }
  );

  assert.deepEqual(
    resolveReaderTranslationModeConfigRestore({
      restoredConfig: {
        targetLanguage: 'zh',
        provider: 'deepl'
      },
      assistanceHistory: [archivedEntry],
      assistanceSelection: {
        lookupHistoryEntryId: '',
        translationHistoryEntryId: ''
      },
      routeOpenState: createRouteOpenState({
        workspaceMode: 'translation',
        translationTargetLanguage: 'zh',
        translationHistoryEntryId: 'route-archive'
      })
    }),
    {
      targetLanguage: 'zh',
      provider: 'yandex'
    }
  );
});

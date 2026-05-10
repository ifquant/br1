// Ownership: these reader-domain tests pin helper invariants that multiple UI
// surfaces restore from. Keep explicit normalization expectations here so later
// refactors do not quietly change persisted contracts.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  READER_ASSISTANCE_HISTORY_LIMIT,
  createReaderAssistanceHistoryEntry,
  createEmptyReaderAssistanceWorkspaceSelection,
  getReaderAssistanceProviderDisplayLabel,
  getReaderAssistanceRequestContextLabel,
  getReaderAssistanceRequestSubject,
  parseReaderAssistanceHistory,
  parseReaderAssistanceWorkspaceSelection,
  serializeReaderAssistanceWorkspaceSelection,
  serializeReaderAssistanceHistory,
  updateReaderAssistanceHistoryEntry,
  upsertReaderAssistanceHistoryEntry
} from './assistance';

test('assistance history entries normalize request text and keep explicit status updates', () => {
  const loadingEntry = createReaderAssistanceHistoryEntry(
    {
      kind: 'lookup',
      provider: 'wikipedia',
      term: '  bridge reader  ',
      bookKey: 'book-1'
    },
    {
      id: 'assist-1'
    }
  );

  const readyEntry = updateReaderAssistanceHistoryEntry(loadingEntry, {
    status: 'ready',
    result: {
      id: 'result-1',
      provider: 'wikipedia',
      title: 'Bridge reader',
      body: 'A focused reading surface.',
      createdAt: 10
    },
    updatedAt: 20
  });

  assert.equal(loadingEntry.request.kind, 'lookup');
  assert.equal(loadingEntry.request.term, 'bridge reader');
  assert.equal(readyEntry.status, 'ready');
  assert.equal(readyEntry.result?.title, 'Bridge reader');
  assert.equal(readyEntry.updatedAt, 20);
});

test('assistance history keeps the newest entries first and replaces existing ids', () => {
  const older = createReaderAssistanceHistoryEntry(
    {
      kind: 'lookup',
      provider: 'dictionary',
      term: 'epub',
      bookKey: 'book-1'
    },
    {
      id: 'assist-old',
      updatedAt: 10
    }
  );
  const newer = createReaderAssistanceHistoryEntry(
    {
      kind: 'translation',
      provider: 'deepl',
      text: 'current paragraph',
      targetLanguage: 'zh',
      bookKey: 'book-1'
    },
    {
      id: 'assist-new',
      updatedAt: 30
    }
  );
  const replacedOlder = updateReaderAssistanceHistoryEntry(older, {
    status: 'error',
    error: 'offline',
    updatedAt: 40
  });

  const nextHistory = upsertReaderAssistanceHistoryEntry(
    upsertReaderAssistanceHistoryEntry([older], newer),
    replacedOlder
  );

  assert.deepEqual(
    nextHistory.map((entry) => [entry.id, entry.status]),
    [
      ['assist-old', 'error'],
      ['assist-new', 'loading']
    ]
  );
});

test('assistance helpers expose reader-facing provider and subject labels', () => {
  assert.equal(getReaderAssistanceProviderDisplayLabel('dictionary'), '词典');
  assert.equal(getReaderAssistanceProviderDisplayLabel('deepl'), 'DeepL');
  assert.equal(
    getReaderAssistanceRequestContextLabel({
      kind: 'lookup',
      provider: 'wikipedia',
      term: 'bridge reader',
      chapterLabel: '第一章',
      bookKey: 'book-1'
    }),
    '第一章 · 维基百科'
  );
  assert.equal(
    getReaderAssistanceRequestContextLabel({
      kind: 'translation',
      provider: 'deepl',
      text: 'translate this paragraph',
      targetLanguage: 'zh',
      chapterLabel: '第二章',
      bookKey: 'book-1'
    }),
    '第二章 · 译为 ZH'
  );
  assert.equal(
    getReaderAssistanceRequestSubject({
      kind: 'translation',
      provider: 'yandex',
      text: '  translate this paragraph  ',
      targetLanguage: 'en',
      bookKey: 'book-1'
    }),
    'translate this paragraph'
  );
});

test('assistance history serialization restores sorted valid records and drops invalid ones', () => {
  // These test fixtures are deliberately explicit because restore behavior depends
  // on ordering between route state, current-book persistence, and live session state.
  const raw = JSON.stringify([
    {
      id: 'invalid',
      request: null,
      status: 'ready'
    },
    {
      id: 'assist-2',
      request: {
        kind: 'translation',
        provider: 'deepl',
        text: ' translated paragraph ',
        targetLanguage: 'zh',
        chapterLabel: '第二章',
        bookKey: 'book-1'
      },
      status: 'ready',
      result: {
        id: 'result-2',
        provider: 'deepl',
        title: 'DeepL',
        body: '译文',
        createdAt: 20
      },
      error: '',
      createdAt: 20,
      updatedAt: 20
    },
    {
      id: 'assist-1',
      request: {
        kind: 'lookup',
        provider: 'wikipedia',
        term: ' bridge reader ',
        chapterLabel: '第一章',
        bookKey: 'book-1'
      },
      status: 'empty',
      result: null,
      error: '',
      createdAt: 10,
      updatedAt: 10
    }
  ]);

  const restored = parseReaderAssistanceHistory(raw);

  assert.deepEqual(
    restored.map((entry) => [entry.id, entry.status, entry.request.kind]),
    [
      ['assist-2', 'ready', 'translation'],
      ['assist-1', 'empty', 'lookup']
    ]
  );
  assert.equal(restored[1]?.request.kind, 'lookup');
  if (restored[1]?.request.kind === 'lookup') {
    assert.equal(restored[1].request.term, 'bridge reader');
  }
});

test('assistance history serialization keeps the newest entries within the storage limit', () => {
  const entries = Array.from({ length: READER_ASSISTANCE_HISTORY_LIMIT + 2 }, (_, index) =>
    createReaderAssistanceHistoryEntry(
      {
        kind: 'lookup',
        provider: 'dictionary',
        term: `term-${index}`,
        bookKey: 'book-1'
      },
      {
        id: `assist-${index}`,
        updatedAt: index
      }
    )
  );

  const restored = parseReaderAssistanceHistory(serializeReaderAssistanceHistory(entries));

  assert.equal(restored.length, READER_ASSISTANCE_HISTORY_LIMIT);
  assert.equal(restored[0]?.id, `assist-${READER_ASSISTANCE_HISTORY_LIMIT + 1}`);
  assert.equal(restored.at(-1)?.id, 'assist-2');
});

test('assistance workspace selection serialization restores valid ids and drops malformed payloads', () => {
  const serialized = serializeReaderAssistanceWorkspaceSelection({
    lookupHistoryEntryId: 'lookup-1',
    translationHistoryEntryId: 'translation-2'
  });

  assert.deepEqual(parseReaderAssistanceWorkspaceSelection(serialized), {
    lookupHistoryEntryId: 'lookup-1',
    translationHistoryEntryId: 'translation-2'
  });

  assert.deepEqual(
    parseReaderAssistanceWorkspaceSelection('{"lookupHistoryEntryId":12,"translationHistoryEntryId":null}'),
    createEmptyReaderAssistanceWorkspaceSelection()
  );
});

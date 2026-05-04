import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createReaderAssistanceHistoryEntry,
  getReaderAssistanceProviderDisplayLabel,
  getReaderAssistanceRequestSubject,
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

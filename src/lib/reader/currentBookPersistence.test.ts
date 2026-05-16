// Ownership: these tests pin current-book persistence contracts so route
// refactors keep per-book restore order and bad-payload cleanup stable.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getReaderCurrentBookPersistenceKeys,
  persistReaderCurrentBookAssistanceHistory,
  persistReaderCurrentBookFocusedReadingState,
  persistReaderCurrentBookTranslatedTtsLiveSnapshot,
  restoreReaderCurrentBookAssistanceHistory,
  restoreReaderCurrentBookAssistanceSelection,
  restoreReaderCurrentBookFocusedReadingState,
  restoreReaderCurrentBookTranslatedTtsLiveSnapshot,
  restoreReaderCurrentBookTranslationLiveSnapshot,
  restoreReaderTtsOwnership
} from './currentBookPersistence.js';
import { createReaderAssistanceHistoryEntry } from './assistance.js';
import { createReaderFocusedReadingState } from './readingMode.js';

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

test('current-book persistence derives the full storage-key family from readerBookKey', () => {
  assert.deepEqual(getReaderCurrentBookPersistenceKeys('/samples/sample-book.epub'), {
    notesStorageKey: 'br1.reader.notes:/samples/sample-book.epub',
    bookmarksStorageKey: 'br1.reader.bookmarks:/samples/sample-book.epub',
    assistanceHistoryStorageKey: 'br1.reader.assistance.history:/samples/sample-book.epub',
    assistanceSelectionStorageKey: 'br1.reader.assistance.selection:/samples/sample-book.epub',
    translationOwnershipStorageKey: 'br1.reader.translation.ownership:/samples/sample-book.epub',
    translationModeConfigStorageKey: 'br1.reader.translation.mode:/samples/sample-book.epub',
    translationLiveSnapshotStorageKey: 'br1.reader.translation.live-result:/samples/sample-book.epub',
    ttsOwnershipStorageKey: 'br1.reader.tts.ownership:/samples/sample-book.epub',
    ttsReadAloudModeStorageKey: 'br1.reader.tts.mode:/samples/sample-book.epub',
    translatedTtsOwnerStorageKey: 'br1.reader.tts.translated-owner:/samples/sample-book.epub',
    translatedTtsLiveSnapshotStorageKey: 'br1.reader.tts.translated-live:/samples/sample-book.epub',
    focusedReadingStorageKey: 'br1.reader.focused-reading:/samples/sample-book.epub'
  });
});

test('malformed JSON restores empty or null values and clears the invalid current-book payload', () => {
  const storage = createMemoryStorage();
  const keys = getReaderCurrentBookPersistenceKeys('/samples/sample-book.epub');

  storage.setItem(keys.assistanceHistoryStorageKey, '{not-json');
  storage.setItem(keys.assistanceSelectionStorageKey, '{still-not-json');
  storage.setItem(keys.translationLiveSnapshotStorageKey, '{broken-json');
  storage.setItem(keys.ttsOwnershipStorageKey, '{"followsCurrentLocation":false,"pinnedTarget":null}');

  assert.deepEqual(restoreReaderCurrentBookAssistanceHistory(storage, keys.assistanceHistoryStorageKey), []);
  assert.deepEqual(
    restoreReaderCurrentBookAssistanceSelection(storage, keys.assistanceSelectionStorageKey),
    {
      lookupHistoryEntryId: '',
      translationHistoryEntryId: ''
    }
  );
  assert.equal(
    restoreReaderCurrentBookTranslationLiveSnapshot(storage, keys.translationLiveSnapshotStorageKey),
    null
  );
  assert.deepEqual(restoreReaderTtsOwnership(storage, keys.ttsOwnershipStorageKey), {
    followsCurrentLocation: true,
    pinnedTarget: null
  });

  assert.equal(storage.getItem(keys.assistanceHistoryStorageKey), null);
  assert.equal(storage.getItem(keys.assistanceSelectionStorageKey), null);
  assert.equal(storage.getItem(keys.translationLiveSnapshotStorageKey), null);
  assert.equal(storage.getItem(keys.ttsOwnershipStorageKey), null);
});

test('translated TTS live snapshot persistence removes empty payloads instead of keeping stale data', () => {
  const storage = createMemoryStorage();
  const keys = getReaderCurrentBookPersistenceKeys('/samples/sample-book.epub');

  persistReaderCurrentBookTranslatedTtsLiveSnapshot(storage, keys.translatedTtsLiveSnapshotStorageKey, {
    sourceText: ' current paragraph ',
    translatedText: ' 当前译文 ',
    targetLanguage: 'zh',
    providerLabel: 'DeepL',
    chapterLabel: 'Chapter 1',
    locationLabel: 'Location 1',
    progressLabel: '10%',
    progressLocation: 'epubcfi(/6/2)',
    progressFraction: 0.1,
    chapterHref: '#chapter-1'
  });
  assert.equal(
    restoreReaderCurrentBookTranslatedTtsLiveSnapshot(storage, keys.translatedTtsLiveSnapshotStorageKey)
      ?.translatedText,
    '当前译文'
  );

  persistReaderCurrentBookTranslatedTtsLiveSnapshot(
    storage,
    keys.translatedTtsLiveSnapshotStorageKey,
    null
  );

  assert.equal(storage.getItem(keys.translatedTtsLiveSnapshotStorageKey), null);
  assert.equal(
    restoreReaderCurrentBookTranslatedTtsLiveSnapshot(storage, keys.translatedTtsLiveSnapshotStorageKey),
    null
  );
});

test('current-book persistence keeps different readerBookKey payloads isolated', () => {
  const storage = createMemoryStorage();
  const epubKeys = getReaderCurrentBookPersistenceKeys('/samples/sample-book.epub');
  const txtKeys = getReaderCurrentBookPersistenceKeys('/samples/sample-book.txt');

  persistReaderCurrentBookAssistanceHistory(storage, epubKeys.assistanceHistoryStorageKey, [
    createReaderAssistanceHistoryEntry(
      {
        kind: 'translation',
        provider: 'deepl',
        text: 'epub paragraph',
        targetLanguage: 'zh',
        bookKey: '/samples/sample-book.epub'
      },
      { id: 'assist-epub', updatedAt: 10 }
    )
  ]);
  persistReaderCurrentBookAssistanceHistory(storage, txtKeys.assistanceHistoryStorageKey, [
    createReaderAssistanceHistoryEntry(
      {
        kind: 'translation',
        provider: 'deepl',
        text: 'txt paragraph',
        targetLanguage: 'zh',
        bookKey: '/samples/sample-book.txt'
      },
      { id: 'assist-txt', updatedAt: 20 }
    )
  ]);

  assert.equal(
    restoreReaderCurrentBookAssistanceHistory(storage, epubKeys.assistanceHistoryStorageKey)[0]?.id,
    'assist-epub'
  );
  assert.equal(
    restoreReaderCurrentBookAssistanceHistory(storage, txtKeys.assistanceHistoryStorageKey)[0]?.id,
    'assist-txt'
  );
  assert.notEqual(epubKeys.assistanceHistoryStorageKey, txtKeys.assistanceHistoryStorageKey);
});

test('focused reading persistence removes unsupported or exited sessions', () => {
  const storage = createMemoryStorage();
  const keys = getReaderCurrentBookPersistenceKeys('/samples/sample-book.txt');

  persistReaderCurrentBookFocusedReadingState(
    storage,
    keys.focusedReadingStorageKey,
    createReaderFocusedReadingState({
      mode: 'rsvp',
      formatLabel: 'TXT',
      sourceText: 'plain text focused reading',
      sourceLabel: '当前正文',
      words: ['plain', 'text', 'focused', 'reading'],
      activeWordIndex: 2
    })
  );
  assert.equal(
    restoreReaderCurrentBookFocusedReadingState(storage, keys.focusedReadingStorageKey)
      .activeWordIndex,
    2
  );

  persistReaderCurrentBookFocusedReadingState(
    storage,
    keys.focusedReadingStorageKey,
    createReaderFocusedReadingState()
  );

  assert.equal(storage.getItem(keys.focusedReadingStorageKey), null);
});

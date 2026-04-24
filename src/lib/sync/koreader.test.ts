import assert from 'node:assert/strict';
import test from 'node:test';

import type { PersistedLibraryBook } from '../services/libraryPersistence.js';
import {
  createKoReaderAnnotationSyncRecords,
  createKoReaderReadingStateSyncRecord,
  parseKoReaderPageProgress,
  restoreKoReaderAnnotationsFromSync,
  restoreKoReaderBookConfigFromSync,
  type KoReaderAnnotation,
  type KoReaderBookConfig,
  type KoReaderBookIdentity
} from './index.js';

const fixtureBook: PersistedLibraryBook = {
  id: 'library-book-1',
  title: 'Fixture Book',
  author: 'Reader One',
  format: 'EPUB',
  description: 'Fixture description',
  language: 'en',
  publisher: 'Fixture Press',
  collection: 'Parity Shelf',
  tags: ['sync', 'fixture'],
  progress: '上次读到 40%',
  status: '阅读中',
  filePath: '/library/fixture-book.epub',
  coverPath: '/library/covers/fixture-book.webp',
  sourcePath: '/imports/fixture-book.epub',
  importedAt: 1700000000000,
  progressFraction: 0.4,
  progressLocation: 'epubcfi(/6/14!/4/2/8)',
  koreaderProgressLocation: '/body/DocFragment[1]/body/div/p[14]',
  lastOpenedAt: 1700000005000,
  libraryFileExists: true,
  sourceFileExists: true
};

const identity: KoReaderBookIdentity = {
  bookHash: 'book-hash-1',
  metaHash: 'meta-hash-1'
};

test('KOReader reading config round-trips through reading-state records', () => {
  const config: KoReaderBookConfig = {
    ...identity,
    progress: [45, 300],
    xpointer: '/body/DocFragment[1]/body/div/p[22]',
    updatedAt: 1700000030000
  };

  const record = JSON.parse(
    JSON.stringify(createKoReaderReadingStateSyncRecord(fixtureBook, config, { fallbackUpdatedAt: 1 }))
  );
  const restored = restoreKoReaderBookConfigFromSync(record, identity);

  assert.equal(record.payload.progress, '[45,300]');
  assert.equal(record.payload.progressFraction, 0.15);
  assert.equal(record.payload.progressLocation, 'epubcfi(/6/14!/4/2/8)');
  assert.equal(record.payload.koreaderProgressLocation, '/body/DocFragment[1]/body/div/p[22]');
  assert.deepEqual(restored, {
    ...identity,
    progress: '[45,300]',
    xpointer: '/body/DocFragment[1]/body/div/p[22]',
    updatedAt: 1700000030000
  });
});

test('KOReader annotation fixtures round-trip through sync records without losing adapter metadata', () => {
  const annotations: KoReaderAnnotation[] = [
    {
      ...identity,
      id: 'annotation-1',
      type: 'annotation',
      xpointer0: 'xpointer(/body/section[2]/p[4])',
      xpointer1: 'xpointer(/body/section[2]/p[5])',
      text: 'Selected line',
      note: 'Margin note',
      page: 12,
      style: 'underline',
      color: 'blue',
      createdAt: 1700000040000,
      updatedAt: 1700000045000
    },
    {
      ...identity,
      id: 'bookmark-1',
      type: 'bookmark',
      xpointer0: 'xpointer(/body/section[5])',
      text: 'Chapter break',
      note: 'Return here',
      page: 18,
      createdAt: 1700000050000,
      updatedAt: 1700000055000
    },
    {
      ...identity,
      id: 'deleted-bookmark',
      type: 'bookmark',
      xpointer0: 'xpointer(/body/section[9])',
      text: 'Deleted',
      note: '',
      page: 30,
      createdAt: 1700000060000,
      updatedAt: 1700000065000,
      deletedAt: 1700000070000
    }
  ];

  const { notesRecord, bookmarksRecord } = createKoReaderAnnotationSyncRecords(
    fixtureBook.filePath,
    annotations,
    {
      fallbackUpdatedAt: 1
    }
  );
  const restored = restoreKoReaderAnnotationsFromSync({
    identity,
    notesRecord: JSON.parse(JSON.stringify(notesRecord)),
    bookmarksRecord: JSON.parse(JSON.stringify(bookmarksRecord))
  });

  assert.equal(notesRecord.payload.notes.length, 1);
  assert.equal(bookmarksRecord.payload.bookmarks.length, 1);
  assert.equal(bookmarksRecord.payload.bookmarks[0]?.targetHref, 'xpointer(/body/section[5])');
  assert.equal(bookmarksRecord.payload.bookmarks[0]?.chapterHref, 'xpointer(/body/section[5])');
  assert.deepEqual(restored, [
    {
      ...identity,
      id: 'annotation-1',
      type: 'annotation',
      xpointer0: 'xpointer(/body/section[2]/p[4])',
      xpointer1: 'xpointer(/body/section[2]/p[5])',
      text: 'Selected line',
      note: 'Margin note',
      page: 12,
      style: 'underline',
      color: 'blue',
      createdAt: 1700000040000,
      updatedAt: 1700000045000,
      deletedAt: null
    },
    {
      ...identity,
      id: 'bookmark-1',
      type: 'bookmark',
      xpointer0: 'xpointer(/body/section[5])',
      xpointer1: null,
      text: 'Chapter break',
      note: 'Return here',
      page: 18,
      style: null,
      color: null,
      createdAt: 1700000050000,
      updatedAt: 1700000055000,
      deletedAt: null
    }
  ]);
});

test('KOReader page progress parser accepts normalized page tuples only', () => {
  assert.deepEqual(parseKoReaderPageProgress([12, 400]), {
    current: 12,
    total: 400
  });
  assert.deepEqual(parseKoReaderPageProgress('[3,18]'), {
    current: 3,
    total: 18
  });
  assert.equal(parseKoReaderPageProgress('40%'), null);
  assert.equal(parseKoReaderPageProgress(''), null);
});

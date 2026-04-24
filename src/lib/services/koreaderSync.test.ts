import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createBr1SyncSnapshot,
  createLibraryBookMetadataSyncRecord,
  createReaderBookmarksSyncRecord,
  createReaderNotesSyncRecord,
  createReadingStateSyncRecord
} from '../sync/index.js';
import {
  createKoReaderRemoteProgressEntriesFromSnapshot,
  createKoReaderSyncExchangeFromSnapshot,
  mergeKoReaderRemoteProgressIntoSnapshot,
  mergeKoReaderSyncExchangeIntoSnapshot
} from './koreaderSync.js';

const alpha = {
  id: 'book-alpha',
  title: 'Alpha',
  author: 'Author',
  format: 'EPUB',
  description: null,
  language: 'en',
  publisher: null,
  collection: null,
  tags: [],
  progress: '10%',
  status: '阅读中',
  filePath: '/library/alpha.epub',
  coverPath: null,
  sourcePath: '/imports/alpha.epub',
  importedAt: 1700000000000,
  progressFraction: 0.1,
  progressLocation: 'epubcfi(/6/2!/4/2)',
  koreaderProgressLocation: '/body/DocFragment[1]/body/div/p[2]',
  lastOpenedAt: 1700000005000,
  libraryFileExists: true,
  sourceFileExists: true
};

const beta = {
  ...alpha,
  id: 'book-beta',
  title: 'Beta',
  filePath: '/library/beta.epub',
  sourcePath: '/imports/beta.epub',
  progress: '20%',
  progressFraction: 0.2,
  progressLocation: 'epubcfi(/6/4!/4/2)',
  koreaderProgressLocation: '/body/DocFragment[2]/body/div/p[4]',
  lastOpenedAt: 1700000010000
};

const createSnapshot = () =>
  createBr1SyncSnapshot(
    [
      createLibraryBookMetadataSyncRecord(alpha),
      createReadingStateSyncRecord(alpha),
      createReaderBookmarksSyncRecord(alpha.filePath, [
        {
          id: 'bookmark-alpha',
          locator: 'epubcfi(/6/2!/4/2)',
          targetHref: '',
          chapterLabel: 'Alpha chapter',
          chapterHref: '',
          progressLabel: '10%',
          locationLabel: 'Alpha location',
          createdAt: 1700000006000
        }
      ]),
      createReaderNotesSyncRecord(alpha.filePath, [
        {
          id: 'note-alpha',
          kind: 'note',
          cfi: 'epubcfi(/6/2!/4/2)',
          text: 'Alpha line',
          note: 'Alpha note',
          chapterLabel: 'Alpha chapter',
          chapterHref: '',
          createdAt: 1700000007000
        }
      ]),
      createLibraryBookMetadataSyncRecord(beta),
      createReadingStateSyncRecord(beta)
    ],
    1700000020000
  );

test('KOReader exchange export keeps one book document per library book', () => {
  const exchange = createKoReaderSyncExchangeFromSnapshot(createSnapshot());

  assert.equal(exchange.books.length, 2);
  assert.equal(exchange.books[0]?.bookId, 'book-alpha');
  assert.equal(exchange.books[0]?.koreader.annotations.length, 2);
  assert.equal(exchange.books[1]?.bookId, 'book-beta');
});

test('KOReader exchange import merges matched books and reports missing ones', () => {
  const current = createSnapshot();
  const exchange = createKoReaderSyncExchangeFromSnapshot(current);
  exchange.books = [
    {
      ...exchange.books[0],
      koreader: {
        ...exchange.books[0].koreader,
        config: {
          ...exchange.books[0].koreader.config,
          progress: '[33,100]',
          xpointer: 'epubcfi(/6/8!/4/2)',
          updatedAt: 1700000030000
        }
      }
    },
    {
      ...exchange.books[1],
      bookId: 'missing-book-id',
      filePath: '/missing/book.epub',
      sourcePath: '/missing/book.epub',
      title: 'Missing title',
      author: 'Missing author'
    }
  ];

  const plan = mergeKoReaderSyncExchangeIntoSnapshot(current, exchange);
  const alphaReading = plan.snapshot.records.find((record) => record.id === 'reading-state:book-alpha');

  assert.equal(plan.appliedBookCount, 1);
  assert.equal(plan.skippedBookCount, 1);
  assert.equal(plan.conflicts.length, 1);
  assert.equal(plan.conflicts[0]?.kind, 'missing-local-book');
  assert.equal(alphaReading?.kind, 'reading-state');
  assert.equal((alphaReading as { payload: { progress: string } }).payload.progress, '[33,100]');
});

test('KOReader exchange import skips older data when current local state is newer', () => {
  const current = createSnapshot();
  const exchange = createKoReaderSyncExchangeFromSnapshot(current);
  exchange.books = [
    {
      ...exchange.books[0],
      koreader: {
        ...exchange.books[0].koreader,
        config: {
          ...exchange.books[0].koreader.config,
          progress: '[5,100]',
          xpointer: 'epubcfi(/6/1!/4/2)',
          updatedAt: 1700000001000
        },
        annotations: exchange.books[0].koreader.annotations.map((annotation) => ({
          ...annotation,
          updatedAt: 1700000001000
        }))
      }
    }
  ];

  const plan = mergeKoReaderSyncExchangeIntoSnapshot(current, exchange);

  assert.equal(plan.appliedBookCount, 0);
  assert.equal(plan.conflicts[0]?.kind, 'local-newer');
});

test('KOReader remote progress export keeps one progress entry per reading-state book', () => {
  const entries = createKoReaderRemoteProgressEntriesFromSnapshot(createSnapshot());

  assert.equal(entries.length, 2);
  assert.equal(entries[0]?.bookId, 'book-alpha');
  assert.equal(entries[0]?.document.length > 0, true);
  assert.equal(entries[0]?.progress, '/body/DocFragment[1]/body/div/p[2]');
  assert.equal(entries[0]?.percentage, 10);
});

test('KOReader remote progress pull merges newer remote progress into the snapshot', () => {
  const current = createSnapshot();
  const entries = createKoReaderRemoteProgressEntriesFromSnapshot(current);
  const remoteAlpha = {
    ...entries[0],
    progress: 'epubcfi(/6/18!/4/2)',
    percentage: 44,
    timestamp: 1700000030000
  };

  const plan = mergeKoReaderRemoteProgressIntoSnapshot(current, [remoteAlpha]);
  const alphaReading = plan.snapshot.records.find((record) => record.id === 'reading-state:book-alpha');

  assert.equal(plan.appliedBookCount, 1);
  assert.equal(plan.skippedBookCount, 0);
  assert.equal(alphaReading?.kind, 'reading-state');
  assert.equal((alphaReading as { payload: { progress: string } }).payload.progress, '44%');
  assert.equal(
    (alphaReading as { payload: { progressLocation: string | null } }).payload.progressLocation,
    'epubcfi(/6/18!/4/2)'
  );
  assert.equal(
    (alphaReading as { payload: { koreaderProgressLocation: string | null } }).payload.koreaderProgressLocation,
    'epubcfi(/6/18!/4/2)'
  );
  assert.equal(
    (alphaReading as { payload: { progressFraction: number | null } }).payload.progressFraction,
    0.44
  );
});

test('KOReader remote progress pull skips older remote progress when local state is newer', () => {
  const current = createSnapshot();
  const entries = createKoReaderRemoteProgressEntriesFromSnapshot(current);
  const remoteAlpha = {
    ...entries[0],
    progress: '[4,100]',
    percentage: 4,
    timestamp: 1700000000001
  };

  const plan = mergeKoReaderRemoteProgressIntoSnapshot(current, [remoteAlpha]);

  assert.equal(plan.appliedBookCount, 0);
  assert.equal(plan.conflicts[0]?.kind, 'local-newer');
});

test('KOReader remote progress export skips books without a KOReader-compatible locator or page value', () => {
  const snapshot = createBr1SyncSnapshot(
    [
      createLibraryBookMetadataSyncRecord({
        ...alpha,
        id: 'book-txt',
        title: 'Plain text',
        format: 'TXT',
        filePath: '/library/plain.txt',
        sourcePath: '/imports/plain.txt',
        progressLocation: 'txt:0.250000',
        koreaderProgressLocation: null,
        progress: '25%',
        progressFraction: 0.25
      }),
      createReadingStateSyncRecord({
        ...alpha,
        id: 'book-txt',
        title: 'Plain text',
        format: 'TXT',
        filePath: '/library/plain.txt',
        sourcePath: '/imports/plain.txt',
        progressLocation: 'txt:0.250000',
        koreaderProgressLocation: null,
        progress: '25%',
        progressFraction: 0.25
      })
    ],
    1700000020000
  );

  const entries = createKoReaderRemoteProgressEntriesFromSnapshot(snapshot);

  assert.equal(entries.length, 0);
});

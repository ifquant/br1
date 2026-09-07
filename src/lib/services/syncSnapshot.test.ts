import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createBr1SyncSnapshot,
  createLibraryBookMetadataSyncRecord,
  createReadingStateSyncRecord
} from '../sync/index.js';
import { prepareSyncSnapshotRestore } from './syncSnapshot.js';

const book = {
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
  status: 'Reading',
  filePath: '/library/alpha.epub',
  coverPath: null,
  sourcePath: null,
  importedAt: 1,
  progressFraction: 0.1,
  progressLocation: 'epubcfi(/6/2!/4/2)',
  koreaderProgressLocation: null,
  lastOpenedAt: 2,
  libraryFileExists: true,
  sourceFileExists: true
};

test('snapshot restore rejects malformed origin records before duplicate selection', () => {
  const metadata = createLibraryBookMetadataSyncRecord(book);
  const valid = createReadingStateSyncRecord({
    ...book,
    progressLocationOrigin: 'future-renderer-v9'
  });
  const invalid = {
    ...valid,
    payload: { ...valid.payload, progressLocationOrigin: 7 as never }
  };

  for (const records of [[invalid, valid], [valid, invalid]]) {
    const snapshot = createBr1SyncSnapshot([metadata, ...records], 3);
    assert.throws(
      () => prepareSyncSnapshotRestore(snapshot),
      /progressLocationOrigin must be a string/
    );
  }
});

test('snapshot restore ignores raw metadata origins when reading state leaves origin unknown', () => {
  const readingState = createReadingStateSyncRecord(book);

  for (const progressLocationOrigin of ['borrowed-origin', 7 as never]) {
    const metadata = {
      ...createLibraryBookMetadataSyncRecord(book),
      payload: {
        ...createLibraryBookMetadataSyncRecord(book).payload,
        progressLocationOrigin
      }
    };
    const snapshot = createBr1SyncSnapshot([metadata, readingState], 3);
    const restored = prepareSyncSnapshotRestore(snapshot).request.libraryBooks[0];

    assert.equal('progressLocationOrigin' in restored, false);
  }
});

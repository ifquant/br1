// Test setup is explicit here because sync and persistence bugs usually come
// from mixing local state, remote state, and retry metadata in the wrong order.

import assert from 'node:assert/strict';
import test from 'node:test';

import type { PersistedLibraryBook } from './libraryPersistence.js';
import { toLibraryReaderTarget } from './libraryPersistence.js';

const fixtureBook: PersistedLibraryBook = {
  id: 'book-1',
  title: 'Fixture',
  author: 'Reader',
  format: 'EPUB',
  description: null,
  language: 'en',
  publisher: null,
  collection: null,
  tags: [],
  progress: '55%',
  status: '阅读中',
  filePath: '/library/fixture.epub',
  coverPath: null,
  sourcePath: '/imports/fixture.epub',
  importedAt: 1700000000000,
  progressFraction: 0.55,
  progressLocation: 'epubcfi(/6/2!/4/2)',
  koreaderProgressLocation: null,
  lastOpenedAt: 1700000005000,
  libraryFileExists: true,
  sourceFileExists: true
};

test('library reader target prefers a synced KOReader CFI over stale progressLocation', () => {
  const target = toLibraryReaderTarget({
    ...fixtureBook,
    progressLocation: 'epubcfi(/6/2!/4/2)',
    koreaderProgressLocation: 'epubcfi(/6/8!/4/2)'
  });

  assert.equal(target.kind, 'library-file');
  if (target.kind !== 'library-file') {
    throw new Error('Expected a library-file target');
  }
  assert.equal(target.restoreLocation, 'epubcfi(/6/8!/4/2)');
  assert.match(target.href, /location=epubcfi%28%2F6%2F8%21%2F4%2F2%29/);
});

test('library reader target falls back to fraction when the synced KOReader locator is not directly restorable', () => {
  const target = toLibraryReaderTarget({
    ...fixtureBook,
    progressFraction: 0.72,
    progressLocation: 'epubcfi(/6/2!/4/2)',
    koreaderProgressLocation: '/body/DocFragment[9]/body/div/p[8]'
  });

  assert.equal(target.kind, 'library-file');
  if (target.kind !== 'library-file') {
    throw new Error('Expected a library-file target');
  }
  assert.equal(target.restoreLocation, undefined);
  assert.equal(target.restoreFraction, 0.72);
  assert.doesNotMatch(target.href, /location=/);
  assert.match(target.href, /fraction=0.72/);
});

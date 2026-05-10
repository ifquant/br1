// Ownership: this test covers the desktop catalog projection rules that decide which Readest
// records the library may honestly present as still readable inside the desktop surface.
import test from 'node:test';
import assert from 'node:assert/strict';

import { countReadestCompatibleRecords } from './desktopCatalog';
import type { PersistedLibraryBook } from '$lib/services/libraryPersistence';

const makeRecord = (
  overrides: Partial<PersistedLibraryBook> & Pick<PersistedLibraryBook, 'id'>
): PersistedLibraryBook => {
  const { id, ...rest } = overrides;

  return {
    id,
    title: rest.title ?? 'Title',
    author: rest.author ?? 'Author',
    format: rest.format ?? 'EPUB',
    progress: rest.progress ?? '尚未开始',
    status: rest.status ?? '从 Readest 导入',
    filePath: rest.filePath ?? `/tmp/${id}.epub`,
    importedAt: rest.importedAt ?? 1,
    ...rest
  };
};

test('countReadestCompatibleRecords only counts readable Readest copies', () => {
  // This fixture intentionally mixes readable, migrated, and broken records so the test proves
  // the library surface does not overclaim which Readest titles can still be opened.
  const records = [
    makeRecord({
      id: 'readest-ok',
      libraryFileExists: true
    }),
    makeRecord({
      id: 'readest-missing-copy',
      libraryFileExists: false
    }),
    makeRecord({
      id: 'local-import',
      libraryFileExists: true
    })
  ];

  assert.equal(countReadestCompatibleRecords(records), 1);
});

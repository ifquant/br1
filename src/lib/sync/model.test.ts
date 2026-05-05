import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createBr1SyncSnapshot,
  createLibraryBookMetadataSyncRecord,
  createLibrarySyncSubstrateRecords,
  createReaderBookmarksSyncRecord,
  createReaderHighlightsWorkspaceSyncRecord,
  createReaderNotesSyncRecord,
  createReaderSettingsSyncRecord,
  createReadingStateSyncRecord,
  restorePersistedLibraryBookFromSync,
  restoreReaderBookmarksFromSync,
  restoreReaderHighlightsWorkspaceStateFromSync,
  restoreReaderNotesFromSync,
  restoreReaderSettingsFromSync
} from './index.js';

const fixtureBook = {
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
  koreaderProgressLocation: '/body/DocFragment[3]/body/div/section/p[8]',
  lastOpenedAt: 1700000005000,
  libraryFileExists: true,
  sourceFileExists: true
};

test('library sync substrate records use deterministic ids and restore persisted books', () => {
  const metadataRecord = createLibraryBookMetadataSyncRecord(fixtureBook, {
    fallbackUpdatedAt: 123
  });
  const readingStateRecord = createReadingStateSyncRecord(fixtureBook, {
    fallbackUpdatedAt: 123
  });
  const snapshot = createBr1SyncSnapshot([metadataRecord, readingStateRecord], 1700000009000);

  assert.equal(metadataRecord.id, 'library-book:library-book-1');
  assert.equal(metadataRecord.updatedAt, 1700000000000);
  assert.equal(readingStateRecord.id, 'reading-state:library-book-1');
  assert.equal(readingStateRecord.updatedAt, 1700000005000);
  assert.equal(snapshot.records.length, 2);

  assert.deepEqual(restorePersistedLibraryBookFromSync(metadataRecord, readingStateRecord), fixtureBook);
});

test('collection sync records preserve per-book shapes and stable record ids', () => {
  const bookmarks = [
    {
      id: 'bookmark-1',
      locator: 'epubcfi(/6/14!/4/2/8)',
      targetHref: 'epubcfi(/6/14!/4/2/8)',
      chapterLabel: 'Chapter 1',
      chapterHref: '#chapter-1',
      progressLabel: '40%',
      locationLabel: 'Chapter 1',
      createdAt: 1700000006000,
      koreader: {
        xpointer0: '/body/DocFragment[3]/body/div/section/p[8]',
        updatedAt: 1700000006100,
        text: 'Chapter 1',
        note: ''
      }
    }
  ];
  const notes = [
    {
      id: 'note-1',
      kind: 'highlight' as const,
      cfi: 'epubcfi(/6/14!/4/2/8)',
      text: 'Selected line',
      note: 'Margin note',
      chapterLabel: 'Chapter 1',
      chapterHref: '#chapter-1',
      createdAt: 1700000007000,
      koreader: {
        xpointer0: '/body/DocFragment[3]/body/div/section/p[8].text().1',
        updatedAt: 1700000007100,
        style: 'highlight' as const
      }
    }
  ];
  const workspaceState = {
    filter: 'selected' as const,
    sort: 'recent' as const,
    savedSelectionsSort: 'oldest' as const,
    savedSelectionsRefreshFilter: 'partial' as const,
    selectedIds: ['note-1'],
    savedSelections: [
      {
        id: 'selection-1',
        name: 'Interesting bits',
        selectedIds: ['note-1'],
        createdAt: 1700000008000,
        importSource: {
          bookKey: fixtureBook.filePath,
          bookTitle: fixtureBook.title,
          formatLabel: fixtureBook.format,
          selectionName: 'Imported set',
          matchedCount: 1,
          totalCount: 1,
          unmatchedCount: 0,
          importedAt: 1700000008500,
          highlights: [
            {
              id: 'note-1',
              cfi: 'epubcfi(/6/14!/4/2/8)',
              text: 'Selected line',
              chapterLabel: 'Chapter 1',
              chapterHref: '#chapter-1',
              createdAt: 1700000007000
            }
          ]
        }
      }
    ]
  };

  const bookmarksRecord = createReaderBookmarksSyncRecord(fixtureBook.filePath, bookmarks, {
    fallbackUpdatedAt: 1
  });
  const notesRecord = createReaderNotesSyncRecord(fixtureBook.filePath, notes, {
    fallbackUpdatedAt: 1
  });
  const workspaceRecord = createReaderHighlightsWorkspaceSyncRecord(
    fixtureBook.filePath,
    workspaceState,
    {
      fallbackUpdatedAt: 1
    }
  );

  assert.equal(bookmarksRecord.id, createReaderBookmarksSyncRecord(fixtureBook.filePath, [], { fallbackUpdatedAt: 1 }).id);
  assert.equal(bookmarksRecord.updatedAt, 1700000006000);
  assert.equal(notesRecord.updatedAt, 1700000007000);
  assert.equal(workspaceRecord.updatedAt, 1700000008500);
  assert.deepEqual(restoreReaderBookmarksFromSync(bookmarksRecord), bookmarks);
  assert.deepEqual(restoreReaderNotesFromSync(notesRecord), notes);
  assert.deepEqual(restoreReaderHighlightsWorkspaceStateFromSync(workspaceRecord), workspaceState);
});

test('reader settings sync records normalize invalid payload values and use fallback timestamps', () => {
  const record = createReaderSettingsSyncRecord(
    {
      flowMode: 'unexpected' as never,
      fontFamily: 'serif',
      fontScale: 'md',
      lineHeight: 'standard',
      pageMargins: 'wide',
      themePreset: 'paper',
      viewWidthMode: 'focus',
      chromeMode: 'always',
      readingRulerMode: 'on',
      focusAidMode: 'paragraph',
      ttsReadAloudText: 'translated'
    },
    {
      storageKey: 'br1.reader.settings',
      fallbackUpdatedAt: 1700000010000
    }
  );

  assert.equal(record.updatedAt, 1700000010000);
  assert.equal(record.scope?.storageKey, 'br1.reader.settings');
  assert.equal(restoreReaderSettingsFromSync(record).flowMode, 'paginated');
  assert.equal(restoreReaderSettingsFromSync(record).focusAidMode, 'paragraph');
  assert.equal(restoreReaderSettingsFromSync(record).ttsReadAloudText, 'translated');
});

test('bulk library substrate helper emits metadata and reading-state records for each book', () => {
  const secondBook = {
    ...fixtureBook,
    id: 'library-book-2',
    filePath: '/library/second-book.epub',
    importedAt: 1700000020000,
    lastOpenedAt: null
  };

  const records = createLibrarySyncSubstrateRecords([fixtureBook, secondBook], {
    fallbackUpdatedAt: 5
  });

  assert.equal(records.length, 4);
  assert.deepEqual(
    records.map((record) => record.kind),
    ['library-book', 'reading-state', 'library-book', 'reading-state']
  );
  assert.equal(records[3]?.updatedAt, 1700000020000);
});

test('reading-state sync records preserve KOReader-specific progress locators', () => {
  const record = createReadingStateSyncRecord(fixtureBook, {
    fallbackUpdatedAt: 1
  });

  assert.equal(record.payload.progressLocation, 'epubcfi(/6/14!/4/2/8)');
  assert.equal(record.payload.koreaderProgressLocation, '/body/DocFragment[3]/body/div/section/p[8]');

  const restored = restorePersistedLibraryBookFromSync(
    createLibraryBookMetadataSyncRecord(fixtureBook, {
      fallbackUpdatedAt: 1
    }),
    record
  );

  assert.equal(restored.progressLocation, 'epubcfi(/6/14!/4/2/8)');
  assert.equal(restored.koreaderProgressLocation, '/body/DocFragment[3]/body/div/section/p[8]');
});

import {
  createKoReaderAnnotationSyncRecords,
  createKoReaderReadingStateSyncRecord,
  deriveKoReaderBookIdentity,
  restoreKoReaderAnnotationsFromSync,
  restoreKoReaderBookConfigFromSync,
  type Br1SyncSnapshot,
  type LibraryBookMetadataSyncRecord,
  type ReaderBookmarksSyncRecord,
  type ReaderNotesSyncRecord,
  type ReadingStateSyncRecord
} from '../sync/index.js';
import type { PersistedLibraryBook } from './libraryPersistence';
import { invokeTauri, isTauriDesktop } from './platform.js';

export const BR1_KOREADER_SYNC_EXCHANGE_SCHEMA_VERSION = 1;

export type Br1KoReaderSyncExchangeBook = {
  bookId: string;
  filePath: string;
  sourcePath: string | null;
  title: string;
  author: string;
  format: string;
  importedAt: number;
  koreader: {
    bookHash: string;
    metaHash: string;
    config: {
      progress: [number, number] | string | '';
      xpointer: string;
      updatedAt: number;
    };
    annotations: ReturnType<typeof restoreKoReaderAnnotationsFromSync>;
  };
};

export type Br1KoReaderSyncExchangeDocument = {
  schemaVersion: typeof BR1_KOREADER_SYNC_EXCHANGE_SCHEMA_VERSION;
  exportedAt: number;
  books: Br1KoReaderSyncExchangeBook[];
};

export type KoReaderSyncExchangeExportDialogResult = {
  cancelled: boolean;
  fileName: string | null;
  bookCount: number;
};

export type KoReaderSyncExchangeImportDialogResult = {
  cancelled: boolean;
  fileName: string | null;
  bookCount: number;
  document: Br1KoReaderSyncExchangeDocument | null;
};

export type KoReaderSyncConflictKind =
  | 'missing-local-book'
  | 'ambiguous-local-book'
  | 'local-newer';

export type KoReaderSyncConflict = {
  kind: KoReaderSyncConflictKind;
  bookTitle: string;
  bookAuthor: string;
  bookFormat: string;
  detail: string;
};

export type KoReaderSyncImportPlan = {
  snapshot: Br1SyncSnapshot;
  appliedBookCount: number;
  skippedBookCount: number;
  conflicts: KoReaderSyncConflict[];
};

const requireTauriKoReaderSyncRuntime = (action: string) => {
  if (!isTauriDesktop()) {
    throw new Error(`${action} requires the Tauri desktop runtime`);
  }
};

const stringifyComparable = (value: unknown) => JSON.stringify(value ?? null);

const getMetadataRecordMap = (snapshot: Br1SyncSnapshot) =>
  new Map(
    snapshot.records
      .filter((record): record is LibraryBookMetadataSyncRecord => record.kind === 'library-book')
      .map((record) => [record.payload.id, record])
  );

const getReadingStateRecordMap = (snapshot: Br1SyncSnapshot) =>
  new Map(
    snapshot.records
      .filter((record): record is ReadingStateSyncRecord => record.kind === 'reading-state')
      .map((record) => [record.payload.id, record])
  );

const getBookmarksRecordMap = (snapshot: Br1SyncSnapshot) =>
  new Map(
    snapshot.records
      .filter((record): record is ReaderBookmarksSyncRecord => record.kind === 'bookmarks')
      .map((record) => [record.payload.bookKey, record])
  );

const getNotesRecordMap = (snapshot: Br1SyncSnapshot) =>
  new Map(
    snapshot.records
      .filter((record): record is ReaderNotesSyncRecord => record.kind === 'notes')
      .map((record) => [record.payload.bookKey, record])
  );

const toPersistedLibraryBook = (
  metadataRecord: LibraryBookMetadataSyncRecord,
  readingStateRecord?: ReadingStateSyncRecord | null
): PersistedLibraryBook => ({
  ...metadataRecord.payload,
  progress: readingStateRecord?.payload.progress ?? '尚未开始',
  status: readingStateRecord?.payload.status ?? '未开始',
  progressFraction: readingStateRecord?.payload.progressFraction ?? null,
  progressLocation: readingStateRecord?.payload.progressLocation ?? null,
  lastOpenedAt: readingStateRecord?.payload.lastOpenedAt ?? null
});

export const createKoReaderSyncExchangeFromSnapshot = (
  snapshot: Br1SyncSnapshot
): Br1KoReaderSyncExchangeDocument => {
  const metadataRecords = [...getMetadataRecordMap(snapshot).values()];
  const readingStateById = getReadingStateRecordMap(snapshot);
  const bookmarksByKey = getBookmarksRecordMap(snapshot);
  const notesByKey = getNotesRecordMap(snapshot);

  return {
    schemaVersion: BR1_KOREADER_SYNC_EXCHANGE_SCHEMA_VERSION,
    exportedAt: snapshot.exportedAt,
    books: metadataRecords.map((metadataRecord) => {
      const readingStateRecord = readingStateById.get(metadataRecord.payload.id) ?? null;
      const book = toPersistedLibraryBook(metadataRecord, readingStateRecord);
      const identity = deriveKoReaderBookIdentity(book);
      return {
        bookId: book.id,
        filePath: book.filePath,
        sourcePath: book.sourcePath ?? null,
        title: book.title,
        author: book.author,
        format: book.format,
        importedAt: book.importedAt,
        koreader: {
          ...identity,
          config: restoreKoReaderBookConfigFromSync(
            createKoReaderReadingStateSyncRecord(book, {
              ...identity,
              progress: book.progress,
              xpointer: book.progressLocation ?? '',
              updatedAt: book.lastOpenedAt ?? snapshot.exportedAt
            }),
            identity
          ),
          annotations: restoreKoReaderAnnotationsFromSync({
            identity,
            notesRecord: notesByKey.get(book.filePath) ?? null,
            bookmarksRecord: bookmarksByKey.get(book.filePath) ?? null
          })
        }
      };
    })
  };
};

const getImportedBookUpdatedAt = (book: Br1KoReaderSyncExchangeBook) =>
  Math.max(
    book.koreader.config.updatedAt,
    ...book.koreader.annotations.map((annotation) => annotation.updatedAt)
  );

const resolveMatchedMetadataRecord = (
  exchangeBook: Br1KoReaderSyncExchangeBook,
  metadataRecords: LibraryBookMetadataSyncRecord[]
):
  | { kind: 'matched'; record: LibraryBookMetadataSyncRecord }
  | { kind: 'missing'; detail: string }
  | { kind: 'ambiguous'; detail: string } => {
  const exactById = metadataRecords.find((record) => record.payload.id === exchangeBook.bookId);
  if (exactById) {
    return { kind: 'matched', record: exactById };
  }

  const exactByFilePath = metadataRecords.find(
    (record) => record.payload.filePath === exchangeBook.filePath
  );
  if (exactByFilePath) {
    return { kind: 'matched', record: exactByFilePath };
  }

  if (exchangeBook.sourcePath) {
    const exactBySourcePath = metadataRecords.find(
      (record) => record.payload.sourcePath === exchangeBook.sourcePath
    );
    if (exactBySourcePath) {
      return { kind: 'matched', record: exactBySourcePath };
    }
  }

  const fallbackMatches = metadataRecords.filter(
    (record) =>
      record.payload.title === exchangeBook.title &&
      record.payload.author === exchangeBook.author &&
      record.payload.format === exchangeBook.format
  );

  if (fallbackMatches.length === 1) {
    return { kind: 'matched', record: fallbackMatches[0] };
  }

  if (fallbackMatches.length > 1) {
    return {
      kind: 'ambiguous',
      detail: `找到 ${fallbackMatches.length} 本同名同作者同格式图书，无法安全决定要覆盖哪一本。`
    };
  }

  return {
    kind: 'missing',
    detail: '当前书库中找不到可唯一匹配的图书记录。'
  };
};

export const mergeKoReaderSyncExchangeIntoSnapshot = (
  currentSnapshot: Br1SyncSnapshot,
  document: Br1KoReaderSyncExchangeDocument
): KoReaderSyncImportPlan => {
  const nextRecords = [...currentSnapshot.records];
  const metadataRecords = [...getMetadataRecordMap(currentSnapshot).values()];
  const readingStateById = getReadingStateRecordMap(currentSnapshot);
  const bookmarksByKey = getBookmarksRecordMap(currentSnapshot);
  const notesByKey = getNotesRecordMap(currentSnapshot);
  const conflicts: KoReaderSyncConflict[] = [];
  let appliedBookCount = 0;

  const replaceRecord = (recordId: string, replacement: unknown & { id: string }) => {
    const index = nextRecords.findIndex((record) => record.id === recordId);
    if (index >= 0) {
      nextRecords[index] = replacement as (typeof nextRecords)[number];
      return;
    }
    nextRecords.push(replacement as (typeof nextRecords)[number]);
  };

  for (const exchangeBook of document.books) {
    const match = resolveMatchedMetadataRecord(exchangeBook, metadataRecords);
    if (match.kind !== 'matched') {
      conflicts.push({
        kind: match.kind === 'missing' ? 'missing-local-book' : 'ambiguous-local-book',
        bookTitle: exchangeBook.title,
        bookAuthor: exchangeBook.author,
        bookFormat: exchangeBook.format,
        detail: match.detail
      });
      continue;
    }

    const metadataRecord = match.record;
    const currentBook = toPersistedLibraryBook(
      metadataRecord,
      readingStateById.get(metadataRecord.payload.id) ?? null
    );
    const importedReadingState = createKoReaderReadingStateSyncRecord(currentBook, {
      bookHash: exchangeBook.koreader.bookHash,
      metaHash: exchangeBook.koreader.metaHash,
      ...exchangeBook.koreader.config
    });
    const importedAnnotations = createKoReaderAnnotationSyncRecords(
      currentBook.filePath,
      exchangeBook.koreader.annotations
    );

    const currentReadingState = readingStateById.get(metadataRecord.payload.id) ?? null;
    const currentBookmarks = bookmarksByKey.get(currentBook.filePath) ?? null;
    const currentNotes = notesByKey.get(currentBook.filePath) ?? null;
    const currentUpdatedAt = Math.max(
      currentReadingState?.updatedAt ?? 0,
      currentBookmarks?.updatedAt ?? 0,
      currentNotes?.updatedAt ?? 0
    );
    const importedUpdatedAt = getImportedBookUpdatedAt(exchangeBook);
    const payloadDiffers =
      stringifyComparable(currentReadingState?.payload) !==
        stringifyComparable(importedReadingState.payload) ||
      stringifyComparable(currentBookmarks?.payload) !==
        stringifyComparable(importedAnnotations.bookmarksRecord.payload) ||
      stringifyComparable(currentNotes?.payload) !==
        stringifyComparable(importedAnnotations.notesRecord.payload);

    if (payloadDiffers && currentUpdatedAt > importedUpdatedAt) {
      conflicts.push({
        kind: 'local-newer',
        bookTitle: currentBook.title,
        bookAuthor: currentBook.author,
        bookFormat: currentBook.format,
        detail: '当前本地阅读状态比导入文件更新，已跳过以避免覆盖较新的本地记录。'
      });
      continue;
    }

    replaceRecord(importedReadingState.id, importedReadingState);
    replaceRecord(importedAnnotations.bookmarksRecord.id, importedAnnotations.bookmarksRecord);
    replaceRecord(importedAnnotations.notesRecord.id, importedAnnotations.notesRecord);
    appliedBookCount += 1;
  }

  return {
    snapshot: {
      ...currentSnapshot,
      exportedAt: Math.max(currentSnapshot.exportedAt, document.exportedAt),
      records: nextRecords
    },
    appliedBookCount,
    skippedBookCount: document.books.length - appliedBookCount,
    conflicts
  };
};

export const saveKoReaderSyncExchangeDialog = async (
  document: Br1KoReaderSyncExchangeDocument
): Promise<KoReaderSyncExchangeExportDialogResult> => {
  requireTauriKoReaderSyncRuntime('saveKoReaderSyncExchangeDialog');
  return invokeTauri<KoReaderSyncExchangeExportDialogResult>('save_koreader_sync_exchange_dialog', {
    document
  });
};

export const loadKoReaderSyncExchangeDialog = async (): Promise<KoReaderSyncExchangeImportDialogResult> => {
  requireTauriKoReaderSyncRuntime('loadKoReaderSyncExchangeDialog');
  return invokeTauri<KoReaderSyncExchangeImportDialogResult>('load_koreader_sync_exchange_dialog');
};

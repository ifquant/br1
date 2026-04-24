import {
  createKoReaderAnnotationSyncRecords,
  createKoReaderReadingStateSyncRecord,
  createReadingStateSyncRecord,
  deriveKoReaderBookIdentity,
  normalizeKoReaderProgressValue,
  parseKoReaderPageProgress,
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
export const BR1_KOREADER_REMOTE_PROGRESS_SCHEMA_VERSION = 1;

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

export type Br1KoReaderRemoteProgressEntry = {
  schemaVersion: typeof BR1_KOREADER_REMOTE_PROGRESS_SCHEMA_VERSION;
  bookId: string;
  filePath: string;
  sourcePath: string | null;
  title: string;
  author: string;
  format: string;
  document: string;
  progress: string;
  percentage: number | null;
  timestamp: number;
  device: string | null;
  deviceId: string | null;
};

export type Br1KoReaderRemoteSyncOperation = 'push' | 'pull';

export type Br1KoReaderRemoteSyncStatus =
  | 'success'
  | 'missing-config'
  | 'auth-failure'
  | 'offline'
  | 'retryable-failure'
  | 'empty';

export type Br1KoReaderRemoteSyncRequest = {
  operation: Br1KoReaderRemoteSyncOperation;
  entries: Br1KoReaderRemoteProgressEntry[];
};

export type Br1KoReaderRemoteSyncResult = {
  operation: Br1KoReaderRemoteSyncOperation;
  status: Br1KoReaderRemoteSyncStatus;
  message: string;
  retryable: boolean;
  pushedCount: number;
  pulledCount: number;
  skippedCount: number;
  entries: Br1KoReaderRemoteProgressEntry[];
};

export type KoReaderRemoteSyncConflictKind = 'ambiguous-local-book' | 'local-newer';

export type KoReaderRemoteSyncConflict = {
  kind: KoReaderRemoteSyncConflictKind;
  bookTitle: string;
  bookAuthor: string;
  bookFormat: string;
  detail: string;
};

export type KoReaderRemoteSyncPullPlan = {
  snapshot: Br1SyncSnapshot;
  appliedBookCount: number;
  skippedBookCount: number;
  conflicts: KoReaderRemoteSyncConflict[];
};

const requireTauriKoReaderSyncRuntime = (action: string) => {
  if (!isTauriDesktop()) {
    throw new Error(`${action} requires the Tauri desktop runtime`);
  }
};

const stringifyComparable = (value: unknown) => JSON.stringify(value ?? null);

const toPercent = (value: number | null | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Number((value * 100).toFixed(2))));
};

const KO_READER_XPOINTER_PREFIX = '/body/DocFragment[';
const EPUB_CFI_PREFIX = 'epubcfi(';
const PLAIN_TEXT_PROGRESS_PREFIX = 'txt:';

const isKoReaderLocator = (value: string | null | undefined) => {
  const normalized = value?.trim() ?? '';
  return normalized.startsWith(KO_READER_XPOINTER_PREFIX) || normalized.startsWith(EPUB_CFI_PREFIX);
};

const toKoReaderRemoteProgressValue = (book: PersistedLibraryBook) => {
  const koreaderLocation = book.koreaderProgressLocation?.trim() ?? '';
  if (koreaderLocation && isKoReaderLocator(koreaderLocation)) {
    return koreaderLocation;
  }

  const location = book.progressLocation?.trim() ?? '';
  if (isKoReaderLocator(location)) {
    return location;
  }

  if (location.startsWith(PLAIN_TEXT_PROGRESS_PREFIX)) {
    return '';
  }

  const normalizedLabel = normalizeKoReaderProgressValue(book.progress);
  const parsedPageProgress = parseKoReaderPageProgress(normalizedLabel);
  if (parsedPageProgress) {
    return normalizedLabel;
  }

  if (/^\d+$/.test(normalizedLabel)) {
    return normalizedLabel;
  }

  return '';
};

const toKoReaderRemoteReadingStateBook = (
  book: PersistedLibraryBook,
  remoteEntry: Br1KoReaderRemoteProgressEntry
): PersistedLibraryBook => {
  const remoteProgress = remoteEntry.progress.trim();
  const hasLocator = isKoReaderLocator(remoteProgress);
  const parsedPageProgress = parseKoReaderPageProgress(remoteProgress);
  const progressFraction =
    typeof remoteEntry.percentage === 'number' && Number.isFinite(remoteEntry.percentage)
      ? Math.max(0, Math.min(1, remoteEntry.percentage / 100))
      : parsedPageProgress && parsedPageProgress.total > 0
        ? parsedPageProgress.current / parsedPageProgress.total
        : book.progressFraction ?? null;

  const progressLabel =
    typeof remoteEntry.percentage === 'number' && Number.isFinite(remoteEntry.percentage)
      ? `${Math.max(0, Math.round(remoteEntry.percentage))}%`
      : parsedPageProgress
        ? `[${parsedPageProgress.current},${parsedPageProgress.total}]`
        : remoteProgress || book.progress;

  return {
    ...book,
    progress: progressLabel,
    progressFraction,
    progressLocation: hasLocator ? remoteProgress : book.progressLocation ?? null,
    koreaderProgressLocation: hasLocator ? remoteProgress : book.koreaderProgressLocation ?? null,
    lastOpenedAt: remoteEntry.timestamp
  };
};

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
  koreaderProgressLocation: readingStateRecord?.payload.koreaderProgressLocation ?? null,
  lastOpenedAt: readingStateRecord?.payload.lastOpenedAt ?? null
});

export const createKoReaderRemoteProgressEntriesFromSnapshot = (
  snapshot: Br1SyncSnapshot
): Br1KoReaderRemoteProgressEntry[] => {
  const metadataRecords = [...getMetadataRecordMap(snapshot).values()];
  const readingStateById = getReadingStateRecordMap(snapshot);

  return metadataRecords.flatMap((metadataRecord) => {
    const readingStateRecord = readingStateById.get(metadataRecord.payload.id);
    if (!readingStateRecord) {
      return [];
    }

    const book = toPersistedLibraryBook(metadataRecord, readingStateRecord);
    const identity = deriveKoReaderBookIdentity(book);
    const progress = toKoReaderRemoteProgressValue(book);
    const timestamp =
      readingStateRecord.payload.lastOpenedAt ?? readingStateRecord.updatedAt ?? snapshot.exportedAt;

    if (!progress || !timestamp) {
      return [];
    }

    return [
      {
        schemaVersion: BR1_KOREADER_REMOTE_PROGRESS_SCHEMA_VERSION,
        bookId: book.id,
        filePath: book.filePath,
        sourcePath: book.sourcePath ?? null,
        title: book.title,
        author: book.author,
        format: book.format,
        document: identity.bookHash,
        progress,
        percentage: toPercent(readingStateRecord.payload.progressFraction),
        timestamp,
        device: null,
        deviceId: null
      }
    ];
  });
};

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

export const mergeKoReaderRemoteProgressIntoSnapshot = (
  currentSnapshot: Br1SyncSnapshot,
  remoteEntries: Br1KoReaderRemoteProgressEntry[]
): KoReaderRemoteSyncPullPlan => {
  const nextRecords = [...currentSnapshot.records];
  const metadataRecords = [...getMetadataRecordMap(currentSnapshot).values()];
  const metadataByDocument = new Map<string, LibraryBookMetadataSyncRecord[]>();
  const readingStateById = getReadingStateRecordMap(currentSnapshot);
  const conflicts: KoReaderRemoteSyncConflict[] = [];
  let appliedBookCount = 0;

  for (const metadataRecord of metadataRecords) {
    const identity = deriveKoReaderBookIdentity(metadataRecord.payload);
    const entries = metadataByDocument.get(identity.bookHash) ?? [];
    entries.push(metadataRecord);
    metadataByDocument.set(identity.bookHash, entries);
  }

  const replaceRecord = (recordId: string, replacement: unknown & { id: string }) => {
    const index = nextRecords.findIndex((record) => record.id === recordId);
    if (index >= 0) {
      nextRecords[index] = replacement as (typeof nextRecords)[number];
      return;
    }
    nextRecords.push(replacement as (typeof nextRecords)[number]);
  };

  for (const remoteEntry of remoteEntries) {
    const matchedRecords = metadataByDocument.get(remoteEntry.document) ?? [];
    if (matchedRecords.length !== 1) {
      conflicts.push({
        kind: 'ambiguous-local-book',
        bookTitle: remoteEntry.title,
        bookAuthor: remoteEntry.author,
        bookFormat: remoteEntry.format,
        detail:
          matchedRecords.length === 0
            ? '当前本地书库里没有可安全回填的匹配图书。'
            : `当前本地书库里有 ${matchedRecords.length} 本图书共享同一个 KOReader 文档哈希，无法安全决定要覆盖哪一本。`
      });
      continue;
    }

    const metadataRecord = matchedRecords[0];
    const currentReadingState = readingStateById.get(metadataRecord.payload.id) ?? null;
    const currentUpdatedAt =
      currentReadingState?.payload.lastOpenedAt ?? currentReadingState?.updatedAt ?? 0;
    if (currentUpdatedAt > remoteEntry.timestamp) {
      conflicts.push({
        kind: 'local-newer',
        bookTitle: metadataRecord.payload.title,
        bookAuthor: metadataRecord.payload.author,
        bookFormat: metadataRecord.payload.format,
        detail: '本地阅读进度比 KOReader 服务端更新，已跳过覆盖。'
      });
      continue;
    }

    const replacement = createKoReaderReadingStateSyncRecord(
      toPersistedLibraryBook(metadataRecord, currentReadingState),
      {
        ...deriveKoReaderBookIdentity(metadataRecord.payload),
        progress: remoteEntry.progress,
        xpointer: isKoReaderLocator(remoteEntry.progress)
          ? remoteEntry.progress
          : currentReadingState?.payload.progressLocation ?? '',
        updatedAt: remoteEntry.timestamp
      }
    );
    const normalizedReplacement = createReadingStateSyncRecord(
      toKoReaderRemoteReadingStateBook(
        {
          ...toPersistedLibraryBook(metadataRecord, currentReadingState),
          progressLocation:
            replacement.payload.progressLocation ??
            currentReadingState?.payload.progressLocation ??
            null
        },
        remoteEntry
      )
    );
    replaceRecord(normalizedReplacement.id, normalizedReplacement);
    appliedBookCount += 1;
  }

  return {
    snapshot: {
      ...currentSnapshot,
      records: nextRecords
    },
    appliedBookCount,
    skippedBookCount: remoteEntries.length - appliedBookCount,
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

export const runKoReaderRemoteSync = async (
  request: Br1KoReaderRemoteSyncRequest
): Promise<Br1KoReaderRemoteSyncResult> => {
  requireTauriKoReaderSyncRuntime('runKoReaderRemoteSync');
  return invokeTauri<Br1KoReaderRemoteSyncResult>('run_koreader_remote_sync', {
    request
  });
};

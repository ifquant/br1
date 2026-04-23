import { READER_SETTINGS_STORAGE_KEY, normalizeReaderSettings } from '../reader/settings.js';
import type { PersistedLibraryBook } from '../services/libraryPersistence.js';
import type {
  ReaderBookmark,
  ReaderHighlightsWorkspaceState,
  ReaderNote,
  ReaderSettings
} from '../reader/types.js';
import {
  BR1_SYNC_SCHEMA_VERSION,
  type Br1SyncRecord,
  type Br1SyncSnapshot,
  type LibraryBookMetadataSyncPayload,
  type LibraryBookMetadataSyncRecord,
  type ReaderBookmarksSyncPayload,
  type ReaderBookmarksSyncRecord,
  type ReaderHighlightsWorkspaceSyncPayload,
  type ReaderHighlightsWorkspaceSyncRecord,
  type ReaderNotesSyncPayload,
  type ReaderNotesSyncRecord,
  type ReaderSettingsSyncPayload,
  type ReaderSettingsSyncRecord,
  type ReadingStateSyncPayload,
  type ReadingStateSyncRecord
} from './types.js';

type SyncTimestampOptions = {
  fallbackUpdatedAt?: number;
};

const normalizeOptionalString = (value: string | null | undefined) => {
  if (typeof value !== 'string') return null;
  return value;
};

const normalizeStringArray = (value: string[] | null | undefined) =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const hashSyncKey = (value: string) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const buildScopedRecordId = (kind: Br1SyncRecord['kind'], scope: string) => `${kind}:${hashSyncKey(scope)}`;

const resolveUpdatedAt = (values: Array<number | null | undefined>, fallbackUpdatedAt = 0) => {
  const nextUpdatedAt = values.reduce<number>(
    (maxValue, value) => (typeof value === 'number' && Number.isFinite(value) ? Math.max(maxValue, value) : maxValue),
    0
  );
  return nextUpdatedAt > 0 ? nextUpdatedAt : fallbackUpdatedAt;
};

export const normalizeLibraryBookMetadataSyncPayload = (
  payload: LibraryBookMetadataSyncPayload
): LibraryBookMetadataSyncPayload => ({
  id: payload.id,
  title: payload.title,
  author: payload.author,
  format: payload.format,
  description: normalizeOptionalString(payload.description),
  language: normalizeOptionalString(payload.language),
  publisher: normalizeOptionalString(payload.publisher),
  collection: normalizeOptionalString(payload.collection),
  tags: normalizeStringArray(payload.tags),
  filePath: payload.filePath,
  coverPath: normalizeOptionalString(payload.coverPath),
  sourcePath: normalizeOptionalString(payload.sourcePath),
  importedAt: payload.importedAt,
  libraryFileExists:
    typeof payload.libraryFileExists === 'boolean' ? payload.libraryFileExists : null,
  sourceFileExists:
    typeof payload.sourceFileExists === 'boolean' ? payload.sourceFileExists : null
});

export const normalizeReadingStateSyncPayload = (
  payload: ReadingStateSyncPayload
): ReadingStateSyncPayload => ({
  id: payload.id,
  filePath: payload.filePath,
  progress: payload.progress,
  status: payload.status,
  progressFraction:
    typeof payload.progressFraction === 'number' && Number.isFinite(payload.progressFraction)
      ? payload.progressFraction
      : null,
  progressLocation: normalizeOptionalString(payload.progressLocation),
  lastOpenedAt: typeof payload.lastOpenedAt === 'number' ? payload.lastOpenedAt : null
});

export const normalizeReaderBookmarksSyncPayload = (
  payload: ReaderBookmarksSyncPayload
): ReaderBookmarksSyncPayload => ({
  bookKey: payload.bookKey,
  bookmarks: Array.isArray(payload.bookmarks) ? payload.bookmarks.map((bookmark) => ({ ...bookmark })) : []
});

export const normalizeReaderNotesSyncPayload = (
  payload: ReaderNotesSyncPayload
): ReaderNotesSyncPayload => ({
  bookKey: payload.bookKey,
  notes: Array.isArray(payload.notes)
    ? payload.notes.map((note) => ({
        ...note,
        kind: note.kind === 'highlight' ? 'highlight' : 'note'
      }))
    : []
});

const normalizeSavedSelections = (state: ReaderHighlightsWorkspaceState) =>
  Array.isArray(state.savedSelections)
    ? state.savedSelections.map((selection) => ({
        ...selection,
        selectedIds: Array.isArray(selection.selectedIds)
          ? selection.selectedIds.filter((id): id is string => typeof id === 'string')
          : [],
        importSource: selection.importSource
          ? {
              ...selection.importSource,
              highlights: Array.isArray(selection.importSource.highlights)
                ? selection.importSource.highlights.map((highlight) => ({ ...highlight }))
                : []
            }
          : undefined
      }))
    : [];

export const normalizeReaderHighlightsWorkspaceSyncPayload = (
  payload: ReaderHighlightsWorkspaceSyncPayload
): ReaderHighlightsWorkspaceSyncPayload => ({
  bookKey: payload.bookKey,
  state: {
    filter: payload.state.filter,
    sort: payload.state.sort,
    savedSelectionsSort: payload.state.savedSelectionsSort,
    savedSelectionsRefreshFilter: payload.state.savedSelectionsRefreshFilter,
    selectedIds: Array.isArray(payload.state.selectedIds)
      ? payload.state.selectedIds.filter((id): id is string => typeof id === 'string')
      : [],
    savedSelections: normalizeSavedSelections(payload.state)
  }
});

export const normalizeReaderSettingsSyncPayload = (
  payload: ReaderSettingsSyncPayload
): ReaderSettingsSyncPayload => ({
  storageKey: payload.storageKey || READER_SETTINGS_STORAGE_KEY,
  settings: normalizeReaderSettings(payload.settings)
});

export const createLibraryBookMetadataSyncRecord = (
  book: PersistedLibraryBook,
  options: SyncTimestampOptions = {}
): LibraryBookMetadataSyncRecord => {
  const payload = normalizeLibraryBookMetadataSyncPayload({
    id: book.id,
    title: book.title,
    author: book.author,
    format: book.format,
    description: book.description ?? null,
    language: book.language ?? null,
    publisher: book.publisher ?? null,
    collection: book.collection ?? null,
    tags: book.tags ?? [],
    filePath: book.filePath,
    coverPath: book.coverPath ?? null,
    sourcePath: book.sourcePath ?? null,
    importedAt: book.importedAt,
    libraryFileExists: book.libraryFileExists ?? null,
    sourceFileExists: book.sourceFileExists ?? null
  });

  return {
    schemaVersion: BR1_SYNC_SCHEMA_VERSION,
    kind: 'library-book',
    id: `library-book:${book.id}`,
    updatedAt: resolveUpdatedAt([book.importedAt], options.fallbackUpdatedAt),
    scope: {
      bookId: book.id
    },
    payload
  };
};

export const createReadingStateSyncRecord = (
  book: PersistedLibraryBook,
  options: SyncTimestampOptions = {}
): ReadingStateSyncRecord => {
  const payload = normalizeReadingStateSyncPayload({
    id: book.id,
    filePath: book.filePath,
    progress: book.progress,
    status: book.status,
    progressFraction: book.progressFraction ?? null,
    progressLocation: book.progressLocation ?? null,
    lastOpenedAt: book.lastOpenedAt ?? null
  });

  return {
    schemaVersion: BR1_SYNC_SCHEMA_VERSION,
    kind: 'reading-state',
    id: `reading-state:${book.id}`,
    updatedAt: resolveUpdatedAt([book.lastOpenedAt, book.importedAt], options.fallbackUpdatedAt),
    scope: {
      bookId: book.id,
      filePath: book.filePath
    },
    payload
  };
};

export const createReaderBookmarksSyncRecord = (
  bookKey: string,
  bookmarks: ReaderBookmark[],
  options: SyncTimestampOptions = {}
): ReaderBookmarksSyncRecord => {
  const payload = normalizeReaderBookmarksSyncPayload({
    bookKey,
    bookmarks
  });

  return {
    schemaVersion: BR1_SYNC_SCHEMA_VERSION,
    kind: 'bookmarks',
    id: buildScopedRecordId('bookmarks', bookKey),
    updatedAt: resolveUpdatedAt(
      payload.bookmarks.map((bookmark) => bookmark.createdAt),
      options.fallbackUpdatedAt
    ),
    scope: {
      bookKey
    },
    payload
  };
};

export const createReaderNotesSyncRecord = (
  bookKey: string,
  notes: ReaderNote[],
  options: SyncTimestampOptions = {}
): ReaderNotesSyncRecord => {
  const payload = normalizeReaderNotesSyncPayload({
    bookKey,
    notes
  });

  return {
    schemaVersion: BR1_SYNC_SCHEMA_VERSION,
    kind: 'notes',
    id: buildScopedRecordId('notes', bookKey),
    updatedAt: resolveUpdatedAt(
      payload.notes.map((note) => note.createdAt),
      options.fallbackUpdatedAt
    ),
    scope: {
      bookKey
    },
    payload
  };
};

export const createReaderHighlightsWorkspaceSyncRecord = (
  bookKey: string,
  state: ReaderHighlightsWorkspaceState,
  options: SyncTimestampOptions = {}
): ReaderHighlightsWorkspaceSyncRecord => {
  const payload = normalizeReaderHighlightsWorkspaceSyncPayload({
    bookKey,
    state
  });
  const savedSelectionUpdatedAts = payload.state.savedSelections.flatMap((selection) => [
    selection.createdAt,
    selection.importSource?.importedAt
  ]);

  return {
    schemaVersion: BR1_SYNC_SCHEMA_VERSION,
    kind: 'highlights-workspace',
    id: buildScopedRecordId('highlights-workspace', bookKey),
    updatedAt: resolveUpdatedAt(savedSelectionUpdatedAts, options.fallbackUpdatedAt),
    scope: {
      bookKey
    },
    payload
  };
};

export const createReaderSettingsSyncRecord = (
  settings: ReaderSettings,
  options: SyncTimestampOptions & { storageKey?: string } = {}
): ReaderSettingsSyncRecord => {
  const storageKey = options.storageKey || READER_SETTINGS_STORAGE_KEY;
  const payload = normalizeReaderSettingsSyncPayload({
    storageKey,
    settings
  });

  return {
    schemaVersion: BR1_SYNC_SCHEMA_VERSION,
    kind: 'reader-settings',
    id: buildScopedRecordId('reader-settings', storageKey),
    updatedAt: resolveUpdatedAt([], options.fallbackUpdatedAt),
    scope: {
      storageKey
    },
    payload
  };
};

export const createLibrarySyncSubstrateRecords = (
  books: PersistedLibraryBook[],
  options: SyncTimestampOptions = {}
) =>
  books.flatMap((book) => [
    createLibraryBookMetadataSyncRecord(book, options),
    createReadingStateSyncRecord(book, options)
  ]);

export const createBr1SyncSnapshot = (
  records: Br1SyncRecord[],
  exportedAt: number
): Br1SyncSnapshot => ({
  schemaVersion: BR1_SYNC_SCHEMA_VERSION,
  exportedAt,
  records: [...records]
});

export const restorePersistedLibraryBookFromSync = (
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

export const restoreReaderBookmarksFromSync = (record: ReaderBookmarksSyncRecord): ReaderBookmark[] =>
  record.payload.bookmarks.map((bookmark) => ({ ...bookmark }));

export const restoreReaderNotesFromSync = (record: ReaderNotesSyncRecord): ReaderNote[] =>
  record.payload.notes.map((note) => ({ ...note }));

export const restoreReaderHighlightsWorkspaceStateFromSync = (
  record: ReaderHighlightsWorkspaceSyncRecord
): ReaderHighlightsWorkspaceState => ({
  ...record.payload.state,
  selectedIds: [...record.payload.state.selectedIds],
  savedSelections: normalizeSavedSelections(record.payload.state)
});

export const restoreReaderSettingsFromSync = (record: ReaderSettingsSyncRecord): ReaderSettings =>
  normalizeReaderSettings(record.payload.settings);

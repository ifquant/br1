import type { PersistedLibraryBook } from '../services/libraryPersistence.js';
import type {
  ReaderBookmark,
  ReaderHighlightsWorkspaceState,
  ReaderNote,
  ReaderSettings
} from '../reader/types.js';

export const BR1_SYNC_SCHEMA_VERSION = 1;

export type Br1SyncRecordKind =
  | 'library-book'
  | 'reading-state'
  | 'bookmarks'
  | 'notes'
  | 'highlights-workspace'
  | 'reader-settings';

export type Br1SyncRecordEnvelope<
  Kind extends Br1SyncRecordKind,
  Payload,
  Scope extends Record<string, unknown> | undefined = undefined
> = {
  schemaVersion: typeof BR1_SYNC_SCHEMA_VERSION;
  kind: Kind;
  id: string;
  updatedAt: number;
  scope?: Scope;
  payload: Payload;
};

export type LibraryBookMetadataSyncPayload = Pick<
  PersistedLibraryBook,
  | 'id'
  | 'title'
  | 'author'
  | 'format'
  | 'description'
  | 'language'
  | 'publisher'
  | 'collection'
  | 'tags'
  | 'filePath'
  | 'coverPath'
  | 'sourcePath'
  | 'importedAt'
  | 'libraryFileExists'
  | 'sourceFileExists'
>;

export type ReadingStateSyncPayload = Pick<
  PersistedLibraryBook,
  | 'id'
  | 'filePath'
  | 'progress'
  | 'status'
  | 'progressFraction'
  | 'progressLocation'
  | 'lastOpenedAt'
>;

export type ReaderBookmarksSyncPayload = {
  bookKey: string;
  bookmarks: ReaderBookmark[];
};

export type ReaderNotesSyncPayload = {
  bookKey: string;
  notes: ReaderNote[];
};

export type ReaderHighlightsWorkspaceSyncPayload = {
  bookKey: string;
  state: ReaderHighlightsWorkspaceState;
};

export type ReaderSettingsSyncPayload = {
  storageKey: string;
  settings: ReaderSettings;
};

export type LibraryBookMetadataSyncRecord = Br1SyncRecordEnvelope<
  'library-book',
  LibraryBookMetadataSyncPayload,
  { bookId: string }
>;

export type ReadingStateSyncRecord = Br1SyncRecordEnvelope<
  'reading-state',
  ReadingStateSyncPayload,
  { bookId: string; filePath: string }
>;

export type ReaderBookmarksSyncRecord = Br1SyncRecordEnvelope<
  'bookmarks',
  ReaderBookmarksSyncPayload,
  { bookKey: string }
>;

export type ReaderNotesSyncRecord = Br1SyncRecordEnvelope<'notes', ReaderNotesSyncPayload, { bookKey: string }>;

export type ReaderHighlightsWorkspaceSyncRecord = Br1SyncRecordEnvelope<
  'highlights-workspace',
  ReaderHighlightsWorkspaceSyncPayload,
  { bookKey: string }
>;

export type ReaderSettingsSyncRecord = Br1SyncRecordEnvelope<
  'reader-settings',
  ReaderSettingsSyncPayload,
  { storageKey: string }
>;

export type Br1SyncRecord =
  | LibraryBookMetadataSyncRecord
  | ReadingStateSyncRecord
  | ReaderBookmarksSyncRecord
  | ReaderNotesSyncRecord
  | ReaderHighlightsWorkspaceSyncRecord
  | ReaderSettingsSyncRecord;

export type Br1SyncSnapshot = {
  schemaVersion: typeof BR1_SYNC_SCHEMA_VERSION;
  exportedAt: number;
  records: Br1SyncRecord[];
};

export type Br1SyncConflictReason =
  | 'missing-local-record'
  | 'missing-incoming-record'
  | 'updated-at-diverged'
  | 'payload-diverged';

export type Br1SyncConflict = {
  kind: Br1SyncRecordKind;
  recordId: string;
  reason: Br1SyncConflictReason;
  local: Br1SyncRecord | null;
  incoming: Br1SyncRecord | null;
};

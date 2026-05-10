// Boundary: this barrel exposes pure sync-model helpers to the rest of the app.
// Keep it limited to deterministic record shaping and interpretation so UI and
// desktop layers can share the same sync contract safely.

export {
  createBr1SyncSnapshot,
  createLibraryBookMetadataSyncRecord,
  createLibrarySyncSubstrateRecords,
  createReaderBookmarksSyncRecord,
  createReaderHighlightsWorkspaceSyncRecord,
  createReaderNotesSyncRecord,
  createReaderSettingsSyncRecord,
  createReadingStateSyncRecord,
  normalizeLibraryBookMetadataSyncPayload,
  normalizeReaderBookmarksSyncPayload,
  normalizeReaderHighlightsWorkspaceSyncPayload,
  normalizeReaderNotesSyncPayload,
  normalizeReaderSettingsSyncPayload,
  normalizeReadingStateSyncPayload,
  restorePersistedLibraryBookFromSync,
  restoreReaderBookmarksFromSync,
  restoreReaderHighlightsWorkspaceStateFromSync,
  restoreReaderNotesFromSync,
  restoreReaderSettingsFromSync
} from './model.js';
export {
  BR1_SYNC_SCHEMA_VERSION,
  type Br1SyncConflict,
  type Br1SyncConflictReason,
  type Br1SyncRecord,
  type Br1SyncRecordEnvelope,
  type Br1SyncRecordKind,
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
export {
  remoteSyncResultIsConflict,
  remoteSyncResultNeedsRetry
} from './remote.js';
export {
  createKoReaderAnnotationSyncRecords,
  createKoReaderReadingStateSyncRecord,
  deriveKoReaderBookIdentity,
  normalizeKoReaderProgressValue,
  parseKoReaderPageProgress,
  restoreKoReaderAnnotationsFromSync,
  restoreKoReaderBookConfigFromSync
} from './koreader.js';
export type {
  Br1RemoteSyncOperation,
  Br1RemoteSyncProvider,
  Br1RemoteSyncRequest,
  Br1RemoteSyncResult,
  Br1RemoteSyncStatus
} from './remote.js';
export type {
  KoReaderAnnotation,
  KoReaderAnnotationStyle,
  KoReaderBookConfig,
  KoReaderBookIdentity,
  KoReaderProgressValue
} from './koreader.js';

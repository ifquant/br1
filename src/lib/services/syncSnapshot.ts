// Boundary: this module is the frontend-facing seam to local snapshot export
// and restore. Keep renderer-safe record assembly and restore planning here,
// while file dialogs and durable writes stay desktop-owned.

import {
  READER_SETTINGS_STORAGE_KEY,
  saveReaderSettings,
  type ReaderBookmark,
  type ReaderHighlightsWorkspaceState,
  type ReaderNote,
  type ReaderSettings
} from '$lib/reader';
import {
  createBr1SyncSnapshot,
  createLibrarySyncSubstrateRecords,
  createReaderBookmarksSyncRecord,
  createReaderHighlightsWorkspaceSyncRecord,
  createReaderNotesSyncRecord,
  createReaderSettingsSyncRecord,
  restorePersistedLibraryBookFromSync,
  restoreReaderBookmarksFromSync,
  restoreReaderHighlightsWorkspaceStateFromSync,
  restoreReaderNotesFromSync,
  restoreReaderSettingsFromSync,
  type Br1SyncRecord,
  type Br1SyncSnapshot,
  type LibraryBookMetadataSyncRecord,
  type ReaderBookmarksSyncRecord,
  type ReaderHighlightsWorkspaceSyncRecord,
  type ReaderNotesSyncRecord,
  type ReaderSettingsSyncRecord,
  type ReadingStateSyncRecord
} from '$lib/sync';
import type { PersistedLibraryBook } from './libraryPersistence';
import { invokeTauri, isTauriDesktop } from './platform';

export type SyncSnapshotBookmarkState = {
  bookKey: string;
  bookmarks: ReaderBookmark[];
};

export type SyncSnapshotNoteState = {
  bookKey: string;
  notes: ReaderNote[];
};

export type SyncSnapshotHighlightsWorkspaceRecord = {
  bookKey: string;
  state: ReaderHighlightsWorkspaceState;
};

export type SyncSnapshotApplyRequest = {
  libraryBooks: PersistedLibraryBook[];
  bookmarks: SyncSnapshotBookmarkState[];
  notes: SyncSnapshotNoteState[];
  highlightsWorkspace: SyncSnapshotHighlightsWorkspaceRecord[];
  readerSettings?: ReaderSettingsSyncRecord | null;
};

export type SyncSnapshotApplyResult = {
  libraryBookCount: number;
  bookmarkBookCount: number;
  noteBookCount: number;
  highlightsWorkspaceBookCount: number;
  restoredReaderSettings: boolean;
};

export type SyncSnapshotExportDialogResult = {
  cancelled: boolean;
  fileName: string | null;
  recordCount: number;
};

export type SyncSnapshotImportDialogResult = {
  cancelled: boolean;
  fileName: string | null;
  recordCount: number;
  snapshot: Br1SyncSnapshot | null;
};

export type RestoreSyncSnapshotDialogResult = {
  cancelled: boolean;
  fileName: string | null;
  recordCount: number;
  applyResult: SyncSnapshotApplyResult | null;
  readerSettingsRecord: ReaderSettingsSyncRecord | null;
};

const requireTauriSyncSnapshotRuntime = (action: string) => {
  // Refactor risk: snapshot dialogs are privileged because they cross into
  // filesystem access. Keep this module focused on snapshot composition only.
  if (!isTauriDesktop()) {
    throw new Error(`${action} requires the Tauri desktop runtime`);
  }
};

export const createLocalSyncSnapshot = ({
  libraryBooks,
  bookmarkStates,
  noteStates,
  highlightsWorkspaceStates,
  readerSettings,
  exportedAt = Date.now()
}: {
  libraryBooks: PersistedLibraryBook[];
  bookmarkStates: SyncSnapshotBookmarkState[];
  noteStates: SyncSnapshotNoteState[];
  highlightsWorkspaceStates: SyncSnapshotHighlightsWorkspaceRecord[];
  readerSettings?: ReaderSettings | null;
  exportedAt?: number;
}): Br1SyncSnapshot => {
  // Snapshot assembly order is deliberate: library substrate first, then
  // per-book overlays, then singleton reader settings for deterministic restore.
  const records: Br1SyncRecord[] = [
    ...createLibrarySyncSubstrateRecords(libraryBooks, {
      fallbackUpdatedAt: exportedAt
    }),
    ...bookmarkStates.map(({ bookKey, bookmarks }) =>
      createReaderBookmarksSyncRecord(bookKey, bookmarks, { fallbackUpdatedAt: exportedAt })
    ),
    ...noteStates.map(({ bookKey, notes }) =>
      createReaderNotesSyncRecord(bookKey, notes, { fallbackUpdatedAt: exportedAt })
    ),
    ...highlightsWorkspaceStates.map(({ bookKey, state }) =>
      createReaderHighlightsWorkspaceSyncRecord(bookKey, state, {
        fallbackUpdatedAt: exportedAt
      })
    )
  ];

  if (readerSettings) {
    records.push(
      createReaderSettingsSyncRecord(readerSettings, {
        storageKey: READER_SETTINGS_STORAGE_KEY,
        fallbackUpdatedAt: exportedAt
      })
    );
  }

  return createBr1SyncSnapshot(records, exportedAt);
};

const getBookIdFromMetadataRecord = (record: LibraryBookMetadataSyncRecord) =>
  record.scope?.bookId || record.payload.id;

const getBookIdFromReadingStateRecord = (record: ReadingStateSyncRecord) =>
  record.scope?.bookId || record.payload.id;

export const prepareSyncSnapshotRestore = (snapshot: Br1SyncSnapshot) => {
  const metadataRecords: LibraryBookMetadataSyncRecord[] = [];
  const metadataByBookId = new Map<string, LibraryBookMetadataSyncRecord>();
  const readingStateByBookId = new Map<string, ReadingStateSyncRecord>();
  const bookmarkStates: SyncSnapshotBookmarkState[] = [];
  const noteStates: SyncSnapshotNoteState[] = [];
  const highlightsWorkspaceStates: SyncSnapshotHighlightsWorkspaceRecord[] = [];
  let readerSettingsRecord: ReaderSettingsSyncRecord | null = null;

  // Test setup is explicit in companion coverage because restore bugs usually
  // come from classifying record kinds or replaying them in the wrong order.
  for (const record of snapshot.records) {
    switch (record.kind) {
      case 'library-book': {
        const typedRecord = record as LibraryBookMetadataSyncRecord;
        metadataRecords.push(typedRecord);
        metadataByBookId.set(getBookIdFromMetadataRecord(typedRecord), typedRecord);
        break;
      }
      case 'reading-state': {
        const typedRecord = record as ReadingStateSyncRecord;
        readingStateByBookId.set(getBookIdFromReadingStateRecord(typedRecord), typedRecord);
        break;
      }
      case 'bookmarks':
        bookmarkStates.push({
          bookKey: (record as ReaderBookmarksSyncRecord).payload.bookKey,
          bookmarks: restoreReaderBookmarksFromSync(record as ReaderBookmarksSyncRecord)
        });
        break;
      case 'notes':
        noteStates.push({
          bookKey: (record as ReaderNotesSyncRecord).payload.bookKey,
          notes: restoreReaderNotesFromSync(record as ReaderNotesSyncRecord)
        });
        break;
      case 'highlights-workspace':
        highlightsWorkspaceStates.push({
          bookKey: (record as ReaderHighlightsWorkspaceSyncRecord).payload.bookKey,
          state: restoreReaderHighlightsWorkspaceStateFromSync(
            record as ReaderHighlightsWorkspaceSyncRecord
          )
        });
        break;
      case 'reader-settings':
        if (readerSettingsRecord) {
          throw new Error('Snapshot contains more than one reader settings record.');
        }
        readerSettingsRecord = record as ReaderSettingsSyncRecord;
        break;
      default:
        throw new Error(`Snapshot contains an unsupported record kind: ${(record as { kind: string }).kind}`);
    }
  }

  for (const bookId of readingStateByBookId.keys()) {
    if (!metadataByBookId.has(bookId)) {
      throw new Error(`Snapshot reading state for ${bookId} is missing its library metadata record.`);
    }
  }

  return {
    request: {
      libraryBooks: metadataRecords.map((metadataRecord) =>
        restorePersistedLibraryBookFromSync(
          metadataRecord,
          readingStateByBookId.get(getBookIdFromMetadataRecord(metadataRecord)) ?? null
        )
      ),
      bookmarks: bookmarkStates,
      notes: noteStates,
      highlightsWorkspace: highlightsWorkspaceStates,
      readerSettings: readerSettingsRecord
    },
    readerSettings: readerSettingsRecord ? restoreReaderSettingsFromSync(readerSettingsRecord) : null
  };
};

export const persistImportedReaderSettings = (
  storage: Storage | undefined,
  settings: ReaderSettings | null
) => {
  if (!storage || !settings) return false;
  saveReaderSettings(storage, settings);
  return true;
};

export const saveSyncSnapshotDialog = async (
  snapshot: Br1SyncSnapshot
): Promise<SyncSnapshotExportDialogResult> => {
  requireTauriSyncSnapshotRuntime('saveSyncSnapshotDialog');
  return invokeTauri<SyncSnapshotExportDialogResult>('save_sync_snapshot_dialog', {
    snapshot
  });
};

export const loadSyncSnapshotDialog = async (): Promise<SyncSnapshotImportDialogResult> => {
  requireTauriSyncSnapshotRuntime('loadSyncSnapshotDialog');
  return invokeTauri<SyncSnapshotImportDialogResult>('load_sync_snapshot_dialog');
};

export const restoreSyncSnapshotDialog = async (): Promise<RestoreSyncSnapshotDialogResult> => {
  requireTauriSyncSnapshotRuntime('restoreSyncSnapshotDialog');
  return invokeTauri<RestoreSyncSnapshotDialogResult>('restore_sync_snapshot_dialog');
};

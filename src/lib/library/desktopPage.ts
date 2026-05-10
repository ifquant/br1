// Ownership: this library module is the desktop page coordinator for the library route.
// It wires page state bindings to privileged desktop services, but it should not absorb
// rendering code that belongs in Svelte components or pure projection helpers.
import {
  createLibraryNotice,
  runLibraryNoticeAction as runSharedLibraryNoticeAction
} from './controller';
import { buildDesktopCatalogProjection, sortRecordsForLibraryShelf } from './desktopCatalog';
import {
  importDesktopLibraryBooks,
  loadDesktopLibrarySurface,
  migrateDesktopReadestLibrary
} from './desktopIngress';
import {
  bulkRepairDesktopLibraryBooks,
  removeLibraryBookFromDesktop,
  repairDesktopLibraryBook,
  restoreRemovedLibraryRecord as restoreRemovedLibraryRecordFromDesktop,
  updateDesktopLibraryBookMetadata
} from './desktopMaintenance';
import {
  getRecoveryQueuePersistedRecords,
  isPersistedRecordManualRepairOnly,
  lookupPersistedRecordForBook
} from './desktopRecords';
import type {
  LibraryBookMetadataUpdate,
  LibraryNoticeState,
  LibraryShelfBook
} from './types';
import type {
  Br1KoReaderRemoteSyncRequest,
  Br1KoReaderRemoteSyncResult,
  Br1KoReaderSyncExchangeDocument,
  Br1RemoteSyncRequest,
  Br1RemoteSyncResult,
  KoReaderSyncExchangeExportDialogResult,
  LibraryImportActionResult,
  LibraryReaderTarget,
  PersistedLibraryBook,
  ReadestLibrarySummary,
  RestoreKoReaderSyncExchangeDialogResult,
  RestoreSyncSnapshotDialogResult,
  SyncSnapshotApplyResult,
  SyncSnapshotExportDialogResult,
  SyncSnapshotImportDialogResult
} from '$lib/services';

type SetLibraryNoticeState = (notice: LibraryNoticeState | null) => void;

export type DesktopLibraryPageCoordinatorOptions = {
  // Boundary: every callback here crosses from route/controller state into desktop-only
  // services or page bindings, so keep the seam explicit instead of hiding it in components.
  getLibraryNoticeState: () => LibraryNoticeState | null;
  setLibraryNoticeState: SetLibraryNoticeState;
  setPersistedLibraryRecords: (records: PersistedLibraryBook[]) => void;
  setReadestCompatibleCount: (count: number) => void;
  setReadestImportableCount: (count: number) => void;
  setReadestMissingFileCount: (count: number) => void;
  setImportedBooks: (books: LibraryShelfBook[]) => void;
  canPersistLibrary: () => boolean;
  getPersistedLibraryRecords: () => PersistedLibraryBook[];
  getBulkRepairBusy: () => boolean;
  setBulkRepairBusy: (busy: boolean) => void;
  setBulkRepairSummary: (summary: string) => void;
  getBulkRepairEligibleQueueBooks: () => LibraryShelfBook[];
  getMigrationBusy: () => boolean;
  setMigrationBusy: (busy: boolean) => void;
  getSyncSnapshotBusy: () => boolean;
  setSyncSnapshotBusy: (busy: boolean) => void;
  getRemoteSyncBusy: () => boolean;
  setRemoteSyncBusy: (busy: boolean) => void;
  setDesktopLibraryMode: (value: boolean) => void;
  setReadestLibraryCount: (count: number) => void;
  setShowReadestMigration: (value: boolean) => void;
  getImportInput: () => HTMLInputElement | null;
  toAssetReaderTarget: (url: string, label?: string) => LibraryReaderTarget;
  openReaderTarget: (target: string | LibraryReaderTarget) => Promise<boolean>;
  openLibraryBookPath: (filePath: string) => Promise<void>;
  importBooksFromDesktopPicker: () => Promise<LibraryImportActionResult>;
  loadPersistedLibraryBooks: () => Promise<PersistedLibraryBook[]>;
  loadReaderBookmarks: (bookKey: string) => Promise<any[]>;
  loadReaderNotes: (bookKey: string) => Promise<any[]>;
  loadReaderHighlightsWorkspaceState: (bookKey: string) => Promise<any | null>;
  readReaderSettings: () => any | null;
  createLocalSyncSnapshot: (args: {
    libraryBooks: PersistedLibraryBook[];
    bookmarkStates: Array<{ bookKey: string; bookmarks: any[] }>;
    noteStates: Array<{ bookKey: string; notes: any[] }>;
    highlightsWorkspaceStates: Array<{ bookKey: string; state: any }>;
    readerSettings?: any | null;
    exportedAt?: number;
  }) => any;
  saveSyncSnapshotDialog: (snapshot: any) => Promise<SyncSnapshotExportDialogResult>;
  loadSyncSnapshotDialog: () => Promise<SyncSnapshotImportDialogResult>;
  restoreSyncSnapshotDialog: () => Promise<RestoreSyncSnapshotDialogResult>;
  createKoReaderSyncExchangeFromSnapshot: (snapshot: any) => Br1KoReaderSyncExchangeDocument;
  saveKoReaderSyncExchangeDialog: (
    document: Br1KoReaderSyncExchangeDocument
  ) => Promise<KoReaderSyncExchangeExportDialogResult>;
  restoreKoReaderSyncExchangeDialog: () => Promise<RestoreKoReaderSyncExchangeDialogResult>;
  runKoReaderRemoteSync: (
    request: Br1KoReaderRemoteSyncRequest
  ) => Promise<Br1KoReaderRemoteSyncResult>;
  runRemoteSync: (request: Br1RemoteSyncRequest) => Promise<Br1RemoteSyncResult>;
  persistImportedReaderSettings: (
    storage: Storage | undefined,
    settings: any | null
  ) => boolean;
  getStorage: () => Storage | undefined;
  detectReadestLibrary: () => Promise<ReadestLibrarySummary>;
  importBooksFromReadest: () => Promise<LibraryImportActionResult>;
  importLibraryBooks: (filePaths: string[]) => Promise<PersistedLibraryBook[]>;
  previewLibraryRepairCandidate: (args: {
    filePath: string;
    recordId: string;
  }) => Promise<{
    filePath: string;
    fileName: string;
    format: string;
    title: string;
    author: string;
    formatMatches: boolean;
    titleMatches: boolean;
    authorMatches: boolean;
    sourcePathMatches: boolean;
    sourceHashMatches: boolean;
    fileExists: boolean;
  }>;
  selectSingleSystemBookPath: () => Promise<string | null>;
  removeLibraryBook: (filePath: string) => Promise<PersistedLibraryBook[]>;
  restoreRemovedLibraryBook: (recordId: string) => Promise<PersistedLibraryBook[]>;
  updateLibraryBookMetadata: (args: {
    recordId: string;
    title: string;
    author: string;
    description?: string;
    language?: string;
    publisher?: string;
    collection?: string;
    tags?: string[];
  }) => Promise<PersistedLibraryBook[]>;
  confirmReplacement: (message: string) => boolean;
  confirmRemoval: (message: string) => boolean;
  createObjectUrl: (file: File) => string;
  setImportInputValue: (value: string) => void;
};

export type DesktopLibraryPageCoordinatorStateBindings = Pick<
  DesktopLibraryPageCoordinatorOptions,
  | 'getLibraryNoticeState'
  | 'setLibraryNoticeState'
  | 'setPersistedLibraryRecords'
  | 'setReadestCompatibleCount'
  | 'setReadestImportableCount'
  | 'setReadestMissingFileCount'
  | 'setImportedBooks'
  | 'getPersistedLibraryRecords'
  | 'getBulkRepairBusy'
  | 'setBulkRepairBusy'
  | 'setBulkRepairSummary'
  | 'getBulkRepairEligibleQueueBooks'
  | 'getMigrationBusy'
  | 'setMigrationBusy'
  | 'getSyncSnapshotBusy'
  | 'setSyncSnapshotBusy'
  | 'getRemoteSyncBusy'
  | 'setRemoteSyncBusy'
  | 'setDesktopLibraryMode'
  | 'setReadestLibraryCount'
  | 'setShowReadestMigration'
  | 'getImportInput'
  | 'setImportInputValue'
>;

export type DesktopLibraryPageCoordinatorEnvironment = Omit<
  DesktopLibraryPageCoordinatorOptions,
  keyof DesktopLibraryPageCoordinatorStateBindings
>;

export const buildDesktopLibraryPageCoordinatorStateBindings = (
  bindings: DesktopLibraryPageCoordinatorStateBindings
) => bindings;

export const buildDesktopLibraryPageCoordinatorStateBindingsFromPageState = ({
  libraryNotice,
  setLibraryNotice,
  persistedLibraryRecords,
  setPersistedLibraryRecords,
  setReadestCompatibleCount,
  setReadestImportableCount,
  setReadestMissingFileCount,
  setImportedBooks,
  bulkRepairBusy,
  setBulkRepairBusy,
  setBulkRepairSummary,
  bulkRepairEligibleQueueBooks,
  migrationBusy,
  setMigrationBusy,
  syncSnapshotBusy,
  setSyncSnapshotBusy,
  remoteSyncBusy,
  setRemoteSyncBusy,
  setDesktopLibraryMode,
  setReadestLibraryCount,
  setShowReadestMigration,
  getImportInput,
  setImportInputValue
}: {
  libraryNotice: LibraryNoticeState | null;
  setLibraryNotice: SetLibraryNoticeState;
  persistedLibraryRecords: PersistedLibraryBook[];
  setPersistedLibraryRecords: (records: PersistedLibraryBook[]) => void;
  setReadestCompatibleCount: (count: number) => void;
  setReadestImportableCount: (count: number) => void;
  setReadestMissingFileCount: (count: number) => void;
  setImportedBooks: (books: LibraryShelfBook[]) => void;
  bulkRepairBusy: boolean;
  setBulkRepairBusy: (busy: boolean) => void;
  setBulkRepairSummary: (summary: string) => void;
  bulkRepairEligibleQueueBooks: LibraryShelfBook[];
  migrationBusy: boolean;
  setMigrationBusy: (busy: boolean) => void;
  syncSnapshotBusy: boolean;
  setSyncSnapshotBusy: (busy: boolean) => void;
  remoteSyncBusy: boolean;
  setRemoteSyncBusy: (busy: boolean) => void;
  setDesktopLibraryMode: (value: boolean) => void;
  setReadestLibraryCount: (count: number) => void;
  setShowReadestMigration: (value: boolean) => void;
  getImportInput: () => HTMLInputElement | null;
  setImportInputValue: (value: string) => void;
}): DesktopLibraryPageCoordinatorStateBindings => ({
  getLibraryNoticeState: () => libraryNotice,
  setLibraryNoticeState: setLibraryNotice,
  setPersistedLibraryRecords,
  setReadestCompatibleCount,
  setReadestImportableCount,
  setReadestMissingFileCount,
  setImportedBooks,
  getPersistedLibraryRecords: () => persistedLibraryRecords,
  getBulkRepairBusy: () => bulkRepairBusy,
  setBulkRepairBusy,
  setBulkRepairSummary,
  getBulkRepairEligibleQueueBooks: () => bulkRepairEligibleQueueBooks,
  getMigrationBusy: () => migrationBusy,
  setMigrationBusy,
  getSyncSnapshotBusy: () => syncSnapshotBusy,
  setSyncSnapshotBusy,
  getRemoteSyncBusy: () => remoteSyncBusy,
  setRemoteSyncBusy,
  setDesktopLibraryMode,
  setReadestLibraryCount,
  setShowReadestMigration,
  getImportInput,
  setImportInputValue
});

export const buildDesktopLibraryPageCoordinatorEnvironmentFromPageEnv = ({
  canPersistLibrary,
  toAssetReaderTarget,
  openReaderTarget,
  openLibraryBookPath,
  importBooksFromDesktopPicker,
  loadPersistedLibraryBooks,
  loadReaderBookmarks,
  loadReaderNotes,
  loadReaderHighlightsWorkspaceState,
  readReaderSettings,
  createLocalSyncSnapshot,
  saveSyncSnapshotDialog,
  loadSyncSnapshotDialog,
  restoreSyncSnapshotDialog,
  createKoReaderSyncExchangeFromSnapshot,
  saveKoReaderSyncExchangeDialog,
  restoreKoReaderSyncExchangeDialog,
  runKoReaderRemoteSync,
  runRemoteSync,
  persistImportedReaderSettings,
  getStorage,
  detectReadestLibrary,
  importBooksFromReadest,
  importLibraryBooks,
  previewLibraryRepairCandidate,
  selectSingleSystemBookPath,
  removeLibraryBook,
  restoreRemovedLibraryBook,
  updateLibraryBookMetadata,
  confirmReplacement,
  confirmRemoval,
  createObjectUrl
}: {
  canPersistLibrary: () => boolean;
  toAssetReaderTarget: (url: string, label?: string) => LibraryReaderTarget;
  openReaderTarget: (target: string | LibraryReaderTarget) => Promise<boolean>;
  openLibraryBookPath: (filePath: string) => Promise<void>;
  importBooksFromDesktopPicker: () => Promise<LibraryImportActionResult>;
  loadPersistedLibraryBooks: () => Promise<PersistedLibraryBook[]>;
  loadReaderBookmarks: DesktopLibraryPageCoordinatorEnvironment['loadReaderBookmarks'];
  loadReaderNotes: DesktopLibraryPageCoordinatorEnvironment['loadReaderNotes'];
  loadReaderHighlightsWorkspaceState: DesktopLibraryPageCoordinatorEnvironment['loadReaderHighlightsWorkspaceState'];
  readReaderSettings: DesktopLibraryPageCoordinatorEnvironment['readReaderSettings'];
  createLocalSyncSnapshot: DesktopLibraryPageCoordinatorEnvironment['createLocalSyncSnapshot'];
  saveSyncSnapshotDialog: DesktopLibraryPageCoordinatorEnvironment['saveSyncSnapshotDialog'];
  loadSyncSnapshotDialog: DesktopLibraryPageCoordinatorEnvironment['loadSyncSnapshotDialog'];
  restoreSyncSnapshotDialog: DesktopLibraryPageCoordinatorEnvironment['restoreSyncSnapshotDialog'];
  createKoReaderSyncExchangeFromSnapshot: DesktopLibraryPageCoordinatorEnvironment['createKoReaderSyncExchangeFromSnapshot'];
  saveKoReaderSyncExchangeDialog: DesktopLibraryPageCoordinatorEnvironment['saveKoReaderSyncExchangeDialog'];
  restoreKoReaderSyncExchangeDialog: DesktopLibraryPageCoordinatorEnvironment['restoreKoReaderSyncExchangeDialog'];
  runKoReaderRemoteSync: DesktopLibraryPageCoordinatorEnvironment['runKoReaderRemoteSync'];
  runRemoteSync: DesktopLibraryPageCoordinatorEnvironment['runRemoteSync'];
  persistImportedReaderSettings: DesktopLibraryPageCoordinatorEnvironment['persistImportedReaderSettings'];
  getStorage: () => Storage | undefined;
  detectReadestLibrary: () => Promise<ReadestLibrarySummary>;
  importBooksFromReadest: () => Promise<LibraryImportActionResult>;
  importLibraryBooks: (filePaths: string[]) => Promise<PersistedLibraryBook[]>;
  previewLibraryRepairCandidate: DesktopLibraryPageCoordinatorEnvironment['previewLibraryRepairCandidate'];
  selectSingleSystemBookPath: () => Promise<string | null>;
  removeLibraryBook: (filePath: string) => Promise<PersistedLibraryBook[]>;
  restoreRemovedLibraryBook: (recordId: string) => Promise<PersistedLibraryBook[]>;
  updateLibraryBookMetadata: DesktopLibraryPageCoordinatorEnvironment['updateLibraryBookMetadata'];
  confirmReplacement: (message: string) => boolean;
  confirmRemoval: (message: string) => boolean;
  createObjectUrl: (file: File) => string;
}): DesktopLibraryPageCoordinatorEnvironment => ({
  canPersistLibrary,
  toAssetReaderTarget,
  openReaderTarget,
  openLibraryBookPath,
  importBooksFromDesktopPicker,
  loadPersistedLibraryBooks,
  loadReaderBookmarks,
  loadReaderNotes,
  loadReaderHighlightsWorkspaceState,
  readReaderSettings,
  createLocalSyncSnapshot,
  saveSyncSnapshotDialog,
  loadSyncSnapshotDialog,
  restoreSyncSnapshotDialog,
  createKoReaderSyncExchangeFromSnapshot,
  saveKoReaderSyncExchangeDialog,
  restoreKoReaderSyncExchangeDialog,
  runKoReaderRemoteSync,
  runRemoteSync,
  persistImportedReaderSettings,
  getStorage,
  detectReadestLibrary,
  importBooksFromReadest,
  importLibraryBooks,
  previewLibraryRepairCandidate,
  selectSingleSystemBookPath,
  removeLibraryBook,
  restoreRemovedLibraryBook,
  updateLibraryBookMetadata,
  confirmReplacement,
  confirmRemoval,
  createObjectUrl
});

export const buildDesktopLibraryPageCoordinatorFromPageStateAndEnv = ({
  state,
  env
}: {
  state: Parameters<typeof buildDesktopLibraryPageCoordinatorStateBindingsFromPageState>[0];
  env: Parameters<typeof buildDesktopLibraryPageCoordinatorEnvironmentFromPageEnv>[0];
}) =>
  buildDesktopLibraryPageCoordinatorFromBindings({
    state: buildDesktopLibraryPageCoordinatorStateBindingsFromPageState(state),
    env: buildDesktopLibraryPageCoordinatorEnvironmentFromPageEnv(env)
  });

export const buildDesktopLibraryPageCoordinator = (options: DesktopLibraryPageCoordinatorOptions) => {
  const clearLibraryNotice = () => {
    options.setLibraryNoticeState(null);
  };

  const setLibraryNotice = (
    kind: 'error' | 'info',
    message: string,
    action?: { label: string; run: () => void | Promise<void> }
  ) => {
    options.setLibraryNoticeState(createLibraryNotice(kind, message, action));
  };

  const runLibraryNoticeAction = () => {
    runSharedLibraryNoticeAction(options.getLibraryNoticeState());
  };

  const applyPersistedLibraryRecords = async (records: PersistedLibraryBook[]) => {
    options.setPersistedLibraryRecords(records);
    const projection = await buildDesktopCatalogProjection(records);
    options.setReadestCompatibleCount(projection.readestCompatibleCount);
    options.setImportedBooks(projection.importedBooks);
  };

  const handleOpenReaderTarget = async (target: string | LibraryReaderTarget) => {
    clearLibraryNotice();
    const href = typeof target === 'string' ? target : target.href;
    const opened = await options.openReaderTarget(target);
    if (!opened && typeof window !== 'undefined') {
      window.location.href = href;
    }
  };

  const loadLibrary = async () => {
    if (!options.canPersistLibrary()) return;
    await loadDesktopLibrarySurface({
      detectReadestLibrary: options.detectReadestLibrary,
      loadPersistedLibraryBooks: options.loadPersistedLibraryBooks,
      applyPersistedLibraryRecords,
      triggerReadestMigration,
      setDesktopLibraryMode: options.setDesktopLibraryMode,
      setReadestLibraryCount: options.setReadestLibraryCount,
      setReadestImportableCount: options.setReadestImportableCount,
      setReadestMissingFileCount: options.setReadestMissingFileCount,
      setShowReadestMigration: options.setShowReadestMigration
    });
  };

  const handleOpenSourcePath = async (filePath: string) => {
    try {
      clearLibraryNotice();
      await options.openLibraryBookPath(filePath);
    } catch (error) {
      console.error('Failed to open the original book path', error);
      setLibraryNotice('error', '无法打开原文件，请确认当前运行在桌面环境且文件路径仍然有效。');
    }
  };

  const triggerImportPicker = async () => {
    if (options.canPersistLibrary()) {
      await importDesktopLibraryBooks({
        clearLibraryNotice,
        setLibraryNotice,
        importBooksFromDesktopPicker: options.importBooksFromDesktopPicker,
        reloadLibrary: loadLibrary,
        setShowReadestMigration: options.setShowReadestMigration,
        onOpenReaderTarget: handleOpenReaderTarget
      });
      return;
    }

    const importInput = options.getImportInput();
    if (!importInput) return;
    if (typeof importInput.showPicker === 'function') {
      try {
        await importInput.showPicker();
        return;
      } catch (error) {
        console.warn('showPicker() failed in library import flow, falling back to click()', error);
      }
    }
    importInput.click();
  };

  const handleImportChange = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const [file] = input.files ?? [];
    if (!file) return;

    clearLibraryNotice();
    const objectUrl = options.createObjectUrl(file);
    await handleOpenReaderTarget(options.toAssetReaderTarget(objectUrl, file.name));

    options.setImportInputValue('');
  };

  async function triggerReadestMigration({
    autoOpenFirstBook = true,
    reloadAfterImport = true
  }: {
    autoOpenFirstBook?: boolean;
    reloadAfterImport?: boolean;
  } = {}) {
    if (!options.canPersistLibrary()) return;

    if (options.getMigrationBusy()) return;

    if (options.getSyncSnapshotBusy() || options.getRemoteSyncBusy()) {
      setLibraryNotice(
        'info',
        '当前还有快照导入导出或远端同步进行中，请等待这些桌面操作完成后再开始 Readest 迁移。'
      );
      return;
    }

    await migrateDesktopReadestLibrary({
      migrationBusy: options.getMigrationBusy(),
      setMigrationBusy: options.setMigrationBusy,
      clearLibraryNotice,
      setLibraryNotice,
      importBooksFromReadest: options.importBooksFromReadest,
      reloadLibrary: loadLibrary,
      loadPersistedLibraryBooks: options.loadPersistedLibraryBooks,
      applyPersistedLibraryRecords,
      setShowReadestMigration: options.setShowReadestMigration,
      onOpenReaderTarget: handleOpenReaderTarget,
      autoOpenFirstBook,
      reloadAfterImport
    });
  }

  const handleReadestMigrationClick = () => {
    void triggerReadestMigration();
  };

  const reloadLibraryAfterRepair = async () => {
    const currentRecords = await options.loadPersistedLibraryBooks();
    await applyPersistedLibraryRecords(currentRecords);
  };

  const restoreRemovedLibraryRecord = async (record: PersistedLibraryBook) => {
    await restoreRemovedLibraryRecordFromDesktop({
      record,
      clearLibraryNotice,
      setLibraryNotice,
      restoreRemovedLibraryBook: options.restoreRemovedLibraryBook,
      applyPersistedLibraryRecords
    });
  };

  const handleRemoveLibraryBook = async (book: LibraryShelfBook) => {
    if (!options.canPersistLibrary()) return;

    await removeLibraryBookFromDesktop({
      book,
      persistedRecord: lookupPersistedRecordForBook(options.getPersistedLibraryRecords(), book),
      clearLibraryNotice,
      setLibraryNotice,
      confirmRemoval: options.confirmRemoval,
      removeLibraryBook: options.removeLibraryBook,
      applyPersistedLibraryRecords,
      onRestoreRemovedRecord: restoreRemovedLibraryRecord
    });
  };

  const handleUpdateLibraryBookMetadata = async (
    book: LibraryShelfBook,
    metadata: LibraryBookMetadataUpdate
  ) => {
    if (!options.canPersistLibrary()) return;

    await updateDesktopLibraryBookMetadata({
      book,
      persistedRecord: lookupPersistedRecordForBook(options.getPersistedLibraryRecords(), book),
      metadata,
      clearLibraryNotice,
      setLibraryNotice,
      updateLibraryBookMetadata: options.updateLibraryBookMetadata,
      applyPersistedLibraryRecords
    });
  };

  const handleRepairLibraryBook = async (book: LibraryShelfBook) => {
    if (!options.canPersistLibrary()) return;

    await repairDesktopLibraryBook({
      book,
      persistedRecord: lookupPersistedRecordForBook(options.getPersistedLibraryRecords(), book),
      clearLibraryNotice,
      setLibraryNotice,
      importLibraryBooks: options.importLibraryBooks,
      selectSingleSystemBookPath: options.selectSingleSystemBookPath,
      previewLibraryRepairCandidate: options.previewLibraryRepairCandidate,
      confirmReplacement: options.confirmReplacement,
      reloadLibraryAfterRepair
    });
  };

  const handleBulkRepairLibraryBooks = async () => {
    if (!options.canPersistLibrary() || options.getBulkRepairBusy()) return;

    const eligibleRecords = options
      .getBulkRepairEligibleQueueBooks()
      .map((book) => lookupPersistedRecordForBook(options.getPersistedLibraryRecords(), book))
      .filter((record): record is PersistedLibraryBook => !!record && !!record.sourcePath);

    await bulkRepairDesktopLibraryBooks({
      eligibleRecords,
      bulkRepairBusy: options.getBulkRepairBusy(),
      setBulkRepairBusy: options.setBulkRepairBusy,
      setBulkRepairSummary: options.setBulkRepairSummary,
      clearLibraryNotice,
      setLibraryNotice,
      importLibraryBooks: options.importLibraryBooks,
      loadPersistedLibraryBooks: options.loadPersistedLibraryBooks,
      applyPersistedLibraryRecords,
      getManualRepairCount: (records) =>
        getRecoveryQueuePersistedRecords(records, sortRecordsForLibraryShelf).filter(
          isPersistedRecordManualRepairOnly
        ).length
    });
  };

  const buildCurrentSyncSnapshot = async () => {
    const libraryBooks = await options.loadPersistedLibraryBooks();
    const bookmarkStates = await Promise.all(
      libraryBooks.map(async (book) => ({
        bookKey: book.filePath,
        bookmarks: await options.loadReaderBookmarks(book.filePath)
      }))
    );
    const noteStates = await Promise.all(
      libraryBooks.map(async (book) => ({
        bookKey: book.filePath,
        notes: await options.loadReaderNotes(book.filePath)
      }))
    );
    const highlightsWorkspaceStates = (
      await Promise.all(
        libraryBooks.map(async (book) => ({
          bookKey: book.filePath,
          state: await options.loadReaderHighlightsWorkspaceState(book.filePath)
        }))
      )
    ).flatMap((entry) => (entry.state ? [{ bookKey: entry.bookKey, state: entry.state }] : []));

    return options.createLocalSyncSnapshot({
      libraryBooks,
      bookmarkStates,
      noteStates,
      highlightsWorkspaceStates,
      readerSettings: options.readReaderSettings()
    });
  };

  const handleExportSyncSnapshot = async () => {
    if (
      !options.canPersistLibrary() ||
      options.getMigrationBusy() ||
      options.getSyncSnapshotBusy() ||
      options.getRemoteSyncBusy()
    ) {
      return;
    }

    options.setSyncSnapshotBusy(true);
    clearLibraryNotice();
    try {
      const snapshot = await buildCurrentSyncSnapshot();
      const result = await options.saveSyncSnapshotDialog(snapshot);

      if (result.cancelled) {
        setLibraryNotice('info', '已取消本地快照导出。');
        return;
      }

      setLibraryNotice(
        'info',
        `已导出本地快照${result.fileName ? `：${result.fileName}` : ''}，共 ${result.recordCount} 条记录。`
      );
    } catch (error) {
      console.error('Failed to export local sync snapshot', error);
      setLibraryNotice('error', '导出本地快照失败，请确认桌面权限和书库数据后重试。');
    } finally {
      options.setSyncSnapshotBusy(false);
    }
  };

  const handleImportSyncSnapshot = async () => {
    if (
      !options.canPersistLibrary() ||
      options.getMigrationBusy() ||
      options.getSyncSnapshotBusy() ||
      options.getRemoteSyncBusy()
    ) {
      return;
    }

    options.setSyncSnapshotBusy(true);
    clearLibraryNotice();
    try {
      const imported = await options.restoreSyncSnapshotDialog();
      if (imported.cancelled || !imported.applyResult) {
        setLibraryNotice('info', '已取消本地快照恢复。');
        return;
      }

      const restoredReaderSettings = options.persistImportedReaderSettings(
        options.getStorage(),
        (imported.readerSettingsRecord as { payload?: { settings?: any } } | null)?.payload?.settings ?? null
      );
      await loadLibrary();

      setLibraryNotice(
        'info',
        `已恢复本地快照${imported.fileName ? `：${imported.fileName}` : ''}。书库 ${imported.applyResult.libraryBookCount} 本，书签 ${imported.applyResult.bookmarkBookCount} 本，笔记 ${imported.applyResult.noteBookCount} 本，高亮工作区 ${imported.applyResult.highlightsWorkspaceBookCount} 本${restoredReaderSettings ? '，阅读设置已更新。' : '。'}`
      );
    } catch (error) {
      console.error('Failed to import local sync snapshot', error);
      const detail = error instanceof Error ? error.message : '请检查快照文件是否完整有效。';
      setLibraryNotice('error', `恢复本地快照失败：${detail}`);
    } finally {
      options.setSyncSnapshotBusy(false);
    }
  };

  const formatKoReaderConflictSummary = (result: {
    conflicts: Array<{ kind: 'missing-local-book' | 'ambiguous-local-book' | 'local-newer' }>;
  }) => {
    if (result.conflicts.length === 0) {
      return '';
    }

    const missingCount = result.conflicts.filter((conflict) => conflict.kind === 'missing-local-book').length;
    const ambiguousCount = result.conflicts.filter(
      (conflict) => conflict.kind === 'ambiguous-local-book'
    ).length;
    const localNewerCount = result.conflicts.filter((conflict) => conflict.kind === 'local-newer').length;
    const detailParts = [
      missingCount > 0 ? `未匹配 ${missingCount} 本` : null,
      ambiguousCount > 0 ? `歧义 ${ambiguousCount} 本` : null,
      localNewerCount > 0 ? `本地更新 ${localNewerCount} 本` : null
    ].filter((value): value is string => Boolean(value));
    return detailParts.length > 0 ? `（${detailParts.join('，')}）` : '';
  };

  const handleExportKoReaderSync = async () => {
    if (
      !options.canPersistLibrary() ||
      options.getMigrationBusy() ||
      options.getSyncSnapshotBusy() ||
      options.getRemoteSyncBusy()
    ) {
      return;
    }

    options.setSyncSnapshotBusy(true);
    clearLibraryNotice();
    try {
      const snapshot = await buildCurrentSyncSnapshot();
      const document = options.createKoReaderSyncExchangeFromSnapshot(snapshot);
      const result = await options.saveKoReaderSyncExchangeDialog(document);

      if (result.cancelled) {
        setLibraryNotice('info', '已取消 KOReader 交换文件导出。');
        return;
      }

      setLibraryNotice(
        'info',
        `已导出 KOReader 交换文件${result.fileName ? `：${result.fileName}` : ''}，共 ${result.bookCount} 本。`
      );
    } catch (error) {
      console.error('Failed to export the KOReader sync exchange', error);
      setLibraryNotice('error', '导出 KOReader 交换文件失败，请确认桌面权限和书库数据后重试。');
    } finally {
      options.setSyncSnapshotBusy(false);
    }
  };

  const handleImportKoReaderSync = async () => {
    if (
      !options.canPersistLibrary() ||
      options.getMigrationBusy() ||
      options.getSyncSnapshotBusy() ||
      options.getRemoteSyncBusy()
    ) {
      return;
    }

    options.setSyncSnapshotBusy(true);
    clearLibraryNotice();
    try {
      const imported = await options.restoreKoReaderSyncExchangeDialog();
      if (imported.cancelled) {
        setLibraryNotice('info', '已取消 KOReader 交换文件导入。');
        return;
      }

      if (!imported.applyResult) {
        setLibraryNotice(
          'error',
          `KOReader 交换文件恢复未返回应用结果${imported.fileName ? `：${imported.fileName}` : ''}。为保持 Tauri-owned 导入边界，renderer 不会自行改动本地书库。`
        );
        return;
      }

      if (imported.applyResult.appliedBookCount <= 0) {
        setLibraryNotice(
          'error',
          `KOReader 导入没有应用任何图书${formatKoReaderConflictSummary(imported.applyResult)}。`
        );
        return;
      }

      await loadLibrary();
      setLibraryNotice(
        'info',
        `已导入 KOReader 交换文件${imported.fileName ? `：${imported.fileName}` : ''}，应用 ${imported.applyResult.appliedBookCount} 本，跳过 ${imported.applyResult.skippedBookCount} 本${formatKoReaderConflictSummary(imported.applyResult)}。`
      );
    } catch (error) {
      console.error('Failed to import the KOReader sync exchange', error);
      const detail = error instanceof Error ? error.message : '请检查交换文件是否完整有效。';
      setLibraryNotice('error', `导入 KOReader 交换文件失败：${detail}`);
    } finally {
      options.setSyncSnapshotBusy(false);
    }
  };

  const handlePushKoReaderRemoteSync = async () => {
    if (
      !options.canPersistLibrary() ||
      options.getMigrationBusy() ||
      options.getSyncSnapshotBusy() ||
      options.getRemoteSyncBusy()
    ) {
      return;
    }

    options.setRemoteSyncBusy(true);
    clearLibraryNotice();
    try {
      const result = await options.runKoReaderRemoteSync({
        operation: 'push'
      });

      if (result.status === 'success' || result.status === 'empty') {
        setLibraryNotice('info', `${result.message} 书签和批注不会通过官方 KOSync 远端同步。`);
        return;
      }

      if (result.status === 'offline' || result.status === 'retryable-failure') {
        setLibraryNotice('error', result.message, {
          label: '重试',
          run: handlePushKoReaderRemoteSync
        });
        return;
      }

      setLibraryNotice('error', result.message);
    } catch (error) {
      console.error('Failed to push KOReader remote progress', error);
      setLibraryNotice('error', '推送 KOReader 阅读进度失败，请稍后重试。官方 KOSync 不包含批注同步。', {
        label: '重试',
        run: handlePushKoReaderRemoteSync
      });
    } finally {
      options.setRemoteSyncBusy(false);
    }
  };

  const handlePullKoReaderRemoteSync = async () => {
    if (
      !options.canPersistLibrary() ||
      options.getMigrationBusy() ||
      options.getSyncSnapshotBusy() ||
      options.getRemoteSyncBusy()
    ) {
      return;
    }

    options.setRemoteSyncBusy(true);
    clearLibraryNotice();
    try {
      const result = await options.runKoReaderRemoteSync({
        operation: 'pull'
      });

      if (result.status === 'success') {
        await loadLibrary();
        setLibraryNotice('info', `${result.message} 书签和批注不会通过官方 KOSync 回填。`);
        return;
      }

      if (result.status === 'empty') {
        setLibraryNotice('info', result.message);
        return;
      }

      if (result.status === 'offline' || result.status === 'retryable-failure') {
        setLibraryNotice('error', result.message, {
          label: '重试',
          run: handlePullKoReaderRemoteSync
        });
        return;
      }

      setLibraryNotice('error', result.message);
    } catch (error) {
      console.error('Failed to pull KOReader remote progress', error);
      setLibraryNotice('error', '拉取 KOReader 阅读进度失败，请稍后重试。官方 KOSync 不包含批注同步。', {
        label: '重试',
        run: handlePullKoReaderRemoteSync
      });
    } finally {
      options.setRemoteSyncBusy(false);
    }
  };

  const applyPulledRemoteSnapshot = async (result: Br1RemoteSyncResult) => {
    if (!result.applyResult) {
      setLibraryNotice('info', result.message);
      return;
    }
    const restoredReaderSettings = options.persistImportedReaderSettings(
      options.getStorage(),
      (result.readerSettingsRecord as { payload?: { settings?: any } } | null)?.payload?.settings ?? null
    );
    await loadLibrary();

    setLibraryNotice(
      'info',
      `${result.message} 书库 ${result.applyResult.libraryBookCount} 本，书签 ${result.applyResult.bookmarkBookCount} 本，笔记 ${result.applyResult.noteBookCount} 本，高亮工作区 ${result.applyResult.highlightsWorkspaceBookCount} 本${restoredReaderSettings ? '，阅读设置已更新。' : '。'}`
    );
  };

  const handleRemoteSyncResult = ({
    result,
    retry,
    conflictFallback
  }: {
    result: Br1RemoteSyncResult;
    retry: () => void | Promise<void>;
    conflictFallback?: (() => void | Promise<void>) | null;
  }) => {
    if (result.status === 'success') {
      return;
    }

    if (result.status === 'empty') {
      setLibraryNotice('info', result.message);
      return;
    }

    if (result.status === 'conflict') {
      setLibraryNotice(
        'error',
        result.message,
        conflictFallback
          ? {
              label: '改为拉取云端',
              run: conflictFallback
            }
          : undefined
      );
      return;
    }

    if (result.status === 'offline' || result.retryable) {
      setLibraryNotice('error', result.message, {
        label: '重试',
        run: retry
      });
      return;
    }

    setLibraryNotice('error', result.message);
  };

  const handlePushRemoteSync = async () => {
    if (
      !options.canPersistLibrary() ||
      options.getMigrationBusy() ||
      options.getSyncSnapshotBusy() ||
      options.getRemoteSyncBusy()
    ) {
      return;
    }

    options.setRemoteSyncBusy(true);
    clearLibraryNotice();
    try {
      const result = await options.runRemoteSync({
        provider: 'readestCloud',
        operation: 'push'
      });

      if (result.status === 'success') {
        setLibraryNotice('info', result.message);
        return;
      }

      handleRemoteSyncResult({
        result,
        retry: handlePushRemoteSync,
        conflictFallback: handlePullRemoteSync
      });
    } catch (error) {
      console.error('Failed to push the remote sync snapshot', error);
      setLibraryNotice('error', '推送 Readest Cloud 失败，请稍后重试。', {
        label: '重试',
        run: handlePushRemoteSync
      });
    } finally {
      options.setRemoteSyncBusy(false);
    }
  };

  const handlePullRemoteSync = async () => {
    if (
      !options.canPersistLibrary() ||
      options.getMigrationBusy() ||
      options.getSyncSnapshotBusy() ||
      options.getRemoteSyncBusy()
    ) {
      return;
    }

    options.setRemoteSyncBusy(true);
    clearLibraryNotice();
    try {
      const result = await options.runRemoteSync({
        provider: 'readestCloud',
        operation: 'pull'
      });

      if (result.status === 'success') {
        await applyPulledRemoteSnapshot(result);
        return;
      }

      handleRemoteSyncResult({
        result,
        retry: handlePullRemoteSync
      });
    } catch (error) {
      console.error('Failed to pull the remote sync snapshot', error);
      setLibraryNotice('error', '拉取 Readest Cloud 失败，请稍后重试。', {
        label: '重试',
        run: handlePullRemoteSync
      });
    } finally {
      options.setRemoteSyncBusy(false);
    }
  };

  return {
    clearLibraryNotice,
    setLibraryNotice,
    runLibraryNoticeAction,
    applyPersistedLibraryRecords,
    loadLibrary,
    handleOpenReaderTarget,
    handleOpenSourcePath,
    triggerImportPicker,
    handleImportChange,
    triggerReadestMigration,
    handleReadestMigrationClick,
    reloadLibraryAfterRepair,
    restoreRemovedLibraryRecord,
    handleRemoveLibraryBook,
    handleUpdateLibraryBookMetadata,
    handleRepairLibraryBook,
    handleBulkRepairLibraryBooks,
    handleExportSyncSnapshot,
    handleImportSyncSnapshot,
    handleExportKoReaderSync,
    handleImportKoReaderSync,
    handlePushKoReaderRemoteSync,
    handlePullKoReaderRemoteSync,
    handlePushRemoteSync,
    handlePullRemoteSync
  };
};

export const buildDesktopLibraryPageCoordinatorFromState = (
  options: DesktopLibraryPageCoordinatorOptions
) => buildDesktopLibraryPageCoordinator(options);

export const buildDesktopLibraryPageCoordinatorFromBindings = ({
  state,
  env
}: {
  state: DesktopLibraryPageCoordinatorStateBindings;
  env: DesktopLibraryPageCoordinatorEnvironment;
}) =>
  buildDesktopLibraryPageCoordinator({
    ...state,
    ...env
  });

export const buildDesktopLibraryPageActionEnvironmentBindings = (
  coordinator: ReturnType<typeof buildDesktopLibraryPageCoordinator>
) => ({
  onImportChange: coordinator.handleImportChange,
  onRunNoticeAction: coordinator.runLibraryNoticeAction,
  onClearNotice: coordinator.clearLibraryNotice,
  onReadestMigration: coordinator.handleReadestMigrationClick,
  onExportSyncSnapshot: coordinator.handleExportSyncSnapshot,
  onImportSyncSnapshot: coordinator.handleImportSyncSnapshot,
  onExportKoReaderSync: coordinator.handleExportKoReaderSync,
  onImportKoReaderSync: coordinator.handleImportKoReaderSync,
  onPushKoReaderRemoteSync: coordinator.handlePushKoReaderRemoteSync,
  onPullKoReaderRemoteSync: coordinator.handlePullKoReaderRemoteSync,
  onPushRemoteSync: coordinator.handlePushRemoteSync,
  onPullRemoteSync: coordinator.handlePullRemoteSync,
  onOpenLink: coordinator.handleOpenReaderTarget,
  onImportBooks: coordinator.triggerImportPicker,
  onOpenSourcePath: coordinator.handleOpenSourcePath,
  onUpdateBookMetadata: coordinator.handleUpdateLibraryBookMetadata,
  onRemoveBook: coordinator.handleRemoveLibraryBook
});

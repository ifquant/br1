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
  LibraryImportActionResult,
  LibraryReaderTarget,
  PreparedSyncSnapshotRestore,
  PersistedLibraryBook,
  ReadestLibrarySummary,
  SyncSnapshotApplyResult,
  SyncSnapshotExportDialogResult,
  SyncSnapshotImportDialogResult
} from '$lib/services';

type SetLibraryNoticeState = (notice: LibraryNoticeState | null) => void;

export type DesktopLibraryPageCoordinatorOptions = {
  getLibraryNoticeState: () => LibraryNoticeState | null;
  setLibraryNoticeState: SetLibraryNoticeState;
  setPersistedLibraryRecords: (records: PersistedLibraryBook[]) => void;
  setReadestCompatibleCount: (count: number) => void;
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
  prepareSyncSnapshotRestore: (snapshot: any) => PreparedSyncSnapshotRestore;
  applySyncSnapshot: (request: PreparedSyncSnapshotRestore['request']) => Promise<SyncSnapshotApplyResult>;
  persistImportedReaderSettings: (
    storage: Storage | undefined,
    settings: PreparedSyncSnapshotRestore['readerSettings']
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
  setImportedBooks,
  bulkRepairBusy,
  setBulkRepairBusy,
  setBulkRepairSummary,
  bulkRepairEligibleQueueBooks,
  migrationBusy,
  setMigrationBusy,
  syncSnapshotBusy,
  setSyncSnapshotBusy,
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
  setImportedBooks: (books: LibraryShelfBook[]) => void;
  bulkRepairBusy: boolean;
  setBulkRepairBusy: (busy: boolean) => void;
  setBulkRepairSummary: (summary: string) => void;
  bulkRepairEligibleQueueBooks: LibraryShelfBook[];
  migrationBusy: boolean;
  setMigrationBusy: (busy: boolean) => void;
  syncSnapshotBusy: boolean;
  setSyncSnapshotBusy: (busy: boolean) => void;
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
  prepareSyncSnapshotRestore,
  applySyncSnapshot,
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
  prepareSyncSnapshotRestore: DesktopLibraryPageCoordinatorEnvironment['prepareSyncSnapshotRestore'];
  applySyncSnapshot: DesktopLibraryPageCoordinatorEnvironment['applySyncSnapshot'];
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
  prepareSyncSnapshotRestore,
  applySyncSnapshot,
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
    if (!options.canPersistLibrary() || options.getMigrationBusy()) return;

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

  const handleExportSyncSnapshot = async () => {
    if (!options.canPersistLibrary() || options.getSyncSnapshotBusy()) return;

    options.setSyncSnapshotBusy(true);
    clearLibraryNotice();
    try {
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

      const snapshot = options.createLocalSyncSnapshot({
        libraryBooks,
        bookmarkStates,
        noteStates,
        highlightsWorkspaceStates,
        readerSettings: options.readReaderSettings()
      });
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
    if (!options.canPersistLibrary() || options.getSyncSnapshotBusy()) return;

    options.setSyncSnapshotBusy(true);
    clearLibraryNotice();
    try {
      const imported = await options.loadSyncSnapshotDialog();
      if (imported.cancelled || !imported.snapshot) {
        setLibraryNotice('info', '已取消本地快照恢复。');
        return;
      }

      const prepared = options.prepareSyncSnapshotRestore(imported.snapshot);
      const applyResult = await options.applySyncSnapshot(prepared.request);
      const restoredReaderSettings = options.persistImportedReaderSettings(
        options.getStorage(),
        prepared.readerSettings
      );
      await loadLibrary();

      setLibraryNotice(
        'info',
        `已恢复本地快照${imported.fileName ? `：${imported.fileName}` : ''}。书库 ${applyResult.libraryBookCount} 本，书签 ${applyResult.bookmarkBookCount} 本，笔记 ${applyResult.noteBookCount} 本，高亮工作区 ${applyResult.highlightsWorkspaceBookCount} 本${restoredReaderSettings ? '，阅读设置已更新。' : '。'}`
      );
    } catch (error) {
      console.error('Failed to import local sync snapshot', error);
      const detail = error instanceof Error ? error.message : '请检查快照文件是否完整有效。';
      setLibraryNotice('error', `恢复本地快照失败：${detail}`);
    } finally {
      options.setSyncSnapshotBusy(false);
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
    handleImportSyncSnapshot
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
  onOpenLink: coordinator.handleOpenReaderTarget,
  onImportBooks: coordinator.triggerImportPicker,
  onOpenSourcePath: coordinator.handleOpenSourcePath,
  onUpdateBookMetadata: coordinator.handleUpdateLibraryBookMetadata,
  onRemoveBook: coordinator.handleRemoveLibraryBook
});

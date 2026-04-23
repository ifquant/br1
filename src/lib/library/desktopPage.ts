import { createLibraryNotice, runLibraryNoticeAction as runSharedLibraryNoticeAction } from './controller';
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
  PersistedLibraryBook,
  ReadestLibrarySummary
} from '$lib/services/libraryPersistence';

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
  setDesktopLibraryMode: (value: boolean) => void;
  setReadestLibraryCount: (count: number) => void;
  setShowReadestMigration: (value: boolean) => void;
  getImportInput: () => HTMLInputElement | null;
  toAssetReaderTarget: (url: string, label?: string) => LibraryReaderTarget;
  openReaderTarget: (target: string | LibraryReaderTarget) => Promise<boolean>;
  openLibraryBookPath: (filePath: string) => Promise<void>;
  importBooksFromDesktopPicker: () => Promise<LibraryImportActionResult>;
  loadPersistedLibraryBooks: () => Promise<PersistedLibraryBook[]>;
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

export const buildDesktopLibraryPageCoordinatorEnvironment = (
  env: DesktopLibraryPageCoordinatorEnvironment
) => env;

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
    handleBulkRepairLibraryBooks
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

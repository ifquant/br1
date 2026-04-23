import type { LibraryNoticeState } from './types';
import type {
  LibraryImportActionResult,
  LibraryReaderTarget,
  PersistedLibraryBook,
  ReadestLibrarySummary
} from '$lib/services/libraryPersistence';

type SetLibraryNotice = (
  kind: 'error' | 'info',
  message: string,
  action?: { label: string; run: () => void | Promise<void> }
) => void;

type ClearLibraryNotice = () => void;

export const describeReadestMigrationResult = (result: LibraryImportActionResult) => {
  const totalDetected = result.totalDetected ?? 0;
  const importedCount = result.importedCount ?? result.records.length;
  const replacedCount = result.replacedCount ?? 0;
  const skippedMissingFiles = result.skippedMissingFiles ?? 0;
  const syncedCount = importedCount;

  if (result.kind === 'empty') {
    if (totalDetected > 0 && skippedMissingFiles > 0) {
      return `发现 ${totalDetected} 本 Readest 藏书，但有 ${skippedMissingFiles} 本缺少本地文件，暂时无法兼容。`;
    }
    return '没有从 Readest 迁移到可用书籍，请确认本机 Readest 书库仍然完整。';
  }

  const messageParts = [`已同步 ${syncedCount} 本 Readest 藏书`];
  if (replacedCount > 0) {
    messageParts.push(`刷新了 ${replacedCount} 本已有兼容记录`);
  }
  if (skippedMissingFiles > 0) {
    messageParts.push(`跳过了 ${skippedMissingFiles} 本缺少本地文件的条目`);
  }

  return `${messageParts.join('，')}。`;
};

export const loadDesktopLibrarySurface = async ({
  detectReadestLibrary,
  loadPersistedLibraryBooks,
  applyPersistedLibraryRecords,
  triggerReadestMigration,
  setDesktopLibraryMode,
  setReadestLibraryCount,
  setShowReadestMigration
}: {
  detectReadestLibrary: () => Promise<ReadestLibrarySummary>;
  loadPersistedLibraryBooks: () => Promise<PersistedLibraryBook[]>;
  applyPersistedLibraryRecords: (records: PersistedLibraryBook[]) => Promise<void>;
  triggerReadestMigration: (options?: {
    autoOpenFirstBook?: boolean;
    reloadAfterImport?: boolean;
  }) => Promise<void>;
  setDesktopLibraryMode: (value: boolean) => void;
  setReadestLibraryCount: (count: number) => void;
  setShowReadestMigration: (value: boolean) => void;
}) => {
  setDesktopLibraryMode(true);

  const records = await loadPersistedLibraryBooks();
  const readestSummary = await detectReadestLibrary();
  setReadestLibraryCount(readestSummary.count);

  if (records.length === 0 && readestSummary.available) {
    await triggerReadestMigration({ autoOpenFirstBook: false, reloadAfterImport: false });
    const migratedRecords = await loadPersistedLibraryBooks();
    await applyPersistedLibraryRecords(migratedRecords);
    setShowReadestMigration(readestSummary.available);
    return;
  }

  await applyPersistedLibraryRecords(records);
  setShowReadestMigration(readestSummary.available);
};

export const importDesktopLibraryBooks = async ({
  clearLibraryNotice,
  setLibraryNotice,
  importBooksFromDesktopPicker,
  reloadLibrary,
  setShowReadestMigration,
  onOpenReaderTarget
}: {
  clearLibraryNotice: ClearLibraryNotice;
  setLibraryNotice: SetLibraryNotice;
  importBooksFromDesktopPicker: () => Promise<LibraryImportActionResult>;
  reloadLibrary: () => Promise<void>;
  setShowReadestMigration: (value: boolean) => void;
  onOpenReaderTarget: (target: string | LibraryReaderTarget) => Promise<void>;
}) => {
  try {
    clearLibraryNotice();
    const result = await importBooksFromDesktopPicker();
    if (result.kind === 'cancelled') return;
    if (result.kind === 'empty') {
      setLibraryNotice('info', '没有导入到可用书籍，请确认所选文件仍然存在且格式受支持。');
      return;
    }
    await reloadLibrary();
    setShowReadestMigration(false);
    if (result.firstReaderTarget) {
      await onOpenReaderTarget(result.firstReaderTarget);
    }
  } catch (error) {
    console.error('Failed to open the desktop import picker', error);
    setLibraryNotice('error', '无法完成桌面导入，请确认文件选择器和导入权限正常。');
  }
};

export const migrateDesktopReadestLibrary = async ({
  migrationBusy,
  setMigrationBusy,
  clearLibraryNotice,
  setLibraryNotice,
  importBooksFromReadest,
  reloadLibrary,
  loadPersistedLibraryBooks,
  applyPersistedLibraryRecords,
  setShowReadestMigration,
  onOpenReaderTarget,
  autoOpenFirstBook = true,
  reloadAfterImport = true
}: {
  migrationBusy: boolean;
  setMigrationBusy: (value: boolean) => void;
  clearLibraryNotice: ClearLibraryNotice;
  setLibraryNotice: SetLibraryNotice;
  importBooksFromReadest: () => Promise<LibraryImportActionResult>;
  reloadLibrary: () => Promise<void>;
  loadPersistedLibraryBooks: () => Promise<PersistedLibraryBook[]>;
  applyPersistedLibraryRecords: (records: PersistedLibraryBook[]) => Promise<void>;
  setShowReadestMigration: (value: boolean) => void;
  onOpenReaderTarget: (target: string | LibraryReaderTarget) => Promise<void>;
  autoOpenFirstBook?: boolean;
  reloadAfterImport?: boolean;
}) => {
  if (migrationBusy) return;

  setMigrationBusy(true);
  try {
    clearLibraryNotice();
    const result = await importBooksFromReadest();
    const migrationMessage = describeReadestMigrationResult(result);
    if (result.kind === 'empty') {
      setShowReadestMigration(true);
      setLibraryNotice('info', migrationMessage);
      return;
    }
    if (reloadAfterImport) {
      await reloadLibrary();
    } else {
      const currentRecords = await loadPersistedLibraryBooks();
      await applyPersistedLibraryRecords(currentRecords);
    }
    setShowReadestMigration(true);

    if (autoOpenFirstBook && result.kind === 'imported' && result.firstReaderTarget) {
      await onOpenReaderTarget(result.firstReaderTarget);
    }
    setLibraryNotice('info', migrationMessage);
  } catch (error) {
    console.error('Failed to import books from Readest', error);
    setLibraryNotice('error', '从 Readest 导入失败，请确认本机书库路径和权限可用。');
  } finally {
    setMigrationBusy(false);
  }
};

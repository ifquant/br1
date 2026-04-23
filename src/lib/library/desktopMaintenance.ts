import type { LibraryNoticeState, LibraryShelfBook } from './types';
import type { PersistedLibraryBook } from '$lib/services/libraryPersistence';

type SetLibraryNotice = (
  kind: 'error' | 'info',
  message: string,
  action?: { label: string; run: () => void | Promise<void> }
) => void;

type ClearLibraryNotice = () => void;

const buildImportedResult = async (
  filePath: string,
  importLibraryBooks: (filePaths: string[]) => Promise<PersistedLibraryBook[]>
) => ({
  kind: 'imported' as const,
  records: await importLibraryBooks([filePath]),
  firstRecord: null,
  firstReaderTarget: null,
  firstReaderHref: ''
});

export const restoreRemovedLibraryRecord = async ({
  record,
  clearLibraryNotice,
  setLibraryNotice,
  restoreRemovedLibraryBook,
  applyPersistedLibraryRecords
}: {
  record: PersistedLibraryBook;
  clearLibraryNotice: ClearLibraryNotice;
  setLibraryNotice: SetLibraryNotice;
  restoreRemovedLibraryBook: (recordId: string) => Promise<PersistedLibraryBook[]>;
  applyPersistedLibraryRecords: (records: PersistedLibraryBook[]) => Promise<void>;
}) => {
  try {
    clearLibraryNotice();
    const restoredRecords = await restoreRemovedLibraryBook(record.id || record.filePath);
    await applyPersistedLibraryRecords(restoredRecords);
    setLibraryNotice('info', `已恢复“${record.title}”到书库，并保留原有阅读状态。`);
  } catch (error) {
    console.error('Failed to restore removed library book', error);
    setLibraryNotice('error', `无法恢复“${record.title}”；请确认原文件仍然存在后重新导入。`);
  }
};

export const removeLibraryBookFromDesktop = async ({
  book,
  persistedRecord,
  clearLibraryNotice,
  setLibraryNotice,
  confirmRemoval,
  removeLibraryBook,
  applyPersistedLibraryRecords,
  onRestoreRemovedRecord
}: {
  book: LibraryShelfBook;
  persistedRecord: PersistedLibraryBook | null | undefined;
  clearLibraryNotice: ClearLibraryNotice;
  setLibraryNotice: SetLibraryNotice;
  confirmRemoval: (message: string) => boolean;
  removeLibraryBook: (filePath: string) => Promise<PersistedLibraryBook[]>;
  applyPersistedLibraryRecords: (records: PersistedLibraryBook[]) => Promise<void>;
  onRestoreRemovedRecord: (record: PersistedLibraryBook) => void | Promise<void>;
}) => {
  if (!persistedRecord) {
    setLibraryNotice('error', '没有找到这本书的持久化记录，请先刷新书库后重试。');
    return;
  }

  const confirmed = confirmRemoval(
    `从书库移除“${book.title}”？这只会删除 br1 的书库副本和记录，不会删除原文件。`
  );
  if (!confirmed) return;

  try {
    clearLibraryNotice();
    const updatedRecords = await removeLibraryBook(persistedRecord.filePath);
    await applyPersistedLibraryRecords(updatedRecords);
    const canRestoreFromSource =
      !!persistedRecord.sourcePath && persistedRecord.sourceFileExists !== false;
    setLibraryNotice(
      'info',
      canRestoreFromSource
        ? `已从书库移除“${book.title}”；原文件不会被删除，可从原文件撤销恢复。`
        : `已从书库移除“${book.title}”；原文件不会被删除。`,
      canRestoreFromSource
        ? {
            label: '撤销移除',
            run: () => onRestoreRemovedRecord(persistedRecord)
          }
        : undefined
    );
  } catch (error) {
    console.error('Failed to remove library book', error);
    setLibraryNotice('error', '无法从书库移除这本书，请确认书库记录仍然有效后重试。');
  }
};

export const updateDesktopLibraryBookMetadata = async ({
  book,
  persistedRecord,
  metadata,
  clearLibraryNotice,
  setLibraryNotice,
  updateLibraryBookMetadata,
  applyPersistedLibraryRecords
}: {
  book: LibraryShelfBook;
  persistedRecord: PersistedLibraryBook | null | undefined;
  metadata: {
    title: string;
    author: string;
    description?: string;
    language?: string;
    publisher?: string;
    collection?: string;
    tags?: string[];
  };
  clearLibraryNotice: ClearLibraryNotice;
  setLibraryNotice: SetLibraryNotice;
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
  applyPersistedLibraryRecords: (records: PersistedLibraryBook[]) => Promise<void>;
}) => {
  if (!persistedRecord) {
    setLibraryNotice('error', '没有找到这本书的持久化记录，请先刷新书库后重试。');
    return;
  }

  const nextTitle = metadata.title.trim();
  const nextAuthor = metadata.author.trim();
  if (!nextTitle || !nextAuthor) {
    setLibraryNotice('error', '标题和作者不能为空。');
    return;
  }

  try {
    clearLibraryNotice();
    const updatedRecords = await updateLibraryBookMetadata({
      recordId: persistedRecord.id || persistedRecord.filePath,
      title: nextTitle,
      author: nextAuthor,
      description: metadata.description ?? '',
      language: metadata.language ?? '',
      publisher: metadata.publisher ?? '',
      collection: metadata.collection ?? '',
      tags: metadata.tags ?? []
    });
    await applyPersistedLibraryRecords(updatedRecords);
    setLibraryNotice('info', `已更新“${nextTitle}”的书库元数据。`);
  } catch (error) {
    console.error('Failed to update library book metadata', error);
    setLibraryNotice('error', '无法更新这本书的元数据，请确认书库记录仍然有效后重试。');
  }
};

export const repairDesktopLibraryBook = async ({
  book,
  persistedRecord,
  clearLibraryNotice,
  setLibraryNotice,
  importLibraryBooks,
  selectSingleSystemBookPath,
  previewLibraryRepairCandidate,
  confirmReplacement,
  reloadLibraryAfterRepair
}: {
  book: LibraryShelfBook;
  persistedRecord: PersistedLibraryBook | null | undefined;
  clearLibraryNotice: ClearLibraryNotice;
  setLibraryNotice: SetLibraryNotice;
  importLibraryBooks: (filePaths: string[]) => Promise<PersistedLibraryBook[]>;
  selectSingleSystemBookPath: () => Promise<string | null>;
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
  confirmReplacement: (message: string) => boolean;
  reloadLibraryAfterRepair: () => Promise<void>;
}) => {
  if (!persistedRecord) {
    setLibraryNotice('error', '没有找到这本书的持久化记录，请先刷新书库后重试。');
    return;
  }

  const libraryCopyMissing = persistedRecord.libraryFileExists === false;
  const sourcePathAvailable =
    !!persistedRecord.sourcePath && persistedRecord.sourceFileExists !== false;

  try {
    clearLibraryNotice();

    let result: { kind: 'imported'; records: PersistedLibraryBook[] } | null = null;

    if (libraryCopyMissing && sourcePathAvailable && persistedRecord.sourcePath) {
      result = await buildImportedResult(persistedRecord.sourcePath, importLibraryBooks);
    } else {
      const selectedPath = await selectSingleSystemBookPath();
      if (!selectedPath) return;
      const candidatePreview = await previewLibraryRepairCandidate({
        filePath: selectedPath,
        recordId: persistedRecord.id || persistedRecord.filePath
      });
      if (!candidatePreview.fileExists) {
        setLibraryNotice('error', '所选文件当前不可读，请确认文件仍然存在后再重试。');
        return;
      }
      if (
        !candidatePreview.formatMatches &&
        !confirmReplacement(
          `所选文件格式是 ${candidatePreview.format}，当前记录格式是 ${persistedRecord.format}。仍要用“${candidatePreview.fileName}”重关联这条记录吗？`
        )
      ) {
        setLibraryNotice('info', '已取消重关联；请选择与当前记录格式一致的替换文件。');
        return;
      }
      if (
        candidatePreview.formatMatches &&
        (!candidatePreview.titleMatches || !candidatePreview.authorMatches) &&
        !confirmReplacement(
          `所选文件识别为“${candidatePreview.title} / ${candidatePreview.author}”，当前记录是“${persistedRecord.title} / ${persistedRecord.author}”。仍要重关联吗？`
        )
      ) {
        setLibraryNotice('info', '已取消重关联；请选择与当前记录标题和作者更匹配的替换文件。');
        return;
      }
      if (
        candidatePreview.sourcePathMatches &&
        !candidatePreview.sourceHashMatches &&
        !confirmReplacement(
          `所选文件路径与原记录一致，但文件内容指纹不同。仍要用“${candidatePreview.fileName}”重建这条记录吗？`
        )
      ) {
        setLibraryNotice('info', '已取消重关联；请确认替换文件内容与当前记录一致后再继续。');
        return;
      }
      result = await buildImportedResult(selectedPath, importLibraryBooks);
    }

    if (!result || result.records.length === 0) {
      setLibraryNotice(
        'info',
        `没有修复到“${book.title}”的可用文件，请确认所选文件仍然存在且格式受支持。`
      );
      return;
    }

    await reloadLibraryAfterRepair();
    setLibraryNotice(
      'info',
      libraryCopyMissing && sourcePathAvailable
        ? `已从原文件重建“${book.title}”的书库副本，原有阅读进度已保留。`
        : `已将“${book.title}”按原位修复方式重新关联到新文件；如果它仍显示缺失，请确认选择的是同一本书。`
    );
  } catch (error) {
    console.error('Failed to repair the library book', error);
    setLibraryNotice(
      'error',
      `无法修复“${book.title}”，请确认当前运行在桌面环境且所选文件可访问。`
    );
  }
};

export const bulkRepairDesktopLibraryBooks = async ({
  eligibleRecords,
  bulkRepairBusy,
  setBulkRepairBusy,
  setBulkRepairSummary,
  clearLibraryNotice,
  setLibraryNotice,
  importLibraryBooks,
  loadPersistedLibraryBooks,
  applyPersistedLibraryRecords,
  getManualRepairCount
}: {
  eligibleRecords: PersistedLibraryBook[];
  bulkRepairBusy: boolean;
  setBulkRepairBusy: (busy: boolean) => void;
  setBulkRepairSummary: (summary: string) => void;
  clearLibraryNotice: ClearLibraryNotice;
  setLibraryNotice: SetLibraryNotice;
  importLibraryBooks: (filePaths: string[]) => Promise<PersistedLibraryBook[]>;
  loadPersistedLibraryBooks: () => Promise<PersistedLibraryBook[]>;
  applyPersistedLibraryRecords: (records: PersistedLibraryBook[]) => Promise<void>;
  getManualRepairCount: (records: PersistedLibraryBook[]) => number;
}) => {
  if (bulkRepairBusy) return;

  if (eligibleRecords.length === 0) {
    setBulkRepairSummary('当前没有可自动批量修复的书库副本；这些条目需要逐本复核。');
    setLibraryNotice(
      'info',
      '当前没有可自动批量修复的书库副本；其余条目仍需手动重新关联或重新选择文件。'
    );
    return;
  }

  setBulkRepairBusy(true);
  setBulkRepairSummary('');
  clearLibraryNotice();

  let repairedCount = 0;
  let failedCount = 0;

  try {
    for (const record of eligibleRecords) {
      try {
        const repairedRecords = await importLibraryBooks([record.sourcePath!]);
        if (repairedRecords.length > 0) {
          repairedCount += 1;
        } else {
          failedCount += 1;
        }
      } catch (error) {
        failedCount += 1;
        console.error('Failed to bulk repair the library book', error);
      }
    }

    const currentRecords = await loadPersistedLibraryBooks();
    await applyPersistedLibraryRecords(currentRecords);

    const manualRepairCount = getManualRepairCount(currentRecords);

    if (repairedCount === 0) {
      setLibraryNotice(
        failedCount > 0 ? 'error' : 'info',
        manualRepairCount > 0
          ? `没有自动修复成功；当前仍有 ${manualRepairCount} 本需要手动重新关联或重新选择文件。`
          : '没有自动修复成功，请刷新书库后重试。'
      );
      setBulkRepairSummary(
        failedCount > 0
          ? `批量修复失败：${failedCount} 本未能自动修复，仍需复核当前待修复队列。`
          : '批量修复没有恢复任何书库副本；请复核当前待修复队列。'
      );
      return;
    }

    const summaryParts = [`已批量重建 ${repairedCount} 本书的书库副本`];
    if (manualRepairCount > 0) {
      summaryParts.push(`仍有 ${manualRepairCount} 本需要手动重新关联或重新选择文件`);
    } else {
      summaryParts.push('当前待修复队列里没有必须手动处理的条目了');
    }
    if (failedCount > 0) {
      summaryParts.push(`${failedCount} 本未能自动修复`);
    }
    const summary = `${summaryParts.join('，')}。`;
    setBulkRepairSummary(summary);
    setLibraryNotice('info', summary);
  } finally {
    setBulkRepairBusy(false);
  }
};

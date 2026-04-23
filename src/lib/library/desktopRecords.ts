import type {
  LibraryShelfBook,
  ManualRelinkReview
} from './types';
import type { PersistedLibraryBook } from '$lib/services/libraryPersistence';

const getPersistedLibraryLookupKey = (book: {
  title: string;
  author: string;
  format: string;
  sourcePath?: string;
}) => `${book.format}::${book.title}::${book.author}::${book.sourcePath ?? ''}`;

const normalizeLibraryMatchText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');

const getPersistedLibraryMatchKey = (record: {
  title: string;
  author: string;
  format: string;
}) =>
  [record.title, record.author, record.format]
    .map((value) => normalizeLibraryMatchText(value))
    .join('::');

export const lookupPersistedRecordForBook = (
  records: PersistedLibraryBook[],
  book: LibraryShelfBook
) => {
  const lookupKey = getPersistedLibraryLookupKey(book);
  return (
    records.find((record) => {
      return (
        getPersistedLibraryLookupKey({
          title: record.title,
          author: record.author,
          format: record.format,
          sourcePath: record.sourcePath || record.filePath
        }) === lookupKey
      );
    }) ?? null
  );
};

export const isPersistedRecordBroken = (record: PersistedLibraryBook) =>
  record.libraryFileExists === false ||
  (!!record.sourcePath && record.sourceFileExists === false);

export const isPersistedRecordBulkRepairEligible = (record: PersistedLibraryBook) =>
  record.libraryFileExists === false &&
  !!record.sourcePath &&
  record.sourceFileExists !== false;

export const isPersistedRecordManualRepairOnly = (record: PersistedLibraryBook) =>
  isPersistedRecordBroken(record) && !isPersistedRecordBulkRepairEligible(record);

export const getRecoveryQueuePersistedRecords = (
  records: PersistedLibraryBook[],
  sortRecordsForLibraryShelf: (records: PersistedLibraryBook[]) => PersistedLibraryBook[]
) => sortRecordsForLibraryShelf(records).filter(isPersistedRecordBroken).slice(0, 6);

export const buildManualRelinkReview = ({
  book,
  persistedRecords,
  persistedRecord
}: {
  book: LibraryShelfBook;
  persistedRecords: PersistedLibraryBook[];
  persistedRecord: PersistedLibraryBook | null | undefined;
}): ManualRelinkReview | undefined => {
  if (!persistedRecord || !isPersistedRecordManualRepairOnly(persistedRecord)) return undefined;
  const preflightLabel = '替换文件预检';
  const preflightDetail =
    '选择文件后会先检查文件是否存在、格式、标题、作者、原路径和 SHA-256 指纹；明显不匹配时会再次确认。';
  const repairContractLabel = '修复契约';
  const repairContractDetail =
    persistedRecord.progressLocation || typeof persistedRecord.progressFraction === 'number'
      ? '选中的文件会原位重关联到当前记录，保留阅读状态、百分比进度和恢复定位；不会新建重复书目。'
      : '选中的文件会原位重关联到当前记录，保留阅读状态；不会新建重复书目。';

  const currentMatchKey = getPersistedLibraryMatchKey(persistedRecord);
  const conflictingMatchCount = persistedRecords.filter((record) => {
    if (record.id === persistedRecord.id) return false;
    if (record.id.startsWith('readest-')) return false;
    if (!isPersistedRecordBroken(record)) return false;
    return getPersistedLibraryMatchKey(record) === currentMatchKey;
  }).length;
  const conflictingSourceCount = persistedRecord.sourcePath
    ? persistedRecords
        .filter((record) => record.id !== persistedRecord.id)
        .filter((record) => !record.id.startsWith('readest-'))
        .filter((record) => record.sourcePath && record.sourcePath === persistedRecord.sourcePath)
        .length
    : 0;

  if (conflictingMatchCount > 0) {
    return {
      note: '先核对当前条目的标题、格式、来源和进度，再打开文件选择器。选中的文件会原位重关联当前记录，不会新建重复条目。',
      repairContractLabel,
      repairContractDetail,
      conflictLabel: `检测到 ${conflictingMatchCount + 1} 条同题名/作者/格式的待修复记录`,
      conflictDetail:
        '系统会按现有记录顺序匹配修复目标；如果这里还有别的同类破损记录，先确认你正在处理的是当前这一条，再继续选择替换文件。',
      preflightLabel,
      preflightDetail,
      actionLabel: '确认后选择替换文件'
    };
  }

  if (conflictingSourceCount > 0) {
    return {
      note: '先核对当前条目的标题、格式、来源和进度，再打开文件选择器。选中的文件会原位重关联当前记录，不会新建重复条目。',
      repairContractLabel,
      repairContractDetail,
      conflictLabel: '检测到相同原文件路径的其他记录',
      conflictDetail:
        '如果书库里还有别的条目共享这一原文件路径，选文件前先确认当前条目的标题和格式，避免把重关联落到另一条记录上。',
      preflightLabel,
      preflightDetail,
      actionLabel: '确认后选择替换文件'
    };
  }

  return {
    note: '先核对当前条目的标题、格式、来源和进度，再打开文件选择器。选中的文件会原位重关联当前记录，不会新建重复条目。',
    repairContractLabel,
    repairContractDetail,
    conflictLabel: '当前没有检测到同类冲突',
    conflictDetail:
      '这条记录可以直接按原位修复处理；只要你选到的是同一本书，修复后会保留现有进度和阅读状态。',
    preflightLabel,
    preflightDetail,
    actionLabel: '确认后选择替换文件'
  };
};

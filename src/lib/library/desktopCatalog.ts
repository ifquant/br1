import type { LibraryShelfBook } from './types';
import type { PersistedLibraryBook } from '$lib/services/libraryPersistence';
import {
  toLibraryCoverUrl,
  toReaderAssetHref,
  toReaderStartHref
} from '$lib/services';

const readerValidationRank = (record: PersistedLibraryBook) => {
  const normalized = record.format.trim().toUpperCase();
  if (normalized === 'PDF') return 0;
  if (normalized === 'EPUB') return 1;
  if (normalized === 'FB2' || normalized === 'MOBI' || normalized === 'AZW3') return 2;
  return 3;
};

export const sortRecordsForLibraryShelf = (records: PersistedLibraryBook[]) =>
  [...records].sort((left, right) => {
    const leftOpenedAt = left.lastOpenedAt ?? 0;
    const rightOpenedAt = right.lastOpenedAt ?? 0;
    const byRecency = rightOpenedAt - leftOpenedAt;
    if (byRecency !== 0) return byRecency;

    const byFormat = readerValidationRank(left) - readerValidationRank(right);
    if (byFormat !== 0) return byFormat;
    return right.importedAt - left.importedAt;
  });

export const formatLastOpenedLabel = (timestamp: number | null | undefined) => {
  if (typeof timestamp !== 'number' || timestamp <= 0) return '';

  const deltaMs = Date.now() - timestamp;
  const deltaMinutes = Math.max(1, Math.round(deltaMs / 60000));

  if (deltaMinutes < 60) return `${deltaMinutes} 分钟前阅读`;
  if (deltaMinutes < 60 * 24) return `${Math.round(deltaMinutes / 60)} 小时前阅读`;
  return `${Math.round(deltaMinutes / (60 * 24))} 天前阅读`;
};

export const formatImportedAtLabel = (timestamp: number | null | undefined) => {
  if (typeof timestamp !== 'number' || timestamp <= 0) return '';

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(timestamp));
};

export const formatProgressPercentLabel = (fraction: number | null) => {
  if (fraction === null) return '';
  const normalized = Math.max(0, Math.min(1, fraction));
  if (normalized <= 0) return '0%';
  return `${Math.max(1, Math.min(100, Math.round(normalized * 100)))}%`;
};

export const mapDesktopLibraryRecord = async (
  record: PersistedLibraryBook
): Promise<LibraryShelfBook> => {
  const isReadestCompatible = record.id.startsWith('readest-');
  const hasLibraryFileCopy = record.libraryFileExists !== false;
  const hasOriginalSource = !record.sourcePath || record.sourceFileExists !== false;
  const progressFraction =
    typeof record.progressFraction === 'number'
      ? Math.max(0, Math.min(1, record.progressFraction))
      : null;

  const readingStatusLabel =
    progressFraction === null
      ? ''
      : progressFraction >= 1
        ? '已读完'
        : progressFraction > 0
          ? '在读'
          : '未开始';

  const sourceLabel = isReadestCompatible
    ? 'Readest 兼容'
    : record.sourcePath
      ? '本机导入'
      : '书库';

  const availabilityLabel = !hasLibraryFileCopy
    ? record.sourcePath && !hasOriginalSource
      ? '书库副本缺失，且原文件路径已失效'
      : record.sourcePath
        ? '书库副本缺失，可从原文件重建'
        : '书库副本缺失，需要手动重新关联'
    : record.sourcePath && !hasOriginalSource
      ? '原文件缺失，可继续使用书库副本'
      : isReadestCompatible
        ? '兼容 Readest 本地藏书'
        : '本地可读';

  const compatibilitySignals = [
    record.coverPath ? '封面' : '',
    record.description ? '简介' : '',
    record.language ? '语言' : '',
    record.publisher ? '出版者' : '',
    record.collection ? '书架归类' : '',
    record.tags?.length ? '标签' : '',
    record.progressLocation ? '恢复定位' : '',
    record.progressLocation ? '' : progressFraction !== null ? '阅读进度' : ''
  ].filter(Boolean);

  const compatibilityLabel = !hasLibraryFileCopy
    ? isReadestCompatible
      ? '兼容记录仍在，但书库副本已经缺失；请重新同步 Readest 或重新导入文件。'
      : record.sourcePath && !hasOriginalSource
        ? '这本书无法批量修复；请先逐本复核，再选择替换文件重新关联到原有记录。'
        : record.sourcePath
          ? '书库副本已经缺失；可以直接从当前原文件重建，不会额外创建重复条目。'
          : '缺少可复用的原文件路径；请逐本复核后再选择替换文件重新关联。'
    : record.sourcePath && !hasOriginalSource
      ? '原文件路径已失效；继续阅读仍可用，如需恢复“原文件”入口请重新导入。'
      : isReadestCompatible
        ? compatibilitySignals.length > 0
          ? `保留 ${compatibilitySignals.join(' / ')}`
          : '兼容 Readest 本地藏书'
        : '';

  return {
    title: record.title,
    author: record.author,
    format: record.format,
    description: record.description || '',
    language: record.language || '',
    publisher: record.publisher || '',
    collection: record.collection || '',
    tags: record.tags ?? [],
    progressLocation: record.progressLocation || '',
    status: record.status,
    progress: record.progress,
    progressFraction,
    progressPercentLabel: formatProgressPercentLabel(progressFraction),
    readingStatusLabel,
    sourceLabel,
    availabilityLabel,
    compatibilityLabel,
    sourcePath: record.sourcePath || record.filePath,
    coverUrl: await toLibraryCoverUrl(record),
    readerHref: hasLibraryFileCopy ? toReaderAssetHref(record) : '',
    restartHref: hasLibraryFileCopy ? toReaderStartHref(record) : '',
    lastOpenedAt: record.lastOpenedAt,
    lastOpenedLabel: formatLastOpenedLabel(record.lastOpenedAt),
    importedAt: record.importedAt,
    importedAtLabel: formatImportedAtLabel(record.importedAt)
  };
};

export const countReadestCompatibleRecords = (records: PersistedLibraryBook[]) =>
  records.filter(
    (record) => record.id.startsWith('readest-') && record.libraryFileExists !== false
  ).length;

export const buildDesktopCatalogProjection = async (records: PersistedLibraryBook[]) => ({
  readestCompatibleCount: countReadestCompatibleRecords(records),
  importedBooks: await Promise.all(sortRecordsForLibraryShelf(records).map(mapDesktopLibraryRecord))
});

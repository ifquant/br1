import { getDesktopBookDialogExtensions } from '$lib/reader';
import { invokeTauri, isTauriDesktop } from './platform';

export type PersistedLibraryBook = {
  id: string;
  title: string;
  author: string;
  format: string;
  description?: string | null;
  language?: string | null;
  publisher?: string | null;
  progress: string;
  status: string;
  filePath: string;
  coverPath?: string | null;
  sourcePath?: string | null;
  importedAt: number;
  progressFraction?: number | null;
  progressLocation?: string | null;
  lastOpenedAt?: number | null;
  libraryFileExists?: boolean | null;
  sourceFileExists?: boolean | null;
};

export type ReadestLibrarySummary = {
  available: boolean;
  count: number;
};

export type ReadestImportSummary = {
  records: PersistedLibraryBook[];
  totalDetected: number;
  importedCount: number;
  replacedCount: number;
  skippedMissingFiles: number;
};

export type LibraryBookBinary = {
  name: string;
  mimeType: string;
  bytesBase64: string;
};

export type LibraryReadingStateUpdate = {
  filePath: string;
  title: string;
  author: string;
  chapterLabel: string;
  progressLabel: string;
  progressFraction: number;
  progressLocation?: string;
};

export type LibraryRepairCandidatePreview = {
  filePath: string;
  fileName: string;
  format: string;
  formatMatches: boolean;
  sourcePathMatches: boolean;
  fileExists: boolean;
};

export type LibraryImportActionResult =
  | {
      kind: 'cancelled';
      records: [];
      firstRecord: null;
      firstReaderTarget: null;
      firstReaderHref: '';
      totalDetected?: number;
      importedCount?: number;
      replacedCount?: number;
      skippedMissingFiles?: number;
    }
  | {
      kind: 'empty';
      records: [];
      firstRecord: null;
      firstReaderTarget: null;
      firstReaderHref: '';
      totalDetected?: number;
      importedCount?: number;
      replacedCount?: number;
      skippedMissingFiles?: number;
    }
  | {
      kind: 'imported';
      records: PersistedLibraryBook[];
      firstRecord: PersistedLibraryBook | null;
      firstReaderTarget: LibraryReaderTarget | null;
      firstReaderHref: string;
      totalDetected?: number;
      importedCount?: number;
      replacedCount?: number;
      skippedMissingFiles?: number;
    };

export type LibraryReaderTarget =
  | {
      kind: 'asset';
      mode: 'resume';
      label: string;
      href: string;
      url: string;
    }
  | {
      kind: 'library-file';
      mode: 'resume' | 'start';
      label: string;
      href: string;
      path: string;
      restoreFraction?: number;
      restoreLocation?: string;
    };

type ReaderHrefOptions = {
  source: 'asset' | 'library-file';
  label: string;
  url?: string;
  path?: string;
  fraction?: number;
  location?: string;
};

const getBookLabelFromPath = (filePath: string) => {
  const normalized = filePath.split(/[\\/]/).at(-1) ?? filePath;
  return normalized.trim() || 'Associated book';
};

export const canPersistLibrary = () => isTauriDesktop();

const requireTauriLibraryRuntime = (action: string) => {
  if (!isTauriDesktop()) {
    throw new Error(`${action} requires the Tauri desktop runtime`);
  }
};

const toReaderHref = ({
  source,
  label,
  url,
  path,
  fraction,
  location
}: ReaderHrefOptions) => {
  const params = new URLSearchParams({
    source,
    label
  });

  if (url) {
    params.set('url', url);
  }

  if (path) {
    params.set('path', path);
  }

  if (typeof fraction === 'number') {
    params.set('fraction', String(fraction));
  }

  if (location) {
    params.set('location', location);
  }

  return `/reader?${params.toString()}`;
};

export const loadPersistedLibraryBooks = async (): Promise<PersistedLibraryBook[]> => {
  if (!isTauriDesktop()) return [];
  return invokeTauri<PersistedLibraryBook[]>('load_library_books');
};

export const detectReadestLibrary = async (): Promise<ReadestLibrarySummary> => {
  if (!isTauriDesktop()) {
    return { available: false, count: 0 };
  }

  return invokeTauri<ReadestLibrarySummary>('detect_readest_library');
};

export const selectSystemBookPaths = async (): Promise<string[]> => {
  requireTauriLibraryRuntime('selectSystemBookPaths');

  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    multiple: true,
    filters: [{ name: 'Books', extensions: getDesktopBookDialogExtensions() }]
  });

  if (!selected) return [];
  return Array.isArray(selected) ? selected : [selected];
};

export const selectSingleSystemBookPath = async (): Promise<string | null> => {
  requireTauriLibraryRuntime('selectSingleSystemBookPath');

  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    multiple: false,
    filters: [{ name: 'Books', extensions: getDesktopBookDialogExtensions() }]
  });

  if (!selected || Array.isArray(selected)) return null;
  return selected;
};

export const importLibraryBooks = async (filePaths: string[]): Promise<PersistedLibraryBook[]> => {
  return invokeTauri<PersistedLibraryBook[]>('import_library_books', {
    filePaths
  });
};

export const importReadestLibrary = async (): Promise<ReadestImportSummary> => {
  return invokeTauri<ReadestImportSummary>('import_readest_library');
};

export const removeLibraryBook = async (filePath: string): Promise<PersistedLibraryBook[]> => {
  requireTauriLibraryRuntime('removeLibraryBook');

  return invokeTauri<PersistedLibraryBook[]>('remove_library_book', {
    filePath
  });
};

export const restoreRemovedLibraryBook = async (
  record: PersistedLibraryBook
): Promise<PersistedLibraryBook[]> => {
  requireTauriLibraryRuntime('restoreRemovedLibraryBook');

  return invokeTauri<PersistedLibraryBook[]>('restore_removed_library_book', {
    record
  });
};

export const previewLibraryRepairCandidate = async ({
  filePath,
  expectedFormat,
  expectedSourcePath
}: {
  filePath: string;
  expectedFormat: string;
  expectedSourcePath?: string | null;
}): Promise<LibraryRepairCandidatePreview> => {
  requireTauriLibraryRuntime('previewLibraryRepairCandidate');

  return invokeTauri<LibraryRepairCandidatePreview>('preview_library_repair_candidate', {
    filePath,
    expectedFormat,
    expectedSourcePath
  });
};

export const updateLibraryReadingState = async (
  update: LibraryReadingStateUpdate
): Promise<void> => {
  if (!isTauriDesktop()) return;

  await invokeTauri('update_library_reading_state', update);
};

export const loadLibraryBookFile = async (filePath: string): Promise<File> => {
  if (!isTauriDesktop()) {
    throw new Error('library-file reader sources require the Tauri desktop runtime');
  }

  const binary = await invokeTauri<LibraryBookBinary>('load_library_book_binary', {
    filePath
  });

  const bytes = Uint8Array.from(atob(binary.bytesBase64), (character) => character.charCodeAt(0));
  return new File([bytes], binary.name, { type: binary.mimeType });
};

export const openLibraryBookPath = async (filePath: string): Promise<void> => {
  requireTauriLibraryRuntime('openLibraryBookPath');

  const { openPath } = await import('@tauri-apps/plugin-opener');
  await openPath(filePath);
};

export const loadLibraryCoverDataUrls = async (
  coverPaths: Array<string | null | undefined>
): Promise<string[]> => {
  if (!isTauriDesktop()) return coverPaths.map(() => '');

  const results = await invokeTauri<Array<string | null>>('load_library_cover_data_urls', {
    coverPaths
  });
  return results.map((value) => value ?? '');
};

export const toAssetReaderHref = (url: string, label: string) =>
  toReaderHref({
    source: 'asset',
    url,
    label
  });

export const toAssetReaderTarget = (url: string, label: string): LibraryReaderTarget => ({
  kind: 'asset',
  mode: 'resume',
  label,
  url,
  href: toAssetReaderHref(url, label)
});

export const toExternalLibraryFileReaderTarget = (filePath: string): LibraryReaderTarget => {
  const label = getBookLabelFromPath(filePath);
  const href = toReaderHref({
    source: 'library-file',
    path: filePath,
    label
  });

  return {
    kind: 'library-file',
    mode: 'resume',
    label,
    path: filePath,
    href
  };
};

export const toLibraryReaderTarget = (
  book: PersistedLibraryBook,
  options: {
    restart?: boolean;
  } = {}
): LibraryReaderTarget => {
  const restart = options.restart ?? false;
  const normalizedFormat = book.format.trim().toUpperCase();
  const supportsLocationRestore = !['PDF', 'MOBI', 'AZW3'].includes(normalizedFormat);
  const restoreLocation =
    !restart && supportsLocationRestore ? book.progressLocation ?? undefined : undefined;
  const href = toReaderHref({
    source: 'library-file',
    path: book.filePath,
    label: book.title,
    fraction: restart ? undefined : book.progressFraction ?? undefined,
    location: restoreLocation
  });

  return {
    kind: 'library-file',
    mode: restart ? 'start' : 'resume',
    label: book.title,
    path: book.filePath,
    href,
    restoreFraction: restart ? undefined : book.progressFraction ?? undefined,
    restoreLocation
  };
};

const toImportedReaderActionResult = (
  records: PersistedLibraryBook[],
  options: {
    emptyKind?: 'cancelled' | 'empty';
    summary?: Omit<ReadestImportSummary, 'records'>;
  } = {}
): LibraryImportActionResult => {
  const emptyKind = options.emptyKind ?? 'cancelled';
  const [firstRecord] = records;
  if (!firstRecord) {
    return {
      kind: emptyKind,
      records: [],
      firstRecord: null,
      firstReaderTarget: null,
      firstReaderHref: '',
      totalDetected: options.summary?.totalDetected,
      importedCount: options.summary?.importedCount,
      replacedCount: options.summary?.replacedCount,
      skippedMissingFiles: options.summary?.skippedMissingFiles
    };
  }

  const firstReaderTarget = toLibraryReaderTarget(firstRecord);

  return {
    kind: 'imported',
    records,
    firstRecord,
    firstReaderTarget,
    firstReaderHref: firstReaderTarget.href,
    totalDetected: options.summary?.totalDetected,
    importedCount: options.summary?.importedCount,
    replacedCount: options.summary?.replacedCount,
    skippedMissingFiles: options.summary?.skippedMissingFiles
  };
};

export const importBooksFromDesktopPicker = async (): Promise<LibraryImportActionResult> => {
  const filePaths = await selectSystemBookPaths();
  if (filePaths.length === 0) {
    return {
      kind: 'cancelled',
      records: [],
      firstRecord: null,
      firstReaderTarget: null,
      firstReaderHref: ''
    };
  }

  return toImportedReaderActionResult(await importLibraryBooks(filePaths), {
    emptyKind: 'empty'
  });
};

export const importBooksFromReadest = async (): Promise<LibraryImportActionResult> => {
  requireTauriLibraryRuntime('importBooksFromReadest');
  const result = await importReadestLibrary();
  return toImportedReaderActionResult(result.records, {
    emptyKind: 'empty',
    summary: {
      totalDetected: result.totalDetected,
      importedCount: result.importedCount,
      replacedCount: result.replacedCount,
      skippedMissingFiles: result.skippedMissingFiles
    }
  });
};

export const toReaderAssetHref = (book: PersistedLibraryBook) => {
  if (!isTauriDesktop()) return '';
  return toLibraryReaderTarget(book).href;
};

export const toReaderStartHref = (book: PersistedLibraryBook) => {
  if (!isTauriDesktop()) return '';
  return toLibraryReaderTarget(book, { restart: true }).href;
};

export const toLibraryCoverUrl = async (book: PersistedLibraryBook) => {
  if (!isTauriDesktop() || !book.coverPath) return '';

  const [coverDataUrl] = await loadLibraryCoverDataUrls([book.coverPath]);
  return coverDataUrl;
};

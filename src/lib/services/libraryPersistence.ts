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
};

export type ReadestLibrarySummary = {
  available: boolean;
  count: number;
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

export const canPersistLibrary = () => isTauriDesktop();

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
  if (!isTauriDesktop()) return [];

  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    multiple: true,
    filters: [{ name: 'Books', extensions: ['epub', 'pdf', 'mobi', 'azw3', 'fb2'] }]
  });

  if (!selected) return [];
  return Array.isArray(selected) ? selected : [selected];
};

export const importLibraryBooks = async (filePaths: string[]): Promise<PersistedLibraryBook[]> => {
  return invokeTauri<PersistedLibraryBook[]>('import_library_books', {
    filePaths
  });
};

export const importReadestLibrary = async (): Promise<PersistedLibraryBook[]> => {
  return invokeTauri<PersistedLibraryBook[]>('import_readest_library');
};

export const updateLibraryReadingState = async (
  update: LibraryReadingStateUpdate
): Promise<void> => {
  if (!isTauriDesktop()) return;

  await invokeTauri('update_library_reading_state', update);
};

export const loadLibraryBookFile = async (filePath: string): Promise<File> => {
  const binary = await invokeTauri<LibraryBookBinary>('load_library_book_binary', {
    filePath
  });

  const bytes = Uint8Array.from(atob(binary.bytesBase64), (character) => character.charCodeAt(0));
  return new File([bytes], binary.name, { type: binary.mimeType });
};

export const openLibraryBookPath = async (filePath: string): Promise<void> => {
  if (!isTauriDesktop()) return;

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

export const toReaderAssetHref = (book: PersistedLibraryBook) => {
  if (!isTauriDesktop()) return '';

  const params = new URLSearchParams({
    source: 'library-file',
    path: book.filePath,
    label: book.title
  });

  if (typeof book.progressFraction === 'number') {
    params.set('fraction', String(book.progressFraction));
  }

  if (book.progressLocation) {
    params.set('location', book.progressLocation);
  }

  return `/reader?${params.toString()}`;
};

export const toReaderStartHref = (book: PersistedLibraryBook) => {
  if (!isTauriDesktop()) return '';

  const params = new URLSearchParams({
    source: 'library-file',
    path: book.filePath,
    label: book.title
  });

  return `/reader?${params.toString()}`;
};

export const toLibraryCoverUrl = async (book: PersistedLibraryBook) => {
  if (!isTauriDesktop() || !book.coverPath) return '';

  const [coverDataUrl] = await loadLibraryCoverDataUrls([book.coverPath]);
  return coverDataUrl;
};

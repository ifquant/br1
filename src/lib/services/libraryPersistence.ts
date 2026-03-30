export type PersistedLibraryBook = {
  id: string;
  title: string;
  author: string;
  format: string;
  progress: string;
  status: string;
  filePath: string;
  coverPath?: string | null;
  sourcePath?: string | null;
  importedAt: number;
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

const isTauriDesktop = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.location.protocol === 'tauri:' ||
    window.location.hostname === 'tauri.localhost' ||
    '__TAURI_INTERNALS__' in window
  );
};

export const canPersistLibrary = () => isTauriDesktop();

export const loadPersistedLibraryBooks = async (): Promise<PersistedLibraryBook[]> => {
  if (!isTauriDesktop()) return [];
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<PersistedLibraryBook[]>('load_library_books');
};

export const detectReadestLibrary = async (): Promise<ReadestLibrarySummary> => {
  if (!isTauriDesktop()) {
    return { available: false, count: 0 };
  }

  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<ReadestLibrarySummary>('detect_readest_library');
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
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<PersistedLibraryBook[]>('import_library_books', {
    filePaths
  });
};

export const importReadestLibrary = async (): Promise<PersistedLibraryBook[]> => {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<PersistedLibraryBook[]>('import_readest_library');
};

export const loadLibraryBookFile = async (filePath: string): Promise<File> => {
  const { invoke } = await import('@tauri-apps/api/core');
  const binary = await invoke<LibraryBookBinary>('load_library_book_binary', {
    filePath
  });

  const bytes = Uint8Array.from(atob(binary.bytesBase64), (character) => character.charCodeAt(0));
  return new File([bytes], binary.name, { type: binary.mimeType });
};

export const loadLibraryCoverDataUrls = async (
  coverPaths: Array<string | null | undefined>
): Promise<string[]> => {
  if (!isTauriDesktop()) return coverPaths.map(() => '');

  const { invoke } = await import('@tauri-apps/api/core');
  const results = await invoke<Array<string | null>>('load_library_cover_data_urls', {
    coverPaths
  });
  return results.map((value) => value ?? '');
};

export const toReaderAssetHref = async (book: PersistedLibraryBook) => {
  if (!isTauriDesktop()) return '';

  return `/reader?source=library-file&path=${encodeURIComponent(
    book.filePath
  )}&label=${encodeURIComponent(book.title)}`;
};

export const toLibraryCoverUrl = async (book: PersistedLibraryBook) => {
  if (!isTauriDesktop() || !book.coverPath) return '';

  const [coverDataUrl] = await loadLibraryCoverDataUrls([book.coverPath]);
  return coverDataUrl;
};

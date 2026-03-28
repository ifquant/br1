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

export const toReaderAssetHref = async (book: PersistedLibraryBook) => {
  if (!isTauriDesktop()) return '';

  const { convertFileSrc } = await import('@tauri-apps/api/core');
  const assetUrl = convertFileSrc(book.filePath);
  return `/reader?source=asset&url=${encodeURIComponent(assetUrl)}&label=${encodeURIComponent(
    book.title
  )}`;
};

export const toLibraryCoverUrl = async (book: PersistedLibraryBook) => {
  if (!isTauriDesktop() || !book.coverPath) return '';

  const { convertFileSrc } = await import('@tauri-apps/api/core');
  return convertFileSrc(book.coverPath);
};

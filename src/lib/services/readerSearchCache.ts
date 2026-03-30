import type { ReaderSearchResult } from '$lib/reader';

const isTauriDesktop = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.location.protocol === 'tauri:' ||
    window.location.hostname === 'tauri.localhost' ||
    '__TAURI_INTERNALS__' in window
  );
};

export const loadReaderSearchCache = async (
  bookKey: string,
  cacheKey: string
): Promise<ReaderSearchResult[] | null> => {
  if (!isTauriDesktop()) return null;

  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<ReaderSearchResult[] | null>('load_reader_search_cache', {
    bookKey,
    cacheKey
  });
};

export const clearReaderSearchCache = async (bookKey: string): Promise<void> => {
  if (!isTauriDesktop()) return;

  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('clear_reader_search_cache', {
    bookKey
  });
};

export const loadLibraryFileFingerprint = async (filePath: string): Promise<string> => {
  if (!isTauriDesktop()) return filePath;

  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string>('load_library_file_fingerprint', {
    filePath
  });
};

export const saveReaderSearchCache = async (
  bookKey: string,
  cacheKey: string,
  results: ReaderSearchResult[]
): Promise<void> => {
  if (!isTauriDesktop()) return;

  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('save_reader_search_cache', {
    bookKey,
    cacheKey,
    results
  });
};

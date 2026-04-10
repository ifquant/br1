import type { ReaderSearchResult } from '$lib/reader';
import { invokeTauri, isTauriDesktop } from './platform';

export const loadReaderSearchCache = async (
  bookKey: string,
  cacheKey: string
): Promise<ReaderSearchResult[] | null> => {
  if (!isTauriDesktop()) return null;

  return invokeTauri<ReaderSearchResult[] | null>('load_reader_search_cache', {
    bookKey,
    cacheKey
  });
};

export const clearReaderSearchCache = async (bookKey: string): Promise<void> => {
  if (!isTauriDesktop()) return;

  await invokeTauri('clear_reader_search_cache', {
    bookKey
  });
};

export const loadLibraryFileFingerprint = async (filePath: string): Promise<string> => {
  if (!isTauriDesktop()) {
    throw new Error('library-file reader sources require the Tauri desktop runtime');
  }

  return invokeTauri<string>('load_library_file_fingerprint', {
    filePath
  });
};

export const saveReaderSearchCache = async (
  bookKey: string,
  cacheKey: string,
  results: ReaderSearchResult[]
): Promise<void> => {
  if (!isTauriDesktop()) return;

  await invokeTauri('save_reader_search_cache', {
    bookKey,
    cacheKey,
    results
  });
};

// Boundary: this module is the frontend-facing seam to bookmark persistence.
// Keep renderer-side fallback behavior here, and leave storage ownership to the
// desktop command layer.

import type { ReaderBookmark } from '$lib/reader';
import { invokeTauri, isTauriDesktop } from './platform';

export const canPersistReaderBookmarks = () => isTauriDesktop();

export const loadReaderBookmarks = async (bookKey: string): Promise<ReaderBookmark[]> => {
  if (!isTauriDesktop()) return [];

  return invokeTauri<ReaderBookmark[]>('load_reader_bookmarks', {
    bookKey
  });
};

export const saveReaderBookmarks = async (
  bookKey: string,
  bookmarks: ReaderBookmark[]
): Promise<void> => {
  if (!isTauriDesktop()) return;

  await invokeTauri('save_reader_bookmarks', {
    bookKey,
    bookmarks
  });
};

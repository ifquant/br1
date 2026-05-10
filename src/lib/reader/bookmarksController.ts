// Ownership: this helper module defines one reader-domain contract that multiple
// UI surfaces depend on. Keep low-level normalization and invariants here so UI
// code can stay focused on reading semantics rather than format/runtime quirks.

import { get, writable } from 'svelte/store';
import {
  READER_OPENING_LOCATION_LABEL,
  type ReaderBookmark,
  type ReaderBookmarksState,
  type ReaderPreviewState
} from './types';

type ReaderBookmarksControllerOptions = {
  getStorage: () => Storage | undefined;
  getStorageKey: () => string;
  canPersistBookmarks: () => boolean;
  loadPersistedBookmarks: (storageKey: string) => Promise<ReaderBookmark[]>;
  savePersistedBookmarks: (storageKey: string, bookmarks: ReaderBookmark[]) => Promise<void>;
  confirmDelete: (message: string) => boolean;
};

const defaultBookmarksState = (): ReaderBookmarksState => ({
  activeLocator: '',
  bookmarks: []
});

const buildBookmarkLocator = (preview: ReaderPreviewState): string => {
  // Boundary: the locator must stay stable across format-specific progress
  // schemes, so callers compare bookmarks against one normalized identity.
  const normalizedLocation = preview.progressLocation.trim();
  if (normalizedLocation) return normalizedLocation;

  const normalizedChapterHref = preview.chapterHref.trim();
  const normalizedLocationLabel = preview.locationLabel.trim();
  if (normalizedChapterHref && normalizedLocationLabel) {
    return `href:${normalizedChapterHref}::${normalizedLocationLabel}`;
  }
  if (normalizedLocationLabel && normalizedLocationLabel !== READER_OPENING_LOCATION_LABEL) {
    return `location:${normalizedLocationLabel}`;
  }
  if (normalizedChapterHref) {
    return `href:${normalizedChapterHref}`;
  }
  return '';
};

const buildBookmarkTargetHref = (preview: ReaderPreviewState): string => {
  const normalizedLocation = preview.progressLocation.trim();
  if (normalizedLocation) return normalizedLocation;
  return preview.chapterHref.trim();
};

const buildBookmarkKoReaderMetadata = (preview: ReaderPreviewState, updatedAt: number) => {
  const xpointer0 = preview.koreaderProgressLocation.trim();
  if (!xpointer0) return undefined;

  return {
    xpointer0,
    updatedAt,
    text: preview.chapterLabel,
    note: ''
  };
};

export const createReaderBookmarksController = ({
  getStorage,
  getStorageKey,
  canPersistBookmarks,
  loadPersistedBookmarks,
  savePersistedBookmarks,
  confirmDelete
}: ReaderBookmarksControllerOptions) => {
  const state = writable<ReaderBookmarksState>(defaultBookmarksState());
  let lastHydratedStorageKey = '';

  const persist = (bookmarks: ReaderBookmark[]) => {
    const storageKey = getStorageKey();
    lastHydratedStorageKey = storageKey;

    if (canPersistBookmarks()) {
      void savePersistedBookmarks(storageKey, bookmarks);
      return;
    }

    const storage = getStorage();
    if (!storage) return;
    storage.setItem(storageKey, JSON.stringify(bookmarks));
  };

  const refresh = async () => {
    const storageKey = getStorageKey();
    if (storageKey === lastHydratedStorageKey) return;

    // Boundary: switching books invalidates both the active marker and the
    // loaded bookmark list. Clear them before async hydration to avoid showing
    // the previous book's state as if it belonged to the next one.
    state.update((current) => ({
      ...current,
      activeLocator: '',
      bookmarks: []
    }));

    try {
      let nextBookmarks: ReaderBookmark[] = [];
      const storage = getStorage();

      if (canPersistBookmarks()) {
        nextBookmarks = await loadPersistedBookmarks(storageKey);
      } else if (storage) {
        const raw = storage.getItem(storageKey);
        nextBookmarks = raw ? (JSON.parse(raw) as ReaderBookmark[]) : [];
      }

      state.update((current) => ({
        ...current,
        bookmarks: nextBookmarks
      }));
      lastHydratedStorageKey = storageKey;
    } catch (error) {
      console.warn('Failed to restore reader bookmarks', error);
      state.update((current) => ({
        ...current,
        bookmarks: []
      }));
      lastHydratedStorageKey = storageKey;
    }
  };

  const syncPreview = (preview: ReaderPreviewState) => {
    const activeLocator = buildBookmarkLocator(preview);
    state.update((current) => ({
      ...current,
      activeLocator
    }));
  };

  const toggleCurrent = (preview: ReaderPreviewState) => {
    const locator = buildBookmarkLocator(preview);
    const targetHref = buildBookmarkTargetHref(preview);
    if (!locator || !targetHref) return false;
    const createdAt = Date.now();

    const current = get(state);
    const existing = current.bookmarks.find((bookmark) => bookmark.locator === locator);
    const nextBookmarks = existing
      ? current.bookmarks.filter((bookmark) => bookmark.locator !== locator)
      : [
          {
            id: `${locator}:${Date.now()}`,
            locator,
            targetHref,
            chapterLabel: preview.chapterLabel,
            chapterHref: preview.chapterHref,
            progressLabel: preview.progressLabel,
            locationLabel: preview.locationLabel,
            createdAt,
            koreader: buildBookmarkKoReaderMetadata(preview, createdAt)
          },
          ...current.bookmarks
        ];

    state.update((value) => ({
      ...value,
      activeLocator: locator,
      bookmarks: nextBookmarks
    }));
    persist(nextBookmarks);
    return true;
  };

  const remove = (id: string) => {
    const current = get(state);
    const target = current.bookmarks.find((bookmark) => bookmark.id === id);
    if (!target) return false;
    if (!confirmDelete('删除这条书签？')) return false;

    const nextBookmarks = current.bookmarks.filter((bookmark) => bookmark.id !== id);
    state.update((value) => ({
      ...value,
      bookmarks: nextBookmarks
    }));
    persist(nextBookmarks);
    return true;
  };

  return {
    state,
    refresh,
    syncPreview,
    toggleCurrent,
    remove
  };
};

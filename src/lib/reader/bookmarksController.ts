// Ownership: this helper module defines one reader-domain contract that multiple
// UI surfaces depend on. Keep low-level normalization and invariants here so UI
// code can stay focused on reading semantics rather than format/runtime quirks.

import { get, writable } from 'svelte/store';
import {
  READER_OPENING_LOCATION_LABEL,
  isReaderBookmarkCfiLocator,
  matchesReaderBookmarkLocator,
  normalizeReaderBookmark,
  type ReaderBookmark,
  type ReaderBookmarksState,
  type ReaderPreviewState
} from './types.js';

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

const buildBookmarkDestination = (preview: ReaderPreviewState) => {
  // Boundary: the locator must stay stable across format-specific progress
  // schemes, so callers compare bookmarks against one normalized identity.
  const normalizedLocation = preview.progressLocation.trim();
  if (normalizedLocation) {
    const progressLocationOrigin =
      isReaderBookmarkCfiLocator(normalizedLocation) && typeof preview.progressLocationOrigin === 'string'
        ? preview.progressLocationOrigin
        : undefined;
    return {
      locator: normalizedLocation,
      targetHref: normalizedLocation,
      ...(progressLocationOrigin === undefined
        ? {}
        : { locatorOrigin: progressLocationOrigin, targetHrefOrigin: progressLocationOrigin })
    };
  }

  const normalizedChapterHref = preview.chapterHref.trim();
  const normalizedLocationLabel = preview.locationLabel.trim();
  if (normalizedChapterHref && normalizedLocationLabel) {
    return {
      locator: `href:${normalizedChapterHref}::${normalizedLocationLabel}`,
      targetHref: normalizedChapterHref
    };
  }
  if (normalizedLocationLabel && normalizedLocationLabel !== READER_OPENING_LOCATION_LABEL) {
    return { locator: `location:${normalizedLocationLabel}`, targetHref: normalizedChapterHref };
  }
  if (normalizedChapterHref) {
    return { locator: `href:${normalizedChapterHref}`, targetHref: normalizedChapterHref };
  }
  return { locator: '', targetHref: '' };
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
  const blockedStorageKeys = new Set<string>();
  let hydrationId = 0;

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
    lastHydratedStorageKey = '';
    const requestId = ++hydrationId;
    const isCurrent = () => requestId === hydrationId && storageKey === getStorageKey();
    // An unreadable list is not an empty list. Keep writes blocked through
    // failure/retry until this book's current load has validated all records.
    blockedStorageKeys.add(storageKey);

    // Boundary: switching books invalidates both the active marker and the
    // loaded bookmark list. Clear them before async hydration to avoid showing
    // the previous book's state as if it belonged to the next one.
    state.update((current) => ({
      ...current,
      activeLocator: '',
      activeLocatorOrigin: undefined,
      loadError: undefined,
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

      const bookmarks = nextBookmarks.map(normalizeReaderBookmark);
      if (!isCurrent()) return;
      state.update((current) => ({
        ...current,
        bookmarks,
        loadError: undefined
      }));
      blockedStorageKeys.delete(storageKey);
      lastHydratedStorageKey = storageKey;
    } catch (error) {
      if (!isCurrent()) return;
      console.warn('Failed to restore reader bookmarks', error);
      state.update((current) => ({
        ...current,
        bookmarks: [],
        loadError: '书签读取失败，已暂停保存。请重新打开本书重试。'
      }));
      // Do not mark a failed read as hydrated: refresh can retry after repair.
    }
  };

  const syncPreview = (preview: ReaderPreviewState) => {
    const destination = buildBookmarkDestination(preview);
    state.update((current) => ({
      ...current,
      activeLocator: destination.locator,
      activeLocatorOrigin: destination.locatorOrigin
    }));
  };

  const toggleCurrent = (preview: ReaderPreviewState) => {
    if (blockedStorageKeys.has(getStorageKey())) return false;
    const destination = buildBookmarkDestination(preview);
    const { locator, targetHref, locatorOrigin, targetHrefOrigin } = destination;
    if (!locator || !targetHref) return false;
    const createdAt = Date.now();

    const current = get(state);
    const existing = current.bookmarks.find((bookmark) =>
      matchesReaderBookmarkLocator(bookmark, locator, locatorOrigin)
    );
    const nextBookmarks = existing
      ? current.bookmarks.filter(
          (bookmark) => !matchesReaderBookmarkLocator(bookmark, locator, locatorOrigin)
        )
      : [
          {
            id: isReaderBookmarkCfiLocator(locator)
              ? `${JSON.stringify([locatorOrigin ?? null, locator])}:${createdAt}`
              : `${locator}:${createdAt}`,
            locator,
            targetHref,
            ...(locatorOrigin === undefined ? {} : { locatorOrigin }),
            ...(targetHrefOrigin === undefined ? {} : { targetHrefOrigin }),
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
      activeLocatorOrigin: locatorOrigin,
      bookmarks: nextBookmarks
    }));
    persist(nextBookmarks);
    return true;
  };

  const remove = (id: string) => {
    if (blockedStorageKeys.has(getStorageKey())) return false;
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

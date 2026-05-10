// Ownership: this library module keeps route URL and scroll runtime state aligned with the
// current browse/filter surface. It depends on navigation helpers and page bindings, but it
// should not redefine browse semantics or desktop-only capabilities.
import {
  buildLibraryBrowseHref,
  getNormalizedLibraryBrowseState,
  isSameLibraryBrowseStateShape
} from './navigation';
import type { LibraryBrowseState, LibraryGroupSegment, LibraryShelfBook } from './types';

type SyncLibraryBrowseLocationArgs = {
  currentUrl: URL;
  state: LibraryBrowseState;
  goto: (
    href: string,
    options: {
      replaceState: boolean;
      noScroll: boolean;
      keepFocus: boolean;
      invalidateAll: boolean;
    }
  ) => Promise<void>;
};

export const buildLibraryBrowseLocationBindings = (options: {
  getCurrentState: () => LibraryBrowseState;
  getCurrentUrl: () => URL;
  goto: SyncLibraryBrowseLocationArgs['goto'];
}) => ({
  getCurrentBrowseState: options.getCurrentState,
  syncBrowseState: (state: LibraryBrowseState) =>
    syncLibraryBrowseLocation({
      currentUrl: options.getCurrentUrl(),
      state,
      goto: options.goto
    })
});

type LibraryScrollContextKeyArgs = {
  desktopLibraryMode: boolean;
  viewMode: 'grid' | 'list';
  sortBy: 'recent' | 'added' | 'title' | 'author' | 'format';
  groupBy: 'none' | 'author' | 'collection' | 'format';
  groupScope: string;
  trail: LibraryGroupSegment[];
  filterBy: 'all' | 'reading' | 'unstarted' | 'finished';
  formatFilter: string;
  collectionFilter: string;
  tagFilter: string;
  normalizedQuery: string;
  searchActive: boolean;
};

export const syncLibraryBrowseLocation = async ({
  currentUrl,
  state,
  goto
}: SyncLibraryBrowseLocationArgs) => {
  // Boundary: URL sync is the only route side effect here; the actual browse state has already
  // been validated upstream so runtime helpers do not invent new group transitions.
  const nextHref = buildLibraryBrowseHref(currentUrl, state);
  const currentHref = `${currentUrl.pathname}${currentUrl.search}`;
  if (nextHref === currentHref) return;

  await goto(nextHref, {
    replaceState: true,
    noScroll: true,
    keepFocus: true,
    invalidateAll: false
  });
};

export const normalizeLibraryBrowseLocation = async ({
  currentUrl,
  state,
  desktopShelfBooks,
  starterShelfBooks,
  goto
}: SyncLibraryBrowseLocationArgs & {
  desktopShelfBooks: LibraryShelfBook[];
  starterShelfBooks: LibraryShelfBook[];
}) => {
  const normalizedState = getNormalizedLibraryBrowseState(
    state,
    desktopShelfBooks,
    starterShelfBooks
  );

  if (isSameLibraryBrowseStateShape(normalizedState, state)) return;

  await syncLibraryBrowseLocation({
    currentUrl,
    state: normalizedState,
    goto
  });
};

export const buildLibraryScrollContextKey = ({
  desktopLibraryMode,
  viewMode,
  sortBy,
  groupBy,
  groupScope,
  trail,
  filterBy,
  formatFilter,
  collectionFilter,
  tagFilter,
  normalizedQuery,
  searchActive
}: LibraryScrollContextKeyArgs) =>
  [
    'br1-library-scroll',
    desktopLibraryMode ? 'desktop' : 'web',
    viewMode,
    sortBy,
    groupBy,
    groupScope || 'all-groups',
    trail.map((segment) => `${segment.groupBy}:${segment.label}`).join('>') || 'root',
    filterBy,
    formatFilter,
    collectionFilter,
    tagFilter,
    searchActive ? normalizedQuery : 'browse'
  ].join(':');

export const buildLibraryScrollContextKeyFromPageState = ({
  desktopLibraryMode,
  viewMode,
  sortBy,
  browseState,
  filterBy,
  formatFilter,
  collectionFilter,
  tagFilter,
  query
}: {
  desktopLibraryMode: boolean;
  viewMode: 'grid' | 'list';
  sortBy: 'recent' | 'added' | 'title' | 'author' | 'format';
  browseState: LibraryBrowseState;
  filterBy: 'all' | 'reading' | 'unstarted' | 'finished';
  formatFilter: string;
  collectionFilter: string;
  tagFilter: string;
  query: string;
}) =>
  buildLibraryScrollContextKey({
    desktopLibraryMode,
    viewMode,
    sortBy,
    groupBy: browseState.groupBy,
    groupScope: browseState.groupScope,
    trail: browseState.trail,
    filterBy,
    formatFilter,
    collectionFilter,
    tagFilter,
    normalizedQuery: query.trim().toLowerCase(),
    searchActive: query.trim().length > 0
  });

export const syncLibraryViewportScrollContextFromPageState = async ({
  currentKey,
  setCurrentKey,
  storage,
  getViewport,
  desktopLibraryMode,
  viewMode,
  sortBy,
  browseState,
  filterBy,
  formatFilter,
  collectionFilter,
  tagFilter,
  query,
  afterViewportReady
}: {
  currentKey: string;
  setCurrentKey: (key: string) => void;
  storage: Storage;
  getViewport: () => HTMLElement | null;
  desktopLibraryMode: boolean;
  viewMode: 'grid' | 'list';
  sortBy: 'recent' | 'added' | 'title' | 'author' | 'format';
  browseState: LibraryBrowseState;
  filterBy: 'all' | 'reading' | 'unstarted' | 'finished';
  formatFilter: string;
  collectionFilter: string;
  tagFilter: string;
  query: string;
  afterViewportReady?: () => Promise<void>;
}) => {
  const nextKey = buildLibraryScrollContextKeyFromPageState({
    desktopLibraryMode,
    viewMode,
    sortBy,
    browseState,
    filterBy,
    formatFilter,
    collectionFilter,
    tagFilter,
    query
  });

  if (nextKey === currentKey) return;

  setCurrentKey(nextKey);

  await syncLibraryViewportScrollContext({
    previousKey: currentKey,
    nextKey,
    storage,
    getViewport,
    afterViewportReady
  });
};

export const saveLibraryScrollPosition = ({
  storage,
  contextKey,
  scrollTop
}: {
  storage: Storage;
  contextKey: string;
  scrollTop: number;
}) => {
  if (!contextKey) return;
  storage.setItem(contextKey, String(scrollTop));
};

export const restoreLibraryScrollPosition = ({
  storage,
  contextKey
}: {
  storage: Storage;
  contextKey: string;
}) => {
  if (!contextKey) return 0;
  const savedPosition = storage.getItem(contextKey);
  return savedPosition ? Number(savedPosition) || 0 : 0;
};

export const saveLibraryViewportScrollPosition = ({
  storage,
  contextKey,
  getViewport
}: {
  storage: Storage;
  contextKey: string;
  getViewport: () => HTMLElement | null;
}) => {
  if (!contextKey) return;
  const viewport = getViewport();
  if (!viewport) return;
  saveLibraryScrollPosition({
    storage,
    contextKey,
    scrollTop: viewport.scrollTop
  });
};

export const restoreLibraryViewportScrollPosition = async ({
  storage,
  contextKey,
  getViewport,
  afterViewportReady
}: {
  storage: Storage;
  contextKey: string;
  getViewport: () => HTMLElement | null;
  afterViewportReady?: () => Promise<void>;
}) => {
  if (!contextKey) return;
  await afterViewportReady?.();
  const viewport = getViewport();
  if (!viewport) return;
  viewport.scrollTop = restoreLibraryScrollPosition({
    storage,
    contextKey
  });
};

export const syncLibraryViewportScrollContext = async ({
  previousKey,
  nextKey,
  storage,
  getViewport,
  afterViewportReady
}: {
  previousKey: string;
  nextKey: string;
  storage: Storage;
  getViewport: () => HTMLElement | null;
  afterViewportReady?: () => Promise<void>;
}) => {
  if (previousKey) {
    saveLibraryViewportScrollPosition({
      storage,
      contextKey: previousKey,
      getViewport
    });
  }
  await restoreLibraryViewportScrollPosition({
    storage,
    contextKey: nextKey,
    getViewport,
    afterViewportReady
  });
};

type InstallLibrarySurfaceRuntimeArgs = {
  win: Window;
  doc: Document;
  canPersistLibrary: boolean;
  reloadEventName: string;
  getViewport: () => HTMLElement | null;
  onRefreshLibrary: () => void | Promise<void>;
  onSaveScrollPosition: (contextKey: string) => void;
  getScrollContextKey: () => string;
};

export const buildLibrarySurfaceRuntimeBindings = ({
  win,
  doc,
  canPersistLibrary,
  reloadEventName,
  getViewport,
  onRefreshLibrary,
  getScrollContextKey
}: {
  win: Window;
  doc: Document;
  canPersistLibrary: boolean;
  reloadEventName: string;
  getViewport: () => HTMLElement | null;
  onRefreshLibrary: () => void | Promise<void>;
  getScrollContextKey: () => string;
}): InstallLibrarySurfaceRuntimeArgs => ({
  win,
  doc,
  canPersistLibrary,
  reloadEventName,
  getViewport,
  onRefreshLibrary,
  onSaveScrollPosition: (contextKey) => {
    saveLibraryViewportScrollPosition({
      storage: win.sessionStorage,
      contextKey,
      getViewport
    });
  },
  getScrollContextKey
});

export const installLibrarySurfaceRuntime = ({
  win,
  doc,
  canPersistLibrary,
  reloadEventName,
  getViewport,
  onRefreshLibrary,
  onSaveScrollPosition,
  getScrollContextKey
}: InstallLibrarySurfaceRuntimeArgs) => {
  void onRefreshLibrary();

  const handleBeforeUnload = () => {
    onSaveScrollPosition(getScrollContextKey());
  };

  const handleWindowFocus = () => {
    void onRefreshLibrary();
  };

  const handleVisibilityChange = () => {
    if (doc.visibilityState !== 'visible') return;
    void onRefreshLibrary();
  };

  const attachViewportListener = () => {
    const viewport = getViewport();
    if (!viewport) return () => {};
    const handleScroll = () => {
      onSaveScrollPosition(getScrollContextKey());
    };
    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      viewport.removeEventListener('scroll', handleScroll);
    };
  };

  let detachViewportListener = attachViewportListener();
  const refreshViewportListener = win.setInterval(() => {
    const viewport = getViewport();
    if (!viewport) return;
    detachViewportListener();
    detachViewportListener = attachViewportListener();
    win.clearInterval(refreshViewportListener);
  }, 120);

  win.addEventListener('beforeunload', handleBeforeUnload);
  win.addEventListener('focus', handleWindowFocus);
  doc.addEventListener('visibilitychange', handleVisibilityChange);

  let detachLibraryReloadListener = () => {};
  if (canPersistLibrary) {
    void (async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        detachLibraryReloadListener = await getCurrentWindow().listen(reloadEventName, () => {
          void onRefreshLibrary();
        });
      } catch (error) {
        console.warn('Failed to attach the library surface reload listener', error);
      }
    })();
  }

  return () => {
    win.clearInterval(refreshViewportListener);
    detachViewportListener();
    detachLibraryReloadListener();
    win.removeEventListener('beforeunload', handleBeforeUnload);
    win.removeEventListener('focus', handleWindowFocus);
    doc.removeEventListener('visibilitychange', handleVisibilityChange);
    onSaveScrollPosition(getScrollContextKey());
  };
};

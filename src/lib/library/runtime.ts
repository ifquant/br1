import { buildLibraryBrowseHref } from './navigation';
import type { LibraryBrowseState, LibraryGroupSegment } from './types';

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

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

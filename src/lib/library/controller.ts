import { getNextLibraryBrowseState } from './navigation';
import type {
  LibraryActiveFilterChip,
  LibraryBrowseAction,
  LibraryBookMetadataUpdate,
  LibraryBrowseState,
  LibraryFilterControlsState,
  LibraryNoticeState,
  LibraryPageActions,
  LibraryShelfBook
} from './types';

export const createLibraryNotice = (
  kind: 'error' | 'info',
  message: string,
  action?: { label: string; run: () => void | Promise<void> }
): LibraryNoticeState => ({
  kind,
  message,
  actionLabel: action?.label,
  action: action?.run
});

export const runLibraryNoticeAction = (notice: LibraryNoticeState | null) => {
  if (!notice?.action) return;
  void notice.action();
};

export const buildLibraryFilterControlsState = ({
  query,
  filterBy,
  formatFilter,
  collectionFilter,
  tagFilter
}: {
  query: string;
  filterBy: LibraryFilterControlsState['filterBy'];
  formatFilter: string;
  collectionFilter: string;
  tagFilter: string;
}): LibraryFilterControlsState => ({
  query,
  filterBy,
  formatFilter,
  collectionFilter,
  tagFilter
});

export const buildCurrentLibraryFilterControlsState = (options: {
  query: string;
  filterBy: LibraryFilterControlsState['filterBy'];
  formatFilter: string;
  collectionFilter: string;
  tagFilter: string;
}) =>
  buildLibraryFilterControlsState({
    query: options.query,
    filterBy: options.filterBy,
    formatFilter: options.formatFilter,
    collectionFilter: options.collectionFilter,
    tagFilter: options.tagFilter
  });

export const applyLibraryFilterControlsState = ({
  next,
  setQuery,
  setFilterBy,
  setFormatFilter,
  setCollectionFilter,
  setTagFilter
}: {
  next: LibraryFilterControlsState;
  setQuery: (query: string) => void;
  setFilterBy: (filterBy: LibraryFilterControlsState['filterBy']) => void;
  setFormatFilter: (formatFilter: string) => void;
  setCollectionFilter: (collectionFilter: string) => void;
  setTagFilter: (tagFilter: string) => void;
}) => {
  setQuery(next.query);
  setFilterBy(next.filterBy);
  setFormatFilter(next.formatFilter);
  setCollectionFilter(next.collectionFilter);
  setTagFilter(next.tagFilter);
};

export const buildLibraryFilterControlsBindings = (options: {
  getCurrentState: () => LibraryFilterControlsState;
  setQuery: (query: string) => void;
  setFilterBy: (filterBy: LibraryFilterControlsState['filterBy']) => void;
  setFormatFilter: (formatFilter: string) => void;
  setCollectionFilter: (collectionFilter: string) => void;
  setTagFilter: (tagFilter: string) => void;
}) => ({
  getCurrentFilterControlsState: options.getCurrentState,
  applyFilterControlsState: (next: LibraryFilterControlsState) =>
    applyLibraryFilterControlsState({
      next,
      setQuery: options.setQuery,
      setFilterBy: options.setFilterBy,
      setFormatFilter: options.setFormatFilter,
      setCollectionFilter: options.setCollectionFilter,
      setTagFilter: options.setTagFilter
    })
});

export const getNormalizedLibraryFilterControlsState = ({
  current,
  formatOptions,
  collectionOptions,
  tagOptions
}: {
  current: LibraryFilterControlsState;
  formatOptions: string[];
  collectionOptions: string[];
  tagOptions: string[];
}): LibraryFilterControlsState => {
  const formatFilter =
    current.formatFilter === 'all' || formatOptions.includes(current.formatFilter)
      ? current.formatFilter
      : 'all';
  const collectionFilter =
    current.collectionFilter === 'all' || collectionOptions.includes(current.collectionFilter)
      ? current.collectionFilter
      : 'all';
  const tagFilter =
    current.tagFilter === 'all' || tagOptions.includes(current.tagFilter) ? current.tagFilter : 'all';

  if (
    formatFilter === current.formatFilter &&
    collectionFilter === current.collectionFilter &&
    tagFilter === current.tagFilter
  ) {
    return current;
  }

  return {
    ...current,
    formatFilter,
    collectionFilter,
    tagFilter
  };
};

type LibraryFilterControlsAction =
  | {
      type: 'set-query';
      query: string;
    }
  | {
      type: 'set-status';
      filterBy: LibraryFilterControlsState['filterBy'];
    }
  | {
      type: 'set-format';
      format: string;
    }
  | {
      type: 'set-collection';
      collection: string;
    }
  | {
      type: 'set-tag';
      tag: string;
    }
  | {
      type: 'reset-all';
    }
  | {
      type: 'clear-chip';
      id: LibraryActiveFilterChip['id'];
    }
  | {
      type: 'apply-shelf-status';
      filterBy: Exclude<LibraryFilterControlsState['filterBy'], 'all'>;
    }
  | {
      type: 'apply-shelf-collection';
      collection: string;
    }
  | {
      type: 'apply-shelf-format';
      format: string;
    }
  | {
      type: 'apply-shelf-tag';
      tag: string;
    };

export const getNextLibraryFilterControlsState = (
  current: LibraryFilterControlsState,
  action: LibraryFilterControlsAction
): LibraryFilterControlsState => {
  if (action.type === 'set-query') {
    return { ...current, query: action.query };
  }

  if (action.type === 'set-status') {
    return { ...current, filterBy: action.filterBy };
  }

  if (action.type === 'set-format') {
    return { ...current, formatFilter: action.format };
  }

  if (action.type === 'set-collection') {
    return { ...current, collectionFilter: action.collection };
  }

  if (action.type === 'set-tag') {
    return { ...current, tagFilter: action.tag };
  }

  if (action.type === 'reset-all') {
    return {
      query: '',
      filterBy: 'all',
      formatFilter: 'all',
      collectionFilter: 'all',
      tagFilter: 'all'
    };
  }

  if (action.type === 'clear-chip') {
    if (action.id === 'query') return { ...current, query: '' };
    if (action.id === 'status') return { ...current, filterBy: 'all' };
    if (action.id === 'format') return { ...current, formatFilter: 'all' };
    if (action.id === 'collection') return { ...current, collectionFilter: 'all' };
    return { ...current, tagFilter: 'all' };
  }

  if (action.type === 'apply-shelf-status') {
    return {
      query: '',
      filterBy: action.filterBy,
      formatFilter: 'all',
      collectionFilter: 'all',
      tagFilter: 'all'
    };
  }

  if (action.type === 'apply-shelf-collection') {
    return {
      query: '',
      filterBy: 'all',
      formatFilter: 'all',
      collectionFilter: action.collection,
      tagFilter: 'all'
    };
  }

  if (action.type === 'apply-shelf-format') {
    return {
      query: '',
      filterBy: 'all',
      formatFilter: action.format.trim().toUpperCase() || 'all',
      collectionFilter: 'all',
      tagFilter: 'all'
    };
  }

  return {
    query: '',
    filterBy: 'all',
    formatFilter: 'all',
    collectionFilter: 'all',
    tagFilter: action.tag
  };
};

export const getAppliedLibraryBrowseState = (
  current: LibraryBrowseState,
  action: LibraryBrowseAction
) => {
  const result = getNextLibraryBrowseState(current, action);
  return result.kind === 'applied' ? result.state : null;
};

export const buildCurrentLibraryBrowseState = ({
  groupBy,
  groupScope,
  trail
}: LibraryBrowseState): LibraryBrowseState => ({
  groupBy,
  groupScope,
  trail
});

export const buildLibraryBrowseActionDispatcher = (options: {
  getCurrentBrowseState: () => LibraryBrowseState;
  syncBrowseState: (state: LibraryBrowseState) => void | Promise<void>;
}) => {
  return async (action: LibraryBrowseAction) => {
    const nextState = getAppliedLibraryBrowseState(options.getCurrentBrowseState(), action);
    if (!nextState) return;
    await options.syncBrowseState(nextState);
  };
};

export const buildLibraryPageActionStateBindings = (options: {
  filterControlsBindings: Pick<
    Parameters<typeof buildLibraryPageActionSet>[0],
    'getCurrentFilterControlsState' | 'applyFilterControlsState'
  >;
  browseLocationBindings: Pick<
    Parameters<typeof buildLibraryPageActionSet>[0],
    'getCurrentBrowseState' | 'syncBrowseState'
  >;
  setSortBy: (sortBy: 'recent' | 'added' | 'title' | 'author' | 'format') => void | Promise<void>;
  setViewMode: (viewMode: 'grid' | 'list') => void | Promise<void>;
}) => ({
  ...options.filterControlsBindings,
  ...options.browseLocationBindings,
  setSortBy: options.setSortBy,
  setViewMode: options.setViewMode
});

export const buildLibraryPageActions = (options: {
  onImportChange: (event: Event) => void | Promise<void>;
  onDispatchBrowseAction: (action: LibraryBrowseAction) => void | Promise<void>;
  onRunNoticeAction: () => void | Promise<void>;
  onClearNotice: () => void | Promise<void>;
  onReadestMigration: () => void | Promise<void>;
  onOpenLink: (href: string) => void | Promise<void>;
  onImportBooks: () => void | Promise<void>;
  onOpenSourcePath: (filePath: string) => void | Promise<void>;
  onUpdateBookMetadata: (
    book: LibraryShelfBook,
    metadata: LibraryBookMetadataUpdate
  ) => void | Promise<void>;
  onRemoveBook: (book: LibraryShelfBook) => void | Promise<void>;
  getCurrentFilterControlsState: () => LibraryFilterControlsState;
  applyFilterControlsState: (next: LibraryFilterControlsState) => void;
  setSortBy: (sortBy: 'recent' | 'added' | 'title' | 'author' | 'format') => void | Promise<void>;
  setViewMode: (viewMode: 'grid' | 'list') => void | Promise<void>;
}): LibraryPageActions => ({
  onImportChange: options.onImportChange,
  onDispatchBrowseAction: options.onDispatchBrowseAction,
  onRunNoticeAction: options.onRunNoticeAction,
  onClearNotice: options.onClearNotice,
  onReadestMigration: options.onReadestMigration,
  onOpenLink: options.onOpenLink,
  onImportBooks: options.onImportBooks,
  onOpenSourcePath: options.onOpenSourcePath,
  onUpdateBookMetadata: options.onUpdateBookMetadata,
  onRemoveBook: options.onRemoveBook,
  onFilterStatus: (status) => {
    options.applyFilterControlsState(
      getNextLibraryFilterControlsState(options.getCurrentFilterControlsState(), {
        type: 'apply-shelf-status',
        filterBy: status
      })
    );
  },
  onFilterFormat: (format) => {
    options.applyFilterControlsState(
      getNextLibraryFilterControlsState(options.getCurrentFilterControlsState(), {
        type: 'apply-shelf-format',
        format
      })
    );
  },
  onFilterCollection: (collection) => {
    options.applyFilterControlsState(
      getNextLibraryFilterControlsState(options.getCurrentFilterControlsState(), {
        type: 'apply-shelf-collection',
        collection
      })
    );
  },
  onFilterTag: (tag) => {
    options.applyFilterControlsState(
      getNextLibraryFilterControlsState(options.getCurrentFilterControlsState(), {
        type: 'apply-shelf-tag',
        tag
      })
    );
  },
  onQueryChange: (query) => {
    options.applyFilterControlsState(
      getNextLibraryFilterControlsState(options.getCurrentFilterControlsState(), {
        type: 'set-query',
        query
      })
    );
  },
  onFilterChange: (filterBy) => {
    options.applyFilterControlsState(
      getNextLibraryFilterControlsState(options.getCurrentFilterControlsState(), {
        type: 'set-status',
        filterBy
      })
    );
  },
  onFormatFilterChange: (format) => {
    options.applyFilterControlsState(
      getNextLibraryFilterControlsState(options.getCurrentFilterControlsState(), {
        type: 'set-format',
        format
      })
    );
  },
  onCollectionFilterChange: (collection) => {
    options.applyFilterControlsState(
      getNextLibraryFilterControlsState(options.getCurrentFilterControlsState(), {
        type: 'set-collection',
        collection
      })
    );
  },
  onTagFilterChange: (tag) => {
    options.applyFilterControlsState(
      getNextLibraryFilterControlsState(options.getCurrentFilterControlsState(), {
        type: 'set-tag',
        tag
      })
    );
  },
  onClearFilterChip: (id) => {
    options.applyFilterControlsState(
      getNextLibraryFilterControlsState(options.getCurrentFilterControlsState(), {
        type: 'clear-chip',
        id
      })
    );
  },
  onClearFilters: () => {
    options.applyFilterControlsState(
      getNextLibraryFilterControlsState(options.getCurrentFilterControlsState(), {
        type: 'reset-all'
      })
    );
  },
  onJumpTrail: (index) => {
    void options.onDispatchBrowseAction({
      type: 'jump-trail',
      index
    });
  },
  onSortChange: options.setSortBy,
  onViewModeChange: options.setViewMode
});

export const buildLibraryPageActionSet = (options: {
  onImportChange: (event: Event) => void | Promise<void>;
  onRunNoticeAction: () => void | Promise<void>;
  onClearNotice: () => void | Promise<void>;
  onReadestMigration: () => void | Promise<void>;
  onOpenLink: (href: string) => void | Promise<void>;
  onImportBooks: () => void | Promise<void>;
  onOpenSourcePath: (filePath: string) => void | Promise<void>;
  onUpdateBookMetadata: (
    book: LibraryShelfBook,
    metadata: LibraryBookMetadataUpdate
  ) => void | Promise<void>;
  onRemoveBook: (book: LibraryShelfBook) => void | Promise<void>;
  getCurrentFilterControlsState: () => LibraryFilterControlsState;
  applyFilterControlsState: (next: LibraryFilterControlsState) => void;
  getCurrentBrowseState: () => LibraryBrowseState;
  syncBrowseState: (state: LibraryBrowseState) => void | Promise<void>;
  setSortBy: (sortBy: 'recent' | 'added' | 'title' | 'author' | 'format') => void | Promise<void>;
  setViewMode: (viewMode: 'grid' | 'list') => void | Promise<void>;
}): LibraryPageActions =>
  buildLibraryPageActions({
    onImportChange: options.onImportChange,
    onDispatchBrowseAction: buildLibraryBrowseActionDispatcher({
      getCurrentBrowseState: options.getCurrentBrowseState,
      syncBrowseState: options.syncBrowseState
    }),
    onRunNoticeAction: options.onRunNoticeAction,
    onClearNotice: options.onClearNotice,
    onReadestMigration: options.onReadestMigration,
    onOpenLink: options.onOpenLink,
    onImportBooks: options.onImportBooks,
    onOpenSourcePath: options.onOpenSourcePath,
    onUpdateBookMetadata: options.onUpdateBookMetadata,
    onRemoveBook: options.onRemoveBook,
    getCurrentFilterControlsState: options.getCurrentFilterControlsState,
    applyFilterControlsState: options.applyFilterControlsState,
    setSortBy: options.setSortBy,
    setViewMode: options.setViewMode
  });

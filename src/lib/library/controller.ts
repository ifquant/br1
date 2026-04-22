import { getNextLibraryBrowseState } from './navigation';
import type {
  LibraryActiveFilterChip,
  LibraryBrowseAction,
  LibraryBrowseState,
  LibraryFilterControlsState,
  LibraryNoticeState
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

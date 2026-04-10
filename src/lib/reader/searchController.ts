import { get, writable } from 'svelte/store';
import type {
  ReaderSearchConfig,
  ReaderSearchState,
  ReaderSidebarSearchState
} from './types';

type ReaderSearchControllerOptions = {
  getStorage: () => Storage | undefined;
  getHistoryKey: () => string;
  dispatchSearch: (query: string, config: ReaderSearchConfig) => void;
  dispatchSearchResult: (cfi: string) => void;
  dispatchClearSearchCache: () => void;
};

const defaultSearchConfig = (): ReaderSearchConfig => ({
  scope: 'book',
  matchCase: false,
  matchWholeWords: false,
  matchDiacritics: false
});

const defaultSearchState = (): ReaderSidebarSearchState => ({
  term: '',
  status: 'idle',
  results: [],
  error: '',
  progress: 0,
  history: [],
  config: defaultSearchConfig(),
  cacheKey: '',
  notice: null,
  activeResultCfi: '',
  recentResultCfi: ''
});

export const createReaderSearchController = ({
  getStorage,
  getHistoryKey,
  dispatchSearch,
  dispatchSearchResult,
  dispatchClearSearchCache
}: ReaderSearchControllerOptions) => {
  const state = writable<ReaderSidebarSearchState>(defaultSearchState());
  let canPersistPrefs = false;
  let lastHistoryKey = '';
  let noticeTimer: ReturnType<typeof setTimeout> | null = null;

  const setNotice = (kind: 'success' | 'error', message: string) => {
    state.update((current) => ({
      ...current,
      notice: { kind, message }
    }));

    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      state.update((current) => ({
        ...current,
        notice: null
      }));
    }, 2500);
  };

  const restoreConfig = () => {
    const storage = getStorage();
    if (!storage) return;

    try {
      const raw = storage.getItem('br1.reader.search.config');
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ReaderSearchConfig>;
      state.update((current) => ({
        ...current,
        config: {
          scope: parsed.scope === 'section' ? 'section' : 'book',
          matchCase: !!parsed.matchCase,
          matchWholeWords: !!parsed.matchWholeWords,
          matchDiacritics: !!parsed.matchDiacritics
        }
      }));
    } catch (error) {
      console.warn('Failed to restore reader search config', error);
    }
  };

  const refreshHistory = () => {
    const storage = getStorage();
    if (!storage) return;

    const key = getHistoryKey();
    if (key === lastHistoryKey) return;

    try {
      const raw = storage.getItem(key);
      state.update((current) => ({
        ...current,
        history: raw ? (JSON.parse(raw) as string[]) : []
      }));
      lastHistoryKey = key;
    } catch (error) {
      console.warn('Failed to restore reader search history', error);
      state.update((current) => ({
        ...current,
        history: []
      }));
      lastHistoryKey = key;
    }
  };

  const enablePersistence = () => {
    canPersistPrefs = true;
  };

  const persist = (current: ReaderSidebarSearchState) => {
    const storage = getStorage();
    if (!canPersistPrefs || !storage) return;

    storage.setItem('br1.reader.search.config', JSON.stringify(current.config));
    storage.setItem(getHistoryKey(), JSON.stringify(current.history.slice(0, 10)));
  };

  const issueSearch = (query: string) => {
    state.update((current) => ({
      ...current,
      term: query,
      recentResultCfi: ''
    }));

    const current = get(state);
    dispatchSearch(query, current.config);
  };

  const issueSearchResult = (cfi: string) => {
    state.update((current) => ({
      ...current,
      recentResultCfi: cfi
    }));
    dispatchSearchResult(cfi);
  };

  const updateConfig = (config: ReaderSearchConfig) => {
    state.update((current) => ({
      ...current,
      config
    }));

    const current = get(state);
    if (current.term.trim()) {
      dispatchSearch(current.term, config);
    }
  };

  const clearHistory = () => {
    state.update((current) => ({
      ...current,
      history: []
    }));
  };

  const clearCurrentBookCache = () => {
    const current = get(state);
    if (!current.cacheKey) return;

    dispatchClearSearchCache();
    setNotice('success', '已清空当前书的搜索缓存。');
  };

  const handleSearchChange = (detail: ReaderSearchState) => {
    state.update((current) => {
      const nextHistory =
        detail.status === 'done' && detail.query.trim() && detail.results.length > 0
          ? [detail.query, ...current.history.filter((item) => item !== detail.query)].slice(0, 10)
          : current.history;

      return {
        ...current,
        term: detail.query,
        status: detail.status,
        results: detail.results,
        progress: detail.progress ?? 0,
        error: detail.error ?? '',
        history: nextHistory,
        recentResultCfi: detail.status === 'idle' ? '' : current.recentResultCfi
      };
    });

    if (detail.status === 'error') {
      setNotice('error', detail.error ?? '正文搜索失败。');
    }
  };

  const setCacheKey = (cacheKey: string) => {
    state.update((current) => ({
      ...current,
      cacheKey
    }));
  };

  const setActiveResultCfi = (activeResultCfi: string) => {
    state.update((current) => ({
      ...current,
      activeResultCfi
    }));
  };

  const clearRecentResultCfi = () => {
    state.update((current) => ({
      ...current,
      recentResultCfi: ''
    }));
  };

  const destroy = () => {
    if (noticeTimer) clearTimeout(noticeTimer);
  };

  return {
    state,
    restoreConfig,
    refreshHistory,
    enablePersistence,
    persist,
    issueSearch,
    issueSearchResult,
    updateConfig,
    clearHistory,
    clearCurrentBookCache,
    handleSearchChange,
    setCacheKey,
    setActiveResultCfi,
    clearRecentResultCfi,
    destroy
  };
};

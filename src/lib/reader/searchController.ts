import { get, writable } from 'svelte/store';
import type {
  ReaderSearchConfig,
  ReaderSearchHistoryEntry,
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

const normalizeSearchConfig = (value: Partial<ReaderSearchConfig> | null | undefined): ReaderSearchConfig => ({
  scope: value?.scope === 'section' ? 'section' : 'book',
  matchCase: !!value?.matchCase,
  matchWholeWords: !!value?.matchWholeWords,
  matchDiacritics: !!value?.matchDiacritics
});

const buildSearchHistoryId = (query: string, config: ReaderSearchConfig) =>
  JSON.stringify([
    query.trim(),
    config.scope,
    config.matchCase,
    config.matchWholeWords,
    config.matchDiacritics
  ]);

const normalizeSearchHistoryEntry = (value: unknown): ReaderSearchHistoryEntry | null => {
  if (typeof value === 'string') {
    const query = value.trim();
    if (!query) return null;
    const config = defaultSearchConfig();
    return {
      id: buildSearchHistoryId(query, config),
      query,
      config,
      resultCount: 0,
      createdAt: 0
    };
  }

  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<ReaderSearchHistoryEntry> & {
    query?: unknown;
    config?: unknown;
    resultCount?: unknown;
    createdAt?: unknown;
  };
  const query = typeof candidate.query === 'string' ? candidate.query.trim() : '';
  if (!query) return null;

  const config =
    candidate.config && typeof candidate.config === 'object'
      ? normalizeSearchConfig(candidate.config as Partial<ReaderSearchConfig>)
      : defaultSearchConfig();
  const resultCount =
    typeof candidate.resultCount === 'number' && Number.isFinite(candidate.resultCount)
      ? Math.max(0, Math.round(candidate.resultCount))
      : 0;
  const createdAt =
    typeof candidate.createdAt === 'number' && Number.isFinite(candidate.createdAt)
      ? candidate.createdAt
      : 0;

  return {
    id:
      typeof candidate.id === 'string' && candidate.id.trim()
        ? candidate.id
        : buildSearchHistoryId(query, config),
    query,
    config,
    resultCount,
    createdAt
  };
};

const normalizeSearchHistory = (value: unknown): ReaderSearchHistoryEntry[] => {
  if (!Array.isArray(value)) return [];

  const deduped = new Map<string, ReaderSearchHistoryEntry>();
  for (const item of value) {
    const normalized = normalizeSearchHistoryEntry(item);
    if (!normalized) continue;

    const existing = deduped.get(normalized.id);
    if (!existing || normalized.createdAt >= existing.createdAt) {
      deduped.set(normalized.id, normalized);
    }
  }

  return Array.from(deduped.values()).sort((left, right) => right.createdAt - left.createdAt);
};

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
        config: normalizeSearchConfig(parsed)
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
        history: raw ? normalizeSearchHistory(JSON.parse(raw)) : []
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
    storage.setItem(getHistoryKey(), JSON.stringify(current.history.slice(0, 12)));
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

  const issueSearchHistory = (entry: ReaderSearchHistoryEntry) => {
    const query = entry.query.trim();
    if (!query) return;

    state.update((current) => ({
      ...current,
      term: query,
      config: normalizeSearchConfig(entry.config),
      recentResultCfi: ''
    }));

    const current = get(state);
    dispatchSearch(query, current.config);
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

  const deleteHistoryEntry = (entryId: string) => {
    state.update((current) => ({
      ...current,
      history: current.history.filter((entry) => entry.id !== entryId)
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
        detail.status === 'done' && detail.query.trim()
          ? [
              {
                id: buildSearchHistoryId(detail.query, current.config),
                query: detail.query.trim(),
                config: normalizeSearchConfig(current.config),
                resultCount: detail.results.length,
                createdAt: Date.now()
              },
              ...current.history.filter(
                (entry) => entry.id !== buildSearchHistoryId(detail.query, current.config)
              )
            ].slice(0, 12)
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
    deleteHistoryEntry,
    clearCurrentBookCache,
    handleSearchChange,
    setCacheKey,
    setActiveResultCfi,
    clearRecentResultCfi,
    issueSearchHistory,
    destroy
  };
};

export type ReaderAssistanceProvider = 'wikipedia' | 'dictionary' | 'deepl' | 'yandex';

export type ReaderLookupProvider = 'wikipedia' | 'dictionary';
export type ReaderTranslationProvider = 'deepl' | 'yandex';
export type ReaderTranslationProviderStatusKind = 'configured' | 'missingKey';

export type ReaderLookupRequest = {
  kind: 'lookup';
  provider: ReaderLookupProvider;
  term: string;
  language?: string;
  bookKey: string;
  cfi?: string;
  chapterLabel?: string;
};

export type ReaderTranslationRequest = {
  kind: 'translation';
  provider: ReaderTranslationProvider;
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
  bookKey: string;
  cfi?: string;
  chapterLabel?: string;
};

export type ReaderTranslationProviderStatus = {
  provider: ReaderTranslationProvider;
  status: ReaderTranslationProviderStatusKind;
  configured: boolean;
  label: string;
  updatedAt: number;
};

export type ReaderAssistanceRequest = ReaderLookupRequest | ReaderTranslationRequest;

export type ReaderAssistanceResult = {
  id: string;
  provider: ReaderAssistanceProvider;
  title: string;
  body: string;
  url?: string;
  sourceLabel?: string;
  createdAt: number;
};

export type ReaderAssistanceStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'offline' | 'error';

export type ReaderAssistanceHistoryStatus = Exclude<ReaderAssistanceStatus, 'idle'>;

export type ReaderAssistanceState = {
  status: ReaderAssistanceStatus;
  activeRequest: ReaderAssistanceRequest | null;
  result: ReaderAssistanceResult | null;
  error: string;
};

export type ReaderAssistanceHistoryEntry = {
  id: string;
  request: ReaderAssistanceRequest;
  status: ReaderAssistanceHistoryStatus;
  result: ReaderAssistanceResult | null;
  error: string;
  createdAt: number;
  updatedAt: number;
};

export const normalizeAssistanceTerm = (value: string): string =>
  value.replace(/\s+/g, ' ').trim().slice(0, 240);

export const normalizeAssistanceText = (value: string): string =>
  value.replace(/\s+/g, ' ').trim().slice(0, 8000);

export const getReaderTranslationProviderDisplayLabel = (
  provider: ReaderTranslationProvider
): string => (provider === 'deepl' ? 'DeepL' : 'Yandex');

export const getReaderAssistanceProviderDisplayLabel = (
  provider: ReaderAssistanceProvider
): string => {
  if (provider === 'dictionary') return '词典';
  if (provider === 'wikipedia') return '维基百科';
  return getReaderTranslationProviderDisplayLabel(provider);
};

export const getReaderAssistanceRequestSubject = (request: ReaderAssistanceRequest): string =>
  request.kind === 'translation'
    ? normalizeAssistanceText(request.text)
    : normalizeAssistanceTerm(request.term);

export const getReaderAssistanceRequestContextLabel = (
  request: ReaderAssistanceRequest
): string => {
  const chapter = request.chapterLabel?.trim();

  if (request.kind === 'translation') {
    if (chapter) {
      return `${chapter} · 译为 ${request.targetLanguage.toUpperCase()}`;
    }

    return `译为 ${request.targetLanguage.toUpperCase()}`;
  }

  if (chapter) {
    return request.provider === 'dictionary' ? `${chapter} · 词典` : `${chapter} · 维基百科`;
  }

  return request.provider === 'dictionary' ? '词典请求' : '维基百科请求';
};

export const canRequestAssistanceForText = (value: string): boolean =>
  normalizeAssistanceTerm(value).length > 0;

export const normalizeReaderAssistanceRequest = (
  request: ReaderAssistanceRequest
): ReaderAssistanceRequest => {
  if (request.kind === 'lookup') {
    return {
      ...request,
      term: normalizeAssistanceTerm(request.term),
      language: request.language?.trim() || undefined,
      bookKey: request.bookKey.trim(),
      cfi: request.cfi?.trim() || undefined,
      chapterLabel: request.chapterLabel?.trim() || undefined
    };
  }

  return {
    ...request,
    text: normalizeAssistanceText(request.text),
    sourceLanguage: request.sourceLanguage?.trim() || undefined,
    targetLanguage: request.targetLanguage.trim(),
    bookKey: request.bookKey.trim(),
    cfi: request.cfi?.trim() || undefined,
    chapterLabel: request.chapterLabel?.trim() || undefined
  };
};

export const createEmptyReaderAssistanceState = (
  overrides: Partial<ReaderAssistanceState> = {}
): ReaderAssistanceState => ({
  status: 'idle',
  activeRequest: null,
  result: null,
  error: '',
  ...overrides
});

export const createLoadingReaderAssistanceState = (
  activeRequest: ReaderAssistanceRequest,
  overrides: Partial<ReaderAssistanceState> = {}
): ReaderAssistanceState => ({
  status: 'loading',
  activeRequest: normalizeReaderAssistanceRequest(activeRequest),
  result: null,
  error: '',
  ...overrides
});

export const createReadyReaderAssistanceState = (
  activeRequest: ReaderAssistanceRequest,
  result: ReaderAssistanceResult,
  overrides: Partial<ReaderAssistanceState> = {}
): ReaderAssistanceState => ({
  status: 'ready',
  activeRequest: normalizeReaderAssistanceRequest(activeRequest),
  result,
  error: '',
  ...overrides
});

export const createEmptyReaderAssistanceResultState = (
  activeRequest: ReaderAssistanceRequest,
  overrides: Partial<ReaderAssistanceState> = {}
): ReaderAssistanceState => ({
  status: 'empty',
  activeRequest: normalizeReaderAssistanceRequest(activeRequest),
  result: null,
  error: '',
  ...overrides
});

export const createOfflineReaderAssistanceState = (
  activeRequest: ReaderAssistanceRequest | null,
  error: string,
  overrides: Partial<ReaderAssistanceState> = {}
): ReaderAssistanceState => ({
  status: 'offline',
  activeRequest: activeRequest ? normalizeReaderAssistanceRequest(activeRequest) : null,
  result: null,
  error: error.trim(),
  ...overrides
});

export const createErrorReaderAssistanceState = (
  activeRequest: ReaderAssistanceRequest | null,
  error: string,
  overrides: Partial<ReaderAssistanceState> = {}
): ReaderAssistanceState => ({
  status: 'error',
  activeRequest: activeRequest ? normalizeReaderAssistanceRequest(activeRequest) : null,
  result: null,
  error: error.trim(),
  ...overrides
});

export const createReaderAssistanceHistoryEntry = (
  request: ReaderAssistanceRequest,
  overrides: Partial<ReaderAssistanceHistoryEntry> = {}
): ReaderAssistanceHistoryEntry => {
  const normalizedRequest = normalizeReaderAssistanceRequest(request);
  const now = Date.now();

  return {
    id: overrides.id?.trim() || `assist-${now}`,
    request: normalizedRequest,
    status: overrides.status ?? 'loading',
    result: overrides.result ?? null,
    error: overrides.error?.trim() || '',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now
  };
};

export const updateReaderAssistanceHistoryEntry = (
  entry: ReaderAssistanceHistoryEntry,
  overrides: Partial<ReaderAssistanceHistoryEntry> = {}
): ReaderAssistanceHistoryEntry => ({
  ...entry,
  ...overrides,
  request: overrides.request
    ? normalizeReaderAssistanceRequest(overrides.request)
    : normalizeReaderAssistanceRequest(entry.request),
  error: overrides.error !== undefined ? overrides.error.trim() : entry.error.trim(),
  updatedAt: overrides.updatedAt ?? Date.now()
});

export const upsertReaderAssistanceHistoryEntry = (
  entries: ReaderAssistanceHistoryEntry[],
  entry: ReaderAssistanceHistoryEntry,
  limit = 8
): ReaderAssistanceHistoryEntry[] => {
  const nextEntries = entries.filter((current) => current.id !== entry.id);
  nextEntries.unshift(entry);
  nextEntries.sort((left, right) => right.updatedAt - left.updatedAt);
  return nextEntries.slice(0, Math.max(1, limit));
};

export const isLookupReaderAssistanceRequest = (
  request: ReaderAssistanceRequest
): request is ReaderLookupRequest => request.kind === 'lookup';

export const isTranslationReaderAssistanceRequest = (
  request: ReaderAssistanceRequest
): request is ReaderTranslationRequest => request.kind === 'translation';

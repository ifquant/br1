import type {
  ReaderAssistanceRequest,
  ReaderAssistanceResult,
  ReaderAssistanceState
} from '$lib/reader';
import {
  createEmptyReaderAssistanceResultState,
  createErrorReaderAssistanceState,
  createOfflineReaderAssistanceState,
  createReadyReaderAssistanceState,
  normalizeReaderAssistanceRequest
} from '$lib/reader';
import { isTauriDesktop, invokeTauri } from './platform';

type WikipediaLookupCommandResponse = {
  status: 'ready' | 'empty' | 'offline' | 'error';
  result: ReaderAssistanceResult | null;
  error?: string;
};

const getUnsupportedReaderAssistanceProviderMessage = (
  provider: ReaderAssistanceRequest['provider']
): string => {
  switch (provider) {
    case 'wikipedia':
      return '';
    case 'dictionary':
      return 'Dictionary lookup is not implemented yet.';
    case 'deepl':
    case 'yandex':
      return `Reader translation provider is not implemented: ${provider}`;
    default:
      return 'Reader assistance provider is not implemented';
  }
};

const getWikipediaLookupLanguage = (requestLanguage: string | undefined): string => {
  const browserLanguage =
    typeof document !== 'undefined' && document.documentElement.lang.trim()
      ? document.documentElement.lang
      : typeof navigator !== 'undefined'
        ? navigator.language
        : '';
  return requestLanguage?.trim() || browserLanguage || 'en';
};

const createRejectedReaderAssistanceState = (
  request: ReaderAssistanceRequest,
  message: string
): ReaderAssistanceState => createErrorReaderAssistanceState(request, message);

export const requestReaderAssistance = async (
  request: ReaderAssistanceRequest
): Promise<ReaderAssistanceState> => {
  const normalizedRequest = normalizeReaderAssistanceRequest(request);
  const providerMessage = getUnsupportedReaderAssistanceProviderMessage(normalizedRequest.provider);

  if (providerMessage) {
    return createRejectedReaderAssistanceState(normalizedRequest, providerMessage);
  }

  if (normalizedRequest.kind !== 'lookup' || normalizedRequest.provider !== 'wikipedia') {
    return createRejectedReaderAssistanceState(
      normalizedRequest,
      'Reader assistance provider is not implemented'
    );
  }

  if (!normalizedRequest.term) {
    return createEmptyReaderAssistanceResultState(normalizedRequest);
  }

  if (!isTauriDesktop()) {
    return createOfflineReaderAssistanceState(
      normalizedRequest,
      'Wikipedia lookup requires the desktop runtime.'
    );
  }

  try {
    const response = await invokeTauri<WikipediaLookupCommandResponse>('lookup_reader_assistance', {
      provider: normalizedRequest.provider,
      term: normalizedRequest.term,
      language: getWikipediaLookupLanguage(normalizedRequest.language)
    });

    if (response.status === 'ready' && response.result) {
      return createReadyReaderAssistanceState(normalizedRequest, response.result);
    }

    if (response.status === 'empty') {
      return createEmptyReaderAssistanceResultState(normalizedRequest);
    }

    if (response.status === 'offline') {
      return createOfflineReaderAssistanceState(
        normalizedRequest,
        response.error || 'Wikipedia lookup is unavailable right now.'
      );
    }

    return createErrorReaderAssistanceState(
      normalizedRequest,
      response.error || 'Wikipedia lookup failed.'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createErrorReaderAssistanceState(normalizedRequest, message);
  }
};

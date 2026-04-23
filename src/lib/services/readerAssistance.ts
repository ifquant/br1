import type {
  ReaderAssistanceRequest,
  ReaderAssistanceResult,
  ReaderAssistanceState,
  ReaderLookupProvider
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

const getLookupLanguage = (
  provider: ReaderLookupProvider,
  requestLanguage: string | undefined
): string => {
  const browserLanguage =
    typeof document !== 'undefined' && document.documentElement.lang.trim()
      ? document.documentElement.lang
      : typeof navigator !== 'undefined'
        ? navigator.language
        : '';
  if (provider === 'dictionary') {
    return 'en';
  }

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
  if (normalizedRequest.kind !== 'lookup') {
    return createRejectedReaderAssistanceState(
      normalizedRequest,
      `Reader translation provider is not implemented: ${normalizedRequest.provider}`
    );
  }

  if (!normalizedRequest.term) {
    return createEmptyReaderAssistanceResultState(normalizedRequest);
  }

  if (!isTauriDesktop()) {
    return createOfflineReaderAssistanceState(
      normalizedRequest,
      `${normalizedRequest.provider === 'dictionary' ? 'Dictionary' : 'Wikipedia'} lookup requires the desktop runtime.`
    );
  }

  try {
    const response = await invokeTauri<WikipediaLookupCommandResponse>('lookup_reader_assistance', {
      provider: normalizedRequest.provider,
      term: normalizedRequest.term,
      language: getLookupLanguage(normalizedRequest.provider, normalizedRequest.language)
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
        response.error ||
          `${normalizedRequest.provider === 'dictionary' ? 'Dictionary' : 'Wikipedia'} lookup is unavailable right now.`
      );
    }

    return createErrorReaderAssistanceState(
      normalizedRequest,
      response.error ||
        `${normalizedRequest.provider === 'dictionary' ? 'Dictionary' : 'Wikipedia'} lookup failed.`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createErrorReaderAssistanceState(normalizedRequest, message);
  }
};

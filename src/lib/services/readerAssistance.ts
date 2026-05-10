// Boundary: this module is the frontend-facing seam for reader assistance
// requests. It may normalize user intent and degrade gracefully in web mode,
// but translation and lookup execution stay desktop-owned.

import type {
  ReaderAssistanceRequest,
  ReaderAssistanceResult,
  ReaderAssistanceState,
  ReaderLookupProvider,
  ReaderTranslationProvider,
  ReaderTranslationProviderStatus
} from '$lib/reader';
import {
  createEmptyReaderAssistanceResultState,
  createErrorReaderAssistanceState,
  createOfflineReaderAssistanceState,
  createReadyReaderAssistanceState,
  getReaderTranslationProviderDisplayLabel,
  normalizeReaderAssistanceRequest
} from '$lib/reader';
import { isTauriDesktop, invokeTauri } from './platform';

type WikipediaLookupCommandResponse = {
  status: 'ready' | 'empty' | 'offline' | 'error';
  result: ReaderAssistanceResult | null;
  error?: string;
};

type ReaderAssistanceCommandResponse = WikipediaLookupCommandResponse;

type ReaderTranslationProviderStatusResponse = ReaderTranslationProviderStatus[];

const TRANSLATION_PROVIDERS: ReaderTranslationProvider[] = ['deepl', 'yandex'];

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

const createMissingTranslationConfigState = (
  request: ReaderAssistanceRequest,
  provider: ReaderTranslationProvider,
  label?: string
): ReaderAssistanceState =>
  createErrorReaderAssistanceState(
    request,
    label?.trim() ||
      `${getReaderTranslationProviderDisplayLabel(provider)} translation has no desktop configuration yet.`
  );

export const createDefaultReaderTranslationProviderStatuses = (): ReaderTranslationProviderStatus[] =>
  TRANSLATION_PROVIDERS.map((provider) => ({
    provider,
    status: 'missingKey',
    configured: false,
    label: `${getReaderTranslationProviderDisplayLabel(provider)} API key is not configured yet.`,
    updatedAt: 0
  }));

export const loadReaderTranslationProviderStatuses = async (): Promise<
  ReaderTranslationProviderStatus[]
> => {
  const defaultStatuses = createDefaultReaderTranslationProviderStatuses();
  if (!isTauriDesktop()) {
    return defaultStatuses;
  }

  try {
    const response = await invokeTauri<ReaderTranslationProviderStatusResponse>(
      'get_reader_translation_provider_statuses'
    );
    return TRANSLATION_PROVIDERS.map(
      (provider) =>
        response.find((item) => item.provider === provider) ??
        defaultStatuses.find((item) => item.provider === provider)!
    );
  } catch {
    return defaultStatuses;
  }
};

export const requestReaderAssistance = async (
  request: ReaderAssistanceRequest
): Promise<ReaderAssistanceState> => {
  const normalizedRequest = normalizeReaderAssistanceRequest(request);
  if (normalizedRequest.kind === 'translation') {
    // Refactor risk: keep provider gating and empty-state UX here, but do not
    // duplicate translation business logic in the renderer.
    if (!normalizedRequest.text) {
      return createEmptyReaderAssistanceResultState(normalizedRequest);
    }

    if (!isTauriDesktop()) {
      return createOfflineReaderAssistanceState(
        normalizedRequest,
        `${getReaderTranslationProviderDisplayLabel(normalizedRequest.provider)} translation requires the desktop runtime.`
      );
    }

    const providerStatuses = await loadReaderTranslationProviderStatuses();
    const providerStatus = providerStatuses.find(
      (status) => status.provider === normalizedRequest.provider
    );
    if (!providerStatus || !providerStatus.configured) {
      return createMissingTranslationConfigState(
        normalizedRequest,
        normalizedRequest.provider,
        providerStatus?.label
      );
    }

    try {
      const response = await invokeTauri<ReaderAssistanceCommandResponse>('translate_reader_assistance', {
        provider: normalizedRequest.provider,
        text: normalizedRequest.text,
        sourceLanguage: normalizedRequest.sourceLanguage,
        targetLanguage: normalizedRequest.targetLanguage
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
            `${getReaderTranslationProviderDisplayLabel(normalizedRequest.provider)} translation is unavailable right now.`
        );
      }

      return createErrorReaderAssistanceState(
        normalizedRequest,
        response.error ||
          `${getReaderTranslationProviderDisplayLabel(normalizedRequest.provider)} translation failed.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorReaderAssistanceState(normalizedRequest, message);
    }
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
    const response = await invokeTauri<ReaderAssistanceCommandResponse>('lookup_reader_assistance', {
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

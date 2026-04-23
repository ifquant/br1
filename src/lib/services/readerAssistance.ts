import type { ReaderAssistanceRequest, ReaderAssistanceResult } from '$lib/reader';
import { normalizeReaderAssistanceRequest } from '$lib/reader';

const getUnsupportedReaderAssistanceProviderMessage = (
  provider: ReaderAssistanceRequest['provider']
): string => {
  switch (provider) {
    case 'wikipedia':
    case 'dictionary':
      return `Reader assistance provider is not implemented: ${provider}`;
    case 'deepl':
    case 'yandex':
      return `Reader translation provider is not implemented: ${provider}`;
    default:
      return 'Reader assistance provider is not implemented';
  }
};

export const requestReaderAssistance = async (
  request: ReaderAssistanceRequest
): Promise<ReaderAssistanceResult> => {
  const normalizedRequest = normalizeReaderAssistanceRequest(request);
  throw new Error(getUnsupportedReaderAssistanceProviderMessage(normalizedRequest.provider));
};

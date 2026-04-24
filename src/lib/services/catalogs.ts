import { isTauriDesktop, invokeTauri } from './platform';
import type { LibraryReaderTarget, PersistedLibraryBook } from './libraryPersistence';
import { toLibraryReaderTarget } from './libraryPersistence';

export type CatalogConnectorKind = 'opds' | 'calibreOpds';

export type CatalogSourceAuthKind = 'none' | 'basic' | 'bearer' | 'cookie';

export type CatalogSourceAuthState = {
  kind: CatalogSourceAuthKind;
  label: string;
  configured: boolean;
  required: boolean;
};

export type CatalogSourceConnectivityStatus =
  | 'available'
  | 'offline'
  | 'authRequired'
  | 'unsupported'
  | 'invalid';

export type CatalogSourceConnectivityState = {
  status: CatalogSourceConnectivityStatus;
  label: string;
  checkedAt?: number;
  retryable: boolean;
};

export type CatalogSource = {
  id: string;
  kind: CatalogConnectorKind;
  title: string;
  baseUrl: string;
  description?: string;
  auth: CatalogSourceAuthState;
  connectivity: CatalogSourceConnectivityState;
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

export type CatalogEntryAuthor = {
  name: string;
  uri?: string;
};

export type CatalogEntryLinkRel =
  | 'self'
  | 'start'
  | 'next'
  | 'previous'
  | 'search'
  | 'acquisition'
  | 'image'
  | 'thumbnail'
  | 'alternate'
  | 'related';

export type CatalogEntryLink = {
  rel: CatalogEntryLinkRel;
  href: string;
  title?: string;
  mediaType?: string;
  length?: number;
  supportsImport: boolean;
};

export type CatalogEntryAvailability = 'unknown' | 'available' | 'borrowed' | 'reserved' | 'unavailable';

export type CatalogEntry = {
  id: string;
  sourceId: string;
  title: string;
  subtitle?: string;
  summary?: string;
  authors: CatalogEntryAuthor[];
  language?: string;
  publishedAt?: string;
  updatedAt?: string;
  categories: string[];
  links: CatalogEntryLink[];
  availability: CatalogEntryAvailability;
};

export type CatalogPagination = {
  pageId: string;
  title?: string;
  selfHref?: string;
  nextHref?: string;
  previousHref?: string;
  totalResults?: number;
  itemsPerPage?: number;
  startIndex?: number;
};

export type CatalogSearchTemplate = {
  href: string;
  mediaType?: string;
  queryParameter: string;
};

export type CatalogSearchRequest = {
  sourceId: string;
  query: string;
  pageHref?: string;
};

export type CatalogBrowseRequest = {
  sourceId: string;
  pageHref?: string;
};

export type CatalogImportIntentRequest = {
  sourceId: string;
  entryId: string;
  pageHref?: string;
};

export type CatalogSourceSettingsInput = {
  id?: string;
  kind: CatalogConnectorKind;
  title: string;
  baseUrl: string;
  description?: string;
  authKind: CatalogSourceAuthKind;
  authLabel?: string;
  authConfigured: boolean;
  authRequired: boolean;
  tags: string[];
};

export type CatalogAuthChallenge = {
  sourceId: string;
  kind: Exclude<CatalogSourceAuthKind, 'none'>;
  realm?: string;
  message: string;
};

export type CatalogErrorCode =
  | 'unavailable'
  | 'offline'
  | 'authRequired'
  | 'unsupported'
  | 'invalidSource'
  | 'invalidFeed'
  | 'network'
  | 'unknown';

export type CatalogErrorState = {
  code: CatalogErrorCode;
  message: string;
  sourceId?: string;
  retryable: boolean;
};

export type CatalogPage = {
  source: CatalogSource;
  entries: CatalogEntry[];
  pagination: CatalogPagination;
  search?: CatalogSearchTemplate;
  authChallenge?: CatalogAuthChallenge;
  error?: CatalogErrorState;
};

export type CatalogImportIntentStatus = 'ready' | 'blocked';

export type CatalogImportIntent = {
  id: string;
  sourceId: string;
  entryId: string;
  title: string;
  acquisitionHref: string;
  mediaType?: string;
  fileNameHint?: string;
  status: CatalogImportIntentStatus;
  blockedReason?: string;
  createdAt: number;
};

export type CatalogConnectorStatusKind = 'available' | 'unavailable' | 'offline' | 'error';

export type CatalogConnectorStatus = {
  status: CatalogConnectorStatusKind;
  capabilities: CatalogConnectorKind[];
  message: string;
  supportsSearch: boolean;
  supportsAuthentication: boolean;
  supportsImportIntent: boolean;
  error?: CatalogErrorState;
};

export type CatalogConnectorStatusResponse = CatalogConnectorStatus;

export type CatalogSourceListResponse = CatalogSource[];
export type CatalogPageResponse = CatalogPage;
export type CatalogImportIntentResponse = CatalogImportIntent;
export type CatalogImportExecutionResult =
  | {
      status: 'imported';
      message: string;
      records: PersistedLibraryBook[];
      firstRecord: PersistedLibraryBook | null;
      firstReaderTarget: LibraryReaderTarget | null;
      firstReaderHref: string;
    }
  | {
      status: 'blocked';
      message: string;
      records: [];
      firstRecord: null;
      firstReaderTarget: null;
      firstReaderHref: '';
    };
export type CatalogSourceSettingsResponse = {
  source?: CatalogSource;
  error?: CatalogErrorState;
};

export const createUnavailableCatalogConnectorStatus = (
  message = 'Catalog connectors require the desktop runtime.'
): CatalogConnectorStatus => ({
  status: 'unavailable',
  capabilities: [],
  message,
  supportsSearch: false,
  supportsAuthentication: false,
  supportsImportIntent: false,
  error: {
    code: 'unavailable',
    message,
    retryable: false
  }
});

export const normalizeCatalogSource = (source: CatalogSource): CatalogSource => ({
  ...source,
  id: source.id.trim(),
  title: source.title.trim(),
  baseUrl: source.baseUrl.trim(),
  description: source.description?.trim() || undefined,
  tags: source.tags.map((tag) => tag.trim()).filter(Boolean),
  auth: {
    ...source.auth,
    label: source.auth.label.trim()
  },
  connectivity: {
    ...source.connectivity,
    label: source.connectivity.label.trim()
  }
});

export const normalizeCatalogSourceSettingsInput = (
  input: CatalogSourceSettingsInput
): CatalogSourceSettingsInput => ({
  id: input.id?.trim() || undefined,
  kind: input.kind,
  title: input.title.replace(/\s+/g, ' ').trim(),
  baseUrl: input.baseUrl.trim(),
  description: input.description?.trim() || undefined,
  authKind: input.authKind,
  authLabel: input.authLabel?.trim() || undefined,
  authConfigured: input.authKind === 'none' ? true : input.authConfigured,
  authRequired: input.authKind === 'none' ? false : input.authRequired,
  tags: input.tags.map((tag) => tag.trim()).filter(Boolean)
});

export const normalizeCatalogSearchRequest = (
  request: CatalogSearchRequest
): CatalogSearchRequest => ({
  sourceId: request.sourceId.trim(),
  query: request.query.replace(/\s+/g, ' ').trim().slice(0, 240),
  pageHref: request.pageHref?.trim() || undefined
});

export const normalizeCatalogBrowseRequest = (request: CatalogBrowseRequest): CatalogBrowseRequest => ({
  sourceId: request.sourceId.trim(),
  pageHref: request.pageHref?.trim() || undefined
});

export const normalizeCatalogImportIntentRequest = (
  request: CatalogImportIntentRequest
): CatalogImportIntentRequest => ({
  sourceId: request.sourceId.trim(),
  entryId: request.entryId.trim(),
  pageHref: request.pageHref?.trim() || undefined
});

const createUnavailableCatalogSource = (sourceId: string): CatalogSource => ({
  id: sourceId.trim(),
  kind: 'opds',
  title: 'Unavailable catalog source',
  baseUrl: '',
  auth: {
    kind: 'none',
    label: 'Catalog connectors require the desktop runtime.',
    configured: false,
    required: false
  },
  connectivity: {
    status: 'offline',
    label: 'Catalog connectors require the desktop runtime.',
    retryable: false
  },
  tags: [],
  createdAt: 0,
  updatedAt: 0
});

const createCatalogErrorPage = (
  request: CatalogBrowseRequest,
  message: string,
  code: CatalogErrorCode = 'unavailable'
): CatalogPage => ({
  source: createUnavailableCatalogSource(request.sourceId),
  entries: [],
  pagination: {
    pageId: request.pageHref || 'unavailable',
    selfHref: request.pageHref,
    totalResults: 0,
    itemsPerPage: 0,
    startIndex: 1
  },
  error: {
    code,
    message,
    sourceId: request.sourceId.trim() || undefined,
    retryable: false
  }
});

const createBlockedCatalogImportIntent = (
  request: CatalogImportIntentRequest,
  reason: string,
  now = Date.now()
): CatalogImportIntent => ({
  id: `catalog:${request.sourceId.trim()}:${request.entryId.trim()}:blocked`,
  sourceId: request.sourceId.trim(),
  entryId: request.entryId.trim(),
  title: 'Unavailable catalog entry',
  acquisitionHref: '',
  status: 'blocked',
  blockedReason: reason,
  createdAt: now
});

const getImportableLink = (entry: CatalogEntry): CatalogEntryLink | undefined =>
  entry.links.find((link) => link.supportsImport && link.rel === 'acquisition') ??
  entry.links.find((link) => link.supportsImport);

const createCatalogIntentId = (sourceId: string, entryId: string, href: string): string =>
  `catalog:${sourceId}:${entryId}:${href}`.replace(/\s+/g, '-');

export const createCatalogImportIntent = (
  source: CatalogSource,
  entry: CatalogEntry,
  now = Date.now()
): CatalogImportIntent => {
  const normalizedSource = normalizeCatalogSource(source);
  const acquisition = getImportableLink(entry);
  if (!acquisition) {
    return {
      id: createCatalogIntentId(normalizedSource.id, entry.id, 'blocked'),
      sourceId: normalizedSource.id,
      entryId: entry.id,
      title: entry.title.trim(),
      acquisitionHref: '',
      status: 'blocked',
      blockedReason: 'This catalog entry does not expose an importable acquisition link.',
      createdAt: now
    };
  }

  return {
    id: createCatalogIntentId(normalizedSource.id, entry.id, acquisition.href),
    sourceId: normalizedSource.id,
    entryId: entry.id,
    title: entry.title.trim(),
    acquisitionHref: acquisition.href,
    mediaType: acquisition.mediaType,
    fileNameHint: acquisition.title?.trim() || entry.title.trim(),
    status: 'ready',
    createdAt: now
  };
};

export const getCatalogConnectorStatus = async (): Promise<CatalogConnectorStatus> => {
  if (!isTauriDesktop()) {
    return createUnavailableCatalogConnectorStatus();
  }

  try {
    return await invokeTauri<CatalogConnectorStatusResponse>('get_catalog_connector_status');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'error',
      capabilities: [],
      message,
      supportsSearch: false,
      supportsAuthentication: false,
      supportsImportIntent: false,
      error: {
        code: 'unknown',
        message,
        retryable: true
      }
    };
  }
};

export const listCatalogSources = async (): Promise<CatalogSource[]> => {
  if (!isTauriDesktop()) {
    return [];
  }

  try {
    return await invokeTauri<CatalogSourceListResponse>('list_catalog_sources');
  } catch {
    return [];
  }
};

export const saveCatalogSourceSettings = async (
  input: CatalogSourceSettingsInput
): Promise<CatalogSourceSettingsResponse> => {
  const normalized = normalizeCatalogSourceSettingsInput(input);
  if (!isTauriDesktop()) {
    return {
      error: {
        code: 'unavailable',
        message: 'Catalog source settings require the desktop runtime.',
        sourceId: normalized.id,
        retryable: false
      }
    };
  }

  try {
    return await invokeTauri<CatalogSourceSettingsResponse>('save_catalog_source_settings', {
      input: normalized
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: {
        code: 'unknown',
        message,
        sourceId: normalized.id,
        retryable: true
      }
    };
  }
};

export const removeCatalogSourceSettings = async (
  sourceId: string
): Promise<CatalogSourceSettingsResponse> => {
  const normalized = sourceId.trim();
  if (!isTauriDesktop()) {
    return {
      error: {
        code: 'unavailable',
        message: 'Catalog source settings require the desktop runtime.',
        sourceId: normalized || undefined,
        retryable: false
      }
    };
  }

  try {
    return await invokeTauri<CatalogSourceSettingsResponse>('remove_catalog_source_settings', {
      sourceId: normalized
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: {
        code: 'unknown',
        message,
        sourceId: normalized || undefined,
        retryable: true
      }
    };
  }
};

export const browseCatalogSource = async (request: CatalogBrowseRequest): Promise<CatalogPage> => {
  const normalized = normalizeCatalogBrowseRequest(request);
  if (!isTauriDesktop()) {
    return createCatalogErrorPage(normalized, 'Catalog browsing requires the desktop runtime.');
  }

  try {
    return await invokeTauri<CatalogPageResponse>('browse_catalog_source', { request: normalized });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createCatalogErrorPage(normalized, message, 'unknown');
  }
};

export const searchCatalogSource = async (request: CatalogSearchRequest): Promise<CatalogPage> => {
  const normalized = normalizeCatalogSearchRequest(request);
  if (!isTauriDesktop()) {
    return createCatalogErrorPage(normalized, 'Catalog search requires the desktop runtime.');
  }

  try {
    return await invokeTauri<CatalogPageResponse>('search_catalog_source', { request: normalized });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createCatalogErrorPage(normalized, message, 'unknown');
  }
};

export const requestCatalogImportIntent = async (
  request: CatalogImportIntentRequest
): Promise<CatalogImportIntent> => {
  const normalized = normalizeCatalogImportIntentRequest(request);
  if (!isTauriDesktop()) {
    return createBlockedCatalogImportIntent(
      normalized,
      'Catalog import intents require the desktop runtime.'
    );
  }

  try {
    return await invokeTauri<CatalogImportIntentResponse>('create_catalog_import_intent', {
      request: normalized
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createBlockedCatalogImportIntent(normalized, message);
  }
};

const toCatalogImportExecutionResult = (
  records: PersistedLibraryBook[],
  message: string
): CatalogImportExecutionResult => {
  const [firstRecord] = records;
  if (!firstRecord) {
    return {
      status: 'blocked',
      message,
      records: [],
      firstRecord: null,
      firstReaderTarget: null,
      firstReaderHref: ''
    };
  }

  const firstReaderTarget = toLibraryReaderTarget(firstRecord);
  return {
    status: 'imported',
    message,
    records,
    firstRecord,
    firstReaderTarget,
    firstReaderHref: firstReaderTarget.href
  };
};

export const importCatalogEntryToLibrary = async (
  request: CatalogImportIntentRequest
): Promise<CatalogImportExecutionResult> => {
  const normalized = normalizeCatalogImportIntentRequest(request);
  if (!isTauriDesktop()) {
    return {
      status: 'blocked',
      message: 'Catalog imports require the desktop runtime.',
      records: [],
      firstRecord: null,
      firstReaderTarget: null,
      firstReaderHref: ''
    };
  }

  try {
    const records = await invokeTauri<PersistedLibraryBook[]>('import_catalog_entry_to_library', {
      request: normalized
    });
    return toCatalogImportExecutionResult(records, '目录图书已导入受管书库。');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'blocked',
      message,
      records: [],
      firstRecord: null,
      firstReaderTarget: null,
      firstReaderHref: ''
    };
  }
};

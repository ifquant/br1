import type { ReaderControlRequest } from './types';

export type ReaderRouteOpenTarget =
  | {
      kind: 'asset';
      label: string;
      url: string;
      bookKey: string;
    }
  | {
      kind: 'library-file';
      label: string;
      path: string;
      restoreFraction?: number;
      restoreLocation?: string;
      bookKey: string;
    };

export type ReaderRouteOpenState = {
  isWindowMode: boolean;
  pickerRequested: boolean;
  autoOpenKey: string;
  bookKey: string;
  target: ReaderRouteOpenTarget | null;
};

const parseRouteFraction = (value: string | null) => {
  const parsed = Number(value ?? '');
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const parseReaderRouteOpenState = (url: URL): ReaderRouteOpenState => {
  const source = url.searchParams.get('source') ?? '';
  const label = url.searchParams.get('label') ?? '';
  const isWindowMode = url.searchParams.get('mode') === 'window';

  if (source === 'asset') {
    const sourceUrl = url.searchParams.get('url') ?? '';
    if (!sourceUrl) {
      return {
        isWindowMode,
        pickerRequested: false,
        autoOpenKey: '',
        bookKey: label || 'default',
        target: null
      };
    }

    const target: ReaderRouteOpenTarget = {
      kind: 'asset',
      label: label || '导入书籍',
      url: sourceUrl,
      bookKey: sourceUrl || label || 'default'
    };

    return {
      isWindowMode,
      pickerRequested: false,
      autoOpenKey: `asset:${target.url}:${target.label}`,
      bookKey: target.bookKey,
      target
    };
  }

  if (source === 'library-file') {
    const sourcePath = url.searchParams.get('path') ?? '';
    if (!sourcePath) {
      return {
        isWindowMode,
        pickerRequested: false,
        autoOpenKey: '',
        bookKey: label || 'default',
        target: null
      };
    }

    const restoreLocation = url.searchParams.get('location') ?? '';
    const target: ReaderRouteOpenTarget = {
      kind: 'library-file',
      label: label || '导入书籍',
      path: sourcePath,
      restoreFraction: parseRouteFraction(url.searchParams.get('fraction')),
      restoreLocation: restoreLocation || undefined,
      bookKey: sourcePath || label || 'default'
    };

    return {
      isWindowMode,
      pickerRequested: false,
      autoOpenKey: `library-file:${target.path}:${target.label}:${target.restoreLocation ?? ''}:${target.restoreFraction ?? ''}`,
      bookKey: target.bookKey,
      target
    };
  }

  return {
    isWindowMode,
    pickerRequested: source === 'picker',
    autoOpenKey: source,
    bookKey: label || 'default',
    target: null
  };
};

export const toReaderOpenControlRequest = (
  target: ReaderRouteOpenTarget,
  nonce: number
): ReaderControlRequest =>
  target.kind === 'asset'
    ? {
        type: 'asset',
        nonce,
        url: target.url,
        label: target.label
      }
    : {
        type: 'library-file',
        nonce,
        path: target.path,
        label: target.label,
        restoreFraction: target.restoreFraction,
        restoreLocation: target.restoreLocation
      };

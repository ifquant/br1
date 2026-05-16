// Ownership: this helper module defines one reader-domain contract that multiple
// UI surfaces depend on. Keep low-level normalization and invariants here so UI
// code can stay focused on reading semantics rather than format/runtime quirks.

import type { ReaderControlRequest, ReaderTtsReadAloudTextMode } from './types';
import type { ReaderTranslationProvider } from './assistance';

export type ReaderRouteOpenTarget =
  | {
      // `asset` opens an external/import-style source. The route only carries
      // the minimal handle needed to reopen it; deeper reader state still lives
      // in per-book persistence after the asset is loaded.
      kind: 'asset';
      label: string;
      url: string;
      bookKey: string;
    }
  | {
      // `library-file` reopens a known library item and may also carry one
      // restore anchor owned by the reader surface itself.
      kind: 'library-file';
      label: string;
      path: string;
      restoreFraction?: number;
      restoreLocation?: string;
      bookKey: string;
    };

export type ReaderRouteWorkspaceMode = 'translation' | 'tts';

export type ReaderRouteOpenState = {
  isWindowMode: boolean;
  pickerRequested: boolean;
  autoOpenKey: string;
  bookKey: string;
  target: ReaderRouteOpenTarget | null;
  // Workspace params are intentionally partial. The route may say "open TTS in
  // translated mode with this archive id", but deeper text payloads and most
  // current-book UI state still restore from local persistence.
  workspaceMode: ReaderRouteWorkspaceMode | null;
  ttsReadAloudTextMode: ReaderTtsReadAloudTextMode | null;
  translationTargetLanguage: string | null;
  translationProvider: ReaderTranslationProvider | null;
  translationHistoryEntryId: string | null;
};

const parseRouteFraction = (value: string | null) => {
  const parsed = Number(value ?? '');
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const parseReaderRouteOpenState = (url: URL): ReaderRouteOpenState => {
  // Boundary: route state carries compact identifiers only. Raw payload text
  // stays in current-book persistence because deep-linking arbitrary text would
  // turn this helper into a transport for content rather than a mode-selection contract.
  const source = url.searchParams.get('source') ?? '';
  const label = url.searchParams.get('label') ?? '';
  const isWindowMode = url.searchParams.get('mode') === 'window';
  const workspaceParam = url.searchParams.get('workspace');
  const workspaceMode: ReaderRouteWorkspaceMode | null =
    workspaceParam === 'translation' || workspaceParam === 'tts' ? workspaceParam : null;
  const ttsParam = url.searchParams.get('tts');
  const ttsReadAloudTextMode: ReaderTtsReadAloudTextMode | null =
    workspaceMode === 'tts' && (ttsParam === 'source' || ttsParam === 'translated') ? ttsParam : null;
  const translationTargetLanguageParam = url.searchParams.get('tl');
  const translationTargetLanguage =
    workspaceMode === 'translation' &&
    (translationTargetLanguageParam === 'zh' || translationTargetLanguageParam === 'en')
      ? translationTargetLanguageParam
      : null;
  const translationProviderParam = url.searchParams.get('tp');
  const translationProvider: ReaderTranslationProvider | null =
    workspaceMode === 'translation' &&
    (translationProviderParam === 'deepl' || translationProviderParam === 'yandex')
      ? translationProviderParam
      : null;
  const translationHistoryEntryParam = url.searchParams.get('ta')?.trim() ?? '';
  const translationHistoryEntryId =
    ((workspaceMode === 'translation') ||
      (workspaceMode === 'tts' && ttsReadAloudTextMode === 'translated')) &&
    translationHistoryEntryParam
      ? translationHistoryEntryParam
      : null;
  // The `ta` archive id is only meaningful for dedicated translation routes or
  // translated-TTS routes. Source-side TTS and non-translation workspaces do
  // not get to carry archived translation provenance through the URL.

  if (source === 'asset') {
    const sourceUrl = url.searchParams.get('url') ?? '';
    if (!sourceUrl) {
      return {
        isWindowMode,
        pickerRequested: false,
        autoOpenKey: '',
        bookKey: label || 'default',
        target: null,
        workspaceMode,
        ttsReadAloudTextMode,
        translationTargetLanguage,
        translationProvider,
        translationHistoryEntryId
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
      target,
      workspaceMode,
      ttsReadAloudTextMode,
      translationTargetLanguage,
      translationProvider,
      translationHistoryEntryId
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
        target: null,
        workspaceMode,
        ttsReadAloudTextMode,
        translationTargetLanguage,
        translationProvider,
        translationHistoryEntryId
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
      target,
      workspaceMode,
      ttsReadAloudTextMode,
      translationTargetLanguage,
      translationProvider,
      translationHistoryEntryId
    };
  }

  return {
    isWindowMode,
    pickerRequested: source === 'picker',
    autoOpenKey: source,
    bookKey: label || 'default',
    target: null,
    workspaceMode,
    ttsReadAloudTextMode,
    translationTargetLanguage,
    translationProvider,
    translationHistoryEntryId
  };
};

export const toReaderWorkspaceModeHref = (
  url: URL,
  workspaceMode: ReaderRouteWorkspaceMode | null,
  ttsReadAloudTextMode: ReaderTtsReadAloudTextMode | null = null,
  translationTargetLanguage: string | null = null,
  translationProvider: ReaderTranslationProvider | null = null,
  translationHistoryEntryId: string | null = null
) => {
  const nextUrl = new URL(url);
  // Boundary: only keep the params that are valid for the selected workspace
  // mode so stale translation/TTS state does not survive mode switches.
  if (workspaceMode) {
    nextUrl.searchParams.set('workspace', workspaceMode);
  } else {
    nextUrl.searchParams.delete('workspace');
  }
  if (workspaceMode === 'tts' && ttsReadAloudTextMode) {
    nextUrl.searchParams.set('tts', ttsReadAloudTextMode);
  } else {
    nextUrl.searchParams.delete('tts');
  }
  if (workspaceMode === 'translation' && translationTargetLanguage) {
    nextUrl.searchParams.set('tl', translationTargetLanguage);
  } else {
    nextUrl.searchParams.delete('tl');
  }
  if (workspaceMode === 'translation' && translationProvider) {
    nextUrl.searchParams.set('tp', translationProvider);
  } else {
    nextUrl.searchParams.delete('tp');
  }
  if (
    ((workspaceMode === 'translation') ||
      (workspaceMode === 'tts' && ttsReadAloudTextMode === 'translated')) &&
    translationHistoryEntryId?.trim()
  ) {
    // Archived translation provenance survives only on surfaces that can
    // actually consume it. Switching back to source TTS or closing the
    // workspace drops `ta` on purpose so old archive ids do not leak forward.
    nextUrl.searchParams.set('ta', translationHistoryEntryId.trim());
  } else {
    nextUrl.searchParams.delete('ta');
  }
  return `${nextUrl.pathname}${nextUrl.search}`;
};

export const toReaderOpenControlRequest = (
  target: ReaderRouteOpenTarget,
  nonce: number
): ReaderControlRequest =>
  // Route parsing stops at a neutral open target; this helper is the only place
  // that turns that target back into a concrete renderer control request.
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

export {
  resolveReaderAnnotationPopupSelectionForBookChange,
  resolveReaderMaturityBookRestoreState,
  resolveReaderMaturityRouteTranslationConfig,
  resolveReaderPlaybackQueueForEffectiveTtsTarget
} from './maturityMode';

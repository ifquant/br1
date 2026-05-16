// Ownership: workspace-mode helpers decide which reader workspace should be
// visible from plain inputs. The route still owns storage and navigation side
// effects, but URL precedence and tab-to-route mapping stay centralized here.

import type { ReaderTranslationProvider } from './assistance';
import type { ReaderRouteOpenState, ReaderRouteWorkspaceMode } from './route';
import type { ReaderTtsReadAloudTextMode } from './types';

export type ReaderNotebookWorkspaceTab =
  | 'notes'
  | 'highlights'
  | 'assistant'
  | 'translation'
  | 'tts'
  | 'sync';

export type ReaderNotebookShellState = {
  pinned: boolean;
  visible: boolean;
  activeTab: ReaderNotebookWorkspaceTab;
};

export type ReaderWorkspaceModeRouteRequest = {
  workspaceMode: ReaderRouteWorkspaceMode | null;
  ttsReadAloudTextMode: ReaderTtsReadAloudTextMode | null;
  translationTargetLanguage: string | null;
  translationProvider: ReaderTranslationProvider | null;
  translationHistoryEntryId: string | null;
};

export type ReaderRouteWorkspaceApplication =
  | {
      kind: 'open';
      notebookVisible: true;
      notebookTab: ReaderNotebookWorkspaceTab;
      lastAppliedRouteWorkspaceMode: ReaderRouteWorkspaceMode;
    }
  | {
      kind: 'clear';
      lastAppliedRouteWorkspaceMode: null;
    }
  | {
      kind: 'none';
    };

export const normalizeReaderNotebookWorkspaceTab = (
  value: unknown
): ReaderNotebookWorkspaceTab => {
  switch (value) {
    case 'highlights':
    case 'assistant':
    case 'translation':
    case 'tts':
    case 'sync':
      return value;
    default:
      return 'notes';
  }
};

export const getReaderDedicatedWorkspaceModeForNotebookTab = (
  tab: ReaderNotebookWorkspaceTab
): ReaderRouteWorkspaceMode | null => (tab === 'translation' || tab === 'tts' ? tab : null);

export const resolveReaderNotebookShellState = ({
  persisted,
  routeOpenState
}: {
  persisted: { pinned?: unknown; activeTab?: unknown } | null;
  routeOpenState: ReaderRouteOpenState;
}): ReaderNotebookShellState => {
  const routeWorkspaceTab = routeOpenState.workspaceMode;
  const pinned = !!persisted?.pinned;

  // Notebook shell restore is intentionally hybrid. Local persistence still
  // owns pinned state and the last remembered tab, but an explicit route
  // workspace mode must force the notebook open on the matching dedicated tab.
  return {
    pinned,
    visible: pinned || !!routeWorkspaceTab,
    activeTab: routeWorkspaceTab ?? normalizeReaderNotebookWorkspaceTab(persisted?.activeTab)
  };
};

export const resolveReaderWorkspaceModeRouteRequest = ({
  workspaceMode,
  ttsReadAloudTextMode = null,
  translationTargetLanguage = null,
  translationProvider = null,
  translationHistoryEntryId = null
}: ReaderWorkspaceModeRouteRequest): ReaderWorkspaceModeRouteRequest => {
  const normalizedTranslationHistoryEntryId = translationHistoryEntryId?.trim() || null;
  const keepsTranslationHistoryEntry =
    workspaceMode === 'translation' ||
    (workspaceMode === 'tts' && ttsReadAloudTextMode === 'translated');

  // The route contract only owns the dedicated translation/TTS slice. This
  // sanitizer drops payload that does not belong to the destination mode so
  // local notebook UI state does not accidentally leak stale route params.
  return {
    workspaceMode,
    ttsReadAloudTextMode: workspaceMode === 'tts' ? ttsReadAloudTextMode : null,
    translationTargetLanguage: workspaceMode === 'translation' ? translationTargetLanguage : null,
    translationProvider: workspaceMode === 'translation' ? translationProvider : null,
    translationHistoryEntryId: keepsTranslationHistoryEntry
      ? normalizedTranslationHistoryEntryId
      : null
  };
};

export const resolveReaderNotebookTabRouteRequest = ({
  tab,
  currentTtsReadAloudTextMode,
  currentTranslationTargetLanguage,
  currentTranslationProvider,
  currentTranslationHistoryEntryId
}: {
  tab: ReaderNotebookWorkspaceTab;
  currentTtsReadAloudTextMode: ReaderTtsReadAloudTextMode;
  currentTranslationTargetLanguage: string;
  currentTranslationProvider: ReaderTranslationProvider;
  currentTranslationHistoryEntryId: string;
}): ReaderWorkspaceModeRouteRequest =>
  // Most notebook tabs stay route-neutral. Only tabs that map to dedicated
  // workspace modes publish a partial route owner for deep-link / reopen flows.
  resolveReaderWorkspaceModeRouteRequest({
    workspaceMode: getReaderDedicatedWorkspaceModeForNotebookTab(tab),
    ttsReadAloudTextMode: tab === 'tts' ? currentTtsReadAloudTextMode : null,
    translationTargetLanguage: tab === 'translation' ? currentTranslationTargetLanguage : null,
    translationProvider: tab === 'translation' ? currentTranslationProvider : null,
    translationHistoryEntryId: currentTranslationHistoryEntryId
  });

export const resolveReaderTranslatedTtsWorkspaceRequest = ({
  routeOpenState,
  translatedTtsSourceKind,
  selectedTranslationHistoryEntryId,
  currentTranslationTargetLanguage,
  currentTranslationProvider
}: {
  routeOpenState: ReaderRouteOpenState;
  translatedTtsSourceKind: 'none' | 'live-translation' | 'archived-translation';
  selectedTranslationHistoryEntryId: string;
  currentTranslationTargetLanguage: string;
  currentTranslationProvider: ReaderTranslationProvider;
}): {
  translatedOwner: 'live' | 'archive';
  routeRequest: ReaderWorkspaceModeRouteRequest;
} => {
  const selectedArchiveId =
    routeOpenState.translationHistoryEntryId?.trim() || selectedTranslationHistoryEntryId.trim() || '';
  const prefersArchivedTranslation =
    routeOpenState.workspaceMode === 'translation'
      ? !!selectedArchiveId
      : translatedTtsSourceKind === 'archived-translation' && !!selectedArchiveId;
  const translatedOwner = prefersArchivedTranslation ? 'archive' : 'live';

  return {
    translatedOwner,
    routeRequest: resolveReaderWorkspaceModeRouteRequest({
      workspaceMode: 'tts',
      ttsReadAloudTextMode: 'translated',
      translationTargetLanguage: currentTranslationTargetLanguage,
      translationProvider: currentTranslationProvider,
      translationHistoryEntryId: translatedOwner === 'archive' ? selectedArchiveId : null
    })
  };
};

export const resolveReaderRouteWorkspaceApplication = ({
  routeOpenState,
  lastAppliedRouteWorkspaceMode
}: {
  routeOpenState: ReaderRouteOpenState;
  lastAppliedRouteWorkspaceMode: ReaderRouteWorkspaceMode | null;
}): ReaderRouteWorkspaceApplication => {
  // Route re-application is one-way and edge-triggered. The notebook should
  // react when the URL enters or clears a dedicated workspace mode, but local
  // shell toggles should not keep replaying the same route-open instruction on
  // every reactive pass.
  if (
    routeOpenState.workspaceMode &&
    routeOpenState.workspaceMode !== lastAppliedRouteWorkspaceMode
  ) {
    return {
      kind: 'open',
      notebookVisible: true,
      notebookTab: routeOpenState.workspaceMode,
      lastAppliedRouteWorkspaceMode: routeOpenState.workspaceMode
    };
  }

  if (!routeOpenState.workspaceMode && lastAppliedRouteWorkspaceMode) {
    return {
      kind: 'clear',
      lastAppliedRouteWorkspaceMode: null
    };
  }

  return { kind: 'none' };
};

export const resolveReaderRouteTtsReadAloudTextMode = ({
  routeOpenState,
  currentMode
}: {
  routeOpenState: ReaderRouteOpenState;
  currentMode: ReaderTtsReadAloudTextMode;
}): ReaderTtsReadAloudTextMode =>
  routeOpenState.workspaceMode === 'tts' && routeOpenState.ttsReadAloudTextMode
    ? routeOpenState.ttsReadAloudTextMode
    : currentMode;

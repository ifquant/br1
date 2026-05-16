// Ownership: pure helpers for the ReaderSidebar highlights workspace payload.
// ReaderSidebar.svelte still owns mutable state, async loading/saving, and the
// service/localStorage IO branches.

import type {
  ReaderHighlightSelectionSet,
  ReaderHighlightSelectionSetSort,
  ReaderHighlightsFilter,
  ReaderHighlightsSort,
  ReaderHighlightsWorkspaceState
} from '$lib/reader';
import { isReaderHighlightSelectionImportSource } from './sidebarHighlightSelections';

export type ReaderSidebarHighlightsWorkspaceModel = {
  highlightsFilter: ReaderHighlightsFilter;
  highlightsSort: ReaderHighlightsSort;
  savedHighlightSelectionsSort: ReaderHighlightSelectionSetSort;
  savedHighlightSelectionsRefreshFilter: 'all' | 'full' | 'partial' | 'missed';
  selectedHighlightIds: Set<string>;
  savedHighlightSelections: ReaderHighlightSelectionSet[];
};

export const createDefaultReaderSidebarHighlightsWorkspaceState =
  (): ReaderSidebarHighlightsWorkspaceModel => ({
    highlightsFilter: 'all',
    highlightsSort: 'recent',
    savedHighlightSelectionsSort: 'recent',
    savedHighlightSelectionsRefreshFilter: 'all',
    selectedHighlightIds: new Set(),
    savedHighlightSelections: []
  });

export const normalizeReaderSidebarHighlightsWorkspaceState = (
  state: unknown,
  now = Date.now()
): ReaderSidebarHighlightsWorkspaceModel => {
  if (!state || typeof state !== 'object') {
    return createDefaultReaderSidebarHighlightsWorkspaceState();
  }
  const candidate = state as Partial<ReaderHighlightsWorkspaceState>;

  return {
    highlightsFilter:
      candidate.filter === 'chapter' || candidate.filter === 'selected' ? candidate.filter : 'all',
    highlightsSort: candidate.sort === 'oldest' ? 'oldest' : 'recent',
    savedHighlightSelectionsSort: candidate.savedSelectionsSort === 'oldest' ? 'oldest' : 'recent',
    savedHighlightSelectionsRefreshFilter:
      candidate.savedSelectionsRefreshFilter === 'full' ||
      candidate.savedSelectionsRefreshFilter === 'partial' ||
      candidate.savedSelectionsRefreshFilter === 'missed'
        ? candidate.savedSelectionsRefreshFilter
        : 'all',
    selectedHighlightIds: new Set(
      Array.isArray(candidate.selectedIds)
        ? candidate.selectedIds.filter((id: unknown): id is string => typeof id === 'string')
        : []
    ),
    savedHighlightSelections: Array.isArray(candidate.savedSelections)
      ? candidate.savedSelections
          .map((set: unknown): ReaderHighlightSelectionSet | null =>
            normalizeReaderHighlightSelectionSet(set, now)
          )
          .filter((set): set is ReaderHighlightSelectionSet => !!set)
      : []
  };
};

export const toReaderHighlightsWorkspacePersistenceState = (
  model: ReaderSidebarHighlightsWorkspaceModel
): ReaderHighlightsWorkspaceState => ({
  filter: model.highlightsFilter,
  sort: model.highlightsSort,
  savedSelectionsSort: model.savedHighlightSelectionsSort,
  savedSelectionsRefreshFilter: model.savedHighlightSelectionsRefreshFilter,
  selectedIds: Array.from(model.selectedHighlightIds),
  savedSelections: model.savedHighlightSelections
});

const normalizeReaderHighlightSelectionSet = (
  value: unknown,
  now: number
): ReaderHighlightSelectionSet | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ReaderHighlightSelectionSet>;
  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') return null;

  // Saved sets can come from older localStorage payloads. Keep the usable core
  // fields and drop malformed import metadata instead of making the entire
  // highlights workspace impossible to restore.
  const importSource = isReaderHighlightSelectionImportSource(candidate.importSource)
    ? {
        ...candidate.importSource,
        highlights: candidate.importSource.highlights.map((highlight) => ({ ...highlight }))
      }
    : null;

  return {
    id: candidate.id,
    name: candidate.name,
    selectedIds: Array.isArray(candidate.selectedIds)
      ? candidate.selectedIds.filter((id: unknown): id is string => typeof id === 'string')
      : [],
    createdAt:
      typeof candidate.createdAt === 'number' && Number.isFinite(candidate.createdAt)
        ? candidate.createdAt
        : now,
    ...(importSource ? { importSource } : {})
  };
};

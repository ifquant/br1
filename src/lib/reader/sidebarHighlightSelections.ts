import type {
  ReaderHighlightSelectionSet,
  ReaderHighlightSelectionSetExport,
  ReaderHighlightSelectionSetExportHighlight,
  ReaderSidebarNotesState
} from '$lib/reader';

export type ReaderHighlightSelectionsRefreshFilter = 'all' | 'full' | 'partial' | 'missed';

export interface ReaderHighlightSelectionsRefreshCounts {
  full: number;
  partial: number;
  missed: number;
}

export interface ReaderHighlightSelectionsRefreshSummary {
  refreshedCount: number;
  fullMatches: string[];
  partialMatches: Array<{ name: string; matchedCount: number; totalCount: number }>;
  missedMatches: Array<{ name: string; totalCount: number }>;
}

export interface ReaderHighlightSelectionsImportPreview {
  selectionName: string;
  selectionCreatedAt: number;
  sourceBookKey: string;
  sourceBookTitle: string;
  sourceFormatLabel: string;
  matchedCount: number;
  totalCount: number;
  importedIds: string[];
  unmatchedTexts: string[];
  sourceHighlights: ReaderHighlightSelectionSetExportHighlight[];
}

export type ReaderHighlightSelectionsRefreshOutcome =
  | 'full'
  | 'partial'
  | 'missed'
  | 'manual';

export type ReaderHighlightSelectionsFormatTimestamp = (value: number) => string;
export type ReaderHighlightSelectionsRefreshDetail = (selectionSet: ReaderHighlightSelectionSet) => string;
export type ReaderHighlightSelectionsUnmatchedTexts = (selectionSet: ReaderHighlightSelectionSet) => string[];
export type ReaderHighlightSelectionsRefreshOutcomeResolver = (
  selectionSet: ReaderHighlightSelectionSet
) => ReaderHighlightSelectionsRefreshOutcome;
export type ReaderHighlightSelectionsRefreshLabel = (outcome: 'full' | 'partial' | 'missed') => string;

type ReaderHighlightSelectionImportSource = NonNullable<ReaderHighlightSelectionSet['importSource']>;
type ReaderSidebarHighlight = ReaderSidebarNotesState['notes'][number];

export type ReaderHighlightSelectionImportParseResult =
  | { ok: true; value: ReaderHighlightSelectionSetExport }
  | { ok: false; reason: 'json' | 'shape' };

export interface ReaderHighlightSelectionImportResolution {
  importedIds: string[];
  unmatchedTexts: string[];
}

export const buildReaderHighlightSelectionRefreshOutcome = (
  name: string,
  matchedCount: number,
  totalCount: number
) => ({
  name,
  matchedCount,
  totalCount
});

export const getReaderHighlightSelectionRefreshOutcome = (
  selectionSet: ReaderHighlightSelectionSet
): ReaderHighlightSelectionsRefreshOutcome => {
  if (!selectionSet.importSource) return 'manual';
  if (selectionSet.importSource.matchedCount <= 0) return 'missed';
  if (selectionSet.importSource.matchedCount >= selectionSet.importSource.totalCount) return 'full';
  return 'partial';
};

export const getReaderHighlightSelectionRefreshLabel = (
  outcome: 'full' | 'partial' | 'missed'
) => {
  if (outcome === 'full') return '完全匹配';
  if (outcome === 'partial') return '部分匹配';
  return '未匹配';
};

export const getReaderHighlightSelectionRefreshDetail = (
  selectionSet: ReaderHighlightSelectionSet
) => {
  const importSource = selectionSet.importSource;
  if (!importSource) return '';

  if (importSource.unmatchedCount <= 0) {
    return `已全部映射 ${importSource.matchedCount}/${importSource.totalCount}`;
  }

  return `未命中 ${importSource.unmatchedCount} 条，可刷新映射`;
};

export const isReaderHighlightSelectionImportSource = (
  value: unknown
): value is ReaderHighlightSelectionImportSource =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as { bookKey?: unknown }).bookKey === 'string' &&
  typeof (value as { bookTitle?: unknown }).bookTitle === 'string' &&
  typeof (value as { formatLabel?: unknown }).formatLabel === 'string' &&
  typeof (value as { selectionName?: unknown }).selectionName === 'string' &&
  typeof (value as { matchedCount?: unknown }).matchedCount === 'number' &&
  typeof (value as { totalCount?: unknown }).totalCount === 'number' &&
  typeof (value as { unmatchedCount?: unknown }).unmatchedCount === 'number' &&
  typeof (value as { importedAt?: unknown }).importedAt === 'number' &&
  Array.isArray((value as { highlights?: unknown }).highlights) &&
  (value as { highlights: unknown[] }).highlights.every(isReaderHighlightSelectionExportHighlight);

export const isReaderHighlightSelectionSetExport = (
  value: unknown
): value is ReaderHighlightSelectionSetExport => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ReaderHighlightSelectionSetExport>;
  const selectionSet = candidate.selectionSet as Partial<ReaderHighlightSelectionSet> | undefined;
  const highlights = candidate.highlights as Partial<ReaderHighlightSelectionSetExportHighlight>[] | undefined;

  return (
    candidate.schemaVersion === 1 &&
    typeof candidate.bookKey === 'string' &&
    typeof candidate.bookTitle === 'string' &&
    typeof candidate.bookAuthor === 'string' &&
    typeof candidate.formatLabel === 'string' &&
    typeof candidate.exportedAt === 'number' &&
    !!selectionSet &&
    typeof selectionSet.id === 'string' &&
    typeof selectionSet.name === 'string' &&
    typeof selectionSet.createdAt === 'number' &&
    (selectionSet.importSource === undefined ||
      isReaderHighlightSelectionImportSource(selectionSet.importSource)) &&
    Array.isArray(selectionSet.selectedIds) &&
    selectionSet.selectedIds.every((id) => typeof id === 'string') &&
    Array.isArray(highlights) &&
    highlights.every(isReaderHighlightSelectionExportHighlight)
  );
};

export const parseReaderHighlightSelectionSetExportPayload = (
  payload: string
): ReaderHighlightSelectionImportParseResult => {
  try {
    const parsed = JSON.parse(payload);
    return isReaderHighlightSelectionSetExport(parsed)
      ? { ok: true, value: parsed }
      : { ok: false, reason: 'shape' };
  } catch {
    return { ok: false, reason: 'json' };
  }
};

export const createReaderImportedSelectionSetName = (
  name: string,
  savedHighlightSelections: ReaderHighlightSelectionSet[]
) => {
  if (!savedHighlightSelections.some((selectionSet) => selectionSet.name === name)) {
    return name;
  }

  let suffix = 2;
  while (savedHighlightSelections.some((selectionSet) => selectionSet.name === `${name} (${suffix})`)) {
    suffix += 1;
  }
  return `${name} (${suffix})`;
};

export const findExistingReaderCrossBookImportedSelection = (
  savedHighlightSelections: ReaderHighlightSelectionSet[],
  sourceBookKey: string,
  sourceSelectionName: string
) =>
  savedHighlightSelections.find(
    (selectionSet) =>
      selectionSet.importSource?.bookKey === sourceBookKey &&
      selectionSet.importSource?.selectionName === sourceSelectionName
  );

const isReaderHighlightSelectionExportHighlight = (
  value: unknown
): value is ReaderHighlightSelectionSetExportHighlight =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as { id?: unknown }).id === 'string' &&
  typeof (value as { cfi?: unknown }).cfi === 'string' &&
  typeof (value as { text?: unknown }).text === 'string' &&
  typeof (value as { chapterLabel?: unknown }).chapterLabel === 'string' &&
  typeof (value as { chapterHref?: unknown }).chapterHref === 'string' &&
  typeof (value as { createdAt?: unknown }).createdAt === 'number';

const normalizeImportedHighlightText = (text: string) => text.replace(/\s+/g, ' ').trim();

export const resolveReaderImportedHighlightIds = (
  payload: ReaderHighlightSelectionSetExport,
  allHighlights: ReaderSidebarHighlight[]
): ReaderHighlightSelectionImportResolution => {
  const validHighlightIds = new Set(allHighlights.map((note) => note.id));
  const importedIdSet = new Set(
    payload.selectionSet.selectedIds.filter((id) => validHighlightIds.has(id))
  );
  const unmatchedTexts: string[] = [];

  // Imports from older books may carry stale highlight ids. Resolve by exact
  // stored locator first, then by normalized text plus chapter anchor so a
  // reimported copy of the same book can still map useful matches.
  if (importedIdSet.size < payload.selectionSet.selectedIds.length) {
    for (const exportedHighlight of payload.highlights) {
      if (Array.from(importedIdSet).some((id) => id === exportedHighlight.id)) continue;

      const matchedHighlight = allHighlights.find(
        (note) =>
          note.cfi === exportedHighlight.cfi &&
          note.text === exportedHighlight.text &&
          note.chapterHref === exportedHighlight.chapterHref
      );
      if (matchedHighlight) {
        importedIdSet.add(matchedHighlight.id);
        continue;
      }

      const matchedByTextAnchor = allHighlights.find((note) => {
        const normalizedCurrentText = normalizeImportedHighlightText(note.text);
        const normalizedExportedText = normalizeImportedHighlightText(exportedHighlight.text);
        return (
          normalizedCurrentText === normalizedExportedText &&
          (note.chapterHref === exportedHighlight.chapterHref ||
            note.chapterLabel === exportedHighlight.chapterLabel)
        );
      });
      if (matchedByTextAnchor) {
        importedIdSet.add(matchedByTextAnchor.id);
        continue;
      }

      unmatchedTexts.push(exportedHighlight.text);
    }
  }

  return {
    importedIds: Array.from(importedIdSet),
    unmatchedTexts
  };
};

export const getReaderHighlightSelectionUnmatchedTexts = (
  selectionSet: ReaderHighlightSelectionSet,
  allHighlights: ReaderSidebarHighlight[]
) => {
  const importSource = selectionSet.importSource;
  if (!importSource || importSource.unmatchedCount <= 0) return [];

  const resolution = resolveReaderImportedHighlightIds(
    createReaderHighlightSelectionExportFromImportSource(selectionSet, importSource),
    allHighlights
  );

  return resolution.unmatchedTexts.slice(0, 3);
};

export const createReaderHighlightSelectionImportPreview = (
  parsed: ReaderHighlightSelectionSetExport,
  resolution: ReaderHighlightSelectionImportResolution
): ReaderHighlightSelectionsImportPreview => ({
  selectionName: parsed.selectionSet.name,
  selectionCreatedAt: parsed.selectionSet.createdAt,
  sourceBookKey: parsed.bookKey,
  sourceBookTitle: parsed.bookTitle,
  sourceFormatLabel: parsed.formatLabel,
  matchedCount: resolution.importedIds.length,
  totalCount: parsed.highlights.length,
  importedIds: resolution.importedIds,
  unmatchedTexts: resolution.unmatchedTexts.slice(0, 3),
  sourceHighlights: parsed.highlights.map((highlight) => ({ ...highlight }))
});

export const createReaderHighlightSelectionImportSource = (
  preview: ReaderHighlightSelectionsImportPreview,
  now: number
): ReaderHighlightSelectionImportSource => ({
  bookKey: preview.sourceBookKey,
  bookTitle: preview.sourceBookTitle,
  formatLabel: preview.sourceFormatLabel,
  selectionName: preview.selectionName,
  matchedCount: preview.matchedCount,
  totalCount: preview.totalCount,
  unmatchedCount: preview.totalCount - preview.matchedCount,
  importedAt: now,
  highlights: preview.sourceHighlights.map((highlight) => ({ ...highlight }))
});

export const createReaderHighlightSelectionExportFromImportSource = (
  selectionSet: ReaderHighlightSelectionSet,
  importSource: ReaderHighlightSelectionImportSource
): ReaderHighlightSelectionSetExport => ({
  schemaVersion: 1,
  bookKey: importSource.bookKey,
  bookTitle: importSource.bookTitle,
  bookAuthor: '',
  formatLabel: importSource.formatLabel,
  exportedAt: importSource.importedAt,
  selectionSet: {
    id: selectionSet.id,
    name: selectionSet.name,
    selectedIds: importSource.highlights.map((highlight) => highlight.id),
    createdAt: selectionSet.createdAt
  },
  highlights: importSource.highlights
});

export const refreshReaderCrossBookImportedSelection = (
  selectionSet: ReaderHighlightSelectionSet,
  allHighlights: ReaderSidebarHighlight[],
  now: number
) => {
  const importSource = selectionSet.importSource;
  if (!importSource) return null;

  const resolution = resolveReaderImportedHighlightIds(
    createReaderHighlightSelectionExportFromImportSource(selectionSet, importSource),
    allHighlights
  );
  const nextSelectionSet: ReaderHighlightSelectionSet = {
    ...selectionSet,
    selectedIds: resolution.importedIds,
    importSource: {
      ...importSource,
      matchedCount: resolution.importedIds.length,
      unmatchedCount: importSource.totalCount - resolution.importedIds.length,
      importedAt: now
    }
  };

  return {
    selectionSet: nextSelectionSet,
    resolution,
    summary: createReaderHighlightSelectionRefreshSummary([
      {
        name: selectionSet.name,
        matchedCount: resolution.importedIds.length,
        totalCount: importSource.totalCount
      }
    ])
  };
};

export const refreshAllReaderCrossBookImportedSelections = (
  savedHighlightSelections: ReaderHighlightSelectionSet[],
  allHighlights: ReaderSidebarHighlight[],
  now: number
) => {
  const outcomes: Array<{ name: string; matchedCount: number; totalCount: number }> = [];
  const selectionSets = savedHighlightSelections.map((selectionSet) => {
    const refreshed = refreshReaderCrossBookImportedSelection(selectionSet, allHighlights, now);
    if (!refreshed) return selectionSet;
    outcomes.push({
      name: selectionSet.name,
      matchedCount: refreshed.resolution.importedIds.length,
      totalCount: selectionSet.importSource?.totalCount ?? refreshed.resolution.importedIds.length
    });
    return refreshed.selectionSet;
  });

  return {
    selectionSets,
    summary: createReaderHighlightSelectionRefreshSummary(outcomes)
  };
};

export const createReaderHighlightSelectionRefreshSummary = (
  outcomes: Array<{ name: string; matchedCount: number; totalCount: number }>
): ReaderHighlightSelectionsRefreshSummary => {
  const fullMatches: string[] = [];
  const partialMatches: Array<{ name: string; matchedCount: number; totalCount: number }> = [];
  const missedMatches: Array<{ name: string; totalCount: number }> = [];

  for (const outcome of outcomes) {
    if (outcome.matchedCount === outcome.totalCount) {
      fullMatches.push(outcome.name);
    } else if (outcome.matchedCount === 0) {
      missedMatches.push({ name: outcome.name, totalCount: outcome.totalCount });
    } else {
      partialMatches.push(
        buildReaderHighlightSelectionRefreshOutcome(
          outcome.name,
          outcome.matchedCount,
          outcome.totalCount
        )
      );
    }
  }

  return {
    refreshedCount: outcomes.length,
    fullMatches,
    partialMatches,
    missedMatches
  };
};

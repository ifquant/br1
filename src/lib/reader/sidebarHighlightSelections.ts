import type {
  ReaderHighlightSelectionSet,
  ReaderHighlightSelectionSetExportHighlight
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

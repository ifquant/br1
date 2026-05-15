// Ownership: this helper keeps temporary focused-reading semantics outside the
// route and overlay components. UI code decides when to enter/exit a mode, but
// the source-text fallback order and RSVP stepping rules live here.

import type { ReaderPreviewState, ReaderSelectionState } from './types';

export type ReaderFocusedReadingMode = 'off' | 'paragraph' | 'rsvp';

export type ReaderFocusedReadingState = {
  mode: ReaderFocusedReadingMode;
  formatLabel: string;
  sourceText: string;
  sourceLabel: string;
  progressLabel: string;
  progressLocation: string;
  words: string[];
  activeWordIndex: number;
  capabilityMessage: string;
};

type ReaderFocusedReadingSourceInput = {
  preview: ReaderPreviewState;
  selection?: ReaderSelectionState | null;
};

const normalizeExcerptText = (value: string | null | undefined) => value?.trim() ?? '';

const isUnsupportedFocusedReadingFormat = (formatLabel: string) =>
  formatLabel === 'PDF' || formatLabel === 'CBZ';

const getFocusedReadingCapabilityMessage = (
  formatLabel: string,
  hasText: boolean
) => {
  if (formatLabel === 'PDF') {
    return 'PDF 正文暂时不能进入专注阅读，因为安全文本层还没有接入这条临时模式。';
  }
  if (formatLabel === 'CBZ') {
    return 'CBZ 图片页暂时不能进入专注阅读，因为当前没有可复用的正文文本。';
  }
  if (!hasText) {
    return '当前没有可用的正文摘录。先翻页、滚动，或选中一段正文后再试。';
  }
  return '';
};

const createFocusedReadingPayload = (
  mode: Exclude<ReaderFocusedReadingMode, 'off'>,
  preview: ReaderPreviewState,
  sourceText: string,
  sourceLabel: string,
  words: string[] = []
): ReaderFocusedReadingState => ({
  mode,
  formatLabel: preview.formatLabel,
  sourceText,
  sourceLabel,
  progressLabel: preview.progressLabel,
  progressLocation: preview.progressLocation,
  words,
  activeWordIndex: 0,
  capabilityMessage: getFocusedReadingCapabilityMessage(preview.formatLabel, sourceText.length > 0)
});

const getParagraphFocusSource = ({ preview, selection }: ReaderFocusedReadingSourceInput) => {
  const selectionText = normalizeExcerptText(selection?.text);
  if (selectionText) {
    return {
      text: selectionText,
      label: '当前选区'
    };
  }

  const previewText = normalizeExcerptText(preview.ttsSourceText);
  if (previewText) {
    return {
      text: previewText,
      label: normalizeExcerptText(preview.ttsSourceLabel) || normalizeExcerptText(preview.chapterLabel) || '当前正文'
    };
  }

  return {
    text: '',
    label: normalizeExcerptText(preview.ttsSourceLabel) || '当前正文'
  };
};

const getRsvpSource = ({ preview, selection }: ReaderFocusedReadingSourceInput) => {
  const selectionText = normalizeExcerptText(selection?.text);
  if (selectionText) {
    return {
      text: selectionText,
      label: '当前选区'
    };
  }

  const previewText = normalizeExcerptText(preview.ttsSourceText);
  if (previewText) {
    return {
      text: previewText,
      label: normalizeExcerptText(preview.ttsSourceLabel) || normalizeExcerptText(preview.chapterLabel) || '当前正文'
    };
  }

  return {
    text: '',
    label: normalizeExcerptText(preview.ttsSourceLabel) || '当前正文'
  };
};

const splitReaderRsvpWords = (text: string) =>
  text
    .split(/\s+/u)
    .map((word) => word.trim())
    .filter(Boolean);

export const createReaderFocusedReadingState = (
  overrides: Partial<ReaderFocusedReadingState> = {}
): ReaderFocusedReadingState => ({
  mode: 'off',
  formatLabel: '',
  sourceText: '',
  sourceLabel: '',
  progressLabel: '',
  progressLocation: '',
  words: [],
  activeWordIndex: 0,
  capabilityMessage: '',
  ...overrides
});

export const startReaderParagraphFocus = (
  _state: ReaderFocusedReadingState,
  input: ReaderFocusedReadingSourceInput
) => {
  const source = getParagraphFocusSource(input);
  return createFocusedReadingPayload('paragraph', input.preview, source.text, source.label);
};

export const startReaderRsvpLite = (
  _state: ReaderFocusedReadingState,
  input: ReaderFocusedReadingSourceInput
) => {
  const source = getRsvpSource(input);
  const words = splitReaderRsvpWords(source.text);
  return createFocusedReadingPayload('rsvp', input.preview, source.text, source.label, words);
};

export const advanceReaderRsvpWord = (state: ReaderFocusedReadingState, delta: number) => {
  if (state.mode !== 'rsvp' || state.words.length === 0) {
    return state;
  }

  return {
    ...state,
    activeWordIndex: Math.min(
      state.words.length - 1,
      Math.max(0, state.activeWordIndex + Math.trunc(delta))
    )
  };
};

export const exitReaderFocusedReading = (_state: ReaderFocusedReadingState) =>
  createReaderFocusedReadingState();

export const getReaderFocusedReadingSummary = (state: ReaderFocusedReadingState) => {
  if (state.mode === 'off') {
    return '专注阅读未开启。';
  }

  if (state.capabilityMessage) {
    return state.capabilityMessage;
  }

  if (state.mode === 'paragraph') {
    return `段落聚焦 · ${state.sourceLabel || '当前正文'} · ${state.progressLabel || '当前位置'}`;
  }

  if (state.words.length === 0) {
    return 'RSVP-lite 还没有可播放的词序列。';
  }

  return `RSVP-lite · ${state.activeWordIndex + 1} / ${state.words.length} 词 · ${state.sourceLabel || '当前正文'}`;
};

export const canStartReaderFocusedReading = (preview: ReaderPreviewState) =>
  !isUnsupportedFocusedReadingFormat(preview.formatLabel);

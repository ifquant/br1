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
  paceWpm: number;
  capabilityMessage: string;
};

export type ReaderFocusedReadingPersistedState = {
  schemaVersion: 1;
  mode: Exclude<ReaderFocusedReadingMode, 'off'>;
  formatLabel: string;
  sourceText: string;
  sourceLabel: string;
  progressLabel: string;
  progressLocation: string;
  words: string[];
  activeWordIndex: number;
  paceWpm?: number;
};

type ReaderFocusedReadingSourceInput = {
  preview: ReaderPreviewState;
  selection?: ReaderSelectionState | null;
};

const normalizeExcerptText = (value: string | null | undefined) => value?.trim() ?? '';

export const READER_RSVP_LITE_MIN_WPM = 120;
export const READER_RSVP_LITE_DEFAULT_WPM = 240;
export const READER_RSVP_LITE_MAX_WPM = 480;
const READER_RSVP_LITE_PACE_STEP_WPM = 40;

const normalizeFocusedReadingFormatLabel = (value: string | null | undefined) =>
  value?.trim().toUpperCase() ?? '';

const isUnsupportedFocusedReadingFormat = (formatLabel: string) =>
  normalizeFocusedReadingFormatLabel(formatLabel) === 'PDF' ||
  normalizeFocusedReadingFormatLabel(formatLabel) === 'CBZ';

const canPersistFocusedReadingFormat = (formatLabel: string) => {
  const normalizedFormatLabel = normalizeFocusedReadingFormatLabel(formatLabel);
  return !!normalizedFormatLabel && !isUnsupportedFocusedReadingFormat(normalizedFormatLabel);
};

const getFocusedReadingCapabilityMessage = (
  formatLabel: string,
  hasText: boolean
) => {
  const normalizedFormatLabel = normalizeFocusedReadingFormatLabel(formatLabel);
  if (normalizedFormatLabel === 'PDF') {
    return 'PDF 正文暂时不能进入专注阅读，因为安全文本层还没有接入这条临时模式。';
  }
  if (normalizedFormatLabel === 'CBZ') {
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
  words: string[] = [],
  paceWpm = READER_RSVP_LITE_DEFAULT_WPM
): ReaderFocusedReadingState => ({
  mode,
  formatLabel: preview.formatLabel,
  sourceText,
  sourceLabel,
  progressLabel: preview.progressLabel,
  progressLocation: preview.progressLocation,
  words,
  activeWordIndex: 0,
  paceWpm,
  capabilityMessage: getFocusedReadingCapabilityMessage(preview.formatLabel, sourceText.length > 0)
});

// Same-excerpt transitions intentionally do not accept a fresh preview or DOM
// selection. Once the overlay is open, these helpers must keep reusing the
// exact excerpt the reader is already looking at instead of pretending we can
// safely ask the viewport for a brand-new paragraph anchor.
const createFocusedReadingPayloadForSameExcerpt = (
  state: ReaderFocusedReadingState,
  mode: Exclude<ReaderFocusedReadingMode, 'off'>,
  words: string[] = [],
  paceWpm = READER_RSVP_LITE_DEFAULT_WPM
): ReaderFocusedReadingState => ({
  ...createReaderFocusedReadingState({
    mode,
    formatLabel: state.formatLabel,
    sourceText: state.sourceText,
    sourceLabel: state.sourceLabel,
    progressLabel: state.progressLabel,
    progressLocation: state.progressLocation,
    words,
    activeWordIndex: 0,
    paceWpm,
    capabilityMessage: getFocusedReadingCapabilityMessage(
      state.formatLabel,
      normalizeExcerptText(state.sourceText).length > 0
    )
  })
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

const clampReaderRsvpWordIndex = (words: string[], activeWordIndex: number) => {
  if (words.length === 0) {
    return 0;
  }
  if (!Number.isFinite(activeWordIndex)) {
    return 0;
  }
  return Math.min(words.length - 1, Math.max(0, Math.trunc(activeWordIndex)));
};

const normalizeReaderRsvpLitePace = (paceWpm: number) => {
  if (!Number.isFinite(paceWpm)) {
    return READER_RSVP_LITE_DEFAULT_WPM;
  }
  return Math.min(
    READER_RSVP_LITE_MAX_WPM,
    Math.max(READER_RSVP_LITE_MIN_WPM, Math.trunc(paceWpm))
  );
};

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
  paceWpm: READER_RSVP_LITE_DEFAULT_WPM,
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
  state: ReaderFocusedReadingState,
  input: ReaderFocusedReadingSourceInput
) => {
  const source = getRsvpSource(input);
  const words = splitReaderRsvpWords(source.text);
  return {
    ...createFocusedReadingPayload('rsvp', input.preview, source.text, source.label, words),
    paceWpm:
      state.mode === 'rsvp'
        ? normalizeReaderRsvpLitePace(state.paceWpm)
        : READER_RSVP_LITE_DEFAULT_WPM
  };
};

export const changeReaderFocusedReadingModeForSameExcerpt = (
  state: ReaderFocusedReadingState,
  mode: Exclude<ReaderFocusedReadingMode, 'off'>
) => {
  if (state.mode === 'off') {
    return state;
  }

  if (mode === 'paragraph') {
    return createFocusedReadingPayloadForSameExcerpt(state, 'paragraph');
  }

  const words =
    state.words.length > 0 ? state.words : splitReaderRsvpWords(normalizeExcerptText(state.sourceText));
  return createFocusedReadingPayloadForSameExcerpt(
    state,
    'rsvp',
    words,
    state.mode === 'rsvp'
      ? normalizeReaderRsvpLitePace(state.paceWpm)
      : READER_RSVP_LITE_DEFAULT_WPM
  );
};

export const restartReaderFocusedReadingRsvpFromWordOne = (state: ReaderFocusedReadingState) => {
  if (state.mode !== 'rsvp') {
    return state;
  }

  const words =
    state.words.length > 0 ? state.words : splitReaderRsvpWords(normalizeExcerptText(state.sourceText));
  return createFocusedReadingPayloadForSameExcerpt(
    state,
    'rsvp',
    words,
    normalizeReaderRsvpLitePace(state.paceWpm)
  );
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

const updateReaderRsvpLitePace = (state: ReaderFocusedReadingState, deltaWpm: number) => {
  if (state.mode !== 'rsvp') {
    return state;
  }

  return {
    ...state,
    paceWpm: normalizeReaderRsvpLitePace(state.paceWpm + deltaWpm)
  };
};

export const increaseReaderRsvpLitePace = (state: ReaderFocusedReadingState) =>
  updateReaderRsvpLitePace(state, READER_RSVP_LITE_PACE_STEP_WPM);

export const decreaseReaderRsvpLitePace = (state: ReaderFocusedReadingState) =>
  updateReaderRsvpLitePace(state, -READER_RSVP_LITE_PACE_STEP_WPM);

export const getReaderRsvpLiteIntervalMs = (paceWpm: number) =>
  Math.max(60, Math.round(60000 / normalizeReaderRsvpLitePace(paceWpm)));

export const canAdvanceReaderRsvpWord = (state: ReaderFocusedReadingState) =>
  state.mode === 'rsvp' && state.words.length > 0 && state.activeWordIndex < state.words.length - 1;

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

export const serializeReaderFocusedReadingState = (
  state: ReaderFocusedReadingState
): ReaderFocusedReadingPersistedState | null => {
  if (state.mode === 'off') {
    return null;
  }

  const formatLabel = normalizeFocusedReadingFormatLabel(state.formatLabel);
  const sourceText = normalizeExcerptText(state.sourceText);
  if (!sourceText || !canPersistFocusedReadingFormat(formatLabel)) {
    return null;
  }

  // This first resume slice stores the actual text shown in the overlay as the
  // durable anchor. That is honest for TXT/EPUB-like text surfaces, but not for
  // PDF/CBZ where the visible selection is not yet a stable reader locator.
  const words =
    state.mode === 'rsvp'
      ? (state.words.length > 0 ? state.words : splitReaderRsvpWords(sourceText))
          .map((word) => word.trim())
          .filter(Boolean)
      : [];

  return {
    schemaVersion: 1,
    mode: state.mode,
    formatLabel,
    sourceText,
    sourceLabel: normalizeExcerptText(state.sourceLabel) || '当前正文',
    progressLabel: normalizeExcerptText(state.progressLabel),
    progressLocation: normalizeExcerptText(state.progressLocation),
    words,
    activeWordIndex: state.mode === 'rsvp' ? clampReaderRsvpWordIndex(words, state.activeWordIndex) : 0,
    paceWpm: state.mode === 'rsvp' ? normalizeReaderRsvpLitePace(state.paceWpm) : undefined
  };
};

export const parseReaderFocusedReadingPersistedState = (
  value: unknown
): ReaderFocusedReadingState => {
  if (!value || typeof value !== 'object') {
    return createReaderFocusedReadingState();
  }

  const payload = value as Partial<ReaderFocusedReadingPersistedState>;
  const mode = payload.mode === 'paragraph' || payload.mode === 'rsvp' ? payload.mode : 'off';
  const formatLabel =
    typeof payload.formatLabel === 'string'
      ? normalizeFocusedReadingFormatLabel(payload.formatLabel)
      : '';
  const sourceText = typeof payload.sourceText === 'string' ? normalizeExcerptText(payload.sourceText) : '';
  if (payload.schemaVersion !== 1 || mode === 'off' || !sourceText || !canPersistFocusedReadingFormat(formatLabel)) {
    return createReaderFocusedReadingState();
  }

  const persistedWords =
    mode === 'rsvp' && Array.isArray(payload.words)
      ? payload.words
          .filter((word): word is string => typeof word === 'string')
          .map((word) => word.trim())
          .filter(Boolean)
      : [];
  const restoredWords =
    mode === 'rsvp'
      ? persistedWords.length > 0
        ? persistedWords
        : splitReaderRsvpWords(sourceText)
      : [];

  return createReaderFocusedReadingState({
    mode,
    formatLabel,
    sourceText,
    sourceLabel:
      typeof payload.sourceLabel === 'string'
        ? normalizeExcerptText(payload.sourceLabel) || '当前正文'
        : '当前正文',
    progressLabel:
      typeof payload.progressLabel === 'string' ? normalizeExcerptText(payload.progressLabel) : '',
    progressLocation:
      typeof payload.progressLocation === 'string'
        ? normalizeExcerptText(payload.progressLocation)
        : '',
    words: restoredWords,
    activeWordIndex:
      mode === 'rsvp'
        ? clampReaderRsvpWordIndex(
            restoredWords,
            typeof payload.activeWordIndex === 'number' ? payload.activeWordIndex : 0
          )
        : 0,
    paceWpm:
      mode === 'rsvp'
        ? normalizeReaderRsvpLitePace(
            typeof payload.paceWpm === 'number' ? payload.paceWpm : READER_RSVP_LITE_DEFAULT_WPM
          )
        : READER_RSVP_LITE_DEFAULT_WPM,
    capabilityMessage: getFocusedReadingCapabilityMessage(formatLabel, sourceText.length > 0)
  });
};

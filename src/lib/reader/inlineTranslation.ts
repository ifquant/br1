// Ownership: this module owns the pure inline-translation state machine. The
// viewport may discover visible text blocks, and Tauri/provider code may translate
// them, but this helper keeps queue/status/visibility rules out of UI components.

import type {
  ReaderInlineTranslationBlock,
  ReaderInlineTranslationState,
  ReaderInlineTranslationTargetLanguage
} from './types';
import type { ReaderTranslationProvider } from './assistance';

type ReaderInlineTranslationCandidateInput = {
  id: string;
  sourceText: string;
  sourceLabel?: string;
  now?: number;
};

type ReaderInlineTranslationBlockUpdateInput = {
  id: string;
  now?: number;
};

type ReaderInlineTranslationTranslatedInput = ReaderInlineTranslationBlockUpdateInput & {
  translatedText: string;
};

type ReaderInlineTranslationErrorInput = ReaderInlineTranslationBlockUpdateInput & {
  error: string;
};

type ReaderInlineTranslationVisibilityInput = {
  showSource?: boolean;
  showTranslation?: boolean;
};

const DEFAULT_INLINE_TRANSLATION_TARGET_LANGUAGE: ReaderInlineTranslationTargetLanguage = 'zh';
const DEFAULT_INLINE_TRANSLATION_PROVIDER: ReaderTranslationProvider = 'deepl';

const normalizeInlineTranslationText = (value: string | null | undefined): string =>
  value?.replace(/\s+/g, ' ').trim() || '';

const normalizeInlineTranslationLabel = (value: string | null | undefined): string =>
  value?.trim() || '';

const getInlineTranslationNow = (now?: number): number =>
  typeof now === 'number' && Number.isFinite(now) ? now : Date.now();

export const createEmptyReaderInlineTranslationState = (
  overrides: Partial<ReaderInlineTranslationState> = {}
): ReaderInlineTranslationState => ({
  enabled: false,
  showSource: true,
  showTranslation: true,
  targetLanguage: DEFAULT_INLINE_TRANSLATION_TARGET_LANGUAGE,
  provider: DEFAULT_INLINE_TRANSLATION_PROVIDER,
  blocks: [],
  ...overrides
});

const updateReaderInlineTranslationBlock = (
  state: ReaderInlineTranslationState,
  id: string,
  updater: (block: ReaderInlineTranslationBlock) => ReaderInlineTranslationBlock
): ReaderInlineTranslationState => ({
  ...state,
  blocks: state.blocks.map((block) => (block.id === id ? updater(block) : block))
});

export const upsertReaderInlineTranslationCandidate = (
  state: ReaderInlineTranslationState,
  input: ReaderInlineTranslationCandidateInput
): ReaderInlineTranslationState => {
  const id = input.id.trim();
  const sourceText = normalizeInlineTranslationText(input.sourceText);
  if (!id || !sourceText) return state;

  const sourceLabel = normalizeInlineTranslationLabel(input.sourceLabel);
  const updatedAt = getInlineTranslationNow(input.now);
  const existing = state.blocks.find((block) => block.id === id);
  const nextBlock: ReaderInlineTranslationBlock = {
    id,
    sourceText,
    translatedText: existing?.sourceText === sourceText ? existing.translatedText : '',
    sourceLabel,
    status: existing?.sourceText === sourceText ? existing.status : 'queued',
    error: existing?.sourceText === sourceText ? existing.error : '',
    updatedAt
  };

  if (!existing) {
    return {
      ...state,
      blocks: [...state.blocks, nextBlock]
    };
  }

  return {
    ...state,
    blocks: state.blocks.map((block) => (block.id === id ? nextBlock : block))
  };
};

export const markReaderInlineTranslationTranslating = (
  state: ReaderInlineTranslationState,
  input: ReaderInlineTranslationBlockUpdateInput
): ReaderInlineTranslationState =>
  updateReaderInlineTranslationBlock(state, input.id.trim(), (block) => ({
    ...block,
    status: 'translating',
    error: '',
    updatedAt: getInlineTranslationNow(input.now)
  }));

export const markReaderInlineTranslationTranslated = (
  state: ReaderInlineTranslationState,
  input: ReaderInlineTranslationTranslatedInput
): ReaderInlineTranslationState => {
  const translatedText = normalizeInlineTranslationText(input.translatedText);
  if (!translatedText) return state;

  return updateReaderInlineTranslationBlock(state, input.id.trim(), (block) => ({
    ...block,
    translatedText,
    status: 'translated',
    error: '',
    updatedAt: getInlineTranslationNow(input.now)
  }));
};

export const markReaderInlineTranslationError = (
  state: ReaderInlineTranslationState,
  input: ReaderInlineTranslationErrorInput
): ReaderInlineTranslationState =>
  updateReaderInlineTranslationBlock(state, input.id.trim(), (block) => ({
    ...block,
    status: 'error',
    error: normalizeInlineTranslationText(input.error) || '翻译失败，可以稍后重试。',
    updatedAt: getInlineTranslationNow(input.now)
  }));

export const toggleReaderInlineTranslationVisibility = (
  state: ReaderInlineTranslationState,
  input: ReaderInlineTranslationVisibilityInput
): ReaderInlineTranslationState => ({
  ...state,
  showSource: input.showSource ?? state.showSource,
  showTranslation: input.showTranslation ?? state.showTranslation
});

export const getReaderInlineTranslationSummary = (
  state: ReaderInlineTranslationState
): string => {
  const translatedCount = state.blocks.filter((block) => block.status === 'translated').length;
  const translatingCount = state.blocks.filter((block) => block.status === 'translating').length;
  const queuedCount = state.blocks.filter((block) => block.status === 'queued').length;
  const errorCount = state.blocks.filter((block) => block.status === 'error').length;
  const visibility = [
    state.showSource ? '显示原文' : '隐藏原文',
    state.showTranslation ? '显示译文' : '隐藏译文'
  ].join(' / ');

  if (!state.blocks.length) {
    return `${visibility} · 等待可翻译正文`;
  }

  if (errorCount) {
    return `${visibility} · ${errorCount} 段需要重试`;
  }

  if (translatingCount) {
    return `${visibility} · ${translatingCount} 段正在翻译`;
  }

  if (queuedCount) {
    return `${visibility} · ${queuedCount} 段等待翻译`;
  }

  return `${visibility} · ${translatedCount} 段译文已就绪`;
};

// Ownership: this helper module defines one reader-domain contract that multiple
// UI surfaces depend on. Keep low-level normalization and invariants here so UI
// code can stay focused on reading semantics rather than format/runtime quirks.

import { writable } from 'svelte/store';
import {
  createWebSpeechReaderTtsRuntime,
  type ReaderTtsRuntime,
  type ReaderTtsRuntimeMediaSessionSnapshot
} from './ttsRuntime.js';
import type { ReaderPreviewState, ReaderTtsReadAloudTextMode } from './types.js';

export type ReaderTtsSessionStatus = 'unavailable' | 'idle' | 'speaking' | 'paused' | 'error';
export type ReaderTtsRetargetAction = 'replace-target' | 'restart-session' | 'stop-and-arm-target';

export type ReaderTtsSessionAction = 'start' | 'pause' | 'resume' | 'stop';

export type ReaderTtsSpeechTarget = {
  text: string;
  label: string;
  sourceLabel?: string;
  targetLabel?: string;
  followsCurrent?: boolean;
  lang?: string;
  chapterLabel?: string;
  locationLabel?: string;
  progressLabel?: string;
  progressLocation?: string;
  progressFraction?: number | null;
  chapterHref?: string;
};

export type ReaderTtsSessionState = {
  status: ReaderTtsSessionStatus;
  error: string;
  lastAction: ReaderTtsSessionAction | null;
  lastActionAt: number | null;
  speechLabel: string;
  speechSourceLabel: string;
  speechTargetLabel: string;
  followsCurrent: boolean;
  speechChapterLabel: string;
  speechLocationLabel: string;
  speechProgressLabel: string;
  speechProgressLocation: string;
  speechProgressFraction: number | null;
  speechChapterHref: string;
};

export type ReaderTtsControllerOptions = {
  isAvailable?: boolean;
  unavailableReason?: string;
  getNow?: () => number;
  runtime?: ReaderTtsRuntime;
};

export const READER_TTS_UNAVAILABLE_REASON = '当前还没有接入朗读引擎';
export const READER_TTS_NO_TEXT_REASON = '当前没有可朗读的文本';
export const READER_TTS_DEFAULT_SOURCE_LABEL = '当前阅读内容';
export const READER_TTS_DEFAULT_TARGET_LABEL = '朗读目标';
export const READER_TTS_FOLLOW_CURRENT_LABEL = '跟随当前内容';
export const READER_TTS_LOCKED_TARGET_LABEL = '固定朗读目标';

const trimReaderTtsLabel = (value?: string | null): string => value?.trim() || '';

const createReaderTtsSessionTargetState = (target: ReaderTtsSpeechTarget | null) => {
  // Refactor risk: source/translated ownership, provenance labels, and playback
  // location must move together. Splitting those fields apart usually creates UI
  // states that look valid but describe the wrong active session.
  const normalizedTarget = target?.text.trim() ? target : null;
  const speechTargetLabel = trimReaderTtsLabel(
    normalizedTarget?.targetLabel || normalizedTarget?.label
  );
  const speechSourceLabel = trimReaderTtsLabel(normalizedTarget?.sourceLabel);
  const speechChapterLabel = trimReaderTtsLabel(normalizedTarget?.chapterLabel);
  const speechLocationLabel = trimReaderTtsLabel(normalizedTarget?.locationLabel);
  const speechProgressLabel = trimReaderTtsLabel(normalizedTarget?.progressLabel);
  const speechProgressLocation = trimReaderTtsLabel(normalizedTarget?.progressLocation);
  const speechChapterHref = trimReaderTtsLabel(normalizedTarget?.chapterHref);
  const speechProgressFraction =
    typeof normalizedTarget?.progressFraction === 'number' &&
    Number.isFinite(normalizedTarget.progressFraction)
      ? normalizedTarget.progressFraction
      : null;

  return {
    speechLabel: speechTargetLabel,
    speechSourceLabel,
    speechTargetLabel,
    followsCurrent: !!normalizedTarget?.followsCurrent,
    speechChapterLabel,
    speechLocationLabel,
    speechProgressLabel,
    speechProgressLocation,
    speechProgressFraction,
    speechChapterHref
  };
};

export const normalizeReaderTtsSpeechTarget = (
  target: ReaderTtsSpeechTarget | null
): ReaderTtsSpeechTarget | null => {
  const normalizedTarget = target;
  const text = normalizedTarget?.text.trim() || '';
  if (!text) return null;

  const label =
    trimReaderTtsLabel(normalizedTarget?.label) || trimReaderTtsLabel(normalizedTarget?.targetLabel);
  const sourceLabel = trimReaderTtsLabel(normalizedTarget?.sourceLabel);
  const targetLabel = trimReaderTtsLabel(normalizedTarget?.targetLabel) || label;
  const lang = trimReaderTtsLabel(normalizedTarget?.lang);
  const chapterLabel = trimReaderTtsLabel(normalizedTarget?.chapterLabel);
  const locationLabel = trimReaderTtsLabel(normalizedTarget?.locationLabel);
  const progressLabel = trimReaderTtsLabel(normalizedTarget?.progressLabel);
  const progressLocation = trimReaderTtsLabel(normalizedTarget?.progressLocation);
  const chapterHref = trimReaderTtsLabel(normalizedTarget?.chapterHref);
  const progressFraction =
    typeof normalizedTarget?.progressFraction === 'number' &&
    Number.isFinite(normalizedTarget.progressFraction)
      ? normalizedTarget.progressFraction
      : undefined;

  return {
    text,
    label: label || targetLabel,
    sourceLabel: sourceLabel || undefined,
    targetLabel: targetLabel || undefined,
    followsCurrent: !!normalizedTarget?.followsCurrent,
    lang: lang || undefined,
    chapterLabel: chapterLabel || undefined,
    locationLabel: locationLabel || undefined,
    progressLabel: progressLabel || undefined,
    progressLocation: progressLocation || undefined,
    progressFraction,
    chapterHref: chapterHref || undefined
  };
};

export const createEmptyReaderTtsSessionState = (
  overrides: Partial<ReaderTtsSessionState> = {}
): ReaderTtsSessionState => ({
  status: 'unavailable',
  error: '',
  lastAction: null,
  lastActionAt: null,
  speechLabel: '',
  speechSourceLabel: '',
  speechTargetLabel: '',
  followsCurrent: false,
  speechChapterLabel: '',
  speechLocationLabel: '',
  speechProgressLabel: '',
  speechProgressLocation: '',
  speechProgressFraction: null,
  speechChapterHref: '',
  ...overrides
});

export const createUnavailableReaderTtsSessionState = (
  reason = READER_TTS_UNAVAILABLE_REASON,
  overrides: Partial<ReaderTtsSessionState> = {}
): ReaderTtsSessionState =>
  createEmptyReaderTtsSessionState({
    status: 'unavailable',
    error: reason.trim(),
    ...overrides
  });

export const createIdleReaderTtsSessionState = (
  overrides: Partial<ReaderTtsSessionState> = {}
): ReaderTtsSessionState =>
  createEmptyReaderTtsSessionState({
    status: 'idle',
    ...overrides
  });

export const createSpeakingReaderTtsSessionState = (
  overrides: Partial<ReaderTtsSessionState> = {}
): ReaderTtsSessionState =>
  createEmptyReaderTtsSessionState({
    status: 'speaking',
    ...overrides
  });

export const createPausedReaderTtsSessionState = (
  overrides: Partial<ReaderTtsSessionState> = {}
): ReaderTtsSessionState =>
  createEmptyReaderTtsSessionState({
    status: 'paused',
    ...overrides
  });

export const createErrorReaderTtsSessionState = (
  error: string,
  overrides: Partial<ReaderTtsSessionState> = {}
): ReaderTtsSessionState =>
  createEmptyReaderTtsSessionState({
    status: 'error',
    error: error.trim(),
    ...overrides
  });

export const getReaderTtsSessionStatusLabel = (state: ReaderTtsSessionState): string => {
  switch (state.status) {
    case 'unavailable':
      return '不可用';
    case 'idle':
      return '空闲';
    case 'speaking':
      return '朗读中';
    case 'paused':
      return '已暂停';
    case 'error':
      return '错误';
  }
};

export const getReaderTtsPrimaryActionLabel = (state: ReaderTtsSessionState): string => {
  const speechTargetLabel = getReaderTtsReadableTargetLabel(state);
  const speechSuffix = state.speechLabel ? `（${speechTargetLabel}）` : '';

  switch (state.status) {
    case 'speaking':
      return '暂停朗读';
    case 'paused':
      return `继续朗读${speechSuffix}`;
    case 'error':
      return state.speechLabel ? `重试朗读${speechSuffix}` : '重试朗读';
    case 'idle':
      return state.speechLabel ? `开始朗读${speechSuffix}` : '没有可朗读的文本';
    case 'unavailable':
      return '朗读不可用';
  }
};

export const getReaderTtsStatusDetail = (state: ReaderTtsSessionState): string => {
  if (state.status === 'unavailable' || state.status === 'error') {
    return state.error || READER_TTS_UNAVAILABLE_REASON;
  }

  const statusLabel = getReaderTtsSessionStatusLabel(state);
  const speechTargetLabel = getReaderTtsReadableTargetLabel(state);
  if (!speechTargetLabel) return statusLabel;

  return `${statusLabel} · ${speechTargetLabel}`;
};

export const getReaderTtsReadableSourceLabel = (state: ReaderTtsSessionState): string =>
  trimReaderTtsLabel(state.speechSourceLabel) ||
  (state.followsCurrent ? READER_TTS_DEFAULT_SOURCE_LABEL : '');

export const getReaderTtsReadableTargetLabel = (state: ReaderTtsSessionState): string =>
  trimReaderTtsLabel(state.speechTargetLabel) || trimReaderTtsLabel(state.speechLabel);

export const getReaderTtsFollowCurrentLabel = (state: ReaderTtsSessionState): string =>
  state.followsCurrent ? READER_TTS_FOLLOW_CURRENT_LABEL : READER_TTS_LOCKED_TARGET_LABEL;

export const getReaderTtsPlaybackLocationSummary = (state: ReaderTtsSessionState): string =>
  [
    trimReaderTtsLabel(state.speechChapterLabel),
    trimReaderTtsLabel(state.speechLocationLabel),
    trimReaderTtsLabel(state.speechProgressLabel)
  ]
    .filter(Boolean)
    .join(' · ');

const getReaderTtsTargetPlaybackLocationSummary = (target: ReaderTtsSpeechTarget | null): string =>
  [
    trimReaderTtsLabel(target?.chapterLabel),
    trimReaderTtsLabel(target?.locationLabel),
    trimReaderTtsLabel(target?.progressLabel)
  ]
    .filter(Boolean)
    .join(' · ');

export const getReaderTtsCompactPlaybackLocationSummary = (
  state: ReaderTtsSessionState,
  target: ReaderTtsSpeechTarget | null
): string => getReaderTtsPlaybackLocationSummary(state) || getReaderTtsTargetPlaybackLocationSummary(target);

export const getReaderTtsTranslatedWaitingTargetLabel = (sourceContextLabel: string): string => {
  const normalizedContextLabel = sourceContextLabel.trim();
  return normalizedContextLabel
    ? `等待译文结果 · ${normalizedContextLabel}`
    : '等待译文结果';
};

export const getReaderTtsMiniBarContextSummary = ({
  state,
  readAloudTextMode,
  translatedSourceKind = 'none',
  translatedSourceContextLabel = ''
}: {
  state: ReaderTtsSessionState;
  readAloudTextMode: ReaderTtsReadAloudTextMode;
  translatedSourceKind?: 'none' | 'live-translation' | 'archived-translation';
  translatedSourceContextLabel?: string;
}): string => {
  const modeLabel = readAloudTextMode === 'translated' ? '译文朗读' : '原文朗读';
  const sourceLabel = getReaderTtsReadableSourceLabel(state);
  if (readAloudTextMode !== 'translated') {
    return [modeLabel, sourceLabel].filter(Boolean).join(' · ');
  }

  const sourceContext = trimReaderTtsLabel(translatedSourceContextLabel);
  if (translatedSourceKind === 'live-translation' && sourceContext) {
    return [modeLabel, sourceContext].filter(Boolean).join(' · ');
  }

  if (sourceLabel) {
    return [modeLabel, sourceLabel].filter(Boolean).join(' · ');
  }

  const waitingProvenanceLabel =
    translatedSourceKind === 'archived-translation'
      ? '等待历史译文来源'
      : translatedSourceKind === 'live-translation'
        ? '等待当前翻译来源'
        : '';

  return [modeLabel, waitingProvenanceLabel, sourceContext].filter(Boolean).join(' · ');
};

export const shouldShowReaderTtsMiniBar = (
  state: ReaderTtsSessionState,
  target: ReaderTtsSpeechTarget | null,
  options: {
    readAloudTextMode?: ReaderTtsReadAloudTextMode;
    translatedWaitingSourceText?: string | null;
  } | string = {}
): boolean =>
  !!(
    getReaderTtsReadableTargetLabel(state) ||
    normalizeReaderTtsSpeechTarget(target)?.text ||
    (typeof options === 'string'
      ? options.trim()
      : options.readAloudTextMode === 'translated' &&
        (options.translatedWaitingSourceText?.trim() || '')) ||
    state.status === 'speaking' ||
    state.status === 'paused' ||
    state.status === 'error'
  );

export const isReaderTtsPlaybackLocationDrifted = (
  state: ReaderTtsSessionState,
  preview: ReaderPreviewState
): boolean => {
  // Boundary: raw progress locations can drift across formats and relayouts, so
  // fall back to chapter/location/progress labels before declaring the session stale.
  const speechProgressLocation = trimReaderTtsLabel(state.speechProgressLocation);
  const previewProgressLocation = trimReaderTtsLabel(preview.progressLocation);
  if (!speechProgressLocation || !previewProgressLocation) return false;
  if (speechProgressLocation === previewProgressLocation) return false;

  const sameChapterHref =
    !!trimReaderTtsLabel(state.speechChapterHref) &&
    trimReaderTtsLabel(state.speechChapterHref) === trimReaderTtsLabel(preview.chapterHref);
  const sameChapterLabel =
    !!trimReaderTtsLabel(state.speechChapterLabel) &&
    trimReaderTtsLabel(state.speechChapterLabel) === trimReaderTtsLabel(preview.chapterLabel);
  const sameLocationLabel =
    !!trimReaderTtsLabel(state.speechLocationLabel) &&
    trimReaderTtsLabel(state.speechLocationLabel) === trimReaderTtsLabel(preview.locationLabel);
  const sameProgressLabel =
    !!trimReaderTtsLabel(state.speechProgressLabel) &&
    trimReaderTtsLabel(state.speechProgressLabel) === trimReaderTtsLabel(preview.progressLabel);
  const sameProgressFraction =
    state.speechProgressFraction !== null &&
    Number.isFinite(state.speechProgressFraction) &&
    Number.isFinite(preview.progressFraction) &&
    Math.abs(state.speechProgressFraction - preview.progressFraction) <= 0.01;

  if ((sameChapterHref || sameChapterLabel) && (sameLocationLabel || sameProgressLabel || sameProgressFraction)) {
    return false;
  }

  if (sameLocationLabel && (sameProgressLabel || sameProgressFraction)) {
    return false;
  }

  return true;
};

export const planReaderTtsRetargetAction = (
  status: ReaderTtsSessionStatus
): ReaderTtsRetargetAction => {
  // Retargeting is status-sensitive: active speech restarts immediately, paused
  // speech must first collapse the old runtime session, and idle/error states can
  // just replace the cached target without forcing another transition.
  if (status === 'speaking') return 'restart-session';
  if (status === 'paused') return 'stop-and-arm-target';
  return 'replace-target';
};

export type ReaderTtsSourceTargetInput = {
  selectedText?: string | null;
  excerptText?: string | null;
  excerptSourceLabel?: string | null;
  sourceLanguage?: string | null;
  chapterLabel?: string | null;
  locationLabel?: string | null;
  progressLabel?: string | null;
  progressLocation?: string | null;
  progressFraction?: number | null;
  chapterHref?: string | null;
  title?: string | null;
};

export type ReaderTtsTranslatedTargetInput = {
  translatedText?: string | null;
  providerLabel?: string | null;
  targetLanguage?: string | null;
  chapterLabel?: string | null;
  locationLabel?: string | null;
  progressLabel?: string | null;
  progressLocation?: string | null;
  progressFraction?: number | null;
  chapterHref?: string | null;
};

export const normalizeReaderTtsLanguageTag = (value?: string | null): string => {
  const normalized = value?.trim().toLowerCase() || '';
  if (!normalized) return '';
  if (normalized.includes('-')) {
    const [language, region] = normalized.split('-', 2);
    if (!language) return '';
    if (!region) return language;
    return `${language}-${region.toUpperCase()}`;
  }

  switch (normalized) {
    case 'zh':
      return 'zh-CN';
    case 'en':
      return 'en-US';
    case 'ja':
      return 'ja-JP';
    case 'ko':
      return 'ko-KR';
    case 'fr':
      return 'fr-FR';
    case 'de':
      return 'de-DE';
    case 'es':
      return 'es-ES';
    case 'it':
      return 'it-IT';
    case 'pt':
      return 'pt-BR';
    case 'ru':
      return 'ru-RU';
    default:
      return normalized;
  }
};

export const resolveReaderTtsSpeechTargetForMode = ({
  mode,
  source,
  translated
}: {
  mode: ReaderTtsReadAloudTextMode;
  source: ReaderTtsSourceTargetInput;
  translated?: ReaderTtsTranslatedTargetInput | null;
}): ReaderTtsSpeechTarget | null => {
  // Refactor risk: the order below defines reader-owned provenance. Translation,
  // live selection, live excerpt, chapter, and title are not interchangeable
  // fallbacks because each one drives different mini-bar copy and restore behavior.
  const normalizedSelectedText = source.selectedText?.trim() || '';
  const normalizedExcerptText = source.excerptText?.trim() || '';
  const normalizedExcerptSourceLabel = source.excerptSourceLabel?.trim() || '';
  const normalizedSourceLanguage = normalizeReaderTtsLanguageTag(source.sourceLanguage);
  const normalizedSourceLocationLabel = source.locationLabel?.trim() || '';
  const normalizedSourceProgressLabel = source.progressLabel?.trim() || '';
  const normalizedSourceProgressLocation = source.progressLocation?.trim() || '';
  const normalizedSourceChapterHref = source.chapterHref?.trim() || '';
  const normalizedSourceProgressFraction =
    typeof source.progressFraction === 'number' && Number.isFinite(source.progressFraction)
      ? source.progressFraction
      : null;
  const normalizedChapterLabel = source.chapterLabel?.trim() || '';
  const normalizedTitle = source.title?.trim() || '';
  const normalizedTranslatedText = translated?.translatedText?.trim() || '';
  const normalizedProviderLabel = translated?.providerLabel?.trim() || '';
  const normalizedTargetLanguage = normalizeReaderTtsLanguageTag(translated?.targetLanguage);
  const normalizedTranslatedChapterLabel = translated?.chapterLabel?.trim() || '';
  const normalizedTranslatedLocationLabel = translated?.locationLabel?.trim() || '';
  const normalizedTranslatedProgressLabel = translated?.progressLabel?.trim() || '';
  const normalizedTranslatedProgressLocation = translated?.progressLocation?.trim() || '';
  const normalizedTranslatedChapterHref = translated?.chapterHref?.trim() || '';
  const normalizedTranslatedProgressFraction =
    typeof translated?.progressFraction === 'number' && Number.isFinite(translated.progressFraction)
      ? translated.progressFraction
      : null;

  if (mode === 'translated') {
    if (!normalizedTranslatedText) return null;
    // Preserve translated provenance when possible, but reuse the source chapter,
    // location, and progress labels when the translated payload does not carry
    // those reader-facing fields. `progressLocation`, `progressFraction`, and
    // `chapterHref` still stay translation-owned here.
    const translatedSourceLabel = normalizedProviderLabel
      ? normalizedProviderLabel.includes('译文')
        ? normalizedProviderLabel
        : `${normalizedProviderLabel} 翻译结果`
      : '当前翻译结果';

    return {
      text: normalizedTranslatedText,
      label: '当前译文',
      sourceLabel: translatedSourceLabel,
      targetLabel: '译文',
      followsCurrent: true,
      lang: normalizedTargetLanguage || undefined,
      chapterLabel: normalizedTranslatedChapterLabel || normalizedChapterLabel || undefined,
      locationLabel: normalizedTranslatedLocationLabel || normalizedSourceLocationLabel || undefined,
      progressLabel: normalizedTranslatedProgressLabel || normalizedSourceProgressLabel || undefined,
      progressLocation: normalizedTranslatedProgressLocation || undefined,
      progressFraction: normalizedTranslatedProgressFraction,
      chapterHref: normalizedTranslatedChapterHref || undefined
    };
  }

  if (normalizedSelectedText) {
    return {
      text: normalizedSelectedText,
      label: '选中文本',
      sourceLabel: '正文选区',
      targetLabel: '选中文本',
      followsCurrent: true,
      lang: normalizedSourceLanguage || undefined,
      chapterLabel: normalizedChapterLabel || undefined,
      locationLabel: normalizedSourceLocationLabel || undefined,
      progressLabel: normalizedSourceProgressLabel || undefined,
      progressLocation: normalizedSourceProgressLocation || undefined,
      progressFraction: normalizedSourceProgressFraction,
      chapterHref: normalizedSourceChapterHref || undefined
    };
  }

  if (normalizedExcerptText) {
    return {
      text: normalizedExcerptText,
      label: '当前正文摘录',
      sourceLabel: normalizedExcerptSourceLabel || '当前阅读位置',
      targetLabel: '正文摘录',
      followsCurrent: true,
      lang: normalizedSourceLanguage || undefined,
      chapterLabel: normalizedChapterLabel || undefined,
      locationLabel: normalizedSourceLocationLabel || undefined,
      progressLabel: normalizedSourceProgressLabel || undefined,
      progressLocation: normalizedSourceProgressLocation || undefined,
      progressFraction: normalizedSourceProgressFraction,
      chapterHref: normalizedSourceChapterHref || undefined
    };
  }

  if (normalizedChapterLabel) {
    return {
      text: normalizedChapterLabel,
      label: '当前章节',
      sourceLabel: '当前阅读位置',
      targetLabel: '章节标题',
      followsCurrent: true,
      lang: normalizedSourceLanguage || undefined,
      chapterLabel: normalizedChapterLabel || undefined,
      locationLabel: normalizedSourceLocationLabel || undefined,
      progressLabel: normalizedSourceProgressLabel || undefined,
      progressLocation: normalizedSourceProgressLocation || undefined,
      progressFraction: normalizedSourceProgressFraction,
      chapterHref: normalizedSourceChapterHref || undefined
    };
  }

  if (normalizedTitle) {
    return {
      text: normalizedTitle,
      label: '当前书名',
      sourceLabel: '当前阅读位置',
      targetLabel: '书名',
      followsCurrent: true,
      lang: normalizedSourceLanguage || undefined,
      chapterLabel: normalizedChapterLabel || undefined,
      locationLabel: normalizedSourceLocationLabel || undefined,
      progressLabel: normalizedSourceProgressLabel || undefined,
      progressLocation: normalizedSourceProgressLocation || undefined,
      progressFraction: normalizedSourceProgressFraction,
      chapterHref: normalizedSourceChapterHref || undefined
    };
  }

  return null;
};

const hasSameReaderTtsSessionState = (
  current: ReaderTtsSessionState,
  next: ReaderTtsSessionState
): boolean =>
  current.status === next.status &&
  current.error === next.error &&
  current.lastAction === next.lastAction &&
  current.lastActionAt === next.lastActionAt &&
  current.speechLabel === next.speechLabel &&
  current.speechSourceLabel === next.speechSourceLabel &&
  current.speechTargetLabel === next.speechTargetLabel &&
  current.followsCurrent === next.followsCurrent &&
  current.speechChapterLabel === next.speechChapterLabel &&
  current.speechLocationLabel === next.speechLocationLabel &&
  current.speechProgressLabel === next.speechProgressLabel &&
  current.speechProgressLocation === next.speechProgressLocation &&
  current.speechProgressFraction === next.speechProgressFraction &&
  current.speechChapterHref === next.speechChapterHref;

const createReaderTtsRuntimeMediaSessionSnapshot = (
  state: ReaderTtsSessionState
): ReaderTtsRuntimeMediaSessionSnapshot => ({
  status: state.status,
  title: getReaderTtsReadableTargetLabel(state),
  artist:
    getReaderTtsReadableSourceLabel(state) ||
    (state.followsCurrent ? READER_TTS_DEFAULT_SOURCE_LABEL : READER_TTS_LOCKED_TARGET_LABEL),
  album:
    state.status === 'speaking'
      ? 'Bridge Reader · 朗读中'
      : state.status === 'paused'
        ? 'Bridge Reader · 已暂停'
        : 'Bridge Reader · 朗读模式'
});

export const createReaderTtsController = ({
  isAvailable = false,
  unavailableReason = READER_TTS_UNAVAILABLE_REASON,
  getNow = () => Date.now(),
  runtime = createWebSpeechReaderTtsRuntime()
}: ReaderTtsControllerOptions = {}) => {
  // This controller owns only the live speech-runtime contract: normalized active
  // target, session tokening, and Web Speech/media-session transitions. Route
  // persistence and restore precedence still live in the reader page.
  let available = isAvailable;
  let activeSpeechTarget: ReaderTtsSpeechTarget | null = null;
  let speechSessionToken = 0;
  const initialState = available
    ? createIdleReaderTtsSessionState()
    : createUnavailableReaderTtsSessionState(unavailableReason);
  let currentState = initialState;
  const state = writable<ReaderTtsSessionState>(initialState);

  const stamp = (next: ReaderTtsSessionState, lastAction: ReaderTtsSessionAction) => ({
    ...next,
    lastAction,
    lastActionAt: getNow()
  });

  const updateState = (next: ReaderTtsSessionState) => {
    state.update((current) => (hasSameReaderTtsSessionState(current, next) ? current : next));
  };

  const setSpeechTarget = (target: ReaderTtsSpeechTarget | null) => {
    activeSpeechTarget = normalizeReaderTtsSpeechTarget(target);
    state.update((current) => {
      // Cache the next target even before playback restarts so UI surfaces can
      // explain what will be spoken without pretending a new utterance already exists.
      const next = {
        ...current,
        ...createReaderTtsSessionTargetState(activeSpeechTarget)
      };

      return hasSameReaderTtsSessionState(current, next) ? current : next;
    });
  };

  const setUnavailable = (reason = unavailableReason) => {
    available = false;
    updateState(
      createUnavailableReaderTtsSessionState(reason, {
        ...createReaderTtsSessionTargetState(activeSpeechTarget)
      })
    );
  };

  const setIdle = () => {
    available = true;
    updateState(
      createIdleReaderTtsSessionState({
        ...createReaderTtsSessionTargetState(activeSpeechTarget)
      })
    );
  };

  const setError = (error: string) => {
    updateState(
      createErrorReaderTtsSessionState(error, {
        ...createReaderTtsSessionTargetState(activeSpeechTarget)
      })
    );
  };

  const setAvailability = (nextAvailable: boolean, reason = unavailableReason) => {
    available = nextAvailable;

    if (available) {
      setIdle();
      return;
    }

    setUnavailable(reason);
  };

  const refreshAvailability = () => {
    setAvailability(runtime.supported, unavailableReason);
  };

  const settleSpeechEnd = (sessionToken: number) => {
    // Boundary: Web Speech callbacks can arrive after the user retargets or
    // stops playback. Ignore stale completions so an older utterance cannot
    // overwrite the newer session state.
    if (sessionToken !== speechSessionToken) return;

    updateState(
      createIdleReaderTtsSessionState({
        ...createReaderTtsSessionTargetState(activeSpeechTarget)
      })
    );
  };

  const settleSpeechError = (sessionToken: number, error: string) => {
    if (sessionToken !== speechSessionToken) return;

    setError(error);
  };

  const start = (target: ReaderTtsSpeechTarget | null = activeSpeechTarget) => {
    if (!available) {
      setUnavailable(unavailableReason);
      return;
    }

    const nextTarget = normalizeReaderTtsSpeechTarget(target) || activeSpeechTarget;
    const targetText = nextTarget?.text.trim() || '';

    if (!nextTarget || !targetText) {
      setError(READER_TTS_NO_TEXT_REASON);
      return;
    }

    activeSpeechTarget = nextTarget;
    const sessionToken = ++speechSessionToken;
    setSpeechTarget(nextTarget);
    // Publish the speaking state before entering the runtime so any synchronous
    // browser callbacks observe the same target the user just selected.
    updateState(
      stamp(
        createSpeakingReaderTtsSessionState({
          ...createReaderTtsSessionTargetState(nextTarget)
        }),
        'start'
      )
    );

    const started = runtime.speak(
      targetText,
      {
        onEnd: () => settleSpeechEnd(sessionToken),
        onError: (message) => settleSpeechError(sessionToken, message)
      },
      nextTarget.lang || navigator.language
    );

    if (!started) {
      setError(READER_TTS_UNAVAILABLE_REASON);
      return;
    }
  };

  const pause = () => {
    if (!available) {
      setUnavailable(unavailableReason);
      return;
    }

    state.update((current) => {
      if (current.status !== 'speaking') {
        return stamp(createErrorReaderTtsSessionState('只有朗读中才能暂停'), 'pause');
      }

      if (!runtime.pause()) {
        return stamp(createErrorReaderTtsSessionState('当前浏览器不支持暂停朗读'), 'pause');
      }

      return stamp(
        createPausedReaderTtsSessionState({
          ...createReaderTtsSessionTargetState(activeSpeechTarget)
        }),
        'pause'
      );
    });
  };

  const resume = () => {
    if (!available) {
      setUnavailable(unavailableReason);
      return;
    }

    state.update((current) => {
      if (current.status !== 'paused') {
        return stamp(createErrorReaderTtsSessionState('只有暂停的朗读才能继续'), 'resume');
      }

      if (!runtime.resume()) {
        return stamp(createErrorReaderTtsSessionState('当前浏览器不支持继续朗读'), 'resume');
      }

      return stamp(
        createSpeakingReaderTtsSessionState({
          ...createReaderTtsSessionTargetState(activeSpeechTarget)
        }),
        'resume'
      );
    });
  };

  const stop = () => {
    if (!available) {
      setUnavailable(unavailableReason);
      return;
    }

    // Invalidate the current token before stopping so trailing callbacks from the
    // previous utterance cannot drag the controller back into a stale completion state.
    speechSessionToken += 1;
    runtime.stop();
    updateState(
      stamp(
        createIdleReaderTtsSessionState({
          ...createReaderTtsSessionTargetState(activeSpeechTarget)
        }),
        'stop'
      )
    );
  };

  const syncRuntimeMediaSession = () => {
    // Boundary: media-session controls are a projection of current reader state,
    // never a second source of truth. Route all callbacks back through controller
    // actions so browser chrome and in-app chrome stay aligned.
    runtime.syncMediaSession(createReaderTtsRuntimeMediaSessionSnapshot(currentState), {
      onPlay: () => {
        if (currentState.status === 'paused') {
          resume();
          return;
        }

        start();
      },
      onPause: () => {
        pause();
      },
      onStop: () => {
        stop();
      }
    });
  };

  state.subscribe((next) => {
    currentState = next;
    syncRuntimeMediaSession();
  });

  return {
    state,
    refreshAvailability,
    setAvailability,
    setUnavailable,
    setIdle,
    setError,
    setSpeechTarget,
    start,
    pause,
    resume,
    stop
  };
};

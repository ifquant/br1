// Ownership: this helper keeps queue/rate/timeout semantics out of the route
// and playback panel. UI can decide when to arm or step the queue, but the
// invariants about active segment boundaries live here.

import type { ReaderTtsSpeechTarget } from './tts.js';
import type {
  ReaderPlaybackQueueState,
  ReaderPlaybackQueueSummary,
  ReaderPlaybackSegment
} from './types';

type ReaderPlaybackQueueOptions = {
  playbackRate?: number;
  timeoutMs?: number | null;
  now?: number;
};

type ReaderPlaybackTimeoutInput = {
  durationMs?: number | null;
  now?: number;
};

const READER_PLAYBACK_DEFAULT_RATE = 1;
const READER_PLAYBACK_MIN_RATE = 0.2;
const READER_PLAYBACK_MAX_RATE = 3;
const READER_PLAYBACK_NO_TARGET_LABEL = '当前没有可播放的段落。';
const READER_PLAYBACK_TIMEOUT_DISABLED_LABEL = '定时关闭未开启';

const trimPlaybackTargetLabel = (value?: string | null): string => value?.trim() || '';

const getPlaybackNow = (now?: number): number =>
  typeof now === 'number' && Number.isFinite(now) ? now : Date.now();

const clampPlaybackRate = (value?: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return READER_PLAYBACK_DEFAULT_RATE;
  }

  return Math.min(READER_PLAYBACK_MAX_RATE, Math.max(READER_PLAYBACK_MIN_RATE, value));
};

const normalizePlaybackTimeoutAt = (timeoutAt: number | null, now: number): number | null => {
  if (typeof timeoutAt !== 'number' || !Number.isFinite(timeoutAt)) return null;
  return timeoutAt > now ? timeoutAt : null;
};

// Keep this normalization aligned with `normalizeReaderTtsSpeechTarget` in
// `tts.ts`. Task 4 stays inside the pure helper file boundary, so the queue
// helper cannot depend on the runtime-heavy TTS module directly.
const normalizePlaybackTarget = (
  target: ReaderTtsSpeechTarget | null | undefined
): ReaderTtsSpeechTarget | null => {
  const text = target?.text.trim() || '';
  if (!text) return null;

  const label =
    trimPlaybackTargetLabel(target?.label) || trimPlaybackTargetLabel(target?.targetLabel);
  const sourceLabel = trimPlaybackTargetLabel(target?.sourceLabel);
  const targetLabel = trimPlaybackTargetLabel(target?.targetLabel) || label;
  const lang = trimPlaybackTargetLabel(target?.lang);
  const chapterLabel = trimPlaybackTargetLabel(target?.chapterLabel);
  const locationLabel = trimPlaybackTargetLabel(target?.locationLabel);
  const progressLabel = trimPlaybackTargetLabel(target?.progressLabel);
  const progressLocation = trimPlaybackTargetLabel(target?.progressLocation);
  const chapterHref = trimPlaybackTargetLabel(target?.chapterHref);
  const progressFraction =
    typeof target?.progressFraction === 'number' && Number.isFinite(target.progressFraction)
      ? target.progressFraction
      : undefined;

  return {
    text,
    label: label || targetLabel,
    sourceLabel: sourceLabel || undefined,
    targetLabel: targetLabel || undefined,
    followsCurrent: !!target?.followsCurrent,
    lang: lang || undefined,
    chapterLabel: chapterLabel || undefined,
    locationLabel: locationLabel || undefined,
    progressLabel: progressLabel || undefined,
    progressLocation: progressLocation || undefined,
    progressFraction,
    chapterHref: chapterHref || undefined
  };
};

const buildReaderPlaybackSegment = (
  target: ReaderTtsSpeechTarget | null | undefined,
  index: number
): ReaderPlaybackSegment | null => {
  const normalizedTarget = normalizePlaybackTarget(target);
  if (!normalizedTarget) return null;

  return {
    id: `segment-${index + 1}`,
    target: normalizedTarget
  };
};

const getReaderPlaybackActiveIndex = (state: ReaderPlaybackQueueState): number => {
  if (!state.segments.length) return -1;
  if (state.activeIndex < 0) return 0;
  if (state.activeIndex >= state.segments.length) return state.segments.length - 1;
  return state.activeIndex;
};

const getReaderPlaybackActiveSegment = (
  state: ReaderPlaybackQueueState
): ReaderPlaybackSegment | null => {
  const activeIndex = getReaderPlaybackActiveIndex(state);
  return activeIndex >= 0 ? state.segments[activeIndex] ?? null : null;
};

const getReaderPlaybackTimeoutLabel = (timeoutRemainingMs: number | null): string =>
  timeoutRemainingMs === null
    ? READER_PLAYBACK_TIMEOUT_DISABLED_LABEL
    : `定时关闭 ${Math.ceil(timeoutRemainingMs / 1000)} 秒后`;

export const createReaderPlaybackQueue = (
  targets: Array<ReaderTtsSpeechTarget | null | undefined>,
  options: ReaderPlaybackQueueOptions = {}
): ReaderPlaybackQueueState => {
  const segments = targets
    .map((target, index) => buildReaderPlaybackSegment(target, index))
    .filter((segment): segment is ReaderPlaybackSegment => segment !== null);
  const now = getPlaybackNow(options.now);
  const timeoutAt =
    typeof options.timeoutMs === 'number' && Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
      ? now + options.timeoutMs
      : null;

  return {
    segments,
    activeIndex: segments.length ? 0 : -1,
    playbackRate: clampPlaybackRate(options.playbackRate),
    timeoutAt: normalizePlaybackTimeoutAt(timeoutAt, now)
  };
};

export const moveReaderPlaybackQueueNext = (
  state: ReaderPlaybackQueueState
): ReaderPlaybackQueueState => {
  if (!state.segments.length) return state;

  return {
    ...state,
    activeIndex: Math.min(getReaderPlaybackActiveIndex(state) + 1, state.segments.length - 1)
  };
};

export const moveReaderPlaybackQueuePrevious = (
  state: ReaderPlaybackQueueState
): ReaderPlaybackQueueState => {
  if (!state.segments.length) return state;

  return {
    ...state,
    activeIndex: Math.max(getReaderPlaybackActiveIndex(state) - 1, 0)
  };
};

export const setReaderPlaybackRate = (
  state: ReaderPlaybackQueueState,
  playbackRate: number
): ReaderPlaybackQueueState => ({
  ...state,
  playbackRate: clampPlaybackRate(playbackRate)
});

export const setReaderPlaybackTimeout = (
  state: ReaderPlaybackQueueState,
  input: ReaderPlaybackTimeoutInput = {}
): ReaderPlaybackQueueState => {
  const now = getPlaybackNow(input.now);
  let timeoutAt = state.timeoutAt;

  if (input.durationMs === null) {
    timeoutAt = null;
  } else if (
    typeof input.durationMs === 'number' &&
    Number.isFinite(input.durationMs)
  ) {
    timeoutAt = input.durationMs > 0 ? now + input.durationMs : null;
  }

  return {
    ...state,
    timeoutAt: normalizePlaybackTimeoutAt(timeoutAt, now)
  };
};

export const getReaderPlaybackQueueSummary = (
  state: ReaderPlaybackQueueState,
  now?: number
): ReaderPlaybackQueueSummary => {
  const currentSegment = getReaderPlaybackActiveSegment(state);
  const resolvedNow = getPlaybackNow(now);
  const timeoutAt = normalizePlaybackTimeoutAt(state.timeoutAt, resolvedNow);
  const timeoutRemainingMs =
    typeof timeoutAt === 'number' ? Math.max(timeoutAt - resolvedNow, 0) : null;

  if (!currentSegment) {
    return {
      hasTarget: false,
      currentSegment: null,
      currentLabel: READER_PLAYBACK_NO_TARGET_LABEL,
      currentSourceLabel: '',
      positionLabel: '0 / 0',
      rate: clampPlaybackRate(state.playbackRate),
      rateLabel: `${clampPlaybackRate(state.playbackRate).toFixed(1)}x`,
      timeoutAt,
      timeoutRemainingMs,
      timeoutLabel: getReaderPlaybackTimeoutLabel(timeoutRemainingMs)
    };
  }

  const currentLabel = currentSegment.target.label.trim() || currentSegment.target.text.trim();
  const currentSourceLabel = currentSegment.target.sourceLabel?.trim() || '';

  return {
    hasTarget: true,
    currentSegment,
    currentLabel,
    currentSourceLabel,
    positionLabel: `${getReaderPlaybackActiveIndex(state) + 1} / ${state.segments.length}`,
    rate: clampPlaybackRate(state.playbackRate),
    rateLabel: `${clampPlaybackRate(state.playbackRate).toFixed(1)}x`,
    timeoutAt,
    timeoutRemainingMs,
    timeoutLabel: getReaderPlaybackTimeoutLabel(timeoutRemainingMs)
  };
};

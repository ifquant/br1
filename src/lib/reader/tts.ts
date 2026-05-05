import { writable } from 'svelte/store';
import { createWebSpeechReaderTtsRuntime } from './ttsRuntime';
import type { ReaderTtsReadAloudTextMode } from './types';

export type ReaderTtsSessionStatus = 'unavailable' | 'idle' | 'speaking' | 'paused' | 'error';
export type ReaderTtsRetargetAction = 'replace-target' | 'restart-session' | 'stop-and-arm-target';

export type ReaderTtsSessionAction = 'start' | 'pause' | 'resume' | 'stop';

export type ReaderTtsSpeechTarget = {
  text: string;
  label: string;
  sourceLabel?: string;
  targetLabel?: string;
  followsCurrent?: boolean;
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
};

export type ReaderTtsControllerOptions = {
  isAvailable?: boolean;
  unavailableReason?: string;
  getNow?: () => number;
};

export const READER_TTS_UNAVAILABLE_REASON = '当前还没有接入朗读引擎';
export const READER_TTS_NO_TEXT_REASON = '当前没有可朗读的文本';
export const READER_TTS_DEFAULT_SOURCE_LABEL = '当前阅读内容';
export const READER_TTS_DEFAULT_TARGET_LABEL = '朗读目标';
export const READER_TTS_FOLLOW_CURRENT_LABEL = '跟随当前内容';
export const READER_TTS_LOCKED_TARGET_LABEL = '固定朗读目标';

const trimReaderTtsLabel = (value?: string | null): string => value?.trim() || '';

const createReaderTtsSessionTargetState = (target: ReaderTtsSpeechTarget | null) => {
  const normalizedTarget = target?.text.trim() ? target : null;
  const speechTargetLabel = trimReaderTtsLabel(
    normalizedTarget?.targetLabel || normalizedTarget?.label
  );
  const speechSourceLabel = trimReaderTtsLabel(normalizedTarget?.sourceLabel);

  return {
    speechLabel: speechTargetLabel,
    speechSourceLabel,
    speechTargetLabel,
    followsCurrent: !!normalizedTarget?.followsCurrent
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

  return {
    text,
    label: label || targetLabel,
    sourceLabel: sourceLabel || undefined,
    targetLabel: targetLabel || undefined,
    followsCurrent: !!normalizedTarget?.followsCurrent
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

export const planReaderTtsRetargetAction = (
  status: ReaderTtsSessionStatus
): ReaderTtsRetargetAction => {
  if (status === 'speaking') return 'restart-session';
  if (status === 'paused') return 'stop-and-arm-target';
  return 'replace-target';
};

export type ReaderTtsSourceTargetInput = {
  selectedText?: string | null;
  chapterLabel?: string | null;
  title?: string | null;
};

export type ReaderTtsTranslatedTargetInput = {
  translatedText?: string | null;
  providerLabel?: string | null;
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
  const normalizedSelectedText = source.selectedText?.trim() || '';
  const normalizedChapterLabel = source.chapterLabel?.trim() || '';
  const normalizedTitle = source.title?.trim() || '';
  const normalizedTranslatedText = translated?.translatedText?.trim() || '';
  const normalizedProviderLabel = translated?.providerLabel?.trim() || '';

  if (mode === 'translated') {
    if (!normalizedTranslatedText) return null;
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
      followsCurrent: true
    };
  }

  if (normalizedSelectedText) {
    return {
      text: normalizedSelectedText,
      label: '选中文本',
      sourceLabel: '正文选区',
      targetLabel: '选中文本',
      followsCurrent: true
    };
  }

  if (normalizedChapterLabel) {
    return {
      text: normalizedChapterLabel,
      label: '当前章节',
      sourceLabel: '当前阅读位置',
      targetLabel: '章节标题',
      followsCurrent: true
    };
  }

  if (normalizedTitle) {
    return {
      text: normalizedTitle,
      label: '当前书名',
      sourceLabel: '当前阅读位置',
      targetLabel: '书名',
      followsCurrent: true
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
  current.followsCurrent === next.followsCurrent;

export const createReaderTtsController = ({
  isAvailable = false,
  unavailableReason = READER_TTS_UNAVAILABLE_REASON,
  getNow = () => Date.now()
}: ReaderTtsControllerOptions = {}) => {
  const runtime = createWebSpeechReaderTtsRuntime();
  let available = isAvailable;
  let activeSpeechTarget: ReaderTtsSpeechTarget | null = null;
  let speechSessionToken = 0;
  const state = writable<ReaderTtsSessionState>(
    available
      ? createIdleReaderTtsSessionState()
      : createUnavailableReaderTtsSessionState(unavailableReason)
  );

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
      navigator.language
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

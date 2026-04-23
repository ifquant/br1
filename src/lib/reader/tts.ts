import { writable } from 'svelte/store';
import { createWebSpeechReaderTtsRuntime } from './ttsRuntime';

export type ReaderTtsSessionStatus = 'unavailable' | 'idle' | 'speaking' | 'paused' | 'error';

export type ReaderTtsSessionAction = 'start' | 'pause' | 'resume' | 'stop';

export type ReaderTtsSpeechTarget = {
  text: string;
  label: string;
};

export type ReaderTtsSessionState = {
  status: ReaderTtsSessionStatus;
  error: string;
  lastAction: ReaderTtsSessionAction | null;
  lastActionAt: number | null;
  speechLabel: string;
};

export type ReaderTtsControllerOptions = {
  isAvailable?: boolean;
  unavailableReason?: string;
  getNow?: () => number;
};

export const READER_TTS_UNAVAILABLE_REASON = '当前还没有接入朗读引擎';
export const READER_TTS_NO_TEXT_REASON = '当前没有可朗读的文本';

export const createEmptyReaderTtsSessionState = (
  overrides: Partial<ReaderTtsSessionState> = {}
): ReaderTtsSessionState => ({
  status: 'unavailable',
  error: '',
  lastAction: null,
  lastActionAt: null,
  speechLabel: '',
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
  const speechSuffix = state.speechLabel ? `（${state.speechLabel}）` : '';

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
  if (!state.speechLabel) return statusLabel;

  return `${statusLabel} · ${state.speechLabel}`;
};

const hasSameReaderTtsSessionState = (
  current: ReaderTtsSessionState,
  next: ReaderTtsSessionState
): boolean =>
  current.status === next.status &&
  current.error === next.error &&
  current.lastAction === next.lastAction &&
  current.lastActionAt === next.lastActionAt &&
  current.speechLabel === next.speechLabel;

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
    activeSpeechTarget = target;
    state.update((current) => {
      const next = {
        ...current,
        speechLabel: target?.label.trim() || ''
      };

      return hasSameReaderTtsSessionState(current, next) ? current : next;
    });
  };

  const setUnavailable = (reason = unavailableReason) => {
    available = false;
    updateState(
      createUnavailableReaderTtsSessionState(reason, {
        speechLabel: activeSpeechTarget?.label.trim() || ''
      })
    );
  };

  const setIdle = () => {
    available = true;
    updateState(
      createIdleReaderTtsSessionState({
        speechLabel: activeSpeechTarget?.label.trim() || ''
      })
    );
  };

  const setError = (error: string) => {
    updateState(
      createErrorReaderTtsSessionState(error, {
        speechLabel: activeSpeechTarget?.label.trim() || ''
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
        speechLabel: activeSpeechTarget?.label.trim() || ''
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

    const nextTarget = target?.text.trim() ? target : activeSpeechTarget;
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
          speechLabel: nextTarget.label.trim()
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
          speechLabel: current.speechLabel
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
          speechLabel: current.speechLabel
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
          speechLabel: activeSpeechTarget?.label.trim() || ''
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

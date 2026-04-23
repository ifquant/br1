import { writable } from 'svelte/store';

export type ReaderTtsSessionStatus = 'unavailable' | 'idle' | 'speaking' | 'paused' | 'error';

export type ReaderTtsSessionAction = 'start' | 'pause' | 'resume' | 'stop';

export type ReaderTtsSessionState = {
  status: ReaderTtsSessionStatus;
  error: string;
  lastAction: ReaderTtsSessionAction | null;
  lastActionAt: number | null;
};

export type ReaderTtsControllerOptions = {
  isAvailable?: boolean;
  unavailableReason?: string;
  getNow?: () => number;
};

export const READER_TTS_UNAVAILABLE_REASON = '当前还没有接入朗读引擎';

export const createEmptyReaderTtsSessionState = (
  overrides: Partial<ReaderTtsSessionState> = {}
): ReaderTtsSessionState => ({
  status: 'unavailable',
  error: '',
  lastAction: null,
  lastActionAt: null,
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
  switch (state.status) {
    case 'speaking':
      return '暂停朗读';
    case 'paused':
      return '继续朗读';
    case 'error':
      return '重试朗读';
    case 'idle':
      return '开始朗读';
    case 'unavailable':
      return '朗读不可用';
  }
};

export const getReaderTtsStatusDetail = (state: ReaderTtsSessionState): string => {
  if (state.status === 'unavailable' || state.status === 'error') {
    return state.error || READER_TTS_UNAVAILABLE_REASON;
  }

  return getReaderTtsSessionStatusLabel(state);
};

export const createReaderTtsController = ({
  isAvailable = false,
  unavailableReason = READER_TTS_UNAVAILABLE_REASON,
  getNow = () => Date.now()
}: ReaderTtsControllerOptions = {}) => {
  let available = isAvailable;
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

  const setUnavailable = (reason = unavailableReason) => {
    available = false;
    state.set(createUnavailableReaderTtsSessionState(reason));
  };

  const setIdle = () => {
    available = true;
    state.set(createIdleReaderTtsSessionState());
  };

  const setError = (error: string) => {
    state.set(createErrorReaderTtsSessionState(error));
  };

  const setAvailability = (nextAvailable: boolean, reason = unavailableReason) => {
    available = nextAvailable;
    state.update((current) => {
      if (available) {
        return createIdleReaderTtsSessionState({
          lastAction: current.lastAction,
          lastActionAt: current.lastActionAt
        });
      }

      return createUnavailableReaderTtsSessionState(reason, {
        lastAction: current.lastAction,
        lastActionAt: current.lastActionAt
      });
    });
  };

  const start = () => {
    state.update((current) => {
      if (!available) {
        return stamp(createErrorReaderTtsSessionState(unavailableReason), 'start');
      }

      return stamp(createSpeakingReaderTtsSessionState(), 'start');
    });
  };

  const pause = () => {
    state.update((current) => {
      if (!available) {
        return stamp(createErrorReaderTtsSessionState(unavailableReason), 'pause');
      }

      if (current.status !== 'speaking') {
        return stamp(createErrorReaderTtsSessionState('只有朗读中才能暂停'), 'pause');
      }

      return stamp(createPausedReaderTtsSessionState(), 'pause');
    });
  };

  const resume = () => {
    state.update((current) => {
      if (!available) {
        return stamp(createErrorReaderTtsSessionState(unavailableReason), 'resume');
      }

      if (current.status !== 'paused') {
        return stamp(createErrorReaderTtsSessionState('只有暂停的朗读才能继续'), 'resume');
      }

      return stamp(createSpeakingReaderTtsSessionState(), 'resume');
    });
  };

  const stop = () => {
    state.update((current) => {
      if (!available) {
        return stamp(createUnavailableReaderTtsSessionState(unavailableReason), 'stop');
      }

      return stamp(createIdleReaderTtsSessionState(), 'stop');
    });
  };

  return {
    state,
    setAvailability,
    setUnavailable,
    setIdle,
    setError,
    start,
    pause,
    resume,
    stop
  };
};

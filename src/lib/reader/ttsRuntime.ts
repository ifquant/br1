export type ReaderTtsRuntimeSpeakHandlers = {
  onEnd: () => void;
  onError: (message: string) => void;
};

export type ReaderTtsRuntime = {
  supported: boolean;
  speak: (text: string, handlers: ReaderTtsRuntimeSpeakHandlers, lang?: string) => boolean;
  pause: () => boolean;
  resume: () => boolean;
  stop: () => boolean;
};

const createUnsupportedReaderTtsRuntime = (): ReaderTtsRuntime => ({
  supported: false,
  speak: () => false,
  pause: () => false,
  resume: () => false,
  stop: () => false
});

export const createWebSpeechReaderTtsRuntime = (): ReaderTtsRuntime => {
  if (typeof window === 'undefined') {
    return createUnsupportedReaderTtsRuntime();
  }

  const speechSynthesis = window.speechSynthesis;
  const hasUtterance = typeof window.SpeechSynthesisUtterance === 'function';

  if (!speechSynthesis || !hasUtterance) {
    return createUnsupportedReaderTtsRuntime();
  }

  let activeUtterance: SpeechSynthesisUtterance | null = null;

  const clearActiveUtterance = (utterance: SpeechSynthesisUtterance) => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
  };

  return {
    supported: true,
    speak: (text, handlers, lang) => {
      const trimmed = text.trim();
      if (!trimmed) return false;

      try {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(trimmed);
        activeUtterance = utterance;
        utterance.lang = lang?.trim() || navigator.language || 'zh-CN';
        utterance.onend = () => {
          clearActiveUtterance(utterance);
          handlers.onEnd();
        };
        utterance.onerror = () => {
          clearActiveUtterance(utterance);
          handlers.onError('Web Speech 朗读引擎发生错误');
        };
        speechSynthesis.speak(utterance);
        return true;
      } catch (error) {
        activeUtterance = null;
        handlers.onError(error instanceof Error ? error.message : String(error));
        return false;
      }
    },
    pause: () => {
      try {
        speechSynthesis.pause();
        return true;
      } catch {
        return false;
      }
    },
    resume: () => {
      try {
        speechSynthesis.resume();
        return true;
      } catch {
        return false;
      }
    },
    stop: () => {
      try {
        speechSynthesis.cancel();
        activeUtterance = null;
        return true;
      } catch {
        return false;
      }
    }
  };
};

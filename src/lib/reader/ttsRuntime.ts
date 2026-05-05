export type ReaderTtsRuntimeSpeakHandlers = {
  onEnd: () => void;
  onError: (message: string) => void;
};

export type ReaderTtsRuntimeMediaSessionSnapshot = {
  status: 'unavailable' | 'idle' | 'speaking' | 'paused' | 'error';
  title: string;
  artist: string;
  album: string;
};

export type ReaderTtsRuntimeMediaSessionHandlers = {
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
};

export type ReaderTtsRuntime = {
  supported: boolean;
  speak: (text: string, handlers: ReaderTtsRuntimeSpeakHandlers, lang?: string) => boolean;
  pause: () => boolean;
  resume: () => boolean;
  stop: () => boolean;
  syncMediaSession: (
    snapshot: ReaderTtsRuntimeMediaSessionSnapshot,
    handlers: ReaderTtsRuntimeMediaSessionHandlers
  ) => void;
};

const createUnsupportedReaderTtsRuntime = (): ReaderTtsRuntime => ({
  supported: false,
  speak: () => false,
  pause: () => false,
  resume: () => false,
  stop: () => false,
  syncMediaSession: () => {}
});

export const createWebSpeechReaderTtsRuntime = (): ReaderTtsRuntime => {
  if (typeof window === 'undefined') {
    return createUnsupportedReaderTtsRuntime();
  }

  const speechSynthesis = window.speechSynthesis;
  const hasUtterance = typeof window.SpeechSynthesisUtterance === 'function';
  const mediaSession = navigator.mediaSession ?? null;
  const MediaMetadataCtor = (
    window as Window & typeof globalThis & { MediaMetadata?: new (init?: MediaMetadataInit) => MediaMetadata }
  ).MediaMetadata;

  if (!speechSynthesis || !hasUtterance) {
    return createUnsupportedReaderTtsRuntime();
  }

  let activeUtterance: SpeechSynthesisUtterance | null = null;

  const clearActiveUtterance = (utterance: SpeechSynthesisUtterance) => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
  };

  const installMediaSessionHandler = (
    action: MediaSessionAction,
    handler: MediaSessionActionHandler | null
  ) => {
    if (!mediaSession) return;

    try {
      mediaSession.setActionHandler(action, handler);
    } catch {
      // Some browsers expose mediaSession but reject unsupported handlers.
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
    },
    syncMediaSession: (snapshot, handlers) => {
      if (!mediaSession) return;

      installMediaSessionHandler('play', () => handlers.onPlay());
      installMediaSessionHandler('pause', () => handlers.onPause());
      installMediaSessionHandler('stop', () => handlers.onStop());

      try {
        mediaSession.playbackState =
          snapshot.status === 'speaking'
            ? 'playing'
            : snapshot.status === 'paused'
              ? 'paused'
              : 'none';
      } catch {
        // Some browsers expose readonly or partial mediaSession implementations.
      }

      if (!MediaMetadataCtor || !snapshot.title.trim()) {
        try {
          mediaSession.metadata = null;
        } catch {
          // Ignore browsers that reject metadata clearing.
        }
        return;
      }

      try {
        mediaSession.metadata = new MediaMetadataCtor({
          title: snapshot.title,
          artist: snapshot.artist,
          album: snapshot.album
        });
      } catch {
        // Ignore malformed or unsupported metadata writes.
      }
    }
  };
};

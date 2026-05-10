// Ownership: these reader-domain tests pin helper invariants that multiple UI
// surfaces restore from. Keep explicit normalization expectations here so later
// refactors do not quietly change persisted contracts.

import assert from 'node:assert/strict';
import test from 'node:test';

import { createWebSpeechReaderTtsRuntime } from './ttsRuntime';

type MutableGlobal = typeof globalThis & {
  window?: unknown;
  navigator?: Navigator;
};

test('web speech runtime mirrors TTS session state into Media Session metadata and handlers', () => {
  const globals = globalThis as MutableGlobal;
  const previousWindow = globals.window;
  const previousNavigator = globals.navigator;

  const mediaSession = {
    metadata: null as MediaMetadata | null,
    playbackState: 'none' as MediaSessionPlaybackState,
    handlers: new Map<MediaSessionAction, MediaSessionActionHandler | null>(),
    setActionHandler(action: MediaSessionAction, handler: MediaSessionActionHandler | null) {
      this.handlers.set(action, handler);
    }
  };

  class FakeSpeechSynthesisUtterance {
    text: string;
    lang = '';
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;

    constructor(text: string) {
      this.text = text;
    }
  }

  class FakeMediaMetadata {
    title = '';
    artist = '';
    album = '';

    constructor(init?: MediaMetadataInit) {
      this.title = init?.title || '';
      this.artist = init?.artist || '';
      this.album = init?.album || '';
    }
  }

  const speechSynthesis = {
    cancel() {},
    pause() {},
    resume() {},
    speak() {}
  } as unknown as SpeechSynthesis;

  globals.window = {
    speechSynthesis,
    SpeechSynthesisUtterance:
      FakeSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance,
    MediaMetadata: FakeMediaMetadata as unknown as typeof MediaMetadata
  } as unknown as Window & typeof globalThis;
  Object.defineProperty(globals, 'navigator', {
    configurable: true,
    value: {
      language: 'zh-CN',
      mediaSession
    }
  });

  try {
    const runtime = createWebSpeechReaderTtsRuntime();

    runtime.syncMediaSession(
      {
        status: 'speaking',
        title: '当前译文',
        artist: 'DeepL 翻译结果',
        album: 'Bridge Reader · 朗读中'
      },
      {
        onPlay: () => {},
        onPause: () => {},
        onStop: () => {}
      }
    );

    assert.equal(mediaSession.playbackState, 'playing');
    assert.equal((mediaSession.metadata as FakeMediaMetadata).title, '当前译文');
    assert.equal((mediaSession.metadata as FakeMediaMetadata).artist, 'DeepL 翻译结果');
    assert.equal((mediaSession.metadata as FakeMediaMetadata).album, 'Bridge Reader · 朗读中');
    assert.equal(typeof mediaSession.handlers.get('play'), 'function');
    assert.equal(typeof mediaSession.handlers.get('pause'), 'function');
    assert.equal(typeof mediaSession.handlers.get('stop'), 'function');

    runtime.syncMediaSession(
      {
        status: 'idle',
        title: '',
        artist: '',
        album: 'Bridge Reader · 朗读模式'
      },
      {
        onPlay: () => {},
        onPause: () => {},
        onStop: () => {}
      }
    );

    assert.equal(mediaSession.playbackState, 'none');
    assert.equal(mediaSession.metadata, null);
  } finally {
    globals.window = previousWindow;
    Object.defineProperty(globals, 'navigator', {
      configurable: true,
      value: previousNavigator
    });
  }
});

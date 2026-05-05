import assert from 'node:assert/strict';
import test from 'node:test';

import {
  READER_TTS_FOLLOW_CURRENT_LABEL,
  READER_TTS_LOCKED_TARGET_LABEL,
  createReaderTtsController,
  createEmptyReaderTtsSessionState,
  getReaderTtsFollowCurrentLabel,
  getReaderTtsReadableSourceLabel,
  getReaderTtsReadableTargetLabel,
  normalizeReaderTtsLanguageTag,
  normalizeReaderTtsSpeechTarget,
  planReaderTtsRetargetAction,
  resolveReaderTtsSpeechTargetForMode
} from './tts';

test('normalizeReaderTtsSpeechTarget keeps explicit source and follow-current metadata', () => {
  const target = normalizeReaderTtsSpeechTarget({
    text: '  current paragraph  ',
    label: '  当前段落  ',
    sourceLabel: '  正文  ',
    targetLabel: '  当前段落  ',
    followsCurrent: true
  });

  assert.deepEqual(target, {
    text: 'current paragraph',
    label: '当前段落',
    sourceLabel: '正文',
    targetLabel: '当前段落',
    followsCurrent: true,
    lang: undefined
  });
});

test('TTS readable helpers fall back to the richer target metadata first', () => {
  const state = createEmptyReaderTtsSessionState({
    speechLabel: '旧标签',
    speechSourceLabel: '正文',
    speechTargetLabel: '当前段落',
    followsCurrent: true
  });

  assert.equal(getReaderTtsReadableSourceLabel(state), '正文');
  assert.equal(getReaderTtsReadableTargetLabel(state), '当前段落');
  assert.equal(getReaderTtsFollowCurrentLabel(state), READER_TTS_FOLLOW_CURRENT_LABEL);
});

test('TTS follow-current helper distinguishes fixed targets', () => {
  const state = createEmptyReaderTtsSessionState({
    speechLabel: '选中文本',
    speechTargetLabel: '选中文本',
    followsCurrent: false
  });

  assert.equal(getReaderTtsReadableSourceLabel(state), '');
  assert.equal(getReaderTtsReadableTargetLabel(state), '选中文本');
  assert.equal(getReaderTtsFollowCurrentLabel(state), READER_TTS_LOCKED_TARGET_LABEL);
});

test('translated TTS mode prefers the current translation result', () => {
  const target = resolveReaderTtsSpeechTargetForMode({
    mode: 'translated',
    source: {
      selectedText: 'original paragraph',
      chapterLabel: 'Chapter 3',
      title: 'Sample Book'
    },
    translated: {
      translatedText: ' translated paragraph ',
      providerLabel: 'DeepL',
      targetLanguage: 'zh'
    }
  });

  assert.deepEqual(target, {
    text: 'translated paragraph',
    label: '当前译文',
    sourceLabel: 'DeepL 翻译结果',
    targetLabel: '译文',
    followsCurrent: true,
    lang: 'zh-CN'
  });
});

test('translated TTS mode preserves explicit archive-versus-live source labels', () => {
  const target = resolveReaderTtsSpeechTargetForMode({
    mode: 'translated',
    source: {
      selectedText: 'original paragraph',
      chapterLabel: 'Chapter 3',
      title: 'Sample Book'
    },
    translated: {
      translatedText: ' archived translated paragraph ',
      providerLabel: '历史译文 · DeepL',
      targetLanguage: 'en'
    }
  });

  assert.equal(target?.sourceLabel, '历史译文 · DeepL');
  assert.equal(target?.lang, 'en-US');
});

test('translated TTS mode yields no target when there is no translation result yet', () => {
  const target = resolveReaderTtsSpeechTargetForMode({
    mode: 'translated',
    source: {
      selectedText: 'original paragraph',
      chapterLabel: 'Chapter 3',
      title: 'Sample Book'
    },
    translated: {
      translatedText: '',
      providerLabel: 'DeepL'
    }
  });

  assert.equal(target, null);
});

test('source TTS mode prefers a live reading excerpt before chapter-title fallback', () => {
  const target = resolveReaderTtsSpeechTargetForMode({
    mode: 'source',
    source: {
      selectedText: '',
      excerptText: ' This plain text file exists to verify the current contract. ',
      excerptSourceLabel: '当前阅读位置',
      sourceLanguage: 'en',
      chapterLabel: '纯文本',
      title: 'Sample TXT Book'
    }
  });

  assert.deepEqual(target, {
    text: 'This plain text file exists to verify the current contract.',
    label: '当前正文摘录',
    sourceLabel: '当前阅读位置',
    targetLabel: '正文摘录',
    followsCurrent: true,
    lang: 'en-US'
  });
});

test('source TTS mode carries EPUB metadata language into chapter fallback targets', () => {
  const target = resolveReaderTtsSpeechTargetForMode({
    mode: 'source',
    source: {
      selectedText: '',
      excerptText: '',
      excerptSourceLabel: '',
      sourceLanguage: 'fr',
      chapterLabel: 'Chapitre 1',
      title: 'Livre Exemple'
    }
  });

  assert.deepEqual(target, {
    text: 'Chapitre 1',
    label: '当前章节',
    sourceLabel: '当前阅读位置',
    targetLabel: '章节标题',
    followsCurrent: true,
    lang: 'fr-FR'
  });
});

test('TTS retarget plan restarts active speech but only arms paused sessions', () => {
  assert.equal(planReaderTtsRetargetAction('speaking'), 'restart-session');
  assert.equal(planReaderTtsRetargetAction('paused'), 'stop-and-arm-target');
  assert.equal(planReaderTtsRetargetAction('idle'), 'replace-target');
  assert.equal(planReaderTtsRetargetAction('error'), 'replace-target');
  assert.equal(planReaderTtsRetargetAction('unavailable'), 'replace-target');
});

test('normalizeReaderTtsLanguageTag expands common translation targets', () => {
  assert.equal(normalizeReaderTtsLanguageTag('zh'), 'zh-CN');
  assert.equal(normalizeReaderTtsLanguageTag('en'), 'en-US');
  assert.equal(normalizeReaderTtsLanguageTag('fr'), 'fr-FR');
  assert.equal(normalizeReaderTtsLanguageTag('pt-BR'), 'pt-BR');
});

test('TTS controller prefers the target language over navigator.language', () => {
  let spokenLanguage = '';
  const runtime = {
    supported: true,
    speak: (_text: string, _handlers: { onEnd: () => void; onError: (message: string) => void }, lang?: string) => {
      spokenLanguage = lang || '';
      return true;
    },
    pause: () => true,
    resume: () => true,
    stop: () => true,
    syncMediaSession: () => {}
  };
  const controller = createReaderTtsController({
    isAvailable: true,
    runtime,
    getNow: () => 1
  });

  controller.start({
    text: 'translated paragraph',
    label: '当前译文',
    sourceLabel: 'DeepL 翻译结果',
    targetLabel: '译文',
    followsCurrent: true,
    lang: 'en-US'
  });

  assert.equal(spokenLanguage, 'en-US');
});

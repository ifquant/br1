import assert from 'node:assert/strict';
import test from 'node:test';

import {
  READER_TTS_FOLLOW_CURRENT_LABEL,
  READER_TTS_LOCKED_TARGET_LABEL,
  createEmptyReaderTtsSessionState,
  getReaderTtsFollowCurrentLabel,
  getReaderTtsReadableSourceLabel,
  getReaderTtsReadableTargetLabel,
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
    followsCurrent: true
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
      providerLabel: 'DeepL'
    }
  });

  assert.deepEqual(target, {
    text: 'translated paragraph',
    label: '当前译文',
    sourceLabel: 'DeepL 翻译结果',
    targetLabel: '译文',
    followsCurrent: true
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
      providerLabel: '历史译文 · DeepL'
    }
  });

  assert.equal(target?.sourceLabel, '历史译文 · DeepL');
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

test('TTS retarget plan restarts active speech but only arms paused sessions', () => {
  assert.equal(planReaderTtsRetargetAction('speaking'), 'restart-session');
  assert.equal(planReaderTtsRetargetAction('paused'), 'stop-and-arm-target');
  assert.equal(planReaderTtsRetargetAction('idle'), 'replace-target');
  assert.equal(planReaderTtsRetargetAction('error'), 'replace-target');
  assert.equal(planReaderTtsRetargetAction('unavailable'), 'replace-target');
});

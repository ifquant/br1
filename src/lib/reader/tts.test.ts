import assert from 'node:assert/strict';
import test from 'node:test';

import {
  READER_TTS_FOLLOW_CURRENT_LABEL,
  READER_TTS_LOCKED_TARGET_LABEL,
  createEmptyReaderTtsSessionState,
  getReaderTtsFollowCurrentLabel,
  getReaderTtsReadableSourceLabel,
  getReaderTtsReadableTargetLabel,
  normalizeReaderTtsSpeechTarget
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

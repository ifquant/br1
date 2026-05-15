// Ownership: these tests pin the pure playback-queue helper before route state
// and workspace UI start sharing queue/rate/timeout behavior.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createReaderPlaybackQueue,
  getReaderPlaybackQueueSummary,
  moveReaderPlaybackQueueNext,
  moveReaderPlaybackQueuePrevious,
  setReaderPlaybackRate,
  setReaderPlaybackTimeout
} from './playbackQueue.js';
import type { ReaderTtsSpeechTarget } from './tts.js';

const buildTarget = (label: string, text = `${label} text`): ReaderTtsSpeechTarget => ({
  text,
  label,
  sourceLabel: '当前正文',
  progressLabel: '18%'
});

test('playback queue starts at the first segment', () => {
  const queue = createReaderPlaybackQueue([buildTarget('第一段'), buildTarget('第二段')]);

  assert.equal(queue.activeIndex, 0);
  assert.equal(queue.segments[0]?.target.label, '第一段');
  assert.equal(getReaderPlaybackQueueSummary(queue).currentLabel, '第一段');
});

test('playback queue next and previous clamp at the boundaries', () => {
  const queue = createReaderPlaybackQueue([buildTarget('第一段'), buildTarget('第二段')]);

  const next = moveReaderPlaybackQueueNext(queue);
  const clampedEnd = moveReaderPlaybackQueueNext(next);
  const previous = moveReaderPlaybackQueuePrevious(clampedEnd);
  const clampedStart = moveReaderPlaybackQueuePrevious(previous);

  assert.equal(next.activeIndex, 1);
  assert.equal(clampedEnd.activeIndex, 1);
  assert.equal(previous.activeIndex, 0);
  assert.equal(clampedStart.activeIndex, 0);
});

test('playback queue timeout disables itself after expiry', () => {
  const queue = createReaderPlaybackQueue([buildTarget('第一段')]);
  const armed = setReaderPlaybackTimeout(queue, {
    durationMs: 30_000,
    now: 1_000
  });
  const expired = setReaderPlaybackTimeout(armed, {
    now: 31_001
  });

  assert.equal(armed.timeoutAt, 31_000);
  assert.equal(expired.timeoutAt, null);
  assert.equal(getReaderPlaybackQueueSummary(expired).timeoutLabel, '定时关闭未开启');
});

test('playback queue rate is clamped between 0.2 and 3.0', () => {
  const queue = createReaderPlaybackQueue([buildTarget('第一段')]);

  assert.equal(setReaderPlaybackRate(queue, 0.01).playbackRate, 0.2);
  assert.equal(setReaderPlaybackRate(queue, 5).playbackRate, 3);
  assert.equal(setReaderPlaybackRate(queue, 1.75).playbackRate, 1.75);
});

test('empty playback queue returns a no-target summary', () => {
  const queue = createReaderPlaybackQueue([]);
  const summary = getReaderPlaybackQueueSummary(queue);

  assert.equal(queue.activeIndex, -1);
  assert.equal(summary.hasTarget, false);
  assert.equal(summary.currentLabel, '当前没有可播放的段落。');
  assert.equal(summary.positionLabel, '0 / 0');
});

test('empty playback queue still reports an armed timeout countdown', () => {
  const queue = setReaderPlaybackTimeout(createReaderPlaybackQueue([]), {
    durationMs: 30_000,
    now: 1_000
  });
  const summary = getReaderPlaybackQueueSummary(queue, 2_000);

  assert.equal(summary.hasTarget, false);
  assert.equal(summary.timeoutAt, 31_000);
  assert.equal(summary.timeoutRemainingMs, 29_000);
  assert.equal(summary.timeoutLabel, '定时关闭 29 秒后');
});

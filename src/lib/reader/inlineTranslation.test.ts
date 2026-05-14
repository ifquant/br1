// Ownership: these tests pin the pure inline-translation state machine before
// the viewport starts emitting renderer-visible translation candidates.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEmptyReaderInlineTranslationState,
  getReaderInlineTranslationSummary,
  markReaderInlineTranslationError,
  markReaderInlineTranslationTranslated,
  markReaderInlineTranslationTranslating,
  toggleReaderInlineTranslationVisibility,
  upsertReaderInlineTranslationCandidate
} from './inlineTranslation.js';

test('inline translation ignores empty source candidates', () => {
  const state = createEmptyReaderInlineTranslationState();

  assert.deepEqual(
    upsertReaderInlineTranslationCandidate(state, {
      id: 'block-1',
      sourceText: '   ',
      sourceLabel: 'Chapter 1',
      now: 10
    }).blocks,
    []
  );
});

test('inline translation de-duplicates candidates by block id', () => {
  const state = createEmptyReaderInlineTranslationState();
  const withFirst = upsertReaderInlineTranslationCandidate(state, {
    id: 'block-1',
    sourceText: 'First paragraph',
    sourceLabel: 'Chapter 1',
    now: 10
  });
  const withSecond = upsertReaderInlineTranslationCandidate(withFirst, {
    id: 'block-1',
    sourceText: 'First paragraph changed',
    sourceLabel: 'Chapter 1 updated',
    now: 20
  });

  assert.equal(withSecond.blocks.length, 1);
  assert.equal(withSecond.blocks[0]?.sourceText, 'First paragraph changed');
  assert.equal(withSecond.blocks[0]?.sourceLabel, 'Chapter 1 updated');
  assert.equal(withSecond.blocks[0]?.updatedAt, 20);
});

test('inline translation visibility toggles do not drop translated text', () => {
  const state = markReaderInlineTranslationTranslated(
    upsertReaderInlineTranslationCandidate(createEmptyReaderInlineTranslationState(), {
      id: 'block-1',
      sourceText: 'Original text',
      sourceLabel: 'Chapter 1',
      now: 10
    }),
    {
      id: 'block-1',
      translatedText: '译文',
      now: 20
    }
  );

  const hidden = toggleReaderInlineTranslationVisibility(state, {
    showSource: false,
    showTranslation: false
  });

  assert.equal(hidden.showSource, false);
  assert.equal(hidden.showTranslation, false);
  assert.equal(hidden.blocks[0]?.translatedText, '译文');
  assert.equal(hidden.blocks[0]?.status, 'translated');
});

test('inline translation keeps retryable error state on failed blocks', () => {
  const state = upsertReaderInlineTranslationCandidate(createEmptyReaderInlineTranslationState(), {
    id: 'block-1',
    sourceText: 'Original text',
    sourceLabel: 'Chapter 1',
    now: 10
  });

  const translating = markReaderInlineTranslationTranslating(state, {
    id: 'block-1',
    now: 20
  });
  const failed = markReaderInlineTranslationError(translating, {
    id: 'block-1',
    error: 'Provider unavailable',
    now: 30
  });

  assert.equal(failed.blocks[0]?.status, 'error');
  assert.equal(failed.blocks[0]?.error, 'Provider unavailable');
  assert.equal(failed.blocks[0]?.updatedAt, 30);
  assert.match(getReaderInlineTranslationSummary(failed), /1 段需要重试/);
});

test('inline translation summary separates source and translation visibility', () => {
  const state = toggleReaderInlineTranslationVisibility(createEmptyReaderInlineTranslationState(), {
    showSource: false,
    showTranslation: true
  });

  assert.equal(state.showSource, false);
  assert.equal(state.showTranslation, true);
  assert.match(getReaderInlineTranslationSummary(state), /隐藏原文/);
  assert.match(getReaderInlineTranslationSummary(state), /显示译文/);
});

// Ownership: these tests pin the pure focused-reading helpers before the route
// and overlay start coordinating temporary reader modes.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  advanceReaderRsvpWord,
  createReaderFocusedReadingState,
  exitReaderFocusedReading,
  getReaderFocusedReadingSummary,
  parseReaderFocusedReadingPersistedState,
  serializeReaderFocusedReadingState,
  startReaderParagraphFocus,
  startReaderRsvpLite
} from './readingMode.js';
import { createEmptyReaderPreviewState, type ReaderSelectionState } from './types.js';

const buildPreview = () =>
  createEmptyReaderPreviewState({
    title: 'Sample Book',
    chapterLabel: '第一章',
    formatLabel: 'EPUB',
    progressLabel: '18%',
    progressLocation: 'epubcfi(/6/2!/4/2/8)',
    ttsSourceText: 'Current excerpt from the reader canvas.',
    ttsSourceLabel: '当前正文'
  });

const buildSelection = (text = 'Selected excerpt from the current reader selection.'): ReaderSelectionState => ({
  cfi: 'epubcfi(/6/2!/4/2/10)',
  text,
  chapterLabel: '第一章',
  chapterHref: '#chapter-1'
});

test('paragraph focus mode starts from the current reader excerpt when available', () => {
  const state = startReaderParagraphFocus(createReaderFocusedReadingState(), {
    preview: buildPreview(),
    selection: null
  });

  assert.equal(state.mode, 'paragraph');
  assert.equal(state.sourceText, 'Current excerpt from the reader canvas.');
  assert.equal(state.sourceLabel, '当前正文');
  assert.equal(state.progressLocation, 'epubcfi(/6/2!/4/2/8)');
  assert.match(getReaderFocusedReadingSummary(state), /段落聚焦/);
});

test('paragraph focus mode prefers the current selection when the reader has one', () => {
  const state = startReaderParagraphFocus(createReaderFocusedReadingState(), {
    preview: buildPreview(),
    selection: buildSelection()
  });

  assert.equal(state.mode, 'paragraph');
  assert.equal(state.sourceText, 'Selected excerpt from the current reader selection.');
  assert.equal(state.sourceLabel, '当前选区');
});

test('rsvp-lite mode splits a selected/current excerpt into words without mutating reader progress', () => {
  const preview = buildPreview();
  const state = startReaderRsvpLite(createReaderFocusedReadingState(), {
    preview,
    selection: buildSelection('Focus mode should step through these words.')
  });

  assert.equal(state.mode, 'rsvp');
  assert.deepEqual(state.words, ['Focus', 'mode', 'should', 'step', 'through', 'these', 'words.']);
  assert.equal(state.progressLocation, preview.progressLocation);

  const advanced = advanceReaderRsvpWord(state, 2);
  assert.equal(advanced.activeWordIndex, 2);
  assert.equal(advanced.progressLocation, preview.progressLocation);
  assert.equal(state.activeWordIndex, 0);
});

test('unsupported formats return a visible capability message', () => {
  const state = startReaderParagraphFocus(createReaderFocusedReadingState(), {
    preview: createEmptyReaderPreviewState({
      formatLabel: 'PDF',
      progressLabel: '42%',
      progressLocation: 'pdf:42',
      ttsSourceText: 'PDF text that should still stay behind capability copy.'
    }),
    selection: null
  });

  assert.equal(state.mode, 'paragraph');
  assert.equal(state.sourceText, 'PDF text that should still stay behind capability copy.');
  assert.match(state.capabilityMessage, /PDF/);
  assert.match(getReaderFocusedReadingSummary(state), /PDF/);
});

test('focused reading persistence round-trips supported rsvp-lite text state', () => {
  const active = advanceReaderRsvpWord(
    startReaderRsvpLite(createReaderFocusedReadingState(), {
      preview: buildPreview(),
      selection: buildSelection('Resume should restore this exact visible segment.')
    }),
    3
  );

  const persisted = serializeReaderFocusedReadingState(active);
  assert.equal(persisted?.mode, 'rsvp');
  assert.equal(persisted?.formatLabel, 'EPUB');
  assert.equal(persisted?.activeWordIndex, 3);

  const restored = parseReaderFocusedReadingPersistedState(persisted);

  assert.equal(restored.mode, 'rsvp');
  assert.equal(restored.sourceText, 'Resume should restore this exact visible segment.');
  assert.deepEqual(restored.words, ['Resume', 'should', 'restore', 'this', 'exact', 'visible', 'segment.']);
  assert.equal(restored.activeWordIndex, 3);
});

test('focused reading persistence refuses unsupported pdf and cbz surfaces', () => {
  const pdfState = startReaderParagraphFocus(createReaderFocusedReadingState(), {
    preview: createEmptyReaderPreviewState({
      formatLabel: 'PDF',
      ttsSourceText: 'PDF text remains presentation-only for focused resume.'
    }),
    selection: null
  });

  assert.equal(serializeReaderFocusedReadingState(pdfState), null);
  assert.deepEqual(
    parseReaderFocusedReadingPersistedState({
      schemaVersion: 1,
      mode: 'paragraph',
      formatLabel: 'CBZ',
      sourceText: 'image page OCR-ish text',
      sourceLabel: '当前正文',
      progressLabel: '',
      progressLocation: '',
      words: [],
      activeWordIndex: 0
    }),
    createReaderFocusedReadingState()
  );
});

test('focused reading restore clamps stale rsvp word positions', () => {
  const restored = parseReaderFocusedReadingPersistedState({
    schemaVersion: 1,
    mode: 'rsvp',
    formatLabel: 'TXT',
    sourceText: 'one two three',
    sourceLabel: '当前正文',
    progressLabel: '10%',
    progressLocation: 'txt:0',
    words: ['one', 'two', 'three'],
    activeWordIndex: 99
  });

  assert.equal(restored.mode, 'rsvp');
  assert.equal(restored.activeWordIndex, 2);
});

test('exiting a focused reading mode restores the ordinary reader canvas state', () => {
  const active = startReaderRsvpLite(createReaderFocusedReadingState(), {
    preview: buildPreview(),
    selection: null
  });

  const exited = exitReaderFocusedReading(active);

  assert.deepEqual(exited, createReaderFocusedReadingState());
  assert.equal(getReaderFocusedReadingSummary(exited), '专注阅读未开启。');
});

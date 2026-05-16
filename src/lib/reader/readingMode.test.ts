// Ownership: these tests pin the pure focused-reading helpers before the route
// and overlay start coordinating temporary reader modes.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  advanceReaderRsvpWord,
  changeReaderFocusedReadingModeForSameExcerpt,
  createReaderFocusedReadingState,
  decreaseReaderRsvpLitePace,
  exitReaderFocusedReading,
  getReaderFocusedReadingSummary,
  increaseReaderRsvpLitePace,
  parseReaderFocusedReadingPersistedState,
  READER_RSVP_LITE_DEFAULT_WPM,
  READER_RSVP_LITE_MAX_WPM,
  READER_RSVP_LITE_MIN_WPM,
  restartReaderFocusedReadingRsvpFromWordOne,
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
  assert.equal(state.paceWpm, READER_RSVP_LITE_DEFAULT_WPM);
  assert.equal(state.activeWordIndex, 0);
});

test('rsvp-lite pace controls clamp to a readable range', () => {
  const started = startReaderRsvpLite(createReaderFocusedReadingState(), {
    preview: buildPreview(),
    selection: buildSelection('pace controls should stay readable')
  });

  const slower = Array.from({ length: 10 }).reduce(
    (state: typeof started) => decreaseReaderRsvpLitePace(state),
    started
  );
  assert.equal(slower.paceWpm, READER_RSVP_LITE_MIN_WPM);

  const faster = Array.from({ length: 20 }).reduce(
    (state: typeof started) => increaseReaderRsvpLitePace(state),
    slower
  );
  assert.equal(faster.paceWpm, READER_RSVP_LITE_MAX_WPM);
});

test('rsvp-lite word stepping stops at the end instead of wrapping', () => {
  const started = startReaderRsvpLite(createReaderFocusedReadingState(), {
    preview: buildPreview(),
    selection: buildSelection('one two three')
  });

  const ended = advanceReaderRsvpWord(started, 99);
  assert.equal(ended.activeWordIndex, 2);
  assert.equal(advanceReaderRsvpWord(ended, 1).activeWordIndex, 2);
});

test('same-excerpt mode switching reuses the overlay excerpt instead of asking for new reader input', () => {
  const paragraph = startReaderParagraphFocus(createReaderFocusedReadingState(), {
    preview: buildPreview(),
    selection: buildSelection('Keep this exact excerpt while switching modes.')
  });

  const rsvp = changeReaderFocusedReadingModeForSameExcerpt(paragraph, 'rsvp');
  assert.equal(rsvp.mode, 'rsvp');
  assert.equal(rsvp.sourceText, paragraph.sourceText);
  assert.equal(rsvp.sourceLabel, paragraph.sourceLabel);
  assert.equal(rsvp.progressLocation, paragraph.progressLocation);
  assert.deepEqual(rsvp.words, ['Keep', 'this', 'exact', 'excerpt', 'while', 'switching', 'modes.']);
  assert.equal(rsvp.activeWordIndex, 0);
  assert.equal(rsvp.paceWpm, READER_RSVP_LITE_DEFAULT_WPM);

  const backToParagraph = changeReaderFocusedReadingModeForSameExcerpt(rsvp, 'paragraph');
  assert.equal(backToParagraph.mode, 'paragraph');
  assert.equal(backToParagraph.sourceText, paragraph.sourceText);
  assert.equal(backToParagraph.sourceLabel, paragraph.sourceLabel);
  assert.equal(backToParagraph.progressLocation, paragraph.progressLocation);
});

test('same-excerpt rsvp restart jumps back to word one without replacing the excerpt or pace', () => {
  const started = increaseReaderRsvpLitePace(
    advanceReaderRsvpWord(
      startReaderRsvpLite(createReaderFocusedReadingState(), {
        preview: buildPreview(),
        selection: buildSelection('Restart should keep this same excerpt and speed.')
      }),
      4
    )
  );

  const restarted = restartReaderFocusedReadingRsvpFromWordOne(started);

  assert.equal(restarted.mode, 'rsvp');
  assert.equal(restarted.sourceText, started.sourceText);
  assert.deepEqual(restarted.words, started.words);
  assert.equal(restarted.activeWordIndex, 0);
  assert.equal(restarted.paceWpm, started.paceWpm);
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
  const active = increaseReaderRsvpLitePace(
    advanceReaderRsvpWord(
      startReaderRsvpLite(createReaderFocusedReadingState(), {
        preview: buildPreview(),
        selection: buildSelection('Resume should restore this exact visible segment.')
      }),
      3
    )
  );

  const persisted = serializeReaderFocusedReadingState(active);
  assert.equal(persisted?.mode, 'rsvp');
  assert.equal(persisted?.formatLabel, 'EPUB');
  assert.equal(persisted?.activeWordIndex, 3);
  assert.equal(persisted?.paceWpm, READER_RSVP_LITE_DEFAULT_WPM + 40);

  const restored = parseReaderFocusedReadingPersistedState(persisted);

  assert.equal(restored.mode, 'rsvp');
  assert.equal(restored.sourceText, 'Resume should restore this exact visible segment.');
  assert.deepEqual(restored.words, ['Resume', 'should', 'restore', 'this', 'exact', 'visible', 'segment.']);
  assert.equal(restored.activeWordIndex, 3);
  assert.equal(restored.paceWpm, READER_RSVP_LITE_DEFAULT_WPM + 40);
});

test('focused reading restore backfills the default pace for older rsvp-lite payloads', () => {
  const restored = parseReaderFocusedReadingPersistedState({
    schemaVersion: 1,
    mode: 'rsvp',
    formatLabel: 'TXT',
    sourceText: 'one two three',
    sourceLabel: '当前正文',
    progressLabel: '10%',
    progressLocation: 'txt:0',
    words: ['one', 'two', 'three'],
    activeWordIndex: 1
  });

  assert.equal(restored.mode, 'rsvp');
  assert.equal(restored.paceWpm, READER_RSVP_LITE_DEFAULT_WPM);
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

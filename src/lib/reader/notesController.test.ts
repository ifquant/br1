// Cross-page PDF selections carry one locator per rendered page. The notebook
// must persist each range independently so reopening and drawing stay local to
// its page iframe.

import assert from 'node:assert/strict';
import test from 'node:test';
import { get } from 'svelte/store';

import { createReaderNotesController } from './notesController.js';
import type { ReaderSelectionState } from './types.js';

type PdfSelectionSegment = {
  index: number;
  cfi: string;
  text: string;
  chapterLabel: string;
  chapterHref: string;
};

const selectionWithSegments = (segments: PdfSelectionSegment[]) =>
  ({
    cfi: segments[0]!.cfi,
    text: segments.map((segment) => segment.text).join(' '),
    chapterLabel: segments[0]!.chapterLabel,
    chapterHref: segments[0]!.chapterHref,
    segments
  }) as ReaderSelectionState;

const storageKey = 'reader-notes:cross-page-pdf';
const segments: PdfSelectionSegment[] = [
  {
    index: 3,
    cfi: 'pdf:page-4:start-end',
    text: 'The end of the first PDF page.',
    chapterLabel: 'iv',
    chapterHref: '3'
  },
  {
    index: 4,
    cfi: 'pdf:page-5:start-end',
    text: 'The beginning of the next PDF page.',
    chapterLabel: '1',
    chapterHref: '4'
  }
];

const createFixture = () => {
  const records = new Map<string, string>();
  const storage = {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => records.set(key, value),
    removeItem: (key: string) => records.delete(key),
    clear: () => records.clear(),
    key: () => null,
    get length() {
      return records.size;
    }
  } as Storage;
  const controller = createReaderNotesController({
    getStorage: () => storage,
    getStorageKey: () => storageKey,
    canPersistNotes: () => false,
    loadPersistedNotes: async () => [],
    savePersistedNotes: async () => undefined,
    promptNoteDraft: () => 'cross-page note',
    confirmDelete: () => true
  });
  return { controller, records };
};

test('cross-page PDF highlights persist per segment and notes keep one composite first-page anchor', () => {
  const { controller, records } = createFixture();

  controller.setSelection(selectionWithSegments(segments));
  assert.equal(controller.addHighlightFromSelection(), true);
  assert.deepEqual(
    get(controller.state).notes.map(({ kind, cfi, text, chapterLabel, chapterHref }) => ({
      kind,
      cfi,
      text,
      chapterLabel,
      chapterHref
    })),
    segments.map(({ cfi, text, chapterLabel, chapterHref }) => ({
      kind: 'highlight',
      cfi,
      text,
      chapterLabel,
      chapterHref
    }))
  );

  controller.setSelection(selectionWithSegments(segments));
  assert.equal(controller.addFromSelection(), true);
  assert.equal(get(controller.state).notes.filter((note) => note.kind === 'note').length, 1);
  assert.deepEqual(
    get(controller.state)
      .notes.filter((note) => note.kind === 'note')
      .map(({ cfi, text, note }) => ({ cfi, text, note })),
    [
      {
        cfi: segments[0]!.cfi,
        text: 'The end of the first PDF page. The beginning of the next PDF page.',
        note: 'cross-page note'
      }
    ]
  );
  assert.deepEqual(
    get(controller.state)
      .notes.filter((note) => note.kind === 'highlight')
      .map(({ cfi, text }) => ({ cfi, text })),
    [
      { cfi: segments[1]!.cfi, text: segments[1]!.text },
      ...segments.map(({ cfi, text }) => ({ cfi, text }))
    ]
  );
  const persisted = JSON.parse(records.get(storageKey) ?? '[]') as Array<{
    kind: string;
    cfi: string;
    text: string;
    note: string;
  }>;
  assert.deepEqual(
    persisted.map(({ kind, cfi, text, note }) => ({ kind, cfi, text, note })),
    [
      {
        kind: 'note',
        cfi: segments[0]!.cfi,
        text: 'The end of the first PDF page. The beginning of the next PDF page.',
        note: 'cross-page note'
      },
      { kind: 'highlight', cfi: segments[1]!.cfi, text: segments[1]!.text, note: '' },
      ...segments.map(({ cfi, text }) => ({ kind: 'highlight', cfi, text, note: '' }))
    ]
  );
});

test('cross-page highlight toggle removes every segment when all are already highlighted', () => {
  const { controller, records } = createFixture();
  const selection = selectionWithSegments(segments);

  controller.setSelection(selection);
  assert.equal(controller.addHighlightFromSelection(), true);
  assert.deepEqual(
    get(controller.state).notes.map(({ cfi }) => cfi),
    segments.map(({ cfi }) => cfi)
  );

  controller.setSelection(selection);
  assert.equal(controller.addHighlightFromSelection(), true);
  assert.deepEqual(get(controller.state).notes, []);
  assert.deepEqual(JSON.parse(records.get(storageKey) ?? 'null'), []);
});

test('cross-page highlight toggle keeps existing segments and only adds missing CFIs', () => {
  const { controller, records } = createFixture();

  controller.setSelection(selectionWithSegments([segments[0]!]));
  assert.equal(controller.addHighlightFromSelection(), true);
  const existing = get(controller.state).notes[0]!;

  controller.setSelection(selectionWithSegments(segments));
  assert.equal(controller.addHighlightFromSelection(), true);
  const highlights = get(controller.state).notes;
  assert.equal(highlights.length, 2);
  assert.equal(new Set(highlights.map(({ cfi }) => cfi)).size, 2);
  assert.deepEqual(
    highlights.map(({ cfi }) => cfi).sort(),
    segments.map(({ cfi }) => cfi).sort()
  );
  assert.deepEqual(highlights.find(({ cfi }) => cfi === existing.cfi), existing);
  assert.equal(
    highlights.find(({ cfi }) => cfi === segments[1]!.cfi)?.text,
    segments[1]!.text
  );

  const persisted = JSON.parse(records.get(storageKey) ?? '[]') as Array<{ cfi: string }>;
  assert.equal(persisted.length, 2);
  assert.equal(new Set(persisted.map(({ cfi }) => cfi)).size, 2);
});

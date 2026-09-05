// Cross-page PDF selections carry one locator per rendered page. The notebook
// must persist each range independently so reopening and drawing stay local to
// its page iframe.

import assert from 'node:assert/strict';
import test from 'node:test';
import { get } from 'svelte/store';

import { createReaderNotesController } from './notesController.js';
import type { ReaderNote, ReaderSelectionState } from './types.js';

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

const createFixture = (
  options: Partial<Parameters<typeof createReaderNotesController>[0]> = {}
) => {
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
    confirmDelete: () => true,
    ...options
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

const selectionAt = (cfi: string, text = 'Selected text') =>
  ({
    cfi,
    text,
    chapterLabel: 'Chapter',
    chapterHref: 'chapter-1'
  }) as ReaderSelectionState;

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, resolve, reject };
};

test('scoped additions use their explicit selection and reject an explicit null selection', () => {
  const { controller } = createFixture();
  const globalSelection = selectionAt('epubcfi(/6/2[global])', 'Global text');
  const scopedSelection = selectionAt('epubcfi(/6/2[scoped])', 'Scoped text');

  controller.setSelection(globalSelection);
  assert.equal(
    controller.addFromSelection('note', { selection: scopedSelection, isCurrent: () => true }),
    true
  );
  assert.equal(get(controller.state).notes[0]?.cfi, scopedSelection.cfi);
  assert.equal(get(controller.state).selection, globalSelection);
  assert.equal(
    controller.addFromSelection('note', { selection: null, isCurrent: () => true }),
    false
  );
  assert.equal(controller.addFromSelection('note', { selection: undefined, isCurrent: () => true }), true);
  assert.equal(get(controller.state).notes[0]?.cfi, globalSelection.cfi);
});

test('a note prompt cancellation or invalidated scope never creates a note', () => {
  const { controller, records } = createFixture();
  const selection = selectionAt('epubcfi(/6/2[prompt])');
  controller.setSelection(selection);

  const cancelled = createReaderNotesController({
    getStorage: () => undefined,
    getStorageKey: () => storageKey,
    canPersistNotes: () => false,
    loadPersistedNotes: async () => [],
    savePersistedNotes: async () => undefined,
    promptNoteDraft: () => null,
    confirmDelete: () => true
  });
  cancelled.setSelection(selection);
  assert.equal(cancelled.addFromSelection(), false);

  let currentKey = storageKey;
  let current = true;
  const invalidated = createReaderNotesController({
    getStorage: () => undefined,
    getStorageKey: () => currentKey,
    canPersistNotes: () => false,
    loadPersistedNotes: async () => [],
    savePersistedNotes: async () => undefined,
    promptNoteDraft: () => {
      currentKey = 'reader-notes:other-book';
      current = false;
      return 'draft';
    },
    confirmDelete: () => true
  });
  assert.equal(
    invalidated.addFromSelection('note', { selection, isCurrent: () => current }),
    false
  );
  assert.deepEqual(get(invalidated.state).notes, []);
  assert.deepEqual(JSON.parse(records.get(storageKey) ?? '[]'), []);
});

test('same-CFI notes remain distinct while highlights retain exact toggle semantics', (t) => {
  t.mock.method(Date, 'now', () => 1234);
  const { controller } = createFixture();
  const selection = selectionAt('epubcfi(/6/2[same-cfi])');

  controller.setSelection(selection);
  assert.equal(controller.addFromSelection(), true);
  controller.setSelection(selection);
  assert.equal(controller.addFromSelection(), true);
  assert.equal(get(controller.state).notes.filter((note) => note.kind === 'note').length, 2);
  const [second, first] = get(controller.state).notes;
  assert.equal(second!.createdAt, first!.createdAt);
  assert.notEqual(second!.id, first!.id);

  controller.setSelection(selection);
  assert.equal(controller.addHighlightFromSelection(), true);
  controller.setSelection(selection);
  assert.equal(controller.addHighlightFromSelection(), true);
  assert.equal(get(controller.state).notes.filter((note) => note.kind === 'highlight').length, 0);
  assert.equal(get(controller.state).notes.filter((note) => note.kind === 'note').length, 2);
  assert.equal(controller.remove(second!.id), true);
  assert.deepEqual(get(controller.state).notes, [first]);
});

test('a prompt reentrancy retains records added before the draft returns', () => {
  const selection = selectionAt('epubcfi(/6/2[reentrant])');
  let reentered = false;
  let controller: ReturnType<typeof createReaderNotesController>;
  controller = createReaderNotesController({
    getStorage: () => undefined,
    getStorageKey: () => storageKey,
    canPersistNotes: () => false,
    loadPersistedNotes: async () => [],
    savePersistedNotes: async () => undefined,
    promptNoteDraft: () => {
      if (!reentered) {
        reentered = true;
        controller.addHighlightFromSelection();
      }
      return 'outer draft';
    },
    confirmDelete: () => true
  });

  controller.setSelection(selection);
  assert.equal(controller.addFromSelection(), true);
  assert.deepEqual(get(controller.state).notes.map((note) => note.kind), ['note', 'highlight']);
});

test('edit and remove reject an invalid optional guard', () => {
  const { controller } = createFixture();
  controller.setSelection(selectionAt('epubcfi(/6/2[guard])'));
  assert.equal(controller.addFromSelection(), true);
  const id = get(controller.state).notes[0]!.id;

  assert.equal(controller.edit(id, () => false), false);
  assert.equal(controller.remove(id, () => false), false);
  assert.equal(get(controller.state).notes.length, 1);
});

test('held hydration blocks scoped mutation until the current key is restored', async () => {
  const load = deferred<ReaderNote[]>();
  const saves: ReaderNote[][] = [];
  const restored: ReaderNote = {
    id: 'restored',
    kind: 'note',
    cfi: 'epubcfi(/6/2[restored])',
    text: 'Restored text',
    note: 'Restored note',
    chapterLabel: 'Chapter',
    chapterHref: 'chapter-1',
    createdAt: 1
  };
  const controller = createReaderNotesController({
    getStorage: () => undefined,
    getStorageKey: () => storageKey,
    canPersistNotes: () => true,
    loadPersistedNotes: () => load.promise,
    savePersistedNotes: async (_key, notes) => {
      saves.push(notes);
    },
    promptNoteDraft: () => 'new note',
    confirmDelete: () => true
  });
  const selection = selectionAt('epubcfi(/6/2[new])');

  controller.refresh();
  assert.equal(
    controller.addFromSelection('note', { selection, isCurrent: () => true }),
    false
  );
  load.resolve([restored]);
  await controller.ready();
  assert.deepEqual(get(controller.state).notes, [restored]);

  assert.equal(
    controller.addFromSelection('note', { selection, isCurrent: () => true }),
    true
  );
  await controller.whenPersisted();
  assert.equal(saves.length, 1);
  assert.deepEqual(saves[0]?.map((note) => note.id).sort(), ['restored', get(controller.state).notes[0]!.id].sort());
});

test('native snapshots serialize, report failures, and keep the queue usable', async (t) => {
  t.mock.method(console, 'warn', () => undefined);
  let currentKey = 'reader-notes:A';
  const firstSave = deferred<void>();
  const firstSaveStarted = deferred<void>();
  const saves: Array<{ key: string; cfis: string[] }> = [];
  const errors: unknown[] = [];
  const failure = new Error('expected write failure');
  const { controller } = createFixture({
    getStorageKey: () => currentKey,
    canPersistNotes: () => true,
    savePersistedNotes: async (key, notes) => {
      saves.push({ key, cfis: notes.map((note) => note.cfi) });
      if (saves.length === 1) {
        firstSaveStarted.resolve();
        await firstSave.promise;
      }
      if (saves.length === 2) throw failure;
    },
    onError: (error) => errors.push(error)
  });

  await controller.ready();
  controller.setSelection(selectionAt('first'));
  assert.equal(controller.addHighlightFromSelection(), true);
  await firstSaveStarted.promise;
  controller.setSelection(selectionAt('second'));
  assert.equal(controller.addHighlightFromSelection(), true);
  const failedPersistence = controller.flush();
  controller.setSelection(selectionAt('third'));
  assert.equal(controller.addHighlightFromSelection(), true);
  const finalPersistence = controller.whenPersisted();

  assert.deepEqual(saves, [{ key: 'reader-notes:A', cfis: ['first'] }]);
  firstSave.resolve();
  await assert.rejects(failedPersistence, (error) => error === failure);
  await finalPersistence;
  assert.deepEqual(errors, [failure]);
  assert.deepEqual(saves, [
    { key: 'reader-notes:A', cfis: ['first'] },
    { key: 'reader-notes:A', cfis: ['second', 'first'] },
    { key: 'reader-notes:A', cfis: ['third', 'second', 'first'] }
  ]);

  currentKey = 'reader-notes:B';
  await controller.ready();
  controller.setSelection(selectionAt('other-book'));
  assert.equal(controller.addHighlightFromSelection(), true);
  await controller.flush();
  assert.deepEqual(saves[3], { key: 'reader-notes:B', cfis: ['other-book'] });
});

const restoredNote = (id: string): ReaderNote => ({
  ...selectionAt(id),
  id,
  kind: 'note',
  note: 'Saved draft',
  createdAt: 1
});

test('failed hydration rejects ready and blocks writes until an explicit successful retry', async (t) => {
  t.mock.method(console, 'warn', () => undefined);
  const failure = new Error('load unavailable');
  const retryLoad = deferred<ReaderNote[]>();
  const errors: unknown[] = [];
  const saves: ReaderNote[][] = [];
  let loads = 0;
  const { controller } = createFixture({
    canPersistNotes: () => true,
    loadPersistedNotes: async () => {
      loads += 1;
      if (loads === 1) throw failure;
      return retryLoad.promise;
    },
    savePersistedNotes: async (_key, notes) => { saves.push(notes); },
    onError: (error) => errors.push(error)
  });

  controller.refresh();
  const failedReady = controller.ready();
  await assert.rejects(failedReady, (error) => error === failure);
  assert.equal(controller.ready(), failedReady);
  assert.deepEqual(errors, [failure]);
  controller.setSelection(selectionAt('new'));
  assert.equal(controller.addFromSelection(), false);
  assert.equal(controller.addHighlightFromSelection({ selection: selectionAt('new'), isCurrent: () => true }), false);
  assert.equal(controller.edit('existing'), false);
  assert.equal(controller.remove('existing'), false);
  assert.equal(controller.removeMany(['existing']), false);
  assert.equal(loads, 1);
  assert.equal(saves.length, 0);

  controller.refresh();
  const retryReady = controller.ready();
  assert.notEqual(retryReady, failedReady);
  assert.equal(controller.addFromSelection('note', { selection: selectionAt('new'), isCurrent: () => true }), false);
  const existing = restoredNote('existing');
  retryLoad.resolve([existing]);
  await retryReady;
  assert.equal(loads, 2);
  assert.deepEqual(get(controller.state).notes, [existing]);
  assert.equal(controller.addFromSelection('note', { selection: selectionAt('new'), isCurrent: () => true }), true);
  await controller.flush();
  assert.deepEqual(saves[0]?.map((note) => note.cfi), ['new', 'existing']);
});

test('A -> B -> A waits for the held A snapshot before reloading or adding notes', async () => {
  let currentKey = 'A';
  const existing = restoredNote('existing');
  const disk = new Map<string, ReaderNote[]>([['A', [existing]]]);
  const loads: string[] = [];
  const saveStarted = deferred<void>();
  const releaseSave = deferred<void>();
  const releaseBLoad = deferred<ReaderNote[]>();
  const { controller } = createFixture({
    getStorageKey: () => currentKey,
    canPersistNotes: () => true,
    loadPersistedNotes: async (key) => {
      loads.push(key);
      if (key === 'B') return releaseBLoad.promise;
      return disk.get(key) ?? [];
    },
    savePersistedNotes: async (key, notes) => {
      saveStarted.resolve();
      await releaseSave.promise;
      disk.set(key, notes);
    }
  });

  await controller.ready();
  controller.setSelection(selectionAt('new-A'));
  assert.equal(controller.addFromSelection(), true);
  const admitted = get(controller.state).notes;
  await saveStarted.promise;
  currentKey = 'B';
  controller.refresh();
  const readyB = controller.ready();
  currentKey = 'A';
  controller.refresh();
  const readyA = controller.ready();
  await Promise.resolve();
  assert.deepEqual(loads, ['A', 'B']);
  assert.equal(controller.addFromSelection('note', { selection: selectionAt('too-early'), isCurrent: () => true }), false);

  releaseSave.resolve();
  await readyA;
  assert.deepEqual(loads, ['A', 'B', 'A']);
  releaseBLoad.resolve([restoredNote('stale-B')]);
  await readyB;
  assert.deepEqual(get(controller.state).notes, admitted);
  assert.equal(controller.addFromSelection('note', { selection: selectionAt('after-return'), isCurrent: () => true }), true);
  await controller.flush();
  assert.deepEqual(disk.get('A')?.map((note) => note.cfi), ['after-return', 'new-A', 'existing']);
});

test('failed A writes block stale A reads, allow B, and retry the retained A snapshot', async (t) => {
  t.mock.method(console, 'warn', () => undefined);
  let currentKey = 'A';
  const failure = new Error('save unavailable');
  const retryFailure = new Error('retry unavailable');
  const saveStarted = deferred<void>();
  const releaseSave = deferred<void>();
  const retryStarted = deferred<void>();
  const releaseRetry = deferred<void>();
  const disk = new Map<string, ReaderNote[]>();
  const loads: string[] = [];
  const writes: Array<{ key: string; notes: ReaderNote[] }> = [];
  const errors: unknown[] = [];
  const { controller } = createFixture({
    getStorageKey: () => currentKey,
    canPersistNotes: () => true,
    loadPersistedNotes: async (key) => {
      loads.push(key);
      return disk.get(key) ?? [];
    },
    savePersistedNotes: async (key, notes) => {
      writes.push({ key, notes });
      if (writes.length === 1) {
        saveStarted.resolve();
        await releaseSave.promise;
      }
      if (writes.length === 3) throw retryFailure;
      if (writes.length === 4) {
        retryStarted.resolve();
        await releaseRetry.promise;
      }
      disk.set(key, notes);
    },
    onError: (error) => errors.push(error)
  });

  await controller.ready();
  controller.setSelection(selectionAt('new-A'));
  assert.equal(controller.addFromSelection(), true);
  const admittedA = get(controller.state).notes;
  const saveA = controller.flush();
  await saveStarted.promise;
  currentKey = 'B';
  await controller.ready();
  assert.deepEqual(loads, ['A', 'B']);
  controller.setSelection(selectionAt('new-B'));
  assert.equal(controller.addFromSelection(), true);
  const saveB = controller.flush();
  assert.deepEqual(writes.map(({ key }) => key), ['A']);
  releaseSave.reject(failure);
  await assert.rejects(saveA, (error) => error === failure);
  await saveB;
  assert.deepEqual(errors, []);
  assert.deepEqual(disk.get('B')?.map((note) => note.cfi), ['new-B']);

  // B's successful write must not clear A's failed snapshot or let ready()
  // reload A's stale disk state. Only explicit refresh starts a save retry.
  currentKey = 'A';
  await assert.rejects(controller.ready(), (error) => error === failure);
  assert.deepEqual(loads, ['A', 'B']);
  assert.equal(controller.addFromSelection('note', { selection: selectionAt('blocked'), isCurrent: () => true }), false);
  controller.refresh();
  await assert.rejects(controller.ready(), (error) => error === retryFailure);
  await assert.rejects(controller.flush(), (error) => error === retryFailure);
  assert.deepEqual(errors, [retryFailure]);
  assert.deepEqual(loads, ['A', 'B']);

  controller.refresh();
  const retryReady = controller.ready();
  await retryStarted.promise;
  assert.deepEqual(writes.map(({ key }) => key), ['A', 'B', 'A', 'A']);
  assert.deepEqual(writes[2]?.notes, admittedA);
  assert.deepEqual(writes[3]?.notes, admittedA);
  assert.equal(controller.addHighlightFromSelection({ selection: selectionAt('blocked'), isCurrent: () => true }), false);
  assert.deepEqual(loads, ['A', 'B']);
  releaseRetry.resolve();
  await retryReady;
  assert.deepEqual(loads, ['A', 'B', 'A']);
  assert.deepEqual(get(controller.state).notes, admittedA);
  assert.deepEqual(disk.get('A'), admittedA);
  assert.equal(controller.addFromSelection('note', { selection: selectionAt('after-retry'), isCurrent: () => true }), true);
  await controller.flush();
  assert.deepEqual(disk.get('A')?.map((note) => note.cfi), ['after-retry', 'new-A']);
});

test('a stale hydration failure rejects its waiter without notifying the current book UI', async (t) => {
  t.mock.method(console, 'warn', () => undefined);
  let currentKey = 'A';
  const loadStarted = deferred<void>();
  const heldLoad = deferred<ReaderNote[]>();
  const errors: unknown[] = [];
  const { controller } = createFixture({
    getStorageKey: () => currentKey,
    canPersistNotes: () => true,
    loadPersistedNotes: async (key) => {
      if (key === 'A') {
        loadStarted.resolve();
        return heldLoad.promise;
      }
      return [restoredNote('B-note')];
    },
    onError: (error) => errors.push(error)
  });
  const readyA = controller.ready();
  await loadStarted.promise;
  currentKey = 'B';
  await controller.ready();
  heldLoad.reject(new Error('old A read failed'));
  await assert.rejects(readyA, /old A read failed/);
  assert.deepEqual(errors, []);
  assert.deepEqual(get(controller.state).notes, [restoredNote('B-note')]);
  assert.equal(controller.addHighlightFromSelection({ selection: selectionAt('B-addition'), isCurrent: () => true }), true);
  await controller.flush();
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { get } from 'svelte/store';

import { createBr1SyncSnapshot, createReaderBookmarksSyncRecord, restoreReaderBookmarksFromSync } from '../sync/index.js';
import { createReaderBookmarksController } from './bookmarksController.js';
import { deriveReaderSidebarAnnotationState } from './sidebarAnnotations.js';
import {
  createEmptyReaderPreviewState,
  normalizeReaderBookmark,
  type ReaderBookmark
} from './types.js';

const storageKey = 'br1.reader.bookmarks:c13b2a';
const cfi = 'epubcfi(/6/2[c13b2a])';

const createMemoryStorage = (): Storage => {
  const records = new Map<string, string>();
  return {
    get length() { return records.size; },
    clear() { records.clear(); },
    getItem(key) { return records.get(key) ?? null; },
    key(index) { return [...records.keys()][index] ?? null; },
    removeItem(key) { records.delete(key); },
    setItem(key, value) { records.set(key, String(value)); }
  };
};

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, resolve, reject };
};

const bookmark = (id: string, overrides: Partial<ReaderBookmark> = {}): ReaderBookmark => ({
  id,
  locator: `href:#${id}`,
  targetHref: `#${id}`,
  chapterLabel: 'Chapter',
  chapterHref: '#chapter',
  progressLabel: '10%',
  locationLabel: 'Location 1',
  createdAt: 1,
  ...overrides
});

const previewAt = (progressLocation: string, progressLocationOrigin?: string) =>
  createEmptyReaderPreviewState({
    chapterLabel: 'Chapter',
    chapterHref: '#chapter',
    progressLabel: '10%',
    locationLabel: 'Location 1',
    progressLocation,
    ...(progressLocationOrigin === undefined ? {} : { progressLocationOrigin })
  });

const createController = ({
  storage,
  getStorageKey = () => storageKey,
  canPersistBookmarks = () => false,
  loadPersistedBookmarks = async () => [] as ReaderBookmark[],
  savePersistedBookmarks = async () => undefined
}: {
  storage?: Storage;
  getStorageKey?: () => string;
  canPersistBookmarks?: () => boolean;
  loadPersistedBookmarks?: (key: string) => Promise<ReaderBookmark[]>;
  savePersistedBookmarks?: (key: string, bookmarks: ReaderBookmark[]) => Promise<void>;
} = {}) =>
  createReaderBookmarksController({
    getStorage: () => storage,
    getStorageKey,
    canPersistBookmarks,
    loadPersistedBookmarks,
    savePersistedBookmarks,
    confirmDelete: () => true
  });

const deriveBookmarkSidebarState = (bookmarksState: Parameters<typeof deriveReaderSidebarAnnotationState>[0]['bookmarksState']) =>
  deriveReaderSidebarAnnotationState({
    activeHref: '',
    supportsTextAnnotations: true,
    textAnnotationSupportMessage: '',
    notesState: { activeCfi: '', selection: null, notes: [] },
    allHighlights: [],
    bookmarksState,
    notesFilter: 'all',
    notesKindFilter: 'all',
    highlightsFilter: 'all',
    highlightsSort: 'recent',
    bookmarksFilter: 'all',
    bookmarksSort: 'recent',
    selectedHighlightIds: new Set(),
    savedHighlightSelections: [],
    collapsedBookmarkGroups: new Set(),
    collapsedNoteGroups: new Set(),
    collapsedHighlightGroups: new Set()
  });

test('web hydration canonicalizes null bookmark origins, preserves future strings, and round-trips snapshots', async () => {
  const storage = createMemoryStorage();
  storage.setItem(storageKey, JSON.stringify([
    bookmark('legacy'),
    { ...bookmark('null'), locatorOrigin: null, targetHrefOrigin: null },
    { ...bookmark('future'), locatorOrigin: 'future-locator-v9', targetHrefOrigin: 'future-target-v9' }
  ]));
  const controller = createController({ storage });

  await controller.refresh();
  const hydrated = get(controller.state).bookmarks;
  assert.equal(Object.hasOwn(hydrated.find(({ id }) => id === 'legacy')!, 'locatorOrigin'), false);
  assert.equal(Object.hasOwn(hydrated.find(({ id }) => id === 'null')!, 'locatorOrigin'), false);
  assert.equal(hydrated.find(({ id }) => id === 'future')?.locatorOrigin, 'future-locator-v9');
  assert.equal(hydrated.find(({ id }) => id === 'future')?.targetHrefOrigin, 'future-target-v9');

  assert.equal(controller.toggleCurrent(previewAt(cfi, 'br1-epub-rendered-v1')), true);
  const persisted = JSON.parse(storage.getItem(storageKey) ?? '[]') as ReaderBookmark[];
  const saved = persisted.find(({ locator }) => locator === cfi)!;
  assert.deepEqual(
    { locatorOrigin: saved.locatorOrigin, targetHrefOrigin: saved.targetHrefOrigin },
    { locatorOrigin: 'br1-epub-rendered-v1', targetHrefOrigin: 'br1-epub-rendered-v1' }
  );

  const snapshot = createBr1SyncSnapshot([
    createReaderBookmarksSyncRecord(storageKey, persisted, { fallbackUpdatedAt: 2 })
  ], 3);
  const snapshotBookmarks = snapshot.records.find((record) => record.kind === 'bookmarks');
  assert.ok(snapshotBookmarks && snapshotBookmarks.kind === 'bookmarks');
  assert.deepEqual(restoreReaderBookmarksFromSync(snapshotBookmarks).find(({ locator }) => locator === cfi), saved);

  assert.throws(
    () => normalizeReaderBookmark({ ...bookmark('invalid'), locatorOrigin: 7 } as unknown as ReaderBookmark),
    /locatorOrigin must be a string/
  );
  assert.throws(
    () => createReaderBookmarksSyncRecord(storageKey, [{ ...bookmark('invalid-sync'), targetHrefOrigin: 7 } as unknown as ReaderBookmark]),
    /targetHrefOrigin must be a string/
  );
});

test('invalid web bookmark origins reject hydration without rewriting the raw payload', async (t) => {
  t.mock.method(console, 'warn', () => undefined);
  const storage = createMemoryStorage();
  const raw = JSON.stringify([{ ...bookmark('invalid-web'), locatorOrigin: 7 }]);
  storage.setItem(storageKey, raw);
  const controller = createController({ storage });

  await controller.refresh();

  assert.equal(storage.getItem(storageKey), raw);
  assert.deepEqual(get(controller.state).bookmarks, []);
});

test('mixed valid and invalid web bookmarks keep raw bytes and block mutations', async (t) => {
  t.mock.method(console, 'warn', () => undefined);
  const storage = createMemoryStorage();
  const raw = JSON.stringify([bookmark('valid-web'), { ...bookmark('invalid-web'), locatorOrigin: 7 }]);
  storage.setItem(storageKey, raw);
  const controller = createController({ storage });

  await controller.refresh();

  assert.equal(controller.toggleCurrent(previewAt(cfi, 'br1-epub-rendered-v1')), false);
  assert.equal(controller.remove('valid-web'), false);
  assert.equal(storage.getItem(storageKey), raw);
});

test('native hydration preserves known and future bookmark origins through a saved reopen', async () => {
  let disk: ReaderBookmark[] = [
    bookmark('legacy-native'),
    bookmark('known-native', { locatorOrigin: 'br1-epub-pristine-v1', targetHrefOrigin: 'br1-epub-pristine-v1' }),
    bookmark('future-native', { locatorOrigin: 'future-locator-v9', targetHrefOrigin: 'future-target-v9' })
  ];
  const native = {
    canPersistBookmarks: () => true,
    loadPersistedBookmarks: async () => disk.map((entry) => ({ ...entry })),
    savePersistedBookmarks: async (_key: string, bookmarks: ReaderBookmark[]) => {
      disk = bookmarks.map((entry) => ({ ...entry }));
    }
  };
  const controller = createController(native);

  await controller.refresh();
  assert.equal(controller.toggleCurrent(previewAt(cfi, 'br1-epub-rendered-v1')), true);
  await Promise.resolve();

  const reopened = createController(native);
  await reopened.refresh();
  const hydrated = get(reopened.state).bookmarks;
  assert.equal(Object.hasOwn(hydrated.find(({ id }) => id === 'legacy-native')!, 'locatorOrigin'), false);
  assert.equal(hydrated.find(({ id }) => id === 'known-native')?.locatorOrigin, 'br1-epub-pristine-v1');
  assert.equal(hydrated.find(({ id }) => id === 'future-native')?.locatorOrigin, 'future-locator-v9');
  assert.equal(hydrated.find(({ id }) => id === 'future-native')?.targetHrefOrigin, 'future-target-v9');
  assert.equal(hydrated.find(({ locator }) => locator === cfi)?.targetHrefOrigin, 'br1-epub-rendered-v1');
});

test('invalid native hydration blocks mutations without calling save', async (t) => {
  t.mock.method(console, 'warn', () => undefined);
  let saveCalls = 0;
  const controller = createController({
    canPersistBookmarks: () => true,
    loadPersistedBookmarks: async () => [{ ...bookmark('invalid-native'), locatorOrigin: 7 } as unknown as ReaderBookmark],
    savePersistedBookmarks: async () => { saveCalls += 1; }
  });

  await controller.refresh();

  assert.equal(controller.toggleCurrent(previewAt(cfi, 'br1-epub-rendered-v1')), false);
  assert.equal(saveCalls, 0);
});

test('same-key refresh retries failed native hydration and unlocks only after valid records load', async (t) => {
  t.mock.method(console, 'warn', () => undefined);
  let attempt = 0;
  let saved: ReaderBookmark[] = [];
  const controller = createController({
    canPersistBookmarks: () => true,
    loadPersistedBookmarks: async () => {
      attempt += 1;
      return attempt === 1
        ? [bookmark('retained-native'), { ...bookmark('invalid-native'), locatorOrigin: 7 } as unknown as ReaderBookmark]
        : [bookmark('retained-native')];
    },
    savePersistedBookmarks: async (_key, bookmarks) => { saved = bookmarks; }
  });

  await controller.refresh();
  assert.equal(controller.toggleCurrent(previewAt(cfi, 'br1-epub-rendered-v1')), false);
  assert.equal(get(controller.state).loadError, '书签读取失败，已暂停保存。请重新打开本书重试。');

  await controller.refresh();
  assert.equal(get(controller.state).bookmarks[0]?.id, 'retained-native');
  assert.equal(get(controller.state).loadError, undefined);
  assert.equal(controller.toggleCurrent(previewAt(cfi, 'br1-epub-rendered-v1')), true);
  await Promise.resolve();
  assert.deepEqual(saved.map(({ locator }) => locator).sort(), [cfi, 'href:#retained-native'].sort());
});

test('a stale successful native load cannot unblock a newer failed refresh', async (t) => {
  t.mock.method(console, 'warn', () => undefined);
  const older = deferred<ReaderBookmark[]>();
  const newer = deferred<ReaderBookmark[]>();
  let loads = 0;
  let saveCalls = 0;
  const controller = createController({
    canPersistBookmarks: () => true,
    loadPersistedBookmarks: async () => (++loads === 1 ? older.promise : newer.promise),
    savePersistedBookmarks: async () => { saveCalls += 1; }
  });

  const firstRefresh = controller.refresh();
  const secondRefresh = controller.refresh();
  newer.reject(new Error('newer load failed'));
  await secondRefresh;
  older.resolve([bookmark('stale-success')]);
  await firstRefresh;

  assert.deepEqual(get(controller.state).bookmarks, []);
  assert.equal(controller.toggleCurrent(previewAt(cfi, 'br1-epub-rendered-v1')), false);
  assert.equal(saveCalls, 0);
});

test('returning to A reloads it while stale B hydration cannot replace or unblock it', async () => {
  const pendingB = deferred<ReaderBookmark[]>();
  let currentKey = 'A';
  let aLoads = 0;
  const loads: string[] = [];
  const controller = createController({
    getStorageKey: () => currentKey,
    canPersistBookmarks: () => true,
    loadPersistedBookmarks: async (key) => {
      loads.push(key);
      if (key === 'B') return pendingB.promise;
      aLoads += 1;
      return aLoads === 1
        ? [bookmark('a-first')]
        : [bookmark('a-returned-one'), bookmark('a-returned-two')];
    },
    savePersistedBookmarks: async () => undefined
  });

  await controller.refresh();
  currentKey = 'B';
  const refreshB = controller.refresh();
  currentKey = 'A';
  await controller.refresh();
  pendingB.resolve([bookmark('stale-b')]);
  await refreshB;

  assert.deepEqual(loads, ['A', 'B', 'A']);
  assert.deepEqual(get(controller.state).bookmarks.map(({ id }) => id), ['a-returned-one', 'a-returned-two']);
  assert.equal(controller.toggleCurrent(previewAt(cfi, 'br1-epub-rendered-v1')), true);
  currentKey = 'B';
  assert.equal(controller.toggleCurrent(previewAt(cfi, 'br1-epub-rendered-v1')), false);
});

test('bookmark toggling and active state use the CFI origin tuple but keep non-CFI identity unchanged', () => {
  const controller = createController({ storage: createMemoryStorage() });
  const rendered = previewAt(cfi, 'br1-epub-rendered-v1');
  const pristine = previewAt(cfi, 'br1-epub-pristine-v1');
  const legacyCfi = previewAt(cfi);

  assert.equal(controller.toggleCurrent(rendered), true);
  assert.equal(controller.toggleCurrent(pristine), true);
  controller.syncPreview(pristine);
  assert.deepEqual(
    { locator: get(controller.state).activeLocator, origin: get(controller.state).activeLocatorOrigin },
    { locator: cfi, origin: 'br1-epub-pristine-v1' }
  );
  assert.equal(controller.toggleCurrent(rendered), true);
  assert.deepEqual(get(controller.state).bookmarks.map(({ locatorOrigin }) => locatorOrigin), ['br1-epub-pristine-v1']);

  assert.equal(controller.toggleCurrent(legacyCfi), true);
  controller.syncPreview(legacyCfi);
  assert.equal(get(controller.state).activeLocatorOrigin, undefined);
  assert.equal(get(controller.state).bookmarks.some(({ locatorOrigin }) => locatorOrigin === undefined), true);

  const text = previewAt('txt:0.500000', 'br1-epub-rendered-v1');
  assert.equal(controller.toggleCurrent(text), true);
  controller.syncPreview(previewAt('txt:0.500000', 'br1-epub-pristine-v1'));
  assert.equal(get(controller.state).activeLocatorOrigin, undefined);
  assert.equal(controller.toggleCurrent(previewAt('txt:0.500000', 'br1-epub-pristine-v1')), true);
  assert.equal(get(controller.state).bookmarks.some(({ locator }) => locator === 'txt:0.500000'), false);
});

test('sidebar active state uses the same CFI tuple matcher as bookmark toggling', () => {
  const bookmarks = [
    bookmark('rendered', { locator: cfi, locatorOrigin: 'br1-epub-rendered-v1' }),
    bookmark('pristine', { locator: cfi, locatorOrigin: 'br1-epub-pristine-v1' }),
    bookmark('text', { locator: 'txt:0.500000' })
  ];

  assert.equal(
    deriveBookmarkSidebarState({
      activeLocator: cfi,
      activeLocatorOrigin: 'br1-epub-pristine-v1',
      bookmarks
    }).isCurrentLocationBookmarked,
    true
  );
  assert.equal(
    deriveBookmarkSidebarState({
      activeLocator: cfi,
      activeLocatorOrigin: 'br1-epub-pristine-v2',
      bookmarks
    }).isCurrentLocationBookmarked,
    false
  );
  assert.equal(
    deriveBookmarkSidebarState({
      activeLocator: 'txt:0.500000',
      activeLocatorOrigin: 'br1-epub-rendered-v1',
      bookmarks
    }).isCurrentLocationBookmarked,
    true
  );
  assert.equal(
    deriveBookmarkSidebarState({
      activeLocator: cfi,
      bookmarks,
      loadError: '书签读取失败，已暂停保存。请重新打开本书重试。'
    }).bookmarksPanelSummary,
    '书签读取失败，已暂停保存。请重新打开本书重试。'
  );
});

// Ownership: this helper module defines one reader-domain contract that multiple
// UI surfaces depend on. Keep low-level normalization and invariants here so UI
// code can stay focused on reading semantics rather than format/runtime quirks.

import { get, writable } from 'svelte/store';
import type { ReaderAnnotationKind, ReaderNote, ReaderSelectionState, ReaderSidebarNotesState } from './types';

type ReaderNotesControllerOptions = {
  getStorage: () => Storage | undefined;
  getStorageKey: () => string;
  canPersistNotes: () => boolean;
  loadPersistedNotes: (storageKey: string) => Promise<ReaderNote[]>;
  savePersistedNotes: (storageKey: string, notes: ReaderNote[]) => Promise<void>;
  promptNoteDraft: (message: string, initialValue?: string) => string | null;
  confirmDelete: (message: string) => boolean;
  onError?: (error: unknown) => void;
};

type ReaderNotesMutationScope = {
  selection?: ReaderSelectionState | null;
  isCurrent: () => boolean;
};

type ReaderNotesMutationGuard = (() => boolean) | undefined;

const defaultNotesState = (): ReaderSidebarNotesState => ({
  activeCfi: '',
  selection: null,
  notes: []
});

const normalizeReaderNotes = (notes: ReaderNote[]): ReaderNote[] =>
  notes.map((note) => ({
    ...note,
    // Boundary: older payloads can omit the new `highlight` kind. Collapse that
    // migration here so the sidebar and export code only see the current shape.
    kind: note.kind === 'highlight' ? 'highlight' : 'note'
  }));

const buildSelectionKoReaderMetadata = (
  selection: ReaderSelectionState,
  kind: ReaderAnnotationKind,
  updatedAt: number
) => {
  const xpointer0 = selection.koreaderXPointer?.trim() ?? '';
  if (!xpointer0) return undefined;

  return {
    xpointer0,
    updatedAt,
    style: kind === 'highlight' ? ('highlight' as const) : null
  };
};

export const createReaderNotesController = ({
  getStorage,
  getStorageKey,
  canPersistNotes,
  loadPersistedNotes,
  savePersistedNotes,
  promptNoteDraft,
  confirmDelete,
  onError
}: ReaderNotesControllerOptions) => {
  const state = writable<ReaderSidebarNotesState>(defaultNotesState());
  let lastHydratedStorageKey: string | null = null;
  let stateStorageKey: string | null = null;
  let loadToken = 0;
  let mutationToken = 0;
  let hydration: {
    storageKey: string;
    token: number;
    promise: Promise<void>;
    pending: boolean;
  } | null = null;
  let persistenceTail = Promise.resolve();
  let lastPersistence = Promise.resolve();
  // These are outstanding writes, not a second notes store. Keep a failed
  // snapshot for retry; release it only when that exact write succeeds.
  const pendingSaves = new Map<string, {
    snapshot: ReaderNote[];
    promise: Promise<void>;
    failed: boolean;
  }>();

  const reportError = (storageKey: string, error: unknown) => {
    if (getStorageKey() !== storageKey) return;
    try {
      onError?.(error);
    } catch (callbackError) {
      // A UI callback must not turn our handled background failure into an
      // unhandled rejection or replace the persistence error seen by flush().
      console.warn('Failed to report reader notes error', callbackError);
    }
  };

  const snapshotNotes = (notes: ReaderNote[]) =>
    notes.map((note) => ({
      ...note,
      ...(note.koreader ? { koreader: { ...note.koreader } } : {})
    }));

  const persist = (storageKey: string, notes: ReaderNote[]) => {
    const snapshot = snapshotNotes(notes);
    const useNativePersistence = canPersistNotes();
    const storage = getStorage();

    if (useNativePersistence) {
      const save = persistenceTail.then(() => savePersistedNotes(storageKey, snapshot));
      const pending = { snapshot, promise: save, failed: false };
      pendingSaves.set(storageKey, pending);
      lastPersistence = save;
      // Keep the generic fire-and-forget callers observable without leaving a
      // rejected native save unhandled. Scoped callers can await the same save.
      persistenceTail = save.then(
        () => {
          if (pendingSaves.get(storageKey) === pending) pendingSaves.delete(storageKey);
        },
        (error) => {
          pending.failed = true;
          console.warn('Failed to persist reader notes', error);
          reportError(storageKey, error);
        }
      );
      return save;
    }

    if (storage) storage.setItem(storageKey, JSON.stringify(snapshot));
    lastPersistence = Promise.resolve();
    return lastPersistence;
  };

  const canMutate = (storageKey: string, guard: ReaderNotesMutationGuard) =>
    getStorageKey() === storageKey &&
    hydration === null &&
    (stateStorageKey === null || stateStorageKey === storageKey) &&
    (!canPersistNotes() || lastHydratedStorageKey === storageKey) &&
    (guard?.() ?? true);
  const whenPersisted = () => lastPersistence;
  const flush = () => whenPersisted();

  const startHydration = (retryFailedSave: boolean) => {
    const storageKey = getStorageKey();
    const pendingSave = pendingSaves.get(storageKey);
    if (
      storageKey === lastHydratedStorageKey &&
      stateStorageKey === storageKey &&
      !(retryFailedSave && pendingSave?.failed)
    ) return;
    if (hydration?.storageKey === storageKey && hydration.pending) return;

    const token = ++loadToken;
    const mutationAtAdmission = mutationToken;
    let complete!: () => void;
    let fail!: (error: unknown) => void;
    const promise = new Promise<void>((resolve, reject) => {
      complete = resolve;
      fail = reject;
    });
    // refresh() stays fire-and-forget. ready() returns this original promise,
    // including its rejection; explicit refresh() retries a failed restore.
    void promise.catch(() => undefined);
    hydration = { storageKey, token, promise, pending: true };
    const isCurrentLoad = () =>
      token === loadToken &&
      getStorageKey() === storageKey &&
      mutationToken === mutationAtAdmission;

    const run = async () => {
      stateStorageKey = null;
      lastHydratedStorageKey = null;
      state.update((current) => ({
        ...current,
        activeCfi: '',
        selection: null,
        notes: []
      }));
      let waitingForPersistence = false;
      let failed = false;
      try {
        let nextNotes: ReaderNote[] = [];
        const storage = getStorage();

        if (canPersistNotes()) {
          // Returning A -> B -> A must see A's admitted writes before reading.
          // Await this book's rejecting save, not the recovered global queue
          // tail. Explicit refresh retries the retained snapshot before reading;
          // failure in another book must not poison this book's hydration.
          waitingForPersistence = true;
          if (pendingSave) {
            await (retryFailedSave && pendingSave.failed
              ? persist(storageKey, pendingSave.snapshot)
              : pendingSave.promise);
          }
          waitingForPersistence = false;
          if (!isCurrentLoad()) return;
          // Boundary: persisted notes are the source of truth, but local storage
          // still contains legacy snapshots. Migrate once here so restore order is
          // deterministic for every surface that consumes notes.
          const persistedNotes = normalizeReaderNotes(await loadPersistedNotes(storageKey));
          if (!isCurrentLoad()) return;
          if (persistedNotes.length > 0) {
            nextNotes = persistedNotes;
          } else if (storage) {
            const raw = storage.getItem(storageKey);
            const legacyNotes = raw ? normalizeReaderNotes(JSON.parse(raw) as ReaderNote[]) : [];
            nextNotes = legacyNotes;
            if (legacyNotes.length > 0) {
              waitingForPersistence = true;
              await persist(storageKey, legacyNotes);
              waitingForPersistence = false;
              storage.removeItem(storageKey);
            }
          }
        } else if (storage) {
          const raw = storage.getItem(storageKey);
          nextNotes = raw ? normalizeReaderNotes(JSON.parse(raw) as ReaderNote[]) : [];
        }

        if (!isCurrentLoad()) return;

        state.update((current) => ({
          ...current,
          notes: nextNotes
        }));
        stateStorageKey = storageKey;
        lastHydratedStorageKey = storageKey;
      } catch (error) {
        failed = true;
        fail(error);
        console.warn('Failed to restore reader notes', error);
        // Save errors are reported by their captured key in persist(). Do not
        // re-label an old book's failed save as a restore error in the new UI.
        if (isCurrentLoad() && !waitingForPersistence) reportError(storageKey, error);
      } finally {
        if (hydration?.token === token) {
          if (failed) hydration.pending = false;
          else hydration = null;
        }
        if (!failed) complete();
      }
    };

    void run();
  };

  // Retry only on an explicit refresh. ready() observes a previous failure so
  // callers cannot accidentally replace unsaved notes with an older snapshot.
  const refresh = () => startHydration(true);

  const ready = () => {
    const storageKey = getStorageKey();
    if (hydration?.storageKey === storageKey) return hydration.promise;
    if (storageKey !== lastHydratedStorageKey || stateStorageKey !== storageKey) {
      startHydration(false);
      return hydration?.promise ?? Promise.resolve();
    }
    return Promise.resolve();
  };

  const setSelection = (selection: ReaderSelectionState | null) => {
    state.update((current) => ({
      ...current,
      selection
    }));
  };

  const setActiveCfi = (activeCfi: string) => {
    state.update((current) => ({
      ...current,
      activeCfi
    }));
  };

  const addFromSelection = (
    kind: ReaderAnnotationKind = 'note',
    scope?: ReaderNotesMutationScope
  ) => {
    const storageKey = getStorageKey();
    const selection = scope?.selection === undefined ? get(state).selection : scope.selection;
    const guard = scope?.isCurrent;
    if (!selection) return false;
    if (!canMutate(storageKey, guard)) return false;

    const draft = kind === 'note' ? promptNoteDraft('为当前选中的文本添加笔记：', '') : '';
    if (draft === null) return false;
    if (!canMutate(storageKey, guard)) return false;

    const segments = selection.segments?.length ? selection.segments : [selection];
    const selectableSegments = segments.filter((segment) => segment.text.trim());
    if (!selectableSegments.length) return false;
    // Prompt callbacks can synchronously mutate the controller. Build from the
    // newest notes so an admitted addition never drops a newer record.
    const current = get(state);
    let segmentsToAdd = selectableSegments;
    if (kind === 'highlight') {
      const selectedCfis = new Set(selectableSegments.map((segment) => segment.cfi));
      const existingCfis = new Set(
        current.notes
          .filter((note) => note.kind === 'highlight' && selectedCfis.has(note.cfi))
          .map((note) => note.cfi)
      );
      if (selectedCfis.size === existingCfis.size) {
        const nextNotes = current.notes.filter(
          (note) => note.kind !== 'highlight' || !selectedCfis.has(note.cfi)
        );
        if (!canMutate(storageKey, guard)) return false;
        state.update((value) => ({
          ...value,
          activeCfi: selectedCfis.has(value.activeCfi) ? '' : value.activeCfi,
          notes: nextNotes
        }));
        stateStorageKey = storageKey;
        mutationToken += 1;
        persist(storageKey, nextNotes);
        return true;
      }
      segmentsToAdd = selectableSegments.filter((segment) => !existingCfis.has(segment.cfi));
    }
    const createdAt = Date.now();
    // Fixed-layout pages own separate DOM ranges and CFIs. Persist each part so
    // Foliate can redraw every page while the UI still treats the drag as one action.
    const addedNotes = segmentsToAdd.flatMap((segment, index) => {
      const selectedText = segment.text.trim();
      if (!selectedText) return [];
      const segmentKind = kind === 'note' && index > 0 ? 'highlight' : kind;
      return [{
        id: crypto.randomUUID(),
        kind: segmentKind,
        cfi: segment.cfi,
        text: kind === 'note' && index === 0 ? selection.text.trim() : selectedText,
        note: kind === 'note' && index === 0 ? draft.trim() : '',
        chapterLabel: segment.chapterLabel,
        chapterHref: segment.chapterHref,
        createdAt,
        koreader: buildSelectionKoReaderMetadata(segment, segmentKind, createdAt)
      } satisfies ReaderNote];
    });
    const firstNote = addedNotes[0];
    if (!firstNote) return false;
    const nextNotes = [...addedNotes, ...current.notes];
    if (!canMutate(storageKey, guard)) return false;
    state.update((value) => ({
      ...value,
      activeCfi: firstNote.cfi,
      notes: nextNotes
    }));
    stateStorageKey = storageKey;
    mutationToken += 1;
    persist(storageKey, nextNotes);
    return true;
  };

  const open = (cfi: string) => {
    setActiveCfi(cfi);
  };

  const edit = (id: string, guard?: ReaderNotesMutationGuard) => {
    const storageKey = getStorageKey();
    if (!canMutate(storageKey, guard)) return false;
    const current = get(state);
    const target = current.notes.find((item) => item.id === id);
    if (!target) return false;

    const nextValue = promptNoteDraft('编辑这条笔记：', target.note);
    if (nextValue === null || !canMutate(storageKey, guard)) return false;
    const latest = get(state);
    if (!latest.notes.some((item) => item.id === id)) return false;
    const mergedNotes = latest.notes.map((item) =>
      item.id === id
        ? {
            ...item,
            note: nextValue.trim()
          }
        : item
    );
    if (!canMutate(storageKey, guard)) return false;
    state.update((value) => ({
      ...value,
      notes: mergedNotes
    }));
    stateStorageKey = storageKey;
    mutationToken += 1;
    persist(storageKey, mergedNotes);
    return true;
  };

  const remove = (id: string, guard?: ReaderNotesMutationGuard) => {
    const storageKey = getStorageKey();
    if (!canMutate(storageKey, guard)) return false;
    const current = get(state);
    const target = current.notes.find((item) => item.id === id);
    if (!target) return false;
    if (!confirmDelete('删除这条笔记？')) return false;
    if (!canMutate(storageKey, guard)) return false;

    const nextNotes = get(state).notes.filter((item) => item.id !== id);
    if (nextNotes.length === get(state).notes.length) return false;
    state.update((value) => ({
      ...value,
      notes: nextNotes
    }));
    stateStorageKey = storageKey;
    mutationToken += 1;
    persist(storageKey, nextNotes);
    return true;
  };

  const removeMany = (ids: string[]) => {
    const targetIds = new Set(ids);
    if (targetIds.size === 0) return false;
    const storageKey = getStorageKey();
    if (!canMutate(storageKey, undefined)) return false;
    const current = get(state);
    const nextNotes = current.notes.filter((item) => !targetIds.has(item.id));
    if (nextNotes.length === current.notes.length) return false;

    state.update((value) => ({
      ...value,
      notes: nextNotes,
      activeCfi: targetIds.has(value.activeCfi) ? '' : value.activeCfi
    }));
    stateStorageKey = storageKey;
    mutationToken += 1;
    persist(storageKey, nextNotes);
    return true;
  };

  return {
    state,
    refresh,
    ready,
    flush,
    whenPersisted,
    setSelection,
    setActiveCfi,
    addFromSelection,
    addHighlightFromSelection: (scope?: ReaderNotesMutationScope) => addFromSelection('highlight', scope),
    open,
    edit,
    remove,
    removeMany
  };
};

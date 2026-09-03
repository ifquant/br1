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
};

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
  confirmDelete
}: ReaderNotesControllerOptions) => {
  const state = writable<ReaderSidebarNotesState>(defaultNotesState());
  let lastHydratedStorageKey = '';
  let loadToken = 0;

  const persist = (notes: ReaderNote[]) => {
    const storageKey = getStorageKey();
    lastHydratedStorageKey = storageKey;

    if (canPersistNotes()) {
      void savePersistedNotes(storageKey, notes).catch((error) => {
        console.warn('Failed to persist reader notes', error);
      });
      return;
    }

    const storage = getStorage();
    if (!storage) return;
    storage.setItem(storageKey, JSON.stringify(notes));
  };

  const refresh = () => {
    const token = ++loadToken;
    const storageKey = getStorageKey();

    const run = async () => {
      if (storageKey === lastHydratedStorageKey) return;

      state.update((current) => ({
        ...current,
        activeCfi: '',
        selection: null,
        notes: []
      }));

      try {
        let nextNotes: ReaderNote[] = [];
        const storage = getStorage();

        if (canPersistNotes()) {
          // Boundary: persisted notes are the source of truth, but local storage
          // still contains legacy snapshots. Migrate once here so restore order is
          // deterministic for every surface that consumes notes.
          const persistedNotes = normalizeReaderNotes(await loadPersistedNotes(storageKey));
          if (persistedNotes.length > 0) {
            nextNotes = persistedNotes;
          } else if (storage) {
            const raw = storage.getItem(storageKey);
            const legacyNotes = raw ? normalizeReaderNotes(JSON.parse(raw) as ReaderNote[]) : [];
            nextNotes = legacyNotes;
            if (legacyNotes.length > 0) {
              await savePersistedNotes(storageKey, legacyNotes);
              storage.removeItem(storageKey);
            }
          }
        } else if (storage) {
          const raw = storage.getItem(storageKey);
          nextNotes = raw ? normalizeReaderNotes(JSON.parse(raw) as ReaderNote[]) : [];
        }

        if (token !== loadToken) return;

        state.update((current) => ({
          ...current,
          activeCfi: '',
          selection: null,
          notes: nextNotes
        }));
        lastHydratedStorageKey = storageKey;
      } catch (error) {
        console.warn('Failed to restore reader notes', error);
        if (token !== loadToken) return;
        state.update((current) => ({
          ...current,
          activeCfi: '',
          selection: null,
          notes: []
        }));
        lastHydratedStorageKey = storageKey;
      }
    };

    void run();
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

  const addFromSelection = (kind: ReaderAnnotationKind = 'note') => {
    const current = get(state);
    const selection = current.selection;
    if (!selection) return false;

    const draft =
      kind === 'note' ? (promptNoteDraft('为当前选中的文本添加笔记：', '') ?? '') : '';
    const segments = selection.segments?.length ? selection.segments : [selection];
    const selectableSegments = segments.filter((segment) => segment.text.trim());
    if (!selectableSegments.length) return false;
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
        state.update((value) => ({
          ...value,
          activeCfi: selectedCfis.has(value.activeCfi) ? '' : value.activeCfi,
          notes: nextNotes
        }));
        persist(nextNotes);
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
        id: `${segment.cfi}:${createdAt}`,
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
    state.update((value) => ({
      ...value,
      activeCfi: firstNote.cfi,
      notes: nextNotes
    }));
    persist(nextNotes);
    return true;
  };

  const open = (cfi: string) => {
    setActiveCfi(cfi);
  };

  const edit = (id: string) => {
    const current = get(state);
    const target = current.notes.find((item) => item.id === id);
    if (!target) return false;

    const nextValue = promptNoteDraft('编辑这条笔记：', target.note) ?? target.note;
    const nextNotes = current.notes.map((item) =>
      item.id === id
        ? {
            ...item,
            note: nextValue.trim()
          }
        : item
    );

    state.update((value) => ({
      ...value,
      notes: nextNotes
    }));
    persist(nextNotes);
    return true;
  };

  const remove = (id: string) => {
    const current = get(state);
    const target = current.notes.find((item) => item.id === id);
    if (!target) return false;
    if (!confirmDelete('删除这条笔记？')) return false;

    const nextNotes = current.notes.filter((item) => item.id !== id);
    state.update((value) => ({
      ...value,
      notes: nextNotes
    }));
    persist(nextNotes);
    return true;
  };

  const removeMany = (ids: string[]) => {
    const targetIds = new Set(ids);
    if (targetIds.size === 0) return false;
    const current = get(state);
    const nextNotes = current.notes.filter((item) => !targetIds.has(item.id));
    if (nextNotes.length === current.notes.length) return false;

    state.update((value) => ({
      ...value,
      notes: nextNotes,
      activeCfi: targetIds.has(value.activeCfi) ? '' : value.activeCfi
    }));
    persist(nextNotes);
    return true;
  };

  return {
    state,
    refresh,
    setSelection,
    setActiveCfi,
    addFromSelection,
    addHighlightFromSelection: () => addFromSelection('highlight'),
    open,
    edit,
    remove,
    removeMany
  };
};

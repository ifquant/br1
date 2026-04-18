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
    kind: note.kind === 'highlight' ? 'highlight' : 'note'
  }));

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
    const selectedText = selection.text.trim();
    if (!selectedText) return false;

    const note: ReaderNote = {
      id: `${selection.cfi}:${Date.now()}`,
      kind,
      cfi: selection.cfi,
      text: selectedText,
      note: draft.trim(),
      chapterLabel: selection.chapterLabel,
      chapterHref: selection.chapterHref,
      createdAt: Date.now()
    };

    const nextNotes = [note, ...current.notes.filter((item) => item.cfi !== note.cfi)];
    state.update((value) => ({
      ...value,
      activeCfi: note.cfi,
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

  return {
    state,
    refresh,
    setSelection,
    setActiveCfi,
    addFromSelection,
    addHighlightFromSelection: () => addFromSelection('highlight'),
    open,
    edit,
    remove
  };
};

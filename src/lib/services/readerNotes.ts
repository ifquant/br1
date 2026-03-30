import type { ReaderNote } from '$lib/reader';

const isTauriDesktop = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.location.protocol === 'tauri:' ||
    window.location.hostname === 'tauri.localhost' ||
    '__TAURI_INTERNALS__' in window
  );
};

export const canPersistReaderNotes = () => isTauriDesktop();

export const loadReaderNotes = async (bookKey: string): Promise<ReaderNote[]> => {
  if (!isTauriDesktop()) return [];

  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<ReaderNote[]>('load_reader_notes', {
    bookKey
  });
};

export const saveReaderNotes = async (bookKey: string, notes: ReaderNote[]): Promise<void> => {
  if (!isTauriDesktop()) return;

  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('save_reader_notes', {
    bookKey,
    notes
  });
};

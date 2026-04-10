import type { ReaderNote } from '$lib/reader';
import { invokeTauri, isTauriDesktop } from './platform';

export const canPersistReaderNotes = () => isTauriDesktop();

export const loadReaderNotes = async (bookKey: string): Promise<ReaderNote[]> => {
  if (!isTauriDesktop()) return [];

  return invokeTauri<ReaderNote[]>('load_reader_notes', {
    bookKey
  });
};

export const saveReaderNotes = async (bookKey: string, notes: ReaderNote[]): Promise<void> => {
  if (!isTauriDesktop()) return;

  await invokeTauri('save_reader_notes', {
    bookKey,
    notes
  });
};

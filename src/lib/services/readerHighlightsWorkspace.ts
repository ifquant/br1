import type { ReaderHighlightsWorkspaceState } from '$lib/reader';
import { invokeTauri, isTauriDesktop } from './platform';

export const canPersistReaderHighlightsWorkspaceState = () => isTauriDesktop();

export const loadReaderHighlightsWorkspaceState = async (
  bookKey: string
): Promise<ReaderHighlightsWorkspaceState | null> => {
  if (!isTauriDesktop()) return null;

  return invokeTauri<ReaderHighlightsWorkspaceState | null>('load_reader_highlights_workspace_state', {
    bookKey
  });
};

export const saveReaderHighlightsWorkspaceState = async (
  bookKey: string,
  state: ReaderHighlightsWorkspaceState
): Promise<void> => {
  if (!isTauriDesktop()) return;

  await invokeTauri('save_reader_highlights_workspace_state', {
    bookKey,
    state
  });
};

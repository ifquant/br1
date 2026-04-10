import { writable } from 'svelte/store';
import type { SidebarTab } from './types';

type ReaderSidebarState = {
  visible: boolean;
  pinned: boolean;
  width: number;
  tab: SidebarTab;
};

type ReaderSidebarControllerOptions = {
  getStorage: () => Storage | undefined;
  isWindowMode: () => boolean;
};

const clampSidebarWidth = (width: number) => Math.max(208, Math.min(380, width));

const defaultState = (): ReaderSidebarState => ({
  visible: true,
  pinned: true,
  width: 224,
  tab: 'toc'
});

export const createReaderSidebarController = ({
  getStorage,
  isWindowMode
}: ReaderSidebarControllerOptions) => {
  const state = writable<ReaderSidebarState>(defaultState());

  const persist = (current: ReaderSidebarState) => {
    const storage = getStorage();
    if (!isWindowMode() || !storage) return;

    storage.setItem(
      'br1.reader.sidebar',
      JSON.stringify({ pinned: current.pinned, width: current.width })
    );
  };

  const restore = () => {
    const storage = getStorage();
    if (!storage) return;

    try {
      const raw = storage.getItem('br1.reader.sidebar');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { pinned?: boolean; width?: number };
      state.update((current) => ({
        ...current,
        pinned: typeof parsed.pinned === 'boolean' ? parsed.pinned : current.pinned,
        width:
          typeof parsed.width === 'number' ? clampSidebarWidth(parsed.width) : current.width
      }));
    } catch (error) {
      console.warn('Failed to restore reader sidebar prefs', error);
    }
  };

  const toggleVisible = () => {
    state.update((current) => ({
      ...current,
      visible: !current.visible
    }));
  };

  const togglePinned = () => {
    state.update((current) => ({
      ...current,
      pinned: !current.pinned
    }));
  };

  const openTab = (tab: SidebarTab) => {
    state.update((current) => ({
      ...current,
      tab,
      visible: true
    }));
  };

  const toggleTab = (tab: SidebarTab) => {
    state.update((current) => {
      if (current.visible && current.tab === tab) {
        return {
          ...current,
          visible: false
        };
      }

      return {
        ...current,
        tab,
        visible: true
      };
    });
  };

  const show = () => {
    state.update((current) => ({
      ...current,
      visible: true
    }));
  };

  const setWidth = (width: number) => {
    state.update((current) => ({
      ...current,
      width: clampSidebarWidth(width)
    }));
  };

  const beginResize = (event: MouseEvent) => {
    if (!isWindowMode()) return;

    let startWidth = 224;
    let isPinned = true;
    state.update((current) => {
      startWidth = current.width;
      isPinned = current.pinned;
      return current;
    });

    if (!isPinned) return;

    event.preventDefault();
    const startX = event.clientX;

    const handleMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      setWidth(startWidth + delta);
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      state.update((current) => {
        persist(current);
        return current;
      });
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  return {
    state,
    restore,
    persist,
    toggleVisible,
    togglePinned,
    openTab,
    toggleTab,
    show,
    setWidth,
    beginResize
  };
};

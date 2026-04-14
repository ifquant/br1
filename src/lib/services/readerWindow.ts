import { isTauriDesktop } from './platform';

type ReaderWindowTarget = string | { href: string };
export const LIBRARY_SURFACE_RELOAD_EVENT = 'br1:library-reading-state-updated';

const toWindowReaderUrl = (target: ReaderWindowTarget) => {
  const href = typeof target === 'string' ? target : target.href;
  const url = new URL(href, window.location.origin);
  url.searchParams.set('mode', 'window');
  return `${url.pathname}${url.search}`;
};

export const openReaderTarget = async (target: ReaderWindowTarget): Promise<boolean> => {
  if (!isTauriDesktop() || typeof window === 'undefined') return false;

  try {
    const [{ WebviewWindow }, { getCurrentWindow }] = await Promise.all([
      import('@tauri-apps/api/webviewWindow'),
      import('@tauri-apps/api/window')
    ]);

    const currentWindow = getCurrentWindow();
    const labelPrefix = currentWindow.label === 'main' ? 'reader' : currentWindow.label;
    const label = `${labelPrefix}-${Date.now()}`;
    const url = toWindowReaderUrl(target);

    new WebviewWindow(label, {
      url,
      width: 1480,
      height: 920,
      minWidth: 1200,
      minHeight: 760,
      center: true,
      resizable: true,
      title: '',
      decorations: true,
      transparent: false,
      titleBarStyle: 'overlay'
    });

    return true;
  } catch (error) {
    console.error('Failed to open reader window', error);
    return false;
  }
};

export const goToLibrarySurface = async (): Promise<boolean> => {
  if (!isTauriDesktop() || typeof window === 'undefined') return false;

  try {
    const { getAllWindows, getCurrentWindow } = await import('@tauri-apps/api/window');

    const currentWindow = getCurrentWindow();
    if (currentWindow.label === 'main') {
      return false;
    }

    const windows = await getAllWindows();
    const mainWindow = windows.find((entry) => entry.label === 'main') ?? null;

    if (mainWindow) {
      await mainWindow.show();
      await mainWindow.setFocus();
      await currentWindow.close();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to return to library surface', error);
    return false;
  }
};

export const notifyLibrarySurfaceReadingStateChanged = async (): Promise<void> => {
  if (!isTauriDesktop() || typeof window === 'undefined') return;

  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().emitTo('main', LIBRARY_SURFACE_RELOAD_EVENT);
  } catch (error) {
    console.error('Failed to notify the library surface about reading-state changes', error);
  }
};

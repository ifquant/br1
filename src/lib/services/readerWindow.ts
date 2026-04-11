import { isTauriDesktop } from './platform';

const toWindowReaderUrl = (href: string) => {
  const url = new URL(href, window.location.origin);
  url.searchParams.set('mode', 'window');
  return `${url.pathname}${url.search}`;
};

export const openReaderTarget = async (href: string): Promise<boolean> => {
  if (!isTauriDesktop() || typeof window === 'undefined') return false;

  try {
    const [{ WebviewWindow }, { getCurrentWindow }] = await Promise.all([
      import('@tauri-apps/api/webviewWindow'),
      import('@tauri-apps/api/window')
    ]);

    const currentWindow = getCurrentWindow();
    const labelPrefix = currentWindow.label === 'main' ? 'reader' : currentWindow.label;
    const label = `${labelPrefix}-${Date.now()}`;
    const url = toWindowReaderUrl(href);

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

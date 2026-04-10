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
      width: 980,
      height: 760,
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

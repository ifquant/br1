// Boundary: this module is the renderer-safe gate around desktop runtime
// detection and command invocation. Keep all direct Tauri imports isolated here
// so web mode stays auditable.

export const isTauriDesktop = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.location.protocol === 'tauri:' ||
    window.location.hostname === 'tauri.localhost' ||
    '__TAURI_INTERNALS__' in window
  );
};

export const supportsCanvasContext2DFilter = (): boolean => {
  if (typeof document === 'undefined' || typeof navigator === 'undefined') return false;
  const context = document.createElement('canvas').getContext('2d');
  if (!context || !('filter' in context)) return false;

  const userAgent = navigator.userAgent;
  const isSafari =
    /Safari/.test(userAgent) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg\//.test(userAgent);
  if (isSafari) return false;

  return !isTauriDesktop() || !/Macintosh|Mac OS X|Linux|iPhone|iPad/.test(userAgent);
};

export const invokeTauri = async <T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> => {
  // Refactor risk: if feature modules import Tauri directly, web mode gains
  // hidden privileged edges that are much harder to audit.
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
};

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

export const invokeTauri = async <T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> => {
  // Refactor risk: if feature modules import Tauri directly, web mode gains
  // hidden privileged edges that are much harder to audit.
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
};

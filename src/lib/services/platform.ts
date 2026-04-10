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
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
};

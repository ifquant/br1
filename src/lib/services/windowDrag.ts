const isPrimaryPointer = (event: MouseEvent) => event.button === 0;

const isInteractiveTarget = (target: EventTarget | null) =>
  target instanceof Element &&
  !!target.closest('button, input, select, textarea, a, [role="button"], [contenteditable="true"]');

export const startCurrentWindowDrag = async (event: MouseEvent) => {
  if (typeof window === 'undefined') return;
  if (!isPrimaryPointer(event) || isInteractiveTarget(event.target)) return;

  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().startDragging();
  } catch (error) {
    console.warn('Failed to start window dragging', error);
  }
};

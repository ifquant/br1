import { OverlayScrollbars } from 'overlayscrollbars';
import type { Action } from 'svelte/action';

export const overlayScrollbars: Action<HTMLElement> = (node) => {
  const instance = OverlayScrollbars(node, {
    scrollbars: {
      autoHide: 'scroll'
    }
  });

  return {
    destroy() {
      instance.destroy();
    }
  };
};

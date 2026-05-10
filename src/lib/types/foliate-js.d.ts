// This declaration/shim exists to stabilize an external dependency boundary for
// the rest of the app. Keep only the minimum surface needed by br1 code.

declare module 'foliate-js/view.js';
declare module 'foliate-js/overlayer.js' {
  export class Overlayer {
    static highlight(rects: unknown[], options?: Record<string, unknown>): SVGElement;
  }
}

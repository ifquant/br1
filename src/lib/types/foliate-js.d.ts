// This declaration/shim exists to stabilize an external dependency boundary for
// the rest of the app. Keep only the minimum surface needed by br1 code.

declare module 'foliate-js/view.js';
declare module 'foliate-js/overlayer.js' {
  export class Overlayer {
    constructor(doc: Document);
    readonly element: SVGElement;
    add(key: string, range: Range, draw: (rects: DOMRect[], options?: Record<string, unknown>) => SVGElement, options?: Record<string, unknown>): void;
    remove(key: string): void;
    redraw(): void;
    hitTest(point: { x: number; y: number }): [string, Range, { left: number; top: number; right: number; bottom: number }] | [];
    static highlight(rects: unknown[], options?: Record<string, unknown>): SVGElement;
  }
}

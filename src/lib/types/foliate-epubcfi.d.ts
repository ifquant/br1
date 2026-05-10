// This declaration/shim exists to stabilize an external dependency boundary for
// the rest of the app. Keep only the minimum surface needed by br1 code.

declare module 'foliate-js/epubcfi.js' {
  export const parse: (input: string) => any;
  export const fake: { toIndex: (step: any) => number };
  export const collapse: (value: any) => any[];
  export const fromRange: (range: Range) => string;
  export const toRange: (document: Document, parts: any) => Range;
  export const toElement: (document: Document, step: any) => Element | null;
}

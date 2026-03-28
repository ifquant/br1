export const FOLIATE_VIEW_TAG = 'foliate-view';
export const SAMPLE_READER_BOOK_URL = '/samples/reader-step4.epub';

export interface FoliateViewElement extends HTMLElement {
  book?: {
    metadata?: {
      title?: string | Record<string, string>;
      creator?: string | { name?: string } | Array<string | { name?: string }>;
    };
  };
  lastLocation?: {
    current?: number;
    next?: number;
    total?: number;
    section?: {
      current?: number;
      total?: number;
    };
    fraction?: number;
    tocItem?: {
      label?: string;
    };
  };
  open(book: string | Blob | File): Promise<void>;
}

const isRecord = (value: unknown): value is Record<string, string> =>
  typeof value === 'object' && value !== null;

export const pickText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (isRecord(value)) {
    return value.zh ?? value['zh-CN'] ?? value.en ?? Object.values(value)[0] ?? '';
  }
  return '';
};

export const pickAuthor = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return pickAuthor(value[0]);
  if (typeof value === 'object' && value !== null && 'name' in value) {
    return pickText((value as { name?: unknown }).name);
  }
  return '';
};

let foliateViewModulePromise: Promise<unknown> | null = null;

export const ensureFoliateViewDefinition = async () => {
  if (customElements.get(FOLIATE_VIEW_TAG)) return;

  if (!foliateViewModulePromise) {
    foliateViewModulePromise = import('foliate-js/view.js');
  }

  await foliateViewModulePromise;
};

export const createFoliateViewElement = () =>
  document.createElement(FOLIATE_VIEW_TAG) as FoliateViewElement;
